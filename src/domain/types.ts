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
  /** File bertag #roadmap — rujukan urutan belajar folder ini. */
  isRoadmap?: boolean;
}

export interface TreeFolderNode {
  type: 'folder';
  name: string;
  relativePath: string;
  children: TreeNode[];
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
