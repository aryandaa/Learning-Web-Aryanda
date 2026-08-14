/**
 * Menentukan root path aplikasi secara runtime.
 *
 * Masalah: dengan `base: '/'` (default), fetch absolut `/docs/tree.json`
 * akan 404 jika website di-hosting di subpath, mis. GitHub Pages:
 *   https://user.github.io/Learning-Web-Aryanda/docs/tree.json  ← 404
 *
 * Solusi: deteksi root dari URL halaman. Route aplikasi hanya:
 *   /, /docs, /docs/*, /search, /graph, /roadmap, /editor
 * jadi root = segmen URL sebelum route tersebut (atau seluruh path
 * jika sedang di halaman beranda subpath).
 */
const ROUTE_SEGMENTS = ['docs', 'search', 'graph', 'roadmap', 'editor', 'cysec-tools'];

function detectBasePath(pathname: string): string {
  const parts = pathname.split('/').filter(Boolean);
  if (parts.length === 0) return '/';

  const firstRouteIndex = parts.findIndex((part) => ROUTE_SEGMENTS.includes(part.toLowerCase()));
  if (firstRouteIndex === -1) {
    // Halaman beranda (atau route tak dikenal): root = seluruh pathname.
    return pathname.endsWith('/') ? pathname : `${pathname}/`;
  }
  if (firstRouteIndex === 0) return '/';
  return `/${parts.slice(0, firstRouteIndex).join('/')}/`;
}

export function appRoot(): string {
  // 1) Base eksplisit dari Vite (dipakai jika dikonfigurasi bukan root).
  const configured = import.meta.env.BASE_URL;
  if (configured && configured !== '/' && configured !== './') {
    return configured.endsWith('/') ? configured : `${configured}/`;
  }

  // 2) Dibuka via file:// — fetch JSON tidak akan pernah jalan.
  if (typeof window !== 'undefined' && window.location.protocol === 'file:') {
    throw new Error(
      'Aplikasi dibuka langsung dari file (file://). Jalankan melalui server: npm run dev atau npm run preview.'
    );
  }

  // 3) Deteksi otomatis dari pathname (root ataupun subpath).
  return detectBasePath(window.location.pathname);
}

/** Menggabungkan root aplikasi dengan path relatif. */
export function joinWithRoot(relativePath: string): string {
  const root = appRoot();
  return `${root}${relativePath}`;
}
