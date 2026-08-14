/**
 * Binary / Hex Inspector: interpretasi byte (integer LE/BE, float), deteksi
 * magic number, pencarian byte, dan representasi biner/desimal.
 */

import { bytesToHex, hexDump, hexToBytes } from './bytes';
import { detectSignature } from './analysis';

export interface IntInterpretation {
  u8: number;
  i8: number;
  u16le: number;
  u16be: number;
  i16le: number;
  i16be: number;
  u32le: number;
  u32be: number;
  i32le: number;
  i32be: number;
  u64le: string;
  u64be: string;
  f32le: number;
  f32be: number;
  f64le: number;
  f64be: number;
  binary: string;
  decimalBytes: string;
}

export function interpretBytes(bytes: Uint8Array): IntInterpretation {
  const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const u8 = bytes[0] ?? 0;
  const i8 = (bytes[0] ?? 0) << 24 >> 24;
  const has2 = bytes.length >= 2;
  const has4 = bytes.length >= 4;
  const has8 = bytes.length >= 8;
  const u16le = has2 ? dv.getUint16(0, true) : 0;
  const u16be = has2 ? dv.getUint16(0, false) : 0;
  const u32le = has4 ? dv.getUint32(0, true) : 0;
  const u32be = has4 ? dv.getUint32(0, false) : 0;
  const f32le = has4 ? dv.getFloat32(0, true) : 0;
  const f32be = has4 ? dv.getFloat32(0, false) : 0;
  const f64le = has8 ? dv.getFloat64(0, true) : 0;
  const f64be = has8 ? dv.getFloat64(0, false) : 0;
  const u64le = has8 ? dv.getBigUint64(0, true).toString() : '0';
  const u64be = has8 ? dv.getBigUint64(0, false).toString() : '0';
  return {
    u8,
    i8,
    u16le,
    u16be,
    i16le: has2 ? dv.getInt16(0, true) : 0,
    i16be: has2 ? dv.getInt16(0, false) : 0,
    u32le,
    u32be,
    i32le: has4 ? dv.getInt32(0, true) : 0,
    i32be: has4 ? dv.getInt32(0, false) : 0,
    u64le,
    u64be,
    f32le,
    f32be,
    f64le,
    f64be,
    binary: bytesToHex(bytes),
    decimalBytes: Array.from(bytes, (b) => String(b)).join(' '),
  };
}

/** Cari urutan byte dalam data; kembalikan offset (dengan cap hasil). */
export function searchBytes(haystack: Uint8Array, needle: Uint8Array, limit = 100): number[] {
  if (needle.length === 0 || needle.length > haystack.length) return [];
  const out: number[] = [];
  outer: for (let i = 0; i <= haystack.length - needle.length && out.length < limit; i++) {
    for (let j = 0; j < needle.length; j++) {
      if (haystack[i + j] !== needle[j]) continue outer;
    }
    out.push(i);
  }
  return out;
}

export interface HexInspectResult {
  total: number;
  dump: string;
  signature: ReturnType<typeof detectSignature>;
}

export function inspectHex(input: string, opts: { offset?: number; rows?: number; bytesPerRow?: number } = {}): HexInspectResult {
  const bytes = hexToBytes(input);
  const offset = opts.offset ?? 0;
  if (offset < 0 || offset >= bytes.length) throw new Error('Offset di luar jangkauan data.');
  const rows = opts.rows ?? 64;
  const slice = bytes.subarray(offset, Math.min(offset + rows * (opts.bytesPerRow ?? 16), bytes.length));
  return {
    total: bytes.length,
    dump: hexDump(slice, { bytesPerRow: opts.bytesPerRow ?? 16, offsetBase: offset }),
    signature: detectSignature(bytes),
  };
}

export { hexDump, hexToBytes, detectSignature };
