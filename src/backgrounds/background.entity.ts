import { Column, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';

/** A screen background a super admin replaced. Slots without a row use the app's built-in picture. */
@Entity('app_backgrounds')
export class AppBackground {
  /** One of BACKGROUND_SLOTS. */
  @PrimaryColumn({ length: 32 })
  slot: string;

  /** The picture, relative to the media root. A new upload gets a new name, so the URL changes with it. */
  @Column({ length: 255 })
  image: string;

  @UpdateDateColumn()
  updatedAt: Date;
}
