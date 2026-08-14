/**
 * Log Analyzer. Apache/Nginx access log, auth.log (sshd), dan log generik.
 * 100% client-side; tidak ada pengiriman log ke server.
 */

import { useMemo, useState } from 'react';
import { FileDrop, type LoadedFile } from '../../components/FileDrop';
import { CopyButton, DownloadButton, ErrorAlert, Notice, Panel, ToolNotes } from '../../components/ui';
import { analyzeLog, type LogAnalysis, type LogEvent } from '../../utils/logparse';
import { cn } from '../../../../lib/utils';
import type { ComponentType } from 'react';

type Tab = 'summary' | 'events' | 'ips' | 'status' | 'paths' | 'timeline' | 'auth' | 'suspicious';

const TABS: { id: Tab; label: string }[] = [
  { id: 'summary', label: 'Summary' },
  { id: 'events', label: 'Events' },
  { id: 'ips', label: 'IPs' },
  { id: 'status', label: 'Status/Method' },
  { id: 'paths', label: 'Paths' },
  { id: 'timeline', label: 'Timeline' },
  { id: 'auth', label: 'Auth (ssh)' },
  { id: 'suspicious', label: '⚠ Potentially suspicious' },
];

const FORMAT_LABEL: Record<string, string> = {
  'apache-combined': 'Apache/Nginx combined log',
  'apache-common': 'Apache common log',
  auth: 'auth.log (sshd / syslog)',
  generic: 'Generic / aplikasi',
};

function MiniBar({ label, value, max, color = 'bg-sky-500/70' }: { label: string; value: number; max: number; color?: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-40 shrink-0 truncate text-right font-mono text-xs text-slate-400">{label}</span>
      <div className="h-3 flex-1 overflow-hidden rounded bg-slate-800">
        <div className={cn('h-full', color)} style={{ width: `${max ? (value / max) * 100 : 0}%` }} />
      </div>
      <span className="w-14 shrink-0 font-mono text-xs text-slate-500">{value}</span>
    </div>
  );
}

