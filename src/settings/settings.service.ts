import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Setting } from './setting.entity.js';

/** The creator's part of what a book makes until a super admin sets another. */
export const DEFAULT_CREATOR_SHARE = 0.6;

const CREATOR_SHARE = 'creator_share';
const APP_VERSIONS = 'app_versions';

/**
 * The app versions the backend tells the app about ("1.4.0"). Below
 * `min` the app can't be used until it's updated; below `latest` it
 * suggests an update. Null means no such version is set.
 */
export interface AppVersions {
  min: string | null;
  latest: string | null;
}

@Injectable()
export class SettingsService {
  constructor(
    @InjectRepository(Setting) private readonly settings: Repository<Setting>,
  ) {}

  /** The creator's part of what a book makes, 0 to 1; the platform keeps the rest. */
  async creatorShare() {
    return (await this.creatorShareSetting()).share;
  }

  /** The creator share, and who changed it last and when (null while it's the default). */
  async creatorShareSetting() {
    const row = await this.settings.findOneBy({ key: CREATOR_SHARE });
    const value = typeof row?.value === 'number' ? row.value : null;
    return {
      share: value ?? DEFAULT_CREATOR_SHARE,
      updatedBy: value === null ? null : row!.updatedBy,
      updatedAt: value === null ? null : row!.updatedAt,
    };
  }

  /** Super admins only. `share` is 0 to 1. */
  async setCreatorShare(share: number, by: string) {
    await this.settings.save(
      this.settings.create({ key: CREATOR_SHARE, value: share, updatedBy: by }),
    );
    return this.creatorShareSetting();
  }

  /** The app versions, and who changed them last and when (null while never set). */
  async appVersionsSetting() {
    const row = await this.settings.findOneBy({ key: APP_VERSIONS });
    const value = (row?.value ?? {}) as Partial<AppVersions>;
    return {
      versions: { min: value.min ?? null, latest: value.latest ?? null },
      updatedBy: row?.updatedBy ?? null,
      updatedAt: row?.updatedAt ?? null,
    };
  }

  /** Super admins only. */
  async setAppVersions(versions: AppVersions, by: string) {
    await this.settings.save(
      this.settings.create({
        key: APP_VERSIONS,
        value: versions,
        updatedBy: by,
      }),
    );
    return this.appVersionsSetting();
  }

  /**
   * Runs `change` once in the life of the database, remembered under `key`.
   * For data changes that synchronize can't make, like renaming a role.
   */
  async once(key: string, change: () => Promise<void>) {
    const marker = `done:${key}`;
    if (await this.settings.existsBy({ key: marker })) return;
    await change();
    await this.settings.save(
      this.settings.create({ key: marker, value: true, updatedBy: null }),
    );
  }
}
