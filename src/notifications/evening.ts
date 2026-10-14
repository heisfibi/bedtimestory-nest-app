// When news of a book reaches a reader: early in their evening, as bedtime
// stories are thought of, and never in the night. A book approved at 10 in
// the morning is tonight's news at half past five.

const MINUTE_MS = 60 * 1000;
const HOUR_MS = 60 * MINUTE_MS;

/** Local time the evening's news goes out from, and the last moment it may. */
export const EVENING_FROM = 17 * 60 + 30;
export const EVENING_UNTIL = 20 * 60;

/** A reader gets one piece of news at most this often. */
export const LEAST_GAP_MS = 20 * HOUR_MS;

/** Where a reader is: their time zone if the server knows it, and their offset from UTC as the app last saw it. */
export type Whereabouts = { timeZone: string | null; utcOffset: number };

/** Minutes ahead of UTC at `at` in `place`. */
export function offsetAt(at: Date, place: Whereabouts): number {
  if (place.timeZone) {
    try {
      const parts = new Intl.DateTimeFormat('en-US', {
        timeZone: place.timeZone,
        hourCycle: 'h23',
        year: 'numeric',
        month: 'numeric',
        day: 'numeric',
        hour: 'numeric',
        minute: 'numeric',
      }).formatToParts(at);
      const part = (type: string) =>
        Number(parts.find((p) => p.type === type)?.value);
      const local = Date.UTC(
        part('year'),
        part('month') - 1,
        part('day'),
        part('hour'),
        part('minute'),
      );
      const minutes = Math.round(
        (local - (at.getTime() - (at.getTime() % MINUTE_MS))) / MINUTE_MS,
      );
      if (Number.isFinite(minutes)) return minutes;
    } catch {
      // A zone this server doesn't know: the offset will do.
    }
  }
  return place.utcOffset;
}

/** The first moment from `from` on that falls in the reader's evening. */
export function nextEvening(from: Date, place: Whereabouts): Date {
  const offset = offsetAt(from, place);
  const local = new Date(from.getTime() + offset * MINUTE_MS);
  const minuteOfDay = local.getUTCHours() * 60 + local.getUTCMinutes();
  if (minuteOfDay >= EVENING_FROM && minuteOfDay < EVENING_UNTIL) return from;

  const day = Date.UTC(
    local.getUTCFullYear(),
    local.getUTCMonth(),
    local.getUTCDate() + (minuteOfDay >= EVENING_UNTIL ? 1 : 0),
  );
  const evening = day + EVENING_FROM * MINUTE_MS;
  // The offset where the evening falls (daylight saving may start between).
  const guess = new Date(evening - offset * MINUTE_MS);
  return new Date(evening - offsetAt(guess, place) * MINUTE_MS);
}

/** When a reader may next hear of a book: the next evening after now, and after a day's rest from the last. */
export function whenToTell(
  now: Date,
  place: Whereabouts,
  lastPushAt: Date | null,
): Date {
  const rested = lastPushAt
    ? Math.max(now.getTime(), lastPushAt.getTime() + LEAST_GAP_MS)
    : now.getTime();
  return nextEvening(new Date(rested), place);
}
