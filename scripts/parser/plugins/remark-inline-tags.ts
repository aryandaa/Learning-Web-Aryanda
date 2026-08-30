import type { Root, Text, Paragraph } from 'mdast';

export interface InlineTagsOptions {
  /** Called for each unique inline tag found (in document order). */
  onTag?: (tag: string) => void;
}

/**
 * Obsidian inline tag pattern: `#tag`, `#nested/tag`, `#tag-with-dash`.
 * Must start with a letter; code blocks and inline code are skipped.
 */
const TAG_RE = /(^|\s)#([A-Za-z][A-Za-z0-9_/-]*)/g;

function transform(children: unknown[], options: InlineTagsOptions): void {
  for (const child of children) {
    const node = child as {
      type: string;
      value?: string;
      children?: unknown[];
      position?: unknown;
    };

    if (node.type === 'code' || node.type === 'inlineCode') continue;

    if (node.type === 'text' && typeof node.value === 'string') {
      const original = node.value;
      const found: string[] = [];
      const cleaned = original.replace(TAG_RE, (_match, space: string, tag: string) => {
        found.push(tag);
        return space;
      });
      if (cleaned !== original) {
        node.value = cleaned;
        for (const tag of found) options.onTag?.(tag);
      }
      continue;
    }

    if (node.children) transform(node.children, options);
  }
}

/** Remove paragraphs that became empty after tag extraction. */
function removeEmptyParagraphs(tree: Root): void {
  tree.children = tree.children.filter((node) => {
    if (node.type !== 'paragraph') return true;
    const paragraph = node as Paragraph;
    return !paragraph.children.every(
      (child) => child.type === 'text' && (child as Text).value.trim() === ''
    );
  });
}

/**
 * remark plugin: extracts Obsidian inline tags (outside code) from note
 * content and removes them from the rendered text, so the frontend can
 * show them as colored badges under the title instead.
 */
export function remarkInlineTags(options: InlineTagsOptions) {
  return (tree: Root) => {
    transform(tree.children, options);
    removeEmptyParagraphs(tree);
  };
}
