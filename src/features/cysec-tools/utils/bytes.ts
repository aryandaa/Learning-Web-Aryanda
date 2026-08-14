/**
 * Helper byte/buffer tingkat rendah untuk seluruh tool CySec Tools.
 * Semua operasi memakai ArrayBuffer / Uint8Array. tidak ada upload ke server.
 */

/** String UTF-8 → bytes. */
export function utf8ToBytes(s: string): Uint8Array {
  return new TextEncoder().encode(s);
}

/** Bytes → string UTF-8. `fatal=true` membuat decode gagal bila invalid. */
export function bytesToUtf8(bytes: Uint8Array, fatal = false): string {
  try {
    return new TextDecoder('utf-8', { fatal }).decode(bytes);
  } catch {
    throw new Error('Data bukan UTF-8 yang valid.');
  }
}

export function hexToBytes(hex: string): Uint8Array {
  const clean = hex.replace(/\s+/g, '').replace(/^(0x|0X)/, '');
  if (clean.length % 2 !== 0) throw new Error('Hex harus berjumlah digit genap.');
  if (!/^[0-9a-fA-F]*$/.test(clean)) throw new Error('Hex mengandung karakter tidak valid.');
  const out = new Uint8Array(clean.length / 2);
  for (let i = 0; i < out.length; i++) {
    out[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
}

export function bytesToHex(bytes: Uint8Array, sep = ''): string {
  let out = '';
  for (let i = 0; i < bytes.length; i++) {
    if (sep && i > 0) out += sep;
    out += bytes[i].toString(16).padStart(2, '0');
  }
  return out;
}

export function base64ToBytes(b64: string): Uint8Array {
  const clean = b64.replace(/\s+/g, '');
  if (!/^[A-Za-z0-9+/]*={0,2}$/.test(clean) || clean.length % 4 === 1) {
    throw new Error('Input bukan Base64 yang valid.');
  }
  try {
    const bin = atob(clean);
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  } catch {
    throw new Error('Input bukan Base64 yang valid.');
  }
}

export function bytesToBase64(bytes: Uint8Array): string {
  let bin = '';
  const CHUNK = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    bin += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }
  return btoa(bin);
}

/** Base64url (RFC 4648 §5). dipakai JWT. */
export function bytesToBase64Url(bytes: Uint8Array): string {
  return bytesToBase64(bytes).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function base64UrlToBytes(s: string): Uint8Array {
  let clean = s.replace(/-/g, '+').replace(/_/g, '/');
  while (clean.length % 4 !== 0) clean += '=';
  return base64ToBytes(clean);
}

/** Base32 RFC 4648. */
const B32_ALPHA = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

export function bytesToBase32(bytes: Uint8Array): string {
  let bits = 0;
  let value = 0;
  let out = '';
  for (let i = 0; i < bytes.length; i++) {
    value = (value << 8) | bytes[i];
    bits += 8;
    while (bits >= 5) {
      out += B32_ALPHA[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) out += B32_ALPHA[(value << (5 - bits)) & 31];
  while (out.length % 8 !== 0) out += '=';
  return out;
}

export function base32ToBytes(s: string): Uint8Array {
  const clean = s.replace(/=+$/, '').replace(/\s+/g, '').toUpperCase();
  if (!/^[A-Z2-7]*$/.test(clean)) throw new Error('Input bukan Base32 yang valid.');
  const out: number[] = [];
  let buffer = 0;
  let bits = 0;
  for (const ch of clean) {
    const v = B32_ALPHA.indexOf(ch);
    buffer = (buffer << 5) | v;
    bits += 5;
    if (bits >= 8) {
      out.push((buffer >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return Uint8Array.from(out);
}

/** Bytes → string biner (8 bit per byte, dipisah spasi opsional). */
export function bytesToBinary(bytes: Uint8Array, space = true): string {
  const parts: string[] = [];
  for (const b of bytes) parts.push(b.toString(2).padStart(8, '0'));
  return parts.join(space ? ' ' : '');
}

/** String biner (spasi/newline diabaikan) → bytes. */
export function binaryToBytes(s: string): Uint8Array {
  const clean = s.replace(/[\s_]/g, '');
  if (!/^[01]*$/.test(clean)) throw new Error('Input bukan biner yang valid.');
  if (clean.length % 8 !== 0) throw new Error('Panjang biner harus kelipatan 8 bit.');
  const out = new Uint8Array(clean.length / 8);
  for (let i = 0; i < out.length; i++) {
    out[i] = parseInt(clean.slice(i * 8, i * 8 + 8), 2);
  }
  return out;
}

export interface HexDumpOptions {
  bytesPerRow?: number;
  showAscii?: boolean;
  offsetBase?: number;
}

/** Hex dump ala xxd: offset | hex | ASCII. */
export function hexDump(bytes: Uint8Array, opts: HexDumpOptions = {}): string {
  const { bytesPerRow = 16, showAscii = true, offsetBase = 0 } = opts;
  const lines: string[] = [];
  for (let off = 0; off < bytes.length; off += bytesPerRow) {
    const slice = bytes.subarray(off, off + bytesPerRow);
    const addr = (off + offsetBase).toString(16).padStart(8, '0');
    const hex = Array.from(slice, (b) => b.toString(16).padStart(2, '0'))
      .join(' ')
      .padEnd(bytesPerRow * 3 - 1, ' ');
    const ascii = showAscii
      ? '  ' +
        Array.from(slice, (b) => (b >= 32 && b < 127 ? String.fromCharCode(b) : '.'))
          .join('')
      : '';
    lines.push(`${addr}  ${hex}${ascii}`);
  }
  return lines.join('\n');
}

/** Uint8Array → hex string dengan pemisah byte. */
export function bytesToHexSpaced(bytes: Uint8Array): string {
  return bytesToHex(bytes, ' ');
}

/** Deteksi endianness dari magic (untuk dukungan endianness converter). */
export function u16(bytes: Uint8Array, off: number, little = true): number {
  return little
    ? (bytes[off] | (bytes[off + 1] << 8)) >>> 0
    : ((bytes[off] << 8) | bytes[off + 1]) >>> 0;
}

export function u32(bytes: Uint8Array, off: number, little = true): number {
  return little
    ? (bytes[off] | (bytes[off + 1] << 8) | (bytes[off + 2] << 16) | (bytes[off + 3] << 24)) >>> 0
    : (bytes[off + 3] | (bytes[off + 2] << 8) | (bytes[off + 1] << 16) | (bytes[off] << 24)) >>> 0;
}

export function readAscii(bytes: Uint8Array, off: number, len: number): string {
  let s = '';
  for (let i = off; i < off + len && i < bytes.length; i++) {
    const b = bytes[i];
    s += b >= 32 && b < 127 ? String.fromCharCode(b) : '.';
  }
  return s;
}

/** Konversi number → hex 2 digit. */
export function toHexByte(b: number): string {
  return (b & 0xff).toString(16).padStart(2, '0');
}

/**
 * Salin/materialisasi Uint8Array menjadi ArrayBuffer murni.
 * Diperlukan karena Web Crypto `BufferSource` dan `Blob` menuntut
 * `ArrayBuffer` (bukan SharedArrayBuffer) pada typing TS 5.7+.
 */
export function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const ab = bytes.buffer;
  if (bytes.byteOffset === 0 && bytes.byteLength === ab.byteLength) {
    return ab as ArrayBuffer;
  }
  return ab.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}
