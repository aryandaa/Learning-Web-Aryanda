import type { PluginLifecycle } from './plugins';

export interface ParserConfig {
  /** Files/dirs that are never scanned. */
  ignored: string[];
  /**
   * Folders (by name, any depth, case-insensitive) excluded entirely from the
   * website — notes, subfolders, and assets inside them are skipped.
   * Example: "Note Personal" (catatan pribadi), "Praktek" (folder latihan).
   */
  excludeFolders: string[];
  /** Extensions treated as documents. */
  markdownExtensions: string[];
  /** Extensions treated as copyable assets. */
  assetExtensions: string[];
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
  // Catatan pribadi dan folder latihan (praktek) tidak ditampilkan di website.
  excludeFolders: ['Note Personal', 'Praktek'],
  markdownExtensions: ['.md', '.markdown'],
  assetExtensions: [
    '.png',
    '.jpg',
    '.jpeg',
    '.gif',
    '.webp',
    '.svg',
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
    '.txt',
    '.csv',
    '.json',
    '.yaml',
    '.yml',
    '.py',
    '.go',
    '.js',
    '.ts',
    '.sh',
    '.css',
    '.html',
    '.md', // excluded later: markdown files are never copied as assets
    '.dockerfile',
    '.yml',
    '.lock',
    '.toml',
    '.env',
  ],
  searchIndexContentLimit: 5000,
  wordsPerMinute: 200,
  parserVersion: '1.0.0',
  assetPublicPrefix: '/assets/vault',
  plugins: [],
};
