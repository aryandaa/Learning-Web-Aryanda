/**
 * Resolver halaman tool OSINT — lazy-load chunk per tool (import.meta.glob),
 * render di dalam shell konsisten. Route: /osint/:toolId
 */

import { Suspense, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { getOsintCategory, getOsintTool, allOsintTools } from '../registry';
import { useOsintHistory } from '../hooks/useOsintHistory';
import { PrivacyIndicator } from '../components/ui';
import { Spinner } from '../../../components/ui/spinner';
import { cn } from '../../../lib/utils';
import type { OsintToolMeta } from '../types';

const toolModules = import.meta.glob('../tools/*/index.tsx');

function ToolBody({ meta }: { meta: OsintToolMeta }) {
  const [Comp, setComp] = useState<React.ComponentType | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setComp(null);
    setLoadError(null);
    const loader = toolModules[`../tools/${meta.id}/index.tsx`];
    if (!loader) {
      setLoadError('Modul tool tidak ditemukan.');
      return;
    }
    loader()
      .then((mod) => {
        if (cancelled) return;
        const m = mod as { tools?: Record<string, React.ComponentType>; default?: React.ComponentType };
        const C = m.tools?.[meta.id] ?? m.default;
        if (!C) {
          setLoadError('Implementasi tool tidak ditemukan.');
          return;
        }
        setComp(() => C);
      })
      .catch(() => {
        if (!cancelled) setLoadError('Gagal memuat tool.');
      });
    return () => {
      cancelled = true;
    };
  }, [meta.id]);

  if (loadError) {
    return <p className="rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300">{loadError}</p>;
  }
  if (!Comp) {
    return (
      <div className="flex justify-center py-20">
        <Spinner />
      </div>
    );
  }
  return <Comp />;
}

export default function OSINTToolPage() {
  const { toolId } = useParams<{ toolId: string }>();
  const meta = toolId ? getOsintTool(toolId) : undefined;
  const { recordUsage } = useOsintHistory();

  const categoryTools = useMemo(() => (meta ? allOsintTools().filter((t) => t.category === meta.category) : []), [meta]);

  useEffect(() => {
    if (meta) recordUsage(meta.id);
    window.scrollTo({ top: 0 });
  }, [meta, recordUsage]);

  if (!meta) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center">
        <p className="text-slate-400">Tool tidak ditemukan.</p>
        <Link to="/cysec-tools/category/osint" className="mt-3 inline-block text-sm text-indigo-400 hover:underline">
          ← Kembali ke OSINT
        </Link>
      </div>
    );
  }

  const category = getOsintCategory(meta.category);

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-6 sm:px-8">
      <div className="flex gap-8">
        {/* Sidebar kategori — desktop */}
        <aside className="sticky top-20 hidden w-60 shrink-0 self-start xl:block" aria-label="Daftar tool OSINT">
          <p className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
            {category.icon} {category.name}
          </p>
          <nav className="space-y-0.5">
            {categoryTools.map((t) => (
              <Link
                key={t.id}
                to={t.path}
                className={cn(
                  'flex items-center gap-2 rounded-md px-2 py-1.5 text-[13px] transition-colors',
                  t.id === meta.id ? 'bg-indigo-500/10 font-medium text-indigo-300' : 'text-slate-500 hover:bg-slate-800/60 hover:text-slate-200'
                )}
              >
                <span aria-hidden>{t.icon}</span>
                <span className="truncate">{t.title}</span>
              </Link>
            ))}
          </nav>
        </aside>

        {/* Workspace utama */}
        <div className="min-w-0 flex-1">
          <div className="mb-4 flex items-center gap-1.5 text-xs text-slate-500" aria-label="Breadcrumb">
            <Link to="/cysec-tools" className="transition-colors hover:text-indigo-300">CySec Tools</Link>
            <span>/</span>
            <Link to="/cysec-tools/category/osint" className="inline-flex items-center gap-1 transition-colors hover:text-indigo-300">
              <ArrowLeft className="h-3 w-3" /> OSINT
            </Link>
            <span>/</span>
            <span className="text-slate-300">{meta.title}</span>
          </div>

          <header className="mb-4">
            <div className="flex flex-wrap items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-slate-800 bg-slate-900 text-2xl" aria-hidden>
                {meta.icon}
              </span>
              <div className="min-w-0">
                <h1 className="text-xl font-bold tracking-tight text-slate-50 sm:text-2xl">{meta.title}</h1>
                <p className="mt-0.5 text-sm text-slate-500">{meta.description}</p>
              </div>
            </div>
            <div className="mt-3">
              <PrivacyIndicator privacy={meta.privacy} note={meta.privacyNote} />
            </div>
          </header>

          <Suspense
            fallback={
              <div className="flex justify-center py-20">
                <Spinner />
              </div>
            }
          >
            <ToolBody meta={meta} />
          </Suspense>

          {/* Navigasi kategori lain — mobile/tablet */}
          <nav className="scrollbar-thin mt-10 flex gap-2 overflow-x-auto border-t border-slate-800 pt-4 xl:hidden" aria-label="Tool lain">
            {categoryTools.map((t) => (
              <Link
                key={t.id}
                to={t.path}
                className={cn(
                  'shrink-0 rounded-full border px-3 py-1.5 text-xs transition-colors',
                  t.id === meta.id
                    ? 'border-indigo-500 bg-indigo-500/15 text-indigo-300'
                    : 'border-slate-700 text-slate-400 hover:border-slate-500 hover:text-slate-200'
                )}
              >
                {t.icon} {t.title}
              </Link>
            ))}
          </nav>
        </div>
      </div>
    </div>
  );
}
