import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { isStaff, isSuperAdmin, type Admin } from '../auth/admin.entity.js';
import { CatalogService } from '../catalog/catalog.service.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import { assertStudioFile, inspectAkuko, type AkukoSummary } from './akuko.js';
import { Book, type BookStatus } from './book.entity.js';
import { CreateBookDto, UpdateBookDto } from './dto/book-fields.dto.js';
import { MediaFiles } from './media-files.js';
import { NarratorsService } from './narrators.service.js';
import { PublishedBooksService } from './published-books.service.js';

/**
 * Books as the studio works on them, and the review workflow. Creators see
 * and edit their own books; admins and super admins see all of them and
 * decide what goes live.
 */
@Injectable()
export class BooksService {
  constructor(
    @InjectRepository(Book) private readonly books: Repository<Book>,
    private readonly media: MediaFiles,
    private readonly catalog: CatalogService,
    private readonly live: PublishedBooksService,
    private readonly narrators: NarratorsService,
    private readonly notifications: NotificationsService,
  ) {}

  private readonly logger = new Logger(BooksService.name);

  findAll(admin: Admin, status?: BookStatus) {
    return this.books.find({
      where: {
        ...(status ? { status } : {}),
        ...(isStaff(admin) ? {} : { owner: { id: admin.id } }),
      },
      order: { updatedAt: 'DESC', id: 'DESC' },
    });
  }

  /** A book the admin may see. Others' books look like they don't exist. */
  async findOne(id: number, admin: Admin) {
    const book = await this.books.findOneBy({ id });
    if (!book || (!isStaff(admin) && book.owner?.id !== admin.id)) {
      throw new NotFoundException(`Book ${id} not found`);
    }
    return book;
  }

  readFile(book: Book) {
    return this.media.read(book.file);
  }

  /** The book's studio file, or null if it has none. */
  readStudioFile(book: Book) {
    return book.studioFile ? this.media.read(book.studioFile) : null;
  }

  async create(dto: CreateBookDto, file: Express.Multer.File, owner: Admin) {
    const akuko = await inspectAkuko(file.buffer);
    const book = this.books.create({
      title: dto.title,
      author: dto.author || null,
      language: await this.resolveLanguage(dto.language ?? 'en'),
      type: dto.type ?? 'basic',
      level: dto.level ?? 1,
      mood: dto.mood ?? 'calm',
      category: dto.category ? await this.resolveCategory(dto.category) : null,
      status: 'draft',
      owner,
    });
    return this.saveWithFile(book, { buffer: file.buffer, akuko });
  }

  /** `file` is a new .akuko, and `studio` a new studio file: each replaces the book's own. */
  async update(
    id: number,
    dto: UpdateBookDto,
    admin: Admin,
    file?: Express.Multer.File,
    studio?: Express.Multer.File,
  ) {
    const book = await this.findOne(id, admin);
    if (book.status === 'in_review' && !isStaff(admin)) {
      throw new ConflictException(
        'This book is waiting for review. Withdraw it to make changes.',
      );
    }
    const akuko = file && (await inspectAkuko(file.buffer));
    if (studio) await assertStudioFile(studio.buffer);

    if (dto.title !== undefined) book.title = dto.title;
    if (dto.author !== undefined) book.author = dto.author || null;
    if (dto.language !== undefined) {
      book.language = await this.resolveLanguage(dto.language);
    }
    if (dto.type !== undefined) book.type = dto.type;
    if (dto.level !== undefined) book.level = dto.level;
    if (dto.mood !== undefined) book.mood = dto.mood;
    if (dto.category !== undefined) {
      book.category = dto.category
        ? await this.resolveCategory(dto.category)
        : null;
    }
    // A changed approved book needs approving again; its live copy stays up
    // meanwhile. A rejected one goes back to being a draft (keeping the note).
    if (book.status === 'approved' || book.status === 'rejected') {
      book.status = 'draft';
    }

    return this.saveWithFile(
      book,
      file && akuko && { buffer: file.buffer, akuko },
      studio?.buffer,
    );
  }

  async remove(id: number, admin: Admin) {
    const book = await this.findOne(id, admin);
    if (book.owner?.id !== admin.id && !isSuperAdmin(admin)) {
      throw new ForbiddenException(
        "Only a super admin can delete someone else's book.",
      );
    }
    const isLive = !!(await this.live.findOptional(id));
    if (isLive && !isSuperAdmin(admin)) {
      throw new ForbiddenException(
        'This book is live in the app. Ask a super admin to unpublish it first.',
      );
    }
    await this.live.unpublish(id);
    await this.books.remove(book);
    await this.media.remove(
      book.file,
      book.thumbnail,
      book.cover,
      book.studioFile,
    );
  }

  // --- Review workflow ---

  async submit(id: number, admin: Admin) {
    const book = await this.findOne(id, admin);
    if (book.status === 'in_review') {
      throw new ConflictException('This book is already waiting for review');
    }
    if (book.status === 'approved') {
      throw new ConflictException('This version is already approved');
    }
    await this.assertComplete(book, 'submit');
    book.status = 'in_review';
    book.submittedAt = new Date();
    book.reviewNote = null;
    return this.books.save(book);
  }

