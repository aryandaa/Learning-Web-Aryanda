import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ExternalLink, GitFork } from 'lucide-react';
import type { GraphData, RoadmapInfo } from '../../domain/types';
import { folderColor } from '../../lib/colors';

interface BranchNode {
  id: string;
  title: string;
  folder: string;
  kind: 'step' | 'link';
  /** Nomor urut langkah di roadmap (untuk kind === 'step'). */
  order: number;
  children: BranchNode[];
  /** Jumlah tautan yang dipotong karena batas MAX_NODES (hanya di root). */
  truncated?: number;
}

interface BranchTreeProps {
  roadmap: RoadmapInfo;
  graph: GraphData;
}

/** Batas jumlah node per pohon agar halaman tetap ringan. */
const MAX_NODES = 160;
/** Kedalaman cabang: langkah(1) -> file dirujuk(2) -> file dirujuk lagi(3). */
const BRANCH_DEPTH = 2;

/**
 * Bangun pohon bercabang dari data graph (100% hasil parsing vault):
 *   roadmap ──► langkah-langkah (urut, sesuai materi)
 *                  └─► file yang dirujuk langkah itu (cabang)
 *                        └─► file yang dirujuk cabang itu (cabang lebih dalam)
 * Siklus dicegah dengan visited set; jumlah node dibatasi MAX_NODES.
 */
function buildBranchTree(roadmap: RoadmapInfo, graph: GraphData): BranchNode {
  const nodeById = new Map(graph.nodes.map((n) => [n.id, n]));
  const outLinks = new Map<string, string[]>();
  for (const link of graph.links) {
    const list = outLinks.get(link.source) ?? [];
    list.push(link.target);
    outLinks.set(link.source, list);
  }

  const stepSet = new Set(roadmap.stepIds);
  const visited = new Set<string>([roadmap.id]);
  let nodeCount = 0;
  let truncated = 0;

  const makeStep = (id: string, order: number): BranchNode | null => {
    const info = nodeById.get(id);
    if (!info || visited.has(id) || nodeCount >= MAX_NODES) return null;
    visited.add(id);
    nodeCount += 1;
    return { id, title: info.title, folder: info.folder, kind: 'step', order, children: [] };
  };

  const expand = (node: BranchNode, depth: number): void => {
    if (depth <= 0) return;
    const children: BranchNode[] = [];
    for (const id of outLinks.get(node.id) ?? []) {
      // Langkah lain dari roadmap ini bukan cabang (tetap di tulang punggung).
      if (id === roadmap.id || stepSet.has(id)) continue;
      const info = nodeById.get(id);
      if (!info || visited.has(id)) continue;
      if (nodeCount >= MAX_NODES) {
        truncated += 1;
        continue;
      }
      visited.add(id);
      nodeCount += 1;
      children.push({ id, title: info.title, folder: info.folder, kind: 'link', order: 0, children: [] });
    }
    // Urut cabang alfabetis agar stabil antar-render.
    children.sort((a, b) => a.title.localeCompare(b.title));
    node.children = children;
    for (const child of children) expand(child, depth - 1);
  };

  const root: BranchNode = {
    id: roadmap.id,
    title: roadmap.title,
    folder: roadmap.folder,
    kind: 'step',
    order: 0,
    children: [],
  };

  // Tulang punggung: langkah sesuai urutan di materi.
  roadmap.stepIds.forEach((id, index) => {
    if (nodeCount >= MAX_NODES) {
      truncated += 1;
      return;
    }
    const step = makeStep(id, index + 1);
    if (step) root.children.push(step);
    else if (nodeById.has(id)) truncated += 1;
  });

  // Cabang dari tiap langkah (hingga BRANCH_DEPTH level).
  for (const step of root.children) expand(step, BRANCH_DEPTH);

  root.truncated = truncated;
  return root;
}

/**
 * Detail roadmap BERCABANG: pohon vertikal dengan garis penghubung.
 * Kotak bernomor = langkah (urut atas→bawah); kotak kecil di bawahnya =
 * file yang dirujuk langkah itu — makin dalam, makin detail materi.
 */
