import { slugify } from '../slugify';

/**
 * rehype plugin: adds stable `id` attributes to h1-h6 elements so that
 * TOC / wiki-link anchors (`[[Note#Section]]`) can scroll to headings.
 * Must run before rehype-sanitize (which keeps ids because clobberPrefix is "").
 */
export function rehypeHeadingIds() {
  return (tree: unknown): void => {
    const seen = new Map<string, number>();
    visit(tree, (node) => {
      const tag = (node as { tagName?: string }).tagName;
      if (typeof tag !== 'string' || !/^h[1-6]$/.test(tag)) return;

      const text = collectText(node);
      const base = slugify(text);
      const count = seen.get(base) ?? 0;
      seen.set(base, count + 1);
      const id = count === 0 ? base : `${base}-${count}`;

      const properties = (node as { properties?: Record<string, unknown> }).properties ?? {};
      properties.id = id;
      (node as { properties?: Record<string, unknown> }).properties = properties;
    });
  };
}

function collectText(node: unknown): string {
  const element = node as { children?: unknown[] };
  let result = '';
  for (const child of element.children ?? []) {
    const value = (child as { value?: string }).value;
    if (typeof value === 'string') {
      result += value;
    } else {
      result += collectText(child);
    }
  }
  return result;
}

function visit(node: unknown, callback: (node: unknown) => void): void {
  if (!node || typeof node !== 'object') return;
  callback(node);
  const children = (node as { children?: unknown[] }).children;
  if (Array.isArray(children)) {
    for (const child of children) visit(child, callback);
  }
}
