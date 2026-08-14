/**
 * Analisis web security berbasis input manual (tidak ada request keluar):
 * JWT, HTTP headers, cookie, User-Agent, CSP, CORS, security headers,
 * pola SQLi/XSS edukasi, normalisasi URL, open redirect, path traversal.
 */

import { base64UrlToBytes, bytesToUtf8, utf8ToBytes } from './bytes';
import { hmacSign } from './crypto';

// ---------------------------------------------------------------------------
// JWT
// ---------------------------------------------------------------------------

export interface JwtClaimInfo {
  name: string;
  value: string;
  meaning?: string;
}

export interface JwtResult {
  valid: boolean;
  error?: string;
  header?: Record<string, unknown>;
  payload?: Record<string, unknown>;
  signature?: string;
  algorithm?: string;
  claims?: JwtClaimInfo[];
  warnings: string[];
  signatureValid?: boolean | null;
}

const JWT_CLAIM_MEANING: Record<string, string> = {
  iss: 'Issuer. siapa yang menerbitkan token',
  sub: 'Subject. pemilik token (user id)',
  aud: 'Audience. siapa yang boleh menerima token',
  exp: 'Expiration. token kedaluwarsa (Unix seconds)',
  nbf: 'Not Before. token berlaku mulai',
  iat: 'Issued At. waktu token diterbitkan',
  jti: 'JWT ID. identifier unik token',
  nonce: 'Nonce. anti-replay untuk OpenID Connect',
  azp: 'Authorized Party',
  scope: 'Scope / otorisasi',
  email: 'Email user',
  name: 'Nama user',
  role: 'Role / peran user',
  admin: 'Flag admin',
};

export function parseJwt(token: string): JwtResult {
  const parts = token.trim().split('.');
  if (parts.length !== 3) {
    return { valid: false, error: 'JWT format tidak valid. Harus: header.payload.signature (3 bagian dipisah titik).', warnings: [] };
  }
  const warnings: string[] = [];
  const decodePart = (p: string): Record<string, unknown> | null => {
    try {
      const bytes = base64UrlToBytes(p);
      const json = bytesToUtf8(bytes, true);
      return JSON.parse(json) as Record<string, unknown>;
    } catch {
      return null;
    }
  };
  const header = decodePart(parts[0]);
  const payload = decodePart(parts[1]);
  if (!header || !payload) {
    return { valid: false, error: 'Header/payload JWT tidak dapat di-decode (base64url + JSON valid dibutuhkan).', warnings: [] };
  }
  const alg = String(header.alg ?? '');
  if (!alg) warnings.push('Claim "alg" tidak ada di header.');
  if (alg === 'none') warnings.push('Peringatan keamanan: algoritma "none". token tidak terverifikasi. Jangan terima di produksi.');
  if (header.typ && header.typ !== 'JWT') warnings.push(`Header typ="${header.typ}" (bukan standar JWT).`);

  const claims: JwtClaimInfo[] = [];
  const now = Math.floor(Date.now() / 1000);
  for (const [k, v] of Object.entries(payload)) {
    let value = typeof v === 'object' ? JSON.stringify(v) : String(v);
    let meaning = JWT_CLAIM_MEANING[k];
    if (k === 'exp' || k === 'nbf' || k === 'iat') {
      const num = Number(v);
      if (!Number.isNaN(num)) {
        value = `${num} (${new Date(num * 1000).toISOString()})`;
        if (k === 'exp' && num < now) warnings.push('Token sudah kedaluwarsa (exp < now).');
        if (k === 'exp' && num > now) meaning = `${JWT_CLAIM_MEANING[k]}. masih valid (${Math.floor((num - now) / 60)} menit lagi)`;
        if (k === 'nbf' && num > now) warnings.push('Token belum berlaku (nbf > now).');
      }
    }
    claims.push({ name: k, value, meaning });
  }

  const result: JwtResult = { valid: true, header, payload, signature: parts[2], algorithm: alg, claims, warnings, signatureValid: null };

  // Verifikasi HS* bila secret dimasukkan. dipanggil terpisah (async).
  return result;
}

