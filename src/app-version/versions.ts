/** An app version as people write it: "1", "1.4" or "1.4.2" (up to four parts). */
export const VERSION = /^\d{1,5}(\.\d{1,5}){0,3}$/;

/**
 * Below 0 when `a` is older than `b`, 0 when they're the same version, above
 * 0 when it's newer. Missing parts count as 0, so "1.4" is "1.4.0".
 */
export function compareVersions(a: string, b: string) {
  const left = a.split('.').map(Number);
  const right = b.split('.').map(Number);
  for (let i = 0; i < Math.max(left.length, right.length); i++) {
    const difference = (left[i] ?? 0) - (right[i] ?? 0);
    if (difference !== 0) return difference;
  }
  return 0;
}
