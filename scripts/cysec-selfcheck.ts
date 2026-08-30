/** Verifikasi cepat implementasi kriptografi terhadap test vector standar. */
import { md5, sha3, chacha20 } from '../src/features/cysec-tools/utils/crypto';
import { bytesToHex, utf8ToBytes, hexToBytes, bytesToBase32, base32ToBytes, bytesToUtf8 } from '../src/features/cysec-tools/utils/bytes';
import { urlEncode, urlDecode, htmlEncode, rot13, rot47, atbash, morseEncode, morseDecode, baconEncode, baconDecode, railFenceEncode, railFenceDecode, vigenere, englishScore } from '../src/features/cysec-tools/utils/encoding';
import { entropyOf, extractAsciiStrings, detectSignature } from '../src/features/cysec-tools/utils/analysis';
import { analyzePcap } from '../src/features/cysec-tools/utils/pcap';
import { parseElf, parseMacho, parsePe } from '../src/features/cysec-tools/utils/binaryFormats';
import { parseTimestamp, parseExif } from '../src/features/cysec-tools/utils/files';
import { analyzeLog } from '../src/features/cysec-tools/utils/logparse';
import { parseJwt } from '../src/features/cysec-tools/utils/web';

let pass = 0;
let fail = 0;
function check(name: string, got: string, expected: string) {
  if (got === expected) {
    pass++;
    console.log(`  ✅ ${name}`);
  } else {
    fail++;
    console.log(`  ❌ ${name}\n     got:      ${got}\n     expected: ${expected}`);
  }
}
function checkTrue(name: string, cond: boolean) {
  if (cond) { pass++; console.log(`  ✅ ${name}`); }
  else { fail++; console.log(`  ❌ ${name}`); }
}

console.log('MD5:');
check('MD5("")', md5(new Uint8Array(0)), 'd41d8cd98f00b204e9800998ecf8427e');
check('MD5("abc")', md5(utf8ToBytes('abc')), '900150983cd24fb0d6963f7d28e17f72');
check('MD5("The quick brown fox jumps over the lazy dog")', md5(utf8ToBytes('The quick brown fox jumps over the lazy dog')), '9e107d9d372bb6826bd81d3542a419d6');

console.log('SHA-3 (Keccak). NIST vectors:');
check('SHA3-224("")', bytesToHex(sha3(new Uint8Array(0), 224)), '6b4e03423667dbb73b6e15454f0eb1abd4597f9a1b078e3f5b5a6bc7');
check('SHA3-256("")', bytesToHex(sha3(new Uint8Array(0), 256)), 'a7ffc6f8bf1ed76651c14756a061d662f580ff4de43b49fa82d80a4b80f8434a');
check('SHA3-512("")', bytesToHex(sha3(new Uint8Array(0), 512)), 'a69f73cca23a9ac5c8b567dc185a756e97c982164fe25859e0d1dcc1475c80a615b2123af1f5f94c11e3e9402c3ac558f500199d95b6d3e301758586281dcd26');
check('SHA3-256("abc")', bytesToHex(sha3(utf8ToBytes('abc'), 256)), '3a985da74fe225b2045c172d6bd390bd855f086e3e9d525b46bfe24511431532');

console.log('ChaCha20 (RFC 8439 §2.4.2 test vector, 64-byte message):');
{
  const key = hexToBytes('000102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f');
  const nonce = hexToBytes('000000000000004a00000000');
  const counter = 1;
  const plain = utf8ToBytes('Ladies and Gentlemen of the class of \'99: If I could offer you only one tip for the future, sunscreen would be it.');
  const cipher = chacha20(plain, key, nonce, counter);
  const expected = '6e2e359a2568f98041ba0728dd0d6981e97e7aec1d4360c20a27afccfd9fae0bf91b65c5524733ab8f593dabcd62b3571639d624e65152ab8f530c359f0861d807ca0dbf500d6a6156a38e088a22b65e52bc514d16ccf806818ce91ab77937365af90bbf74a35be6b40b8eedf2785e42874d';
  check('ChaCha20 keystream XOR', bytesToHex(cipher), expected);
  // round-trip
  checkTrue('ChaCha20 round-trip', bytesToHex(chacha20(cipher, key, nonce, counter)) === bytesToHex(plain));
}

