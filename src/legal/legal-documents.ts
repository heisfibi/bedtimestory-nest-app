// The legal pages: the app links to /privacy and /terms (the Play Console's
// privacy policy link is this backend's /privacy), the website's "Become a
// creator" page to /creator-terms. A super admin edits them from the studio's
// Legal page; until the first save, defaults.ts is served.

export const LEGAL_DOCUMENTS = ['privacy', 'terms', 'creator-terms'] as const;
export type LegalDocument = (typeof LEGAL_DOCUMENTS)[number];

export const isLegalDocument = (value: string): value is LegalDocument =>
  (LEGAL_DOCUMENTS as readonly string[]).includes(value);

export const LEGAL_TITLES: Record<LegalDocument, string> = {
  privacy: 'Privacy Policy',
  terms: 'Terms and Conditions',
  'creator-terms': 'Creator Terms',
};

/** Each page also has a one-line summary, for search results and link previews. */
export const LEGAL_SUMMARIES: Record<LegalDocument, string> = {
  privacy:
    'What the Bedtime Stories app sends to our server, what stays on your device, and what the studio keeps about creators.',
  terms:
    'The terms for using the Bedtime Stories app, its subscriptions and its codes.',
  'creator-terms':
    'The terms for writing books in Story Studio and earning from them.',
};

/** Largest text a super admin may save, in UTF-8 bytes: the column is a TEXT, 65,535 bytes. */
export const MAX_LEGAL_BYTES = 65_000;

/** "2026-10-18" → "18 October 2026": a date nobody reads the wrong way round. */
export function formatEffectiveDate(date: string) {
  const [year, month, day] = date.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day)).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
}
