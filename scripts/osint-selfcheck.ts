/** Verifikasi cepat util OSINT (murni logika, tanpa network). */
import { analyzeDomain } from '../src/features/osint/utils/domain';
import { analyzeIp, ipv4ToInt } from '../src/features/osint/utils/ip';
import { analyzeEmail } from '../src/features/osint/utils/email';
import { extractIocs, iocTypeLabel } from '../src/features/osint/utils/ioc';
import { detectHash } from '../src/features/osint/utils/hash';
import { textStats, extractEntities } from '../src/features/osint/utils/text';
import { extractTimeline } from '../src/features/osint/utils/timeline';
import { analyzeUrlIntel } from '../src/features/osint/utils/url';
import { validateUsername, profileUrl, USERNAME_PLATFORMS } from '../src/features/osint/utils/username';

let pass = 0;
let fail = 0;
function check(name: string, got: unknown, expected: unknown) {
  const g = JSON.stringify(got);
  const e = JSON.stringify(expected);
  if (g === e) {
    pass++;
    console.log(`  ✅ ${name}`);
  } else {
    fail++;
    console.log(`  ❌ ${name}\n     got:      ${g}\n     expected: ${e}`);
  }
}
function checkTrue(name: string, cond: boolean) {
  if (cond) { pass++; console.log(`  ✅ ${name}`); }
  else { fail++; console.log(`  ❌ ${name}`); }
}

console.log('Domain:');
{
  const d = analyzeDomain('example.com');
  checkTrue('domain valid', d.valid);
  check('registrable', d.registrableDomain, 'example.com');
  check('tld', d.tld, 'com');
  const d2 = analyzeDomain('api.v1.example.co.uk');
  check('registrable multi-part tld', d2.registrableDomain, 'example.co.uk');
  check('subdomain', d2.subdomain, 'api.v1');
  const d3 = analyzeDomain('https://www.example.com/path');
  check('protocol diekstrak', d3.protocol, 'https');
  checkTrue('www tetap subdomain', d3.subdomain === 'www');
  checkTrue('IP ditolak', analyzeDomain('192.168.1.1').valid === false);
}

console.log('IP:');
{
  checkTrue('ipv4ToInt', ipv4ToInt('192.168.1.1') === 0xc0a80101);
  checkTrue('ipv4ToInt invalid', ipv4ToInt('999.1.1.1') === null);
  const priv = analyzeIp('10.0.0.1');
  checkTrue('private terdeteksi', priv.classifications.some((c) => c.label.includes('Private')));
  const loop = analyzeIp('127.0.0.1');
  checkTrue('loopback terdeteksi', loop.classifications.some((c) => c.label.includes('Loopback')));
  const doc = analyzeIp('192.0.2.5');
  checkTrue('documentation terdeteksi', doc.classifications.some((c) => c.label.includes('Documentation')));
  checkTrue('ipv6 loopback', analyzeIp('::1').classifications.some((c) => c.label.includes('Loopback')));
  checkTrue('ipv6 valid', analyzeIp('2001:db8::1').valid);
  checkTrue('ipv6 invalid', analyzeIp('zzz').valid === false);
}

console.log('Email:');
{
  const e = analyzeEmail('admin@mailinator.com');
  checkTrue('email valid', e.valid);
  checkTrue('disposable terdeteksi', e.disposable);
  checkTrue('role-based terdeteksi', e.roleBased);
  const e2 = analyzeEmail('user@example.com');
  checkTrue('example.com tidak disposable', !e2.disposable);
  checkTrue('email invalid', analyzeEmail('bukan-email').valid === false);
}

console.log('IOC extraction:');
{
  const text = `IP 8.8.8.8 dan 8.8.8.8 lagi\nDomain evil.example.com dan https://evil.example.com/x\nhash d41d8cd98f00b204e9800998ecf8427e\nCVE-2023-1234 T1059.001`;
  const iocs = extractIocs(text);
  checkTrue('ipv4 diekstrak', iocs.some((i) => i.type === 'ipv4' && i.value === '8.8.8.8' && i.count === 2));
  checkTrue('domain diekstrak', iocs.some((i) => i.type === 'domain' && i.value === 'evil.example.com'));
  checkTrue('url diekstrak', iocs.some((i) => i.type === 'url'));
  checkTrue('hash diekstrak', iocs.some((i) => i.type === 'hash-md5'));
  checkTrue('cve diekstrak', iocs.some((i) => i.type === 'cve'));
  checkTrue('attack diekstrak', iocs.some((i) => i.type === 'attack'));
  checkTrue('dedup', iocs.filter((i) => i.type === 'ipv4').length === 1);
  check('label', iocTypeLabel('hash-sha256'), 'Hash SHA-256');
}

console.log('Hash:');
{
  check('md5', detectHash('d41d8cd98f00b204e9800998ecf8427e').candidates[0].algorithm, 'MD5');
  check('sha256', detectHash('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855').candidates[0].algorithm, 'SHA-256');
  check('sha1', detectHash('da39a3ee5e6b4b0d3255bfef95601890afd80709').candidates[0].algorithm, 'SHA-1');
  check('sha512', detectHash('cf83e1357eefb8bdf1542850d66d8007d620e4050b5715dc83f4a921d36ce9ce47d0d13c5d85f2b0ff8318d2877eec2f63b931bd47417a81a538327af927da3e').candidates[0].algorithm, 'SHA-512');
}

console.log('Text:');
{
  const stats = textStats('hello world\nfoo bar baz');
  check('words', stats.words, 5);
  check('lines', stats.lines, 2);
  const ents = extractEntities('visit https://x.com dan email a@b.co ip 1.2.3.4');
  checkTrue('url terdeteksi', ents.some((g) => g.label === 'URLs' && g.values.includes('https://x.com')));
  checkTrue('email terdeteksi', ents.some((g) => g.label === 'Emails' && g.values.includes('a@b.co')));
}

console.log('Timeline:');
{
  const ev = extractTimeline('a 2026-08-13 10:20:00 x\nb 2026-08-13T10:21:00Z y\nc 13/08/2026 10:22 z', { dayFirst: true });
  check('jumlah event', ev.length, 3);
  checkTrue('normalisasi ISO', ev[0].iso.startsWith('2026-08-13T10:20:00'));
  checkTrue('iso Z dipertahankan', ev.some((e) => e.iso.startsWith('2026-08-13T10:21:00')));
}

console.log('URL:');
{
  const u = analyzeUrlIntel('https://user:pass@example.com/a?next=https://evil.example#f');
  checkTrue('url valid', u.valid);
  checkTrue('userinfo', u.components.some((c) => c.name === 'Username' && c.value === 'user'));
  checkTrue('open redirect terdeteksi', u.issues.some((i) => i.includes('open redirect')));
  const short = analyzeUrlIntel('https://bit.ly/abc');
  checkTrue('shortener terdeteksi', short.issues.some((i) => i.includes('shortener')));
  checkTrue('url invalid', analyzeUrlIntel('notaurl').valid === false);
}

console.log('Username:');
{
  checkTrue('validate kosong', validateUsername('') !== null);
  checkTrue('validate ok', validateUsername('aryanda_1') === null);
  const url = profileUrl(USERNAME_PLATFORMS[0], 'aryanda');
  check('profile url', url, 'https://github.com/aryanda');
}

console.log(`\nOSINT selfcheck: ${pass} pass, ${fail} fail`);
if (fail > 0) process.exit(1);
