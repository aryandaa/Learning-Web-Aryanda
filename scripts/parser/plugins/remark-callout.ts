import type { Root, Blockquote, Paragraph, Text } from 'mdast';

/**
 * remark plugin: Obsidian callouts.
 *
 *   > [!NOTE] Optional title
 *   > callout body
 *
 * becomes a <blockquote class="callout callout-note"> with the header
 * extracted and (optionally) rendered as a <div class="callout-title">.
 */
export function remarkCallout() {
  return (tree: Root) => {
    walk(tree.children);
  };
}

function walk(children: unknown[]): void {
  for (const child of children) {
    const node = child as { type: string; children?: unknown[] };
    if (node.children) walk(node.children);

    if (node.type !== 'blockquote') continue;
    const quote = node as Blockquote;

    const first = quote.children[0];
    if (!first || first.type !== 'paragraph') continue;

    const firstPara = first as Paragraph;
    const text = firstPara.children.find((n) => n.type === 'text') as Text | undefined;
    if (!text) continue;

    const match = /^\[!([A-Za-z0-9_-]+)\](?:\s+(.*))?$/.exec(text.value.trim());
    if (!match) continue;

    const type = match[1].toLowerCase();
    const title = match[2]?.trim();

    // Remove the header line from the first paragraph.
    const rest = text.value.replace(/^\[![A-Za-z0-9_-]+\](?:\s+.*)?(?:\n|$)/, '').replace(/^\n/, '');
    text.value = rest;

    // Drop the paragraph entirely if the callout has no body text.
    if (!rest.trim()) {
      quote.children.shift();
    }

    (quote as unknown as { data?: Record<string, unknown> }).data = {
      hProperties: { className: `callout callout-${type}` },
    };

    if (title) {
      const titleNode: Paragraph = {
        type: 'paragraph',
        children: [{ type: 'text', value: title }],
      };
      (titleNode as { data?: Record<string, unknown> }).data = {
        hProperties: { className: 'callout-title' },
      };
      quote.children.unshift(titleNode);
    }
  }
}
