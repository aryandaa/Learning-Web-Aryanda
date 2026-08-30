/**
 * Frontend mirror of the generated artifacts (scripts/parser/types.ts).
 */

export interface TreeFileNode {
  type: 'file';
  title: string;
  slug: string;
  id: string;
  relativePath: string;
  outputPath: string;
  /** File bertag #roadmap. rujukan urutan belajar folder ini. */
  isRoadmap?: boolean;
  /** Source code file (non-Markdown). frontend menampilkan code viewer. */
  isCode?: boolean;
  /** Extension lowercase ("" jika tidak ada). */
  extension?: string;
  /** Id bahasa (lowercase). */
  language?: string;
  /** Ukuran file dalam byte. */
  size?: number;
}

export interface TreeFolderNode {
  type: 'folder';
  name: string;
  relativePath: string;
  children: TreeNode[];
  /** Folder yang langsung berisi code file (browser kode). */
  isCodeFolder?: boolean;
}

export type TreeNode = TreeFolderNode | TreeFileNode;

export interface MetadataFile {
  schemaVersion: number;
  parserVersion: string;
  generatedAt: string;
  vaultCommit: string | null;
  vaultBranch: string | null;
  totalNotes: number;
  totalFolders: number;
  /** Jumlah file bertag #Subskill (skill). */
  subskillCount: number;
  /** Jumlah file bertag #Myskill (bidang). */
  myskillCount: number;
  warningsCount: number;
  brokenLinksCount: number;
  /** Jumlah source code file yang diproses pipeline code-file. */
  totalCodeFiles: number;
  /** Jumlah folder yang langsung berisi code file. */
  totalCodeFolders: number;
}

/* ============================================================
   Code file artifacts. Satu JSON per folder (grouping by folder).
   ============================================================ */

/** Satu file di dalam folder code. isi content = ASLI, tanpa perubahan. */
export interface CodeFileData {
  /** Nama file lengkap, mis. "praktek1.py". */
  name: string;
  /** Path relatif vault, mis. "Praktek/praktek1.py". */
  path: string;
  /** Extension lowercase ("" jika tidak ada). */
  extension: string;
  /** Id bahasa (lowercase). */
  language: string;
  /** Ukuran file dalam byte. */
  size: number;
  /** Isi file ASLI (utf-8). */
  content: string;
  /** sha256:... dari raw content. */
  contentHash: string;
}

/** Data JSON satu folder code (grouped). disimpan di docs/code/<folder>.json. */
export interface CodeFolderData {
  schemaVersion: number;
  /** Jenis artifact (selalu "code-folder"). */
  type?: 'code-folder';
  /** Nama folder terakhir, mis. "Praktek". */
  folder: string;
  /** Path relatif folder, mis. "Pemrograman/Python/Python Dasar/Praktek". */
  path: string;
  /**
   * Path relatif folder INDUK, mis. "Pemrograman/Python/Python Dasar"
   * (diisi parser; fallback dihitung frontend jika JSON lama).
   */
  parentPath?: string;
  /** Path JSON output relatif public/docs (tanpa .json). */
  outputPath: string;
  files: CodeFileData[];
}

export interface SearchIndexEntry {
  id: string;
  title: string;
  slug: string;
  relativePath: string;
  folder: string;
  tags: string[];
  aliases: string[];
  headings: string[];
  content: string;
  excerpt: string;
}

export interface Heading {
  depth: number;
  text: string;
  id: string;
}

export interface DocLink {
  id: string;
  title: string;
  href: string;
}

export interface Backlink {
  id: string;
  title: string;
}

export interface DocumentData {
  schemaVersion?: number;
  id: string;
  title: string;
  slug: string;
  relativePath: string;
  folder: string;
  html: string;
  content: string;
  tags: string[];
  aliases: string[];
  headings: Heading[];
  breadcrumb: string[];
  readingTime: number;
  updated: string | null;
  contentHash: string;
  outputPath: string;
  links: DocLink[];
  backlinks: Backlink[];
  brokenLinks: string[];
  previous: string | null;
  next: string | null;
}

export interface GraphNode {
  id: string;
  title: string;
  folder: string;
}

export interface GraphEdge {
  source: string;
  target: string;
}

export interface GraphData {
  schemaVersion: number;
  nodes: GraphNode[];
  links: GraphEdge[];
}

export interface RoadmapInfo {
  id: string;
  title: string;
  folder: string;
  /** Nama folder induk langsung (parent directory). */
  parentDir: string;
  /** Id file bertag #Subskill di rantai folder induk, jika ada. */
  subskillId: string | null;
  /** Langkah belajar = tautan keluar file roadmap, sesuai urutan di materi. */
  stepIds: string[];
}

export interface RoadmapSubskill {
  id: string;
  title: string;
  folder: string;
  /** Id roadmap yang berada di bawah skill ini. */
  roadmapIds: string[];
}

export interface RoadmapsData {
  schemaVersion: number;
  roadmaps: RoadmapInfo[];
  subskills: RoadmapSubskill[];
}
