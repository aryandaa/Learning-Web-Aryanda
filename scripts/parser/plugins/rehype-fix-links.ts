import type { Root, Element } from 'hast';
import type { LinkLookup } from '../link-resolver';
import type { NoteRecord, OutgoingLink } from '../types';

export interface FixLinksOptions {
  lookup: LinkLookup;
  from: NoteRecord;
  onLink?: (link: OutgoingLink) => void;
  onBrokenLink?: (href: string) => void;
  onMissingImage?: (src: string) => void;
}

const MD_LINK_RE = /\.md(?:#|$)/i;

function visitElements(node: unknown, callback: (element: Element) => void): void {
  if (!node || typeof node !== 'object') return;
  const element = node as { type?: string; tagName?: string; properties?: Record<string, unknown>; children?: unknown[] };
  if (element.type === 'element') {
    callback(element as Element);
  }
  const children = (node as { children?: unknown[] }).children;
  if (Array.isArray(children)) {
    for (const child of children) visitElements(child, callback);
  }
}

function setClass(element: Element, className: string): void {
  const props = element.properties ?? {};
  const existing = props.className;
  const classes = Array.isArray(existing)
    ? existing.filter(Boolean).map(String)
    : typeof existing === 'string'
      ? existing.split(/\s+/)
      : [];
  if (!classes.includes(className)) classes.push(className);
  props.className = classes.join(' ');
  element.properties = props;
}

/**
 * rehype plugin: rewrites markdown links/images that still point at
 * vault files (".md" hrefs, relative image srcs) to public URLs.
 * Runs after remark-rehype and before sanitize.
 */
export function rehypeFixLinks(options: FixLinksOptions) {
  return (tree: Root) => {
    visitElements(tree, (element) => {
        const props = element.properties ?? {};

        if (element.tagName === 'a') {
          const href = props.href;
          if (typeof href === 'string' && MD_LINK_RE.test(href)) {
            const target = options.lookup.resolveMarkdownPath(href, options.from);
            if (target.kind === 'note') {
              const url = `/docs/${target.id}${target.anchor ? `#${target.anchor}` : ''}`;
              props.href = url;
              if (options.onLink) {
                options.onLink({ id: target.id, title: target.title, href: url });
              }
            } else {
              props.href = '#';
              setClass(element, 'wiki-link');
              setClass(element, 'broken');
              options.onBrokenLink?.(href);
            }
          }
        }

        if (element.tagName === 'img') {
          const src = props.src;
          if (typeof src === 'string' && !/^(https?:)?\/\//.test(src) && !src.startsWith('/')) {
            const target = options.lookup.resolveMarkdownPath(src, options.from);
            if (target.kind === 'asset') {
              props.src = target.publicUrl;
              props.loading = 'lazy';
            } else {
              options.onMissingImage?.(src);
            }
          }
        }
      });
  };
}
