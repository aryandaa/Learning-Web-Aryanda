/**
 * DNS Analyzer. DNS-over-HTTPS (Cloudflare/Google), multi-record.
 */

import { useState } from 'react';
import { Button } from '../../../../components/ui/button';
import {
  CopyButton, ErrorAlert, LabeledTextarea, Notice, Panel, ToolNotes,
} from '../../../cysec-tools/components/ui';
import { SourceList } from '../../components/ui';
import { DNS_TYPES, DOH_RESOLVERS, queryDns, parseDnsText, typeName } from '../../utils/dns';
import { exportJson, nowIso } from '../../utils/shared';
import type { ComponentType } from 'react';
import type { OsintSource } from '../../types';

interface Row {
  record: string;
  type: string;
  value: string;
  ttl: number;
}

function DnsAnalyzerTool() {
  const [domain, setDomain] = useState('');
  const [types, setTypes] = useState<string[]>(['A', 'AAAA', 'MX', 'NS', 'TXT']);
  const [resolverId, setResolverId] = useState('cloudflare');
  const [rows, setRows] = useState<Row[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [sources, setSources] = useState<OsintSource[]>([]);
  const [pasteText, setPasteText] = useState('');
  const [pasteRecords, setPasteRecords] = useState<Row[] | null>(null);
  const [pasteError, setPasteError] = useState<string | null>(null);

  const parsePaste = () => {
    setPasteError(null);
    try {
      const { records, warnings } = parseDnsText(pasteText);
      setPasteRecords(records.map((r) => ({ record: r.name, type: r.type, value: r.value, ttl: r.ttl ?? 0 })));
      if (warnings.length) setPasteError(`${warnings.length} baris tidak dikenali.`);
    } catch {
      setPasteError('Gagal mem-parse teks DNS.');
    }
  };

  const toggleType = (t: string) => {
    setTypes((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]));
  };

  const run = async () => {
    setError(null);
    const d = domain.trim().toLowerCase();
    if (!d) {
      setError('Masukkan nama domain.');
      return;
    }
    setBusy(true);
    setRows([]);
    try {
      const all: Row[] = [];
      for (const t of types) {
        try {
          const q = await queryDns(d, t as typeof DNS_TYPES[number], resolverId);
          if (q.answers.length === 0) {
            all.push({ record: d, type: t, value: '(no records)', ttl: 0 });
          }
          for (const a of q.answers) {
            all.push({ record: a.name, type: typeName(a.type), value: a.data, ttl: a.ttl });
          }
        } catch (err) {
          throw err;
        }
      }
      setRows(all);
      const resolver = DOH_RESOLVERS.find((r) => r.id === resolverId);
      setSources([
        { source: `DNS-over-HTTPS · ${resolver?.label ?? resolverId}`, url: resolver?.endpoint(d, 'A') ?? '', retrievedAt: nowIso() },
      ]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal query DNS.');
    } finally {
      setBusy(false);
    }
  };

  const exportData = () =>
    exportJson(
      {
        domain,
        resolver: DOH_RESOLVERS.find((r) => r.id === resolverId)?.label,
        retrievedAt: nowIso(),
        records: rows,
      },
      `dns-${domain}.json`
    );

  return (
    <div className="space-y-4">
      <Button onClick={() => void run()} disabled={busy}>{busy ? 'Query…' : '🧭 Query DNS'}</Button>

      <Panel title="Pengaturan">
        <div className="space-y-3">
          <LabeledTextarea id="osint-dns-input" label="Nama domain (atau alamat reverse untuk PTR)" value={domain} onChange={setDomain} rows={1} placeholder="example.com" />
          <div className="flex flex-wrap items-center gap-3">
            <div>
              <label htmlFor="osint-dns-resolver" className="mb-1 block text-xs text-slate-400">Resolver DoH</label>
              <select
                id="osint-dns-resolver"
                value={resolverId}
                onChange={(e) => setResolverId(e.target.value)}
                className="h-9 rounded-lg border border-slate-700 bg-slate-900 px-2 text-sm text-slate-200 focus:border-accent-500 focus:outline-none"
              >
                {DOH_RESOLVERS.map((r) => (
                  <option key={r.id} value={r.id}>{r.label}</option>
                ))}
              </select>
            </div>
            <div>
              <p className="mb-1 text-xs text-slate-400">Record types</p>
              <div className="flex flex-wrap gap-1.5">
                {DNS_TYPES.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => toggleType(t)}
                    aria-pressed={types.includes(t)}
                    className={`rounded-md border px-2 py-1 font-mono text-xs transition-colors ${
                      types.includes(t)
                        ? 'border-accent-500 bg-accent-500/15 text-accent-300'
                        : 'border-slate-700 text-slate-500 hover:border-slate-500'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </Panel>

      <Notice tone="info">
        Query DNS dikirim ke resolver DoH publik pilihan Anda (Cloudflare/Google). bukan ke server kami. Ini adalah
        layanan publik yang mendukung akses browser. PTR membutuhkan alamat reverse (mis. 8.8.8.8.in-addr.arpa).
      </Notice>

      <Panel title="Paste raw DNS output (dig / nslookup / zone)">
        <LabeledTextarea
          id="osint-dns-paste"
          label="Tempel hasil raw DNS (A, AAAA, CNAME, MX, NS, TXT, SOA, SRV, PTR, CAA)"
          value={pasteText}
          onChange={setPasteText}
          rows={5}
          placeholder={'example.com. 3600 IN A 93.184.216.34\nexample.com. 3600 IN MX 10 mail.example.com.'}
        />
        <Button variant="secondary" className="mt-2" onClick={parsePaste}>Parse teks</Button>
        {pasteError && <p className="mt-2 text-xs text-amber-200">{pasteError}</p>}
        {pasteRecords && (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full border-collapse text-xs">
              <thead>
                <tr className="text-left text-slate-500">
                  <th className="px-2 py-1">Record</th>
                  <th className="px-2 py-1">Type</th>
                  <th className="px-2 py-1">Value</th>
                  <th className="px-2 py-1">TTL</th>
                </tr>
              </thead>
              <tbody>
                {pasteRecords.map((r, i) => (
                  <tr key={i} className="border-t border-slate-800/50">
                    <td className="px-2 py-1 font-mono text-slate-400">{r.record}</td>
                    <td className="px-2 py-1 font-mono text-accent-300">{r.type}</td>
                    <td className="break-all px-2 py-1 font-mono text-slate-200">{r.value}</td>
                    <td className="px-2 py-1 font-mono text-slate-500">{r.ttl || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      <ErrorAlert message={error} />

      {rows.length > 0 && (
        <Panel
          title={`DNS records (${rows.length})`}
          action={
            <>
              <CopyButton text={rows.map((r) => `${r.record}\t${r.type}\t${r.value}\t${r.ttl}`).join('\n')} />
              <Button type="button" variant="secondary" size="sm" onClick={exportData}>Export JSON</Button>
            </>
          }
        >
          <div className="max-h-[28rem] overflow-auto">
            <table className="w-full border-collapse text-sm">
              <thead className="sticky top-0 bg-slate-900">
                <tr className="text-left text-xs text-slate-500">
                  <th className="px-2 py-1.5">Record</th>
                  <th className="px-2 py-1.5">Type</th>
                  <th className="px-2 py-1.5">Value</th>
                  <th className="px-2 py-1.5">TTL</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={i} className="border-t border-slate-800/60">
                    <td className="px-2 py-1 font-mono text-xs text-slate-400">{r.record}</td>
                    <td className="px-2 py-1 font-mono text-xs text-accent-300">{r.type}</td>
                    <td className="break-all px-2 py-1 font-mono text-xs text-slate-200">{r.value}</td>
                    <td className="px-2 py-1 font-mono text-xs text-slate-500">{r.ttl || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      )}

      <SourceList sources={sources} />

      <ToolNotes
        notes={[
          { title: 'What is this?', content: 'Query DNS via DNS-over-HTTPS ke resolver publik yang mendukung browser (Cloudflare/Google).' },
          { title: 'How to use', content: 'Pilih record types + resolver, masukkan domain, klik Query DNS.' },
          { title: 'Input', content: 'Nama domain; untuk PTR gunakan alamat reverse in-addr.arpa/ip6.arpa.' },
          { title: 'Output', content: 'Tabel record (name, type, value, TTL) + export JSON.' },
          { title: 'Notes', content: 'Data dikirim ke resolver DoH yang Anda pilih (privacy: EXTERNAL). Tidak ada backend proxy.' },
        ]}
      />
    </div>
  );
}

export const tools: Record<string, ComponentType> = { dns: DnsAnalyzerTool };
export default DnsAnalyzerTool;
