/**
 * Landing OSINT Tools — katalog data-driven + search + category filter
 * (navigasi ke halaman tool) + recent (localStorage). Route: /osint
 */

import { useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Search } from 'lucide-react';
import { CATEGORIES, allOsintTools, getOsintTool } from '../registry';
import { useOsintHistory } from '../hooks/useOsintHistory';
import { cn } from '../../../lib/utils';
import type { OsintToolMeta } from '../types';

function ToolCard({ tool }: { tool: OsintToolMeta }) {
  return (
    <Link
      to={tool.path}
      className="card card-hover group block p-4"
    >
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-800 bg-slate-900 text-lg" aria-hidden>
          {tool.icon}
        </span>
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-slate-100 transition-colors group-hover:text-indigo-300">{tool.title}</h3>
          <p className="mt-1 line-clamp-2 text-xs text-slate-500">{tool.description}</p>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        {tool.tags.slice(0, 3).map((tag) => (
          <span key={tag} className="rounded bg-slate-800/80 px-1.5 py-0.5 text-[10px] text-slate-500">{tag}</span>
        ))}
        <span
          className={cn(
            'ml-auto rounded px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide',
            tool.privacy === 'local' && 'bg-emerald-500/10 text-emerald-400',
            tool.privacy === 'external' && 'bg-amber-500/10 text-amber-400',
            tool.privacy === 'hybrid' && 'bg-cyan-500/10 text-cyan-400'
          )}
          title={tool.privacyNote}
        >
          {tool.privacy === 'local' ? 'local' : tool.privacy === 'external' ? 'external' : 'hybrid'}
        </span>
      </div>
    </Link>
  );
}

export default function OSINTPage() {
  const [query, setQuery] = useState('');
  const location = useLocation();
  const { recent, recordUsage } = useOsintHistory();
  const isCategoryPage = location.pathname.startsWith('/osint/');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return allOsintTools().filter(
      (t) =>
        t.title.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q) ||
        t.tags.some((tag) => tag.toLowerCase().includes(q)) ||
        CATEGORIES.find((c) => c.id === t.category)?.name.toLowerCase().includes(q)
    );
  }, [query]);

  const recentTools = recent.map(getOsintTool).filter((t): t is OsintToolMeta => !!t);

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-8">
      <header className="mb-6">
        <p className="eyebrow">Open Source Intelligence</p>
        <h1 className="mt-1.5 text-3xl font-bold tracking-tight text-slate-50">🕵️ OSINT</h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-500">
          Workstation untuk pengumpulan, normalisasi, dan korelasi informasi publik — recon pasif, domain/DNS/IP/URL
          intelligence, IOC, dan investigasi. Defensif & legal: hanya untuk aset yang Anda miliki/diizinkan.
        </p>
      </header>

      {/* Search */}
      <div className="relative mb-4 max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search OSINT tools... (contoh: domain, DNS, username, IOC)"
          aria-label="Cari tools OSINT"
          className="h-11 w-full rounded-lg border border-slate-700 bg-slate-900 pl-9 pr-3 text-sm text-slate-200 placeholder:text-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
        />
      </div>

      {/* Category chips — navigasi ke halaman tool pertama kategori */}
      <nav className="scrollbar-thin mb-6 flex gap-2 overflow-x-auto pb-1" aria-label="Kategori OSINT">
        <Link
          to="/osint"
          aria-current={!isCategoryPage ? 'page' : undefined}
          className={cn(
            'shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
            !isCategoryPage
              ? 'border-indigo-500 bg-indigo-500/15 text-indigo-300'
              : 'border-slate-700 bg-slate-900/50 text-slate-400 hover:border-slate-500 hover:text-slate-200'
          )}
        >
          Semua
        </Link>
        {CATEGORIES.map((c) => {
          const first = allOsintTools().find((t) => t.category === c.id);
          return (
            <Link
              key={c.id}
              to={first?.path ?? '/osint'}
              className={cn(
                'shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
                location.pathname === first?.path
                  ? 'border-indigo-500 bg-indigo-500/15 text-indigo-300'
                  : 'border-slate-700 bg-slate-900/50 text-slate-400 hover:border-slate-500 hover:text-slate-200'
              )}
            >
              {c.icon} {c.shortName}
            </Link>
          );
        })}
      </nav>

      {/* Recently used */}
      {recentTools.length > 0 && !query.trim() && (
        <section className="mb-8">
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">Recently Used</h2>
          <div className="flex flex-wrap gap-2">
            {recentTools.map((t) => (
              <Link
                key={t.id}
                to={t.path}
                className="rounded-lg border border-slate-700 bg-slate-900/60 px-3 py-1.5 text-xs text-slate-300 transition-colors hover:border-indigo-500/50 hover:text-indigo-300"
              >
                {t.icon} {t.title}
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Hasil pencarian ATAU grid semua tools */}
      {query.trim() ? (
        <section aria-live="polite">
          <h2 className="mb-3 text-sm font-semibold text-slate-300">
            Hasil pencarian “{query.trim()}” ({filtered.length})
          </h2>
          {filtered.length === 0 ? (
            <p className="py-10 text-center text-sm text-slate-500">Tidak ada tool yang cocok.</p>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {filtered.map((t) => (
                <ToolCard key={t.id} tool={t} />
              ))}
            </div>
          )}
        </section>
      ) : (
        <div className="space-y-10">
          {CATEGORIES.map((cat) => {
            const tools = allOsintTools().filter((t) => t.category === cat.id);
            return (
              <section key={cat.id} aria-labelledby={`osint-cat-${cat.id}`}>
                <div className="mb-3 flex items-center gap-2.5">
                  <span className="text-xl" aria-hidden>{cat.icon}</span>
                  <div>
                    <h2 id={`osint-cat-${cat.id}`} className="text-base font-semibold text-slate-100">{cat.name}</h2>
                    <p className="text-xs text-slate-500">{cat.description}</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {tools.map((t) => (
                    <ToolCard key={t.id} tool={t} />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}

      <p className="mt-10 border-t border-slate-800 pt-4 text-center text-xs text-slate-600">
        OSINT module berorientasi passive intelligence. Jangan gunakan untuk doxxing, credential attack, atau aktivitas ilegal.
      </p>
    </div>
  );
}