function LogAnalyzerToolInner() {
  const [analysis, setAnalysis] = useState<LogAnalysis | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>('summary');
  const [filter, setFilter] = useState({ ip: '', status: '', method: '', keyword: '', limit: 500 });
  const [busy, setBusy] = useState(false);

  const run = (text: string) => {
    try {
      setAnalysis(analyzeLog(text));
      setTab('summary');
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menganalisis log.');
    }
  };

  const handleFile = async (files: LoadedFile[]) => {
    const f = files[0];
    if (!f) return;
    setBusy(true);
    try {
      await new Promise((r) => setTimeout(r, 30));
      const text = new TextDecoder('utf-8', { fatal: false }).decode(f.bytes);
      run(text);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal membaca file log.');
    } finally {
      setBusy(false);
    }
  };

  const events = useMemo(() => {
    if (!analysis) return [];
    let list = analysis.events;
    if (filter.ip) list = list.filter((e) => e.ip?.includes(filter.ip));
    if (filter.status) list = list.filter((e) => String(e.status ?? '') === filter.status);
    if (filter.method) list = list.filter((e) => e.method === filter.method);
    if (filter.keyword) {
      const k = filter.keyword.toLowerCase();
      list = list.filter((e) => e.raw.toLowerCase().includes(k));
    }
    return list.slice(0, filter.limit);
  }, [analysis, filter]);

  const exportText = useMemo(() => {
    if (!analysis) return '';
    return analysis.events.map((e) => e.raw).join('\n');
  }, [analysis]);

  return (
    <div className="space-y-4">
      <Notice tone="success">
        Log diproses secara lokal di browser dan tidak dikirim ke server. Parser mendeteksi format otomatis
        (Apache/Nginx combined, common log, auth.log sshd, generik).
      </Notice>

      <FileDrop
        accept=".log,.txt,.gz,.jsonl"
        multiple={false}
        onFiles={(f) => void handleFile(f)}
        loading={busy}
        hint="Upload file log, atau tempel langsung di bawah."
      />

      <Panel title="Atau tempel log">
        <textarea
          aria-label="Tempel isi log"
          rows={8}
          placeholder={'127.0.0.1 - - [14/Nov/2023:22:13:20 +0000] "GET /index.html HTTP/1.1" 200 2326 "-" "Mozilla/5.0"\nNov 14 22:13:21 host sshd[1234]: Failed password for root from 203.0.113.7 port 51234 ssh2'}
          onChange={(e) => {
            if (e.target.value.length > 200 && !analysis) run(e.target.value);
          }}
          onBlur={(e) => {
            if (e.target.value.trim()) run(e.target.value);
          }}
          className="w-full resize-y rounded-lg border border-slate-700 bg-slate-950/70 p-3 font-mono text-[12px] leading-5 text-slate-200 placeholder:text-slate-600 focus:border-indigo-500 focus:outline-none"
        />
        <p className="mt-1 text-xs text-slate-600">Tempel lalu klik di luar textarea (blur) untuk menganalisis.</p>
      </Panel>

      <ErrorAlert message={error} />

      {analysis && (
        <>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="scrollbar-thin flex gap-1.5 overflow-x-auto pb-1" role="tablist" aria-label="Tab hasil log">
              {TABS.map((t) => (
                <button
                  key={t.id}
                  role="tab"
                  aria-selected={tab === t.id}
                  onClick={() => setTab(t.id)}
                  className={cn(
                    'shrink-0 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors',
                    tab === t.id
                      ? 'border-indigo-500 bg-indigo-500/15 text-indigo-300'
                      : 'border-slate-700 text-slate-400 hover:border-slate-500 hover:text-slate-200'
                  )}
                >
                  {t.label}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-1.5">
              <CopyButton text={exportText} label="Export raw" />
              <DownloadButton text={exportText} filename="log-analysis.txt" label="Download" />
            </div>
          </div>

          {tab === 'summary' && (
            <div className="grid gap-4 lg:grid-cols-2">
              <Panel title="Ringkasan">
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-sm">
                    <tbody>
                      {[
                        ['Format terdeteksi', FORMAT_LABEL[analysis.format]],
                        ['Total baris', String(analysis.totalLines)],
                        ['Baris ter-parse', String(analysis.parsed)],
                        ['Baris tidak dikenali', String(analysis.errors)],
                        ['Unik IP', String(analysis.uniqueIps.length)],
                        ['Kegagalan auth', String(analysis.authFailures.length)],
                        ['HTTP 4xx', String(analysis.statuses.filter((st) => Number(st.status) >= 400 && Number(st.status) < 500).reduce((a, st) => a + st.count, 0))],
                        ['HTTP 5xx', String(analysis.statuses.filter((st) => Number(st.status) >= 500).reduce((a, st) => a + st.count, 0))],
                        ['Indikator mencurigakan', String(analysis.suspicious.length)],
                      ].map(([k, v]) => (
                        <tr key={k} className="border-b border-slate-800/60 last:border-0">
                          <th scope="row" className="py-1.5 pr-4 text-left text-xs font-medium text-slate-500">{k}</th>
                          <td className="py-1.5 font-mono text-[13px] text-slate-300">{v}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Panel>
              <Panel title="Top IP">
                <div className="space-y-1.5">
                  {analysis.uniqueIps.slice(0, 10).map((u) => (
                    <MiniBar key={u.ip} label={`${u.ip}`} value={u.count} max={analysis.uniqueIps[0]?.count ?? 1} color="bg-sky-500/70" />
                  ))}
                </div>
              </Panel>
            </div>
          )}

          {tab === 'events' && (
            <div className="space-y-3">
              <div className="grid gap-2 sm:grid-cols-5">
                <input value={filter.ip} onChange={(e) => setFilter((f) => ({ ...f, ip: e.target.value }))} placeholder="Filter IP…" aria-label="Filter IP" className="h-9 rounded-lg border border-slate-700 bg-slate-900 px-3 font-mono text-xs text-slate-200 focus:border-indigo-500 focus:outline-none" />
                <input value={filter.status} onChange={(e) => setFilter((f) => ({ ...f, status: e.target.value }))} placeholder="Status (mis. 404)…" aria-label="Filter status" className="h-9 rounded-lg border border-slate-700 bg-slate-900 px-3 font-mono text-xs text-slate-200 focus:border-indigo-500 focus:outline-none" />
                <input value={filter.method} onChange={(e) => setFilter((f) => ({ ...f, method: e.target.value }))} placeholder="Method (GET)…" aria-label="Filter method" className="h-9 rounded-lg border border-slate-700 bg-slate-900 px-3 font-mono text-xs text-slate-200 focus:border-indigo-500 focus:outline-none" />
                <input value={filter.keyword} onChange={(e) => setFilter((f) => ({ ...f, keyword: e.target.value }))} placeholder="Keyword…" aria-label="Filter keyword" className="h-9 rounded-lg border border-slate-700 bg-slate-900 px-3 font-mono text-xs text-slate-200 focus:border-indigo-500 focus:outline-none" />
                <select value={filter.limit} onChange={(e) => setFilter((f) => ({ ...f, limit: Number(e.target.value) }))} aria-label="Batas baris" className="h-9 rounded-lg border border-slate-700 bg-slate-900 px-2 text-xs text-slate-200">
                  {[100, 500, 1000, 5000].map((n) => (
                    <option key={n} value={n}>{n} baris</option>
                  ))}
                </select>
              </div>
              <Panel title={`Events (menampilkan ${events.length})`}>
                <div className="max-h-[36rem] overflow-auto">
                  <table className="w-full border-collapse text-xs">
                    <thead className="sticky top-0 bg-slate-900">
                      <tr className="text-left text-slate-500">
                        <th className="px-2 py-1.5">#</th>
                        <th className="px-2 py-1.5">Waktu</th>
                        <th className="px-2 py-1.5">IP</th>
                        <th className="px-2 py-1.5">Method</th>
                        <th className="px-2 py-1.5">Status</th>
                        <th className="px-2 py-1.5">Detail</th>
                      </tr>
                    </thead>
                    <tbody>
                      {events.map((e) => (
                        <EventRow key={e.lineNumber} e={e} />
                      ))}
                    </tbody>
                  </table>
                </div>
              </Panel>
            </div>
          )}

          {tab === 'ips' && (
            <Panel title="IP unik">
              <div className="space-y-1.5">
                {analysis.uniqueIps.map((u) => (
                  <MiniBar
                    key={u.ip}
                    label={`${u.ip}${u.failures ? ` (${u.failures} gagal)` : ''}`}
                    value={u.count}
                    max={analysis.uniqueIps[0]?.count ?? 1}
                    color={u.failures > 0 ? 'bg-amber-500/70' : 'bg-sky-500/70'}
                  />
                ))}
              </div>
            </Panel>
          )}

          {tab === 'status' && (
            <div className="grid gap-4 lg:grid-cols-2">
              <Panel title="Status codes">
                <div className="space-y-1.5">
                  {analysis.statuses.map((s) => (
                    <MiniBar key={s.status} label={s.status} value={s.count} max={analysis.statuses[0]?.count ?? 1} color={Number(s.status) >= 500 ? 'bg-red-500/70' : Number(s.status) >= 400 ? 'bg-amber-500/70' : 'bg-emerald-500/70'} />
                  ))}
                </div>
              </Panel>
              <Panel title="HTTP methods">
                <div className="space-y-1.5">
                  {analysis.methods.map((m) => (
                    <MiniBar key={m.method} label={m.method} value={m.count} max={analysis.methods[0]?.count ?? 1} />
                  ))}
                </div>
              </Panel>
            </div>
          )}

          {tab === 'paths' && (
            <Panel title="Paths teratas">
              <div className="space-y-1.5">
                {analysis.paths.map((p) => (
                  <MiniBar key={p.path} label={p.path} value={p.count} max={analysis.paths[0]?.count ?? 1} />
                ))}
              </div>
            </Panel>
          )}

          {tab === 'timeline' && (
            <Panel title="Timeline (per menit)">
              {analysis.timeline.length === 0 && <p className="text-sm text-slate-500">Tidak ada timestamp yang bisa dipetakan.</p>}
              {analysis.timeline.length > 0 && (
                <>
                  <div className="flex h-32 items-end gap-px overflow-x-auto">
                    {analysis.timeline.map((t) => {
                      const max = Math.max(...analysis.timeline.map((x) => x.count), 1);
                      return (
                        <div
                          key={t.key}
                          className="min-w-[3px] flex-1 bg-cyan-500/60 hover:bg-cyan-400"
                          style={{ height: `${(t.count / max) * 100}%` }}
                          title={`${t.key}: ${t.count} event`}
                        />
                      );
                    })}
                  </div>
                  <p className="mt-2 text-xs text-slate-500">{analysis.timeline[0]?.key} → {analysis.timeline[analysis.timeline.length - 1]?.key}</p>
                </>
              )}
            </Panel>
          )}

          {tab === 'auth' && (
            <Panel title="Autentikasi (auth.log / sshd)">
              {analysis.authFailures.length === 0 && analysis.events.filter((e) => e.source === 'ssh').length === 0 && (
                <p className="text-sm text-slate-500">Tidak ada event SSH/auth terdeteksi.</p>
              )}
              <div className="space-y-2">
                {analysis.authFailures.map((u) => (
                  <div key={u.user} className="flex items-center justify-between rounded border border-slate-800 bg-slate-900/50 px-3 py-1.5">
                    <span className="font-mono text-sm text-amber-200">{u.user}</span>
                    <span className="font-mono text-xs text-slate-500">{u.count} gagal</span>
                  </div>
                ))}
              </div>
              {analysis.events.filter((e) => e.source === 'ssh').length > 0 && (
                <div className="mt-4">
                  <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">Event SSH (contoh)</h3>
                  <div className="max-h-64 space-y-1 overflow-auto">
                    {analysis.events.filter((e) => e.source === 'ssh').slice(0, 50).map((e) => (
                      <p key={e.lineNumber} className="break-all font-mono text-[11px] text-slate-400">{e.raw}</p>
                    ))}
                  </div>
                </div>
              )}
            </Panel>
          )}

          {tab === 'suspicious' && (
            <Panel title="Indikator mencurigakan">
              {analysis.suspicious.length === 0 && (
                <p className="text-sm text-emerald-300">✅ Tidak ada pola mencurigakan terdeteksi oleh heuristik dasar.</p>
              )}
              <div className="space-y-2">
                {analysis.suspicious.map((s, i) => (
                  <div key={i} className={cn('rounded-lg border px-3 py-2.5', s.severity === 'high' ? 'border-red-500/40 bg-red-500/10' : s.severity === 'medium' ? 'border-amber-500/40 bg-amber-500/10' : 'border-sky-500/30 bg-sky-500/5')}>
                    <p className={cn('text-sm font-medium', s.severity === 'high' ? 'text-red-300' : s.severity === 'medium' ? 'text-amber-300' : 'text-sky-300')}>
                      {s.severity === 'high' ? '🔴' : s.severity === 'medium' ? '🟠' : '🔵'} {s.title}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-400">{s.detail}</p>
                  </div>
                ))}
              </div>
              <p className="mt-3 text-xs text-slate-500">
                Heuristik: brute-force SSH (≥5 gagal/IP), volume request tinggi, error spike 5xx, dan flood 404.
                Istilah "potentially suspicious" dipakai karena heuristik bukan bukti definitif. Analisis manusia tetap diperlukan.
              </p>
            </Panel>
          )}
        </>
      )}

      <ToolNotes
        notes={[
          { title: 'What is this?', content: 'Parser log dengan deteksi format otomatis: Apache/Nginx combined & common log, auth.log (sshd/syslog), dan log generik (ekstrak IP + timestamp).' },
          { title: 'How to use', content: 'Upload file log atau tempel isinya. Gunakan tab untuk eksplorasi dan filter IP/status/method/keyword pada tab Events.' },
          { title: 'Input', content: 'File log teks atau paste. Ukuran besar diproses bertahap; untuk file sangat besar pertimbangkan membagi log.' },
          { title: 'Output', content: 'Ringkasan, event, IP, status/method, path, timeline, auth failures, indikator mencurigakan.' },
          { title: 'Notes', content: 'Log bisa berisi data sensitif. semua diproses lokal, tidak dikirim ke server. Format yang tidak dikenali tetap diekstrak IP/timestamp-nya (source: app).' },
        ]}
      />
    </div>
  );
}

function EventRow({ e }: { e: LogEvent }) {
  return (
    <tr className="border-t border-slate-800/50">
      <td className="px-2 py-1 font-mono text-slate-600">{e.lineNumber}</td>
      <td className="whitespace-nowrap px-2 py-1 font-mono text-slate-500">{e.timestamp ?? '-'}</td>
      <td className="px-2 py-1 font-mono text-slate-400">{e.ip ?? '-'}</td>
      <td className="px-2 py-1 font-mono text-slate-400">{e.method ?? '-'}</td>
      <td className="px-2 py-1">
        {e.status != null ? (
          <span className={cn('rounded px-1.5 py-0.5 text-[10px]', e.status >= 500 ? 'bg-red-500/10 text-red-300' : e.status >= 400 ? 'bg-amber-500/10 text-amber-300' : 'bg-emerald-500/10 text-emerald-300')}>
            {e.status}
          </span>
        ) : (
          <span className={cn('rounded px-1.5 py-0.5 text-[10px]', e.authResult === 'failure' ? 'bg-red-500/10 text-red-300' : e.authResult === 'success' ? 'bg-emerald-500/10 text-emerald-300' : 'bg-slate-700/50 text-slate-400')}>
            {e.authResult === 'failure' ? 'AUTH FAIL' : e.authResult === 'success' ? 'AUTH OK' : e.authResult === 'invalid' ? 'INVALID USER' : '-'}
          </span>
        )}
      </td>
      <td className="max-w-[30rem] truncate px-2 py-1 text-slate-300" title={e.raw}>
        {e.path ?? e.message ?? e.raw}
      </td>
    </tr>
  );
}

export const tools: Record<string, ComponentType> = {
  'log-analyzer': LogAnalyzerToolInner,
};

export default LogAnalyzerToolInner;
