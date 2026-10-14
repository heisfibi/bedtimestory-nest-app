import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Admin } from './admin.entity.js';

export const APPLICATION_STATUSES = [
  'pending',
  'approved',
  'declined',
] as const;
export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number];

export const CREATOR_KINDS = ['story', 'poem', 'comic'] as const;
export type CreatorKind = (typeof CREATOR_KINDS)[number];

// Someone's request, from the website's "Become a creator" page, for a studio
// account to write books with. They choose their password when they apply:
// once an admin approves it, they sign in with it as a creator.
@Entity('creator_applications')
export class CreatorApplication {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 100 })
  name: string;

  // Stored lowercased. Not unique: someone declined may apply again.
  @Index()
  @Column({ length: 255 })
  email: string;

  // Moves to the account on approval, and is emptied here.
  @Column({ name: 'password_hash', length: 255 })
  passwordHash: string;

  // About them, and what they'd like to make.
  @Column({ type: 'text' })
  about: string;

  // Where their work can be seen, if anywhere: links, one per line.
  @Column({ type: 'text', nullable: true })
  links: string | null;

  @Column({ type: 'simple-array' })
  kinds: CreatorKind[];

  // The languages they'd write in, in their own words.
  @Column({ type: 'varchar', length: 200, nullable: true })
  languages: string | null;

  @Column({ type: 'varchar', length: 80, nullable: true })
  country: string | null;

  @Column({ type: 'varchar', length: 20, default: 'pending' })
  status: ApplicationStatus;

  // Why it was declined, shown to the applicant when they try to sign in.
  @Column({ name: 'review_note', type: 'text', nullable: true })
  reviewNote: string | null;

  @ManyToOne(() => Admin, { eager: true, nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'reviewed_by_id' })
  reviewedBy: Admin | null;

  @Column({ name: 'reviewed_at', type: 'datetime', nullable: true })
  reviewedAt: Date | null;

  // The account made when it was approved.
  @Column({ name: 'account_id', type: 'int', nullable: true })
  accountId: number | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}

export function serializeApplication(application: CreatorApplication) {
  return {
    id: application.id,
    name: application.name,
    email: application.email,
    about: application.about,
    links: application.links,
    kinds: application.kinds,
    languages: application.languages,
    country: application.country,
    status: application.status,
    review_note: application.reviewNote,
    reviewed_by: application.reviewedBy && {
      id: application.reviewedBy.id,
      name: application.reviewedBy.name,
    },
    reviewed_at: application.reviewedAt?.toISOString() ?? null,
    account_id: application.accountId,
    created_at: application.createdAt.toISOString(),
  };
}