export async function verifyJwtHs(token: string, secret: string, alg: string): Promise<boolean> {
  const parts = token.trim().split('.');
  if (parts.length !== 3) return false;
  const data = utf8ToBytes(`${parts[0]}.${parts[1]}`);
  const expected = parts[2];
  const sig = await hmacSign(data, utf8ToBytes(secret), { alg: (alg ?? 'HS256') as 'SHA-256' });
  const actual = btoa(String.fromCharCode(...sig)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return actual === expected;
}

// ---------------------------------------------------------------------------
// HTTP headers / cookies
// ---------------------------------------------------------------------------

export interface ParsedHeaders {
  lines: { name: string; value: string }[];
  raw: string;
}

export function parseHeaderLines(raw: string): ParsedHeaders {
  const lines: { name: string; value: string }[] = [];
  const text = raw.replace(/\r\n/g, '\n');
  for (const line of text.split('\n')) {
    const idx = line.indexOf(':');
    if (idx > 0) {
      lines.push({ name: line.slice(0, idx).trim(), value: line.slice(idx + 1).trim() });
    }
  }
  return { lines, raw: text };
}

export interface CookieInfo {
  name: string;
  value: string;
  flags: string[];
  issues: string[];
}

export function parseCookies(raw: string): CookieInfo[] {
  const text = raw.replace(/\r\n/g, '\n');
  const cookies: CookieInfo[] = [];
  for (const line of text.split('\n')) {
    if (!line.trim()) continue;
    const isSetCookie = /^set-cookie:/i.test(line.trim());
    const body = line.replace(/^set-cookie:\s*/i, '').trim();
    const parts = body.split(';');
    const first = parts[0].trim();
    const eq = first.indexOf('=');
    if (eq <= 0) continue;
    const name = first.slice(0, eq).trim();
    const value = first.slice(eq + 1).trim();
    const flags = parts.slice(1).map((p) => p.trim()).filter(Boolean);
    const issues: string[] = [];
    if (isSetCookie) {
      if (!flags.some((f) => /^httponly/i.test(f))) issues.push('HttpOnly tidak diset. cookie bisa diakses JavaScript (XSS risk).');
      if (!flags.some((f) => /^secure/i.test(f))) issues.push('Secure tidak diset. cookie bisa dikirim lewat HTTP polos.');
      if (!flags.some((f) => /^samesite/i.test(f))) issues.push('SameSite tidak diset. default Lax di browser modern, tapi sebaiknya eksplisit.');
      if (flags.some((f) => /^samesite=none/i.test(f))) issues.push('SameSite=None membutuhkan Secure (browser menolak tanpa Secure).');
    }
    cookies.push({ name, value: value || '(kosong)', flags, issues });
  }
  return cookies;
}

// ---------------------------------------------------------------------------
// User-Agent (heuristik)
// ---------------------------------------------------------------------------

export interface UaResult {
  browser: string;
  browserVersion: string;
  os: string;
  osVersion: string;
  device: string;
  isBot: boolean;
  notes: string[];
}

export function parseUserAgent(ua: string): UaResult {
  const s = ua;
  let browser = 'Tidak dikenal';
  let browserVersion = '';
  let os = 'Tidak dikenal';
  let osVersion = '';
  let device = 'Desktop';
  const notes: string[] = [];

  const grab = (re: RegExp, def: string): [string, string] => {
    const m = re.exec(s);
    if (!m) return [def, ''];
    return [m[1], m[2] ?? ''];
  };

  if (/bot|spider|crawler|slurp|bingpreview|googlebot|mediapartners|pingdom/i.test(s)) {
    device = 'Bot';
    notes.push('User-Agent terdeteksi sebagai bot/crawler.');
  } else if (/Mobile|Android|iPhone|iPad|iPod/i.test(s)) {
    device = 'Mobile';
  } else if (/Tablet|iPad/i.test(s)) {
    device = 'Tablet';
  }

  if (/Edg\//.test(s)) {
    [browser, browserVersion] = grab(/Edg\/([\d.]+)/, 'Edge');
    browser = 'Microsoft Edge';
  } else if (/OPR\//.test(s)) {
    [browser, browserVersion] = grab(/OPR\/([\d.]+)/, 'Opera');
    browser = 'Opera';
  } else if (/Chrome\//.test(s) && !/Chromium/i.test(s)) {
    [browser, browserVersion] = grab(/Chrome\/([\d.]+)/, 'Chrome');
    browser = 'Google Chrome';
    if (/CriOS\//.test(s)) {
      browser = 'Chrome (iOS)';
      browserVersion = grab(/CriOS\/([\d.]+)/, '')[1];
    }
  } else if (/Chromium/.test(s)) {
    [browser, browserVersion] = grab(/Chromium\/([\d.]+)/, 'Chromium');
  } else if (/Firefox\//.test(s)) {
    [browser, browserVersion] = grab(/Firefox\/([\d.]+)/, 'Firefox');
    browser = 'Mozilla Firefox';
    if (/FxiOS\//.test(s)) {
      browser = 'Firefox (iOS)';
      browserVersion = grab(/FxiOS\/([\d.]+)/, '')[1];
    }
  } else if (/Safari\//.test(s)) {
    [browser, browserVersion] = grab(/Version\/([\d.]+)/, 'Safari');
    browser = 'Safari';
    if (/CriOS\//.test(s)) browser = 'Chrome (iOS)';
  } else if (/MSIE|Trident/.test(s)) {
    browser = 'Internet Explorer';
    browserVersion = grab(/MSIE ([\d.]+)/, '')[1] || grab(/rv:([\d.]+)/, '')[1];
  }

  if (/Windows NT 10\.0/.test(s)) {
    os = 'Windows';
    osVersion = '10 / 11';
  } else if (/Windows NT 6\.3/.test(s)) {
    os = 'Windows';
    osVersion = '8.1';
  } else if (/Windows NT 6\.1/.test(s)) {
    os = 'Windows';
    osVersion = '7';
  } else if (/Android/.test(s)) {
    os = 'Android';
    osVersion = grab(/Android ([\d.]+)/, '')[1];
  } else if (/iPhone|iPad|iPod/.test(s)) {
    os = 'iOS';
    osVersion = grab(/OS ([\d_]+)/, '')[1].replace(/_/g, '.');
  } else if (/Mac OS X/.test(s)) {
    os = 'macOS';
    osVersion = grab(/Mac OS X ([\d_.]+)/, '')[1].replace(/_/g, '.');
  } else if (/Linux/.test(s)) {
    os = 'Linux';
  } else if (/X11/.test(s)) {
    os = 'Unix (X11)';
  }

  const isBot = device === 'Bot';
  return { browser, browserVersion, os, osVersion, device, isBot, notes };
}

// ---------------------------------------------------------------------------
// CSP analyzer
// ---------------------------------------------------------------------------

export interface CspAnalysis {
  directives: { name: string; value: string; issues: string[] }[];
  issues: string[];
  score: number; // 0-100
}

export function analyzeCsp(policy: string): CspAnalysis {
  const text = policy.replace(/\r\n/g, '\n').replace(/\s+/g, ' ').trim();
  const directives: CspAnalysis['directives'] = [];
  const issues: string[] = [];
  let score = 100;

  const parts = text.split(';').map((p) => p.trim()).filter(Boolean);
  for (const part of parts) {
    const [name, ...rest] = part.split(/\s+/);
    const value = rest.join(' ');
    const dirIssues: string[] = [];
    if (value.includes("'unsafe-inline'")) {
      dirIssues.push("'unsafe-inline' melemahkan proteksi XSS (kecuali disertai nonce/hash).");
      score -= 15;
    }
    if (value.includes("'unsafe-eval'")) {
      dirIssues.push("'unsafe-eval' mengizinkan eval(). risiko code injection.");
      score -= 10;
    }
    if (value === '*' || /^\*($|\s)/.test(value)) {
      dirIssues.push('Wildcard * mengizinkan semua sumber.');
      score -= 8;
    }
    if (name === 'default-src' && value.includes("'none'")) {
      dirIssues.push("'none' memblokir semua. pastikan directive lain mengizinkan yang dibutuhkan.");
    }
    if (name === 'script-src' && !value.includes("'nonce-") && !value.includes("'sha256-") && !value.includes("'sha384-") && !value.includes("'sha512-")) {
      dirIssues.push('Tidak ada nonce/hash. inline script akan diblokir (baik) atau butuh unsafe-inline (buruk).');
    }
    directives.push({ name, value: value || '(kosong)', issues: dirIssues });
  }

  if (!/default-src/i.test(text)) {
    issues.push('Directive default-src tidak ada. fallback ke allow-all di browser lama.');
    score -= 10;
  }
  if (!/script-src/i.test(text)) issues.push('script-src tidak ada (fallback ke default-src).');
  if (!/object-src/i.test(text)) issues.push('object-src tidak ada. pertimbangkan "object-src \'none\'".');
  if (!/base-uri/i.test(text)) issues.push('base-uri tidak diset. pertimbangkan "base-uri \'self\'".');
  if (/frame-ancestors/i.test(text) && /frame-ancestors.*\*/.test(text)) {
    issues.push('frame-ancestors * mengizinkan clickjacking.');
    score -= 10;
  }

  return { directives, issues, score: Math.max(0, score) };
}

// ---------------------------------------------------------------------------
// CORS analyzer
// ---------------------------------------------------------------------------

export interface CorsAnalysis {
  allowOrigin: string;
  allowCredentials: string;
  allowMethods: string;
  allowHeaders: string;
  exposeHeaders: string;
  maxAge: string;
  issues: string[];
  score: number;
}

export function analyzeCors(raw: string): CorsAnalysis {
  const { lines } = parseHeaderLines(raw);
  const get = (name: string) => {
    const l = lines.find((x) => x.name.toLowerCase() === name.toLowerCase());
    return l ? l.value : '';
  };
  const allowOrigin = get('access-control-allow-origin');
  const allowCredentials = get('access-control-allow-credentials');
  const allowMethods = get('access-control-allow-methods');
  const allowHeaders = get('access-control-allow-headers');
  const exposeHeaders = get('access-control-expose-headers');
  const maxAge = get('access-control-max-age');
  const issues: string[] = [];
  let score = 100;

  if (!allowOrigin) {
    issues.push('Access-Control-Allow-Origin tidak ada. browser akan memblokir akses cross-origin (aman secara default).');
    score = 60;
  }
  if (allowOrigin === '*') {
    issues.push('Allow-Origin: * mengizinkan SEMUA origin.');
    if (allowCredentials.toLowerCase() === 'true') {
      issues.push('KRITIS: wildcard origin + credentials=true tidak valid & berbahaya (browser menolak, tapi konfigurasi salah).');
      score -= 40;
    } else {
      issues.push('Wildcard tanpa credentials masih berbahaya untuk data publik; pertimbangkan origin whitelist.');
      score -= 20;
    }
  }
  if (allowCredentials.toLowerCase() === 'true' && allowOrigin && allowOrigin !== '*') {
    if (/\/\//.test(allowOrigin) && /null/i.test(allowOrigin)) issues.push('Origin "null" (file:// / sandbox). bisa dimanfaatkan attacker.');
  }
  if (allowMethods && /(GET|POST|PUT|DELETE|PATCH|OPTIONS)/i.test(allowMethods)) {
    const dangerous = ['TRACE', 'TRACK'].filter((m) => new RegExp(m, 'i').test(allowMethods));
    if (dangerous.length) issues.push(`Metode berbahaya diizinkan: ${dangerous.join(', ')}.`);
  }
  return { allowOrigin, allowCredentials, allowMethods, allowHeaders, exposeHeaders, maxAge, issues, score: Math.max(0, score) };
}

// ---------------------------------------------------------------------------
// Security headers checker
// ---------------------------------------------------------------------------

export interface SecurityHeaderCheck {
  name: string;
  present: boolean;
  value: string;
  status: 'ok' | 'warn' | 'bad' | 'info';
  note: string;
}

export function checkSecurityHeaders(raw: string): { checks: SecurityHeaderCheck[]; score: number } {
  const { lines } = parseHeaderLines(raw);
  const get = (name: string) => {
    const l = lines.find((x) => x.name.toLowerCase() === name.toLowerCase());
    return l ? l.value : '';
  };
  const checks: SecurityHeaderCheck[] = [];
  const add = (name: string, present: boolean, value: string, status: SecurityHeaderCheck['status'], note: string) =>
    checks.push({ name, present, value: value || '-', status, note });

  let score = 0;
  const csp = get('content-security-policy');
  add('Content-Security-Policy', !!csp, csp, csp ? 'ok' : 'warn', csp ? 'CSP diset.' : 'CSP tidak diset. mitigasi XSS utama hilang.');

  const hsts = get('strict-transport-security');
  const hstsGood = !!hsts && /max-age=\d{6,}/i.test(hsts);
  add('Strict-Transport-Security', !!hsts, hsts, hstsGood ? 'ok' : hsts ? 'warn' : 'bad', hstsGood ? 'HSTS dengan max-age ≥ 1.000.000.' : hsts ? 'HSTS ada tapi max-age pendek / tanpa includeSubDomains.' : 'HSTS tidak diset. risiko downgrade ke HTTP.');

  const xfo = get('x-frame-options');
  add('X-Frame-Options', !!xfo, xfo, /deny|sameorigin/i.test(xfo) ? 'ok' : xfo ? 'warn' : 'warn', xfo ? 'X-Frame-Options diset.' : 'X-Frame-Options tidak diset. pertimbangkan frame-ancestors CSP.');

  const xcto = get('x-content-type-options');
  add('X-Content-Type-Options', !!xcto, xcto, /nosniff/i.test(xcto) ? 'ok' : 'warn', xcto ? 'nosniff diset.' : 'Tidak diset. risiko MIME sniffing.');

  const rp = get('referrer-policy');
  add('Referrer-Policy', !!rp, rp, rp ? 'ok' : 'info', rp ? 'Referrer-Policy diset.' : 'Tidak diset. default bervariasi per browser.');

  const pp = get('permissions-policy');
  add('Permissions-Policy', !!pp, pp, pp ? 'ok' : 'info', pp ? 'Permissions-Policy diset.' : 'Tidak diset.');

  const coep = get('cross-origin-embedder-policy');
  add('Cross-Origin-Embedder-Policy', !!coep, coep, coep ? 'ok' : 'info', coep ? 'COEP diset.' : 'Tidak diset (opsional).');

  const coop = get('cross-origin-opener-policy');
  add('Cross-Origin-Opener-Policy', !!coop, coop, coop ? 'ok' : 'info', coop ? 'COOP diset (same-origin / same-origin-allow-popups).' : 'Tidak diset. COOP membantu mitigasi isolation (Spectre).');

  const corp = get('cross-origin-resource-policy');
  add('Cross-Origin-Resource-Policy', !!corp, corp, corp ? 'ok' : 'info', corp ? 'CORP diset.' : 'Tidak diset (opsional).');

  const cookies = parseCookies(raw);
  const hasCookies = cookies.length > 0;
  add('Cookie Flags (HttpOnly/Secure)', hasCookies, hasCookies ? `${cookies.length} cookie ditemukan` : '-', hasCookies ? (cookies.some((c) => c.issues.length === 0) ? 'ok' : 'warn') : 'info',
    hasCookies ? (cookies.every((c) => c.issues.length === 0) ? 'Semua cookie sudah berflag aman.' : 'Beberapa cookie kehilangan flag keamanan.') : 'Tidak ada cookie pada input.');

  const server = get('server');
  add('Server Header', !!server, server, server ? 'info' : 'info', server ? 'Hindari versi detail pada header Server (information disclosure).' : 'Server header tidak ada.');

  const xPowered = get('x-powered-by');
  add('X-Powered-By', !!xPowered, xPowered, xPowered ? 'bad' : 'ok', xPowered ? 'X-Powered-By membocorkan teknologi. sebaiknya dihapus.' : 'Tidak ada (baik).');

  const weight: Record<SecurityHeaderCheck['status'], number> = { ok: 12.5, warn: 6, bad: 0, info: 4 };
  score = Math.round(checks.reduce((acc, c) => acc + weight[c.status], 0) / checks.length * 10) / 10;
  return { checks, score: Math.min(100, score) };
}

// ---------------------------------------------------------------------------
// SQLi / XSS payload analyzer (edukasi)
// ---------------------------------------------------------------------------

export interface PatternFinding {
  pattern: string;
  description: string;
  severity: 'info' | 'medium' | 'high';
  examples: string[];
  encoded: boolean;
}

export function analyzeSqliPayload(input: string): PatternFinding[] {
  const findings: PatternFinding[] = [];
  const add = (pattern: string, description: string, severity: PatternFinding['severity'], examples: string[]) =>
    findings.push({ pattern, description, severity, examples, encoded: false });

  if (/'|"|`/.test(input)) add('Quote injection', 'Kutipan dapat mengubah struktur query SQL.', 'medium', ["' OR '1'='1", "\" OR 1=1 --"]);
  if (/\b(union\s+select|union\s+all\s+select)\b/i.test(input)) add('UNION SELECT', 'Menggabungkan hasil query. umum untuk ekstraksi data.', 'high', ['UNION SELECT username,password FROM users']);
  if (/\b(or|and)\s+1\s*=\s*1\b/i.test(input)) add('Boolean tautology', 'Kondisi selalu benar. melewati autentikasi.', 'high', ["' OR 1=1 --", "AND 1=1"]);
  if (/\b(or|and)\s+1\s*=\s*2\b/i.test(input)) add('Boolean false', 'Bandingkan respons true/false. teknik blind SQLi.', 'medium', ["' AND 1=2 --"]);
  if (/--|#|\/\*/i.test(input)) add('Comment injection', 'Mengomentari sisa query.', 'medium', ["' --", "'#", "1; DROP TABLE users--"]);
  if (/;\s*\w+/.test(input)) add('Stacked queries', 'Menambahkan query baru setelah pemisah titik koma.', 'high', ["'; DROP TABLE users;--"]);
  if (/\b(sleep|benchmark|pg_sleep|waitfor\s+delay)\b/i.test(input)) add('Time-based', 'Penundaan respons. teknik blind SQLi berbasis waktu.', 'medium', ["' AND SLEEP(5)--"]);
  if (/information_schema|sys\.|master\.|sqlite_|pg_/i.test(input)) add('Meta tables', 'Query tabel sistem untuk enumerasi skema.', 'medium', ['information_schema.tables', 'sqlite_master']);
  if (/\b(load_file|into\s+outfile|exec\s|xp_cmdshell)\b/i.test(input)) add('File/system access', 'Fungsi baca file atau eksekusi perintah (jika diizinkan DB).', 'high', ["LOAD_FILE('/etc/passwd')", "xp_cmdshell('whoami')"]);
  if (/0x[0-9a-f]{8,}/i.test(input)) add('Hex-encoded payload', 'Data di-encode hex untuk menghindari filter.', 'medium', ["0x6f7220313d31"]);
  if (/\b(updatexml|extractvalue|group_concat|concat)\b/i.test(input)) add('Error-based functions', 'Fungsi yang memunculkan error berisi data.', 'medium', ["AND updatexml(1,concat(0x7e,version()),1)"]);
  if (/\b(select|from|where|insert|update|delete|drop|alter)\b/i.test(input)) add('SQL keywords', 'Keyword SQL terdeteksi.', 'info', ['SELECT', 'DROP TABLE']);

  if (findings.length === 0) {
    add('Tidak ada pola SQLi terdeteksi', 'Input tidak mengandung pola injection umum (ini bukan jaminan aman).', 'info', []);
  }
  return findings;
}

export function analyzeXssPayload(input: string): PatternFinding[] {
  const findings: PatternFinding[] = [];
  const add = (pattern: string, description: string, severity: PatternFinding['severity'], examples: string[]) =>
    findings.push({ pattern, description, severity, examples, encoded: false });

  if (/<script[\s>]/i.test(input)) add('Tag <script>', 'Eksekusi JavaScript langsung.', 'high', ['<script>alert(1)</script>']);
  if (/<[a-z]+\s+[^>]*\son\w+\s*=/i.test(input)) add('Inline event handler', 'Event handler (onerror, onload…) mengeksekusi JS.', 'high', ['<img src=x onerror=alert(1)>', '<svg onload=alert(1)>']);
  if (/javascript:/i.test(input)) add('Scheme javascript:', 'URL scheme mengeksekusi JS.', 'high', ['<a href="javascript:alert(1)">x</a>']);
  if (/<iframe[\s>]/i.test(input)) add('<iframe> injection', 'Memuat halaman lain / phishing.', 'medium', ['<iframe src="https://evil.example">']);
  if (/alert\(|confirm\(|prompt\(|document\.cookie|fetch\(|eval\(|fromcharcode/i.test(input)) add('Payload fungsi berbahaya', 'Fungsi umum dalam payload XSS.', 'medium', ['alert(1)', 'document.cookie']);
  if (/\\x[0-9a-f]{2}|\\u[0-9a-f]{4}|%[0-9a-f]{2}/i.test(input)) add('Encoded payload', 'Encoding hex/unicode/URL untuk menghindari filter.', 'medium', ['\\x3cscript\\x3e', '%3Cscript%3E']);
  if (/<svg|<math|<details|<template|<textarea|<title|<style/i.test(input)) add('Alternate HTML containers', 'Elemen HTML lain yang dapat menyelundupkan JS.', 'medium', ['<svg/onload=alert(1)>', '<math><mtext><img src=x onerror=alert(1)>']);
  if (/\s+srcdoc=/i.test(input)) add('srcdoc attribute', 'srcdoc memuat HTML/JS dari atribut.', 'high', ['<iframe srcdoc="<script>alert(1)</script>">']);
  if (/\$\{/i.test(input)) add('Template literal', 'Interpolasi JS dalam template string.', 'medium', ['${alert(1)}']);
  if (/<link[\s>]|<meta[\s>]|<base[\s>]/i.test(input)) add('Tag meta/link/base', 'Manipulasi resource base / refresh.', 'medium', ['<meta http-equiv="refresh" content="0;url=//evil">']);

  if (findings.length === 0) {
    add('Tidak ada pola XSS terdeteksi', 'Input tidak mengandung pola injection umum (ini bukan jaminan aman).', 'info', []);
  }
  return findings;
}

// ---------------------------------------------------------------------------
// URL analysis
// ---------------------------------------------------------------------------

export interface UrlAnalysis {
  valid: boolean;
  error?: string;
  components: { name: string; value: string; issue?: string }[];
  issues: string[];
}

export function analyzeUrl(url: string): UrlAnalysis {
  const issues: string[] = [];
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return { valid: false, error: 'URL tidak valid. pastikan mengandung scheme (mis. https://example.com).', components: [], issues: [] };
  }
  const components: UrlAnalysis['components'] = [
    { name: 'Scheme', value: parsed.protocol.replace(':', '') },
    { name: 'Host', value: parsed.hostname },
    { name: 'Port', value: parsed.port || '(default)' },
    { name: 'Path', value: parsed.pathname },
    { name: 'Query', value: parsed.search || '(tidak ada)' },
    { name: 'Fragment', value: parsed.hash || '(tidak ada)' },
    { name: 'Userinfo', value: parsed.username || parsed.password ? `${parsed.username}:${parsed.password}` : '(tidak ada)' },
    { name: 'Origin', value: parsed.origin },
  ];

  if (parsed.protocol === 'http:') issues.push('Menggunakan HTTP polos. data tidak terenkripsi. Gunakan HTTPS.');
  if (parsed.protocol === 'javascript:') issues.push('Scheme javascript:. eksekusi kode, jangan pernah arahkan pengguna ke ini.');
  if (parsed.protocol === 'data:') issues.push('Scheme data:. bisa menyamar sebagai file; waspadai phishing.');
  if (parsed.username || parsed.password) issues.push('Userinfo pada URL (user:pass@). informasi kredensial dalam URL bocor ke log.');
  if (parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1') issues.push('Host lokal. SSRF risk bila URL dikontrol attacker dan di-fetch server-side.');
  if (/^10\.|^192\.168\.|^172\.(1[6-9]|2[0-9]|3[01])\./.test(parsed.hostname)) issues.push('Host berupa IP private (RFC1918). Bisa indikasi SSRF atau akses internal.');
  if (/^169\.254\./.test(parsed.hostname)) issues.push('Host berupa link-local (169.254.x.x).');
  if (/^\d+\.\d+\.\d+\.\d+$/.test(parsed.hostname)) issues.push('Host berupa IP literal. Verifikasi apakah ini diharapkan.');
  if (parsed.port && ((parsed.protocol === 'http:' && parsed.port !== '80') || (parsed.protocol === 'https:' && parsed.port !== '443'))) {
    issues.push(`Port tidak standar (${parsed.port}) untuk ${parsed.protocol.replace(':', '')}. Bisa jadi layanan dev/alternatif.`);
  }
  if (parsed.protocol === 'file:') issues.push('Scheme file: akses file lokal. Tidak boleh diizinkan dari halaman web.');
  if (parsed.protocol === 'ftp:') issues.push('Scheme ftp: kredensial bisa bocor plaintext.');
  if (parsed.pathname.includes('..')) issues.push('Path mengandung "..". potensi path traversal.');
  if (/%0[0-9a-f]|%2e|%2f/i.test(url)) issues.push('Path mengandung encoding berbahaya (%2e, %2f, %00…). potensi filter bypass.');
  if (/\\/.test(url)) issues.push('URL mengandung backslash. beberapa parser memperlakukannya sebagai separator host.');
  if (/@/.test(url) && !parsed.username) issues.push('Karakter @ tanpa userinfo. bisa jadi teknik spoofing host (https://trusted.com@evil.example).');
  if (/^https?:\/\/([^/]+)\/\/[^/]+/.test(url)) issues.push('Path dimulai // setelah host. pola umum open redirect.');
  if (!parsed.search && !parsed.hash && parsed.pathname.endsWith('/') === false) {
    // ok
  }
  components.push({
    name: 'TLS note',
    value: parsed.protocol === 'https:' ? 'TLS aktif' : 'TLS tidak aktif',
    issue: parsed.protocol !== 'https:' ? 'HTTPS direkomendasikan' : undefined,
  });

  return { valid: true, components, issues };
}

export function normalizeUrl(url: string): { original: string; normalized: string; diffs: string[] } {
  const diffs: string[] = [];
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    throw new Error('URL tidak valid.');
  }
  const original = u.href;
  // lowercase scheme & host
  if (u.protocol !== u.protocol.toLowerCase()) diffs.push('Scheme di-lowercase.');
  if (u.hostname !== u.hostname.toLowerCase()) diffs.push('Host di-lowercase.');
  u.protocol = u.protocol.toLowerCase();
  u.hostname = u.hostname.toLowerCase();
  // hapus default port
  const defaultPorts: Record<string, string> = { 'http:': '80', 'https:': '443', 'ftp:': '21' };
  if (defaultPorts[u.protocol] && u.port === defaultPorts[u.protocol]) {
    diffs.push(`Port default ${u.port} dihapus.`);
    u.port = '';
  }
  // dot segments
  const oldPath = u.pathname;
  const segs = oldPath.split('/');
  const out: string[] = [];
  for (const seg of segs) {
    if (seg === '.') diffs.push('Segment "." dihapus.');
    else if (seg === '..') {
      if (out.length) out.pop();
      diffs.push('Segment ".." diselesaikan.');
    } else out.push(seg);
  }
  u.pathname = out.join('/');
  if (u.pathname !== oldPath) diffs.push('Path di-normalisasi (dot-segments).');
  // hilangkan fragment kosong
  if (u.hash === '#') {
    u.hash = '';
    diffs.push('Fragment kosong dihapus.');
  }
  return { original, normalized: u.href, diffs };
}

export function analyzeOpenRedirect(url: string): { risky: boolean; reasons: string[] } {
  const reasons: string[] = [];
  if (/^\/\//.test(url)) reasons.push('Path dimulai //. interpretasi sebagai host baru oleh browser.');
  if (/^https?:\/\//.test(url) && !/^https?:\/\/(trusted|example|localhost)/.test(url)) {
    reasons.push('URL eksternal penuh. verifikasi whitelist host.');
  }
  if (/(\\)/.test(url)) reasons.push('Backslash bisa menjadi separator host di beberapa parser.');
  if (/^javascript:/i.test(url)) reasons.push('Scheme javascript:. eksekusi kode.');
  if (/^data:/i.test(url)) reasons.push('Scheme data:. konten inline.');
  if (/^vbscript:/i.test(url)) reasons.push('Scheme vbscript: (IE legacy).');
  if (/\/\/[^/]+\.[^/]+/.test(url) && /[?&#]/.test(url)) reasons.push('URL tujuan di parameter query. periksa apakah di-whitelist.');
  if (/%2f|%2e|%5c/i.test(url)) reasons.push('Encoding (%2f, %5c) bisa melewati filter redirect.');
  return { risky: reasons.length > 0, reasons };
}

export function analyzePathTraversal(input: string): { found: boolean; patterns: { value: string; description: string }[] } {
  const patterns: { value: string; description: string }[] = [];
  const checks: [RegExp, string][] = [
    [/\.\.\//g, 'Dot-dot-slash (../) klasik'],
    [/\.\.\\/g, 'Dot-dot-backslash (..\\) Windows'],
    [/%2e%2e%2f/gi, 'Encoded URL (%2e%2e%2f)'],
    [/%2e%2e%5c/gi, 'Encoded backslash (%2e%2e%5c)'],
    [/\.\.%2f/gi, 'Parsial encoded (..%2f)'],
    [/%252e%252e%252f/gi, 'Double-encoded (%252e…). filter bypass'],
    [/%00/g, 'Null byte (%00). truncation di aplikasi C-based'],
    [/\/(etc|proc|windows|boot)($|\/)/i, 'Path sistem sensitif (/etc, /proc, C:\\Windows)'],
    [/\.(php|asp|jsp|exe|conf|passwd|shadow|ini)(\?|$)/i, 'File sensitif umum'],
  ];
  for (const [re, description] of checks) {
    const m = input.match(re);
    if (m && m.length) patterns.push({ value: m[0], description });
  }
  return { found: patterns.length > 0, patterns };
}


// ---------------------------------------------------------------------------
// Observasi keamanan untuk pesan HTTP (request/response) yang ditempel
// ---------------------------------------------------------------------------

export interface HttpSecurityObservation {
  type: 'info' | 'warn' | 'bad';
  message: string;
}

export function httpSecurityObservations(
  kind: 'request' | 'response',
  headers: { name: string; value: string }[]
): HttpSecurityObservation[] {
  const out: HttpSecurityObservation[] = [];
  const get = (name: string) => headers.find((h) => h.name.toLowerCase() === name.toLowerCase())?.value ?? '';
  const names = headers.map((h) => h.name.toLowerCase());

  const auth = get('authorization');
  if (kind === 'request' && auth) {
    const scheme = auth.split(' ')[0]?.toLowerCase() ?? '';
    if (scheme === 'bearer') out.push({ type: 'info', message: 'Authorization: Bearer token. Pastikan token hanya dikirim via HTTPS.' });
    else if (scheme === 'basic') out.push({ type: 'bad', message: 'Authorization: Basic (username:password base64). Wajib HTTPS; pertimbangkan Bearer/Digest.' });
    else out.push({ type: 'warn', message: `Authorization dengan scheme tidak umum: ${scheme || '(kosong)'}.` });
  }

  if (kind === 'response' && !names.includes('content-security-policy')) {
    out.push({ type: 'warn', message: 'Respons tanpa Content-Security-Policy (mitigasi XSS utama hilang).' });
  }
  if (kind === 'response' && !names.includes('strict-transport-security')) {
    out.push({ type: 'warn', message: 'Respons tanpa Strict-Transport-Security (risiko downgrade HTTP).' });
  }
  if (kind === 'response' && !names.includes('x-content-type-options')) {
    out.push({ type: 'warn', message: 'Respons tanpa X-Content-Type-Options: nosniff.' });
  }

  const setCookies = headers.filter((h) => h.name.toLowerCase() === 'set-cookie');
  for (const c of setCookies) {
    if (!/httponly/i.test(c.value)) out.push({ type: 'warn', message: `Set-Cookie "${c.value.split(';')[0]}" tanpa HttpOnly.` });
    if (!/secure/i.test(c.value)) out.push({ type: 'warn', message: `Set-Cookie "${c.value.split(';')[0]}" tanpa Secure.` });
  }

  if (kind === 'request') {
    const ct = get('content-type');
    const cl = get('content-length');
    if (ct) out.push({ type: 'info', message: `Content-Type: ${ct}` });
    if (cl) out.push({ type: 'info', message: `Content-Length: ${cl} byte` });
  }

  if (kind === 'response' && names.includes('server')) {
    out.push({ type: 'warn', message: 'Header Server membocorkan versi. Hapus/disederhanakan di produksi.' });
  }
  if (names.includes('x-powered-by')) {
    out.push({ type: 'warn', message: 'Header X-Powered-By membocorkan teknologi.' });
  }
  if (names.includes('x-aspnet-version')) {
    out.push({ type: 'warn', message: 'Header X-AspNet-Version membocorkan versi framework.' });
  }

  return out;
}
