/**
 * Tipe data inti modul CySec Tools.
 *
 * Modul ini terisolasi dari fitur lain Learning-Web: semua metadata tool
 * dideklarasikan secara data-driven di `registry.ts`, dan implementasi tiap
 * tool di-lazy-load per kategori sehingga bundle utama tetap ringan.
 */

export type ToolCategoryId =
  | 'crypto'
  | 'osint'
  | 'forensics'
  | 'pcap'
  | 're'
  | 'web'
  | 'ctf'
  | 'log';

/** Status kesiapan tool (untuk menandai batasan client-side). */
export type ToolStatus = 'ready' | 'partial' | 'unavailable';

export interface CategoryMeta {
  id: ToolCategoryId;
  /** Nama kategori (untuk header/katalog). */
  name: string;
  /** Nama pendek untuk chip/kategori bar. */
  shortName: string;
  /** Emoji ikon kategori. */
  icon: string;
  description: string;
  /** Warna aksen (kelas Tailwind statis agar ter-deteksi compiler). */
  color: string;
}

export interface ToolMeta {
  /** id unik. Sekaligus slug route `/cysec-tools/<id>`. */
  id: string;
  name: string;
  /** Satu kategori canonical. Satu tool = satu category. */
  category: ToolCategoryId;
  description: string;
  /** Emoji ikon tool. */
  icon: string;
  tags: string[];
  /** Tool butuh upload file. */
  needsFile?: boolean;
  /** Tool menggunakan Web Crypto API. */
  usesWebCrypto?: boolean;
  /** Tool butuh waktu proses (file besar / parsing kompleks). */
  heavy?: boolean;
  status?: ToolStatus;
  /** Catatan status khusus (mis. alasan tidak tersedia). */
  statusNote?: string;
  /** Alias route lama (redirect ke id canonical). Tidak menambah kategori. */
  aliases?: string[];
  /** Disclaimer edukasi. */
  disclaimer?: string;
}

export interface ToolCategory {
  meta: CategoryMeta;
  tools: ToolMeta[];
}
