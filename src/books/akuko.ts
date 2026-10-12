import { extname, posix } from 'node:path';
import { BadRequestException } from '@nestjs/common';
import JSZip from 'jszip';

interface AkukoSlide {
  image?: string;
  text?: string;
  /** Voice-over recordings: narration id → path inside the zip. */
  audio?: Record<string, string>;
  /** A comic page's words. Each bubble has recordings of its own, kept the same way. */
  texts?: { audio?: Record<string, string> }[];
}

/** A voice-over: one narrator reading the book in one language. */
interface AkukoNarration {
  id?: string;
  lan?: string;
  narrator?: string;
}

/** A question asked after the story: four answers, `answer` the right one's index. */
interface AkukoQuizQuestion {
  question?: unknown;
  choices?: unknown;
  answer?: unknown;
}

export const QUIZ_CHOICES = 4;

/**
 * Checks that a book's studio file is what the studio sends: a zip with an
 * index.json. What's in it is the studio's own business (the pictures and
 * lines a comic's pages were put together from); nothing here reads it.
 */
export async function assertStudioFile(buffer: Buffer) {
  const zip = await JSZip.loadAsync(buffer).catch(() => null);
  if (!zip?.file('index.json')) {
    throw new BadRequestException('studio is not a valid studio file');
  }
}

// The books table holds a title in 255 characters.
const MAX_TITLE_LENGTH = 255;

export interface AkukoSummary {
  /** The title in other languages, where the creator wrote it: language code → title. */
  titles: Record<string, string>;
  slideCount: number;
  /** 1-based numbers of slides with no image, or an image missing from the zip. */
  slidesWithoutImage: number[];
  /** Voice-overs that have recordings but no narrator name. */
  unnamedNarrations: number;
  /** Everyone named as a narrator of a voice-over, once each. */
  narrators: string[];
  /** 1-based numbers of quiz questions missing their words, an answer, or which answer is right. */
  unfinishedQuizQuestions: number[];
  /** The first slide's picture: what the app shows while the book opens. */
  cover: AkukoPicture | null;
  /**
   * The square picture the book goes by in the app's library, when the .akuko
   * brings one: the creator's own, or one the studio cut from the first slide's.
   */
  thumbnail: AkukoPicture | null;
}

interface AkukoPicture {
  data: Buffer;
  extension: string;
}

/**
 * Reads a .akuko archive the way the mobile app does: an index.json with a
 * `slides` array (or a `translations` array of those), at the root or one
 * folder down, whose slide images are paths inside the zip. `narrations`
 * lists the voice-overs whose recordings the slides' `audio` points to (and,
 * in a comic, the `audio` of each of a slide's `texts`),
 * `quiz` the optional questions asked after the last page, `titles` the
 * title in the languages the book is translated into, and `thumbnail.file`
 * the square picture it goes by in the library.
 */
export async function inspectAkuko(buffer: Buffer): Promise<AkukoSummary> {
  let zip: JSZip;
  try {
    zip = await JSZip.loadAsync(buffer);
  } catch {
    throw new BadRequestException('file is not a valid .akuko (zip) archive');
  }

  const index = zip
    .file(/(^|\/)index\.json$/)
    .sort((a, b) => a.name.length - b.name.length)[0];
  if (!index) throw new BadRequestException('.akuko archive has no index.json');

  let json: {
    titles?: Record<string, unknown>;
    narrations?: AkukoNarration[];
    slides?: AkukoSlide[];
    quiz?: AkukoQuizQuestion[];
    thumbnail?: { file?: unknown };
    translations?: { slides?: AkukoSlide[] }[];
  };
  try {
    json = JSON.parse(await index.async('string'));
  } catch {
    throw new BadRequestException(
      'index.json in the .akuko archive is not valid JSON',
    );
  }
  const slides = json.slides ?? json.translations?.[0]?.slides;
  if (!Array.isArray(slides)) {
    throw new BadRequestException('index.json has no slides array');
  }

  const root = posix.dirname(index.name);
  const imageEntry = (slide: AkukoSlide) =>
    typeof slide?.image === 'string' && slide.image
      ? zip.file(posix.join(root, slide.image.replace(/^\/+/, '')))
      : null;

  const slidesWithoutImage = slides
    .map((slide, i) => (imageEntry(slide) ? null : i + 1))
    .filter((n): n is number => n !== null);

  const picture = async (
    entry: JSZip.JSZipObject | null,
  ): Promise<AkukoPicture | null> =>
    entry
      ? {
          data: await entry.async('nodebuffer'),
          extension: extname(entry.name).toLowerCase() || '.png',
        }
      : null;
  const cover = await picture(slides.length ? imageEntry(slides[0]) : null);
  const thumbnailFile = json.thumbnail?.file;
  const thumbnail = await picture(
    typeof thumbnailFile === 'string' && thumbnailFile
      ? zip.file(posix.join(root, thumbnailFile.replace(/^\/+/, '')))
      : null,
  );

  // A voice-over has a recording of a slide, or (in a comic) of one of the bubbles on it.
  const recorded = (slide: AkukoSlide, id: string) =>
    !!slide?.audio?.[id] ||
    (Array.isArray(slide?.texts) &&
      slide.texts.some((text) => !!text?.audio?.[id]));

  // The app lists voice-overs by narrator, so one with recordings needs a name.
  const narrations = Array.isArray(json.narrations) ? json.narrations : [];
  const unnamedNarrations = narrations.filter((n) => {
    const id = typeof n?.id === 'string' ? n.id : '';
    return (
      !!id && !n.narrator?.trim() && slides.some((slide) => recorded(slide, id))
    );
  }).length;

  const narrators = [
    ...new Set(
      narrations.flatMap((n) =>
        typeof n?.narrator === 'string' && n.narrator.trim()
          ? [n.narrator.trim()]
          : [],
      ),
    ),
  ];

  const filled = (value: unknown) =>
    typeof value === 'string' && !!value.trim();
  const titles = Object.fromEntries(
    Object.entries(json.titles ?? {}).flatMap(([lan, title]) =>
      typeof title === 'string' && title.trim()
        ? [[lan, title.trim().slice(0, MAX_TITLE_LENGTH)]]
        : [],
    ),
  );
  const quiz = Array.isArray(json.quiz) ? json.quiz : [];
  const unfinishedQuizQuestions = quiz
    .map((q, i) => {
      const choices: unknown[] = Array.isArray(q?.choices) ? q.choices : [];
      const answer = q?.answer;
      const finished =
        filled(q?.question) &&
        choices.length === QUIZ_CHOICES &&
        choices.every(filled) &&
        typeof answer === 'number' &&
        Number.isInteger(answer) &&
        answer >= 0 &&
        answer < QUIZ_CHOICES;
      return finished ? null : i + 1;
    })
    .filter((n): n is number => n !== null);

  return {
    titles,
    slideCount: slides.length,
    slidesWithoutImage,
    unnamedNarrations,
    narrators,
    unfinishedQuizQuestions,
    cover,
    thumbnail,
  };
}
