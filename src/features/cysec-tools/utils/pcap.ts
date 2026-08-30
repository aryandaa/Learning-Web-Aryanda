/**
 * Parser PCAP / PCAPNG murni client-side (TypeScript).
 *
 * Mendukung: PCAP klasik (magic a1b2c3d4 / d4c3b2a1) dan PCAPNG (SHB, IDB,
 * EPB, SPB, PB). Parsing frame: Ethernet II, VLAN, IPv4/IPv6, TCP/UDP/ICMP,
 * ARP, DNS (query/answer A/AAAA/NS/PTR/CNAME), HTTP (request/response),
 * TLS record + SNI dari ClientHello. Analisis agregat: conversations,
 * top talkers, TCP flags, timeline, indikator mencurigakan.
 *
 * Catatan: file diproses lokal; tidak ada upload. Decryption TLS tidak
 * dilakukan. hanya metadata.
 */

import { u16, u32, readAscii } from './bytes';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type PacketProto =
  | 'ARP' | 'IPv4' | 'IPv6' | 'TCP' | 'UDP' | 'ICMP' | 'IGMP'
  | 'DNS' | 'HTTP' | 'TLS' | 'DHCP' | 'Other';

export interface PacketInfo {
  index: number;
  /** timestamp detik (float) sejak epoch; null jika tidak tersedia */
  ts: number | null;
  /** panjang tertangkap */
  caplen: number;
  /** panjang asli */
  origlen: number;
  src: string;
  dst: string;
  proto: PacketProto;
  srcPort?: number;
  dstPort?: number;
  tcpFlags?: string[];
  dnsQuery?: string;
  httpHost?: string;
  httpMethod?: string;
  httpPath?: string;
  httpStatus?: number;
  tlsSni?: string;
  summary: string;
}

export interface Conversation {
  key: string;
  src: string;
  dst: string;
  packets: number;
  bytes: number;
  protocols: Set<string>;
}

export interface SuspiciousFinding {
  severity: 'low' | 'medium' | 'high';
  title: string;
  detail: string;
}

