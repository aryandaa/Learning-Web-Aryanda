/**
 * Aktivitas belajar (personal dashboard). Disimpan lokal di browser.
 *
 * Namespace key khusus agar tidak bentrok dengan data lain:
 *   learning-web:last-read
 *   learning-web:reading-history
 *   learning-web:stats
 *
 * Tidak ada data yang dikirim ke server. Tidak ada analytics backend.
 */

export interface ReadingEntry {
  /** Id document (path normalized). Identifier utama, bukan slug. */
  documentId: string;
  relativePath: string;
  title: string;
  folder: string;
  slug: string;
  lastReadAt: string;
  /** 0..1 */
  scrollProgress: number;
}

export interface LearningStats {
  notesRead: number;
  sessions: number;
  categories: number;
  completed: number;
  lastActivity: string | null;
}

const KEY_LAST = 'learning-web:last-read';
const KEY_HISTORY = 'learning-web:reading-history';
const KEY_STATS = 'learning-web:stats';
const MAX_HISTORY = 20;

function read<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown): void {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* abaikan (private mode / quota) */
  }
}

export function getLastRead(): ReadingEntry | null {
  return read<ReadingEntry | null>(KEY_LAST, null);
}

export function getReadingHistory(): ReadingEntry[] {
  return read<ReadingEntry[]>(KEY_HISTORY, []);
}

export function getLearningStats(): LearningStats {
  return read<LearningStats>(KEY_STATS, { notesRead: 0, sessions: 0, categories: 0, completed: 0, lastActivity: null });
}

/** Catat pembukaan dokumen (upsert history, update last-read & stats). */
export function recordRead(entry: Omit<ReadingEntry, 'lastReadAt' | 'scrollProgress'>): void {
  const now = new Date().toISOString();
  const history = getReadingHistory();
  const idx = history.findIndex((h) => h.documentId === entry.documentId);
  const previous = idx !== -1 ? history[idx] : null;
  const full: ReadingEntry = { ...entry, lastReadAt: now, scrollProgress: previous?.scrollProgress ?? 0 };

  write(KEY_LAST, full);
  if (idx !== -1) history.splice(idx, 1);
  history.unshift(full);
  write(KEY_HISTORY, history.slice(0, MAX_HISTORY));

  const stats = getLearningStats();
  if (idx === -1) stats.notesRead += 1;
  stats.sessions += 1;
  stats.lastActivity = now;
  stats.categories = new Set(history.map((h) => h.folder)).size;
  stats.completed = history.filter((h) => h.scrollProgress >= 0.9).length;
  write(KEY_STATS, stats);
}

/** Update scroll progress (throttle di pemanggil). */
export function updateProgress(documentId: string, progress: number): void {
  const clamp = Math.max(0, Math.min(1, progress));
  const last = getLastRead();
  if (last && last.documentId === documentId) {
    write(KEY_LAST, { ...last, scrollProgress: clamp });
  }
  const history = getReadingHistory();
  const idx = history.findIndex((h) => h.documentId === documentId);
  if (idx !== -1 && Math.abs(history[idx].scrollProgress - clamp) > 0.005) {
    history[idx] = { ...history[idx], scrollProgress: clamp };
    write(KEY_HISTORY, history.slice(0, MAX_HISTORY));
    const stats = getLearningStats();
    stats.completed = history.filter((h) => h.scrollProgress >= 0.9).length;
    write(KEY_STATS, stats);
  }
}

export function getProgress(documentId: string): number | null {
  const entry = getReadingHistory().find((h) => h.documentId === documentId);
  return entry ? entry.scrollProgress : null;
}

/** Hapus entry lama yang dokumennya sudah tidak ada di tree (tanpa crash). */
export function pruneStaleHistory(validIds: Set<string>): void {
  const history = getReadingHistory();
  const filtered = history.filter((h) => validIds.has(h.documentId));
  if (filtered.length !== history.length) {
    write(KEY_HISTORY, filtered.slice(0, MAX_HISTORY));
  }
  const last = getLastRead();
  if (last && !validIds.has(last.documentId)) {
    try {
      window.localStorage.removeItem(KEY_LAST);
    } catch {
      /* abaikan */
    }
  }
}
