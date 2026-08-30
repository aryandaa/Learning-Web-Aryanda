import { useCallback, useEffect, useRef, useState } from 'react';
import { Check, Code2, Copy, Loader2, Play, Terminal, Trash2 } from 'lucide-react';
import { cn } from '../lib/utils';
import { appRoot } from '../lib/base';
import { copyToClipboard } from '../lib/clipboard';
import hljs from 'highlight.js/lib/core';
import hljsJavascript from 'highlight.js/lib/languages/javascript';
import hljsTypescript from 'highlight.js/lib/languages/typescript';
import hljsXml from 'highlight.js/lib/languages/xml';
import hljsCss from 'highlight.js/lib/languages/css';
import hljsPhp from 'highlight.js/lib/languages/php';
import hljsPython from 'highlight.js/lib/languages/python';
import hljsSql from 'highlight.js/lib/languages/sql';

hljs.registerLanguage('javascript', hljsJavascript);
hljs.registerLanguage('typescript', hljsTypescript);
hljs.registerLanguage('xml', hljsXml);
hljs.registerLanguage('css', hljsCss);
hljs.registerLanguage('php', hljsPhp);
hljs.registerLanguage('python', hljsPython);
hljs.registerLanguage('sql', hljsSql);

type LangId = 'javascript' | 'typescript' | 'html' | 'css' | 'php' | 'python' | 'sql';

interface LangDef {
  id: LangId;
  label: string;
  template: string;
}

interface OutputLine {
  type: 'log' | 'warn' | 'error';
  text: string;
}

/**
 * Bahasa yang didukung eksekusi 100% di browser (tanpa backend):
 * - JavaScript / TypeScript : sandbox iframe (TS ditranspilasi via paket typescript)
 * - HTML / CSS              : preview halaman web langsung di iframe
 * - PHP                     : php-wasm (WebAssembly, di-bundle dari origin sendiri)
 * - Python                  : Pyodide (WASM) dari CDN
 * - SQL                     : SQLite via sql.js (WASM) dari CDN
 */
