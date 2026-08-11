import { Link } from 'react-router-dom';
import {
  ArrowRight,
  BookOpen,
  Clock,
  FileText,
  Folder,
  FolderTree,
  Search,
  Sparkles,
  UserRound,
} from 'lucide-react';
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

  const stats = [
    {
      icon: FileText,
      value: metadata?.totalNotes ?? 0,
      label: 'Catatan',
      tile: 'from-indigo-500 to-violet-600',
      shadow: 'shadow-indigo-500/30',
    },
    {
      icon: FolderTree,
      value: metadata?.totalFolders ?? 0,
      label: 'Folder',
      tile: 'from-amber-500 to-orange-600',
      shadow: 'shadow-amber-500/30',
    },
    {
      icon: Clock,
      value: `${Math.round((metadata?.totalNotes ?? 0) / 200)} jam`,
      label: 'Estimasi baca',
      tile: 'from-teal-500 to-emerald-600',
      shadow: 'shadow-teal-500/30',
    },
  ];

  return (
    <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6 sm:py-20">
      {/* Hero */}
      <header className="text-center">
        <span className="inline-flex items-center gap-2 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-4 py-1.5 text-xs font-medium text-indigo-300">
          <Sparkles className="h-3.5 w-3.5" />
          Personal learning platform — materi dari Obsidian Vault
        </span>

        <h1 className="mx-auto mt-6 max-w-3xl text-4xl font-extrabold tracking-tight text-slate-50 sm:text-6xl">
          Belajar IT, <span className="text-gradient">langkah demi langkah.</span>
        </h1>

        <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-slate-400 sm:text-lg">
          Dokumentasi statis dengan navigasi, pencarian, graph antar-catatan, dan roadmap
          belajar yang ter-resolve otomatis — semua dari catatan Obsidian Anda.
        </p>

        <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
          <Link
            to="/docs"
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-500 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-500/30 transition-all hover:bg-indigo-400 hover:shadow-indigo-500/50"
          >
            <BookOpen className="h-4 w-4" />
            Jelajahi Docs
          </Link>
          <Link
            to="/search"
            className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-900/60 px-6 py-3 text-sm font-medium text-slate-200 transition-colors hover:border-slate-500 hover:bg-slate-800"
          >
            <Search className="h-4 w-4" />
            Cari Materi
          </Link>
          <a
            href="https://portofolioaryanda.vercel.app/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-lg border border-indigo-500/40 bg-indigo-500/10 px-6 py-3 text-sm font-medium text-indigo-300 transition-colors hover:bg-indigo-500/20 hover:text-indigo-200"
          >
            <UserRound className="h-4 w-4" />
            Profile Pembuat
          </a>
        </div>
      </header>

      {/* Statistik */}
      <section className="mt-16 grid gap-4 sm:grid-cols-3">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="card card-hover flex items-center gap-4 p-5"
          >
            <span
              className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br ${stat.tile} shadow-lg ${stat.shadow}`}
            >
              <stat.icon className="h-5 w-5 text-white" />
            </span>
            <div>
              <p className="text-2xl font-bold tabular-nums text-slate-50">{stat.value}</p>
              <p className="mt-0.5 text-xs text-slate-500">{stat.label}</p>
            </div>
          </div>
        ))}
      </section>

      {/* Topik Utama */}
      <section className="mt-16">
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-2.5 text-lg font-semibold text-slate-100">
            <span className="h-5 w-1 rounded-full bg-gradient-to-b from-indigo-400 to-violet-500" />
            Topik Utama
          </h2>
          <Link
            to="/docs"
            className="inline-flex items-center gap-1 text-sm text-indigo-400 transition-colors hover:text-indigo-300"
          >
            Semua docs <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {topFolders.map((folder) => (
            <Link
              key={folder.relativePath}
              to="/docs"
              className="group card card-hover flex items-center justify-between p-5"
            >
              <div className="flex items-center gap-3.5">
                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-800/80 text-indigo-400 transition-colors group-hover:bg-indigo-500/15 group-hover:text-indigo-300">
                  <Folder className="h-5 w-5" />
                </span>
                <div>
                  <h3 className="font-semibold text-slate-200 transition-colors group-hover:text-white">
                    {folder.name}
                  </h3>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {countFiles(folder.children)} catatan
                  </p>
                </div>
              </div>
              <ArrowRight className="h-4 w-4 text-slate-600 transition-transform group-hover:translate-x-1 group-hover:text-indigo-400" />
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
