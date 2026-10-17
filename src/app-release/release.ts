import { BadRequestException } from '@nestjs/common';

// What each store is serving, as the app reads it at /api/app-release/manifest.json
// (bedtime-story/appUpdate.ts keeps its own copy of these shapes and rules: keep
// the two in step). Modelled on Number Puzzles' app release manifest.
//
// One entry per store, because the stores never release at the same moment: a
// build can be live on Google Play while Apple is still reviewing it, and
// telling iOS readers to update to a version they can't download yet is worse
// than saying nothing.

export const STORE_PLATFORMS = ['android', 'ios'] as const;
export type StorePlatform = (typeof STORE_PLATFORMS)[number];

export const isStorePlatform = (value: string): value is StorePlatform =>
  (STORE_PLATFORMS as readonly string[]).includes(value);

/** One store's entry. Unset fields are left out, not null. */
export type Release = {
  /** The newest version in the store, e.g. "1.1.0": shown as "your version → this one". */
  version: string;
  /** Its Android versionCode / iOS build number. The app compares this first. */
  build?: number;
  /** Below this the app can't be used until it's updated. */
  minimumVersion?: string;
  minimumBuild?: number;
  /** The app's store page; "Update" opens it. */
  storeUrl: string;
  /** "What's new", one line each. */
  notes: string[];
};

export type ReleaseManifest = Partial<Record<StorePlatform, Release>> & {
  builtAt?: string;
};

export type ReleaseInput = {
  version: string;
  build?: number | null;
  minimumVersion?: string | null;
  minimumBuild?: number | null;
  storeUrl: string;
  notes: string[];
};

/** The app's dialog shows at most four "what's new" lines. */
export const MAX_NOTES = 4;
/** "1", "1.4" or "1.4.2" (up to four parts): numbers and dots only. */
export const RELEASE_VERSION = /^\d{1,6}(\.\d{1,6}){0,3}$/;
/** Google Play's limit on a versionCode. */
export const MAX_BUILD = 2_100_000_000;

/** Splits "1.10.2-beta.1" into [1, 10, 2]: a non-numeric suffix is dropped. */
function segments(version: string) {
  return version
    .trim()
    .split('.')
    .map((part) => {
      const digits = /^\d+/.exec(part);
      return digits ? Number(digits[0]) : 0;
    });
}

/**
 * Below 0 when `a` is older than `b`, 0 when they're the same version, above
 * 0 when it's newer. A missing part is a zero, so "1.2" is "1.2.0".
 */
export function compareVersions(a: string, b: string) {
  const left = segments(a);
  const right = segments(b);
  for (let i = 0; i < Math.max(left.length, right.length); i++) {
    const difference = (left[i] ?? 0) - (right[i] ?? 0);
    if (difference !== 0) return difference;
  }
  return 0;
}

/**
 * The only hosts each store's link may point at. The link is opened on every
 * out-of-date reader's tablet, so a typo or a pasted look-alike has to fail
 * here rather than there.
 */
const STORE_HOSTS: Record<StorePlatform, { host: string; example: string }> = {
  android: {
    host: 'play.google.com',
    example: 'https://play.google.com/store/apps/details?id=…',
  },
  ios: { host: 'apps.apple.com', example: 'https://apps.apple.com/app/id…' },
};

function checkStoreUrl(platform: StorePlatform, raw: string) {
  const { host, example } = STORE_HOSTS[platform];
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    throw new BadRequestException(
      `The store link isn't a web address. It should look like ${example}`,
    );
  }
  const androidPage =
    url.pathname === '/store/apps/details' && !!url.searchParams.get('id');
  if (
    url.protocol !== 'https:' ||
    url.hostname !== host ||
    (platform === 'android' && !androidPage)
  ) {
    throw new BadRequestException(
      `The store link has to be the app's page on ${host}, like ${example}`,
    );
  }
  return url.href;
}

/**
 * Checks a release before it goes live. Most of all it refuses a minimum above
 * the latest release: that would tell every reader, even one already up to
 * date, that the app can't be used until they install a build the store
 * doesn't have.
 */
export function checkRelease(
  platform: StorePlatform,
  input: ReleaseInput,
): Release {
  const version = input.version.trim();
  const minimumVersion = input.minimumVersion?.trim() || undefined;
  const build = input.build ?? undefined;
  const minimumBuild = input.minimumBuild ?? undefined;
  const notes = input.notes
    .map((note) => note.trim().replace(/\s+/g, ' '))
    .filter(Boolean);

  if (notes.length > MAX_NOTES) {
    throw new BadRequestException(
      `The update card shows at most ${MAX_NOTES} "what's new" lines.`,
    );
  }
  if (minimumBuild != null && build == null) {
    throw new BadRequestException(
      'Set the build number too. A minimum build is only safe next to the build it sits under.',
    );
  }
  if (minimumBuild != null && build != null && minimumBuild > build) {
    throw new BadRequestException(
      `The minimum build (${minimumBuild}) is above the build in the store (${build}). Every reader would be told to install a build the store doesn't have.`,
    );
  }
  if (minimumVersion && compareVersions(minimumVersion, version) > 0) {
    throw new BadRequestException(
      `The minimum version (${minimumVersion}) is above the version in the store (${version}). Every reader would be told to install a version the store doesn't have.`,
    );
  }

  return {
    version,
    ...(build != null ? { build } : {}),
    ...(minimumVersion ? { minimumVersion } : {}),
    ...(minimumBuild != null ? { minimumBuild } : {}),
    storeUrl: checkStoreUrl(platform, input.storeUrl),
    notes,
  };
}
