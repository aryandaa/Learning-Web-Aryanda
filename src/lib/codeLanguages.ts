/**
 * Mirror frontend dari `scripts/parser/code-languages.ts` (sumber kebenaran
 * pipeline parser). File ini dipakai untuk TAMPILAN: label bahasa, id
 * highlight.js, warna. Extension → bahasa harus sinkron dengan parser —
 * `scripts/test-code-parser.ts` meng-assert kesetaraan keduanya.
 */

export interface LanguageInfo {
  /** Label tampilan, mis. "Python", "JavaScript JSX". */
  label: string;
  /** Id highlight.js untuk syntax highlighting (fallback 'plaintext'). */
  hljs: string;
  /** Warna aksen muted (hex) untuk dot/chip. */
  color: string;
}

const BASE: Record<string, { label: string; hljs: string; color: string }> = {
  python: { label: 'Python', hljs: 'python', color: '#6F9B78' },
  javascript: { label: 'JavaScript', hljs: 'javascript', color: '#C49A5A' },
  typescript: { label: 'TypeScript', hljs: 'typescript', color: '#6E9CB8' },
  php: { label: 'PHP', hljs: 'php', color: '#B86B68' },
  html: { label: 'HTML', hljs: 'xml', color: '#C47A5A' },
  css: { label: 'CSS', hljs: 'css', color: '#6E9CB8' },
  scss: { label: 'SCSS', hljs: 'scss', color: '#B86B85' },
  less: { label: 'Less', hljs: 'less', color: '#8A7A9B' },
  java: { label: 'Java', hljs: 'java', color: '#C46A4A' },
  c: { label: 'C', hljs: 'c', color: '#6E8CB8' },
  cpp: { label: 'C++', hljs: 'cpp', color: '#6E8CB8' },
  csharp: { label: 'C#', hljs: 'csharp', color: '#8A6AB8' },
  go: { label: 'Go', hljs: 'go', color: '#5AA3C9' },
  rust: { label: 'Rust', hljs: 'rust', color: '#C07A5A' },
  ruby: { label: 'Ruby', hljs: 'ruby', color: '#B85A5A' },
  bash: { label: 'Shell', hljs: 'bash', color: '#6F9B78' },
  sql: { label: 'SQL', hljs: 'sql', color: '#6E9CB8' },
  json: { label: 'JSON', hljs: 'json', color: '#C49A5A' },
  yaml: { label: 'YAML', hljs: 'yaml', color: '#8A938A' },
  xml: { label: 'XML', hljs: 'xml', color: '#6E9CB8' },
  toml: { label: 'TOML', hljs: 'ini', color: '#8A938A' },
  ini: { label: 'INI', hljs: 'ini', color: '#8A938A' },
  plaintext: { label: 'Text', hljs: 'plaintext', color: '#8A938A' },
  dockerfile: { label: 'Dockerfile', hljs: 'dockerfile', color: '#6E9CB8' },
  makefile: { label: 'Makefile', hljs: 'makefile', color: '#C49A5A' },
};

const FALLBACK: LanguageInfo = { label: 'Text', hljs: 'plaintext', color: '#8A938A' };

/** Info tampilan bahasa (fallback plaintext untuk bahasa tidak dikenal). */
export function languageInfo(language: string): LanguageInfo {
  const info = BASE[language.toLowerCase()];
  if (!info) return FALLBACK;
  return { label: info.label, hljs: info.hljs, color: info.color };
}

/** Label bahasa (fallback "Text"). */
export function languageLabel(language: string): string {
  return languageInfo(language).label;
}

/** Id highlight.js untuk bahasa tertentu. */
export function highlightLanguage(language: string): string {
  return languageInfo(language).hljs;
}

/** Normalisasi path folder/file code untuk routing (lowercase, spasi -> hyphen). */
export function normalizeCodePath(p: string): string {
  return p.replace(/\\/g, '/').toLowerCase().replace(/ /g, '-');
}

/** Ukuran byte → teks terbaca (B / KB / MB). */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}
