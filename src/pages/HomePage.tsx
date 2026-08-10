import { Link } from 'react-router-dom';

export default function HomePage() {
  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <header className="mb-10">
        <p className="text-sm text-slate-500">Personal learning platform</p>
        <h1 className="text-4xl font-bold tracking-tight text-slate-900">Learning Web Aryanda</h1>
        <p className="mt-4 max-w-2xl text-slate-600">Browse your Obsidian vault content as a static workshop with search, documents, and structured navigation.</p>
      </header>

      <section className="grid gap-4 sm:grid-cols-2">
        <Link to="/docs" className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:border-slate-300">
          <h2 className="text-xl font-semibold">Docs browser</h2>
          <p className="mt-2 text-slate-600">Explore generated documentation from your Obsidian vault.</p>
        </Link>
        <Link to="/search" className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:border-slate-300">
          <h2 className="text-xl font-semibold">Search</h2>
          <p className="mt-2 text-slate-600">Search through documents with fuzzy matching.</p>
        </Link>
      </section>
    </main>
  );
}
