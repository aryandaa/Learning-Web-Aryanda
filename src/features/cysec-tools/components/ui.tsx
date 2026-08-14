/**
 * Komponen UI bersama untuk seluruh tool CySec Tools. konsisten dengan
 * design system Learning-Web (slate + indigo, tema dark/light via CSS vars).
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowLeft, Check, Clipboard, Download, RefreshCw, ShieldCheck, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '../../../lib/utils';
import { Button } from '../../../components/ui/button';
import type { ToolMeta } from '../types';

// ---------------------------------------------------------------------------
// Header tool
// ---------------------------------------------------------------------------

export function ToolHeader({
  meta,
  categoryName,
  backTo,
  onBack,
}: {
  meta: ToolMeta;
  categoryName: string;
  backTo?: string;
  onBack?: () => void;
}) {
  return (
    <header className="mb-5">
      <div className="mb-2 flex items-center gap-2 text-xs text-slate-500">
        {backTo && (
          <>
            <Link to={backTo} className="flex items-center gap-1 transition-colors hover:text-indigo-300">
              <ArrowLeft className="h-3 w-3" /> CySec Tools
            </Link>
            <span>/</span>
          </>
        )}
        <span>{categoryName}</span>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-slate-800 bg-slate-900 text-2xl" aria-hidden>
          {meta.icon}
        </span>
        <div className="min-w-0">
          <h1 className="text-xl font-bold tracking-tight text-slate-50 sm:text-2xl">{meta.name}</h1>
          <p className="mt-0.5 text-sm text-slate-500">{meta.description}</p>
        </div>
      </div>
    </header>
  );
}

// ---------------------------------------------------------------------------
// Privacy / status badges
// ---------------------------------------------------------------------------

export function PrivacyBadge() {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-300">
      <ShieldCheck className="h-3.5 w-3.5" />
      Client-side processing. file & data diproses lokal di browser, tidak dikirim ke server.
    </span>
  );
}

// ---------------------------------------------------------------------------
// Panel
// ---------------------------------------------------------------------------

export function Panel({
  title,
  action,
  children,
  className,
}: {
  title?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn('rounded-xl border border-slate-800 bg-slate-900/50', className)}>
      {(title || action) && (
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 px-4 py-2.5">
          {title && (
            <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400">{title}</h2>
          )}
          {action}
        </div>
      )}
      <div className="p-4">{children}</div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Textarea berlabel (accessible)
// ---------------------------------------------------------------------------

export function LabeledTextarea({
  id,
  label,
  value,
  onChange,
  placeholder,
  rows = 8,
  mono = true,
  hint,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  rows?: number;
  mono?: boolean;
  hint?: string;
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-xs font-medium text-slate-400">
        {label}
      </label>
      <textarea
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        spellCheck={false}
        className={cn(
          'w-full resize-y rounded-lg border border-slate-700 bg-slate-950/70 p-3 text-sm text-slate-200 placeholder:text-slate-600',
          'focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30',
          mono && 'font-mono text-[13px] leading-5'
        )}
      />
      {hint && <p className="mt-1 text-xs text-slate-600">{hint}</p>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Copy / Clear / Swap / Download buttons
// ---------------------------------------------------------------------------

export function CopyButton({ text, label = 'Copy', className }: { text: string; label?: string; className?: string }) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<number | null>(null);
  useEffect(() => () => { if (timer.current) window.clearTimeout(timer.current); }, []);
  const copy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      if (timer.current) window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard tidak tersedia */
    }
  }, [text]);
  return (
    <Button type="button" variant="secondary" size="sm" onClick={copy} disabled={!text} className={className} aria-label={`Salin ${label}`}>
      {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Clipboard className="h-3.5 w-3.5" />}
      {copied ? 'Tersalin' : label}
    </Button>
  );
}

export function DownloadButton({ text, filename, label = 'Download', mime = 'text/plain' }: { text: string; filename: string; label?: string; mime?: string }) {
  const download = () => {
    const blob = new Blob([text], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };
  return (
    <Button type="button" variant="secondary" size="sm" onClick={download} disabled={!text} aria-label={`Unduh ${label}`}>
      <Download className="h-3.5 w-3.5" />
      {label}
    </Button>
  );
}

export function ClearButton({ onClick, label = 'Clear' }: { onClick: () => void; label?: string }) {
  return (
    <Button type="button" variant="ghost" size="sm" onClick={onClick} aria-label={`Hapus ${label}`}>
      <Trash2 className="h-3.5 w-3.5" />
      {label}
    </Button>
  );
}

export function SwapButton({ onClick, label = 'Swap' }: { onClick: () => void; label?: string }) {
  return (
    <Button type="button" variant="ghost" size="sm" onClick={onClick} aria-label={label}>
      <RefreshCw className="h-3.5 w-3.5" />
      {label}
    </Button>
  );
}

// ---------------------------------------------------------------------------
// Alert / notice
// ---------------------------------------------------------------------------

export function ErrorAlert({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <div role="alert" className="rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300">
      {message}
    </div>
  );
}

export function Notice({ children, tone = 'info' }: { children: React.ReactNode; tone?: 'info' | 'warn' | 'success' }) {
  const tones = {
    info: 'border-cyan-500/30 bg-cyan-500/10 text-cyan-200',
    warn: 'border-amber-500/30 bg-amber-500/10 text-amber-200',
    success: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200',
  };
  return <div className={cn('rounded-lg border px-4 py-3 text-sm', tones[tone])}>{children}</div>;
}

// ---------------------------------------------------------------------------
// Key-value table
// ---------------------------------------------------------------------------

export function KeyValueTable({ rows }: { rows: { k: string; v: React.ReactNode; warn?: boolean }[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <tbody>
          {rows.map(({ k, v, warn }, i) => (
            <tr key={i} className="border-b border-slate-800/60 last:border-0">
              <th scope="row" className="whitespace-nowrap py-1.5 pr-4 text-left align-top text-xs font-medium text-slate-500">
                {k}
              </th>
              <td className={cn('break-all py-1.5 font-mono text-[13px]', warn ? 'text-amber-300' : 'text-slate-300')}>{v}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tool notes (dokumentasi tool)
// ---------------------------------------------------------------------------

export interface ToolNote {
  title: string;
  content: string;
}

export function ToolNotes({ notes }: { notes: ToolNote[] }) {
  return (
    <Panel title="Dokumentasi tool" className="mt-6">
      <div className="space-y-4">
        {notes.map((n) => (
          <div key={n.title}>
            <h3 className="mb-1 text-sm font-semibold text-slate-200">{n.title}</h3>
            <p className="whitespace-pre-wrap text-sm leading-6 text-slate-400">{n.content}</p>
          </div>
        ))}
      </div>
    </Panel>
  );
}

// ---------------------------------------------------------------------------
// Disclaimer edukasi
// ---------------------------------------------------------------------------

export function Disclaimer({ text }: { text: string }) {
  return (
    <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
      ⚠️ {text}
    </div>
  );
}