const LANGUAGES: LangDef[] = [
  {
    id: 'javascript',
    label: 'JavaScript',
    template: `// Selamat datang di Code Editor!
// Tulis kode JavaScript lalu tekan Run (atau Ctrl+Enter).

function sapa(nama) {
  return "Halo, " + nama + "!";
}

for (let i = 1; i <= 5; i++) {
  console.log(sapa("Aryanda"), "- iterasi", i);
}

console.log({ angka: 42, teks: "belajar", aktif: true });
`,
  },
  {
    id: 'typescript',
    label: 'TypeScript',
    template: `// TypeScript ditranspilasi ke JavaScript dulu,
// lalu dijalankan di sandbox browser.

interface User {
  nama: string;
  umur: number;
}

const user: User = { nama: "Aryanda", umur: 21 };

function perkenalan(u: User): string {
  return \`Halo, saya \${u.nama}, umur \${u.umur} tahun.\`;
}

console.log(perkenalan(user));
`,
  },
  {
    id: 'html',
    label: 'HTML',
    template: `<!-- Tulis HTML + CSS + JS. Hasilnya dirender langsung di panel output. -->
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: sans-serif; padding: 1.5rem; background: #f8fafc; }
    h1 { color: #527a5b; }
    button { padding: .5rem 1rem; font-size: 1rem; cursor: pointer; }
  </style>
</head>
<body>
  <h1>Halo dari HTML!</h1>
  <p id="teks">Klik tombol di bawah:</p>
  <button onclick="sapa()">Klik saya</button>
  <script>
    function sapa() {
      document.getElementById("teks").textContent = "Tombol diklik! 🎉";
    }
  <\/script>
</body>
</html>
`,
  },
  {
    id: 'css',
    label: 'CSS',
    template: `/* Belajar CSS: tulis gaya di sini, halaman contoh
   di panel output langsung berubah saat Run. */

body {
  font-family: sans-serif;
  background: #f6f6f2;
  padding: 1.5rem;
}

h1 {
  color: #527a5b;
  border-bottom: 3px solid #527a5b;
  padding-bottom: .5rem;
}

button {
  background: #527a5b;
  color: white;
  border: none;
  padding: .6rem 1.2rem;
  border-radius: 8px;
  cursor: pointer;
}

button.secondary {
  background: #e2e8f0;
  color: #334155;
}

.card {
  background: white;
  border-radius: 12px;
  padding: 1rem 1.25rem;
  box-shadow: 0 4px 12px rgba(0, 0, 0, .08);
  margin-top: 1rem;
}

.card h2 { margin-top: 0; color: #1e293b; }
.card li { color: #475569; margin-bottom: .25rem; }
`,
  },
  {
    id: 'php',
    label: 'PHP',
    template: `<?php
// PHP dijalankan lewat php-wasm (WebAssembly) di browser.
// Hasil echo/print dirender sebagai halaman web di panel output.
// Unduhan pertama (runtime ~5 MB) butuh beberapa detik.

$nama = "Aryanda";
$umur = 21;

function sapa($nama) {
    return "Halo, $nama!";
}

$hobi = ["coding", "ngoding", "debugging"];
?>

<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: sans-serif; padding: 1.5rem; background: #f6f6f2; }
    h1 { color: #527a5b; }
    ul li { margin-bottom: .25rem; }
  </style>
</head>
<body>
  <h1><?= sapa($nama) ?></h1>
  <p>Umur saya <?= $umur ?> tahun.</p>
  <h3>Hobi:</h3>
  <ul>
    <?php foreach ($hobi as $h) : ?>
      <li><?= $h ?></li>
    <?php endforeach; ?>
  </ul>
</body>
</html>
`,
  },
  {
    id: 'python',
    label: 'Python',
    template: `# Python dijalankan lewat Pyodide (WASM).
# Unduhan pertama bisa memakan beberapa detik.

def sapa(nama):
    return f"Halo, {nama}!"

for i in range(1, 6):
    print(sapa("Aryanda"), "- iterasi", i)

print("Total 1..10 =", sum(range(1, 11)))
`,
  },
  {
    id: 'sql',
    label: 'SQL',
    template: `-- SQL dijalankan dengan SQLite (WASM) di browser.
-- Hasil query ditampilkan sebagai tabel di output.

CREATE TABLE mahasiswa (
  id INTEGER PRIMARY KEY,
  nama TEXT,
  nilai REAL
);

INSERT INTO mahasiswa (nama, nilai) VALUES
  ('Aryanda', 95),
  ('Budi', 88),
  ('Citra', 91);

SELECT id, nama, nilai
FROM mahasiswa
ORDER BY nilai DESC;

-- Coba juga: SELECT AVG(nilai) AS rata_rata FROM mahasiswa;
`,
  },
];

/** Pemetaan bahasa editor -> nama bahasa highlight.js. */
const HLJS_LANG: Record<LangId, string> = {
  javascript: 'javascript',
  typescript: 'typescript',
  html: 'xml',
  css: 'css',
  php: 'php',
  python: 'python',
  sql: 'sql',
};

/** Memformat argumen console.log ke teks yang dapat dibaca. */
function formatArgs(args: unknown[]): string {
  return args
    .map((a) => {
      if (typeof a === 'string') return a;
      if (a instanceof Error) return String(a.message || a);
      try {
        return JSON.stringify(a, null, 2);
      } catch {
        return String(a);
      }
    })
    .join(' ');
}

/**
 * Menjalankan JavaScript di iframe sandbox (tidak bisa akses halaman induk,
 * tidak bisa pakai cookie/localStorage). Output dikirim balik via postMessage.
 */
