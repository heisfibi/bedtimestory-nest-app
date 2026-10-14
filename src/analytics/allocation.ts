// How a month's subscription money is shared among the books, and each
// book's between its creator and the platform.
//
// Every subscriber who read anything in the month carries an equal part of the
// month's money. That part is shared among the books the subscriber read, in
// proportion to how much of each was read: a book read right through counts 1,
// half of it 0.5, and reading it again counts again. What a book gets from
// all of its readers is the money it made; the creator share of that (set by
// a super admin, see SettingsService) is its creator's and the rest the
// platform's.
//
// Shared this way, a book earns by being read by many subscribers, not by
// being read many times by one: nobody can direct more than their own
// subscription. Reading by people without a subscription (the free book) is
// counted, and earns nothing.

/** One sitting with a book (see ReadingSession). */
export interface SessionRow {
  readerId: string;
  bookId: number;
  seconds: number;
  pagesRead: number;
  pageCount: number;
  completed: boolean;
  subscribed: boolean;
}

export interface BookInfo {
  title: string;
  type: string;
  creator: { id: number; name: string } | null;
}

export interface BookLine {
  id: number;
  title: string;
  type: string;
  creator: { id: number; name: string } | null;
  /** Times subscribers opened it. */
  views: number;
  /** Subscribers who opened it. */
  subscribers: number;
  /** Subscribers who read at least a page of it. */
  readers: number;
  /** Subscribers who read its last page. */
  finished: number;
  /** How many times over subscribers read it: 2.5 is two and a half read-throughs. */
  reads: number;
  /** Subscribers' time on its pages. */
  minutes: number;
  /** Times it was opened without a subscription. */
  other_views: number;
  /** Its part of the month's money, 0 to 1. */
  share: number;
  /** What it made, and how that's split. Null until the month's money is entered. */
  amount: number | null;
  creator_amount: number | null;
  platform_amount: number | null;
}

export interface CreatorLine {
  /** Null gathers the books that have no creator any more. */
  id: number | null;
  name: string;
  books: number;
  /** Subscribers who read at least a page of any of their books. */
  readers: number;
  reads: number;
  share: number;
  /** What their books made, and their part of it. */
  amount: number | null;
  creator_amount: number | null;
}

export interface MonthTotals {
  /** Subscribers who used the app in the month. Null in a creator's own view. */
  subscribers_seen: number | null;
  /** Subscribers who read at least a page: each carries an equal part of the money. */
  subscribers_reading: number;
  /** Readers without a subscription who read at least a page. Null in a creator's own view. */
  other_readers: number | null;
  views: number;
  other_views: number;
  reads: number;
  minutes: number;
  share: number;
  /** The part of the month's money each reading subscriber carries. */
  per_subscriber: number | null;
  amount: number | null;
  creator_amount: number | null;
  platform_amount: number | null;
}

export interface MonthReport {
  /** "2026-10" */
  month: string;
  /** "all": every book. "own": the signed-in creator's books only. */
  scope: 'all' | 'own';
  split: { creator: number; platform: number };
  currency: string | null;
  /** The month's subscription money. Null until it's entered, and in a creator's own view. */
  revenue: number | null;
  /** When the month was closed: its figures are final from then. */
  closed_at: string | null;
  totals: MonthTotals;
  books: BookLine[];
  creators: CreatorLine[];
}

/** How much of the book a sitting got through: 1 is all of it. */
const readOf = (session: SessionRow) =>
  session.pageCount > 0
    ? Math.min(session.pagesRead, session.pageCount) / session.pageCount
    : 0;

const sum = (values: number[]) => values.reduce((total, n) => total + n, 0);
const round = (value: number, places: number) =>
  Math.round(value * 10 ** places) / 10 ** places;

/**
 * Shares a whole number of hundredths (cents, kobo) by `shares`, which add up
 * to 1, so that the parts add up to exactly the total: each gets its share
 * rounded down, and the hundredths left over go to those that lost most by it.
 */
export function apportion(total: number, shares: number[]): number[] {
  const exact = shares.map((share) => share * total);
  const parts = exact.map(Math.floor);
  const byLoss = exact
    .map((value, i) => ({ i, lost: value - parts[i] }))
    .sort((a, b) => b.lost - a.lost || a.i - b.i);
  let left = Math.min(total - sum(parts), parts.length);
  for (const { i } of byLoss) {
    if (left <= 0) break;
    parts[i] += 1;
    left -= 1;
  }
  return parts;
}

/**
 * A month's figures: every book's readers and reading, and, when `revenue`
 * (the month's subscription money) is known, what each book made and its
 * creator's part of that, `creatorShare` (0 to 1).
 * `subscribersSeen` is how many subscribers used the app at all.
 */
