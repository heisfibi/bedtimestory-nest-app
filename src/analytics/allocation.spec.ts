import {
  apportion,
  monthFigures,
  ownView,
  type BookInfo,
  type MonthReport,
  type SessionRow,
} from './allocation.js';

const ada = { id: 1, name: 'Ada' };
const bola = { id: 2, name: 'Bola' };
const books = new Map<number, BookInfo>([
  [10, { title: 'The Owl', type: 'basic', creator: ada }],
  [20, { title: 'The Moon', type: 'poem', creator: bola }],
  [30, { title: 'The Fox', type: 'comic', creator: ada }],
]);

/** A sitting: `read` pages of a ten-page book. */
const sitting = (
  readerId: string,
  bookId: number,
  read: number,
  subscribed = true,
): SessionRow => ({
  readerId,
  bookId,
  seconds: read * 30,
  pagesRead: read,
  pageCount: 10,
  completed: read === 10,
  subscribed,
});

// The creator's part, as the super admin set it.
const SHARE = 0.6;

const line = (figures: Pick<MonthReport, 'books'>, id: number) =>
  figures.books.find((book) => book.id === id)!;

describe('monthFigures', () => {
  it("shares each subscriber's part among the books they read, by how much of each", () => {
    const figures = monthFigures(
      [
        // One read the owl right through and half of the moon...
        sitting('a', 10, 10),
        sitting('a', 20, 5),
        // ...the other read the moon twice.
        sitting('b', 20, 10),
        sitting('b', 20, 10),
      ],
      books,
      1000,
      2,
      SHARE,
    );

    expect(figures.totals).toMatchObject({
      subscribers_seen: 2,
      subscribers_reading: 2,
      per_subscriber: 500,
      reads: 3.5,
      amount: 1000,
      creator_amount: 600,
      platform_amount: 400,
    });
    // 500 × 1/1.5, and 500 × 0.5/1.5 + 500.
    expect(line(figures, 10)).toMatchObject({
      readers: 1,
      finished: 1,
      reads: 1,
      amount: 333.33,
      creator_amount: 200,
      platform_amount: 133.33,
    });
    expect(line(figures, 20)).toMatchObject({
      views: 3,
      readers: 2,
      finished: 1,
      reads: 2.5,
      amount: 666.67,
      creator_amount: 400,
      platform_amount: 266.67,
    });
    expect(figures.books.map((book) => book.id)).toEqual([20, 10]);
    expect(figures.creators).toEqual([
      expect.objectContaining({
        id: 2,
        books: 1,
        amount: 666.67,
        creator_amount: 400,
      }),
      expect.objectContaining({
        id: 1,
        books: 1,
        amount: 333.33,
        creator_amount: 200,
      }),
    ]);
  });

  it("gives a book no more of a subscriber's part for being read over and over", () => {
    const again = Array.from({ length: 100 }, () => sitting('a', 10, 10));
    const figures = monthFigures(
      [...again, sitting('b', 20, 10)],
      books,
      500,
      2,
      SHARE,
    );
    expect(line(figures, 10)).toMatchObject({
      reads: 100,
      share: 0.5,
      amount: 250,
    });
    expect(line(figures, 20)).toMatchObject({
      reads: 1,
      share: 0.5,
      amount: 250,
    });
  });

  it('counts reading without a subscription, and pays nothing for it', () => {
    const figures = monthFigures(
      [
        sitting('a', 10, 10),
        sitting('free-1', 20, 10, false),
        sitting('free-2', 20, 4, false),
        // Opened, and left on the first page.
        sitting('a', 30, 0),
      ],
      books,
      300,
      1,
      SHARE,
    );
    expect(figures.totals).toMatchObject({
      subscribers_reading: 1,
      other_readers: 2,
      views: 2,
      other_views: 2,
    });
    expect(line(figures, 10)).toMatchObject({ share: 1, amount: 300 });
    expect(line(figures, 20)).toMatchObject({
      views: 0,
      other_views: 2,
      readers: 0,
      share: 0,
      amount: 0,
    });
    expect(line(figures, 30)).toMatchObject({
      views: 1,
      subscribers: 1,
      readers: 0,
      share: 0,
      amount: 0,
    });
  });

  it("shows shares before the month's money is known, and no amounts", () => {
    const figures = monthFigures(
      [sitting('a', 10, 10), sitting('b', 20, 10), sitting('c', 20, 10)],
      books,
      null,
      5,
      SHARE,
    );
    expect(figures.totals).toMatchObject({
      subscribers_seen: 5,
      subscribers_reading: 3,
      per_subscriber: null,
      amount: null,
    });
    expect(line(figures, 20).share).toBeCloseTo(2 / 3, 5);
    expect(line(figures, 20).amount).toBeNull();
    expect(figures.creators[0]).toMatchObject({
      id: 2,
      amount: null,
      creator_amount: null,
    });
  });

  it('pays out every hundredth of the money, and no more', () => {
    const figures = monthFigures(
      [sitting('a', 10, 10), sitting('b', 20, 10), sitting('c', 30, 10)],
      books,
      100,
      3,
      SHARE,
    );
    const amounts = figures.books.map((book) => book.amount ?? 0);
    expect(amounts.sort((a, b) => a - b)).toEqual([33.33, 33.33, 33.34]);
    expect(figures.totals.amount).toBe(100);
    for (const book of figures.books) {
      expect(book.creator_amount! + book.platform_amount!).toBeCloseTo(
        book.amount!,
        10,
      );
    }
  });

  it('keeps the money unshared when no subscriber read anything', () => {
    const figures = monthFigures(
      [sitting('free', 10, 10, false)],
      books,
      900,
      0,
      SHARE,
    );
    expect(figures.totals).toMatchObject({
      subscribers_reading: 0,
      share: 0,
      amount: 0,
    });
    expect(line(figures, 10).amount).toBe(0);
  });

  it('gives creators the share the super admin set', () => {
    const figures = monthFigures(
      [sitting('a', 10, 10), sitting('b', 20, 10)],
      books,
      1000,
      2,
      0.75,
    );
    expect(line(figures, 10)).toMatchObject({
      amount: 500,
      creator_amount: 375,
      platform_amount: 125,
    });
    expect(figures.totals).toMatchObject({
      creator_amount: 750,
      platform_amount: 250,
    });
  });

  it('keeps the reading of a book that has since been deleted', () => {
    const figures = monthFigures([sitting('a', 99, 10)], books, 50, 1, SHARE);
    expect(line(figures, 99)).toMatchObject({
      title: 'Deleted book 99',
      creator: null,
      amount: 50,
    });
    expect(figures.creators).toEqual([
      expect.objectContaining({
        id: null,
        name: 'No creator',
        creator_amount: 30,
      }),
    ]);
  });
});

