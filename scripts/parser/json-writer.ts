import fs from 'fs/promises';
import path from 'path';
import type { ParserContext } from './context';
import { buildTree } from './tree';
import type {
  AssetManifestEntry,
  MetadataFile,
  NoteRecord,
  ParseResult,
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
    metadata,
    warnings: context.warnings,
    assets: options.assets,
  };
}
