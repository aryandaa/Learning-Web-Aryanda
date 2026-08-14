/**
 * FileAnalyzer. kerangka generik untuk tool analisis file:
 * upload → baca ArrayBuffer → analyze(bytes, file) → hasil render.
 * Menampilkan badge "diproses lokal" dan warning file besar.
 */

import { useState } from 'react';
import { FileDrop, FileChip, largeFileHint, type LoadedFile } from './FileDrop';
import { CopyButton, DownloadButton, ErrorAlert, Notice, Panel, ToolNotes, type ToolNote } from './ui';

export interface FileAnalyzerConfig {
  title: string;
  description: string;
  accept?: string;
  multiple?: boolean;
  /** analyze(bytes, file) → ReactNode hasil */
  analyze: (file: LoadedFile) => React.ReactNode | Promise<React.ReactNode>;
  notes?: ToolNote[];
  /** ukuran maksimum byte yang diproses (default 200MB) */
  maxSize?: number;
}

export function FileAnalyzer({ config }: { config: FileAnalyzerConfig }) {
  const [files, setFiles] = useState<LoadedFile[]>([]);
  const [result, setResult] = useState<React.ReactNode>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleFiles = async (loaded: LoadedFile[]) => {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const max = config.maxSize ?? 200 * 1024 * 1024;
      for (const f of loaded) {
        if (f.bytes.length > max) {
          setError(`File "${f.file.name}" terlalu besar untuk dianalisis di browser (maks ${Math.round(max / 1024 / 1024)} MB).`);
          setFiles([]);
          setLoading(false);
          return;
        }
      }
      setFiles(loaded);
      if (loaded.length === 1) {
        const r = await config.analyze(loaded[0]);
        setResult(r);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menganalisis file.');
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  const analyzeAgain = async () => {
    if (files.length === 1) {
      setLoading(true);
      setError(null);
      try {
        setResult(await config.analyze(files[0]));
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Gagal menganalisis file.');
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <div className="space-y-4">
      <Notice tone="success">
        File diproses secara lokal di browser dan tidak dikirim ke server. Tidak ada upload jaringan.
      </Notice>

      <FileDrop
        accept={config.accept}
        multiple={config.multiple}
        onFiles={(f) => void handleFiles(f)}
        loading={loading}
        hint={`File dibaca sebagai ArrayBuffer oleh File API browser.${config.accept ? ` Format: ${config.accept}` : ''}`}
      />

      {files.length > 0 && (
        <div className="space-y-2">
          {files.map((f, i) => (
            <FileChip
              key={i}
              file={f}
              large={!!largeFileHint(f.bytes.length)}
              onRemove={() => {
                setFiles((prev) => prev.filter((_, idx) => idx !== i));
                setResult(null);
              }}
            />
          ))}
          {largeFileHint(files[0]?.bytes.length ?? 0) && (
            <Notice tone="warn">{largeFileHint(files[0].bytes.length)}</Notice>
          )}
        </div>
      )}

      <ErrorAlert message={error} />

      {result && (
        <div className="space-y-4">
          {files.length === 1 && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => void analyzeAgain()}
                className="rounded-lg border border-slate-700 bg-slate-800/80 px-3 py-1.5 text-xs font-medium text-slate-300 transition-colors hover:border-slate-500"
              >
                ↻ Analisis ulang
              </button>
            </div>
          )}
          {result}
        </div>
      )}

      {config.notes && config.notes.length > 0 && <ToolNotes notes={config.notes} />}
    </div>
  );
}

export function ResultPanel({ title, children, textToCopy }: { title: string; children: React.ReactNode; textToCopy?: string }) {
  return (
    <Panel
      title={title}
      action={
        textToCopy ? (
          <div className="flex items-center gap-1.5">
            <CopyButton text={textToCopy} />
            <DownloadButton text={textToCopy} filename="analysis.txt" />
          </div>
        ) : undefined
      }
    >
      {children}
    </Panel>
  );
}
