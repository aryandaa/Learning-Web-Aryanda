import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, ChevronRight, Clipboard, FileCode2, Home } from 'lucide-react';
import type { CodeFileEntry } from '../services/docs';
import { fetchCodeFolder, normalizeId } from '../services/docs';
import { useSiteData } from '../app/SiteProvider';
import type { CodeFileData } from '../domain/types';
import { formatBytes, highlightLanguage, languageInfo } from '../lib/codeLanguages';
import { copyToClipboard } from '../lib/clipboard';
import { Spinner } from '../components/ui/spinner';
import { cn } from '../lib/utils';

/** Bungkus kata terakhir path agar path panjang tetap rapi. */
function SplitPath({ path }: { path: string }) {
  const parts = path.split('/');
  const last = parts[parts.length - 1];
  const dir = parts.slice(0, -1).join('/');
  return (
    <span className="break-all">
      {dir ? <span className="text-slate-600">{dir}/</span> : null}
      <span className="font-medium text-slate-300">{last}</span>
    </span>
  );
}

/**
 * Viewer source code. Route /docs/<folder-id>/<file-id>.
 * Memuat SATU JSON folder (fetchCodeFolder), lalu menampilkan file yang
 * dipilih dengan syntax highlighting + tombol Copy (isi ASLI, tanpa metadata).
 */
