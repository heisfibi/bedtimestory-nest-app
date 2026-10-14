import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Admin } from '../auth/admin.entity.js';
import { Category } from '../catalog/category.entity.js';
import type { BookMood, BookType, TitleTranslation } from './book.entity.js';

// The approved version of a book: what the mobile app sees. Written when a
// super admin approves, with its own copies of the files, so later edits to
// the working copy don't touch it.
@Entity('published_books')
export class PublishedBook {
  // Same id as the Book it was published from.
  @PrimaryColumn()
  id: number;

  @Column({ length: 255 })
  title: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  author: string | null;

  @Column({ length: 8 })
  language: string;

  @Column({ type: 'varchar', length: 20 })
  type: BookType;

  @Column('int')
  level: number;

  @Column({ type: 'varchar', length: 10, default: 'calm' })
  mood: BookMood;

  @ManyToOne(() => Category, {
    eager: true,
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'category_id' })
  category: Category | null;

  // The studio account the book belongs to: who readers follow to hear of
  // its next book. Copied from the book's owner on publishing.
  @ManyToOne(() => Admin, {
    eager: true,
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'creator_id' })
  creator: Admin | null;

  @Column({ length: 255 })
  file: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  thumbnail: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  cover: string | null;

  @Column({ name: 'slide_count', type: 'int' })
  slideCount: number;

  @Column({ name: 'title_translations', type: 'simple-json' })
  titleTranslations: TitleTranslation[];

  // When it first went live.
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  // When the live version last changed. The app re-downloads when this moves.
  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
