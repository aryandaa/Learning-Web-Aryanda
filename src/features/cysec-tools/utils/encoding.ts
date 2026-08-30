/**
 * Transformasi encoding/cipher klasik (URL, HTML, ROT, Caesar, Atbash, Morse,
 * Bacon, Rail Fence, Vigenère, substitution) + konversi integer.
 * Semua murni client-side.
 */

// ---------------- URL ----------------

const URL_SAFE = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_.~";

export function urlEncode(s: string, mode: 'url' | 'component' = 'component'): string {
  let out = '';
  for (const ch of s) {
    const code = ch.codePointAt(0)!;
    if (mode === 'component' && (URL_SAFE.includes(ch) || code > 127)) {
      out += ch;
      continue;
    }
    if (mode === 'url' && URL_SAFE.includes(ch)) {
      out += ch;
      continue;
    }
    const bytes = new TextEncoder().encode(ch);
    for (const b of bytes) out += '%' + b.toString(16).toUpperCase().padStart(2, '0');
  }
  return out;
}

export function urlDecode(s: string): string {
  try {
    return decodeURIComponent(s.replace(/\+/g, '%20'));
  } catch {
    throw new Error('Input URL-encoded tidak valid.');
  }
}

// ---------------- HTML ----------------

const HTML_ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: '\u00a0',
  copy: '\u00a9',
  reg: '\u00ae',
  trade: '\u2122',
  hellip: '\u2026',
  mdash: '\u2014',
  ndash: '\u2013',
  lsquo: '\u2018',
  rsquo: '\u2019',
  ldquo: '\u201c',
  rdquo: '\u201d',
  bull: '\u2022',
  euro: '\u20ac',
  pound: '\u00a3',
  yen: '\u00a5',
  cent: '\u00a2',
  sect: '\u00a7',
  para: '\u00b6',
  deg: '\u00b0',
  plusmn: '\u00b1',
  times: '\u00d7',
  divide: '\u00f7',
  frac12: '\u00bd',
  frac14: '\u00bc',
  frac34: '\u00be',
  dagger: '\u2020',
  Dagger: '\u2021',
  permil: '\u2030',
  laquo: '\u00ab',
  raquo: '\u00bb',
  larr: '\u2190',
  uarr: '\u2191',
  rarr: '\u2192',
  darr: '\u2193',
  harr: '\u2194',
  spades: '\u2660',
  clubs: '\u2663',
  hearts: '\u2665',
  diams: '\u2666',
};

export function htmlEncode(s: string): string {
  let out = '';
  for (const ch of s) {
    const code = ch.codePointAt(0)!;
    switch (ch) {
      case '&':
        out += '&amp;';
        break;
      case '<':
        out += '&lt;';
        break;
      case '>':
        out += '&gt;';
        break;
      case '"':
        out += '&quot;';
        break;
      case "'":
        out += '&#39;';
        break;
      default:
        if (code > 127) out += `&#${code};`;
        else out += ch;
    }
  }
  return out;
}

/** Decode entity HTML aman via textarea (tidak mengeksekusi tag). */
export function htmlDecode(s: string): string {
  if (!/[&]/.test(s)) return s;
  const el = document.createElement('textarea');
  el.innerHTML = s;
  const decoded = el.value;
  // Fallback untuk entity bernama yang tidak dikenal browser (decode manual).
  return decoded.replace(
    /&([a-zA-Z][a-zA-Z0-9]+);/g,
    (m, name: string) => HTML_ENTITIES[name.toLowerCase()] ?? m
  );
}

// ---------------- ROT / Caesar / Atbash ----------------

export function rot(s: string, shift: number): string {
  const sh = ((shift % 26) + 26) % 26;
  let out = '';
  for (const ch of s) {
    const c = ch.charCodeAt(0);
    if (c >= 65 && c <= 90) out += String.fromCharCode(((c - 65 + sh) % 26) + 65);
    else if (c >= 97 && c <= 122) out += String.fromCharCode(((c - 97 + sh) % 26) + 97);
    else out += ch;
  }
  return out;
}

export function rot13(s: string): string {
  return rot(s, 13);
}

export function rot47(s: string): string {
  let out = '';
  for (const ch of s) {
    const c = ch.charCodeAt(0);
    if (c >= 33 && c <= 126) out += String.fromCharCode(33 + ((c - 33 + 47) % 94));
    else out += ch;
  }
  return out;
}

