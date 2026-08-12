# Learning Web Aryanda

**Platform belajar pribadi berbasis web**: tulis materi di **Obsidian**, dan website ini otomatis mengubah seluruh Markdown vault menjadi website pembelajaran statis yang lengkap: dokumentasi, pencarian fuzzy, graph antar-catatan, roadmap bercabang, hingga **code editor interaktif yang berjalan 100% di browser**.

> 🟢 **Open source**: silakan fork, clone, dan gunakan untuk vault Anda sendiri.
> Semua data berasal dari Markdown biasa, jadi Anda bebas membawa materi sendiri.

```
┌─────────────────────┐        git push         ┌──────────────────────────────┐
│  Obsidian Vault     │ ─────────────────────►  │  Vault GitHub Action         │
│  (SOURCE OF TRUTH)  │      repository_dispatch: vault-sync                  │
└─────────────────────┘                          └───────────┬──────────────────┘
                                                             │
                                              ┌──────────────▼──────────────────┐
                                              │  Website GitHub Action          │
                                              │  clone vault → parser pipeline  │
                                              │  → generated/ → public/ → commit│
                                              └──────────────┬──────────────────┘
                                                             ▼
                                              ┌──────────────────────────────┐
                                              │  React static website        │
                                              │  (Vercel / GitHub Pages / dll)│
                                              └──────────────────────────────┘
```

---

## Daftar Isi

