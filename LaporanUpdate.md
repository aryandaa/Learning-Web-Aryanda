# Laporan Update — Fitur CySec Tools (Learning-Web Aryanda)

> Dokumen ini adalah **handoff report** untuk AI berikutnya. Bacalah **dulu** sebelum
> menyentuh kode, agar tidak merusak yang sudah ada dan tidak bingung dengan arsitektur.
> Project ini **SUDAH STABIL** — tambahkan fitur secara modular, jangan rewrite.

---

## 1. Ringkasan

Fitur **CySec Tools** telah ditambahkan sebagai modul terisolasi di
`src/features/cysec-tools/`, **100% client-side**, tanpa backend, tanpa database,
tanpa dependency baru. Semua processing terjadi di browser (File API → ArrayBuffer →
parser TypeScript → hasil). Deployment Vercel static tetap kompatibel.

Status akhir:

| Pemeriksaan | Hasil |
|---|---|
| `npm run build` (tsc + vite) | ✅ Sukses |
| `npx tsc --noEmit` | ✅ 0 error |
| `npm run cysec:check` (selfcheck 62 kasus) | ✅ 62 pass / 0 fail |
| Code-splitting lazy per kategori | ✅ 7 chunk terpisah |
| Route /cysec-tools + semua tool | ✅ 200 di preview |
| Fitur existing (docs, editor, graph, search, sync) | ✅ Tidak disentuh |

---

## 2. Cara verifikasi cepat

```bash
npm run build            # build penuh (tsc --noEmit && vite build)
npm run cysec:check      # regression test kriptografi & parser (62 kasus)
npm run dev              # coba di browser: http://localhost:4173/cysec-tools
```

Route utama:

- `/cysec-tools` — dashboard katalog + search + recent/favorites (localStorage)
- `/cysec-tools/category/:categoryId` — halaman kategori
- `/cysec-tools/:toolId` — halaman tool (lazy-load chunk per kategori)

---

## 3. Arsitektur

```
src/features/cysec-tools/
├── types.ts                  # ToolMeta, CategoryMeta, ToolCategoryId, ToolStatus
├── registry.ts               # DATA-DRIVEN catalog: kategori + metadata semua tool
├── hooks/
│   └── useToolHistory.ts     # recently used + favorites (localStorage, tanpa backend)
├── utils/
│   ├── bytes.ts              # hex/base64/base32/utf8/binary + toArrayBuffer
│   ├── encoding.ts           # URL, HTML entity, ROT/Caesar/Atbash/Morse/Bacon/RailFence/Vigenère/substitution/frequency
│   ├── crypto.ts             # Web Crypto (AES/SHA/HMAC/PBKDF2/random) + MD5/SHA-3/ChaCha20/RSA (edukasi)
│   ├── analysis.ts           # entropy, byte/char frequency, strings extractor, magic number/MIME, unicode
│   ├── files.ts              # metadata file, EXIF, PDF metadata, ZIP listing, timestamp
│   ├── pcap.ts               # parser PCAP & PCAPNG + analisis agregat (client-side)
│   ├── binaryFormats.ts      # PE / ELF / Mach-O header parser (read-only)
│   ├── web.ts                # JWT, headers, cookie, UA, CSP, CORS, security headers, SQLi/XSS analyzer, URL analysis
│   └── logparse.ts           # Apache/Nginx access log, auth.log, log generik
├── components/
│   ├── ui.tsx                # Panel, LabeledTextarea, Copy/Clear/Swap/Download, KeyValueTable, ToolNotes, PrivacyBadge
│   ├── FileDrop.tsx          # upload drag&drop aksesibel (ArrayBuffer lokal, warning file besar)
│   ├── TransformTool.tsx     # kerangka generik tool encode/decode/cipher
│   └── FileAnalyzer.tsx      # kerangka generik tool analisis file
├── pages/
│   ├── CySecToolsPage.tsx    # dashboard (route /cysec-tools)
│   ├── CategoryPage.tsx      # (route /cysec-tools/category/:categoryId)
│   └── ToolPage.tsx          # resolver + lazy-load + sidebar kategori (route /cysec-tools/:toolId)
└── tools/
    ├── crypto/index.tsx      # chunk lazy: encoding + kriptografi
    ├── forensics/index.tsx   # chunk lazy: metadata/hash/signature/exif/pdf/zip/dll
    ├── pcap/index.tsx        # chunk lazy: PCAP analyzer (tab: summary/packets/conversations/dns/http/hosts/timeline/suspicious)
    ├── re/index.tsx          # chunk lazy: hex/binary/integer/endian/xor/PE/ELF/Mach-O
    ├── web/index.tsx         # chunk lazy: URL/JWT/headers/cookie/CSP/CORS/regex/HTTP formatter
    ├── ctf/index.tsx         # chunk lazy: brute-force cipher, detector, subnet/CIDR, tabel referensi
    └── log/index.tsx         # chunk lazy: log analyzer
```

