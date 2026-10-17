import { Column, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';
import type { StorePlatform } from './release.js';

// What one store is serving (see release.ts). A super admin sets it from the
// studio's App release page once a build is live there: nothing changes it on
// its own when a release goes out.
@Entity('app_releases')
export class AppRelease {
  @PrimaryColumn({ type: 'varchar', length: 16 })
  platform: StorePlatform;

  @Column({ type: 'varchar', length: 32 })
  version: string;

  @Column({ type: 'int', nullable: true })
  build: number | null;

  @Column({
    name: 'minimum_version',
    type: 'varchar',
    length: 32,
    nullable: true,
  })
  minimumVersion: string | null;

  @Column({ name: 'minimum_build', type: 'int', nullable: true })
  minimumBuild: number | null;

  @Column({ name: 'store_url', type: 'varchar', length: 500 })
  storeUrl: string;

  @Column({ type: 'simple-json' })
  notes: string[];

  // Who last changed it from the studio.
  @Column({ name: 'updated_by', type: 'varchar', length: 100, nullable: true })
  updatedBy: string | null;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
