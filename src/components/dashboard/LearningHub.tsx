/**
 * Personal learning hub untuk Dashboard.
 *
 * Section: Continue Learning, Recently Updated, Recently Read, Learning Stats.
 * Semua aktivitas disimpan lokal di browser (localStorage, namespace learning-web:*).
 * Tidak ada data yang dikirim ke server.
 */

import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight, BookOpen, Clock, Folder, History, Layers, Lock, TrendingUp,
} from 'lucide-react';
import type { TreeFolderNode } from '../../domain/types';
import { buildFileMap } from '../../services/docs';
import {
  getLastRead, getReadingHistory, getLearningStats, pruneStaleHistory,
  type LearningStats, type ReadingEntry,
} from '../../services/learningActivity';
import { cn } from '../../lib/utils';

// ---------------------------------------------------------------------------
// Helper waktu relatif (lokal)
// ---------------------------------------------------------------------------

function formatRelative(iso: string | null | undefined): string {
  if (!iso) return 'belum pernah';
  const ms = Date.now() - new Date(iso).getTime();
  if (ms < 0 || Number.isNaN(ms)) return 'baru saja';
  const minutes = Math.floor(ms / 60000);
  if (minutes < 1) return 'baru saja';
  if (minutes < 60) return `${minutes} menit lalu`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} jam lalu`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'kemarin';
  if (days < 7) return `${days} hari lalu`;
  return new Date(iso).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatProgress(pct: number): string {
  return `${Math.round(pct)}%`;
}

function ProgressBar({ value, className }: { value: number; className?: string }) {
  const pct = Math.max(0, Math.min(100, value * 100));
  return (
    <div className={cn('h-2 w-full overflow-hidden rounded-full bg-slate-800', className)}>
      <div
        className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 transition-all"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Continue Learning
// ---------------------------------------------------------------------------

function ContinueLearning({ lastRead }: { lastRead: ReadingEntry | null }) {
  return (
    <section aria-label="Continue Learning">
      <h2 className="flex items-center gap-2.5 text-lg font-semibold text-slate-100">
        <span className="h-5 w-1 rounded-full bg-gradient-to-b from-indigo-400 to-violet-500" />
        Continue Learning
      </h2>

      {!lastRead ? (
        <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-900/40 p-6 text-center">
          <BookOpen className="mx-auto h-8 w-8 text-slate-600" />
          <h3 className="mt-3 text-base font-semibold text-slate-200">Start your first lesson</h3>
          <p className="mx-auto mt-1 max-w-sm text-sm text-slate-500">
            Materi yang kamu baca akan muncul di sini, lengkap dengan progress membacanya.
          </p>
          <Link
            to="/docs"
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-indigo-500 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 transition-all hover:bg-indigo-400"
          >
            Jelajahi Docs <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      ) : (
        <div className="card mt-4 flex flex-col gap-5 p-5 sm:p-6 lg:flex-row lg:items-center">
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Terakhir dibaca</p>
            <Link
              to={`/docs/${lastRead.documentId}`}
              className="mt-1 block truncate text-lg font-semibold text-slate-100 transition-colors hover:text-indigo-300"
            >
              {lastRead.title}
            </Link>
            <p className="mt-1 flex items-center gap-1.5 text-xs text-slate-500">
              <Folder className="h-3 w-3" />
              <span className="truncate">{lastRead.folder || 'Root'}</span>
            </p>
            <div className="mt-4 max-w-md">
              <div className="mb-1.5 flex items-center justify-between text-xs">
                <span className="text-slate-400">Progress</span>
                <span className="font-medium tabular-nums text-indigo-300">{formatProgress(lastRead.scrollProgress)}</span>
              </div>
              <ProgressBar value={lastRead.scrollProgress} />
            </div>
            <p className="mt-2 flex items-center gap-1.5 text-xs text-slate-600">
              <Clock className="h-3 w-3" />
              Last opened {formatRelative(lastRead.lastReadAt)}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2 lg:flex-col lg:items-stretch">
            <Link
              to={`/docs/${lastRead.documentId}`}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-500 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 transition-all hover:bg-indigo-400"
            >
              Continue Reading <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      )}
    </section>
  );
}

// ---------------------------------------------------------------------------
// Recently Updated (dari index opsional; tanpa data -> empty state jujur)
// ---------------------------------------------------------------------------

export interface UpdatedIndexEntry {
  id: string;
  title: string;
  folder: string;
  updated: string;
}

async function fetchUpdatedIndex(): Promise<UpdatedIndexEntry[]> {
  try {
    const url = `${import.meta.env.BASE_URL}docs/updated-index.json`;
    const res = await fetch(url, { headers: { Accept: 'application/json' } });
    if (!res.ok) return [];
    const json = (await res.json()) as unknown;
    return Array.isArray(json) ? (json as UpdatedIndexEntry[]) : [];
  } catch {
    return [];
  }
}

function RecentlyUpdated() {
  const [items, setItems] = useState<UpdatedIndexEntry[] | null>(null);
  useEffect(() => {
    let cancelled = false;
    fetchUpdatedIndex().then((list) => {
      if (cancelled) return;
      const sorted = [...list].sort((a, b) => (a.updated < b.updated ? 1 : -1)).slice(0, 8);
      setItems(sorted);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section aria-label="Recently Updated">
      <h2 className="flex items-center gap-2.5 text-lg font-semibold text-slate-100">
        <span className="h-5 w-1 rounded-full bg-gradient-to-b from-emerald-400 to-teal-500" />
        Recently Updated
        <span className="hidden text-xs font-normal text-slate-500 sm:inline">materi terbaru dari vault</span>
      </h2>
      <div className="mt-4 space-y-2">
        {items === null && (
          <div className="rounded-xl border border-slate-800 bg-slate-900/40 px-4 py-6 text-center text-sm text-slate-500">
            Memuat daftar materi terbaru…
          </div>
        )}
        {items !== null && items.length === 0 && (
          <div className="rounded-xl border border-slate-800 bg-slate-900/40 px-4 py-6 text-center text-sm text-slate-500">
            Data pembaruan materi belum tersedia dari vault (catatan belum menyertakan tanggal update).
            <span className="mt-1 block text-xs text-slate-600">
              Section ini akan otomatis terisi bila vault menyediakan metadata tanggal.
            </span>
          </div>
        )}
        {items !== null &&
          items.length > 0 &&
          items.map((item) => (
            <Link
              key={item.id}
              to={`/docs/${item.id}`}
              className="card card-hover group flex items-center justify-between gap-3 p-3.5"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-slate-200 transition-colors group-hover:text-indigo-300">
                  {item.title}
                </p>
                <p className="mt-0.5 truncate text-xs text-slate-500">{item.folder || 'Root'}</p>
              </div>
              <span className="shrink-0 rounded bg-slate-800/80 px-2 py-1 text-[10px] text-slate-500">
                Updated {formatRelative(item.updated)}
              </span>
            </Link>
          ))}
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Recently Read
// ---------------------------------------------------------------------------

function RecentlyRead({ history }: { history: ReadingEntry[] }) {
  if (history.length === 0) return null;
  return (
    <section aria-label="Recently Read">
      <h2 className="flex items-center gap-2.5 text-lg font-semibold text-slate-100">
        <span className="h-5 w-1 rounded-full bg-gradient-to-b from-cyan-400 to-sky-500" />
        Recently Read
      </h2>
      <div className="mt-4 flex flex-wrap gap-2">
        {history.slice(0, 8).map((entry, i) => (
          <Link
            key={entry.documentId}
            to={`/docs/${entry.documentId}`}
            className="card card-hover group flex max-w-full items-center gap-2.5 px-3.5 py-2"
          >
            <span className="w-5 shrink-0 text-right font-mono text-xs text-slate-600">{i + 1}</span>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-slate-200 transition-colors group-hover:text-indigo-300">
                {entry.title}
              </p>
              <p className="truncate text-[11px] text-slate-600">{entry.folder || 'Root'}</p>
            </div>
            <span className="ml-1 shrink-0 text-[10px] text-slate-600">{formatRelative(entry.lastReadAt)}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Learning Stats
// ---------------------------------------------------------------------------

function StatTile({ icon: Icon, value, label }: { icon: typeof BookOpen; value: string | number; label: string }) {
  return (
    <div className="card flex items-center gap-3 p-4">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-500/15 text-indigo-300">
        <Icon className="h-4.5 w-4.5" />
      </span>
      <div className="min-w-0">
        <p className="truncate text-xl font-bold tabular-nums text-slate-50">{value}</p>
        <p className="truncate text-[11px] text-slate-500">{label}</p>
      </div>
    </div>
  );
}

function LearningStatsCard({ stats }: { stats: LearningStats }) {
  return (
    <section aria-label="Learning Stats">
      <h2 className="flex items-center gap-2.5 text-lg font-semibold text-slate-100">
        <span className="h-5 w-1 rounded-full bg-gradient-to-b from-amber-400 to-orange-500" />
        Learning Stats
      </h2>
      <div className="mt-4 grid grid-cols-2 gap-2">
        <StatTile icon={BookOpen} value={stats.notesRead} label="Notes Read" />
        <StatTile icon={Layers} value={stats.categories} label="Categories" />
        <StatTile icon={History} value={stats.sessions} label="Sessions" />
        <StatTile icon={TrendingUp} value={stats.completed} label="Completed" />
        <div className="col-span-2 card flex items-center gap-2 p-3 text-xs text-slate-500">
          <Clock className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">Last activity: {stats.lastActivity ? formatRelative(stats.lastActivity) : 'belum ada'}</span>
        </div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Hub utama
// ---------------------------------------------------------------------------

export default function LearningHub({ tree }: { tree: TreeFolderNode[] }) {
  const [lastRead, setLastRead] = useState<ReadingEntry | null>(() => getLastRead());
  const [history, setHistory] = useState<ReadingEntry[]>(() => getReadingHistory());
  const [stats, setStats] = useState<LearningStats>(() => getLearningStats());

  // Bersihkan entry stale (dokumen sudah dihapus dari vault) tanpa crash.
  useEffect(() => {
    const fileMap = buildFileMap(tree);
    pruneStaleHistory(new Set(fileMap.keys()));
    setLastRead(getLastRead());
    setHistory(getReadingHistory());
    setStats(getLearningStats());
  }, [tree]);

  return (
    <div className="space-y-12">
      <ContinueLearning lastRead={lastRead} />

      <div className="grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <RecentlyUpdated />
        </div>
        <div>
          <LearningStatsCard stats={stats} />
        </div>
      </div>

      <RecentlyRead history={history} />

      <p className="flex items-center justify-center gap-1.5 text-center text-xs text-slate-600">
        <Lock className="h-3 w-3" />
        Your learning activity is stored locally in this browser. No data is sent to any server.
      </p>
    </div>
  );
}

