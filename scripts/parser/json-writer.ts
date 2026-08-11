import fs from 'fs/promises';
import path from 'path';
import type { ParserContext } from './context';
import { buildTree } from './tree';
import type {
  AssetManifestEntry,
  GraphData,
  MetadataFile,
  NoteRecord,
  ParseResult,
  RoadmapsData,
  RoadmapSubskill,
  SearchIndexEntry,
  TreeFolderNode,
  WarningsFile,
} from './types';

export interface WriteOptions {
  records: NoteRecord[];
  assets: AssetManifestEntry[];
  vaultCommit: string | null;
  vaultBranch: string | null;
  generatedDir?: string;
}

/**
 * Writes all generated artifacts under generated/ (spec §12):
 * docs/<vault structure>/*.json, docs/tree.json, docs/search-index.json,
 * docs/metadata.json, assets/manifest.json, warnings.json.
 */
export async function writeGenerated(
  context: ParserContext,
  options: WriteOptions
): Promise<ParseResult> {
  const generatedRoot = options.generatedDir
    ? path.resolve(options.generatedDir)
    : path.join(process.cwd(), 'generated');
  const docsDir = path.join(generatedRoot, 'docs');

  await fs.rm(docsDir, { recursive: true, force: true });
  await fs.mkdir(docsDir, { recursive: true });

  // Per-document JSON preserving the vault folder hierarchy.
  for (const record of options.records) {
    const docPath = path.join(docsDir, `${record.outputPath}.json`);
    await fs.mkdir(path.dirname(docPath), { recursive: true });
    await fs.writeFile(docPath, JSON.stringify(record), 'utf-8');
  }

  const tree = buildTree(options.records);

  const searchIndex: SearchIndexEntry[] = options.records.map((record) => ({
    id: record.id,
    title: record.title,
    slug: record.slug,
    relativePath: record.relativePath,
    folder: record.folder,
    tags: record.tags,
    aliases: record.aliases,
    headings: record.headings.map((heading) => heading.text),
    content: record.content.slice(0, context.config.searchIndexContentLimit),
    excerpt: record.excerpt,
  }));

  const folderSet = new Set(options.records.map((r) => r.folder).filter(Boolean));

  // Graph: nodes = semua catatan, edges = tautan antar-catatan (dedup).
  const graph = buildGraph(options.records);
  // Roadmaps: file bertag #roadmap + langkah-langkahnya (tautan keluar).
  const roadmaps = buildRoadmaps(options.records);
  const metadata: MetadataFile = {
    schemaVersion: 1,
    parserVersion: context.config.parserVersion,
    generatorVersion: context.config.parserVersion,
    generatedAt: new Date().toISOString(),
    vaultCommit: options.vaultCommit,
    vaultBranch: options.vaultBranch,
    totalNotes: options.records.length,
    totalFolders: folderSet.size,
    warningsCount: context.warningsCount,
    brokenLinksCount: context.warnings.brokenWikiLinks.length,
  };

  const warningsFile: WarningsFile = {
    schemaVersion: 1,
    warnings: context.warnings,
  };

  await fs.writeFile(path.join(docsDir, 'tree.json'), JSON.stringify(tree), 'utf-8');
  await fs.writeFile(path.join(docsDir, 'search-index.json'), JSON.stringify(searchIndex), 'utf-8');
  await fs.writeFile(path.join(docsDir, 'graph.json'), JSON.stringify(graph), 'utf-8');
  await fs.writeFile(path.join(docsDir, 'roadmaps.json'), JSON.stringify(roadmaps), 'utf-8');
  await fs.writeFile(path.join(docsDir, 'metadata.json'), JSON.stringify(metadata, null, 2), 'utf-8');
  await fs.writeFile(path.join(generatedRoot, 'warnings.json'), JSON.stringify(warningsFile, null, 2), 'utf-8');

  if (options.assets.length > 0) {
    const manifestPath = path.join(generatedRoot, 'assets', 'manifest.json');
    await fs.writeFile(
      manifestPath,
      JSON.stringify(
        { schemaVersion: 1, assets: options.assets },
        null,
        2
      ),
      'utf-8'
    );
  }

  return {
    records: options.records,
    tree,
    searchIndex,
    graph,
    roadmaps,
    metadata,
    warnings: context.warnings,
    assets: options.assets,
  };
}

/** Builds graph.json: nodes (all notes) + undirected edges (deduplicated). */
function buildGraph(records: NoteRecord[]): GraphData {
  const nodes: GraphData['nodes'] = records.map((record) => ({
    id: record.id,
    title: record.title,
    folder: record.folder,
  }));

  const seen = new Set<string>();
  const links: GraphData['links'] = [];
  for (const record of records) {
    for (const link of record.links) {
      if (link.id === record.id) continue;
      const key = record.id < link.id ? `${record.id}|${link.id}` : `${link.id}|${record.id}`;
      if (seen.has(key)) continue;
      seen.add(key);
      links.push({ source: record.id, target: link.id });
    }
  }
  links.sort((a, b) => a.source.localeCompare(b.source) || a.target.localeCompare(b.target));
  return { schemaVersion: 1, nodes, links };
}

/** Builds roadmaps.json: #roadmap files + their learning steps (ordered links). */
function buildRoadmaps(records: NoteRecord[]): RoadmapsData {
  const byFolder = new Map<string, NoteRecord[]>();
  for (const record of records) {
    const list = byFolder.get(record.folder) ?? [];
    list.push(record);
    byFolder.set(record.folder, list);
  }

  const roadmaps: RoadmapsData['roadmaps'] = records
    .filter((record) => record.tags.some((tag) => tag.toLowerCase() === 'roadmap'))
    .map((record) => {
      const parts = record.folder.split('/');

      // File #Subskill di rantai folder induk (mis. Python.md di atas Python Dasar).
      let subskillId: string | null = null;
      for (let i = parts.length - 1; i >= 1; i--) {
        const ancestorFolder = parts.slice(0, i).join('/');
        const subskill = (byFolder.get(ancestorFolder) ?? []).find((candidate) =>
          candidate.tags.some((tag) => tag.toLowerCase() === 'subskill')
        );
        if (subskill) {
          subskillId = subskill.id;
          break;
        }
      }

      return {
        id: record.id,
        title: record.title,
        folder: record.folder,
        parentDir: parts[parts.length - 1] ?? '',
        subskillId,
        stepIds: record.links.map((link) => link.id),
      };
    })
    .sort(
      (a, b) =>
        a.folder.localeCompare(b.folder, undefined, { sensitivity: 'base' }) ||
        a.title.localeCompare(b.title, undefined, { sensitivity: 'base' })
    );

  // Subskills: file #Subskill + roadmap yang berada di bawahnya.
  const subskills: RoadmapSubskill[] = records
    .filter((record) => record.tags.some((tag) => tag.toLowerCase() === 'subskill'))
    .map((record) => ({
      id: record.id,
      title: record.title,
      folder: record.folder,
      roadmapIds: roadmaps
        .filter((roadmap) => roadmap.subskillId === record.id)
        .map((roadmap) => roadmap.id),
    }))
    .sort((a, b) => a.folder.localeCompare(b.folder, undefined, { sensitivity: 'base' }));

  return { schemaVersion: 1, roadmaps, subskills };
}
