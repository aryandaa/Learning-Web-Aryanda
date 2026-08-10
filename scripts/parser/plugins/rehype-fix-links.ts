import type { Root, Element } from 'hast';
import type { LinkLookup, ResolvedAssetTarget } from '../link-resolver';
import type { NoteRecord, OutgoingLink } from '../types';

export interface FixLinksOptions {
  lookup: LinkLookup;
  from: NoteRecord;
  onLink?: (link: OutgoingLink) => void;
  /** Called when a link/image resolves to an asset (tracks usage). */
  onAsset?: (target: ResolvedAssetTarget) => void;
  onBrokenLink?: (href: string) => void;
  onMissingImage?: (src: string) => void;
}

/** Relative hrefs worth resolving: vault paths, not protocols/anchors/absolute. */
function isRelativeTarget(href: string): boolean {
  return (
    !/^[a-z][a-z0-9+.-]*:/i.test(href) && // protocol (http:, mailto:, ...)
    !href.startsWith('#') &&
    !href.startsWith('/') &&
    href.trim().length > 0
  );
}

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
          if (typeof href === 'string' && isRelativeTarget(href)) {
            const target = options.lookup.resolveMarkdownPath(href, options.from);
            if (target.kind === 'note') {
              const url = `/docs/${target.id}${target.anchor ? `#${target.anchor}` : ''}`;
              props.href = url;
              if (options.onLink) {
                options.onLink({ id: target.id, title: target.title, href: url });
              }
            } else if (target.kind === 'asset') {
              props.href = target.publicUrl;
              setClass(element, 'wiki-link');
              options.onAsset?.(target);
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
          if (typeof src === 'string' && isRelativeTarget(src)) {
            const target = options.lookup.resolveMarkdownPath(src, options.from);
            if (target.kind === 'asset') {
              props.src = target.publicUrl;
              props.loading = 'lazy';
              options.onAsset?.(target);
            } else {
              options.onMissingImage?.(src);
            }
          }
        }
      });
  };
}
