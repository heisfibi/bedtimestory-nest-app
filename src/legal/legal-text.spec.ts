import { DEFAULT_LEGAL_TEXTS } from './defaults.js';
import { LEGAL_DOCUMENTS, MAX_LEGAL_BYTES } from './legal-documents.js';
import { LegalTextError, parseLegalText } from './legal-text.js';

describe('parseLegalText', () => {
  it('makes a section of each ## heading, with paragraphs and lists', () => {
    const sections = parseLegalText(
      [
        '## 1. Introduction',
        'Welcome to the app.',
        'This line joins the one above.',
        '',
        'A second paragraph.',
        '',
        '## 2. What We Keep',
        'We keep:',
        '- an install number',
        '- reading',
        '  that spans two lines',
        '',
        '1. first',
        '2. second',
        '### Smaller',
        'Under it.',
      ].join('\n'),
    );
    expect(sections).toEqual([
      {
        id: 'introduction',
        title: '1. Introduction',
        html: '<p>Welcome to the app. This line joins the one above.</p>\n<p>A second paragraph.</p>',
      },
      {
        id: 'what-we-keep',
        title: '2. What We Keep',
        html: [
          '<p>We keep:</p>',
          '<ul><li>an install number</li><li>reading that spans two lines</li></ul>',
          '<ol><li>first</li><li>second</li></ol>',
          '<h3>Smaller</h3>',
          '<p>Under it.</p>',
        ].join('\n'),
      },
    ]);
  });

  it('takes an id written after the heading, and keeps ids apart', () => {
    const sections = parseLegalText(
      '## 7. Creators {#creators}\nA.\n## Contact\nB.\n## Contact\nC.',
    );
    expect(sections.map((s) => [s.id, s.title])).toEqual([
      ['creators', '7. Creators'],
      ['contact', 'Contact'],
      ['contact-2', 'Contact'],
    ]);
  });

  it('shows typed HTML as text', () => {
    const [section] = parseLegalText(
      '## Hi <b>there</b>\n<script>alert("x")</script> & more',
    );
    expect(section.html).toBe(
      '<p>&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt; &amp; more</p>',
    );
  });

  it('makes links, bold and email addresses, and refuses unsafe links', () => {
    const [section] = parseLegalText(
      [
        '## Links',
        '**Read** [Google](https://policies.google.com/privacy), [ours](/privacy#creators),',
        'write to heisfibi@gmail.com or [us](mailto:heisfibi@gmail.com).',
        '[bad](javascript:alert(1)) [also bad](//evil.example)',
      ].join('\n'),
    );
    expect(section.html).toBe(
      '<p><strong>Read</strong> <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer">Google</a>, ' +
        '<a href="/privacy#creators">ours</a>, write to <a href="mailto:heisfibi@gmail.com">heisfibi@gmail.com</a> ' +
        'or <a href="mailto:heisfibi@gmail.com">us</a>. bad) also bad</p>',
    );
  });

  it('says what is wrong with a text it cannot use', () => {
    const problem = (text: string) => {
      try {
        parseLegalText(text);
      } catch (error) {
        expect(error).toBeInstanceOf(LegalTextError);
        return (error as Error).message;
      }
      throw new Error('no problem found');
    };
    expect(problem('')).toBe('The page is empty.');
    expect(problem('Hello\n## A\nB')).toMatch(/Start with a section heading/);
    expect(problem('## A\n## B\nC')).toBe('“A” has nothing under it.');
    expect(problem('## A\n# Big\nC')).toMatch(/use “## ” for a section/);
  });

  it.each(LEGAL_DOCUMENTS)('reads the built-in %s', (document) => {
    const { body } = DEFAULT_LEGAL_TEXTS[document];
    expect(Buffer.byteLength(body)).toBeLessThan(MAX_LEGAL_BYTES);
    expect(parseLegalText(body).length).toBeGreaterThan(5);
  });
});
