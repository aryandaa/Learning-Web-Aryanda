/**
 * Halaman kategori CySec Tools. daftar tool satu bidang (data-driven).
 * Route: /cysec-tools/category/:categoryId (termasuk OSINT)
 */

import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Search } from 'lucide-react';
import { categoryCards, catalogEntries, type CatalogEntry } from '../catalog';
import { getCategory } from '../registry';
import { cn } from '../../../lib/utils';

function ToolCard({ entry }: { entry: CatalogEntry }) {
  return (
    <Link to={entry.path} className="card card-hover group block p-4">
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-800 bg-slate-900 text-lg" aria-hidden>
          {entry.icon}
        </span>
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-slate-100 transition-colors group-hover:text-accent-300">{entry.title}</h3>
          <p className="mt-1 line-clamp-2 text-xs text-slate-500">{entry.description}</p>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        {entry.tags.slice(0, 3).map((tag) => (
          <span key={tag} className="rounded bg-slate-800/80 px-1.5 py-0.5 text-[10px] text-slate-500">{tag}</span>
        ))}
        {entry.privacy && (
          <span
            className={cn(
              'ml-auto rounded px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide',
              entry.privacy === 'local' && 'bg-emerald-500/10 text-emerald-400',
              entry.privacy === 'external' && 'bg-amber-500/10 text-amber-400',
              entry.privacy === 'hybrid' && 'bg-cyan-500/10 text-cyan-400'
            )}
          >
            {entry.privacy}
          </span>
        )}
      </div>
    </Link>
  );
}

export default function CategoryPage() {
  const { categoryId } = useParams<{ categoryId: string }>();
  const [query, setQuery] = useState('');

  const category = useMemo(() => {
    if (!categoryId) return null;
    try {
      return getCategory(categoryId);
    } catch {
      return null;
    }
  }, [categoryId]);

  const entries = useMemo(() => (categoryId ? catalogEntries(categoryId) : []), [categoryId]);
  const cards = useMemo(() => categoryCards(), []);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return entries;
    return entries.filter(
      (t) =>
        t.title.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q) ||
        t.tags.some((tag) => tag.toLowerCase().includes(q))
    );
  }, [entries, query]);

  if (!category) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center">
        <p className="text-slate-400">Kategori tidak ditemukan.</p>
        <Link to="/cysec-tools" className="mt-3 inline-block text-sm text-accent-400 hover:underline">
          ← Kembali ke CySec Tools
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-8">
      {/* Breadcrumb */}
      <nav className="mb-4 flex flex-wrap items-center gap-1.5 text-xs text-slate-500" aria-label="Breadcrumb">
        <Link to="/cysec-tools" className="inline-flex items-center gap-1 transition-colors hover:text-accent-300">
          <ArrowLeft className="h-3 w-3" /> CySec Tools
        </Link>
        <span>/</span>
        <span className="text-slate-300">{category.name}</span>
      </nav>

      <header className="mb-5 flex items-center gap-3">
        <span className="flex h-12 w-12 items-center justify-center rounded-xl border border-slate-800 bg-slate-900 text-2xl" aria-hidden>
          {category.icon}
        </span>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-50">{category.name}</h1>
          <p className="mt-1 text-sm text-slate-500">{category.description}</p>
        </div>
      </header>

      {/* Search dalam kategori */}
      <div className="relative mb-5 max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={`Cari tool di ${category.name}…`}
          aria-label={`Cari tool di ${category.name}`}
          className="h-10 w-full rounded-lg border border-slate-800 bg-slate-900 pl-9 pr-3 text-sm text-slate-200 placeholder:text-slate-500 focus:border-accent-500 focus:outline-none focus:ring-2 focus:ring-accent-500/30"
        />
      </div>

      {/* Navigasi kategori lain */}
      <nav className="scrollbar-thin mb-6 flex gap-2 overflow-x-auto pb-1" aria-label="Kategori lain">
        {cards.map((c) => (
          <Link
            key={c.id}
            to={`/cysec-tools/category/${c.id}`}
            className={cn(
              'shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
              c.id === category.id
                ? 'border-accent-500 bg-accent-500/15 text-accent-300'
                : 'border-slate-700 bg-slate-900/50 text-slate-400 hover:border-slate-500 hover:text-slate-200'
            )}
          >
            {c.icon} {c.title}
          </Link>
        ))}
      </nav>

      <p className="mb-3 text-xs text-slate-600">
        {entries.length} tools{query.trim() ? ` · hasil pencarian “${query.trim()}”: ${visible.length}` : ''} · semuanya berjalan client-side.
      </p>

      {visible.length === 0 ? (
        <p className="py-10 text-center text-sm text-slate-500">
          Tidak ada tool yang cocok di kategori ini.{' '}
          <Link to={`/cysec-tools?q=${encodeURIComponent(query.trim())}`} className="text-accent-400 hover:underline">
            Cari di semua kategori →
          </Link>
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3" aria-live="polite">
          {visible.map((t) => (
            <ToolCard key={`${t.category}:${t.id}`} entry={t} />
          ))}
        </div>
      )}
    </div>
  );
}
