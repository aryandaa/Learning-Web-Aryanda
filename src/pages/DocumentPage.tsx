import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { FileQuestion, RotateCcw } from 'lucide-react';
import { useSiteData } from '../app/SiteProvider';
import { DocumentViewer } from '../components/document/DocumentViewer';
import { Spinner } from '../components/ui/spinner';
import { fetchDocument } from '../services/docs';
import { recordRead, updateProgress, getProgress } from '../services/learningActivity';
import type { DocumentData } from '../domain/types';
import { cn } from '../lib/utils';

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
  const [savedProgress, setSavedProgress] = useState<number | null>(null);
  const recordedIdRef = useRef<string | null>(null);
  const lastSaveRef = useRef(0);

  // Scroll progress: simpan saat berhenti/berkala (throttle 800ms).
  useEffect(() => {
    if (!doc) return;
    const onScroll = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      if (max <= 0) return;
      const pct = window.scrollY / max;
      const now = Date.now();
      if (now - lastSaveRef.current > 800) {
        lastSaveRef.current = now;
        updateProgress(doc.id, pct);
      }
    };
    const saveNow = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      if (max > 0) updateProgress(doc.id, window.scrollY / max);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('scrollend', saveNow, { passive: true });
    return () => {
      saveNow();
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('scrollend', saveNow);
    };
  }, [doc]);

  // Catat pembukaan dokumen + ambil progress tersimpan (untuk tombol lanjut).
  useEffect(() => {
    if (!doc) return;
    if (recordedIdRef.current !== doc.id) {
      recordedIdRef.current = doc.id;
      recordRead({
        documentId: doc.id,
        relativePath: doc.relativePath,
        title: doc.title,
        folder: doc.folder,
        slug: doc.slug,
      });
    }
    const p = getProgress(doc.id);
    setSavedProgress(p != null && p >= 0.08 && p <= 0.94 ? p : null);
  }, [doc]);

  const continueReading = () => {
    if (savedProgress == null) return;
    const max = document.documentElement.scrollHeight - window.innerHeight;
    window.scrollTo({ top: savedProgress * Math.max(0, max), behavior: 'smooth' });
  };

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setNotFound(false);
    setSavedProgress(null);
    recordedIdRef.current = null;

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

  return (
    <>
      {doc && savedProgress != null && (
        <button
          onClick={continueReading}
          className={cn(
            'fixed bottom-5 left-1/2 z-40 flex -translate-x-1/2 items-center gap-2 rounded-full border border-indigo-500/50 bg-indigo-500/15 px-4 py-2 text-xs font-medium text-indigo-200 shadow-lg shadow-indigo-500/10 backdrop-blur transition-colors hover:bg-indigo-500/25',
            'sm:left-auto sm:right-5 sm:translate-x-0'
          )}
        >
          <RotateCcw className="h-3.5 w-3.5" />
          Continue where you left off ({Math.round(savedProgress * 100)}%)
        </button>
      )}
      <DocumentViewer doc={doc} />
    </>
  );
}