console.log('Encoding:');
check('base32("Hello")', bytesToBase32(utf8ToBytes('Hello')), 'JBSWY3DP');
checkTrue('base32 round-trip', bytesToUtf8(base32ToBytes('JBSWY3DP')) === 'Hello');
check('urlEncode component', urlEncode('a b&c=d'), 'a%20b%26c%3Dd');
check('urlDecode', urlDecode('a%20b%26c%3Dd'), 'a b&c=d');
check('htmlEncode', htmlEncode('<script>"x"</script>'), '&lt;script&gt;&quot;x&quot;&lt;/script&gt;');
check('rot13("Hello World")', rot13('Hello World'), 'Uryyb Jbeyq');
check('rot47("Hello")', rot47('Hello'), 'w6==@');
check('atbash("Svool dliow")', atbash('Svool dliow'), 'Hello world');
check('morse("SOS")', morseEncode('SOS'), '... --- ...');
check('morse decode', morseDecode('... --- ...'), 'SOS');
check('bacon("A")', baconEncode('A'), 'AAAAA');
check('bacon decode', baconDecode('AAABA'), 'C');
check('railFence encode', railFenceEncode('WEAREDISCOVEREDFLEEATONCE', 3), 'WECRLTEERDSOEEFEAOCAIVDEN');
check('railFence decode', railFenceDecode('WECRLTEERDSOEEFEAOCAIVDEN', 3), 'WEAREDISCOVEREDFLEEATONCE');
check('vigenere', vigenere('ATTACKATDAWN', 'LEMON', false), 'LXFOPVEFRNHR');
checkTrue('englishScore("hello world") > englishScore("qqqqqq")', englishScore('hello world') > englishScore('qqqqqq'));

console.log('Analysis:');
checkTrue('entropy of zeros < 1', entropyOf(new Uint8Array(1000)).entropyBitsPerByte < 1);
checkTrue('entropy of random > 7', entropyOf(crypto.getRandomValues(new Uint8Array(1000))).entropyBitsPerByte > 7);
checkTrue('strings extraction', extractAsciiStrings(utf8ToBytes('xxHELLO_STRINGxx'), 4).some((s) => s.value.includes('HELLO_STRING')));
checkTrue('magic PDF', detectSignature(new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34])).some((s) => s.extension === 'pdf'));

console.log('PCAP parser (PCAP klasik, 3 paket Ethernet/IPv4/TCP/UDP/DNS):');
{
  // Bangun pcap kecil secara manual
  const chunks: number[] = [];
  const le32 = (n: number) => [n & 0xff, (n >> 8) & 0xff, (n >> 16) & 0xff, (n >> 24) & 0xff];
  const le16 = (n: number) => [n & 0xff, (n >> 8) & 0xff];
  // global header
  chunks.push(...[0xd4, 0xc3, 0xb2, 0xa1], ...le16(2), ...le16(4), ...le32(0), ...le32(0), ...le32(65535), ...le32(1));
  const mkEthIpv4Udp = (sip: string, dip: string, sport: number, dport: number, payload: number[]) => {
    const ip = (s: string) => s.split('.').map(Number);
    const a = ip(sip); const b = ip(dip);
    const udpLen = 8 + payload.length;
    const total = 20 + udpLen;
    // Field network ditulis big-endian (sesuai wire format).
    const be16 = (n: number) => [n >> 8, n & 0xff];
    const frame: number[] = [];
    frame.push(...[0x00, 0x11, 0x22, 0x33, 0x44, 0x55], ...[0x66, 0x77, 0x88, 0x99, 0xaa, 0xbb], ...be16(0x0800));
    frame.push(0x45, 0x00, ...be16(total), ...be16(0x1234), ...be16(0x4000), 64, 17, 0, 0, ...a, ...b);
    frame.push(...be16(sport), ...be16(dport), ...be16(udpLen), 0, 0);
    frame.push(...payload);
    return frame;
  };
  const dnsQuery = [0xab, 0xcd, 0x01, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
    0x07, ...Array.from('example', (c) => c.charCodeAt(0)), 0x03, ...Array.from('com', (c) => c.charCodeAt(0)), 0x00, 0x00, 0x01, 0x00, 0x01];
  const frames = [
    mkEthIpv4Udp('192.168.1.10', '8.8.8.8', 53000, 53, dnsQuery),
    mkEthIpv4Udp('192.168.1.10', '8.8.8.8', 53001, 443, [0x16, 0x03, 0x01, 0x00, 0x05, 0x01, 0x00, 0x00, 0x01, 0x00]),
    mkEthIpv4Udp('10.0.0.5', '10.0.0.1', 68, 67, [0x01, 0x01, 0x06, 0x00]),
  ];
  frames.forEach((frame, i) => {
    chunks.push(...le32(1700000000 + i), ...le32(0), ...le32(frame.length), ...le32(frame.length), ...frame);
  });
  const pcapBytes = new Uint8Array(chunks);
  const result = analyzePcap(pcapBytes.buffer as ArrayBuffer, 'test.pcap');
  checkTrue('PCAP format pcap', result.format === 'pcap');
  checkTrue('PCAP 3 paket', result.packetCount === 3);
  checkTrue('PCAP DNS query terdeteksi', result.dnsQueries.some((q) => q.query === 'example.com'));
  checkTrue('PCAP DHCP terdeteksi', result.packets.some((p) => p.proto === 'DHCP'));
  checkTrue('PCAP protocol distribution ada', result.protocols.length >= 2);
}

