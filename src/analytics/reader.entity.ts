import { Column, CreateDateColumn, Entity, PrimaryColumn } from 'typeorm';

// An install of the mobile app. The id is made up by the app the first time it
// runs: it names a tablet's copy of the app, not a person, and nothing else is
// known of whoever uses it. Whether it has a subscription is what the app says
// Google Play told it; `purchaseToken` is kept so that it can be checked with
// Google.
@Entity('readers')
export class Reader {
  @PrimaryColumn({ length: 36 })
  id: string;

  @Column({ default: false })
  subscribed: boolean;

  // The subscription's base plan in Google Play ("monthly", "yearly").
  @Column({ type: 'varchar', length: 60, nullable: true })
  plan: string | null;

  @Column({
    name: 'purchase_token',
    type: 'varchar',
    length: 600,
    nullable: true,
  })
  purchaseToken: string | null;

  @CreateDateColumn({ name: 'first_seen_at' })
  firstSeenAt: Date;

  // When the app last started, or last sent reading.
  @Column({ name: 'last_seen_at', type: 'datetime' })
  lastSeenAt: Date;
}

// A reader in a month it used the app: whether it was a subscriber then.
// Readers move in and out of subscriptions, and a month's figures have to
// stay what they were.
@Entity('reader_months')
export class ReaderMonth {
  @PrimaryColumn({ name: 'reader_id', length: 36 })
  readerId: string;

  // "2026-10"
  @PrimaryColumn({ length: 7 })
  month: string;

  // Seen with a subscription at some point in the month.
  @Column({ default: false })
  subscribed: boolean;

  @Column({ type: 'varchar', length: 60, nullable: true })
  plan: string | null;
}