export function monthFigures(
  sessions: SessionRow[],
  books: Map<number, BookInfo>,
  revenue: number | null,
  subscribersSeen: number,
  creatorShare: number,
): Pick<MonthReport, 'totals' | 'books' | 'creators'> {
  const tallies = new Map<
    number,
    {
      views: number;
      otherViews: number;
      seconds: number;
      reads: number;
      subscribers: Set<string>;
      readers: Set<string>;
      finished: Set<string>;
    }
  >();
  const tallyOf = (bookId: number) => {
    let tally = tallies.get(bookId);
    if (!tally) {
      tally = {
        views: 0,
        otherViews: 0,
        seconds: 0,
        reads: 0,
        subscribers: new Set(),
        readers: new Set(),
        finished: new Set(),
      };
      tallies.set(bookId, tally);
    }
    return tally;
  };

  // For each subscriber, how much of each book they read.
  const reading = new Map<string, Map<number, number>>();
  const otherReaders = new Set<string>();
  const subscribers = new Set<string>();
  for (const session of sessions) {
    const tally = tallyOf(session.bookId);
    const read = readOf(session);
    if (!session.subscribed) {
      tally.otherViews += 1;
      if (read > 0) otherReaders.add(session.readerId);
      continue;
    }
    subscribers.add(session.readerId);
    tally.views += 1;
    tally.seconds += session.seconds;
    tally.subscribers.add(session.readerId);
    if (session.completed) tally.finished.add(session.readerId);
    if (read > 0) {
      tally.readers.add(session.readerId);
      tally.reads += read;
      const theirs = reading.get(session.readerId) ?? new Map<number, number>();
      theirs.set(session.bookId, (theirs.get(session.bookId) ?? 0) + read);
      reading.set(session.readerId, theirs);
    }
  }

  // Each reading subscriber is one part of the money, shared among their books.
  const parts = new Map<number, number>();
  for (const theirs of reading.values()) {
    const all = sum([...theirs.values()]);
    for (const [bookId, read] of theirs) {
      parts.set(bookId, (parts.get(bookId) ?? 0) + read / all);
    }
  }
  const readingSubscribers = reading.size;

  const ids = [...tallies.keys()];
  const shares = ids.map((id) =>
    readingSubscribers ? (parts.get(id) ?? 0) / readingSubscribers : 0,
  );
  const hundredths =
    revenue === null
      ? null
      : apportion(readingSubscribers ? Math.round(revenue * 100) : 0, shares);

  const lines = ids.map((id, i): BookLine => {
    const tally = tallies.get(id)!;
    const info = books.get(id);
    const made = hundredths ? hundredths[i] : null;
    const creators = made === null ? null : Math.round(made * creatorShare);
    return {
      id,
      title: info?.title ?? `Deleted book ${id}`,
      type: info?.type ?? 'basic',
      creator: info?.creator ?? null,
      views: tally.views,
      subscribers: tally.subscribers.size,
      readers: tally.readers.size,
      finished: tally.finished.size,
      reads: round(tally.reads, 2),
      minutes: round(tally.seconds / 60, 1),
      other_views: tally.otherViews,
      share: round(shares[i], 6),
      amount: made === null ? null : made / 100,
      creator_amount: creators === null ? null : creators / 100,
      platform_amount:
        made === null || creators === null ? null : (made - creators) / 100,
    };
  });
  lines.sort(
    (a, b) =>
      b.share - a.share ||
      b.reads - a.reads ||
      b.views + b.other_views - (a.views + a.other_views) ||
      a.title.localeCompare(b.title),
  );

  const money = (values: (number | null)[]) =>
    revenue === null ? null : round(sum(values.map((value) => value ?? 0)), 2);

  const byCreator = new Map<number | null, BookLine[]>();
  for (const line of lines) {
    const key = line.creator?.id ?? null;
    byCreator.set(key, [...(byCreator.get(key) ?? []), line]);
  }
  const creators = [...byCreator].map(([id, theirs]): CreatorLine => {
    const readers = new Set<string>();
    for (const line of theirs) {
      for (const reader of tallies.get(line.id)!.readers) readers.add(reader);
    }
    return {
      id,
      name: theirs[0].creator?.name ?? 'No creator',
      books: theirs.length,
      readers: readers.size,
      reads: round(sum(theirs.map((line) => line.reads)), 2),
      share: round(sum(theirs.map((line) => line.share)), 6),
      amount: money(theirs.map((line) => line.amount)),
      creator_amount: money(theirs.map((line) => line.creator_amount)),
    };
  });
  creators.sort((a, b) => b.share - a.share || a.name.localeCompare(b.name));

  return {
    totals: {
      subscribers_seen: Math.max(subscribersSeen, subscribers.size),
      subscribers_reading: readingSubscribers,
      other_readers: otherReaders.size,
      views: sum(lines.map((line) => line.views)),
      other_views: sum(lines.map((line) => line.other_views)),
      reads: round(sum(lines.map((line) => line.reads)), 2),
      minutes: round(sum(lines.map((line) => line.minutes)), 1),
      share: readingSubscribers ? 1 : 0,
      per_subscriber:
        revenue === null || !readingSubscribers
          ? null
          : round(revenue / readingSubscribers, 2),
      amount: money(lines.map((line) => line.amount)),
      creator_amount: money(lines.map((line) => line.creator_amount)),
      platform_amount: money(lines.map((line) => line.platform_amount)),
    },
    books: lines,
    creators,
  };
}

/** A month's report as one creator may see it: their books, and nobody else's figures. */
export function ownView(report: MonthReport, creatorId: number): MonthReport {
  const books = report.books.filter((line) => line.creator?.id === creatorId);
  const mine = report.creators.find((line) => line.id === creatorId);
  const money = (values: (number | null)[]) =>
    mine?.amount === null || mine?.amount === undefined
      ? null
      : round(sum(values.map((value) => value ?? 0)), 2);
  return {
    ...report,
    scope: 'own',
    revenue: null,
    totals: {
      subscribers_seen: null,
      subscribers_reading: mine?.readers ?? 0,
      other_readers: null,
      views: sum(books.map((line) => line.views)),
      other_views: sum(books.map((line) => line.other_views)),
      reads: mine?.reads ?? 0,
      minutes: round(sum(books.map((line) => line.minutes)), 1),
      share: mine?.share ?? 0,
      per_subscriber: null,
      amount: mine?.amount ?? null,
      creator_amount: mine?.creator_amount ?? null,
      platform_amount: money(books.map((line) => line.platform_amount)),
    },
    books,
    creators: mine ? [mine] : [],
  };
}
