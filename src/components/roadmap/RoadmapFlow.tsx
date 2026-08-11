import { useMemo } from 'react';
import { Link } from 'react-router-dom';
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

interface RoadmapFlowProps {
  roadmap: RoadmapInfo;
  scopedGraph: GraphData;
}

interface Step {
  id: string;
  title: string;
  folder: string;
}

/** Panah penghubung ke langkah berikutnya (atas -> bawah). */
function DownArrow() {
  return (
    <svg width="20" height="18" viewBox="0 0 20 18" className="text-slate-600">
      <line x1="10" y1="0" x2="10" y2="12" stroke="currentColor" strokeWidth="2" />
      <path
        d="M4 12 L10 18 L16 12"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * Tampilan roadmap satu kolom vertikal (atas -> bawah) agar urutan
 * membaca jelas. Node kotak ala roadmap.sh: border + titik warna,
 * dihubungkan panah ke bawah, latar grid pattern.
 */
export function RoadmapFlow({ roadmap, scopedGraph }: RoadmapFlowProps) {
  const nodeInfo = useMemo(() => new Map(scopedGraph.nodes.map((n) => [n.id, n])), [scopedGraph]);

  const steps = useMemo<Step[]>(() => {
    return roadmap.stepIds
      .map((id) => nodeInfo.get(id))
      .filter((n): n is NonNullable<typeof n> => Boolean(n))
      .map((n) => ({ id: n.id, title: n.title, folder: n.folder }));
  }, [roadmap.stepIds, nodeInfo]);

  // file yang di-link oleh tiap langkah (di luar roadmap itu sendiri)
  const linksFrom = useMemo(() => {
    const exclude = new Set<string>([roadmap.id]);
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
  }, [scopedGraph.links, roadmap.id, nodeInfo]);

  return (
    <div className="roadmap-grid overflow-x-auto rounded-2xl border border-slate-800 bg-slate-950/70 px-4 py-8 sm:px-8">
      {steps.length === 0 ? (
        <p className="text-center text-sm text-slate-500">
          Roadmap ini belum memiliki tautan ke materi lain.
        </p>
      ) : (
        <div className="mx-auto flex max-w-md flex-col items-stretch">
          {steps.map((step, index) => {
            const color = folderColor(step.folder);
            const connected = (linksFrom.get(step.id) ?? [])
              .map((id) => nodeInfo.get(id)?.title)
              .filter((t): t is string => Boolean(t));
            return (
              <div key={step.id} className="flex flex-col items-center">
                <Link
                  to={`/docs/${step.id}`}
                  className="group flex w-full items-center gap-3 rounded-lg border-2 bg-slate-900/80 px-4 py-2.5 transition-all hover:-translate-y-0.5 hover:bg-slate-800/80"
                  style={{ borderColor: color, boxShadow: '0 0 0 0 transparent' }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.boxShadow = `0 0 14px ${color}55`;
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.boxShadow = '0 0 0 0 transparent';
                  }}
                >
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: color }}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-slate-200 group-hover:text-white">
                      {step.title}
                    </span>
                    {connected.length > 0 && (
                      <span
                        className="block truncate text-[11px] text-slate-500"
                        title={connected.join(' · ')}
                      >
                        ⤳ {connected.slice(0, 2).join(' · ')}
                        {connected.length > 2 ? ` · +${connected.length - 2}` : ''}
                      </span>
                    )}
                  </span>
                </Link>
                {index < steps.length - 1 && (
                  <div className="flex justify-center py-1">
                    <DownArrow />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
