import type { ParserContext } from './context';
import { codeFileId, codeFolderId } from './code-files';

/**
 * Returns the normalized document id for a vault-relative markdown path.
 * Identity rule (spec §16): lowercase, POSIX separators, no extension,
 * spaces -> hyphens.
 *
 * "Pemrograman/PHP/Routing.md" -> "pemrograman/php/routing"
 */
export function toDocumentId(relativePath: string): string {
  return relativePath
    .replace(/\\/g, '/')
    .replace(/\.md$/i, '')
    .toLowerCase()
    .replace(/ /g, '-');
}

/** Title = filename without extension (fallback when no frontmatter title). */
export function titleFromPath(relativePath: string): string {
  const base = relativePath.replace(/\\/g, '/').split('/').pop() ?? relativePath;
  return base.replace(/\.md$/i, '');
}

/**
 * Validates the scanned snapshot:
 * - malformed/invalid source paths
 * - duplicate document ids (FATAL. two different files normalizing to one id)
 * - duplicate asset output paths (FATAL. data would be overwritten)
 * - code files: duplicate code ids (FATAL) & tabrakan id folder-code vs dokumen (WARN)
 */
export function validateSnapshot(context: ParserContext): void {
  const { files, assets, codeFiles } = context.snapshot!;

  for (const file of files) {
    if (!file.relativePath || file.relativePath.startsWith('/') || file.relativePath.includes('..')) {
      context.warn('duplicatePaths', `invalid source path: ${file.relativePath}`);
    }
  }

  const idMap = new Map<string, string>();
  for (const file of files) {
    const id = toDocumentId(file.relativePath);
    const existing = idMap.get(id);
    if (existing) {
      const message = `duplicate document id "${id}" from "${existing}" and "${file.relativePath}"`;
      context.warn('duplicatePaths', message);
      throw new Error(`FATAL: ${message}`);
    }
    idMap.set(id, file.relativePath);
  }

  const assetMap = new Map<string, string>();
  for (const asset of assets) {
    const existing = assetMap.get(asset.relativePath);
    if (existing) {
      const message = `duplicate asset path "${asset.relativePath}" (${existing} vs ${asset.absolutePath})`;
      context.warn('duplicatePaths', message);
      throw new Error(`FATAL: ${message}`);
    }
    assetMap.set(asset.relativePath, asset.absolutePath);
  }

  // Code files: id unik (folder + nama file). tabrakan = data akan tertimpa.
  const codeIdMap = new Map<string, string>();
  for (const file of codeFiles) {
    const parts = file.relativePath.split('/');
    const folder = parts.length > 1 ? parts.slice(0, -1).join('/') : '';
    const id = codeFileId(folder, file.name);
    const existing = codeIdMap.get(id);
    if (existing) {
      const message = `duplicate code file id "${id}" from "${existing}" and "${file.relativePath}"`;
      context.warn('duplicatePaths', message);
      throw new Error(`FATAL: ${message}`);
    }
    codeIdMap.set(id, file.relativePath);
  }

  // Tabrakan id folder-code vs id dokumen markdown (mis. folder "Praktek" vs
  // "Praktek.md"). Non-fatal: frontend memprioritaskan folder code, dokumen
  // tetap bisa diakses via id lain — tapi lebih baik vault menghindarinya.
  const folderIds = new Set<string>();
  for (const file of codeFiles) {
    const parts = file.relativePath.split('/');
    if (parts.length > 1) folderIds.add(codeFolderId(parts.slice(0, -1).join('/')));
  }
  for (const [docId, rel] of idMap) {
    if (folderIds.has(docId)) {
      context.warn('codeFolderIdCollision', `folder code "${docId}" bertabrakan dengan dokumen "${rel}"`);
    }
  }
}
