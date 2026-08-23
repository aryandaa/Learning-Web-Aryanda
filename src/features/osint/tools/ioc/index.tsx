/**
 * IOC Extractor. ekstraksi & dedup IOC dari teks/log/email/report.
 */

import { useEffect, useState } from 'react';
import { Button } from '../../../../components/ui/button';
import {
  CopyButton, ErrorAlert, LabeledTextarea, Panel, ToolNotes,
} from '../../../cysec-tools/components/ui';
import { extractIocs, iocTypeLabel, type IocHit, type IocType } from '../../utils/ioc';
import { exportCsv, exportJson } from '../../utils/shared';
import { cn } from '../../../../lib/utils';
import type { ComponentType } from 'react';

const TYPE_TONE: Record<string, string> = {
  ipv4: 'bg-sky-500/10 text-sky-300', ipv6: 'bg-sky-500/10 text-sky-300',
  domain: 'bg-emerald-500/10 text-emerald-300', url: 'bg-emerald-500/10 text-emerald-300',
  email: 'bg-accent-500/10 text-accent-300', 'hash-md5': 'bg-amber-500/10 text-amber-300',
  'hash-sha1': 'bg-amber-500/10 text-amber-300', 'hash-sha256': 'bg-amber-500/10 text-amber-300',
  'hash-sha512': 'bg-amber-500/10 text-amber-300', cve: 'bg-red-500/10 text-red-300',
  attack: 'bg-red-500/10 text-red-300', filepath: 'bg-slate-700/50 text-slate-400',
};

function IocExtractorTool() {
  const [input, setInput] = useState('');
  const [result, setResult] = useState<IocHit[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Terima IOC yang dikirim tool lain (mis. PCAP Analyzer) via sessionStorage.
  useEffect(() => {
    try {
      const pending = window.sessionStorage.getItem('osint-ioc-pending');
      if (pending) {
        window.sessionStorage.removeItem('osint-ioc-pending');
        const values = JSON.parse(pending) as string[];
        if (Array.isArray(values) && values.length > 0) {
          setInput(values.join('\n'));
          setResult(extractIocs(values.join('\n')));
        }
      }
    } catch {
      /* abaikan */
    }
  }, []);

  const run = () => {
    setError(null);
    if (!input.trim()) {
      setError('Tempel teks/log untuk diekstrak.');
      setResult(null);
      return;
    }
    try {
      setResult(extractIocs(input));
    } catch {
      setError('Gagal mengekstrak IOC.');
      setResult(null);
    }
  };

  const byType = (t: IocType) => result?.filter((r) => r.type === t) ?? [];
  const totalCount = result?.reduce((a, r) => a + r.count, 0) ?? 0;
  const rows = (result ?? []).map((r) => ({ Type: iocTypeLabel(r.type), Value: r.value, Count: r.count, Context: r.context }));

  return (
    <div className="space-y-4">
      <Button onClick={run}>Ekstrak IOC</Button>

      <Panel title="Input">
        <LabeledTextarea
          id="osint-ioc-input"
          label="Teks / log / email / report"
          value={input}
          onChange={setInput}
          rows={8}
          placeholder={'Contoh:\n2026-08-13 10:20:00 attacker 192.168.1.10 GET /wp-login.php 404\nCVE-2023-1234 · malware.exe hash: d41d8cd98f00b204e9800998ecf8427e\nhttps://evil.example/payload → T1059.001'}
        />
      </Panel>

      <ErrorAlert message={error} />

      {result && (
        <>
          <Panel
            title={`IOC ditemukan: ${result.length} unik (${totalCount} total)`}
            action={
              <>
                <CopyButton text={rows.map((r) => `${r.Type}\t${r.Value}\t${r.Count}`).join('\n')} label="Copy All" />
                <Button type="button" variant="secondary" size="sm" onClick={() => exportJson(rows, 'ioc.json')}>JSON</Button>
                <Button type="button" variant="secondary" size="sm" onClick={() => exportCsv(rows, 'ioc.csv')}>CSV</Button>
              </>
            }
          >
            <div className="max-h-[32rem] overflow-auto">
              <table className="w-full border-collapse text-xs">
                <thead className="sticky top-0 bg-slate-900">
                  <tr className="text-left text-slate-500">
                    <th className="px-2 py-1.5">Type</th>
                    <th className="px-2 py-1.5">Value</th>
                    <th className="px-2 py-1.5">Conf</th>
                    <th className="px-2 py-1.5">Pos</th>
                    <th className="px-2 py-1.5">Count</th>
                    <th className="px-2 py-1.5">Context</th>
                  </tr>
                </thead>
                <tbody>
                  {result.map((r, i) => (
                    <tr key={i} className="border-t border-slate-800/50">
                      <td className="px-2 py-1">
                        <span className={cn('rounded px-1.5 py-0.5 text-[10px] font-medium', TYPE_TONE[r.type])}>{iocTypeLabel(r.type)}</span>
                      </td>
                      <td className="max-w-[20rem] break-all px-2 py-1 font-mono text-slate-200">{r.value}</td>
                      <td className="px-2 py-1">
                        <span className={cn('rounded px-1.5 py-0.5 text-[10px]', r.confidence === 'high' ? 'bg-emerald-500/10 text-emerald-300' : r.confidence === 'medium' ? 'bg-amber-500/10 text-amber-300' : 'bg-slate-700/50 text-slate-400')}>
                          {r.confidence ?? '?'}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-2 py-1 font-mono text-slate-500">{r.line ? `${r.line}:${r.col}` : '-'}</td>
                      <td className="px-2 py-1 font-mono text-slate-500">{r.count}</td>
                      <td className="max-w-[18rem] truncate px-2 py-1 text-slate-500" title={r.context}>{r.context}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-2 text-xs text-slate-500">
              Deduplicated otomatis. Ringkasan per tipe: {Object.keys(TYPE_TONE).map((t) => byType(t as IocType).length ? `${iocTypeLabel(t as IocType)}: ${byType(t as IocType).length}` : null).filter(Boolean).join(' · ')}
            </p>
          </Panel>

          <ToolNotes
            notes={[
              { title: 'What is this?', content: 'Mengekstrak IOC (indicator of compromise) dari teks: IP, domain, URL, email, hash, CVE, ATT&CK, file path.' },
              { title: 'How to use', content: 'Tempel teks/log, klik Ekstrak IOC.' },
              { title: 'Input', content: 'Teks bebas.' },
              { title: 'Output', content: 'Tabel Type/Value/Count/Context + export JSON/CSV.' },
              { title: 'Notes', content: 'Semua lokal (privacy: LOCAL). Hash MD5/SHA1/SHA256 hanya dideteksi dari panjang. verifikasi dengan Hash Analyzer.' },
            ]}
          />
        </>
      )}
    </div>
  );
}

export const tools: Record<string, ComponentType> = { ioc: IocExtractorTool };
export default IocExtractorTool;
