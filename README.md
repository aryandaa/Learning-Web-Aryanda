# Learning Web Aryanda

Proyek ini adalah website statis yang membaca materi dari Obsidian Vault dan mengubahnya menjadi dokumen yang dapat ditampilkan oleh React.

## Struktur utama

- `.github/workflows/`
  - `sync-docs.yml`: workflow website yang menerima `repository_dispatch` dan membangun data dari vault.
  - `dispatch-website-sync.yml`: workflow di vault repo untuk memberi tahu website bahwa vault sudah berubah.
- `scripts/parse-docs.ts`: entrypoint parser untuk mengubah vault Markdown menjadi `generated/` dan `public/assets/vault/`.
- `scripts/parser/parser.ts`: logika parsing markdown, transformasi HTML, dan penulisan `index.json`.
- `generated/docs/index.json`: daftar dokumen yang dibaca oleh website.
- `public/`: aset publik, termasuk `public/assets/vault` untuk file non-markdown dari vault.
- `src/`: aplikasi React.

## Instalasi awal

1. Pastikan berada di folder proyek:
   ```bash
   cd /home/r3x/Documents/learning-web-Aryanda
   ```
2. Install dependensi:
   ```bash
   npm install
   ```

## Menjalankan parser secara lokal

1. Pastikan Anda memiliki salinan lokal Obsidian Vault.
2. Jalankan parser dengan path ke vault:
   ```bash
   npm run parse -- --vault /path/to/Obsidian-Vault
   ```
3. Jika berhasil, file `generated/docs/index.json` akan terisi.
4. Untuk memeriksa apakah dokumen berhasil diparse, buka `generated/docs/index.json`.

## Menjalankan website lokal

1. Setelah parser selesai, jalankan:
   ```bash
   npm run dev
   ```
2. Buka browser di:
   ```text
   http://localhost:4173
   ```
3. Halaman yang tersedia:
   - `/`: halaman utama
   - `/docs`: daftar dokumen
   - `/docs/:slug`: halaman dokumen
   - `/search`: pencarian dokumen

## Setup GitHub Actions

### Di repository Obsidian Vault

1. Buat file `.github/workflows/dispatch-website-sync.yml` di repo vault.
2. Tambahkan secret repository:
   - `WEBSITE_DISPATCH_TOKEN`
   - `WEBSITE_REPOSITORY`

3. `WEBSITE_REPOSITORY` harus berupa `owner/repo`, misal:
   ```text
   aryandaa/learning-web-Aryanda
   ```

4. Pastikan `WEBSITE_DISPATCH_TOKEN` memiliki izin minimal untuk memicu `repository_dispatch`.

### Di repository website

1. Pastikan file `.github/workflows/sync-docs.yml` ada.
2. Workflow ini akan berjalan ketika menerima event `repository_dispatch` dengan tipe `vault-sync`.
3. Workflow akan melakukan:
   - clone vault dengan `git clone --depth 1`
   - jalankan parser `npm run parse -- --vault /tmp/vault-clone`
   - validasi output
   - commit perubahan yang dihasilkan (`generated/` dan `public/assets/vault/`)

## Mengapa materi belum muncul

Materi akan muncul hanya jika:

1. Vault berisi file Markdown (`.md`).
2. Path vault valid saat menjalankan parser.
3. Parser berhasil menulis `generated/docs/index.json`.
4. Website menggunakan `generated/docs/index.json` sebagai sumber data.

## Troubleshooting

- Jika `npm run parse` error:
  - Pastikan path ke vault benar.
  - Pastikan vault punya file `.md`.
  - Buka log error untuk detail.

- Jika `DocsPage` kosong:
  - Buka `generated/docs/index.json`.
  - Kalau array kosong, parser tidak menemukan Markdown.

- Jika workflow GitHub tidak berjalan:
  - Periksa secret `WEBSITE_DISPATCH_TOKEN`.
  - Pastikan `WEBSITE_REPOSITORY` benar.
  - Pastikan event `vault-sync` terkirim dari repo vault.

## Perintah berguna

```bash
npm run parse -- --vault /path/to/Obsidian-Vault
npm run dev
npm run build
npm run check
```

## Catatan penting

- Vault adalah sumber materinya. Jangan ubah file Markdown, nama file, atau struktur folder materi.
- Website hanya membaca vault dan menghasilkan JSON/artifak statis.
- Jangan menyimpan salinan Markdown vault di dalam repository website.
