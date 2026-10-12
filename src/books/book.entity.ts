import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Admin } from '../auth/admin.entity.js';
import { Category } from '../catalog/category.entity.js';

export interface TitleTranslation {
  language: string;
  lan: string;
  text: string;
  /** The creator wrote it; otherwise it's the original or a machine translation. */
  byCreator?: boolean;
}

// "basic" is a story. A comic's words are placed on its pictures (each slide's
// `texts` in index.json); the app turns its pages like a book's.
export const BOOK_TYPES = ['basic', 'poem', 'comic'] as const;
export type BookType = (typeof BOOK_TYPES)[number];

/**
 * Reading levels run from 1 to MAX_LEVEL: how hard the text is to read.
 * The studio and the app hold their names and ages: 1 Tiny Dreamers (2–3),
 * 2 Little Listeners (3–4), 3 Story Explorers (4–5), 4 Brave Readers (5–7),
 * 5 Star Readers (7+).
 */
export const MAX_LEVEL = 5;

/**
 * How a book feels, separate from how hard it is to read. Spooky (gentle
 * scares) and action (mild fantasy or cartoon fighting) books are for ages 7
 * and up whatever their level, and the app only lists each once a parent
 * turns that kind on.
 */
export const BOOK_MOODS = ['calm', 'funny', 'spooky', 'action'] as const;
export type BookMood = (typeof BOOK_MOODS)[number];

/** Moods the public lists leave out unless the app asks for them. */
export const PARENT_GATED_MOODS = ['spooky', 'action'] as const satisfies readonly BookMood[];
export type ParentGatedMood = (typeof PARENT_GATED_MOODS)[number];

/**
 * draft     → being written; editable by its owner
 * in_review → submitted; waiting for a super admin (owner can withdraw it)
 * approved  → a super admin published this version (see PublishedBook)
 * rejected  → sent back with a review note
 * Editing an approved or rejected book makes it a draft again. An approved
 * book's published copy stays live until a newer version is approved.
 */
export const BOOK_STATUSES = [
  'draft',
  'in_review',
  'approved',
  'rejected',
] as const;
export type BookStatus = (typeof BOOK_STATUSES)[number];

// The working copy of a story, as edited in the studio. The slides live in
// the .akuko file (a zip of index.json + images/); everything else is here.
// A comic whose pages are put together from several pictures has a studio
// file too: those pictures, which only the studio has any use for.
@Entity('books')
export class Book {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 255 })
  title: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  author: string | null;

  // ISO code of the language the story is written in.
  @Column({ length: 8, default: 'en' })
  language: string;

  @Column({ type: 'varchar', length: 20, default: 'basic' })
  type: BookType;

  @Column('int', { default: 1 })
  level: number;

  @Column({ type: 'varchar', length: 10, default: 'calm' })
  mood: BookMood;

  // Drafts may not have one yet; submitting requires it.
  @ManyToOne(() => Category, {
    eager: true,
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'category_id' })
  category: Category | null;

  @Column({ type: 'varchar', length: 20, default: 'draft' })
  status: BookStatus;

  // Why it was rejected; kept until the book is submitted again.
  @Column({ name: 'review_note', type: 'text', nullable: true })
  reviewNote: string | null;

  @ManyToOne(() => Admin, { eager: true, nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'owner_id' })
  owner: Admin | null;

  @ManyToOne(() => Admin, { eager: true, nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'reviewed_by_id' })
  reviewedBy: Admin | null;

  @Column({ name: 'submitted_at', type: 'datetime', nullable: true })
  submittedAt: Date | null;

  @Column({ name: 'reviewed_at', type: 'datetime', nullable: true })
  reviewedAt: Date | null;

  // Path of the .akuko file relative to the media root, e.g. "books/<uuid>.akuko".
  @Column({ length: 255 })
  file: string;

  // Path of the book's studio file, if it has one: what the studio needs to
  // keep working on it and the app doesn't (the pictures a comic page's
  // panels were made from). It's never published.
  @Column({ name: 'studio_file', type: 'varchar', length: 255, nullable: true })
  studioFile: string | null;

  // The square picture the book goes by in the app's library, relative to the
  // media root: the one its .akuko brings (the creator's own, or one the studio
  // cut from the first slide's picture), or failing that the cover as it is.
  @Column({ type: 'varchar', length: 255, nullable: true })
  thumbnail: string | null;

  // The first slide's picture: what the app shows while the book opens. Books
  // saved before it was kept apart from the thumbnail have none.
  @Column({ type: 'varchar', length: 255, nullable: true })
  cover: string | null;

  @Column({ name: 'slide_count', type: 'int', default: 0 })
  slideCount: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
