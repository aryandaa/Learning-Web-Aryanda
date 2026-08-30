/**
 * IOC extraction. regex untuk IP, domain, URL, email, hash, CVE, ATT&CK,
 * file path. Dedup + konteks. Semua lokal.
 */

export type IocType =
  | 'ipv4' | 'ipv6' | 'domain' | 'url' | 'email' | 'hash-md5' | 'hash-sha1'
  | 'hash-sha256' | 'hash-sha512' | 'cve' | 'attack' | 'filepath' | 'mac';

export interface IocHit {
  type: IocType;
  value: string;
  count: number;
  context: string;
  /** Posisi sumber (baris/kolom, 1-based). */
  line?: number;
  col?: number;
  /** Keyakinan deteksi: high/medium/low. */
  confidence?: 'high' | 'medium' | 'low';
}

const RE_IPV4 = /\b(?:(?:25[0-5]|2[0-4]\d|1?\d?\d)\.){3}(?:25[0-5]|2[0-4]\d|1?\d?\d)\b/g;
const RE_URL = /\bhttps?:\/\/[^\s<>"']+/gi;
const RE_EMAIL = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g;
const RE_CVE = /\bCVE-\d{4}-\d{4,7}\b/gi;
const RE_ATTACK = /\b(?:TA\d{4}|T\d{4}(?:\.\d{3})?)\b/g;
const RE_WINPATH = /\b[A-Za-z]:\\[^\s"';<>]+/g;
const RE_UNIXPATH = /\b(?:\/|\.\.\/)[^\s"'<>]{1,200}/g;
const RE_MAC = /\b(?:[0-9A-Fa-f]{2}[:-]){5}[0-9A-Fa-f]{2}\b/g;
const RE_HASH_MD5 = /\b[a-fA-F0-9]{32}\b/g;
const RE_HASH_SHA1 = /\b[a-fA-F0-9]{40}\b/g;
const RE_HASH_SHA256 = /\b[a-fA-F0-9]{64}\b/g;
const RE_HASH_SHA512 = /\b[a-fA-F0-9]{128}\b/g;

// Domain: label.label.tld. bukan IP, bukan hostname punycode bermasalah.
const RE_DOMAIN = /\b(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}\b/g;

// IPv6 (longgar namun aman. hindari false positive berlebihan)
const RE_IPV6 = /\b(?:[0-9a-fA-F]{1,4}:){2,7}[0-9a-fA-F]{0,4}(?::[0-9a-fA-F]{1,4})?\b/g;

function cleanContext(line: string, value: string, radius = 40): string {
  const idx = line.indexOf(value);
  if (idx === -1) return line.trim().slice(0, 120);
  const start = Math.max(0, idx - radius);
  const end = Math.min(line.length, idx + value.length + radius);
  return (start > 0 ? '…' : '') + line.slice(start, end).trim() + (end < line.length ? '…' : '');
}

/** Ekstrak & dedup IOC. `lineSource=true` menganggap tiap baris terpisah (konteks). */
export function extractIocs(text: string): IocHit[] {
  const full = text;
  const counts = new Map<string, IocHit>();

  const confidenceFor: Record<IocType, 'high' | 'medium' | 'low'> = {
    ipv4: 'high', ipv6: 'high', domain: 'high', url: 'high', email: 'high',
    'hash-md5': 'medium', 'hash-sha1': 'medium', 'hash-sha256': 'high',
    'hash-sha512': 'high', cve: 'high', attack: 'high', filepath: 'medium', mac: 'high',
  };
  const posOf = (index: number): { line: number; col: number } => {
    const before = full.slice(0, index);
    const nl = before.lastIndexOf('\n');
    return { line: (before.match(/\n/g) ?? []).length + 1, col: index - nl };
  };
  const add = (type: IocType, value: string, ctx: string, index?: number) => {
    const key = `${type}:${value.toLowerCase()}`;
    const existing = counts.get(key);
    if (existing) {
      existing.count++;
      return;
    }
    counts.set(key, {
      type, value, count: 1, context: ctx,
      confidence: confidenceFor[type],
      ...(index !== undefined ? posOf(index) : {}),
    });
  };

  const collect = (re: RegExp, type: IocType) => {
    let m: RegExpExecArray | null;
    while ((m = re.exec(full)) !== null) {
      const v = m[0];
      // hindari domain yang merupakan bagian dari URL/email (sudah diekstrak terpisah)
      if (type === 'domain' && /^https?:\/\//i.test(full.slice(Math.max(0, m.index - 6), m.index))) {
        continue;
      }
      // IPv6 yang juga MAC (6 pasang 2-hex dipisah ':') sudah dicover type mac.
      if (type === 'ipv6' && /^[0-9a-fA-F]{2}(:[0-9a-fA-F]{2}){5}$/.test(v)) {
        continue;
      }
      add(type, v, cleanContext(full, v), m.index);
      if (m[0] === '') re.lastIndex++;
    }
  };

  collect(RE_MAC, 'mac');
  collect(RE_URL, 'url');
  collect(RE_EMAIL, 'email');
  collect(RE_IPV4, 'ipv4');
  collect(RE_IPV6, 'ipv6');
  collect(RE_HASH_SHA512, 'hash-sha512');
  collect(RE_HASH_SHA256, 'hash-sha256');
  collect(RE_HASH_SHA1, 'hash-sha1');
  collect(RE_HASH_MD5, 'hash-md5');
  collect(RE_CVE, 'cve');
  collect(RE_ATTACK, 'attack');
  collect(RE_WINPATH, 'filepath');
  collect(RE_UNIXPATH, 'filepath');
  collect(RE_DOMAIN, 'domain');

  // Filter: hash yang juga cocok domain? 32-hex tidak valid domain (digit-only TLD dicek regex domain? no. [a-zA-Z]{2} TLD, hex bisa huruf).
  const result = Array.from(counts.values()).sort((a, b) => b.count - a.count);

  // Bersihkan: hapus nilai yang jelas-jelas bagian dari yang lain (url berisi domain)
  const urlValues = new Set(result.filter((r) => r.type === 'url').map((r) => r.value.toLowerCase()));
  return result.filter((r) => {
    if (r.type === 'domain') {
      return !urlValues.has(`https://${r.value.toLowerCase()}`) && !urlValues.has(`http://${r.value.toLowerCase()}`);
    }
    return true;
  });
}

export function iocTypeLabel(t: IocType): string {
  const map: Record<IocType, string> = {
    ipv4: 'IPv4', ipv6: 'IPv6', domain: 'Domain', url: 'URL', email: 'Email',
    'hash-md5': 'Hash MD5', 'hash-sha1': 'Hash SHA-1', 'hash-sha256': 'Hash SHA-256',
    'hash-sha512': 'Hash SHA-512', cve: 'CVE', attack: 'MITRE ATT&CK', filepath: 'File path', mac: 'MAC address',
  };
  return map[t];
}