export function caesar(s: string, shift: number): string {
  return rot(s, shift);
}

export function atbash(s: string): string {
  let out = '';
  for (const ch of s) {
    const c = ch.charCodeAt(0);
    if (c >= 65 && c <= 90) out += String.fromCharCode(90 - (c - 65));
    else if (c >= 97 && c <= 122) out += String.fromCharCode(122 - (c - 97));
    else out += ch;
  }
  return out;
}

// ---------------- Morse ----------------

const MORSE: Record<string, string> = {
  A: '.-', B: '-...', C: '-.-.', D: '-..', E: '.', F: '..-.', G: '--.', H: '....',
  I: '..', J: '.---', K: '-.-', L: '.-..', M: '--', N: '-.', O: '---', P: '.--.',
  Q: '--.-', R: '.-.', S: '...', T: '-', U: '..-', V: '...-', W: '.--', X: '-..-',
  Y: '-.--', Z: '--..',
  '0': '-----', '1': '.----', '2': '..---', '3': '...--', '4': '....-',
  '5': '.....', '6': '-....', '7': '--...', '8': '---..', '9': '----.',
  '.': '.-.-.-', ',': '--..--', '?': '..--..', "'": '.----.', '!': '-.-.--',
  '/': '-..-.', '(': '-.--.', ')': '-.--.-', '&': '.-...', ':': '---...',
  ';': '-.-.-.', '=': '-...-', '+': '.-.-.', '-': '-....-', _: '..--.-',
  '"': '.-..-.', $: '...-..-', '@': '.--.-.',
};

const MORSE_REV = Object.fromEntries(Object.entries(MORSE).map(([k, v]) => [v, k]));

export function morseEncode(s: string): string {
  return s
    .toUpperCase()
    .trim()
    .split(/\s+/)
    .map((word) =>
      Array.from(word)
        .map((ch) => {
          const m = MORSE[ch];
          if (!m) throw new Error(`Karakter tidak didukung Morse: ${ch}`);
          return m;
        })
        .join(' ')
    )
    .join(' / ');
}

export function morseDecode(s: string): string {
  return s
    .trim()
    .split(/\s*\/\s*|\s+\/\s+/)
    .map((word) =>
      word
        .trim()
        .split(/\s+/)
        .map((code) => {
          if (!code) return '';
          const ch = MORSE_REV[code];
          if (!ch) throw new Error(`Kode Morse tidak dikenal: ${code}`);
          return ch;
        })
        .join('')
    )
    .join(' ');
}

// ---------------- Bacon ----------------

const BACON_ALPHA = 'ABCDEFGHIKLMNOPQRSTUWXYZ'; // 24 huruf (I/J, U/V digabung)

export function baconEncode(s: string): string {
  let out = '';
  for (const ch of s.toUpperCase()) {
    const idx = BACON_ALPHA.indexOf(ch);
    if (idx === -1) throw new Error(`Karakter tidak didukung Bacon: ${ch}`);
    out += idx.toString(2).padStart(5, '0').replace(/0/g, 'A').replace(/1/g, 'B') + ' ';
  }
  return out.trim();
}

export function baconDecode(s: string): string {
  const clean = s.replace(/\s+/g, '').toUpperCase();
  if (!/^[AB]+$/.test(clean)) throw new Error('Input Bacon harus terdiri dari A/B.');
  if (clean.length % 5 !== 0) throw new Error('Panjang input harus kelipatan 5.');
  let out = '';
  for (let i = 0; i < clean.length; i += 5) {
    const bits = clean.slice(i, i + 5).replace(/A/g, '0').replace(/B/g, '1');
    const idx = parseInt(bits, 2);
    if (idx > 23) throw new Error('Nilai biner melebihi alfabet Bacon 24 huruf.');
    out += BACON_ALPHA[idx];
  }
  return out;
}

// ---------------- Rail Fence ----------------

export function railFenceEncode(s: string, rails: number): string {
  if (rails < 2) return s;
  const fence: string[][] = Array.from({ length: rails }, () => []);
  let row = 0;
  let dir = 1;
  for (const ch of s) {
    fence[row].push(ch);
    if (row === rails - 1) dir = -1;
    else if (row === 0) dir = 1;
    row += dir;
  }
  return fence.flat().join('');
}

