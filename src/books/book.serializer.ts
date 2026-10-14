import { Book } from './book.entity.js';
import { PublishedBook } from './published-book.entity.js';

const mediaUrl = (baseUrl: string, path: string | null) =>
  path ? `${baseUrl}/media/${path}` : null;

// What the mobile app reads. Its `Book` type (bedtime-story/type.d.ts) uses
// id, title, level, mood, category, url, thumbnail, cover, title_translations
// and the timestamps; updated_at changing makes it re-download the book.
// `thumbnail` is the square picture in its library, and `cover` the first
// slide's picture, shown while the book opens (null for books saved before
// the two were kept apart: their thumbnail is that picture). `free` is true
// for the one book it opens without a subscription
// (PublishedBooksService.freeBookId); it locks the others.
export function serializePublishedBook(
  book: PublishedBook,
  baseUrl: string,
  freeId: number | null,
) {
  return {
    id: book.id,
    title: book.title,
    author: book.author,
    language: book.language,
    type: book.type,
    level: book.level,
    mood: book.mood,
    category: book.category?.name ?? null,
    // Who readers follow for news of the next book (the studio account).
    creator: book.creator && { id: book.creator.id, name: book.creator.name },
    free: book.id === freeId,
    slide_count: book.slideCount,
    url: mediaUrl(baseUrl, book.file)!,
    thumbnail: mediaUrl(baseUrl, book.thumbnail),
    cover: mediaUrl(baseUrl, book.cover),
    title_translations: book.titleTranslations.map(
      ({ language, lan, text }) => ({ language, lan, text }),
    ),
    created_at: book.createdAt.toISOString(),
    updated_at: book.updatedAt.toISOString(),
  };
}

// What the studio reads: the working copy, its review state, and whether
// (and since when) a version of it is live.
export function serializeBook(
  book: Book,
  live: PublishedBook | null,
  baseUrl: string,
) {
  return {
    id: book.id,
    title: book.title,
    author: book.author,
    language: book.language,
    type: book.type,
    level: book.level,
    mood: book.mood,
    category: book.category?.name ?? null,
    status: book.status,
    review_note: book.reviewNote,
    owner: book.owner && { id: book.owner.id, name: book.owner.name },
    reviewed_by: book.reviewedBy && {
      id: book.reviewedBy.id,
      name: book.reviewedBy.name,
    },
    submitted_at: book.submittedAt?.toISOString() ?? null,
    reviewed_at: book.reviewedAt?.toISOString() ?? null,
    slide_count: book.slideCount,
    url: mediaUrl(baseUrl, book.file)!,
    thumbnail: mediaUrl(baseUrl, book.thumbnail),
    cover: mediaUrl(baseUrl, book.cover),
    live: live && {
      since: live.createdAt.toISOString(),
      updated_at: live.updatedAt.toISOString(),
    },
    created_at: book.createdAt.toISOString(),
    updated_at: book.updatedAt.toISOString(),
  };
}
