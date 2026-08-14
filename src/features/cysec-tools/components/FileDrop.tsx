/**
 * FileDrop — upload file via drag & drop + input file. Aksesibel,
 * membaca ArrayBuffer secara lokal, dan menampilkan warning untuk file besar.
 */

import { useCallback, useRef, useState } from 'react';
import { FileUp, X } from 'lucide-react';
import { cn } from '../../../lib/utils';
import { formatBytes } from '../utils/files';

export interface LoadedFile {
  file: File;
  bytes: Uint8Array;
}

const LARGE_THRESHOLD = 50 * 1024 * 1024; // 50 MB

export function FileDrop({
  accept,
  multiple,
  label = 'Upload file',
  hint,
  onFiles,
  loading,
}: {
  accept?: string;
  multiple?: boolean;
  label?: string;
  hint?: string;
  onFiles: (files: LoadedFile[]) => void;
  loading?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const readFiles = useCallback(
    async (fileList: FileList | File[]) => {
      const files = Array.from(fileList);
      if (!files.length) return;
      setError(null);
      const loaded: LoadedFile[] = [];
      for (const file of files) {
        try {
          const buffer = await file.arrayBuffer();
          loaded.push({ file, bytes: new Uint8Array(buffer) });
        } catch {
          setError(`Gagal membaca file "${file.name}".`);
        }
      }
      if (loaded.length) onFiles(loaded);
    },
    [onFiles]
  );

  return (
    <div>
      <div
        role="button"
        tabIndex={0}
        aria-label={label}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            inputRef.current?.click();
          }
        }}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          void readFiles(e.dataTransfer.files);
        }}
        className={cn(
          'flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 py-8 text-center transition-colors',
          dragOver
            ? 'border-indigo-500 bg-indigo-500/10'
            : 'border-slate-700 bg-slate-950/40 hover:border-indigo-500/50 hover:bg-slate-900/60'
        )}
      >
        {loading ? (
          <span className="h-8 w-8 animate-spin rounded-full border-2 border-slate-700 border-t-indigo-400" role="status" aria-label="Memproses" />
        ) : (
          <FileUp className="h-8 w-8 text-slate-500" />
        )}
        <span className="text-sm font-medium text-slate-300">
          {loading ? 'Memproses…' : `Klik untuk ${label.toLowerCase()} atau seret ke sini`}
        </span>
        <span className="text-xs text-slate-500">
          {hint ?? 'File diproses sepenuhnya di browser — tidak pernah di-upload ke server.'}
        </span>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        className="sr-only"
        onChange={(e) => {
          if (e.target.files) void readFiles(e.target.files);
          e.target.value = '';
        }}
      />
      {error && (
        <p role="alert" className="mt-2 rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-300">
          {error}
        </p>
      )}
    </div>
  );
}

/** Chip file terpilih dengan tombol hapus. */
export function FileChip({ file, onRemove, large }: { file: LoadedFile; onRemove?: () => void; large?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2">
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-slate-200">{file.file.name}</p>
        <p className="text-xs text-slate-500">
          {formatBytes(file.file.size)}
          {file.file.type ? ` · ${file.file.type}` : ''}
          {large && <span className="ml-2 text-amber-400">⚠ file besar</span>}
        </p>
      </div>
      {onRemove && (
        <button
          onClick={onRemove}
          className="rounded-md p-1.5 text-slate-500 transition-colors hover:bg-slate-800 hover:text-slate-200"
          aria-label={`Hapus file ${file.file.name}`}
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

/** Helper: warning besar → text. */
export function largeFileHint(fileSize: number): string | null {
  if (fileSize > LARGE_THRESHOLD) {
    return 'Large file. Processing may take longer depending on your device.';
  }
  return null;
}
