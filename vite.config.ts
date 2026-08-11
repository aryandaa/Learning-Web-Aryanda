import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// base relatif (./) pada BUILD membuat asset JS/CSS ikut relatif, sehingga
// aman di root maupun subpath (GitHub Pages). Pada DEV, base harus '/' —
// base relatif membuat Vite dev server gagal melayani file dari public/.
// Path data (docs/*.json) dihitung runtime di src/lib/base.ts.
export default defineConfig(({ command }) => ({
  plugins: [react()],
  base: command === 'build' ? './' : '/',
  server: {
    port: 4173,
  },
}));
