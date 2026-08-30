import { Link } from 'react-router-dom';
import { ChevronRight, Code2, FileCode2, FolderCode, Home, Terminal } from 'lucide-react';
import { useSiteData } from '../app/SiteProvider';
import type { CodeFolderEntry } from '../services/docs';
import { findFolderNode, normalizeId } from '../services/docs';
import { formatBytes, languageInfo } from '../lib/codeLanguages';
import type { TreeFileNode, TreeFolderNode } from '../domain/types';
import { cn } from '../lib/utils';

/** Apakah folder node memiliki file code di dalamnya (langsung atau di subfolder). */
function hasCodeFiles(node: TreeFolderNode): boolean {
  for (const child of node.children) {
    if (child.type === 'file' && child.isCode) return true;
    if (child.type === 'folder' && hasCodeFiles(child)) return true;
  }
  return false;
}

/** Total file code di dalam node folder (rekursif). */
function countCodeFiles(node: TreeFolderNode): number {
  let total = 0;
  for (const child of node.children) {
    if (child.type === 'file' && child.isCode) total += 1;
    else if (child.type === 'folder') total += countCodeFiles(child);
  }
  return total;
}

/**
 * Halaman folder CODE (code directory browser). Route /docs/<folder-id>.
 * Menampilkan daftar file source code + subfolder dari satu folder vault,
 * tanpa mencampur artikel markdown. Data daftar dari tree.json (ringan);
 * content file dimuat hanya saat file dibuka (fetchCodeFolder).
 */
export function CodeFolderPage({ folder }: { folder: CodeFolderEntry }) {
  const { tree, codeFolderById } = useSiteData();
  const node = tree ? findFolderNode(tree, folder.folder) : null;
  if (!node) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center text-sm text-slate-500">
        Folder code tidak ditemukan di tree.
      </div>
    );
  }

  const subfolders = node.children.filter(
    (child): child is TreeFolderNode => child.type === 'folder' && hasCodeFiles(child)
  );
  const files = node.children.filter(
    (child): child is TreeFileNode => child.type === 'file' && Boolean(child.isCode)
  );

  const totalSize = files.reduce((sum, f) => sum + (f.size ?? 0), 0);
  const totalFiles = countCodeFiles(node);
  const pathParts = folder.folder.split('/');

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
          const linkable = codeFolderById.has(normalizeId(pathSoFar));
          return (
            <span key={pathSoFar} className="flex min-w-0 items-center gap-1">
              <ChevronRight className="h-3 w-3 shrink-0" />
              {isLast || !linkable ? (
                <span className="truncate font-medium text-slate-300">{part}</span>
              ) : (
                <Link to={`/docs/${normalizeId(pathSoFar)}`} className="truncate hover:text-slate-300" title={pathSoFar}>
                  {part}
                </Link>
              )}
            </span>
          );
        })}
      </nav>

      {/* Header */}
      <header className="mt-4 border-b border-slate-800 pb-6">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-slate-800 bg-slate-900 text-accent-400">
            <FolderCode className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest text-accent-400">
              <Code2 className="h-3 w-3" />
              Code directory
            </p>
            <h1 className="mt-0.5 truncate text-2xl font-bold tracking-tight text-slate-50 sm:text-3xl">
              {node.name}
            </h1>
          </div>
        </div>
        <p className="mt-3 text-sm text-slate-500">
          {folder.folder} · {totalFiles} file code
          {files.length > 0 && ` · ${formatBytes(totalSize)}`}
        </p>
      </header>

      {/* Subfolder */}
      {subfolders.length > 0 && (
        <section className="mt-6">
          <h2 className="mb-2.5 text-xs font-semibold uppercase tracking-wider text-slate-500">Subfolder</h2>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {subfolders.map((sub) => (
              <Link
                key={sub.relativePath}
                to={`/docs/${normalizeId(sub.relativePath)}`}
                className="group flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-900/50 px-4 py-3 transition-colors hover:border-accent-500/40 hover:bg-slate-900"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-800 bg-slate-900 text-amber-400/70">
                  <FolderCode className="h-4 w-4" />
                </span>
                <span className="min-w-0 flex-1 truncate text-sm font-medium text-slate-200 group-hover:text-accent-300">
                  {sub.name}
                </span>
                <span className="shrink-0 text-[11px] tabular-nums text-slate-600">
                  {countCodeFiles(sub)} file
                </span>
                <ChevronRight className="h-3.5 w-3.5 shrink-0 text-slate-600 group-hover:text-accent-400" />
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* File list */}
      <section className="mt-6">
        <h2 className="mb-2.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-500">
          <Terminal className="h-3.5 w-3.5 text-accent-400" />
          File · {files.length}
        </h2>
        {files.length === 0 ? (
          <p className="rounded-xl border border-dashed border-slate-800 bg-slate-900/30 px-4 py-10 text-center text-sm text-slate-500">
            Folder ini berisi subfolder code — buka subfolder di atas untuk melihat file-nya.
          </p>
        ) : (
          <ul className="divide-y divide-slate-800/70 overflow-hidden rounded-xl border border-slate-800 bg-slate-900/40">
            {files.map((file) => {
              const lang = languageInfo(file.language ?? 'plaintext');
              return (
                <li key={file.id}>
                  <Link
                    to={`/docs/${file.id}`}
                    className="group flex items-center gap-3 px-4 py-3 transition-colors hover:bg-slate-900"
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-800 bg-slate-900">
                      <FileCode2 className="h-4 w-4" style={{ color: lang.color }} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-mono text-sm font-medium text-slate-200 group-hover:text-accent-300">
                        {file.title}
                      </span>
                      <span className="mt-0.5 block truncate text-[11px] text-slate-600">
                        {file.relativePath}
                      </span>
                    </span>
                    <span
                      className={cn(
                        'hidden shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-medium sm:inline-flex'
                      )}
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
                      {formatBytes(file.size ?? 0)}
                    </span>
                    <ChevronRight className="h-3.5 w-3.5 shrink-0 text-slate-600 group-hover:text-accent-400" />
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <p className="mt-6 border-t border-slate-800 pt-4 text-center text-xs text-slate-600">
        Isi file dimuat dari JSON folder (static, lazy) — source code ditampilkan apa adanya dari vault.
      </p>
    </div>
  );
}
