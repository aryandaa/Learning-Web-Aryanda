import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// base: '/' works for root-level hosting (Cloudflare Pages, Netlify, Vercel,
// GitHub Pages user/organization sites). For a GitHub Pages *project* site
// deployed under a subpath, set base to that subpath, e.g. '/learning-web/'.
export default defineConfig({
  plugins: [react()],
  base: '/',
  server: {
    port: 4173,
  },
});
