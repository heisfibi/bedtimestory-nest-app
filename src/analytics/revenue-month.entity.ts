import { Column, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';
import type { BookLine, CreatorLine, MonthTotals } from './allocation.js';

// The subscription money of a month, as a super admin enters it from what the
// store paid out, and the month's statement once it's closed.
@Entity('revenue_months')
export class RevenueMonth {
  // "2026-10"
  @PrimaryColumn({ length: 7 })
  month: string;

  @Column({
    type: 'decimal',
    precision: 14,
    scale: 2,
    // MySQL hands decimals back as strings.
    transformer: { to: (value: number) => value, from: Number },
  })
  amount: number;

  // ISO 4217: "NGN", "USD".
  @Column({ length: 3 })
  currency: string;

  // Closing a month fixes what each book and creator earned in it: reading
  // that's reported later (a tablet that was offline) no longer changes it.
  @Column({ name: 'closed_at', type: 'datetime', nullable: true })
  closedAt: Date | null;

  // The month's totals and each creator's, as they stood when it was closed.
  // Each book's are in StatementBook.
  @Column({ type: 'simple-json', nullable: true })
  statement: { totals: MonthTotals; creators: CreatorLine[] } | null;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

// A book's figures for a closed month, as they stood when it was closed.
@Entity('statement_books')
export class StatementBook {
  @PrimaryColumn({ length: 7 })
  month: string;

  @PrimaryColumn({ name: 'book_id', type: 'int' })
  bookId: number;

  @Column({ type: 'simple-json' })
  line: BookLine;
}
