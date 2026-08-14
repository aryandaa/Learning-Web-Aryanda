/**
 * Metadata Analyzer — analisis metadata file 100% lokal (EXIF/PDF/ZIP/Office/PNG).
 */

import { useState } from 'react';
import { FileDrop, type LoadedFile } from '../../../cysec-tools/components/FileDrop';
import { CopyButton, ErrorAlert, KeyValueTable, Notice, Panel, ToolNotes } from '../../../cysec-tools/components/ui';
import { analyzeOsintMetadata, type OsintMetadataResult } from '../../utils/metadata';
import { exportJson, fmtBytes } from '../../utils/shared';
import type { ComponentType } from 'react';

function MetadataAnalyzerTool() {
  const [file, setFile] = useState<LoadedFile | null>(null);
  const [result, setResult] = useState<OsintMetadataResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const handle = async (files: LoadedFile[]) => {
    const f = files[0];
    if (!f) return;
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      await new Promise((r) => setTimeout(r, 30));
      const res = await analyzeOsintMetadata(f);
      setFile(f);
      setResult(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menganalisis metadata.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <Notice tone="success">Processed locally in your browser. File tidak pernah di-upload ke server.</Notice>

      <FileDrop
        multiple={false}
        onFiles={(f) => void handle(f)}
        loading={busy}
        hint="Format: JPEG, PNG, PDF, DOCX, XLSX, ZIP, TXT, dan file umum lain."
      />

      <ErrorAlert message={error} />

      {result && (
        <>
          <Panel
            title="File"
            action={
              <>
                <CopyButton text={JSON.stringify(result, null, 2)} />
                <button
                  type="button"
                  onClick={() => exportJson(result, `metadata-${result.file}.json`)}
                  className="rounded-lg border border-slate-700 bg-slate-800/80 px-3 py-1.5 text-xs font-medium text-slate-300 transition-colors hover:border-slate-500"
                >
                  Export JSON
                </button>
              </>
            }
          >
            <KeyValueTable
              rows={[
                { k: 'Filename', v: result.file },
                { k: 'Size', v: fmtBytes(result.size) },
                { k: 'MIME', v: result.mime },
                { k: 'Extension', v: result.extension || '(tidak ada)' },
                { k: 'Last modified', v: result.lastModified ?? '—' },
                { k: 'SHA-256', v: result.sha256 },
                { k: 'SHA-1', v: result.sha1 },
                { k: 'MD5', v: result.md5 },
              ]}
            />
            {result.signatures.length > 0 && (
              <p className="mt-2 text-xs text-slate-500">
                Signature: {result.signatures.map((s) => s.name).join(' · ')}
              </p>
            )}
          </Panel>

          {result.exif && (
            <Panel title="EXIF">
              {result.exif.entries.length === 0 ? (
                <p className="text-sm text-slate-500">Tidak ada entry EXIF standar.</p>
              ) : (
                <KeyValueTable rows={result.exif.entries.map((e) => ({ k: `${e.tag}`, v: e.value }))} />
              )}
              {(result.exif.gps.lat || result.exif.gps.lon) && (
                <p className="mt-3 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
                  ⚠ Foto mengandung koordinat GPS: {result.exif.gps.lat} {result.exif.gps.lon}. Hati-hati membagikan file mentah.
                </p>
              )}
            </Panel>
          )}

          {result.png && result.png.length > 0 && (
            <Panel title="PNG text chunks">
              <KeyValueTable rows={result.png.map((c) => ({ k: c.keyword, v: c.text }))} />
            </Panel>
          )}

          {result.pdf && Object.keys(result.pdf).length > 0 && (
            <Panel title="PDF metadata">
              <KeyValueTable rows={Object.entries(result.pdf).map(([k, v]) => ({ k, v }))} />
            </Panel>
          )}

          {result.office && (
            <Panel title="Office core properties (docx/xlsx/pptx)">
              <KeyValueTable
                rows={[
                  { k: 'Title', v: result.office.title ?? '—' },
                  { k: 'Subject', v: result.office.subject ?? '—' },
                  { k: 'Author (creator)', v: result.office.creator ?? '—' },
                  { k: 'Last modified by', v: result.office.lastModifiedBy ?? '—' },
                  { k: 'Created', v: result.office.created ?? '—' },
                  { k: 'Modified', v: result.office.modified ?? '—' },
                  { k: 'Application', v: result.office.application ?? '—' },
                ]}
              />
            </Panel>
          )}

          {result.zip && result.zip.length > 0 && (
            <Panel title={`Archive entries (${result.zip.length})`}>
              <div className="max-h-72 overflow-auto">
                <table className="w-full border-collapse text-xs">
                  <thead>
                    <tr className="text-left text-slate-500">
                      <th className="py-1 pr-3">Nama</th>
                      <th className="py-1 pr-3">Metode</th>
                      <th className="py-1 pr-3 text-right">Ukuran</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.zip.map((z, i) => (
                      <tr key={i} className="border-t border-slate-800/50">
                        <td className="py-1 pr-3 font-mono text-slate-300">{z.name}</td>
                        <td className="py-1 pr-3 text-slate-500">{z.method}</td>
                        <td className="py-1 text-right font-mono text-slate-500">{z.uncompressedSize.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Panel>
          )}

          {result.exif?.entries.length === 0 && result.pdf && Object.keys(result.pdf).length === 0 && !result.png?.length && !result.zip?.length && !result.office && (
            <p className="text-xs text-slate-500">Tidak ada metadata tertanam tambahan untuk format ini.</p>
          )}

          <ToolNotes
            notes={[
              { title: 'What is this?', content: 'Menampilkan metadata file: info dasar, hash, EXIF (image), PDF core, ZIP entries, dan Office core properties.' },
              { title: 'How to use', content: 'Upload file → analisis lokal (ArrayBuffer).' },
              { title: 'Input', content: 'Satu file.' },
              { title: 'Output', content: 'Metadata + hash.' },
              { title: 'Notes', content: 'Semua lokal. Metadata bisa dipalsukan; hash hanya untuk integritas. DOCX/XLSX/PPTX adalah ZIP — entri & core.xml diekstrak tanpa library.' },
            ]}
          />
        </>
      )}
    </div>
  );
}

export const tools: Record<string, ComponentType> = { metadata: MetadataAnalyzerTool };
export default MetadataAnalyzerTool;
