import { ParserContext } from './context';
import type { ParseResult, VaultSnapshot, AssetManifestEntry } from './types';
import { defaultConfig, type ParserConfig } from './parser.config';
import { scanVault } from './scanner';
import { validateSnapshot } from './validator';
import { indexNotes } from './indexer';
import { resolveLinks, buildLinkLookup } from './link-resolver';
import { renderNotes } from './renderer';
import { copyAssets } from './asset-copier';
import { writeGenerated } from './json-writer';
import { publishToPublic } from './publisher';
import { runPlugins } from './plugins';
import type { PluginLifecycle } from './plugins';

export interface RunParserOptions {
  vaultPath: string;
  config?: Partial<ParserConfig>;
  vaultCommit?: string | null;
  vaultBranch?: string | null;
  generatedDir?: string;
  skipPublish?: boolean;
  skipAssets?: boolean;
  /** Additional folder names to exclude from the output. */
  excludeFolders?: string[];
  plugins?: PluginLifecycle[];
}

/**
 * Runs the full parser pipeline:
 * scan -> validate -> index -> resolve -> render -> copy assets -> write -> publish.
 * Returns the generated artifacts for inspection.
 */
export async function runParser(options: RunParserOptions): Promise<ParseResult> {
  const config: ParserConfig = {
    ...defaultConfig,
    ...options.config,
    excludeFolders: [
      ...defaultConfig.excludeFolders,
      ...(options.config?.excludeFolders ?? []),
      ...(options.excludeFolders ?? []),
    ],
    plugins: [...defaultConfig.plugins, ...(options.plugins ?? [])],
  };

  const context = new ParserContext(options.vaultPath, config);

  // ---- SCAN ----
  await runPlugins(context, 'beforeScan');
  const snapshot: VaultSnapshot = await scanVault(context);
  context.snapshot = snapshot;
  await runPlugins(context, 'afterScan');

  // ---- VALIDATE ----
  await runPlugins(context, 'beforeValidate');
  validateSnapshot(context);
  await runPlugins(context, 'afterValidate');

  // ---- INDEX ----
  await runPlugins(context, 'beforeIndex');
  const records = await indexNotes(context);
  await runPlugins(context, 'afterIndex');

  // ---- RESOLVE (link lookup + navigation order) ----
  await runPlugins(context, 'beforeResolve');
  const lookup = buildLinkLookup(context, records);
  resolveLinks(context, records);
  await runPlugins(context, 'afterResolve');

  // ---- RENDER (produces html, outgoing links, broken links) ----
  await runPlugins(context, 'beforeRender');
  const rendered = await renderNotes(context, records, lookup);
  await runPlugins(context, 'afterRender');

  // ---- ASSETS ----
  let assets: AssetManifestEntry[] = [];
  if (!options.skipAssets) {
    await runPlugins(context, 'beforeCopyAssets');
    assets = await copyAssets(context, options.generatedDir);
    await runPlugins(context, 'afterCopyAssets');
  }

  // ---- WRITE ----
  await runPlugins(context, 'beforeWrite');
  const result = await writeGenerated(context, {
    records: rendered,
    assets,
    vaultCommit: options.vaultCommit ?? null,
    vaultBranch: options.vaultBranch ?? null,
    generatedDir: options.generatedDir,
  });
  await runPlugins(context, 'afterWrite');

  // ---- PUBLISH ----
  if (!options.skipPublish) {
    await runPlugins(context, 'beforePublish');
    await publishToPublic(context, result);
    await runPlugins(context, 'afterPublish');
  }

  return result;
}