**Konsep kunci:**

- **Registry data-driven**: `registry.ts` mendeklarasikan semua tool
  (`id`, `name`, `category`, `description`, `icon`, `tags`, `status`, `disclaimer`).
  Katalog dashboard & halaman kategori dirender dari sini — tanpa import implementasi.
- **Lazy loading**: ToolPage memakai `import.meta.glob('../tools/*/index.tsx')` →
  tiap kategori menjadi chunk terpisah. Bundle utama hanya +~40 KB (gzip).
- **Satu tool boleh muncul di beberapa kategori** lewat field `alsoIn`
  (mis. `strings` ada di Forensics & Reverse Engineering; `hash-generator` di Crypto & CTF).
  Implementasi tetap satu, chunk dimuat dari kategori utama (`meta.category`).
- **Tema**: memakai CSS variables slate existing (`html.light`) — tidak ada theme baru.
- **UI**: memakai Button/Input/Badge/Spinner dari `src/components/ui/` + komponen sendiri.

---

## 4. File yang dibuat

### Fitur inti
- `src/features/cysec-tools/types.ts`
- `src/features/cysec-tools/registry.ts`
- `src/features/cysec-tools/hooks/useToolHistory.ts`

### Utils (murni logika, tanpa React)
- `src/features/cysec-tools/utils/bytes.ts`
- `src/features/cysec-tools/utils/encoding.ts`
- `src/features/cysec-tools/utils/crypto.ts`
- `src/features/cysec-tools/utils/analysis.ts`
- `src/features/cysec-tools/utils/files.ts`
- `src/features/cysec-tools/utils/pcap.ts`
- `src/features/cysec-tools/utils/binaryFormats.ts`
- `src/features/cysec-tools/utils/web.ts`
- `src/features/cysec-tools/utils/logparse.ts`

### Komponen & halaman
- `src/features/cysec-tools/components/ui.tsx`
- `src/features/cysec-tools/components/FileDrop.tsx`
- `src/features/cysec-tools/components/TransformTool.tsx`
- `src/features/cysec-tools/components/FileAnalyzer.tsx`
- `src/features/cysec-tools/pages/CySecToolsPage.tsx`
- `src/features/cysec-tools/pages/CategoryPage.tsx`
- `src/features/cysec-tools/pages/ToolPage.tsx`

### Implementasi tool (lazy chunks)
- `src/features/cysec-tools/tools/crypto/index.tsx`
- `src/features/cysec-tools/tools/forensics/index.tsx`
- `src/features/cysec-tools/tools/pcap/index.tsx`
- `src/features/cysec-tools/tools/re/index.tsx`
- `src/features/cysec-tools/tools/web/index.tsx`
- `src/features/cysec-tools/tools/ctf/index.tsx`
- `src/features/cysec-tools/tools/log/index.tsx`

### Test
- `scripts/cysec-selfcheck.ts` — regression test 62 kasus (MD5, SHA-3, ChaCha20 RFC 8439,
  encoding, PCAP/PCAPNG sintetik, PE/ELF minimal, EXIF sintetik, log, JWT).
  Dijalankan via `npm run cysec:check`.

---

## 5. File yang dimodifikasi (minimal, tidak mengganggu fitur existing)

