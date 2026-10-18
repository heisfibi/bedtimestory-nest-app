// The legal pages are written in a small part of Markdown, so a super admin
// can edit them in a plain text box:
//
//   ## 1. Introduction            a section (its contents-list entry)
//   ## 7. Creators {#creators}    …with the id links point at (#creators)
//   ### A smaller heading         inside a section
//   A paragraph. Lines next to each other join up; a blank line starts a new one.
//   - a list item                 (or "1. " for a numbered list)
//   **bold**, [a link](https://…), and email addresses become links by themselves.
//
// Nothing else is markup: any HTML typed in shows as text.

export interface LegalSection {
  id: string;
  title: string;
  html: string;
}

/** What's wrong with a text, in words for the studio. */
export class LegalTextError extends Error {}

const escapeHtml = (text: string) =>
  text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const LINK = /\[([^\]\n]+)\]\(([^)\s]+)\)/g;
const EMAIL = /[\w.+-]+@[\w-]+(?:\.[\w-]+)+/g;
const BOLD = /\*\*(.+?)\*\*/g;

/** Where a link may go: the web, an email address, or somewhere on this site. Never `javascript:`. */
function safeHref(href: string): string | null {
  if (/^(https?:|mailto:)/i.test(href)) return href;
  if (/^[/#]/.test(href) && !href.startsWith('//')) return href;
  return null;
}

function plain(text: string, linkEmails: boolean) {
  let html = escapeHtml(text).replace(BOLD, '<strong>$1</strong>');
  if (linkEmails) {
    html = html.replace(
      EMAIL,
      (email) => `<a href="mailto:${email}">${email}</a>`,
    );
  }
  return html;
}

function inline(text: string) {
  let html = '';
  let last = 0;
  for (const match of text.matchAll(LINK)) {
    html += plain(text.slice(last, match.index), true);
    const label = plain(match[1], false);
    const href = safeHref(match[2]);
    html += !href
      ? label
      : /^https?:/i.test(href)
        ? `<a href="${escapeHtml(href)}" target="_blank" rel="noopener noreferrer">${label}</a>`
        : `<a href="${escapeHtml(href)}">${label}</a>`;
    last = match.index + match[0].length;
  }
  return html + plain(text.slice(last), true);
}

/** "7. Creators Using Our Studio" → "creators-using-our-studio". */
function slugOf(title: string) {
  return (
    title
      .replace(/^\d+[.)]\s*/, '')
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[^\w\s-]/g, '')
      .trim()
      .replace(/[\s_]+/g, '-')
      .replace(/-+/g, '-') || 'section'
  );
}

const BULLET = /^[-*]\s+/;
const NUMBERED = /^\d+[.)]\s+/;

/** One run of lines between blank lines: a paragraph or a list. */
function block(lines: string[]) {
  const listOf = (marker: RegExp, tag: 'ul' | 'ol') => {
    const items: string[] = [];
    for (const line of lines) {
      if (marker.test(line)) items.push(line.replace(marker, ''));
      // A line that isn't a new item carries on the one before.
      else items[items.length - 1] += ` ${line}`;
    }
    return `<${tag}>${items.map((item) => `<li>${inline(item)}</li>`).join('')}</${tag}>`;
  };
  if (BULLET.test(lines[0])) return listOf(BULLET, 'ul');
  if (NUMBERED.test(lines[0])) return listOf(NUMBERED, 'ol');
  return `<p>${inline(lines.join(' '))}</p>`;
}

/** The sections of a legal page, as HTML that is safe to put in a page. Throws LegalTextError. */
export function parseLegalText(text: string): LegalSection[] {
  const sections: { id: string; title: string; parts: string[] }[] = [];
  const ids = new Set<string>();
  let lines: string[] = [];

  const flush = () => {
    if (!lines.length) return;
    sections[sections.length - 1].parts.push(block(lines));
    lines = [];
  };

  for (const raw of text.replace(/\r\n?/g, '\n').split('\n')) {
    const line = raw.trim();
    const heading = /^(#{1,6})\s*(.*)$/.exec(line);
    if (heading && heading[1].length === 2) {
      flush();
      const named = /^(.*?)\s*\{#([\w-]+)\}$/.exec(heading[2]);
      const title = (named ? named[1] : heading[2]).trim();
      if (!title)
        throw new LegalTextError('A “##” line needs a heading after it.');
      let id = named ? named[2].toLowerCase() : slugOf(title);
      for (let n = 2; ids.has(id); n++) id = `${slugOf(title)}-${n}`;
      ids.add(id);
      sections.push({ id, title, parts: [] });
      continue;
    }
    if (!sections.length) {
      if (!line) continue;
      throw new LegalTextError(
        'Start with a section heading: a line beginning with “## ”.',
      );
    }
    if (heading && heading[1].length === 3 && heading[2].trim()) {
      flush();
      sections[sections.length - 1].parts.push(
        `<h3>${inline(heading[2].trim())}</h3>`,
      );
    } else if (heading) {
      throw new LegalTextError(
        `“${line.slice(0, 40)}”: use “## ” for a section and “### ” for a smaller heading.`,
      );
    } else if (!line) {
      flush();
    } else if (
      lines.length &&
      (BULLET.test(line) || NUMBERED.test(line)) &&
      !BULLET.test(lines[0]) &&
      !NUMBERED.test(lines[0])
    ) {
      // A list straight after a paragraph's last line, with no blank line between.
      flush();
      lines.push(line);
    } else {
      lines.push(line);
    }
  }
  flush();

  if (!sections.length) throw new LegalTextError('The page is empty.');
  const empty = sections.find((section) => !section.parts.length);
  if (empty) throw new LegalTextError(`“${empty.title}” has nothing under it.`);
  return sections.map(({ id, title, parts }) => ({
    id,
    title,
    html: parts.join('\n'),
  }));
}