console.log('PE/ELF/Mach-O (magic only. invalid files):');
checkTrue('PE invalid', parsePe(new Uint8Array([0x4d, 0x5a, 0, 0])).valid === false);
checkTrue('ELF invalid', parseElf(new Uint8Array([0x7f, 0x45, 0x4c, 0x46])).valid === false);
checkTrue('Mach-O invalid', parseMacho(new Uint8Array([1, 2, 3, 4])).valid === false);

console.log('Timestamp:');
checkTrue('parseTimestamp unix', parseTimestamp('1700000000').iso.startsWith('2023-11-14'));

console.log('Log analyzer:');
{
  const lines = [`192.168.1.10 - - [14/Nov/2023:22:13:20 +0000] "GET /index.html HTTP/1.1" 200 2326 "-" "Mozilla/5.0"`];
  for (let i = 0; i < 35; i++) {
    lines.push(`192.168.1.10 - - [14/Nov/2023:22:13:2${i % 10} +0000] "GET /wp-login.php?id=${i} HTTP/1.1" 404 521 "-" "curl/7.81"`);
  }
  lines.push(`Nov 14 22:13:23 host sshd[1234]: Failed password for root from 203.0.113.7 port 51234 ssh2`);
  lines.push(`Nov 14 22:13:24 host sshd[1234]: Failed password for root from 203.0.113.7 port 51235 ssh2`);
  lines.push(`Nov 14 22:13:25 host sshd[1234]: Failed password for root from 203.0.113.7 port 51236 ssh2`);
  lines.push(`Nov 14 22:13:26 host sshd[1234]: Failed password for root from 203.0.113.7 port 51237 ssh2`);
  lines.push(`Nov 14 22:13:27 host sshd[1234]: Failed password for root from 203.0.113.7 port 51238 ssh2`);
  lines.push(`Nov 14 22:13:28 host sshd[1234]: Accepted password for aryanda from 192.168.1.20 port 50000 ssh2`);
  const res = analyzeLog(lines.join('\n'));
  checkTrue('Log format terdeteksi (apache/auth)', res.format === 'apache-combined' || res.format === 'apache-common' || res.format === 'auth');
  checkTrue('Log brute-force terdeteksi', res.suspicious.some((s) => s.title.includes('Brute-force')));
  checkTrue('Log 404 flood terdeteksi', res.suspicious.some((s) => s.title.includes('404') || s.title.includes('Directory')));
}

console.log('JWT:');
{
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
  const payload = btoa(JSON.stringify({ sub: '123', exp: 9999999999 })).replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
  const token = `${header}.${payload}.sig123`;
  const r = parseJwt(token);
  checkTrue('JWT parse valid', r.valid === true);
  checkTrue('JWT claim exp dibaca', r.claims?.some((c) => c.name === 'exp') === true);
  checkTrue('JWT invalid format', parseJwt('abc').valid === false);
}