| File | Perubahan |
|---|---|
| `src/App.tsx` | +3 route: `/cysec-tools`, `/cysec-tools/category/:categoryId`, `/cysec-tools/:toolId` |
| `src/app/Layout.tsx` | +1 nav item "CySec Tools" (ikon Shield) di navbar desktop, drawer mobile, dan footer |
| `package.json` | +script `cysec:check` |
| `index.html` | +`cysec-tools` pada daftar route segment di skrip injeksi `<base>` (fix white screen saat refresh/direct-load di `/cysec-tools/*`) |
| `src/lib/base.ts` | +`cysec-tools` pada `ROUTE_SEGMENTS` (konsistensi `appRoot()`) |
| `src/features/cysec-tools/pages/CySecToolsPage.tsx` | hapus paragraf tagline di header dashboard |

Tidak menyentuh: Obsidian-Vault, scripts/parse-docs, GitHub Actions, vercel.json,
vite.config, tsconfig, index.css (seluruh sistem tema/UI), halaman/pages lain,
komponen dokumentasi, search service, editor.

---

## 6. Tools yang berhasil dibuat (per kategori)

### 🔐 Cryptography & Encoding (22 tool)
base64, base32, base16/hex, url-encoder, html-encoder, ascii-hex, binary-text,
decimal-hex, rot13, rot47, caesar, xor-calc, xor-text, **aes (WebCrypto)**,
**chacha20 (edukasi)**, **rsa (edukasi)**, **hash-generator (WebCrypto)**, **hmac (WebCrypto)**,
**pbkdf2 (WebCrypto)**, **uuid (WebCrypto)**, **random-bytes (WebCrypto)**, **sha3 (Keccak)**.

### 🧪 Digital Forensics (12 tool)
metadata viewer, file-hash, file-signature/magic number, mime detector, file-hex,
strings extractor, entropy analyzer, timestamp inspector, **exif viewer**, **pdf-metadata**,
**zip-metadata**, file-compare.

### 🌐 PCAP (1 tool besar)
**PCAP Analyzer** — PCAP klasik + PCAPNG (SHB/IDB/EPB/SPB/PB), Ethernet/VLAN/IPv4/IPv6,
TCP/UDP/ICMP/ARP, DNS query, HTTP host/method/status, **TLS SNI (tanpa decrypt)**,
conversations, top talkers, TCP flags, timeline, packet-size distribution,
suspicious heuristics (SYN flood, port scan, 404 flood), filter & search, export TSV.

### ⚙️ Reverse Engineering (15 tool)
hex-viewer, hex-editor (ringan + export .bin), binary-viewer, byte-frequency,
ascii-viewer, utf8 decoder, utf16 decoder, binary-hex, integer-converter,
endianness converter, xor-analyzer (single-byte brute force + repeating-key),
**pe-viewer**, **elf-viewer**, **macho-viewer (dasar)**, printable-strings scanner.

### 🛡️ Web Security (19 tool) — semua input manual, tanpa request keluar
url-parser, query-parser, **jwt (decode + verifikasi HS\*)**, http-headers,
cookie-analyzer, user-agent parser, csp analyzer, cors analyzer, security-headers checker,
html-entity, js-uri decoder, url-normalizer, open-redirect analyzer,
path-traversal analyzer, sqli-analyzer (edukasi), xss-analyzer (edukasi),
regex-tester, http-request formatter, http-response formatter.

### 🚩 CTF Tools (20 tool)
ctf-caesar (brute-force), ctf-rot, ctf-xor (solver), base64-detector, encoding-detector,
frequency analyzer, substitution helper (auto-suggest ETAOIN), vigenere, rail-fence,
atbash, morse, bacon, unicode-analyzer, timestamp-converter, ip-converter,
**subnet calculator**, **cidr calculator**, port-reference, ascii-table, unicode-table.

### 📋 Log Analyzer (1 tool besar)
Apache/Nginx combined & common log, auth.log (sshd), log generik. Deteksi format
otomatis, IP/status/method/path/UA, timeline, auth failures, suspicious
(brute-force SSH, 404 flood, error spike, volume), filter IP/status/method/keyword,
tabs ringkasan.

**Total: ±90 tool** (termasuk tool yang sama muncul di beberapa kategori via `alsoIn`).

---

## 7. Tools yang membutuhkan dependency tambahan

