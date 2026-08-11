/**
 * Shared types for the parser pipeline and generated artifacts.
 * Keep these in sync with src/domain/types.ts (frontend mirror).
 */

export interface VaultFile {
  /** Path relative to the vault root, POSIX separators, original casing. */
  relativePath: string;
  /** Absolute path on disk while parsing. */
  absolutePath: string;
  /** Raw file content. */
  content: string;
  /** sha256:... of the raw content. */
  contentHash: string;
}

export interface VaultFolder {
  relativePath: string;
  /** Absolute path on disk while parsing. */
  absolutePath: string;
}

export interface VaultAsset {
  /** Path relative to the vault root, POSIX separators. */
  relativePath: string;
  /** Absolute path on disk while parsing. */
  absolutePath: string;
  size: number;
  hash: string;
}

/** Canonical snapshot produced by the Scanner. */
export interface VaultSnapshot {
  files: VaultFile[];
  folders: VaultFolder[];
  assets: VaultAsset[];
}

export interface Heading {
  depth: number;
  text: string;
  id: string;
}

export interface Frontmatter {
  title?: string;
  tags: string[];
  aliases: string[];
  [key: string]: unknown;
}

export interface OutgoingLink {
  /** Resolved document id. */
  id: string;
  title: string;
  href: string;
}

export interface Backlink {
  id: string;
  title: string;
}

export interface NoteRecord {
  /** Normalized vault-relative path without extension, lowercase. The identity. */
  id: string;
  title: string;
  slug: string;
  relativePath: string;
  /** Folder containing the note, e.g. "Pemrograman/PHP". */
  folder: string;
  frontmatter: Frontmatter;
  tags: string[];
  aliases: string[];
  headings: Heading[];
  content: string;
  excerpt: string;
  readingTime: number;
  updated: string | null;
  contentHash: string;
  /** Output path inside generated/docs/ without .json, e.g. "Pemrograman/PHP/Routing". */
  outputPath: string;
  /** Breadcrumb folder names (excluding the note title). */
  breadcrumb: string[];
  links: OutgoingLink[];
  backlinks: Backlink[];
  brokenLinks: string[];
  html: string;
  previous: string | null;
  next: string | null;
}

export type TreeFileNode = {
  type: 'file';
  title: string;
  slug: string;
  id: string;
  relativePath: string;
  outputPath: string;
  /** File bertag #roadmap — rujukan urutan belajar folder ini. */
  isRoadmap?: boolean;
};

export type TreeNode = TreeFolderNode | TreeFileNode;

export interface TreeFolderNode {
  type: 'folder';
  name: string;
  relativePath: string;
  children: TreeNode[];
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

export interface AssetManifestEntry {
  sourcePath: string;
  publicPath: string;
  size: number;
  hash: string;
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

export interface Warnings {
  duplicatePaths: string[];
  brokenWikiLinks: string[];
  missingImages: string[];
  malformedFrontmatter: string[];
  unsupportedEmbeds: string[];
}

export interface WarningsFile {
  schemaVersion: number;
  warnings: Warnings;
}

export interface MetadataFile {
  schemaVersion: number;
  parserVersion: string;
  generatorVersion: string;
  generatedAt: string;
  vaultCommit: string | null;
  vaultBranch: string | null;
  totalNotes: number;
  totalFolders: number;
  warningsCount: number;
  brokenLinksCount: number;
}

/** Everything produced by the pipeline and handed to the writer. */
export interface ParseResult {
  records: NoteRecord[];
  tree: TreeFolderNode[];
  searchIndex: SearchIndexEntry[];
  graph: GraphData;
  roadmaps: RoadmapsData;
  metadata: MetadataFile;
  warnings: Warnings;
  assets: AssetManifestEntry[];
}

/** Summary printed by the CLI entrypoint. */
export interface ParseSummary {
  notes: number;
  folders: number;
  assets: number;
  warnings: number;
  brokenLinks: number;
  outputDir: string;
}

export interface ParserOptions {
  vaultPath: string;
  vaultCommit?: string | null;
  vaultBranch?: string | null;
  generatedDir?: string;
  skipPublish?: boolean;
  skipAssets?: boolean;
}
