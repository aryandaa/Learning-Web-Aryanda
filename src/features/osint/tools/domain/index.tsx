/**
 * Domain Analyzer — parsing lokal + pengecekan DNS opsional + sumber publik.
 */

import { useState } from 'react';
import { Button } from '../../../../components/ui/button';
import {
  CopyButton, ErrorAlert, KeyValueTable, LabeledTextarea, Notice, Panel, ToolNotes,
} from '../../../cysec-tools/components/ui';
import { SourceList, IndicatorBadge } from '../../components/ui';
import { analyzeDomain, domainPublicSources } from '../../utils/domain';
import { queryDns } from '../../utils/dns';
import { exportJson, nowIso } from '../../utils/shared';
import type { ComponentType } from 'react';
import type { OsintSource } from '../../types';

function DomainAnalyzerTool() {
  const [input, setInput] = useState('');
  const [result, setResult] = useState<ReturnType<typeof analyzeDomain> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dnsState, setDnsState] = useState<'idle' | 'processing' | 'ok' | 'error'>('idle');
  const [dnsAnswers, setDnsAnswers] = useState<{ name: string; type: string; data: string }[]>([]);
  const [sources, setSources] = useState<OsintSource[]>([]);

  const run = () => {
    setError(null);
    const res = analyzeDomain(input);
    setResult(res);
    if (!res.valid) {
      setError(res.error ?? 'Domain tidak valid.');
      setDnsState('idle');
      setDnsAnswers([]);
      return;
    }
    setSources([
      { source: 'Related public sources', url: '', retrievedAt: nowIso(), note: 'Daftar di bawah' },
    ]);
  };

  const checkDns = async () => {
    if (!result?.valid) return;
    setDnsState('processing');
    try {
      const q = await queryDns(result.registrableDomain || result.hostname, 'A');
      setDnsAnswers(q.answers.map((a) => ({ name: a.name, type: a.type === 1 ? 'A' : `TYPE${a.type}`, data: a.data })));
      setDnsState('ok');
      setSources((prev) => [...prev, { source: `DoH (${q.resolver})`, url: 'https://developers.cloudflare.com/1.1.1.1/encryption/dns-over-https/', retrievedAt: nowIso() }]);
    } catch (err) {
      setDnsState('error');
      setError(err instanceof Error ? err.message : 'Gagal query DNS.');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Button onClick={run}>Analisis domain</Button>
        {result?.valid && (
          <Button variant="secondary" onClick={() => void checkDns()} disabled={dnsState === 'processing'}>
            {dnsState === 'processing' ? 'Query…' : '🧭 Cek DNS (A record)'}
          </Button>
        )}
      </div>

      <Panel title="Input">
        <LabeledTextarea id="osint-domain-input" label="Domain atau URL" value={input} onChange={setInput} rows={2} placeholder="example.com" />
      </Panel>

      <ErrorAlert message={error} />

      {result?.valid && (
        <>
          <Panel title="Analisis domain" action={<CopyButton text={JSON.stringify(result, null, 2)} />}>
            <KeyValueTable
              rows={[
                { k: 'Normalized', v: result.normalized },
                { k: 'Registrable domain', v: result.registrableDomain },
                { k: 'TLD', v: result.tld || '—' },
                { k: 'Subdomain', v: result.subdomain ?? '(tidak ada)' },
                { k: 'Labels', v: result.labels.join(' · ') },
                { k: 'IDN (Unicode)', v: result.isIdn ? result.unicodeForm : 'Tidak' },
                { k: 'Punycode', v: result.isPunycode ? 'Ya — hostname dalam bentuk ASCII' : 'Tidak' },
                { k: 'Protocol', v: result.protocol ?? '(tidak diberikan)' },
              ]}
            />
            {result.suspiciousChars.length > 0 && (
              <div className="mt-3">
                <IndicatorBadge tone="warn">⚠ Karakter mencurigakan: {result.suspiciousChars.join(', ')}</IndicatorBadge>
                <p className="mt-1 text-xs text-amber-200">
                  Periksa visual domain dengan teliti — huruf mirip (homograph) sering dipakai phishing.
                </p>
              </div>
            )}
          </Panel>

          {dnsState === 'ok' && (
            <Panel title="DNS A record (via DoH)">
              {dnsAnswers.length === 0 ? (
                <p className="text-sm text-slate-500">Tidak ada record A ditemukan (NXDOMAIN).</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-sm">
                    <thead>
                      <tr className="text-left text-xs text-slate-500">
                        <th className="py-1.5 pr-3">Name</th>
                        <th className="py-1.5 pr-3">Type</th>
                        <th className="py-1.5">Value</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dnsAnswers.map((a, i) => (
                        <tr key={i} className="border-t border-slate-800/60">
                          <td className="py-1.5 pr-3 font-mono text-xs text-slate-400">{a.name}</td>
                          <td className="py-1.5 pr-3 font-mono text-xs text-slate-500">{a.type}</td>
                          <td className="py-1.5 break-all font-mono text-xs text-slate-200">{a.data}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Panel>
          )}

          <Panel title="Related Public Sources">
            <div className="grid gap-2 sm:grid-cols-2">
              {domainPublicSources(result.registrableDomain || result.hostname).map((s) => (
                <a
                  key={s.source}
                  href={s.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-lg border border-slate-700 bg-slate-900/60 px-3 py-2 text-sm text-slate-300 transition-colors hover:border-indigo-500/50 hover:text-indigo-300"
                >
                  {s.source} <span className="text-xs text-slate-600">↗</span>
                </a>
              ))}
            </div>
            <p className="mt-2 text-xs text-slate-500">
              Beberapa sumber membutuhkan pembukaan manual di browser (external lookup required) — data tidak dikirim otomatis.
            </p>
          </Panel>

          <SourceList sources={sources} />

          <ToolNotes
            notes={[
              { title: 'What is this?', content: 'Menganalisis domain: normalisasi, registrable domain (best-effort tanpa full PSL), TLD, subdomain, IDN/punycode, dan karakter mencurigakan.' },
              { title: 'How to use', content: 'Masukkan domain (atau URL — protocol diekstrak), klik Analisis. Opsional: cek record A via DNS-over-HTTPS.' },
              { title: 'Input', content: 'Domain atau URL.' },
              { title: 'Output', content: 'Komponen domain + catatan keamanan + tautan sumber publik.' },
              { title: 'Notes', content: 'Parsing lokal. DNS lookup mengirim nama domain ke resolver DoH publik (Cloudflare). Jangan lakukan scanning aktif.' },
            ]}
          />
        </>
      )}
    </div>
  );
}

export const tools: Record<string, ComponentType> = { domain: DomainAnalyzerTool };
export default DomainAnalyzerTool;