export function railFenceDecode(s: string, rails: number): string {
  if (rails < 2) return s;
  const pattern: number[] = [];
  let row = 0;
  let dir = 1;
  for (let i = 0; i < s.length; i++) {
    pattern.push(row);
    if (row === rails - 1) dir = -1;
    else if (row === 0) dir = 1;
    row += dir;
  }
  const lengths = new Array(rails).fill(0);
  for (const r of pattern) lengths[r]++;
  const rows: string[][] = [];
  let pos = 0;
  for (let r = 0; r < rails; r++) {
    rows.push(Array.from(s.slice(pos, pos + lengths[r])));
    pos += lengths[r];
  }
  const cursors = new Array(rails).fill(0);
  let out = '';
  for (const r of pattern) out += rows[r][cursors[r]++];
  return out;
}

// ---------------- Vigenère ----------------

export function vigenere(s: string, key: string, decrypt: boolean): string {
  if (!key) throw new Error('Key tidak boleh kosong.');
  const keyUpper = key.toUpperCase();
  if (!/^[A-Z]+$/.test(keyUpper)) throw new Error('Key hanya boleh huruf A–Z.');
  let ki = 0;
  let out = '';
  for (const ch of s) {
    const c = ch.charCodeAt(0);
    const shift = keyUpper.charCodeAt(ki % keyUpper.length) - 65;
    if (c >= 65 && c <= 90) {
      out += String.fromCharCode(((c - 65 + (decrypt ? 26 - shift : shift)) % 26) + 65);
      ki++;
    } else if (c >= 97 && c <= 122) {
      out += String.fromCharCode(((c - 97 + (decrypt ? 26 - shift : shift)) % 26) + 97);
      ki++;
    } else {
      out += ch;
    }
  }
  return out;
}

// ---------------- Substitution ----------------

export function substitutionApply(s: string, mapping: string): string {
  // mapping: "A=X,B=Y,..." atau 26 huruf (posisi = plain, nilai = cipher)
  const map: Record<string, string> = {};
  if (/^[A-Za-z]{26}$/.test(mapping.trim())) {
    const m = mapping.trim().toUpperCase();
    for (let i = 0; i < 26; i++) map[String.fromCharCode(65 + i)] = m[i];
  } else {
    for (const pair of mapping.split(/[,;\s]+/)) {
      const m = /^([A-Za-z])\s*[=:>-]?\s*([A-Za-z])$/.exec(pair.trim());
      if (!m) throw new Error(`Mapping tidak valid: "${pair}" (gunakan A=X,B=Y atau 26 huruf).`);
      map[m[1].toUpperCase()] = m[2].toUpperCase();
    }
  }
  return Array.from(s, (ch) => {
    const c = ch.toUpperCase();
    if (map[c]) return ch === c ? map[c] : map[c].toLowerCase();
    return ch;
  }).join('');
}

/** Skor kemiripan dengan huruf bahasa Inggris (frekuensi relatif). */
const ENGLISH_FREQ: Record<string, number> = {
  A: 8.17, B: 1.49, C: 2.78, D: 4.25, E: 12.7, F: 2.23, G: 2.02, H: 6.09,
  I: 6.97, J: 0.15, K: 0.77, L: 4.03, M: 2.41, N: 6.75, O: 7.51, P: 1.93,
  Q: 0.1, R: 5.99, S: 6.33, T: 9.06, U: 2.76, V: 0.98, W: 2.36, X: 0.15,
  Y: 1.97, Z: 0.07,
};

export function englishScore(s: string): number {
  let letters = 0;
  let score = 0;
  for (const ch of s.toUpperCase()) {
    if (ch >= 'A' && ch <= 'Z') {
      letters++;
      score += ENGLISH_FREQ[ch] ?? 0;
    }
  }
  if (letters === 0) return 0;
  return score / letters; // rata-rata bobot frekuensi (max ~12.7)
}


/** Frekuensi karakter (hanya letters) → array [char, count] diurutkan. */
export function letterFrequency(s: string): { char: string; count: number; pct: number }[] {
  const counts = new Map<string, number>();
  let total = 0;
  for (const ch of s.toUpperCase()) {
    if (ch >= 'A' && ch <= 'Z') {
      counts.set(ch, (counts.get(ch) ?? 0) + 1);
      total++;
    }
  }
  return Array.from(counts.entries())
    .map(([char, count]) => ({ char, count, pct: total ? (count / total) * 100 : 0 }))
    .sort((a, b) => b.count - a.count);
}
