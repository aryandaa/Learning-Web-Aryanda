/**
 * Halaman kategori — daftar tool dalam satu kategori.
 * Route: /cysec-tools/category/:categoryId
 */

import { useParams, Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { getCategory, toolsInCategory } from '../registry';
import { cn } from '../../../lib/utils';
import { CATEGORIES } from '../registry';

export default function CategoryPage() {
  const { categoryId } = useParams<{ categoryId: string }>();
  const category = categoryId ? getCategory(categoryId) : undefined;

  if (!category) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center">
        <p className="text-slate-400">Kategori tidak ditemukan.</p>
        <Link to="/cysec-tools" className="mt-3 inline-block text-sm text-indigo-400 hover:underline">
          ← Kembali ke CySec Tools
        </Link>
      </div>
    );
  }

  const tools = toolsInCategory(category.id);

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-8">
      <header className="mb-6">
        <Link
          to="/cysec-tools"
          className="mb-3 inline-flex items-center gap-1 text-xs text-slate-500 transition-colors hover:text-indigo-300"
        >
          <ArrowLeft className="h-3 w-3" /> CySec Tools
        </Link>
        <div className="flex items-center gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-xl border border-slate-800 bg-slate-900 text-2xl" aria-hidden>
            {category.icon}
          </span>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-50">{category.name}</h1>
            <p className="mt-1 text-sm text-slate-500">{category.description}</p>
          </div>
        </div>
        <p className="mt-3 text-xs text-slate-600">
          {tools.length} tools · semuanya berjalan client-side di browser.
        </p>
      </header>

      {/* Navigasi kategori lain (horizontal scroll di mobile) */}
      <nav className="scrollbar-thin mb-6 flex gap-2 overflow-x-auto pb-1" aria-label="Kategori lain">
        {CATEGORIES.map((c) => (
          <Link
            key={c.id}
            to={`/cysec-tools/category/${c.id}`}
            className={cn(
              'shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
              c.id === category.id
                ? 'border-indigo-500 bg-indigo-500/15 text-indigo-300'
                : 'border-slate-700 bg-slate-900/50 text-slate-400 hover:border-slate-500 hover:text-slate-200'
            )}
          >
            {c.icon} {c.shortName}
          </Link>
        ))}
      </nav>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {tools.map((tool) => {
          const unavailable = tool.status === 'unavailable';
          return (
            <div
              key={tool.id}
              className={cn(
                'relative rounded-xl border p-4 transition-all',
                unavailable
                  ? 'border-slate-800/60 bg-slate-900/30 opacity-60'
                  : 'card card-hover border-slate-800 bg-slate-900/50'
              )}
            >
              <div className="flex items-start gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-800 bg-slate-900 text-lg" aria-hidden>
                  {tool.icon}
                </span>
                <div className="min-w-0">
                  {unavailable ? (
                    <span className="text-sm font-semibold text-slate-400">{tool.name}</span>
                  ) : (
                    <Link
                      to={`/cysec-tools/${tool.id}`}
                      className="text-sm font-semibold text-slate-100 transition-colors hover:text-indigo-300"
                    >
                      {tool.name}
                    </Link>
                  )}
                  <p className="mt-1 line-clamp-2 text-xs text-slate-500">{tool.description}</p>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-1.5">
                {tool.tags.slice(0, 3).map((tag) => (
                  <span key={tag} className="rounded bg-slate-800/80 px-1.5 py-0.5 text-[10px] text-slate-500">
                    {tag}
                  </span>
                ))}
                {tool.status === 'unavailable' && (
                  <span className="rounded bg-amber-500/10 px-1.5 py-0.5 text-[10px] text-amber-400" title={tool.statusNote}>
                    client-side limitation
                  </span>
                )}
                {tool.status === 'partial' && (
                  <span className="rounded bg-cyan-500/10 px-1.5 py-0.5 text-[10px] text-cyan-400" title={tool.statusNote}>
                    sebagian
                  </span>
                )}
              </div>
              {unavailable && tool.statusNote && (
                <p className="mt-3 rounded-lg border border-amber-500/20 bg-amber-500/5 p-2.5 text-[11px] leading-5 text-amber-200/80">
                  {tool.statusNote}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
