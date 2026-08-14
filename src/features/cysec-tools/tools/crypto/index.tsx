/**
 * Tools kategori Cryptography & Encoding.
 * Kode-split chunk ini hanya dimuat saat user membuka tool crypto.
 */

import { useState } from 'react';
import { Button } from '../../../../components/ui/button';
import { TransformTool, type TransformConfig } from '../../components/TransformTool';
import { FileDrop, type LoadedFile } from '../../components/FileDrop';
import {
  CopyButton, DownloadButton, ErrorAlert, KeyValueTable, LabeledTextarea, Notice,
  Panel, SwapButton, ToolNotes,
} from '../../components/ui';
import {
  base32ToBytes, base64ToBytes, base64UrlToBytes, binaryToBytes, bytesToBase32, bytesToBase64,
  bytesToBase64Url, bytesToBinary, bytesToHex, bytesToUtf8, hexToBytes, utf8ToBytes,
} from '../../utils/bytes';
import {
  atbash, caesar, htmlDecode, htmlEncode, rot, rot13, rot47, urlDecode, urlEncode,
} from '../../utils/encoding';
import {
  aesDecrypt, aesEncrypt, chacha20, getRandomBytes, hmacSign, md5, pbkdf2, randomHex, rsaDecryptText,
  rsaEncryptText, rsaGenerateKeyPair, sha3, shaDigest, uuidV4,
} from '../../utils/crypto';
import type { ComponentType } from 'react';

// ---------------------------------------------------------------------------
// helper kecil
// ---------------------------------------------------------------------------

function hexOutput(bytes: Uint8Array): string {
  return bytesToHex(bytes);
}

function Transform({ config }: { config: TransformConfig }) {
  return <TransformTool {...config} />;
}

const basicNotes = (what: string, how: string, input = 'Teks', output = 'Hasil transformasi'): { title: string; content: string }[] => [
  { title: 'What is this?', content: what },
  { title: 'How to use', content: how },
  { title: 'Input', content: input },
  { title: 'Output', content: output },
  {
    title: 'Notes',
    content:
      'Encoding ≠ encryption ≠ hashing. Encoding hanya mengubah representasi (reversible tanpa kunci); encryption butuh kunci; hashing one-way. Alat ini berjalan penuh di browser Anda.',
  },
];

// ---------------------------------------------------------------------------
// Base64
// ---------------------------------------------------------------------------

const base64Tool: TransformConfig = {
  title: 'Base64',
  description: 'Encode/decode Base64 (RFC 4648)',
  placeholder: 'Teks atau Base64… contoh: SGVsbG8gV29ybGQ=',
  encode: (s) => bytesToBase64(utf8ToBytes(s)),
  decode: (s) => bytesToUtf8(base64ToBytes(s), true),
  example: 'Hello World',
  notes: basicNotes(
    'Base64 meng-encode data biner menjadi 64 karakter aman-ASCII (A–Z, a–z, 0–9, +, /) dengan padding =.',
    'Ketik teks lalu klik Encode, atau tempel data Base64 lalu klik Decode.',
    'Teks (untuk encode) atau Base64 (untuk decode)',
    'Base64 atau teks asli'
  ),
};

// ---------------------------------------------------------------------------
// Base32
// ---------------------------------------------------------------------------

const base32Tool: TransformConfig = {
  title: 'Base32',
  description: 'Encode/decode Base32 (RFC 4648)',
  placeholder: 'Teks atau Base32…',
  encode: (s) => bytesToBase32(utf8ToBytes(s)),
  decode: (s) => bytesToUtf8(base32ToBytes(s), true),
  example: 'Hello',
  notes: basicNotes(
    'Base32 memakai alphabet A–Z dan 2–7 (32 karakter). Sering dipakai untuk kunci TOTP dan kode pendek.',
    'Ketik teks → Encode, atau tempel Base32 → Decode.',
    'Teks atau Base32',
    'Base32 atau teks asli'
  ),
};

// ---------------------------------------------------------------------------
// Base16 / Hex
// ---------------------------------------------------------------------------

const base16Tool: TransformConfig = {
  title: 'Base16 / Hex',
  description: 'Encode/decode hex',
  placeholder: 'Teks atau hex (contoh: 48656c6c6f)…',
  encode: (s) => hexOutput(utf8ToBytes(s)),
  decode: (s) => bytesToUtf8(hexToBytes(s), true),
  example: 'Hello',
  notes: basicNotes(
    'Base16/hex merepresentasikan tiap byte sebagai 2 digit heksadesimal (0–9, a–f).',
    'Ketik teks → Encode, atau tempel hex → Decode.',
    'Teks atau hex',
    'Hex atau teks asli'
  ),
};

// ---------------------------------------------------------------------------
// URL encoder
// ---------------------------------------------------------------------------

const urlEncoderTool: TransformConfig = {
  title: 'URL Encode/Decode',
  description: 'Percent-encoding untuk URL',
  placeholder: 'Teks atau data URL-encoded… contoh: Hello%20World%21',
  encode: (s) => urlEncode(s, 'component'),
  decode: (s) => urlDecode(s),
  example: 'Hello World! How are you? 100% sure',
  notes: basicNotes(
    'Percent-encoding meng-encode karakter yang tidak aman di URL menjadi %XX.',
    'Ketik teks → Encode, atau tempel data ter-encode → Decode. Spasi di-decode sebagai %20 (bukan +).',
    'Teks atau URL-encoded',
    'URL-encoded atau teks asli'
  ),
};

// ---------------------------------------------------------------------------
// HTML encoder
// ---------------------------------------------------------------------------

const htmlEncoderTool: TransformConfig = {
  title: 'HTML Encode/Decode',
  description: 'Entity HTML (named + numeric)',
  placeholder: 'Teks atau entity HTML… contoh: &lt;script&gt;',
  encode: (s) => htmlEncode(s),
  decode: (s) => htmlDecode(s),
  example: '<script>alert("xss")</script>',
  notes: basicNotes(
    'Meng-encode karakter &, <, >, ", \' menjadi entity HTML agar aman ditampilkan sebagai teks (contextual output encoding).',
    'Ketik teks → Encode, atau tempel entity → Decode.',
    'Teks atau entity HTML',
    'Entity HTML atau teks asli'
  ),
};

// ---------------------------------------------------------------------------
// ASCII ↔ Hex
// ---------------------------------------------------------------------------

