/**
 * Halaman tool — resolve tool dari registry, lazy-load implementasi per
 * kategori (import.meta.glob → code-split per chunk), render di dalam shell
 * konsisten. Route: /cysec-tools/:toolId
 */

import { Suspense, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Star, ArrowLeft } from 'lucide-react';
import { getCategory, getTool, toolsInCategory } from '../registry';
import { useToolHistory } from '../hooks/useToolHistory';
import { ToolHeader, PrivacyBadge, Disclaimer, ErrorAlert } from '../components/ui';
import { Spinner } from '../../../components/ui/spinner';
import { cn } from '../../../lib/utils';
import type { ToolMeta } from '../types';

// Lazy-load chunk per kategori — hanya dimuat saat tool dibuka.
const toolModules = import.meta.glob('../tools/*/index.tsx');

function ToolBody({ meta }: { meta: ToolMeta }) {
  const [Comp, setComp] = useState<React.ComponentType | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setComp(null);
    setLoadError(null);
    const loader = toolModules[`../tools/${meta.category}/index.tsx`];
    if (!loader) {
      setLoadError(`Modul tool "${meta.category}" tidak ditemukan.`);
      return;
    }
    loader()
      .then((mod) => {
        if (cancelled) return;
        const m = mod as { tools?: Record<string, React.ComponentType>; default?: React.ComponentType };
        const C = m.tools?.[meta.id] ?? m.default;
        if (!C) {
          setLoadError(`Implementasi tool "${meta.id}" tidak ditemukan di modul kategori.`);
          return;
        }
        setComp(() => C);
      })
      .catch((err) => {
        if (!cancelled) setLoadError(err instanceof Error ? err.message : 'Gagal memuat tool.');
      });
    return () => {
      cancelled = true;
    };
  }, [meta.id, meta.category]);

  if (loadError) return <ErrorAlert message={loadError} />;
  if (!Comp) {
    return (
      <div className="flex justify-center py-20">
        <Spinner />
      </div>
    );
  }
  return <Comp />;
}

export default function ToolPage() {
  const { toolId } = useParams<{ toolId: string }>();
  const meta = toolId ? getTool(toolId) : undefined;
  const { recordUsage, isFavorite, toggleFavorite } = useToolHistory();

  const categoryTools = useMemo(() => (meta ? toolsInCategory(meta.category) : []), [meta]);

  useEffect(() => {
    if (meta) recordUsage(meta.id);
    window.scrollTo({ top: 0 });
  }, [meta, recordUsage]);

  if (!meta) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center">
        <p className="text-slate-400">Tool tidak ditemukan.</p>
        <Link to="/cysec-tools" className="mt-3 inline-block text-sm text-indigo-400 hover:underline">
          ← Kembali ke CySec Tools
        </Link>
      </div>
    );
  }

  const category = getCategory(meta.category);
  const fav = isFavorite(meta.id);

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-6 sm:px-8">
      <div className="flex gap-8">
        {/* Sidebar kategori — desktop */}
        <aside className="sticky top-20 hidden w-60 shrink-0 self-start xl:block" aria-label="Daftar tool kategori">
          <p className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
            {category.icon} {category.name}
          </p>
          <nav className="space-y-0.5">
            {categoryTools.map((t) => (
              <Link
                key={t.id}
                to={`/cysec-tools/${t.id}`}
                className={cn(
                  'flex items-center gap-2 rounded-md px-2 py-1.5 text-[13px] transition-colors',
                  t.id === meta.id
                    ? 'bg-indigo-500/10 font-medium text-indigo-300'
                    : 'text-slate-500 hover:bg-slate-800/60 hover:text-slate-200'
                )}
              >
                <span aria-hidden>{t.icon}</span>
                <span className="truncate">{t.name}</span>
              </Link>
            ))}
          </nav>
        </aside>

        {/* Workspace utama */}
        <div className="min-w-0 flex-1">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <Link
              to={`/cysec-tools/category/${meta.category}`}
              className="inline-flex items-center gap-1 text-xs text-slate-500 transition-colors hover:text-indigo-300"
            >
              <ArrowLeft className="h-3 w-3" /> {category.name}
            </Link>
            <button
              onClick={() => toggleFavorite(meta.id)}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors',
                fav
                  ? 'border-amber-500/40 bg-amber-500/10 text-amber-300'
                  : 'border-slate-700 bg-slate-900/60 text-slate-400 hover:border-slate-500 hover:text-slate-200'
              )}
              aria-pressed={fav}
            >
              <Star className={cn('h-3.5 w-3.5', fav && 'fill-amber-400 text-amber-400')} />
              {fav ? 'Favorit' : 'Tambah favorit'}
            </button>
          </div>

          <ToolHeader meta={meta} categoryName={category.name} backTo="/cysec-tools" />

          {meta.status === 'unavailable' ? (
            <div className="space-y-4">
              <ErrorAlert message="Tool ini tidak tersedia sepenuhnya client-side." />
              {meta.statusNote && <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">{meta.statusNote}</div>}
            </div>
          ) : (
            <>
              <div className="mb-4">
                <PrivacyBadge />
              </div>
              {meta.disclaimer && (
                <div className="mb-4">
                  <Disclaimer text={meta.disclaimer} />
                </div>
              )}
              <Suspense
                fallback={
                  <div className="flex justify-center py-20">
                    <Spinner />
                  </div>
                }
              >
                <ToolBody meta={meta} />
              </Suspense>
            </>
          )}

          {/* Navigasi kategori lain — mobile/tablet */}
          <nav className="scrollbar-thin mt-10 flex gap-2 overflow-x-auto border-t border-slate-800 pt-4 xl:hidden" aria-label="Tool lain di kategori">
            {categoryTools.map((t) => (
              <Link
                key={t.id}
                to={`/cysec-tools/${t.id}`}
                className={cn(
                  'shrink-0 rounded-full border px-3 py-1.5 text-xs transition-colors',
                  t.id === meta.id
                    ? 'border-indigo-500 bg-indigo-500/15 text-indigo-300'
                    : 'border-slate-700 text-slate-400 hover:border-slate-500 hover:text-slate-200'
                )}
              >
                {t.icon} {t.name}
              </Link>
            ))}
          </nav>
        </div>
      </div>
    </div>
  );
}