console.log(`\nHasil: ${pass} pass, ${fail} fail`);
if (fail > 0) process.exit(1);

// ============ Verifikasi tambahan: PCAPNG, PE, ELF, EXIF ============
{
  const le32 = (n: number) => [n & 0xff, (n >> 8) & 0xff, (n >> 16) & 0xff, (n >> 24) & 0xff];
  const le16 = (n: number) => [n & 0xff, (n >> 8) & 0xff];
  const bytes: number[] = [];
  const shbBody = [...le32(0x1a2b3c4d), ...le16(1), ...le16(0), ...le32(0xffffffff), ...le32(0xffffffff)];
  const shbLen = 12 + shbBody.length;
  bytes.push(...le32(0x0a0d0d0a), ...le32(shbLen), ...shbBody, ...le32(shbLen));
  const idbBody = [...le16(1), ...le16(0), ...le32(65535)];
  const idbLen = 12 + idbBody.length;
  bytes.push(...le32(0x00000001), ...le32(idbLen), ...idbBody, ...le32(idbLen));
  const dns = [0x12, 0x34, 0x01, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
    0x07, ...Array.from('example', (c) => c.charCodeAt(0)), 0x03, ...Array.from('org', (c) => c.charCodeAt(0)), 0x00, 0x00, 0x01, 0x00, 0x01];
  const udpLen = 8 + dns.length;
  const total = 20 + udpLen;
  const be16 = (n: number) => [n >> 8, n & 0xff];
  const frame: number[] = [];
  frame.push(0x00, 0x11, 0x22, 0x33, 0x44, 0x55, 0x66, 0x77, 0x88, 0x99, 0xaa, 0xbb, 0x08, 0x00);
  frame.push(0x45, 0x00, ...be16(total), ...be16(1), ...be16(0x4000), 64, 17, 0, 0, 192, 168, 1, 5, 1, 1, 1, 1);
  frame.push(...be16(53000), ...be16(53), ...be16(udpLen), 0, 0, ...dns);
  const epbBody = [...le32(0), ...le32(0), ...le32(1700000000), ...le32(frame.length), ...le32(frame.length), ...frame];
  let epbLen = 12 + epbBody.length;
  while (epbLen % 4 !== 0) {
    epbBody.push(0);
    epbLen = 12 + epbBody.length;
  }
  bytes.push(...le32(0x00000006), ...le32(epbLen), ...epbBody, ...le32(epbLen));
  const r = analyzePcap(new Uint8Array(bytes).buffer as ArrayBuffer, 't.pcapng');
  checkTrue('PCAPNG format', r.format === 'pcapng');
  checkTrue('PCAPNG 1 paket', r.packetCount === 1);
  checkTrue('PCAPNG DNS query', r.dnsQueries.some((q) => q.query === 'example.org'));
  checkTrue('PCAPNG linktype 1', r.linkType === 1);
}

{
  const le16 = (n: number) => [n & 0xff, (n >> 8) & 0xff];
  const le32 = (n: number) => [n & 0xff, (n >> 8) & 0xff, (n >> 16) & 0xff, (n >> 24) & 0xff];
  const bytes: number[] = [0x4d, 0x5a];
  while (bytes.length < 0x3c) bytes.push(0);
  bytes.push(...le32(0x40));
  while (bytes.length < 0x40) bytes.push(0);
  bytes.push(0x50, 0x45, 0, 0);
  bytes.push(...le16(0x8664), ...le16(1), ...le32(0x60000000), ...le32(0), ...le32(0), ...le16(0xf0), ...le16(0x0022));
  const opt: number[] = [0x0b, 0x02];
  while (opt.length < 112) opt.push(0);
  const set = (off: number, arr: number[]) => { arr.forEach((v, i) => { opt[off + i] = v; }); };
  set(16, le32(0x1000));
  set(24, [0x00, 0x00, 0x00, 0x40, 0x01, 0x00, 0x00, 0x00]);
  set(32, le32(0x1000));
  set(36, le32(0x200));
  set(68, le16(3));
  set(70, le16(0x0040));
  set(108, le32(16));
  while (opt.length < 240) opt.push(0);
  bytes.push(...opt);
  const secName = Array.from('TEXT', (c) => c.charCodeAt(0));
  while (secName.length < 8) secName.push(0);
  bytes.push(...secName);
  bytes.push(...le32(0x1000), ...le32(0x1000), ...le32(0x200), ...le32(0x400), ...le32(0), ...le32(0), ...le16(0), ...le16(0));
  bytes.push(...le32(0x60000020));
  const pe = parsePe(new Uint8Array(bytes));
  checkTrue('PE valid', pe.valid);
  checkTrue('PE machine x86-64', pe.machine === 'x86-64');
  checkTrue('PE magic PE32+', pe.magic === 'PE32+');
  checkTrue('PE section TEXT', pe.sections[0]?.name === 'TEXT' && pe.sections[0]?.executable);
  checkTrue('PE entry 0x1000', pe.entryPointRva === '0x1000');
}

