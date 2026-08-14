/**
 * Tools kategori Digital Forensics. analisis file 100% lokal.
 */

import { useState } from 'react';
import { Button } from '../../../../components/ui/button';
import { FileAnalyzer, ResultPanel } from '../../components/FileAnalyzer';
import { FileDrop, type LoadedFile } from '../../components/FileDrop';
import {
  CopyButton, ErrorAlert, KeyValueTable, LabeledTextarea, Notice, Panel, ToolNotes,
} from '../../components/ui';
import { bytesToHex, bytesToUtf8, hexDump } from '../../utils/bytes';
import { detectSignature, entropyOf, extractAsciiStrings, extractUtf16Strings } from '../../utils/analysis';
import {
  collectFileInfo, formatDate, parseExif, parsePdfMetadata, parseTimestamp,
  parseZipListing, pdfDateToISO,
} from '../../utils/files';
import { md5, shaDigest } from '../../utils/crypto';
import type { ComponentType } from 'react';

const LOCAL_NOTE =
  'File diproses secara lokal di browser (File API → ArrayBuffer) dan tidak dikirim ke server. Tidak ada upload jaringan.';

const forensicsNotes = (what: string, how: string, extra?: string) => [
  { title: 'What is this?', content: what },
  { title: 'How to use', content: how },
  { title: 'Input', content: 'File dari perangkat Anda.' },
  { title: 'Output', content: 'Hasil analisis ditampilkan di halaman.' },
  { title: 'Notes', content: `${LOCAL_NOTE}${extra ? ' ' + extra : ''}` },
];

// ---------------------------------------------------------------------------
// File metadata viewer
// ---------------------------------------------------------------------------

