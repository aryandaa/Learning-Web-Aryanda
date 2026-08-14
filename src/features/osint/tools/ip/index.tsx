/**
 * IP Analyzer. klasifikasi lokal + lookup ipwho.is + reverse DNS (DoH) + sumber publik.
 */

import { useState } from 'react';
import { Button } from '../../../../components/ui/button';
import {
  CopyButton, ErrorAlert, KeyValueTable, LabeledTextarea, Notice, Panel, ToolNotes,
} from '../../../cysec-tools/components/ui';
import { SourceList, IndicatorBadge } from '../../components/ui';
import { analyzeIp, lookupIpWhoIs, type IpWhoIsResult } from '../../utils/ip';
import { queryDns, reverseName } from '../../utils/dns';
import { exportJson, nowIso } from '../../utils/shared';
import type { ComponentType } from 'react';
import type { OsintSource } from '../../types';

function IpAnalyzerTool() {
  const [input, setInput] = useState('');
  const [result, setResult] = useState<ReturnType<typeof analyzeIp> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [whois, setWhois] = useState<IpWhoIsResult | null>(null);
  const [ptr, setPtr] = useState<string | null>(null);
  const [sources, setSources] = useState<OsintSource[]>([]);

  const run = () => {
    setError(null);
    setWhois(null);
    setPtr(null);
    const res = analyzeIp(input);
    setResult(res);
    if (!res.valid) setError(res.error ?? 'IP tidak valid.');
  };

  const externalLookup = async () => {
    if (!result?.valid) return;
    setError(null);
    try {
      const w = await lookupIpWhoIs(result.normalized);
      setWhois(w);
      const srcs: OsintSource[] = [
        { source: 'ipwho.is', url: `https://ipwho.is/${result.normalized}`, retrievedAt: nowIso() },
      ];
      try {
        const q = await queryDns(reverseName(result.normalized), 'PTR');
        if (q.answers.length > 0) {
          setPtr(q.answers[0].data);
          srcs.push({ source: `DoH PTR (${q.resolver})`, url: 'https://developers.cloudflare.com/1.1.1.1/encryption/dns-over-https/', retrievedAt: nowIso() });
        }
      } catch {
        /* PTR opsional */
      }
      setSources(srcs);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lookup eksternal gagal.');
    }
  };

  const sourcesLinks = [
    { name: 'ARIN', url: `https://search.arin.net/rdap/?query=${result?.normalized ?? ''}` },
    { name: 'RIPE', url: `https://stat.ripe.net/data/network-info/data.json?resource=${result?.normalized ?? ''}` },
    { name: 'APNIC', url: `https://wq.apnic.net/apnic-bin/whois.pl?searchtext=${result?.normalized ?? ''}` },
    { name: 'BGPlay/BGP', url: `https://stat.ripe.net/data/routing-status/data.json?resource=${result?.normalized ?? ''}` },
    { name: 'AbuseIPDB', url: `https://www.abuseipdb.com/check/${result?.normalized ?? ''}` },
    { name: 'VirusTotal', url: `https://www.virustotal.com/gui/ip-address/${result?.normalized ?? ''}` },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Button onClick={run}>Analisis IP</Button>
        {result?.valid && (
          <Button variant="secondary" onClick={() => void externalLookup()}>🌍 External lookup (ASN/geo/PTR)</Button>
        )}
      </div>

      <Panel title="Input">
        <LabeledTextarea id="osint-ip-input" label="IPv4 atau IPv6 (boleh dengan CIDR)" value={input} onChange={setInput} rows={2} placeholder="8.8.8.8 atau 2001:4860:4860::8888" />
      </Panel>

      <ErrorAlert message={error} />

      {result?.valid && (
        <>
          <Panel title="Klasifikasi" action={<CopyButton text={JSON.stringify(result, null, 2)} />}>
            <KeyValueTable
              rows={[
                { k: 'Normalized', v: result.normalized },
                { k: 'Versi', v: result.version === 4 ? 'IPv4' : 'IPv6' },
                { k: 'CIDR', v: result.cidr ?? '(tidak diberikan)' },
              ]}
            />
            <div className="mt-3 flex flex-wrap gap-2">
              {result.classifications.map((c, i) => (
                <IndicatorBadge key={i} tone={c.kind === 'ok' ? 'ok' : c.kind === 'warn' ? 'warn' : 'info'}>{c.label}</IndicatorBadge>
              ))}
            </div>
          </Panel>

          {whois && (
            <Panel title="Lookup publik (ipwho.is)">
              {whois.error ? (
                <p className="text-sm text-amber-300">{whois.error}</p>
              ) : (
                <KeyValueTable
                  rows={[
                    { k: 'ASN', v: whois.asn ?? '-' },
                    { k: 'Organization', v: whois.org ?? '-' },
                    { k: 'ISP', v: whois.isp ?? '-' },
                    { k: 'Country', v: whois.country ? `${whois.country} (${whois.countryCode})` : '-' },
                    { k: 'Continent', v: whois.continent ?? '-' },
                    { k: 'Region/City', v: [whois.region, whois.city].filter(Boolean).join(', ') || '-' },
                    { k: 'Timezone', v: whois.timezone ?? '-' },
                    { k: 'Reverse DNS (PTR)', v: ptr ?? '-' },
                  ]}
                />
              )}
            </Panel>
          )}

          <Panel title="Public Sources">
            <div className="grid gap-2 sm:grid-cols-2">
              {sourcesLinks.map((s) => (
                <a
                  key={s.name}
                  href={s.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-lg border border-slate-700 bg-slate-900/60 px-3 py-2 text-sm text-slate-300 transition-colors hover:border-indigo-500/50 hover:text-indigo-300"
                >
                  {s.name} <span className="text-xs text-slate-600">↗</span>
                </a>
              ))}
            </div>
            <p className="mt-2 text-xs text-slate-500">Tidak ada port scanning / active reconnaissance.</p>
          </Panel>

          <SourceList sources={sources} />

          <ToolNotes
            notes={[
              { title: 'What is this?', content: 'Validasi & klasifikasi IP (private, loopback, multicast, reserved, documentation) + lookup publik ASN/geo/PTR.' },
              { title: 'How to use', content: 'Masukkan IP (IPv4/IPv6, opsional CIDR). Klik Analisis untuk klasifikasi lokal; External lookup untuk ASN/negara via ipwho.is dan PTR via DoH.' },
              { title: 'Input', content: 'Alamat IP.' },
              { title: 'Output', content: 'Klasifikasi + data ASN/geo/PTR (bila lookup berhasil).' },
              { title: 'Notes', content: 'Klasifikasi lokal; lookup mengirim IP ke ipwho.is (CORS publik, tanpa key) dan resolver DoH. Defensif. tanpa scanning aktif.' },
            ]}
          />
        </>
      )}
    </div>
  );
}

export const tools: Record<string, ComponentType> = { ip: IpAnalyzerTool };
export default IpAnalyzerTool;