describe('ownView', () => {
  it("shows a creator their own books and nothing of anyone else's", () => {
    const report: MonthReport = {
      month: '2026-09',
      scope: 'all',
      split: { creator: 0.6, platform: 0.4 },
      currency: 'NGN',
      revenue: 1000,
      closed_at: null,
      ...monthFigures(
        [
          sitting('a', 10, 10),
          sitting('a', 30, 10),
          sitting('a', 20, 10),
          sitting('b', 20, 10),
        ],
        books,
        1000,
        2,
        SHARE,
      ),
    };
    const own = ownView(report, ada.id);
    expect(own).toMatchObject({ scope: 'own', revenue: null, currency: 'NGN' });
    expect(own.books.map((book) => book.id).sort((a, b) => a - b)).toEqual([
      10, 30,
    ]);
    expect(own.creators).toHaveLength(1);
    // A third each of one subscriber's 500: 166.67 a book, the odd hundredths going to the first two.
    expect(own.totals).toMatchObject({
      subscribers_seen: null,
      other_readers: null,
      per_subscriber: null,
      subscribers_reading: 1,
      reads: 2,
      amount: 333.34,
      creator_amount: 200,
      platform_amount: 133.34,
    });
    expect(report.totals.amount).toBe(1000);
    expect(ownView(report, 999)).toMatchObject({ books: [], creators: [] });
  });
});

describe('apportion', () => {
  it('adds up to the total exactly', () => {
    expect(apportion(100, [1 / 3, 1 / 3, 1 / 3])).toEqual([34, 33, 33]);
    expect(apportion(1, [0.5, 0.5])).toEqual([1, 0]);
    expect(apportion(0, [0.7, 0.3])).toEqual([0, 0]);
    expect(
      apportion(999_999_999, [0.1, 0.2, 0.7]).reduce((a, b) => a + b),
    ).toBe(999_999_999);
  });
});
