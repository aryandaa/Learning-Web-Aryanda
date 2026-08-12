import { useCallback, useEffect, useRef, useState } from 'react';
import { Code2, Loader2, Play, RotateCcw, Terminal, Trash2 } from 'lucide-react';
import { cn } from '../lib/utils';

type LangId = 'javascript' | 'typescript' | 'html' | 'python';

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
 * Bahasa yang didukung eksekusi 100% di browser (tanpa backend).
 * Python memakai Pyodide (WASM) yang dimuat lazy dari CDN saat pertama Run.
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
    h1 { color: #4f46e5; }
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
];

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
 * Halaman Code Editor — tulis kode di editor, jalankan di browser
 * (100% frontend), lihat output di panel terminal / preview HTML.
 */
export default function EditorPage() {
  const [lang, setLang] = useState<LangId>('javascript');
  const [code, setCode] = useState(LANGUAGES[0].template);
  const [output, setOutput] = useState<OutputLine[]>([]);
  const [running, setRunning] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [htmlPreview, setHtmlPreview] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState<number | null>(null);
  const outputRef = useRef<HTMLDivElement>(null);

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
      if (lang === 'html') {
        setHtmlPreview(code);
        lines = [];
      } else if (lang === 'javascript') {
        lines = await runJavaScript(code);
      } else if (lang === 'typescript') {
        setStatus('Mengetik TypeScript…');
        const ts = await import('typescript');
        const js = ts.transpileModule(code, {
          compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.None },
        }).outputText;
        lines = await runJavaScript(js);
      } else if (lang === 'python') {
        lines = await runPython(code, setStatus);
      }
      if (lang !== 'html' && lines.length === 0) {
        lines = [{ type: 'log', text: '(tidak ada output — program selesai tanpa mencetak apa pun)' }];
      }
      setOutput(lines);
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

  const lineCount = code.split('\n').length;
  const gutterRef = useRef<HTMLDivElement>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);

  return (
    <div className="flex h-[calc(100vh-3.5rem)] flex-col">
      {/* Header halaman */}
      <div className="flex flex-wrap items-center gap-3 border-b border-slate-800 px-4 py-2.5">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 shadow-lg shadow-indigo-500/30">
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
              className="h-8 rounded-lg border border-slate-700 bg-slate-900 px-2.5 text-sm text-slate-200 focus:border-indigo-500 focus:outline-none"
              aria-label="Pilih bahasa pemrograman"
            >
              {LANGUAGES.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.label}
                </option>
              ))}
            </select>
            <button
              onClick={() => setCode(current.template)}
              className="flex h-8 items-center gap-1.5 rounded-lg border border-slate-700 px-2.5 text-xs text-slate-400 transition-colors hover:border-slate-500 hover:text-slate-200"
              title="Reset ke contoh awal"
              aria-label="Reset kode"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Reset
            </button>

            <div className="ml-auto flex items-center gap-2">
              <button
                onClick={() => {
                  setOutput([]);
                  setHtmlPreview(null);
                  setStatus(null);
                }}
                className="flex h-8 items-center gap-1.5 rounded-lg border border-slate-700 px-2.5 text-xs text-slate-400 transition-colors hover:border-slate-500 hover:text-slate-200"
                title="Bersihkan output"
                aria-label="Bersihkan output"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => void run()}
                disabled={running}
                className="flex h-8 items-center gap-1.5 rounded-lg bg-indigo-500 px-3.5 text-xs font-semibold text-white shadow-lg shadow-indigo-500/25 transition-colors hover:bg-indigo-400 disabled:pointer-events-none disabled:opacity-50"
                title="Jalankan (Ctrl+Enter)"
              >
                {running ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
                {running ? 'Menjalankan…' : 'Run'}
              </button>
            </div>
          </div>

          {/* Area kode: gutter nomor baris + textarea */}
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
            <textarea
              ref={taRef}
              value={code}
              onChange={(e) => setCode(e.target.value)}
              onScroll={() => {
                if (gutterRef.current && taRef.current) {
                  gutterRef.current.scrollTop = taRef.current.scrollTop;
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
              className="min-w-0 flex-1 resize-none bg-transparent px-3 py-3 text-slate-100 caret-indigo-400 outline-none placeholder:text-slate-600"
              placeholder="Tulis kode di sini…"
              aria-label="Editor kode"
            />
          </div>
        </div>

        {/* ============ PANEL OUTPUT ============ */}
        <div className="flex min-h-0 flex-1 flex-col md:w-1/2">
          <div className="flex items-center gap-2 border-b border-slate-800 px-3 py-2">
            <Terminal className="h-3.5 w-3.5 text-emerald-400" />
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Output
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
                title="Preview HTML"
                sandbox="allow-scripts"
                srcDoc={htmlPreview}
                className="h-full w-full border-0 bg-white"
              />
            ) : output.length === 0 && !running ? (
              <p className="p-1 text-slate-600">
                {lang === 'html'
                  ? 'Klik Run untuk merender halaman HTML di panel ini.'
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
