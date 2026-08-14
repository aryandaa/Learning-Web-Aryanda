/**
 * URL Analyzer — parse + decode bertingkat + deteksi pola mencurigakan.
 */

import { useState } from 'react';
import { Button } from '../../../../components/ui/button';
import {
  CopyButton, ErrorAlert, KeyValueTable, LabeledTextarea, Panel, ToolNotes,
} from '../../../cysec-tools/components/ui';
import { IndicatorBadge } from '../../components/ui';
import { analyzeUrlIntel, urlEncodeAll } from '../../utils/url';
import { exportJson } from '../../utils/shared';
import type { ComponentType } from 'react';

function UrlAnalyzerTool() {
  const [input, setInput] = useState('');
  const [result, setResult] = useState<ReturnType<typeof analyzeUrlIntel> | null>(null);
  const [error, setError] = useState<string | null>(null);

  const run = () => {
    setError(null);
    const res = analyzeUrlIntel(input);
    if (!res.valid) {
      setError(res.error ?? 'URL tidak valid.');
      setResult(null);
      return;
    }
    setResult(res);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Button onClick={run}>Analisis URL</Button>
      </div>

      <Panel title="Input">
        <LabeledTextarea id="osint-url-input" label="URL" value={input} onChange={setInput} rows={3} placeholder="https://example.com/path?id=123" />
      </Panel>

      <ErrorAlert message={error} />

      {result && (
        <>
          <Panel title="Komponen" action={<CopyButton text={JSON.stringify(result.components, null, 2)} />}>
            <KeyValueTable rows={result.components.map((c) => ({ k: c.name, v: c.value }))} />
          </Panel>

          {result.decodedLayers.length > 1 && (
            <Panel title="Decoded URL (bertingkat)">
              <div className="space-y-1.5">
                {result.decodedLayers.map((l, i) => (
                  <p key={i} className="break-all rounded border border-slate-800 bg-slate-950/60 px-3 py-1.5 font-mono text-xs text-slate-300">
                    <span className="mr-2 text-slate-600">L{i}</span>{l}
                  </p>
                ))}
              </div>
            </Panel>
          )}

          {result.params.length > 0 && (
            <Panel title={`Query parameters (${result.params.length})`}>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-xs">
                  <thead>
                    <tr className="text-left text-slate-500">
                      <th className="py-1.5 pr-3">Nama</th>
                      <th className="py-1.5 pr-3">Nilai (raw)</th>
                      <th className="py-1.5 pr-3">Decoded</th>
                      <th className="py-1.5">Duplikat</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.params.map((p, i) => (
                      <tr key={i} className="border-t border-slate-800/60">
                        <td className="py-1.5 pr-3 font-mono text-slate-300">{p.name}</td>
                        <td className="max-w-[14rem] truncate py-1.5 pr-3 font-mono text-slate-500" title={p.value}>{p.value}</td>
                        <td className="max-w-[14rem] truncate py-1.5 pr-3 font-mono text-slate-400" title={p.decoded}>{p.decoded}</td>
                        <td className="py-1.5 text-slate-500">{p.duplicated ? '⚠ ya' : ''}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Panel>
          )}

          <Panel title="Normalized URL" action={<CopyButton text={result.normalized} />}>
            <p className="break-all font-mono text-[13px] text-emerald-300">{result.normalized}</p>
          </Panel>

          <Panel title={`Suspicious patterns (${result.issues.length})`}>
            {result.issues.length === 0 ? (
              <p className="text-sm text-emerald-300">Tidak ada pola mencurigakan terdeteksi oleh heuristik.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {result.issues.map((issue, i) => (
                  <IndicatorBadge key={i} tone="warn">{issue}</IndicatorBadge>
                ))}
              </div>
            )}
          </Panel>

          <Panel title="URL Encode / Decode" action={<CopyButton text={urlEncodeAll(result.input)} />}>
            <p className="break-all font-mono text-xs text-slate-300">{urlEncodeAll(result.input)}</p>
          </Panel>

          <ToolNotes
            notes={[
              { title: 'What is this?', content: 'Mengurai URL menjadi komponen, decode bertingkat, dan mendeteksi pola phishing/berbahaya.' },
              { title: 'How to use', content: 'Tempel URL, klik Analisis. URL tidak pernah dibuka otomatis.' },
              { title: 'Input', content: 'URL lengkap.' },
              { title: 'Output', content: 'Komponen, lapisan decode, parameter, normalisasi, pola mencurigakan.' },
              { title: 'Notes', content: 'Proses lokal (privacy: LOCAL). Verifikasi URL sebelum mengklik tautan yang mencurigakan.' },
            ]}
          />
        </>
      )}
    </div>
  );
}

export const tools: Record<string, ComponentType> = { url: UrlAnalyzerTool };
export default UrlAnalyzerTool;
