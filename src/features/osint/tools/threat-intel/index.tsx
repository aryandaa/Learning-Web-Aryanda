/**
 * Threat Intel Hub — deteksi tipe IOC + tombol lookup ke sumber publik.
 * Tidak ada data IOC dikirim otomatis; lookup terjadi di situs tujuan.
 */

import { useMemo, useState } from 'react';
import { Button } from '../../../../components/ui/button';
import { ErrorAlert, LabeledTextarea, Notice, Panel, ToolNotes } from '../../../cysec-tools/components/ui';
import { IndicatorBadge } from '../../components/ui';
import { extractIocs, iocTypeLabel } from '../../utils/ioc';
import type { ComponentType } from 'react';

interface LookupLink {
  name: string;
  url: string;
  note?: string;
}

function detectLookupTargets(value: string): { type: string; links: LookupLink[] } {
  const v = value.trim();
  const enc = encodeURIComponent(v);
  const isIp = /^\d{1,3}(\.\d{1,3}){3}$/.test(v) || v.includes(':');
  const isDomain = /^[a-z0-9.-]+\.[a-z]{2,}$/i.test(v) && !isIp;
  const isUrl = /^https?:\/\//i.test(v);
  const isHash = /^[a-f0-9]{32,128}$/i.test(v);
  let type = 'unknown';
  let links: LookupLink[] = [
    { name: 'VirusTotal', url: `https://www.virustotal.com/gui/search/${enc}` },
    { name: 'AlienVault OTX', url: `https://otx.alienvault.com/browse/global/pulses?q=${enc}` },
  ];
  if (isUrl) {
    type = 'URL';
    links = [
      { name: 'VirusTotal', url: `https://www.virustotal.com/gui/url/${enc}` },
      { name: 'URLScan', url: `https://urlscan.io/search/#${enc}` },
      { name: 'urlhaus', url: `https://urlhaus.abuse.ch/url/${enc}/` },
      { name: 'Google Safe Browsing', url: `https://transparencyreport.google.com/safe-browsing/search?url=${enc}` },
    ];
  } else if (isIp) {
    type = 'IP';
    links = [
      { name: 'VirusTotal', url: `https://www.virustotal.com/gui/ip-address/${enc}` },
      { name: 'AbuseIPDB', url: `https://www.abuseipdb.com/check/${enc}` },
      { name: 'URLScan', url: `https://urlscan.io/ip/${enc}` },
      { name: 'GreyNoise', url: `https://viz.greynoise.io/ip/${enc}` },
      { name: 'ipinfo (public)', url: `https://ipinfo.io/${enc}` },
    ];
  } else if (isHash) {
    type = 'Hash';
    links = [
      { name: 'VirusTotal', url: `https://www.virustotal.com/gui/search/${enc}` },
      { name: 'MalwareBazaar', url: `https://bazaar.abuse.ch/sample/${enc}/` },
      { name: 'Hybrid Analysis', url: `https://www.hybrid-analysis.com/search?query=${enc}` },
      { name: 'ThreatFox', url: `https://threatfox.abuse.ch/browse.php?search=${enc}` },
    ];
  } else if (isDomain) {
    type = 'Domain';
    links = [
      { name: 'VirusTotal', url: `https://www.virustotal.com/gui/domain/${enc}` },
      { name: 'URLScan', url: `https://urlscan.io/domain/${enc}` },
      { name: 'SecurityTrails', url: `https://securitytrails.com/domain/${enc}/info` },
      { name: 'crt.sh', url: `https://crt.sh/?q=${enc}` },
    ];
  }
  return { type, links };
}

function ThreatIntelTool() {
  const [input, setInput] = useState('');
  const [error, setError] = useState<string | null>(null);

  const iocs = useMemo(() => {
    if (!input.trim()) return [];
    try {
      return extractIocs(input).slice(0, 20);
    } catch {
      return [];
    }
  }, [input]);

  const targets = useMemo(() => {
    if (input.trim() && iocs.length === 0) {
      // fallback: perlakukan input sebagai satu IOC tunggal
      const { type, links } = detectLookupTargets(input);
      return type === 'unknown' ? [] : [{ value: input.trim(), type, links }];
    }
    return iocs.map((i) => {
      const { type, links } = detectLookupTargets(i.value);
      return { value: i.value, type: type === 'unknown' ? iocTypeLabel(i.type) : type, links };
    });
  }, [input, iocs]);

  const run = () => {
    setError(null);
    if (!input.trim()) setError('Masukkan IOC (domain, IP, URL, hash) atau teks yang mengandung IOC.');
    if (input.trim() && iocs.length === 0 && targets.length === 0) {
      setError('Tidak dapat mendeteksi tipe IOC dari input.');
    }
  };

  return (
    <div className="space-y-4">
      <Button onClick={run}>Deteksi & susun lookup</Button>

      <Panel title="Input">
        <LabeledTextarea
          id="osint-threat-input"
          label="IOC (satu atau beberapa)"
          value={input}
          onChange={setInput}
          rows={5}
          placeholder="evil.example.com\n192.168.1.10\nd41d8cd98f00b204e9800998ecf8427e"
        />
      </Panel>

      <ErrorAlert message={error} />

      <Notice tone="info">
        Tidak ada data IOC yang dikirim ke layanan eksternal secara otomatis. Klik tombol di bawah untuk membuka
        pencarian di situs tujuan (browser Anda yang melakukan request).
      </Notice>

      {targets.length > 0 && (
        <div className="space-y-4">
          {targets.map((t, i) => (
            <Panel key={i} title={t.value} action={<IndicatorBadge tone="info">{t.type}</IndicatorBadge>}>
              <div className="grid gap-2 sm:grid-cols-2">
                {t.links.map((l) => (
                  <a
                    key={l.name}
                    href={l.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-lg border border-slate-700 bg-slate-900/60 px-3 py-2 text-sm text-slate-300 transition-colors hover:border-indigo-500/50 hover:text-indigo-300"
                  >
                    Open in {l.name} ↗
                  </a>
                ))}
              </div>
            </Panel>
          ))}

          <ToolNotes
            notes={[
              { title: 'What is this?', content: 'Mendeteksi tipe IOC dan menyusun tautan lookup ke sumber threat intel publik.' },
              { title: 'How to use', content: 'Masukkan IOC (atau tempel teks — IOC diekstrak otomatis), klik Deteksi & susun lookup.' },
              { title: 'Input', content: 'Domain, IP, URL, hash, atau teks.' },
              { title: 'Output', content: 'Kartu per IOC dengan tombol "Open in …".' },
              { title: 'Notes', content: 'Beberapa sumber memerlukan akun (mis. VirusTotal). Tidak ada secret/key di frontend. Tanpa cracking, tanpa eksploitasi.' },
            ]}
          />
        </div>
      )}
    </div>
  );
}

export const tools: Record<string, ComponentType> = { 'threat-intel': ThreatIntelTool };
export default ThreatIntelTool;
