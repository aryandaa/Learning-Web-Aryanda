import type { NoteRecord, TreeFolderNode, TreeNode } from './types';

/**
 * Builds the unified recursive tree from records (spec §19).
 * Top-level vault folders become root nodes. Folders are sorted
 * before files; both alphabetically (case-insensitive, deterministic).
 */
export function buildTree(records: NoteRecord[]): TreeFolderNode[] {
  const roots: TreeFolderNode[] = [];
  const folders = new Map<string, TreeFolderNode>();

  function ensureFolder(relativePath: string): TreeFolderNode {
    const existing = folders.get(relativePath);
    if (existing) return existing;

    const parts = relativePath.split('/');
    const name = parts[parts.length - 1];
    const node: TreeFolderNode = { type: 'folder', name, relativePath, children: [] };

    if (parts.length === 1) {
      roots.push(node);
    } else {
      const parent = ensureFolder(parts.slice(0, -1).join('/'));
      parent.children.push(node);
    }
    folders.set(relativePath, node);
    return node;
  }

  const filesByFolder = new Map<string, TreeNode[]>();
  for (const record of records) {
    const folder = record.folder || '';
    const fileNode: TreeNode = {
      type: 'file',
      title: record.title,
      slug: record.slug,
      id: record.id,
      relativePath: record.relativePath,
      outputPath: record.outputPath,
    };
    const list = filesByFolder.get(folder) ?? [];
    list.push(fileNode);
    filesByFolder.set(folder, list);
  }

  // Ensure folders exist for every record's folder (including "" -> root).
  for (const folder of filesByFolder.keys()) {
    if (folder) ensureFolder(folder);
  }

  // Attach files, then sort deterministically (folders first, then files).
  for (const [folder, files] of filesByFolder) {
    const target = folder ? folders.get(folder)! : null;
    files.sort((a, b) =>
      (a as { title: string }).title.localeCompare((b as { title: string }).title, undefined, {
        sensitivity: 'base',
      })
    );
    if (target) target.children.push(...files);
  }

  const sortChildren = (nodes: TreeNode[]): void => {
    nodes.sort((a, b) => {
      if (a.type !== b.type) return a.type === 'folder' ? -1 : 1;
      const an = a.type === 'folder' ? a.name : a.title;
      const bn = b.type === 'folder' ? b.name : b.title;
      return an.localeCompare(bn, undefined, { sensitivity: 'base' });
    });
    for (const node of nodes) {
      if (node.type === 'folder') sortChildren(node.children);
    }
  };

  sortChildren(roots);
  return roots;
}

/**
 * Depth-first order of file ids used for Previous/Next navigation.
 */
export function treeFileOrder(tree: TreeFolderNode[]): string[] {
  const ids: string[] = [];
  const walk = (nodes: TreeNode[]): void => {
    for (const node of nodes) {
      if (node.type === 'file') ids.push(node.id);
      else walk(node.children);
    }
  };
  walk(tree);
  return ids;
}