function MetadataTool() {
  return (
    <FileAnalyzer
      config={{
        title: 'File Metadata',
        description: 'Informasi file + hash',
        analyze: async ({ file, bytes }) => {
          const info = await collectFileInfo(file, bytes);
          return (
            <ResultPanel title="Metadata" textToCopy={JSON.stringify(info, null, 2)}>
              <KeyValueTable
                rows={[
                  { k: 'Filename', v: info.name },
                  { k: 'Size', v: `${info.size} (${info.sizeHuman})` },
                  { k: 'MIME type', v: info.type },
                  { k: 'Extension', v: info.extension || '(tidak ada)' },
                  { k: 'Last modified', v: info.lastModifiedISO ?? '-' },
                  { k: 'Magic bytes (16)', v: info.magicHex },
                  { k: 'SHA-256', v: info.sha256 },
                  { k: 'SHA-1', v: info.sha1 },
                  { k: 'MD5', v: info.md5 },
                ]}
              />
              <div className="mt-4">
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">File signature</h3>
                {info.signatures.length ? (
                  <div className="space-y-1.5">
                    {info.signatures.map((s, i) => (
                      <p key={i} className="text-sm text-slate-300">
                        <span className="text-slate-500">{s.name}</span> · <span className="text-slate-500">{s.extension}</span> · {s.mime}
                      </p>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-slate-500">Tidak ada signature yang dikenali (bisa file teks atau format custom).</p>
                )}
              </div>
              <p className="mt-4 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-300">{LOCAL_NOTE}</p>
            </ResultPanel>
          );
        },
        notes: forensicsNotes(
          'Menampilkan metadata file: nama, ukuran, MIME, magic bytes, hash integritas, dan waktu modifikasi.',
          'Upload satu file lalu lihat hasil. Semua dihitung dari ArrayBuffer lokal.',
          'Last modified berasal dari filesystem (bukan metadata tertanam) dan dapat diubah attacker.'
        ),
      }}
    />
  );
}

// ---------------------------------------------------------------------------
// File hash
// ---------------------------------------------------------------------------

function FileHashTool() {
  return (
    <FileAnalyzer
      config={{
        title: 'File Hash',
        description: 'SHA-256/1, MD5 file',
        analyze: async ({ file, bytes }) => {
          const [sha256, sha1] = await Promise.all([
            shaDigest(bytes, 'SHA-256'),
            shaDigest(bytes, 'SHA-1'),
          ]);
          const rows = [
            { k: 'SHA-256', v: bytesToHex(sha256) },
            { k: 'SHA-1', v: bytesToHex(sha1) },
            { k: 'MD5', v: md5(bytes) },
            { k: 'Size', v: String(file.size) },
          ];
          return (
            <ResultPanel title="Hash file" textToCopy={rows.map((r) => `${r.k}: ${r.v}`).join('\n')}>
              <KeyValueTable rows={rows} />
              <p className="mt-3 text-xs text-amber-200">
                MD5 is cryptographically broken and should not be used for password storage. Disediakan untuk kompatibilitas, forensik, dan edukasi.
              </p>
              <p className="mt-2 text-xs text-slate-500">Gunakan SHA-256 untuk verifikasi integritas modern (mis. mencocokkan dengan nilai yang dipublikasikan distributor).</p>
            </ResultPanel>
          );
        },
        notes: forensicsNotes(
          'Menghitung hash file untuk verifikasi integritas dan deteksi perubahan.',
          'Upload file → hash dihitung dari ArrayBuffer.',
          'Hash sama ≠ file pasti aman; ini hanya jaminan integritas.'
        ),
      }}
    />
  );
}

// ---------------------------------------------------------------------------
// File signature / magic number
// ---------------------------------------------------------------------------

function FileSignatureTool() {
  return (
    <FileAnalyzer
      config={{
        title: 'File Signature',
        description: 'Deteksi jenis file dari magic bytes',
        analyze: ({ file, bytes }) => {
          const sigs = detectSignature(bytes);
          const ext = file.name.includes('.') ? file.name.split('.').pop()!.toLowerCase() : '';
          return (
            <ResultPanel title="Magic number analysis" textToCopy={JSON.stringify({ name: file.name, ext, signatures: sigs }, null, 2)}>
              <KeyValueTable
                rows={[
                  { k: 'Filename', v: file.name },
                  { k: 'Extension file', v: ext || '(tidak ada)' },
                  { k: 'First 16 bytes (hex)', v: bytesToHex(bytes.slice(0, 16)) },
                  { k: 'First 16 bytes (ASCII)', v: Array.from(bytes.slice(0, 16), (b) => (b >= 32 && b < 127 ? String.fromCharCode(b) : '.')).join('') },
                ]}
              />
              <h3 className="mt-4 mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">Signature terdeteksi</h3>
              {sigs.length ? (
                <div className="space-y-1.5">
                  {sigs.map((s, i) => (
                    <div key={i} className="rounded-lg border border-slate-800 bg-slate-900/60 px-3 py-2">
                      <p className="text-sm font-medium text-slate-200">{s.name}</p>
                      <p className="text-xs text-slate-500">
                        {s.extension} · {s.mime} · confidence: {s.confidence}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-500">
                  Tidak ada signature umum yang cocok. Periksa hex di atas. bisa jadi format custom/teks, atau file rusak. <strong>Perhatikan:</strong> extension file bisa dipalsukan; magic bytes tidak.
                </p>
              )}
            </ResultPanel>
          );
        },
        notes: forensicsNotes(
          'Magic number = byte pertama file yang mengidentifikasi format sebenarnya, tidak peduli nama extension.',
          'Upload file → signature dicocokkan dengan tabel signature umum.',
          'Spoofing: attacker dapat menempelkan magic PNG di depan file lain. Untuk forensik, bandingkan magic + struktur lengkap.'
        ),
      }}
    />
  );
}

// ---------------------------------------------------------------------------
// MIME detector
// ---------------------------------------------------------------------------

function MimeTool() {
  return (
    <FileAnalyzer
      config={{
        title: 'MIME Detector',
        description: 'Deteksi MIME type',
        analyze: ({ file, bytes }) => {
          const sigs = detectSignature(bytes);
          const sniffed = sigs[0]?.mime ?? 'application/octet-stream';
          return (
            <ResultPanel title="MIME analysis">
              <KeyValueTable
                rows={[
                  { k: 'File.type (dari browser)', v: file.type || '(kosong. browser tidak tahu)' },
                  { k: 'Sniffed dari magic bytes', v: sniffed },
                  { k: 'Cocok?', v: file.type && sniffed !== 'application/octet-stream' ? (file.type === sniffed ? '✅ Ya' : '⚠️ Tidak. kemungkinan salah label / spoofing') : 'Tidak dapat dibandingkan' },
                  { k: 'Extension', v: file.name.includes('.') ? file.name.split('.').pop()!.toLowerCase() : '-' },
                ]}
              />
              <p className="mt-3 text-xs text-slate-500">
                Browser menentukan <code>File.type</code> dari metadata sistem, bukan dari isi file. bisa salah. Sniffing magic bytes lebih dapat diandalkan.
              </p>
            </ResultPanel>
          );
        },
        notes: forensicsNotes(
          'Menampilkan MIME type dari File API dan hasil sniffing magic bytes.',
          'Upload file → bandingkan dua sumber MIME.',
          'Cocokkan juga dengan konten sebenarnya untuk mendeteksi file yang disamarkan.'
        ),
      }}
    />
  );
}

// ---------------------------------------------------------------------------
// File hex viewer
// ---------------------------------------------------------------------------

function FileHexTool() {
  const [limitKb, setLimitKb] = useState(256);
  return (
    <FileAnalyzer
      config={{
        title: 'File Hex Viewer',
        description: 'Hex dump + ASCII',
        analyze: ({ file, bytes }) => {
          const limit = limitKb * 1024;
          const slice = bytes.subarray(0, Math.min(limit, bytes.length));
          const dump = hexDump(slice);
          return (
            <ResultPanel title={`Hex dump (${slice.length.toLocaleString()} byte ditampilkan)`} textToCopy={dump}>
              {bytes.length > limit && (
                <p className="mb-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
                  Large file. hanya {limitKb} KB pertama ditampilkan. Total {bytes.length.toLocaleString()} byte.
                </p>
              )}
              <pre className="max-h-[36rem] overflow-auto rounded-lg border border-slate-800 bg-slate-950/70 p-3 font-mono text-[11px] leading-4 text-slate-300">
                {dump}
              </pre>
            </ResultPanel>
          );
        },
        notes: forensicsNotes(
          'Hex dump ala xxd: offset, byte hex, dan kolom ASCII.',
          'Upload file → dump dirender dari ArrayBuffer (tanpa konversi string penuh).',
          'Untuk file besar hanya bagian awal yang dirender agar browser tetap responsif.'
        ),
      }}
    />
  );
}

// ---------------------------------------------------------------------------
// Strings extractor
// ---------------------------------------------------------------------------

function StringsTool() {
  return (
    <FileAnalyzer
      config={{
        title: 'Strings Extractor',
        description: 'Ekstrak string ASCII / UTF-16LE',
        analyze: ({ bytes }) => {
          const ascii = extractAsciiStrings(bytes, 4);
          const utf16 = extractUtf16Strings(bytes, 4);
          const visibleAscii = ascii.slice(0, 500);
          const visibleUtf16 = utf16.slice(0, 200);
          return (
            <div className="space-y-4">
              <ResultPanel title={`ASCII strings (${ascii.length} total, menampilkan ${visibleAscii.length})`} textToCopy={visibleAscii.map((s) => s.value).join('\n')}>
                <pre className="max-h-96 overflow-auto whitespace-pre-wrap break-all rounded-lg border border-slate-800 bg-slate-950/70 p-3 font-mono text-[12px] leading-5 text-slate-300">
                  {visibleAscii.length ? visibleAscii.map((s) => `${s.offset}:\t${s.value}`).join('\n') : '(tidak ada)'}
                </pre>
              </ResultPanel>
              <ResultPanel title={`UTF-16LE strings (${utf16.length} total, menampilkan ${visibleUtf16.length})`} textToCopy={visibleUtf16.map((s) => s.value).join('\n')}>
                <pre className="max-h-72 overflow-auto whitespace-pre-wrap break-all rounded-lg border border-slate-800 bg-slate-950/70 p-3 font-mono text-[12px] leading-5 text-slate-300">
                  {visibleUtf16.length ? visibleUtf16.map((s) => `${s.offset}:\t${s.value}`).join('\n') : '(tidak ada)'}
                </pre>
              </ResultPanel>
              <p className="text-xs text-slate-500">
                Menampilkan string ≥ 4 karakter. Hint: cari string seperti <code>{'flag{{...}}'}</code>, URL, path, key, atau keyword pada malware/CTF.
              </p>
            </div>
          );
        },
        notes: forensicsNotes(
          'Menampilkan run karakter printable (ASCII dan UTF-16LE). teknik dasar malware analysis & CTF.',
          'Upload file → strings diekstrak dari bytes.',
          'Gunakan min length lebih besar untuk mengurangi noise pada file besar.'
        ),
      }}
    />
  );
}

// ---------------------------------------------------------------------------
// Entropy analyzer
// ---------------------------------------------------------------------------

function EntropyTool() {
  return (
    <FileAnalyzer
      config={{
        title: 'Entropy Analyzer',
        description: 'Shannon entropy + histogram byte',
        analyze: ({ bytes }) => {
          const e = entropyOf(bytes);
          const maxCount = Math.max(...e.topBytes.map((t) => t.count), 1);
          return (
            <ResultPanel title="Entropy analysis" textToCopy={JSON.stringify(e, null, 2)}>
              <KeyValueTable
                rows={[
                  { k: 'Entropy', v: `${e.entropyBitsPerByte.toFixed(3)} bit/byte` },
                  { k: 'Interpretasi', v: e.entropyBitsPerByte > 7 ? '⚠️ Tinggi (7–8). kemungkinan terenkripsi, dikompresi, atau acak' : e.entropyBitsPerByte > 5 ? 'Sedang. campuran data (kode, teks)' : 'Rendah. data terstruktur/teks polos' },
                  { k: 'Total bytes', v: e.totalBytes.toLocaleString() },
                  { k: 'Distinct bytes', v: String(e.distinctBytes) },
                ]}
              />
              <h3 className="mt-4 mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">Top bytes</h3>
              <div className="space-y-1.5">
                {e.topBytes.map((t) => (
                  <div key={t.byte} className="flex items-center gap-2">
                    <span className="w-24 shrink-0 font-mono text-xs text-slate-400">
                      0x{t.hex} {t.byte >= 32 && t.byte < 127 ? `'${String.fromCharCode(t.byte)}'` : ''}
                    </span>
                    <div className="h-3 flex-1 overflow-hidden rounded bg-slate-800">
                      <div className="h-full bg-indigo-500/70" style={{ width: `${(t.count / maxCount) * 100}%` }} />
                    </div>
                    <span className="w-28 shrink-0 text-right font-mono text-xs text-slate-500">{t.count.toLocaleString()} ({t.pct.toFixed(2)}%)</span>
                  </div>
                ))}
              </div>
              <p className="mt-4 text-xs text-slate-500">
                Entropy mendekati 8 = byte mendekati acak (enkripsi/kompresi/padding). Teks/executable umumnya 4–6. Ini indikator, bukan bukti.
              </p>
            </ResultPanel>
          );
        },
        notes: forensicsNotes(
          'Shannon entropy mengukur "keacakan" byte. dipakai mendeteksi file terenkripsi/dikompresi atau packed malware.',
          'Upload file → entropy + histogram 16 byte teratas.',
          'Entropy tinggi juga umum pada file terkompresi (zip, jpg). kombinasikan dengan magic bytes.'
        ),
      }}
    />
  );
}

// ---------------------------------------------------------------------------
// Timestamp inspector
// ---------------------------------------------------------------------------

function TimestampTool() {
  const [input, setInput] = useState('');
  const [result, setResult] = useState<ReturnType<typeof parseTimestamp> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const run = () => {
    setError(null);
    try {
      setResult(parseTimestamp(input));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Format tidak dikenali.');
      setResult(null);
    }
  };
  return (
    <div className="space-y-4">
      <Button onClick={run}>🕒 Konversi</Button>
      <Panel title="Input">
        <LabeledTextarea
          id="ts-input"
          label="Timestamp (Unix seconds/ms, ISO 8601, atau tanggal)"
          value={input}
          onChange={setInput}
          rows={3}
          placeholder="1700000000 atau 2023-11-14T22:13:20Z"
        />
      </Panel>
      <ErrorAlert message={error} />
      {result && (
        <Panel title="Hasil" action={<CopyButton text={JSON.stringify(result, null, 2)} />}>
          <KeyValueTable
            rows={[
              { k: 'Unix seconds', v: result.unixSeconds },
              { k: 'Unix millis', v: result.unixMillis },
              { k: 'ISO 8601', v: result.iso },
              { k: 'Local', v: result.local },
              { k: 'Relative', v: result.relative },
              { k: 'Hex (seconds)', v: result.hexSeconds },
            ]}
          />
        </Panel>
      )}
      <ToolNotes notes={forensicsNotes(
        'Konversi timestamp antar format: Unix seconds/ms/µs/ns, ISO 8601, tanggal.',
        'Masukkan salah satu format lalu klik Konversi.',
        'Menampilkan semua representasi.'
      )} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// EXIF
// ---------------------------------------------------------------------------

function ExifTool() {
  return (
    <FileAnalyzer
      config={{
        title: 'EXIF Metadata',
        description: 'Metadata image (JPEG)',
        accept: 'image/*,.jpg,.jpeg,.tiff,.tif',
        analyze: ({ file, bytes }) => {
          const exif = parseExif(bytes);
          if (!exif.found && exif.entries.length === 0) {
            return (
              <ResultPanel title="EXIF">
                <p className="text-sm text-slate-400">
                  Tidak ada blok EXIF (APP1) ditemukan pada {file.name}. Image mungkin: disimpan tanpa EXIF, sudah di-strip
                  (mis. oleh WhatsApp/editor privacy), atau format non-JPEG.
                </p>
              </ResultPanel>
            );
          }
          return (
            <div className="space-y-4">
              <ResultPanel title="EXIF entries" textToCopy={exif.entries.map((e) => `${e.tag}: ${e.value}`).join('\n')}>
                {exif.entries.length ? (
                  <KeyValueTable rows={exif.entries.map((e) => ({ k: `${e.tag}`, v: e.value }))} />
                ) : (
                  <p className="text-sm text-slate-500">Tidak ada entry standar (format TIFF big-endian parsial?).</p>
                )}
              </ResultPanel>
              {exif.gps.lat || exif.gps.lon || exif.gps.alt ? (
                <ResultPanel title="GPS metadata">
                  <KeyValueTable
                    rows={[
                      { k: 'Latitude', v: exif.gps.lat ?? '-' },
                      { k: 'Longitude', v: exif.gps.lon ?? '-' },
                      { k: 'Altitude', v: exif.gps.alt ?? '-' },
                    ]}
                  />
                  <p className="mt-3 text-sm text-amber-200">
                    ⚠️ Foto berisi lokasi GPS. Banyak platform menghapus EXIF otomatis, tetapi file asli tetap memuatnya. berhati-hatilah membagikan foto mentah.
                  </p>
                </ResultPanel>
              ) : (
                <p className="text-xs text-slate-500">Tidak ada data GPS pada file ini.</p>
              )}
            </div>
          );
        },
        notes: forensicsNotes(
          'Membaca metadata EXIF tertanam pada JPEG: kamera, software, tanggal, orientasi, dan GPS bila ada.',
          'Upload image JPEG → entry EXIF & GPS ditampilkan.',
          'EXIF dapat dipalsukan. GPS diekstrak dari IFD GPS (ref + DMS).'
        ),
      }}
    />
  );
}

// ---------------------------------------------------------------------------
// PDF metadata
// ---------------------------------------------------------------------------

function PdfMetadataTool() {
  return (
    <FileAnalyzer
      config={{
        title: 'PDF Metadata',
        description: 'Metadata dokumen PDF',
        accept: '.pdf,application/pdf',
        analyze: ({ file, bytes }) => {
          const meta = parsePdfMetadata(bytes);
          if (!bytes.length || bytes[0] !== 0x25 || bytes[1] !== 0x50) {
            return (
              <ResultPanel title="PDF Metadata">
                <p className="text-sm text-amber-300">File bukan PDF yang valid (magic %PDF tidak ditemukan).</p>
              </ResultPanel>
            );
          }
          const rows = Object.entries(meta).map(([k, v]) => ({
            k,
            v: /Date$/i.test(k) && v.startsWith('D:') ? `${v} → ${pdfDateToISO(v)}` : v,
          }));
          return (
            <ResultPanel title="PDF Metadata" textToCopy={rows.map((r) => `${r.k}: ${r.v}`).join('\n')}>
              {rows.length ? (
                <KeyValueTable rows={rows} />
              ) : (
                <p className="text-sm text-slate-500">
                  Tidak ada metadata literal ditemukan (bisa PDF yang di-strip atau metadata tersimpan di XMP. belum diparse).
                </p>
              )}
              <p className="mt-3 text-xs text-slate-500">
                Metadata PDF dapat berisi author, software pembuat, dan waktu. jejak digital penting dalam forensik dokumen.
              </p>
            </ResultPanel>
          );
        },
        notes: forensicsNotes(
          'Membaca metadata PDF: Title, Author, Creator, Producer, dates (byte-scan literal).',
          'Upload PDF → metadata ditampilkan.',
          'Metadata mudah dipalsukan; halaman Count juga dideteksi dari /Count. XMP tidak diparse pada versi ini.'
        ),
      }}
    />
  );
}

// ---------------------------------------------------------------------------
// ZIP metadata
// ---------------------------------------------------------------------------

function ZipMetadataTool() {
  return (
    <FileAnalyzer
      config={{
        title: 'ZIP Metadata',
        description: 'Daftar entri arsip ZIP',
        accept: '.zip,application/zip,.jar,.docx,.xlsx,.pptx,.epub',
        analyze: ({ file, bytes }) => {
          const entries = parseZipListing(bytes);
          const totalComp = entries.reduce((a, e) => a + e.compressedSize, 0);
          const totalUncomp = entries.reduce((a, e) => a + e.uncompressedSize, 0);
          return (
            <ResultPanel title={`ZIP entries (${entries.length})`} textToCopy={entries.map((e) => `${e.name}\t${e.method}\t${e.compressedSize}\t${e.uncompressedSize}`).join('\n')}>
              {entries.length === 0 ? (
                <p className="text-sm text-amber-300">Tidak ada local file header ZIP ditemukan. bukan arsip ZIP.</p>
              ) : (
                <>
                  <KeyValueTable
                    rows={[
                      { k: 'Jumlah entri', v: String(entries.length) },
                      { k: 'Total terkompresi', v: totalComp.toLocaleString() },
                      { k: 'Total asli', v: totalUncomp.toLocaleString() },
                      { k: 'Rasio', v: totalUncomp ? `${((1 - totalComp / totalUncomp) * 100).toFixed(1)}%` : '-' },
                    ]}
                  />
                  <div className="mt-4 overflow-x-auto">
                    <table className="w-full border-collapse text-sm">
                      <thead>
                        <tr className="text-left text-xs text-slate-500">
                          <th className="py-1.5 pr-3">Nama</th>
                          <th className="py-1.5 pr-3">Metode</th>
                          <th className="py-1.5 pr-3 text-right">Compressed</th>
                          <th className="py-1.5 pr-3 text-right">Uncompressed</th>
                          <th className="py-1.5">Tanggal</th>
                        </tr>
                      </thead>
                      <tbody>
                        {entries.map((e, i) => (
                          <tr key={i} className="border-t border-slate-800/60">
                            <td className="py-1.5 pr-3 font-mono text-xs text-slate-300">{e.name}</td>
                            <td className="py-1.5 pr-3 text-xs text-slate-500">{e.method}</td>
                            <td className="py-1.5 pr-3 text-right font-mono text-xs text-slate-500">{e.compressedSize.toLocaleString()}</td>
                            <td className="py-1.5 pr-3 text-right font-mono text-xs text-slate-500">{e.uncompressedSize.toLocaleString()}</td>
                            <td className="py-1.5 text-xs text-slate-500">{e.date}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </ResultPanel>
          );
        },
        notes: forensicsNotes(
          'Membaca local file header ZIP: nama entri, metode kompresi (Stored/Deflate…), ukuran, tanggal DOS.',
          'Upload file ZIP (termasuk .jar/.docx/.epub yang berbasis ZIP) → daftar entri.',
          'Isi tidak di-ekstrak. hanya metadata. Deflate tidak di-decompress pada tool ini.'
        ),
      }}
    />
  );
}

// ---------------------------------------------------------------------------
// File compare
// ---------------------------------------------------------------------------

function FileCompareTool() {
  const [fileA, setFileA] = useState<LoadedFile | null>(null);
  const [fileB, setFileB] = useState<LoadedFile | null>(null);
  const [hashA, setHashA] = useState('');
  const [hashB, setHashB] = useState('');
  const [result, setResult] = useState<{
    equalSize: boolean; equalSha: boolean; equalMd5: boolean; firstBytesA: string; firstBytesB: string; shaA: string; shaB: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const run = async () => {
    setError(null);
    setBusy(true);
    try {
      if (hashA.trim() && hashB.trim()) {
        const a = hashA.trim().toLowerCase().replace(/\s+/g, '');
        const b = hashB.trim().toLowerCase().replace(/\s+/g, '');
        setResult({
          equalSize: false, equalSha: a === b, equalMd5: a === b,
          firstBytesA: a, firstBytesB: b, shaA: a, shaB: b,
        });
        return;
      }
      if (!fileA || !fileB) throw new Error('Unggah dua file ATAU isi dua nilai hash untuk dibandingkan.');
      const [shaA, shaB] = await Promise.all([
        shaDigest(fileA.bytes, 'SHA-256'),
        shaDigest(fileB.bytes, 'SHA-256'),
      ]);
      const hexA = bytesToHex(shaA);
      const hexB = bytesToHex(shaB);
      setResult({
        equalSize: fileA.bytes.length === fileB.bytes.length,
        equalSha: hexA === hexB,
        equalMd5: md5(fileA.bytes) === md5(fileB.bytes),
        firstBytesA: bytesToHex(fileA.bytes.slice(0, 16)),
        firstBytesB: bytesToHex(fileB.bytes.slice(0, 16)),
        shaA: hexA,
        shaB: hexB,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Perbandingan gagal.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <Button onClick={() => void run()} disabled={busy}>{busy ? 'Membandingkan…' : '⚖️ Bandingkan'}</Button>
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <p className="mb-1.5 text-xs font-medium text-slate-400">File A</p>
          <FileDrop multiple={false} onFiles={(f) => setFileA(f[0] ?? null)} label="Upload file A" />
        </div>
        <div>
          <p className="mb-1.5 text-xs font-medium text-slate-400">File B</p>
          <FileDrop multiple={false} onFiles={(f) => setFileB(f[0] ?? null)} label="Upload file B" />
        </div>
      </div>
      <Panel title="Atau bandingkan dua hash">
        <div className="grid gap-3 sm:grid-cols-2">
          <LabeledTextarea id="cmp-hash-a" label="Hash A" value={hashA} onChange={setHashA} rows={2} placeholder="sha256 hex…" />
          <LabeledTextarea id="cmp-hash-b" label="Hash B" value={hashB} onChange={setHashB} rows={2} placeholder="sha256 hex…" />
        </div>
      </Panel>
      <ErrorAlert message={error} />
      {result && (
        <Panel title="Hasil perbandingan">
          <KeyValueTable
            rows={[
              { k: 'SHA-256 sama?', v: result.equalSha ? '✅ Identik' : '❌ Berbeda', warn: !result.equalSha },
              { k: 'SHA-256 A', v: result.shaA },
              { k: 'SHA-256 B', v: result.shaB },
              { k: 'Ukuran sama?', v: result.equalSize ? 'Ya' : 'Tidak / tidak dibandingkan' },
              { k: 'MD5 sama?', v: result.equalMd5 ? 'Ya' : 'Tidak / tidak dibandingkan' },
              { k: 'First bytes A', v: result.firstBytesA },
              { k: 'First bytes B', v: result.firstBytesB },
            ]}
          />
        </Panel>
      )}
      <ToolNotes notes={forensicsNotes(
        'Membandingkan dua file (ukuran + hash) atau dua nilai hash.',
        'Upload dua file, atau isi dua hash lalu klik Bandingkan.',
        'Hash sama = konten byte identik (dengan probabilitas hash collision yang dapat diabaikan).'
      )} />
    </div>
  );
}

export const tools: Record<string, ComponentType> = {
  'file-metadata': MetadataTool,
  'file-hash': FileHashTool,
  'file-signature': FileSignatureTool,
  mime: MimeTool,
  'file-hex': FileHexTool,
  strings: StringsTool,
  entropy: EntropyTool,
  timestamp: TimestampTool,
  exif: ExifTool,
  'pdf-metadata': PdfMetadataTool,
  'zip-metadata': ZipMetadataTool,
  'file-compare': FileCompareTool,
};

export default function ForensicsModule() {
  return null;
}
