/**
 * Analisis data: entropy Shannon, frekuensi byte/karakter, ekstraksi string,
 * deteksi magic number / MIME, scanner printable, analisis Unicode.
 * Semua berjalan di browser atas ArrayBuffer/Uint8Array (chunked untuk besar).
 */

import { bytesToHex } from './bytes';

// ---------------------------------------------------------------------------
// Entropy & frekuensi
// ---------------------------------------------------------------------------

export interface EntropyResult {
  entropyBitsPerByte: number;
  totalBytes: number;
  distinctBytes: number;
  topBytes: { byte: number; hex: string; count: number; pct: number }[];
  compressed: boolean;
  hexDump: string;
}

export function entropyOf(bytes: Uint8Array, hexDumpLen = 256): EntropyResult {
  if (bytes.length === 0) throw new Error('File kosong — tidak ada data untuk dianalisis.');
  const counts = new Uint32Array(256);
  for (const b of bytes) counts[b]++;
  let entropy = 0;
  const n = bytes.length;
  for (let i = 0; i < 256; i++) {
    if (counts[i] === 0) continue;
    const p = counts[i] / n;
    entropy -= p * Math.log2(p);
  }
  const top = Array.from({ length: 256 }, (_, i) => i)
    .map((i) => ({ byte: i, hex: i.toString(16).padStart(2, '0'), count: counts[i], pct: (counts[i] / n) * 100 }))
    .filter((t) => t.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, 16);
  const printableRatio = (counts.reduce((acc, c, i) => acc + (i >= 32 && i < 127 ? c : 0), 0) / n) * 100;
  return {
    entropyBitsPerByte: entropy,
    totalBytes: n,
    distinctBytes: counts.reduce((acc, c) => acc + (c > 0 ? 1 : 0), 0),
    topBytes: top,
    compressed: entropy > 7.0,
    hexDump: bytesToHex(bytes.slice(0, Math.min(hexDumpLen, bytes.length))),
  };
}

export interface FrequencyResult {
  chars: { char: string; count: number; pct: number }[];
  total: number;
  unique: number;
}

export function charFrequency(s: string): FrequencyResult {
  const counts = new Map<string, number>();
  let total = 0;
  for (const ch of s) {
    counts.set(ch, (counts.get(ch) ?? 0) + 1);
    total++;
  }
  const chars = Array.from(counts.entries())
    .map(([char, count]) => ({ char, count, pct: total ? (count / total) * 100 : 0 }))
    .sort((a, b) => b.count - a.count);
  return { chars, total, unique: chars.length };
}

// ---------------------------------------------------------------------------
// Strings extraction
// ---------------------------------------------------------------------------

export interface StringHit {
  offset: number;
  length: number;
  value: string;
}

/** Ekstrak run printable ASCII (min length) — chunked untuk file besar. */
export function extractAsciiStrings(bytes: Uint8Array, minLength = 4): StringHit[] {
  const out: StringHit[] = [];
  let start = -1;
  let current = '';
  for (let i = 0; i <= bytes.length; i++) {
    const b = i < bytes.length ? bytes[i] : -1;
    const printable = b >= 32 && b < 127;
    if (printable) {
      if (start === -1) start = i;
      current += String.fromCharCode(b);
    } else if (start !== -1) {
      if (current.length >= minLength) out.push({ offset: start, length: current.length, value: current });
      start = -1;
      current = '';
    }
  }
  return out;
}

