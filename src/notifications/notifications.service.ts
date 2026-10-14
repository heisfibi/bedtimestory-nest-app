import {
  Inject,
  Injectable,
  Logger,
  OnApplicationBootstrap,
  OnApplicationShutdown,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, LessThanOrEqual, Not, Repository } from 'typeorm';
import { Reader } from '../analytics/reader.entity.js';
import { ReadingSession } from '../analytics/reading-session.entity.js';
import { appConfig, type AppConfig } from '../app.config.js';
import { Admin } from '../auth/admin.entity.js';
import { Book } from '../books/book.entity.js';
import { PublishedBook } from '../books/published-book.entity.js';
import type { DeviceDto, FollowsDto } from './dto/notifications.dto.js';
import { whenToTell } from './evening.js';
import {
  AT_A_TIME,
  isPushToken,
  sendPush,
  type PushMessage,
} from './expo-push.js';
import {
  CreatorFollow,
  PushDevice,
  PushNews,
  type NewsReason,
} from './push-device.entity.js';
import { writeNews } from './push-copy.js';

const TICK_MS = 60 * 1000;
// How many waiting pieces of news are looked at in one go.
const DUE_AT_ONCE = 2000;
// Readers who finished this many of a creator's books count as their fans,
// followed or not.
const FAN_BOOKS = 2;
/** The Android channel the app makes for news of books. */
export const NEWS_CHANNEL = 'new-books';

/** The book's title in `language`, where it has one. */
export const titleIn = (book: PublishedBook, language: string) =>
  book.titleTranslations.find((t) => t.lan === language)?.text || book.title;

/**
 * The one notification a reader gets for the news waiting for them: the book
 * from a creator they like if there's one, otherwise the book, or how many.
 */
export function composeNews(
  device: Pick<PushDevice, 'token' | 'language'>,
  news: { book: PublishedBook; reason: NewsReason; free: boolean }[],
  subscribed: boolean,
): PushMessage | null {
  if (!news.length) return null;
  const newestFirst = [...news].sort(
    (a, b) => b.book.createdAt.getTime() - a.book.createdAt.getTime(),
  );
  const fromCreator = newestFirst.find((n) => n.reason === 'creator');
  const lead = fromCreator ?? newestFirst[0];
  const title = titleIn(lead.book, device.language);
  const text = fromCreator
    ? writeNews(device.language, 'creator', {
        title,
        creator: lead.book.author || lead.book.creator?.name || '',
      })
    : news.length > 1
      ? writeNews(device.language, 'many', { title, count: news.length })
      : writeNews(device.language, lead.free && !subscribed ? 'free' : 'one', {
          title,
        });
  return {
    to: device.token,
    ...text,
    data: { kind: 'new_book', book_id: lead.book.id, type: lead.book.type },
    channelId: NEWS_CHANNEL,
    sound: 'default',
    priority: 'high',
  };
}

/**
 * Push notifications of new books: which installs want them, which creators
 * they follow, and news waiting for each reader's evening (evening.ts). The
 * app does its own reading reminders; nothing here sends those.
 */
