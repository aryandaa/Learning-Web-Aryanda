import type { OsintCategory, OsintCategoryId, OsintCategoryMeta, OsintToolMeta } from './types';

/**
 * Registry tool OSINT — data-driven. Tambah tool baru cukup dengan menambah
 * satu object di daftar TOOLS + komponen di `tools/<id>/index.tsx`.
 * Lihat LaporanUpdate.md §OSINT-DEV untuk panduan lengkap.
 */

export const CATEGORIES: OsintCategoryMeta[] = [
  { id: 'domain', name: 'Domain Intelligence', shortName: 'Domain', icon: '🌐', description: 'Analisis domain: registrable, subdomain, TLD, IDN/punycode.', color: 'from-sky-500/20 to-blue-500/10 border-sky-500/30' },
  { id: 'dns', name: 'DNS Intelligence', shortName: 'DNS', icon: '🧭', description: 'DNS records via DNS-over-HTTPS publik (A, AAAA, MX, TXT, …).', color: 'from-cyan-500/20 to-teal-500/10 border-cyan-500/30' },
  { id: 'ip', name: 'IP Intelligence', shortName: 'IP', icon: '📡', description: 'Klasifikasi IPv4/IPv6 + ASN/negara dari sumber publik.', color: 'from-indigo-500/20 to-violet-500/10 border-indigo-500/30' },
  { id: 'url', name: 'URL Intelligence', shortName: 'URL', icon: '🔗', description: 'Parse & analisis URL: param, encoding, pola mencurigakan.', color: 'from-emerald-500/20 to-green-500/10 border-emerald-500/30' },
  { id: 'username', name: 'Username OSINT', shortName: 'Username', icon: '👤', description: 'Public presence username di platform publik (bukan data privat).', color: 'from-fuchsia-500/20 to-pink-500/10 border-fuchsia-500/30' },
  { id: 'email', name: 'Email Intelligence', shortName: 'Email', icon: '✉️', description: 'Validasi, disposable-domain, role-based — tanpa bocorkan data.', color: 'from-rose-500/20 to-red-500/10 border-rose-500/30' },
  { id: 'metadata', name: 'Metadata Analysis', shortName: 'Metadata', icon: '📄', description: 'Metadata file (EXIF, PDF, ZIP, Office) — 100% lokal.', color: 'from-amber-500/20 to-orange-500/10 border-amber-500/30' },
  { id: 'ioc', name: 'IOC Extraction', shortName: 'IOC', icon: '🩸', description: 'Ekstrak IP, domain, URL, hash, CVE, ATT&CK dari teks/log.', color: 'from-red-500/20 to-rose-500/10 border-red-500/30' },
  { id: 'threat', name: 'Threat Intelligence', shortName: 'Threat Intel', icon: '☠️', description: 'Korelasi IOC ke sumber threat intel publik (link, bukan auto-send).', color: 'from-slate-500/20 to-zinc-500/10 border-slate-500/30' },
  { id: 'hash', name: 'Hash Intelligence', shortName: 'Hash', icon: '#️⃣', description: 'Deteksi tipe hash + lookup link (VT, MalwareBazaar, dll).', color: 'from-purple-500/20 to-fuchsia-500/10 border-purple-500/30' },
  { id: 'text', name: 'Text Intelligence', shortName: 'Text', icon: '📝', description: 'Statistik teks + ekstraksi IOC + regex + normalisasi.', color: 'from-teal-500/20 to-cyan-500/10 border-teal-500/30' },
  { id: 'analysis', name: 'Analysis & Workspace', shortName: 'Analysis', icon: '🧠', description: 'Timeline, workspace IOC, dan case lokal untuk investigasi.', color: 'from-blue-500/20 to-indigo-500/10 border-blue-500/30' },
];

const OSINT_DISCLAIMER =
  'Modul ini untuk pembelajaran, CTF, forensik digital, dan analisis defensif terhadap aset yang Anda miliki/diizinkan. Jangan gunakan untuk doxxing, credential attack, atau aktivitas yang melanggar hukum. Presence username ≠ identitas orang yang sama.';

