import { useParams, Link } from 'react-router-dom';
import docsIndex from '../../generated/docs/index.json';

export default function DocumentPage() {
  const { slug } = useParams();
  const doc = docsIndex.find((item: { slug: string }) => item.slug === slug);

  if (!doc) {
    return (
      <main className="mx-auto max-w-4xl px-4 py-10">
        <p className="text-slate-500">Document not found.</p>
        <Link to="/docs" className="text-blue-600 hover:underline">Back to docs</Link>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <article className="prose prose-slate max-w-none">
        <h1>{doc.title}</h1>
        <div dangerouslySetInnerHTML={{ __html: doc.html }} />
      </article>
      <Link to="/docs" className="mt-8 inline-block text-blue-600 hover:underline">Back to docs</Link>
    </main>
  );
}
