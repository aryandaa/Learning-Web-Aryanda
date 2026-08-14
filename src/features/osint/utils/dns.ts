/**
 * DNS intelligence. DNS-over-HTTPS (RFC 8484 style JSON) ke resolver publik
 * yang mendukung CORS: Cloudflare & Google. Tanpa backend proxy.
 */

export type DnsRecordType = 'A' | 'AAAA' | 'CNAME' | 'MX' | 'NS' | 'TXT' | 'SOA' | 'CAA' | 'PTR';

export const DNS_TYPES: DnsRecordType[] = ['A', 'AAAA', 'CNAME', 'MX', 'NS', 'TXT', 'SOA', 'CAA', 'PTR'];

export interface DoHResolver {
  id: string;
  label: string;
  endpoint: (name: string, type: string) => string;
}

export const DOH_RESOLVERS: DoHResolver[] = [
  {
    id: 'cloudflare',
    label: 'Cloudflare (1.1.1.1)',
    endpoint: (name, type) => `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(name)}&type=${type}`,
  },
  {
    id: 'google',
    label: 'Google (8.8.8.8)',
    endpoint: (name, type) => `https://dns.google/resolve?name=${encodeURIComponent(name)}&type=${type}`,
  },
];

export interface DnsAnswer {
  name: string;
  type: number;
  ttl: number;
  data: string;
}

export interface DnsQueryResult {
  resolver: string;
  name: string;
  type: string;
  status: number;
  answers: DnsAnswer[];
  error?: string;
}

const TYPE_NAMES: Record<number, string> = {
  1: 'A', 28: 'AAAA', 5: 'CNAME', 15: 'MX', 2: 'NS', 16: 'TXT',
  6: 'SOA', 257: 'CAA', 12: 'PTR', 33: 'SRV', 65: 'HTTPS', 64: 'SVCB',
};

export async function queryDns(name: string, type: DnsRecordType, resolverId = 'cloudflare'): Promise<DnsQueryResult> {
  const resolver = DOH_RESOLVERS.find((r) => r.id === resolverId) ?? DOH_RESOLVERS[0];
  const url = resolver.endpoint(name, type);
  let res: Response;
  try {
    res = await fetch(url, { headers: { accept: 'application/dns-json' }, signal: AbortSignal.timeout(12000) });
  } catch (err) {
    throw new Error(
      `Unable to retrieve DNS information from the selected resolver (${resolver.label}). CORS/jaringan mungkin memblokir.`,
      { cause: err }
    );
  }
  if (!res.ok) {
    throw new Error(`Resolver ${resolver.label} merespons status ${res.status}.`);
  }
  const json = (await res.json()) as {
    Status: number;
    Answer?: { name: string; type: number; TTL: number; data: string }[];
    Comment?: string;
  };
  if (json.Status === 3) {
    // NXDOMAIN
    return { resolver: resolver.label, name, type, status: json.Status, answers: [] };
  }
  const answers = (json.Answer ?? []).map((a) => ({
    name: a.name.replace(/\.$/, ''),
    type: a.type,
    ttl: a.TTL,
    data: a.data.replace(/\.$/, ''),
  }));
  return { resolver: resolver.label, name, type, status: json.Status, answers };
}

export function typeName(t: number): string {
  return TYPE_NAMES[t] ?? `TYPE${t}`;
}

/** Susunan hostname dari IP (untuk PTR). */
export function reverseName(ip: string): string {
  if (ip.includes(':')) {
    // IPv6. implementasi sederhana untuk bentuk penuh
    const groups = ip.replace(/^::/, '0:').replace(/::$/, ':0').split(':');
    const out: string[] = [];
    for (const g of groups) {
      const padded = g.padStart(4, '0');
      for (let i = padded.length - 1; i >= 0; i--) out.push(padded[i]);
    }
    return out.join('.') + '.ip6.arpa';
  }
  const parts = ip.split('.');
  return parts.reverse().join('.') + '.in-addr.arpa';
}
