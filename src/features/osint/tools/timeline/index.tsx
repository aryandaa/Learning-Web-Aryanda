/**
 * Timeline Analyzer. deteksi timestamp, normalisasi ISO, visual, filter, export.
 */

import { useMemo, useState } from 'react';
import { Button } from '../../../../components/ui/button';
import {
  CopyButton, ErrorAlert, LabeledTextarea, Notice, Panel, ToolNotes,
} from '../../../cysec-tools/components/ui';
import { extractTimeline, sortEvents, filterEvents } from '../../utils/timeline';
import { exportCsv, exportJson, fmtNumber } from '../../utils/shared';
import { cn } from '../../../../lib/utils';
import type { ComponentType } from 'react';

function TimelineAnalyzerTool() {
  const [input, setInput] = useState('');
  const [dayFirst, setDayFirst] = useState(true);
  const [dir, setDir] = useState<'asc' | 'desc'>('asc');
  const [keyword, setKeyword] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [source, setSource] = useState('');
  const [events, setEvents] = useState<ReturnType<typeof extractTimeline> | null>(null);
  const [error, setError] = useState<string | null>(null);

  const run = () => {
    setError(null);
    if (!input.trim()) {
      setError('Tempel teks/log untuk dideteksi timestamp-nya.');
      setEvents(null);
      return;
    }
    setEvents(extractTimeline(input, { dayFirst }));
  };

  const visible = useMemo(() => {
    if (!events) return [];
    return filterEvents(sortEvents(events, dir), { keyword: keyword || undefined, from: from || undefined, to: to || undefined, source: source || undefined });
  }, [events, dir, keyword, from, to, source]);

  const sources = useMemo(() => Array.from(new Set(events?.map((e) => e.source) ?? [])).sort(), [events]);

  const rows = visible.map((e) => ({ Timestamp: e.iso, Format: e.format, Source: e.source, Line: e.line }));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Button onClick={run}>Deteksi timeline</Button>
        <label className="flex items-center gap-1.5 text-xs text-slate-400">
          <input type="checkbox" checked={dayFirst} onChange={(e) => setDayFirst(e.target.checked)} className="accent-accent-500" />
          DD/MM/YYYY (jika tidak dicentang: MM/DD/YYYY)
        </label>
      </div>

      <Panel title="Input">
        <LabeledTextarea
          id="osint-timeline-input"
          label="Log / teks"
          value={input}
          onChange={setInput}
          rows={7}
          placeholder={'2026-08-13 10:20:00 login ok\n2026-08-13T10:21:00Z failed password\n13/08/2026 10:22 outbound to 8.8.8.8'}
        />
      </Panel>

      <ErrorAlert message={error} />

      {events && (
        <>
          <Panel
            title={`${events.length} timestamp terdeteksi (${visible.length} tampil)`}
            action={
              <>
                <Button type="button" variant="secondary" size="sm" onClick={() => setDir(dir === 'asc' ? 'desc' : 'asc')}>
                  Sort: {dir === 'asc' ? 'ascending ↑' : 'descending ↓'}
                </Button>
                <CopyButton text={visible.map((e) => e.iso).join('\n')} />
                <Button type="button" variant="secondary" size="sm" onClick={() => exportJson(rows, 'timeline.json')}>JSON</Button>
                <Button type="button" variant="secondary" size="sm" onClick={() => exportCsv(rows, 'timeline.csv')}>CSV</Button>
              </>
            }
          >
            <div className="mb-4 grid gap-2 sm:grid-cols-5">
              <input value={keyword} onChange={(e) => setKeyword(e.target.value)} placeholder="Cari event…" aria-label="Cari event" className="h-9 rounded-lg border border-slate-700 bg-slate-900 px-3 text-xs text-slate-200 focus:border-accent-500 focus:outline-none" />
              <input type="datetime-local" value={from} onChange={(e) => setFrom(e.target.value)} aria-label="Dari tanggal" className="h-9 rounded-lg border border-slate-700 bg-slate-900 px-2 text-xs text-slate-200" />
              <input type="datetime-local" value={to} onChange={(e) => setTo(e.target.value)} aria-label="Sampai tanggal" className="h-9 rounded-lg border border-slate-700 bg-slate-900 px-2 text-xs text-slate-200" />
              <select value={source} onChange={(e) => setSource(e.target.value)} aria-label="Filter sumber" className="h-9 rounded-lg border border-slate-700 bg-slate-900 px-2 text-xs text-slate-200">
                <option value="">Semua sumber</option>
                {sources.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
              <span className="hidden sm:block" />
            </div>

            {/* Visual timeline */}
            {visible.length > 0 && (
              <div className="mb-4 flex h-24 items-end gap-px overflow-x-auto rounded-lg border border-slate-800 bg-slate-950/60 p-2">
                {visible.map((e, i) => {
                  const times = visible.map((x) => new Date(x.iso).getTime());
                  const min = Math.min(...times);
                  const max = Math.max(...times);
                  const h = max === min ? 100 : ((new Date(e.iso).getTime() - min) / (max - min)) * 100;
                  return (
                    <div
                      key={i}
                      className="min-w-[3px] flex-1 rounded-t bg-cyan-500/60 hover:bg-cyan-400"
                      style={{ height: `${Math.max(8, h)}%` }}
                      title={`${e.iso} (${e.source}). ${e.line}`}
                    />
                  );
                })}
              </div>
            )}

            <div className="max-h-[28rem] space-y-1 overflow-auto">
              {visible.length === 0 && <p className="text-sm text-slate-500">Tidak ada event yang cocok dengan filter.</p>}
              {visible.map((e, i) => (
                <div key={i} className={cn('rounded border border-slate-800/70 bg-slate-900/40 px-3 py-1.5')}>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5">
                    <code className="font-mono text-xs text-emerald-300">{e.iso}</code>
                    <span className="rounded bg-slate-800 px-1.5 py-0.5 text-[10px] text-slate-500">{e.format}</span>
                    <span className="text-[10px] text-slate-600">{e.source}</span>
                  </div>
                  <p className="mt-0.5 truncate font-mono text-[11px] text-slate-400" title={e.line}>{e.line}</p>
                </div>
              ))}
            </div>

            <p className="mt-2 text-xs text-slate-500">Total event: {fmtNumber(events.length)}</p>
          </Panel>

          <Notice tone="info">
            Format tanggal ambigu (DD/MM vs MM/DD) ditentukan oleh opsi di atas. Tanggal syslog (Mon DD HH:MM:SS)
            menggunakan tahun berjalan.
          </Notice>

          <ToolNotes
            notes={[
              { title: 'What is this?', content: 'Mendeteksi timestamp dari teks dan menormalisasinya ke ISO 8601 untuk analisis kronologis.' },
              { title: 'How to use', content: 'Tempel log/teks, klik Deteksi timeline. Gunakan filter & sort untuk eksplorasi.' },
              { title: 'Input', content: 'Teks dengan timestamp (ISO, DD/MM/YYYY, syslog).' },
              { title: 'Output', content: 'Daftar event ISO + visual + export JSON/CSV.' },
              { title: 'Notes', content: 'Semua lokal (privacy: LOCAL).' },
            ]}
          />
        </>
      )}
    </div>
  );
}

export const tools: Record<string, ComponentType> = { timeline: TimelineAnalyzerTool };
export default TimelineAnalyzerTool;
