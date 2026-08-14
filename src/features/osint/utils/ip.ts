/**
 * IP intelligence. validasi & klasifikasi IPv4/IPv6 murni client-side.
 * Lookup ASN/geo opsional via ipwho.is (CORS publik, tanpa key).
 */

export interface IpInfo {
  input: string;
  normalized: string;
  version: 4 | 6;
  valid: boolean;
  error?: string;
  classifications: { label: string; kind: 'info' | 'warn' | 'ok' }[];
  cidr?: string;
}

// ---------------------------------------------------------------------------
// IPv4
// ---------------------------------------------------------------------------

export function ipv4ToInt(ip: string): number | null {
  const parts = ip.split('.');
  if (parts.length !== 4) return null;
  let n = 0;
  for (const p of parts) {
    if (!/^\d{1,3}$/.test(p)) return null;
    const v = Number(p);
    if (v > 255) return null;
    n = (n << 8) | v;
  }
  return n >>> 0;
}

export function intToIpv4(n: number): string {
  return `${(n >>> 24) & 0xff}.${(n >>> 16) & 0xff}.${(n >>> 8) & 0xff}.${n & 0xff}`;
}

function classifyIpv4(n: number): { label: string; kind: 'info' | 'warn' | 'ok' }[] {
  const out: { label: string; kind: 'info' | 'warn' | 'ok' }[] = [];
  const inRange = (start: number, end: number) => n >= start && n <= end;
  if (inRange(0x00000000, 0x00ffffff)) out.push({ label: '"This network" (0.0.0.0/8)', kind: 'warn' });
  if (inRange(0x0a000000, 0x0affffff)) out.push({ label: 'Private (10.0.0.0/8)', kind: 'info' });
  if (inRange(0x64400000, 0x647fffff)) out.push({ label: 'CGNAT / carrier-grade NAT (100.64.0.0/10)', kind: 'info' });
  if (inRange(0x7f000000, 0x7fffffff)) out.push({ label: 'Loopback (127.0.0.0/8)', kind: 'warn' });
  if (inRange(0xa9fe0000, 0xa9feffff)) out.push({ label: 'Link-local (169.254.0.0/16)', kind: 'info' });
  if (inRange(0xac100000, 0xac1fffff)) out.push({ label: 'Private (172.16.0.0/12)', kind: 'info' });
  if (inRange(0xc0000000, 0xc00000ff)) out.push({ label: 'IETF protocol assignments (192.0.0.0/24)', kind: 'info' });
  if (inRange(0xc0000200, 0xc00002ff)) out.push({ label: 'Documentation (192.0.2.0/24)', kind: 'ok' });
  if (inRange(0xc0a80000, 0xc0a8ffff)) out.push({ label: 'Private (192.168.0.0/16)', kind: 'info' });
  if (inRange(0xc6120000, 0xc633ffff)) out.push({ label: 'Benchmarking (198.18.0.0/15)', kind: 'info' });
  if (inRange(0xc6336400, 0xc63364ff)) out.push({ label: 'Documentation (198.51.100.0/24)', kind: 'ok' });
  if (inRange(0xcb007100, 0xcb0071ff)) out.push({ label: 'Documentation (203.0.113.0/24)', kind: 'ok' });
  if (inRange(0xe0000000, 0xefffffff)) out.push({ label: 'Multicast (224.0.0.0/4)', kind: 'warn' });
  if (inRange(0xf0000000, 0xfffffffe)) out.push({ label: 'Reserved (240.0.0.0/4)', kind: 'warn' });
  if (n === 0xffffffff) out.push({ label: 'Broadcast (255.255.255.255)', kind: 'warn' });
  if (out.length === 0) out.push({ label: 'Public (global unicast)', kind: 'ok' });
  return out;
}

// ---------------------------------------------------------------------------
// IPv6 (parse heksadesimal, dukungan ::)
// ---------------------------------------------------------------------------

export function ipv6ToGroups(ip: string): number[] | null {
  const s = ip.toLowerCase();
  if (!s.includes(':')) return null;
  const doubleColon = s.split('::');
  if (doubleColon.length > 2) return null;
  let head = doubleColon[0];
  let tail = doubleColon.length === 2 ? doubleColon[1] : '';
  if (head === '' && tail === '') return null;
  // IPv4-embedded (::ffff:1.2.3.4)
  let ipv4Tail: number[] | null = null;
  const v4m = /([0-9]{1,3}(?:\.[0-9]{1,3}){3})$/.exec(tail);
  if (v4m) {
    const int = ipv4ToInt(v4m[1]);
    if (int == null) return null;
    ipv4Tail = [(int >>> 24) & 0xff, (int >>> 16) & 0xff, (int >>> 8) & 0xff, int & 0xff];
    tail = tail.slice(0, v4m.index).replace(/:$/, '');
  }
  const parse = (part: string): number[] => {
    if (!part) return [];
    return part.split(':').map((h) => {
      if (!/^[0-9a-f]{1,4}$/.test(h)) throw new Error('bad');
      return parseInt(h, 16);
    });
  };
  let headGroups: number[];
  let tailGroups: number[];
  try {
    headGroups = parse(head);
    tailGroups = parse(tail);
  } catch {
    return null;
  }
  if (ipv4Tail) tailGroups = tailGroups.concat(ipv4Tail);
  if (headGroups.length + tailGroups.length > 8) return null;
  const missing = doubleColon.length === 2 ? 8 - headGroups.length - tailGroups.length : null;
  if (doubleColon.length === 1 && headGroups.length !== 8) return null;
  const groups = [...headGroups];
  if (missing != null) for (let i = 0; i < missing; i++) groups.push(0);
  groups.push(...tailGroups);
  return groups.length === 8 ? groups : null;
}

