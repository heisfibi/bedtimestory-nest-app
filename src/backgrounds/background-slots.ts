/**
 * The app's screen backgrounds a super admin can replace. Each has a picture
 * built into the app, which it shows until a replacement is uploaded (and
 * again once the replacement is removed). The app
 * (bedtime-story/constants/backgrounds.ts) and the studio
 * (next/creator-app/src/lib/backgrounds.ts) hold the same list.
 */
export const BACKGROUND_SLOTS = [
  'splash',
  'menu',
  'story',
  'poem',
  'comic',
  'book',
  'settings',
  'languages',
  'music',
  'subscriptions',
] as const;
export type BackgroundSlot = (typeof BACKGROUND_SLOTS)[number];

export const isBackgroundSlot = (slot: string): slot is BackgroundSlot =>
  (BACKGROUND_SLOTS as readonly string[]).includes(slot);

/** The picture's file extension, judged by its first bytes, or null if it isn't a JPEG, PNG or WebP. */
export function imageExtension(data: Buffer) {
  if (
    data.length >= 3 &&
    data[0] === 0xff &&
    data[1] === 0xd8 &&
    data[2] === 0xff
  ) {
    return '.jpg';
  }
  if (
    data
      .subarray(0, 8)
      .equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
  ) {
    return '.png';
  }
  if (
    data.subarray(0, 4).toString('latin1') === 'RIFF' &&
    data.subarray(8, 12).toString('latin1') === 'WEBP'
  ) {
    return '.webp';
  }
  return null;
}
