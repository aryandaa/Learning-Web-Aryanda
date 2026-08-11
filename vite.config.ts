import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// base relatif (./) + <base> dinamis di index.html membuat asset (JS/CSS)
// bekerja di root maupun subpath (GitHub Pages project site). Path data
// (docs/*.json) dihitung runtime di src/lib/base.ts.
export default defineConfig({
  plugins: [react()],
  base: './',
  server: {
    port: 4173,
  },
});
