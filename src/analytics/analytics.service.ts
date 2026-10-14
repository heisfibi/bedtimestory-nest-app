import {
  BadRequestException,
  ConflictException,
  Injectable,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { isSuperAdmin, type Admin } from '../auth/admin.entity.js';
import { Book } from '../books/book.entity.js';
import {
  DEFAULT_CREATOR_SHARE,
  SettingsService,
} from '../settings/settings.service.js';
import {
  monthFigures,
  ownView,
  type BookInfo,
  type MonthReport,
} from './allocation.js';
import type { HelloDto, RevenueDto, SessionsDto } from './dto/analytics.dto.js';
import { Reader, ReaderMonth } from './reader.entity.js';
import { ReadingSession } from './reading-session.entity.js';
import { RevenueMonth, StatementBook } from './revenue-month.entity.js';

const DAY_MS = 24 * 60 * 60 * 1000;
// A tablet that was offline sends its reading when it's back: this long after, at most.
const OLDEST_SESSION_MS = 62 * DAY_MS;

// 0.6 → 0.4, not 0.40000000000000002.
const round = (share: number) => Math.round(share * 10_000) / 10_000;

/** The month a moment falls in, by the calendar in UTC: "2026-10". */
export const monthOf = (date: Date) => date.toISOString().slice(0, 7);

/**
 * What the app reports of reading, and what's made of it: each month's
 * readers and reading by book, and how the month's subscription money is
 * shared (see allocation.ts).
 */
@Injectable()
export class AnalyticsService {
  constructor(
    @InjectRepository(Reader) private readonly readers: Repository<Reader>,
    @InjectRepository(ReaderMonth)
    private readonly readerMonths: Repository<ReaderMonth>,
    @InjectRepository(ReadingSession)
    private readonly sessions: Repository<ReadingSession>,
    @InjectRepository(RevenueMonth)
    private readonly revenue: Repository<RevenueMonth>,
    @InjectRepository(StatementBook)
    private readonly statementBooks: Repository<StatementBook>,
    @InjectRepository(Book) private readonly books: Repository<Book>,
    private readonly settings: SettingsService,
  ) {}

  // --- From the app ---

  /** The app has started: this reader was here this month, with or without a subscription. */
  async hello(dto: HelloDto) {
    const reader =
      (await this.readers.findOneBy({ id: dto.reader_id })) ??
      this.readers.create({ id: dto.reader_id });
    reader.subscribed = dto.subscribed;
    reader.plan = dto.subscribed ? dto.plan || null : null;
    reader.purchaseToken = dto.subscribed
      ? dto.purchase_token || reader.purchaseToken || null
      : null;
    reader.lastSeenAt = new Date();
    await this.readers.save(reader);
    await this.seen(
      reader.id,
      monthOf(new Date()),
      dto.subscribed,
      reader.plan,
    );
  }

  /** Stores sittings with books. Returns how many were new. */
  async record(dto: SessionsDto) {
    if (!dto.sessions.length) return 0;
    const reader =
      (await this.readers.findOneBy({ id: dto.reader_id })) ??
      this.readers.create({ id: dto.reader_id });
    reader.lastSeenAt = new Date();
    await this.readers.save(reader);

    const known = new Set(
      (
        await this.books.find({
          select: { id: true },
          where: { id: In([...new Set(dto.sessions.map((s) => s.book_id))]) },
          loadEagerRelations: false,
        })
      ).map((book) => book.id),
    );
    const had = new Set(
      (
        await this.sessions.find({
          select: { clientId: true },
          where: { clientId: In(dto.sessions.map((s) => s.id)) },
        })
      ).map((session) => session.clientId),
    );

    const now = Date.now();
    const rows: ReadingSession[] = [];
    for (const session of dto.sessions) {
      if (!known.has(session.book_id) || had.has(session.id)) continue;
      had.add(session.id);
      // A tablet's clock can be anything: a time that can't be right is taken as now.
      const claimed = new Date(session.started_at).getTime();
      const startedAt = new Date(
        claimed > now + DAY_MS || claimed < now - OLDEST_SESSION_MS
          ? now
          : claimed,
      );
      rows.push(
        this.sessions.create({
          clientId: session.id,
          readerId: dto.reader_id,
          bookId: session.book_id,
          month: monthOf(startedAt),
          startedAt,
          seconds: session.seconds,
          pagesRead: Math.min(session.pages_read, session.page_count),
          pageCount: session.page_count,
          completed: session.completed,
          mode: session.mode,
          subscribed: session.subscribed,
        }),
      );
    }
    if (!rows.length) return 0;
    await this.sessions.save(rows);

    const months = new Map<string, boolean>();
    for (const row of rows) {
      months.set(row.month, (months.get(row.month) ?? false) || row.subscribed);
    }
    for (const [month, subscribed] of months) {
      await this.seen(dto.reader_id, month, subscribed, null);
    }
    return rows.length;
  }

  private async seen(
    readerId: string,
    month: string,
    subscribed: boolean,
    plan: string | null,
  ) {
    const row =
      (await this.readerMonths.findOneBy({ readerId, month })) ??
      this.readerMonths.create({ readerId, month, subscribed: false });
    row.subscribed = row.subscribed || subscribed;
    row.plan = plan ?? row.plan ?? null;
    await this.readerMonths.save(row);
  }

  // --- For the studio ---

  /** The months there's anything to show for, newest first; this month always. */
  async months() {
    const [read, entered] = await Promise.all([
      this.sessions
        .createQueryBuilder('session')
        .select('DISTINCT session.month', 'month')
        .getRawMany<{ month: string }>(),
      this.revenue.find({ select: { month: true } }),
    ]);
    return [
      ...new Set([
        monthOf(new Date()),
        ...read.map((row) => row.month),
        ...entered.map((row) => row.month),
      ]),
    ]
      .sort()
      .reverse();
  }

  /**
   * A month's figures. Super admins see every book; anyone else (admins
   * too) their own books only, and nothing of the rest (not the month's
   * money either).
   */
  async report(month: string, admin: Admin): Promise<MonthReport> {
    const all = await this.fullReport(month);
    return isSuperAdmin(admin) ? all : ownView(all, admin.id);
  }

  /**
   * Super admins only. The creator's part of what a book makes, 0 to 1. It
   * applies to every month that isn't closed; a closed month keeps the
   * share it was closed with.
   */
  setCreatorShare(share: number, admin: Admin) {
    return this.settings.setCreatorShare(share, admin.name);
  }

  creatorShare() {
    return this.settings.creatorShareSetting();
  }

  private async fullReport(month: string): Promise<MonthReport> {
    const entered = await this.revenue.findOneBy({ month });
    const closed = entered?.closedAt && entered.statement;
    // A closed month keeps the share it was closed with (60% before it could be changed).
    const creatorShare = closed
      ? (entered.statement!.split?.creator ?? DEFAULT_CREATOR_SHARE)
      : await this.settings.creatorShare();
    const head = {
      month,
      scope: 'all' as const,
      split: { creator: creatorShare, platform: round(1 - creatorShare) },
      currency: entered?.currency ?? null,
      revenue: entered?.amount ?? null,
      closed_at: entered?.closedAt?.toISOString() ?? null,
    };
    // A closed month is what it was when it was closed.
    if (closed) {
      const lines = await this.statementBooks.findBy({ month });
      const { totals, creators } = entered.statement!;
      return {
        ...head,
        totals,
        creators,
        books: lines
          .map((row) => row.line)
          .sort((a, b) => b.share - a.share || b.reads - a.reads),
      };
    }

    const sessions = await this.sessions.findBy({ month });
    const ids = [...new Set(sessions.map((session) => session.bookId))];
    const books = new Map<number, BookInfo>();
    for (const book of ids.length
      ? await this.books.findBy({ id: In(ids) })
      : []) {
      books.set(book.id, {
        title: book.title,
        type: book.type,
        creator: book.owner && { id: book.owner.id, name: book.owner.name },
      });
    }
    const subscribersSeen = await this.readerMonths.countBy({
      month,
      subscribed: true,
    });
    return {
      ...head,
      ...monthFigures(
        sessions,
        books,
        entered?.amount ?? null,
        subscribersSeen,
        creatorShare,
      ),
    };
  }

  /** Super admins only. The month's subscription money: what the store paid out for it. */
  async setRevenue(dto: RevenueDto) {
    const row =
      (await this.revenue.findOneBy({ month: dto.month })) ??
      this.revenue.create({
        month: dto.month,
        closedAt: null,
        statement: null,
      });
    if (row.closedAt) {
      throw new ConflictException(
        'This month is closed. Reopen it to change its money.',
      );
    }
    row.amount = dto.amount;
    row.currency = dto.currency;
    await this.revenue.save(row);
  }

  /** Super admins only. Fixes the month's figures: what each creator is owed for it. */
  async close(month: string) {
    const row = await this.revenue.findOneBy({ month });
    if (!row) {
      throw new BadRequestException(
        "Enter the month's subscription money before closing it",
      );
    }
    if (row.closedAt)
      throw new ConflictException('This month is already closed');
    if (month >= monthOf(new Date())) {
      throw new BadRequestException("A month can be closed once it's over");
    }
    const { books, totals, creators, split } = await this.fullReport(month);
    await this.statementBooks.delete({ month });
    await this.statementBooks.save(
      books.map((line) =>
        this.statementBooks.create({ month, bookId: line.id, line }),
      ),
    );
    row.statement = { totals, creators, split };
    row.closedAt = new Date();
    await this.revenue.save(row);
  }

  /** Super admins only. Lets a closed month's money be corrected: its figures are worked out afresh. */
  async reopen(month: string) {
    const row = await this.revenue.findOneBy({ month });
    if (!row?.closedAt) throw new ConflictException("This month isn't closed");
    row.closedAt = null;
    row.statement = null;
    await this.revenue.save(row);
    await this.statementBooks.delete({ month });
  }
}