{
  const le16 = (n: number) => [n & 0xff, (n >> 8) & 0xff];
  const le32 = (n: number) => [n & 0xff, (n >> 8) & 0xff, (n >> 16) & 0xff, (n >> 24) & 0xff];
  const le64 = (n: bigint) => Array.from({ length: 8 }, (_, i) => Number((n >> BigInt(8 * i)) & 0xffn));
  const b: number[] = [0x7f, 0x45, 0x4c, 0x46, 2, 1, 1, 0];
  b.push(...new Array(8).fill(0));
  b.push(...le16(2), ...le16(0x3e), ...le32(1));
  b.push(...le64(0x401000n), ...le64(0x40n), ...le64(0n), ...le32(0));
  b.push(...le16(64), ...le16(56), ...le16(1), ...le16(64), ...le16(0), ...le16(0));
  b.push(...le32(1), ...le32(5));
  b.push(...le64(0n), ...le64(0x400000n), ...le64(0x400000n), ...le64(0x1000n), ...le64(0x1000n), ...le64(0x1000n));
  const elf = parseElf(new Uint8Array(b));
  checkTrue('ELF valid', elf.valid);
  checkTrue('ELF class 64', elf.className === 'ELF64');
  checkTrue('ELF machine x86-64', elf.machine === 'x86-64');
  checkTrue('ELF entry', elf.entryPoint === '0x401000');
  checkTrue('ELF segment LOAD', elf.segments.some((s) => s.type === 'LOAD'));
}

{
  const jpeg: number[] = [0xff, 0xd8];
  const exifBody: number[] = [];
  exifBody.push(...Array.from('Exif\0\0', (c) => c.charCodeAt(0)));
  exifBody.push(0x49, 0x49, 0x2a, 0x00, 8, 0, 0, 0);
  const le16 = (n: number) => [n & 0xff, (n >> 8) & 0xff];
  const le32 = (n: number) => [n & 0xff, (n >> 8) & 0xff, (n >> 16) & 0xff, (n >> 24) & 0xff];
  const entries: number[] = [];
  const makeEntry = (tag: number, type: number, count: number) => { entries.push(...le16(tag), ...le16(type), ...le32(count), ...le32(0)); };
  makeEntry(0x010f, 2, 5);
  makeEntry(0x0110, 2, 5);
  makeEntry(0x0132, 2, 20);
  entries.push(...le32(0));
  const dataStart = 8 + 2 + 3 * 12 + 4;
  const setVal = (idx: number, off: number) => {
    entries[idx * 12 + 8] = off & 0xff;
    entries[idx * 12 + 9] = (off >> 8) & 0xff;
    entries[idx * 12 + 10] = (off >> 16) & 0xff;
    entries[idx * 12 + 11] = (off >> 24) & 0xff;
  };
  setVal(0, dataStart);
  setVal(1, dataStart + 6);
  setVal(2, dataStart + 13);
  exifBody.push(...le16(3), ...entries);
  exifBody.push(...Array.from('Canon\0', (c) => c.charCodeAt(0)));
  exifBody.push(...Array.from('EOS 5D\0', (c) => c.charCodeAt(0)));
  exifBody.push(...Array.from('2023:01:01 12:00:00\0', (c) => c.charCodeAt(0)));
  const app1Len = 2 + exifBody.length;
  jpeg.push(0xff, 0xe1, ...le16(app1Len), ...exifBody, 0xff, 0xd9);
  const exif = parseExif(new Uint8Array(jpeg));
  checkTrue('EXIF found', exif.found);
  checkTrue('EXIF Make', exif.entries.some((e) => e.tag === 'Make' && e.value.includes('Canon')));
  checkTrue('EXIF Model', exif.entries.some((e) => e.tag === 'Model' && e.value.includes('EOS')));
  checkTrue('EXIF DateTime', exif.entries.some((e) => e.tag === 'DateTime' && e.value.includes('2023')));
}

