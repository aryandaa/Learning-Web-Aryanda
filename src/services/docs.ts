import type { CodeFolderData, DocumentData, GraphData, MetadataFile, RoadmapsData, SearchIndexEntry, TreeFolderNode, TreeNode } from '../domain/types';
import { joinWithRoot } from '../lib/base';

async function getJson<T>(path: string): Promise<T> {
  const url = joinWithRoot(path);
  const response = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!response.ok) {
    throw new Error(`Gagal memuat ${url} (HTTP ${response.status})`);
  }
  return (await response.json()) as T;
}

/** tree.json. dimuat sekali di awal aplikasi. */
export function fetchTree(): Promise<TreeFolderNode[]> {
  return getJson<TreeFolderNode[]>('docs/tree.json');
}

/** metadata.json. dimuat sekali di awal aplikasi. */
export function fetchMetadata(): Promise<MetadataFile> {
  return getJson<MetadataFile>('docs/metadata.json');
}

/** search-index.json. lazy load hanya saat halaman pencarian dibuka. */
export function fetchSearchIndex(): Promise<SearchIndexEntry[]> {
  return getJson<SearchIndexEntry[]>('docs/search-index.json');
}

/** graph.json. lazy load hanya saat halaman graph dibuka. */
export function fetchGraph(): Promise<GraphData> {
  return getJson<GraphData>('docs/graph.json');
}

/** roadmaps.json. lazy load hanya saat halaman roadmap dibuka. */
export function fetchRoadmaps(): Promise<RoadmapsData> {
  return getJson<RoadmapsData>('docs/roadmaps.json');
}

/** Dokumen individual. dimuat on-demand berdasarkan outputPath dari tree. */
export function fetchDocument(outputPath: string): Promise<DocumentData> {
  return getJson<DocumentData>(`docs/${encodeURI(outputPath)}.json`);
}

/**
 * Data code folder (satu JSON per folder, dihasilkan parser).
 * dimuat lazy HANYA saat user membuka folder/file code.
 */
export function fetchCodeFolder(folderRelativePath: string): Promise<CodeFolderData> {
  return getJson<CodeFolderData>(`docs/code/${encodeURI(folderRelativePath)}.json`);
}

export interface FileMapEntry {
  title: string;
  outputPath: string;
  relativePath: string;
}

/** Membangun peta id -> {title, outputPath} dari tree (recursive). */
export function buildFileMap(tree: TreeFolderNode[]): Map<string, FileMapEntry> {
  const map = new Map<string, FileMapEntry>();
  const walk = (nodes: TreeNode[]): void => {
    for (const node of nodes) {
      if (node.type === 'file') {
        // File code punya pipeline sendiri (fetchCodeFolder) — jangan masuk fileMap.
        if (node.isCode) continue;
        map.set(node.id, {
          title: node.title,
          outputPath: node.outputPath,
          relativePath: node.relativePath,
        });
      } else {
        walk(node.children);
      }
    }
  };
  walk(tree);
  return map;
}

/** Menghitung total file di dalam tree. */
export function countFiles(nodes: TreeNode[]): number {
  let count = 0;
  for (const node of nodes) {
    count += node.type === 'file' ? 1 : countFiles(node.children);
  }
  return count;
}

/* ============================================================
   Code file metadata (dibangun dari tree.json — tanpa muat content).
   ============================================================ */

export interface CodeFileEntry {
  /** Id route (lowercase, spasi -> hyphen). */
  id: string;
  /** Path relatif folder, casing asli, mis. "Pemrograman/Python/Python Dasar/Praktek". */
  folder: string;
  /** Nama file lengkap. */
  name: string;
  /** Path relatif vault file. */
  relativePath: string;
  extension: string;
  language: string;
  size: number;
}

export interface CodeFolderEntry {
  /** Id route folder (lowercase, spasi -> hyphen). */
  id: string;
  /** Path relatif folder, casing asli. */
  folder: string;
  /** Path relatif folder induk langsung ("" jika di root). */
  parentPath: string;
  /** Nama folder terakhir. */
  name: string;
  /** Jumlah file code langsung di folder ini (tanpa subfolder). */
  count: number;
}

/** Path induk dari relative path ("" jika sudah di root). */
export function parentPathOf(relativePath: string): string {
  return relativePath.includes('/') ? relativePath.split('/').slice(0, -1).join('/') : '';
}

/** Cari node folder di dalam tree berdasarkan relativePath asli. */
export function findFolderNode(nodes: TreeNode[], relativePath: string): TreeFolderNode | null {
  for (const node of nodes) {
    if (node.type === 'file') continue;
    if (node.relativePath === relativePath) return node;
    const found = findFolderNode(node.children, relativePath);
    if (found) return found;
  }
  return null;
}

/**
 * Bangun index code folder + code file dari tree (metadata ringan, tanpa content).
 * dipakai routing /docs/* agar tahu path mana folder-code / file-code.
 */
export function buildCodeIndex(tree: TreeFolderNode[]): {
  codeFileById: Map<string, CodeFileEntry>;
  codeFolderById: Map<string, CodeFolderEntry>;
} {
  const codeFileById = new Map<string, CodeFileEntry>();
  const codeFolderById = new Map<string, CodeFolderEntry>();

  const walk = (nodes: TreeNode[]): void => {
    for (const node of nodes) {
      if (node.type === 'file') {
        if (!node.isCode || !node.id) continue;
        codeFileById.set(node.id, {
          id: node.id,
          folder: node.relativePath.includes('/')
            ? node.relativePath.split('/').slice(0, -1).join('/')
            : '',
          name: node.title,
          relativePath: node.relativePath,
          extension: node.extension ?? '',
          language: node.language ?? 'plaintext',
          size: node.size ?? 0,
        });
      } else {
        if (node.isCodeFolder && node.relativePath) {
          codeFolderById.set(normalizeId(node.relativePath), {
            id: normalizeId(node.relativePath),
            folder: node.relativePath,
            parentPath: parentPathOf(node.relativePath),
            name: node.name,
            count: node.children.filter((c) => c.type === 'file' && c.isCode).length,
          });
        }
        walk(node.children);
      }
    }
  };
  walk(tree);
  return { codeFileById, codeFolderById };
}

/** Normalisasi path folder code untuk id route (lowercase, spasi -> hyphen). */
export function normalizeId(relativePath: string): string {
  return relativePath.replace(/\\/g, '/').toLowerCase().replace(/ /g, '-');
}
