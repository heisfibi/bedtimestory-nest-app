import type { AppConfig } from '../app.config.js';
import type { CatalogService } from '../catalog/catalog.service.js';
import { TranslationService } from './translation.service.js';

const catalog = {
  listLanguages: async () => [
    { id: 1, name: 'English', isoCode: 'en' },
    { id: 5, name: 'Spanish', isoCode: 'es' },
    { id: 6, name: 'French', isoCode: 'fr' },
  ],
} as unknown as CatalogService;

const service = (config: Partial<AppConfig>) =>
  new TranslationService(config as AppConfig, catalog);

describe('TranslationService', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('keeps English and leaves other languages empty when no server is configured', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    expect(await service({}).translateTitle('The Moon', 'en')).toEqual([
      { language: 'English', lan: 'en', text: 'The Moon' },
      { language: 'Spanish', lan: 'es', text: '' },
      { language: 'French', lan: 'fr', text: '' },
    ]);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('uses LibreTranslate and falls back to empty text for languages that fail', async () => {
    const fetchMock = vi.fn(async (_url: string, init: RequestInit) => {
      const { target, api_key } = JSON.parse(init.body as string);
      expect(api_key).toBe('secret');
      return target === 'es'
        ? Response.json({ translatedText: 'La Luna' })
        : new Response('unsupported', { status: 400 });
    });
    vi.stubGlobal('fetch', fetchMock);

    const result = await service({
      libreTranslateUrl: 'http://translate.test',
      libreTranslateApiKey: 'secret',
    }).translateTitle('The Moon', 'en');

    expect(result.map((t) => t.text)).toEqual(['The Moon', 'La Luna', '']);
    expect(fetchMock).toHaveBeenCalledWith(
      'http://translate.test/translate',
      expect.anything(),
    );
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("uses the creator's titles, and translates the rest from the book's language", async () => {
    const fetchMock = vi.fn(async (_url: string, init: RequestInit) => {
      const { q, source, target } = JSON.parse(init.body as string);
      return Response.json({ translatedText: `${source}>${target}:${q}` });
    });
    vi.stubGlobal('fetch', fetchMock);
    const translation = service({ libreTranslateUrl: 'http://translate.test' });

    const first = await translation.translateTitle('La Lune', 'fr', {
      es: 'La Luna',
    });
    expect(first).toEqual([
      { language: 'English', lan: 'en', text: 'fr>en:La Lune' },
      { language: 'Spanish', lan: 'es', text: 'La Luna', byCreator: true },
      { language: 'French', lan: 'fr', text: 'La Lune' },
    ]);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    // Published again with the same title: machine translations are kept,
    // but a title the creator has taken out is translated afresh.
    const again = await translation.translateTitle('La Lune', 'fr', {}, first);
    expect(again.map((t) => t.text)).toEqual([
      'fr>en:La Lune',
      'fr>es:La Lune',
      'La Lune',
    ]);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('translates a list of texts in one request, keeping blanks blank', async () => {
    const fetchMock = vi.fn(async (_url: string, init: RequestInit) => {
      const { q, source, target } = JSON.parse(init.body as string);
      expect([source, target]).toEqual(['en', 'fr']);
      return Response.json({
        translatedText: (q as string[]).map((text) => `fr:${text}`),
      });
    });
    vi.stubGlobal('fetch', fetchMock);

    const translation = service({ libreTranslateUrl: 'http://translate.test' });
    expect(translation.available).toBe(true);
    expect(
      await translation.translateTexts(
        ['The owl', ' ', 'The moon'],
        'en',
        'fr',
      ),
    ).toEqual(['fr:The owl', '', 'fr:The moon']);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('refuses to translate texts when no server is configured', async () => {
    const translation = service({});
    expect(translation.available).toBe(false);
    await expect(
      translation.translateTexts(['The owl'], 'en', 'fr'),
    ).rejects.toThrow(/No translation server/);
  });
});
