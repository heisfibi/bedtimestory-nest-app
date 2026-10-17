import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AppRelease } from './app-release.entity.js';
import {
  checkRelease,
  MAX_NOTES,
  STORE_PLATFORMS,
  type Release,
  type ReleaseInput,
  type ReleaseManifest,
  type StorePlatform,
} from './release.js';

/**
 * How long the manifest is served from memory. Every app asks once a launch;
 * a save clears it at once on this instance.
 */
const CACHE_MS = 30_000;

/** A row as the app reads it: unset fields are left out, not null. */
function toRelease(row: AppRelease): Release {
  const notes = Array.isArray(row.notes)
    ? row.notes
        .filter((note): note is string => typeof note === 'string')
        .slice(0, MAX_NOTES)
    : [];
  return {
    version: row.version,
    ...(row.build != null ? { build: row.build } : {}),
    ...(row.minimumVersion ? { minimumVersion: row.minimumVersion } : {}),
    ...(row.minimumBuild != null ? { minimumBuild: row.minimumBuild } : {}),
    storeUrl: row.storeUrl,
    notes,
  };
}

function toManifest(rows: AppRelease[]): ReleaseManifest {
  if (rows.length === 0) return {};
  const newest = Math.max(...rows.map((row) => row.updatedAt.getTime()));
  const manifest: ReleaseManifest = {
    builtAt: new Date(newest).toISOString(),
  };
  for (const platform of STORE_PLATFORMS) {
    const row = rows.find((r) => r.platform === platform);
    if (row) manifest[platform] = toRelease(row);
  }
  return manifest;
}

/**
 * What version each store is serving, for the app's update card and its
 * "Time to update" screen. Google publishes no version API, so this table is
 * the only source: a super admin updates it from the studio after a release is
 * live in the store.
 */
@Injectable()
export class AppReleaseService {
  private cache: { at: number; manifest: Promise<ReleaseManifest> } | null =
    null;

  constructor(
    @InjectRepository(AppRelease)
    private readonly releases: Repository<AppRelease>,
  ) {}

  /** What the app reads. */
  manifest(): Promise<ReleaseManifest> {
    if (!this.cache || Date.now() - this.cache.at > CACHE_MS) {
      const manifest = this.releases
        .find()
        .then(toManifest)
        .catch((error: unknown) => {
          // Don't keep serving a failure for the rest of the window.
          if (this.cache?.manifest === manifest) this.cache = null;
          throw error;
        });
      this.cache = { at: Date.now(), manifest };
    }
    return this.cache.manifest;
  }

  /** Everything the studio's App release page shows, read fresh. */
  async adminView() {
    const rows = await this.releases.find();
    return {
      platforms: STORE_PLATFORMS.map((platform) => {
        const row = rows.find((r) => r.platform === platform);
        return {
          platform,
          release: row ? toRelease(row) : null,
          updated_by: row?.updatedBy ?? null,
          updated_at: row?.updatedAt.toISOString() ?? null,
        };
      }),
      manifest: toManifest(rows),
    };
  }

  /** Publishes a store's release: the next launch of the app there compares itself with it. */
  async save(platform: StorePlatform, input: ReleaseInput, by: string) {
    const release = checkRelease(platform, input);
    await this.releases.save(
      this.releases.create({
        platform,
        version: release.version,
        build: release.build ?? null,
        minimumVersion: release.minimumVersion ?? null,
        minimumBuild: release.minimumBuild ?? null,
        storeUrl: release.storeUrl,
        notes: release.notes,
        updatedBy: by,
      }),
    );
    this.cache = null;
  }

  /** Takes a store out of the manifest, which stops its readers being asked to update. */
  async remove(platform: StorePlatform) {
    const { affected } = await this.releases.delete({ platform });
    if (!affected)
      throw new NotFoundException('There is no release to remove.');
    this.cache = null;
  }
}
