/**
 * Email Analyzer. validasi, disposable-domain lokal, role-based, provider.
 */

import { useState } from 'react';
import { Button } from '../../../../components/ui/button';
import {
  CopyButton, ErrorAlert, KeyValueTable, LabeledTextarea, Notice, Panel, ToolNotes,
} from '../../../cysec-tools/components/ui';
import { IndicatorBadge } from '../../components/ui';
import { analyzeEmail, hibpLink } from '../../utils/email';
import type { ComponentType } from 'react';

function EmailAnalyzerTool() {
  const [input, setInput] = useState('');
  const [result, setResult] = useState<ReturnType<typeof analyzeEmail> | null>(null);
  const [error, setError] = useState<string | null>(null);

  const run = () => {
    setError(null);
    const res = analyzeEmail(input);
    if (!res.valid) {
      setError(res.error ?? 'Email tidak valid.');
      setResult(null);
      return;
    }
    setResult(res);
  };

  return (
    <div className="space-y-4">
      <Button onClick={run}>Analisis email</Button>

      <Panel title="Input">
        <LabeledTextarea id="osint-email-input" label="Email" value={input} onChange={setInput} rows={1} placeholder="user@example.com" />
      </Panel>

      <ErrorAlert message={error} />

      {result && (
        <>
          <Panel title="Hasil analisis" action={<CopyButton text={JSON.stringify(result, null, 2)} />}>
            <KeyValueTable
              rows={[
                { k: 'Normalized', v: result.normalized ?? '-' },
                { k: 'Local part', v: result.localPart ?? '-' },
                { k: 'Domain', v: result.domain ?? '-' },
                { k: 'TLD', v: result.tld ?? '-' },
                { k: 'Provider', v: result.provider ?? '-' },
              ]}
            />
            <div className="mt-3 flex flex-wrap gap-2">
              {result.disposable && <IndicatorBadge tone="warn">Disposable domain: {result.disposableName}</IndicatorBadge>}
              {result.roleBased && <IndicatorBadge tone="info">Role-based: {result.roleName}@</IndicatorBadge>}
              {!result.disposable && !result.roleBased && <IndicatorBadge tone="ok">Personal / custom address</IndicatorBadge>}
            </div>
          </Panel>

          {result.issues.length > 0 && (
            <Panel title="Catatan">
              <ul className="list-inside list-disc space-y-1 text-sm text-amber-200">
                {result.issues.map((i, idx) => (
                  <li key={idx}>{i}</li>
                ))}
              </ul>
            </Panel>
          )}

          <Panel title="Public source">
            <a
              href={hibpLink(result.domain ?? '')}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-900/60 px-4 py-2 text-sm text-slate-300 transition-colors hover:border-accent-500/50 hover:text-accent-300"
            >
              Have I Been Pwned. domain search ↗
            </a>
            <p className="mt-2 text-xs text-slate-500">
              HIBP dibuka manual di browser. Tidak ada data yang dikirim otomatis, dan Anda tidak perlu memasukkan password.
            </p>
          </Panel>

          <Notice tone="warn">
            Jangan gunakan tool ini untuk login, password reset, credential discovery, atau account takeover.
            Ini hanya analisis format yang berjalan lokal.
          </Notice>

          <ToolNotes
            notes={[
              { title: 'What is this?', content: 'Validasi sintaks email, normalisasi, deteksi disposable-domain (dataset lokal), role-based address, dan klasifikasi provider.' },
              { title: 'How to use', content: 'Masukkan email, klik Analisis email.' },
              { title: 'Input', content: 'Alamat email.' },
              { title: 'Output', content: 'Komponen email + indikator disposable/role + catatan.' },
              { title: 'Notes', content: 'Semua analisis lokal (privacy: LOCAL). Dataset disposable dibundel dan tidak sempurna. gunakan sebagai indikasi, bukan kepastian.' },
            ]}
          />
        </>
      )}
    </div>
  );
}

export const tools: Record<string, ComponentType> = { email: EmailAnalyzerTool };
export default EmailAnalyzerTool;
