import { useEffect, useState } from 'react';
import Fuse from 'fuse.js';
import docsIndex from '../../generated/docs/index.json';
import { Link } from 'react-router-dom';

const fuse = new Fuse(docsIndex, {
  keys: ['title', 'excerpt', 'slug'],
  threshold: 0.35,
});

export default function SearchPage() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>(docsIndex);

  useEffect(() => {
    if (!query.trim()) {
      setResults(docsIndex);
      return;
    }
    setResults(fuse.search(query).map((result) => result.item));
  }, [query]);

  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <h1 className="text-3xl font-bold">Search</h1>
      <input
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Search documents"
        className="mt-4 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm focus:border-slate-400 focus:outline-none"
      />

      <div className="mt-8 space-y-3">
        {results.map((doc: any) => (
          <Link key={doc.slug} to={`/docs/${encodeURIComponent(doc.slug)}`} className="block rounded-2xl border border-slate-200 bg-white p-6 shadow-sm hover:border-slate-300">
            <h2 className="text-xl font-semibold">{doc.title}</h2>
            <p className="mt-2 text-slate-500">{doc.excerpt}</p>
          </Link>
        ))}
      </div>
    </main>
  );
}
