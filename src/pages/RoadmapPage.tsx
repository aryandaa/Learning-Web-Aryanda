import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowDown, ExternalLink, Play, Star } from 'lucide-react';
import { fetchGraph, fetchRoadmaps } from '../services/docs';
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

/** Graph ter-scope untuk satu roadmap (roadmap + langkah + file yang di-link langkah). */
function buildScopedGraph(roadmap: RoadmapInfo, graph: GraphData): GraphData {
  const base = new Set<string>([roadmap.id, ...roadmap.stepIds]);
  if (roadmap.subskillId) base.add(roadmap.subskillId);
  const nodeIds = new Set<string>(base);
  for (const link of graph.links) {
    if (base.has(link.source) && !base.has(link.target)) nodeIds.add(link.target);
    if (base.has(link.target) && !base.has(link.source)) nodeIds.add(link.source);
  }
  return {
    schemaVersion: 1,
    nodes: graph.nodes.filter((n) => nodeIds.has(n.id)),
    links: graph.links.filter((l) => nodeIds.has(l.source) && nodeIds.has(l.target)),
  };
}

/**
 * Halaman Roadmap: sidebar menampilkan SKILL (#Subskill) saja.
 * Pilih skill -> SEMUA roadmap skill itu digabung jadi satu alur utuh
 * (urut sesuai penomoran), tiap roadmap menampilkan kotak-kotak penuh.
 */
export default function RoadmapPage() {
  const [roadmaps, setRoadmaps] = useState<RoadmapsData | null>(null);
  const [graph, setGraph] = useState<GraphData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedSkillId, setSelectedSkillId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([fetchRoadmaps(), fetchGraph()])
      .then(([roadmapsData, graphData]) => {
        if (cancelled) return;
        setRoadmaps(roadmapsData);
        setGraph(graphData);
        setSelectedSkillId(roadmapsData.subskills[0]?.id ?? null);
      })
      .catch((err) => {
        if (!cancelled) setError((err as Error).message);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const selectedSkill = roadmaps?.subskills.find((s) => s.id === selectedSkillId) ?? null;

  // roadmap skill ini, urut sesuai penomoran (01_, 02_, ...)
  const skillRoadmaps = useMemo<RoadmapInfo[]>(() => {
    if (!roadmaps || !selectedSkill) return [];
    return selectedSkill.roadmapIds
      .map((id) => roadmaps.roadmaps.find((r) => r.id === id))
      .filter((r): r is RoadmapInfo => Boolean(r))
      .sort((a, b) => a.title.localeCompare(b.title, undefined, { sensitivity: 'base' }));
  }, [roadmaps, selectedSkill]);

  const scopedGraphs = useMemo(() => {
    if (!graph) return new Map<string, GraphData>();
    const map = new Map<string, GraphData>();
    for (const roadmap of skillRoadmaps) {
      map.set(roadmap.id, buildScopedGraph(roadmap, graph));
    }
    return map;
  }, [skillRoadmaps, graph]);

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

  const skillColor = selectedSkill ? folderColor(selectedSkill.folder) : FALLBACK_COLOR;

  return (
    <div className="flex h-[calc(100vh-3.5rem)]">
      {/* sidebar: SKILL (#Subskill) saja */}
      <aside className="hidden w-72 shrink-0 overflow-y-auto border-r border-slate-800/80 p-4 md:block">
        <p className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
          <Star className="h-4 w-4 text-emerald-400" />
          Skills · {roadmaps.subskills.length}
        </p>
        <ul className="space-y-0.5">
          {roadmaps.subskills.map((skill) => (
            <li key={skill.id}>
              <button
                onClick={() => setSelectedSkillId(skill.id)}
                className={cn(
                  'flex w-full items-center gap-2 rounded-md px-3 py-1.5 text-left text-sm transition-colors',
                  selectedSkillId === skill.id
                    ? 'bg-emerald-500/15 font-medium text-emerald-300'
                    : 'text-slate-400 hover:bg-slate-800/70 hover:text-slate-200'
                )}
              >
                <Star className="h-3.5 w-3.5 shrink-0 text-emerald-400/70" />
                <span className="truncate">{skill.title}</span>
                {skill.roadmapIds.length > 0 && (
                  <span className="ml-auto rounded bg-slate-800 px-1.5 py-0.5 text-[10px] tabular-nums text-slate-500">
                    {skill.roadmapIds.length}
                  </span>
                )}
              </button>
            </li>
          ))}
        </ul>
      </aside>

      {/* konten: semua roadmap skill digabung jadi satu alur */}
      <div className="min-w-0 flex-1 overflow-y-auto">
        {selectedSkill ? (
          <div className="p-5 sm:p-7">
            {/* header skill */}
            <div className="mb-6">
              <p className="text-xs uppercase tracking-wider text-slate-500">{selectedSkill.folder}</p>
              <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-50">
                {selectedSkill.title}
              </h1>
              {skillRoadmaps.length > 0 && (
                <p className="mt-1 text-sm text-slate-500">
                  {skillRoadmaps.length} roadmap · digabung dalam satu alur
                </p>
              )}
            </div>

            {skillRoadmaps.length === 0 ? (
              <p className="rounded-xl border border-dashed border-slate-800 p-8 text-center text-sm text-slate-500">
                Skill ini belum memiliki roadmap (#roadmap).
              </p>
            ) : (
              <div className="space-y-10">
                {skillRoadmaps.map((roadmap, index) => (
                  <div key={roadmap.id}>
                    {index > 0 && (
                      <div className="mb-10 flex justify-center">
                        <ArrowDown className="h-7 w-7 text-slate-600" />
                      </div>
                    )}

                    {/* header roadmap */}
                    <div className="mb-4 flex flex-wrap items-center gap-3">
                      <span
                        className="flex h-8 w-8 items-center justify-center rounded-full"
                        style={{ backgroundColor: skillColor }}
                      >
                        <Play className="h-4 w-4 text-white" />
                      </span>
                      <div>
                        <h2 className="text-lg font-semibold text-slate-100">{roadmap.title}</h2>
                        <p className="text-[11px] text-slate-500">
                          {roadmap.parentDir} · {roadmap.stepIds.length} langkah
                        </p>
                      </div>
                      <Link
                        to={`/docs/${roadmap.id}`}
                        className="ml-auto flex items-center gap-1.5 rounded-lg border border-slate-700 px-3 py-1.5 text-xs text-slate-300 transition-colors hover:border-slate-600 hover:text-white"
                      >
                        Buka dokumen
                        <ExternalLink className="h-3 w-3" />
                      </Link>
                    </div>

                    <RoadmapFlow
                      roadmap={roadmap}
                      scopedGraph={scopedGraphs.get(roadmap.id) ?? { schemaVersion: 1, nodes: [], links: [] }}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-slate-500">
            Pilih skill di samping.
          </div>
        )}
      </div>

      {/* selector skill (mobile) */}
      <div className="fixed bottom-4 left-1/2 z-30 w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 md:hidden">
        <select
          value={selectedSkillId ?? ''}
          onChange={(e) => setSelectedSkillId(e.target.value)}
          className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-slate-200 shadow-2xl focus:border-emerald-500 focus:outline-none"
        >
          {roadmaps.subskills.map((skill) => (
            <option key={skill.id} value={skill.id}>
              {skill.title} ({skill.roadmapIds.length})
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
