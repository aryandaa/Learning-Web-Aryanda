import { useSiteData } from '../app/SiteProvider';
import { TreeExplorer } from '../components/explorer/TreeExplorer';
import { Spinner } from '../components/ui/spinner';
import { countFiles } from '../services/docs';

/**
 * Halaman index dokumen: seluruh struktur vault divisualisasikan
 * sebagai pohon eksplorasi (recursive, tanpa hardcode folder).
 */
export default function DocsPage() {
  const { tree, metadata, loading, error } = useSiteData();

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Spinner />
      </div>
    );
  }

  if (error || !tree) {
    return (
      <div className="mx-auto max-w-2xl py-16 text-center text-sm text-slate-400">
        {error ?? 'tree.json belum tersedia — jalankan parser terlebih dahulu.'}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl">
      <header className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-slate-50">Semua Dokumen</h1>
        <p className="mt-1 text-sm text-slate-500">
          {metadata?.totalNotes ?? 0} catatan dalam {metadata?.totalFolders ?? 0} folder ·
          klik folder untuk memperluas
        </p>
      </header>

      <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4">
        <TreeExplorer nodes={tree} variant="page" />
      </div>

      <p className="mt-6 text-center text-xs text-slate-600">
        Total: {countFiles(tree)} dokumen
      </p>
    </div>
  );
}
