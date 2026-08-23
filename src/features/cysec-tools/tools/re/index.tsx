/**
 * Tools kategori Reverse Engineering. hex/binary, integer/endian,
 * XOR cryptanalysis, parser header PE/ELF/Mach-O (read-only).
 */

import { useMemo, useState } from 'react';
import { Button } from '../../../../components/ui/button';
import { TransformTool, type TransformConfig } from '../../components/TransformTool';
import { FileAnalyzer, ResultPanel } from '../../components/FileAnalyzer';
import { FileDrop, type LoadedFile } from '../../components/FileDrop';
import {
  CopyButton, DownloadButton, ErrorAlert, KeyValueTable, LabeledTextarea, Notice, Panel, ToolNotes,
} from '../../components/ui';
import {
  base64ToBytes, binaryToBytes, bytesToBinary, bytesToHex, bytesToUtf8, hexDump, hexToBytes,
  readAscii, toArrayBuffer, utf8ToBytes,
} from '../../utils/bytes';
import { englishScore, letterFrequency } from '../../utils/encoding';
import { extractAsciiStrings, entropyOf } from '../../utils/analysis';
import { interpretBytes, searchBytes } from '../../utils/binaryInspector';
import { detectSignature } from '../../utils/analysis';
import { parseElf, parseMacho, parsePe } from '../../utils/binaryFormats';
import type { ComponentType } from 'react';

const reNotes = (what: string, how: string, extra?: string) => [
  { title: 'What is this?', content: what },
  { title: 'How to use', content: how },
  { title: 'Input', content: 'Teks / hex / file. tergantung tool.' },
  { title: 'Output', content: 'Hasil parsing/analisis read-only.' },
  { title: 'Notes', content: `Semua diproses lokal.${extra ? ' ' + extra : ''}` },
];

// ---------------------------------------------------------------------------
// Hex viewer
// ---------------------------------------------------------------------------

