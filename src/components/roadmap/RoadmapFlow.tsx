import { Link } from 'react-router-dom';
import { ArrowDown, ArrowRight, Play } from 'lucide-react';
import type { RoadmapInfo } from '../../domain/types';

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

/** Jumlah langkah per tahap (kolom), seperti roadmap.sh. */
const STAGE_SIZE = 6;

interface RoadmapFlowProps {
  roadmap: RoadmapInfo;
  steps: { id: string; title: string; folder: string }[];
}

/**
 * Alur belajar gaya roadmap.sh: tahapan (kolom) berisi langkah-langkah,
 * tersambung panah, dimulai dari node roadmap.
 */
export function RoadmapFlow({ roadmap, steps }: RoadmapFlowProps) {
  const stages: { id: string; title: string; folder: string }[][] = [];
  for (let i = 0; i < steps.length; i += STAGE_SIZE) {
    stages.push(steps.slice(i, i + STAGE_SIZE));
  }

  return (
    <div className="overflow-x-auto pb-4">
      <div className="flex min-w-max items-start gap-3">
        {/* node awal: file roadmap */}
        <div className="flex flex-col items-center">
          <Link
            to={`/docs/${roadmap.id}`}
            className="group flex w-52 flex-col items-center gap-2 rounded-2xl border-2 border-indigo-400/70 bg-indigo-500/15 p-4 text-center transition-colors hover:bg-indigo-500/25"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-500">
              <Play className="h-4 w-4 text-white" />
            </span>
            <span className="text-[10px] font-semibold uppercase tracking-widest text-indigo-300">
              Mulai
            </span>
            <span className="text-sm font-semibold leading-snug text-indigo-100 group-hover:text-white">
              {roadmap.title}
            </span>
          </Link>
          <ArrowDown className="mt-2 h-5 w-5 text-slate-600" />
        </div>

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
                const index = stageIndex * STAGE_SIZE + innerIndex;
                const color = folderColor(step.folder);
                return (
                  <Link
                    key={step.id}
                    to={`/docs/${step.id}`}
                    className="group flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-900/70 py-2.5 pl-3 pr-4 transition-colors hover:border-slate-600 hover:bg-slate-800/80"
                  >
                    <span
                      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-bold tabular-nums text-slate-950"
                      style={{ backgroundColor: color }}
                    >
                      {index + 1}
                    </span>
                    <span className="min-w-0">
                      <span className="block max-w-[220px] truncate text-sm font-medium text-slate-200 group-hover:text-white">
                        {step.title}
                      </span>
                      <span className="block max-w-[220px] truncate text-[10px] text-slate-500">
                        {step.folder}
                      </span>
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