export function CodeFileViewer({ file }: { file: CodeFileEntry }) {
  const { codeFolderById } = useSiteData();
  const [folderData, setFolderData] = useState<CodeFileData[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [highlighted, setHighlighted] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const lang = languageInfo(file.language);
  const hljsLang = highlightLanguage(file.language);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setHighlighted(null);

    fetchCodeFolder(file.folder)
      .then((data) => {
        if (cancelled) return;
        const found = data.files.find((f) => f.name === file.name);
        if (!found) {
          setError(`File "${file.name}" tidak ditemukan di ${file.folder}.`);
          return;
        }
        setFolderData(data.files);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Gagal memuat folder code.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [file.folder, file.name]);

  const current = folderData?.find((f) => f.name === file.name) ?? null;

  // Syntax highlighting lazy: highlight.js hanya dimuat saat viewer dibuka,
  // agar bundle utama tetap ringan.
  useEffect(() => {
    if (!current) return;
    let cancelled = false;
    (async () => {
      try {
        const mod = await import('highlight.js/lib/common');
        const hljs = mod.default ?? mod;
        if (!hljs.getLanguage('dockerfile')) {
          const dockerfileMod = await import('highlight.js/lib/languages/dockerfile');
          const lang = dockerfileMod.default as { name?: string };
          if (lang?.name) hljs.registerLanguage(lang.name, dockerfileMod.default as never);
        }
        if (cancelled) return;
        const html = hljs.highlight(current.content, {
          language: hljsLang,
          ignoreIllegals: true,
        }).value;
        setHighlighted(html);
      } catch {
        // Highlight gagal (mis. bahasa tidak dikenal) → fallback plaintext.
        if (!cancelled) setHighlighted(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [current, hljsLang]);

  const copyCode = async () => {
    if (!current) return;
    try {
      await copyToClipboard(current.content);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard tidak tersedia */
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Spinner />
      </div>
    );
  }

  if (error || !current) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center">
        <p className="text-sm text-slate-500">{error ?? 'File tidak ditemukan.'}</p>
        <Link to="/docs" className="mt-3 inline-block text-sm text-accent-400 hover:underline">
          ← Kembali ke Docs
        </Link>
      </div>
    );
  }

  const lineCount = current.content.length === 0 ? 0 : current.content.split('\n').length;
  const pathParts = file.folder.split('/');

  return (
    <div className="mx-auto max-w-4xl">
      {/* Breadcrumb */}
      <nav className="flex min-w-0 flex-wrap items-center gap-x-1 gap-y-0.5 text-xs text-slate-500" aria-label="Breadcrumb">
        <Link to="/" className="flex shrink-0 items-center gap-1 hover:text-slate-300">
          <Home className="h-3 w-3" />
          Home
        </Link>
        <span className="flex items-center gap-1">
          <ChevronRight className="h-3 w-3 shrink-0" />
          <Link to="/docs" className="hover:text-slate-300">
            Docs
          </Link>
        </span>
        {pathParts.map((part, index) => {
          const pathSoFar = pathParts.slice(0, index + 1).join('/');
          const isLast = index === pathParts.length - 1;
          const linkable = isLast || codeFolderById.has(normalizeId(pathSoFar));
          return (
            <span key={pathSoFar} className="flex min-w-0 items-center gap-1">
              <ChevronRight className="h-3 w-3 shrink-0" />
              {linkable ? (
                <Link
                  to={`/docs/${normalizeId(pathSoFar)}`}
                  className={cn('truncate hover:text-slate-300', isLast && 'font-medium')}
                  title={pathSoFar}
                >
                  {part}
                </Link>
              ) : (
                <span className="truncate">{part}</span>
              )}
            </span>
          );
        })}
        <span className="flex items-center gap-1">
          <ChevronRight className="h-3 w-3 shrink-0" />
          <span className="truncate font-mono text-slate-300">{file.name}</span>
        </span>
      </nav>

      {/* Header */}
      <header className="mt-4 border-b border-slate-800 pb-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <span
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border"
              style={{ borderColor: `${lang.color}44`, backgroundColor: `${lang.color}1a` }}
            >
              <FileCode2 className="h-5 w-5" style={{ color: lang.color }} />
            </span>
            <div className="min-w-0">
              <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest" style={{ color: lang.color }}>
                <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: lang.color }} />
                {lang.label}
              </p>
              <h1 className="mt-0.5 truncate font-mono text-2xl font-bold tracking-tight text-slate-50 sm:text-3xl">
                {file.name}
              </h1>
            </div>
          </div>

          <button
            onClick={() => void copyCode()}
            className={cn(
              'inline-flex shrink-0 items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition-colors',
              copied
                ? 'border-emerald-500/60 bg-emerald-500/15 text-emerald-300'
                : 'border-slate-700 bg-slate-900/70 text-slate-300 hover:border-accent-300 hover:bg-accent-500/10'
            )}
            aria-label="Salin isi file"
            title="Salin isi file (tanpa metadata)"
          >
            {copied ? <Check className="h-4 w-4" /> : <Clipboard className="h-4 w-4" />}
            {copied ? 'Copied' : 'Copy'}
          </button>
        </div>

        {/* Meta chips */}
        <div className="mt-4 flex flex-wrap items-center gap-x-2 gap-y-1.5 text-xs text-slate-500">
          <span className="rounded-full border border-slate-800 bg-slate-900/60 px-2.5 py-1 font-mono">{file.extension || '—'}</span>
          <span className="rounded-full border border-slate-800 bg-slate-900/60 px-2.5 py-1 tabular-nums">{formatBytes(file.size)}</span>
          <span className="rounded-full border border-slate-800 bg-slate-900/60 px-2.5 py-1 tabular-nums">{lineCount} baris</span>
          <span className="flex items-center gap-1.5 rounded-full border border-slate-800 bg-slate-900/60 px-2.5 py-1">
            <FileCode2 className="h-3 w-3 text-accent-400" />
            <SplitPath path={current.path} />
          </span>
        </div>
      </header>

      {/* Code */}
      <div className="code-file-viewer mt-6">
        <div className="editor-highlight">
          {highlighted !== null ? (
            <pre>
              <code className="hljs" dangerouslySetInnerHTML={{ __html: highlighted }} />
            </pre>
          ) : (
            <pre>
              <code className="hljs">{current.content || '(file kosong)'}</code>
            </pre>
          )}
        </div>
        <p className="mt-3 text-center text-[11px] text-slate-600">
          Isi file 100% asli dari vault — tidak diformat ulang.
        </p>
      </div>
    </div>
  );
}
