/**
 * Certificate Intelligence. crt.sh (fetch dengan fallback) + mode paste JSON.
 */

import { useState } from 'react';
import { Button } from '../../../../components/ui/button';
import {
  CopyButton, ErrorAlert, LabeledTextarea, Notice, Panel, ToolNotes,
} from '../../../cysec-tools/components/ui';
import { SourceList } from '../../components/ui';
import { analyzeDomain } from '../../utils/domain';
import { exportCsv, exportJson, nowIso } from '../../utils/shared';
import type { ComponentType } from 'react';
import type { OsintSource } from '../../types';

interface CertRow {
  id: number;
  commonName: string;
  issuer: string;
  notBefore: string;
  notAfter: string;
  dnsNames: string[];
}

/** Fetch crt.sh JSON. CORS tidak dijamin; fallback ke pesan manusiawi. */
async function fetchCrtSh(domain: string): Promise<CertRow[]> {
  let res: Response;
  try {
    res = await fetch(`https://crt.sh/?q=${encodeURIComponent(domain)}&output=json`, { signal: AbortSignal.timeout(15000) });
  } catch (err) {
    throw new Error('Unable to retrieve certificate data from crt.sh (CORS/jaringan). Gunakan tombol "Buka crt.sh" atau tempel hasil JSON di bawah.', { cause: err });
  }
  if (!res.ok) throw new Error(`crt.sh merespons status ${res.status}. Gunakan mode paste JSON.`);
  const json = (await res.json()) as {
    id?: number;
    name_value?: string;
    common_name?: string;
    issuer_name?: string;
    not_before?: string;
    not_after?: string;
    name?: string;
  }[];
  if (!Array.isArray(json)) throw new Error('Respons crt.sh tidak dikenali.');
  return json.slice(0, 500).map((c) => ({
    id: c.id ?? 0,
    commonName: c.common_name ?? c.name ?? '',
    issuer: c.issuer_name ?? '',
    notBefore: c.not_before ?? '',
    notAfter: c.not_after ?? '',
    dnsNames: (c.name_value ?? '').split('\n').map((s) => s.trim()).filter(Boolean),
  }));
}

function parsePastedJson(text: string): CertRow[] {
  const json = JSON.parse(text) as { name_value?: string; common_name?: string; issuer_name?: string; not_before?: string; not_after?: string }[];
  if (!Array.isArray(json)) throw new Error('JSON harus berupa array.');
  return json.slice(0, 500).map((c) => ({
    id: 0,
    commonName: c.common_name ?? '',
    issuer: c.issuer_name ?? '',
    notBefore: c.not_before ?? '',
    notAfter: c.not_after ?? '',
    dnsNames: (c.name_value ?? '').split('\n').map((s) => s.trim()).filter(Boolean),
  }));
}