@Injectable()
export class NotificationsService
  implements OnApplicationBootstrap, OnApplicationShutdown
{
  private readonly logger = new Logger(NotificationsService.name);
  private timer: NodeJS.Timeout | null = null;
  private sending = false;

  constructor(
    @InjectRepository(PushDevice)
    private readonly devices: Repository<PushDevice>,
    @InjectRepository(CreatorFollow)
    private readonly follows: Repository<CreatorFollow>,
    @InjectRepository(PushNews) private readonly news: Repository<PushNews>,
    @InjectRepository(PublishedBook)
    private readonly published: Repository<PublishedBook>,
    @InjectRepository(Reader) private readonly readers: Repository<Reader>,
    @InjectRepository(ReadingSession)
    private readonly sessions: Repository<ReadingSession>,
    @InjectRepository(Admin) private readonly admins: Repository<Admin>,
    @Inject(appConfig.KEY) private readonly config: AppConfig,
  ) {}

  onApplicationBootstrap() {
    if (process.env.NODE_ENV === 'test') return;
    this.timer = setInterval(() => void this.sendDue(), TICK_MS);
    this.timer.unref();
  }

  onApplicationShutdown() {
    if (this.timer) clearInterval(this.timer);
  }

  // --- From the app ---

  /** Where to send an install notifications, and which ones; no token means none. */
  async register(dto: DeviceDto) {
    if (!dto.token || !isPushToken(dto.token)) {
      await this.forget(dto.reader_id);
      return;
    }
    // A token belongs to one install: an old id it was sent with is gone.
    await this.devices.delete({
      token: dto.token,
      readerId: Not(dto.reader_id),
    });
    const device =
      (await this.devices.findOneBy({ readerId: dto.reader_id })) ??
      this.devices.create({ readerId: dto.reader_id, lastPushAt: null });
    Object.assign(device, {
      token: dto.token,
      language: dto.language,
      timeZone: dto.time_zone || null,
      utcOffset: dto.utc_offset,
      newBooks: dto.new_books,
      creators: dto.creators,
      spooky: dto.spooky,
      action: dto.action,
    });
    await this.devices.save(device);
  }

  /** The creators an install follows, as the app has them. */
  async setFollows(dto: FollowsDto) {
    const wanted = new Set(
      dto.creator_ids.length
        ? (
            await this.admins.find({
              select: { id: true },
              where: { id: In([...new Set(dto.creator_ids)]) },
            })
          ).map((admin) => admin.id)
        : [],
    );
    const had = await this.follows.findBy({ readerId: dto.reader_id });
    const dropped = had.filter((f) => !wanted.has(f.creatorId));
    if (dropped.length) await this.follows.remove(dropped);
    const kept = new Set(had.map((f) => f.creatorId));
    const added = [...wanted].filter((id) => !kept.has(id));
    if (added.length) {
      await this.follows.insert(
        added.map((creatorId) => ({ readerId: dto.reader_id, creatorId })),
      );
    }
    return { following: [...wanted] };
  }

  // --- From the studio ---

  /**
   * A book went live for the first time: news of it waits for the evening of
   * everyone who wants it. `free` says whether it's the free story now.
   */
  async bookWentLive(book: PublishedBook, free: boolean) {
    const creatorId = book.creator?.id ?? null;
    const likers = creatorId
      ? await this.likers(creatorId, book.id)
      : new Set<string>();
    const gated = book.mood === 'spooky' || book.mood === 'action';
    const now = new Date();
    const rows: Partial<PushNews>[] = [];
    for (const device of await this.devices.find()) {
      if (gated && !device[book.mood as 'spooky' | 'action']) continue;
      const reason: NewsReason | null =
        device.creators && likers.has(device.readerId)
          ? 'creator'
          : device.newBooks
            ? 'new'
            : null;
      if (!reason) continue;
      rows.push({
        readerId: device.readerId,
        bookId: book.id,
        reason,
        free,
        sendAfter: whenToTell(now, device, device.lastPushAt),
      });
    }
    for (let i = 0; i < rows.length; i += 500) {
      await this.news.insert(rows.slice(i, i + 500));
    }
    this.logger.log(
      `"${book.title}" is live: news of it waits for ${rows.length} reader(s)`,
    );
    return rows.length;
  }

  /** Readers who follow the creator, or have finished FAN_BOOKS of their other books. */
  private async likers(creatorId: number, exceptBookId: number) {
    const followers = await this.follows.findBy({ creatorId });
    const fans = await this.sessions
      .createQueryBuilder('s')
      .innerJoin(Book, 'b', 'b.id = s.book_id')
      .select('s.reader_id', 'readerId')
      .where('b.owner_id = :creatorId', { creatorId })
      .andWhere('s.book_id <> :exceptBookId', { exceptBookId })
      .andWhere('s.completed = 1')
      .groupBy('s.reader_id')
      .having('COUNT(DISTINCT s.book_id) >= :least', { least: FAN_BOOKS })
      .getRawMany<{ readerId: string }>();
    return new Set([
      ...followers.map((f) => f.readerId),
      ...fans.map((f) => f.readerId),
    ]);
  }

  // --- Sending ---

  /** Sends the news whose evening has come. Called every minute. */
  async sendDue(now = new Date()) {
    if (this.sending) return 0;
    this.sending = true;
    try {
      return await this.sendDueNow(now);
    } catch (error) {
      this.logger.error(`Sending notifications failed: ${String(error)}`);
      return 0;
    } finally {
      this.sending = false;
    }
  }

  private async sendDueNow(now: Date) {
    const due = await this.news.find({
      where: { sendAfter: LessThanOrEqual(now) },
      order: { id: 'ASC' },
      take: DUE_AT_ONCE,
    });
    if (!due.length) return 0;

    const readerIds = [...new Set(due.map((n) => n.readerId))];
    const devices = new Map(
      (await this.devices.findBy({ readerId: In(readerIds) })).map((d) => [
        d.readerId,
        d,
      ]),
    );
    const subscribed = new Set(
      (
        await this.readers.find({
          select: { id: true },
          where: { id: In(readerIds), subscribed: true },
        })
      ).map((r) => r.id),
    );
    const books = new Map(
      (
        await this.published.findBy({
          id: In([...new Set(due.map((n) => n.bookId))]),
        })
      ).map((b) => [b.id, b]),
    );

    const done: PushNews[] = [];
    const later: PushNews[] = [];
    const outgoing: { device: PushDevice; message: PushMessage }[] = [];
    for (const readerId of readerIds) {
      const mine = due.filter((n) => n.readerId === readerId);
      const device = devices.get(readerId);
      // Notifications turned off since; or a book taken out of the app.
      const live = mine.filter((n) => books.has(n.bookId));
      if (!device || !live.length) {
        done.push(...mine);
        continue;
      }
      // One a day at most: news that came on top of today's waits for another evening.
      const next = whenToTell(now, device, device.lastPushAt);
      if (next > now) {
        for (const n of mine) n.sendAfter = next;
        later.push(...mine);
        continue;
      }
      const message = composeNews(
        device,
        live.map((n) => ({
          book: books.get(n.bookId)!,
          reason: n.reason,
          free: n.free,
        })),
        subscribed.has(readerId),
      );
      done.push(...mine);
      if (message) outgoing.push({ device, message });
    }

    let sent = 0;
    for (let i = 0; i < outgoing.length; i += AT_A_TIME) {
      const batch = outgoing.slice(i, i + AT_A_TIME);
      // If Expo can't be reached this throws, and the news is still there next minute.
      const results = await sendPush(
        batch.map((o) => o.message),
        this.config.expoAccessToken,
      );
      const gone: string[] = [];
      const told: string[] = [];
      results.forEach((result, j) => {
        const { device } = batch[j];
        if (result.ok) told.push(device.readerId);
        else if (result.gone) gone.push(device.readerId);
        else {
          this.logger.warn(
            `Expo turned down a notification for ${device.readerId}: ${result.error}`,
          );
        }
      });
      if (told.length) {
        await this.devices.update({ readerId: In(told) }, { lastPushAt: now });
      }
      if (gone.length) await this.devices.delete({ readerId: In(gone) });
      // This batch's news is dealt with, whatever the next one does.
      const dealt = new Set(batch.map((o) => o.device.readerId));
      await this.removeNews(done.filter((n) => dealt.has(n.readerId)));
      sent += told.length;
    }
    const sentFor = new Set(outgoing.map((o) => o.device.readerId));
    await this.removeNews(done.filter((n) => !sentFor.has(n.readerId)));
    if (later.length) await this.news.save(later);
    if (sent) this.logger.log(`Sent ${sent} notification(s) of new books`);
    return sent;
  }

  private async removeNews(rows: PushNews[]) {
    for (let i = 0; i < rows.length; i += 500) {
      await this.news.delete({
        id: In(rows.slice(i, i + 500).map((n) => n.id)),
      });
    }
  }

  private async forget(readerId: string) {
    await this.devices.delete({ readerId });
    await this.news.delete({ readerId });
  }
}
