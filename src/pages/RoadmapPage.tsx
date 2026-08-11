import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ChevronRight, ExternalLink, FolderTree, RefreshCw, Star } from 'lucide-react';
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
  roadmapIds: string[];
}

interface SidebarGroup {
  skill: string;
  color: string;
  items: SidebarItem[];
}

/**
 * Susun item sidebar dari roadmaps.json (data vault, tanpa hardcode):
 * tiap subskill yang punya roadmap jadi item; roadmap yang tidak berada
 * di subskill mana pun (mis. DevOps Docker, Fundamental) jadi item
 * sendiri. Skill tanpa roadmap tidak muncul.
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
    if (sub.roadmapIds.length === 0) continue; // skill belum punya roadmap
    const skill = sub.folder.split('/')[0] || 'Lainnya';
    push(skill, {
      id: `sub:${sub.id}`,
      label: sub.title,
      skill,
      roadmapIds: sub.roadmapIds,
    });
  }
  for (const rm of roadmaps.roadmaps) {
    if (rm.subskillId) continue; // sudah masuk lewat subskill
    const skill = rm.folder.split('/')[0] || 'Lainnya';
    push(skill, { id: `rm:${rm.id}`, label: rm.title, skill, roadmapIds: [rm.id] });
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
 * Halaman Roadmap: sidebar kategori (skill → subskill) + detail roadmap
 * BERCABANG. Memilih subskill menampilkan semua roadmap-nya sebagai
 * pohon: langkah berurutan, dan file yang dirujuk langkah tampil
 * sebagai cabang. Semua data dari roadmaps.json + graph.json (vault).
 */
export default function RoadmapPage() {
  const { metadata, loading: siteLoading } = useSiteData();
  const [roadmaps, setRoadmaps] = useState<RoadmapsData | null>(null);
  const [graph, setGraph] = useState<GraphData | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Seleksi datang dari URL (/roadmap/:id), jadi badge di halaman lain
  // (mis. /docs) bisa langsung mengarahkan ke subskill tertentu.
  const { id: urlId } = useParams();
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

  // Item aktif: dari URL kalau valid, fallback ke item pertama.
  const selected = useMemo(() => {
    if (allItems.length === 0) return null;
    if (urlId) {
      const found = allItems.find((item) => item.id === urlId);
      if (found) return found;
    }
    return allItems[0];
  }, [allItems, urlId]);
  const selectedGroup = groups.find((g) => g.items.some((item) => item.id === selected?.id)) ?? null;

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

  const totalSteps = selectedRoadmaps.reduce((sum, rm) => sum + rm.stepIds.length, 0);
  const color = selectedGroup?.color ?? '#94a3b8';
  const syncedAt = metadata?.generatedAt
    ? new Date(metadata.generatedAt).toLocaleString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : null;

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
                    onClick={() => navigate(`/roadmap/${item.id}`)}
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

        {syncedAt && (
          <p className="mt-4 flex items-center gap-1.5 border-t border-slate-800/60 px-2 pt-3 text-[11px] text-slate-600">
            <RefreshCw className="h-3 w-3 shrink-0" />
            Sinkron dari Obsidian
            <br />
            {syncedAt}
          </p>
        )}
      </aside>

      {/* Konten: detail roadmap bercabang */}
      <div className="min-w-0 flex-1 overflow-y-auto">
        {selected ? (
          <div className="mx-auto max-w-3xl p-5 sm:p-7">
            <header className="mb-6">
              <p className="text-xs uppercase tracking-wider" style={{ color }}>
                {selected.skill} · {selectedGroup?.skill}
              </p>
              <h1 className="mt-1 flex items-center gap-2.5 text-2xl font-bold tracking-tight text-slate-50">
                {selected.id.startsWith('sub:') && (
                  <Star className="h-5 w-5 shrink-0 text-emerald-400" />
                )}
                {selected.label}
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                {selectedRoadmaps.length} roadmap · {totalSteps} langkah belajar · urut dari atas
                ke bawah, kotak kecil = materi lain yang dirujuk langkah
              </p>
            </header>

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
                      className="shrink-0 rounded-md p-1.5 text-slate-500 transition-colors hover:bg-slate-800 hover:text-white"
                      title={`Buka dokumen ${rm.title}`}
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Link>
                  </div>
                  <BranchTree roadmap={rm} graph={graph} />
                </section>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-slate-500">
            Pilih kategori di samping.
          </div>
        )}
      </div>

      {/* Selector kategori (mobile) */}
      <div className="fixed bottom-4 left-1/2 z-30 w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 md:hidden">
        <select
          value={selected?.id ?? ''}
          onChange={(e) => navigate(`/roadmap/${e.target.value}`)}
          className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-slate-200 shadow-2xl focus:border-emerald-500 focus:outline-none"
        >
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
