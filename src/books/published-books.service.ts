import {
  Injectable,
  NotFoundException,
  OnApplicationBootstrap,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Not, Repository } from 'typeorm';
import {
  Book,
  PARENT_GATED_MOODS,
  type BookType,
  type ParentGatedMood,
} from './book.entity.js';
import { MediaFiles } from './media-files.js';
import { PublishedBook } from './published-book.entity.js';
import { TranslationService } from './translation.service.js';

const PUBLISHED_FOLDER = 'published';

/** Which parent-gated moods (ages 7+) a parent has allowed. */
type AllowedMoods = Partial<Record<ParentGatedMood, boolean>>;

/** A where-clause leaving out the parent-gated moods that weren't allowed. */
const hiddenMoods = (allowed: AllowedMoods) => {
  const hidden = PARENT_GATED_MOODS.filter((mood) => !allowed[mood]);
  return hidden.length ? { mood: Not(In([...hidden])) } : {};
};

/** The live catalogue the mobile app reads, and the copying that feeds it. */
@Injectable()
export class PublishedBooksService implements OnApplicationBootstrap {
  constructor(
    @InjectRepository(PublishedBook)
    private readonly published: Repository<PublishedBook>,
    private readonly media: MediaFiles,
    private readonly translation: TranslationService,
  ) {}

  /** Books that went live before a live copy kept its creator get their owner as one. */
  async onApplicationBootstrap() {
    await this.published.query(
      `UPDATE published_books SET creator_id =
         (SELECT owner_id FROM books WHERE books.id = published_books.id)
       WHERE creator_id IS NULL`,
    );
  }

  async paginate(
    page: number,
    pageSize: number,
    filters: {
      category?: string;
      type?: BookType;
      level?: number;
    } & AllowedMoods = {},
  ) {
    const where = {
      ...(filters.category ? { category: { name: filters.category } } : {}),
      ...(filters.type ? { type: filters.type } : {}),
      ...(filters.level ? { level: filters.level } : {}),
      ...hiddenMoods(filters),
    };
    // The newest books come first: the ones that went live most lately. The
    // free book leads any list it's in all the same (it's the newest story as a
    // rule, but a newer one of a mood a parent has allowed would otherwise sit
    // above it): it's the first thing on its shelf, not one of a row of locked
    // ones.
    const freeId = await this.freeBookId();
    const free =
      freeId === null
        ? null
        : await this.published.findOneBy({ ...where, id: freeId });
    const lead = free ? 1 : 0;
    const [rest, others] = await this.published.findAndCount({
      where: free ? { ...where, id: Not(free.id) } : where,
      order: { createdAt: 'DESC', id: 'DESC' },
      skip: Math.max(0, (page - 1) * pageSize - lead),
      take: pageSize,
    });
    const items =
      free && page === 1 ? [free, ...rest.slice(0, pageSize - 1)] : rest;
    return { items, count: others + lead, freeId };
  }

  /**
   * The one book the app opens for everyone; the rest need a subscription.
   * It's the story that went live last, leaving out the moods a parent has to
   * allow, so that it's on everyone's shelf. Null while no such story is live.
   */
  async freeBookId() {
    const free = await this.published.findOne({
      where: { type: 'basic', ...hiddenMoods({}) },
      order: { createdAt: 'DESC', id: 'DESC' },
    });
    return free?.id ?? null;
  }

  findAll(allowed: AllowedMoods = {}) {
    return this.published.find({
      where: hiddenMoods(allowed),
      order: { id: 'ASC' },
    });
  }

  async findOne(id: number) {
    const book = await this.published.findOneBy({ id });
    if (!book) throw new NotFoundException(`Book ${id} not found`);
    return book;
  }

  findOptional(id: number) {
    return this.published.findOneBy({ id });
  }

  /** Live copies for the given book ids, keyed by id. */
  async findByIds(ids: number[]) {
    const rows = ids.length ? await this.published.findBy({ id: In(ids) }) : [];
    return new Map(rows.map((row) => [row.id, row]));
  }

  /**
   * Makes this version of the book the live one, replacing any previous
   * version. `titles` is its title in other languages, where the creator
   * wrote it (language code → title); the rest are machine-translated.
   */
  async publish(book: Book, titles: Record<string, string>) {
    const existing = await this.findOptional(book.id);
    const sameTitle =
      existing?.title === book.title && existing.language === book.language;

    const written: string[] = [];
    try {
      const file = await this.media.copy(book.file, PUBLISHED_FOLDER);
      written.push(file);
      const thumbnail = book.thumbnail
        ? await this.media.copy(book.thumbnail, PUBLISHED_FOLDER)
        : null;
      if (thumbnail) written.push(thumbnail);
      const cover = book.cover
        ? await this.media.copy(book.cover, PUBLISHED_FOLDER)
        : null;
      if (cover) written.push(cover);

      const saved = await this.published.save(
        this.published.create({
          id: book.id,
          title: book.title,
          author: book.author,
          language: book.language,
          type: book.type,
          level: book.level,
          mood: book.mood,
          category: book.category,
          creator: book.owner,
          file,
          thumbnail,
          cover,
          slideCount: book.slideCount,
          titleTranslations: await this.translation.translateTitle(
            book.title,
            book.language,
            titles,
            sameTitle ? existing.titleTranslations : [],
          ),
        }),
      );
      if (existing) {
        await this.media.remove(
          existing.file,
          existing.thumbnail,
          existing.cover,
        );
      }
      return saved;
    } catch (error) {
      await this.media.remove(...written);
      throw error;
    }
  }

  /** Takes the book out of the app. Returns whether it was live. */
  async unpublish(id: number) {
    const existing = await this.findOptional(id);
    if (!existing) return false;
    await this.published.remove(existing);
    await this.media.remove(existing.file, existing.thumbnail, existing.cover);
    return true;
  }
}
