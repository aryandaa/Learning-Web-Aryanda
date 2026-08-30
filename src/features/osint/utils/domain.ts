/**
 * Domain intelligence. parsing/normalisasi murni client-side.
 * Registrable domain memakai daftar suffix multi-bagian umum (best-effort,
 * bukan full PSL. untuk edukasi).
 */

const MULTI_PART_SUFFIXES = new Set([
  'co.uk', 'org.uk', 'ac.uk', 'gov.uk', 'me.uk', 'net.uk', 'ltd.uk', 'plc.uk', 'sch.uk',
  'com.au', 'net.au', 'org.au', 'edu.au', 'gov.au', 'asn.au', 'id.au',
  'co.nz', 'net.nz', 'org.nz', 'ac.nz', 'govt.nz', 'geek.nz',
  'co.jp', 'ne.jp', 'or.jp', 'ac.jp', 'go.jp', 'gr.jp',
  'co.in', 'net.in', 'org.in', 'ac.in', 'gen.in', 'firm.in', 'ind.in',
  'com.br', 'net.br', 'org.br', 'gov.br', 'edu.br',
  'com.mx', 'com.tr', 'com.cn', 'net.cn', 'org.cn', 'gov.cn', 'edu.cn',
  'com.tw', 'com.hk', 'com.sg', 'com.my', 'com.ph', 'com.vn', 'com.th', 'co.th', 'ac.th',
  'co.za', 'org.za', 'net.za', 'gov.za', 'ac.za',
  'com.ar', 'com.co', 'com.pe', 'com.eg', 'com.sa', 'com.ng', 'com.pk', 'com.bd',
  'com.ua', 'com.kr', 'co.kr', 'com.id', 'co.id', 'or.id', 'web.id', 'ac.id', 'sch.id', 'go.id',
  'com.pl', 'net.pl', 'org.pl', 'com.ru', 'co.il', 'org.il', 'com.ae', 'co.ae',
  'com.hk', 'com.pt', 'com.gr', 'com.ro', 'com.ve', 'com.ec', 'com.uy', 'com.bo', 'com.py',
  'co.at', 'or.at', 'com.de', 'co.nl', 'com.be', 'com.es', 'com.fr', 'com.it', 'co.it',
  'com.se', 'com.no', 'com.fi', 'com.dk', 'co.ch', 'com.cz', 'com.sk', 'com.hu', 'com.hr',
  'com.bg', 'com.rs', 'com.si', 'com.ee', 'com.lt', 'com.lv', 'com.ua', 'com.ge', 'com.am',
]);

export interface DomainAnalysis {
  input: string;
  normalized: string;
  hostname: string;
  isIdn: boolean;
  unicodeForm: string;
  isPunycode: boolean;
  labels: string[];
  tld: string;
  registrableDomain: string;
  subdomain: string | null;
  suspiciousChars: string[];
  protocol: string | null;
  valid: boolean;
  error?: string;
}

const SUSPICIOUS_CHARS = /[\u2024\u2025\u2026\u2027\u2219\u2E31\uFF0E\u3002\u2088\u2080]/; // dot-lookalikes

export function analyzeDomain(input: string): DomainAnalysis {
  const raw = input.trim();
  const protocolMatch = /^(https?:\/\/)/i.exec(raw);
  const protocol = protocolMatch ? protocolMatch[1].toLowerCase().replace('://', '') : null;
  let hostPart = raw;
  if (protocolMatch) hostPart = raw.slice(protocolMatch[0].length);
  hostPart = hostPart.split(/[/?#]/)[0];
  hostPart = hostPart.replace(/^\[|\]$/g, ''); // hapus bracket IPv6 (www tetap subdomain)
  const isIp = /^\d{1,3}(\.\d{1,3}){3}$/.test(hostPart) || hostPart.includes(':');
  if (isIp) {
    return { input: raw, normalized: hostPart, hostname: hostPart, isIdn: false, unicodeForm: hostPart, isPunycode: false, labels: hostPart.split('.'), tld: '', registrableDomain: hostPart, subdomain: null, suspiciousChars: [], protocol, valid: false, error: 'Input berupa alamat IP, bukan domain. Gunakan IP Analyzer.' };
  }

  const isIdn = /[^\x00-\x7F]/.test(hostPart);
  let hostname: string;
  try {
    hostname = new URL(`http://${hostPart}`).hostname;
  } catch {
    return { input: raw, normalized: hostPart.toLowerCase(), hostname: hostPart.toLowerCase(), isIdn, unicodeForm: hostPart, isPunycode: false, labels: hostPart.toLowerCase().split('.'), tld: '', registrableDomain: '', subdomain: null, suspiciousChars: [], protocol, valid: false, error: 'Domain tidak valid.' };
  }
  if (!hostname.includes('.')) {
    return { input: raw, normalized: hostname, hostname, isIdn, unicodeForm: hostPart, isPunycode: false, labels: [hostname], tld: '', registrableDomain: '', subdomain: null, suspiciousChars: [], protocol, valid: false, error: 'Bukan FQDN. tidak ada titik (mis. "localhost").' };
  }
  const normalized = hostname.replace(/\.$/, '');
  const labels = normalized.split('.');
  const tld = labels[labels.length - 1];
  const isPunycode = /^xn--/.test(labels[labels.length - 1]) || labels.some((l) => /^xn--/.test(l));

  const suffix = labels.slice(-2).join('.');
  const registrable = MULTI_PART_SUFFIXES.has(suffix) ? labels.slice(-3).join('.') : labels.slice(-2).join('.');
  const subdomain = labels.slice(0, labels.length - registrable.split('.').length).join('.') || null;

  const suspiciousChars: string[] = [];
  const found = hostPart.match(SUSPICIOUS_CHARS);
  if (found) suspiciousChars.push(...found);
  if (hostPart.includes('@')) suspiciousChars.push('@');
  if (/%[0-9a-f]{2}/i.test(hostPart)) suspiciousChars.push('percent-encoding');

  return {
    input: raw,
    normalized,
    hostname,
    isIdn,
    unicodeForm: isIdn ? hostPart : normalized,
    isPunycode,
    labels,
    tld,
    registrableDomain: registrable,
    subdomain,
    suspiciousChars,
    protocol,
    valid: true,
  };
}

/** Daftar sumber publik terkait domain. */
export function domainPublicSources(domain: string): { source: string; url: string }[] {
  const enc = encodeURIComponent(domain);
  return [
    { source: 'WHOIS (RDAP)', url: `https://rdap.org/domain/${enc}` },
    { source: 'ICANN Lookup', url: `https://lookup.icann.org/en/lookup?name=${enc}` },
    { source: 'DNS lookup', url: `https://dns.google/resolve?name=${enc}` },
    { source: 'SecurityTrails', url: `https://securitytrails.com/domain/${enc}/info` },
    { source: 'VirusTotal', url: `https://www.virustotal.com/gui/domain/${enc}` },
    { source: 'urlscan.io', url: `https://urlscan.io/domain/${enc}` },
    { source: 'crt.sh', url: `https://crt.sh/?q=${enc}` },
    { source: 'BuiltWith', url: `https://builtwith.com/${enc}` },
  ];
}