function classifyIpv6(groups: number[]): { label: string; kind: 'info' | 'warn' | 'ok' }[] {
  const out: { label: string; kind: 'info' | 'warn' | 'ok' }[] = [];
  const allZero = groups.every((g) => g === 0);
  const is = (prefix: number[], len: number) => {
    // prefix dalam heksadesimal groups
    let bits = 0;
    let i = 0;
    for (; i < prefix.length && bits < len; i++) {
      const g = groups[i] === undefined ? 0 : groups[i];
      const shift = Math.min(16, len - bits);
      const mask = shift >= 16 ? 0xffff : (0xffff << (16 - shift)) & 0xffff;
      if ((g & mask) !== (prefix[i] & mask)) return false;
      bits += shift;
    }
    return true;
  };
  if (allZero) out.push({ label: 'Unspecified (::/128)', kind: 'warn' });
  else if (groups.slice(0, 7).every((g) => g === 0) && groups[7] === 1) {
    out.push({ label: 'Loopback (::1/128)', kind: 'warn' });
  } else if (is([0xfc00], 7)) out.push({ label: 'Unique Local Address (fc00::/7). private', kind: 'info' });
  else if (is([0xfe80], 10)) out.push({ label: 'Link-local (fe80::/10)', kind: 'info' });
  else if (is([0x2001, 0x0db8], 32)) out.push({ label: 'Documentation (2001:db8::/32)', kind: 'ok' });
  else if (is([0xff00], 8)) out.push({ label: 'Multicast (ff00::/8)', kind: 'warn' });
  else if (is([0x2001], 3)) out.push({ label: 'Global unicast (2000::/3)', kind: 'ok' });
  else out.push({ label: 'Global unicast', kind: 'ok' });
  return out;
}

// ---------------------------------------------------------------------------
// Utama
// ---------------------------------------------------------------------------

export function analyzeIp(input: string, withCidr?: string): IpInfo {
  const raw = input.trim();
  const cidrMatch = /^(.+?)\/(\d{1,3})$/.exec(raw);
  const cidr = cidrMatch ? `/${cidrMatch[2]}` : withCidr ?? undefined;
  const body = (cidrMatch ? cidrMatch[1] : raw).replace(/^\[|\]$/g, '');
  const int = ipv4ToInt(body);
  if (int != null) {
    const classifications = classifyIpv4(int);
    return { input: raw, normalized: intToIpv4(int), version: 4, valid: true, classifications, cidr };
  }
  const groups = ipv6ToGroups(body);
  if (groups) {
    const hex = groups.map((g) => g.toString(16)).join(':');
    return { input: raw, normalized: hex, version: 6, valid: true, classifications: classifyIpv6(groups), cidr };
  }
  return { input: raw, normalized: '', version: 4, valid: false, error: 'Alamat IP tidak valid. Masukkan IPv4 (a.b.c.d) atau IPv6 yang valid.', classifications: [] };
}

export interface IpWhoIsResult {
  success: boolean;
  asn?: string;
  org?: string;
  country?: string;
  countryCode?: string;
  continent?: string;
  city?: string;
  region?: string;
  timezone?: string;
  isp?: string;
  error?: string;
}

/** Lookup publik ipwho.is. CORS enabled, tanpa key. */
export async function lookupIpWhoIs(ip: string): Promise<IpWhoIsResult> {
  let res: Response;
  try {
    res = await fetch(`https://ipwho.is/${encodeURIComponent(ip)}`, { signal: AbortSignal.timeout(12000) });
  } catch (err) {
    throw new Error('Unable to reach the public IP lookup service (ipwho.is). Periksa koneksi/CORS.', { cause: err });
  }
  if (!res.ok) throw new Error(`ipwho.is merespons status ${res.status}.`);
  const json = (await res.json()) as {
    success: boolean;
    connection?: { asn?: number; org?: string; isp?: string };
    country?: string;
    country_code?: string;
    continent?: string;
    city?: string;
    region?: string;
    timezone?: { id?: string };
    message?: string;
  };
  if (!json.success) return { success: false, error: json.message ?? 'Lookup gagal.' };
  return {
    success: true,
    asn: json.connection?.asn ? `AS${json.connection.asn}` : undefined,
    org: json.connection?.org ?? json.connection?.isp,
    country: json.country,
    countryCode: json.country_code,
    continent: json.continent,
    city: json.city,
    region: json.region,
    timezone: json.timezone?.id,
    isp: json.connection?.isp,
  };
}
