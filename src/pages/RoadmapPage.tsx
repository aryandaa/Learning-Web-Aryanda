import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  ChevronRight,
  ExternalLink,
  FolderTree,
  GitFork,
  RefreshCw,
  Star,
} from 'lucide-react';
import { useSiteData } from '../app/SiteProvider';
import { BranchTree } from '../components/roadmap/BranchTree';
import { Spinner } from '../components/ui/spinner';
import { folderColor } from '../lib/colors';
import { fetchGraph, fetchRoadmaps } from '../services/docs';
import type { GraphData, RoadmapInfo, RoadmapsData } from '../domain/types';
import { cn } from '../lib/utils';

/**
 * Kunci urut roadmap: nomor prefix didahulukan (01_ < 02_ < ...),
 * sisanya alfabetis. Cocok untuk penamaan terurut di Obsidian.
 */
function roadmapSortKey(title: string): [number, string] {
  const m = title.match(/^(\d+)[_\s-]+(.*)$/);
  if (m) return [parseInt(m[1], 10), m[2].trim().toLowerCase()];
  return [Infinity, title.toLowerCase()];
}

interface SidebarItem {
  id: string;
  label: string;
  skill: string;
  /** Folder vault tempat subskill/roadmap berada, mis. "Pemrograman/PHP". */
  path: string;
  roadmapIds: string[];
}

interface SidebarGroup {
  skill: string;
  color: string;
  items: SidebarItem[];
}

/**
 * Susun item dari roadmaps.json (data vault, tanpa hardcode):
 * tiap subskill (#Subskill) jadi item; roadmap yang tidak berada di
 * subskill mana pun (mis. Fundamental, Rancangan Software) jadi item
 * sendiri. Semua dikelompokkan per skill (folder level-1).
 */
function buildSidebarGroups(roadmaps: RoadmapsData): SidebarGroup[] {
  const subskillOrder = new Map(roadmaps.subskills.map((s, i) => [s.id, i]));
  const bySkill = new Map<string, SidebarItem[]>();

  const push = (skill: string, item: SidebarItem) => {
    const arr = bySkill.get(skill) ?? [];
    arr.push(item);
    bySkill.set(skill, arr);
  };

  for (const sub of roadmaps.subskills) {
    const skill = sub.folder.split('/')[0] || 'Lainnya';
    push(skill, {
      id: `sub:${sub.id}`,
      label: sub.title,
      skill,
      path: sub.folder,
      roadmapIds: sub.roadmapIds,
    });
  }
  for (const rm of roadmaps.roadmaps) {
    if (rm.subskillId) continue; // sudah masuk lewat subskill
    const skill = rm.folder.split('/')[0] || 'Lainnya';
    push(skill, {
      id: `rm:${rm.id}`,
      label: rm.title,
      skill,
      path: rm.folder,
      roadmapIds: [rm.id],
    });
  }

  return [...bySkill.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([skill, items]) => ({
      skill,
      color: folderColor(skill),
      items: items.sort((a, b) => {
        const orderA = a.id.startsWith('sub:') ? (subskillOrder.get(a.id.slice(4)) ?? 999) : Infinity;
        const orderB = b.id.startsWith('sub:') ? (subskillOrder.get(b.id.slice(4)) ?? 999) : Infinity;
        if (orderA !== orderB) return orderA - orderB;
        return a.label.localeCompare(b.label);
      }),
    }));
}

/**
 * Halaman Roadmap. dua mode:
 *
 * 1. GRID (landing): tanpa ?sub= → menampilkan SEMUA subskill (#Subskill)
 *    dari seluruh path (CyberSecurity, DevOps, Jaringan, Pemrograman),
 *    dibungkus kartu besar dalam grid 4 kolom (responsif), dikelompokkan
 *    per path/skill.
 * 2. DETAIL: dengan ?sub=... → sidebar kategori + detail roadmap BERCABANG
 *    (BranchTree) seperti sebelumnya, plus tombol kembali ke grid.
 */
