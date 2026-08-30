import fs from 'fs/promises';
import path from 'path';
import type { ParserContext } from './context';
import type { AssetManifestEntry } from './types';

/**
 * Copies vault assets that are actually referenced by rendered notes into
 * generated/assets/<relative path> (spec §30-31, optimized): unreferenced
 * assets are never displayed anywhere, so they are not published.
 */
export async function copyAssets(context: ParserContext, generatedDir?: string): Promise<AssetManifestEntry[]> {
  const generatedRoot = generatedDir ? path.resolve(generatedDir) : path.join(process.cwd(), 'generated');
  const assetsDir = path.join(generatedRoot, 'assets');
  await fs.rm(assetsDir, { recursive: true, force: true });
  await fs.mkdir(assetsDir, { recursive: true });

  const manifest: AssetManifestEntry[] = [];
  const { referencedAssets } = context;
  let skipped = 0;

  for (const asset of context.snapshot!.assets) {
    if (!referencedAssets.has(asset.relativePath)) {
      skipped += 1;
      continue;
    }

    const destAbs = path.join(assetsDir, asset.relativePath);
    await fs.mkdir(path.dirname(destAbs), { recursive: true });
    await fs.copyFile(asset.absolutePath, destAbs);
    manifest.push({
      sourcePath: asset.relativePath,
      publicPath: `${context.config.assetPublicPrefix}/${asset.relativePath}`,
      size: asset.size,
      hash: asset.hash,
    });
  }

  if (skipped > 0) {
    console.log(`Assets: ${manifest.length} referenced copied, ${skipped} unreferenced skipped`);
  }

  return manifest;
}
