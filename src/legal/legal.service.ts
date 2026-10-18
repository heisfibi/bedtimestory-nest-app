import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DEFAULT_LEGAL_TEXTS } from './defaults.js';
import {
  formatEffectiveDate,
  LEGAL_DOCUMENTS,
  LEGAL_SUMMARIES,
  LEGAL_TITLES,
  MAX_LEGAL_BYTES,
  type LegalDocument,
} from './legal-documents.js';
import { LegalTextError, parseLegalText } from './legal-text.js';
import { LegalVersion } from './legal-version.entity.js';

/** One version of a page's text. Version 0 is the built-in one, never saved. */
export interface LegalText {
  version: number;
  effectiveDate: string;
  body: string;
  note: string | null;
  createdBy: string | null;
  createdAt: Date | null;
}

export interface SaveLegalText {
  body: string;
  effectiveDate: string;
  note?: string | null;
}

const builtIn = (document: LegalDocument): LegalText => ({
  version: 0,
  effectiveDate: DEFAULT_LEGAL_TEXTS[document].effectiveDate,
  body: DEFAULT_LEGAL_TEXTS[document].body,
  note: null,
  createdBy: null,
  createdAt: null,
});

const fromRow = (row: LegalVersion): LegalText => ({
  version: row.version,
  effectiveDate: row.effectiveDate,
  body: row.body,
  note: row.note,
  createdBy: row.createdBy,
  createdAt: row.createdAt,
});

/** A version without its text, for lists. */
const summary = (text: LegalText) => ({
  version: text.version,
  effective_date: text.effectiveDate,
  note: text.note,
  created_by: text.createdBy,
  created_at: text.createdAt?.toISOString() ?? null,
});

/** The sections of `body`, or a 400 that says what's wrong with it. */
export function sectionsOf(body: string) {
  try {
    return parseLegalText(body);
  } catch (error) {
    if (error instanceof LegalTextError) {
      throw new BadRequestException(error.message);
    }
    throw error;
  }
}

/**
 * The privacy policy, the terms and the creator terms. A super admin
 * publishes a new version from the studio; every version is kept.
 */
@Injectable()
export class LegalService {
  constructor(
    @InjectRepository(LegalVersion)
    private readonly versions: Repository<LegalVersion>,
  ) {}

  /** What's in force: the newest saved version, or the built-in text before any save. */
  async current(document: LegalDocument): Promise<LegalText> {
    const row = await this.versions.findOne({
      where: { document },
      order: { version: 'DESC' },
    });
    return row ? fromRow(row) : builtIn(document);
  }

  /** The page as the website shows it. */
  async page(document: LegalDocument) {
    const text = await this.current(document);
    return {
      document,
      title: LEGAL_TITLES[document],
      summary: LEGAL_SUMMARIES[document],
      version: text.version,
      effective_date: text.effectiveDate,
      effective_date_text: formatEffectiveDate(text.effectiveDate),
      sections: sectionsOf(text.body),
    };
  }

  /** Each page, with what's in force, for the studio's tabs. */
  async list() {
    return Promise.all(
      LEGAL_DOCUMENTS.map(async (document) => ({
        document,
        title: LEGAL_TITLES[document],
        ...summary(await this.current(document)),
      })),
    );
  }

  /** The studio's editor: the text in force, and every version before it. */
  async adminView(document: LegalDocument) {
    const rows = await this.versions.find({
      where: { document },
      order: { version: 'DESC' },
    });
    const texts = [...rows.map(fromRow), builtIn(document)];
    return {
      document,
      title: LEGAL_TITLES[document],
      current: { ...summary(texts[0]), body: texts[0].body },
      history: texts.map(summary),
    };
  }

  /** One version's text, to look at again or start from. */
  async version(document: LegalDocument, version: number) {
    if (version === 0) {
      const text = builtIn(document);
      return { ...summary(text), body: text.body };
    }
    const row = await this.versions.findOneBy({ document, version });
    if (!row) throw new NotFoundException(`There is no version ${version}.`);
    const text = fromRow(row);
    return { ...summary(text), body: text.body };
  }

  /** Publishes a new version: the app and the website show it at once. */
  async save(document: LegalDocument, input: SaveLegalText, by: string) {
    const body = input.body.replace(/\r\n?/g, '\n').trim();
    if (Buffer.byteLength(body) > MAX_LEGAL_BYTES) {
      throw new BadRequestException(
        'The page is too long to save. Shorten it, or split a section out.',
      );
    }
    sectionsOf(body);
    const current = await this.current(document);
    if (
      body === current.body.trim() &&
      input.effectiveDate === current.effectiveDate
    ) {
      throw new BadRequestException(
        'Nothing has changed since the version in force.',
      );
    }
    const latest = await this.versions.maximum('version', { document });
    try {
      await this.versions.insert({
        document,
        version: (latest ?? 0) + 1,
        effectiveDate: input.effectiveDate,
        body,
        note: input.note?.trim() || null,
        createdBy: by,
      });
    } catch (error) {
      // Two saves at once, both taking the same next number.
      const code = (error as { code?: string }).code;
      if (code === 'ER_DUP_ENTRY' || code?.startsWith('SQLITE_CONSTRAINT')) {
        throw new ConflictException(
          'Someone else published this page just now. Reload to see their version.',
        );
      }
      throw error;
    }
    return this.adminView(document);
  }
}
