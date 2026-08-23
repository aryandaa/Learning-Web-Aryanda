/**
 * TransformTool. kerangka generik untuk tool encode/decode/cipher.
 * Menyediakan: input, opsi key (opsional), aksi encode/decode/swap,
 * output, copy/clear/download, dan dukungan file input bila relevan.
 */

import { useMemo, useState } from 'react';
import { Button } from '../../../components/ui/button';
import { FileDrop, type LoadedFile } from './FileDrop';
import {
  ClearButton,
  CopyButton,
  DownloadButton,
  ErrorAlert,
  LabeledTextarea,
  Panel,
  SwapButton,
  ToolNotes,
  type ToolNote,
} from './ui';
import { bytesToHex, bytesToUtf8, utf8ToBytes } from '../utils/bytes';

export interface KeyField {
  id: string;
  label: string;
  placeholder?: string;
  type?: 'text' | 'number';
  defaultValue?: string;
  hint?: string;
}

export interface TransformConfig {
  title: string;
  description: string;
  placeholder?: string;
  /** transform(input, keyValues, meta). throw Error bila input tidak valid */
  encode: (input: string, keys: Record<string, string>, meta: { file: LoadedFile | null }) => string | Promise<string>;
  decode: (input: string, keys: Record<string, string>, meta: { file: LoadedFile | null }) => string | Promise<string>;
  keyFields?: KeyField[];
  /** output hex bukan teks (untuk XOR / binary-ish) */
  hexOutput?: boolean;
  /** baca input dari file (bytes → hex lalu jadi string input?) */
  fileInput?: boolean;
  /** cara mengubah bytes file jadi string input */
  fileToInput?: (bytes: Uint8Array) => string;
  inputMode?: 'text' | 'hex';
  notes?: ToolNote[];
  defaultAction?: 'encode' | 'decode';
  /** contoh input (tombol "Muat contoh") */
  example?: string;
}

