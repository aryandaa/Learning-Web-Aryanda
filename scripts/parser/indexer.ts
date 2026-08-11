import matter from 'gray-matter';
import { slugify } from './slugify';
import type { ParserContext } from './context';
import type { Frontmatter, Heading, NoteRecord } from './types';
import { titleFromPath, toDocumentId } from './validator';

/** Extract (depth, text, id) for every markdown heading. */
export function extractHeadings(markdown: string): Heading[] {
  const headings: Heading[] = [];
  const seen = new Map<string, number>();
  const lines = markdown.split(/\r?\n/);

  for (const line of lines) {
    const match = /^(#{1,6})\s+(.+?)\s*#*\s*$/.exec(line);
    if (!match) continue;
    const depth = match[1].length;
    const text = match[2].trim();
    const base = slugify(text);
    const count = seen.get(base) ?? 0;
    seen.set(base, count + 1);
    const id = count === 0 ? base : `${base}-${count}`;
    headings.push({ depth, text, id });
  }
  return headings;
}

function readingTime(markdown: string, wpm: number): number {
  const words = markdown.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / wpm));
}

function excerptFromContent(content: string): string {
  const trimmed = content.trim();
  const firstBlock = trimmed.match(/^(.*?)(?:\n\n|$)/s)?.[1] ?? trimmed;
  return firstBlock.replace(/\n+/g, ' ').slice(0, 240).trim();
}

function normalizeTags(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((tag) => String(tag).replace(/^#/, '').trim()).filter(Boolean);
  }
  if (typeof value === 'string') {
    return value
      .split(/[\s,]+/)
      .map((tag) => tag.replace(/^#/, '').trim())
      .filter(Boolean);
  }
  return [];
}

function normalizeAliases(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((alias) => String(alias).trim()).filter(Boolean);
  }
  if (typeof value === 'string') {
    return value
      .split(/[\s,]+/)
      .map((alias) => alias.trim())
      .filter(Boolean);
  }
  return [];
}

/**
 * Turns scanned markdown files into canonical NoteRecords.
 * Rendering and link resolution happen in later stages.
 */
export async function indexNotes(context: ParserContext): Promise<NoteRecord[]> {
  const records: NoteRecord[] = [];

  for (const file of context.snapshot!.files) {
    const id = toDocumentId(file.relativePath);
    const relativePath = file.relativePath.replace(/\\/g, '/');
    const outputPath = relativePath.replace(/\.md$/i, '');
    const folderParts = relativePath.split('/');
    const fileName = folderParts.pop() ?? '';
    const folder = folderParts.join('/');
    const slug = fileName.replace(/\.md$/i, '').toLowerCase();

    let frontmatter: Frontmatter = { tags: [], aliases: [] };
    let body = file.content;

    try {
      const parsed = matter(file.content);
      const data = parsed.data ?? {};
      if (typeof data !== 'object') {
        context.warn('malformedFrontmatter', `${relativePath}: frontmatter is not an object`);
      } else {
        frontmatter = {
          ...(data as Record<string, unknown>),
          tags: normalizeTags(data.tags),
          aliases: normalizeAliases(data.aliases),
        };
      }
      body = parsed.content;
    } catch (error) {
      context.warn('malformedFrontmatter', `${relativePath}: ${(error as Error).message}`);
    }

    const headings = extractHeadings(body);
    const title = String(frontmatter.title ?? titleFromPath(relativePath)).trim();

    records.push({
      id,
      title,
      slug,
      relativePath,
      folder,
      frontmatter,
      tags: frontmatter.tags,
      aliases: frontmatter.aliases,
      headings,
      content: body,
      excerpt: excerptFromContent(body),
      readingTime: readingTime(body, context.config.wordsPerMinute),
      updated: typeof frontmatter.updated === 'string' ? frontmatter.updated : null,
      contentHash: file.contentHash,
      outputPath,
      breadcrumb: folderParts,
      links: [],
      backlinks: [],
      brokenLinks: [],
      html: '',
      previous: null,
      next: null,
    });
  }

  records.sort((a, b) => a.relativePath.localeCompare(b.relativePath, undefined, { sensitivity: 'base' }));
  return records;
}
