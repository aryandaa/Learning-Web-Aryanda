/**
 * Tools kategori CTF — decoder, brute-force cipher, frequency analysis,
 * kalkulator jaringan, tabel referensi. Semua client-side.
 */

import { useState } from 'react';
import { Button } from '../../../../components/ui/button';
import { TransformTool, type TransformConfig } from '../../components/TransformTool';
import {
  CopyButton, ErrorAlert, KeyValueTable, LabeledTextarea, Notice, Panel, ToolNotes,
} from '../../components/ui';
import { caesar, rot, rot13, rot47, atbash, morseEncode, morseDecode, baconEncode, baconDecode, railFenceEncode, railFenceDecode, vigenere, substitutionApply, englishScore, letterFrequency } from '../../utils/encoding';
import { bytesToBase64, bytesToUtf8, hexToBytes, utf8ToBytes, binaryToBytes } from '../../utils/bytes';
import { analyzeUnicode } from '../../utils/analysis';
import { parseTimestamp } from '../../utils/files';
import type { ComponentType } from 'react';

const ctfNotes = (what: string, how: string, extra?: string) => [
  { title: 'What is this?', content: what },
  { title: 'How to use', content: how },
  { title: 'Input', content: 'Teks / hex yang ditempel.' },
  { title: 'Output', content: 'Kandidat/kunci hasil analisis.' },
  { title: 'Notes', content: extra ?? 'Semua diproses lokal. Gunakan untuk CTF & belajar — bukan untuk menyerang sistem orang lain.' },
];

// ---------------------------------------------------------------------------
// Caesar decoder (brute-force)
// ---------------------------------------------------------------------------

