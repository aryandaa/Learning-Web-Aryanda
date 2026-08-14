/**
 * Timeline intelligence. deteksi & normalisasi timestamp ke ISO 8601.
 */

export interface TimelineEvent {
  rawTimestamp: string;
  iso: string;
  source: string;
  line: string;
  format: string;
}

// ISO 8601: 2026-08-13T10:20:00Z / 2026-08-13 10:20:00 / 2026-08-13
const RE_ISO = /\b(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{1,3}))?)?)?(Z|[+-]\d{2}:?\d{2})?\b/g;

// DD/MM/YYYY (atau MM/DD/YYYY. dikonfigurasi user)
const RE_DMY = /\b(\d{1,2})\/(\d{1,2})\/(\d{4})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?)?\b/g;

// Mon DD HH:MM:SS (syslog)
const RE_SYSLOG = /\b([A-Z][a-z]{2})\s+(\d{1,2})\s+(\d{2}):(\d{2}):(\d{2})\b/g;

const MONTHS: Record<string, number> = { jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11 };

export function extractTimeline(text: string, opts: { dayFirst?: boolean } = {}): TimelineEvent[] {
  const dayFirst = opts.dayFirst ?? true;
  const events: TimelineEvent[] = [];
  const seen = new Set<string>();
  const lines = text.replace(/\r\n/g, '\n').split('\n');

  lines.forEach((line, idx) => {
    const source = `line ${idx + 1}`;
    const add = (iso: string | null, raw: string, format: string) => {
      if (!iso) return;
      const key = `${iso}|${source}`;
      if (seen.has(key)) return;
      seen.add(key);
      events.push({ rawTimestamp: raw, iso, source, line, format });
    };

    let m: RegExpExecArray | null;
    const r1 = new RegExp(RE_ISO.source, 'g');
    while ((m = r1.exec(line)) !== null) {
      const [, y, mo, d, hh = '00', mm = '00', ss = '00', frac = '', tz = ''] = m;
      const offset = tz || 'Z';
      const iso = `${y}-${mo}-${d}T${hh}:${mm}:${ss}${frac ? '.' + frac : ''}${offset === 'Z' ? 'Z' : offset}`;
      const date = new Date(iso);
      if (!Number.isNaN(date.getTime())) add(date.toISOString(), m[0], 'ISO 8601');
      if (m[0] === '') r1.lastIndex++;
    }

    const r2 = new RegExp(RE_DMY.source, 'g');
    while ((m = r2.exec(line)) !== null) {
      const [, a, b, y, hh = '00', mm = '00', ss = '00'] = m;
      const [d, mo] = dayFirst ? [a, b] : [b, a];
      const iso = `${y}-${mo.padStart(2, '0')}-${d.padStart(2, '0')}T${hh}:${mm}:${ss}Z`;
      const date = new Date(iso);
      if (!Number.isNaN(date.getTime()) && Number(d) <= 31 && Number(mo) <= 12) {
        add(date.toISOString(), m[0], dayFirst ? 'DD/MM/YYYY' : 'MM/DD/YYYY');
      }
      if (m[0] === '') r2.lastIndex++;
    }

    const r3 = new RegExp(RE_SYSLOG.source, 'g');
    while ((m = r3.exec(line)) !== null) {
      const [, mon, d, hh, mm, ss] = m;
      const month = MONTHS[mon.toLowerCase()];
      if (month !== undefined) {
        const year = new Date().getFullYear();
        const date = new Date(Date.UTC(year, month, Number(d), Number(hh), Number(mm), Number(ss)));
        if (!Number.isNaN(date.getTime())) add(date.toISOString(), m[0], 'syslog');
      }
      if (m[0] === '') r3.lastIndex++;
    }
  });

  return events;
}

export function sortEvents(events: TimelineEvent[], dir: 'asc' | 'desc'): TimelineEvent[] {
  const sorted = [...events].sort((a, b) => (a.iso < b.iso ? -1 : a.iso > b.iso ? 1 : 0));
  return dir === 'asc' ? sorted : sorted.reverse();
}

export function filterEvents(
  events: TimelineEvent[],
  opts: { from?: string; to?: string; keyword?: string; source?: string }
): TimelineEvent[] {
  return events.filter((e) => {
    if (opts.from && e.iso < opts.from) return false;
    if (opts.to && e.iso > opts.to) return false;
    if (opts.keyword && !e.line.toLowerCase().includes(opts.keyword.toLowerCase())) return false;
    if (opts.source && e.source !== opts.source) return false;
    return true;
  });
}