export default function RoadmapPage() {
  const { metadata, loading: siteLoading } = useSiteData();
  const [roadmaps, setRoadmaps] = useState<RoadmapsData | null>(null);
  const [graph, setGraph] = useState<GraphData | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Seleksi datang dari query string (/roadmap?sub=...), jadi badge di halaman
  // lain (mis. /docs) bisa langsung mengarahkan ke subskill tertentu.
  const [searchParams] = useSearchParams();
  const urlId = searchParams.get('sub');
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;
    Promise.all([fetchRoadmaps(), fetchGraph()])
      .then(([roadmapsData, graphData]) => {
        if (cancelled) return;
        setRoadmaps(roadmapsData);
        setGraph(graphData);
      })
      .catch((err) => {
        if (!cancelled) setError((err as Error).message);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const groups = useMemo(() => (roadmaps ? buildSidebarGroups(roadmaps) : []), [roadmaps]);
  const allItems = useMemo(() => groups.flatMap((g) => g.items), [groups]);

  // Item aktif HANYA dari URL. tanpa ?sub= tampilkan grid semua subskill.
  const selected = useMemo(() => {
    if (!urlId || allItems.length === 0) return null;
    return allItems.find((item) => item.id === urlId) ?? null;
  }, [allItems, urlId]);
  const selectedGroup = groups.find((g) => g.items.some((item) => item.id === selected?.id)) ?? null;

  const roadmapById = useMemo(
    () => new Map((roadmaps?.roadmaps ?? []).map((rm) => [rm.id, rm])),
    [roadmaps]
  );

  const selectedRoadmaps = useMemo<RoadmapInfo[]>(() => {
    if (!roadmaps || !selected) return [];
    return selected.roadmapIds
      .map((id) => roadmaps.roadmaps.find((rm) => rm.id === id))
      .filter((rm): rm is RoadmapInfo => Boolean(rm))
      .sort((a, b) => {
        const [an, at] = roadmapSortKey(a.title);
        const [bn, bt] = roadmapSortKey(b.title);
        return an !== bn ? an - bn : at.localeCompare(bt);
      });
  }, [roadmaps, selected]);

  if (error) {
    return (
      <div className="mx-auto max-w-2xl py-16 text-center text-sm text-slate-400">
        {error}. Jalankan parser untuk membuat roadmaps.json & graph.json.
      </div>
    );
  }

  if (siteLoading || !roadmaps || !graph) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Spinner />
      </div>
    );
  }

  const syncedAt = metadata?.generatedAt
    ? new Date(metadata.generatedAt).toLocaleString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : null;

  /* ============================ GRID VIEW (semua subskill) ============================ */
  if (!selected) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <header className="mb-8">
          <p className="eyebrow">Roadmap</p>
          <h1 className="mt-1.5 text-3xl font-bold tracking-tight text-slate-50">
            Pilih Jalur Belajar
          </h1>
        </header>

        {groups.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-700 bg-slate-900/30 p-10 text-center text-sm text-slate-500">
            Belum ada subskill. Tambahkan file bertag{' '}
            <code className="rounded bg-slate-800 px-1.5 py-0.5 text-xs text-emerald-300">#Subskill</code>{' '}
            dan{' '}
            <code className="rounded bg-slate-800 px-1.5 py-0.5 text-xs text-amber-300">#roadmap</code>{' '}
            di vault.
          </div>
        ) : (
          <div className="space-y-10">
            {groups.map((group) => (
              <section key={group.skill} aria-label={group.skill}>
                <div className="mb-4 flex items-center gap-3">
                  <span
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-white"
                    style={{ backgroundColor: group.color }}
                  >
                    <FolderTree className="h-4 w-4" />
                  </span>
                  <h2 className="text-lg font-bold tracking-tight" style={{ color: group.color }}>
                    {group.skill}
                  </h2>
                  <span className="rounded-full border border-slate-800 bg-slate-900/60 px-2.5 py-0.5 text-xs tabular-nums text-slate-500">
                    {group.items.length} jalur
                  </span>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {group.items.map((item) => (
                    <SubskillCard key={item.id} item={item} roadmapById={roadmapById} />
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}

        {syncedAt && (
          <p className="mt-10 flex items-center gap-1.5 border-t border-slate-800/60 pt-5 text-[11px] text-slate-600">
            <RefreshCw className="h-3 w-3 shrink-0" />
            Terakhir diperbarui · {syncedAt}
          </p>
        )}
      </div>
    );
  }

  /* ============================ DETAIL VIEW (roadmap bercabang) ============================ */
  const totalSteps = selectedRoadmaps.reduce((sum, rm) => sum + rm.stepIds.length, 0);
  const color = selectedGroup?.color ?? '#94a3b8';
  const isSub = selected.id.startsWith('sub:');

  return (
    <div className="flex h-[calc(100vh-3.5rem)]">
      {/* Sidebar kategori */}
      <aside className="hidden w-72 shrink-0 overflow-y-auto border-r border-slate-800/80 p-4 md:block">
        <p className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
          <FolderTree className="h-4 w-4 text-emerald-400" />
          Kategori
        </p>

        {groups.map((group) => (
          <div key={group.skill} className="mb-4">
            <p
              className="mb-1.5 flex items-center gap-1.5 px-2 text-[11px] font-bold uppercase tracking-wider"
              style={{ color: group.color }}
            >
              <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: group.color }} />
              {group.skill}
            </p>
            <ul className="space-y-0.5">
              {group.items.map((item) => (
                <li key={item.id}>
                  <button
                    onClick={() => navigate(`/roadmap?sub=${encodeURIComponent(item.id)}`)}
                    className={cn(
                      'flex w-full items-center gap-2 rounded-md px-3 py-1.5 text-left text-sm transition-colors',
                      selected?.id === item.id
                        ? 'bg-emerald-500/15 font-medium text-emerald-300'
                        : 'text-slate-400 hover:bg-slate-800/70 hover:text-slate-200'
                    )}
                  >
                    {item.id.startsWith('sub:') ? (
                      <Star className="h-3.5 w-3.5 shrink-0 text-emerald-400/70" />
                    ) : (
                      <ChevronRight className="h-3.5 w-3.5 shrink-0 text-slate-600" />
                    )}
                    <span className="truncate">{item.label}</span>
                    <span className="ml-auto rounded bg-slate-800 px-1.5 py-0.5 text-[10px] tabular-nums text-slate-500">
                      {item.roadmapIds.length}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ))}

        <Link
          to="/roadmap"
          className="mb-4 flex items-center gap-1.5 rounded-md border border-slate-800 bg-slate-900/40 px-3 py-2 text-xs text-slate-400 transition-colors hover:border-slate-600 hover:text-slate-200"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Semua Subskill
        </Link>

        {syncedAt && (
          <p className="mt-4 flex items-center gap-1.5 border-t border-slate-800/60 px-2 pt-3 text-[11px] text-slate-600">
            <RefreshCw className="h-3 w-3 shrink-0" />
            Terakhir diperbarui
            <br />
            {syncedAt}
          </p>
        )}
      </aside>

      {/* Konten: detail roadmap bercabang */}
      <div className="min-w-0 flex-1 overflow-y-auto">
        <div className="mx-auto max-w-3xl p-5 sm:p-7">
          <button
            onClick={() => navigate('/roadmap')}
            className="flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-slate-500 transition-colors hover:bg-slate-800/60 hover:text-slate-200"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Semua Subskill
          </button>

          <header className="mb-6 mt-3">
            <p className="text-xs uppercase tracking-wider" style={{ color }}>
              {selected.skill} · {selected.path}
            </p>
            <h1 className="mt-1 flex items-center gap-2.5 text-2xl font-bold tracking-tight text-slate-50">
              {isSub && <Star className="h-5 w-5 shrink-0 text-emerald-400" />}
              {selected.label}
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              {selectedRoadmaps.length} roadmap · {totalSteps} langkah belajar · urut dari atas
              ke bawah, kotak kecil = materi lain yang dirujuk langkah
            </p>
          </header>

          {selectedRoadmaps.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-700 bg-slate-900/30 p-8 text-center text-sm text-slate-500">
              Belum ada roadmap untuk subskill ini. Tambahkan file bertag{' '}
              <code className="rounded bg-slate-800 px-1.5 py-0.5 text-xs text-emerald-300">#roadmap</code>{' '}
              di folder ini.
            </div>
          ) : (
            <div className="space-y-8">
              {selectedRoadmaps.map((rm, index) => (
                <section key={rm.id}>
                  <div className="mb-3 flex items-center gap-2">
                    <span
                      className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white"
                      style={{ backgroundColor: color }}
                    >
                      {index + 1}
                    </span>
                    <h2 className="min-w-0 flex-1 truncate text-base font-semibold text-slate-200">
                      {rm.title}
                    </h2>
                    <Link
                      to={`/docs/${rm.id}`}
                      className="shrink-0 rounded-md p-1.5 text-slate-500 transition-colors hover:bg-slate-800 hover:text-slate-100"
                      title={`Buka dokumen ${rm.title}`}
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Link>
                  </div>
                  <BranchTree roadmap={rm} graph={graph} />
                </section>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Selector kategori (mobile) */}
      <div className="fixed bottom-4 left-1/2 z-30 w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 md:hidden">
        <select
          value={selected?.id ?? ''}
          onChange={(e) => navigate(`/roadmap?sub=${encodeURIComponent(e.target.value)}`)}
          className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-slate-200 shadow-2xl focus:border-emerald-500 focus:outline-none"
        >
          <option value="">← Semua Subskill</option>
          {groups.map((group) => (
            <optgroup key={group.skill} label={group.skill}>
              {group.items.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label} ({item.roadmapIds.length})
                </option>
              ))}
            </optgroup>
          ))}
        </select>
      </div>
    </div>
  );
}

/** Kartu besar satu subskill/roadmap di grid landing. */
function SubskillCard({
  item,
  roadmapById,
}: {
  item: SidebarItem;
  roadmapById: Map<string, RoadmapInfo>;
}) {
  const color = folderColor(item.skill);
  const isSub = item.id.startsWith('sub:');
  const steps = item.roadmapIds.reduce((sum, id) => sum + (roadmapById.get(id)?.stepIds.length ?? 0), 0);
  const pathParts = item.path.split('/');
  const shortPath = pathParts.slice(1).join(' / ') || item.path;

  return (
    <Link
      to={`/roadmap?sub=${encodeURIComponent(item.id)}`}
      className="group flex flex-col rounded-2xl border-2 bg-slate-900/50 p-5 transition-all hover:-translate-y-1"
      style={{ borderColor: `${color}3a`, boxShadow: '0 0 0 0 transparent' }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.boxShadow = `0 8px 24px ${color}30`;
        (e.currentTarget as HTMLElement).style.borderColor = color;
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.boxShadow = '0 0 0 0 transparent';
        (e.currentTarget as HTMLElement).style.borderColor = `${color}3a`;
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <span
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl"
          style={{ backgroundColor: `${color}22`, color }}
        >
          {isSub ? <Star className="h-5 w-5" /> : <GitFork className="h-5 w-5" />}
        </span>
        <ArrowRight className="h-4 w-4 text-slate-600 opacity-0 transition-opacity group-hover:opacity-100" />
      </div>

      <h3 className="mt-4 text-lg font-bold leading-snug text-slate-100 transition-colors group-hover:text-white">
        {item.label}
      </h3>
      <p className="mt-1 truncate text-xs text-slate-500" title={item.path}>
        {shortPath}
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-1.5">
        <span className="rounded-full border border-slate-700 bg-slate-800/60 px-2.5 py-0.5 text-[11px] tabular-nums text-slate-400">
          {item.roadmapIds.length} roadmap
        </span>
        <span className="rounded-full border border-slate-700 bg-slate-800/60 px-2.5 py-0.5 text-[11px] tabular-nums text-slate-400">
          {steps} langkah
        </span>
      </div>
    </Link>
  );
}
