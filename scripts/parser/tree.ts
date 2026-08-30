import type { NoteRecord, TreeFolderNode, TreeNode, VaultCodeFile } from './types';
import { codeFileId, folderName, groupCodeFiles } from './code-files';

function isRoadmapRecord(record: NoteRecord): boolean {
  return record.tags.some((tag) => tag.toLowerCase() === 'roadmap');
}

/**
 * Builds the unified recursive tree from records + code files (spec §19).
 * Top-level vault folders become root nodes. In every folder, the
 * #roadmap file (rujukan urutan belajar) is sorted first; the rest
 * alphabetically (case-insensitive, deterministic). Source code files
 * ditambahkan sebagai node file (isCode) di folder tempatnya berada,
 * sehingga struktur folder asli tetap terjaga.
 */
export function buildTree(records: NoteRecord[], codeFiles: VaultCodeFile[] = []): TreeFolderNode[] {
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
      isRoadmap: isRoadmapRecord(record),
    };
    const list = filesByFolder.get(folder) ?? [];
    list.push(fileNode);
    filesByFolder.set(folder, list);
  }

  // Source code files: group per folder, jadikan node file di folder tsb.
  const codeGroups = groupCodeFiles(codeFiles);
  for (const group of codeGroups) {
    const folderNode = group.path ? ensureFolder(group.path) : null;
    const children: TreeNode[] = group.files.map((file) => ({
      type: 'file',
      title: file.name,
      slug: file.name.toLowerCase(),
      id: codeFileId(group.path, file.name),
      relativePath: file.path,
      outputPath: group.outputPath,
      isCode: true,
      extension: file.extension,
      language: file.language,
      size: file.size,
    }));
    if (folderNode) {
      folderNode.isCodeFolder = true;
      folderNode.children.push(...children);
    } else {
      // Code file di root vault (jarang): tidak punya folder.
      roots.push({ type: 'folder', name: 'Root', relativePath: '', isCodeFolder: true, children });
    }
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
      if (a.type === 'file' && b.type === 'file') {
        // Roadmap file selalu di atas (rujukan urutan belajar).
        if (a.isRoadmap !== b.isRoadmap) return a.isRoadmap ? -1 : 1;
        // Dokumen markdown tampil sebelum file source code (tidak tercampur acak).
        if (a.isCode !== b.isCode) return a.isCode ? 1 : -1;
        return a.title.localeCompare(b.title, undefined, { sensitivity: 'base' });
      }
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
 * Hanya dokumen markdown (file code tidak ikut Prev/Next).
 */
export function treeFileOrder(tree: TreeFolderNode[]): string[] {
  const ids: string[] = [];
  const walk = (nodes: TreeNode[]): void => {
    for (const node of nodes) {
      if (node.type === 'file') {
        if (!node.isCode) ids.push(node.id);
      } else walk(node.children);
    }
  };
  walk(tree);
  return ids;
}

export { folderName };
