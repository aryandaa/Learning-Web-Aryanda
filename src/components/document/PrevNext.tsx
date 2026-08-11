import { ArrowLeft, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useSiteData } from '../../app/SiteProvider';
import type { DocumentData } from '../../domain/types';

/**
 * Navigasi Previous/Next memakai stable id (spec §37).
 */
export function PrevNext({ doc }: { doc: DocumentData }) {
  const { fileMap } = useSiteData();
  if (!doc.previous && !doc.next) return null;

  const prev = doc.previous ? fileMap.get(doc.previous) : undefined;
  const next = doc.next ? fileMap.get(doc.next) : undefined;

  return (
    <nav
      aria-label="Navigasi antar dokumen"
      className="mt-10 grid gap-3 border-t border-slate-800 pt-6 sm:grid-cols-2"
    >
      {prev ? (
        <Link
          to={`/docs/${doc.previous}`}
          className="group flex items-start gap-3 rounded-xl border border-slate-800 bg-slate-900/50 p-4 transition-colors hover:border-slate-700 hover:bg-slate-900"
        >
          <ArrowLeft className="mt-0.5 h-4 w-4 shrink-0 text-slate-500 group-hover:text-indigo-400" />
          <span className="min-w-0">
            <span className="block text-xs text-slate-500">Sebelumnya</span>
            <span className="block truncate text-sm font-medium text-slate-200 group-hover:text-indigo-300">
              {prev.title}
            </span>
          </span>
        </Link>
      ) : (
        <span />
      )}
      {next ? (
        <Link
          to={`/docs/${doc.next}`}
          className="group flex items-start justify-end gap-3 rounded-xl border border-slate-800 bg-slate-900/50 p-4 text-right transition-colors hover:border-slate-700 hover:bg-slate-900"
        >
          <span className="min-w-0">
            <span className="block text-xs text-slate-500">Selanjutnya</span>
            <span className="block truncate text-sm font-medium text-slate-200 group-hover:text-indigo-300">
              {next.title}
            </span>
          </span>
          <ArrowRight className="mt-0.5 h-4 w-4 shrink-0 text-slate-500 group-hover:text-indigo-400" />
        </Link>
      ) : (
        <span />
      )}
    </nav>
  );
}
