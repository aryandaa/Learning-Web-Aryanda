import { Link } from 'react-router-dom';
import {
  ArrowRight,
  BookOpen,
  Clock,
  ExternalLink,
  FileText,
  Folder,
  FolderTree,
  Github,
  Layers,
  Search,
  Sparkles,
  Star,
  UserRound,
} from 'lucide-react';
import { useSiteData } from '../app/SiteProvider';
import { joinWithRoot } from '../lib/base';
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
    },
    {
      icon: FolderTree,
      value: metadata?.totalFolders ?? 0,
      label: 'Folder',
    },
    {
      icon: Clock,
      value: `${Math.round((metadata?.totalNotes ?? 0) / 200)} jam`,
      label: 'Estimasi baca',
    },
    {
      icon: Layers,
      value: metadata?.subskillCount ?? 0,
      label: 'Skill',
    },
    {
      icon: Star,
      value: metadata?.myskillCount ?? 0,
      label: 'Bidang',
    },
  ];

  return (
    <div className="mx-auto max-w-5xl px-4 py-14 sm:px-6 sm:py-20">
      {/* ===================== HERO ===================== */}
      <header className="hero-bg relative overflow-hidden rounded-3xl px-6 py-14 text-center sm:px-10 sm:py-20">
        <img
          src={joinWithRoot('assets/asset/logo%20web.png')}
          alt="Logo CodeLearn"
          className="mx-auto h-16 w-16 object-contain sm:h-20 sm:w-20"
        />

        <span className="mt-7 inline-flex items-center gap-2 rounded-full border border-accent-100 bg-accent-50 px-4 py-1.5 text-xs font-semibold text-accent-700">
          <Sparkles className="h-3.5 w-3.5" />
          Personal learning platform
        </span>

        <h1 className="mx-auto mt-6 max-w-3xl text-4xl font-extrabold tracking-tight text-slate-50 sm:text-6xl">
          Belajar IT, <span className="text-gradient">langkah demi langkah.</span>
        </h1>

        <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-slate-400 sm:text-lg">
          Dokumentasi dengan navigasi, pencarian, graph antar-catatan, dan roadmap belajar.
          Materi disusun oleh{' '}
          <span className="font-semibold text-slate-200">M. Aryanda Sanggadiennata</span>, penyedia
          materi sekaligus developer web.
        </p>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
          <Link
            to="/docs"
            className="inline-flex items-center gap-2 rounded-lg bg-accent-500 px-6 py-3 text-sm font-semibold text-white shadow-sm transition-all hover:bg-accent-600"
          >
            <BookOpen className="h-4 w-4" />
            Jelajahi Docs
          </Link>
          <Link
            to="/search"
            className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-900 px-6 py-3 text-sm font-medium text-slate-300 transition-colors hover:border-accent-300 hover:bg-accent-500/10"
          >
            <Search className="h-4 w-4" />
            Cari Materi
          </Link>
          <a
            href="https://portofolioaryanda.vercel.app/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-lg border border-accent-500/40 bg-accent-500/10 px-6 py-3 text-sm font-medium text-accent-300 transition-colors hover:bg-accent-500/20 hover:text-accent-200"
          >
            <UserRound className="h-4 w-4" />
            Profile Pembuat
          </a>
        </div>
      </header>

      {/* ===================== STATISTIK ===================== */}
      <section className="mt-14 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {stats.map((stat) => (
          <div key={stat.label} className="card card-hover flex items-center gap-4 p-5">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent-100 text-accent-600">
              <stat.icon className="h-5 w-5" />
            </span>
            <div>
              <p className="text-2xl font-bold tabular-nums text-slate-50">{stat.value}</p>
              <p className="mt-0.5 text-xs font-medium text-slate-500">{stat.label}</p>
            </div>
          </div>
        ))}
      </section>

      {/* ===================== TOPIK UTAMA ===================== */}
      <section className="mt-16">
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-2.5 text-lg font-bold text-slate-50">
            <span className="h-5 w-1 rounded-full bg-accent-500" />
            Topik Utama
          </h2>
          <Link
            to="/docs"
            className="inline-flex items-center gap-1 text-sm font-medium text-accent-600 transition-colors hover:text-accent-700"
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
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-100 text-accent-600 transition-colors group-hover:bg-accent-200/60">
                  <Folder className="h-5 w-5" />
                </span>
                <div>
                  <h3 className="font-semibold text-slate-200 transition-colors group-hover:text-slate-50">
                    {folder.name}
                  </h3>
                  <p className="mt-0.5 text-xs text-slate-400">
                    {countFiles(folder.children)} catatan
                  </p>
                </div>
              </div>
              <ArrowRight className="h-4 w-4 text-slate-600 transition-transform group-hover:translate-x-1 group-hover:text-accent-500" />
            </Link>
          ))}
        </div>
      </section>

      {/* ===================== PART OF ===================== */}
      <section className="mt-16">
        <h2 className="flex items-center gap-2.5 text-lg font-bold text-slate-50">
          <span className="h-5 w-1 rounded-full bg-accent-500" />
          Part Of
        </h2>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {/* Politeknik Negeri Banjarmasin */}
          <a
            href="https://poliban.ac.id/"
            target="_blank"
            rel="noopener noreferrer"
            className="group card card-hover flex items-center gap-4 p-5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500/50"
          >
            <span className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white p-1 ring-1 ring-slate-800 transition-transform duration-200 group-hover:scale-105">
              <img
                src={joinWithRoot('assets/asset/Logo%20Poliban.jpeg')}
                alt=""
                className="h-full w-full object-contain"
              />
            </span>
            <div className="min-w-0 flex-1">
              <h3 className="font-semibold leading-snug text-slate-200 transition-colors group-hover:text-slate-50">
                Politeknik Negeri Banjarmasin
              </h3>
            </div>
            <ExternalLink className="h-4 w-4 shrink-0 text-slate-600 transition-colors group-hover:text-accent-500" />
          </a>

          {/* Itech Poliban */}
          <a
            href="https://www.itechpoliban.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="group card card-hover flex items-center gap-4 p-5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500/50"
          >
            <span className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white p-1 ring-1 ring-slate-800 transition-transform duration-200 group-hover:scale-105">
              <img
                src={joinWithRoot('assets/asset/logo%20itech%20poliban.png')}
                alt=""
                className="h-full w-full object-contain"
              />
            </span>
            <div className="min-w-0 flex-1">
              <h3 className="font-semibold text-slate-200 transition-colors group-hover:text-slate-50">
                Itech Poliban
              </h3>
            </div>
            <ExternalLink className="h-4 w-4 shrink-0 text-slate-600 transition-colors group-hover:text-accent-500" />
          </a>

          {/* Makat-Xploit — placeholder, belum ada URL */}
          <div className="card flex items-center gap-4 p-5">
            <img
              src={joinWithRoot('assets/asset/logo%20makat-xploit.jpeg')}
              alt=""
              className="h-12 w-12 shrink-0 rounded-xl object-contain"
            />
            <div className="min-w-0 flex-1">
              <h3 className="font-semibold text-slate-200">Makat-Xploit</h3>
            </div>
          </div>
        </div>
      </section>

      {/* ===================== OPEN SOURCE ===================== */}
      <section className="panel-soft-green mt-16 rounded-2xl border border-accent-100 p-6 sm:p-8">
        <div className="flex flex-col items-start gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-4">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-slate-800 bg-slate-900 shadow-sm">
              <Github className="h-6 w-6 text-slate-200" />
            </span>
            <div>
              <h2 className="flex items-center gap-2.5 text-lg font-bold text-slate-50">
                Project Open Source
                <span className="rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-300">
                  Open Source
                </span>
              </h2>
              <p className="mt-1.5 max-w-xl text-sm leading-relaxed text-slate-400">
                Website ini adalah project open source. Kamu bisa ikut berkontribusi,
                melaporkan bug, menambahkan fitur, atau memakai kodenya untuk project
                belajarmu sendiri. Semua kontribusi sangat diterima!
              </p>
            </div>
          </div>
          <a
            href="https://github.com/aryandaa/Learning-Web-Aryanda"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-accent-500 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-accent-600"
          >
            <Github className="h-4 w-4" />
            Jadilah Contributor
          </a>
        </div>
      </section>
    </div>
  );
}