// ============ Fitur baru: subnet, hex inspector, regex, entropy, pipeline ============
{
  const { ipv4Subnet, ipv6Subnet, splitSubnet4, ipv4ToInt } = await import('../src/features/cysec-tools/utils/network');
  const r = ipv4Subnet('192.168.1.25', 24)!;
  check('CIDR network', r.network, '192.168.1.0');
  check('CIDR broadcast', r.broadcast, '192.168.1.255');
  check('CIDR usable', String(r.usable), '254');
  check('CIDR wildcard', r.wildcard, '0.0.0.255');
  checkTrue('CIDR binary 32 bit', r.binary.replace(/\s/g, '').length === 32);
  checkTrue('split /24 -> /26 = 4', splitSubnet4('192.168.1.0', 24, 26)?.length === 4);
  const v6 = ipv6Subnet('2001:db8::1', 64)!;
  check('IPv6 network', v6.network, '2001:db8:0:0:0:0:0:0');
  checkTrue('IPv6 prefix 64', v6.prefix === 64);
  checkTrue('ipv4ToInt null', ipv4ToInt('999.1.1.1') === null);
}

{
  const { interpretBytes, searchBytes } = await import('../src/features/cysec-tools/utils/binaryInspector');
  const mz = new Uint8Array([0x4d, 0x5a, 0x90, 0x00]);
  const it = interpretBytes(mz);
  check('MZ u16 LE', String(it.u16le), '23117');
  check('MZ u16 BE', String(it.u16be), '19802');
  checkTrue('searchBytes menemukan pola', searchBytes(new Uint8Array([1, 2, 3, 1, 2]), new Uint8Array([1, 2])).length === 2);
}

{
  const { analyzeRegex, riskLabel } = await import('../src/features/cysec-tools/utils/regexAnalyze');
  const bad = analyzeRegex('(a+)+$');
  checkTrue('ReDoS nested quantifier terdeteksi', bad.warnings.length > 0);
  checkTrue('ReDoS risk high', riskLabel(bad.riskScore) === 'high');
  const ok = analyzeRegex('^\\d{3}-\\d{4}$');
  checkTrue('regex aman tanpa warning', ok.warnings.length === 0);
}

{
  const { blockEntropy } = await import('../src/features/cysec-tools/utils/analysis');
  const zeros = blockEntropy(new Uint8Array(1024), 256);
  checkTrue('entropy blok nol rendah', zeros.every((b) => b.entropy < 0.01));
  const rand = blockEntropy(crypto.getRandomValues(new Uint8Array(1024)), 256);
  checkTrue('entropy blok acak tinggi', rand.every((b) => b.entropy > 7));
  checkTrue('jumlah blok = 4', zeros.length === 4);
}

{
  const { runPipeline } = await import('../src/features/cysec-tools/utils/pipeline');
  const enc = runPipeline('Hello', [{ opId: 'b64-enc', opKey: '' }]);
  check('pipeline b64', enc.value, 'SGVsbG8=');
  const chain = runPipeline('SGVsbG8=', [{ opId: 'b64-dec', opKey: '' }, { opId: 'hex-enc', opKey: '' }]);
  check('pipeline b64->hex', chain.value, '48656c6c6f');
  const err = runPipeline('!!!', [{ opId: 'hex-dec', opKey: '' }]);
  checkTrue('pipeline error ditangkap', err.ok === false && !!err.error);
  const caesarRes = runPipeline('Khoor', [{ opId: 'caesar', opKey: '3' }]);
  check('pipeline caesar', caesarRes.value, 'Nkrru');
  const caesarDec = runPipeline('Khoor', [{ opId: 'caesar', opKey: '-3' }]);
  check('pipeline caesar decode', caesarDec.value, 'Hello');
}
