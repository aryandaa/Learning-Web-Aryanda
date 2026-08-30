import fs from 'fs/promises';
import path from 'path';
import type { ParseResult } from './types';

/**
 * Publishes generated/ into public/ (spec §13).
 *
 * SAFETY GUARANTEES (spec §42):
 * - only public/docs and public/assets/vault are touched
 * - stale files are removed without ever deleting the target directories
 *   (deleting the dir would break a running `vite dev` public middleware)
 * - other public/ files (favicon, 404.html, ...) are never touched
 * - fails loudly if any markdown file would end up in the output
 */
export async function publishToPublic(_context: unknown, _result: ParseResult): Promise<void> {
  const cwd = process.cwd();
  const generatedRoot = path.join(cwd, 'generated');
  const publicDocs = path.join(cwd, 'public', 'docs');
  const publicAssets = path.join(cwd, 'public', 'assets', 'vault');

  // Sync public/docs <-> generated/docs (in place, no dir deletion).
  await syncDir(path.join(generatedRoot, 'docs'), publicDocs);

  // Sync public/assets/vault <-> generated/assets.
  const generatedAssets = path.join(generatedRoot, 'assets');
  await fs.mkdir(publicAssets, { recursive: true });
  if (await exists(generatedAssets)) {
    await syncDir(generatedAssets, publicAssets);
  } else {
    await clearDir(publicAssets);
  }

  // warnings.json lives in public/docs for the frontend.
  const warningsSrc = path.join(generatedRoot, 'warnings.json');
  if (await exists(warningsSrc)) {
    await fs.copyFile(warningsSrc, path.join(publicDocs, 'warnings.json'));
  }

  // Safety: no markdown may ever reach the public output.
  const allLeaked = [
    ...(await findMarkdown(publicDocs)),
    ...(await findMarkdown(publicAssets)),
  ];
  if (allLeaked.length > 0) {
    throw new Error(`SAFETY: markdown files would be published: ${allLeaked.join(', ')}`);
  }
}

/**
 * Mirrors `src` into `dest` in place: copies/overwrites everything from src,
 * then removes dest entries that no longer exist in src (stale cleanup).
 * Never deletes `dest` itself, so filesystem watchers stay intact.
 */
async function syncDir(src: string, dest: string): Promise<void> {
  await fs.mkdir(dest, { recursive: true });

  const srcEntries = await fs.readdir(src, { withFileTypes: true });
  const srcNames = new Set(srcEntries.map((entry) => entry.name));

  for (const entry of srcEntries) {
    const s = path.join(src, entry.name);
    const d = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      await syncDir(s, d);
    } else if (entry.isFile()) {
      await fs.mkdir(path.dirname(d), { recursive: true });
      await fs.copyFile(s, d);
    }
  }

  const destEntries = await fs.readdir(dest, { withFileTypes: true });
  for (const entry of destEntries) {
    if (!srcNames.has(entry.name)) {
      await fs.rm(path.join(dest, entry.name), { recursive: true, force: true });
    }
  }
}

async function clearDir(dir: string): Promise<void> {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    await fs.rm(path.join(dir, entry.name), { recursive: true, force: true });
  }
}

async function exists(p: string): Promise<boolean> {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

async function findMarkdown(root: string): Promise<string[]> {
  const found: string[] = [];
  async function walk(dir: string): Promise<void> {
    let entries;
    try {
      entries = await fs.readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      const abs = path.join(dir, entry.name);
      if (entry.isDirectory()) await walk(abs);
      else if (/\.md$/i.test(entry.name)) found.push(abs);
    }
  }
  await walk(root);
  return found;
}
