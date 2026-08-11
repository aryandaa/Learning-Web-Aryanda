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

/** Jumlah node per baris (roadmap.sh: baris-baris dengan node). */
const ROW_SIZE = 6;

interface RoadmapFlowProps {
  roadmap: RoadmapInfo;
  scopedGraph: GraphData;
}

interface Step {
  id: string;
  title: string;
  folder: string;
}

/** Panah penghubung antar baris (gaya roadmap.sh). */
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
 * Tampilan roadmap gaya roadmap.sh:
 * node kotak dengan border + titik berwarna (bukan nomor), disusun
 * zig-zag terpusat, dihubungkan panah, latar grid pattern.
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

  const rows: Step[][] = [];
  for (let i = 0; i < steps.length; i += ROW_SIZE) {
    rows.push(steps.slice(i, i + ROW_SIZE));
  }

  return (
    <div className="roadmap-grid overflow-x-auto rounded-2xl border border-slate-800 bg-slate-950/70 px-4 py-8 sm:px-8">
      {steps.length === 0 ? (
        <p className="text-center text-sm text-slate-500">Roadmap ini belum memiliki tautan ke materi lain.</p>
      ) : (
        <div className="mx-auto max-w-4xl">
          {rows.map((row, rowIndex) => (
            <div key={rowIndex}>
              {rowIndex > 0 && (
                <div className="flex justify-center py-1.5">
                  <DownArrow />
                </div>
              )}
              <div
                className={
                  'flex flex-wrap items-center justify-center gap-x-3 gap-y-2.5 ' +
                  (rowIndex % 2 === 1 ? 'sm:translate-x-8' : '')
                }
              >
                {row.map((step) => {
                  const color = folderColor(step.folder);
                  const connected = (linksFrom.get(step.id) ?? [])
                    .map((id) => nodeInfo.get(id)?.title)
                    .filter((t): t is string => Boolean(t));
                  return (
                    <Link
                      key={step.id}
                      to={`/docs/${step.id}`}
                      className="group w-44 rounded-lg border-2 bg-slate-900/80 px-3 py-2 transition-all hover:-translate-y-0.5 hover:bg-slate-800/80"
                      style={{
                        borderColor: color,
                        boxShadow: '0 0 0 0 transparent',
                      }}
                      onMouseEnter={(e) => {
                        (e.currentTarget as HTMLElement).style.boxShadow = `0 0 14px ${color}55`;
                      }}
                      onMouseLeave={(e) => {
                        (e.currentTarget as HTMLElement).style.boxShadow = '0 0 0 0 transparent';
                      }}
                    >
                      <span className="flex items-center gap-2">
                        <span
                          className="h-2 w-2 shrink-0 rounded-full"
                          style={{ backgroundColor: color }}
                        />
                        <span className="truncate text-xs font-medium text-slate-200 group-hover:text-white">
                          {step.title}
                        </span>
                      </span>
                      {connected.length > 0 && (
                        <span
                          className="mt-1 block truncate pl-4 text-[10px] text-slate-500"
                          title={connected.join(' · ')}
                        >
                          ⤳ {connected.slice(0, 2).join(' · ')}
                          {connected.length > 2 ? ` · +${connected.length - 2}` : ''}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
