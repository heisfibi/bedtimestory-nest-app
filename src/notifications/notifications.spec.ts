import type { PublishedBook } from '../books/published-book.entity.js';
import { LEAST_GAP_MS, nextEvening, offsetAt, whenToTell } from './evening.js';
import { PUSH_COPY } from './push-copy.js';
import { composeNews } from './notifications.service.js';

const lagos = { timeZone: 'Africa/Lagos', utcOffset: 60 };
const newYork = { timeZone: 'America/New_York', utcOffset: -240 };

describe('evening', () => {
  it('knows a zone’s offset, daylight saving included', () => {
    expect(offsetAt(new Date('2026-10-13T12:00:00Z'), lagos)).toBe(60);
    expect(offsetAt(new Date('2026-07-01T12:00:00Z'), newYork)).toBe(-240);
    expect(offsetAt(new Date('2026-12-01T12:00:00Z'), newYork)).toBe(-300);
  });

  it('falls back to the offset for a zone it doesn’t know', () => {
    const nowhere = { timeZone: 'Mars/Olympus', utcOffset: 330 };
    expect(offsetAt(new Date(), nowhere)).toBe(330);
  });

  it('waits for half past five, local time', () => {
    // 10:00 in Lagos.
    expect(
      nextEvening(new Date('2026-10-13T09:00:00Z'), lagos).toISOString(),
    ).toBe('2026-10-13T16:30:00.000Z');
  });

  it('sends at once in the evening', () => {
    const at = new Date('2026-10-13T17:15:00Z'); // 18:15 in Lagos
    expect(nextEvening(at, lagos)).toEqual(at);
  });

  it('keeps the night quiet: after eight it’s tomorrow evening', () => {
    // 22:00 in Lagos.
    expect(
      nextEvening(new Date('2026-10-13T21:00:00Z'), lagos).toISOString(),
    ).toBe('2026-10-14T16:30:00.000Z');
  });

  it('crosses a change of the clocks', () => {
    // New York leaves daylight saving on 1 November 2026: 17:30 is then 22:30 UTC.
    expect(
      nextEvening(new Date('2026-11-01T03:00:00Z'), newYork).toISOString(),
    ).toBe('2026-11-01T22:30:00.000Z');
  });

  it('rests a day after the last notification', () => {
    const last = new Date('2026-10-13T16:30:00Z');
    const now = new Date('2026-10-13T17:00:00Z');
    const next = whenToTell(now, lagos, last);
    expect(next.getTime()).toBeGreaterThanOrEqual(
      last.getTime() + LEAST_GAP_MS,
    );
    expect(next.toISOString()).toBe('2026-10-14T16:30:00.000Z');
  });
});

const book = (id: number, title: string, extra: Partial<PublishedBook> = {}) =>
  ({
    id,
    title,
    author: null,
    creator: { id: 7, name: 'Ada Obi' },
    titleTranslations: [
      { language: 'French', lan: 'fr', text: `${title} (fr)` },
    ],
    type: 'basic',
    createdAt: new Date(`2026-10-${10 + id}T10:00:00Z`),
    ...extra,
  }) as PublishedBook;

const device = { token: 'ExponentPushToken[abc]', language: 'en' };

describe('composeNews', () => {
  it('names a new book', () => {
    const message = composeNews(
      device,
      [{ book: book(1, 'The Owl'), reason: 'new', free: false }],
      false,
    )!;
    expect(message.title).toBe('A new book is here 🌙');
    expect(message.body).toContain('The Owl');
    expect(message.data).toEqual({
      kind: 'new_book',
      book_id: 1,
      type: 'basic',
    });
  });

  it('tells readers without a subscription the new story is free', () => {
    const news = [
      { book: book(1, 'The Owl'), reason: 'new' as const, free: true },
    ];
    expect(composeNews(device, news, false)!.title).toBe(
      'Tonight’s free story 🎁',
    );
    expect(composeNews(device, news, true)!.title).toBe(
      'A new book is here 🌙',
    );
  });

  it('puts a creator the reader likes first, by their pen name', () => {
    const message = composeNews(
      device,
      [
        { book: book(2, 'The Moon'), reason: 'new', free: false },
        {
          book: book(1, 'The Owl', { author: 'Auntie Ada' }),
          reason: 'creator',
          free: false,
        },
      ],
      false,
    )!;
    expect(message.title).toBe('New from Auntie Ada ⭐');
    expect(message.body).toContain('The Owl');
    expect(message.data).toEqual({
      kind: 'new_book',
      book_id: 1,
      type: 'basic',
    });
  });

  it('counts several books, newest first, in the reader’s language', () => {
    const message = composeNews(
      { ...device, language: 'fr' },
      [
        { book: book(1, 'The Owl'), reason: 'new', free: false },
        { book: book(2, 'The Moon'), reason: 'new', free: false },
      ],
      false,
    )!;
    expect(message.title).toBe('2 nouveaux livres ce soir 📚');
    expect(message.body).toContain('The Moon (fr)');
  });

  it('has every wording in every language', () => {
    const keys = Object.keys(PUSH_COPY.en).sort();
    for (const [language, copy] of Object.entries(PUSH_COPY)) {
      expect(Object.keys(copy).sort(), language).toEqual(keys);
      expect(copy.creator_title, language).toContain('{creator}');
      expect(copy.many_title, language).toContain('{count}');
      for (const body of [
        copy.one_body,
        copy.free_body,
        copy.creator_body,
        copy.many_body,
      ]) {
        expect(body, language).toContain('{title}');
      }
    }
    expect(Object.keys(PUSH_COPY)).toHaveLength(24);
  });
});