**TIDAK ADA dependency baru** (package.json tidak berubah kecuali script).
Semua implementasi memakai Web APIs + TypeScript murni:

- Web Crypto API → AES-GCM/CBC, SHA-1/256/384/512, HMAC, PBKDF2, random, UUID
- MD5, SHA-3 (Keccak), ChaCha20, RSA → implementasi TypeScript sendiri (ditandai edukasi, teruji test vector)
- PCAP/PCAPNG, PE, ELF, Mach-O, EXIF, PDF, ZIP → parser TypeScript sendiri (read-only)

---

## 8. Tools yang menggunakan Web Crypto API

- `aes` (AES-256-GCM/CBC, key dari PBKDF2-SHA256)
- `hash-generator` (SHA-1/256/384/512; MD5 & SHA-3 pakai implementasi lokal)
- `hmac` (HMAC-SHA1/256/384/512)
- `pbkdf2`
- `uuid` (crypto.getRandomValues)
- `random-bytes` (crypto.getRandomValues)
- `jwt` — verifikasi signature HS256/384/512 (importKey + sign, bandingkan)
- `metadata` / `file-hash` / `file-compare` — SHA-256/1 via subtle

---

## 9. Tools yang menggunakan Web Worker / WebAssembly

- **Web Worker: tidak dipakai.** Parser sinkron dengan batas aman
  (PCAP max 500.000 paket, hex viewer max 256 KB default, hash file langsung
  dari ArrayBuffer, warning "Large file" di FileDrop untuk >50 MB).
  Browser tidak freeze untuk file wajar; jika ingin file >200 MB di masa depan,
  tambahkan Worker (lihat §12 Roadmap).
- **WebAssembly: tidak dipakai.** Tidak ada dependency (tidak seperti php-wasm/pyodide
  yang dipakai Code Editor existing). Parser murni JS cukup cepat.

---

## 10. Tools yang belum 100% client-side / batasan (client-side limitation)

| Tool | Status | Alasan |
|---|---|---|
| `des3des` (DES/3DES) | `unavailable` (ditampilkan greyed-out) | Web Crypto tidak mendukung DES; menambah library DES hanya untuk tool edukasi menambah attack surface. Ditandai di registry dengan catatan. Untuk CTF gunakan CyberChef/OpenSSL. |
| `macho-viewer` | `partial` | Hanya header dasar 64-bit LE/BE (magic, cputype, filetype, ncmds, flags). Parsing penuh load commands (segments, symbols, dylibs) belum disertakan — bukan mustahil, tinggal dikerjakan. |
| PCAP linktype selain Ethernet(1)/RawIP(101/228) | `partial` | Linktype lain (mis. Linux SLL, 802.11) ditandai "belum didukung penuh". |
| PCAPNG `if_tsresol` (resolusi timestamp non-default) | catatan | Dianggap 1e-6 (default). Opsi tsresol di IDB belum diparse. |
| EXIF TIFF big-endian | `partial` | Parser BE hanya menangani entry dasar (tanpa follow sub-IFD/ExifIFD penuh). |
| PDF metadata | `partial` | Byte-scan literal `/Title` dsb.; XMP metadata (XML) belum diparse. |
| JWT RS\*/ES\* | verifikasi hanya HS\* | Tanpa public key input; decode header/payload tetap jalan. |

**Catatan penting (sesuai prinsip):** tidak ada tool yang melakukan request jaringan ke
target. Tool web security murni menganalisis input yang ditempel. Tidak ada exploit,
credential harvesting, brute-force login, atau malware deployment.

---

## 11. Hasil build / lint / typecheck

```bash
npm install          # tidak ada perubahan dependency → aman
npm run build        # ✅ tsc --noEmit (0 error) + vite build sukses
npm run check        # ✅ 0 error
npm run cysec:check  # ✅ 62 pass / 0 fail
```

Catatan build:

- Main bundle: `index-*.js` ~420 KB (gzip ~132 KB) — naik ~43 KB dari sebelum fitur
  (komponen shell + registry + pages; implementasi tool masuk chunk lazy).
