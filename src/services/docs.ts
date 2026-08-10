import type { DocumentData, GraphData, MetadataFile, RoadmapsData, SearchIndexEntry, TreeFolderNode, TreeNode } from '../domain/types';
import { joinWithRoot } from '../lib/base';

async function getJson<T>(path: string): Promise<T> {
  const url = joinWithRoot(path);
  const response = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!response.ok) {
    throw new Error(`Gagal memuat ${url} (HTTP ${response.status})`);
  }
  return (await response.json()) as T;
}

/** tree.json — dimuat sekali di awal aplikasi. */
export function fetchTree(): Promise<TreeFolderNode[]> {
  return getJson<TreeFolderNode[]>('docs/tree.json');
}

/** metadata.json — dimuat sekali di awal aplikasi. */
export function fetchMetadata(): Promise<MetadataFile> {
  return getJson<MetadataFile>('docs/metadata.json');
}

/** search-index.json — lazy load hanya saat halaman pencarian dibuka. */
export function fetchSearchIndex(): Promise<SearchIndexEntry[]> {
  return getJson<SearchIndexEntry[]>('docs/search-index.json');
}

/** graph.json — lazy load hanya saat halaman graph dibuka. */
export function fetchGraph(): Promise<GraphData> {
  return getJson<GraphData>('docs/graph.json');
}

/** roadmaps.json — lazy load hanya saat halaman roadmap dibuka. */
export function fetchRoadmaps(): Promise<RoadmapsData> {
  return getJson<RoadmapsData>('docs/roadmaps.json');
}

/** Dokumen individual — dimuat on-demand berdasarkan outputPath dari tree. */
export function fetchDocument(outputPath: string): Promise<DocumentData> {
  return getJson<DocumentData>(`docs/${encodeURI(outputPath)}.json`);
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
