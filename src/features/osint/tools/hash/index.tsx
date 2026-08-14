/**
 * Hash Analyzer — deteksi tipe hash + link lookup eksternal (tanpa cracking).
 */

import { useState } from 'react';
import { Button } from '../../../../components/ui/button';
import {
  CopyButton, ErrorAlert, KeyValueTable, LabeledTextarea, Panel, ToolNotes,
} from '../../../cysec-tools/components/ui';
import { IndicatorBadge } from '../../components/ui';
import { detectHash } from '../../utils/hash';
import type { ComponentType } from 'react';

function HashAnalyzerTool() {
  const [input, setInput] = useState('');
  const [result, setResult] = useState<ReturnType<typeof detectHash> | null>(null);
  const [error, setError] = useState<string | null>(null);

  const run = () => {
    setError(null);
    if (!input.trim()) {
      setError('Masukkan nilai hash.');
      setResult(null);
      return;
    }
    setResult(detectHash(input));
  };

  return (
    <div className="space-y-4">
      <Button onClick={run}>Analisis hash</Button>

      <Panel title="Input">
        <LabeledTextarea id="osint-hash-input" label="Hash" value={input} onChange={setInput} rows={2} placeholder="d41d8cd98f00b204e9800998ecf8427e" />
      </Panel>

      <ErrorAlert message={error} />

      {result && (
        <>
          <Panel title="Deteksi" action={<CopyButton text={result.normalized} />}>
            <KeyValueTable
              rows={[
                { k: 'Panjang', v: String(result.length) },
                { k: 'Hex', v: result.hex ? 'Ya' : 'Tidak' },
                { k: 'Normalized', v: result.normalized },
              ]}
            />
            <div className="mt-3 flex flex-wrap gap-2">
              {result.candidates.map((c, i) => (
                <IndicatorBadge key={i} tone={c.confidence === 'high' ? 'ok' : c.confidence === 'medium' ? 'info' : 'warn'} title={c.note}>
                  {c.algorithm} ({c.confidence})
                </IndicatorBadge>
              ))}
            </div>
          </Panel>

          <Panel title="External lookup">
            <div className="grid gap-2 sm:grid-cols-2">
              {result.lookups.map((l) => (
                <a
                  key={l.name}
                  href={l.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-lg border border-slate-700 bg-slate-900/60 px-3 py-2 text-sm text-slate-300 transition-colors hover:border-indigo-500/50 hover:text-indigo-300"
                >
                  {l.name} ↗
                </a>
              ))}
            </div>
            <p className="mt-2 text-xs text-slate-500">
              Lookup dibuka manual di situs tujuan saat diklik — tidak ada data dikirim otomatis. Tidak ada cracking
              / rainbow-table di tool ini.
            </p>
          </Panel>

          <ToolNotes
            notes={[
              { title: 'What is this?', content: 'Mendeteksi kemungkinan algoritma hash dari panjang & charset.' },
              { title: 'How to use', content: 'Masukkan hash, klik Analisis. Buka link lookup untuk mengecek reputasi.' },
              { title: 'Input', content: 'Satu nilai hash.' },
              { title: 'Output', content: 'Kandidat algoritma + link lookup.' },
              { title: 'Notes', content: 'MD5 dan NTLM sama-sama 32 hex — tidak bisa dibedakan dari panjang saja. Deteksi adalah perkiraan, bukan kepastian.' },
            ]}
          />
        </>
      )}
    </div>
  );
}

export const tools: Record<string, ComponentType> = { hash: HashAnalyzerTool };
export default HashAnalyzerTool;