const asciiHexTool: TransformConfig = {
  title: 'ASCII ↔ Hex',
  description: 'Konversi karakter ASCII ke hex',
  placeholder: 'Teks atau hex…',
  encode: (s) => hexOutput(utf8ToBytes(s)),
  decode: (s) => bytesToUtf8(hexToBytes(s), true),
  example: 'Hello, World!',
  notes: basicNotes(
    'Setiap karakter ASCII = 1 byte = 2 digit hex.',
    'Teks → Encode (ke hex), atau hex → Decode (ke teks).',
    'Teks atau hex',
    'Hex atau teks'
  ),
};

// ---------------------------------------------------------------------------
// Binary ↔ Text
// ---------------------------------------------------------------------------

const binaryTextTool: TransformConfig = {
  title: 'Binary ↔ Text',
  description: 'Konversi teks ↔ biner (8 bit/karakter)',
  placeholder: 'Teks atau biner (contoh: 01001000 01101001)…',
  encode: (s) => bytesToBinary(utf8ToBytes(s)),
  decode: (s) => bytesToUtf8(binaryToBytes(s), true),
  example: 'Hi',
  notes: basicNotes(
    'Setiap karakter = 8 bit biner.',
    'Teks → Encode, atau biner (spasi diabaikan) → Decode.',
    'Teks atau biner',
    'Biner atau teks'
  ),
};

// ---------------------------------------------------------------------------
// Decimal ↔ Hex
// ---------------------------------------------------------------------------

