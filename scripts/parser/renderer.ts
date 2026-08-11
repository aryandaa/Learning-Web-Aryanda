import { remark } from 'remark';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import remarkParse from 'remark-parse';
import remarkRehype from 'remark-rehype';
import rehypeKatex from 'rehype-katex';
import rehypeHighlight from 'rehype-highlight';
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize';
import rehypeStringify from 'rehype-stringify';
import type { Plugin } from 'unified';
import type { ParserContext } from './context';
import type { Root } from 'mdast';
import type { LinkLookup } from './link-resolver';
import type { NoteRecord } from './types';
import { remarkWikiLink, type WikiLinkPluginOptions } from './plugins/remark-wiki-link';
import { remarkCallout } from './plugins/remark-callout';
import { rehypeFixLinks, type FixLinksOptions } from './plugins/rehype-fix-links';
import { rehypeHeadingIds } from './plugins/rehype-heading-ids';

/**
 * Sanitization schema: default rehype-sanitize rules plus the class/id/style
 * attributes our renderer and plugins rely on (callouts, syntax highlighting,
 * KaTeX, heading anchors, wiki links).
 */
const sanitizeSchema = {
  ...defaultSchema,
  clobberPrefix: '',
  attributes: {
    ...defaultSchema.attributes,
    '*': ['className', 'title', 'dir'],
    a: [...(defaultSchema.attributes?.a ?? []), ['href'], 'rel', 'target'],
    img: ['src', 'alt', 'width', 'height', 'loading', 'className'],
    h1: ['id'],
    h2: ['id'],
    h3: ['id'],
    h4: ['id'],
    h5: ['id'],
    h6: ['id'],
    code: ['className'],
    span: ['className', 'style'],
    div: ['className', 'style'],
    blockquote: ['className'],
    table: ['className'],
    input: ['type', 'checked', 'disabled', 'className'],
    section: ['dataFootnotes', 'className'],
  },
  protocols: {
    ...defaultSchema.protocols,
    href: [...(defaultSchema.protocols?.href ?? []), 'relative', '#'],
    src: [...(defaultSchema.protocols?.src ?? []), 'relative'],
  },
};

/**
 * Renders every record's markdown into sanitized HTML while resolving
 * wiki links / embeds / markdown links, then computes backlinks.
 */
export async function renderNotes(
  context: ParserContext,
  records: NoteRecord[],
  lookup: LinkLookup
): Promise<NoteRecord[]> {
  const rendered = new Map<string, NoteRecord>();

  for (const record of records) {
    const html = await renderOne(context, record, lookup);
    rendered.set(record.id, { ...record, html });
  }

  // Backlink pass: for each outgoing link, add a backlink to the target.
  for (const record of rendered.values()) {
    for (const link of record.links) {
      const target = rendered.get(link.id);
      if (target) {
        target.backlinks.push({ id: record.id, title: record.title });
      }
    }
  }

  for (const record of rendered.values()) {
    record.backlinks.sort((a, b) => a.title.localeCompare(b.title, undefined, { sensitivity: 'base' }));
  }

  return records.map((record) => rendered.get(record.id)!);
}

async function renderOne(context: ParserContext, record: NoteRecord, lookup: LinkLookup): Promise<string> {
  const links: NoteRecord['links'] = [];
  const broken: string[] = [];

  const file = await remark()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkMath)
    // Custom unified plugins are cast: unified v11's plugin generics are too
    // strict for ad-hoc factories; the runtime contract is well-defined.
    .use(remarkWikiLink as unknown as Plugin<[WikiLinkPluginOptions], Root, Root>, {
      lookup,
      from: record,
      onLink: (link) => links.push(link),
      onBroken: (raw) => {
        broken.push(raw);
        context.warn('brokenWikiLinks', `${record.relativePath} -> [[${raw}]]`);
      },
      onUnsupportedEmbed: (raw) => {
        context.warn('unsupportedEmbeds', `${record.relativePath} -> ![[${raw}]]`);
      },
    })
    .use(remarkCallout as unknown as Plugin<[], Root, Root>)
    .use(remarkRehype, { allowDangerousHtml: false })
    .use(rehypeKatex as unknown as Plugin<[], Root, Root>)
    .use(rehypeHighlight as unknown as Plugin<[{ ignoreMissing: boolean }], Root, Root>, {
      ignoreMissing: true,
    })
    .use(rehypeFixLinks as unknown as Plugin<[FixLinksOptions], Root, Root>, {
      lookup,
      from: record,
      onLink: (link) => links.push(link),
      onBrokenLink: (href) => {
        broken.push(href);
        context.warn('brokenWikiLinks', `${record.relativePath} -> []( ${href} )`);
      },
      onMissingImage: (src) => {
        context.warn('missingImages', `${record.relativePath} -> ![${src}]`);
      },
    })
    .use(rehypeHeadingIds as unknown as Plugin<[], Root, Root>)
    .use(rehypeSanitize as unknown as Plugin<[unknown], Root, Root>, sanitizeSchema)
    .use(rehypeStringify)
    .process(record.content);

  record.links = dedupeLinks(links);
  record.brokenLinks = [...new Set(broken)];
  return String(file);
}

function dedupeLinks(links: NoteRecord['links']): NoteRecord['links'] {
  const seen = new Set<string>();
  const result: NoteRecord['links'] = [];
  for (const link of links) {
    const key = link.id;
    if (!seen.has(key)) {
      seen.add(key);
      result.push(link);
    }
  }
  return result;
}