export interface PcapAnalysis {
  format: 'pcap' | 'pcapng' | null;
  linkType: number;
  snaplen: number;
  interfaceCount: number;
  packetCount: number;
  errors: string[];
  packets: PacketInfo[];
  /** durasi capture (detik) */
  duration: number | null;
  firstTs: number | null;
  lastTs: number | null;
  protocols: { proto: string; count: number; bytes: number }[];
  conversations: Conversation[];
  topTalkers: { ip: string; packets: number; bytes: number; role: 'src' | 'dst' }[];
  tcpFlags: { flag: string; count: number }[];
  dnsQueries: { query: string; count: number }[];
  httpHosts: { host: string; count: number; methods: Record<string, number>; statuses: Record<string, number> }[];
  tlsSnis: { sni: string; count: number }[];
  timeline: { ts: number; count: number }[];
  packetSizes: { range: string; count: number }[];
  suspicious: SuspiciousFinding[];
  truncated: boolean;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function ipv4(b: Uint8Array, off: number): string {
  return `${b[off]}.${b[off + 1]}.${b[off + 2]}.${b[off + 3]}`;
}

function ipv6(b: Uint8Array, off: number): string {
  const groups: string[] = [];
  for (let i = 0; i < 8; i++) {
    groups.push(((b[off + i * 2] << 8) | b[off + i * 2 + 1]).toString(16));
  }
  // kompresi :: sederhana
  let s = groups.join(':');
  s = s.replace(/(^|:)0(:0)+(?=:|$)/, ':');
  return s;
}

function mac(b: Uint8Array, off: number): string {
  return Array.from(b.subarray(off, off + 6), (x) => x.toString(16).padStart(2, '0')).join(':');
}

interface FrameResult {
  src: string;
  dst: string;
  ethertype: number;
}

function parseEthernet(b: Uint8Array, off: number): FrameResult {
  // EtherType adalah field network byte order (big-endian).
  let ethertype = u16(b, off + 12, false);
  let etypeOff = off + 12;
  let vlanCount = 0;
  while ((ethertype === 0x8100 || ethertype === 0x88a8 || ethertype === 0x9100) && vlanCount < 2) {
    etypeOff += 4;
    ethertype = u16(b, etypeOff);
    vlanCount++;
  }
  return {
    src: mac(b, off + 6),
    dst: mac(b, off),
    ethertype,
  };
}

function parseDns(b: Uint8Array, off: number, len: number): { query: string; type: number; answers: { type: number; name: string }[] } | null {
  if (len < 12) return null;
  // Semua integer DNS berformat network byte order (big-endian).
  const qd = u16(b, off + 4, false);
  const an = u16(b, off + 6, false);
  if (qd === 0 && an === 0) return null;
  let p = off + 12;
  const end = off + len;
  let query = '';
  const readName = (start: number): { name: string; next: number } => {
    let name = '';
    let pos = start;
    let jumped = false;
    let next = start;
    let guard = 0;
    while (pos < end && guard++ < 64) {
      const l = b[pos];
      if (l === 0) {
        pos++;
        if (!jumped) next = pos;
        break;
      }
      if ((l & 0xc0) === 0xc0) {
        const ptr = ((l & 0x3f) << 8) | b[pos + 1];
        if (!jumped) next = pos + 2;
        pos = ptr;
        jumped = true;
        continue;
      }
      if (pos + 1 + l > end) break;
      if (name) name += '.';
      name += readAscii(b, pos + 1, l);
      pos += 1 + l;
    }
    return { name, next };
  };
  const answers: { type: number; name: string }[] = [];
  for (let i = 0; i < qd; i++) {
    const { name, next } = readName(p);
    if (i === 0) query = name;
    p = next + 4; // type + class
    if (p > end) return null;
  }
  for (let i = 0; i < Math.min(an, 12); i++) {
    const { name, next } = readName(p);
    if (next + 10 > end) break;
    const type = u16(b, next, false);
    const rdlen = u16(b, next + 8, false);
    p = next + 10 + rdlen;
    if (p > end) break;
    if (type === 1 || type === 28 || type === 12 || type === 5 || type === 2) {
      answers.push({ type, name });
    }
  }
  return { query, type: 0, answers };
}

function parseTlsSni(b: Uint8Array, off: number, len: number): string | null {
  // Semua field TLS/record berformat network byte order (big-endian).
  let p = off;
  const end = off + len;
  while (p + 5 <= end) {
    const contentType = b[p];
    const recLen = u16(b, p + 3, false);
    const bodyStart = p + 5;
    if (bodyStart + recLen > end) break;
    if (contentType === 22 && recLen > 4) {
      const hsType = b[bodyStart];
      const hsLen = (b[bodyStart + 1] << 16) | (b[bodyStart + 2] << 8) | b[bodyStart + 3];
      if (hsType === 1 && hsLen > 34) {
        // ClientHello: version(2) random(32) session_id_len(1) ...
        let q = bodyStart + 4;
        q += 2 + 32;
        if (q >= bodyStart + hsLen) break;
        const sidLen = b[q];
        q += 1 + sidLen;
        if (q + 2 > bodyStart + hsLen) break;
        const csLen = u16(b, q, false);
        q += 2 + csLen;
        if (q + 1 > bodyStart + hsLen) break;
        const compLen = b[q];
        q += 1 + compLen;
        if (q + 2 > bodyStart + hsLen) break;
        const extLen = u16(b, q, false);
        q += 2;
        const extEnd = Math.min(q + extLen, bodyStart + hsLen);
        while (q + 4 <= extEnd) {
          const extType = u16(b, q, false);
          const extDataLen = u16(b, q + 2, false);
          if (extType === 0 && extDataLen > 5) {
            const nameType = b[q + 6];
            const nameLen = u16(b, q + 7, false);
            if (nameType === 0 && q + 9 + nameLen <= extEnd) {
              return readAscii(b, q + 9, nameLen);
            }
          }
          q += 4 + extDataLen;
        }
      }
    }
    p = bodyStart + recLen;
  }
  return null;
}

function parseHttp(b: Uint8Array, off: number, len: number): { method?: string; path?: string; status?: number; host?: string } | null {
  const sample = readAscii(b, off, Math.min(len, 1024));
  const head = sample.slice(0, sample.indexOf('\r\n\r\n') !== -1 ? sample.indexOf('\r\n\r\n') : sample.length);
  const lines = head.split('\r\n');
  const first = lines[0] ?? '';
  const methodMatch = /^(GET|POST|PUT|DELETE|HEAD|OPTIONS|PATCH|CONNECT|TRACE)\s+(\S+)\s+HTTP\/[\d.]+$/.exec(first);
  if (methodMatch) {
    const hostLine = lines.find((l) => /^host:/i.test(l));
    return { method: methodMatch[1], path: methodMatch[2], host: hostLine ? hostLine.slice(5).trim() : undefined };
  }
  const statusMatch = /^HTTP\/[\d.]+\s+(\d{3})/.exec(first);
  if (statusMatch) {
    const hostLine = lines.find((l) => /^host:/i.test(l));
    return { status: parseInt(statusMatch[1], 10), host: hostLine ? hostLine.slice(5).trim() : undefined };
  }
  return null;
}

// ---------------------------------------------------------------------------
// Main parser
// ---------------------------------------------------------------------------

export function analyzePcap(buffer: ArrayBuffer, _fileName: string): PcapAnalysis {
  const bytes = new Uint8Array(buffer);
  const analysis: PcapAnalysis = {
    format: null,
    linkType: 0,
    snaplen: 0,
    interfaceCount: 0,
    packetCount: 0,
    errors: [],
    packets: [],
    duration: null,
    firstTs: null,
    lastTs: null,
    protocols: [],
    conversations: [],
    topTalkers: [],
    tcpFlags: [],
    dnsQueries: [],
    httpHosts: [],
    tlsSnis: [],
    timeline: [],
    packetSizes: [],
    suspicious: [],
    truncated: false,
  };

  const dv = new DataView(buffer);

  const addPacket = (pkt: PacketInfo) => {
    analysis.packets.push(pkt);
    if (pkt.ts != null) {
      if (analysis.firstTs === null || pkt.ts < analysis.firstTs) analysis.firstTs = pkt.ts;
      if (analysis.lastTs === null || pkt.ts > analysis.lastTs) analysis.lastTs = pkt.ts;
    }
  };

  const parseFrame = (data: Uint8Array, ts: number | null, index: number, caplen: number, origlen: number) => {
    const linkType = analysis.linkType;
    let src = '?';
    let dst = '?';
    let proto: PacketProto = 'Other';
    let srcPort: number | undefined;
    let dstPort: number | undefined;
    let tcpFlags: string[] | undefined;
    let dnsQuery: string | undefined;
    let httpHost: string | undefined;
    let httpMethod: string | undefined;
    let httpPath: string | undefined;
    let httpStatus: number | undefined;
    let tlsSni: string | undefined;
    let summary = '';

    if (linkType === 1) {
      // Ethernet
      if (data.length < 14) {
        summary = 'Frame terlalu pendek (Ethernet)';
        addPacket({ index, ts, caplen, origlen, src, dst, proto, summary });
        return;
      }
      const eth = parseEthernet(data, 0);
      src = eth.src;
      dst = eth.dst;
      const payload = data.subarray(14);
      if (eth.ethertype === 0x0800) {
        // IPv4
        if (payload.length < 20) {
          summary = 'IPv4 header tidak lengkap';
          addPacket({ index, ts, caplen, origlen, src, dst, proto: 'IPv4', summary });
          return;
        }
        const ihl = (payload[0] & 0x0f) * 4;
        if (payload.length < ihl) {
          summary = 'IPv4 header tidak lengkap (IHL)';
          addPacket({ index, ts, caplen, origlen, src, dst, proto: 'IPv4', summary });
          return;
        }
        const ipProto = payload[9];
        src = ipv4(payload, 12);
        dst = ipv4(payload, 16);
        const ipPayload = payload.subarray(ihl);
        if (ipProto === 6) {
          proto = 'TCP';
          if (ipPayload.length < 20) {
            summary = `${src} → ${dst} TCP (header pendek)`;
            addPacket({ index, ts, caplen, origlen, src, dst, proto, srcPort, dstPort, summary });
            return;
          }
          srcPort = u16(ipPayload, 0, false);
          dstPort = u16(ipPayload, 2, false);
          const dataOff = (ipPayload[12] >> 4) * 4;
          const flagsByte = ipPayload[13];
          const flagNames = [
            ['FIN', 0x01], ['SYN', 0x02], ['RST', 0x04], ['PSH', 0x08],
            ['ACK', 0x10], ['URG', 0x20], ['ECE', 0x40], ['CWR', 0x80],
          ] as const;
          tcpFlags = flagNames.filter(([, m]) => flagsByte & m).map(([n]) => n);
          const tcpPayload = ipPayload.subarray(Math.min(dataOff, ipPayload.length));
          summary = `${src}:${srcPort} → ${dst}:${dstPort} TCP [${tcpFlags.join(',') || '-'}]`;

          if (srcPort === 53 || dstPort === 53) {
            const dns = parseDns(tcpPayload, 0, tcpPayload.length);
            if (dns && dns.query) {
              proto = 'DNS';
              dnsQuery = dns.query;
              summary = `DNS query: ${dns.query}`;
            }
          }
          if (proto === 'TCP') {
            const http = parseHttp(tcpPayload, 0, tcpPayload.length);
            if (http) {
              proto = 'HTTP';
              httpHost = http.host;
              httpMethod = http.method;
              httpPath = http.path;
              httpStatus = http.status;
              summary = http.method
                ? `HTTP ${http.method} ${http.path} (${http.host ?? '?'})`
                : `HTTP ${http.status ?? '?'} (${http.host ?? '?'})`;
            } else if (tcpPayload.length > 5 && (tcpPayload[0] === 0x16 || tcpPayload[0] === 0x17 || tcpPayload[0] === 0x15)) {
              const sni = parseTlsSni(tcpPayload, 0, tcpPayload.length);
              if (sni || tcpPayload[0] === 0x16) {
                proto = 'TLS';
                tlsSni = sni ?? undefined;
                summary = `TLS record (SNI: ${sni ?? '-'})`;
              }
            }
          }
        } else if (ipProto === 17) {
          proto = 'UDP';
          if (ipPayload.length < 8) {
            summary = `${src} → ${dst} UDP (header pendek)`;
            addPacket({ index, ts, caplen, origlen, src, dst, proto, summary });
            return;
          }
          srcPort = u16(ipPayload, 0, false);
          dstPort = u16(ipPayload, 2, false);
          const udpLen = u16(ipPayload, 4, false);
          const udpPayload = ipPayload.subarray(8, Math.min(8 + udpLen, ipPayload.length));
          summary = `${src}:${srcPort} → ${dst}:${dstPort} UDP`;
          if (srcPort === 53 || dstPort === 53) {
            const dns = parseDns(udpPayload, 0, udpPayload.length);
            if (dns && dns.query) {
              proto = 'DNS';
              dnsQuery = dns.query;
              summary = `DNS query: ${dns.query}`;
            }
          } else if ((srcPort === 67 && dstPort === 68) || (srcPort === 68 && dstPort === 67)) {
            proto = 'DHCP';
            summary = `DHCP ${srcPort === 67 ? 'offer/ack' : 'discover/request'} ${src} → ${dst}`;
          }
        } else if (ipProto === 1) {
          proto = 'ICMP';
          const type = ipPayload.length > 0 ? ipPayload[0] : -1;
          const typeNames: Record<number, string> = { 0: 'echo reply', 3: 'destination unreachable', 5: 'redirect', 8: 'echo request', 11: 'time exceeded' };
          summary = `ICMP ${typeNames[type] ?? `type ${type}`} ${src} → ${dst}`;
        } else if (ipProto === 2) {
          proto = 'IGMP';
          summary = `IGMP ${src} → ${dst}`;
        } else {
          summary = `IP proto ${ipProto} ${src} → ${dst}`;
        }
      } else if (eth.ethertype === 0x86dd) {
        // IPv6
        if (payload.length < 40) {
          summary = 'IPv6 header tidak lengkap';
          addPacket({ index, ts, caplen, origlen, src, dst, proto: 'IPv6', summary });
          return;
        }
        let ipNext = payload[6];
        let extOff = 40;
        let iter = 0;
        while ([0, 43, 44, 60, 135, 51].includes(ipNext) && iter < 8) {
          if (ipNext === 44) {
            ipNext = payload[extOff];
            extOff += 8;
          } else {
            const len = (payload[extOff + 1] + 1) * 8;
            ipNext = payload[extOff];
            extOff += len;
          }
          iter++;
        }
        const ipPayload = payload.subarray(Math.min(extOff, payload.length));
        if (ipNext === 6) {
          proto = 'TCP';
          if (ipPayload.length >= 20) {
            srcPort = u16(ipPayload, 0, false);
            dstPort = u16(ipPayload, 2, false);
            const dataOff = (ipPayload[12] >> 4) * 4;
            const flagsByte = ipPayload[13];
            const flagNames = [
              ['FIN', 0x01], ['SYN', 0x02], ['RST', 0x04], ['PSH', 0x08],
              ['ACK', 0x10], ['URG', 0x20], ['ECE', 0x40], ['CWR', 0x80],
            ] as const;
            tcpFlags = flagNames.filter(([, m]) => flagsByte & m).map(([n]) => n);
            const tcpPayload = ipPayload.subarray(Math.min(dataOff, ipPayload.length));
            summary = `${src}:${srcPort} → ${dst}:${dstPort} TCP [${tcpFlags.join(',') || '-'}]`;
            if (srcPort === 53 || dstPort === 53) {
              const dns = parseDns(tcpPayload, 0, tcpPayload.length);
              if (dns && dns.query) {
                proto = 'DNS';
                dnsQuery = dns.query;
                summary = `DNS query: ${dns.query}`;
              }
            } else if (proto === 'TCP') {
              const http = parseHttp(tcpPayload, 0, tcpPayload.length);
              if (http) {
                proto = 'HTTP';
                httpHost = http.host;
                httpMethod = http.method;
                httpPath = http.path;
                httpStatus = http.status;
                summary = http.method
                  ? `HTTP ${http.method} ${http.path} (${http.host ?? '?'})`
                  : `HTTP ${http.status ?? '?'} (${http.host ?? '?'})`;
              } else if (tcpPayload.length > 5 && tcpPayload[0] === 0x16) {
                const sni = parseTlsSni(tcpPayload, 0, tcpPayload.length);
                proto = 'TLS';
                tlsSni = sni ?? undefined;
                summary = `TLS record (SNI: ${sni ?? '-'})`;
              }
            }
          } else {
            summary = `${src} → ${dst} TCP (header pendek)`;
          }
        } else if (ipNext === 17) {
          proto = 'UDP';
          if (ipPayload.length >= 8) {
            srcPort = u16(ipPayload, 0, false);
            dstPort = u16(ipPayload, 2, false);
            const udpLen = u16(ipPayload, 4, false);
            const udpPayload = ipPayload.subarray(8, Math.min(8 + udpLen, ipPayload.length));
            summary = `${src}:${srcPort} → ${dst}:${dstPort} UDP`;
            if (srcPort === 53 || dstPort === 53) {
              const dns = parseDns(udpPayload, 0, udpPayload.length);
              if (dns && dns.query) {
                proto = 'DNS';
                dnsQuery = dns.query;
                summary = `DNS query: ${dns.query}`;
              }
            }
          } else {
            summary = `${src} → ${dst} UDP (header pendek)`;
          }
        } else if (ipNext === 1) {
          proto = 'ICMP';
          summary = `ICMPv6 ${src} → ${dst}`;
        } else {
          summary = `IPv6 next ${ipNext} ${src} → ${dst}`;
        }
      } else if (eth.ethertype === 0x0806) {
        proto = 'ARP';
        if (payload.length >= 28) {
          const op = u16(payload, 6, false);
          const opName = op === 1 ? 'request' : op === 2 ? 'reply' : `op ${op}`;
          const spa = ipv4(payload, 14);
          const tpa = ipv4(payload, 24);
          summary = `ARP ${opName}: who has ${tpa}? (${spa})`;
          if (op === 1) {
            src = spa;
            dst = tpa;
          } else {
            src = spa;
            dst = tpa;
          }
        } else {
          summary = 'ARP (header pendek)';
        }
      } else {
        summary = `EtherType 0x${eth.ethertype.toString(16)} ${src} → ${dst}`;
      }
    } else if (linkType === 101 || linkType === 228) {
      // raw IP
      if (data.length >= 20 && (data[0] >> 4) === 4) {
        src = ipv4(data, 12);
        dst = ipv4(data, 16);
        summary = `Raw IPv4 ${src} → ${dst}`;
        proto = 'IPv4';
      } else if (data.length >= 40 && (data[0] >> 4) === 6) {
        src = ipv6(data, 8);
        dst = ipv6(data, 24);
        summary = `Raw IPv6 ${src} → ${dst}`;
        proto = 'IPv6';
      } else {
        summary = `Raw IP (linktype ${linkType})`;
      }
    } else {
      summary = `Linktype ${linkType} belum didukung penuh (raw hex dump tersedia).`;
    }

    addPacket({
      index, ts, caplen, origlen, src, dst, proto, srcPort, dstPort,
      tcpFlags, dnsQuery, httpHost, httpMethod, httpPath, httpStatus, tlsSni, summary,
    });
  };

  const headerOffset = 24;

  if (bytes.length < 24) {
    analysis.errors.push('File terlalu pendek untuk menjadi PCAP/PCAPNG.');
    return analysis;
  }

  const magic = dv.getUint32(0, false);
  const magicLE = dv.getUint32(0, true);

  if (magic === 0x0a0d0d0a) {
    // ---------------- PCAPNG ----------------
    analysis.format = 'pcapng';
    analysis.linkType = 1;
    let off = 0;
    let epbCount = 0;
    let capStartTs: number | null = null;
    const ifResol: Record<number, number> = {};

    while (off + 12 <= bytes.length) {
      const blockType = dv.getUint32(off, true);
      const blockLen = dv.getUint32(off + 4, true);
      if (blockLen < 12 || off + blockLen > bytes.length) {
        analysis.errors.push(`PCAPNG: block length tidak valid pada offset ${off}. parsing dihentikan.`);
        break;
      }
      const body = off + 8;
      if (blockType === 0x0a0d0d0a) {
        // SHB
        analysis.snaplen = analysis.snaplen || 0;
        analysis.interfaceCount = 0;
      } else if (blockType === 0x00000001) {
        // IDB
        analysis.linkType = dv.getUint16(body, true);
        analysis.snaplen = dv.getUint32(body + 4, true);
        analysis.interfaceCount++;
        ifResol[analysis.interfaceCount - 1] = 1e-6;
      } else if (blockType === 0x00000006) {
        // EPB
        const ifId = dv.getUint32(body, true);
        const tsHigh = dv.getUint32(body + 4, true);
        const tsLow = dv.getUint32(body + 8, true);
        const caplen = dv.getUint32(body + 12, true);
        const origlen = dv.getUint32(body + 16, true);
        const dataStart = body + 20;
        if (dataStart + caplen <= bytes.length) {
          const resol = ifResol[ifId] ?? 1e-6;
          const tsRaw = (BigInt(tsHigh) << 32n) | BigInt(tsLow);
          const ts = Number(tsRaw) * resol;
          if (capStartTs === null) capStartTs = ts;
          parseFrame(bytes.subarray(dataStart, dataStart + caplen), ts, epbCount, caplen, origlen);
          epbCount++;
        } else {
          analysis.errors.push(`PCAPNG: EPB data melebihi file (offset ${dataStart}).`);
        }
      } else if (blockType === 0x00000003) {
        // SPB
        const origlen = dv.getUint32(body, true);
        const caplen = Math.min(origlen, bytes.length - body - 4);
        parseFrame(bytes.subarray(body + 4, body + 4 + caplen), null, epbCount, caplen, origlen);
        epbCount++;
      } else if (blockType === 0x00000002) {
        // PB (legacy)
        const tsHigh = dv.getUint32(body + 4, true);
        const tsLow = dv.getUint32(body + 8, true);
        const caplen = dv.getUint32(body + 12, true);
        const origlen = dv.getUint32(body + 16, true);
        const dataStart = body + 20;
        if (dataStart + caplen <= bytes.length) {
          const ts = Number(((BigInt(tsHigh) << 32n) | BigInt(tsLow)) * 1_000_000n) / 1e12;
          parseFrame(bytes.subarray(dataStart, dataStart + caplen), ts, epbCount, caplen, origlen);
          epbCount++;
        }
      }
      off += blockLen;
      if (epbCount > 500_000) {
        analysis.truncated = true;
        analysis.errors.push('Batas 500.000 paket tercapai. parsing dihentikan (file sangat besar).');
        break;
      }
    }
    analysis.packetCount = epbCount;
  } else if (magic === 0xa1b2c3d4 || magicLE === 0xa1b2c3d4) {
    // ---------------- PCAP klasik ----------------
    analysis.format = 'pcap';
    const be = magic === 0xa1b2c3d4;
    const rdU32 = (o: number) => u32(bytes, o, !be);
    analysis.linkType = rdU32(20);
    analysis.snaplen = rdU32(16);
    let off = headerOffset;
    let count = 0;
    while (off + 16 <= bytes.length) {
      const tsSec = rdU32(off);
      const tsUsec = rdU32(off + 4);
      const inclLen = rdU32(off + 8);
      const origLen = rdU32(off + 12);
      const dataStart = off + 16;
      if (dataStart + inclLen > bytes.length) {
        analysis.errors.push(`PCAP: paket #${count} melebihi akhir file. parsing dihentikan.`);
        break;
      }
      const ts = tsSec + tsUsec / 1_000_000;
      parseFrame(bytes.subarray(dataStart, dataStart + inclLen), ts, count, inclLen, origLen);
      off = dataStart + inclLen;
      count++;
      if (count > 500_000) {
        analysis.truncated = true;
        analysis.errors.push('Batas 500.000 paket tercapai. parsing dihentikan (file sangat besar).');
        break;
      }
    }
    analysis.packetCount = count;
  } else {
    analysis.errors.push('Magic number tidak dikenali. bukan file PCAP/PCAPNG yang valid.');
    return analysis;
  }

  // ---------------- Aggregasi ----------------
  const protoCount = new Map<string, number>();
  const protoBytes = new Map<string, number>();
  const convMap = new Map<string, Conversation>();
  const talkerPackets = new Map<string, number>();
  const talkerBytes = new Map<string, number>();
  const flagsCount = new Map<string, number>();
  const dnsMap = new Map<string, number>();
  const httpMap = new Map<string, { count: number; methods: Record<string, number>; statuses: Record<string, number> }>();
  const sniMap = new Map<string, number>();
  const timelineMap = new Map<number, number>();
  const sizeBuckets = [
    ['≤64', 0], ['65–128', 0], ['129–256', 0], ['257–512', 0],
    ['513–1024', 0], ['1025–1518', 0], ['1519+', 0],
  ] as [string, number][];
  const synSrc = new Map<string, { count: number; dstPort: number; ts: number }[]>();

  for (const p of analysis.packets) {
    protoCount.set(p.proto, (protoCount.get(p.proto) ?? 0) + 1);
    protoBytes.set(p.proto, (protoBytes.get(p.proto) ?? 0) + p.caplen);

    talkerPackets.set(p.src, (talkerPackets.get(p.src) ?? 0) + 1);
    talkerBytes.set(p.src, (talkerBytes.get(p.src) ?? 0) + p.caplen);

    const key = [p.src, p.dst].sort().join(' ↔ ');
    let conv = convMap.get(key);
    if (!conv) {
      conv = { key, src: p.src, dst: p.dst, packets: 0, bytes: 0, protocols: new Set() };
      convMap.set(key, conv);
    }
    conv.packets++;
    conv.bytes += p.caplen;
    conv.protocols.add(p.proto);

    if (p.tcpFlags) {
      for (const f of p.tcpFlags) flagsCount.set(f, (flagsCount.get(f) ?? 0) + 1);
      if (p.tcpFlags.includes('SYN') && !p.tcpFlags.includes('ACK')) {
        const list = synSrc.get(p.src) ?? [];
        list.push({ count: 1, dstPort: p.dstPort ?? 0, ts: p.ts ?? 0 });
        synSrc.set(p.src, list);
      }
    }
    if (p.dnsQuery) dnsMap.set(p.dnsQuery, (dnsMap.get(p.dnsQuery) ?? 0) + 1);
    if (p.httpHost) {
      const h = httpMap.get(p.httpHost) ?? { count: 0, methods: {}, statuses: {} };
      h.count++;
      if (p.httpMethod) h.methods[p.httpMethod] = (h.methods[p.httpMethod] ?? 0) + 1;
      if (p.httpStatus) h.statuses[String(p.httpStatus)] = (h.statuses[String(p.httpStatus)] ?? 0) + 1;
      httpMap.set(p.httpHost, h);
    }
    if (p.tlsSni) sniMap.set(p.tlsSni, (sniMap.get(p.tlsSni) ?? 0) + 1);

    if (p.ts != null) {
      const bucket = Math.floor(p.ts);
      timelineMap.set(bucket, (timelineMap.get(bucket) ?? 0) + 1);
    }

    if (p.caplen <= 64) sizeBuckets[0][1]++;
    else if (p.caplen <= 128) sizeBuckets[1][1]++;
    else if (p.caplen <= 256) sizeBuckets[2][1]++;
    else if (p.caplen <= 512) sizeBuckets[3][1]++;
    else if (p.caplen <= 1024) sizeBuckets[4][1]++;
    else if (p.caplen <= 1518) sizeBuckets[5][1]++;
    else sizeBuckets[6][1]++;
  }

  analysis.protocols = Array.from(protoCount.entries())
    .map(([proto, count]) => ({ proto, count, bytes: protoBytes.get(proto) ?? 0 }))
    .sort((a, b) => b.count - a.count);
  analysis.conversations = Array.from(convMap.values()).sort((a, b) => b.packets - a.packets).slice(0, 200);
  analysis.topTalkers = Array.from(talkerPackets.entries())
    .map(([ip, packets]) => ({ ip, packets, bytes: talkerBytes.get(ip) ?? 0, role: 'src' as const }))
    .sort((a, b) => b.packets - a.packets)
    .slice(0, 20);
  analysis.tcpFlags = Array.from(flagsCount.entries()).map(([flag, count]) => ({ flag, count })).sort((a, b) => b.count - a.count);
  analysis.dnsQueries = Array.from(dnsMap.entries()).map(([query, count]) => ({ query, count })).sort((a, b) => b.count - a.count).slice(0, 200);
  analysis.httpHosts = Array.from(httpMap.entries()).map(([host, v]) => ({ host, ...v })).sort((a, b) => b.count - a.count).slice(0, 100);
  analysis.tlsSnis = Array.from(sniMap.entries()).map(([sni, count]) => ({ sni, count })).sort((a, b) => b.count - a.count).slice(0, 100);
  analysis.timeline = Array.from(timelineMap.entries()).sort((a, b) => a[0] - b[0]).map(([ts, count]) => ({ ts, count }));
  analysis.packetSizes = sizeBuckets.map(([range, count]) => ({ range, count }));
  analysis.duration = analysis.firstTs != null && analysis.lastTs != null ? analysis.lastTs - analysis.firstTs : null;

  // ---------------- Indikator mencurigakan ----------------
  const findings: SuspiciousFinding[] = [];
  if (analysis.packetCount > 0 && analysis.firstTs != null && analysis.lastTs != null && analysis.duration! > 0) {
    const pps = analysis.packetCount / analysis.duration!;
    if (pps > 1000) findings.push({ severity: 'high', title: 'Traffic density tinggi', detail: `${pps.toFixed(0)} paket/detik rata-rata. kemungkinan scan/DoS.` });
  }
  for (const [ip, list] of synSrc) {
    if (list.length > 20) {
      const uniquePorts = new Set(list.map((x) => x.dstPort)).size;
      if (uniquePorts > 15) {
        findings.push({ severity: 'high', title: `Kemungkinan port scan dari ${ip}`, detail: `${list.length} SYN ke ${uniquePorts} port berbeda.` });
      } else {
        findings.push({ severity: 'medium', title: `SYN flood / retry dari ${ip}`, detail: `${list.length} SYN tanpa ACK.` });
      }
    }
  }
  // 404 berulang
  const http404 = new Map<string, number>();
  for (const p of analysis.packets) {
    if (p.httpStatus === 404 && p.src && /^\d/.test(p.src)) {
      http404.set(p.src, (http404.get(p.src) ?? 0) + 1);
    }
  }
  for (const [ip, count] of http404) {
    if (count > 10) {
      findings.push({ severity: 'medium', title: `Banyak HTTP 404 dari ${ip}`, detail: `${count} respons 404. kemungkinan directory brute-force.` });
    }
  }
  // DNS query mencurigakan
  const dnsEntries = Array.from(dnsMap.entries());
  if (dnsEntries.length > 100) {
    findings.push({ severity: 'low', title: 'Volume DNS tinggi', detail: `${dnsEntries.length} query unik. periksa kemungkinan exfiltration/DDNS.` });
  }
  analysis.suspicious = findings;

  return analysis;
}
