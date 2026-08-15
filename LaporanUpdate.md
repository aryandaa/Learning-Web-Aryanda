# Laporan Update. Fitur CySec Tools (Learning-Web Aryanda)

> Dokumen ini adalah **handoff report** untuk AI berikutnya. Bacalah **dulu** sebelum
> menyentuh kode, agar tidak merusak yang sudah ada dan tidak bingung dengan arsitektur.
> Project ini **SUDAH STABIL**. tambahkan fitur secara modular, jangan rewrite.

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

- `/cysec-tools`. dashboard katalog + search + recent/favorites (localStorage)
- `/cysec-tools/category/:categoryId`. halaman kategori
- `/cysec-tools/:toolId`. halaman tool (lazy-load chunk per kategori)

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
  Katalog dashboard & halaman kategori dirender dari sini. tanpa import implementasi.
- **Lazy loading**: ToolPage memakai `import.meta.glob('../tools/*/index.tsx')` →
  tiap kategori menjadi chunk terpisah. Bundle utama hanya +~40 KB (gzip).
- **Satu tool boleh muncul di beberapa kategori** lewat field `alsoIn`
  (mis. `strings` ada di Forensics & Reverse Engineering; `hash-generator` di Crypto & CTF).
  Implementasi tetap satu, chunk dimuat dari kategori utama (`meta.category`).