function runJavaScript(code: string): Promise<OutputLine[]> {
  return new Promise((resolve) => {
    const frame = document.createElement('iframe');
    frame.sandbox = 'allow-scripts';
    frame.style.display = 'none';
    const escaped = code.replace(/<\/script>/g, '<\\/script>');
    const harness = `<!DOCTYPE html><html><body><script>
      var __out = [];
      var __fmt = function (args) {
        return args.map(function (a) {
          if (typeof a === 'string') return a;
          if (a && a.stack && a.message) return String(a.message);
          try { return JSON.stringify(a, null, 2); } catch (e) { return String(a); }
        }).join(' ');
      };
      var __push = function (type, text) { __out.push({ type: type, text: text }); };
      console.log = function () { __push('log', __fmt([].slice.call(arguments))); };
      console.info = function () { __push('log', __fmt([].slice.call(arguments))); };
      console.warn = function () { __push('warn', __fmt([].slice.call(arguments))); };
      console.error = function () { __push('error', __fmt([].slice.call(arguments))); };
      window.onerror = function (msg, src, line) {
        __push('error', String(msg) + (line ? ' (baris ' + line + ')' : ''));
      };
      try {
        ${escaped}
      } catch (e) {
        __push('error', e && e.stack ? String(e.stack) : String(e));
      }
      parent.postMessage({ kind: 'run-output', out: __out }, '*');
    <\/script></body></html>`;

    const onMessage = (ev: MessageEvent) => {
      if (!ev.data || ev.data.kind !== 'run-output') return;
      window.removeEventListener('message', onMessage);
      window.clearTimeout(timer);
      frame.remove();
      resolve(ev.data.out as OutputLine[]);
    };
    const timer = window.setTimeout(() => {
      window.removeEventListener('message', onMessage);
      frame.remove();
      resolve([{ type: 'error', text: 'Eksekusi melebihi batas waktu (10 detik). Mungkin ada infinite loop?' }]);
    }, 10000);

    window.addEventListener('message', onMessage);
    frame.srcdoc = harness;
    document.body.appendChild(frame);
  });
}

/** Menjalankan Python via Pyodide (WASM, dimuat sekali lalu di-cache). */
let pyodidePromise: Promise<{ runPythonAsync(code: string): Promise<unknown>; setStdout(o: unknown): void; setStderr(o: unknown): void }> | null = null;

function loadPyodide() {
  if (!pyodidePromise) {
    pyodidePromise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.dataset.pyodide = '1';
      script.src = 'https://cdn.jsdelivr.net/pyodide/v0.26.4/full/pyodide.js';
      script.onload = async () => {
        try {
          const py = await (window as unknown as { loadPyodide(o: unknown): Promise<never> }).loadPyodide({
            indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.26.4/full/',
          });
          resolve(py);
        } catch (err) {
          pyodidePromise = null;
          reject(err);
        }
      };
      script.onerror = () => {
        pyodidePromise = null;
        reject(new Error('Gagal memuat Pyodide dari CDN. Periksa koneksi internet.'));
      };
      document.head.appendChild(script);
    });
  }
  return pyodidePromise;
}

async function runPython(code: string, onStatus: (text: string) => void): Promise<OutputLine[]> {
  onStatus('Memuat Python (Pyodide)… unduhan pertama butuh beberapa detik');
  const py = await loadPyodide();
  const lines: OutputLine[] = [];
  py.setStdout({ batched: (s: string) => lines.push({ type: 'log', text: s }) });
  py.setStderr({ batched: (s: string) => lines.push({ type: 'error', text: s }) });
  try {
    await py.runPythonAsync(code);
  } catch (err) {
    const message = (err as Error)?.message ?? String(err);
    lines.push({ type: 'error', text: message });
  }
  return lines;
}

/**
 * Memuat runtime php-wasm dari folder public/ (index.js + light/php_8_0 + wasm)
 * yang tersaji dari origin kita sendiri (MIME wasm benar di dev & produksi).
 *
 * Vite melarang import ESM langsung dari /public di dev, dan modul blob tidak
 * bisa me-resolve path absolut, jadi kedua file di-fetch lalu di-patch:
 * - index.js: import loader diarahkan ke Blob URL (full URL).
 * - php_8_0.js: konstanta URL wasm diganti dengan full URL (root runtime,
 *   aman juga untuk deployment subpath).
 * Hasil di-cache agar hanya dimuat sekali per sesi.
 */
interface PhpResponse {
  text: string;
  errors: string;
  exitCode: number;
}
interface PhpInstance {
  run(options: { code: string }): Promise<PhpResponse>;
}
interface PhpWasmModule {
  WebPHP: { load(version: string): Promise<PhpInstance> };
}

