/**
 * Hash intelligence — deteksi tipe hash dari panjang/charset (tanpa cracking)
 * + link lookup eksternal.
 */

export interface HashDetection {
  input: string;
  normalized: string;
  length: number;
  hex: boolean;
  candidates: { algorithm: string; confidence: 'high' | 'medium' | 'low'; note?: string }[];
  lookups: { name: string; url: string }[];
}

export function detectHash(input: string): HashDetection {
  const raw = input.trim();
  const normalized = raw.toLowerCase().replace(/\s+/g, '');
  const length = normalized.length;
  const hex = /^[a-f0-9]+$/.test(normalized);
  const candidates: HashDetection['candidates'] = [];

  if (/^\$2[aby]\$/.test(raw)) candidates.push({ algorithm: 'bcrypt', confidence: 'high', note: 'Prefix $2a/$2b/$2y.' });
  else if (/^\$argon2/.test(raw)) candidates.push({ algorithm: 'Argon2', confidence: 'high', note: 'Prefix $argon2.' });
  else if (/^\$pbkdf2/.test(raw)) candidates.push({ algorithm: 'PBKDF2', confidence: 'high', note: 'Prefix $pbkdf2.' });
  else if (/^[a-f0-9]{128}$/.test(normalized)) candidates.push({ algorithm: 'SHA-512', confidence: 'high' }, { algorithm: 'SHA3-512', confidence: 'medium' });
  else if (/^[a-f0-9]{96}$/.test(normalized)) candidates.push({ algorithm: 'SHA-384', confidence: 'high' }, { algorithm: 'SHA3-384', confidence: 'medium' });
  else if (/^[a-f0-9]{64}$/.test(normalized)) candidates.push({ algorithm: 'SHA-256', confidence: 'high' }, { algorithm: 'SHA3-256', confidence: 'medium' });
  else if (/^[a-f0-9]{56}$/.test(normalized)) candidates.push({ algorithm: 'SHA-224', confidence: 'high' });
  else if (/^[a-f0-9]{40}$/.test(normalized)) candidates.push({ algorithm: 'SHA-1', confidence: 'high' });
  else if (/^[a-f0-9]{32}$/.test(normalized)) candidates.push(
    { algorithm: 'MD5', confidence: 'high' },
    { algorithm: 'NTLM', confidence: 'medium', note: 'NTLM juga 32 hex — tidak bisa dibedakan dari panjang saja.' },
    { algorithm: 'MD4', confidence: 'low' }
  );
  else if (/^[a-f0-9]{16}$/.test(normalized)) candidates.push({ algorithm: 'CRC32 / LM hash / 8-byte hash', confidence: 'low' });
  else if (!hex && length > 0) candidates.push({ algorithm: 'Non-hex digest (base64/base64url, contoh SHA-256 base64 = 44 char)', confidence: 'low' });
  else candidates.push({ algorithm: 'Tidak dikenal', confidence: 'low', note: 'Panjang/charset tidak cocok dengan digest umum.' });

  const lookups = [
    { name: 'VirusTotal', url: `https://www.virustotal.com/gui/search/${encodeURIComponent(normalized)}` },
    { name: 'MalwareBazaar', url: `https://bazaar.abuse.ch/sample/${normalized}/` },
    { name: 'Hybrid Analysis', url: `https://www.hybrid-analysis.com/search?query=${encodeURIComponent(normalized)}` },
    { name: 'URLhaus', url: `https://urlhaus.abuse.ch/host/${normalized}` },
  ];

  return { input: raw, normalized, length, hex, candidates, lookups };
}
