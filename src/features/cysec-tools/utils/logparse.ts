/**
 * Log Analyzer. parsing Apache/Nginx access log, auth.log (sshd), dan log
 * generik. Seluruhnya client-side; tidak ada pengiriman log ke server.
 */

export type LogFormat = 'apache-combined' | 'apache-common' | 'auth' | 'generic';

export interface LogEvent {
  lineNumber: number;
  raw: string;
  ip: string | null;
  timestamp: string | null;
  method: string | null;
  path: string | null;
  status: number | null;
  userAgent: string | null;
  message: string | null;
  authResult: 'success' | 'failure' | 'invalid' | null;
  authUser: string | null;
  source: 'http' | 'ssh' | 'app';
}

export interface LogAnalysis {
  format: LogFormat;
  totalLines: number;
  parsed: number;
  errors: number;
  events: LogEvent[];
  uniqueIps: { ip: string; count: number; failures: number }[];
  methods: { method: string; count: number }[];
  statuses: { status: string; count: number }[];
  paths: { path: string; count: number }[];
  userAgents: { ua: string; count: number }[];
  timeline: { key: string; count: number }[];
  authFailures: { user: string; count: number }[];
  suspicious: { severity: 'low' | 'medium' | 'high'; title: string; detail: string }[];
  sample: string[];
}

const HTTP_RE = /^(\S+)\s+(\S+)\s+(\S+)\s+\[([^\]]+)\]\s+"([^"]*)"\s+(\d{3})(?:\s+(\S+))?(?:\s+"([^"]*)"\s+"([^"]*)")?/;

const AUTH_RE = /^([A-Z][a-z]{2}\s+\d{1,2}\s+\d{2}:\d{2}:\d{2})\s+(\S+)\s+([\w.+-]+\[?\d*\]?):\s+(.*)$/;