async function loadPhpWasm(): Promise<PhpWasmModule> {
  const base = `${appRoot()}php-wasm`;
  const [indexRes, loaderRes] = await Promise.all([
    fetch(`${base}/index.js`),
    fetch(`${base}/light/php_8_0.js`),
  ]);
  if (!indexRes.ok || !loaderRes.ok) throw new Error('Gagal memuat runtime PHP (php-wasm).');

  // Patch loader php_8_0.js: ganti konstanta URL wasm dengan full URL.
  let loaderCode = await loaderRes.text();
  loaderCode = loaderCode.replace(
    "const dependencyFilename = '/php-wasm/light/8_0_30/php_8_0.wasm';",
    `const dependencyFilename = ${JSON.stringify(`${base}/light/8_0_30/php_8_0.wasm`)};`
  );
  const loaderUrl = URL.createObjectURL(new Blob([loaderCode], { type: 'text/javascript' }));

  // Patch index.js: import loader php_8_0.js diarahkan ke Blob URL.
  let indexCode = await indexRes.text();
  indexCode = indexCode.replace(/\.\/light\/php_8_0\.js/g, () => loaderUrl);
  const indexUrl = URL.createObjectURL(new Blob([indexCode], { type: 'text/javascript' }));
  try {
    return (await import(/* @vite-ignore */ indexUrl)) as PhpWasmModule;
  } finally {
    window.setTimeout(() => URL.revokeObjectURL(indexUrl), 60000);
  }
}

let phpWasmPromise: Promise<PhpWasmModule> | null = null;

/** Menjalankan PHP via php-wasm (di-host dari origin sendiri). */
async function runPhp(code: string, onStatus: (text: string) => void): Promise<{ lines: OutputLine[]; preview: string | null }> {
  onStatus('Memuat PHP (php-wasm)… unduhan pertama butuh beberapa detik');
  if (!phpWasmPromise) {
    phpWasmPromise = loadPhpWasm().catch((err) => {
      phpWasmPromise = null;
      throw err;
    });
  }
  const { WebPHP } = await phpWasmPromise;
  const php = await WebPHP.load('8.0');
  const res = await php.run({ code });
  const lines: OutputLine[] = [];
  if (res.errors) {
    for (const l of res.errors.split('\n')) if (l.trim()) lines.push({ type: 'error', text: l });
  }
  if (res.exitCode !== 0 && lines.length === 0) {
    lines.push({ type: 'error', text: `Proses keluar dengan kode ${res.exitCode}` });
  }
  const body = typeof res.text === 'string' ? res.text.trim() : '';
  return { lines, preview: body.length > 0 ? body : null };
}

/** Menjalankan SQL via SQLite (sql.js, WASM dari CDN). */
let sqlJsPromise: Promise<{
  Database: new () => {
    exec(sql: string): { columns: string[]; values: unknown[][] }[];
    getRowsModified(): number;
  };
}> | null = null;

function loadSqlJs() {
  if (!sqlJsPromise) {
    sqlJsPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.dataset.sqljs = '1';
      script.src = 'https://cdn.jsdelivr.net/npm/sql.js@1.13.0/dist/sql-wasm.js';
      script.onload = async () => {
        try {
          const SQL = await (window as unknown as { initSqlJs(o: unknown): Promise<never> }).initSqlJs({
            locateFile: (f: string) => 'https://cdn.jsdelivr.net/npm/sql.js@1.13.0/dist/' + f,
          });
          resolve(SQL);
        } catch (err) {
          sqlJsPromise = null;
          reject(err);
        }
      };
      script.onerror = () => {
        sqlJsPromise = null;
        reject(new Error('Gagal memuat SQLite (sql.js) dari CDN. Periksa koneksi internet.'));
      };
      document.head.appendChild(script);
    });
  }
  return sqlJsPromise;
}

function renderValue(v: unknown): string {
  if (v === null || v === undefined) return 'NULL';
  if (typeof v === 'number') return Number.isInteger(v) ? String(v) : String(Math.round(v * 1000) / 1000);
  return String(v);
}

