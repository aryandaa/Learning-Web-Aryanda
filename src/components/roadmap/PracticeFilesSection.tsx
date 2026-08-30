import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown, ChevronRight, Code2, FileCode2 } from 'lucide-react';
import type { PracticeFile } from '../../lib/practiceFiles';
import { formatBytes, languageInfo } from '../../lib/codeLanguages';

/**
 * Section "Code / Praktik" di halaman Roadmap (detail subskill/roadmap).
 *
 * - Collapsible: tertutup default agar daftar file tidak membuat roadmap panjang.
 * - Sumber data = tree.json yang sama dengan Docs (tanpa duplikasi source code).
 * - Klik file → route /docs/<code-file-id> → CodeFileViewer (renderer yang sudah ada).
 * - Tidak ada heuristik: hanya folder bernama "Praktek" (case-insensitive) yang dipakai.
 */

/** Path tampilan relatif terhadap scope (folder skill/roadmap), agar tidak kepanjangan. */
function displayPath(file: PracticeFile, basePath: string): string {
  if (!basePath) return file.relativePath;
  const prefix = `${basePath}/`;
  return file.relativePath.startsWith(prefix)
    ? file.relativePath.slice(prefix.length)
    : file.relativePath;
}

export function PracticeFilesSection({
  files,
  basePath,
}: {
  files: PracticeFile[];
  /** Scope folder (path skill/roadmap) untuk tampilan path yang ringkas. */
  basePath?: string;
}) {
  const [open, setOpen] = useState(false);
  if (files.length === 0) return null;

  const uniqueLangs = new Set(files.map((f) => f.language)).size;

  return (
    <section
      className="rounded-xl border border-slate-800 bg-slate-950/70"
      aria-label="Kode dan praktik"
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-slate-900/60"
      >
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-emerald-400">
          <Code2 className="h-4 w-4" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-bold text-slate-100">Code / Praktik</span>
          <span className="block text-[11px] text-slate-500">
            {files.length} file{files.length > 1 ? 's' : ''}
            {uniqueLangs > 1 ? ` · ${uniqueLangs} bahasa` : ''} · source code dari vault
          </span>
        </span>
        {open ? (
          <ChevronDown className="h-4 w-4 shrink-0 text-slate-500" />
        ) : (
          <ChevronRight className="h-4 w-4 shrink-0 text-slate-500" />
        )}
      </button>

      {open && (
        <ul className="divide-y divide-slate-800/60 border-t border-slate-800">
          {files.map((file) => {
            const lang = languageInfo(file.language);
            return (
              <li key={file.id}>
                <Link
                  to={`/docs/${file.id}`}
                  title={file.relativePath}
                  className="group flex min-w-0 items-center gap-3 px-4 py-2 transition-colors hover:bg-slate-900/70"
                >
                  <span
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border"
                    style={{ borderColor: `${lang.color}44`, backgroundColor: `${lang.color}1a` }}
                  >
                    <FileCode2 className="h-3.5 w-3.5" style={{ color: lang.color }} />
                  </span>
                  <span className="min-w-0 flex-1 truncate font-mono text-[13px] text-slate-300 group-hover:text-accent-300">
                    {displayPath(file, basePath ?? '')}
                  </span>
                  <span
                    className="hidden shrink-0 items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-medium sm:inline-flex"
                    style={{
                      borderColor: `${lang.color}55`,
                      backgroundColor: `${lang.color}18`,
                      color: lang.color,
                    }}
                  >
                    <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: lang.color }} />
                    {lang.label}
                  </span>
                  <span className="shrink-0 text-[11px] tabular-nums text-slate-600">
                    {formatBytes(file.size)}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
