/**
 * Tipe data modul OSINT. terisolasi dari fitur lain, data-driven registry.
 * Semua tool berjalan client-side; integrasi eksternal hanya ke API publik
 * yang mendukung CORS (DoH, ipwho.is). tanpa secret/key di frontend.
 */

export type OsintCategoryId =
  | 'domain'
  | 'dns'
  | 'ip'
  | 'url'
  | 'username'
  | 'email'
  | 'metadata'
  | 'ioc'
  | 'threat'
  | 'hash'
  | 'text'
  | 'analysis'
  | 'search';

/** Indikator privasi tool. */
export type OsintPrivacy = 'local' | 'external' | 'hybrid';

export interface OsintCategoryMeta {
  id: OsintCategoryId;
  name: string;
  shortName: string;
  icon: string;
  description: string;
  color: string;
}

export interface OsintToolMeta {
  /** id unik. sekaligus slug route `/osint/<id>`. */
  id: string;
  title: string;
  description: string;
  category: OsintCategoryId;
  /** Path route tool. */
  path: string;
  icon: string;
  tags: string[];
  privacy: OsintPrivacy;
  /** Tool butuh upload file. */
  needsFile?: boolean;
  /** Tool berat / lazy-load penuh. */
  heavy?: boolean;
  /** Catatan privacy tambahan (mis. resolver DoH mana yang dipakai). */
  privacyNote?: string;
  /** Disclaimer edukasi/legal. */
  disclaimer?: string;
}

export interface OsintSource {
  source: string;
  url: string;
  retrievedAt: string;
  note?: string;
}

export interface OsintCategory {
  meta: OsintCategoryMeta;
  tools: OsintToolMeta[];
}
