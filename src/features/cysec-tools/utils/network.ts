/**
 * Kalkulasi subnet IPv4 & IPv6 (murni client-side) untuk tool IP/CIDR Calculator.
 */

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

export interface Subnet4Result {
  version: 4;
  network: string;
  broadcast: string;
  mask: string;
  wildcard: string;
  first: string;
  last: string;
  total: number;
  usable: number;
  prefix: number;
  binary: string;
}

export function ipv4Subnet(ip: string, prefix: number): Subnet4Result | null {
  if (prefix < 0 || prefix > 32) return null;
  const ipInt = ipv4ToInt(ip);
  if (ipInt == null) return null;
  const mask = prefix === 0 ? 0 : (0xffffffff << (32 - prefix)) >>> 0;
  const network = (ipInt & mask) >>> 0;
  const broadcast = (network | ~mask) >>> 0;
  const total = 2 ** (32 - prefix);
  const first = prefix >= 31 ? network : (network + 1) >>> 0;
  const last = prefix >= 31 ? broadcast : (broadcast - 1) >>> 0;
  return {
    version: 4,
    network: intToIpv4(network),
    broadcast: intToIpv4(broadcast),
    mask: intToIpv4(mask),
    wildcard: intToIpv4(~mask >>> 0),
    first: intToIpv4(first),
    last: intToIpv4(last),
    total,
    usable: prefix >= 31 ? total : Math.max(0, total - 2),
    prefix,
    binary: network.toString(2).padStart(32, '0').replace(/(.{8})/g, '$1 ').trim(),
  };
}

/** Bagi network menjadi subnet lebih kecil (IPv4). prefix <= subPrefix <= 32. */
export function splitSubnet4(ip: string, prefix: number, subPrefix: number, limit = 64): string[] | null {
  const base = ipv4Subnet(ip, prefix);
  if (!base || subPrefix < prefix || subPrefix > 32) return null;
  const steps = 2 ** (subPrefix - prefix);
  if (steps > limit) return null;
  const baseInt = ipv4ToInt(base.network)!;
  const block = 2 ** (32 - subPrefix);
  const out: string[] = [];
  for (let i = 0; i < steps; i++) {
    out.push(`${intToIpv4((baseInt + i * block) >>> 0)}/${subPrefix}`);
  }
  return out;
}

// ---------------------------------------------------------------------------
// IPv6
// ---------------------------------------------------------------------------

export function ipv6Groups(ip: string): number[] | null {
  const s = ip.toLowerCase();
  if (!s.includes(':')) return null;
  const parts = s.split('::');
  if (parts.length > 2) return null;
  let head = parts[0];
  let tail = parts.length === 2 ? parts[1] : '';
  if (head === '' && tail === '') return null;
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
  if (headGroups.length + tailGroups.length > 8) return null;
  const missing = parts.length === 2 ? 8 - headGroups.length - tailGroups.length : null;
  if (parts.length === 1 && headGroups.length !== 8) return null;
  const groups = [...headGroups];
  if (missing != null) for (let i = 0; i < missing; i++) groups.push(0);
  groups.push(...tailGroups);
  return groups.length === 8 ? groups : null;
}

export function ipv6ToText(groups: number[]): string {
  return groups.map((g) => g.toString(16)).join(':');
}

/** Terapkan prefix mask pada groups (network address). */
function maskGroups(groups: number[], prefix: number): number[] {
  const out = groups.slice();
  let bits = prefix;
  for (let i = 0; i < 8 && bits > 0; i++) {
    if (bits >= 16) {
      bits -= 16;
    } else {
      out[i] = out[i] & ((0xffff << (16 - bits)) & 0xffff);
      bits = 0;
    }
  }
  if (bits <= 0) for (let i = Math.min(8, Math.ceil(prefix / 16)); i < 8; i++) out[i] = 0;
  return out;
}

export interface Subnet6Result {
  version: 6;
  network: string;
  last: string;
  mask: string;
  first: string;
  total: bigint;
  usable: bigint;
  prefix: number;
}

export function ipv6Subnet(ip: string, prefix: number): Subnet6Result | null {
  if (prefix < 0 || prefix > 128) return null;
  const groups = ipv6Groups(ip);
  if (!groups) return null;
  const network = maskGroups(groups, prefix);
  // last = network | host-part all-ones
  const last = network.slice();
  let bits = 128 - prefix;
  for (let i = 7; i >= 0 && bits > 0; i--) {
    if (bits >= 16) {
      last[i] = 0xffff;
      bits -= 16;
    } else {
      last[i] = last[i] | (bits > 0 ? (0xffff >>> (16 - bits)) & 0xffff : 0);
      bits = 0;
    }
  }
  const total = 1n << BigInt(128 - prefix);
  return {
    version: 6,
    network: ipv6ToText(network),
    last: ipv6ToText(last),
    mask: ipv6ToText(maskGroups([0xffff, 0xffff, 0xffff, 0xffff, 0xffff, 0xffff, 0xffff, 0xffff], prefix)),
    first: ipv6ToText(network),
    total,
    usable: prefix >= 127 ? total : total - 2n,
    prefix,
  };
}
