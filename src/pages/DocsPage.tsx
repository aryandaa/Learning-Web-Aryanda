import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useSiteData } from '../app/SiteProvider';
import { TreeExplorer } from '../components/explorer/TreeExplorer';
import { Spinner } from '../components/ui/spinner';
import { countFiles, fetchRoadmaps } from '../services/docs';
import { folderColor } from '../lib/colors';
import { ChevronLeft, ChevronRight, Map, Star } from 'lucide-react';
import type { RoadmapsData } from '../domain/types';

/**
 * Halaman index dokumen: seluruh struktur vault divisualisasikan
 * sebagai pohon eksplorasi (recursive, tanpa hardcode folder).
 */
export default function DocsPage() {
  const { tree, metadata, loading, error } = useSiteData();
  const [roadmaps, setRoadmaps] = useState<RoadmapsData | null>(null);
  const stripRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const updateStripArrows = () => {
    const el = stripRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 4);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  };

  const scrollStrip = (direction: 1 | -1) => {
    stripRef.current?.scrollBy({ left: direction * 320, behavior: 'smooth' });
  };

  useEffect(() => {
    if (!roadmaps) return;
    updateStripArrows();
    const el = stripRef.current;
    if (!el) return;
    el.addEventListener('scroll', updateStripArrows, { passive: true });
    window.addEventListener('resize', updateStripArrows);
    return () => {
      el.removeEventListener('scroll', updateStripArrows);
      window.removeEventListener('resize', updateStripArrows);
    };
  }, [roadmaps]);

  // Muat roadmaps untuk strip subskill; gagal diam saja (strip disembunyikan).
  useEffect(() => {
    let cancelled = false;
    fetchRoadmaps()
      .then((data) => {
        if (!cancelled) setRoadmaps(data);
      })
      .catch(() => {
        /* roadmaps.json belum tersedia */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Spinner />
      </div>
    );
  }

  if (error || !tree) {
    return (
      <div className="mx-auto max-w-2xl py-16 text-center text-sm text-slate-400">
        {error ?? 'tree.json belum tersedia. Jalankan parser terlebih dahulu.'}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl">
      <header className="mb-6">
        <p className="eyebrow">Dokumentasi</p>
        <h1 className="mt-1.5 text-3xl font-bold tracking-tight text-slate-50">Semua Dokumen</h1>
        <p className="mt-2 text-sm text-slate-500">
          {metadata?.totalNotes ?? 0} catatan dalam {metadata?.totalFolders ?? 0} folder ·
          klik folder untuk memperluas
        </p>
      </header>

      {roadmaps && roadmaps.subskills.length > 0 && (
        <section className="mb-7">
          <div className="mb-2.5 flex items-center justify-between gap-3">
            <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-500">
              <Star className="h-3.5 w-3.5 text-emerald-400" />
              Subskill · semua kategori
            </p>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => scrollStrip(-1)}
                disabled={!canScrollLeft}
                aria-label="Geser subskill ke kiri"
                className="flex h-7 w-7 items-center justify-center rounded-full border border-slate-700 bg-slate-900/70 text-slate-400 transition-colors hover:border-slate-500 hover:text-white disabled:pointer-events-none disabled:opacity-30"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                onClick={() => scrollStrip(1)}
                disabled={!canScrollRight}
                aria-label="Geser subskill ke kanan"
                className="flex h-7 w-7 items-center justify-center rounded-full border border-slate-700 bg-slate-900/70 text-slate-400 transition-colors hover:border-slate-500 hover:text-white disabled:pointer-events-none disabled:opacity-30"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
          <div ref={stripRef} className="scrollbar-thin -mx-1 flex gap-2 overflow-x-auto px-1 pb-2">
            {roadmaps.subskills.map((sub) => (
              <Link
                key={sub.id}
                to={`/roadmap?sub=${encodeURIComponent(`sub:${sub.id}`)}`}
                title={`${sub.folder.split('/')[0]} · ${sub.title}`}
                className="group flex shrink-0 items-center gap-2 rounded-full border border-slate-700 bg-slate-900/60 py-1.5 pl-3 pr-4 text-sm text-slate-300 transition-colors hover:border-indigo-500/50 hover:bg-indigo-500/10 hover:text-indigo-200"
              >
                <span
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={{ backgroundColor: folderColor(sub.folder.split('/')[0]) }}
                />
                <span className="whitespace-nowrap font-medium">{sub.title}</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4 shadow-lg shadow-black/10">
        <TreeExplorer nodes={tree} variant="page" />
      </div>

      <p className="mt-4 flex items-center justify-center gap-1.5 text-xs text-slate-600">
        <Map className="h-3.5 w-3.5 text-indigo-400" />
        = file roadmap · mulai dari sini untuk mengikuti urutan belajar folder
      </p>

      <p className="mt-6 text-center text-xs text-slate-600">
        Total: {countFiles(tree)} dokumen
      </p>
    </div>
  );
}
