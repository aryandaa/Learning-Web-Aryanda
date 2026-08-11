import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ExternalLink, Star } from 'lucide-react';
import { fetchGraph, fetchRoadmaps } from '../services/docs';
import { RoadmapFlow } from '../components/roadmap/RoadmapFlow';
import { Spinner } from '../components/ui/spinner';
import { cn } from '../lib/utils';
import type { GraphData, RoadmapInfo, RoadmapsData } from '../domain/types';

/**
 * Halaman Roadmap: sidebar menampilkan SKILL (file #Subskill) saja.
 * Pilih skill -> pilih roadmap-nya -> lihat kotak-kotak file terhubung.
 */
export default function RoadmapPage() {
  const [roadmaps, setRoadmaps] = useState<RoadmapsData | null>(null);
  const [graph, setGraph] = useState<GraphData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedSkillId, setSelectedSkillId] = useState<string | null>(null);
  const [selectedRoadmapId, setSelectedRoadmapId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([fetchRoadmaps(), fetchGraph()])
      .then(([roadmapsData, graphData]) => {
        if (cancelled) return;
        setRoadmaps(roadmapsData);
        setGraph(graphData);
        const first = roadmapsData.subskills[0];
        setSelectedSkillId(first?.id ?? null);
        setSelectedRoadmapId(first?.roadmapIds[0] ?? null);
      })
      .catch((err) => {
        if (!cancelled) setError((err as Error).message);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const selectSkill = (skillId: string) => {
    setSelectedSkillId(skillId);
    const skill = roadmaps?.subskills.find((s) => s.id === skillId);
    setSelectedRoadmapId(skill?.roadmapIds[0] ?? null);
  };

  const selectedSkill = roadmaps?.subskills.find((s) => s.id === selectedSkillId) ?? null;
  const skillRoadmaps: RoadmapInfo[] = useMemo(() => {
    if (!roadmaps || !selectedSkill) return [];
    return selectedSkill.roadmapIds
      .map((id) => roadmaps.roadmaps.find((r) => r.id === id))
      .filter((r): r is RoadmapInfo => Boolean(r));
  }, [roadmaps, selectedSkill]);

  const selected = roadmaps?.roadmaps.find((r) => r.id === selectedRoadmapId) ?? null;

  // scope graph: roadmap + langkah + file yang langsung di-link langkah
  const scopedGraph = useMemo<GraphData | null>(() => {
    if (!selected || !graph) return null;
    const base = new Set<string>([selected.id, ...selected.stepIds]);
    if (selected.subskillId) base.add(selected.subskillId);
    const nodeIds = new Set<string>(base);
    for (const link of graph.links) {
      if (base.has(link.source) && !base.has(link.target)) nodeIds.add(link.target);
      if (base.has(link.target) && !base.has(link.source)) nodeIds.add(link.source);
    }
    const nodes = graph.nodes.filter((n) => nodeIds.has(n.id));
    const links = graph.links.filter((l) => nodeIds.has(l.source) && nodeIds.has(l.target));
    return { schemaVersion: 1, nodes, links };
  }, [selected, graph]);

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
                onClick={() => selectSkill(skill.id)}
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

      {/* konten */}
      <div className="min-w-0 flex-1 overflow-y-auto">
        {selectedSkill ? (
          <div className="p-5 sm:p-7">
            {/* header skill */}
            <div className="mb-5">
              <p className="text-xs uppercase tracking-wider text-slate-500">{selectedSkill.folder}</p>
              <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-50">
                {selectedSkill.title}
              </h1>
            </div>

            {/* pilih roadmap skill ini */}
            {skillRoadmaps.length === 0 ? (
              <p className="rounded-xl border border-dashed border-slate-800 p-8 text-center text-sm text-slate-500">
                Skill ini belum memiliki roadmap (#roadmap).
              </p>
            ) : (
              <div className="mb-6 flex flex-wrap gap-2">
                {skillRoadmaps.map((roadmap) => {
                  const active = selectedRoadmapId === roadmap.id;
                  return (
                    <button
                      key={roadmap.id}
                      onClick={() => setSelectedRoadmapId(roadmap.id)}
                      className={cn(
                        'rounded-xl border px-4 py-2 text-left transition-colors',
                        active
                          ? 'border-indigo-500/60 bg-indigo-500/15'
                          : 'border-slate-700 bg-slate-900/60 hover:border-slate-600'
                      )}
                    >
                      <span className={cn('block text-sm font-medium', active ? 'text-indigo-200' : 'text-slate-200')}>
                        {roadmap.title}
                      </span>
                      <span className="block text-[10px] text-slate-500">
                        {roadmap.parentDir} · {roadmap.stepIds.length} langkah
                      </span>
                    </button>
                  );
                })}
              </div>
            )}

            {/* flow roadmap terpilih */}
            {selected && scopedGraph && (
              <div>
                <div className="mb-4 flex flex-wrap items-center gap-3">
                  <h2 className="text-lg font-semibold text-slate-100">{selected.title}</h2>
                  <Link
                    to={`/docs/${selected.id}`}
                    className="ml-auto flex items-center gap-1.5 rounded-lg bg-indigo-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-400"
                  >
                    Buka dokumen
                    <ExternalLink className="h-3 w-3" />
                  </Link>
                </div>
                <RoadmapFlow roadmap={selected} scopedGraph={scopedGraph} />
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
          onChange={(e) => selectSkill(e.target.value)}
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
