import fs from 'fs/promises';
import path from 'path';
import { createHash } from 'crypto';
import type { ParserContext } from './context';
import type { VaultAsset, VaultCodeFile, VaultFile, VaultFolder, VaultSnapshot } from './types';
import { extOf, isBinaryExtension, isCodeExtension, languageForExtension } from './code-languages';

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
 * Baca file sebagai text UTF-8 dengan validasi ketat. Jika tidak valid UTF-8
 * (binary/encoding tidak dikenali) kembalikan null — file disimpan sebagai
 * asset, bukan code JSON (spec: binary tidak boleh masuk code JSON).
 */
async function tryReadUtf8(context: ParserContext, relPath: string, absPath: string, warnOnInvalid: boolean): Promise<string | null> {
  const buf = await fs.readFile(absPath);
  // Validasi UTF-8 ketat: TextDecoder fatal melempar jika ada byte invalid
  // (file binary / encoding lain seperti Latin-1).
  let text: string;
  try {
    text = new TextDecoder('utf-8', { fatal: true }).decode(buf);
  } catch {
    if (warnOnInvalid) {
      context.warn('invalidEncoding', `${relPath}: bukan UTF-8 yang valid (diperlakukan sebagai asset binary)`);
    }
    return null;
  }
  // TextDecoder mengembalikan isi asli tanpa normalisasi line ending / whitespace.
  return text;
}

/**
 * Baca file code: valid UTF-8 → code file; invalid → asset binary (+ warning
 * hanya untuk extension yang memang dikenal sebagai code).
 */
async function readCodeFile(context: ParserContext, relPath: string, absPath: string, name: string, warnOnInvalid: boolean): Promise<VaultCodeFile | null> {
  const stat = await fs.stat(absPath);
  const content = await tryReadUtf8(context, relPath, absPath, warnOnInvalid);
  if (content === null) return null;
  return {
    relativePath: relPath,
    absolutePath: absPath,
    name,
    extension: extOf(name),
    language: languageForExtension(name),
    size: stat.size,
    content,
    contentHash: sha256(content),
  };
}

/**
 * Baca file non-Markdown yang bukan binary-dikenal: valid UTF-8 → code file
 * plaintext (extension tidak dikenal tetap ditampilkan, spec §8), invalid →
 * asset binary.
 */
async function readUnknownText(context: ParserContext, relPath: string, absPath: string, name: string): Promise<VaultCodeFile | null> {
  const stat = await fs.stat(absPath);
  const content = await tryReadUtf8(context, relPath, absPath, false);
  if (content === null) return null;
  return {
    relativePath: relPath,
    absolutePath: absPath,
    name,
    extension: extOf(name),
    language: 'plaintext',
    size: stat.size,
    content,
    contentHash: sha256(content),
  };
}

/**
 * Recursively walks the vault once and produces the canonical snapshot.
 * All later pipeline stages read from the snapshot instead of re-scanning.
 *
 * Klasifikasi file non-Markdown:
 *  - extension/basename = source code (code-languages.ts) → code file (text, utf-8)
 *  - selainnya → asset (binary / attachment Obsidian)
 */
export async function scanVault(context: ParserContext): Promise<VaultSnapshot> {
  const files: VaultFile[] = [];
  const folders: VaultFolder[] = [];
  const assets: VaultAsset[] = [];
  const codeFiles: VaultCodeFile[] = [];

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

      const ext = extOf(entry.name);
      const isMarkdown = context.config.markdownExtensions.includes(ext);

      if (isMarkdown) {
        const content = await fs.readFile(abs, 'utf-8');
        files.push({
          relativePath: toPosix(relPath),
          absolutePath: abs,
          content,
          contentHash: sha256(content),
        });
        continue;
      }

      // Source code / config text → pipeline code-file (grouped JSON per folder).
      if (isCodeExtension(entry.name)) {
        const code = await readCodeFile(context, toPosix(relPath), abs, entry.name, true);
        if (code) {
          codeFiles.push(code);
        } else {
          // Encoding tidak valid → fallback asset binary (tidak hilang).
          const stat = await fs.stat(abs);
          const buf = await fs.readFile(abs);
          assets.push({
            relativePath: toPosix(relPath),
            absolutePath: abs,
            size: stat.size,
            hash: sha256(buf),
          });
        }
        continue;
      }

      // Extension tidak dikenal / bukan binary-dikenal: coba baca sebagai text.
      // Text valid → code file plaintext; binary → asset.
      if (!isBinaryExtension(ext)) {
        const code = await readUnknownText(context, toPosix(relPath), abs, entry.name);
        if (code) {
          codeFiles.push(code);
          continue;
        }
      }

      // Obsidian attachments / binary lain: disalin sebagai asset.
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

  await walk(context.vaultPath, '');

  // Deterministic ordering so generation is reproducible.
  files.sort((a, b) => a.relativePath.localeCompare(b.relativePath, undefined, { sensitivity: 'base' }));
  folders.sort((a, b) => a.relativePath.localeCompare(b.relativePath, undefined, { sensitivity: 'base' }));
  assets.sort((a, b) => a.relativePath.localeCompare(b.relativePath, undefined, { sensitivity: 'base' }));
  codeFiles.sort((a, b) => a.relativePath.localeCompare(b.relativePath, undefined, { sensitivity: 'base' }));

  return { files, folders, assets, codeFiles };
}