- **Tema**: memakai CSS variables slate existing (`html.light`). tidak ada theme baru.
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
- `scripts/cysec-selfcheck.ts`. regression test 62 kasus (MD5, SHA-3, ChaCha20 RFC 8439,
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
**PCAP Analyzer**. PCAP klasik + PCAPNG (SHB/IDB/EPB/SPB/PB), Ethernet/VLAN/IPv4/IPv6,
TCP/UDP/ICMP/ARP, DNS query, HTTP host/method/status, **TLS SNI (tanpa decrypt)**,
conversations, top talkers, TCP flags, timeline, packet-size distribution,
suspicious heuristics (SYN flood, port scan, 404 flood), filter & search, export TSV.

### ⚙️ Reverse Engineering (15 tool)
hex-viewer, hex-editor (ringan + export .bin), binary-viewer, byte-frequency,
ascii-viewer, utf8 decoder, utf16 decoder, binary-hex, integer-converter,
endianness converter, xor-analyzer (single-byte brute force + repeating-key),
**pe-viewer**, **elf-viewer**, **macho-viewer (dasar)**, printable-strings scanner.

### 🛡️ Web Security (19 tool). semua input manual, tanpa request keluar
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
- `jwt`. verifikasi signature HS256/384/512 (importKey + sign, bandingkan)
- `metadata` / `file-hash` / `file-compare`. SHA-256/1 via subtle

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
| `macho-viewer` | `partial` | Hanya header dasar 64-bit LE/BE (magic, cputype, filetype, ncmds, flags). Parsing penuh load commands (segments, symbols, dylibs) belum disertakan. bukan mustahil, tinggal dikerjakan. |
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

- Main bundle: `index-*.js` ~420 KB (gzip ~132 KB). naik ~43 KB dari sebelum fitur
  (komponen shell + registry + pages; implementasi tool masuk chunk lazy).
- Chunk lazy per kategori: `crypto` 36 KB, `web` 49 KB, `re` 34 KB, `ctf` 32 KB,
  `pcap` 28 KB, `forensics` 19 KB, `log` 17 KB (angka pre-gzip). hanya dimuat saat tool dibuka.
- Warning chunk besar yang sudah ada sebelumnya (typescript 3.4 MB dari Code Editor)
  tetap muncul. bukan regresi.

---

## 12. Potensi issue yang masih tersisa (todo untuk AI berikutnya)

1. **Tidak ada test browser E2E**. selfcheck menguji logika murni; UI belum diuji
   otomatis (disarankan manual smoke test dulu sebelum deploy).
2. **File sangat besar** (>200 MB) bisa lambat. hash/metadata memproses ArrayBuffer
   utuh. Roadmap: Web Worker + chunked reading (`File.slice`) untuk `file-hash`,
   `entropy`, `strings`, `file-hex`.
3. **PCAP**: belum ada dukungan linktype Linux SLL / 802.11; `if_tsresol` PCAPNG
   diabaikan; belum ada tab raw hex per paket (hanya summary).
4. **EXIF big-endian** & sub-IFD GPS BE masih parsial; XMP PDF belum diparse.
5. **`htmlDecode`** memakai trik textarea (aman, tanpa eksekusi). sudah diverifikasi
   menangani entity bernama & numerik browser, tapi entity eksotis bisa terlewat.
6. **RSA edukasi** menggunakan `Math.random` pada Miller-Rabin (bukan CSPRNG).
   sengaja (edukasi, kunci kecil), jangan dipakai produksi. Catatan sudah ada di UI.
7. **Batas render**: `strings` menampilkan max 500 baris, hex viewer max 256 KB,
   conversation/top-list di-batas. sudah ada indikator "menampilkan X".
8. **Konten Indonesia/Inggris campur**. konsisten dengan gaya Learning-Web yang lain;
   tidak diubah agar tidak menyentuh materi existing.
9. Aksesibilitas: label & focus state sudah dipasang; belum diuji dengan screen reader.
10. Jika nanti menambah tool: daftarkan metadata di `registry.ts` + komponen di
    modul kategori (`tools/<kategori>/index.tsx` → objek `tools`). Chunk otomatis.

---

## 13. Roadmap (urutan prioritas bila dilanjutkan)

- [ ] **Web Worker** untuk `file-hash`/`entropy`/`strings`/`file-hex` pada file besar
- [ ] PCAP: linktype SLL/802.11, tab raw hex paket, `if_tsresol`
- [ ] EXIF big-endian penuh + XMP
- [ ] Mach-O load commands (segments/symbols). selesaikan `partial`
- [ ] Tool baru yang mudah: JWT RS256 verify (input public key PEM), Hashcat-style
      wordlist offline (opsional), diff hex
- [ ] E2E test (Playwright) untuk route & tool utama sebelum deploy besar

---

## 14. Konvensi & jebakan yang harus diingat AI berikutnya

- **JANGAN** menambah tool dengan menyalin seluruh file. daftarkan di `registry.ts`,
  implementasi di `tools/<cat>/index.tsx` (objek `tools: Record<string, ComponentType>`).
- `ToolPage` mencari `m.tools[meta.id] ?? m.default`. setiap modul kategori wajib
  mengekspor `tools`.
- Field network (ethertype, port, DNS, TLS) **big-endian**; PCAP classic endianness
  dari magic; PCAPNG **little-endian**; EXIF/TIFF endianness dari byte order mark.
- Web Crypto butuh secure context (https/localhost). sudah ada `assertSubtle()`.
- `toArrayBuffer()` di `utils/bytes.ts` wajib dipakai saat passing `Uint8Array` ke
  WebCrypto/Blob (typing TS 5.7 `Uint8Array<ArrayBufferLike>`).
- MD5/SHA-3/ChaCha20/RSA adalah implementasi edukasi yang **sudah diuji test vector**
  (lihat `scripts/cysec-selfcheck.ts`). jangan "perbaiki" tanpa menjalankan test.
- Tema light/dark otomatis lewat CSS variables. komponen baru cukup pakai kelas
  `slate-*` existing, jangan hardcode warna hex.

---

# OSINT MODULE (ditambahkan setelah CySec Tools)

> Modul kedua, mengikuti pola arsitektur CySec Tools yang sama. Semua client-side.

## Ringkasan

- Route: `/osint` (landing) + `/osint/:toolId` (resolver lazy).
- 15 tool, 12 kategori, registry data-driven di `src/features/osint/registry.ts`.
- Privacy indicator per tool: LOCAL / EXTERNAL / HYBRID.
- Integrasi eksternal hanya ke API publik ber-CORS tanpa key: **Cloudflare/Google DoH**
  (DNS), **ipwho.is** (IP ASN/geo). crt.sh (certificates) tidak stabil CORS → fetch
  dengan fallback + mode "paste JSON" + link manual.
- localStorage: recent tools, OSINT Workspace, OSINT Case. Tidak ada secret tersimpan.

## Struktur

```
src/features/osint/
├── types.ts / registry.ts        # data-driven (id, title, category, path, icon, tags, privacy)
├── hooks/useOsintHistory.ts      # recent tools
├── utils/  domain.ts dns.ts ip.ts url.ts username.ts email.ts ioc.ts hash.ts text.ts
│           timeline.ts metadata.ts shared.ts (export/sanitasi)
├── components/ui.tsx             # PrivacyIndicator, SourceList, IndicatorBadge, OsintResultPanel
├── pages/  OSINTPage.tsx OSINTToolPage.tsx
└── tools/  <toolId>/index.tsx    # 15 chunk lazy
```

## Cara menambahkan tool OSINT baru

1. Buat komponen di `src/features/osint/tools/<id>/index.tsx`:
   ```ts
   export const tools: Record<string, ComponentType> = { '<id>': MyTool };
   export default MyTool; // fallback
   ```
2. Tambah object di `TOOLS` pada `registry.ts` (id harus sama dengan nama folder
   chunk agar `import.meta.glob('../tools/*/index.tsx')` di OSINTToolPage menemukannya).
3. Route otomatis tersedia di `/osint/<id>`.

## Cara menambahkan kategori

Tambah `OsintCategoryId` di `types.ts` + object di `CATEGORIES` registry.

## Cara menambahkan external source

- DoH: tambahkan entry di `DOH_RESOLVERS` (`utils/dns.ts`). endpoint harus ber-CORS.
- Lainnya: cukup tambahkan link di bagian "Public Sources" tool; tampilkan
  "External lookup required" bila tidak ber-CORS. JANGAN simpan API key di kode.

## Cara menambahkan export format

Gunakan helper di `utils/shared.ts`: `exportJson`, `exportCsv`, `exportTxt` (Blob API).

## Komponen shared

- `components/ui.tsx`: `PrivacyIndicator({privacy, note})`, `SourceList({sources})`,
  `IndicatorBadge({tone})`, `OsintResultPanel({title, actions, children})`.
- Reuse dari CySec Tools: `Panel/KeyValueTable/LabeledTextarea/CopyButton/ErrorAlert/
  Notice/ToolNotes` (`src/features/cysec-tools/components/ui.tsx`) dan
  `FileDrop` (`src/features/cysec-tools/components/FileDrop.tsx`).

## Privacy indicator. cara kerja

- `local` → badge emerald "LOCAL. Processed locally…" (tidak ada data keluar).
- `external` → badge amber "EXTERNAL. uses an external public service."
- `hybrid` → badge cyan (lokal + lookup publik opsional).
- Jangan menampilkan klaim LOCAL jika tool benar-benar memanggil network.

## Route segments (PENTING. jangan lupa)

`osint` sudah ditambahkan ke daftar route segment di:
- `index.html` (skrip injeksi `<base>`)
- `src/lib/base.ts` (`ROUTE_SEGMENTS`)
Bila menambah modul route baru di masa depan, lakukan hal yang sama di kedua tempat
(bug white-screen pernah terjadi karena ini).

## Verifikasi

```bash
npm run osint:check   # selfcheck 48 kasus (domain/ip/email/ioc/hash/text/timeline/url/username)
npm run cysec:check   # 62 kasus. memastikan modul lama tidak rusak
npm run build
```

---

# RESTRUKTURISASI: OSINT MENJADI KATEGORI CYSEC TOOLS

> Perubahan information architecture (IA), bukan rewrite. Semua tool tetap utuh.

## Apa yang berubah

- **Navbar**: item "OSINT" dihapus. Entry point cybersecurity hanya "CySec Tools".
- **`/cysec-tools`**: kini *category selector* (kartu workspace besar), bukan daftar semua tools.
  Flow: CySec Tools → pilih kategori → daftar tool kategori → tool.
- **OSINT** menjadi kategori resmi di dalam CySec Tools: `/cysec-tools/category/osint`
  (tools OSINT tetap di route `/osint/:toolId`. tidak dipindah agar tidak merusak).
- **`/osint`** (landing lama) → redirect ke `/cysec-tools/category/osint` (client-side).
  File `OSINTPage.tsx` dihapus.
- **12 kategori** (kategori kosong tidak ditampilkan):
  crypto, osint, forensics, pcap, re, web, ctf, log, malware, hash, file-metadata, utilities.
  - `malware`/`hash`/`file-metadata`/`utilities` diisi via `EXTRA_CATEGORY_TOOLS` di `catalog.ts`
    (data-driven; field `category` tool existing TIDAK diubah → backward-compatible).
- **Breadcrumb**: kategori & tool (CySec Tools / Kategori / Tool); tombol "← Back to CySec Tools".
- **Search**: global (nama kategori + nama tool + deskripsi + tags) di dashboard;
  search per-kategori di category page (link "Cari di semua kategori" → `/cysec-tools?q=…`).
- **Recently Used / Favorites**: digabung CySec + OSINT, tiap item menampilkan label kategori.

## File kunci

- `src/features/cysec-tools/catalog.ts`. KATALOG TERPADU (category cards, entries, search).
  Tambah tool/kategori baru di sini + `registry.ts` + `osint/registry.ts`.
- `src/features/cysec-tools/pages/CySecToolsPage.tsx`. dashboard category selector.
- `src/features/cysec-tools/pages/CategoryPage.tsx`. halaman kategori (breadcrumb + search + chips).
- `src/App.tsx`. route `/osint` → redirect; `/osint/:toolId` tetap.
- `src/app/Layout.tsx`. nav OSINT dihapus.

## Verifikasi

```bash
npm run build        # ✅
npm run cysec:check  # ✅ 62/62 (tools lama tidak berubah)
npm run osint:check  # ✅ 48/48
```
Semua route dicek via preview: kategori baru (hash/malware/file-metadata/utilities),
`/cysec-tools/category/osint`, `/osint/dns`, tool CySec lama, `/docs`. semua 200.

---

# CLEANUP: EM DASH + ONE TOOL = ONE CATEGORY

## 1. Em dash (—) dihapus dari seluruh website

- Semua em dash (U+2014) dihapus dari `src/`, `index.html`, `scripts/`, konfigurasi,
  README, dan LaporanUpdate.md. Penggantian kontekstual:
  - pemisah kalimat " — " → ". "
  - " — read-only/edukasi/client-side" → "(read-only/edukasi/client-side)"
  - placeholder nilai kosong '—' → '-'
- En dash (U+2013) untuk rentang angka (mis. A–Z, 33–126) TIDAK disentuh.
- `grep -rl "—"` pada source → **0 hasil**.
- Pengecualian: `generated/` & `public/` hanya mengandung em dash di **file PNG biner**
  (konten gambar, bukan teks UI). Konten vault (docs JSON) tidak diubah karena
  diregenerasi oleh pipeline Obsidian sync (off-limits).

## 2. ONE TOOL = ONE CATEGORY (single source of truth)

- Field `category` pada registry kini satu string canonical. **`alsoIn` dihapus total**
  (field juga dihapus dari tipe `ToolMeta` agar ter-enforce saat compile).
- `catalog.ts` tidak lagi memakai `EXTRA_CATEGORY_TOOLS`; `toolsInCategory` = exact match.
- Kategori ekstra (malware/hash/file-metadata/utilities) dihapus karena tidak punya
  owner tunggal (tidak menampilkan kategori kosong). Kategori final: 8.
- ID bentrok lintas namespace: tool CySec `metadata` di-rename menjadi `file-metadata`
  dengan alias `['metadata']` (route lama `/cysec-tools/metadata` redirect client-side
  ke `/cysec-tools/file-metadata`, bookmark tidak rusak). OSINT `metadata` tetap.
- Tool OSINT `certificates` (implementasi sudah ada) ditambahkan ke registry OSINT
  (sebelumnya tidak terdaftar sehingga tidak tampil; kini 15 tool OSINT).

## 3. Validation development-time

`npm run validate` (scripts/validate-registry.ts) memeriksa:
1. duplicate tool ID
2. tool tanpa category
3. category tidak dikenal
4. multi-category (`alsoIn` / `categories` array) → error arsitektur
5. duplicate route/path (global CySec + OSINT)
6. alias bentrok (route lama)

Hasil: **0 error, 0 warning**. 105 tool unik, semua tepat 1 kategori.

## Verifikasi

```bash
npm run validate     # ✅ 0 error
npm run cysec:check  # ✅ 62/62
npm run osint:check  # ✅ 48/48
npm run build        # ✅
grep -rl "—" src/    # ✅ 0
```

---

# FITUR: GOOGLE DORK SEARCH (di kategori OSINT)

Tool baru: **Google Dork Search**, 100% frontend, masuk ke CySec Tools → OSINT.

## File dibuat
- `src/features/osint/utils/dork.ts` — query builder murni (pure functions):
  operator site/inurl/intitle/intext/filetype/ext/allinurl/allintitle/allintext/
  before/after, exact phrase, exclude, OR, custom operators, validation
  (filetype, tanggal, nilai kosong), presets, googleSearchUrl.
- `src/features/osint/tools/google-dork-search/index.tsx` — komponen lazy
  (realtime preview, Copy Query, Search Google buka tab baru, Query Explanation
  dinamis, Learn Google Dorking, presets).

## File dimodifikasi
- `src/features/osint/registry.ts` — daftar tool `google-dork-search`
  (category `search`, path `/osint/google-dork-search`) + kategori OSINT
  internal baru `search` (Search & Dorking).
- `src/features/osint/types.ts` — `OsintCategoryId` + `'search'`.
- `scripts/osint-selfcheck.ts` — 18 unit test builder (kasus 1..10 dari spek +
  realtime/target/quote/warning/preset/filetypes).

## Verifikasi
```bash
npm run validate     # ✅ 0 error, OSINT = 16 tools
npm run osint:check  # ✅ 66/66 (48 lama + 18 dork)
npm run cysec:check  # ✅ 62/62
tsc / build          # ✅
route /osint/google-dork-search # ✅ 200 (chunk lazy terpisah)
```
Tool hanya muncul di kategori OSINT (cek katalog), tanpa navbar baru, tanpa backend,
tanpa API key, tanpa scraping. "Search Google" hanya membuka
`https://www.google.com/search?q=<encoded>` di tab baru.

---

# EXPANSI CYSEC TOOLS: DEDUP + UPGRADE + 2 TOOL BARU

## Audit & mapping (Phase 1-2)

Prinsip: CANONICAL TOOL (satu fungsi = satu tool, satu kategori). 20 fitur target
dipetakan ke tool existing; hanya 2 capability yang benar-benar baru.

| Target Feature | Existing / New | Kategori | Route | Aksi |
|---|---|---|---|---|
| JWT Security Toolkit | jwt (existing) | web | /cysec-tools/jwt | UPGRADE (struktur token, validitas exp) |
| HTTP Request / Inspector | http-request, http-response | web | /cysec-tools/http-request | UPGRADE (security observations) |
| Security Headers Analyzer | security-headers | web | /cysec-tools/security-headers | UPGRADE (COOP, CORP) |
| Hash Identifier | hash (osint) | osint | /osint/hash | UPGRADE (SHA-224/384, SHA3, scrypt, LM) |
| Password / Hash Lab | hash-generator + hmac + pbkdf2 | crypto | /cysec-tools/hash-generator | UPGRADE (compare target hash); tidak bikin tool baru |
| Regex Security Analyzer | regex-tester | web | /cysec-tools/regex-tester | UPGRADE (analisis ReDoS, token) |
| URL / URI Security Analyzer | url-parser | web | /cysec-tools/url-parser | UPGRADE (port, private IP, scheme) |
| IP / CIDR Calculator | subnet | ctf | /cysec-tools/subnet | UPGRADE (IPv6, binary, wildcard, split) |
| DNS Record Parser | dns (osint) | osint | /osint/dns | UPGRADE (paste raw DNS text) |
| PCAP Analyzer (Stats/IOC) | pcap | pcap | /cysec-tools/pcap | UPGRADE (tab Statistics + IOCs) |
| IOC Analyzer | ioc (osint) | osint | /osint/ioc | UPGRADE (MAC, confidence, posisi) |
| Log Analyzer | log-analyzer | log | /cysec-tools/log-analyzer | UPGRADE (4xx/5xx, wording potentially suspicious) |
| CVE / Security Reference | **NEW** cve-reference | ctf | /cysec-tools/cve-reference | CREATE (local parser + links NVD/MITRE) |
| PE / ELF Analyzer | pe-viewer, elf-viewer | re | /cysec-tools/pe-viewer | UPGRADE (PE exports, ELF symbols) |
| Entropy Analyzer | entropy | forensics | /cysec-tools/entropy | UPGRADE (grafik per blok, min/max/avg) |
| Binary / Hex Inspector | hex-viewer | re | /cysec-tools/hex-viewer | UPGRADE (interpretasi LE/BE, float, magic, search/jump) |
| Cyber Timeline | timeline (osint) | osint | /osint/timeline | SUDAH ADA (tidak diubah) |
| PCAP -> IOC | tab IOCs di pcap | pcap | /cysec-tools/pcap | SUDAH ADA (tab baru) + tombol "Send to IOC Analyzer" |
| Cyber Encoding Pipeline | **NEW** encoding-pipeline | crypto | /cysec-tools/encoding-pipeline | CREATE (pipeline ops + reorder/duplicate) |
| Cyber Data Converter | mode di encoding-pipeline | crypto | /cysec-tools/encoding-pipeline | GABUNG (panel converter) |

## Hasil

- **Tool baru**: 2 (cve-reference, encoding-pipeline)
- **Tool di-upgrade**: 17 (jwt, http-request, http-response, security-headers, hash-generator,
  regex-tester, url-parser, subnet, pcap, ioc, dns, hash, log-analyzer, pe-viewer, elf-viewer,
  entropy, hex-viewer)
- **Sengaja tidak dibuat** (sudah ada): timeline, PCAP->IOC, password lab, data converter,
  security headers, binary inspector, IP/CIDR, DNS parser, JWT toolkit, HTTP inspector,
  hash identifier, regex analyzer, URL analyzer, PE/ELF, IOC analyzer, log analyzer
- **Total tool**: 106 -> **108** (+2, tidak ada duplikat)
- **Kategori**: setiap tool tepat 1 kategori (validate 0 error, 0 warning)

## Integrasi antar tool

- PCAP Analyzer (tab IOCs) -> "Send to IOC Analyzer": kirim nilai via sessionStorage,
  tool /osint/ioc membaca otomatis saat dibuka.
- Encoding Pipeline -> Copy/konversi untuk dikirim ke Hash Analyzer manual.

## File baru
- src/features/cysec-tools/utils/network.ts (subnet IPv4+IPv6, split)
- src/features/cysec-tools/utils/binaryInspector.ts (interpretasi, magic, search)
- src/features/cysec-tools/utils/regexAnalyze.ts (ReDoS heuristics)
- src/features/cysec-tools/utils/pipeline.ts (ops pipeline murni)
- tools: cve-reference & encoding-pipeline (di modul ctf & crypto)

## File diubah
- registry (2 tool baru), types, catalog (tidak), utils: analysis.ts (blockEntropy),
  web.ts (COOP/CORP + httpSecurityObservations), binaryFormats.ts (PE exports + ELF symbols),
  osint: ioc.ts (MAC/confidence/posisi), hash.ts (algoritma), dns.ts (parseDnsText)
- tools: ctf (subnet baru, cve), crypto (pipeline), re (hex-viewer, pe/elf panels),
  forensics (entropy), web (regex/jwt/http/url panels), pcap (statistics+iocs),
  log (wording+summary), osint tools (ioc, dns, hash)
- scripts: cysec-selfcheck (+41 test), osint-selfcheck (+11 test)

## Verifikasi
```bash
npm run validate     # ✅ 0 error, 0 warning, 108 tool unik
npm run cysec:check  # ✅ 85 (44 lama + 41 baru)
npm run osint:check  # ✅ 77 (66 lama + 11 baru)
npm run build        # ✅
tsc --noEmit         # ✅
route baru & lama    # ✅ semua 200
em dash di source    # ✅ 0
```
## Limitasi teknis
- PE exports: hanya dibaca bila data directory export valid (best-effort, tanpa test fixture PE penuh di unit test).
- ELF symbols: dibaca dari SHT_SYMTAB/DYNSYM; executable stripped tidak punya symbol.
- PCAP IOCs: berbasis metadata paket (tanpa decrypt); hash payload tidak diekstrak.
- ReDoS analyzer: heuristik, bukan bukti; tidak menjalankan regex dengan timeout (pola dicoba pada input kecil).
- Entropy grafik: dibatasi 4096 blok.

---

# PERSONAL LEARNING DASHBOARD (Dashboard saja)

Dashboard kini menjadi personal learning hub. Fitur hanya ada di halaman beranda;
halaman materi tetap bersih. Frontend-only, localStorage, tanpa backend.

## File baru
- `src/services/learningActivity.ts` — service aktivitas belajar (localStorage).
- `src/components/dashboard/LearningHub.tsx` — section Continue Learning, Recently
  Updated, Recently Read, Learning Stats + privacy note.
- `scripts/learning-selfcheck.ts` — unit test service (17 kasus, `npm run learn:check`).

## File diubah
- `src/pages/DocumentPage.tsx` — tracking saat membuka dokumen (record), scroll
  progress throttled (800ms + scrollend), tombol "Continue where you left off".
- `src/pages/HomePage.tsx` — sisipkan `<LearningHub tree={tree} />` setelah hero.
- `package.json` — script `learn:check`.

## localStorage keys (namespace khusus, tanpa bentrok)
- `learning-web:last-read`
- `learning-web:reading-history` (maks 20, upsert per documentId)
- `learning-web:stats` (notesRead, sessions, categories, completed, lastActivity)

## Tracking Last Read & progress
- Identitas utama = `documentId` (path normalized dari tree), bukan slug.
- Saat dokumen dibuka: `recordRead({documentId, relativePath, title, folder, slug})`.
- Scroll progress = `window.scrollY / (scrollHeight - innerHeight)`, disimpan
  throttled 800ms + saat scrollend + saat unmount.
- Tombol "Continue where you left off (N%)" muncul bila progress 8-94%; klik
  scroll halus ke posisi. Tidak ada auto-jump yang mengganggu.
- Buka ulang dokumen yang sama: entry di-update, tidak duplikat.

## Recently Updated (jujur, tanpa mengarang data)
- Sumber: index opsional `docs/updated-index.json` (fetch sekali, 404 => kosong).
- Audit: **0 dari 424 dokumen** punya `updated` non-null (vault tidak menyediakan
  tanggal per materi). Sesuai aturan "jangan mengarang data" dan "jangan mengubah
  parser", section menampilkan empty state jujur; akan otomatis terisi bila vault
  menyediakan metadata tanggal.

## Stale & update handling
- `pruneStaleHistory(validIds)` dijalankan saat dashboard dimuat: entry dokumen
  yang sudah dihapus dari tree dibersihkan, last-read dibuang, tanpa crash.
- Dokumen yang diperbarui di vault tetap dikenali lewat documentId/relativePath.

## Routing
- Tidak ada route baru. Link dokumen memakai `/docs/<documentId>` (pola existing).

## Verifikasi
```bash
tsc --noEmit          # ✅
npm run build         # ✅
npm run learn:check   # ✅ 17/17 (upsert, progress, prune, stats)
npm run cysec:check   # ✅ 85 (regresi aman)
npm run osint:check   # ✅ 77 (regresi aman)
npm run validate      # ✅ 0 error
route /, /docs, /docs/<id>  # ✅ 200
em dash di source     # ✅ 0
```

---

# REVISI DASHBOARD: HAPUS TRACKING, HANYA RECENTLY UPDATED

## Perubahan
- **Dihapus seluruh fitur tracking aktivitas belajar**: Continue Learning, Learning
  Stats (Notes Read/Categories/Sessions/Completed/Last activity), Recently Read,
  progress materi, last opened, dan seluruh logic localStorage tracking.
- File dihapus: `src/services/learningActivity.ts`, `src/components/dashboard/LearningHub.tsx`,
  `scripts/learning-selfcheck.ts`; script npm `learn:check` dihapus.
- `src/pages/DocumentPage.tsx` dikembalikan ke versi asli (tanpa record/progress/
  tombol continue).
- Dashboard kini hanya menampilkan **Recently Updated** sebagai fitur utama
  (`src/components/dashboard/RecentlyUpdated.tsx`):
  - Heading "Recently Updated", subtitle "Materi terbaru yang baru diperbarui."
  - Tanpa menyebut vault/Obsidian/parser.
  - Item: judul, kategori/path, label status update, klik ke `/docs/<id>`.
  - Timestamp tidak diarang: bila tidak ada, label "Recently updated";
    bila ada, label relatif ("Updated 2 hours ago", "Updated yesterday", dll).
  - Empty state jujur bila belum ada data.
- localStorage/sessionStorage: key `learning-web:*` untuk tracking dihapus total.
  `sessionStorage osint-ioc-pending` (integrasi PCAP -> IOC) DIPERTAHANKAN karena
  itu fitur CySec/OSINT yang masih aktif.

## Verifikasi
```bash
tsc --noEmit              # ✅
npm run build             # ✅
npm run cysec:check       # ✅ 85 (regresi aman)
npm run osint:check       # ✅ 77 (regresi aman)
npm run validate          # ✅ 0 error
route /, /docs, /docs/<id> # ✅ 200
em dash di source         # ✅ 0
```
Catatan: kata "vault" di bundle hanya tersisa dari fitur lama (pesan error parser
"npm run parse -- --vault=..." di halaman error Docs dan label roadmap) yang bukan
bagian dari Recently Updated dan tidak diubah sesuai aturan "jangan mengubah fitur lain".

---

# REVISI DASHBOARD: HAPUS RECENTLY UPDATED (DASHBOARD BERSIH)

## Latar belakang
- Sumber data `docs/updated-index.json` **tidak tersedia**: parser tidak pernah
  menghasilkan index tersebut (0 dari 424 dokumen punya metadata `updated`).
- Karena sumber data tidak reliable, fitur **Recently Updated** dihapus sepenuhnya.
  Tidak ada fitur pengganti dan tidak ada tracking baru.

## Perubahan
- `src/components/dashboard/RecentlyUpdated.tsx` dihapus (seluruh component,
  fetch `updated-index.json`, sort, label waktu, empty state).
- `src/pages/HomePage.tsx`:
  - Import `RecentlyUpdated` dihapus.
  - Section "Recently Updated" (heading, subtitle "Materi terbaru yang baru
    diperbarui.", item card, link "Semua materi") dihapus.
- Tidak ada service/helper/state/selector lain yang hanya digunakan oleh
  Recently Updated; import lain di HomePage tetap terpakai (hero, statistik,
  topik utama, open source).
- Tidak ada perubahan ke Docs, Navbar, Roadmap, Graph, Code Editor, CySec Tools,
  OSINT, parser, GitHub Actions, generated/ -> public/, atau deployment Vercel.

## Kondisi dashboard saat ini
- Hero (branding + CTA Docs/Search/Profile).
- Statistik konten dari metadata (Catatan, Folder, Estimasi baca, Skill, Bidang).
- Topik Utama (folder top-level, link ke Docs).
- Section Open Source.
- Tanpa: Continue Learning, Learning Stats, Recently Read, Recently Updated,
  progress tracking, last activity, Notes Read, Categories, Sessions, Completed.

## Verifikasi
```bash
tsc --noEmit              # ✅
npm run build             # ✅
npm run cysec:check       # ✅ (regresi aman)
npm run osint:check       # ✅ (regresi aman)
npm run validate          # ✅ 0 error
route /                   # ✅ 200, tanpa fetch updated-index.json
em dash di source         # ✅ 0
```
