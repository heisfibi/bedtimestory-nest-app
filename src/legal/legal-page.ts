import {
  LEGAL_DOCUMENTS,
  LEGAL_TITLES,
  type LegalDocument,
} from './legal-documents.js';
import type { LegalSection } from './legal-text.js';

const escapeHtml = (text: string) =>
  text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

/**
 * A legal page as this backend serves it at /privacy, /terms and
 * /creator-terms: what the app opens from its subscriptions screen, and the
 * privacy policy link in the Play Console. Plain HTML, no scripts, readable on
 * a phone; it looks like the website's own legal pages.
 */
export function legalPageHtml(page: {
  document: LegalDocument;
  title: string;
  summary: string;
  effectiveDateText: string;
  sections: LegalSection[];
}) {
  const contents = page.sections
    .map(
      (section) =>
        `<li><a href="#${section.id}">${escapeHtml(section.title)}</a></li>`,
    )
    .join('');
  const sections = page.sections
    .map(
      (section) =>
        `<section id="${section.id}"><h2>${escapeHtml(section.title)}</h2>${section.html}</section>`,
    )
    .join('\n');
  const others = LEGAL_DOCUMENTS.filter((d) => d !== page.document)
    .map((d) => `<a href="/${d}">${LEGAL_TITLES[d]}</a>`)
    .join(' · ');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(page.title)} - Bedtime Stories</title>
  <meta name="description" content="${escapeHtml(page.summary)}">
  <style>
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif;
      background: #07061a;
      color: #2b2540;
      line-height: 1.65;
    }
    header {
      background: radial-gradient(ellipse at top, #2a1f6e 0%, #110d36 55%, #07061a 100%);
      color: #f4f1ff;
      padding: 3rem 1rem 5rem;
    }
    header div, main, footer { max-width: 760px; margin: 0 auto; }
    header p.eyebrow {
      margin: 0;
      color: #ffc56b;
      font-size: 0.8rem;
      font-weight: 600;
      letter-spacing: 0.2em;
      text-transform: uppercase;
    }
    header h1 { margin: 0.5rem 0 0; font-size: 2.2rem; line-height: 1.15; }
    header p.date { margin: 0.75rem 0 0; color: #b9b2dc; }
    main {
      margin-top: -3rem;
      background: #fff8ea;
      border-radius: 1.5rem;
      padding: 1.5rem 1.25rem;
      box-shadow: 0 30px 80px -20px rgb(0 0 0 / 0.7);
    }
    nav { border-bottom: 1px solid rgb(43 37 64 / 0.1); padding-bottom: 1rem; }
    nav p { margin: 0 0 0.4rem; font-size: 0.75rem; font-weight: 600; letter-spacing: 0.15em; text-transform: uppercase; color: #8a6d2f; }
    nav ol { margin: 0; padding: 0; list-style: none; font-size: 0.95rem; }
    nav li { margin: 0.2rem 0; }
    section { padding: 1.4rem 0; border-bottom: 1px solid rgb(43 37 64 / 0.1); scroll-margin-top: 1rem; }
    section:last-child { border-bottom: 0; padding-bottom: 0.25rem; }
    h2 { margin: 0 0 0.6rem; font-size: 1.35rem; color: #1d1835; line-height: 1.3; }
    h3 { margin: 1rem 0 0.4rem; font-size: 1.05rem; color: #1d1835; }
    p { margin: 0.6rem 0; }
    ul, ol { margin: 0.6rem 0; padding-left: 1.4rem; }
    li { margin: 0.3rem 0; }
    strong { color: #1d1835; }
    a { color: #4536a8; font-weight: 500; text-underline-offset: 2px; }
    nav a { text-decoration: none; }
    footer { padding: 2rem 1rem 3rem; text-align: center; color: #b9b2dc; font-size: 0.9rem; }
    footer a { color: #ffc56b; }
    @media (min-width: 640px) {
      header { padding: 4rem 1.5rem 6rem; }
      header h1 { font-size: 3rem; }
      main { padding: 2.5rem 3rem; border-radius: 2rem; }
    }
  </style>
</head>
<body>
  <header>
    <div>
      <p class="eyebrow">Bedtime Stories</p>
      <h1>${escapeHtml(page.title)}</h1>
      <p class="date">Effective date: ${escapeHtml(page.effectiveDateText)}</p>
    </div>
  </header>
  <main>
    <nav aria-label="Contents"><p>Contents</p><ol>${contents}</ol></nav>
${sections}
  </main>
  <footer>
    <p>${others}</p>
    <p>&copy; ${new Date().getFullYear()} Fibi Technologies. All rights reserved.</p>
  </footer>
</body>
</html>
`;
}
