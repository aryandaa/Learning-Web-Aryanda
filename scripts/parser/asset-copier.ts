import fs from 'fs/promises';
import path from 'path';
import type { ParserContext } from './context';
import type { AssetManifestEntry } from './types';

/**
 * Copies every vault asset into generated/assets/<relative path>
 * (spec §30-31) and returns the manifest entries.
 */
export async function copyAssets(context: ParserContext): Promise<AssetManifestEntry[]> {
  const generatedRoot = path.join(process.cwd(), 'generated');
  const assetsDir = path.join(generatedRoot, 'assets');
  await fs.rm(assetsDir, { recursive: true, force: true });
  await fs.mkdir(assetsDir, { recursive: true });

  const manifest: AssetManifestEntry[] = [];

  for (const asset of context.snapshot!.assets) {
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

  return manifest;
}
