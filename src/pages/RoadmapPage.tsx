import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ExternalLink, Map as MapIcon } from 'lucide-react';
import { fetchGraph, fetchRoadmaps } from '../services/docs';
import { useSiteData } from '../app/SiteProvider';
import { RoadmapFlow } from '../components/roadmap/RoadmapFlow';
import { Spinner } from '../components/ui/spinner';
import { cn } from '../lib/utils';
import type { GraphData, RoadmapInfo, RoadmapsData } from '../domain/types';

const FOLDER_COLORS: Record<string, string> = {
  CyberSecurity: '#fb7185',
  DevOps: '#a78bfa',
  Jaringan: '#38bdf8',
  Pemrograman: '#34d399',
};
const FALLBACK_COLOR = '#94a3b8';

function folderColor(folder: string): string {
  const top = folder.split('/')[0];
  return FOLDER_COLORS[top] ?? FALLBACK_COLOR;
}

/**
 * Halaman Roadmap: pilih roadmap dari file #roadmap, lihat konteks parent
 * (#Subskill / folder induk) dan jaringan file yang terhubung.
 */
export default function RoadmapPage() {
  const { fileMap } = useSiteData();
  const [roadmaps, setRoadmaps] = useState<RoadmapsData | null>(null);
  const [graph, setGraph] = useState<GraphData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([fetchRoadmaps(), fetchGraph()])
      .then(([roadmapsData, graphData]) => {
        if (cancelled) return;
        setRoadmaps(roadmapsData);
        setGraph(graphData);
        setSelectedId(roadmapsData.roadmaps[0]?.id ?? null);
      })
      .catch((err) => {
        if (!cancelled) setError((err as Error).message);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // daftar roadmap dikelompokkan per folder utama
  const groups = useMemo(() => {
    if (!roadmaps) return [];
    const map = new Map<string, RoadmapInfo[]>();
    for (const roadmap of roadmaps.roadmaps) {
      const top = roadmap.folder.split('/')[0] || 'Lainnya';
      const list = map.get(top) ?? [];
      list.push(roadmap);
      map.set(top, list);
    }
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [roadmaps]);

  const selected = roadmaps?.roadmaps.find((r) => r.id === selectedId) ?? null;

  // scope graph: roadmap + file yang terhubung (+ subskill induk)
  const scopedGraph = useMemo<GraphData | null>(() => {
    if (!selected || !graph) return null;
    const nodeIds = new Set<string>([selected.id, ...selected.stepIds]);
    if (selected.subskillId) nodeIds.add(selected.subskillId);
    const nodes = graph.nodes.filter((n) => nodeIds.has(n.id));
    const links = graph.links.filter((l) => nodeIds.has(l.source) && nodeIds.has(l.target));
    return { schemaVersion: 1, nodes, links };
  }, [selected, graph]);

  const subskill = useMemo(() => {
    if (!selected?.subskillId) return null;
    const entry = fileMap.get(selected.subskillId);
    return entry ? { id: selected.subskillId, title: entry.title } : null;
  }, [selected, fileMap]);

  if (error) {
    return (
      <div className="mx-auto max-w-2xl py-16 text-center text-sm text-slate-400">
        {error} — jalankan parser untuk membuat roadmaps.json.
      </div>
    );
  }

  if (!roadmaps || !graph) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-3.5rem)]">
      {/* daftar roadmap per kategori */}
      <aside className="hidden w-72 shrink-0 overflow-y-auto border-r border-slate-800/80 p-4 md:block">
        <p className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
          <MapIcon className="h-4 w-4 text-amber-400" />
          Roadmaps · {roadmaps.roadmaps.length}
        </p>
        {groups.map(([folder, list]) => (
          <div key={folder} className="mb-4">
            <p className="mb-1.5 flex items-center gap-2 px-2 text-[11px] font-semibold uppercase tracking-wide text-slate-600">
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: folderColor(folder) }} />
              {folder}
            </p>
            <ul className="space-y-0.5">
              {list.map((roadmap) => (
                <li key={roadmap.id}>
                  <button
                    onClick={() => setSelectedId(roadmap.id)}
                    className={cn(
                      'w-full rounded-md px-3 py-1.5 text-left text-sm transition-colors',
                      selectedId === roadmap.id
                        ? 'bg-indigo-500/15 font-medium text-indigo-300'
                        : 'text-slate-400 hover:bg-slate-800/70 hover:text-slate-200'
                    )}
                  >
                    {roadmap.title}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </aside>

      {/* konten */}
      <div className="min-w-0 flex-1 overflow-y-auto">
        {selected && scopedGraph ? (
          <div className="p-5 sm:p-7">
            <div className="mb-6 flex flex-wrap items-center gap-3">
              <div>
                <p className="text-xs uppercase tracking-wider text-slate-500">{selected.folder}</p>
                <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-50">
                  {selected.title}
                </h1>
              </div>
              <div className="ml-auto flex items-center gap-2">
                <span className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs text-slate-400">
                  {selected.stepIds.length} langkah
                </span>
                <Link
                  to={`/docs/${selected.id}`}
                  className="flex items-center gap-1.5 rounded-lg bg-indigo-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-400"
                >
                  Buka dokumen roadmap
                  <ExternalLink className="h-3 w-3" />
                </Link>
              </div>
            </div>

            <RoadmapFlow roadmap={selected} scopedGraph={scopedGraph} subskill={subskill} />
          </div>
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-slate-500">
            Pilih roadmap di samping.
          </div>
        )}
      </div>

      {/* selector mobile */}
      <div className="fixed bottom-4 left-1/2 z-30 w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 md:hidden">
        <select
          value={selectedId ?? ''}
          onChange={(e) => setSelectedId(e.target.value)}
          className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-slate-200 shadow-2xl focus:border-indigo-500 focus:outline-none"
        >
          {roadmaps.roadmaps.map((roadmap) => (
            <option key={roadmap.id} value={roadmap.id}>
              {roadmap.folder.split('/').pop()} — {roadmap.title}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
