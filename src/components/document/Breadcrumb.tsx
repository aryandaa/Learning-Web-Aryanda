import { Link } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';
import { useSiteData } from '../../app/SiteProvider';

/**
 * Breadcrumb dibangun dari relativePath dokumen (spec §36).
 */
export function Breadcrumb({ folder, current }: { folder: string; current: string }) {
  const { fileMap } = useSiteData();

  const parts = folder ? folder.split('/') : [];

  return (
    <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-1 text-xs text-slate-500">
      <Link to="/" className="flex items-center gap-1 hover:text-slate-300">
        <Home className="h-3 w-3" />
        Home
      </Link>
      {parts.map((part, index) => {
        const path = parts.slice(0, index + 1).join('/');
        // Cari folder di dalam tree via relativePath yang cocok di fileMap
        // (folder tidak punya id sendiri — kami tampilkan sebagai teks).
        const key = `${path}-${index}`;
        return (
          <span key={key} className="flex items-center gap-1">
            <ChevronRight className="h-3 w-3" />
            <Link to="/docs" className="hover:text-slate-300" title={path}>
              {part}
            </Link>
          </span>
        );
      })}
      <span className="flex items-center gap-1">
        <ChevronRight className="h-3 w-3" />
        <span className="font-medium text-slate-300">{current}</span>
      </span>
    </nav>
  );
}

export { useSiteData };
