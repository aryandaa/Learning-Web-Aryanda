# Learning Web Aryanda

Personal learning platform berbasis web. Materi ditulis di **Obsidian**, dan website ini secara otomatis membaca vault, mengubah seluruh Markdown menjadi data statis, lalu menampilkannya sebagai website pembelajaran.

```
Obsidian Vault (SOURCE OF TRUTH)
      │  git push
      ▼
Vault GitHub Action ── repository_dispatch: vault-sync ──► Website GitHub Action
      │                                                        │
      │                                                        ▼
      │                                          clone vault (--depth 1) ke /tmp
      │                                                        │
      │                                                        ▼
      │                                          Parser Pipeline (scanner → validator
      │                                          → indexer → link resolver → renderer
      │                                          → asset copier → json writer → publisher)
      │                                                        │
      │                                                        ▼
      │                                          generated/ ──► public/
      │                                                        │
      │                                                        ▼
      │                                          React website (static) → deploy
```

## Arsitektur singkat

| Lapisan | Peran |
|---|---|
| `aryandaa/Obsidian-Vault` | Sumber materi. **Tidak pernah diubah oleh project ini** — hanya dibaca. |
| `scripts/parser/` | Pipeline modular yang mengubah vault menjadi data JSON + aset. |
| `generated/` | Hasil transformasi (per-doc JSON, tree, search index, metadata, warnings, manifest). Di-commit. |
| `public/` | Hasil publish: `public/docs/` dan `public/assets/vault/` (dibaca website). |
| `src/` | React SPA: dark-first, sidebar recursive, pencarian fuzzy, dokumen load-on-demand. |

Tidak ada backend, tidak ada database, tidak ada API write. Hasil akhir adalah **static website**.

## Instalasi

```bash
npm install
```

## Menjalankan parser secara lokal

```bash
npm run parse -- --vault=/path/ke/Obsidian-Vault
```

Opsi tambahan:

```bash
npm run parse -- --vault=/path/ke/vault \
  --commit=<sha> --branch=main \
  --exclude="Folder A" --exclude="Folder B" \
  --no-publish --no-assets
```

`--exclude` mengecualikan seluruh folder (beserta isinya) dari website — berguna untuk catatan pribadi. Folder `Note Personal` sudah dikecualikan secara default di `scripts/parser/parser.config.ts`.

Variabel lingkungan fallback: `VAULT_PATH`, `VAULT_COMMIT`, `VAULT_BRANCH`, `GENERATED_DIR`.

Parser melakukan:

1. **Scan** — snapshot vault (markdown, folder, aset) sekali saja.
2. **Validasi** — duplicate document id / output path = **fatal**.
3. **Index** — frontmatter, judul, tag, alias, heading, reading time, excerpt.
4. **Resolve** — lookup wiki link + urutan prev/next (DFS).
5. **Render** — Markdown → HTML (GFM, task list, KaTeX, syntax highlighting, callouts, wiki links, embeds) yang **disanitasi** dengan rehype-sanitize.
6. **Copy assets** — semua file non-Markdown → `generated/assets/`.
7. **Write** — `generated/docs/<struktur vault>/*.json`, `tree.json`, `search-index.json`, `metadata.json`, `assets/manifest.json`, `warnings.json`.
8. **Publish** — salin ke `public/docs/` dan `public/assets/vault/` (hanya dua direktori itu yang disentuh).

## Menjalankan website lokal

```bash
npm run dev        # http://localhost:4173
npm run build      # produksi ke dist/
npm run check      # typecheck TypeScript
```

Halaman:

- `/` — beranda + statistik
- `/docs` — eksplorasi seluruh struktur vault
- `/docs/<id>` — dokumen (id = path normalized, mis. `/docs/pemrograman/php/routing`)
- `/search` — pencarian fuzzy (index dimuat lazy)

## Generated artifacts

```
generated/
├── docs/
│   ├── tree.json               # struktur folder recursive (dari vault)
│   ├── search-index.json       # index Fuse.js
│   ├── metadata.json           # total notes, folders, commit, dll.
│   └── <struktur folder vault>/*.json   # satu JSON per dokumen
├── assets/
│   ├── manifest.json           # sourcePath → publicPath, size, hash
│   └── <struktur aset vault>
└── warnings.json               # broken links, missing images, dll.
```

Dokumen JSON contoh:

```json
{
  "id": "pemrograman/php/routing",
  "title": "Routing",
  "slug": "routing",
  "relativePath": "Pemrograman/PHP/Routing.md",
  "html": "...",
  "headings": [],
  "tags": [],
  "aliases": [],
  "breadcrumb": ["Pemrograman", "PHP"],
  "readingTime": 5,
  "links": [],
  "backlinks": [],
  "previous": null,
  "next": "...",
  "contentHash": "sha256:..."
}
```

## GitHub Actions

### Di repository Obsidian (sekali setup)

File `.github/workflows/dispatch-website-sync.yml` (sudah tersedia di folder ini sebagai referensi — salin ke vault).

Secrets yang dibutuhkan di vault:

- `WEBSITE_DISPATCH_TOKEN` — token dengan izin `repo` untuk mengirim `repository_dispatch`.
- `WEBSITE_REPOSITORY` — misal `aryandaa/learning-web-aryanda`.

Workflow hanya mengirim sinyal `vault-sync` — **tidak melakukan parsing**.

### Di repository website

`.github/workflows/sync-docs.yml`:

1. Menerima `repository_dispatch` (atau `workflow_dispatch` untuk manual).
2. Clone vault shallow ke `/tmp/vault-clone` (pinned ke commit dispatch).
3. Jalankan parser → `generated/` → publish ke `public/`.
4. Validasi artifact (tree, search-index, metadata, manifest).
5. Safety check: tidak boleh ada `.md` di `public/docs` / `public/assets/vault`.
6. Commit `generated/` + `public/` jika ada perubahan.
7. Hapus clone sementara.

## Deploy

Hasil `npm run build` (folder `dist/`) bisa di-hosting di hosting statis mana pun:

- **Cloudflare Pages / Netlify / Vercel** — build command `npm run build`, output `dist`. Rewrite SPA otomatis ditangani.
- **GitHub Pages** — `public/404.html` + restore route di `main.tsx` sudah disiapkan. Jika di-hosting di subpath (project site), set `base` di `vite.config.ts` ke subpath tersebut.

## Safety guarantees

- Vault hanya **dibaca**; tidak ada penulisan balik ke Obsidian.
- Markdown vault tidak pernah masuk ke repository website.
- Publisher hanya menyentuh `public/docs/` dan `public/assets/vault/` — file lain (favicon, 404.html) aman.
- Duplicate id/path menghentikan generation (fatal).
- HTML disanitasi saat parsing (rehype-sanitize) sebelum dirender.

## Troubleshooting

| Gejala | Solusi |
|---|---|
| `npm run parse` error | Cek path `--vault` benar dan berisi `.md`. |
| DocsPage kosong | Cek `generated/docs/tree.json` — kalau tidak ada, jalankan parser. |
| Search kosong | Cek `generated/docs/search-index.json` ada. |
| Workflow tidak jalan | Cek secret `WEBSITE_DISPATCH_TOKEN` / `WEBSITE_REPOSITORY`, dan event `vault-sync` terkirim. |
| Gambar rusak | Cek `generated/warnings.json` → `missingImages` (gambar memang tidak ada di vault). |

## Perintah berguna

```bash
npm run parse -- --vault=/path/ke/vault   # generate artifacts
npm run dev                               # develop
npm run build                             # produksi
npm run check                             # typecheck
```
