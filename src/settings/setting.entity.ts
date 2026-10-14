import { Column, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';

// Values the super admin can change from the studio, and markers of one-off
// data changes already made (see SettingsService).
@Entity('settings')
export class Setting {
  @PrimaryColumn({ length: 64 })
  key: string;

  @Column({ type: 'simple-json' })
  value: unknown;

  // Who last changed it from the studio; null for the backend's own markers.
  @Column({ name: 'updated_by', type: 'varchar', length: 100, nullable: true })
  updatedBy: string | null;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
