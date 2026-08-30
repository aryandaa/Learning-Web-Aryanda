import type { PluginLifecycle } from './plugins';
import { CODE_FILE_EXTENSIONS } from './code-languages';

export interface ParserConfig {
  /** Files/dirs that are never scanned. */
  ignored: string[];
  /**
   * Folders (by name, any depth, case-insensitive) excluded entirely from the
   * website. notes, subfolders, and assets inside them are skipped.
   * Example: "Note Personal" (catatan pribadi).
   * Catatan: folder "Praktek" TIDAK lagi dikecualikan — file source code di
   * dalamnya kini diproses pipeline code-file.
   */
  excludeFolders: string[];
  /** Extensions treated as documents. */
  markdownExtensions: string[];
  /** Extensions treated as copyable assets. */
  assetExtensions: string[];
  /**
   * Extensions yang diproses sebagai source code text (grouped JSON per folder).
   * Sumber kebenaran ada di code-languages.ts.
   */
  codeFileExtensions: string[];
  /** Max chars of note content stored in the search index. */
  searchIndexContentLimit: number;
  /** Words per minute used for reading-time estimation. */
  wordsPerMinute: number;
  /** Version reported in metadata.json. */
  parserVersion: string;
  /** Base URL prefix used for generated asset links. */
  assetPublicPrefix: string;
  plugins: PluginLifecycle[];
}

export const defaultConfig: ParserConfig = {
  ignored: ['.git', '.obsidian', '.github', '.trash', 'node_modules', 'vendor', '.DS_Store', '.gitignore'],
  // Catatan pribadi tidak ditampilkan. Folder latihan (Praktek) kini ditampilkan
  // sebagai code folder agar file source code di dalamnya bisa dibuka di website.
  excludeFolders: ['Note Personal'],
  markdownExtensions: ['.md', '.markdown'],
  assetExtensions: [
    '.png',
    '.jpg',
    '.jpeg',
    '.gif',
    '.webp',
    '.bmp',
    '.ico',
    '.avif',
    '.pdf',
    '.mp4',
    '.webm',
    '.mov',
    '.mp3',
    '.wav',
    '.zip',
    '.gz',
    '.tar',
    '.pcap',
    '.pcapng',
    '.exe',
    '.dll',
    '.so',
    '.dylib',
    '.woff',
    '.woff2',
    '.ttf',
    '.otf',
    '.db',
    '.sqlite',
    // file code TIDAK lagi disalin sebagai asset (diproses pipeline code-file)
  ],
  codeFileExtensions: CODE_FILE_EXTENSIONS,
  searchIndexContentLimit: 5000,
  wordsPerMinute: 200,
  parserVersion: '1.1.0',
  assetPublicPrefix: '/assets/vault',
  plugins: [],
};
