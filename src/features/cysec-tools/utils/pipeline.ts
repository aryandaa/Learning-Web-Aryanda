/**
 * Cyber Encoding Pipeline: operasi encoding berantai (pure functions).
 */

import { base64ToBytes, binaryToBytes, bytesToBase64, bytesToBinary, bytesToHex, bytesToUtf8, hexToBytes, utf8ToBytes } from './bytes';
import { caesar, htmlDecode, htmlEncode, rot13, rot47, urlDecode, urlEncode } from './encoding';

export interface PipelineOp {
  id: string;
  label: string;
  group: 'encode' | 'decode' | 'transform';
  description: string;
  needsKey?: boolean;
  apply: (value: string, key?: string) => string;
}

export function xorWithKey(data: Uint8Array, key: string): Uint8Array {
  const kb = utf8ToBytes(key || '');
  const out = new Uint8Array(data.length);
  for (let i = 0; i < data.length; i++) out[i] = kb.length ? data[i] ^ kb[i % kb.length] : data[i];
  return out;
}

export const PIPELINE_OPS: PipelineOp[] = [
  { id: 'b64-enc', label: 'Base64 Encode', group: 'encode', description: 'Meng-encode teks/byte menjadi Base64.', apply: (v) => bytesToBase64(utf8ToBytes(v)) },
  { id: 'b64-dec', label: 'Base64 Decode', group: 'decode', description: 'Meng-decode Base64 menjadi teks.', apply: (v) => bytesToUtf8(base64ToBytes(v), true) },
  { id: 'hex-enc', label: 'Hex Encode', group: 'encode', description: 'Meng-encode teks menjadi hex.', apply: (v) => bytesToHex(utf8ToBytes(v)) },
  { id: 'hex-dec', label: 'Hex Decode', group: 'decode', description: 'Meng-decode hex menjadi teks.', apply: (v) => bytesToUtf8(hexToBytes(v), true) },
  { id: 'url-enc', label: 'URL Encode', group: 'encode', description: 'Percent-encoding untuk URL.', apply: (v) => urlEncode(v, 'component') },
  { id: 'url-dec', label: 'URL Decode', group: 'decode', description: 'Decode percent-encoding.', apply: (v) => urlDecode(v) },
  { id: 'html-enc', label: 'HTML Encode', group: 'encode', description: 'Entity encoding HTML.', apply: (v) => htmlEncode(v) },
  { id: 'html-dec', label: 'HTML Decode', group: 'decode', description: 'Decode entity HTML.', apply: (v) => htmlDecode(v) },
  { id: 'bin-enc', label: 'Binary Encode', group: 'encode', description: 'Teks menjadi biner 8-bit.', apply: (v) => bytesToBinary(utf8ToBytes(v)) },
  { id: 'bin-dec', label: 'Binary Decode', group: 'decode', description: 'Biner menjadi teks.', apply: (v) => bytesToUtf8(binaryToBytes(v), true) },
  { id: 'ascii-hex-enc', label: 'ASCII → Hex', group: 'encode', description: 'Karakter ASCII menjadi hex.', apply: (v) => bytesToHex(utf8ToBytes(v)) },
  { id: 'ascii-hex-dec', label: 'Hex → ASCII', group: 'decode', description: 'Hex menjadi ASCII.', apply: (v) => bytesToUtf8(hexToBytes(v), true) },
  { id: 'utf8-dec', label: 'UTF-8 Decode', group: 'decode', description: 'Hex/base64 menjadi teks UTF-8.', apply: (v) => bytesToUtf8(hexToBytes(v), true) },
  { id: 'rot13', label: 'ROT13', group: 'transform', description: 'Caesar shift 13 (simetris).', apply: (v) => rot13(v) },
  { id: 'rot47', label: 'ROT47', group: 'transform', description: 'Rotasi printable ASCII 33-126 sejauh 47.', apply: (v) => rot47(v) },
  { id: 'caesar', label: 'Caesar', group: 'transform', description: 'Caesar shift dengan kunci angka.', needsKey: true, apply: (v, key) => caesar(v, parseInt(key || '3', 10)) },
  { id: 'xor', label: 'XOR', group: 'transform', description: 'XOR byte dengan key (output hex).', needsKey: true, apply: (v, key) => bytesToHex(xorWithKey(utf8ToBytes(v), key ?? '')) },
];

export function getPipelineOp(id: string): PipelineOp | undefined {
  return PIPELINE_OPS.find((o) => o.id === id);
}

/** Jalankan pipeline berurutan; kembalikan hasil atau pesan error. */
export function runPipeline(input: string, opIds: { opId: string; opKey: string }[]): { ok: boolean; value: string; error?: string } {
  let value = input;
  for (const { opId, opKey } of opIds) {
    const op = getPipelineOp(opId);
    if (!op) return { ok: false, value, error: `Operasi tidak dikenal: ${opId}` };
    try {
      value = op.apply(value, opKey);
    } catch (err) {
      return { ok: false, value, error: `Error di langkah "${op.label}": ${err instanceof Error ? err.message : 'gagal'}` };
    }
  }
  return { ok: true, value };
}
