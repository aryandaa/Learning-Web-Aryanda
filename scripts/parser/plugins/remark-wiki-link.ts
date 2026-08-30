import type { Root, Link, Image } from 'mdast';
import type { LinkLookup, ResolvedAssetTarget } from '../link-resolver';
import type { NoteRecord, OutgoingLink } from '../types';

export interface WikiLinkPluginOptions {
  lookup: LinkLookup;
  from: NoteRecord;
  /** Called for every resolved internal note link (used for backlinks). */
  onLink?: (link: OutgoingLink) => void;
  /** Called when a wiki link/embed resolves to an asset (tracks usage). */
  onAsset?: (target: ResolvedAssetTarget) => void;
  /** Called with the raw target when a wiki link/embed cannot be resolved. */
  onBroken?: (raw: string) => void;
  /** Called for embeds that are neither images nor notes. */
  onUnsupportedEmbed?: (raw: string) => void;
}

const WIKI_RE = /!?\[\[([^\[\]]+?)\]\]/g;

function textValue(node: { value?: string }): string {
  return node.value ?? '';
}

function isInCodeContext(node: unknown): boolean {
  // Walk up mdast parents to skip inline code/code blocks.
  const parent = (node as { parent?: unknown }).parent;
  if (!parent) return false;
  const type = (parent as { type?: string }).type;
  if (type === 'inlineCode' || type === 'code' || type === 'link') return true;
  return isInCodeContext(parent);
}

function processChildren(children: unknown[], options: WikiLinkPluginOptions): unknown[] {
  const result: unknown[] = [];

  for (const child of children) {
    const node = child as {
      type: string;
      value?: string;
      children?: unknown[];
      parent?: unknown;
      position?: unknown;
    };

    if (node.type === 'text' && !isInCodeContext(node)) {
      const text = textValue(node);
      let lastIndex = 0;
      let match: RegExpExecArray | null;

      WIKI_RE.lastIndex = 0;
      while ((match = WIKI_RE.exec(text)) !== null) {
        if (match.index > lastIndex) {
          result.push({ type: 'text', value: text.slice(lastIndex, match.index) });
        }
        const raw = match[0];
        const inner = match[1];
        const isEmbed = raw.startsWith('!');
        result.push(buildNode(inner, isEmbed, options));
        lastIndex = match.index + raw.length;
      }

      if (lastIndex === 0) {
        result.push(node);
      } else if (lastIndex < text.length) {
        result.push({ type: 'text', value: text.slice(lastIndex) });
      }
    } else if (node.children) {
      const parentRef = node;
      const childrenCopy = [...node.children];
      for (const c of childrenCopy) (c as { parent?: unknown }).parent = parentRef;
      node.children = processChildren(childrenCopy, options) as typeof node.children;
      result.push(node);
    } else {
      result.push(node);
    }
  }

  return result;
}

function buildNode(inner: string, isEmbed: boolean, options: WikiLinkPluginOptions): unknown {
  const [rawTarget, ...aliasParts] = inner.split('|');
  const display = aliasParts.join('|').trim() || rawTarget.split('#')[0].trim();

  if (isEmbed) {
    const target = options.lookup.resolveEmbed(rawTarget.trim(), options.from);

    if (target.kind === 'asset' && target.isImage) {
      options.onAsset?.(target);
      const image: Image = {
        type: 'image',
        url: target.publicUrl!,
        alt: display,
      };
      return image;
    }

    if (target.kind === 'asset') {
      options.onAsset?.(target);
      const fallback: Link = {
        type: 'link',
        url: target.publicUrl!,
        children: [{ type: 'text', value: `Embed: ${display}` }],
      };
      return fallback;
    }

    if (target.kind === 'note') {
      // Embedded note -> styled link card.
      const link: Link = {
        type: 'link',
        url: `/docs/${target.id}${target.anchor ? `#${target.anchor}` : ''}`,
        children: [{ type: 'text', value: `⤷ ${target.title}` }],
      };
      (link as { data?: Record<string, unknown> }).data = {
        hProperties: { className: 'embed-note' },
      };
      if (options.onLink) {
        options.onLink({ id: target.id, title: target.title, href: link.url });
      }
      return link;
    }

    options.onUnsupportedEmbed?.(rawTarget);
    const fallback: Link = {
      type: 'link',
      url: `#${encodeURIComponent(rawTarget)}`,
      children: [{ type: 'text', value: `Embed: ${display}` }],
    };
    return fallback;
  }

  const target = options.lookup.resolveWiki(rawTarget.trim(), options.from);

  if (target.kind === 'note') {
    const href = `/docs/${target.id}${target.anchor ? `#${target.anchor}` : ''}`;
    const link: Link = {
      type: 'link',
      url: href,
      children: [{ type: 'text', value: display }],
    };
    (link as { data?: Record<string, unknown> }).data = {
      hProperties: { className: 'wiki-link' },
    };
    if (options.onLink) {
      options.onLink({ id: target.id, title: target.title, href });
    }
    return link;
  }

  if (target.kind === 'asset') {
    options.onAsset?.(target);
    const link: Link = {
      type: 'link',
      url: target.publicUrl!,
      children: [{ type: 'text', value: display }],
    };
    (link as { data?: Record<string, unknown> }).data = {
      hProperties: { className: 'wiki-link' },
    };
    return link;
  }

  options.onBroken?.(rawTarget);
  const broken: Link = {
    type: 'link',
    url: '#',
    children: [{ type: 'text', value: display }],
  };
  (broken as { data?: Record<string, unknown> }).data = {
    hProperties: { className: 'wiki-link broken' },
  };
  return broken;
}

/**
 * remark plugin: Obsidian wiki links [[Note]], [[Folder/Note|alias]],
 * embeds ![[image.png]] and ![[Note]]. Must run after remark-parse.
 */
export function remarkWikiLink(options: WikiLinkPluginOptions) {
  return (tree: Root) => {
    const childrenCopy = [...tree.children];
    for (const c of childrenCopy) (c as { parent?: unknown }).parent = tree;
    tree.children = processChildren(childrenCopy, options) as typeof tree.children;
  };
}