function CtfCaesarTool() {
  const [input, setInput] = useState('');
  const [result, setResult] = useState<{ shift: number; text: string; score: number }[]>([]);
  const run = () => {
    const candidates = Array.from({ length: 26 }, (_, shift) => ({
      shift,
      text: caesar(input, -shift),
      score: englishScore(caesar(input, -shift)),
    })).sort((a, b) => b.score - a.score);
    setResult(candidates);
  };
  return (
    <div className="space-y-4">
      <Button onClick={run}>Coba semua 25 shift</Button>
      <Panel title="Input">
        <LabeledTextarea id="ctf-caesar-input" label="Ciphertext" value={input} onChange={setInput} rows={4} placeholder="Uryyb Jbeyq" />
      </Panel>
      {result.length > 0 && (
        <Panel title="Kandidat (diurutkan skor bahasa Inggris)">
          <div className="space-y-1.5">
            {result.map((c, i) => (
              <div key={c.shift} className={`flex items-start gap-3 rounded-lg border px-3 py-1.5 ${i === 0 ? 'border-indigo-500/40 bg-indigo-500/10' : 'border-slate-800 bg-slate-900/50'}`}>
                <span className="w-14 shrink-0 font-mono text-xs text-slate-500">shift {c.shift}</span>
                <pre className="min-w-0 flex-1 whitespace-pre-wrap break-all font-mono text-[13px] text-slate-200">{c.text}</pre>
                <span className="w-16 shrink-0 text-right font-mono text-xs text-slate-600">{c.score.toFixed(1)}</span>
              </div>
            ))}
          </div>
        </Panel>
      )}
      <ToolNotes notes={ctfNotes(
        'Mencoba semua 25 kemungkinan shift Caesar dan memberi skor kemiripan bahasa.',
        'Tempel ciphertext, klik Coba semua shift.',
        'Kandidat teratas biasanya plaintext — verifikasi secara visual.'
      )} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// ROT decoder
// ---------------------------------------------------------------------------

function CtfRotTool() {
  const [input, setInput] = useState('');
  const [result, setResult] = useState<{ rot: string; text: string }[]>([]);
  const run = () => {
    const list: { rot: string; text: string }[] = [];
    for (let r = 1; r <= 25; r++) list.push({ rot: `ROT${r}`, text: rot(input, r) });
    list.push({ rot: 'ROT13', text: rot13(input) });
    list.push({ rot: 'ROT47', text: rot47(input) });
    setResult(list);
  };
  return (
    <div className="space-y-4">
      <Button onClick={run}>Decode semua ROT</Button>
      <Panel title="Input">
        <LabeledTextarea id="ctf-rot-input" label="Ciphertext" value={input} onChange={setInput} rows={4} />
      </Panel>
      {result.length > 0 && (
        <Panel title="Semua variasi">
          <div className="max-h-96 space-y-1 overflow-auto">
            {result.map((r, i) => (
              <div key={i} className="flex items-start gap-3 rounded border border-slate-800 bg-slate-900/40 px-3 py-1.5">
                <span className="w-14 shrink-0 font-mono text-xs text-slate-500">{r.rot}</span>
                <pre className="min-w-0 flex-1 whitespace-pre-wrap break-all font-mono text-[13px] text-slate-300">{r.text}</pre>
              </div>
            ))}
          </div>
        </Panel>
      )}
      <ToolNotes notes={ctfNotes(
        'Menampilkan ROT1–25, ROT13, dan ROT47 sekaligus.',
        'Tempel ciphertext, klik Decode semua ROT.'
      )} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// XOR solver
// ---------------------------------------------------------------------------

function CtfXorTool() {
  const [input, setInput] = useState('');
  const [keyLen, setKeyLen] = useState(1);
  const [result, setResult] = useState<{ key: string; text: string; score: number }[]>([]);
  const [error, setError] = useState<string | null>(null);

  const run = () => {
    setError(null);
    try {
      const clean = input.trim();
      if (!clean) throw new Error('Input kosong.');
      const data = /^[0-9a-fA-F\s]+$/.test(clean) && clean.replace(/\s+/g, '').length % 2 === 0
        ? hexToBytes(clean)
        : utf8ToBytes(clean);
      const out: { key: string; text: string; score: number }[] = [];
      if (keyLen === 1) {
        for (let k = 0; k < 256; k++) {
          const dec = data.map((b) => b ^ k);
          const printable = dec.filter((b) => b >= 32 && b < 127).length / dec.length;
          if (printable < 0.6) continue;
          const text = bytesToUtf8(Uint8Array.from(dec));
          out.push({ key: `0x${k.toString(16).padStart(2, '0')} ('${String.fromCharCode(k)}')`, text, score: englishScore(text) });
        }
        out.sort((a, b) => b.score - a.score);
      } else {
        const keyBytes: number[] = [];
        for (let pos = 0; pos < keyLen; pos++) {
          const chunk = data.filter((_, i) => i % keyLen === pos);
          let best = { k: 0, s: -1 };
          for (let k = 0; k < 256; k++) {
            const dec = chunk.map((b) => b ^ k);
            const text = Array.from(dec, (b) => (b >= 32 && b < 127 ? String.fromCharCode(b) : '')).join('');
            const printable = dec.filter((b) => b >= 32 && b < 127).length / dec.length;
            const s = englishScore(text) * (printable > 0.7 ? 1 : 0.05);
            if (s > best.s) best = { k, s };
          }
          keyBytes.push(best.k);
        }
        const dec = data.map((b, i) => b ^ keyBytes[i % keyLen]);
        out.push({
          key: keyBytes.map((k) => String.fromCharCode(k)).join(''),
          text: bytesToUtf8(Uint8Array.from(dec)),
          score: englishScore(bytesToUtf8(Uint8Array.from(dec))),
        });
      }
      setResult(out.slice(0, 12));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Input tidak valid.');
    }
  };

  return (
    <div className="space-y-4">
      <Button onClick={run}>⊕ Solve</Button>
      <Panel title="Input">
        <div className="space-y-3">
          <LabeledTextarea id="ctf-xor-input" label="Ciphertext (hex otomatis terdeteksi)" value={input} onChange={setInput} rows={4} placeholder="hex atau teks…" />
          <label className="flex items-center gap-2 text-xs text-slate-400">
            Panjang key (1 = single-byte)
            <input type="number" value={keyLen} min={1} max={32} onChange={(e) => setKeyLen(Number(e.target.value) || 1)} className="h-8 w-20 rounded-lg border border-slate-700 bg-slate-900 px-2 text-sm text-slate-200" />
          </label>
        </div>
      </Panel>
      <ErrorAlert message={error} />
      {result.length > 0 && (
        <Panel title="Kandidat">
          <div className="space-y-2">
            {result.map((r, i) => (
              <div key={i} className={`rounded-lg border px-3 py-2 ${i === 0 ? 'border-indigo-500/40 bg-indigo-500/10' : 'border-slate-800 bg-slate-900/50'}`}>
                <p className="text-xs text-slate-500">Key: <code className="text-amber-300">{r.key}</code> · score {r.score.toFixed(1)}</p>
                <pre className="mt-1 max-h-24 overflow-auto whitespace-pre-wrap break-all font-mono text-[13px] text-slate-200">{r.text}</pre>
              </div>
            ))}
          </div>
        </Panel>
      )}
      <ToolNotes notes={ctfNotes(
        'Brute-force XOR single-byte (dengan skor bahasa) atau repeating-key per posisi.',
        'Tempel ciphertext, atur panjang key, klik Solve.',
        'Heuristik — cek kandidat secara visual untuk yang paling masuk akal.'
      )} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Base64 detector
// ---------------------------------------------------------------------------

function Base64DetectorTool() {
  const [input, setInput] = useState('');
  const [result, setResult] = useState<{ isValid: boolean; decoded: string; reason: string; decodedBytes: string } | null>(null);

  const run = () => {
    const clean = input.replace(/\s+/g, '');
    const padded = clean.replace(/=+$/, '');
    const validCharset = /^[A-Za-z0-9+/]*$/.test(padded);
    const lenOk = clean.length % 4 !== 1;
    let decoded = '';
    let decodedBytes = '';
    if (validCharset && lenOk && clean.length >= 4) {
      try {
        const bytes = Uint8Array.from(atob(clean), (c) => c.charCodeAt(0));
        decoded = bytesToUtf8(bytes, true);
        decodedBytes = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join(' ');
      } catch {
        /* bukan base64 valid */
      }
    }
    const hasBase64Look = /[A-Za-z0-9+/]{16,}={0,2}/.test(clean);
    setResult({
      isValid: decoded !== '' || (validCharset && lenOk && hasBase64Look),
      decoded,
      reason: decoded !== ''
        ? 'Decode berhasil — string ini adalah Base64 valid dan menghasilkan teks UTF-8.'
        : validCharset && lenOk && hasBase64Look
          ? 'Charset & panjang Base64 valid, tetapi tidak menghasilkan teks UTF-8 (mungkin data biner atau bukan Base64).'
          : 'Bukan Base64: charset/length tidak valid.',
      decodedBytes,
    });
  };

  return (
    <div className="space-y-4">
      <Button onClick={run}>Deteksi & decode</Button>
      <Panel title="Input">
        <LabeledTextarea id="b64detect-input" label="Teks yang dicurigai Base64" value={input} onChange={setInput} rows={4} placeholder="SGVsbG8gV29ybGQh" />
      </Panel>
      {result && (
        <Panel title="Hasil">
          <p className={result.isValid ? 'text-sm text-emerald-300' : 'text-sm text-amber-300'}>
            {result.isValid ? '✅ ' : '❌ '}{result.reason}
          </p>
          {result.decoded && (
            <div className="mt-3">
              <KeyValueTable rows={[
                { k: 'Decoded (UTF-8)', v: result.decoded },
                { k: 'Decoded (hex)', v: result.decodedBytes },
              ]} />
              <CopyButton text={result.decoded} className="mt-2" />
            </div>
          )}
        </Panel>
      )}
      <ToolNotes notes={ctfNotes(
        'Memeriksa apakah teks adalah Base64 valid dan mencoba decode.',
        'Tempel teks, klik Deteksi & decode.',
        'Banyak string acak lolos charset Base64 — cek hasil decode untuk kejelasan.'
      )} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Encoding detector
// ---------------------------------------------------------------------------

function EncodingDetectorTool() {
  const [input, setInput] = useState('');
  const [result, setResult] = useState<{ encoding: string; confidence: number; note: string; nextStep: string }[]>([]);

  const run = () => {
    const s = input.trim();
    const clean = s.replace(/\s+/g, '');
    const candidates: { encoding: string; confidence: number; note: string; nextStep: string }[] = [];
    if (/^[0-9a-fA-F]+$/.test(clean) && clean.length % 2 === 0 && clean.length >= 4) {
      try {
        const text = bytesToUtf8(hexToBytes(clean), true);
        candidates.push({ encoding: 'Hex (ASCII/UTF-8)', confidence: 90, note: `Decode: "${text.slice(0, 80)}"`, nextStep: 'Coba Base16 decoder' });
      } catch {
        candidates.push({ encoding: 'Hex (biner/non-teks)', confidence: 60, note: 'Hex valid tetapi bukan UTF-8.', nextStep: 'Coba Hex Viewer / strings' });
      }
    }
    if (/^[A-Za-z0-9+/]*={0,2}$/.test(clean) && clean.length % 4 !== 1 && clean.length >= 8) {
      try {
        const bytes = Uint8Array.from(atob(clean), (c) => c.charCodeAt(0));
        const text = bytesToUtf8(bytes, true);
        candidates.push({ encoding: 'Base64', confidence: 85, note: `Decode: "${text.slice(0, 80)}"`, nextStep: 'Coba Base64 decoder' });
      } catch {
        /* bukan teks */
      }
    }
    if (/^[A-Z2-7]+={0,6}$/i.test(clean) && clean.length >= 8) {
      candidates.push({ encoding: 'Base32', confidence: 50, note: 'Charset Base32 (A–Z, 2–7).', nextStep: 'Coba Base32 decoder' });
    }
    if (/^[01\s]+$/.test(s) && s.replace(/\s+/g, '').length % 8 === 0) {
      candidates.push({ encoding: 'Binary (8-bit)', confidence: 70, note: 'Bit string valid.', nextStep: 'Coba Binary ↔ Text' });
    }
    if (/%[0-9a-fA-F]{2}/.test(s)) {
      try {
        const text = decodeURIComponent(s);
        candidates.push({ encoding: 'URL percent-encoding', confidence: 80, note: `Decode: "${text.slice(0, 80)}"`, nextStep: 'Coba URL decoder' });
      } catch {
        /* ignore */
      }
    }
    if (/^[.\-/\s]+$/.test(s)) {
      candidates.push({ encoding: 'Morse code', confidence: 45, note: 'Hanya berisi titik, strip, dan spasi.', nextStep: 'Coba Morse decoder' });
    }
    if (/^[AB\s]+$/.test(s) && s.replace(/\s+/g, '').length % 5 === 0) {
      candidates.push({ encoding: 'Bacon cipher', confidence: 40, note: 'Hanya A/B (5 bit/karakter).', nextStep: 'Coba Bacon cipher' });
    }
    const lettersOnly = s.replace(/[^A-Za-z]/g, '');
    if (lettersOnly.length >= 8 && /[a-z]/.test(s) && /[A-Z]/.test(s) === false) {
      candidates.push({ encoding: 'ROT/Caesar', confidence: 35, note: 'Teks huruf — coba brute-force shift.', nextStep: 'Coba Caesar decoder' });
    }
    if (/^\d+$/.test(clean) && clean.length >= 4) {
      candidates.push({ encoding: 'Decimal / integer', confidence: 55, note: 'Deret angka — bisa ASCII decimal atau koordinat.', nextStep: 'Coba Integer converter / ASCII table' });
    }
    if (candidates.length === 0) {
      candidates.push({ encoding: 'Tidak terdeteksi', confidence: 0, note: 'Tidak ada pola encoding umum.', nextStep: 'Coba analisis frekuensi' });
    }
    candidates.sort((a, b) => b.confidence - a.confidence);
    setResult(candidates);
  };

  return (
    <div className="space-y-4">
      <Button onClick={run}>Deteksi encoding</Button>
      <Panel title="Input">
        <LabeledTextarea id="encdetect-input" label="Teks yang tidak dikenal" value={input} onChange={setInput} rows={4} placeholder="Tempel string misterius…" />
      </Panel>
      {result.length > 0 && (
        <Panel title="Kandidat encoding">
          <div className="space-y-2">
            {result.map((c, i) => (
              <div key={i} className="rounded-lg border border-slate-800 bg-slate-900/50 px-3 py-2">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-slate-200">{c.encoding}</p>
                  <span className="font-mono text-xs text-slate-500">{c.confidence}%</span>
                </div>
                <p className="mt-0.5 break-all font-mono text-xs text-slate-400">{c.note}</p>
                <p className="mt-0.5 text-xs text-slate-600">→ {c.nextStep}</p>
              </div>
            ))}
          </div>
        </Panel>
      )}
      <ToolNotes notes={ctfNotes(
        'Heuristik mendeteksi kemungkinan encoding: hex, base64, base32, biner, URL, Morse, Bacon, ROT, desimal.',
        'Tempel string, klik Deteksi encoding.',
        'Kandidat hanyalah tebakan berbasis pola — konfirmasi dengan decoder terkait.'
      )} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Frequency analyzer
// ---------------------------------------------------------------------------

function FrequencyTool() {
  const [input, setInput] = useState('');
  const [result, setResult] = useState<ReturnType<typeof letterFrequency> | null>(null);

  const run = () => setResult(letterFrequency(input));

  return (
    <div className="space-y-4">
      <Button onClick={run}>Analisis frekuensi</Button>
      <Panel title="Input">
        <LabeledTextarea id="freq-input" label="Teks" value={input} onChange={setInput} rows={5} />
      </Panel>
      {result && (
        <Panel title="Frekuensi huruf">
          <div className="space-y-1.5">
            {result.map((f) => (
              <div key={f.char} className="flex items-center gap-2">
                <span className="w-6 shrink-0 text-center font-mono text-xs text-slate-400">{f.char}</span>
                <div className="h-3 flex-1 overflow-hidden rounded bg-slate-800">
                  <div className="h-full bg-fuchsia-500/70" style={{ width: `${(f.count / (result[0]?.count ?? 1)) * 100}%` }} />
                </div>
                <span className="w-24 shrink-0 text-right font-mono text-xs text-slate-500">{f.count} ({f.pct.toFixed(1)}%)</span>
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs text-slate-500">
            Urutan frekuensi bahasa Inggris: ETAOIN SHRDLU. Cocokkan untuk menebak substitution cipher.
          </p>
        </Panel>
      )}
      <ToolNotes notes={ctfNotes(
        'Menghitung frekuensi huruf — dasar kriptanalisis substitution.',
        'Tempel teks, klik Analisis frekuensi.'
      )} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Substitution helper
// ---------------------------------------------------------------------------

function SubstitutionTool() {
  const [input, setInput] = useState('');
  const [mapping, setMapping] = useState('');
  const [result, setResult] = useState('');
  const [error, setError] = useState<string | null>(null);

  const autoSuggest = () => {
    const freq = letterFrequency(input).map((f) => f.char);
    const english = 'ETAOINSHRDLUCMWFGYPBVKJXQZ';
    const map: string[] = new Array(26).fill('_');
    freq.slice(0, 26).forEach((c, i) => {
      map[c.charCodeAt(0) - 65] = english[i] ?? '_';
    });
    setMapping(
      map
        .map((v, i) => `${String.fromCharCode(65 + i)}=${v}`)
        .join(', ')
    );
  };

  const run = () => {
    setError(null);
    try {
      if (!mapping.trim()) throw new Error('Mapping kosong. Gunakan format A=X,B=Y atau 26 huruf, atau klik "Auto-suggest".');
      setResult(substitutionApply(input, mapping));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Mapping tidak valid.');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Button onClick={run}>Terapkan mapping</Button>
        <Button variant="secondary" onClick={autoSuggest}>✨ Auto-suggest (dari frekuensi)</Button>
      </div>
      <Panel title="Input">
        <div className="space-y-3">
          <LabeledTextarea id="subst-input" label="Ciphertext" value={input} onChange={setInput} rows={4} />
          <div>
            <label htmlFor="subst-map" className="mb-1 block text-xs text-slate-400">Mapping (A=X,B=Y atau 26 huruf)</label>
            <input id="subst-map" value={mapping} onChange={(e) => setMapping(e.target.value)} placeholder="E=Q,T=W,…" className="h-9 w-full max-w-xl rounded-lg border border-slate-700 bg-slate-900 px-3 font-mono text-sm text-slate-200 focus:border-indigo-500 focus:outline-none" />
          </div>
        </div>
      </Panel>
      <ErrorAlert message={error} />
      {result && (
        <Panel title="Hasil" action={<CopyButton text={result} />}>
          <pre className="max-h-64 overflow-auto whitespace-pre-wrap break-all font-mono text-[13px] text-slate-200">{result}</pre>
        </Panel>
      )}
      <ToolNotes notes={ctfNotes(
        'Helper substitution monoalphabetic: terapkan mapping manual atau auto-suggest berbasis frekuensi.',
        'Tempel ciphertext, atur mapping (atau Auto-suggest), klik Terapkan mapping.',
        'Auto-suggest hanyalah titik awal — sesuaikan mapping secara iteratif.'
      )} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Vigenère / Rail fence / Atbash / Morse / Bacon (TransformTool)
// ---------------------------------------------------------------------------

const vigenereTool: TransformConfig = {
  title: 'Vigenère',
  description: 'Enkripsi/dekripsi Vigenère',
  placeholder: 'Teks…',
  encode: (s, keys) => vigenere(s, keys.key || '', false),
  decode: (s, keys) => vigenere(s, keys.key || '', true),
  keyFields: [{ id: 'key', label: 'Key (huruf A–Z)', placeholder: 'LEMON' }],
  example: 'ATTACKATDAWN',
  notes: ctfNotes(
    'Vigenère = deret Caesar dengan key berulang. Polyalphabetic — lebih kuat dari Caesar tunggal.',
    'Isi key, ketik teks, klik Encode/Decode.',
    'Key hanya huruf; huruf non-alfabet dipertahankan.'
  ),
};

const railFenceTool: TransformConfig = {
  title: 'Rail Fence',
  description: 'Transposisi zig-zag',
  placeholder: 'Teks…',
  encode: (s, keys) => railFenceEncode(s, parseInt(keys.rails || '3', 10)),
  decode: (s, keys) => railFenceDecode(s, parseInt(keys.rails || '3', 10)),
  keyFields: [{ id: 'rails', label: 'Jumlah rails', type: 'number', defaultValue: '3' }],
  example: 'WEAREDISCOVEREDFLEEATONCE',
  notes: ctfNotes(
    'Rail fence menulis teks pola zig-zag lalu membaca per baris.',
    'Atur rails, ketik teks, klik Encode/Decode.'
  ),
};

const atbashTool: TransformConfig = {
  title: 'Atbash',
  description: 'Substitusi A↔Z (simetris)',
  placeholder: 'Teks…',
  encode: (s) => atbash(s),
  decode: (s) => atbash(s),
  example: 'Svool dliow',
  notes: ctfNotes(
    'Atbash membalik alfabet: A↔Z, B↔Y. Simetris.',
    'Ketik teks → Encode/Decode.'
  ),
};

const morseTool: TransformConfig = {
  title: 'Morse',
  description: 'Encode/decode kode Morse',
  placeholder: 'Teks atau Morse (. - /)…',
  encode: (s) => morseEncode(s),
  decode: (s) => morseDecode(s),
  example: 'HELLO WORLD',
  notes: ctfNotes(
    'Morse: huruf dipisah spasi, kata dipisah "/".',
    'Teks → Encode; Morse → Decode.'
  ),
};

const baconTool: TransformConfig = {
  title: 'Bacon',
  description: 'Bacon cipher (24 huruf, A/B)',
  placeholder: 'Teks atau A/B…',
  encode: (s) => baconEncode(s),
  decode: (s) => baconDecode(s),
  example: 'HELLO',
  notes: ctfNotes(
    'Bacon: tiap huruf = 5 bit (A/B). Alfabet 24 huruf (I/J dan U/V digabung).',
    'Teks → Encode; A/B → Decode.'
  ),
};

// ---------------------------------------------------------------------------
// Unicode analyzer
// ---------------------------------------------------------------------------

function UnicodeAnalyzerTool() {
  const [input, setInput] = useState('');
  const [result, setResult] = useState<ReturnType<typeof analyzeUnicode> | null>(null);

  const run = () => setResult(analyzeUnicode(input));

  return (
    <div className="space-y-4">
      <Button onClick={run}>Analisis</Button>
      <Panel title="Input">
        <LabeledTextarea id="uni-analyze-input" label="Teks" value={input} onChange={setInput} rows={4} placeholder="A\u00e9\u4e16\ud83d\ude00" />
      </Panel>
      {result && (
        <Panel title={`Karakter (${result.length})`}>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-xs">
              <thead>
                <tr className="text-left text-slate-500">
                  <th className="py-1.5 pr-3">Char</th>
                  <th className="py-1.5 pr-3">Codepoint</th>
                  <th className="py-1.5 pr-3">Hex</th>
                  <th className="py-1.5 pr-3">Binary</th>
                  <th className="py-1.5 pr-3">UTF-8 bytes</th>
                  <th className="py-1.5">Kategori</th>
                </tr>
              </thead>
              <tbody>
                {result.map((c, i) => (
                  <tr key={i} className="border-t border-slate-800/60">
                    <td className="py-1.5 pr-3 text-lg">{c.char}</td>
                    <td className="py-1.5 pr-3 font-mono text-slate-300">U+{c.hex}</td>
                    <td className="py-1.5 pr-3 font-mono text-slate-500">{c.codepoint}</td>
                    <td className="py-1.5 pr-3 font-mono text-slate-500">{c.binary}</td>
                    <td className="py-1.5 pr-3 font-mono text-slate-500">{c.utf8}</td>
                    <td className="py-1.5 text-slate-500">{c.category}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-xs text-slate-500">Waspada homoglyph & karakter tak terlihat (zero-width) pada input penting — cek kategori Control/Other.</p>
        </Panel>
      )}
      <ToolNotes notes={ctfNotes(
        'Per-karakter: codepoint, hex, biner, byte UTF-8, kategori dasar.',
        'Tempel teks, klik Analisis.',
        'Berguna mendeteksi hidden characters & obfuscation.'
      )} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Timestamp converter (CTF)
// ---------------------------------------------------------------------------

function TimestampConverterTool() {
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
      <Button onClick={run}>Konversi</Button>
      <Panel title="Input">
        <LabeledTextarea id="tsc-input" label="Timestamp (Unix s/ms, ISO, tanggal)" value={input} onChange={setInput} rows={3} placeholder="1700000000" />
      </Panel>
      <ErrorAlert message={error} />
      {result && (
        <Panel title="Hasil" action={<CopyButton text={JSON.stringify(result, null, 2)} />}>
          <KeyValueTable rows={[
            { k: 'Unix seconds', v: result.unixSeconds },
            { k: 'ISO 8601', v: result.iso },
            { k: 'Local', v: result.local },
            { k: 'Relative', v: result.relative },
            { k: 'Hex', v: result.hexSeconds },
          ]} />
        </Panel>
      )}
      <ToolNotes notes={ctfNotes('Konversi timestamp antar format untuk challenge forensik/OSINT.', 'Masukkan timestamp, klik Konversi.')} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// IP converter / Subnet / CIDR
// ---------------------------------------------------------------------------

function ipv4ToInt(ip: string): number {
  const parts = ip.split('.').map((p) => Number(p));
  if (parts.length !== 4 || parts.some((p) => !Number.isInteger(p) || p < 0 || p > 255)) {
    throw new Error('IPv4 tidak valid.');
  }
  return ((parts[0] << 24) | (parts[1] << 16) | (parts[2] << 8) | parts[3]) >>> 0;
}

function intToIpv4(n: number): string {
  return `${(n >>> 24) & 0xff}.${(n >>> 16) & 0xff}.${(n >>> 8) & 0xff}.${n & 0xff}`;
}

function IpConverterTool() {
  const [input, setInput] = useState('192.168.1.1');
  const [result, setResult] = useState<{ dotted: string; decimal: string; hex: string; binary: string; int: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const run = () => {
    setError(null);
    try {
      const clean = input.trim();
      let ipInt: number;
      if (clean.includes('.')) ipInt = ipv4ToInt(clean);
      else if (/^\d+$/.test(clean)) {
        const n = Number(clean);
        if (!Number.isSafeInteger(n) || n < 0 || n > 0xffffffff) throw new Error('Nilai desimal di luar range IPv4.');
        ipInt = n;
      } else if (/^0x/i.test(clean)) {
        const n = parseInt(clean, 16);
        if (n < 0 || n > 0xffffffff) throw new Error('Hex di luar range.');
        ipInt = n;
      } else if (/^[01]+$/.test(clean)) {
        const n = parseInt(clean, 2);
        if (n < 0 || n > 0xffffffff) throw new Error('Biner di luar range.');
        ipInt = n;
      } else {
        throw new Error('Format tidak dikenali (dotted, decimal, hex, atau biner).');
      }
      setResult({
        dotted: intToIpv4(ipInt),
        decimal: String(ipInt),
        hex: `0x${ipInt.toString(16).padStart(8, '0')}`,
        binary: ipInt.toString(2).padStart(32, '0').replace(/(.{8})/g, '$1 ').trim(),
        int: ipInt,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Input tidak valid.');
      setResult(null);
    }
  };

  return (
    <div className="space-y-4">
      <Button onClick={run}>Convert</Button>
      <Panel title="Input">
        <LabeledTextarea id="ipconv-input" label="IPv4 (dotted, decimal, hex, atau biner)" value={input} onChange={setInput} rows={2} />
      </Panel>
      <ErrorAlert message={error} />
      {result && (
        <Panel title="Representasi" action={<CopyButton text={`${result.dotted} | ${result.decimal} | ${result.hex}`} />}>
          <KeyValueTable rows={[
            { k: 'Dotted', v: result.dotted },
            { k: 'Decimal', v: result.decimal },
            { k: 'Hex', v: result.hex },
            { k: 'Binary', v: result.binary },
          ]} />
        </Panel>
      )}
      <ToolNotes notes={ctfNotes(
        'Konversi IPv4 antar representasi (dotted/desimal/hex/biner).',
        'Masukkan salah satu format, klik Convert.'
      )} />
    </div>
  );
}

function SubnetTool() {
  const [ip, setIp] = useState('192.168.1.0');
  const [prefix, setPrefix] = useState(24);
  const [result, setResult] = useState<{
    network: string; broadcast: string; mask: string; first: string; last: string;
    total: number; usable: number; wildcard: string; classful: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const run = () => {
    setError(null);
    try {
      if (prefix < 0 || prefix > 32) throw new Error('Prefix harus 0–32.');
      const ipInt = ipv4ToInt(ip);
      const mask = prefix === 0 ? 0 : (0xffffffff << (32 - prefix)) >>> 0;
      const network = (ipInt & mask) >>> 0;
      const broadcast = (network | ~mask) >>> 0;
      const total = 2 ** (32 - prefix);
      const first = prefix >= 31 ? network : (network + 1) >>> 0;
      const last = prefix >= 31 ? broadcast : (broadcast - 1) >>> 0;
      const cls = ipInt >= 0x0a000000 && ipInt <= 0x0affffff ? 'Private (10/8)'
        : ipInt >= 0xac100000 && ipInt <= 0xac1fffff ? 'Private (172.16/12)'
        : ipInt >= 0xc0a80000 && ipInt <= 0xc0a8ffff ? 'Private (192.168/16)'
        : ipInt === 0x7f000001 ? 'Loopback' : 'Public/other';
      setResult({
        network: intToIpv4(network),
        broadcast: intToIpv4(broadcast),
        mask: intToIpv4(mask),
        first: intToIpv4(first),
        last: intToIpv4(last),
        total,
        usable: prefix >= 31 ? total : Math.max(0, total - 2),
        wildcard: intToIpv4(~mask >>> 0),
        classful: cls,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Input tidak valid.');
      setResult(null);
    }
  };

  return (
    <div className="space-y-4">
      <Button onClick={run}>Hitung subnet</Button>
      <Panel title="Input">
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-52 flex-1">
            <label htmlFor="subnet-ip" className="mb-1 block text-xs text-slate-400">IP address</label>
            <input id="subnet-ip" value={ip} onChange={(e) => setIp(e.target.value)} className="h-9 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 font-mono text-sm text-slate-200" />
          </div>
          <div className="w-32">
            <label htmlFor="subnet-prefix" className="mb-1 block text-xs text-slate-400">Prefix (/)</label>
            <input id="subnet-prefix" type="number" value={prefix} min={0} max={32} onChange={(e) => setPrefix(Number(e.target.value) || 0)} className="h-9 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 text-sm text-slate-200" />
          </div>
        </div>
      </Panel>
      <ErrorAlert message={error} />
      {result && (
        <Panel title="Hasil" action={<CopyButton text={JSON.stringify(result, null, 2)} />}>
          <KeyValueTable rows={[
            { k: 'Network', v: `${result.network}/${prefix}` },
            { k: 'Netmask', v: result.mask },
            { k: 'Wildcard', v: result.wildcard },
            { k: 'Broadcast', v: result.broadcast },
            { k: 'First host', v: result.first },
            { k: 'Last host', v: result.last },
            { k: 'Total address', v: result.total.toLocaleString() },
            { k: 'Usable hosts', v: result.usable.toLocaleString() },
            { k: 'Klasifikasi', v: result.classful },
          ]} />
        </Panel>
      )}
      <ToolNotes notes={ctfNotes(
        'Menghitung network/broadcast/mask/host range dari IP + prefix.',
        'Isi IP dan prefix, klik Hitung subnet.',
        'Prefix 31/30 untuk point-to-point: host usable berbeda.'
      )} />
    </div>
  );
}

function CidrTool() {
  const [input, setInput] = useState('192.168.1.0/24\n10.0.0.0/30');
  const [result, setResult] = useState<{ cidr: string; network: string; mask: string; first: string; last: string; broadcast: string; total: number; usable: number }[]>([]);
  const [error, setError] = useState<string | null>(null);

  const run = () => {
    setError(null);
    const lines = input.split('\n').map((l) => l.trim()).filter(Boolean);
    const out: { cidr: string; network: string; mask: string; first: string; last: string; broadcast: string; total: number; usable: number }[] = [];
    try {
      for (const line of lines) {
        const m = /^(\d{1,3}(?:\.\d{1,3}){3})\/(\d{1,2})$/.exec(line);
        if (!m) throw new Error(`CIDR tidak valid: "${line}"`);
        const prefix = Number(m[2]);
        if (prefix > 32) throw new Error(`Prefix > 32 pada "${line}"`);
        const ipInt = ipv4ToInt(m[1]);
        const mask = prefix === 0 ? 0 : (0xffffffff << (32 - prefix)) >>> 0;
        const network = (ipInt & mask) >>> 0;
        const broadcast = (network | ~mask) >>> 0;
        const total = 2 ** (32 - prefix);
        out.push({
          cidr: line,
          network: intToIpv4(network),
          mask: intToIpv4(mask),
          first: prefix >= 31 ? intToIpv4(network) : intToIpv4((network + 1) >>> 0),
          last: prefix >= 31 ? intToIpv4(broadcast) : intToIpv4((broadcast - 1) >>> 0),
          broadcast: intToIpv4(broadcast),
          total,
          usable: prefix >= 31 ? total : Math.max(0, total - 2),
        });
      }
      setResult(out);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Input tidak valid.');
    }
  };

  return (
    <div className="space-y-4">
      <Button onClick={run}>Hitung</Button>
      <Panel title="Input">
        <LabeledTextarea id="cidr-input" label="Satu CIDR per baris" value={input} onChange={setInput} rows={4} placeholder="192.168.1.0/24" />
      </Panel>
      <ErrorAlert message={error} />
      {result.length > 0 && (
        <Panel title="Hasil">
          <div className="space-y-2">
            {result.map((r) => (
              <div key={r.cidr} className="rounded-lg border border-slate-800 bg-slate-900/50 px-3 py-2">
                <p className="font-mono text-sm text-slate-200">{r.cidr} <span className="text-slate-500">→ {r.network}</span></p>
                <p className="mt-1 text-xs text-slate-500">
                  mask {r.mask} · first {r.first} · last {r.last} · broadcast {r.broadcast} · {r.total.toLocaleString()} addr ({r.usable.toLocaleString()} usable)
                </p>
              </div>
            ))}
          </div>
        </Panel>
      )}
      <ToolNotes notes={ctfNotes(
        'Ekspansi daftar CIDR: network, mask, host range, broadcast.',
        'Tempel satu CIDR per baris, klik Hitung.'
      )} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Port reference
// ---------------------------------------------------------------------------

const PORTS: { port: number; proto: string; name: string; desc: string }[] = [
  { port: 20, proto: 'TCP', name: 'FTP-Data', desc: 'File Transfer Protocol (data)' },
  { port: 21, proto: 'TCP', name: 'FTP', desc: 'File Transfer Protocol (control)' },
  { port: 22, proto: 'TCP', name: 'SSH', desc: 'Secure Shell' },
  { port: 23, proto: 'TCP', name: 'Telnet', desc: 'Remote terminal (tidak aman)' },
  { port: 25, proto: 'TCP', name: 'SMTP', desc: 'Email delivery' },
  { port: 53, proto: 'UDP/TCP', name: 'DNS', desc: 'Domain Name System' },
  { port: 67, proto: 'UDP', name: 'DHCP', desc: 'DHCP server' },
  { port: 68, proto: 'UDP', name: 'DHCP', desc: 'DHCP client' },
  { port: 69, proto: 'UDP', name: 'TFTP', desc: 'Trivial FTP' },
  { port: 80, proto: 'TCP', name: 'HTTP', desc: 'Web (plaintext)' },
  { port: 110, proto: 'TCP', name: 'POP3', desc: 'Email retrieval' },
  { port: 111, proto: 'TCP/UDP', name: 'RPCbind', desc: 'Sun RPC port mapper' },
  { port: 135, proto: 'TCP', name: 'MSRPC', desc: 'Windows RPC — target umum' },
  { port: 137, proto: 'UDP', name: 'NetBIOS-NS', desc: 'Windows name service' },
  { port: 139, proto: 'TCP', name: 'NetBIOS-SSN', desc: 'Windows file sharing (SMB)' },
  { port: 143, proto: 'TCP', name: 'IMAP', desc: 'Email retrieval' },
  { port: 161, proto: 'UDP', name: 'SNMP', desc: 'Network management' },
  { port: 389, proto: 'TCP', name: 'LDAP', desc: 'Directory service' },
  { port: 443, proto: 'TCP', name: 'HTTPS', desc: 'Web (TLS)' },
  { port: 445, proto: 'TCP', name: 'SMB', desc: 'Windows file sharing — target umum' },
  { port: 465, proto: 'TCP', name: 'SMTPS', desc: 'SMTP over TLS' },
  { port: 514, proto: 'UDP', name: 'Syslog', desc: 'System logging' },
  { port: 587, proto: 'TCP', name: 'SMTP-Sub', desc: 'SMTP submission (TLS)' },
  { port: 636, proto: 'TCP', name: 'LDAPS', desc: 'LDAP over TLS' },
  { port: 993, proto: 'TCP', name: 'IMAPS', desc: 'IMAP over TLS' },
  { port: 995, proto: 'TCP', name: 'POP3S', desc: 'POP3 over TLS' },
  { port: 1080, proto: 'TCP', name: 'SOCKS', desc: 'Proxy SOCKS' },
  { port: 1433, proto: 'TCP', name: 'MSSQL', desc: 'Microsoft SQL Server' },
  { port: 1521, proto: 'TCP', name: 'Oracle', desc: 'Oracle DB listener' },
  { port: 1723, proto: 'TCP', name: 'PPTP', desc: 'VPN (legacy)' },
  { port: 2049, proto: 'TCP/UDP', name: 'NFS', desc: 'Network File System' },
  { port: 2375, proto: 'TCP', name: 'Docker', desc: 'Docker API (tanpa TLS = bahaya)' },
  { port: 3000, proto: 'TCP', name: 'Dev/Grafana', desc: 'Aplikasi dev umum (Grafana, etc.)' },
  { port: 3306, proto: 'TCP', name: 'MySQL', desc: 'MySQL database' },
  { port: 3389, proto: 'TCP', name: 'RDP', desc: 'Windows Remote Desktop' },
  { port: 5000, proto: 'TCP', name: 'Dev', desc: 'Beragam aplikasi dev' },
  { port: 5432, proto: 'TCP', name: 'PostgreSQL', desc: 'PostgreSQL database' },
  { port: 5900, proto: 'TCP', name: 'VNC', desc: 'Remote desktop VNC' },
  { port: 5985, proto: 'TCP', name: 'WinRM', desc: 'Windows Remote Management (HTTP)' },
  { port: 6379, proto: 'TCP', name: 'Redis', desc: 'Redis — tanpa auth = bahaya' },
  { port: 6443, proto: 'TCP', name: 'K8s API', desc: 'Kubernetes API server' },
  { port: 8000, proto: 'TCP', name: 'Alt-HTTP', desc: 'Web alternatif (dev)' },
  { port: 8080, proto: 'TCP', name: 'Alt-HTTP', desc: 'Web alternatif / proxy' },
  { port: 8443, proto: 'TCP', name: 'Alt-HTTPS', desc: 'Web alternatif (TLS)' },
  { port: 8888, proto: 'TCP', name: 'Jupyter/dev', desc: 'Jupyter, proxy dev' },
  { port: 9000, proto: 'TCP', name: 'App', desc: 'SonarQube, PHP-FPM, dll' },
  { port: 9092, proto: 'TCP', name: 'Kafka', desc: 'Apache Kafka' },
  { port: 9200, proto: 'TCP', name: 'Elasticsearch', desc: 'Elasticsearch — tanpa auth = bahaya' },
  { port: 11211, proto: 'UDP/TCP', name: 'Memcached', desc: 'Memcached (amplification)' },
  { port: 27017, proto: 'TCP', name: 'MongoDB', desc: 'MongoDB — tanpa auth = bahaya' },
];

function PortReferenceTool() {
  const [query, setQuery] = useState('');
  const filtered = PORTS.filter(
    (p) =>
      String(p.port).includes(query.trim()) ||
      p.name.toLowerCase().includes(query.trim().toLowerCase()) ||
      p.desc.toLowerCase().includes(query.trim().toLowerCase())
  );
  return (
    <div className="space-y-4">
      <Panel title="Cari port">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Cari port/nama… (mis. ssh, 3306)"
          aria-label="Cari port"
          className="h-9 w-full max-w-sm rounded-lg border border-slate-700 bg-slate-900 px-3 text-sm text-slate-200 focus:border-indigo-500 focus:outline-none"
        />
      </Panel>
      <Panel title={`Port umum (${filtered.length})`} action={<CopyButton text={filtered.map((p) => `${p.port}/${p.proto}\t${p.name}\t${p.desc}`).join('\n')} />}>
        <div className="max-h-96 overflow-auto">
          <table className="w-full border-collapse text-xs">
            <thead className="sticky top-0 bg-slate-900">
              <tr className="text-left text-slate-500">
                <th className="px-2 py-1.5">Port</th>
                <th className="px-2 py-1.5">Proto</th>
                <th className="px-2 py-1.5">Layanan</th>
                <th className="px-2 py-1.5">Deskripsi</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => (
                <tr key={p.port} className="border-t border-slate-800/50">
                  <td className="px-2 py-1 font-mono text-slate-300">{p.port}</td>
                  <td className="px-2 py-1 font-mono text-slate-500">{p.proto}</td>
                  <td className="px-2 py-1 font-mono text-slate-300">{p.name}</td>
                  <td className="px-2 py-1 text-slate-500">{p.desc}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
      <ToolNotes notes={ctfNotes(
        'Referensi port TCP/UDP umum untuk analisis jaringan & CTF.',
        'Cari port atau nama layanan.'
      )} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// ASCII table
// ---------------------------------------------------------------------------

const ASCII_NAMES: Record<number, string> = {
  0: 'NUL', 1: 'SOH', 2: 'STX', 3: 'ETX', 4: 'EOT', 5: 'ENQ', 6: 'ACK', 7: 'BEL',
  8: 'BS', 9: 'TAB', 10: 'LF', 11: 'VT', 12: 'FF', 13: 'CR', 14: 'SO', 15: 'SI',
  16: 'DLE', 17: 'DC1', 18: 'DC2', 19: 'DC3', 20: 'DC4', 21: 'NAK', 22: 'SYN', 23: 'ETB',
  24: 'CAN', 25: 'EM', 26: 'SUB', 27: 'ESC', 28: 'FS', 29: 'GS', 30: 'RS', 31: 'US',
  127: 'DEL',
};

function AsciiTableTool() {
  const rows = Array.from({ length: 128 }, (_, i) => ({
    dec: i,
    hex: i.toString(16).padStart(2, '0').toUpperCase(),
    bin: i.toString(2).padStart(8, '0'),
    char: i >= 32 && i < 127 ? String.fromCharCode(i) : (ASCII_NAMES[i] ?? ''),
    printable: i >= 32 && i < 127,
  }));
  return (
    <div className="space-y-4">
      <Panel title="ASCII 0–127" action={<CopyButton text={rows.map((r) => `${r.dec}\t${r.hex}\t${r.bin}\t${r.char}`).join('\n')} />}>
        <div className="max-h-[32rem] overflow-auto">
          <table className="w-full border-collapse text-xs">
            <thead className="sticky top-0 bg-slate-900">
              <tr className="text-left text-slate-500">
                <th className="px-2 py-1.5">Dec</th>
                <th className="px-2 py-1.5">Hex</th>
                <th className="px-2 py-1.5">Bin</th>
                <th className="px-2 py-1.5">Char</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.dec} className="border-t border-slate-800/50">
                  <td className="px-2 py-0.5 font-mono text-slate-400">{r.dec}</td>
                  <td className="px-2 py-0.5 font-mono text-slate-500">{r.hex}</td>
                  <td className="px-2 py-0.5 font-mono text-slate-500">{r.bin}</td>
                  <td className="px-2 py-0.5 font-mono text-slate-200">
                    {r.printable ? (
                      <span className="text-base">{r.char}</span>
                    ) : (
                      <span className="text-slate-600">{r.char || '·'}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
      <ToolNotes notes={ctfNotes(
        'Tabel ASCII lengkap 0–127: dec, hex, biner, karakter.',
        'Gunakan untuk decode deret angka/hex ASCII.'
      )} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Unicode table
// ---------------------------------------------------------------------------

function UnicodeTableTool() {
  const [input, setInput] = useState('U+1F600');
  const [result, setResult] = useState<{ cp: number; char: string; hex: string; category: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const run = () => {
    setError(null);
    try {
      const clean = input.trim();
      let cp: number;
      if (/^U\+[0-9a-fA-F]+$/i.test(clean)) cp = parseInt(clean.slice(2), 16);
      else if (/^0x/i.test(clean)) cp = parseInt(clean, 16);
      else if (/^\d+$/.test(clean)) cp = Number(clean);
      else if (clean.length > 0) cp = clean.codePointAt(0)!;
      else throw new Error('Input kosong.');
      if (cp > 0x10ffff) throw new Error('Codepoint di luar range Unicode (max U+10FFFF).');
      const char = cp >= 32 && cp !== 127 ? String.fromCodePoint(cp) : '(control)';
      const analyzed = analyzeUnicode(String.fromCodePoint(cp));
      setResult({ cp, char, hex: cp.toString(16).toUpperCase().padStart(4, '0'), category: analyzed[0]?.category ?? 'Other' });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Input tidak valid.');
      setResult(null);
    }
  };

  return (
    <div className="space-y-4">
      <Button onClick={run}>Info codepoint</Button>
      <Panel title="Input">
        <LabeledTextarea id="uni-table-input" label="Codepoint (U+XXXX, 0x, desimal) atau karakter" value={input} onChange={setInput} rows={2} placeholder="U+1F600" />
      </Panel>
      <ErrorAlert message={error} />
      {result && (
        <Panel title="Codepoint info">
          <KeyValueTable rows={[
            { k: 'Codepoint', v: `U+${result.hex}` },
            { k: 'Decimal', v: String(result.cp) },
            { k: 'Karakter', v: result.char === '(control)' ? result.char : `${result.char} (${result.char.codePointAt(0)!.toString(16).toUpperCase()})` },
            { k: 'Kategori', v: result.category },
          ]} />
        </Panel>
      )}
      <ToolNotes notes={ctfNotes(
        'Eksplorasi Unicode: info codepoint, kategori dasar.',
        'Masukkan codepoint atau karakter, klik Info codepoint.'
      )} />
    </div>
  );
}

export const tools: Record<string, ComponentType> = {
  'ctf-caesar': CtfCaesarTool,
  'ctf-rot': CtfRotTool,
  'ctf-xor': CtfXorTool,
  'base64-detector': Base64DetectorTool,
  'encoding-detector': EncodingDetectorTool,
  frequency: FrequencyTool,
  substitution: SubstitutionTool,
  vigenere: () => <TransformTool {...vigenereTool} />,
  'rail-fence': () => <TransformTool {...railFenceTool} />,
  atbash: () => <TransformTool {...atbashTool} />,
  morse: () => <TransformTool {...morseTool} />,
  bacon: () => <TransformTool {...baconTool} />,
  'unicode-analyzer': UnicodeAnalyzerTool,
  'timestamp-converter': TimestampConverterTool,
  'ip-converter': IpConverterTool,
  subnet: SubnetTool,
  cidr: CidrTool,
  'port-reference': PortReferenceTool,
  'ascii-table': AsciiTableTool,
  'unicode-table': UnicodeTableTool,
};

export default function CtfModule() {
  return null;
}