const TOOLS: OsintToolMeta[] = [
  // ---- Domain ----
  { id: 'domain', title: 'Domain Analyzer', description: 'Normalisasi domain, registrable domain, TLD, subdomain, IDN/punycode, karakter mencurigakan, dan sumber publik terkait.', category: 'domain', path: '/osint/domain', icon: '🌐', tags: ['domain', 'recon', 'passive', 'whois'], privacy: 'hybrid', privacyNote: 'Parsing lokal; pengecekan DNS/WHOIS opsional via sumber publik.', disclaimer: OSINT_DISCLAIMER },
  // ---- DNS ----
  { id: 'dns', title: 'DNS Analyzer', description: 'Query A, AAAA, CNAME, MX, NS, TXT, SOA, CAA, PTR via DNS-over-HTTPS publik (Cloudflare / Google).', category: 'dns', path: '/osint/dns', icon: '🧭', tags: ['dns', 'doh', 'records', 'mx', 'txt'], privacy: 'external', privacyNote: 'Query dikirim ke resolver DoH publik pilihan Anda (Cloudflare atau Google).' },
  // ---- IP ----
  { id: 'ip', title: 'IP Analyzer', description: 'Validasi & klasifikasi IPv4/IPv6 (private, loopback, multicast, reserved) + ASN/negara via ipwho.is + reverse DNS.', category: 'ip', path: '/osint/ip', icon: '📡', tags: ['ip', 'asn', 'geo', 'ipv4', 'ipv6'], privacy: 'hybrid', privacyNote: 'Klasifikasi lokal; lookup ASN/negara ke ipwho.is; PTR via DoH.' },
  // ---- URL ----
  { id: 'url', title: 'URL Analyzer', description: 'Parse komponen URL, decode bertingkat, deteksi IP-URL, punycode, shortener, double-encoding, scheme berbahaya.', category: 'url', path: '/osint/url', icon: '🔗', tags: ['url', 'parse', 'phishing', 'encoding'], privacy: 'local', privacyNote: 'Proses lokal. Tidak ada URL yang dibuka otomatis.' },
  // ---- Username ----
  { id: 'username', title: 'Username Analyzer', description: 'Daftar platform publik + template profil untuk memeriksa presence username secara manual.', category: 'username', path: '/osint/username', icon: '👤', tags: ['username', 'social', 'presence'], privacy: 'local', privacyNote: 'Tidak ada pengecekan otomatis/scraping — status selalu "requires manual verification".' },
  // ---- Email ----
  { id: 'email', title: 'Email Analyzer', description: 'Validasi sintaks, normalized email, disposable-domain (dataset lokal), role-based, klasifikasi provider.', category: 'email', path: '/osint/email', icon: '✉️', tags: ['email', 'disposable', 'validation'], privacy: 'local', privacyNote: 'Dataset disposable dibundel lokal. Tidak ada permintaan ke layanan eksternal.', disclaimer: 'Jangan gunakan untuk password reset / account takeover / credential discovery. Ini alat analisis format, bukan pembobolan.' },
  // ---- Metadata ----
  { id: 'metadata', title: 'Metadata Analyzer', description: 'Metadata file (JPEG/PNG/PDF/DOCX/XLSX/ZIP/TXT): EXIF/GPS, PDF author, Office author, hash — 100% lokal.', category: 'metadata', path: '/osint/metadata', icon: '📄', tags: ['metadata', 'exif', 'pdf', 'office', 'forensics'], privacy: 'local', needsFile: true, privacyNote: 'File diproses di browser (ArrayBuffer) dan tidak pernah di-upload.' },
  // ---- IOC ----
  { id: 'ioc', title: 'IOC Extractor', description: 'Ekstrak & dedup IPv4/IPv6, domain, URL, email, MD5/SHA1/SHA256, CVE, ATT&CK, file path dari teks/log.', category: 'ioc', path: '/osint/ioc', icon: '🩸', tags: ['ioc', 'extract', 'cti', 'regex'], privacy: 'local', privacyNote: 'Proses lokal penuh.' },
  // ---- Threat Intel ----
  { id: 'threat-intel', title: 'Threat Intel Hub', description: 'Deteksi tipe IOC lalu sediakan tombol lookup ke VirusTotal, AbuseIPDB, URLScan, OTX, MalwareBazaar, ThreatFox.', category: 'threat', path: '/osint/threat-intel', icon: '☠️', tags: ['threat-intel', 'ioc', 'vt', 'abuseipdb'], privacy: 'local', privacyNote: 'Tidak ada data IOC dikirim otomatis; lookup terjadi di situs tujuan saat Anda mengklik.' },
  // ---- Hash ----
  { id: 'hash', title: 'Hash Analyzer', description: 'Deteksi algoritma hash (MD5/SHA-1/SHA-256/SHA-512/NTLM) + link lookup VirusTotal, MalwareBazaar, Hybrid Analysis.', category: 'hash', path: '/osint/hash', icon: '#️⃣', tags: ['hash', 'detect', 'lookup'], privacy: 'local', privacyNote: 'Deteksi lokal; lookup di situs tujuan saat diklik. Tidak ada cracking.' },
  // ---- Text ----
  { id: 'text', title: 'Text Analyzer', description: 'Word/line/char count, ekstraksi URL/domain/email/IP/hash/username/tanggal, regex, normalize, dedup, export.', category: 'text', path: '/osint/text', icon: '📝', tags: ['text', 'stats', 'extract', 'regex'], privacy: 'local', privacyNote: 'Proses lokal penuh.' },
  // ---- Analysis ----
  { id: 'timeline', title: 'Timeline Analyzer', description: 'Deteksi timestamp (ISO, RFC, DD/MM/YYYY), normalisasi ISO 8601, visual timeline, filter & export.', category: 'analysis', path: '/osint/timeline', icon: '🕐', tags: ['timeline', 'timestamp', 'normalize'], privacy: 'local', privacyNote: 'Proses lokal penuh.' },
  { id: 'workspace', title: 'OSINT Workspace', description: 'Kumpulkan IOC dalam satu tempat: kelompokkan domain/IP/URL/hash/email/username, tag, export, clear.', category: 'analysis', path: '/osint/workspace', icon: '🗂️', tags: ['workspace', 'ioc', 'organize'], privacy: 'local', privacyNote: 'Disimpan hanya di localStorage browser Anda.' },
  { id: 'case', title: 'OSINT Case', description: 'Case investigasi lokal: title, deskripsi, IOC, notes, sources, timeline events — export/import JSON.', category: 'analysis', path: '/osint/case', icon: '📁', tags: ['case', 'investigation', 'export'], privacy: 'local', privacyNote: 'Disimpan hanya di localStorage browser Anda.' },
];

export const OSINT_INDEX: Record<string, OsintToolMeta> = Object.fromEntries(TOOLS.map((t) => [t.id, t]));

export function allOsintTools(): OsintToolMeta[] {
  return TOOLS;
}

export function osintToolsInCategory(category: OsintCategoryId): OsintToolMeta[] {
  return TOOLS.filter((t) => t.category === category).sort((a, b) => a.title.localeCompare(b.title));
}

export function getOsintTool(id: string): OsintToolMeta | undefined {
  return OSINT_INDEX[id];
}

export function getOsintCategory(id: string): OsintCategoryMeta {
  const c = CATEGORIES.find((c) => c.id === (id as OsintCategoryId));
  if (!c) throw new Error(`Kategori tidak dikenal: ${id}`);
  return c;
}

export function allOsintCategories(): OsintCategory[] {
  return CATEGORIES.map((meta) => ({ meta, tools: osintToolsInCategory(meta.id) }));
}