export function TransformTool(config: TransformConfig) {
  const [input, setInput] = useState('');
  const [keys, setKeys] = useState<Record<string, string>>(
    Object.fromEntries((config.keyFields ?? []).map((k) => [k.id, k.defaultValue ?? '']))
  );
  const [mode, setMode] = useState<'encode' | 'decode'>(config.defaultAction ?? 'encode');
  const [output, setOutput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [file, setFile] = useState<LoadedFile | null>(null);

  const keyFields = config.keyFields ?? [];

  const run = async (m: 'encode' | 'decode') => {
    setError(null);
    try {
      let effectiveInput = input;
      if (config.fileInput && file) {
        effectiveInput = config.fileToInput
          ? config.fileToInput(file.bytes)
          : bytesToHex(file.bytes);
      }
      if (!effectiveInput.trim()) {
        setError('Input kosong. masukkan data terlebih dahulu.');
        setOutput('');
        return;
      }
      const fn = m === 'encode' ? config.encode : config.decode;
      const result = await fn(effectiveInput, keys, { file });
      setOutput(result);
      setMode(m);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Terjadi kesalahan saat memproses.');
      setOutput('');
    }
  };

  const decodedBytes = useMemo(() => {
    if (!config.hexOutput || !output) return null;
    try {
      return new Uint8Array(
        output.match(/.{1,2}/g)!.map((h) => parseInt(h, 16))
      );
    } catch {
      return null;
    }
  }, [output, config.hexOutput]);

  const swap = () => {
    setInput(output || input);
    setOutput('');
    setMode(mode === 'encode' ? 'decode' : 'encode');
    setError(null);
  };

  const loadExample = () => {
    if (config.example) setInput(config.example);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" onClick={() => void run('encode')} disabled={!input && !file}>
          {mode === 'encode' ? 'Encode' : 'Encode'}
        </Button>
        <Button type="button" variant="secondary" onClick={() => void run('decode')} disabled={!input && !file}>
          {mode === 'decode' ? 'Decode' : 'Decode'}
        </Button>
        <SwapButton onClick={swap} />
        <ClearButton onClick={() => { setInput(''); setOutput(''); setError(null); }} />
        {config.example && (
          <Button type="button" variant="ghost" size="sm" onClick={loadExample}>
            Muat contoh
          </Button>
        )}
      </div>

      <Panel title="Input">
        <div className="space-y-3">
          {config.fileInput && (
            <FileDrop
              multiple={false}
              onFiles={(files) => setFile(files[0] ?? null)}
              hint="File dibaca lokal (ArrayBuffer). tidak di-upload."
            />
          )}
          {!config.fileInput && (
            <LabeledTextarea
              id={`${config.title}-input`}
              label="Input"
              value={input}
              onChange={setInput}
              placeholder={config.placeholder ?? 'Tempel data di sini…'}
              rows={6}
            />
          )}
          {keyFields.map((kf) => (
            <div key={kf.id}>
              <label htmlFor={`${config.title}-${kf.id}`} className="mb-1.5 block text-xs font-medium text-slate-400">
                {kf.label}
              </label>
              <input
                id={`${config.title}-${kf.id}`}
                type={kf.type ?? 'text'}
                value={keys[kf.id] ?? ''}
                onChange={(e) => setKeys((prev) => ({ ...prev, [kf.id]: e.target.value }))}
                placeholder={kf.placeholder}
                className="h-9 w-full max-w-sm rounded-lg border border-slate-700 bg-slate-900 px-3 font-mono text-sm text-slate-200 placeholder:text-slate-600 focus:border-accent-500 focus:outline-none focus:ring-2 focus:ring-accent-500/30"
              />
              {kf.hint && <p className="mt-1 text-xs text-slate-600">{kf.hint}</p>}
            </div>
          ))}
        </div>
      </Panel>

      <ErrorAlert message={error} />

      <Panel
        title="Output"
        action={
          <div className="flex items-center gap-1.5">
            <CopyButton text={output} />
            <DownloadButton text={output} filename={`${config.title.toLowerCase().replace(/\s+/g, '-')}-output.txt`} />
          </div>
        }
      >
        {config.hexOutput && decodedBytes ? (
          <div>
            <pre className="max-h-96 overflow-auto whitespace-pre-wrap break-all rounded-lg border border-slate-800 bg-slate-950/70 p-3 font-mono text-[13px] leading-5 text-emerald-300">
              {output}
            </pre>
            <p className="mt-2 text-xs text-slate-500">
              Decoded (UTF-8): <span className="text-slate-300">{bytesToUtf8(decodedBytes)}</span>
            </p>
          </div>
        ) : (
          <pre className="max-h-96 min-h-[3rem] overflow-auto whitespace-pre-wrap break-all rounded-lg border border-slate-800 bg-slate-950/70 p-3 font-mono text-[13px] leading-5 text-slate-200">
            {output || <span className="text-slate-600">Hasil akan tampil di sini…</span>}
          </pre>
        )}
      </Panel>

      {config.notes && config.notes.length > 0 && <ToolNotes notes={config.notes} />}
    </div>
  );
}

/** Helper: transform simetris (encode === decode). */
export function makeSymmetric(
  fn: (input: string, keys: Record<string, string>) => string | Promise<string>,
  config: Omit<TransformConfig, 'encode' | 'decode'> & { encode?: never; decode?: never }
): TransformConfig {
  return {
    ...config,
    encode: (i, k) => fn(i, k),
    decode: (i, k) => fn(i, k),
  };
}

/** Helper: output hex untuk transform yang menghasilkan bytes. */
export function bytesResult(bytes: Uint8Array): string {
  return bytesToHex(bytes);
}

export function bytesInput(hex: string): Uint8Array {
  const clean = hex.replace(/\s+/g, '');
  if (!/^[0-9a-fA-F]*$/.test(clean) || clean.length % 2 !== 0) {
    throw new Error('Input harus berupa hex (jumlah digit genap).');
  }
  return new Uint8Array(clean.match(/.{1,2}/g)!.map((h) => parseInt(h, 16)));
}

export function utf8Input(hexOrText: string): Uint8Array {
  const clean = hexOrText.replace(/\s+/g, '');
  if (/^[0-9a-fA-F]+$/.test(clean) && clean.length % 2 === 0 && clean.length > 2) {
    return bytesInput(clean);
  }
  return utf8ToBytes(hexOrText);
}
