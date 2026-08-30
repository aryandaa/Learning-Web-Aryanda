/**
 * SUMBER KEBENARAN untuk deteksi file source code (parser side).
 *
 * Pipeline parser memakai modul ini untuk memutuskan:
 *   - apakah sebuah file non-Markdown adalah "code file" (text) atau asset (binary)
 *   - bahasa pemrograman apa yang dipakai file tersebut (dari extension)
 *
 * Frontend punya mirror tampilan di `src/lib/codeLanguages.ts` (label bahasa,
 * id highlight.js, warna). Kedua file HARUS sinkron — test
 * `scripts/test-code-parser.ts` memastikannya (assert mapping sama).
 */

/** Extension (lowercase, dengan titik) yang diperlakukan sebagai source code text. */
export const CODE_FILE_EXTENSIONS: string[] = [
  // Bahasa pemrograman umum
  '.py',
  '.js',
  '.jsx',
  '.mjs',
  '.cjs',
  '.ts',
  '.tsx',
  '.php',
  '.html',
  '.htm',
  '.css',
  '.scss',
  '.sass',
  '.less',
  '.java',
  '.c',
  '.h',
  '.cpp',
  '.cc',
  '.hpp',
  '.cs',
  '.go',
  '.rs',
  '.rb',
  '.sh',
  '.bash',
  '.zsh',
  '.sql',
  // Format text / konfigurasi yang sering dipakai project
  '.json',
  '.yaml',
  '.yml',
  '.xml',
  '.toml',
  '.ini',
  '.conf',
  '.cfg',
  '.env',
  '.txt',
  '.log',
  '.md', // dikecualikan: markdown diproses parser dokumen (tidak pernah masuk sini)
];

/** Nama file tanpa extension yang juga dianggap code file (Dockerfile, Makefile, dll). */
export const CODE_FILE_NAMES: string[] = ['dockerfile', 'makefile', 'procfile'];

/** Extension text/binary yang tetap diperlakukan sebagai asset (bukan code). */
export const BINARY_EXTENSIONS: string[] = [
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
  '.bin',
  '.dat',
  '.db',
  '.sqlite',
  '.woff',
  '.woff2',
  '.ttf',
  '.otf',
];

const CODE_EXT_SET = new Set(CODE_FILE_EXTENSIONS.map((e) => e.toLowerCase()));
const CODE_NAME_SET = new Set(CODE_FILE_NAMES.map((n) => n.toLowerCase()));
const BINARY_EXT_SET = new Set(BINARY_EXTENSIONS.map((e) => e.toLowerCase()));

/**
 * Apakah nama file merupakan code file berdasarkan extension/basename
 * (tanpa membaca isi). Extension tidak dikenal TIDAK termasuk di sini —
 * scanner mencoba membacanya sebagai text (plaintext) atau asset (binary).
 */
export function isCodeExtension(fileName: string): boolean {
  const base = fileName.toLowerCase();
  const ext = extOf(base);
  if (CODE_EXT_SET.has(ext)) return true;
  return CODE_NAME_SET.has(base);
}

/** Extension lowercase (dengan titik) dari sebuah nama file, mis. "app.py" -> ".py".
 *  Dotfile seperti ".env" -> ".env" (seluruh nama dianggap extension). */
export function extOf(fileName: string): string {
  const base = fileName.toLowerCase();
  const dot = base.lastIndexOf('.');
  if (dot < 0) return ''; // "Dockerfile", "Makefile" -> tidak punya extension
  return base.slice(dot);
}

/** Extension yang jelas binary -> tidak boleh masuk code JSON. */
export function isBinaryExtension(ext: string): boolean {
  return BINARY_EXT_SET.has(ext.toLowerCase());
}

/**
 * Mapping extension / nama file -> bahasa (id lowercase, kompatibel highlight.js).
 * File dengan extension tidak dikenal tetap masuk, berbahasa 'plaintext'
 * (spec: "jangan membuat parser gagal").
 */
export function languageForExtension(fileName: string): string {
  const base = fileName.toLowerCase();
  const ext = extOf(base);

  switch (ext) {
    case '.py':
      return 'python';
    case '.js':
    case '.jsx':
    case '.mjs':
    case '.cjs':
      return 'javascript';
    case '.ts':
    case '.tsx':
      return 'typescript';
    case '.php':
      return 'php';
    case '.html':
    case '.htm':
      return 'html';
    case '.css':
      return 'css';
    case '.scss':
    case '.sass':
      return 'scss';
    case '.less':
      return 'less';
    case '.java':
      return 'java';
    case '.c':
    case '.h':
      return 'c';
    case '.cpp':
    case '.cc':
    case '.hpp':
      return 'cpp';
    case '.cs':
      return 'csharp';
    case '.go':
      return 'go';
    case '.rs':
      return 'rust';
    case '.rb':
      return 'ruby';
    case '.sh':
    case '.bash':
    case '.zsh':
      return 'bash';
    case '.sql':
      return 'sql';
    case '.json':
      return 'json';
    case '.yaml':
    case '.yml':
      return 'yaml';
    case '.xml':
      return 'xml';
    case '.toml':
      return 'toml';
    case '.ini':
    case '.conf':
    case '.cfg':
    case '.env':
    case '.env.example':
      return 'ini';
    case '.txt':
    case '.log':
      return 'plaintext';
    default:
      break;
  }

  if (base === 'dockerfile') return 'dockerfile';
  if (base === 'makefile') return 'makefile';
  if (base === 'procfile') return 'ini';

  return 'plaintext';
}
