/**
 * Text Analyzer. statistik + entitas + regex + normalisasi + dedup + export.
 */

import { useState } from 'react';
import { Button } from '../../../../components/ui/button';
import {
  CopyButton, ErrorAlert, KeyValueTable, LabeledTextarea, Panel, ToolNotes,
} from '../../../cysec-tools/components/ui';
import { textStats, extractEntities, normalizeText, dedupeLines, regexExtract, extractIocs } from '../../utils/text';
import { exportCsv, exportJson, exportTxt, fmtNumber } from '../../utils/shared';
import type { ComponentType } from 'react';

function TextAnalyzerTool() {
  const [input, setInput] = useState('');
  const [stats, setStats] = useState<ReturnType<typeof textStats> | null>(null);
  const [entities, setEntities] = useState<ReturnType<typeof extractEntities> | null>(null);
  const [regexPattern, setRegexPattern] = useState('');
  const [regexResult, setRegexResult] = useState<{ matches: string[]; error: string | null } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const run = () => {
    setError(null);
    if (!input.trim()) {
      setError('Tempel teks untuk dianalisis.');
      return;
    }
    setStats(textStats(input));
    setEntities(extractEntities(input));
    if (regexPattern.trim()) {
      setRegexResult(regexExtract(input, regexPattern.trim()));
    } else {
      setRegexResult(null);
    }
  };

  const applyTransform = (fn: (t: string) => string) => {
    setInput(fn(input));
    setStats(null);
    setEntities(null);
    setRegexResult(null);
  };

  const iocRows = extractIocs(input).map((r) => ({ Type: r.type, Value: r.value, Count: r.count }));
  const entityRows: Record<string, unknown>[] = [];
  for (const g of entities ?? []) for (const v of g.values) entityRows.push({ Group: g.label, Value: v });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Button onClick={run}>Analisis teks</Button>
        <Button variant="secondary" onClick={() => applyTransform((t) => normalizeText(t, { collapseWhitespace: true, trimLines: true }))}>Normalize</Button>
        <Button variant="secondary" onClick={() => applyTransform(dedupeLines)}>Deduplicate lines</Button>
      </div>

      <Panel title="Input">
        <LabeledTextarea id="osint-text-input" label="Teks" value={input} onChange={setInput} rows={8} placeholder="Tempel teks…" />
      </Panel>

      <ErrorAlert message={error} />

      {stats && (
        <>
          <Panel title="Statistik" action={<CopyButton text={JSON.stringify(stats, null, 2)} />}>
            <KeyValueTable
              rows={[
                { k: 'Karakter', v: fmtNumber(stats.characters) },
                { k: 'Karakter (tanpa spasi)', v: fmtNumber(stats.charactersNoSpaces) },
                { k: 'Kata', v: fmtNumber(stats.words) },
                { k: 'Baris', v: fmtNumber(stats.lines) },
                { k: 'Kalimat', v: fmtNumber(stats.sentences) },
                { k: 'Paragraf', v: fmtNumber(stats.paragraphs) },
                { k: 'Bytes (UTF-8)', v: fmtNumber(stats.bytes) },
              ]}
            />
          </Panel>

          {entities && entities.length > 0 && (
            <Panel
              title="Entitas terdeteksi"
              action={
                <>
                  <Button type="button" variant="secondary" size="sm" onClick={() => exportJson(entityRows, 'text-entities.json')}>JSON</Button>
                  <Button type="button" variant="secondary" size="sm" onClick={() => exportCsv(entityRows, 'text-entities.csv')}>CSV</Button>
                </>
              }
            >
              <div className="space-y-3">
                {entities.map((g) => (
                  <div key={g.label}>
                    <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      {g.label} ({g.values.length})
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {g.values.slice(0, 40).map((v, i) => (
                        <code key={i} className="break-all rounded bg-slate-800/80 px-1.5 py-0.5 font-mono text-[11px] text-slate-300">{v}</code>
                      ))}
                      {g.values.length > 40 && <span className="text-xs text-slate-600">… +{g.values.length - 40}</span>}
                    </div>
                  </div>
                ))}
              </div>
            </Panel>
          )}

          {iocRows.length > 0 && (
            <Panel
              title={`IOC diekstrak (${iocRows.length})`}
              action={
                <>
                  <Button type="button" variant="secondary" size="sm" onClick={() => exportJson(iocRows, 'text-ioc.json')}>JSON</Button>
                  <Button type="button" variant="secondary" size="sm" onClick={() => exportCsv(iocRows, 'text-ioc.csv')}>CSV</Button>
                </>
              }
            >
              <div className="flex flex-wrap gap-1.5">
                {iocRows.map((r, i) => (
                  <code key={i} className="break-all rounded bg-red-500/10 px-1.5 py-0.5 font-mono text-[11px] text-red-200">{r.Value}</code>
                ))}
              </div>
            </Panel>
          )}

          <Panel title="Regex extraction">
            <div className="flex flex-wrap items-center gap-2">
              <input
                value={regexPattern}
                onChange={(e) => setRegexPattern(e.target.value)}
                placeholder="Pola regex (opsional)…"
                aria-label="Pola regex"
                className="h-9 min-w-0 flex-1 rounded-lg border border-slate-700 bg-slate-900 px-3 font-mono text-sm text-slate-200 focus:border-indigo-500 focus:outline-none"
              />
              <Button variant="secondary" onClick={() => setRegexResult(regexExtract(input, regexPattern.trim()))} disabled={!regexPattern.trim()}>Ekstrak</Button>
            </div>
            {regexResult?.error && <p className="mt-2 text-sm text-red-300">{regexResult.error}</p>}
            {regexResult && !regexResult.error && (
              <p className="mt-2 text-xs text-slate-400">
                {regexResult.matches.length} match ·{' '}
                <code className="break-all font-mono text-slate-300">{regexResult.matches.slice(0, 50).join(' · ') || '(kosong)'}</code>
              </p>
            )}
          </Panel>

          <Panel title="Export" action={<Button type="button" variant="secondary" size="sm" onClick={() => exportTxt(input, 'text.txt')}>TXT</Button>}>
            <p className="text-xs text-slate-500">Export teks asli (TXT) atau hasil di atas (JSON/CSV).</p>
          </Panel>

          <ToolNotes
            notes={[
              { title: 'What is this?', content: 'Statistik teks, ekstraksi entitas (URL/email/domain/IP/hash/tanggal/@username), ekstraksi IOC, regex, normalisasi & dedup.' },
              { title: 'How to use', content: 'Tempel teks → Analisis. Gunakan Normalize/Deduplicate untuk membersihkan, dan pola regex untuk ekstraksi kustom.' },
              { title: 'Input', content: 'Teks bebas.' },
              { title: 'Output', content: 'Statistik + entitas + IOC + hasil regex.' },
              { title: 'Notes', content: 'Semua lokal (privacy: LOCAL). Batas match regex 10.000 untuk keamanan.' },
            ]}
          />
        </>
      )}
    </div>
  );
}

export const tools: Record<string, ComponentType> = { text: TextAnalyzerTool };
export default TextAnalyzerTool;
