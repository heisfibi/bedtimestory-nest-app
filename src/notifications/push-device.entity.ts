import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryColumn,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

// An install of the app that lets us send it notifications: its push token
// (from Expo's push service) and what its parent chose to hear about. Same
// id as the Reader (an install, not a person). Removed when notifications are
// turned off, or the token stops working (the app was uninstalled).
@Entity('push_devices')
export class PushDevice {
  @PrimaryColumn({ name: 'reader_id', length: 36 })
  readerId: string;

  // "ExponentPushToken[…]".
  @Index({ unique: true })
  @Column({ length: 255 })
  token: string;

  // The app's language: the one the news is written in.
  @Column({ length: 8, default: 'en' })
  language: string;

  // "Africa/Lagos", where the app could tell.
  @Column({ name: 'time_zone', type: 'varchar', length: 64, nullable: true })
  timeZone: string | null;

  // Minutes ahead of UTC when the app last said: for a zone the server doesn't know.
  @Column({ name: 'utc_offset', type: 'int', default: 0 })
  utcOffset: number;

  // Every new book in the app.
  @Column({ name: 'new_books', default: true })
  newBooks: boolean;

  // New books from the creators the reader follows, or reads most.
  @Column({ default: true })
  creators: boolean;

  // A parent allowed these 7+ kinds of book: news of them is only sent then.
  @Column({ default: false })
  spooky: boolean;

  @Column({ default: false })
  action: boolean;

  @Column({ name: 'last_push_at', type: 'datetime', nullable: true })
  lastPushAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

// A reader follows a creator (a studio account), to hear of their next book.
@Entity('creator_follows')
export class CreatorFollow {
  @PrimaryColumn({ name: 'reader_id', length: 36 })
  readerId: string;

  @Index()
  @PrimaryColumn({ name: 'creator_id', type: 'int' })
  creatorId: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}

export const NEWS_REASONS = ['new', 'creator'] as const;
export type NewsReason = (typeof NEWS_REASONS)[number];

// News of a book waiting for a reader's evening (see evening.ts). Several for
// one reader go out together, as one notification.
@Entity('push_outbox')
export class PushNews {
  @PrimaryGeneratedColumn()
  id: number;

  @Index()
  @Column({ name: 'reader_id', length: 36 })
  readerId: string;

  @Column({ name: 'book_id', type: 'int' })
  bookId: number;

  // "creator": by a creator the reader follows or reads most; "new": any new book.
  @Column({ type: 'varchar', length: 10 })
  reason: NewsReason;

  // It was the free story when it went live: news for readers without a
  // subscription says so.
  @Column({ default: false })
  free: boolean;

  @Index()
  @Column({ name: 'send_after', type: 'datetime' })
  sendAfter: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