/** Merender hasil query SQL menjadi tabel ASCII. */
function formatSqlResults(results: { columns: string[]; values: unknown[][] }[], rowsModified: number): OutputLine[] {
  const lines: OutputLine[] = [];
  if (results.length === 0) {
    lines.push({ type: 'log', text: rowsModified > 0 ? `Query selesai. ${rowsModified} baris terpengaruh.` : 'Query selesai (tanpa hasil).' });
    return lines;
  }
  for (const result of results) {
    const cols = result.columns;
    const rows = result.values;
    const widths = cols.map((c, i) =>
      Math.max(c.length, ...rows.map((r) => renderValue(r[i]).length))
    );
    const sep = cols.map((_, i) => '-'.repeat(widths[i])).join('-+-');
    const header = cols.map((c, i) => c.padEnd(widths[i])).join(' | ');
    lines.push({ type: 'log', text: header });
    lines.push({ type: 'log', text: sep });
    for (const row of rows) {
      lines.push({
        type: 'log',
        text: cols.map((_, i) => renderValue(row[i]).padEnd(widths[i])).join(' | '),
      });
    }
    lines.push({ type: 'log', text: `${rows.length} baris hasil` });
  }
  return lines;
}

async function runSql(code: string, onStatus: (text: string) => void): Promise<OutputLine[]> {
  onStatus('Memuat SQLite (sql.js)…');
  const SQL = await loadSqlJs();
  const db = new SQL.Database();
  const lines: OutputLine[] = [];
  try {
    const results = db.exec(code);
    lines.push(...formatSqlResults(results, db.getRowsModified()));
  } catch (err) {
    lines.push({ type: 'error', text: String((err as Error)?.message ?? err) });
  }
  return lines;
}

