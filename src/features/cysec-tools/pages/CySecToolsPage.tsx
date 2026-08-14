/**
 * Dashboard CySec Tools — katalog tool data-driven + search/filter +
 * recent/favorites (localStorage). Route: /cysec-tools
 */

import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, Star } from 'lucide-react';
import { CATEGORIES, allTools, getTool } from '../registry';
import { useToolHistory } from '../hooks/useToolHistory';
import { cn } from '../../../lib/utils';
import type { ToolCategoryId, ToolMeta } from '../types';

function ToolGrid({ tools, empty }: { tools: ToolMeta[]; empty?: string }) {
  if (tools.length === 0) {
    return <p className="py-8 text-center text-sm text-slate-500">{empty ?? 'Tidak ada tool ditemukan.'}</p>;
  }
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {tools.map((tool) => {
        const unavailable = tool.status === 'unavailable';
        return (
          <div
            key={tool.id}
            className={cn(
              'group relative rounded-xl border p-4 transition-all',
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
                    className="text-sm font-semibold text-slate-100 transition-colors group-hover:text-indigo-300"
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
          </div>
        );
      })}
    </div>
  );
}

export default function CySecToolsPage() {
  const [query, setQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<ToolCategoryId | 'all'>('all');
  const { recent, favorites } = useToolHistory();

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let tools = activeCategory === 'all' ? allTools() : allTools().filter((t) =>
      t.category === activeCategory || (t.alsoIn ?? []).includes(activeCategory)
    );
    if (q) {
      tools = tools.filter(
        (t) =>
          t.name.toLowerCase().includes(q) ||
          t.description.toLowerCase().includes(q) ||
          t.tags.some((tag) => tag.toLowerCase().includes(q))
      );
    }
    return tools;
  }, [query, activeCategory]);

  const recentTools = recent.map(getTool).filter((t): t is ToolMeta => !!t);
  const favoriteTools = favorites.map(getTool).filter((t): t is ToolMeta => !!t);

  const visibleCategories = CATEGORIES.filter(
    (c) => query.trim() === '' || filtered.some((t) => t.category === c.id || (t.alsoIn ?? []).includes(c.id))
  );

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-8">
      <header className="mb-6">
        <p className="eyebrow">Learning Web · Security</p>
        <h1 className="mt-1.5 text-3xl font-bold tracking-tight text-slate-50">🛡️ CySec Tools</h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-500">
          Kumpulan tools cybersecurity yang berjalan <strong className="text-slate-300">100% di browser</strong> —
          untuk belajar, CTF, digital forensics, dan analisis defensif. Data Anda tidak pernah meninggalkan perangkat.
        </p>
      </header>

      {/* Search + filter kategori */}
      <div className="mb-6 space-y-3">
        <div className="relative max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search tools… (contoh: hash, pcap, jwt)"
            aria-label="Cari tools"
            className="h-11 w-full rounded-lg border border-slate-700 bg-slate-900 pl-9 pr-3 text-sm text-slate-200 placeholder:text-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
          />
        </div>
        <div className="scrollbar-thin flex gap-2 overflow-x-auto pb-1" role="tablist" aria-label="Filter kategori">
          <button
            role="tab"
            aria-selected={activeCategory === 'all'}
            onClick={() => setActiveCategory('all')}
            className={cn(
              'shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
              activeCategory === 'all'
                ? 'border-indigo-500 bg-indigo-500/15 text-indigo-300'
                : 'border-slate-700 bg-slate-900/50 text-slate-400 hover:border-slate-500 hover:text-slate-200'
            )}
          >
            Semua
          </button>
          {CATEGORIES.map((c) => (
            <button
              key={c.id}
              role="tab"
              aria-selected={activeCategory === c.id}
              onClick={() => setActiveCategory(c.id)}
              className={cn(
                'shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
                activeCategory === c.id
                  ? 'border-indigo-500 bg-indigo-500/15 text-indigo-300'
                  : 'border-slate-700 bg-slate-900/50 text-slate-400 hover:border-slate-500 hover:text-slate-200'
              )}
            >
              {c.icon} {c.shortName}
            </button>
          ))}
        </div>
      </div>

      {/* Recent + Favorites */}
      {(recentTools.length > 0 || favoriteTools.length > 0) && !query.trim() && (
        <div className="mb-8 grid gap-4 md:grid-cols-2">
          {recentTools.length > 0 && (
            <section>
              <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">Recently Used</h2>
              <div className="flex flex-wrap gap-2">
                {recentTools.map((t) => (
                  <Link
                    key={t.id}
                    to={`/cysec-tools/${t.id}`}
                    className="rounded-lg border border-slate-700 bg-slate-900/60 px-3 py-1.5 text-xs text-slate-300 transition-colors hover:border-indigo-500/50 hover:text-indigo-300"
                  >
                    {t.icon} {t.name}
                  </Link>
                ))}
              </div>
            </section>
          )}
          {favoriteTools.length > 0 && (
            <section>
              <h2 className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-500">
                <Star className="h-3 w-3 text-amber-400" /> Favorites
              </h2>
              <div className="flex flex-wrap gap-2">
                {favoriteTools.map((t) => (
                  <Link
                    key={t.id}
                    to={`/cysec-tools/${t.id}`}
                    className="rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-1.5 text-xs text-amber-200 transition-colors hover:border-amber-400/60"
                  >
                    {t.icon} {t.name}
                  </Link>
                ))}
              </div>
            </section>
          )}
        </div>
      )}

      {/* Katalog kategori */}
      {query.trim() ? (
        <section className="mb-8">
          <h2 className="mb-3 text-sm font-semibold text-slate-300">
            Hasil pencarian “{query.trim()}” ({filtered.length})
          </h2>
          <ToolGrid tools={filtered} empty="Tidak ada tool yang cocok." />
        </section>
      ) : (
        <div className="space-y-10">
          {visibleCategories.map((cat) => {
            const tools = allTools().filter(
              (t) => t.category === cat.id || (t.alsoIn ?? []).includes(cat.id)
            );
            return (
              <section key={cat.id} aria-labelledby={`cat-${cat.id}`}>
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <span className="text-xl" aria-hidden>{cat.icon}</span>
                    <div>
                      <h2 id={`cat-${cat.id}`} className="text-base font-semibold text-slate-100">
                        {cat.name}
                      </h2>
                      <p className="text-xs text-slate-500">{cat.description}</p>
                    </div>
                  </div>
                  <Link
                    to={`/cysec-tools/category/${cat.id}`}
                    className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs text-slate-400 transition-colors hover:border-indigo-500/50 hover:text-indigo-300"
                  >
                    Lihat semua →
                  </Link>
                </div>
                <ToolGrid tools={tools.slice(0, 6)} />
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
