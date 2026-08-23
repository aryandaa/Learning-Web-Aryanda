import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ExternalLink, Network, RotateCcw } from 'lucide-react';
import { fetchGraph } from '../services/docs';
import { ForceGraph } from '../components/graph/ForceGraph';
import { Spinner } from '../components/ui/spinner';
import type { GraphData, GraphNode } from '../domain/types';

const FOLDER_LABELS: Record<string, { label: string; color: string }> = {
  CyberSecurity: { label: 'CyberSecurity', color: '#B86B68' },
  DevOps: { label: 'DevOps', color: '#6F9B78' },
  Jaringan: { label: 'Jaringan', color: '#6E9CB8' },
  Pemrograman: { label: 'Pemrograman', color: '#C49A5A' },
};

/**
 * Halaman graph. visualisasi sambungan antar catatan
 * (gaya Obsidian Graph View). Data graph.json dimuat lazy.
 */
export default function GraphPage() {
  const [data, setData] = useState<GraphData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showIsolated, setShowIsolated] = useState(false);
  const [hovered, setHovered] = useState<GraphNode | null>(null);
  const [fitSignal, setFitSignal] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;
    fetchGraph()
      .then((graph) => {
        if (!cancelled) setData(graph);
      })
      .catch((err) => {
        if (!cancelled) setError((err as Error).message);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (error) {
    return (
      <div className="mx-auto max-w-2xl py-16 text-center text-sm text-slate-400">
        {error}. Jalankan parser untuk membuat graph.json.
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Spinner />
      </div>
    );
  }

  const connected = data.nodes.filter((n) => data.links.some((l) => l.source === n.id || l.target === n.id));

  return (
    <div className="flex h-[calc(100vh-3.5rem)] flex-col">
      {/* header */}
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 border-b border-slate-800/80 px-5 py-3">
        <h1 className="flex items-center gap-2 text-lg font-bold text-slate-100">
          <Network className="h-5 w-5 text-accent-400" />
          Graph Materi
        </h1>
        <p className="hidden text-xs text-slate-500 sm:block">
          {connected.length} catatan terhubung · {data.links.length} tautan
        </p>

        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={() => setShowIsolated((v) => !v)}
            className={
              showIsolated
                ? 'rounded-lg bg-accent-500/15 px-3 py-1.5 text-xs font-medium text-accent-300 ring-1 ring-accent-500/40'
                : 'rounded-lg border border-slate-700 px-3 py-1.5 text-xs text-slate-400 hover:text-slate-200'
            }
          >
            {showIsolated ? '✓' : ''} Tampilkan terisolasi ({data.nodes.length - connected.length})
          </button>
          <button
            onClick={() => setFitSignal((v) => v + 1)}
            className="flex items-center gap-1.5 rounded-lg border border-slate-700 px-3 py-1.5 text-xs text-slate-400 hover:text-slate-200"
            title="Sesuaikan tampilan"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Fit
          </button>
        </div>
      </div>

      {/* canvas */}
      <div className="relative flex-1 overflow-hidden bg-slate-950">
        <ForceGraph
          data={data}
          showIsolated={showIsolated}
          onNodeClick={(id) => navigate(`/docs/${id}`)}
          onHoverChange={setHovered}
          fitSignal={fitSignal}
        />

        {/* legenda */}
        <div className="pointer-events-none absolute left-4 top-4 rounded-xl border border-slate-800 bg-slate-900/80 p-3 backdrop-blur">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
            Folder
          </p>
          <ul className="space-y-1.5 text-xs text-slate-300">
            {Object.entries(FOLDER_LABELS).map(([key, { label, color }]) => (
              <li key={key} className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />
                {label}
              </li>
            ))}
          </ul>
          <p className="mt-3 border-t border-slate-800 pt-2 text-[10px] leading-relaxed text-slate-600">
            Hover: sorot tetangga
            <br />
            Klik node: buka catatan
            <br />
            Drag: geser · Scroll: zoom
          </p>
        </div>

        {/* panel info node */}
        {hovered && (
          <div className="absolute bottom-4 left-4 max-w-xs rounded-xl border border-slate-800 bg-slate-900/90 p-4 shadow-2xl backdrop-blur">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-accent-400">
              {hovered.folder || 'Root'}
            </p>
            <h2 className="mt-1 text-sm font-semibold text-slate-100">{hovered.title}</h2>
            <button
              onClick={() => navigate(`/docs/${hovered.id}`)}
              className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-accent-500 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-accent-600"
            >
              Buka catatan
              <ExternalLink className="h-3 w-3" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
