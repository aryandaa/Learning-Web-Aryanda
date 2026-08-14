/**
 * Katalog terpadu CySec Tools — menyatukan kategori/tool CySec dan kategori OSINT
 * dalam satu sumber data (data-driven). Landing, category pages, dan search
 * memakai modul ini. Tool OSINT tetap di route /osint/:toolId (tidak dipindah).
 */

import { CATEGORIES, getCategory, getTool, toolsInCategory } from './registry';
import { allOsintTools } from '../osint/registry';
import type { ToolCategoryId, ToolMeta } from './types';
import type { OsintToolMeta } from '../osint/types';

export interface CategoryCard {
  id: string;
  title: string;
  description: string;
  icon: string;
  color: string;
  count: number;
}

export interface CatalogEntry {
  id: string;
  title: string;
  description: string;
  icon: string;
  tags: string[];
  path: string;
  category: string;
  categoryName: string;
  privacy?: 'local' | 'external' | 'hybrid';
  needsFile?: boolean;
  osint?: boolean;
}

/** Keanggotaan kategori baru (hash/file-metadata/malware/utilities) — data-driven,
 *  tidak mengubah `category` tool existing (tetap backward-compatible). */
const EXTRA_CATEGORY_TOOLS: Record<string, string[]> = {
  hash: ['hash-generator', 'hmac', 'pbkdf2', 'sha3', 'file-hash'],
  'file-metadata': [
    'metadata', 'file-hash', 'file-signature', 'mime', 'file-hex', 'strings',
    'entropy', 'exif', 'pdf-metadata', 'zip-metadata', 'file-compare', 'timestamp',
  ],
  malware: [
    'strings', 'entropy', 'file-signature', 'hex-viewer', 'byte-frequency',
    'pe-viewer', 'elf-viewer', 'macho-viewer', 'printable-strings', 'xor-analyzer',
  ],
  utilities: [
    'base64', 'base32', 'base16', 'url-encoder', 'ascii-hex', 'binary-text',
    'decimal-hex', 'uuid', 'random-bytes', 'timestamp', 'integer-converter',
    'endianness', 'binary-hex', 'ascii-table', 'port-reference', 'cidr', 'subnet',
    'ip-converter', 'unicode-analyzer', 'unicode-table',
  ],
};

function entryFromCysecTool(t: ToolMeta, categoryName: string): CatalogEntry {
  return {
    id: t.id,
    title: t.name,
    description: t.description,
    icon: t.icon,
    tags: t.tags,
    path: `/cysec-tools/${t.id}`,
    category: t.category,
    categoryName,
    needsFile: t.needsFile,
  };
}

function entryFromOsintTool(t: OsintToolMeta): CatalogEntry {
  return {
    id: t.id,
    title: t.title,
    description: t.description,
    icon: t.icon,
    tags: t.tags,
    path: t.path,
    category: 'osint',
    categoryName: 'OSINT',
    privacy: t.privacy,
    needsFile: t.needsFile,
    osint: true,
  };
}

/** Daftar tool untuk satu kategori (CySec + OSINT). */
export function catalogEntries(categoryId: string): CatalogEntry[] {
  if (categoryId === 'osint') {
    return allOsintTools().map(entryFromOsintTool).sort((a, b) => a.title.localeCompare(b.title));
  }
  const cat = getCategory(categoryId);
  const extraIds = EXTRA_CATEGORY_TOOLS[categoryId] ?? [];
  const seen = new Set<string>();
  const out: CatalogEntry[] = [];
  for (const t of toolsInCategory(categoryId as ToolCategoryId)) {
    if (seen.has(t.id)) continue;
    seen.add(t.id);
    out.push(entryFromCysecTool(t, cat.name));
  }
  for (const id of extraIds) {
    const t = getTool(id);
    if (t && !seen.has(t.id)) {
      seen.add(t.id);
      out.push(entryFromCysecTool(t, cat.name));
    }
  }
  return out.sort((a, b) => a.title.localeCompare(b.title));
}

/** Kartu kategori dengan jumlah tool (hanya kategori yang punya tool). */
export function categoryCards(): CategoryCard[] {
  return CATEGORIES.map((c) => ({
    id: c.id,
    title: c.name,
    description: c.description,
    icon: c.icon,
    color: c.color,
    count: c.id === 'osint' ? allOsintTools().length : catalogEntries(c.id).length,
  })).filter((c) => c.count > 0);
}

/** Semua tool di seluruh kategori (untuk search global). */
export function catalogAll(): CatalogEntry[] {
  return categoryCards().flatMap((c) => catalogEntries(c.id));
}

export function searchCatalog(query: string): { categories: CategoryCard[]; tools: CatalogEntry[] } {
  const q = query.trim().toLowerCase();
  if (!q) return { categories: categoryCards(), tools: [] };
  const categories = categoryCards().filter(
    (c) => c.title.toLowerCase().includes(q) || c.description.toLowerCase().includes(q)
  );
  const tools = catalogAll().filter(
    (t) =>
      t.title.toLowerCase().includes(q) ||
      t.description.toLowerCase().includes(q) ||
      t.tags.some((tag) => tag.toLowerCase().includes(q))
  );
  return { categories, tools };
}

export function categoryCardById(id: string): CategoryCard | undefined {
  return categoryCards().find((c) => c.id === id);
}

/** Label kategori untuk item recently-used. */
export function labelForToolId(id: string): { icon: string; title: string; path: string; categoryName: string } | null {
  const cy = getTool(id);
  if (cy) {
    return { icon: cy.icon, title: cy.name, path: `/cysec-tools/${cy.id}`, categoryName: getCategory(cy.category).name };
  }
  const os = allOsintTools().find((t) => t.id === id);
  if (os) return { icon: os.icon, title: os.title, path: os.path, categoryName: 'OSINT' };
  return null;
}
