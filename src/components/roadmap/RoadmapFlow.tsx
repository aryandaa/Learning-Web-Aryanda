import { useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, FolderOpen, GitBranch, Play, Star } from 'lucide-react';
import type { GraphData, RoadmapInfo } from '../../domain/types';

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

/** Jumlah kotak langkah per tahap (kolom). */
const STAGE_SIZE = 6;

interface RoadmapFlowProps {
  roadmap: RoadmapInfo;
  scopedGraph: GraphData;
  subskill: { id: string; title: string } | null;
}

interface Step {
  id: string;
  title: string;
  folder: string;
}

/**
 * Tampilan roadmap kotak-kotak (gaya roadmap.sh):
 * [Subskill] -> [Folder induk] -> [Roadmap] -> kotak-kotak langkah,
 * tiap kotak menampilkan file lain yang di-link-nya ("file yang ngelink
 * ke file lain"), plus seksi file terhubung dari luar daftar langkah.
 */
export function RoadmapFlow({ roadmap, scopedGraph, subskill }: RoadmapFlowProps) {
  const navigate = useNavigate();

  const nodeInfo = useMemo(() => new Map(scopedGraph.nodes.map((n) => [n.id, n])), [scopedGraph]);

  const steps = useMemo<Step[]>(() => {
    return roadmap.stepIds
      .map((id) => nodeInfo.get(id))
      .filter((n): n is NonNullable<typeof n> => Boolean(n))
      .map((n) => ({ id: n.id, title: n.title, folder: n.folder }));
  }, [roadmap.stepIds, nodeInfo]);

  // file yang di-link oleh tiap langkah (di luar roadmap & subskill)
  const linksFrom = useMemo(() => {
    const exclude = new Set<string>([roadmap.id]);
    if (subskill) exclude.add(subskill.id);
    const map = new Map<string, string[]>();
    for (const link of scopedGraph.links) {
      for (const [from, to] of [
        [link.source, link.target],
        [link.target, link.source],
      ]) {
        if (exclude.has(from) || exclude.has(to)) continue;
        const list = map.get(from) ?? [];
        list.push(to);
        map.set(from, list);
      }
    }
    for (const value of map.values()) {
      value.sort((a, b) => (nodeInfo.get(a)?.title ?? a).localeCompare(nodeInfo.get(b)?.title ?? b));
    }
    return map;
  }, [scopedGraph.links, roadmap.id, subskill, nodeInfo]);

  // file terhubung dari luar daftar langkah
  const outsideFiles = useMemo<Step[]>(() => {
    const stepIds = new Set(roadmap.stepIds);
    return scopedGraph.nodes
      .filter((n) => !stepIds.has(n.id) && n.id !== roadmap.id && n.id !== subskill?.id)
      .map((n) => ({ id: n.id, title: n.title, folder: n.folder }));
  }, [scopedGraph.nodes, roadmap.stepIds, roadmap.id, subskill?.id]);

  const stages: Step[][] = [];
  for (let i = 0; i < steps.length; i += STAGE_SIZE) {
    stages.push(steps.slice(i, i + STAGE_SIZE));
  }

  const roadmapColor = folderColor(roadmap.folder);

  return (
    <div className="overflow-x-auto pb-4">
      <div className="flex min-w-max items-start gap-3">
        {/* konteks: subskill -> folder -> roadmap */}
        {subskill && (
          <>
            <Link
              to={`/docs/${subskill.id}`}
              className="flex w-44 flex-col items-center gap-1.5 rounded-2xl border-2 border-emerald-500/60 bg-emerald-500/10 p-4 text-center transition-colors hover:bg-emerald-500/20"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500">
                <Star className="h-4 w-4 text-white" />
              </span>
              <span className="text-[10px] font-semibold uppercase tracking-widest text-emerald-300">
                Subskill
              </span>
              <span className="text-sm font-semibold leading-snug text-emerald-100">
                {subskill.title}
              </span>
            </Link>
            <div className="flex flex-col items-center self-center">
              <ArrowRight className="h-5 w-5 text-slate-600" />
            </div>
          </>
        )}

        <div className="flex w-44 flex-col items-center gap-1.5 rounded-2xl border-2 border-amber-500/50 bg-amber-500/10 p-4 text-center">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-500">
            <FolderOpen className="h-4 w-4 text-white" />
          </span>
          <span className="text-[10px] font-semibold uppercase tracking-widest text-amber-300">
            Folder
          </span>
          <span className="text-sm font-semibold leading-snug text-amber-100">
            {roadmap.parentDir}
          </span>
        </div>

        <div className="flex flex-col items-center self-center">
          <ArrowRight className="h-5 w-5 text-slate-600" />
        </div>

        <Link
          to={`/docs/${roadmap.id}`}
          className="flex w-44 flex-col items-center gap-1.5 rounded-2xl border-2 p-4 text-center transition-colors hover:bg-indigo-500/20"
          style={{ borderColor: roadmapColor }}
        >
          <span
            className="flex h-8 w-8 items-center justify-center rounded-full"
            style={{ backgroundColor: roadmapColor }}
          >
            <Play className="h-4 w-4 text-white" />
          </span>
          <span className="text-[10px] font-semibold uppercase tracking-widest text-indigo-300">
            Roadmap
          </span>
          <span className="text-sm font-semibold leading-snug text-slate-100">{roadmap.title}</span>
        </Link>

        {/* kotak-kotak langkah */}
        {steps.length === 0 && (
          <p className="mt-8 max-w-xs text-sm text-slate-500">
            Roadmap ini belum memiliki tautan ke materi lain.
          </p>
        )}

        {stages.map((stage, stageIndex) => (
          <div key={stageIndex} className="flex items-start gap-3">
            <div className="flex flex-col items-center self-center pt-16">
              <ArrowRight className="h-5 w-5 text-slate-600" />
              {stageIndex < stages.length - 1 && (
                <ArrowRight className="mt-1 h-5 w-5 text-slate-800" />
              )}
            </div>
            <div className="flex flex-col gap-2">
              {stage.map((step, innerIndex) => {
                const index = stageIndex * STAGE_SIZE + innerIndex + 1;
                const color = folderColor(step.folder);
                const connected = (linksFrom.get(step.id) ?? [])
                  .map((id) => nodeInfo.get(id)?.title)
                  .filter((t): t is string => Boolean(t));
                return (
                  <Link
                    key={step.id}
                    to={`/docs/${step.id}`}
                    className="group w-56 rounded-xl border border-slate-800 bg-slate-900/70 p-3 transition-colors hover:border-slate-600 hover:bg-slate-800/80"
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-xs font-bold tabular-nums text-slate-950"
                        style={{ backgroundColor: color }}
                      >
                        {index}
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-medium text-slate-200 group-hover:text-white">
                          {step.title}
                        </span>
                        <span className="block truncate text-[10px] text-slate-500">
                          {step.folder}
                        </span>
                      </span>
                    </div>
                    {connected.length > 0 && (
                      <div className="mt-2 flex items-start gap-1.5 border-t border-slate-800 pt-1.5">
                        <GitBranch className="mt-0.5 h-3 w-3 shrink-0 text-slate-500" />
                        <p className="line-clamp-1 text-[11px] leading-4 text-slate-500">
                          {connected.slice(0, 3).join(' · ')}
                          {connected.length > 3 ? ` · +${connected.length - 3}` : ''}
                        </p>
                      </div>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* file terhubung dari luar daftar langkah */}
      {outsideFiles.length > 0 && (
        <div className="mt-8">
          <p className="mb-3 flex items-center gap-2 text-sm font-medium text-slate-300">
            <GitBranch className="h-4 w-4 text-slate-500" />
            Juga terhubung
            <span className="rounded-md bg-slate-800 px-1.5 py-0.5 text-xs tabular-nums text-slate-400">
              {outsideFiles.length}
            </span>
          </p>
          <div className="flex flex-wrap gap-2">
            {outsideFiles.map((file) => (
              <Link
                key={file.id}
                to={`/docs/${file.id}`}
                className="flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-900/70 px-3 py-2 transition-colors hover:border-slate-600 hover:bg-slate-800/80"
              >
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: folderColor(file.folder) }}
                />
                <span className="text-sm text-slate-200">{file.title}</span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
