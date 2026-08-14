/** Unit test layanan aktivitas belajar (localStorage mock). Jalankan: npm run learn:check */
const store = new Map<string, string>();
const fakeLocalStorage = {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => { store.set(k, String(v)); },
  removeItem: (k: string) => { store.delete(k); },
} as unknown as Storage;
(globalThis as { window?: unknown }).window = { localStorage: fakeLocalStorage } as Window & typeof globalThis;

import {
  recordRead, updateProgress, getProgress, getLastRead, getReadingHistory,
  getLearningStats, pruneStaleHistory,
} from '../src/services/learningActivity';

let pass = 0;
let fail = 0;
function checkTrue(name: string, cond: boolean) {
  if (cond) { pass++; console.log(`  ✅ ${name}`); }
  else { fail++; console.log(`  ❌ ${name}`); }
}

const base = {
  documentId: 'pemrograman/php/laravel/routing',
  relativePath: 'Pemrograman/PHP/Laravel/Routing.md',
  title: 'Laravel Routing',
  folder: 'Pemrograman/PHP/Laravel',
  slug: 'routing',
};

console.log('Learning activity service:');
// 1. record pertama
recordRead(base);
checkTrue('history berisi 1', getReadingHistory().length === 1);
checkTrue('last-read terisi', getLastRead()?.documentId === base.documentId);
checkTrue('notesRead = 1', getLearningStats().notesRead === 1);
checkTrue('sessions = 1', getLearningStats().sessions === 1);

// 2. update progress
updateProgress(base.documentId, 0.72);
checkTrue('getProgress 0.72', Math.abs((getProgress(base.documentId) ?? 0) - 0.72) < 0.01);
checkTrue('last-read progress ikut', Math.abs((getLastRead()?.scrollProgress ?? 0) - 0.72) < 0.01);

// 3. buka lagi dokumen sama -> tidak duplikat
recordRead(base);
checkTrue('history tetap 1 (no duplicate)', getReadingHistory().length === 1);
checkTrue('notesRead tetap 1', getLearningStats().notesRead === 1);
checkTrue('sessions = 2', getLearningStats().sessions === 2);
checkTrue('progress dipertahankan', Math.abs((getReadingHistory()[0]?.scrollProgress ?? 0) - 0.72) < 0.01);

// 4. dokumen kedua
recordRead({ ...base, documentId: 'jaringan/http/fundamental', title: 'HTTP Fundamentals', folder: 'Jaringan/HTTP', slug: 'http' });
checkTrue('history = 2', getReadingHistory().length === 2);
checkTrue('notesRead = 2', getLearningStats().notesRead === 2);
checkTrue('history urut by lastReadAt', getReadingHistory()[0]?.documentId === 'jaringan/http/fundamental');
checkTrue('categories = 2', getLearningStats().categories === 2);

// 5. selesaikan satu dokumen
updateProgress('jaringan/http/fundamental', 0.95);
checkTrue('completed = 1', getLearningStats().completed === 1);

// 6. prune stale
pruneStaleHistory(new Set(['jaringan/http/fundamental']));
checkTrue('entry stale dihapus', getReadingHistory().length === 1);
checkTrue('last-read stale dibersihkan', getLastRead() === null || getLastRead()?.documentId === 'jaringan/http/fundamental');

console.log(`\nLearning selfcheck: ${pass} pass, ${fail} fail`);
if (fail > 0) process.exit(1);
