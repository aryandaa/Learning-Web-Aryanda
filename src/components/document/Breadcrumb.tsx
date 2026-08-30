import { Link } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';

/**
 * Breadcrumb dibangun dari relativePath dokumen (spec §36).
 */
export function Breadcrumb({ folder, current }: { folder: string; current: string }) {
  const parts = folder ? folder.split('/') : [];

  return (
    <nav aria-label="Breadcrumb" className="flex min-w-0 flex-wrap items-center gap-x-1 gap-y-0.5 text-xs text-slate-500">
      <Link to="/" className="flex shrink-0 items-center gap-1 hover:text-slate-300">
        <Home className="h-3 w-3" />
        Home
      </Link>
      {parts.map((part, index) => {
        const path = parts.slice(0, index + 1).join('/');
        // Cari folder di dalam tree via relativePath yang cocok di fileMap
        // (folder tidak punya id sendiri. kami tampilkan sebagai teks).
        const key = `${path}-${index}`;
        return (
          <span key={key} className="flex min-w-0 items-center gap-1">
            <ChevronRight className="h-3 w-3 shrink-0" />
            <Link to="/docs" className="max-w-[9rem] truncate hover:text-slate-300" title={path}>
              {part}
            </Link>
          </span>
        );
      })}
      <span className="flex min-w-0 items-center gap-1">
        <ChevronRight className="h-3 w-3 shrink-0" />
        <span className="max-w-[40vw] truncate font-medium text-slate-300 sm:max-w-[24rem]">{current}</span>
      </span>
    </nav>
  );
}
