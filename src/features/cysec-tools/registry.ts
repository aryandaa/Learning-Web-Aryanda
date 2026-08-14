import type { CategoryMeta, ToolCategory, ToolCategoryId, ToolMeta } from './types';

/**
 * Registry tool CySec Tools. sumber kebenaran (data-driven).
 *
 * - Katalog dashboard dirender dari data ini (tanpa import implementasi).
 * - Implementasi tool di-lazy-load per kategori lewat `import.meta.glob`
 *   (lihat pages/ToolPage.tsx), jadi bundle utama tidak menambah berat.
 * - `status: 'unavailable'` menandai tool yang tidak bisa 100% client-side
 *   tanpa dependency tambahan (lihat laporan akhir).
 */

export const CATEGORIES: CategoryMeta[] = [
  {
    id: 'crypto',
    name: 'Cryptography & Encoding',
    shortName: 'Crypto',
    icon: '🔐',
    description: 'Enkripsi, hash, dan encoding. bedakan encoding ≠ encryption ≠ hashing.',
    color: 'from-indigo-500/20 to-violet-500/10 border-indigo-500/30',
  },
  {
    id: 'forensics',
    name: 'Digital Forensics',
    shortName: 'Forensics',
    icon: '🧪',
    description: 'Analisis file: metadata, magic bytes, hash, strings, entropy, EXIF.',
    color: 'from-emerald-500/20 to-teal-500/10 border-emerald-500/30',
  },
  {
    id: 'pcap',
    name: 'PCAP & Network Analysis',
    shortName: 'PCAP',
    icon: '🌐',
    description: 'Analisis traffic .pcap / .pcapng sepenuhnya di browser.',
    color: 'from-cyan-500/20 to-sky-500/10 border-cyan-500/30',
  },
  {
    id: 're',
    name: 'Reverse Engineering',
    shortName: 'Reverse Eng',
    icon: '⚙️',
    description: 'Hex, binary, strings, entropy, dan viewer header PE/ELF/Mach-O.',
    color: 'from-amber-500/20 to-orange-500/10 border-amber-500/30',
  },
  {
    id: 'web',
    name: 'Web Security',
    shortName: 'Web',
    icon: '🛡️',
    description: 'Analisis URL, JWT, header, cookie, CSP/CORS. semua berbasis input manual.',
    color: 'from-rose-500/20 to-pink-500/10 border-rose-500/30',
  },
  {
    id: 'ctf',
    name: 'CTF & Security Research',
    shortName: 'CTF',
    icon: '🚩',
    description: 'Decoder, brute-force cipher, frequency analysis, kalkulator jaringan.',
    color: 'from-fuchsia-500/20 to-purple-500/10 border-fuchsia-500/30',
  },
  {
    id: 'log',
    name: 'Log Analysis',
    shortName: 'Log',
    icon: '📋',
    description: 'Analisis access log, auth.log, dan log aplikasi. lokal di browser.',
    color: 'from-sky-500/20 to-blue-500/10 border-sky-500/30',
  },
  {
    id: 'osint',
    name: 'OSINT',
    shortName: 'OSINT',
    icon: '🔎',
    description: 'Open Source Intelligence untuk pengumpulan, normalisasi, dan korelasi informasi publik.',
    color: 'from-amber-500/20 to-yellow-500/10 border-amber-500/30',
  },
];

const MD5_DISCLAIMER =
  'MD5 is cryptographically broken and should not be used for password storage. This tool is provided for compatibility, forensic analysis, and educational purposes.';

const RSA_DISCLAIMER =
  'Implementasi RSA ini bersifat edukasional (kunci kecil) dan TIDAK aman untuk produksi. Gunakan Web Crypto API / library audited untuk kebutuhan nyata.';

const CHACHA_DISCLAIMER =
  'Implementasi ChaCha20 ini untuk pembelajaran dan CTF. Pastikan nonce unik per kunci dan jangan gunakan untuk data produksi tanpa review kriptografi.';

