/**
 * URL intelligence — parse, decode bertingkat, dan deteksi pola mencurigakan.
 * Semua lokal; URL tidak pernah dibuka otomatis.
 */

export interface UrlComponent {
  name: string;
  value: string;
}

export interface UrlIntel {
  input: string;
  valid: boolean;
  error?: string;
  components: UrlComponent[];
  decodedLayers: string[];
  params: { name: string; value: string; decoded: string; duplicated: boolean }[];
  issues: string[];
  normalized: string;
}

const SHORTENERS = [
  'bit.ly', 'tinyurl.com', 'goo.gl', 't.co', 'is.gd', 'buff.ly', 'ow.ly', 'rebrand.ly',
  'shorturl.at', 'cutt.ly', 'rb.gy', 's.id', 'tiny.cc', 'lnkd.in', 'short.io', 'u.nu',
  'v.gd', 'soo.gd', 'qr.ae', 'tny.im', 'shortest.link', 'spoo.me', 'kutt.it', '0x0.st',
  'zws.im', 'surl.li', 'ezurl.cc', 'gotiny.cc', '1t.gg', 'h-t.co',
];

const SUSPICIOUS_TLDS = [
  'xyz', 'top', 'club', 'online', 'site', 'live', 'work', 'loan', 'download', 'gq', 'tk', 'ml', 'ga', 'cf',
  'zip', 'mov', 'icu', 'rest', 'cyou', 'bond', 'monster', 'vip', 'sbs', 'cam',
];

export function analyzeUrlIntel(input: string): UrlIntel {
  const raw = input.trim();
  const issues: string[] = [];
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    return { input: raw, valid: false, error: 'URL tidak valid — pastikan menyertakan scheme (mis. https://example.com).', components: [], decodedLayers: [], params: [], issues: [], normalized: raw };
  }

  const components: UrlComponent[] = [
    { name: 'Protocol', value: parsed.protocol.replace(':', '') },
    { name: 'Username', value: parsed.username || '(tidak ada)' },
    { name: 'Password', value: parsed.password ? '(tersembunyi)' : '(tidak ada)' },
    { name: 'Hostname', value: parsed.hostname },
    { name: 'Port', value: parsed.port || '(default)' },
    { name: 'Pathname', value: parsed.pathname || '/' },
    { name: 'Query', value: parsed.search || '(tidak ada)' },
    { name: 'Fragment', value: parsed.hash || '(tidak ada)' },
  ];

  // Decode bertingkat (maks 6 lapis)
  const decodedLayers: string[] = [raw];
  let current = raw;
  for (let i = 0; i < 6; i++) {
    let next = current;
    try {
      next = decodeURIComponent(current);
    } catch {
      break;
    }
    if (next === current) break;
    decodedLayers.push(next);
    current = next;
  }

  // Params
  const params: UrlIntel['params'] = [];
  if (parsed.search) {
    const seen = new Map<string, number>();
    for (const part of parsed.search.slice(1).split('&').filter(Boolean)) {
      const eq = part.indexOf('=');
      const name = eq === -1 ? part : part.slice(0, eq);
      const value = eq === -1 ? '' : part.slice(eq + 1);
      const count = seen.get(name) ?? 0;
      seen.set(name, count + 1);
      let decoded = value;
      try {
        decoded = decodeURIComponent(value.replace(/\+/g, ' '));
      } catch {
        /* biarkan raw */
      }
      params.push({ name, value, decoded, duplicated: count > 0 });
    }
  }

  // Normalized
  const u2 = new URL(raw);
  u2.hostname = u2.hostname.toLowerCase();
  u2.protocol = u2.protocol.toLowerCase();
  if ((u2.protocol === 'http:' && u2.port === '80') || (u2.protocol === 'https:' && u2.port === '443')) u2.port = '';
  const normalized = u2.href;

  // Deteksi
  const host = parsed.hostname;
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) issues.push('Host berupa IP literal — tidak bisa diverifikasi sertifikat/domain; umum pada phishing.');
  if (host.includes(':')) issues.push('Host berupa IPv6 literal.');
  if (/^xn--/.test(host) || /[^\x00-\x7F]/.test(host)) issues.push('Punycode/IDN terdeteksi — periksa visual huruf dengan hati-hati (homograph attack).');
  const subdomainCount = host.split('.').length - 2;
  if (subdomainCount > 2) issues.push(`Subdomain berlebihan (${subdomainCount} level) — pola umum phishing.`);
  const tld = host.split('.').pop() ?? '';
  if (SUSPICIOUS_TLDS.includes(tld.toLowerCase())) issues.push(`TLD ${tld} sering dipakai domain murah/abusive.`);
  if (SHORTENERS.some((s) => host === s || host.endsWith('.' + s))) issues.push('URL shortener terdeteksi — tujuan disembunyikan.');
  if (parsed.protocol === 'javascript:') issues.push('Scheme javascript: — eksekusi kode; JANGAN dibuka.');
  if (parsed.protocol === 'data:') issues.push('Scheme data: — konten inline; bisa menyamar.');
  if (parsed.protocol === 'file:') issues.push('Scheme file: — akses lokal; tidak boleh dari web.');
  if (parsed.username || parsed.password) issues.push('Userinfo dalam URL (user:pass@) — bocor ke log dan sering dipakai spoofing host.');
  if (/\\/.test(raw)) issues.push('Backslash terdeteksi — beberapa parser memperlakukannya sebagai separator host.');
  if (/%25/i.test(raw)) issues.push('Double-encoding (%25) terdeteksi — upaya bypass filter/decoder.');
  if (/%[0-9a-f]{2}/i.test(raw)) issues.push('Karakter percent-encoded — cek lapisan decode di bawah.');
  const redirectParams = ['redirect', 'next', 'url', 'return', 'goto', 'target', 'r', 'u'];
  for (const p of params) {
    if (redirectParams.includes(p.name.toLowerCase()) && /^(https?:)?\/\//.test(p.decoded)) {
      issues.push(`Parameter "${p.name}" berisi URL eksternal — potensi open redirect; verifikasi whitelist.`);
    }
    if (/['"<>]/ .test(p.decoded)) issues.push(`Parameter "${p.name}" mengandung karakter injeksi (' " < >).`);
  }

  return { input: raw, valid: true, components, decodedLayers, params, issues, normalized };
}

export function urlEncodeAll(s: string): string {
  return encodeURIComponent(s).replace(/[!'()*]/g, (c) => '%' + c.charCodeAt(0).toString(16).toUpperCase());
}
