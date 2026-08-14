/**
 * Komponen UI bersama OSINT. konsisten dengan visual Learning-Web/CySec Tools.
 */

import { ExternalLink, Lock } from 'lucide-react';
import { cn } from '../../../lib/utils';
import type { OsintPrivacy, OsintSource } from '../types';

// ---------------------------------------------------------------------------
// Privacy indicator (LOCAL / EXTERNAL / HYBRID)
// ---------------------------------------------------------------------------

export function PrivacyIndicator({ privacy, note }: { privacy: OsintPrivacy; note?: string }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span
        className={cn(
          'inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium',
          privacy === 'local' && 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300',
          privacy === 'external' && 'border-amber-500/30 bg-amber-500/10 text-amber-300',
          privacy === 'hybrid' && 'border-cyan-500/30 bg-cyan-500/10 text-cyan-300'
        )}
      >
        <Lock className="h-3 w-3" />
        {privacy === 'local' ? 'LOCAL. Processed locally. No data leaves your browser.' : ''}
        {privacy === 'external' ? 'EXTERNAL. This lookup uses an external public service.' : ''}
        {privacy === 'hybrid' ? 'HYBRID. Local processing + optional external public lookup.' : ''}
      </span>
      {note && <span className="text-xs text-slate-500">{note}</span>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Source tracking
// ---------------------------------------------------------------------------

export function SourceList({ sources }: { sources: OsintSource[] }) {
  if (sources.length === 0) return null;
  return (
    <section className="mt-4 rounded-xl border border-slate-800 bg-slate-900/40 p-4">
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">Sources</h3>
      <ul className="space-y-1.5">
        {sources.map((s, i) => (
          <li key={i} className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs">
            <span className="font-medium text-slate-300">{s.source}</span>
            <a href={s.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 break-all text-indigo-400 hover:text-indigo-300">
              {s.url} <ExternalLink className="h-3 w-3 shrink-0" />
            </a>
            <span className="text-slate-600">retrieved {s.retrievedAt}</span>
            {s.note && <span className="text-slate-500">{s.note}</span>}
          </li>
        ))}
      </ul>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Indicator badge (status kecil)
// ---------------------------------------------------------------------------

export function IndicatorBadge({ tone, children, title }: { tone: 'ok' | 'warn' | 'info' | 'bad'; children: React.ReactNode; title?: string }) {
  const tones = {
    ok: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300',
    warn: 'border-amber-500/30 bg-amber-500/10 text-amber-300',
    info: 'border-sky-500/30 bg-sky-500/10 text-sky-300',
    bad: 'border-red-500/30 bg-red-500/10 text-red-300',
  };
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-medium', tones[tone])} title={title}>
      {children}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Result panel (bungkus Panel cysec dengan aksi export opsional)
// ---------------------------------------------------------------------------

import { Panel } from '../../cysec-tools/components/ui';

export function OsintResultPanel({
  title,
  actions,
  children,
  className,
}: {
  title: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Panel title={title} action={actions} className={className}>
      {children}
    </Panel>
  );
}