/** Membungkus kode CSS ke dalam halaman contoh agar efeknya terlihat. */
function cssPreviewHtml(css: string): string {
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<style>
${css}
</style>
</head>
<body>
  <h1>Judul Halaman</h1>
  <p>Contoh paragraf dengan <a href="#">tautan</a>, <strong>teks tebal</strong>, dan <em>miring</em>.</p>
  <button>Tombol Utama</button>
  <button class="secondary">Tombol Kedua</button>
  <input placeholder="Input teks" />
  <div class="card">
    <h2>Kartu Contoh</h2>
    <p>Ubah CSS di editor lalu tekan Run untuk melihat perubahannya.</p>
    <ul>
      <li>Item satu</li>
      <li>Item dua</li>
      <li>Item tiga</li>
    </ul>
  </div>
</body>
</html>`;
}

/**
 * Halaman Code Editor. tulis kode di editor, jalankan di browser
 * (100% frontend), lihat output di panel terminal / preview web.
 */
export default function EditorPage() {
  const [lang, setLang] = useState<LangId>('javascript');
  const [code, setCode] = useState(LANGUAGES[0].template);
  const [output, setOutput] = useState<OutputLine[]>([]);
  const [running, setRunning] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [htmlPreview, setHtmlPreview] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);
  const outputRef = useRef<HTMLDivElement>(null);
  const highlightRef = useRef<HTMLPreElement>(null);

  const current = LANGUAGES.find((l) => l.id === lang) ?? LANGUAGES[0];

  const run = useCallback(async () => {
    setRunning(true);
    setHtmlPreview(null);
    setElapsed(null);
    setStatus(null);
    setOutput([]);
    const started = performance.now();
    try {
      let lines: OutputLine[] = [];
      let preview: string | null = null;

      if (lang === 'html') {
        preview = code;
      } else if (lang === 'css') {
        preview = cssPreviewHtml(code);
      } else if (lang === 'javascript') {
        lines = await runJavaScript(code);
      } else if (lang === 'typescript') {
        setStatus('Mengetik TypeScript…');
        const ts = await import('typescript');
        const js = ts.transpileModule(code, {
          compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.None },
        }).outputText;
        lines = await runJavaScript(js);
      } else if (lang === 'php') {
        const result = await runPhp(code, setStatus);
        lines = result.lines;
        preview = result.preview;
      } else if (lang === 'python') {
        lines = await runPython(code, setStatus);
      } else if (lang === 'sql') {
        lines = await runSql(code, setStatus);
      }

      if (!preview && lines.length === 0) {
        lines = [{ type: 'log', text: '(tidak ada output. program selesai tanpa mencetak apa pun)' }];
      }
      setOutput(lines);
      setHtmlPreview(preview);
      setElapsed(performance.now() - started);
    } catch (err) {
      setOutput([{ type: 'error', text: String((err as Error)?.message ?? err) }]);
    } finally {
      setRunning(false);
      setStatus(null);
    }
  }, [lang, code]);

  // Ctrl+Enter / Cmd+Enter untuk Run.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        void run();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [run]);

  // Auto-scroll output ke bawah.
  useEffect(() => {
    if (outputRef.current) outputRef.current.scrollTop = outputRef.current.scrollHeight;
  }, [output]);

  const changeLang = (next: LangId) => {
    setLang(next);
    setCode(LANGUAGES.find((l) => l.id === next)?.template ?? '');
    setOutput([]);
    setHtmlPreview(null);
    setStatus(null);
  };

  // Syntax highlighting: render token berwarna ke <pre> di belakang textarea.
  useEffect(() => {
    const pre = highlightRef.current;
    if (!pre) return;
    const hljsLang = HLJS_LANG[lang];
    if (!hljsLang) {
      pre.textContent = code + '\n';
      return;
    }
    try {
      pre.innerHTML = hljs.highlight(code, { language: hljsLang, ignoreIllegals: true }).value + '\n';
    } catch {
      pre.textContent = code + '\n';
    }
  }, [code, lang]);

  const clearAll = () => {
    setCode('');
    setOutput([]);
    setHtmlPreview(null);
    setStatus(null);
    setCopied(false);
  };

  const copyCode = async () => {
    try {
      await copyToClipboard(code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard tidak tersedia */
    }
  };

  const lineCount = code.split('\n').length;
  const gutterRef = useRef<HTMLDivElement>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);

  return (
    <div className="flex h-[calc(100vh-3.5rem)] flex-col">
      {/* Header halaman */}
      <div className="flex flex-wrap items-center gap-3 border-b border-slate-800 px-4 py-2.5">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent-600 shadow-sm">
          <Code2 className="h-4 w-4 text-white" />
        </span>
        <h1 className="text-base font-bold text-slate-50">Code Editor</h1>
        <span className="hidden text-xs text-slate-500 sm:block">
          Tulis &amp; jalankan kode langsung di browser, tanpa backend.
        </span>
      </div>

      <div className="flex min-h-0 flex-1 flex-col md:flex-row">
        {/* ============ PANEL EDITOR ============ */}
        <div className="flex min-h-0 flex-1 flex-col border-b border-slate-800 md:w-1/2 md:border-b-0 md:border-r">
          {/* Toolbar editor */}
          <div className="flex items-center gap-2 border-b border-slate-800 px-3 py-2">
            <select
              value={lang}
              onChange={(e) => changeLang(e.target.value as LangId)}
              className="h-8 rounded-lg border border-slate-700 bg-slate-900 px-2.5 text-sm text-slate-200 focus:border-accent-500 focus:outline-none"
              aria-label="Pilih bahasa pemrograman"
            >
              {LANGUAGES.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.label}
                </option>
              ))}
            </select>
            <button
              onClick={copyCode}
              className={cn(
                'flex h-8 items-center gap-1.5 rounded-lg border px-2.5 text-xs transition-colors',
                copied
                  ? 'border-emerald-500/60 bg-emerald-500/15 text-emerald-300'
                  : 'border-slate-700 text-slate-400 hover:border-slate-500 hover:text-slate-200'
              )}
              title="Salin kode"
              aria-label="Salin kode"
            >
              {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? 'Tersalin' : 'Copy'}
            </button>

            <div className="ml-auto flex items-center gap-2">
              <button
                onClick={clearAll}
                className="flex h-8 items-center gap-1.5 rounded-lg border border-slate-700 px-2.5 text-xs text-slate-400 transition-colors hover:border-red-500/60 hover:text-red-400"
                title="Hapus semua kode dan output"
                aria-label="Hapus semua kode dan output"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => void run()}
                disabled={running}
                className="flex h-8 items-center gap-1.5 rounded-lg bg-accent-500 px-3.5 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-accent-600 disabled:pointer-events-none disabled:opacity-50"
                title="Jalankan (Ctrl+Enter)"
              >
                {running ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
                {running ? 'Menjalankan…' : 'Run'}
              </button>
            </div>
          </div>

          {/* Area kode: gutter nomor baris + overlay highlight + textarea */}
          <div className="flex min-h-0 flex-1 bg-slate-950 font-mono text-[13px] leading-6">
            <div
              ref={gutterRef}
              className="w-11 shrink-0 select-none overflow-hidden border-r border-slate-800 bg-slate-950 py-3 text-right text-slate-600"
              aria-hidden
            >
              {Array.from({ length: Math.max(lineCount, 1) }, (_, i) => (
                <div key={i} className="px-2">
                  {i + 1}
                </div>
              ))}
            </div>
            <div className="relative min-h-0 min-w-0 flex-1">
              <pre
                ref={highlightRef}
                className="editor-highlight pointer-events-none absolute inset-0 m-0 overflow-hidden whitespace-pre-wrap break-words px-3 py-3"
                aria-hidden
              />
              <textarea
                ref={taRef}
                value={code}
                onChange={(e) => setCode(e.target.value)}
                onScroll={() => {
                  if (highlightRef.current && taRef.current) {
                    highlightRef.current.scrollTop = taRef.current.scrollTop;
                    gutterRef.current!.scrollTop = taRef.current.scrollTop;
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Tab') {
                    e.preventDefault();
                    const ta = e.currentTarget;
                    const start = ta.selectionStart;
                    const end = ta.selectionEnd;
                    setCode(code.slice(0, start) + '  ' + code.slice(end));
                    requestAnimationFrame(() => {
                      ta.selectionStart = ta.selectionEnd = start + 2;
                    });
                  }
                }}
                spellCheck={false}
                wrap="soft"
                className="absolute inset-0 h-full w-full resize-none overflow-auto bg-transparent px-3 py-3 text-transparent caret-accent-400 outline-none placeholder:text-slate-600"
                placeholder="Tulis kode di sini…"
                aria-label="Editor kode"
              />
            </div>
          </div>
        </div>

        {/* ============ PANEL OUTPUT ============ */}
        <div className="flex min-h-0 flex-1 flex-col md:w-1/2">
          <div className="flex items-center gap-2 border-b border-slate-800 px-3 py-2">
            <Terminal className="h-3.5 w-3.5 text-emerald-400" />
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              {htmlPreview ? 'Preview' : 'Output'}
            </span>
            {status && (
              <span className="flex items-center gap-1.5 text-xs text-slate-400">
                <Loader2 className="h-3 w-3 animate-spin" />
                {status}
              </span>
            )}
            {elapsed !== null && !running && (
              <span className="ml-auto text-[11px] tabular-nums text-slate-600">
                {output.length} baris · {elapsed.toFixed(1)} ms
              </span>
            )}
          </div>

          <div
            ref={outputRef}
            className={cn(
              'min-h-0 flex-1 overflow-auto bg-slate-950 p-3 font-mono text-[13px] leading-6',
              htmlPreview ? 'p-0' : ''
            )}
          >
            {htmlPreview !== null ? (
              <iframe
                title="Preview halaman web"
                sandbox="allow-scripts"
                srcDoc={htmlPreview}
                className="h-full w-full border-0 bg-white"
              />
            ) : output.length === 0 && !running ? (
              <p className="p-1 text-slate-600">
                {lang === 'html' || lang === 'css' || lang === 'php'
                  ? 'Klik Run untuk merender halaman web di panel ini.'
                  : 'Output akan muncul di sini. Tekan Run atau Ctrl+Enter untuk menjalankan kode.'}
              </p>
            ) : (
              output.map((line, i) => (
                <div
                  key={i}
                  className={cn(
                    'whitespace-pre-wrap break-words px-1 py-0.5',
                    line.type === 'error' && 'text-red-400',
                    line.type === 'warn' && 'text-amber-400',
                    line.type === 'log' && 'text-slate-200'
                  )}
                >
                  {line.text}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
