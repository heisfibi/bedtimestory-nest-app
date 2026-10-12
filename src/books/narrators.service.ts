import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { inspectAkuko } from './akuko.js';
import { Book } from './book.entity.js';
import { MediaFiles } from './media-files.js';
import { Narrator } from './narrator.entity.js';

/** The narrators the studio offers when choosing who reads a voice-over. */
@Injectable()
export class NarratorsService implements OnApplicationBootstrap {
  private readonly logger = new Logger(NarratorsService.name);

  constructor(
    @InjectRepository(Narrator)
    private readonly narrators: Repository<Narrator>,
    @InjectRepository(Book) private readonly books: Repository<Book>,
    private readonly media: MediaFiles,
  ) {}

  /** Every narrator's name, alphabetically. */
  async list() {
    const all = await this.narrators.find();
    return all
      .map((n) => n.name)
      .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
  }

  /** Adds whichever of `names` aren't known yet (ignoring case). */
  async remember(names: string[]) {
    if (!names.length) return;
    const known = new Set(
      (await this.narrators.find()).map((n) => n.name.toLowerCase()),
    );
    const byKey = new Map(
      names.map((name) => [name.toLowerCase(), name.slice(0, 60)]),
    );
    const fresh = [...byKey]
      .filter(([key]) => !known.has(key))
      .map(([, name]) => this.narrators.create({ name }));
    if (fresh.length) await this.narrators.save(fresh);
  }

  // Books saved before narrators were collected: gather theirs once, while
  // the list is still empty.
  async onApplicationBootstrap() {
    if (await this.narrators.count()) return;
    for (const book of await this.books.find()) {
      try {
        const { narrators } = await inspectAkuko(
          await this.media.read(book.file),
        );
        await this.remember(narrators);
      } catch (error) {
        this.logger.warn(
          `Could not read narrators from book ${book.id}: ${String(error)}`,
        );
      }
    }
  }
}