function HexViewerTool() {
  const [input, setInput] = useState('');
  const [mode, setMode] = useState<'text' | 'hex'>('text');
  const [rows, setRows] = useState(64);
  const [offset, setOffset] = useState(0);
  const [searchHex, setSearchHex] = useState('');
  const [result, setResult] = useState<{ bytes: Uint8Array; dump: string; shown: number } | null>(null);
  const [interpret, setInterpret] = useState<ReturnType<typeof interpretBytes> | null>(null);
  const [magic, setMagic] = useState<string[]>([]);
  const [hits, setHits] = useState<number[]>([]);
  const [error, setError] = useState<string | null>(null);

  const run = (targetOffset?: number) => {
    setError(null);
    try {
      if (!input.trim()) throw new Error('Input kosong.');
      const bytes = mode === 'hex' ? hexToBytes(input) : utf8ToBytes(input);
      const off = Math.max(0, Math.min(targetOffset ?? offset, Math.max(0, bytes.length - 1)));
      const limit = Math.min(rows * 16, bytes.length - off);
      const slice = bytes.subarray(off, off + limit);
      setResult({ bytes, dump: hexDump(slice, { offsetBase: off }), shown: slice.length });
      setOffset(off);
      setInterpret(bytes.length >= 1 ? interpretBytes(bytes.subarray(0, Math.min(8, bytes.length))) : null);
      setMagic(detectSignature(bytes).map((sg) => `${sg.name} (${sg.mime})`));
      if (searchHex.trim()) {
        let needle: Uint8Array;
        try {
          needle = hexToBytes(searchHex);
        } catch {
          needle = utf8ToBytes(searchHex);
        }
        setHits(searchBytes(bytes, needle));
      } else {
        setHits([]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Input tidak valid.');
      setResult(null);
    }
  };

  const jump = () => run(offset);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Button onClick={() => run()}>Lihat hex dump</Button>
        <label className="flex items-center gap-1.5 text-xs text-slate-400">
          Mode
          <select value={mode} onChange={(e) => setMode(e.target.value as 'text' | 'hex')} className="h-8 rounded-lg border border-slate-700 bg-slate-900 px-2 text-xs text-slate-200">
            <option value="text">Teks</option>
            <option value="hex">Hex</option>
          </select>
        </label>
        <label className="flex items-center gap-1.5 text-xs text-slate-400">
          Baris
          <input type="number" value={rows} min={1} max={100000} onChange={(e) => setRows(Number(e.target.value) || 16)} className="h-8 w-20 rounded-lg border border-slate-700 bg-slate-900 px-2 text-xs text-slate-200" />
        </label>
        <label className="flex items-center gap-1.5 text-xs text-slate-400">
          Offset
          <input type="number" value={offset} min={0} onChange={(e) => setOffset(Number(e.target.value) || 0)} className="h-8 w-28 rounded-lg border border-slate-700 bg-slate-900 px-2 font-mono text-xs text-slate-200" />
        </label>
        <Button variant="secondary" size="sm" onClick={jump}>Jump</Button>
      </div>

      <Panel title="Input">
        <LabeledTextarea id="hexview-input" label={mode === 'text' ? 'Teks' : 'Hex'} value={input} onChange={setInput} rows={6} placeholder={mode === 'text' ? 'Tempel teks…' : 'Tempel hex…'} />
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <input
            value={searchHex}
            onChange={(e) => setSearchHex(e.target.value)}
            placeholder="Search bytes (hex atau teks)…"
            aria-label="Cari bytes"
            className="h-8 w-64 rounded-lg border border-slate-700 bg-slate-900 px-3 font-mono text-xs text-slate-200 focus:border-accent-500 focus:outline-none"
          />
          <Button variant="secondary" size="sm" onClick={() => run()}>Search</Button>
        </div>
      </Panel>

      <ErrorAlert message={error} />

      {result && (
        <>
          <Panel title={`Hex dump (offset 0x${offset.toString(16)} - menampilkan ${result.shown} byte)`} action={<CopyButton text={result.dump} />}>
            <pre className="max-h-[36rem] overflow-auto rounded-lg border border-slate-800 bg-slate-950/70 p-3 font-mono text-[11px] leading-4 text-slate-300">
              {result.dump}
            </pre>
            {hits.length > 0 && (
              <p className="mt-2 text-xs text-slate-400">
                Ditemukan pada offset: {hits.slice(0, 20).map((h) => `0x${h.toString(16)}`).join(', ')}{hits.length > 20 ? ` … (+${hits.length - 20})` : ''}
              </p>
            )}
          </Panel>

          {interpret && (
            <Panel title="Interpretasi byte (8 byte pertama)">
              <KeyValueTable
                rows={[
                  { k: 'Decimal bytes', v: interpret.decimalBytes },
                  { k: 'u8 / i8', v: `${interpret.u8} / ${interpret.i8}` },
                  { k: 'u16 LE / BE', v: `${interpret.u16le} / ${interpret.u16be}` },
                  { k: 'i16 LE / BE', v: `${interpret.i16le} / ${interpret.i16be}` },
                  { k: 'u32 LE / BE', v: `${interpret.u32le} / ${interpret.u32be}` },
                  { k: 'i32 LE / BE', v: `${interpret.i32le} / ${interpret.i32be}` },
                  { k: 'u64 LE / BE', v: `${interpret.u64le} / ${interpret.u64be}` },
                  { k: 'float32 LE / BE', v: `${interpret.f32le.toFixed(6)} / ${interpret.f32be.toFixed(6)}` },
                  { k: 'float64 LE / BE', v: `${interpret.f64le.toFixed(6)} / ${interpret.f64be.toFixed(6)}` },
                ]}
              />
              <p className="mt-2 text-xs text-slate-500">LE = little-endian, BE = big-endian. Nilai dibaca dari byte pertama.</p>
            </Panel>
          )}

          {magic.length > 0 && (
            <Panel title="Magic number terdeteksi">
              <div className="flex flex-wrap gap-1.5">
                {magic.map((m, i) => (
                  <span key={i} className="rounded bg-emerald-500/10 px-2 py-1 text-xs text-emerald-300">{m}</span>
                ))}
              </div>
            </Panel>
          )}
        </>
      )}

      <ToolNotes notes={reNotes(
        'Hex dump dengan offset + ASCII, interpretasi integer/float (LE/BE), deteksi magic number, pencarian byte, dan lompat ke offset.',
        'Tempel teks/hex, pilih mode, klik Lihat hex dump. Gunakan field offset + Jump, dan Search bytes untuk mencari pola.',
        'Teks atau hex.'
      )} />
    </div>
  );
}

function HexEditorTool() {
  const [hex, setHex] = useState('48 65 6c 6c 6f');
  const [error, setError] = useState<string | null>(null);

  const bytes = useMemo(() => {
    try {
      return { bytes: hexToBytes(hex), error: null as string | null };
    } catch (err) {
      return { bytes: null as Uint8Array | null, error: err instanceof Error ? err.message : 'Hex tidak valid' };
    }
  }, [hex]);

  const asciiPreview = useMemo(() => {
    if (!bytes.bytes) return '';
    return Array.from(bytes.bytes, (b) => (b >= 32 && b < 127 ? String.fromCharCode(b) : '.')).join('');
  }, [bytes]);

  const download = () => {
    if (!bytes.bytes) return;
    const blob = new Blob([toArrayBuffer(bytes.bytes)], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'edited.bin';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <CopyButton text={hex} label="Copy hex" />
        <Button type="button" variant="secondary" onClick={download} disabled={!bytes.bytes}>⬇️ Export .bin</Button>
      </div>
      <Panel title="Hex bytes (edit langsung)">
        <LabeledTextarea
          id="hexeditor-input"
          label="Byte dalam hex (spasi opsional)"
          value={hex}
          onChange={(v) => {
            setHex(v);
            setError(null);
          }}
          rows={8}
          placeholder="48 65 6c 6c 6f …"
        />
        <ErrorAlert message={bytes.error ?? error} />
      </Panel>
      <Panel title="Pratinjau">
        <KeyValueTable
          rows={[
            { k: 'Panjang', v: bytes.bytes ? `${bytes.bytes.length} byte` : '-' },
            { k: 'ASCII', v: asciiPreview || '-' },
            { k: 'Entropy', v: bytes.bytes ? `${entropyOf(bytes.bytes).entropyBitsPerByte.toFixed(2)} bit/byte` : '-' },
          ]}
        />
        <pre className="mt-3 max-h-60 overflow-auto whitespace-pre-wrap break-all font-mono text-[11px] text-slate-300">
          {bytes.bytes ? hexDump(bytes.bytes.slice(0, 512)) : ''}
        </pre>
      </Panel>
      <ToolNotes notes={reNotes(
        'Editor hex ringan: edit byte langsung, pratinjau ASCII & entropy, export file .bin.',
        'Edit byte hex, lihat pratinjau, export bila perlu.',
        'Hex byte (tanpa prefix 0x).'
      )} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Binary viewer
// ---------------------------------------------------------------------------

function BinaryViewerTool() {
  const [input, setInput] = useState('');
  const [mode, setMode] = useState<'text' | 'hex'>('text');
  const [result, setResult] = useState('');
  const [error, setError] = useState<string | null>(null);
  const run = () => {
    setError(null);
    try {
      const bytes = mode === 'hex' ? hexToBytes(input) : utf8ToBytes(input);
      const bits = bytesToBinary(bytes, false);
      // format 8 bit per grup
      const groups: string[] = [];
      for (let i = 0; i < bits.length; i += 8) groups.push(bits.slice(i, i + 8));
      const rows: string[] = [];
      for (let i = 0; i < groups.length; i += 8) rows.push(groups.slice(i, i + 8).join(' '));
      setResult(rows.join('\n').slice(0, 200000));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Input tidak valid.');
    }
  };
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Button onClick={run}>Lihat biner</Button>
        <label className="flex items-center gap-1.5 text-xs text-slate-400">
          Mode
          <select value={mode} onChange={(e) => setMode(e.target.value as 'text' | 'hex')} className="h-8 rounded-lg border border-slate-700 bg-slate-900 px-2 text-xs text-slate-200">
            <option value="text">Teks</option>
            <option value="hex">Hex</option>
          </select>
        </label>
      </div>
      <Panel title="Input">
        <LabeledTextarea id="binview-input" label="Data" value={input} onChange={setInput} rows={5} placeholder={mode === 'text' ? 'Tempel teks…' : 'Tempel hex…'} />
      </Panel>
      <ErrorAlert message={error} />
      {result && (
        <Panel title="Biner (8 byte/baris)" action={<CopyButton text={result} />}>
          <pre className="max-h-96 overflow-auto break-all font-mono text-[11px] leading-4 text-slate-300">{result}</pre>
        </Panel>
      )}
      <ToolNotes notes={reNotes(
        'Menampilkan data sebagai bit string.',
        'Tempel teks/hex, klik Lihat biner.',
        'Teks atau hex.'
      )} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Byte frequency (file)
// ---------------------------------------------------------------------------

function ByteFrequencyTool() {
  return (
    <FileAnalyzer
      config={{
        title: 'Byte Frequency',
        description: 'Distribusi byte file',
        analyze: ({ bytes }) => {
          const e = entropyOf(bytes);
          const maxCount = Math.max(...e.topBytes.map((t) => t.count), 1);
          return (
            <ResultPanel title={`Distribusi byte (${e.totalBytes.toLocaleString()} byte)`}>
              <KeyValueTable
                rows={[
                  { k: 'Entropy', v: `${e.entropyBitsPerByte.toFixed(3)} bit/byte` },
                  { k: 'Distinct bytes', v: String(e.distinctBytes) },
                  { k: 'Top 16 bytes', v: `${e.topBytes.length} ditampilkan` },
                ]}
              />
              <div className="mt-4 space-y-1.5">
                {e.topBytes.map((t) => (
                  <div key={t.byte} className="flex items-center gap-2">
                    <span className="w-24 shrink-0 font-mono text-xs text-slate-400">
                      0x{t.hex} {t.byte >= 32 && t.byte < 127 ? `'${String.fromCharCode(t.byte)}'` : ''}
                    </span>
                    <div className="h-3 flex-1 overflow-hidden rounded bg-slate-800">
                      <div className="h-full bg-accent-500/70" style={{ width: `${(t.count / maxCount) * 100}%` }} />
                    </div>
                    <span className="w-28 shrink-0 text-right font-mono text-xs text-slate-500">{t.count.toLocaleString()} ({t.pct.toFixed(2)}%)</span>
                  </div>
                ))}
              </div>
            </ResultPanel>
          );
        },
        notes: reNotes(
          'Menghitung frekuensi tiap nilai byte (0–255) pada file.',
          'Upload file → histogram byte teratas.',
          'Berguna mendeteksi padding, encoding, dan struktur file.'
        ),
      }}
    />
  );
}

// ---------------------------------------------------------------------------
// ASCII viewer
// ---------------------------------------------------------------------------

function AsciiViewerTool() {
  const [input, setInput] = useState('');
  const [mode, setMode] = useState<'text' | 'hex'>('text');
  const [result, setResult] = useState('');
  const [error, setError] = useState<string | null>(null);
  const run = () => {
    setError(null);
    try {
      const bytes = mode === 'hex' ? hexToBytes(input) : utf8ToBytes(input);
      const lines: string[] = [];
      for (let i = 0; i < bytes.length; i += 16) {
        const slice = bytes.subarray(i, i + 16);
        const ascii = Array.from(slice, (b) => (b >= 32 && b < 127 ? String.fromCharCode(b) : '.')).join('');
        lines.push(`${i.toString(16).padStart(8, '0')}  ${ascii}`);
      }
      setResult(lines.join('\n'));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Input tidak valid.');
    }
  };
  return (
    <div className="space-y-4">
      <Button onClick={run}>Lihat ASCII</Button>
      <Panel title="Input">
        <LabeledTextarea id="asciiview-input" label="Data" value={input} onChange={setInput} rows={5} placeholder="Tempel teks atau hex…" />
        <div className="mt-2 flex gap-3">
          {(['text', 'hex'] as const).map((m) => (
            <label key={m} className="flex items-center gap-1.5 text-xs text-slate-400">
              <input type="radio" checked={mode === m} onChange={() => setMode(m)} className="accent-accent-500" /> {m}
            </label>
          ))}
        </div>
      </Panel>
      <ErrorAlert message={error} />
      {result && (
        <Panel title="ASCII view" action={<CopyButton text={result} />}>
          <pre className="max-h-96 overflow-auto font-mono text-[12px] leading-5 text-slate-300">{result}</pre>
        </Panel>
      )}
      <ToolNotes notes={reNotes(
        'Menampilkan byte sebagai karakter printable (non-printable jadi titik).',
        'Tempel data, pilih mode, klik Lihat ASCII.'
      )} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// UTF-8 / UTF-16 decoder
// ---------------------------------------------------------------------------

const utf8Tool: TransformConfig = {
  title: 'UTF-8 Decoder',
  description: 'Decode hex/base64 → UTF-8',
  placeholder: 'Hex atau base64… contoh: 48c3a96c6c6f',
  encode: (s) => bytesToHex(utf8ToBytes(s)),
  decode: (s) => {
    const clean = s.replace(/\s+/g, '');
    const bytes = /^[0-9a-fA-F]+$/.test(clean) && clean.length % 2 === 0 ? hexToBytes(clean) : base64ToBytes(clean);
    return bytesToUtf8(bytes, true);
  },
  example: 'H\u00e9llo \u00e7a va',
  notes: reNotes(
    'Decode byte (hex atau base64) menjadi teks UTF-8 dengan validasi ketat.',
    'Tempel hex/base64 → Decode. Encode untuk arah sebaliknya.'
  ),
};

const utf16Tool: TransformConfig = {
  title: 'UTF-16 Decoder',
  description: 'Decode UTF-16LE/BE dari hex',
  placeholder: 'Hex UTF-16… contoh: 480065006c006c006f00',
  encode: (s) => {
    const out: number[] = [];
    for (const ch of s) {
      const code = ch.codePointAt(0)!;
      if (code > 0xffff) {
        const cp = code - 0x10000;
        out.push(0xd800 + (cp >> 10), 0xdc00 + (cp & 0x3ff));
      } else {
        out.push(code);
      }
    }
    const bytes = new Uint8Array(out.length * 2);
    out.forEach((u, i) => {
      bytes[i * 2] = u & 0xff;
      bytes[i * 2 + 1] = (u >> 8) & 0xff;
    });
    return bytesToHex(bytes);
  },
  decode: (s) => {
    const bytes = hexToBytes(s);
    if (bytes.length % 2 !== 0) throw new Error('Jumlah byte harus genap (2 byte per unit UTF-16).');
    const out: string[] = [];
    for (let i = 0; i < bytes.length; i += 2) {
      const u = bytes[i] | (bytes[i + 1] << 8);
      out.push(String.fromCharCode(u));
    }
    return out.join('');
  },
  example: 'Hello \u4e16\u754c',
  notes: reNotes(
    'Decode hex UTF-16LE menjadi teks (little-endian default).',
    'Tempel hex → Decode. Encode menghasilkan hex UTF-16LE.'
  ),
};

// ---------------------------------------------------------------------------
// Binary ↔ Hex
// ---------------------------------------------------------------------------

const binaryHexTool: TransformConfig = {
  title: 'Binary ↔ Hex',
  description: 'Konversi bit string ke hex',
  placeholder: 'Biner atau hex…',
  encode: (s) => bytesToHex(binaryToBytes(s)),
  decode: (s) => bytesToBinary(hexToBytes(s)),
  example: '01001000 01101001',
  notes: reNotes(
    'Konversi antar representasi biner dan hex (bit string diabaikan spasi).',
    'Tempel biner → Encode (hex), atau hex → Decode (biner).'
  ),
};

// ---------------------------------------------------------------------------
// Integer converter
// ---------------------------------------------------------------------------

function IntegerConverterTool() {
  const [input, setInput] = useState('0xdeadbeef');
  const [result, setResult] = useState<{
    dec: string; unsigned: string; hex: string; bin: string; oct: string;
    u16le: string; u16be: string; u32le: string; u32be: string; u64le: string; u64be: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const run = () => {
    setError(null);
    try {
      const clean = input.trim();
      let neg = false;
      let body = clean;
      if (body.startsWith('-')) {
        neg = true;
        body = body.slice(1);
      }
      let radix = 10;
      if (/^0x/i.test(body)) {
        radix = 16;
        body = body.slice(2);
      } else if (/^0b/i.test(body)) {
        radix = 2;
        body = body.slice(2);
      } else if (/^0o/i.test(body)) {
        radix = 8;
        body = body.slice(2);
      }
      if (!/^[0-9a-fA-F]+$/.test(body)) throw new Error('Digit tidak valid untuk radix tersebut.');
      const v = BigInt(parseInt(body, radix));
      const value = neg ? -v : v;
      const u32v = value & 0xffffffffn;
      const u64v = value & 0xffffffffffffffffn;
      const le = (n: bigint, bytes: number): string => {
        const out: number[] = [];
        for (let i = 0; i < bytes; i++) out.push(Number((n >> BigInt(8 * i)) & 0xffn));
        return out.map((b) => b.toString(16).padStart(2, '0')).join(' ');
      };
      const be = (n: bigint, bytes: number): string => {
        const out: number[] = [];
        for (let i = bytes - 1; i >= 0; i--) out.push(Number((n >> BigInt(8 * i)) & 0xffn));
        return out.map((b) => b.toString(16).padStart(2, '0')).join(' ');
      };
      setResult({
        dec: value.toString(10),
        unsigned: (value < 0n ? value + (1n << 64n) : value).toString(10),
        hex: `0x${(value < 0n ? -value : value).toString(16)}`,
        bin: (value < 0n ? -value : value).toString(2),
        oct: (value < 0n ? -value : value).toString(8),
        u16le: le(u32v, 2),
        u16be: be(u32v, 2),
        u32le: le(u32v, 4),
        u32be: be(u32v, 4),
        u64le: le(u64v, 8),
        u64be: be(u64v, 8),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Input tidak valid.');
    }
  };

  return (
    <div className="space-y-4">
      <Button onClick={run}>Convert</Button>
      <Panel title="Input">
        <LabeledTextarea id="int-input" label="Integer (dec, 0x hex, 0b biner, 0o oktal)" value={input} onChange={setInput} rows={2} placeholder="0xdeadbeef" />
      </Panel>
      <ErrorAlert message={error} />
      {result && (
        <Panel title="Representasi" action={<CopyButton text={JSON.stringify(result, null, 2)} />}>
          <KeyValueTable
            rows={[
              { k: 'Signed decimal', v: result.dec },
              { k: 'Unsigned (64-bit)', v: result.unsigned },
              { k: 'Hex', v: result.hex },
              { k: 'Binary', v: result.bin },
              { k: 'Octal', v: result.oct },
              { k: 'u16 little-endian', v: result.u16le },
              { k: 'u16 big-endian', v: result.u16be },
              { k: 'u32 little-endian', v: result.u32le },
              { k: 'u32 big-endian', v: result.u32be },
              { k: 'u64 little-endian', v: result.u64le },
              { k: 'u64 big-endian', v: result.u64be },
            ]}
          />
        </Panel>
      )}
      <ToolNotes notes={reNotes(
        'Konversi integer antar representasi + byte order (endianness) untuk 16/32/64-bit.',
        'Masukkan integer (dec/hex/bin/oct), klik Convert.'
      )} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Endianness converter
// ---------------------------------------------------------------------------

function EndiannessTool() {
  const [hex, setHex] = useState('deadbeef');
  const [width, setWidth] = useState<2 | 4 | 8>(4);
  const [result, setResult] = useState<{ le: string; be: string; swapped: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const run = () => {
    setError(null);
    try {
      const bytes = hexToBytes(hex);
      if (bytes.length === 0 || bytes.length % width !== 0) {
        throw new Error(`Panjang hex harus kelipatan ${width} byte (${width * 2} digit).`);
      }
      const le: string[] = [];
      const be: string[] = [];
      const swapped: string[] = [];
      for (let i = 0; i < bytes.length; i += width) {
        const chunk = bytes.subarray(i, i + width);
        le.push(Array.from(chunk, (b) => b.toString(16).padStart(2, '0')).join(' '));
        be.push(Array.from(chunk).reverse().map((b) => b.toString(16).padStart(2, '0')).join(' '));
        swapped.push(Array.from(chunk).reverse().map((b) => b.toString(16).padStart(2, '0')).join(''));
      }
      setResult({
        le: le.join(' | '),
        be: be.join(' | '),
        swapped: swapped.join(''),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Input tidak valid.');
    }
  };

  return (
    <div className="space-y-4">
      <Button onClick={run}>Ubah endian</Button>
      <Panel title="Input">
        <div className="space-y-3">
          <LabeledTextarea id="endian-input" label="Hex (tanpa spasi)" value={hex} onChange={setHex} rows={3} placeholder="deadbeef" />
          <label className="flex items-center gap-2 text-xs text-slate-400">
            Lebar unit
            <select value={width} onChange={(e) => setWidth(Number(e.target.value) as 2 | 4 | 8)} className="h-8 rounded-lg border border-slate-700 bg-slate-900 px-2 text-xs text-slate-200">
              <option value={2}>16-bit (2 byte)</option>
              <option value={4}>32-bit (4 byte)</option>
              <option value={8}>64-bit (8 byte)</option>
            </select>
          </label>
        </div>
      </Panel>
      <ErrorAlert message={error} />
      {result && (
        <Panel title="Hasil" action={<CopyButton text={`LE: ${result.le}\nBE: ${result.be}`} />}>
          <KeyValueTable
            rows={[
              { k: 'Little-endian', v: result.le },
              { k: 'Big-endian', v: result.be },
              { k: 'Swapped (hex)', v: result.swapped },
            ]}
          />
        </Panel>
      )}
      <ToolNotes notes={reNotes(
        'Membalik byte order (little ↔ big endian) per unit 16/32/64-bit.',
        'Tempel hex, pilih lebar unit, klik Ubah endian.'
      )} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// XOR analyzer (single-byte brute force)
// ---------------------------------------------------------------------------

function XorAnalyzerTool() {
  const [hex, setHex] = useState('1b3c1d1a1c1e1f');
  const [keyLen, setKeyLen] = useState(1);
  const [result, setResult] = useState<{ key: number; keyChar: string; text: string; score: number }[]>([]);
  const [error, setError] = useState<string | null>(null);

  const run = () => {
    setError(null);
    try {
      const data = hexToBytes(hex);
      if (data.length === 0) throw new Error('Hex kosong.');
      if (keyLen === 1) {
        const candidates: { key: number; keyChar: string; text: string; score: number }[] = [];
        for (let k = 0; k < 256; k++) {
          const out = data.map((b) => b ^ k);
          const text = Array.from(out, (b) => (b >= 32 && b < 127 ? String.fromCharCode(b) : '')).join('');
          const printable = out.filter((b) => b >= 32 && b < 127).length / out.length;
          if (printable > 0.7) {
            candidates.push({ key: k, keyChar: String.fromCharCode(k), text, score: englishScore(text) });
          }
        }
        candidates.sort((a, b) => b.score - a.score);
        setResult(candidates.slice(0, 10));
      } else {
        // repeating-key: pecah per posisi key, cari byte terbaik tiap posisi
        const keyBytes: number[] = [];
        for (let pos = 0; pos < keyLen; pos++) {
          const chunk: number[] = [];
          for (let i = pos; i < data.length; i += keyLen) chunk.push(data[i]);
          let best = { k: 0, score: -1 };
          for (let k = 0; k < 256; k++) {
            const out = chunk.map((b) => b ^ k);
            const text = Array.from(out, (b) => (b >= 32 && b < 127 ? String.fromCharCode(b) : '')).join('');
            const printable = out.filter((b) => b >= 32 && b < 127).length / out.length;
            const score = englishScore(text) * (printable > 0.7 ? 1 : 0.1);
            if (score > best.score) best = { k, score };
          }
          keyBytes.push(best.k);
        }
        const out = data.map((b, i) => b ^ keyBytes[i % keyLen]);
        const text = Array.from(out, (b) => (b >= 32 && b < 127 ? String.fromCharCode(b) : '')).join('');
        setResult([
          {
            key: 0,
            keyChar: keyBytes.map((k) => String.fromCharCode(k)).join(''),
            text,
            score: englishScore(text),
          },
        ]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Input tidak valid.');
    }
  };

  return (
    <div className="space-y-4">
      <Button onClick={run}>⊕ Analisis XOR</Button>
      <Panel title="Input">
        <div className="space-y-3">
          <LabeledTextarea id="xoranalyze-input" label="Hex data" value={hex} onChange={setHex} rows={4} placeholder="hex…" />
          <label className="flex items-center gap-2 text-xs text-slate-400">
            Panjang key (1 = single-byte, &gt;1 = repeating-key)
            <input type="number" value={keyLen} min={1} max={64} onChange={(e) => setKeyLen(Number(e.target.value) || 1)} className="h-8 w-20 rounded-lg border border-slate-700 bg-slate-900 px-2 text-sm text-slate-200" />
          </label>
        </div>
      </Panel>
      <ErrorAlert message={error} />
      {result.length > 0 && (
        <Panel title={keyLen === 1 ? 'Kandidat key (top 10 by English score)' : 'Key tertebak + plaintext'}>
          <div className="space-y-2">
            {result.map((r, i) => (
              <div key={i} className="rounded-lg border border-slate-800 bg-slate-900/50 px-3 py-2">
                <p className="text-xs text-slate-500">
                  Key: <code className="text-amber-300">{keyLen === 1 ? `0x${r.key.toString(16).padStart(2, '0')} ('${r.keyChar}')` : r.keyChar}</code> · score: {r.score.toFixed(2)}
                </p>
                <pre className="mt-1 max-h-32 overflow-auto whitespace-pre-wrap break-all font-mono text-[13px] text-slate-200">{r.text}</pre>
              </div>
            ))}
          </div>
        </Panel>
      )}
      <ToolNotes notes={reNotes(
        'Brute-force single-byte XOR dengan skor kemiripan bahasa Inggris, atau tebak repeating-key per posisi.',
        'Tempel hex (ciphertext), atur panjang key, klik Analisis XOR.',
        'Heuristik. bukan jaminan. Untuk CTF, cek hasil yang paling "manusiawi".'
      )} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// PE viewer
// ---------------------------------------------------------------------------

function PeViewerTool() {
  return (
    <FileAnalyzer
      config={{
        title: 'PE Viewer',
        description: 'Parse header PE (read-only)',
        accept: '.exe,.dll,.sys,.scr,.ocx,application/x-msdownload',
        analyze: ({ file, bytes }) => {
          const pe = parsePe(bytes);
          if (!pe.valid) {
            return (
              <ResultPanel title="PE">
                <p className="text-sm text-amber-300">{pe.error}</p>
              </ResultPanel>
            );
          }
          return (
            <div className="space-y-4">
              <ResultPanel title="Headers" textToCopy={JSON.stringify(pe, null, 2)}>
                <KeyValueTable
                  rows={[
                    { k: 'Machine', v: `${pe.machine} (${pe.machineCode})` },
                    { k: 'Sections', v: String(pe.numberOfSections) },
                    { k: 'TimeDateStamp', v: pe.timeDateStamp ?? '-' },
                    { k: 'Magic', v: pe.magic ?? '-' },
                    { k: 'Entry point (RVA)', v: `${pe.entryPointRva} (file offset ${pe.entryPointFileOffset ?? '-'})` },
                    { k: 'Image base', v: pe.imageBase ?? '-' },
                    { k: 'Subsystem', v: pe.subsystem ?? '-' },
                    { k: 'DLL characteristics', v: (pe.dllCharacteristic ?? []).join(', ') || '-' },
                    { k: 'Characteristics', v: (pe.characteristics ?? []).join(', ') || '-' },
                  ]}
                />
              </ResultPanel>
              <ResultPanel title="Sections">
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-xs">
                    <thead>
                      <tr className="text-left text-slate-500">
                        <th className="py-1.5 pr-3">Nama</th>
                        <th className="py-1.5 pr-3">VA</th>
                        <th className="py-1.5 pr-3">VSize</th>
                        <th className="py-1.5 pr-3">RawSize</th>
                        <th className="py-1.5 pr-3">RawOff</th>
                        <th className="py-1.5">R/W/X</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pe.sections.map((s) => (
                        <tr key={s.name} className="border-t border-slate-800/60">
                          <td className="py-1.5 pr-3 font-mono text-slate-300">{s.name}</td>
                          <td className="py-1.5 pr-3 font-mono text-slate-500">0x{s.virtualAddress.toString(16)}</td>
                          <td className="py-1.5 pr-3 font-mono text-slate-500">{s.virtualSize.toLocaleString()}</td>
                          <td className="py-1.5 pr-3 font-mono text-slate-500">{s.rawSize.toLocaleString()}</td>
                          <td className="py-1.5 pr-3 font-mono text-slate-500">0x{s.rawOffset.toString(16)}</td>
                          <td className="py-1.5 font-mono text-slate-400">
                            {s.readable ? 'R' : '-'}{s.writable ? 'W' : '-'}{s.executable ? 'X' : '-'}
                            {s.executable && s.writable && <span className="ml-2 text-amber-400">⚠ RWX</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </ResultPanel>
              {pe.exports.length > 0 && (
                <ResultPanel title={`Exports (${pe.exports.length})`}>
                  <div className="max-h-72 overflow-auto">
                    <table className="w-full border-collapse text-xs">
                      <thead>
                        <tr className="text-left text-slate-500">
                          <th className="px-2 py-1">Name</th>
                          <th className="px-2 py-1">Ordinal</th>
                          <th className="px-2 py-1">Address RVA</th>
                        </tr>
                      </thead>
                      <tbody>
                        {pe.exports.slice(0, 300).map((ex, i) => (
                          <tr key={i} className="border-t border-slate-800/50">
                            <td className="break-all px-2 py-1 font-mono text-slate-200">{ex.name}</td>
                            <td className="px-2 py-1 font-mono text-slate-500">{ex.ordinal}</td>
                            <td className="px-2 py-1 font-mono text-slate-500">{ex.addressRva}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </ResultPanel>
              )}
              <ResultPanel title={`Imports (${pe.imports.length} DLL)`}>
                {pe.imports.length === 0 && <p className="text-sm text-slate-500">Tidak ada import table terdeteksi.</p>}
                <div className="space-y-3">
                  {pe.imports.map((imp) => (
                    <div key={imp.dll}>
                      <p className="font-mono text-sm text-slate-200">{imp.dll}</p>
                      <p className="mt-0.5 break-all font-mono text-[11px] leading-4 text-slate-500">
                        {imp.functions.slice(0, 60).join(', ')}
                        {imp.functions.length > 60 ? ` … (+${imp.functions.length - 60})` : ''}
                      </p>
                    </div>
                  ))}
                </div>
              </ResultPanel>
            </div>
          );
        },
        notes: reNotes(
          'Parser PE read-only: DOS header, PE signature, COFF header, optional header (PE32/PE32+), section table, dan import table (dengan mapping RVA→offset).',
          'Upload file .exe/.dll → header ditampilkan.',
          'Read-only. tidak ada eksekusi. RWX section adalah indikator mencurigakan pada malware.'
        ),
      }}
    />
  );
}

// ---------------------------------------------------------------------------
// ELF viewer
// ---------------------------------------------------------------------------

function ElfViewerTool() {
  return (
    <FileAnalyzer
      config={{
        title: 'ELF Viewer',
        description: 'Parse header ELF (read-only)',
        accept: '.elf,application/x-executable,application/x-elf',
        analyze: ({ file, bytes }) => {
          const elf = parseElf(bytes);
          if (!elf.valid) {
            return (
              <ResultPanel title="ELF">
                <p className="text-sm text-amber-300">{elf.error}</p>
              </ResultPanel>
            );
          }
          return (
            <div className="space-y-4">
              <ResultPanel title="ELF header" textToCopy={JSON.stringify(elf, null, 2)}>
                <KeyValueTable
                  rows={[
                    { k: 'Class', v: elf.className ?? '-' },
                    { k: 'Endianness', v: elf.endian ?? '-' },
                    { k: 'OS/ABI', v: elf.osabi ?? '-' },
                    { k: 'Type', v: elf.type ?? '-' },
                    { k: 'Machine', v: elf.machine ?? '-' },
                    { k: 'Entry point', v: elf.entryPoint ?? '-' },
                    { k: 'ELF header size', v: String(elf.elfHeaderSize) },
                  ]}
                />
              </ResultPanel>
              <ResultPanel title={`Program headers (${elf.segments.length})`}>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-xs">
                    <thead>
                      <tr className="text-left text-slate-500">
                        <th className="py-1.5 pr-3">Type</th>
                        <th className="py-1.5 pr-3">Offset</th>
                        <th className="py-1.5 pr-3">VAddr</th>
                        <th className="py-1.5 pr-3">FileSz</th>
                        <th className="py-1.5 pr-3">MemSz</th>
                        <th className="py-1.5">Flags</th>
                      </tr>
                    </thead>
                    <tbody>
                      {elf.segments.map((s, i) => (
                        <tr key={i} className="border-t border-slate-800/60">
                          <td className="py-1.5 pr-3 font-mono text-slate-300">{s.type}</td>
                          <td className="py-1.5 pr-3 font-mono text-slate-500">{s.offset}</td>
                          <td className="py-1.5 pr-3 font-mono text-slate-500">{s.vaddr}</td>
                          <td className="py-1.5 pr-3 font-mono text-slate-500">{s.filesz}</td>
                          <td className="py-1.5 pr-3 font-mono text-slate-500">{s.memsz}</td>
                          <td className="py-1.5 font-mono text-slate-400">{s.flags}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </ResultPanel>
              {elf.symbols.length > 0 && (
                <ResultPanel title={`Symbols (${elf.symbols.length})`}>
                  <div className="max-h-72 overflow-auto">
                    <table className="w-full border-collapse text-xs">
                      <thead>
                        <tr className="text-left text-slate-500">
                          <th className="px-2 py-1">Name</th>
                          <th className="px-2 py-1">Type</th>
                          <th className="px-2 py-1">Value</th>
                          <th className="px-2 py-1">Size</th>
                        </tr>
                      </thead>
                      <tbody>
                        {elf.symbols.slice(0, 300).map((sym, i) => (
                          <tr key={i} className="border-t border-slate-800/50">
                            <td className="break-all px-2 py-1 font-mono text-slate-200">{sym.name}</td>
                            <td className="px-2 py-1 text-slate-500">{sym.type}</td>
                            <td className="px-2 py-1 font-mono text-slate-500">{sym.value}</td>
                            <td className="px-2 py-1 font-mono text-slate-500">{sym.size}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </ResultPanel>
              )}
              <ResultPanel title={`Section headers (${elf.sections.length})`}>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-xs">
                    <thead>
                      <tr className="text-left text-slate-500">
                        <th className="py-1.5 pr-3">Nama</th>
                        <th className="py-1.5 pr-3">Type</th>
                        <th className="py-1.5 pr-3">Addr</th>
                        <th className="py-1.5 pr-3">Offset</th>
                        <th className="py-1.5 pr-3">Size</th>
                        <th className="py-1.5">Flags</th>
                      </tr>
                    </thead>
                    <tbody>
                      {elf.sections.map((s, i) => (
                        <tr key={i} className="border-t border-slate-800/60">
                          <td className="py-1.5 pr-3 font-mono text-slate-300">{s.name || `#${i}`}</td>
                          <td className="py-1.5 pr-3 text-slate-500">{s.type}</td>
                          <td className="py-1.5 pr-3 font-mono text-slate-500">{s.addr}</td>
                          <td className="py-1.5 pr-3 font-mono text-slate-500">{s.offset}</td>
                          <td className="py-1.5 pr-3 font-mono text-slate-500">{s.size}</td>
                          <td className="py-1.5 font-mono text-slate-500">{s.flags}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </ResultPanel>
            </div>
          );
        },
        notes: reNotes(
          'Parser ELF read-only: e_ident (class/endian/ABI), type, machine, entry point, program headers, dan section headers.',
          'Upload file ELF (Linux binary/object) → header ditampilkan.',
          'Read-only. STRIP/relokasi memengaruhi nama section yang tersedia.'
        ),
      }}
    />
  );
}

// ---------------------------------------------------------------------------
// Mach-O viewer
// ---------------------------------------------------------------------------

function MachoViewerTool() {
  return (
    <FileAnalyzer
      config={{
        title: 'Mach-O Viewer',
        description: 'Header dasar Mach-O (read-only)',
        analyze: ({ file, bytes }) => {
          const macho = parseMacho(bytes);
          if (!macho.valid) {
            return (
              <ResultPanel title="Mach-O">
                <p className="text-sm text-amber-300">{macho.error}</p>
              </ResultPanel>
            );
          }
          return (
            <ResultPanel title="Mach-O header" textToCopy={JSON.stringify(macho, null, 2)}>
              <KeyValueTable
                rows={[
                  { k: 'Arch', v: macho.arch ?? '-' },
                  { k: 'CPU type', v: macho.cputype ?? '-' },
                  { k: 'CPU subtype', v: macho.cpusubtype ?? '-' },
                  { k: 'File type', v: macho.filetype ?? '-' },
                  { k: 'Load commands', v: String(macho.ncmds ?? 0) },
                  { k: 'Size of load commands', v: String(macho.sizeofcmds ?? 0) },
                  { k: 'Flags', v: (macho.flags ?? []).join(', ') || '-' },
                ]}
              />
              <Notice tone="warn">Parsing penuh load commands (segments, symbols, dylibs) belum disertakan. hanya header dasar 64-bit LE/BE.</Notice>
            </ResultPanel>
          );
        },
        notes: reNotes(
          'Menampilkan header dasar Mach-O: magic, cputype, filetype, load commands count, flags.',
          'Upload binary Mach-O (macOS) → header dasar ditampilkan.',
          'Status: sebagian. parsing load commands penuh adalah client-side limitation untuk versi ini.'
        ),
      }}
    />
  );
}

// ---------------------------------------------------------------------------
// Printable strings scanner (hex atau file)
// ---------------------------------------------------------------------------

function PrintableStringsTool() {
  const [hex, setHex] = useState('');
  const [file, setFile] = useState<LoadedFile | null>(null);
  const [minLen, setMinLen] = useState(4);
  const [result, setResult] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const run = () => {
    setError(null);
    try {
      let bytes: Uint8Array;
      if (file) bytes = file.bytes;
      else {
        if (!hex.trim()) throw new Error('Tempel hex ATAU upload file.');
        bytes = hexToBytes(hex);
      }
      const strings = extractAsciiStrings(bytes, minLen);
      setResult(strings.map((s) => s.value));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memindai.');
      setResult([]);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Button onClick={run}>📜 Scan</Button>
        <label className="flex items-center gap-2 text-xs text-slate-400">
          Min length
          <input type="number" value={minLen} min={1} max={64} onChange={(e) => setMinLen(Number(e.target.value) || 4)} className="h-8 w-16 rounded-lg border border-slate-700 bg-slate-900 px-2 text-sm text-slate-200" />
        </label>
      </div>
      <FileDrop multiple={false} onFiles={(f) => setFile(f[0] ?? null)} hint="Opsional. atau tempel hex di bawah." />
      <Panel title="Atau paste hex">
        <LabeledTextarea id="printable-input" label="Hex data" value={hex} onChange={setHex} rows={5} placeholder="48 65 6c 6c 6f …" />
      </Panel>
      <ErrorAlert message={error} />
      {result.length > 0 && (
        <Panel title={`String printable (${result.length})`} action={<CopyButton text={result.join('\n')} />}>
          <pre className="max-h-96 overflow-auto whitespace-pre-wrap break-all font-mono text-[12px] leading-5 text-slate-300">
            {result.join('\n')}
          </pre>
        </Panel>
      )}
      <ToolNotes notes={reNotes(
        'Memindai string printable ASCII dari data (hex atau file).',
        'Tempel hex atau upload file, atur min length, klik Scan.'
      )} />
    </div>
  );
}

export const tools: Record<string, ComponentType> = {
  'hex-viewer': HexViewerTool,
  'hex-editor': HexEditorTool,
  'binary-viewer': BinaryViewerTool,
  'byte-frequency': ByteFrequencyTool,
  'ascii-viewer': AsciiViewerTool,
  utf8: () => <TransformTool {...utf8Tool} />,
  utf16: () => <TransformTool {...utf16Tool} />,
  'binary-hex': () => <TransformTool {...binaryHexTool} />,
  'integer-converter': IntegerConverterTool,
  endianness: EndiannessTool,
  'xor-analyzer': XorAnalyzerTool,
  'pe-viewer': PeViewerTool,
  'elf-viewer': ElfViewerTool,
  'macho-viewer': MachoViewerTool,
  'printable-strings': PrintableStringsTool,
};

export default function ReModule() {
  return null;
}
