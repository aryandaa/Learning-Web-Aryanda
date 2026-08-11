import { Link } from 'react-router-dom';
import { CornerUpLeft } from 'lucide-react';
import type { DocumentData } from '../../domain/types';

/**
 * Panel backlink: dokumen lain yang mereferensikan dokumen ini
 * (data dihitung oleh parser, spec §28).
 */
export function Backlinks({ doc }: { doc: DocumentData }) {
  if (doc.backlinks.length === 0) return null;

  return (
    <section className="mt-10 rounded-xl border border-slate-800 bg-slate-900/40 p-5">
      <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-slate-400">
        <CornerUpLeft className="h-4 w-4" />
        Dirujuk oleh · {doc.backlinks.length}
      </h2>
      <ul className="mt-3 flex flex-wrap gap-2">
        {doc.backlinks.map((backlink) => (
          <li key={backlink.id}>
            <Link
              to={`/docs/${backlink.id}`}
              className="inline-block rounded-lg border border-slate-700 bg-slate-800/60 px-3 py-1.5 text-sm text-slate-300 transition-colors hover:border-indigo-500/50 hover:text-indigo-300"
            >
              {backlink.title}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
