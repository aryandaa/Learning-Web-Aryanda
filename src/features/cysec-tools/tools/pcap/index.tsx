/**
 * PCAP Analyzer — parsing .pcap/.pcapng 100% lokal dengan tab ringkasan,
 * paket, conversation, protocol, DNS, HTTP, TLS SNI, timeline, dan
 * indikator mencurigakan. Tidak ada upload; tidak ada decryption TLS.
 */

import { useMemo, useState } from 'react';
import { FileDrop, largeFileHint, type LoadedFile } from '../../components/FileDrop';
import { CopyButton, DownloadButton, ErrorAlert, Notice, Panel, ToolNotes } from '../../components/ui';
import { analyzePcap, type PcapAnalysis, type PacketInfo } from '../../utils/pcap';
import { formatDate } from '../../utils/files';
import { toArrayBuffer } from '../../utils/bytes';
import { cn } from '../../../../lib/utils';
import type { ComponentType } from 'react';

type Tab = 'summary' | 'packets' | 'conversations' | 'protocols' | 'dns' | 'http' | 'hosts' | 'timeline' | 'suspicious';

const TABS: { id: Tab; label: string }[] = [
  { id: 'summary', label: 'Summary' },
  { id: 'packets', label: 'Packets' },
  { id: 'conversations', label: 'Conversations' },
  { id: 'protocols', label: 'Protocols' },
  { id: 'dns', label: 'DNS' },
  { id: 'http', label: 'HTTP' },
  { id: 'hosts', label: 'Hosts' },
  { id: 'timeline', label: 'Timeline' },
  { id: 'suspicious', label: '⚠ Suspicious' },
];

function fmtTs(ts: number | null): string {
  if (ts == null) return '—';
  return formatDate(ts * 1000);
}

function MiniBar({ value, max, label }: { value: number; max: number; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-32 shrink-0 truncate text-right font-mono text-xs text-slate-400">{label}</span>
      <div className="h-3 flex-1 overflow-hidden rounded bg-slate-800">
        <div className="h-full bg-cyan-500/70" style={{ width: `${max ? (value / max) * 100 : 0}%` }} />
      </div>
      <span className="w-16 shrink-0 font-mono text-xs text-slate-500">{value}</span>
    </div>
  );
}

