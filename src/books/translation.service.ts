import { Inject, Injectable, Logger } from '@nestjs/common';
import { appConfig, type AppConfig } from '../app.config.js';
import { CatalogService } from '../catalog/catalog.service.js';
import { TitleTranslation } from './book.entity.js';

const TRANSLATE_TIMEOUT_MS = 10_000;
// A whole book's text and quiz goes in one request, so give it longer.
const BATCH_TIMEOUT_MS = 60_000;

// Machine translation through a LibreTranslate server: book titles into
// every catalog language the creator didn't write one in when a book is
// published, and a book's title, text and quiz for the studio's Translate
// buttons.
@Injectable()
export class TranslationService {
  private readonly logger = new Logger(TranslationService.name);

  constructor(
    @Inject(appConfig.KEY) private readonly config: AppConfig,
    private readonly catalog: CatalogService,
  ) {}

  /** Whether a translation server is configured. */
  get available() {
    return !!this.config.libreTranslateUrl;
  }

  /**
   * The title in every catalog language: as the creator wrote it (`written`,
   * by language code) where they did, and machine-translated from `source`
   * elsewhere. `earlier` holds translations of this same title, whose machine
   * translations are kept instead of asked for again. A language that can't
   * be translated gets an empty `text`, and the app falls back to the original.
   */
  async translateTitle(
    title: string,
    source: string,
    written: Record<string, string> = {},
    earlier: TitleTranslation[] = [],
  ): Promise<TitleTranslation[]> {
    const languages = await this.catalog.listLanguages();
    return Promise.all(
      languages.map(async ({ name, isoCode }) => {
        const entry = { language: name, lan: isoCode };
        if (isoCode === source) return { ...entry, text: title };
        if (written[isoCode]) {
          return { ...entry, text: written[isoCode], byCreator: true };
        }
        const kept = earlier.find((t) => t.lan === isoCode && !t.byCreator);
        return {
          ...entry,
          text: kept?.text || (await this.translate(title, source, isoCode)),
        };
      }),
    );
  }

  /**
   * Translates several texts in one request, keeping their order. Blank
   * texts stay blank. Throws if the server is missing or fails.
   */
  async translateTexts(
    texts: string[],
    source: string,
    target: string,
  ): Promise<string[]> {
    if (!this.available) throw new Error('No translation server is configured');
    const filled = texts.flatMap((text, i) => (text.trim() ? [i] : []));
    const result = texts.map((text) => (source === target ? text : ''));
    if (source === target || !filled.length) return result;

    const translated = await this.request(
      filled.map((i) => texts[i]),
      source,
      target,
      BATCH_TIMEOUT_MS,
    );
    const list = Array.isArray(translated) ? translated : [translated];
    filled.forEach((i, k) => (result[i] = list[k] ?? ''));
    return result;
  }

  private async translate(
    text: string,
    source: string,
    target: string,
  ): Promise<string> {
    if (!this.available) return '';
    try {
      const translated = await this.request(text, source, target);
      return typeof translated === 'string' ? translated : '';
    } catch (error) {
      this.logger.warn(
        `Could not translate "${text}" to ${target}: ${String(error)}`,
      );
      return '';
    }
  }

  /** One LibreTranslate call; `q` may be a list, and the answer is then a list too. */
  private async request(
    q: string | string[],
    source: string,
    target: string,
    timeout = TRANSLATE_TIMEOUT_MS,
  ): Promise<string | string[]> {
    const { libreTranslateUrl, libreTranslateApiKey } = this.config;
    const response = await fetch(`${libreTranslateUrl}/translate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        q,
        source,
        target,
        format: 'text',
        ...(libreTranslateApiKey && { api_key: libreTranslateApiKey }),
      }),
      signal: AbortSignal.timeout(timeout),
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${await response.text()}`);
    }
    const data = (await response.json()) as {
      translatedText?: string | string[];
    };
    return data.translatedText ?? '';
  }
}
