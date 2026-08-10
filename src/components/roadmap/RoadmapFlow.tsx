import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, Folder, FolderOpen, Play, Star } from 'lucide-react';
import type { GraphData, RoadmapInfo } from '../../domain/types';
import { ForceGraph } from '../graph/ForceGraph';

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

interface RoadmapFlowProps {
  roadmap: RoadmapInfo;
  /** Data graph yang sudah di-scope ke roadmap ini (roadmap + file terhubung). */
  scopedGraph: GraphData;
  /** Konteks: file #Subskill di folder induk (jika ada). */
  subskill: { id: string; title: string } | null;
}

/**
 * Tampilan roadmap: konteks parent (Subskill / folder induk / file roadmap),
 * lalu jaringan file-file yang terhubung ke file lain.
 */
export function RoadmapFlow({ roadmap, scopedGraph, subskill }: RoadmapFlowProps) {
  const roadmapColor = folderColor(roadmap.folder);
  const navigate = useNavigate();

  return (
    <div>
      {/* konteks: subskill -> parent dir -> roadmap */}
      <div className="mb-6 flex flex-wrap items-center gap-2">
        {subskill && (
          <>
            <Link
              to={`/docs/${subskill.id}`}
              className="group flex items-center gap-2 rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-2.5 transition-colors hover:bg-emerald-500/20"
            >
              <Star className="h-4 w-4 text-emerald-300" />
              <span className="text-sm font-semibold text-emerald-100 group-hover:text-white">
                {subskill.title}
              </span>
              <span className="text-[10px] font-semibold uppercase tracking-widest text-emerald-400/70">
                Subskill
              </span>
            </Link>
            <ArrowRight className="h-4 w-4 text-slate-600" />
          </>
        )}

        <span className="flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900/70 px-4 py-2.5">
          <FolderOpen className="h-4 w-4 text-amber-400" />
          <span className="text-sm font-semibold text-slate-200">{roadmap.parentDir}</span>
          <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">
            Folder
          </span>
        </span>

        <ArrowRight className="h-4 w-4 text-slate-600" />

        <Link
          to={`/docs/${roadmap.id}`}
          className="group flex items-center gap-2 rounded-xl border-2 px-4 py-2.5 transition-colors hover:bg-indigo-500/20"
          style={{ borderColor: roadmapColor }}
        >
          <Play className="h-4 w-4" style={{ color: roadmapColor }} />
          <span className="text-sm font-semibold text-slate-100 group-hover:text-white">
            {roadmap.title}
          </span>
          <span className="text-[10px] font-semibold uppercase tracking-widest text-indigo-300/70">
            Roadmap
          </span>
        </Link>
      </div>

      {/* jaringan file terhubung */}
      {scopedGraph.nodes.length > 0 ? (
        <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900/40">
          <div className="flex flex-wrap items-center gap-3 border-b border-slate-800 px-4 py-2.5">
            <p className="flex items-center gap-2 text-sm font-medium text-slate-300">
              <Folder className="h-4 w-4 text-amber-400" />
              File yang terhubung
              <span className="rounded-md bg-slate-800 px-1.5 py-0.5 text-xs tabular-nums text-slate-400">
                {scopedGraph.nodes.length} node · {scopedGraph.links.length} tautan
              </span>
            </p>
            <p className="ml-auto text-[11px] text-slate-600">
              hover: sorot · klik: buka catatan
            </p>
          </div>
          <div className="h-[480px]">
            <ForceGraph
              data={scopedGraph}
              showIsolated={false}
              onNodeClick={(id) => navigate(`/docs/${id}`)}
              onHoverChange={() => undefined}
            />
          </div>
        </div>
      ) : (
        <p className="rounded-xl border border-dashed border-slate-800 p-8 text-center text-sm text-slate-500">
          Roadmap ini belum memiliki tautan ke materi lain.
        </p>
      )}
    </div>
  );
}