export function BranchTree({ roadmap, graph }: BranchTreeProps) {
  const tree = useMemo(() => buildBranchTree(roadmap, graph), [roadmap, graph]);
  const color = folderColor(roadmap.folder);

  return (
    <div className="roadmap-grid rounded-xl border border-slate-800 bg-slate-950/70 px-4 py-5 sm:px-6">
      <Link
        to={`/docs/${roadmap.id}`}
        className="group flex w-full items-center gap-3 rounded-xl border-2 bg-slate-900/80 px-4 py-3 transition-all hover:-translate-y-0.5 hover:bg-slate-800/80"
        style={{ borderColor: color, boxShadow: '0 0 0 0 transparent' }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLElement).style.boxShadow = `0 0 18px ${color}44`;
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLElement).style.boxShadow = '0 0 0 0 transparent';
        }}
      >
        <span
          className="shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white"
          style={{ backgroundColor: color }}
        >
          Roadmap
        </span>
        <span className="min-w-0 flex-1 truncate text-sm font-bold text-slate-100 group-hover:text-white">
          {roadmap.title}
        </span>
        <span className="shrink-0 text-[11px] tabular-nums text-slate-500">
          {roadmap.stepIds.length} langkah
        </span>
        <ExternalLink className="h-3.5 w-3.5 shrink-0 text-slate-500 group-hover:text-white" />
      </Link>

      {tree.children.length === 0 ? (
        <p className="mt-4 rounded-lg border border-dashed border-slate-800 px-4 py-5 text-center text-xs text-slate-600">
          Roadmap ini belum memiliki tautan ke materi lain.
        </p>
      ) : (
        <div className="mt-4">
          {tree.children.map((child, index) => (
            <TreeNodeRow key={child.id} node={child} isLast={index === tree.children.length - 1} />
          ))}
          {tree.truncated !== undefined && tree.truncated > 0 && (
            <p className="mt-2 pl-5 text-[11px] text-slate-600">… +{tree.truncated} tautan lain tidak ditampilkan</p>
          )}
        </div>
      )}
    </div>
  );
}

/** Satu baris node: segmen garis vertikal + garis penghubung + kartu. */
function TreeNodeRow({ node, isLast }: { node: BranchNode; isLast: boolean }) {
  return (
    <div className="relative">
      {/* Segmen garis vertikal (berhenti di tengah kartu jika baris terakhir). */}
      <span
        aria-hidden
        className={`absolute left-0 w-px bg-slate-700/50 ${isLast ? 'top-0 h-4' : 'top-0 h-full'}`}
      />
      {/* Garis penghubung horizontal menuju kartu. */}
      <span aria-hidden className="absolute left-0 top-4 h-px w-4 bg-slate-700/50" />

      <div className="pb-1.5 pl-5">
        {node.kind === 'step' ? <StepCard node={node} /> : <LinkCard node={node} />}

        {node.children.length > 0 && (
          <div className="mt-1.5 space-y-1.5">
            {node.children.map((child, index) => (
              <TreeNodeRow key={child.id} node={child} isLast={index === node.children.length - 1} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StepCard({ node }: { node: BranchNode }) {
  const color = folderColor(node.folder);
  return (
    <Link
      to={`/docs/${node.id}`}
      className="group flex w-full items-center gap-2.5 rounded-lg border border-slate-800 bg-slate-900/70 px-3 py-2 transition-all hover:-translate-y-0.5 hover:bg-slate-800/80"
      style={{ borderLeftColor: color, borderLeftWidth: 3, boxShadow: '0 0 0 0 transparent' }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.boxShadow = `0 0 14px ${color}44`;
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.boxShadow = '0 0 0 0 transparent';
      }}
    >
      <span
        className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md text-[10px] font-bold tabular-nums"
        style={{ backgroundColor: `${color}26`, color }}
      >
        {node.order}
      </span>
      <span className="min-w-0 flex-1 truncate text-sm font-medium text-slate-200 group-hover:text-white">
        {node.title}
      </span>
    </Link>
  );
}

/** Kartu cabang: file yang dirujuk oleh langkah / cabang di atasnya. */
function LinkCard({ node }: { node: BranchNode }) {
  const color = folderColor(node.folder);
  return (
    <Link
      to={`/docs/${node.id}`}
      title={node.folder}
      className="group flex w-full items-center gap-2 rounded-lg border border-slate-800/70 bg-slate-900/40 px-3 py-1.5 transition-colors hover:border-slate-700 hover:bg-slate-800/60"
    >
      <span
        className="flex h-4 w-4 shrink-0 items-center justify-center rounded"
        style={{ backgroundColor: `${color}22` }}
      >
        <GitFork className="h-2.5 w-2.5" style={{ color }} />
      </span>
      <span className="min-w-0 flex-1 truncate text-xs font-medium text-slate-400 group-hover:text-slate-200">
        {node.title}
      </span>
    </Link>
  );
}