- [Fitur](#-fitur)
- [Tech Stack](#-tech-stack)
- [Struktur Project](#-struktur-project)
- [Instalasi Lokal (Open Source)](#-instalasi-lokal)
- [Tutorial: Hubungkan Obsidian ke Website Ini](#-tutorial-hubungkan-obsidian-ke-website-ini)
- [Format Materi yang Didukung](#-format-materi-yang-didukung)
- [Parser Pipeline](#-parser-pipeline)
- [Halaman & Routing](#-halaman--routing)
- [Generated Artifacts](#-generated-artifacts)
- [Deploy](#-deploy)
- [GitHub Actions (Sync Otomatis)](#-github-actions-sync-otomatis)
- [Troubleshooting](#-troubleshooting)
- [Kontribusi](#-kontribusi)

---

## ✨ Fitur

| Fitur | Deskripsi |
|---|---|
| 📄 **Dokumentasi Explorer** | Tree folder recursive langsung dari struktur vault (100% data-driven, tanpa hardcode). |
| 🔍 **Pencarian Fuzzy (Fuse.js)** | Cari judul, heading, isi, tag, alias. Index dimuat lazy. |
| 🕸 **Graph View** | Visualisasi sambungan antar-catatan ala Obsidian Graph View (d3-force di canvas). |
| 🗺 **Roadmap Bercabang** | File `#roadmap` → pohon langkah belajar bertingkat dengan cabang materi rujukan. Landing page grid semua `#Subskill` per bidang. |
| ⌨️ **Code Editor Interaktif** | Tulis & jalankan kode **tanpa backend**: JavaScript, TypeScript, HTML, CSS, PHP, Python, SQL. |
| 🌗 **Dark / Light Theme** | Theme switcher di navbar, pilihan tersimpan di `localStorage`. |
| 📑 **Daftar Isi Hierarkis** | Otomatis dari heading `#` sampai `######`, indent sesuai level, scroll smooth. |
| 🧱 **Code Block Pintar** | Syntax highlighting (highlight.js), label bahasa, tombol **Copy**. |
| 🔗 **Wiki Links / Backlinks** | `[[Note]]`, `[[Folder/Note|alias]]`, `[[Note#Section]]`, embed `![[gambar.png]]`, panel "Dirujuk oleh". |
| 📱 **Fully Responsive** | Mobile drawer navigation, sidebar desktop collapsible, tanpa horizontal overflow. |
| ⏱ **Reading Time & Breadcrumb** | Estimasi waktu baca + breadcrumb path dari relativePath. |
| ⬅️➡️ **Prev / Next** | Navigasi antar dokumen berurutan (DFS dari tree). |
| 🧮 **KaTeX Math** | Rendering rumus `$...$` dan `$$...$$`. |
| 🎨 **Callouts** | `> [!note]`, `[!tip]`, `[!warning]`, `[!danger]`, dll. |

---

## 🛠 Tech Stack

**Frontend (React SPA):**

- React 18 + React Router 6 + TypeScript
- Vite (build, code-splitting)
- Tailwind CSS 3 + @tailwindcss/typography
- Fuse.js (search), d3-force (graph), lucide-react (icons)
- KaTeX (math), highlight.js (syntax highlighting)

**Parser (Node.js, build-time):**

- unified / remark (parse, GFM, math) + rehype (highlight, KaTeX, sanitize, heading ids)
- gray-matter (frontmatter), tsx (TypeScript runner)

**Runtime opsional (frontend-only):**

- Pyodide (WASM): dipakai Code Editor untuk menjalankan Python di browser, dimuat lazy dari CDN.
- php-wasm (WebAssembly): runtime PHP di-host di `public/php-wasm/` (di-hosting sendiri agar MIME wasm benar).

> Tidak ada backend, tidak ada database, tidak ada API write. Hasil akhir adalah **static website**.

---

## 📁 Struktur Project

```
.
├── .github/workflows/
│   └── sync-docs.yml          # GitHub Action: vault → generated → public → commit
├── scripts/
│   ├── parse-docs.ts          # CLI parser (npm run parse)
│   └── parser/                # Pipeline modular
│       ├── scanner.ts         #   snapshot vault (md, folder, aset)
│       ├── validator.ts       #   validasi id/path duplikat (fatal)
│       ├── indexer.ts         #   frontmatter, heading, tag, reading time
│       ├── link-resolver.ts   #   resolver wiki-link / markdown link / embed
│       ├── renderer.ts        #   Markdown → HTML tersanitasi
│       ├── tree.ts            #   build tree + urutan prev/next
│       ├── json-writer.ts     #   tulis semua artifact
│       ├── publisher.ts       #   publish ke public/
│       └── plugins/           #   remark/rehype custom (wiki link, callout, tag)
├── src/                       # React SPA
│   ├── app/                   #   Layout, SiteProvider, ThemeProvider
│   ├── pages/                 #   Home, Docs, Document, Search, Graph, Roadmap, Editor
│   ├── components/            #   explorer, document, graph, roadmap, ui
│   ├── services/              #   fetch JSON, search (Fuse)
│   └── lib/                   #   base path, warna, tag colors
├── generated/                 # hasil parser (di-commit)
│   ├── docs/                  #   tree.json, search-index.json, metadata.json, dll.
│   └── assets/                #   aset yang benar-benar direferensikan
├── public/                    # hasil publish (dibaca website saat runtime)
│   ├── docs/                  #   salinan generated/docs
│   └── assets/vault/          #   salinan aset
├── index.html
├── tailwind.config.js
├── vite.config.ts
└── vercel.json
```

---

## 🚀 Instalasi Lokal

### Prasyarat

| Tool | Versi |
|---|---|
| **Node.js** | `^20.19.0` atau `>=22.12.0` (dipersyaratkan Vite 8) |
| **npm** | 10+ (ikut Node) |
| **Git** | apa pun yang modern |

Cek versi Anda:

```bash
node -v   # mis. v22.23.2
npm -v
```

### Langkah 1: Clone repository

```bash
git clone https://github.com/aryandaa/Learning-Web-Aryanda.git
cd Learning-Web-Aryanda
```

### Langkah 2: Install dependency

```bash
npm install
```

### Langkah 3: Jalankan (2 pilihan)

**Opsi A: Langsung jalan dengan data yang sudah di-commit** (paling cepat: data `generated/` + `public/` sudah ada di repo):

```bash
npm run dev
# buka http://localhost:4173
```

**Opsi B: Generate ulang dari vault Anda sendiri** (jika ingin pakai materi sendiri: lanjut ke [tutorial Obsidian](#-tutorial-hubungkan-obsidian-ke-website-ini)):

```bash
npm run parse -- --vault=/path/ke/Obsidian-Vault
npm run dev
```

> Catatan: `npm run parse` memproses vault lalu menulis `generated/` dan `public/`. Tanpa vault, website tetap jalan memakai data yang sudah ter-commit.

### Perintah yang tersedia

| Perintah | Fungsi |
|---|---|
| `npm run dev` | Development server → http://localhost:4173 |
| `npm run build` | Typecheck + build produksi ke `dist/` |
| `npm run preview` | Preview hasil build (`dist/`) |
| `npm run check` | Typecheck TypeScript saja |
| `npm run parse -- --vault=<path>` | Jalankan parser vault |

### Opsi CLI parser

```bash
npm run parse -- --vault=/path/ke/vault \
  --commit=<sha>                # pin ke commit vault tertentu
  --branch=main                 # branch vault
  --out=/path/keluaran          # ganti direktori generated (default ./generated)
  --exclude="Folder A"          # kecualikan folder (bisa diulang)
  --no-publish                  # jangan salin ke public/
  --no-assets                   # jangan salin aset
```

Variabel lingkungan fallback: `VAULT_PATH`, `VAULT_COMMIT`, `VAULT_BRANCH`, `GENERATED_DIR`.

Folder `Note Personal` dan `Praktek` sudah dikecualikan secara default (`scripts/parser/parser.config.ts`).

---

## 🔗 Tutorial: Hubungkan Obsidian ke Website Ini

Materi ditulis di vault Obsidian (Markdown polos), lalu website membaca vault tersebut: **tidak ada penulisan balik** ke Obsidian. Ada dua pendekatan:

1. **Lokal saja**: jalankan parser manual di komputer Anda setiap selesai menulis.
2. **Otomatis via GitHub**: tiap `git push` ke repo vault memicu sync otomatis ke website.

### Bagian 1: Siapkan repo vault di GitHub

**1.1** Buat repository baru di GitHub untuk vault Anda, misalnya `aryandaa/Obsidian-Vault`. Boleh **private**: website hanya butuh token baca.

**1.2** Di komputer, buka folder vault Obsidian Anda (folder yang berisi `.obsidian/`), lalu inisialisasi git:

```bash
cd /path/ke/Obsidian-Vault
git init
```

**1.3** Buat `.gitignore` di dalam vault (hindari meng-commit file kerja Obsidian & file sensitif):

```gitignore
# Obsidian
.obsidian/workspace.json
.obsidian/cache
.trash/

# Sistem / tooling
.DS_Store
node_modules/
```

> Simpan `.obsidian/appearance.json`, `core-plugins.json`, dll. tetap di-commit jika ingin sinkron pengaturan: opsional.

**1.4** Commit pertama dan push:

```bash
git add -A
git commit -m "init vault"
git branch -M main
git remote add origin https://github.com/<username>/Obsidian-Vault.git
git push -u origin main
```

### Bagian 2: Tulis materi dengan format yang didukung

Website membaca Markdown polos. Struktur folder di vault **langsung menjadi struktur website**:

```
Obsidian-Vault/
├── CyberSecurity/
│   ├── Cyber Security.md          ← tag #Myskill (bidang)
│   └── Cryptography/
│       ├── Cryptography.md        ← tag #Subskill (skill)
│       └── Pengenalan.md          ← tag #roadmap (urutan belajar)
├── DevOps/
├── Jaringan/
└── Pemrograman/
    ├── Programming.md             ← #Myskill
    ├── PHP/
    └── JavaScript/
```

**Frontmatter** (YAML di awal file):

```markdown
---
title: Routing
tags: [subskill, php, laravel]
aliases: [Routing Laravel]
updated: 2026-08-11
---
```

**Tag khusus** yang dipakai website:

| Tag | Peran |
|---|---|
| `#Myskill` | Menandai file **bidang** (ditampilkan di statistik dashboard) |
| `#Subskill` | Menandai file **skill** (muncul di grid roadmap + statistik dashboard) |
| `#roadmap` | Menandai file **urutan belajar** suatu folder: isi dengan link berurutan |
| `#latihan` | Menandai materi latihan (badge khusus) |

> Semua tag lain (mis. `#php`, `#security`) menjadi badge topik biasa. Tag ditulis di frontmatter **atau** inline di teks (`#tag`), keduanya didukung.

**Wiki links** (gaya Obsidian):

```markdown
[[Routing]]
[[Pemrograman/PHP/Framework/Laravel/Routing|Routing Laravel]]
[[Routing#Route Parameters]]      ← anchor ke heading
![[gambar.png]]                   ← embed gambar
```

**Heading & Daftar Isi**: `#` sampai `######`. Daftar isi otomatis dibuat dari heading dan **indent sesuai level**: makin banyak `#`, makin dalam indentnya.

**Code block**: syntax highlighting + label + tombol Copy otomatis:

````markdown
```php
Route::get('/products', function () {
    return view('products');
});
```
````

**Callouts**:

```markdown
> [!note] Catatan
> Isi catatan penting.

> [!warning]
> Hati-hati dengan ini.
```

**Math (KaTeX)**:

```markdown
Rumus inline $E = mc^2$ dan display:
$$ \int_0^\infty e^{-x^2} dx = \frac{\sqrt{\pi}}{2} $$
```

**Roadmap**: buat file dengan tag `#roadmap` di dalam folder, isi dengan link ke materi secara berurutan:

```markdown
---
title: Roadmap PHP
tags: [roadmap]
---

# Roadmap PHP

1. [[Instalasi]]
2. [[Dasar Routing]]
3. [[Latihan Routing]]
```

Website akan menampilkan roadmap ini sebagai **pohon bercabang**: langkah berurutan ke bawah, dan file yang dirujuk tiap langkah tampil sebagai cabang.

### Bagian 3: Beri izin akses (token)

Website perlu **membaca** vault (saat sync) dan vault perlu **memberi tahu** website (mengirim sinyal).

**3.1 Token untuk website membaca vault** (`OBSIDIAN_VAULT_TOKEN`)

1. GitHub → Settings → Developer settings → **Personal access tokens** → *Fine-grained tokens* → Generate new token.
2. Pilih:
   - *Repository access*: **Only select repositories** → pilih repo vault.
   - *Permissions* → *Repository permissions* → **Contents: Read-only**.
3. Salin token, lalu di **repo website**: Settings → Secrets and variables → Actions → *New repository secret*:
   - Name: `OBSIDIAN_VAULT_TOKEN`
   - Value: token di atas.

**3.2 Token untuk vault memberi sinyal ke website** (`WEBSITE_DISPATCH_TOKEN`)

1. Buat *fine-grained token* baru (atau pakai *classic token* dengan scope `repo`):
   - *Repository access*: pilih **repo website**.
   - *Permissions* → **Contents: Read-only** (classic: cukup scope `repo`).
2. Di **repo vault**: Settings → Secrets and variables → Actions → *New repository secret*:
   - Name: `WEBSITE_DISPATCH_TOKEN`
   - Value: token di atas.
3. Tambahkan secret kedua di repo vault:
   - Name: `WEBSITE_REPOSITORY`
   - Value: `username/learning-web-aryanda` (nama repo website Anda)

### Bagian 4: Pasang workflow di repo vault

Buat file `.github/workflows/dispatch-website-sync.yml` di **repo vault**:

```yaml
name: Dispatch website sync

on:
  push:
    branches: [main]

jobs:
  dispatch:
    runs-on: ubuntu-latest
    steps:
      - name: Kirim sinyal vault-sync ke website
        uses: actions/github-script@v7
        with:
          github-token: ${{ secrets.WEBSITE_DISPATCH_TOKEN }}
          script: |
            const [owner, repo] = (
              process.env.WEBSITE_REPOSITORY || 'aryandaa/learning-web-aryanda'
            ).split('/');
            await github.rest.repos.createDispatchEvent({
              owner,
              repo,
              event_type: 'vault-sync',
              client_payload: {
                vaultCommit: context.sha,
                vaultBranch: context.ref.replace('refs/heads/', ''),
                repoCloneUrl: context.payload.repository.clone_url,
              },
            });
        env:
          WEBSITE_REPOSITORY: ${{ secrets.WEBSITE_REPOSITORY }}
```

> Workflow ini **hanya mengirim sinyal**: parsing dilakukan oleh repo website.

### Bagian 5: Alur sync otomatis (selesai!)

Sekarang, setiap kali Anda push perubahan ke vault:

```
Obsidian (menulis materi)
   → git push ke repo vault
   → workflow vault mengirim repository_dispatch: vault-sync
   → workflow website menerima sinyal
       → clone vault (pinned ke commit)
       → jalankan parser (generated/)
       → publish (public/)
       → commit otomatis "sync: update generated docs from vault"
   → Vercel auto-deploy
   → website diperbarui ✅
```

**Cara memicu manual** (tanpa push vault): di repo website → Actions → **Sync docs from Obsidian vault** → *Run workflow*.

**Cara mengecek status**: repo website → tab **Actions** → workflow `Sync docs from Obsidian vault`.

---

## 🧠 Parser Pipeline

Parser memproses vault dalam 8 tahap:

1. **Scan**: snapshot vault (markdown, folder, aset) sekali saja, deterministik.
2. **Validasi**: duplicate document id / output path = **fatal** (berhenti).
3. **Index**: frontmatter, judul, tag, alias, heading, reading time, excerpt.
4. **Resolve**: lookup wiki link (`[[Note]]`, `[[Note#Section]]`, embed) + urutan prev/next (DFS).
5. **Render**: Markdown → HTML (GFM, task list, KaTeX, highlight.js, callouts, wiki links, embeds) yang **disanitasi** dengan rehype-sanitize.
6. **Copy assets**: hanya menyalin aset yang **benar-benar direferensikan** dokumen ke `generated/assets/` (hemat ukuran).
7. **Write**: tulis `generated/docs/<struktur vault>/*.json`, `tree.json`, `search-index.json`, `graph.json`, `roadmaps.json`, `metadata.json`, `assets/manifest.json`, `warnings.json`.
8. **Publish**: salin ke `public/docs/` dan `public/assets/vault/` (hanya dua direktori itu yang disentuh).

Identitas dokumen = **path vault-relative yang dinormalisasi** (lowercase, tanpa ekstensi, spasi → `-`):

```
Pemrograman/PHP/Framework/Laravel/Routing.md  →  pemrograman/php/framework/laravel/routing
```

Dua file dengan nama sama di folder berbeda tetap dianggap dokumen berbeda (`PHP/Routing.md` ≠ `Laravel/Routing.md`).

---

## 📄 Halaman & Routing

| Route | Halaman |
|---|---|
| `/` | Beranda: hero, statistik (Catatan, Folder, Estimasi baca, Skill, Bidang), topik utama |
| `/docs` | Explorer seluruh struktur vault + strip subskill |
| `/docs/:id` | Dokumen: breadcrumb, tag, TOC hierarkis, konten, backlinks, prev/next |
| `/search` | Pencarian fuzzy (Fuse.js, index lazy) |
| `/graph` | Graph view antar-catatan (d3-force, canvas) |
| `/roadmap` | Landing grid semua `#Subskill` per bidang → detail roadmap bercabang |
| `/editor` | **Code Editor** interaktif (JS / TS / HTML / CSS / PHP / Python / SQL) |

**Code Editor** mendukung:

- **JavaScript**: sandbox iframe, `console.log/error/warn` ditangkap.
- **TypeScript**: ditranspilasi di browser (paket `typescript`, chunk lazy).
- **HTML**: preview halaman web langsung di iframe sandbox.
- **CSS**: kode CSS dirender ke halaman contoh di iframe (belajar styling web).
- **PHP**: dijalankan dengan php-wasm (WebAssembly); hasil echo/print dirender sebagai halaman web di panel output.
- **Python**: Pyodide (WASM) dimuat sekali dari CDN, stdout/stderr ditangkap.
- **SQL**: SQLite via sql.js (WASM); hasil query ditampilkan sebagai tabel ASCII di output.

Semua eksekusi terjadi di browser pengunjung: **tidak ada backend**.

---

## 📦 Generated Artifacts

```
generated/
├── docs/
│   ├── tree.json               # struktur folder recursive (dari vault)
│   ├── search-index.json       # index Fuse.js
│   ├── graph.json              # nodes + edges untuk graph view
│   ├── roadmaps.json           # file #roadmap + langkah belajarnya
│   ├── metadata.json           # total notes, folders, subskill/myskill, dll.
│   └── <struktur folder vault>/*.json   # satu JSON per dokumen
├── assets/
│   ├── manifest.json           # sourcePath → publicPath, size, hash
│   └── <struktur aset vault>
└── warnings.json               # broken links, missing images, dll.
```

Contoh dokumen JSON:

```json
{
  "id": "pemrograman/php/framework/laravel/routing",
  "title": "Routing",
  "slug": "routing",
  "relativePath": "Pemrograman/PHP/Framework/Laravel/Routing.md",
  "folder": "Pemrograman/PHP/Framework/Laravel",
  "html": "...",
  "headings": [{ "depth": 2, "text": "Route Parameters", "id": "route-parameters" }],
  "tags": ["php", "laravel"],
  "aliases": [],
  "breadcrumb": ["Pemrograman", "PHP", "Framework", "Laravel"],
  "readingTime": 5,
  "updated": null,
  "links": [],
  "backlinks": [],
  "previous": null,
  "next": "pemrograman/php/framework/laravel/latihan-route-parameter",
  "contentHash": "sha256:..."
}
```

---

## ☁️ Deploy

Hasil `npm run build` (folder `dist/`) bisa di-hosting di hosting statis mana pun.

### Vercel (disarankan)

File `vercel.json` sudah disiapkan (framework vite, output `dist`, rewrite SPA untuk deep link).

**Via dashboard:**

1. Import repo di https://vercel.com/new
2. Vercel otomatis mendeteksi Vite → build + deploy.
3. Setiap push ke `main` otomatis redeploy.

**Via CLI:**

```bash
npm i -g vercel
vercel          # preview
vercel --prod   # production
```

**Subpath (mis. GitHub Pages):** frontend mendeteksi root path secara otomatis (`src/lib/base.ts`) dan `base` relatif (`./`) di `vite.config.ts`, jadi situs aman di root maupun subpath seperti `https://user.github.io/Learning-Web-Aryanda/`.

---

## 🔒 Safety Guarantees

- Vault hanya **dibaca**; tidak ada penulisan balik ke Obsidian.
- Markdown vault tidak pernah masuk ke repository website (safety check di CI memastikan tidak ada `.md` di output).
- Publisher hanya menyentuh `public/docs/` dan `public/assets/vault/`.
- Duplicate id/path menghentikan generation (fatal).
- HTML disanitasi saat parsing (rehype-sanitize) sebelum dirender.
- Eksekusi kode di Code Editor berjalan di **sandbox iframe** (tidak bisa mengakses halaman induk).

---

## 🛟 Troubleshooting

| Gejala | Solusi |
|---|---|
| `npm run parse` error | Cek path `--vault` benar dan berisi `.md`. |
| DocsPage kosong | Cek `generated/docs/tree.json`: kalau tidak ada, jalankan parser. |
| Search kosong | Cek `generated/docs/search-index.json` ada. |
| Workflow vault tidak jalan | Cek secret `WEBSITE_DISPATCH_TOKEN` & `WEBSITE_REPOSITORY` di repo vault. |
| Workflow website gagal clone | Cek secret `OBSIDIAN_VAULT_TOKEN` (Contents: Read-only ke repo vault) di repo website. |
| Gambar rusak | Cek `generated/warnings.json` → `missingImages` (gambar memang tidak ada di vault). |
| Code Editor Python lambat/gagal | Butuh internet saat pertama Run (Pyodide di-download dari CDN). |
| Deep link 404 di produksi | Pastikan route baru didaftarkan di `index.html` + `src/lib/base.ts` (`ROUTE_SEGMENTS`). |
| Tema tidak tersimpan | Pastikan localStorage aktif; pilihan disimpan di key `lw-theme`. |

---

## 🤝 Kontribusi

Project ini open source. Cara berkontribusi:

1. **Fork** repository ini.
2. Buat branch fitur: `git checkout -b fitur-baru`.
3. Commit perubahan: `git commit -am "feat: deskripsi"`.
4. Push ke branch: `git push origin fitur-baru`.
5. Buat **Pull Request** di GitHub.

Pastikan sebelum PR:

```bash
npm run check   # typecheck TypeScript
npm run build   # build produksi (pastikan lulus)
```

---

## 🗺 Ide Pengembangan Selanjutnya

- [ ] Flashcards / quiz dari materi
- [ ] Progress belajar per dokumen
- [ ] PWA / offline mode
- [ ] Code editor: dukungan bahasa lain via WASM (mis. C/C++, Java, Bash)
- [ ] Export PDF per modul
- [ ] Mode presentasi slide dari heading

---

Dibuat dengan ❤️ oleh **M. Aryanda Sanggadiennata**: penyedia materi sekaligus developer web.