const TOOLS: ToolMeta[] = [
  // ============ CRYPTOGRAPHY & ENCODING ============
  { id: 'base64', name: 'Base64 Encode/Decode', category: 'crypto', icon: '🔤', description: 'Encode/decode data Base64 (RFC 4648).', tags: ['base64', 'encoding', 'decode', 'encode'] },
  { id: 'base32', name: 'Base32 Encode/Decode', category: 'crypto', icon: '🔤', description: 'Encode/decode Base32 (RFC 4648, alphabet A–Z 2–7).', tags: ['base32', 'encoding'] },
  { id: 'base16', name: 'Base16 / Hex Encode/Decode', category: 'crypto', icon: '🔢', description: 'Encode/decode hex (base16) dari/ke teks.', tags: ['hex', 'base16', 'encoding'] },
  { id: 'url-encoder', name: 'URL Encode/Decode', category: 'crypto', icon: '🔗', description: 'Percent-encoding untuk URL (application/x-www-form-urlencoded).', tags: ['url', 'percent', 'encoding'] },
  { id: 'html-encoder', name: 'HTML Encode/Decode', category: 'crypto', icon: '🏷️', description: 'Encode/decode entity HTML (named + numeric).', tags: ['html', 'entity', 'encoding'] },
  { id: 'ascii-hex', name: 'ASCII ↔ Hex', category: 'crypto', icon: '🔡', description: 'Konversi karakter ASCII ke hex dan sebaliknya.', tags: ['ascii', 'hex', 'converter'] },
  { id: 'binary-text', name: 'Binary ↔ Text', category: 'crypto', icon: '0️⃣1️⃣', description: 'Konversi teks ke biner dan sebaliknya (8 bit/karakter).', tags: ['binary', 'converter'] },
  { id: 'decimal-hex', name: 'Decimal ↔ Hex', category: 'crypto', icon: '🔟', description: 'Konversi bilangan desimal ke hex/oktal/biner.', tags: ['decimal', 'hex', 'converter', 'integer'] },
  { id: 'rot13', name: 'ROT13', category: 'crypto', icon: '🌀', description: 'Caesar shift 13 (simetris).', tags: ['rot13', 'caesar', 'cipher'] },
  { id: 'rot47', name: 'ROT47', category: 'crypto', icon: '🌀', description: 'Rotasi seluruh karakter printable ASCII (33–126) sejauh 47.', tags: ['rot47', 'cipher'] },
  { id: 'caesar', name: 'Caesar Cipher', category: 'crypto', icon: '🗝️', description: 'Enkripsi/dekripsi Caesar dengan shift bebas (0–25).', tags: ['caesar', 'cipher', 'shift'] },
  { id: 'xor-calc', name: 'XOR Calculator', category: 'crypto', icon: '⊕', description: 'XOR byte-per-byte antara dua input / dengan key.', tags: ['xor', 'byte', 'calculator'] },
  { id: 'xor-text', name: 'XOR Text Encoder/Decoder', category: 'crypto', icon: '⊕', description: 'Enkripsi/dekripsi teks dengan XOR key (output hex/base64).', tags: ['xor', 'text', 'cipher'] },
  { id: 'aes', name: 'AES Encrypt/Decrypt', category: 'crypto', icon: '🔒', usesWebCrypto: true, description: 'AES-256-GCM / CBC via Web Crypto API, key dari passphrase (PBKDF2).', tags: ['aes', 'encryption', 'gcm', 'cbc', 'webcrypto'] },
  { id: 'chacha20', name: 'ChaCha20 (Edukasi)', category: 'crypto', icon: '🔀', disclaimer: CHACHA_DISCLAIMER, description: 'Implementasi edukasi ChaCha20 (key 256-bit, nonce 96-bit).', tags: ['chacha20', 'stream', 'cipher'] },
  { id: 'rsa', name: 'RSA (Edukasional)', category: 'crypto', icon: '🔑', disclaimer: RSA_DISCLAIMER, description: 'RSA textbook dengan kunci kecil untuk memahami mekanisme.', tags: ['rsa', 'public-key', 'education'] },
  { id: 'hash-generator', name: 'Hash Generator', category: 'crypto', icon: '#️⃣', usesWebCrypto: true, description: 'SHA-1/256/384/512, MD5, SHA3. input teks, hex, base64, atau file.', tags: ['hash', 'sha', 'md5', 'sha3'] },
  { id: 'hmac', name: 'HMAC Generator', category: 'crypto', icon: '🔐', usesWebCrypto: true, description: 'HMAC-SHA1/256/384/512 dengan secret key.', tags: ['hmac', 'mac', 'sha', 'webcrypto'] },
  { id: 'pbkdf2', name: 'PBKDF2 Key Derivation', category: 'crypto', icon: '🧂', usesWebCrypto: true, description: 'Derivasi key dari password + salt + iterasi.', tags: ['pbkdf2', 'kdf', 'password', 'webcrypto'] },
  { id: 'uuid', name: 'UUID Generator', category: 'crypto', icon: '🆔', description: 'Generate UUID v4 acak (RFC 4122).', tags: ['uuid', 'random', 'generate'] },
  { id: 'random-bytes', name: 'Random Bytes Generator', category: 'crypto', icon: '🎲', description: 'Generate byte acak aman kriptografis (hex/base64).', tags: ['random', 'bytes', 'entropy'] },
  { id: 'sha3', name: 'SHA-3 (Keccak)', category: 'crypto', icon: '🧮', description: 'SHA3-224/256/384/512. implementasi Keccak murni TypeScript.', tags: ['sha3', 'keccak', 'hash'] },

  // ============ DIGITAL FORENSICS ============
  { id: 'file-metadata', name: 'File Metadata Viewer', aliases: ['metadata'], category: 'forensics', icon: '📄', needsFile: true, description: 'Filename, size, MIME, extension, magic bytes, hash, timestamps.', tags: ['metadata', 'file', 'info'] },
  { id: 'file-hash', name: 'File Hash Calculator', category: 'forensics', icon: '#️⃣', needsFile: true, usesWebCrypto: true, description: 'SHA-256/1, MD5 file. diproses lokal.', tags: ['hash', 'file', 'integrity'] },
  { id: 'file-signature', name: 'File Signature / Magic Number', category: 'forensics', icon: '🪄', needsFile: true, description: 'Deteksi jenis file dari magic bytes (signature).', tags: ['magic', 'signature', 'file-type'] },
  { id: 'mime', name: 'MIME Type Detector', category: 'forensics', icon: '📇', needsFile: true, description: 'Deteksi MIME type dari File API + sniffing magic bytes.', tags: ['mime', 'content-type'] },
  { id: 'file-hex', name: 'File Hex Viewer', category: 'forensics', icon: '🔍', needsFile: true, heavy: true, description: 'Lihat isi file sebagai hex + ASCII (offset address).', tags: ['hex', 'viewer', 'file'] },
  { id: 'strings', name: 'Strings Extractor', category: 'forensics', icon: '🔡', needsFile: true, description: 'Ekstrak string ASCII / UTF-16LE dari file (min length).', tags: ['strings', 'extract', 'forensics'] },
  { id: 'entropy', name: 'Entropy Analyzer', category: 'forensics', icon: '🎲', needsFile: true, description: 'Shannon entropy file + histogram byte. deteksi enkripsi/packing.', tags: ['entropy', 'analysis', 'randomness'] },
  { id: 'timestamp', name: 'Timestamp Inspector', category: 'forensics', icon: '🕒', description: 'Konversi timestamp Unix (s/ms) ↔ ISO ↔ tanggal terbaca.', tags: ['timestamp', 'epoch', 'converter'] },
  { id: 'exif', name: 'EXIF Metadata Viewer', category: 'forensics', icon: '📷', needsFile: true, description: 'Baca EXIF image (JPEG): kamera, GPS, software, tanggal.', tags: ['exif', 'image', 'gps', 'camera'] },
  { id: 'pdf-metadata', name: 'PDF Metadata Viewer', category: 'forensics', icon: '📕', needsFile: true, description: 'Baca metadata PDF: title, author, creator, dates.', tags: ['pdf', 'metadata'] },
  { id: 'zip-metadata', name: 'ZIP Archive Metadata', category: 'forensics', icon: '🗜️', needsFile: true, description: 'Daftar entri ZIP: nama, ukuran, metode kompresi, tanggal.', tags: ['zip', 'archive', 'metadata'] },
  { id: 'file-compare', name: 'File / Hash Comparison', category: 'forensics', icon: '⚖️', needsFile: true, description: 'Bandingkan dua file atau dua hash (integrity check).', tags: ['compare', 'hash', 'integrity'] },

  // ============ PCAP ============
  { id: 'pcap', name: 'PCAP Analyzer', category: 'pcap', icon: '🌐', needsFile: true, heavy: true, description: 'Parsing .pcap/.pcapng lokal: protocol, conversations, DNS, HTTP, TLS, TCP flags.', tags: ['pcap', 'pcapng', 'network', 'wireshark', 'tcpdump'] },

  // ============ REVERSE ENGINEERING ============
  { id: 'hex-viewer', name: 'Hex Viewer', category: 're', icon: '🕵️', description: 'Lihat teks/file sebagai hex dump ber-offset.', tags: ['hex', 'viewer'] },
  { id: 'hex-editor', name: 'Hex Editor (Ringan)', category: 're', icon: '✏️', description: 'Edit byte (hex) dengan pratinjau ASCII + export.', tags: ['hex', 'editor', 'bytes'] },
  { id: 'binary-viewer', name: 'Binary Viewer', category: 're', icon: '0️⃣1️⃣', description: 'Lihat data sebagai bit string.', tags: ['binary', 'bits', 'viewer'] },
  { id: 'byte-frequency', name: 'Byte Frequency Analyzer', category: 're', icon: '📊', needsFile: true, description: 'Distribusi frekuensi byte file + histogram.', tags: ['frequency', 'bytes', 'histogram'] },
  { id: 'ascii-viewer', name: 'ASCII Viewer', category: 're', icon: '🔤', description: 'Tampilkan byte sebagai printable ASCII (dot untuk non-printable).', tags: ['ascii', 'viewer'] },
  { id: 'utf8', name: 'UTF-8 Decoder', category: 're', icon: '🌍', description: 'Decode byte hex/base64 menjadi teks UTF-8 (validasi ketat).', tags: ['utf8', 'unicode', 'decode'] },
  { id: 'utf16', name: 'UTF-16 Decoder', category: 're', icon: '🌏', description: 'Decode UTF-16LE/BE (hex) menjadi teks.', tags: ['utf16', 'unicode', 'decode'] },
  { id: 'binary-hex', name: 'Binary ↔ Hex', category: 're', icon: '🔁', description: 'Konversi biner ↔ hex (dengan padding bit).', tags: ['binary', 'hex', 'converter'] },
  { id: 'integer-converter', name: 'Integer Converter', category: 're', icon: '🔢', description: 'Konversi integer: dec/hex/bin/oct, signed/unsigned, endian byte order.', tags: ['integer', 'converter', 'endian'] },
  { id: 'endianness', name: 'Endianness Converter', category: 're', icon: '↔️', description: 'Ubah byte order 16/32/64-bit (little ↔ big endian).', tags: ['endian', 'byte-order', 'converter'] },
  { id: 'xor-analyzer', name: 'XOR Byte Analyzer', category: 're', icon: '⊕', description: 'Brute-force single-byte XOR + skor kemiripan teks.', tags: ['xor', 'bruteforce', 'cryptanalysis'] },
  { id: 'pe-viewer', name: 'PE Header Viewer', category: 're', icon: '🪟', needsFile: true, description: 'Parse header PE (DOS, COFF, optional, sections, imports) (read-only).', tags: ['pe', 'exe', 'windows', 'portable-executable'] },
  { id: 'elf-viewer', name: 'ELF Header Viewer', category: 're', icon: '🐧', needsFile: true, description: 'Parse header ELF (class, endian, entry, program/section headers) (read-only).', tags: ['elf', 'linux', 'binary'] },
  { id: 'macho-viewer', name: 'Mach-O Header Viewer', category: 're', icon: '🍎', needsFile: true, status: 'partial', statusNote: 'Menampilkan header dasar 64-bit LE (magic, cputype, filetype, load commands count). Parsing penuh load commands belum disertakan.', description: 'Parse header dasar Mach-O 64-bit (read-only).', tags: ['macho', 'macos', 'binary'] },
  { id: 'printable-strings', name: 'Printable Strings Scanner', category: 're', icon: '📜', needsFile: true, description: 'Scan string printable (ASCII) dari data hex atau file.', tags: ['strings', 'printable', 'scan'] },

  // ============ WEB SECURITY ============
  { id: 'url-parser', name: 'URL Parser', category: 'web', icon: '🔗', description: 'Urai URL menjadi komponen + catatan keamanan (scheme, userinfo, port…).', tags: ['url', 'parse', 'components'] },
  { id: 'query-parser', name: 'Query Parameter Parser', category: 'web', icon: '❓', description: 'Parse query string, deteksi duplikat & encoding aneh.', tags: ['query', 'parameter', 'parse'] },
  { id: 'jwt', name: 'JWT Decoder / Inspector', category: 'web', icon: '🎫', usesWebCrypto: true, description: 'Decode header/payload JWT, verifikasi signature HS*, cek claims.', tags: ['jwt', 'token', 'auth', 'json-web-token'] },
  { id: 'http-headers', name: 'HTTP Header Analyzer', category: 'web', icon: '📨', description: 'Parse header HTTP + cek security headers penting.', tags: ['http', 'headers', 'security'] },
  { id: 'cookie-analyzer', name: 'Cookie Analyzer', category: 'web', icon: '🍪', description: 'Parse Cookie/Set-Cookie, cek flag HttpOnly/Secure/SameSite.', tags: ['cookie', 'session', 'security'] },
  { id: 'user-agent', name: 'User-Agent Parser', category: 'web', icon: '🖥️', description: 'Deteksi browser, OS, dan device dari string User-Agent.', tags: ['user-agent', 'browser', 'parse'] },
  { id: 'csp', name: 'CSP Analyzer', category: 'web', icon: '🚧', description: 'Analisis Content-Security-Policy: directive, unsafe-*, missing default-src.', tags: ['csp', 'content-security-policy', 'headers'] },
  { id: 'cors', name: 'CORS Configuration Analyzer', category: 'web', icon: '🌍', description: 'Evaluasi konfigurasi CORS dari header pasted.', tags: ['cors', 'cross-origin', 'headers'] },
  { id: 'security-headers', name: 'Security Headers Checker', category: 'web', icon: '🛡️', description: 'Skor konfigurasi security headers dari header respons.', tags: ['security-headers', 'hsts', 'x-frame-options', 'check'] },
  { id: 'html-entity', name: 'HTML Entity Encode/Decode', category: 'web', icon: '🏷️', description: 'Encode/decode entity HTML untuk konteks aman.', tags: ['html', 'entity', 'encoding'] },
  { id: 'js-uri', name: 'JavaScript URI Decoder', category: 'web', icon: '🕹️', description: 'Decode URI ber-scheme javascript: + deteksi obfuscation.', tags: ['javascript', 'uri', 'obfuscation'] },
  { id: 'url-normalizer', name: 'URL Normalization Analyzer', category: 'web', icon: '🧹', description: 'Normalisasi URL (default port, dot-segments, lowercase) + diff.', tags: ['url', 'normalize', 'canonical'] },
  { id: 'open-redirect', name: 'Open Redirect Analyzer', category: 'web', icon: '↪️', description: 'Deteksi pola open redirect pada URL (//, \\, javascript:, data:).', tags: ['open-redirect', 'url', 'security'] },
  { id: 'path-traversal', name: 'Path Traversal Analyzer', category: 'web', icon: '🗂️', description: 'Scan pola traversal (../, %2e%2e, ..%2f, null byte) (edukasi).', tags: ['path-traversal', 'lfi', 'security'] },
  { id: 'sqli-analyzer', name: 'SQLi Payload Analyzer', category: 'web', icon: '🗄️', description: 'Highlighter/analisis pola payload SQL injection (edukasi).', tags: ['sqli', 'sql', 'payload', 'education'] },
  { id: 'xss-analyzer', name: 'XSS Payload Analyzer', category: 'web', icon: '⚡', description: 'Analisis pola payload XSS (event handler, javascript:, encoding) (edukasi).', tags: ['xss', 'payload', 'education'] },
  { id: 'regex-tester', name: 'Regex Tester', category: 'web', icon: '🧩', description: 'Uji regex JavaScript dengan match highlight & captures.', tags: ['regex', 'regular-expression', 'tester'] },
  { id: 'http-request', name: 'HTTP Request Formatter', category: 'web', icon: '📤', description: 'Parse raw HTTP request → struktur terbaca (line, headers, body).', tags: ['http', 'request', 'formatter'] },
  { id: 'http-response', name: 'HTTP Response Formatter', category: 'web', icon: '📥', description: 'Parse raw HTTP response → status, headers, body.', tags: ['http', 'response', 'formatter'] },

  // ============ CTF TOOLS ============
  { id: 'ctf-caesar', name: 'Caesar Decoder (Brute-force)', category: 'ctf', icon: '🗝️', description: 'Coba semua 25 shift + skor kemiripan bahasa.', tags: ['caesar', 'bruteforce', 'ctf'] },
  { id: 'ctf-rot', name: 'ROT Decoder', category: 'ctf', icon: '🌀', description: 'ROT1–25 dan ROT13/47 sekaligus.', tags: ['rot', 'bruteforce', 'ctf'] },
  { id: 'ctf-xor', name: 'XOR Solver', category: 'ctf', icon: '⊕', description: 'Single-byte XOR + multi-byte dengan panjang key tertebak.', tags: ['xor', 'solver', 'cryptanalysis'] },
  { id: 'base64-detector', name: 'Base64 Detector', category: 'ctf', icon: '🔍', description: 'Deteksi apakah teks adalah Base64 valid + decode percobaan.', tags: ['base64', 'detect', 'ctf'] },
  { id: 'encoding-detector', name: 'Encoding Detector', category: 'ctf', icon: '🧭', description: 'Tebak kemungkinan encoding: hex, base64, URL, binary, morse…', tags: ['encoding', 'detect', 'ctf'] },
  { id: 'frequency', name: 'Frequency Analyzer', category: 'ctf', icon: '📊', description: 'Frekuensi karakter/letter untuk kriptanalisis.', tags: ['frequency', 'cryptanalysis', 'letters'] },
  { id: 'substitution', name: 'Substitution Cipher Helper', category: 'ctf', icon: '🔤', description: 'Monoalphabetic substitution: mapping + bantuan frekuensi.', tags: ['substitution', 'cipher', 'helper'] },
  { id: 'vigenere', name: 'Vigenère Cipher', category: 'ctf', icon: '🔡', description: 'Enkripsi/dekripsi Vigenère dengan key.', tags: ['vigenere', 'cipher', 'polyalphabetic'] },
  { id: 'rail-fence', name: 'Rail Fence Cipher', category: 'ctf', icon: '🛤️', description: 'Enkripsi/dekripsi rail fence (zig-zag) dengan jumlah rails.', tags: ['rail-fence', 'transposition', 'cipher'] },
  { id: 'atbash', name: 'Atbash', category: 'ctf', icon: '🪞', description: 'Substitusi A↔Z (simetris).', tags: ['atbash', 'cipher', 'hebrew'] },
  { id: 'morse', name: 'Morse Code Encode/Decode', category: 'ctf', icon: '📡', description: 'Encode/decode Morse (A–Z, 0–9, tanda baca dasar).', tags: ['morse', 'encode', 'decode'] },
  { id: 'bacon', name: 'Bacon Cipher', category: 'ctf', icon: '🥓', description: 'Encode/decode Bacon (alphabet 24 huruf, A/B).', tags: ['bacon', 'cipher', 'binary'] },
  { id: 'unicode-analyzer', name: 'Unicode Analyzer', category: 'ctf', icon: '🌐', description: 'Per-karakter: codepoint, UTF-8/16 bytes, kategori dasar.', tags: ['unicode', 'codepoint', 'analysis'] },
  { id: 'timestamp-converter', name: 'Timestamp Converter', category: 'ctf', icon: '🕒', description: 'Unix s/ms ↔ ISO 8601 ↔ local time.', tags: ['timestamp', 'epoch', 'converter'] },
  { id: 'ip-converter', name: 'IP Converter', category: 'ctf', icon: '🌐', description: 'IPv4: dotted ↔ decimal ↔ hex ↔ binary.', tags: ['ip', 'ipv4', 'converter'] },
  { id: 'subnet', name: 'IPv4 Subnet Calculator', category: 'ctf', icon: '🧮', description: 'Hitung network/broadcast/host range dari IP + prefix.', tags: ['subnet', 'ipv4', 'network'] },
  { id: 'cidr', name: 'CIDR Calculator', category: 'ctf', icon: '📐', description: 'Ekspansi CIDR: daftar network, mask, usable hosts.', tags: ['cidr', 'ipv4', 'calculator'] },
  { id: 'port-reference', name: 'Port Number Reference', category: 'ctf', icon: '🚪', description: 'Tabel port umum + search.', tags: ['port', 'reference', 'tcp', 'udp'] },
  { id: 'ascii-table', name: 'ASCII Table', category: 'ctf', icon: '🔠', description: 'Tabel ASCII lengkap 0–127 (char, dec, hex, bin).', tags: ['ascii', 'table', 'reference'] },
  { id: 'unicode-table', name: 'Unicode Table', category: 'ctf', icon: '🔣', description: 'Eksplorasi Unicode: range & block, codepoint info.', tags: ['unicode', 'table', 'reference'] },

  // ============ LOG ANALYZER ============
  { id: 'log-analyzer', name: 'Log Analyzer', category: 'log', icon: '📋', needsFile: true, heavy: true, description: 'Apache/Nginx access log, auth.log, log generik. IP, status, brute-force, timeline.', tags: ['log', 'apache', 'nginx', 'auth', 'analysis'] },
];

/** Index tool by id. */
export const TOOL_INDEX: Record<string, ToolMeta> = Object.fromEntries(
  TOOLS.map((t) => [t.id, t])
);

/** Tool per kategori (canonical: satu tool = satu kategori). */
export function toolsInCategory(category: ToolCategoryId): ToolMeta[] {
  return TOOLS.filter((t) => t.category === category).sort((a, b) => a.name.localeCompare(b.name));
}

export function getCategory(id: string): CategoryMeta {
  const c = CATEGORIES.find((c) => c.id === (id as ToolCategoryId));
  if (!c) throw new Error(`Kategori tidak dikenal: ${id}`);
  return c;
}

export function getTool(id: string): ToolMeta | undefined {
  return TOOL_INDEX[id];
}

/** Resolve id canonical (dukungan alias route lama). */
export function resolveToolId(id: string): string {
  if (TOOL_INDEX[id]) return id;
  const match = TOOLS.find((t) => (t.aliases ?? []).includes(id));
  return match ? match.id : id;
}

export function allCategories(): ToolCategory[] {
  return CATEGORIES.map((meta) => ({ meta, tools: toolsInCategory(meta.id) }));
}

export function allTools(): ToolMeta[] {
  return TOOLS;
}
