import fs from 'fs/promises';
import path from 'path';
import { createHash } from 'crypto';
import type { ParserContext } from './context';
import type { VaultAsset, VaultFile, VaultFolder, VaultSnapshot } from './types';

function toPosix(p: string): string {
  return p.replace(/\\/g, '/');
}

function sha256(content: Buffer | string): string {
  return `sha256:${createHash('sha256').update(content).digest('hex')}`;
}

function isIgnored(context: ParserContext, name: string): boolean {
  return context.config.ignored.some((entry) => entry === name);
}

function isExcludedFolder(context: ParserContext, name: string): boolean {
  const lower = name.toLowerCase();
  return context.config.excludeFolders.some((entry) => entry.toLowerCase() === lower);
}

/**
 * Recursively walks the vault once and produces the canonical snapshot.
 * All later pipeline stages read from the snapshot instead of re-scanning.
 */
export async function scanVault(context: ParserContext): Promise<VaultSnapshot> {
  const files: VaultFile[] = [];
  const folders: VaultFolder[] = [];
  const assets: VaultAsset[] = [];

  async function walk(dirAbs: string, rel: string): Promise<void> {
    const entries = await fs.readdir(dirAbs, { withFileTypes: true });
    entries.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));

    for (const entry of entries) {
      if (isIgnored(context, entry.name)) continue;
      if (entry.isDirectory() && isExcludedFolder(context, entry.name)) continue;

      const abs = path.join(dirAbs, entry.name);
      const relPath = rel ? `${rel}/${entry.name}` : entry.name;

      if (entry.isDirectory()) {
        folders.push({ relativePath: relPath, absolutePath: abs });
        await walk(abs, relPath);
        continue;
      }
      if (!entry.isFile()) continue;

      const ext = path.extname(entry.name).toLowerCase();
      const isMarkdown = context.config.markdownExtensions.includes(ext);

      if (isMarkdown) {
        const content = await fs.readFile(abs, 'utf-8');
        files.push({
          relativePath: toPosix(relPath),
          absolutePath: abs,
          content,
          contentHash: sha256(content),
        });
      } else {
        // Obsidian attachments can be any file type; copy every non-markdown
        // file (Dockerfiles, .env, .mjs, images, pdfs, ...).
        const stat = await fs.stat(abs);
        const buf = await fs.readFile(abs);
        assets.push({
          relativePath: toPosix(relPath),
          absolutePath: abs,
          size: stat.size,
          hash: sha256(buf),
        });
      }
    }
  }

  await walk(context.vaultPath, '');

  // Deterministic ordering so generation is reproducible.
  files.sort((a, b) => a.relativePath.localeCompare(b.relativePath, undefined, { sensitivity: 'base' }));
  folders.sort((a, b) => a.relativePath.localeCompare(b.relativePath, undefined, { sensitivity: 'base' }));
  assets.sort((a, b) => a.relativePath.localeCompare(b.relativePath, undefined, { sensitivity: 'base' }));

  return { files, folders, assets };
}