export function analyzeLog(text: string): LogAnalysis {
  const lines = text.replace(/\r\n/g, '\n').split('\n');
  const events: LogEvent[] = [];
  let httpCount = 0;
  let authCount = 0;
  let genericCount = 0;
  let format: LogFormat = 'generic';
  const sample = lines.slice(0, 5);

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    if (!raw.trim()) continue;
    let ev: LogEvent | null = null;

    const hm = HTTP_RE.exec(raw);
    if (hm) {
      httpCount++;
      const reqParts = hm[5].split(' ');
      const method = reqParts[0] || null;
      const path = reqParts[1] || null;
      ev = {
        lineNumber: i + 1,
        raw,
        ip: hm[1] === '-' ? null : hm[1],
        timestamp: hm[4],
        method,
        path,
        status: parseInt(hm[6], 10) || null,
        userAgent: hm[9] && hm[9] !== '-' ? hm[9] : null,
        message: null,
        authResult: null,
        authUser: null,
        source: 'http',
      };
    } else {
      const am = AUTH_RE.exec(raw);
      if (am) {
        authCount++;
        const msg = am[4];
        const lower = msg.toLowerCase();
        let authResult: LogEvent['authResult'] = null;
        let authUser: string | null = null;
        if (/failed password/i.test(msg)) {
          authResult = 'failure';
          const um = /for (?:invalid user )?(\S+)/i.exec(msg);
          authUser = um ? um[1] : null;
        } else if (/accepted password|accepted publickey|accepted keyboard-interactive/i.test(msg)) {
          authResult = 'success';
          const um = /for (\S+)/i.exec(msg);
          authUser = um ? um[1] : null;
        } else if (/invalid user/i.test(msg)) {
          authResult = 'invalid';
          const um = /invalid user (\S+)/i.exec(msg);
          authUser = um ? um[1] : null;
        }
        const ipMatch = /from (\d{1,3}(?:\.\d{1,3}){3})/.exec(msg);
        ev = {
          lineNumber: i + 1,
          raw,
          ip: ipMatch ? ipMatch[1] : null,
          timestamp: am[1],
          method: null,
          path: null,
          status: null,
          userAgent: null,
          message: msg,
          authResult,
          authUser,
          source: 'ssh',
        };
      } else {
        genericCount++;
        const ipMatch = /\b(\d{1,3}(?:\.\d{1,3}){3})\b/.exec(raw);
        const tsMatch = /\b(\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:?\d{2})?)\b/.exec(raw);
        ev = {
          lineNumber: i + 1,
          raw,
          ip: ipMatch ? ipMatch[1] : null,
          timestamp: tsMatch ? tsMatch[1] : null,
          method: null,
          path: null,
          status: null,
          userAgent: null,
          message: raw,
          authResult: null,
          authUser: null,
          source: 'app',
        };
      }
    }
    if (ev) events.push(ev);
  }

  if (httpCount > 0 && httpCount >= authCount && httpCount >= genericCount) format = httpCount > genericCount && httpCount > authCount ? 'apache-combined' : 'apache-common';
  else if (authCount > 0 && authCount >= httpCount && authCount >= genericCount) format = 'auth';
  else format = 'generic';

  const uniqueIps = new Map<string, { count: number; failures: number }>();
  const methods = new Map<string, number>();
  const statuses = new Map<string, number>();
  const paths = new Map<string, number>();
  const userAgents = new Map<string, number>();
  const timeline = new Map<string, number>();
  const authFailures = new Map<string, number>();
  const failedByIp = new Map<string, number>();
  const requestsByIp = new Map<string, number>();
  const errorTimeline = new Map<string, number>();

  for (const ev of events) {
    if (ev.ip) {
      const e = uniqueIps.get(ev.ip) ?? { count: 0, failures: 0 };
      e.count++;
      if (ev.authResult === 'failure' || ev.authResult === 'invalid') e.failures++;
      uniqueIps.set(ev.ip, e);
      requestsByIp.set(ev.ip, (requestsByIp.get(ev.ip) ?? 0) + 1);
      if (ev.authResult === 'failure') failedByIp.set(ev.ip, (failedByIp.get(ev.ip) ?? 0) + 1);
    }
    if (ev.method) methods.set(ev.method, (methods.get(ev.method) ?? 0) + 1);
    if (ev.status != null) {
      statuses.set(String(ev.status), (statuses.get(String(ev.status)) ?? 0) + 1);
      if (ev.status >= 500) {
        const key = ev.timestamp?.slice(0, 16) ?? 'unknown';
        errorTimeline.set(key, (errorTimeline.get(key) ?? 0) + 1);
      }
    }
    if (ev.path) paths.set(ev.path, (paths.get(ev.path) ?? 0) + 1);
    if (ev.userAgent) userAgents.set(ev.userAgent, (userAgents.get(ev.userAgent) ?? 0) + 1);
    if (ev.timestamp) {
      const key = ev.timestamp.includes(':')
        ? ev.timestamp.replace(/\s+/, ' ').slice(0, 16)
        : ev.timestamp.slice(0, 16);
      timeline.set(key, (timeline.get(key) ?? 0) + 1);
    }
    if (ev.authUser && (ev.authResult === 'failure' || ev.authResult === 'invalid')) {
      authFailures.set(ev.authUser, (authFailures.get(ev.authUser) ?? 0) + 1);
    }
  }

  const suspicious: LogAnalysis['suspicious'] = [];
  for (const [ip, failures] of failedByIp) {
    if (failures >= 5) {
      suspicious.push({
        severity: failures >= 20 ? 'high' : 'medium',
        title: `Brute-force SSH dari ${ip}`,
        detail: `${failures} percobaan autentikasi gagal.`,
      });
    }
  }
  for (const [ip, count] of requestsByIp) {
    if (count >= 200) {
      suspicious.push({
        severity: count >= 1000 ? 'high' : 'low',
        title: `Volume request tinggi dari ${ip}`,
        detail: `${count} request. kemungkinan scraping atau serangan.`,
      });
    }
  }
  for (const [key, count] of errorTimeline) {
    if (count >= 20) {
      suspicious.push({
        severity: 'medium',
        title: `Error spike (5xx) pada ${key}`,
        detail: `${count} error 5xx dalam periode ini.`,
      });
    }
  }
  // 404 flood
  const notFoundByIp = new Map<string, number>();
  for (const ev of events) {
    if (ev.status === 404 && ev.ip) notFoundByIp.set(ev.ip, (notFoundByIp.get(ev.ip) ?? 0) + 1);
  }
  for (const [ip, count] of notFoundByIp) {
    if (count >= 30) {
      suspicious.push({
        severity: 'medium',
        title: `Directory scan dari ${ip}`,
        detail: `${count} respons 404. kemungkinan enumerasi path.`,
      });
    }
  }

  return {
    format,
    totalLines: lines.length,
    parsed: events.length,
    errors: lines.length - events.length,
    events,
    uniqueIps: Array.from(uniqueIps.entries()).map(([ip, v]) => ({ ip, ...v })).sort((a, b) => b.count - a.count).slice(0, 200),
    methods: Array.from(methods.entries()).map(([method, count]) => ({ method, count })).sort((a, b) => b.count - a.count),
    statuses: Array.from(statuses.entries()).map(([status, count]) => ({ status, count })).sort((a, b) => b.count - a.count),
    paths: Array.from(paths.entries()).map(([path, count]) => ({ path, count })).sort((a, b) => b.count - a.count).slice(0, 100),
    userAgents: Array.from(userAgents.entries()).map(([ua, count]) => ({ ua, count })).sort((a, b) => b.count - a.count).slice(0, 50),
    timeline: Array.from(timeline.entries()).map(([key, count]) => ({ key, count })).sort((a, b) => (a.key < b.key ? -1 : 1)),
    authFailures: Array.from(authFailures.entries()).map(([user, count]) => ({ user, count })).sort((a, b) => b.count - a.count).slice(0, 50),
    suspicious,
    sample,
  };
}