- Chunk lazy per kategori: `crypto` 36 KB, `web` 49 KB, `re` 34 KB, `ctf` 32 KB,
  `pcap` 28 KB, `forensics` 19 KB, `log` 17 KB (angka pre-gzip) — hanya dimuat saat tool dibuka.
- Warning chunk besar yang sudah ada sebelumnya (typescript 3.4 MB dari Code Editor)
  tetap muncul — bukan regresi.

---

## 12. Potensi issue yang masih tersisa (todo untuk AI berikutnya)

1. **Tidak ada test browser E2E** — selfcheck menguji logika murni; UI belum diuji
   otomatis (disarankan manual smoke test dulu sebelum deploy).
2. **File sangat besar** (>200 MB) bisa lambat — hash/metadata memproses ArrayBuffer
   utuh. Roadmap: Web Worker + chunked reading (`File.slice`) untuk `file-hash`,
   `entropy`, `strings`, `file-hex`.
3. **PCAP**: belum ada dukungan linktype Linux SLL / 802.11; `if_tsresol` PCAPNG
   diabaikan; belum ada tab raw hex per paket (hanya summary).
4. **EXIF big-endian** & sub-IFD GPS BE masih parsial; XMP PDF belum diparse.
5. **`htmlDecode`** memakai trik textarea (aman, tanpa eksekusi) — sudah diverifikasi
   menangani entity bernama & numerik browser, tapi entity eksotis bisa terlewat.
6. **RSA edukasi** menggunakan `Math.random` pada Miller-Rabin (bukan CSPRNG) —
   sengaja (edukasi, kunci kecil), jangan dipakai produksi. Catatan sudah ada di UI.
7. **Batas render**: `strings` menampilkan max 500 baris, hex viewer max 256 KB,
   conversation/top-list di-batas — sudah ada indikator "menampilkan X".
8. **Konten Indonesia/Inggris campur** — konsisten dengan gaya Learning-Web yang lain;
   tidak diubah agar tidak menyentuh materi existing.
9. Aksesibilitas: label & focus state sudah dipasang; belum diuji dengan screen reader.
10. Jika nanti menambah tool: daftarkan metadata di `registry.ts` + komponen di
    modul kategori (`tools/<kategori>/index.tsx` → objek `tools`). Chunk otomatis.

---

## 13. Roadmap (urutan prioritas bila dilanjutkan)

- [ ] **Web Worker** untuk `file-hash`/`entropy`/`strings`/`file-hex` pada file besar
- [ ] PCAP: linktype SLL/802.11, tab raw hex paket, `if_tsresol`
- [ ] EXIF big-endian penuh + XMP
- [ ] Mach-O load commands (segments/symbols) — selesaikan `partial`
- [ ] Tool baru yang mudah: JWT RS256 verify (input public key PEM), Hashcat-style
      wordlist offline (opsional), diff hex
- [ ] E2E test (Playwright) untuk route & tool utama sebelum deploy besar

---

## 14. Konvensi & jebakan yang harus diingat AI berikutnya

- **JANGAN** menambah tool dengan menyalin seluruh file — daftarkan di `registry.ts`,
  implementasi di `tools/<cat>/index.tsx` (objek `tools: Record<string, ComponentType>`).
- `ToolPage` mencari `m.tools[meta.id] ?? m.default` — setiap modul kategori wajib
  mengekspor `tools`.
- Field network (ethertype, port, DNS, TLS) **big-endian**; PCAP classic endianness
  dari magic; PCAPNG **little-endian**; EXIF/TIFF endianness dari byte order mark.
- Web Crypto butuh secure context (https/localhost) — sudah ada `assertSubtle()`.
- `toArrayBuffer()` di `utils/bytes.ts` wajib dipakai saat passing `Uint8Array` ke
  WebCrypto/Blob (typing TS 5.7 `Uint8Array<ArrayBufferLike>`).
- MD5/SHA-3/ChaCha20/RSA adalah implementasi edukasi yang **sudah diuji test vector**
  (lihat `scripts/cysec-selfcheck.ts`) — jangan "perbaiki" tanpa menjalankan test.
- Tema light/dark otomatis lewat CSS variables — komponen baru cukup pakai kelas
  `slate-*` existing, jangan hardcode warna hex.