  async withdraw(id: number, admin: Admin) {
    const book = await this.findOne(id, admin);
    if (book.status !== 'in_review') {
      throw new ConflictException("This book isn't waiting for review");
    }
    book.status = 'draft';
    return this.books.save(book);
  }

  /** Admins and super admins only. Publishes this version, replacing any live one. */
  async approve(id: number, reviewer: Admin) {
    const book = await this.findOne(id, reviewer);
    if (book.status === 'approved') {
      throw new ConflictException('This version is already approved');
    }
    const { titles } = await this.assertComplete(book, 'publish');
    const wasLive = !!(await this.live.findOptional(id));
    const published = await this.live.publish(book, titles);
    book.status = 'approved';
    book.reviewNote = null;
    book.reviewedBy = reviewer;
    book.reviewedAt = new Date();
    const saved = await this.books.save(book);
    // Readers hear of a new book, not of a new version of one they have.
    if (!wasLive) {
      const free = (await this.live.freeBookId()) === id;
      this.notifications.bookWentLive(published, free).catch((error) => {
        this.logger.error(`Queueing news of book ${id} failed: ${error}`);
      });
    }
    return saved;
  }

  /** Admins and super admins only. */
  async reject(id: number, reviewer: Admin, note: string) {
    const book = await this.findOne(id, reviewer);
    if (book.status !== 'in_review') {
      throw new ConflictException("This book isn't waiting for review");
    }
    book.status = 'rejected';
    book.reviewNote = note;
    book.reviewedBy = reviewer;
    book.reviewedAt = new Date();
    return this.books.save(book);
  }

  /** Admins and super admins only. Takes the live copy out of the app. */
  async unpublish(id: number, admin: Admin) {
    const book = await this.findOne(id, admin);
    if (!(await this.live.unpublish(id))) {
      throw new ConflictException("This book isn't live");
    }
    if (book.status === 'approved') {
      book.status = 'draft';
      return this.books.save(book);
    }
    return book;
  }

  /** Throws unless the book is ready for `action`; returns what its .akuko holds. */
  private async assertComplete(book: Book, action: 'submit' | 'publish') {
    const akuko = await inspectAkuko(await this.media.read(book.file));
    const problems: string[] = [];
    if (!book.category) problems.push('choose a category');
    if (akuko.slideCount === 0) problems.push('add at least one slide');
    if (akuko.slidesWithoutImage.length) {
      problems.push(
        `add a picture to slide ${akuko.slidesWithoutImage.join(', ')}`,
      );
    }
    if (akuko.unnamedNarrations) {
      problems.push('give every voice-over a narrator name');
    }
    if (akuko.unfinishedQuizQuestions.length) {
      problems.push(
        `finish quiz question ${akuko.unfinishedQuizQuestions.join(', ')} (the question, all four answers, and which one is right)`,
      );
    }
    if (problems.length) {
      throw new BadRequestException(
        `Before you ${action}: ${problems.join('; ')}`,
      );
    }
    return akuko;
  }

  /**
   * Saves the row, first storing a new .akuko with its cover and thumbnail if
   * given, and a new studio file if given.
   */
  private async saveWithFile(
    book: Book,
    upload?: { buffer: Buffer; akuko: AkukoSummary },
    studio?: Buffer,
  ) {
    if (!upload && !studio) return this.books.save(book);

    const previous: (string | null)[] = [];
    const written: string[] = [];
    try {
      if (upload) {
        previous.push(book.file, book.thumbnail, book.cover);
        book.file = await this.media.save('books', upload.buffer, '.akuko');
        written.push(book.file);
        const { cover } = upload.akuko;
        book.cover = cover
          ? await this.media.save('covers', cover.data, cover.extension)
          : null;
        if (book.cover) written.push(book.cover);
        // A book whose .akuko brings no thumbnail goes by its cover as it is.
        const thumbnail = upload.akuko.thumbnail ?? cover;
        book.thumbnail = thumbnail
          ? await this.media.save(
              'thumbnails',
              thumbnail.data,
              thumbnail.extension,
            )
          : null;
        if (book.thumbnail) written.push(book.thumbnail);
        book.slideCount = upload.akuko.slideCount;
      }
      if (studio) {
        previous.push(book.studioFile);
        book.studioFile = await this.media.save(
          'studio',
          studio,
          '.akukostudio',
        );
        written.push(book.studioFile);
      }

      const saved = await this.books.save(book);
      await this.media.remove(...previous).catch(() => undefined);
      // Only feeds the studio's narrator list, so it never fails a save.
      if (upload) {
        await this.narrators
          .remember(upload.akuko.narrators)
          .catch(() => undefined);
      }
      return saved;
    } catch (error) {
      await this.media.remove(...written);
      throw error;
    }
  }

  private async resolveCategory(name: string) {
    const category = await this.catalog.findCategoryByName(name);
    if (!category) {
      const names = (await this.catalog.listCategories()).map((c) => c.name);
      throw new BadRequestException(
        `Unknown category "${name}". Expected one of: ${names.join(', ')}`,
      );
    }
    return category;
  }

  private async resolveLanguage(isoCode: string) {
    const languages = await this.catalog.listLanguages();
    if (!languages.some((l) => l.isoCode === isoCode)) {
      throw new BadRequestException(
        `Unknown language "${isoCode}". Expected one of: ${languages.map((l) => l.isoCode).join(', ')}`,
      );
    }
    return isoCode;
  }
}
