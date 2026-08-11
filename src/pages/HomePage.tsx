import { Link } from 'react-router-dom';
import { ArrowRight, BookOpen, FileText, FolderTree, Search, UserRound } from 'lucide-react';
import { useSiteData } from '../app/SiteProvider';
import { countFiles } from '../services/docs';
import { Spinner } from '../components/ui/spinner';

export default function HomePage() {
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
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <h1 className="text-2xl font-bold text-slate-100">Data belum tersedia</h1>
        <p className="mt-3 text-sm leading-relaxed text-slate-400">
          {error ?? 'tree.json tidak ditemukan.'} Jalankan parser terlebih dahulu:
        </p>
        <pre className="mt-4 overflow-x-auto rounded-lg border border-slate-800 bg-slate-900 p-4 text-left text-xs text-slate-300">
          npm run parse -- --vault=/path/ke/Obsidian-Vault
        </pre>
      </div>
    );
  }

  const topFolders = tree.slice(0, 8);

  return (
    <div className="mx-auto max-w-5xl px-4 py-14 sm:px-6">
      <header className="text-center">
        <p className="text-sm font-medium uppercase tracking-widest text-indigo-400">
          Personal learning platform
        </p>
        <h1 className="mt-3 text-4xl font-bold tracking-tight text-slate-50 sm:text-5xl">
          Halo, Aryanda! 👋
        </h1>
        <p className="mt-2 text-lg font-medium text-indigo-300">
          Learning Web Aryanda
        </p>
        <p className="mx-auto mt-4 max-w-2xl text-slate-400">
          Materi belajar dari Obsidian Vault, disajikan sebagai dokumentasi statis —
          dengan navigasi, pencarian, dan tautan antar-catatan yang ter-resolve otomatis.
        </p>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link
            to="/docs"
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-500 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-indigo-400"
          >
            <BookOpen className="h-4 w-4" />
            Jelajahi Docs
          </Link>
          <Link
            to="/search"
            className="inline-flex items-center gap-2 rounded-lg border border-slate-700 px-5 py-2.5 text-sm font-medium text-slate-300 transition-colors hover:bg-slate-800"
          >
            <Search className="h-4 w-4" />
            Cari Materi
          </Link>
          <a
            href="https://portofolioaryanda.vercel.app/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-lg border border-indigo-500/40 bg-indigo-500/10 px-5 py-2.5 text-sm font-medium text-indigo-300 transition-colors hover:bg-indigo-500/20 hover:text-indigo-200"
          >
            <UserRound className="h-4 w-4" />
            Profile Pembuat
          </a>
        </div>
      </header>

      <section className="mt-12 grid gap-3 sm:grid-cols-3">
        <div className="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-900/50 p-4">
          <FileText className="h-5 w-5 text-indigo-400" />
          <div>
            <p className="text-xl font-bold tabular-nums text-slate-100">{metadata?.totalNotes ?? 0}</p>
            <p className="text-xs text-slate-500">Catatan</p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-900/50 p-4">
          <FolderTree className="h-5 w-5 text-amber-400" />
          <div>
            <p className="text-xl font-bold tabular-nums text-slate-100">{metadata?.totalFolders ?? 0}</p>
            <p className="text-xs text-slate-500">Folder</p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-900/50 p-4">
          <BookOpen className="h-5 w-5 text-teal-400" />
          <div>
            <p className="text-xl font-bold tabular-nums text-slate-100">
              {Math.round((metadata?.totalNotes ?? 0) / 200)} jam
            </p>
            <p className="text-xs text-slate-500">Estimasi baca</p>
          </div>
        </div>
      </section>

      <section className="mt-12">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-100">Topik Utama</h2>
          <Link
            to="/docs"
            className="inline-flex items-center gap-1 text-sm text-indigo-400 hover:text-indigo-300"
          >
            Semua docs <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {topFolders.map((folder) => (
            <Link
              key={folder.relativePath}
              to="/docs"
              className="group flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900/50 p-5 transition-colors hover:border-slate-700 hover:bg-slate-900"
            >
              <div>
                <h3 className="font-semibold text-slate-200 group-hover:text-indigo-300">
                  {folder.name}
                </h3>
                <p className="mt-1 text-xs text-slate-500">
                  {countFiles(folder.children)} catatan
                </p>
              </div>
              <ArrowRight className="h-4 w-4 text-slate-600 transition-transform group-hover:translate-x-1 group-hover:text-indigo-400" />
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