/** Ekstrak run UTF-16LE printable (kata 16-bit di 32..126) — chunked. */
export function extractUtf16Strings(bytes: Uint8Array, minLength = 4): StringHit[] {
  const out: StringHit[] = [];
  let start = -1;
  let current = '';
  const chars: string[] = [];
  const even = bytes.length & ~1;
  for (let i = 0; i < even; i += 2) {
    const lo = bytes[i];
    const hi = bytes[i + 1];
    const valid = hi === 0 && lo >= 32 && lo < 127;
    if (valid) {
      if (start === -1) start = i;
      chars.push(String.fromCharCode(lo));
    } else if (start !== -1) {
      current = chars.join('');
      if (current.length >= minLength) out.push({ offset: start, length: current.length, value: current });
      start = -1;
      chars.length = 0;
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// Magic number / MIME
// ---------------------------------------------------------------------------

export interface SignatureMatch {
  name: string;
  extension: string;
  mime: string;
  confidence: 'high' | 'medium' | 'low';
  note?: string;
}

const SIGNATURES: { magic: number[]; mask?: number[]; offset?: number; sig: Omit<SignatureMatch, 'confidence'>; confidence: SignatureMatch['confidence'] }[] = [
  { magic: [0x25, 0x50, 0x44, 0x46], sig: { name: 'PDF document', extension: 'pdf', mime: 'application/pdf' }, confidence: 'high' },
  { magic: [0x50, 0x4b, 0x03, 0x04], sig: { name: 'ZIP archive / OOXML / JAR', extension: 'zip', mime: 'application/zip' }, confidence: 'high' },
  { magic: [0x50, 0x4b, 0x05, 0x06], sig: { name: 'ZIP archive (empty)', extension: 'zip', mime: 'application/zip' }, confidence: 'high' },
  { magic: [0x50, 0x4b, 0x07, 0x08], sig: { name: 'ZIP archive (spanned)', extension: 'zip', mime: 'application/zip' }, confidence: 'high' },
  { magic: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], sig: { name: 'PNG image', extension: 'png', mime: 'image/png' }, confidence: 'high' },
  { magic: [0xff, 0xd8, 0xff], sig: { name: 'JPEG image', extension: 'jpg', mime: 'image/jpeg' }, confidence: 'high' },
  { magic: [0x47, 0x49, 0x46, 0x38], sig: { name: 'GIF image', extension: 'gif', mime: 'image/gif' }, confidence: 'high' },
  { magic: [0x42, 0x4d], sig: { name: 'BMP image', extension: 'bmp', mime: 'image/bmp' }, confidence: 'high' },
  { magic: [0x49, 0x49, 0x2a, 0x00], sig: { name: 'TIFF image (little-endian)', extension: 'tiff', mime: 'image/tiff' }, confidence: 'high' },
  { magic: [0x4d, 0x4d, 0x00, 0x2a], sig: { name: 'TIFF image (big-endian)', extension: 'tiff', mime: 'image/tiff' }, confidence: 'high' },
  { magic: [0x52, 0x49, 0x46, 0x46], sig: { name: 'RIFF container (WAV/AVI/WebP)', extension: 'riff', mime: 'application/octet-stream' }, confidence: 'high' },
  { magic: [0x52, 0x49, 0x46, 0x46, 0x24, 0x00, 0x00, 0x00, 0x57, 0x41, 0x56, 0x45], sig: { name: 'WAV audio', extension: 'wav', mime: 'audio/wav' }, confidence: 'high' },
  { magic: [0x4f, 0x67, 0x67, 0x53], sig: { name: 'OGG audio/video', extension: 'ogg', mime: 'audio/ogg' }, confidence: 'high' },
  { magic: [0x49, 0x44, 0x33], sig: { name: 'MP3 audio (ID3 tag)', extension: 'mp3', mime: 'audio/mpeg' }, confidence: 'high' },
  { magic: [0x1a, 0x45, 0xdf, 0xa3], sig: { name: 'Matroska/WebM container', extension: 'mkv', mime: 'video/x-matroska' }, confidence: 'high' },
  { magic: [0x4d, 0x5a], sig: { name: 'DOS MZ executable (PE/NE/LE)', extension: 'exe', mime: 'application/x-msdownload' }, confidence: 'high' },
  { magic: [0x7f, 0x45, 0x4c, 0x46], sig: { name: 'ELF executable / object', extension: 'elf', mime: 'application/x-executable' }, confidence: 'high' },
  { magic: [0xcf, 0xfa, 0xed, 0xfe], sig: { name: 'Mach-O 64-bit (little-endian)', extension: 'macho', mime: 'application/x-mach-binary' }, confidence: 'high' },
  { magic: [0xfe, 0xed, 0xfa, 0xce], sig: { name: 'Mach-O 32-bit (big-endian)', extension: 'macho', mime: 'application/x-mach-binary' }, confidence: 'high' },
  { magic: [0xca, 0xfe, 0xba, 0xbe], sig: { name: 'Java class file', extension: 'class', mime: 'application/java-vm' }, confidence: 'high' },
  { magic: [0x1f, 0x8b], sig: { name: 'GZIP compressed', extension: 'gz', mime: 'application/gzip' }, confidence: 'high' },
  { magic: [0x42, 0x5a, 0x68], sig: { name: 'BZIP2 compressed', extension: 'bz2', mime: 'application/x-bzip2' }, confidence: 'high' },
  { magic: [0xfd, 0x37, 0x7a, 0x58, 0x5a, 0x00], sig: { name: 'XZ compressed', extension: 'xz', mime: 'application/x-xz' }, confidence: 'high' },
  { magic: [0x04, 0x22, 0x4d, 0x18], sig: { name: 'LZ4 frame', extension: 'lz4', mime: 'application/x-lz4' }, confidence: 'high' },
  { magic: [0x28, 0xb5, 0x2f, 0xfd], sig: { name: 'Zstandard compressed', extension: 'zst', mime: 'application/zstd' }, confidence: 'high' },
  { magic: [0x75, 0x73, 0x74, 0x61, 0x72], offset: 257, sig: { name: 'TAR archive', extension: 'tar', mime: 'application/x-tar' }, confidence: 'high' },
  { magic: [0x37, 0x7a, 0xbc, 0xaf, 0x27, 0x1c], sig: { name: '7-Zip archive', extension: '7z', mime: 'application/x-7z-compressed' }, confidence: 'high' },
  { magic: [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1], sig: { name: 'Microsoft Compound Document (OLE2)', extension: 'ole', mime: 'application/x-ole-storage' }, confidence: 'high' },
  { magic: [0x00, 0x00, 0x01, 0x00], sig: { name: 'ICO icon', extension: 'ico', mime: 'image/x-icon' }, confidence: 'high' },
  { magic: [0x53, 0x51, 0x4c, 0x69, 0x74, 0x65, 0x20, 0x66, 0x6f, 0x72, 0x6d, 0x61, 0x74, 0x20, 0x33, 0x00], sig: { name: 'SQLite database', extension: 'sqlite', mime: 'application/vnd.sqlite3' }, confidence: 'high' },
  { magic: [0x00, 0x01, 0x00, 0x00], sig: { name: 'TrueType font', extension: 'ttf', mime: 'font/ttf' }, confidence: 'medium' },
  { magic: [0x4f, 0x54, 0x54, 0x4f], sig: { name: 'OpenType font', extension: 'otf', mime: 'font/otf' }, confidence: 'high' },
  { magic: [0x53, 0x43, 0x48, 0x4c], sig: { name: 'Sketch document (zip)', extension: 'sketch', mime: 'application/octet-stream' }, confidence: 'medium' },
  { magic: [0x45, 0x4c, 0x46, 0x46], sig: { name: 'ELF-like (EF) — kemungkinan objek', extension: 'bin', mime: 'application/octet-stream' }, confidence: 'low' },
  { magic: [0x52, 0x61, 0x72, 0x21, 0x1a, 0x07], sig: { name: 'RAR archive', extension: 'rar', mime: 'application/vnd.rar' }, confidence: 'high' },
  { magic: [0x5b, 0x50, 0x61, 0x63, 0x6b, 0x65, 0x74, 0x5d], sig: { name: 'NSIS installer', extension: 'exe', mime: 'application/x-msdownload' }, confidence: 'medium' },
];

/** Deteksi magic number — signature umum. */
export function detectSignature(bytes: Uint8Array): SignatureMatch[] {
  const matches: SignatureMatch[] = [];
  const maxOffset = Math.max(257, bytes.length);
  for (const s of SIGNATURES) {
    const off = s.offset ?? 0;
    if (off + s.magic.length > maxOffset) continue;
    let ok = true;
    for (let i = 0; i < s.magic.length; i++) {
      if (bytes[off + i] !== s.magic[i]) {
        ok = false;
        break;
      }
    }
    if (ok) {
      const extra =
        s.sig.name === 'RIFF container (WAV/AVI/WebP)' && bytes.length > 12
          ? ` (format: ${String.fromCharCode(bytes[8], bytes[9], bytes[10], bytes[11])})`
          : '';
      matches.push({ ...s.sig, name: s.sig.name + extra, confidence: s.confidence });
    }
  }
  return matches;
}

/** Deteksi MIME via File API + fallback magic. */
export function detectMime(file: File, bytes: Uint8Array): string {
  if (file.type) return file.type;
  const sig = detectSignature(bytes);
  if (sig.length > 0) return sig[0].mime;
  // heuristik teks
  const sample = bytes.subarray(0, Math.min(512, bytes.length));
  const printable = Array.from(sample).filter((b) => b >= 9 || (b >= 32 && b < 127)).length;
  if (printable / sample.length > 0.9) return 'text/plain';
  return 'application/octet-stream';
}

/** Heuristik MIME dari magic (tanpa File API). */
export function mimeFromMagic(bytes: Uint8Array): string {
  const sig = detectSignature(bytes);
  if (sig.length > 0) return sig[0].mime;
  const sample = bytes.subarray(0, Math.min(512, bytes.length));
  const printable = Array.from(sample).filter((b) => b >= 9 || (b >= 32 && b < 127)).length;
  return sample.length > 0 && printable / sample.length > 0.9 ? 'text/plain' : 'application/octet-stream';
}

// ---------------------------------------------------------------------------
// Unicode analysis
// ---------------------------------------------------------------------------

export interface UnicodeCharInfo {
  char: string;
  codepoint: number;
  hex: string;
  binary: string;
  utf8: string;
  category: string;
  name: string;
}

const CATEGORY_RANGES: [number, number, string][] = [
  [0x0041, 0x005a, 'Uppercase letter'], [0x0061, 0x007a, 'Lowercase letter'],
  [0x0030, 0x0039, 'Decimal digit'], [0x0e00, 0x0e7f, 'Thai'], [0x0600, 0x06ff, 'Arabic'],
  [0x0400, 0x04ff, 'Cyrillic'], [0x4e00, 0x9fff, 'CJK Unified Ideograph'],
  [0x3040, 0x309f, 'Hiragana'], [0x30a0, 0x30ff, 'Katakana'],
  [0xac00, 0xd7af, 'Hangul Syllable'], [0x1f600, 0x1f64f, 'Emoticon'],
  [0x1f300, 0x1f5ff, 'Misc Symbols and Pictographs'],
  [0x20, 0x20, 'Space'], [0x09, 0x0d, 'Control'], [0x21, 0x2f, 'Punctuation'],
  [0x3a, 0x40, 'Punctuation'], [0x5b, 0x60, 'Punctuation'], [0x7b, 0x7e, 'Punctuation'],
];

function unicodeCategory(cp: number): string {
  for (const [lo, hi, name] of CATEGORY_RANGES) {
    if (cp >= lo && cp <= hi) return name;
  }
  if (cp < 32) return 'Control';
  if (cp < 127) return 'ASCII printable';
  if (cp > 0x10ffff) return 'Out of range';
  return 'Other';
}

export function analyzeUnicode(s: string, limit = 500): UnicodeCharInfo[] {
  const out: UnicodeCharInfo[] = [];
  for (const ch of s) {
    if (out.length >= limit) break;
    const cp = ch.codePointAt(0)!;
    const bytes = new TextEncoder().encode(ch);
    out.push({
      char: ch,
      codepoint: cp,
      hex: cp.toString(16).toUpperCase().padStart(4, '0'),
      binary: cp.toString(2).padStart(Math.max(8, Math.ceil(Math.log2(cp + 1))), '0'),
      utf8: Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join(' '),
      category: unicodeCategory(cp),
      name: '',
    });
  }
  return out;
}
