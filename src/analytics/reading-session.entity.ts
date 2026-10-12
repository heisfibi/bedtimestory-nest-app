import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

export const READING_MODES = ['read', 'listen', 'record'] as const;
export type ReadingMode = (typeof READING_MODES)[number];

// One sitting with a book in the app: from opening it to leaving it (or
// starting it over). The app sends these, sometimes long after the fact (a
// tablet that was offline). `bookId` is a plain number, not a link to the
// book: a month's figures must outlive a book that's later deleted.
@Entity('reading_sessions')
@Index(['month', 'bookId'])
export class ReadingSession {
  @PrimaryGeneratedColumn()
  id: number;

  // Made up by the app, so a session sent twice (the reply to the first got
  // lost) is counted once.
  @Column({ name: 'client_id', length: 36, unique: true })
  clientId: string;

  @Column({ name: 'reader_id', length: 36 })
  readerId: string;

  @Column({ name: 'book_id', type: 'int' })
  bookId: number;

  // The month it counts in ("2026-10"): the one it started in.
  @Column({ length: 7 })
  month: string;

  @Column({ name: 'started_at', type: 'datetime' })
  startedAt: Date;

  // Time spent on the book's pages.
  @Column('int')
  seconds: number;

  // How many different pages were read (stayed on for a moment, not flicked
  // past), of how many the book has.
  @Column({ name: 'pages_read', type: 'int' })
  pagesRead: number;

  @Column({ name: 'page_count', type: 'int' })
  pageCount: number;

  // The last page was read.
  @Column({ default: false })
  completed: boolean;

  @Column({ type: 'varchar', length: 10, default: 'read' })
  mode: ReadingMode;

  // The reader had a subscription at the time: only then does the reading
  // earn the book anything.
  @Column({ default: false })
  subscribed: boolean;
}
