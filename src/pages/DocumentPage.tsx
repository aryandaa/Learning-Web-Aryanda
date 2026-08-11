import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { FileQuestion } from 'lucide-react';
import { useSiteData } from '../app/SiteProvider';
import { DocumentViewer } from '../components/document/DocumentViewer';
import { Spinner } from '../components/ui/spinner';
import { fetchDocument } from '../services/docs';
import type { DocumentData } from '../domain/types';

/**
 * Halaman dokumen. URL /docs/:id* membawa stable id (path normalized).
 * Dokumen dimuat on-demand (spec §35 & §38).
 */
export default function DocumentPage() {
  const { '*': idParam } = useParams();
  const id = idParam ? decodeURIComponent(idParam) : '';
  const { fileMap, loading: siteLoading } = useSiteData();

  const [doc, setDoc] = useState<DocumentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setNotFound(false);

    const entry = fileMap.get(id);
    if (!entry) {
      setLoading(false);
      setNotFound(true);
      return;
    }

    fetchDocument(entry.outputPath)
      .then((data) => {
        if (!cancelled) setDoc(data);
      })
      .catch(() => {
        if (!cancelled) setNotFound(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [id, fileMap]);

  if (siteLoading || loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Spinner />
      </div>
    );
  }

  if (notFound || !doc) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center py-20 text-center">
        <FileQuestion className="h-10 w-10 text-slate-700" />
        <h1 className="mt-4 text-xl font-bold text-slate-100">Dokumen tidak ditemukan</h1>
        <p className="mt-2 text-sm text-slate-500">
          Tidak ada dokumen dengan id <code className="rounded bg-slate-900 px-1.5 py-0.5 text-xs">{id}</code>
        </p>
        <Link
          to="/docs"
          className="mt-6 inline-flex items-center gap-2 rounded-lg bg-indigo-500 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-400"
        >
          Kembali ke Docs
        </Link>
      </div>
    );
  }

  return <DocumentViewer doc={doc} />;
}