function CertIntelTool() {
  const [input, setInput] = useState('');
  const [pasteMode, setPasteMode] = useState(false);
  const [pasteText, setPasteText] = useState('');
  const [rows, setRows] = useState<CertRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [sources, setSources] = useState<OsintSource[]>([]);

  const domain = analyzeDomain(input).valid ? analyzeDomain(input).registrableDomain || analyzeDomain(input).hostname : input.trim();

  const run = async () => {
    setError(null);
    const d = analyzeDomain(input);
    if (!d.valid) {
      setError(d.error ?? 'Masukkan domain yang valid.');
      return;
    }
    setBusy(true);
    try {
      const data = await fetchCrtSh(d.registrableDomain || d.hostname);
      setRows(data);
      setSources([{ source: 'crt.sh (Certificate Transparency)', url: `https://crt.sh/?q=${encodeURIComponent(d.registrableDomain || d.hostname)}`, retrievedAt: nowIso() }]);
    } catch (err) {
      setRows(null);
      setError(err instanceof Error ? err.message : 'Gagal mengambil data sertifikat.');
    } finally {
      setBusy(false);
    }
  };

  const runPaste = () => {
    setError(null);
    try {
      setRows(parsePastedJson(pasteText));
      setSources([{ source: 'crt.sh (paste manual)', url: 'https://crt.sh/', retrievedAt: nowIso() }]);
    } catch {
      setError('JSON tidak valid. Pastikan menyalin output JSON dari crt.sh (?output=json).');
    }
  };

  const allNames = Array.from(new Set((rows ?? []).flatMap((r) => r.dnsNames))).sort();
  const csvRows = (rows ?? []).map((r) => ({ id: r.id, commonName: r.commonName, issuer: r.issuer, notBefore: r.notBefore, notAfter: r.notAfter, dnsNames: r.dnsNames.join('\n') }));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Button onClick={() => void run()} disabled={busy}>{busy ? 'Fetch…' : '🔍 Ambil dari crt.sh'}</Button>
        <Button variant="secondary" onClick={() => setPasteMode((p) => !p)}>Paste JSON manual</Button>
        <a
          href={`https://crt.sh/?q=${encodeURIComponent(domain)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-lg border border-slate-700 bg-slate-800/80 px-3 py-2 text-xs font-medium text-slate-300 transition-colors hover:border-slate-500"
        >
          Buka crt.sh ↗
        </a>
      </div>

      <Panel title="Input">
        <LabeledTextarea id="osint-cert-input" label="Domain" value={input} onChange={setInput} rows={1} placeholder="example.com" />
      </Panel>

      {pasteMode && (
        <Panel title="Paste JSON dari crt.sh">
          <LabeledTextarea
            id="osint-cert-paste"
            label='Buka https://crt.sh/?q=example.com&output=json lalu salin JSON di sini'
            value={pasteText}
            onChange={setPasteText}
            rows={6}
          />
          <Button variant="secondary" onClick={runPaste} className="mt-2">Parse paste</Button>
        </Panel>
      )}

      <Notice tone="info">
        crt.sh adalah Certificate Transparency log. data publik. Fetch otomatis bisa gagal karena CORS/rate-limit;
        bila gagal gunakan "Buka crt.sh" atau mode paste JSON. Tidak ada scanning aktif.
      </Notice>

      <ErrorAlert message={error} />

      {rows && (
        <>
          <Panel
            title={`Sertifikat: ${rows.length}`}
            action={
              <>
                <CopyButton text={allNames.join('\n')} label="Copy DNS names" />
                <Button type="button" variant="secondary" size="sm" onClick={() => exportJson(csvRows, 'certificates.json')}>JSON</Button>
                <Button type="button" variant="secondary" size="sm" onClick={() => exportCsv(csvRows, 'certificates.csv')}>CSV</Button>
              </>
            }
          >
            <div className="max-h-[28rem] overflow-auto">
              <table className="w-full border-collapse text-xs">
                <thead className="sticky top-0 bg-slate-900">
                  <tr className="text-left text-slate-500">
                    <th className="px-2 py-1.5">Common Name</th>
                    <th className="px-2 py-1.5">Issuer</th>
                    <th className="px-2 py-1.5">Valid From</th>
                    <th className="px-2 py-1.5">Valid To</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, i) => (
                    <tr key={i} className="border-t border-slate-800/50">
                      <td className="break-all px-2 py-1 font-mono text-slate-200">{r.commonName}</td>
                      <td className="break-all px-2 py-1 font-mono text-slate-400">{r.issuer}</td>
                      <td className="px-2 py-1 font-mono text-slate-500">{r.notBefore.slice(0, 10)}</td>
                      <td className="px-2 py-1 font-mono text-slate-500">{r.notAfter.slice(0, 10)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>

          <Panel title={`Domain & subdomain unik (deduplicated: ${allNames.length})`} action={<CopyButton text={allNames.join('\n')} />}>
            <div className="flex flex-wrap gap-1.5">
              {allNames.map((n, i) => (
                <a
                  key={i}
                  href={`https://crt.sh/?q=${encodeURIComponent(n)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded bg-emerald-500/10 px-1.5 py-0.5 font-mono text-[11px] text-emerald-300 transition-colors hover:bg-emerald-500/20"
                >
                  {n} ↗
                </a>
              ))}
            </div>
          </Panel>

          {/* Domain relationship tree */}
          <Panel title="Domain relationship (subdomain tree)">
            <div className="font-mono text-xs text-slate-300">
              {(() => {
                const root = allNames.find((n) => n.split('.').length <= 2) ?? domain;
                const subs = allNames.filter((n) => n !== root && n.endsWith('.' + root)).sort();
                return (
                  <div>
                    <p>└── {root} (root)</p>
                    {subs.slice(0, 60).map((s, i) => (
                      <p key={i} className="ml-4">
                        {i === subs.length - 1 || i === 59 ? '    └──' : '    ├──'} {s}
                      </p>
                    ))}
                    {subs.length > 60 && <p className="ml-4 text-slate-600">… +{subs.length - 60}</p>}
                  </div>
                );
              })()}
            </div>
          </Panel>

          <SourceList sources={sources} />

          <ToolNotes
            notes={[
              { title: 'What is this?', content: 'Mengambil data sertifikat dari Certificate Transparency (crt.sh) dan mengekstrak subdomain dari SAN/DNS names.' },
              { title: 'How to use', content: 'Masukkan domain → Ambil dari crt.sh. Bila gagal (CORS), gunakan paste JSON.' },
              { title: 'Input', content: 'Domain.' },
              { title: 'Output', content: 'Tabel sertifikat + daftar subdomain unik + tree.' },
              { title: 'Notes', content: 'Privacy: EXTERNAL (data dikirim ke crt.sh saat fetch). Wildcard (*.domain) menampilkan banyak sertifikat. hasil dibatasi 500.' },
            ]}
          />
        </>
      )}
    </div>
  );
}

export const tools: Record<string, ComponentType> = { certificates: CertIntelTool };
export default CertIntelTool;
