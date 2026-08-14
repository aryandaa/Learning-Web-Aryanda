import type { ParserContext } from './context';

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
 */
export function validateSnapshot(context: ParserContext): void {
  const { files, assets } = context.snapshot!;

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
}
