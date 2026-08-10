import { Link } from 'react-router-dom';
import docsIndex from '../../generated/docs/index.json';

export default function DocsPage() {
  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <h1 className="text-3xl font-bold">Documentation</h1>
      <p className="mt-2 text-slate-600">Generated from your Obsidian vault.</p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        {docsIndex.map((doc: { slug: string; title: string; excerpt: string }) => (
          <Link key={doc.slug} to={`/docs/${encodeURIComponent(doc.slug)}`} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:border-slate-300">
            <h2 className="text-xl font-semibold">{doc.title}</h2>
            <p className="mt-2 text-slate-500">{doc.excerpt}</p>
          </Link>
        ))}
      </div>
    </main>
  );
}
