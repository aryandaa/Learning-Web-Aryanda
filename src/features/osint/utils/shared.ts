/**
 * Util bersama OSINT: export (JSON/CSV/TXT) via Blob, sanitasi string untuk
 * render aman, pembentukan waktu ISO, dan helper status.
 */

export function nowIso(): string {
  return new Date().toISOString();
}

// ---------------------------------------------------------------------------
// Export (Blob API, tanpa backend)
// ---------------------------------------------------------------------------

function downloadBlob(content: string, filename: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportJson(data: unknown, filename: string) {
  downloadBlob(JSON.stringify(data, null, 2), filename, 'application/json');
}

/** rows: array of object. kolom diambil dari header pertama yang konsisten. */
export function exportCsv(rows: Record<string, unknown>[], filename: string) {
  if (rows.length === 0) return;
  const headers = Object.keys(rows[0]);
  const esc = (v: unknown) => {
    const s = String(v ?? '');
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [headers.map(esc).join(',')];
  for (const row of rows) lines.push(headers.map((h) => esc(row[h])).join(','));
  downloadBlob('\uFEFF' + lines.join('\n'), filename, 'text/csv;charset=utf-8');
}

export function exportTxt(text: string, filename: string) {
  downloadBlob(text, filename, 'text/plain;charset=utf-8');
}

// ---------------------------------------------------------------------------
// Sanitasi sebelum render (jangan pernah pakai dangerouslySetInnerHTML tanpa ini)
// ---------------------------------------------------------------------------

/** Validasi URL eksternal sebelum dijadikan link (hanya http/https). */
export function safeExternalUrl(raw: string): string | null {
  try {
    const u = new URL(raw);
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return null;
    return u.href;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Format angka / durasi
// ---------------------------------------------------------------------------

export function fmtNumber(n: number): string {
  return n.toLocaleString('id-ID');
}

export function fmtBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  const units = ['KB', 'MB', 'GB', 'TB'];
  let v = n;
  let u = -1;
  do {
    v /= 1024;
    u++;
  } while (v >= 1024 && u < units.length - 1);
  return `${v.toFixed(v >= 100 ? 0 : 2)} ${units[u]}`;
}

// ---------------------------------------------------------------------------
// Status state (Idle / Processing / Success / Warning / Error)
// ---------------------------------------------------------------------------

