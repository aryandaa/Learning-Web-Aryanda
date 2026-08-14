/**
 * Recently Updated: materi terbaru yang baru diperbarui.
 *
 * Data berasal dari artifact dokumentasi aplikasi (index opsional
 * `docs/updated-index.json`). Jika timestamp tidak tersedia, tidak ada tanggal
 * yang diarang; item cukup diberi label "Recently updated".
 * Frontend-only, tanpa backend.
 */

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, FileText, Sparkles } from 'lucide-react';

export interface UpdatedIndexEntry {
  id: string;
  title: string;
  folder: string;
  updated: string | null;
}

async function fetchUpdatedIndex(): Promise<UpdatedIndexEntry[]> {
  try {
    const url = `${import.meta.env.BASE_URL}docs/updated-index.json`;
    const res = await fetch(url, { headers: { Accept: 'application/json' } });
    if (!res.ok) return [];
    const json = (await res.json()) as unknown;
    if (!Array.isArray(json)) return [];
    return json.map((entry) => {
      const e = entry as { id?: unknown; title?: unknown; folder?: unknown; updated?: unknown };
      return {
        id: String(e.id ?? ''),
        title: String(e.title ?? ''),
        folder: typeof e.folder === 'string' ? e.folder : '',
        updated: typeof e.updated === 'string' && e.updated ? e.updated : null,
      };
    });
  } catch {
    return [];
  }
}

/** Label waktu update; null berarti tidak tersedia (tidak mengarang tanggal). */
function updateLabel(updated: string | null): string {
  if (!updated) return 'Recently updated';
  const ms = Date.now() - new Date(updated).getTime();
  if (ms < 0 || Number.isNaN(ms)) return 'Recently updated';
  const minutes = Math.floor(ms / 60000);
  if (minutes < 1) return 'Updated just now';
  if (minutes < 60) return `Updated ${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Updated ${hours} hour${hours > 1 ? 's' : ''} ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'Updated yesterday';
  if (days < 7) return `Updated ${days} days ago`;
  return new Date(updated).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function RecentlyUpdated() {
  const [items, setItems] = useState<UpdatedIndexEntry[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchUpdatedIndex().then((list) => {
      if (cancelled) return;
      const sorted = [...list]
        .sort((a, b) => {
          if (a.updated && b.updated) return a.updated < b.updated ? 1 : -1;
          return a.updated ? -1 : b.updated ? 1 : 0;
        })
        .slice(0, 8);
      setItems(sorted);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section aria-label="Recently Updated" className="mt-16">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="flex items-center gap-2.5 text-lg font-semibold text-slate-100">
            <span className="h-5 w-1 rounded-full bg-gradient-to-b from-emerald-400 to-teal-500" />
            Recently Updated
          </h2>
          <p className="mt-1 text-sm text-slate-500">Materi terbaru yang baru diperbarui.</p>
        </div>
        <Link
          to="/docs"
          className="inline-flex items-center gap-1 text-sm text-indigo-400 transition-colors hover:text-indigo-300"
        >
          Semua materi <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      <div className="mt-5 space-y-2">
        {items === null && (
          <div className="rounded-xl border border-slate-800 bg-slate-900/40 px-4 py-8 text-center text-sm text-slate-500">
            Memuat materi terbaru…
          </div>
        )}

        {items !== null && items.length === 0 && (
          <div className="rounded-xl border border-slate-800 bg-slate-900/40 px-4 py-8 text-center">
            <Sparkles className="mx-auto h-6 w-6 text-slate-600" />
            <p className="mt-2 text-sm text-slate-500">Belum ada materi yang baru diperbarui.</p>
            <p className="mt-1 text-xs text-slate-600">Kembali lagi nanti untuk melihat pembaruan terbaru.</p>
          </div>
        )}

        {items !== null &&
          items.length > 0 &&
          items.map((item) => (
            <Link
              key={item.id}
              to={`/docs/${item.id}`}
              className="card card-hover group flex items-center gap-4 p-4"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-800/80 text-emerald-400 transition-colors group-hover:bg-emerald-500/15 group-hover:text-emerald-300">
                <FileText className="h-5 w-5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-slate-100 transition-colors group-hover:text-indigo-300">
                  {item.title || item.id}
                </p>
                <p className="mt-0.5 truncate text-xs text-slate-500">{item.folder || 'Materi'}</p>
              </div>
              <span className="shrink-0 rounded-full border border-slate-700 bg-slate-900/60 px-2.5 py-1 text-[11px] text-slate-400">
                {updateLabel(item.updated)}
              </span>
              <ArrowRight className="hidden h-4 w-4 shrink-0 text-slate-600 transition-transform group-hover:translate-x-1 group-hover:text-emerald-400 sm:block" />
            </Link>
          ))}
      </div>
    </section>
  );
}
