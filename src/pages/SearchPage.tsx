import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FolderOpen, Search as SearchIcon, X } from 'lucide-react';
import { useFuseSearch } from '../services/search';
import { fetchSearchIndex } from '../services/docs';
import { Input } from '../components/ui/input';
import { Spinner } from '../components/ui/spinner';
import type { SearchIndexEntry } from '../domain/types';

/**
 * Pencarian fuzzy (Fuse.js). Search index dimuat lazy hanya
 * saat halaman ini dibuka (spec §38).
 */
export default function SearchPage() {
  const [index, setIndex] = useState<SearchIndexEntry[] | null>(null);
  const [indexError, setIndexError] = useState<string | null>(null);
  const { query, setQuery, results } = useFuseSearch(index);

  useEffect(() => {
    let cancelled = false;
    fetchSearchIndex()
      .then((data) => {
        if (!cancelled) setIndex(data);
      })
      .catch((err) => {
        if (!cancelled) setIndexError((err as Error).message);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-0">
      <header className="mb-6">
        <p className="eyebrow">Pencarian</p>
        <h1 className="mt-1.5 text-3xl font-bold tracking-tight text-slate-50">Cari Materi</h1>
        <p className="mt-2 text-sm text-slate-500">
          Cari judul, heading, isi, dan tag dari seluruh catatan.
        </p>
      </header>

      <div className="relative">
        <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Cari materi…"
          className="h-11 pl-9 pr-9"
          autoFocus
        />
        {query && (
          <button
            onClick={() => setQuery('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
            aria-label="Bersihkan"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      <div className="mt-6">
        {indexError && (
          <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-300">
            {indexError}. Jalankan parser untuk membuat search-index.json.
          </p>
        )}

        {!index && !indexError && (
          <div className="flex justify-center py-16">
            <Spinner />
          </div>
        )}

        {index && !query.trim() && (
          <p className="py-10 text-center text-sm text-slate-600">
            Ketik untuk mulai mencari. Index berisi {index.length} catatan.
          </p>
        )}

        {index && query.trim() && results && (
          <div className="space-y-3">
            {results.length === 0 && (
              <p className="py-10 text-center text-sm text-slate-500">
                Tidak ada hasil untuk “{query.trim()}”.
              </p>
            )}
            {results.map((result) => (
              <Link
                key={result.id}
                to={`/docs/${result.id}`}
                className="card card-hover group block p-5"
              >
                <div className="flex items-start justify-between gap-4">
                  <h2 className="font-semibold text-slate-100 transition-colors group-hover:text-accent-300">
                    {result.title}
                  </h2>
                </div>
                {result.folder && (
                  <p className="mt-1.5 flex items-center gap-1.5 text-xs text-slate-500">
                    <FolderOpen className="h-3 w-3" />
                    {result.folder}
                  </p>
                )}
                {result.excerpt && (
                  <p className="mt-2 line-clamp-2 text-sm text-slate-400">{result.excerpt}</p>
                )}
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