function DecimalHexTool() {
  const [input, setInput] = useState('');
  const [result, setResult] = useState<{ dec: string; hex: string; oct: string; bin: string; note?: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const run = () => {
    setError(null);
    try {
      const clean = input.trim();
      if (!clean) throw new Error('Input kosong.');
      let neg = false;
      let body = clean;
      if (body.startsWith('-')) {
        neg = true;
        body = body.slice(1);
      }
      let n: bigint;
      if (/^0x/i.test(body)) n = BigInt(parseInt(body.slice(2), 16));
      else if (/^0b/i.test(body)) n = BigInt(parseInt(body.slice(2), 2));
      else if (/^0o/i.test(body)) n = BigInt(parseInt(body.slice(2), 8));
      else n = BigInt(body);
      if (neg) n = -n;
      setResult({
        dec: n.toString(10),
        hex: (n < 0n ? '-' : '') + '0x' + (n < 0n ? -n : n).toString(16),
        oct: (n < 0n ? '-' : '') + '0o' + (n < 0n ? -n : n).toString(8),
        bin: (n < 0n ? '-' : '') + '0b' + (n < 0n ? -n : n).toString(2),
        note: n > 0x7fffffff ? 'Nilai > 32-bit. gunakan BigInt/Number yang tepat di kode Anda.' : undefined,
      });
    } catch {
      setError('Input bukan bilangan valid. Gunakan desimal, atau awalan 0x (hex), 0b (biner), 0o (oktal).');
    }
  };
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Button onClick={run}>Convert</Button>
      </div>
      <Panel title="Input">
        <LabeledTextarea id="dec-hex-input" label="Bilangan (desimal, 0x hex, 0b biner, 0o oktal)" value={input} onChange={setInput} rows={3} placeholder="255 atau 0xFF atau 11111111" />
      </Panel>
      <ErrorAlert message={error} />
      {result && (
        <Panel title="Hasil" action={<CopyButton text={`${result.dec} | ${result.hex} | ${result.oct} | ${result.bin}`} />}>
          <KeyValueTable rows={[
            { k: 'Decimal', v: result.dec },
            { k: 'Hex', v: result.hex },
            { k: 'Octal', v: result.oct },
            { k: 'Binary', v: result.bin },
          ]} />
          {result.note && <p className="mt-2 text-xs text-amber-400">{result.note}</p>}
        </Panel>
      )}
      <ToolNotes notes={basicNotes(
        'Konversi antar basis bilangan (desimal/hex/oktal/biner).',
        'Masukkan bilangan lalu klik Convert.',
        'Bilangan bulat (support negatif & BigInt)',
        'Representasi dec/hex/oct/bin'
      )} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// ROT13 / ROT47 / Caesar
// ---------------------------------------------------------------------------

const rot13Tool: TransformConfig = {
  title: 'ROT13',
  description: 'Caesar shift 13. simetris',
  placeholder: 'Teks… contoh: Uryyb Jbeyq',
  encode: (s) => rot13(s),
  decode: (s) => rot13(s),
  example: 'Hello World',
  notes: basicNotes(
    'ROT13 menggeser huruf sejauh 13. Karena 13+13=26, encode dan decode identik.',
    'Ketik teks lalu klik Encode (atau Decode. sama saja).',
    'Teks',
    'Teks ter-ROT13'
  ),
};

const rot47Tool: TransformConfig = {
  title: 'ROT47',
  description: 'Rotasi printable ASCII (33–126) sejauh 47',
  placeholder: 'Teks…',
  encode: (s) => rot47(s),
  decode: (s) => rot47(s),
  example: 'Hello World 123!',
  notes: basicNotes(
    'ROT47 memutar semua karakter printable ASCII (33–126). Simetris.',
    'Ketik teks → Encode/Decode.',
    'Teks',
    'Teks ter-ROT47'
  ),
};

const caesarTool: TransformConfig = {
  title: 'Caesar Cipher',
  description: 'Enkripsi/dekripsi Caesar dengan shift bebas',
  placeholder: 'Teks…',
  encode: (s, keys) => caesar(s, parseInt(keys.shift || '3', 10)),
  decode: (s, keys) => caesar(s, -parseInt(keys.shift || '3', 10)),
  keyFields: [{ id: 'shift', label: 'Shift (0–25)', type: 'number', defaultValue: '3', placeholder: '3' }],
  example: 'The quick brown fox jumps over the lazy dog',
  notes: basicNotes(
    'Caesar menggeser tiap huruf sejauh N posisi dalam alfabet. Hanya 25 kemungkinan. mudah di-brute-force.',
    'Atur shift, ketik teks, klik Encode/Decode.',
    'Teks + nilai shift',
    'Teks ter-geser'
  ),
};

// ---------------------------------------------------------------------------
// XOR Calculator (dua input)
// ---------------------------------------------------------------------------

function XorCalcTool() {
  const [a, setA] = useState('');
  const [b, setB] = useState('');
  const [aHex, setAHex] = useState(true);
  const [bHex, setBHex] = useState(true);
  const [result, setResult] = useState('');
  const [error, setError] = useState<string | null>(null);

  const parse = (s: string, isHex: boolean): Uint8Array => {
    const clean = s.replace(/\s+/g, '');
    if (isHex) return hexToBytes(clean);
    return utf8ToBytes(s);
  };

  const run = () => {
    setError(null);
    try {
      const ba = parse(a, aHex);
      const bb = parse(b, bHex);
      if (ba.length === 0 || bb.length === 0) throw new Error('Kedua input tidak boleh kosong.');
      const len = Math.max(ba.length, bb.length);
      const out = new Uint8Array(len);
      for (let i = 0; i < len; i++) out[i] = (ba[i % ba.length] ^ bb[i % bb.length]) >>> 0;
      setResult(bytesToHex(out));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Input tidak valid.');
    }
  };

  const swapInputs = () => {
    setA(b);
    setB(a);
    const h = aHex;
    setAHex(bHex);
    setBHex(h);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Button onClick={run}>XOR</Button>
        <SwapButton onClick={swapInputs} label="Tukar input" />
      </div>
      <Panel title="Input A">
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-xs text-slate-400">
            <input type="checkbox" checked={aHex} onChange={(e) => setAHex(e.target.checked)} className="accent-indigo-500" />
            Input A berupa hex
          </label>
          <LabeledTextarea id="xor-a" label="Data A" value={a} onChange={setA} rows={4} placeholder={aHex ? 'e.g. 1a2b3c' : 'e.g. hello'} />
        </div>
      </Panel>
      <Panel title="Input B">
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-xs text-slate-400">
            <input type="checkbox" checked={bHex} onChange={(e) => setBHex(e.target.checked)} className="accent-indigo-500" />
            Input B berupa hex
          </label>
          <LabeledTextarea id="xor-b" label="Data B (diulang bila lebih pendek)" value={b} onChange={setB} rows={4} placeholder={bHex ? 'e.g. ff00' : 'e.g. key'} />
        </div>
      </Panel>
      <ErrorAlert message={error} />
      {result && (
        <Panel title="Hasil XOR (hex)" action={<><CopyButton text={result} /><DownloadButton text={result} filename="xor-result.txt" /></>}>
          <pre className="overflow-auto whitespace-pre-wrap break-all font-mono text-[13px] text-slate-200">{result}</pre>
          <p className="mt-2 text-xs text-slate-500">Decoded UTF-8: <span className="text-slate-300">{bytesToUtf8(hexToBytes(result))}</span></p>
        </Panel>
      )}
      <ToolNotes notes={basicNotes(
        'XOR byte-per-byte. Jika panjang berbeda, input lebih pendek diulang (siklus).',
        'Isi dua input (hex atau teks), klik XOR.',
        'Dua data (hex atau teks)',
        'Hasil XOR dalam hex'
      )} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// XOR Text
// ---------------------------------------------------------------------------

const xorTextTool: TransformConfig = {
  title: 'XOR Text',
  description: 'Enkripsi/dekripsi teks dengan XOR key',
  placeholder: 'Teks atau hex ter-encode…',
  encode: (s, keys) => {
    const key = utf8ToBytes(keys.key || '');
    if (key.length === 0) throw new Error('Key tidak boleh kosong.');
    const data = utf8ToBytes(s);
    const out = new Uint8Array(data.length);
    for (let i = 0; i < data.length; i++) out[i] = data[i] ^ key[i % key.length];
    return bytesToHex(out);
  },
  decode: (s, keys) => {
    const key = utf8ToBytes(keys.key || '');
    if (key.length === 0) throw new Error('Key tidak boleh kosong.');
    const data = hexToBytes(s);
    const out = new Uint8Array(data.length);
    for (let i = 0; i < data.length; i++) out[i] = data[i] ^ key[i % key.length];
    return bytesToUtf8(out, true);
  },
  keyFields: [{ id: 'key', label: 'Key', placeholder: 'rahasia', hint: 'Key diulang sepanjang data.' }],
  hexOutput: true,
  example: 'pesan rahasia',
  notes: basicNotes(
    'XOR text stream: tiap byte data di-XOR dengan byte key (berulang). Output hex.',
    'Isi key, ketik teks → Encode (hasil hex), tempel hex → Decode.',
    'Teks + key (atau hex + key)',
    'Hex (encode) atau teks (decode)'
  ),
};

// ---------------------------------------------------------------------------
// AES
// ---------------------------------------------------------------------------

function AesTool() {
  const [input, setInput] = useState('');
  const [passphrase, setPassphrase] = useState('');
  const [mode, setMode] = useState<'GCM' | 'CBC'>('GCM');
  const [bits, setBits] = useState<128 | 256>(256);
  const [iterations, setIterations] = useState(100000);
  const [output, setOutput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const run = async (encrypt: boolean) => {
    setError(null);
    setBusy(true);
    try {
      if (!input.trim()) throw new Error('Input kosong.');
      if (!passphrase) throw new Error('Passphrase tidak boleh kosong.');
      if (encrypt) {
        const res = await aesEncrypt(utf8ToBytes(input), passphrase, { mode, bits, iterations });
        const payload = new Uint8Array(16 + (mode === 'GCM' ? 12 : 16) + res.ciphertext.length);
        payload.set(res.salt, 0);
        payload.set(res.iv, 16);
        payload.set(res.ciphertext, 16 + (mode === 'GCM' ? 12 : 16));
        setOutput(`cysec1:${mode}:${bits}:${bytesToBase64(payload)}`);
      } else {
        const b64 = input.trim().replace(/^cysec1:[A-Z]+:\d+:/, '');
        const payload = base64ToBytes(b64);
        const plain = await aesDecrypt(payload, passphrase, { mode, bits, iterations });
        setOutput(bytesToUtf8(plain, true));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Operasi AES gagal.');
      setOutput('');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Button onClick={() => void run(true)} disabled={busy}>{busy ? '…' : '🔒 Encrypt'}</Button>
        <Button variant="secondary" onClick={() => void run(false)} disabled={busy}>{busy ? '…' : '🔓 Decrypt'}</Button>
        <SwapButton onClick={() => { setInput(output); setOutput(''); }} label="Pindah hasil ke input" />
      </div>
      <Panel title="Pengaturan">
        <div className="grid gap-3 sm:grid-cols-3">
          <div>
            <label htmlFor="aes-mode" className="mb-1 block text-xs text-slate-400">Mode</label>
            <select id="aes-mode" value={mode} onChange={(e) => setMode(e.target.value as 'GCM' | 'CBC')} className="h-9 w-full rounded-lg border border-slate-700 bg-slate-900 px-2 text-sm text-slate-200 focus:border-indigo-500 focus:outline-none">
              <option value="GCM">AES-GCM (autentikasi)</option>
              <option value="CBC">AES-CBC (padding PKCS7)</option>
            </select>
          </div>
          <div>
            <label htmlFor="aes-bits" className="mb-1 block text-xs text-slate-400">Key size</label>
            <select id="aes-bits" value={bits} onChange={(e) => setBits(Number(e.target.value) as 128 | 256)} className="h-9 w-full rounded-lg border border-slate-700 bg-slate-900 px-2 text-sm text-slate-200 focus:border-indigo-500 focus:outline-none">
              <option value={128}>128-bit</option>
              <option value={256}>256-bit</option>
            </select>
          </div>
          <div>
            <label htmlFor="aes-iter" className="mb-1 block text-xs text-slate-400">PBKDF2 iterasi</label>
            <input id="aes-iter" type="number" value={iterations} min={1000} max={2000000} onChange={(e) => setIterations(Number(e.target.value) || 100000)} className="h-9 w-full rounded-lg border border-slate-700 bg-slate-900 px-2 text-sm text-slate-200 focus:border-indigo-500 focus:outline-none" />
          </div>
        </div>
        <label htmlFor="aes-pass" className="mt-3 mb-1 block text-xs text-slate-400">Passphrase</label>
        <input id="aes-pass" type="password" value={passphrase} onChange={(e) => setPassphrase(e.target.value)} placeholder="••••••••" className="h-9 w-full max-w-sm rounded-lg border border-slate-700 bg-slate-900 px-3 text-sm text-slate-200 placeholder:text-slate-600 focus:border-indigo-500 focus:outline-none" />
      </Panel>
      <Panel title="Input">
        <LabeledTextarea
          id="aes-input"
          label="Plaintext (untuk encrypt) atau ciphertext (untuk decrypt)"
          value={input}
          onChange={setInput}
          rows={5}
          placeholder="Teks yang ingin dienkripsi…"
          hint="Format ciphertext: cysec1:MODE:BITS:<base64 salt+iv+ct>"
        />
      </Panel>
      <ErrorAlert message={error} />
      {output && (
        <Panel title="Output" action={<><CopyButton text={output} /><DownloadButton text={output} filename="aes-output.txt" /></>}>
          <pre className="max-h-96 overflow-auto whitespace-pre-wrap break-all font-mono text-[13px] text-emerald-300">{output}</pre>
        </Panel>
      )}
      <ToolNotes notes={[
        { title: 'What is this?', content: 'AES (Advanced Encryption Standard). enkripsi simetris standar. Di sini memakai Web Crypto API (bukan implementasi sendiri): AES-GCM (autentikasi + integritas) atau AES-CBC. Key diturunkan dari passphrase via PBKDF2-SHA256 + salt acak.' },
        { title: 'How to use', content: 'Set mode/key size/iterasi, isi passphrase, ketik plaintext → Encrypt. Untuk decrypt, tempel ciphertext (cysec1:...) + passphrase yang sama → Decrypt.' },
        { title: 'Input', content: 'Plaintext (encrypt) atau ciphertext berformat cysec1 (decrypt).' },
        { title: 'Output', content: 'Ciphertext base64 dengan salt+iv (encrypt), atau plaintext (decrypt).' },
        { title: 'Notes', content: 'Gunakan passphrase kuat & unik. Iterasi PBKDF2 lebih tinggi = lebih lambat namun lebih aman (OWASP menyarankan ≥ 600.000 untuk SHA-256). Jangan gunakan CBC tanpa integritas terpisah di produksi.' },
      ]} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// ChaCha20 (edukasi)
// ---------------------------------------------------------------------------

function Chacha20Tool() {
  const [input, setInput] = useState('');
  const [keyHex, setKeyHex] = useState('');
  const [nonceHex, setNonceHex] = useState('');
  const [output, setOutput] = useState('');
  const [error, setError] = useState<string | null>(null);

  const randomKey = () => setKeyHex(bytesToHex(getRandomBytes(32)));
  const randomNonce = () => setNonceHex(bytesToHex(getRandomBytes(12)));

  const run = () => {
    setError(null);
    try {
      const key = hexToBytes(keyHex);
      const nonce = hexToBytes(nonceHex);
      if (key.length !== 32) throw new Error('Key harus 32 byte (64 karakter hex).');
      if (nonce.length !== 12) throw new Error('Nonce harus 12 byte (24 karakter hex).');
      const data = /^[0-9a-fA-F\s]+$/.test(input.trim()) && input.trim().length % 2 === 0
        ? hexToBytes(input)
        : utf8ToBytes(input);
      const out = chacha20(data, key, nonce);
      setOutput(bytesToHex(out));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Operasi ChaCha20 gagal.');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Button onClick={() => void run()}>🔀 Apply keystream (XOR)</Button>
        <Button variant="ghost" onClick={randomKey}>🎲 Key acak</Button>
        <Button variant="ghost" onClick={randomNonce}>🎲 Nonce acak</Button>
      </div>
      <Panel title="Kunci & nonce">
        <div className="space-y-3">
          <div>
            <label htmlFor="chacha-key" className="mb-1 block text-xs text-slate-400">Key (32 byte hex)</label>
            <input id="chacha-key" value={keyHex} onChange={(e) => setKeyHex(e.target.value)} placeholder="64 karakter hex" className="h-9 w-full max-w-lg rounded-lg border border-slate-700 bg-slate-900 px-3 font-mono text-sm text-slate-200 focus:border-indigo-500 focus:outline-none" />
          </div>
          <div>
            <label htmlFor="chacha-nonce" className="mb-1 block text-xs text-slate-400">Nonce (12 byte hex)</label>
            <input id="chacha-nonce" value={nonceHex} onChange={(e) => setNonceHex(e.target.value)} placeholder="24 karakter hex" className="h-9 w-full max-w-lg rounded-lg border border-slate-700 bg-slate-900 px-3 font-mono text-sm text-slate-200 focus:border-indigo-500 focus:outline-none" />
          </div>
        </div>
      </Panel>
      <Panel title="Input">
        <LabeledTextarea id="chacha-input" label="Data (hex otomatis terdeteksi, selain itu dianggap teks)" value={input} onChange={setInput} rows={5} placeholder="Teks atau hex…" />
      </Panel>
      <ErrorAlert message={error} />
      {output && (
        <Panel title="Output (hex)" action={<><CopyButton text={output} /><DownloadButton text={output} filename="chacha-output.txt" /></>}>
          <pre className="max-h-96 overflow-auto whitespace-pre-wrap break-all font-mono text-[13px] text-emerald-300">{output}</pre>
          <p className="mt-2 text-xs text-slate-500">Decoded UTF-8: <span className="text-slate-300">{bytesToUtf8(hexToBytes(output))}</span></p>
        </Panel>
      )}
      <ToolNotes notes={[
        { title: 'What is this?', content: 'ChaCha20. stream cipher modern (RFC 8439), dipakai TLS 1.3 dan banyak protokol. Implementasi ini ditulis murni TypeScript untuk tujuan edukasi/CTF.' },
        { title: 'How to use', content: 'Isi key 32 byte + nonce 12 byte (hex), masukkan data, klik Apply. Karena stream cipher bersifat XOR, operasi yang sama melakukan enkripsi DAN dekripsi.' },
        { title: 'Input', content: 'Hex (otomatis) atau teks + key + nonce.' },
        { title: 'Output', content: 'Data ter-XOR dalam hex.' },
        { title: 'Notes', content: 'JANGAN gunakan ulang nonce dengan key yang sama (kerusakan keamanan total). Implementasi ini untuk belajar. verifikasi dengan test vector RFC 8439 jika dipakai serius.' },
      ]} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// RSA (edukasi)
// ---------------------------------------------------------------------------

function RsaTool() {
  const [keys, setKeys] = useState<ReturnType<typeof rsaGenerateKeyPair> | null>(null);
  const [primeBits, setPrimeBits] = useState(16);
  const [message, setMessage] = useState('');
  const [pubN, setPubN] = useState('');
  const [pubE, setPubE] = useState('');
  const [privD, setPrivD] = useState('');
  const [blockBytes, setBlockBytes] = useState(2);
  const [output, setOutput] = useState('');
  const [error, setError] = useState<string | null>(null);

  const generate = () => {
    setError(null);
    const k = rsaGenerateKeyPair(primeBits);
    setKeys(k);
    setPubN(k.n.toString());
    setPubE(k.e.toString());
    setPrivD(k.d.toString());
    setBlockBytes(k.blockBytes);
  };

  const encrypt = () => {
    setError(null);
    try {
      if (!message) throw new Error('Pesan kosong.');
      const n = BigInt(pubN);
      const e = BigInt(pubE);
      setOutput(rsaEncryptText(message, n, e, blockBytes));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Enkripsi gagal.');
    }
  };

  const decrypt = () => {
    setError(null);
    try {
      if (!output && !message) throw new Error('Ciphertext kosong.');
      const n = BigInt(pubN);
      const d = BigInt(privD);
      setOutput(rsaDecryptText(output || message, n, d, blockBytes));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Dekripsi gagal. periksa kunci & blok.');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Button onClick={generate}>⚙️ Generate key pair</Button>
        <label className="flex items-center gap-2 text-xs text-slate-400">
          Bit per prime
          <select value={primeBits} onChange={(e) => setPrimeBits(Number(e.target.value))} className="h-8 rounded-lg border border-slate-700 bg-slate-900 px-2 text-xs text-slate-200">
            <option value={8}>8</option>
            <option value={12}>12</option>
            <option value={16}>16</option>
            <option value={20}>20</option>
            <option value={24}>24</option>
          </select>
        </label>
      </div>

      {keys && (
        <Panel title="Key pair (edukasi. JANGAN dipakai produksi)">
          <KeyValueTable rows={[
            { k: 'p (prima)', v: keys.p.toString() },
            { k: 'q (prima)', v: keys.q.toString() },
            { k: 'n = p×q (publik)', v: keys.n.toString() },
            { k: 'φ(n) = (p-1)(q-1)', v: keys.phi.toString() },
            { k: 'e (publik)', v: keys.e.toString() },
            { k: 'd (privat)', v: keys.d.toString() },
            { k: 'Ukuran blok (byte)', v: String(keys.blockBytes) },
          ]} />
        </Panel>
      )}

      <Panel title="Kunci (bisa diedit)">
        <div className="grid gap-3 sm:grid-cols-3">
          <div>
            <label htmlFor="rsa-n" className="mb-1 block text-xs text-slate-400">n (publik)</label>
            <input id="rsa-n" value={pubN} onChange={(e) => setPubN(e.target.value)} className="h-9 w-full rounded-lg border border-slate-700 bg-slate-900 px-2 font-mono text-xs text-slate-200" />
          </div>
          <div>
            <label htmlFor="rsa-e" className="mb-1 block text-xs text-slate-400">e (publik)</label>
            <input id="rsa-e" value={pubE} onChange={(e) => setPubE(e.target.value)} className="h-9 w-full rounded-lg border border-slate-700 bg-slate-900 px-2 font-mono text-xs text-slate-200" />
          </div>
          <div>
            <label htmlFor="rsa-d" className="mb-1 block text-xs text-slate-400">d (privat)</label>
            <input id="rsa-d" value={privD} onChange={(e) => setPrivD(e.target.value)} className="h-9 w-full rounded-lg border border-slate-700 bg-slate-900 px-2 font-mono text-xs text-slate-200" />
          </div>
        </div>
      </Panel>

      <Panel title="Pesan">
        <div className="space-y-3">
          <LabeledTextarea id="rsa-msg" label="Plaintext / ciphertext (hex blok dipisah ':')" value={message} onChange={setMessage} rows={4} placeholder="Halo RSA!" />
          <div className="flex flex-wrap gap-2">
            <Button onClick={encrypt}>🔒 Encrypt (kunci publik)</Button>
            <Button variant="secondary" onClick={decrypt}>🔓 Decrypt (kunci privat)</Button>
          </div>
        </div>
      </Panel>
      <ErrorAlert message={error} />
      {output && (
        <Panel title="Hasil" action={<CopyButton text={output} />}>
          <pre className="max-h-60 overflow-auto whitespace-pre-wrap break-all font-mono text-[13px] text-slate-200">{output}</pre>
        </Panel>
      )}
      <ToolNotes notes={[
        { title: 'What is this?', content: 'RSA textbook: c = m^e mod n, m = c^d mod n. Dengan kunci kecil untuk memahami mekanisme matematisnya.' },
        { title: 'How to use', content: 'Generate key pair, isi pesan, klik Encrypt (hasil blok hex dipisah ":"). Salin hasil ke input lalu klik Decrypt untuk membuktikan round-trip.' },
        { title: 'Input', content: 'Pesan teks (encrypt) atau blok hex (decrypt).' },
        { title: 'Output', content: 'Ciphertext blok hex atau plaintext.' },
        { title: 'Notes', content: '⚠ EDUKASI SAJA. Kunci 8–24 bit dapat dipecahkan seketika. RSA produksi butuh kunci ≥ 2048 bit + padding OAEP/PSS. Jangan pernah memakai implementasi ini untuk data nyata.' },
      ]} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Hash generator
// ---------------------------------------------------------------------------

function HashTool() {
  const [input, setInput] = useState('');
  const [file, setFile] = useState<LoadedFile | null>(null);
  const [inputMode, setInputMode] = useState<'text' | 'hex' | 'base64'>('text');
  const [result, setResult] = useState<{ alg: string; value: string }[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const run = async () => {
    setError(null);
    setBusy(true);
    try {
      let data: Uint8Array;
      if (file) {
        data = file.bytes;
      } else {
        if (!input.trim()) throw new Error('Input kosong. ketik teks, pilih mode input, atau upload file.');
        if (inputMode === 'hex') data = hexToBytes(input);
        else if (inputMode === 'base64') data = base64ToBytes(input);
        else data = utf8ToBytes(input);
      }
      const [sha1, sha256, sha384, sha512, sha3_256, sha3_512] = await Promise.all([
        shaDigest(data, 'SHA-1'),
        shaDigest(data, 'SHA-256'),
        shaDigest(data, 'SHA-384'),
        shaDigest(data, 'SHA-512'),
        Promise.resolve(sha3(data, 256)),
        Promise.resolve(sha3(data, 512)),
      ]);
      setResult([
        { alg: 'MD5', value: md5(data) },
        { alg: 'SHA-1', value: bytesToHex(sha1) },
        { alg: 'SHA-256', value: bytesToHex(sha256) },
        { alg: 'SHA-384', value: bytesToHex(sha384) },
        { alg: 'SHA-512', value: bytesToHex(sha512) },
        { alg: 'SHA3-256', value: bytesToHex(sha3_256) },
        { alg: 'SHA3-512', value: bytesToHex(sha3_512) },
      ]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Perhitungan hash gagal.');
      setResult(null);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Button onClick={() => void run()} disabled={busy}>{busy ? 'Menghitung…' : '# Hash'}</Button>
        <SwapButton onClick={() => { setFile(null); setInput(''); }} label="Bersihkan" />
      </div>
      <Panel title="Input">
        <div className="space-y-3">
          <FileDrop multiple={false} onFiles={(f) => setFile(f[0] ?? null)} hint="Opsional: hash file lokal (ArrayBuffer)." />
          {!file && (
            <>
              <div className="flex gap-2" role="radiogroup" aria-label="Mode input">
                {(['text', 'hex', 'base64'] as const).map((m) => (
                  <label key={m} className="flex cursor-pointer items-center gap-1.5 text-xs text-slate-400">
                    <input type="radio" name="hash-mode" checked={inputMode === m} onChange={() => setInputMode(m)} className="accent-indigo-500" />
                    {m}
                  </label>
                ))}
              </div>
              <LabeledTextarea id="hash-input" label="Data" value={input} onChange={setInput} rows={5} placeholder={inputMode === 'text' ? 'Ketik teks…' : inputMode === 'hex' ? 'Tempel hex…' : 'Tempel base64…'} />
            </>
          )}
        </div>
      </Panel>
      <ErrorAlert message={error} />
      {result && (
        <Panel title="Hash" action={<CopyButton text={result.map((r) => `${r.alg}: ${r.value}`).join('\n')} label="Copy semua" />}>
          <div className="space-y-3">
            {result.map((r) => (
              <div key={r.alg} className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                <span className="w-24 shrink-0 text-xs font-semibold uppercase tracking-wide text-slate-500">{r.alg}</span>
                <code className="min-w-0 flex-1 break-all font-mono text-[13px] text-slate-200">{r.value}</code>
                <CopyButton text={r.value} label="" className="h-7 w-7 shrink-0" />
              </div>
            ))}
          </div>
          <p className="mt-4 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
            MD5 is cryptographically broken and should not be used for password storage. This tool is provided for compatibility, forensic analysis, and educational purposes. Gunakan SHA-256/384/512 atau SHA-3 untuk kebutuhan baru.
          </p>
        </Panel>
      )}
      <ToolNotes notes={[
        { title: 'What is this?', content: 'Hash satu arah (deterministik): perubahan 1 bit input mengubah hash total. Encoding ≠ encryption ≠ hashing.' },
        { title: 'How to use', content: 'Ketik data (atau pilih mode hex/base64, atau upload file) lalu klik Hash.' },
        { title: 'Input', content: 'Teks / hex / base64 / file. diproses sebagai byte.' },
        { title: 'Output', content: 'MD5, SHA-1, SHA-256, SHA-384, SHA-512, SHA3-256, SHA3-512 (hex).' },
        { title: 'Notes', content: 'SHA-1 & MD5 sudah dianggap lemah (collision). Untuk password gunakan bcrypt/argon2, bukan hash cepat. SHA-256/384/512 & SHA3 memakai Web Crypto API + implementasi Keccak lokal.' },
      ]} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// HMAC
// ---------------------------------------------------------------------------

function HmacTool() {
  const [message, setMessage] = useState('');
  const [secret, setSecret] = useState('');
  const [alg, setAlg] = useState<'SHA-1' | 'SHA-256' | 'SHA-384' | 'SHA-512'>('SHA-256');
  const [result, setResult] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const run = async () => {
    setError(null);
    setBusy(true);
    try {
      if (!message.trim()) throw new Error('Pesan kosong.');
      if (!secret) throw new Error('Secret key kosong.');
      const sig = await hmacSign(utf8ToBytes(secret), utf8ToBytes(message), { alg });
      setResult(bytesToHex(sig));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'HMAC gagal.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <Button onClick={() => void run()} disabled={busy}>{busy ? '…' : '🔐 Hitung HMAC'}</Button>
      <Panel title="Input">
        <div className="space-y-3">
          <LabeledTextarea id="hmac-msg" label="Pesan" value={message} onChange={setMessage} rows={4} placeholder="Pesan yang akan ditandatangani…" />
          <div>
            <label htmlFor="hmac-secret" className="mb-1 block text-xs text-slate-400">Secret key</label>
            <input id="hmac-secret" type="password" value={secret} onChange={(e) => setSecret(e.target.value)} placeholder="kunci bersama" className="h-9 w-full max-w-sm rounded-lg border border-slate-700 bg-slate-900 px-3 text-sm text-slate-200 focus:border-indigo-500 focus:outline-none" />
          </div>
          <div>
            <label htmlFor="hmac-alg" className="mb-1 block text-xs text-slate-400">Algoritma</label>
            <select id="hmac-alg" value={alg} onChange={(e) => setAlg(e.target.value as typeof alg)} className="h-9 rounded-lg border border-slate-700 bg-slate-900 px-2 text-sm text-slate-200 focus:border-indigo-500 focus:outline-none">
              <option>SHA-1</option><option>SHA-256</option><option>SHA-384</option><option>SHA-512</option>
            </select>
          </div>
        </div>
      </Panel>
      <ErrorAlert message={error} />
      {result && (
        <Panel title="HMAC (hex)" action={<><CopyButton text={result} /><DownloadButton text={result} filename="hmac.txt" /></>}>
          <code className="break-all font-mono text-[13px] text-emerald-300">{result}</code>
        </Panel>
      )}
      <ToolNotes notes={[
        { title: 'What is this?', content: 'HMAC = keyed-hash MAC: integritas + autentikasi pesan dengan kunci bersama. Berbeda dengan hash biasa, HMAC butuh secret.' },
        { title: 'How to use', content: 'Isi pesan + secret + pilih algoritma, klik Hitung HMAC.' },
        { title: 'Input', content: 'Pesan + secret key.' },
        { title: 'Output', content: 'HMAC hex (panjang sesuai algoritma).' },
        { title: 'Notes', content: 'Gunakan Web Crypto API. Secret harus dibagikan aman (jangan kirim plaintext). SHA-1 HMAC masih dipakai untuk kompatibilitas namun hindari untuk sistem baru.' },
      ]} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// PBKDF2
// ---------------------------------------------------------------------------

function Pbkdf2Tool() {
  const [password, setPassword] = useState('');
  const [salt, setSalt] = useState('');
  const [iterations, setIterations] = useState(600000);
  const [length, setLength] = useState(32);
  const [hash, setHash] = useState<'SHA-256' | 'SHA-1' | 'SHA-384' | 'SHA-512'>('SHA-256');
  const [result, setResult] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const run = async () => {
    setError(null);
    setBusy(true);
    try {
      if (!password) throw new Error('Password kosong.');
      const saltBytes = salt ? utf8ToBytes(salt) : getRandomBytes(16);
      const key = await pbkdf2(utf8ToBytes(password), saltBytes, iterations, { hash, length });
      setResult(bytesToHex(key));
      if (!salt) setSalt(bytesToHex(saltBytes));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'PBKDF2 gagal.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <Button onClick={() => void run()} disabled={busy}>{busy ? 'Menurunkan key…' : '🧂 Derive key'}</Button>
      <Panel title="Input">
        <div className="space-y-3">
          <div>
            <label htmlFor="pbkdf2-pass" className="mb-1 block text-xs text-slate-400">Password</label>
            <input id="pbkdf2-pass" type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="h-9 w-full max-w-sm rounded-lg border border-slate-700 bg-slate-900 px-3 text-sm text-slate-200 focus:border-indigo-500 focus:outline-none" />
          </div>
          <div>
            <label htmlFor="pbkdf2-salt" className="mb-1 block text-xs text-slate-400">Salt (teks atau hex. kosongkan untuk acak)</label>
            <input id="pbkdf2-salt" value={salt} onChange={(e) => setSalt(e.target.value)} placeholder="kosong = salt acak" className="h-9 w-full max-w-sm rounded-lg border border-slate-700 bg-slate-900 px-3 font-mono text-sm text-slate-200 focus:border-indigo-500 focus:outline-none" />
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <label htmlFor="pbkdf2-iter" className="mb-1 block text-xs text-slate-400">Iterasi</label>
              <input id="pbkdf2-iter" type="number" value={iterations} min={1000} onChange={(e) => setIterations(Number(e.target.value) || 1000)} className="h-9 w-full rounded-lg border border-slate-700 bg-slate-900 px-2 text-sm text-slate-200" />
            </div>
            <div>
              <label htmlFor="pbkdf2-len" className="mb-1 block text-xs text-slate-400">Panjang (byte)</label>
              <input id="pbkdf2-len" type="number" value={length} min={16} max={128} onChange={(e) => setLength(Number(e.target.value) || 32)} className="h-9 w-full rounded-lg border border-slate-700 bg-slate-900 px-2 text-sm text-slate-200" />
            </div>
            <div>
              <label htmlFor="pbkdf2-hash" className="mb-1 block text-xs text-slate-400">Hash</label>
              <select id="pbkdf2-hash" value={hash} onChange={(e) => setHash(e.target.value as typeof hash)} className="h-9 w-full rounded-lg border border-slate-700 bg-slate-900 px-2 text-sm text-slate-200">
                <option>SHA-256</option><option>SHA-1</option><option>SHA-384</option><option>SHA-512</option>
              </select>
            </div>
          </div>
        </div>
      </Panel>
      <ErrorAlert message={error} />
      {result && (
        <Panel title="Derived key (hex)" action={<><CopyButton text={result} /><DownloadButton text={result} filename="pbkdf2.txt" /></>}>
          <code className="break-all font-mono text-[13px] text-emerald-300">{result}</code>
          <p className="mt-2 text-xs text-slate-500">Iterasi tinggi membuat brute-force mahal. OWASP menyarankan ≥ 600.000 (SHA-256).</p>
        </Panel>
      )}
      <ToolNotes notes={[
        { title: 'What is this?', content: 'PBKDF2 menurunkan key dari password + salt + banyak iterasi (slow KDF) untuk menyimpan password dengan aman.' },
        { title: 'How to use', content: 'Isi password (dan salt opsional), pilih iterasi/panjang/hash, klik Derive key.' },
        { title: 'Input', content: 'Password + salt + parameter.' },
        { title: 'Output', content: 'Derived key hex.' },
        { title: 'Notes', content: 'Simpan salt + iterasi bersama hash. Untuk password modern, argon2id/bcrypt/scrypt lebih disarankan; PBKDF2 tetap standar (mis. di banyak format keystore).' },
      ]} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// UUID
// ---------------------------------------------------------------------------

function UuidTool() {
  const [count, setCount] = useState(5);
  const [uuids, setUuids] = useState<string[]>([]);
  const gen = () => setUuids(Array.from({ length: Math.min(Math.max(count, 1), 100) }, () => uuidV4()));
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Button onClick={gen}>🎲 Generate</Button>
        <label className="flex items-center gap-2 text-xs text-slate-400">
          Jumlah
          <input type="number" value={count} min={1} max={100} onChange={(e) => setCount(Number(e.target.value) || 1)} className="h-8 w-20 rounded-lg border border-slate-700 bg-slate-900 px-2 text-sm text-slate-200" />
        </label>
      </div>
      {uuids.length > 0 && (
        <Panel title="UUID v4" action={<CopyButton text={uuids.join('\n')} />}>
          <pre className="space-y-1 font-mono text-[13px] text-slate-200">{uuids.join('\n')}</pre>
        </Panel>
      )}
      <ToolNotes notes={[
        { title: 'What is this?', content: 'UUID v4. 122 bit acak (kriptografis) dari crypto.getRandomValues, format RFC 4122.' },
        { title: 'How to use', content: 'Atur jumlah, klik Generate.' },
        { title: 'Input', content: 'Jumlah UUID (1–100).' },
        { title: 'Output', content: 'Daftar UUID v4.' },
        { title: 'Notes', content: 'UUID hanya untuk identifikasi, bukan untuk keamanan (dapat ditebak urutannya bila non-random).' },
      ]} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Random bytes
// ---------------------------------------------------------------------------

function RandomBytesTool() {
  const [len, setLen] = useState(32);
  const [format, setFormat] = useState<'hex' | 'base64' | 'base64url'>('hex');
  const [result, setResult] = useState('');
  const gen = () => {
    const bytes = getRandomBytes(Math.min(Math.max(len, 1), 65536));
    setResult(format === 'hex' ? bytesToHex(bytes) : format === 'base64' ? bytesToBase64(bytes) : bytesToBase64Url(bytes));
  };
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Button onClick={gen}>🎲 Generate</Button>
        <label className="flex items-center gap-2 text-xs text-slate-400">
          Panjang (byte)
          <input type="number" value={len} min={1} max={65536} onChange={(e) => setLen(Number(e.target.value) || 1)} className="h-8 w-24 rounded-lg border border-slate-700 bg-slate-900 px-2 text-sm text-slate-200" />
        </label>
        <select value={format} onChange={(e) => setFormat(e.target.value as typeof format)} className="h-8 rounded-lg border border-slate-700 bg-slate-900 px-2 text-xs text-slate-200">
          <option value="hex">hex</option>
          <option value="base64">base64</option>
          <option value="base64url">base64url</option>
        </select>
      </div>
      {result && (
        <Panel title="Random bytes" action={<><CopyButton text={result} /><DownloadButton text={result} filename="random.txt" /></>}>
          <pre className="break-all font-mono text-[13px] text-slate-200">{result}</pre>
          <p className="mt-2 text-xs text-slate-500">Sumber: crypto.getRandomValues (CSPRNG).</p>
        </Panel>
      )}
      <ToolNotes notes={[
        { title: 'What is this?', content: 'Byte acak aman kriptografis (CSPRNG) dari Web Crypto API.' },
        { title: 'How to use', content: 'Atur panjang & format, klik Generate.' },
        { title: 'Input', content: 'Panjang 1–65536 byte + format output.' },
        { title: 'Output', content: 'Byte acak (hex/base64/base64url).' },
        { title: 'Notes', content: 'Gunakan untuk salt, IV, token, key. Jangan gunakan Math.random() untuk hal keamanan.' },
      ]} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// SHA-3 standalone
// ---------------------------------------------------------------------------

function Sha3Tool() {
  const [input, setInput] = useState('');
  const [mode, setMode] = useState<'text' | 'hex'>('text');
  const [bits, setBits] = useState<224 | 256 | 384 | 512>(256);
  const [result, setResult] = useState('');
  const run = () => {
    try {
      const data = mode === 'hex' ? hexToBytes(input) : utf8ToBytes(input);
      setResult(bytesToHex(sha3(data, bits)));
    } catch {
      setResult('');
    }
  };
  return (
    <div className="space-y-4">
      <Button onClick={run}>🧮 SHA-3</Button>
      <Panel title="Input">
        <div className="space-y-3">
          <div className="flex gap-2">
            {(['text', 'hex'] as const).map((m) => (
              <label key={m} className="flex cursor-pointer items-center gap-1.5 text-xs text-slate-400">
                <input type="radio" checked={mode === m} onChange={() => setMode(m)} className="accent-indigo-500" /> {m}
              </label>
            ))}
            <select value={bits} onChange={(e) => setBits(Number(e.target.value) as typeof bits)} className="h-8 rounded-lg border border-slate-700 bg-slate-900 px-2 text-xs text-slate-200">
              <option value={224}>SHA3-224</option><option value={256}>SHA3-256</option><option value={384}>SHA3-384</option><option value={512}>SHA3-512</option>
            </select>
          </div>
          <LabeledTextarea id="sha3-input" label="Data" value={input} onChange={setInput} rows={5} placeholder="Ketik teks…" />
        </div>
      </Panel>
      {result && (
        <Panel title="Hash" action={<CopyButton text={result} />}>
          <code className="break-all font-mono text-[13px] text-emerald-300">{result}</code>
        </Panel>
      )}
      <ToolNotes notes={[
        { title: 'What is this?', content: 'SHA-3 (FIPS 202) berbasis fungsi spons Keccak. berbeda konstruksi dari SHA-2.' },
        { title: 'How to use', content: 'Ketik data (atau hex), pilih varian, klik SHA-3.' },
        { title: 'Input', content: 'Teks atau hex.' },
        { title: 'Output', content: 'Hash hex sesuai varian.' },
        { title: 'Notes', content: 'Implementasi Keccak-f[1600] murni TypeScript lokal. baik untuk mempelajari konstruksi spons.' },
      ]} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// registry komponen
// ---------------------------------------------------------------------------

export const tools: Record<string, ComponentType> = {
  base64: () => <Transform config={base64Tool} />,
  base32: () => <Transform config={base32Tool} />,
  base16: () => <Transform config={base16Tool} />,
  'url-encoder': () => <Transform config={urlEncoderTool} />,
  'html-encoder': () => <Transform config={htmlEncoderTool} />,
  'ascii-hex': () => <Transform config={asciiHexTool} />,
  'binary-text': () => <Transform config={binaryTextTool} />,
  'decimal-hex': DecimalHexTool,
  rot13: () => <Transform config={rot13Tool} />,
  rot47: () => <Transform config={rot47Tool} />,
  caesar: () => <Transform config={caesarTool} />,
  'xor-calc': XorCalcTool,
  'xor-text': () => <Transform config={xorTextTool} />,
  aes: AesTool,
  chacha20: Chacha20Tool,
  rsa: RsaTool,
  'hash-generator': HashTool,
  hmac: HmacTool,
  pbkdf2: Pbkdf2Tool,
  uuid: UuidTool,
  'random-bytes': RandomBytesTool,
  sha3: Sha3Tool,
};

export default function CryptoModule() {
  return null;
}
