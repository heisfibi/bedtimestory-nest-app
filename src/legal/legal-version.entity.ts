import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';
import type { LegalDocument } from './legal-documents.js';

// Every text a super admin has published for a legal page, kept so we can
// always tell what a page said on a given day. The newest is the one served;
// before the first, the built-in text (defaults.ts) is version 0.
@Entity('legal_versions')
@Index(['document', 'version'], { unique: true })
export class LegalVersion {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 32 })
  document: LegalDocument;

  // 1, 2, 3… for each document.
  @Column('int')
  version: number;

  // As the page shows it: "2026-10-18".
  @Column({ name: 'effective_date', type: 'varchar', length: 10 })
  effectiveDate: string;

  // In the Markdown of legal-text.ts.
  @Column({ type: 'text' })
  body: string;

  // What changed, for the studio's history.
  @Column({ type: 'varchar', length: 300, nullable: true })
  note: string | null;

  @Column({ name: 'created_by', type: 'varchar', length: 100, nullable: true })
  createdBy: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