function SummaryTab({ analysis }: { analysis: PcapAnalysis }) {
  return (
    <div className="space-y-4">
      <Panel title="Capture info">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <tbody>
              {[
                ['Format', analysis.format === 'pcap' ? 'PCAP (klasik)' : analysis.format === 'pcapng' ? 'PCAPNG' : '—'],
                ['Paket', String(analysis.packetCount)],
                ['Link type', String(analysis.linkType)],
                ['Snaplen', String(analysis.snaplen)],
                ['Interface', String(analysis.interfaceCount)],
                ['Mulai capture', fmtTs(analysis.firstTs)],
                ['Akhir capture', fmtTs(analysis.lastTs)],
                ['Durasi', analysis.duration != null ? `${analysis.duration.toFixed(3)} s` : '—'],
                ['Truncated', analysis.truncated ? 'Ya (batas paket tercapai)' : 'Tidak'],
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
      <Panel title="Protocol distribution">
        <div className="space-y-1.5">
          {analysis.protocols.slice(0, 15).map((p) => (
            <MiniBar key={p.proto} label={`${p.proto} (${p.bytes.toLocaleString()} B)`} value={p.count} max={analysis.protocols[0]?.count ?? 1} />
          ))}
        </div>
      </Panel>
      <Panel title="Packet size distribution">
        <div className="space-y-1.5">
          {analysis.packetSizes.map((s) => (
            <MiniBar key={s.range} label={s.range} value={s.count} max={Math.max(...analysis.packetSizes.map((x) => x.count), 1)} />
          ))}
        </div>
      </Panel>
      {analysis.errors.length > 0 && (
        <Notice tone="warn">
          <strong>Catatan parsing:</strong>
          <ul className="mt-1 list-inside list-disc space-y-0.5">
            {analysis.errors.map((e, i) => (
              <li key={i}>{e}</li>
            ))}
          </ul>
        </Notice>
      )}
    </div>
  );
}

function PacketsTab({ analysis, filter }: { analysis: PcapAnalysis; filter: { ip: string; proto: string; text: string; limit: number } }) {
  const packets = useMemo(() => {
    let list = analysis.packets;
    if (filter.ip) {
      list = list.filter((p) => p.src.includes(filter.ip) || p.dst.includes(filter.ip));
    }
    if (filter.proto) {
      list = list.filter((p) => p.proto === filter.proto);
    }
    if (filter.text) {
      const t = filter.text.toLowerCase();
      list = list.filter(
        (p) =>
          p.summary.toLowerCase().includes(t) ||
          p.src.toLowerCase().includes(t) ||
          p.dst.toLowerCase().includes(t) ||
          (p.dnsQuery ?? '').toLowerCase().includes(t) ||
          (p.httpHost ?? '').toLowerCase().includes(t) ||
          (p.tlsSni ?? '').toLowerCase().includes(t)
      );
    }
    return list.slice(0, filter.limit);
  }, [analysis, filter]);

  return (
    <Panel title={`Paket (menampilkan ${packets.length} dari ${analysis.packets.length})`}>
      <div className="max-h-[36rem] overflow-auto">
        <table className="w-full border-collapse text-xs">
          <thead className="sticky top-0 bg-slate-900">
            <tr className="text-left text-slate-500">
              <th className="px-2 py-1.5">#</th>
              <th className="px-2 py-1.5">Waktu</th>
              <th className="px-2 py-1.5">Proto</th>
              <th className="px-2 py-1.5">Source</th>
              <th className="px-2 py-1.5">Destination</th>
              <th className="px-2 py-1.5">Info</th>
            </tr>
          </thead>
          <tbody>
            {packets.map((p) => (
              <tr key={p.index} className="border-t border-slate-800/50">
                <td className="px-2 py-1 font-mono text-slate-600">{p.index}</td>
                <td className="whitespace-nowrap px-2 py-1 font-mono text-slate-500">{p.ts != null ? new Date(p.ts * 1000).toISOString().slice(11, 23) : '—'}</td>
                <td className="px-2 py-1">
                  <span className={cn(
                    'rounded px-1.5 py-0.5 text-[10px] font-medium',
                    p.proto === 'TCP' && 'bg-sky-500/10 text-sky-300',
                    p.proto === 'UDP' && 'bg-violet-500/10 text-violet-300',
                    p.proto === 'DNS' && 'bg-amber-500/10 text-amber-300',
                    p.proto === 'HTTP' && 'bg-emerald-500/10 text-emerald-300',
                    p.proto === 'TLS' && 'bg-indigo-500/10 text-indigo-300',
                    p.proto === 'ARP' && 'bg-rose-500/10 text-rose-300',
                    p.proto === 'ICMP' && 'bg-cyan-500/10 text-cyan-300',
                    !['TCP', 'UDP', 'DNS', 'HTTP', 'TLS', 'ARP', 'ICMP'].includes(p.proto) && 'bg-slate-700/50 text-slate-400'
                  )}>
                    {p.proto}
                  </span>
                </td>
                <td className="px-2 py-1 font-mono text-slate-400">{p.srcPort ? `${p.src}:${p.srcPort}` : p.src}</td>
                <td className="px-2 py-1 font-mono text-slate-400">{p.dstPort ? `${p.dst}:${p.dstPort}` : p.dst}</td>
                <td className="max-w-[24rem] truncate px-2 py-1 text-slate-300" title={p.summary}>{p.summary}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}

export const tools: Record<string, ComponentType> = {
  pcap: PcapTool,
};

export default PcapTool;

function PcapTool() {
  const [file, setFile] = useState<LoadedFile | null>(null);
  const [analysis, setAnalysis] = useState<PcapAnalysis | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState<Tab>('summary');
  const [filter, setFilter] = useState({ ip: '', proto: '', text: '', limit: 500 });

  const handleFile = async (loaded: LoadedFile[]) => {
    const f = loaded[0];
    if (!f) return;
    setError(null);
    setBusy(true);
    try {
      // proses tanpa memblokir render pertama
      await new Promise((r) => setTimeout(r, 30));
      const result = analyzePcap(toArrayBuffer(f.bytes), f.file.name);
      setFile(f);
      setAnalysis(result);
      setTab('summary');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'PCAP tidak dapat diparsing.');
      setAnalysis(null);
    } finally {
      setBusy(false);
    }
  };

  const packetExport = useMemo(() => {
    if (!analysis) return '';
    return analysis.packets
      .map((p) => `${p.index}\t${p.ts ?? ''}\t${p.proto}\t${p.src}\t${p.dst}\t${p.summary}`)
      .join('\n');
  }, [analysis]);

  return (
    <div className="space-y-4">
      <Notice tone="success">
        PCAP diproses secara lokal di browser dan tidak dikirim ke server. Tidak ada decryption TLS — hanya metadata
        (SNI, versi, record). Tool untuk pembelajaran, CTF, forensik, dan analisis defensif.
      </Notice>

      <FileDrop
        accept=".pcap,.pcapng,application/vnd.tcpdump.pcap,application/x-pcapng"
        multiple={false}
        onFiles={(f) => void handleFile(f)}
        loading={busy}
        hint="Upload .pcap / .pcapng — diparsing lokal (PCAP klasik & PCAPNG: EPB/SPB/PB)."
      />
      {file && <p className="text-xs text-slate-500">{file.file.name} · {file.bytes.length.toLocaleString()} byte {largeFileHint(file.bytes.length) ? '· ⚠ file besar — parsing bisa lama' : ''}</p>}
      <ErrorAlert message={error} />

      {analysis && (
        <>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="scrollbar-thin flex gap-1.5 overflow-x-auto pb-1" role="tablist" aria-label="Tab hasil">
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
              <CopyButton text={packetExport} label="Export TSV" />
              <DownloadButton text={packetExport} filename="pcap-analysis.tsv" label="Download" />
            </div>
          </div>

          {tab === 'packets' && (
            <div className="space-y-3">
              <div className="grid gap-2 sm:grid-cols-4">
                <input
                  value={filter.ip}
                  onChange={(e) => setFilter((f) => ({ ...f, ip: e.target.value }))}
                  placeholder="Filter IP (src/dst)…"
                  aria-label="Filter IP"
                  className="h-9 rounded-lg border border-slate-700 bg-slate-900 px-3 font-mono text-xs text-slate-200 focus:border-indigo-500 focus:outline-none"
                />
                <select
                  value={filter.proto}
                  onChange={(e) => setFilter((f) => ({ ...f, proto: e.target.value }))}
                  aria-label="Filter protocol"
                  className="h-9 rounded-lg border border-slate-700 bg-slate-900 px-2 text-xs text-slate-200"
                >
                  <option value="">Semua protocol</option>
                  {analysis.protocols.map((p) => (
                    <option key={p.proto} value={p.proto}>{p.proto}</option>
                  ))}
                </select>
                <input
                  value={filter.text}
                  onChange={(e) => setFilter((f) => ({ ...f, text: e.target.value }))}
                  placeholder="Search (host, query, SNI)…"
                  aria-label="Search paket"
                  className="h-9 rounded-lg border border-slate-700 bg-slate-900 px-3 text-xs text-slate-200 focus:border-indigo-500 focus:outline-none"
                />
                <select
                  value={filter.limit}
                  onChange={(e) => setFilter((f) => ({ ...f, limit: Number(e.target.value) }))}
                  aria-label="Batas jumlah paket"
                  className="h-9 rounded-lg border border-slate-700 bg-slate-900 px-2 text-xs text-slate-200"
                >
                  {[100, 500, 1000, 5000].map((n) => (
                    <option key={n} value={n}>{n} paket</option>
                  ))}
                </select>
              </div>
              <PacketsTab analysis={analysis} filter={filter} />
            </div>
          )}

          {tab === 'summary' && <SummaryTab analysis={analysis} />}

          {tab === 'conversations' && (
            <Panel title="Conversations (top 200)">
              <div className="max-h-[32rem] overflow-auto">
                <table className="w-full border-collapse text-xs">
                  <thead className="sticky top-0 bg-slate-900">
                    <tr className="text-left text-slate-500">
                      <th className="px-2 py-1.5">A ↔ B</th>
                      <th className="px-2 py-1.5">Paket</th>
                      <th className="px-2 py-1.5">Bytes</th>
                      <th className="px-2 py-1.5">Protocol</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analysis.conversations.map((c) => (
                      <tr key={c.key} className="border-t border-slate-800/50">
                        <td className="px-2 py-1 font-mono text-slate-300">{c.key}</td>
                        <td className="px-2 py-1 font-mono text-slate-400">{c.packets}</td>
                        <td className="px-2 py-1 font-mono text-slate-400">{c.bytes.toLocaleString()}</td>
                        <td className="px-2 py-1 text-slate-500">{Array.from(c.protocols).join(', ')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Panel>
          )}

          {tab === 'protocols' && (
            <Panel title="Protocols">
              <div className="space-y-1.5">
                {analysis.protocols.map((p) => (
                  <MiniBar key={p.proto} label={`${p.proto}`} value={p.count} max={analysis.protocols[0]?.count ?? 1} />
                ))}
              </div>
              <h3 className="mt-4 mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">TCP flags</h3>
              <div className="flex flex-wrap gap-2">
                {analysis.tcpFlags.length === 0 && <p className="text-sm text-slate-500">Tidak ada flag TCP (mungkin bukan capture TCP).</p>}
                {analysis.tcpFlags.map((f) => (
                  <span key={f.flag} className="rounded border border-slate-700 bg-slate-900 px-2 py-1 font-mono text-xs text-slate-300">
                    {f.flag}: {f.count}
                  </span>
                ))}
              </div>
            </Panel>
          )}

          {tab === 'dns' && (
            <Panel title="DNS queries">
              {analysis.dnsQueries.length === 0 && <p className="text-sm text-slate-500">Tidak ada query DNS terdeteksi.</p>}
              <div className="max-h-[32rem] space-y-1 overflow-auto">
                {analysis.dnsQueries.map((q) => (
                  <div key={q.query} className="flex items-center justify-between gap-3 rounded border border-slate-800/60 bg-slate-900/40 px-3 py-1.5">
                    <span className="truncate font-mono text-xs text-slate-300">{q.query}</span>
                    <span className="shrink-0 font-mono text-xs text-slate-500">{q.count}</span>
                  </div>
                ))}
              </div>
            </Panel>
          )}

          {tab === 'http' && (
            <Panel title="HTTP hosts">
              {analysis.httpHosts.length === 0 && <p className="text-sm text-slate-500">Tidak ada traffic HTTP terdeteksi (host dari header Host).</p>}
              <div className="max-h-[32rem] space-y-2 overflow-auto">
                {analysis.httpHosts.map((h) => (
                  <div key={h.host} className="rounded-lg border border-slate-800 bg-slate-900/40 px-3 py-2">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-sm text-slate-200">{h.host}</span>
                      <span className="font-mono text-xs text-slate-500">{h.count} request</span>
                    </div>
                    <div className="mt-1 flex flex-wrap gap-1.5">
                      {Object.entries(h.methods).map(([m, c]) => (
                        <span key={m} className="rounded bg-emerald-500/10 px-1.5 py-0.5 text-[10px] text-emerald-300">{m}: {c}</span>
                      ))}
                      {Object.entries(h.statuses).map(([s, c]) => (
                        <span key={s} className={cn('rounded px-1.5 py-0.5 text-[10px]', Number(s) >= 500 ? 'bg-red-500/10 text-red-300' : Number(s) >= 400 ? 'bg-amber-500/10 text-amber-300' : 'bg-slate-700/50 text-slate-400')}>
                          {s}: {c}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </Panel>
          )}

          {tab === 'hosts' && (
            <div className="grid gap-4 lg:grid-cols-2">
              <Panel title="Top talkers (source IP)">
                <div className="space-y-1.5">
                  {analysis.topTalkers.map((t) => (
                    <MiniBar key={t.ip} label={`${t.ip} (${t.bytes.toLocaleString()} B)`} value={t.packets} max={analysis.topTalkers[0]?.packets ?? 1} />
                  ))}
                </div>
              </Panel>
              <Panel title="TLS SNI (Server Name Indication)">
                {analysis.tlsSnis.length === 0 && <p className="text-sm text-slate-500">Tidak ada ClientHello dengan SNI terdeteksi.</p>}
                <div className="max-h-96 space-y-1 overflow-auto">
                  {analysis.tlsSnis.map((s) => (
                    <div key={s.sni} className="flex items-center justify-between gap-3 rounded border border-slate-800/60 bg-slate-900/40 px-3 py-1.5">
                      <span className="truncate font-mono text-xs text-slate-300">{s.sni}</span>
                      <span className="shrink-0 font-mono text-xs text-slate-500">{s.count}</span>
                    </div>
                  ))}
                </div>
                <p className="mt-3 text-xs text-slate-500">
                  SNI dibaca dari ClientHello tanpa decrypt. SNI menunjukkan host tujuan (DNS lookups lain bisa dikonfirmasi lewat tab DNS).
                </p>
              </Panel>
            </div>
          )}

          {tab === 'timeline' && (
            <Panel title="Timeline (paket/detik)">
              {analysis.timeline.length === 0 && <p className="text-sm text-slate-500">Tidak ada timestamp.</p>}
              {analysis.timeline.length > 0 && (
                <>
                  <div className="flex h-32 items-end gap-px overflow-x-auto">
                    {analysis.timeline.map((t) => {
                      const max = Math.max(...analysis.timeline.map((x) => x.count), 1);
                      return (
                        <div
                          key={t.ts}
                          className="min-w-[3px] flex-1 bg-cyan-500/60 hover:bg-cyan-400"
                          style={{ height: `${(t.count / max) * 100}%` }}
                          title={`${new Date(t.ts * 1000).toISOString()}: ${t.count} paket`}
                        />
                      );
                    })}
                  </div>
                  <p className="mt-2 text-xs text-slate-500">
                    {fmtTs(analysis.firstTs)} → {fmtTs(analysis.lastTs)}
                  </p>
                </>
              )}
            </Panel>
          )}

          {tab === 'suspicious' && (
            <Panel title="Indikator mencurigakan">
              {analysis.suspicious.length === 0 && (
                <p className="text-sm text-emerald-300">✅ Tidak ada indikator mencurigakan yang terdeteksi oleh heuristik dasar.</p>
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
                Heuristik sederhana (SYN flood, port scan, 404 flood, volume). Ini alat bantu — keputusan forensik tetap butuh analisis manusia.
              </p>
            </Panel>
          )}
        </>
      )}

      <ToolNotes
        notes={[
          { title: 'What is this?', content: 'Parser PCAP/PCAPNG murni browser: membaca global header, paket, frame Ethernet/IPv4/IPv6, TCP/UDP/ICMP/ARP, DNS query, HTTP (host/method/status), dan SNI TLS dari ClientHello (tanpa decrypt).' },
          { title: 'How to use', content: 'Export capture dari Wireshark/tcpdump (`.pcap` atau `.pcapng`) lalu upload. Gunakan tab untuk menjelajah, filter IP/protocol/teks pada tab Packets.' },
          { title: 'Input', content: 'File .pcap / .pcapng. Batas 500.000 paket per parse (file lebih besar di-truncate dengan peringatan).' },
          { title: 'Output', content: 'Summary, daftar paket, conversation, distribusi protocol, DNS, HTTP, TLS SNI, timeline, indikator mencurigakan. Export TSV tersedia.' },
          { title: 'Notes', content: 'Jangan upload PCAP sensitif ke layanan eksternal — tool ini tidak pernah mengirim data. TLS TIDAK di-decrypt; payload terenkripsi tetap rahasia. Dukungan linktype: Ethernet (1) dan Raw IP (101/228); linktype lain ditandai.' },
        ]}
      />
    </div>
  );
}
