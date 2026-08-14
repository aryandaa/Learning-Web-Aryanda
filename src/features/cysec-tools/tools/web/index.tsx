/**
 * Tools kategori Web Security — semua berbasis input manual / analisis lokal.
 * Tidak ada request jaringan ke target; tidak ada bypass CORS.
 */

import { useMemo, useState } from 'react';
import { Button } from '../../../../components/ui/button';
import { TransformTool, type TransformConfig } from '../../components/TransformTool';
import {
  CopyButton, DownloadButton, ErrorAlert, KeyValueTable, LabeledTextarea, Notice, Panel, ToolNotes,
} from '../../components/ui';
import {
  analyzeCors, analyzeCsp, analyzeOpenRedirect, analyzePathTraversal, analyzeSqliPayload,
  analyzeUrl, analyzeXssPayload, checkSecurityHeaders, normalizeUrl, parseCookies,
  parseHeaderLines, parseJwt, parseUserAgent, verifyJwtHs,
} from '../../utils/web';
import { htmlDecode, htmlEncode, urlDecode } from '../../utils/encoding';
import { base64UrlToBytes, bytesToUtf8 } from '../../utils/bytes';
import type { ComponentType } from 'react';

const webNotes = (what: string, how: string, extra?: string) => [
  { title: 'What is this?', content: what },
  { title: 'How to use', content: how },
  { title: 'Input', content: 'Data yang Anda tempel — TIDAK ada request keluar.' },
  { title: 'Output', content: 'Analisis lokal.' },
  { title: 'Notes', content: `${extra ?? 'Tool ini tidak melakukan request ke target mana pun. Untuk penilaian keamanan terhadap sistem milik Anda, gunakan scanner yang diizinkan secara hukum.'}` },
];

// ---------------------------------------------------------------------------
// URL parser
// ---------------------------------------------------------------------------

function UrlParserTool() {
  const [url, setUrl] = useState('');
  const [result, setResult] = useState<ReturnType<typeof analyzeUrl> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const run = () => {
    setError(null);
    const r = analyzeUrl(url);
    if (!r.valid) {
      setError(r.error ?? 'URL tidak valid.');
      setResult(null);
      return;
    }
    setResult(r);
  };
  return (
    <div className="space-y-4">
      <Button onClick={run}>Urai URL</Button>
      <Panel title="Input">
        <LabeledTextarea id="urlparse-input" label="URL" value={url} onChange={setUrl} rows={3} placeholder="https://user:pass@example.com:8443/path?q=1#frag" />
      </Panel>
      <ErrorAlert message={error} />
      {result && (
        <div className="space-y-4">
          <Panel title="Komponen">
            <KeyValueTable rows={result.components.map((c) => ({ k: c.name, v: c.value, warn: !!c.issue }))} />
          </Panel>
          {result.issues.length > 0 && (
            <Panel title="Catatan keamanan">
              <ul className="list-inside list-disc space-y-1 text-sm text-amber-200">
                {result.issues.map((i, idx) => (
                  <li key={idx}>{i}</li>
                ))}
              </ul>
            </Panel>
          )}
        </div>
      )}
      <ToolNotes notes={webNotes(
        'Mengurai URL menjadi komponen (scheme, host, port, path, query, fragment, userinfo) + catatan keamanan.',
        'Tempel URL, klik Urai URL.',
        'Mendeteksi userinfo, IP literal, encoded traversal, backslash, spoofing @, dan HTTP polos.'
      )} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Query parameter parser
// ---------------------------------------------------------------------------

function QueryParserTool() {
  const [input, setInput] = useState('');
  const [result, setResult] = useState<{
    params: { name: string; value: string; decoded: string; duplicated: boolean }[];
    issues: string[];
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const run = () => {
    setError(null);
    try {
      const q = input.trim().startsWith('?') ? input.trim().slice(1) : input.trim();
      if (!q) throw new Error('Query kosong.');
      const parts = q.split('&').filter(Boolean);
      const seen = new Map<string, number>();
      const params: { name: string; value: string; decoded: string; duplicated: boolean }[] = [];
      const issues: string[] = [];
      for (const part of parts) {
        const eq = part.indexOf('=');
        const name = eq === -1 ? part : part.slice(0, eq);
        const value = eq === -1 ? '' : part.slice(eq + 1);
        const nameCount = seen.get(name) ?? 0;
        seen.set(name, nameCount + 1);
        let decoded = value;
        try {
          decoded = decodeURIComponent(value.replace(/\+/g, ' '));
        } catch {
          issues.push(`Nilai "${name}" bukan percent-encoding valid.`);
        }
        params.push({ name, value, decoded, duplicated: nameCount > 0 });
        if (name === 'redirect' || name === 'next' || name === 'url' || name === 'return' || name === 'goto' || name === 'target') {
          issues.push(`Parameter "${name}" sering menjadi target open redirect — verifikasi whitelist.`);
        }
      }
      for (const [name, count] of seen) {
        if (count > 1) issues.push(`Parameter "${name}" muncul ${count}x — perilaku bisa bergantung parser (PHP memakai yang terakhir, Python yang pertama).`);
      }
      setResult({ params, issues });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Query tidak valid.');
      setResult(null);
    }
  };

  return (
    <div className="space-y-4">
      <Button onClick={run}>Parse</Button>
      <Panel title="Input">
        <LabeledTextarea id="queryparse-input" label="Query string" value={input} onChange={setInput} rows={4} placeholder="?a=1&b=hello%20world&a=2" />
      </Panel>
      <ErrorAlert message={error} />
      {result && (
        <div className="space-y-4">
          <Panel title="Parameter">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-xs">
                <thead>
                  <tr className="text-left text-slate-500">
                    <th className="py-1.5 pr-3">Nama</th>
                    <th className="py-1.5 pr-3">Nilai (raw)</th>
                    <th className="py-1.5 pr-3">Decoded</th>
                    <th className="py-1.5">Catatan</th>
                  </tr>
                </thead>
                <tbody>
                  {result.params.map((p, i) => (
                    <tr key={i} className="border-t border-slate-800/60">
                      <td className="py-1.5 pr-3 font-mono text-slate-300">{p.name}</td>
                      <td className="max-w-[16rem] truncate py-1.5 pr-3 font-mono text-slate-500" title={p.value}>{p.value}</td>
                      <td className="max-w-[16rem] truncate py-1.5 pr-3 font-mono text-slate-400" title={p.decoded}>{p.decoded}</td>
                      <td className="py-1.5 text-slate-500">{p.duplicated ? '⚠ duplikat' : ''}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>
          {result.issues.length > 0 && (
            <Panel title="Catatan">
              <ul className="list-inside list-disc space-y-1 text-sm text-amber-200">
                {result.issues.map((i, idx) => (
                  <li key={idx}>{i}</li>
                ))}
              </ul>
            </Panel>
          )}
        </div>
      )}
      <ToolNotes notes={webNotes(
        'Memisahkan query string menjadi parameter, decode nilai, dan menandai duplikat / parameter redirect.',
        'Tempel query string, klik Parse.',
        'Perilaku duplikat param berbeda antar bahasa backend.'
      )} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// JWT
// ---------------------------------------------------------------------------

function JwtTool() {
  const [token, setToken] = useState('');
  const [secret, setSecret] = useState('');
  const [result, setResult] = useState<ReturnType<typeof parseJwt> | null>(null);
  const [sigResult, setSigResult] = useState<'valid' | 'invalid' | 'idle' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);

  const run = () => {
    setError(null);
    setSigResult('idle');
    const r = parseJwt(token);
    if (!r.valid) {
      setError(r.error ?? 'JWT format tidak valid.');
      setResult(null);
      return;
    }
    setResult(r);
  };

  const verify = async () => {
    setError(null);
    if (!result || !secret) {
      setError('Isi secret untuk verifikasi (HS256/384/512).');
      return;
    }
    try {
      const ok = await verifyJwtHs(token, secret, result.algorithm ?? 'HS256');
      setSigResult(ok ? 'valid' : 'invalid');
    } catch {
      setSigResult('error');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Button onClick={run}>🎫 Decode</Button>
        <Button variant="secondary" onClick={() => void verify()} disabled={!result}>Verify signature (HS*)</Button>
      </div>
      <Panel title="Input">
        <div className="space-y-3">
          <LabeledTextarea id="jwt-input" label="JWT token" value={token} onChange={setToken} rows={4} placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjMifQ.sig" />
          <div>
            <label htmlFor="jwt-secret" className="mb-1 block text-xs text-slate-400">Secret (untuk verifikasi signature, opsional)</label>
            <input id="jwt-secret" type="password" value={secret} onChange={(e) => setSecret(e.target.value)} className="h-9 w-full max-w-sm rounded-lg border border-slate-700 bg-slate-900 px-3 text-sm text-slate-200 focus:border-indigo-500 focus:outline-none" />
          </div>
        </div>
      </Panel>
      <ErrorAlert message={error} />
      {result && (
        <div className="space-y-4">
          <Panel title="Header">
            <pre className="overflow-auto rounded-lg border border-slate-800 bg-slate-950/70 p-3 font-mono text-[13px] text-slate-200">{JSON.stringify(result.header, null, 2)}</pre>
          </Panel>
          <Panel title="Payload / Claims">
            <pre className="overflow-auto rounded-lg border border-slate-800 bg-slate-950/70 p-3 font-mono text-[13px] text-slate-200">{JSON.stringify(result.payload, null, 2)}</pre>
            {result.claims && result.claims.length > 0 && (
              <div className="mt-3">
                <KeyValueTable rows={result.claims.map((c) => ({ k: c.name, v: c.meaning ? `${c.value} — ${c.meaning}` : c.value }))} />
              </div>
            )}
          </Panel>
          {result.warnings.length > 0 && (
            <Panel title="Peringatan">
              <ul className="list-inside list-disc space-y-1 text-sm text-amber-200">
                {result.warnings.map((w, i) => (
                  <li key={i}>{w}</li>
                ))}
              </ul>
            </Panel>
          )}
          {sigResult !== 'idle' && (
            <Panel title="Verifikasi signature">
              {sigResult === 'valid' && <p className="text-sm text-emerald-300">✅ Signature valid untuk secret ini.</p>}
              {sigResult === 'invalid' && <p className="text-sm text-red-300">❌ Signature TIDAK valid — token diubah atau secret salah.</p>}
              {sigResult === 'error' && <p className="text-sm text-amber-300">Verifikasi gagal (algoritma non-HS atau secret tidak cocok).</p>}
            </Panel>
          )}
          <p className="text-xs text-slate-500">
            Algorithm: <code className="text-slate-300">{result.algorithm}</code>. Jangan pernah menerima token dengan <code>alg: none</code>.
          </p>
        </div>
      )}
      <ToolNotes notes={webNotes(
        'Decode JWT (header + payload base64url), jelaskan claims, dan verifikasi signature HS256/384/512 dengan secret.',
        'Tempel token → Decode. Masukkan secret → Verify signature.',
        'Verifikasi hanya untuk algoritma HMAC (HS*). RSA (RS*) tidak diverifikasi di tool ini — tanpa public key. Token di-decrypt/decode lokal, tidak dikirim.'
      )} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// HTTP headers analyzer
// ---------------------------------------------------------------------------

function HttpHeadersTool() {
  const [input, setInput] = useState('');
  const [result, setResult] = useState<{ headers: { name: string; value: string }[]; missing: string[]; suspicious: string[] } | null>(null);

  const run = () => {
    const { lines } = parseHeaderLines(input);
    const names = lines.map((l) => l.name.toLowerCase());
    const important = ['content-security-policy', 'strict-transport-security', 'x-frame-options', 'x-content-type-options', 'referrer-policy'];
    const missing = important.filter((n) => !names.includes(n));
    const suspicious = lines.filter((l) => {
      const n = l.name.toLowerCase();
      return n === 'server' || n === 'x-powered-by' || n === 'x-aspnet-version' || (n === 'set-cookie' && !/httponly/i.test(l.value));
    });
    setResult({ headers: lines, missing, suspicious: suspicious.map((s) => `${s.name}: ${s.value}`) });
  };

  return (
    <div className="space-y-4">
      <Button onClick={run}>Analisis header</Button>
      <Panel title="Input">
        <LabeledTextarea id="http-headers-input" label="Tempel header (satu per baris)" value={input} onChange={setInput} rows={6} placeholder={'Content-Type: text/html\nStrict-Transport-Security: max-age=31536000\nServer: nginx/1.18.0'} />
      </Panel>
      {result && (
        <div className="space-y-4">
          <Panel title={`Header (${result.headers.length})`}>
            <KeyValueTable rows={result.headers.map((h) => ({ k: h.name, v: h.value }))} />
          </Panel>
          {result.missing.length > 0 && (
            <Panel title="Security header yang tidak ada">
              <p className="text-sm text-amber-200">{result.missing.join(', ')}</p>
            </Panel>
          )}
          {result.suspicious.length > 0 && (
            <Panel title="Informasi bocor / berisiko">
              <ul className="list-inside list-disc space-y-1 text-sm text-amber-200">
                {result.suspicious.map((s, i) => (
                  <li key={i} className="break-all font-mono text-xs">{s}</li>
                ))}
              </ul>
            </Panel>
          )}
        </div>
      )}
      <ToolNotes notes={webNotes(
        'Parse header HTTP dan identifikasi security header yang hilang atau information disclosure.',
        'Tempel header respons/request, klik Analisis header.'
      )} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Cookie analyzer
// ---------------------------------------------------------------------------

function CookieTool() {
  const [input, setInput] = useState('');
  const [cookies, setCookies] = useState<ReturnType<typeof parseCookies>>([]);

  const run = () => setCookies(parseCookies(input));

  return (
    <div className="space-y-4">
      <Button onClick={run}>Analisis cookie</Button>
      <Panel title="Input">
        <LabeledTextarea id="cookie-input" label="Tempel header Cookie atau Set-Cookie" value={input} onChange={setInput} rows={6} placeholder={'sessionid=abc123; HttpOnly; Secure; SameSite=Lax\nSet-Cookie: user=alice; Path=/'} />
      </Panel>
      {cookies.length > 0 && (
        <Panel title={`Cookie (${cookies.length})`}>
          <div className="space-y-3">
            {cookies.map((c, i) => (
              <div key={i} className="rounded-lg border border-slate-800 bg-slate-900/50 px-3 py-2">
                <p className="font-mono text-sm text-slate-200">
                  {c.name} = <span className="text-slate-400">{c.value}</span>
                </p>
                {c.flags.length > 0 && <p className="mt-1 text-xs text-slate-500">Flags: {c.flags.join(', ')}</p>}
                {c.issues.length > 0 && (
                  <ul className="mt-1 list-inside list-disc space-y-0.5 text-xs text-amber-200">
                    {c.issues.map((issue, j) => (
                      <li key={j}>{issue}</li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </Panel>
      )}
      <ToolNotes notes={webNotes(
        'Parse header Cookie/Set-Cookie: nama, nilai, flag, dan isu keamanan (HttpOnly/Secure/SameSite).',
        'Tempel cookie, klik Analisis cookie.'
      )} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// User-Agent parser
// ---------------------------------------------------------------------------

function UserAgentTool() {
  const [ua, setUa] = useState('');
  const [result, setResult] = useState<ReturnType<typeof parseUserAgent> | null>(null);

  const run = () => setResult(parseUserAgent(ua));

  return (
    <div className="space-y-4">
      <Button onClick={run}>Parse UA</Button>
      <Panel title="Input">
        <LabeledTextarea id="ua-input" label="User-Agent string" value={ua} onChange={setUa} rows={4} placeholder="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36" />
      </Panel>
      {result && (
        <Panel title="Hasil">
          <KeyValueTable
            rows={[
              { k: 'Browser', v: `${result.browser} ${result.browserVersion}` },
              { k: 'OS', v: `${result.os} ${result.osVersion}` },
              { k: 'Device', v: result.device },
              { k: 'Bot?', v: result.isBot ? 'Ya' : 'Tidak' },
            ]}
          />
          {result.notes.length > 0 && (
            <ul className="mt-3 list-inside list-disc space-y-1 text-xs text-slate-500">
              {result.notes.map((n, i) => (
                <li key={i}>{n}</li>
              ))}
            </ul>
          )}
          <p className="mt-3 text-xs text-slate-500">Parsing heuristik — UA bisa dipalsukan (spoofing), jangan jadikan satu-satunya sumber keputusan keamanan.</p>
        </Panel>
      )}
      <ToolNotes notes={webNotes(
        'Mendeteksi browser, OS, dan device dari User-Agent (heuristik regex).',
        'Tempel UA, klik Parse UA.'
      )} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// CSP analyzer
// ---------------------------------------------------------------------------

function CspTool() {
  const [input, setInput] = useState('');
  const [result, setResult] = useState<ReturnType<typeof analyzeCsp> | null>(null);

  const run = () => {
    try {
      setResult(analyzeCsp(input));
    } catch {
      setResult(null);
    }
  };

  return (
    <div className="space-y-4">
      <Button onClick={run}>Analisis CSP</Button>
      <Panel title="Input">
        <LabeledTextarea id="csp-input" label="Content-Security-Policy" value={input} onChange={setInput} rows={5} placeholder="default-src 'self'; script-src 'self' https://cdn.example.com 'unsafe-inline'; object-src 'none'" />
      </Panel>
      {result && (
        <div className="space-y-4">
          <Panel title={`Skor: ${result.score}/100`}>
            <div className="h-2 overflow-hidden rounded bg-slate-800">
              <div className={`h-full ${result.score >= 80 ? 'bg-emerald-500' : result.score >= 50 ? 'bg-amber-500' : 'bg-red-500'}`} style={{ width: `${result.score}%` }} />
            </div>
          </Panel>
          <Panel title="Directives">
            <div className="space-y-2">
              {result.directives.map((d) => (
                <div key={d.name} className="rounded-lg border border-slate-800 bg-slate-900/50 px-3 py-2">
                  <p className="font-mono text-sm text-slate-200">
                    <span className="text-indigo-300">{d.name}</span> {d.value}
                  </p>
                  {d.issues.length > 0 && (
                    <ul className="mt-1 list-inside list-disc space-y-0.5 text-xs text-amber-200">
                      {d.issues.map((i, j) => (
                        <li key={j}>{i}</li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          </Panel>
          {result.issues.length > 0 && (
            <Panel title="Masalah umum">
              <ul className="list-inside list-disc space-y-1 text-sm text-amber-200">
                {result.issues.map((i, j) => (
                  <li key={j}>{i}</li>
                ))}
              </ul>
            </Panel>
          )}
        </div>
      )}
      <ToolNotes notes={webNotes(
        'Menganalisis policy CSP: directive, unsafe-inline/unsafe-eval, wildcard, missing default-src, frame-ancestors.',
        'Tempel policy, klik Analisis CSP.'
      )} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// CORS analyzer
// ---------------------------------------------------------------------------

function CorsTool() {
  const [input, setInput] = useState('');
  const [result, setResult] = useState<ReturnType<typeof analyzeCors> | null>(null);

  const run = () => setResult(analyzeCors(input));

  return (
    <div className="space-y-4">
      <Button onClick={run}>Analisis CORS</Button>
      <Panel title="Input">
        <LabeledTextarea id="cors-input" label="Tempel header CORS (Access-Control-*)" value={input} onChange={setInput} rows={6} placeholder={'Access-Control-Allow-Origin: *\nAccess-Control-Allow-Credentials: true\nAccess-Control-Allow-Methods: GET, POST'} />
      </Panel>
      {result && (
        <div className="space-y-4">
          <Panel title={`Skor: ${result.score}/100`}>
            <div className="h-2 overflow-hidden rounded bg-slate-800">
              <div className={`h-full ${result.score >= 80 ? 'bg-emerald-500' : result.score >= 50 ? 'bg-amber-500' : 'bg-red-500'}`} style={{ width: `${result.score}%` }} />
            </div>
          </Panel>
          <Panel title="Konfigurasi">
            <KeyValueTable
              rows={[
                { k: 'Access-Control-Allow-Origin', v: result.allowOrigin || '(tidak ada)' },
                { k: 'Allow-Credentials', v: result.allowCredentials || '(tidak ada)' },
                { k: 'Allow-Methods', v: result.allowMethods || '(tidak ada)' },
                { k: 'Allow-Headers', v: result.allowHeaders || '(tidak ada)' },
                { k: 'Expose-Headers', v: result.exposeHeaders || '(tidak ada)' },
                { k: 'Max-Age', v: result.maxAge || '(tidak ada)' },
              ]}
            />
          </Panel>
          {result.issues.length > 0 && (
            <Panel title="Masalah">
              <ul className="list-inside list-disc space-y-1 text-sm text-amber-200">
                {result.issues.map((i, j) => (
                  <li key={j}>{i}</li>
                ))}
              </ul>
            </Panel>
          )}
        </div>
      )}
      <ToolNotes notes={webNotes(
        'Mengevaluasi konfigurasi CORS dari header yang ditempel: wildcard, credentials, metode berbahaya.',
        'Tempel header Access-Control-*, klik Analisis CORS.'
      )} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Security headers checker
// ---------------------------------------------------------------------------

function SecurityHeadersTool() {
  const [input, setInput] = useState('');
  const [result, setResult] = useState<ReturnType<typeof checkSecurityHeaders> | null>(null);

  const run = () => setResult(checkSecurityHeaders(input));

  return (
    <div className="space-y-4">
      <Button onClick={run}>Periksa</Button>
      <Panel title="Input">
        <LabeledTextarea id="secheaders-input" label="Tempel seluruh header respons" value={input} onChange={setInput} rows={8} placeholder={'HTTP/1.1 200 OK\nContent-Type: text/html\nContent-Security-Policy: default-src \'self\'\nStrict-Transport-Security: max-age=31536000\nX-Frame-Options: DENY\nX-Content-Type-Options: nosniff\nX-Powered-By: Express'} />
      </Panel>
      {result && (
        <div className="space-y-4">
          <Panel title={`Skor: ${result.score}/100`}>
            <div className="h-2 overflow-hidden rounded bg-slate-800">
              <div className={`h-full ${result.score >= 70 ? 'bg-emerald-500' : result.score >= 40 ? 'bg-amber-500' : 'bg-red-500'}`} style={{ width: `${result.score}%` }} />
            </div>
          </Panel>
          <Panel title="Checklist">
            <div className="space-y-2">
              {result.checks.map((c) => (
                <div key={c.name} className="flex items-start gap-2 rounded-lg border border-slate-800 bg-slate-900/50 px-3 py-2">
                  <span className="mt-0.5">
                    {c.status === 'ok' ? '✅' : c.status === 'warn' ? '⚠️' : c.status === 'bad' ? '❌' : 'ℹ️'}
                  </span>
                  <div className="min-w-0">
                    <p className="font-mono text-xs text-slate-200">{c.name}</p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      <span className="text-slate-400">{c.value}</span> — {c.note}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </Panel>
        </div>
      )}
      <ToolNotes notes={webNotes(
        'Checklist security headers penting (CSP, HSTS, XFO, nosniff, Referrer-Policy, cookie flags, dll) dengan skor.',
        'Tempel header respons, klik Periksa.',
        'Header tidak ada ≠ selalu rentan; beberapa bisa di-substitusi oleh framework/CDN. Ini alat edukasi.'
      )} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// HTML entity
// ---------------------------------------------------------------------------

const htmlEntityTool: TransformConfig = {
  title: 'HTML Entity',
  description: 'Encode/decode entity HTML',
  placeholder: 'Teks atau entity…',
  encode: (s) => htmlEncode(s),
  decode: (s) => htmlDecode(s),
  example: '<img src=x onerror=alert(1)>',
  notes: webNotes(
    'Encode/decode entity HTML (named + numeric).',
    'Tempel teks → Encode; tempel entity → Decode.',
    'Contextual output encoding adalah pertahanan utama XSS.'
  ),
};

// ---------------------------------------------------------------------------
// JS URI decoder
// ---------------------------------------------------------------------------

function JsUriTool() {
  const [input, setInput] = useState('');
  const [result, setResult] = useState<{ decoded: string; layers: string[]; warnings: string[] } | null>(null);

  const run = () => {
    const warnings: string[] = [];
    if (!/^javascript:/i.test(input.trim())) {
      warnings.push('Scheme bukan javascript: — pastikan Anda menganalisis URI yang benar.');
    }
    let current = input.trim();
    const layers: string[] = [current];
    let changed = true;
    let guard = 0;
    while (changed && guard < 8) {
      changed = false;
      try {
        const next = decodeURIComponent(current);
        if (next !== current) {
          current = next;
          layers.push(current);
          changed = true;
        }
      } catch {
        break;
      }
      guard++;
    }
    const lower = current.toLowerCase();
    if (/eval\(/.test(lower)) warnings.push('Mengandung eval() — eksekusi kode dinamis.');
    if (/fromcharcode/i.test(lower)) warnings.push('Mengandung String.fromCharCode — teknik obfuscation umum.');
    if (/atob\(/.test(lower)) warnings.push('Mengandung atob() — base64 decode runtime.');
    if (/(\\x[0-9a-f]{2}|\\u[0-9a-f]{4})/i.test(current)) warnings.push('Mengandung escape hex/unicode — obfuscation.');
    if (/document\.cookie|fetch\(|xmlhttprequest|location\.href|top\.location/i.test(lower)) warnings.push('Akses data sensitif / navigasi terdeteksi.');
    setResult({ decoded: current, layers, warnings });
  };

  return (
    <div className="space-y-4">
      <Button onClick={run}>Decode & analisis</Button>
      <Panel title="Input">
        <LabeledTextarea id="jsuri-input" label="URI (javascript:)" value={input} onChange={setInput} rows={4} placeholder="javascript:alert('XSS')" />
      </Panel>
      {result && (
        <div className="space-y-4">
          <Panel title="Hasil decode">
            <KeyValueTable rows={result.layers.map((l, i) => ({ k: i === 0 ? 'Layer 0 (raw)' : `Layer ${i}`, v: l }))} />
          </Panel>
          {result.warnings.length > 0 && (
            <Panel title="Peringatan">
              <ul className="list-inside list-disc space-y-1 text-sm text-amber-200">
                {result.warnings.map((w, i) => (
                  <li key={i}>{w}</li>
                ))}
              </ul>
            </Panel>
          )}
        </div>
      )}
      <ToolNotes notes={webNotes(
        'Decode bertingkat URI ber-scheme javascript: dan deteksi pola obfuscation.',
        'Tempel URI, klik Decode & analisis.',
        'Jangan jalankan payload — hanya analisis teks.'
      )} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// URL normalization
// ---------------------------------------------------------------------------

function UrlNormalizerTool() {
  const [url, setUrl] = useState('');
  const [result, setResult] = useState<ReturnType<typeof normalizeUrl> | null>(null);
  const [error, setError] = useState<string | null>(null);

  const run = () => {
    setError(null);
    try {
      setResult(normalizeUrl(url));
    } catch {
      setError('URL tidak valid.');
      setResult(null);
    }
  };

  return (
    <div className="space-y-4">
      <Button onClick={run}>Normalisasi</Button>
      <Panel title="Input">
        <LabeledTextarea id="urlnorm-input" label="URL" value={url} onChange={setUrl} rows={3} placeholder="HTTP://Example.COM:80/a/../b/./c#frag" />
      </Panel>
      <ErrorAlert message={error} />
      {result && (
        <div className="space-y-4">
          <Panel title="Hasil">
            <KeyValueTable
              rows={[
                { k: 'Original', v: result.original },
                { k: 'Normalized', v: result.normalized },
                { k: 'Identik?', v: result.original === result.normalized ? 'Ya' : 'Tidak — perhatikan perbedaan!' },
              ]}
            />
          </Panel>
          {result.diffs.length > 0 && (
            <Panel title="Perubahan">
              <ul className="list-inside list-disc space-y-1 text-sm text-slate-400">
                {result.diffs.map((d, i) => (
                  <li key={i}>{d}</li>
                ))}
              </ul>
            </Panel>
          )}
        </div>
      )}
      <ToolNotes notes={webNotes(
        'Menormalisasi URL (lowercase scheme/host, hapus default port, selesaikan dot-segments) untuk memahami canonicalization.',
        'Tempel URL, klik Normalisasi.',
        'Perbedaan parser URL adalah sumber umum bug SSRF/authorization bypass.'
      )} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Open redirect analyzer
// ---------------------------------------------------------------------------

function OpenRedirectTool() {
  const [url, setUrl] = useState('');
  const [result, setResult] = useState<{ risky: boolean; reasons: string[] } | null>(null);

  const run = () => setResult(analyzeOpenRedirect(url.trim()));

  return (
    <div className="space-y-4">
      <Button onClick={run}>Analisis</Button>
      <Panel title="Input">
        <LabeledTextarea id="oredirect-input" label="URL / parameter redirect" value={url} onChange={setUrl} rows={4} placeholder="https://example.com/login?next=//evil.example" />
      </Panel>
      {result && (
        <Panel title="Hasil">
          {result.risky ? (
            <>
              <p className="text-sm font-medium text-red-300">⚠ Pola open redirect terdeteksi.</p>
              <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-amber-200">
                {result.reasons.map((r, i) => (
                  <li key={i}>{r}</li>
                ))}
              </ul>
            </>
          ) : (
            <p className="text-sm text-emerald-300">✅ Tidak ada pola redirect berbahaya langsung terdeteksi. (Ini bukan jaminan keamanan penuh.)</p>
          )}
        </Panel>
      )}
      <ToolNotes notes={webNotes(
        'Mendeteksi pola open redirect pada URL: //host, backslash, scheme javascript:/data:, encoding.',
        'Tempel URL (termasuk parameter), klik Analisis.',
        'Open redirect dipakai phishing — selalu whitelist tujuan redirect server-side.'
      )} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Path traversal analyzer
// ---------------------------------------------------------------------------

function PathTraversalTool() {
  const [input, setInput] = useState('');
  const [result, setResult] = useState<ReturnType<typeof analyzePathTraversal> | null>(null);

  const run = () => setResult(analyzePathTraversal(input));

  return (
    <div className="space-y-4">
      <Button onClick={run}>Scan</Button>
      <Panel title="Input">
        <LabeledTextarea id="ptraversal-input" label="Input yang akan diperiksa" value={input} onChange={setInput} rows={5} placeholder="../../etc/passwd atau %2e%2e%2fetc%2fpasswd" />
      </Panel>
      {result && (
        <Panel title="Hasil">
          {result.found ? (
            <>
              <p className="text-sm font-medium text-red-300">⚠ Pola path traversal terdeteksi.</p>
              <div className="mt-2 space-y-1">
                {result.patterns.map((p, i) => (
                  <p key={i} className="break-all font-mono text-xs text-amber-200">
                    <span className="text-red-300">{p.value}</span> — {p.description}
                  </p>
                ))}
              </div>
            </>
          ) : (
            <p className="text-sm text-emerald-300">✅ Tidak ada pola traversal umum terdeteksi. (Ini bukan jaminan keamanan penuh.)</p>
          )}
        </Panel>
      )}
      <ToolNotes notes={webNotes(
        'Memindai pola path traversal: ../, ..\\, encoding URL, double-encoding, null byte, path sistem sensitif.',
        'Tempel input, klik Scan.',
        'Edukasi defensif — untuk memahami cara filter di-bypass agar bisa menulis filter yang benar.'
      )} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// SQLi / XSS payload analyzer
// ---------------------------------------------------------------------------

function SqliAnalyzerTool() {
  const [input, setInput] = useState('');
  const [result, setResult] = useState<ReturnType<typeof analyzeSqliPayload> | null>(null);
  const run = () => setResult(analyzeSqliPayload(input));
  return (
    <div className="space-y-4">
      <Button onClick={run}>Analisis payload</Button>
      <Panel title="Input">
        <LabeledTextarea id="sqli-input" label="Tempel payload / input yang dicurigai" value={input} onChange={setInput} rows={5} placeholder="' OR 1=1 --" />
      </Panel>
      {result && (
        <Panel title="Pola terdeteksi">
          <div className="space-y-2">
            {result.map((f, i) => (
              <div key={i} className={`rounded-lg border px-3 py-2 ${f.severity === 'high' ? 'border-red-500/40 bg-red-500/10' : f.severity === 'medium' ? 'border-amber-500/40 bg-amber-500/10' : 'border-slate-700 bg-slate-900/50'}`}>
                <p className={`text-sm font-medium ${f.severity === 'high' ? 'text-red-300' : f.severity === 'medium' ? 'text-amber-300' : 'text-slate-300'}`}>
                  {f.pattern}
                </p>
                <p className="mt-0.5 text-xs text-slate-400">{f.description}</p>
                <p className="mt-1 break-all font-mono text-[11px] text-slate-500">Contoh: {f.examples.join(' · ')}</p>
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs text-slate-500">
            Highlighter/analyzer edukasi — BUKAN scanner otomatis ke target. Pengujian SQLi hanya boleh dilakukan pada target yang Anda miliki/izinkan.
          </p>
        </Panel>
      )}
      <ToolNotes notes={webNotes(
        'Menganalisis pola payload SQL injection (quote, UNION, boolean, comment, time-based, meta tables, fungsi error-based).',
        'Tempel payload, klik Analisis payload.',
        'Pertahanan yang benar: parameterized query/prepared statement, bukan sekadar filter blacklist.'
      )} />
    </div>
  );
}

function XssAnalyzerTool() {
  const [input, setInput] = useState('');
  const [result, setResult] = useState<ReturnType<typeof analyzeXssPayload> | null>(null);
  const run = () => setResult(analyzeXssPayload(input));
  return (
    <div className="space-y-4">
      <Button onClick={run}>Analisis payload</Button>
      <Panel title="Input">
        <LabeledTextarea id="xss-input" label="Tempel payload / input yang dicurigai" value={input} onChange={setInput} rows={5} placeholder="<img src=x onerror=alert(document.cookie)>" />
      </Panel>
      {result && (
        <Panel title="Pola terdeteksi">
          <div className="space-y-2">
            {result.map((f, i) => (
              <div key={i} className={`rounded-lg border px-3 py-2 ${f.severity === 'high' ? 'border-red-500/40 bg-red-500/10' : f.severity === 'medium' ? 'border-amber-500/40 bg-amber-500/10' : 'border-slate-700 bg-slate-900/50'}`}>
                <p className={`text-sm font-medium ${f.severity === 'high' ? 'text-red-300' : f.severity === 'medium' ? 'text-amber-300' : 'text-slate-300'}`}>
                  {f.pattern}
                </p>
                <p className="mt-0.5 text-xs text-slate-400">{f.description}</p>
                <p className="mt-1 break-all font-mono text-[11px] text-slate-500">Contoh: {f.examples.join(' · ')}</p>
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs text-slate-500">
            Highlighter/analyzer edukasi — BUKAN scanner otomatis. Pertahanan utama: context-aware output encoding + CSP + HttpOnly cookies.
          </p>
        </Panel>
      )}
      <ToolNotes notes={webNotes(
        'Menganalisis pola payload XSS (tag script, event handler, javascript:, encoding, iframe, srcdoc).',
        'Tempel payload, klik Analisis payload.',
        'Encoding bertingkat sering dipakai melewati filter — perhatikan bagian encoded payload.'
      )} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Regex tester
// ---------------------------------------------------------------------------

function RegexTesterTool() {
  const [pattern, setPattern] = useState('(\\w+)@(\\w+)\\.(\\w+)');
  const [flags, setFlags] = useState('g');
  const [text, setText] = useState('Send email to john@example.com or jane@test.org today.');
  const [result, setResult] = useState<{ matches: { full: string; groups: (string | undefined)[]; index: number }[]; error: string | null; segments: { text: string; match: boolean }[] }>({ matches: [], error: null, segments: [] });

  const run = () => {
    let re: RegExp;
    let error: string | null = null;
    try {
      re = new RegExp(pattern, flags);
    } catch (e) {
      setResult({ matches: [], error: e instanceof Error ? `Regex tidak valid: ${e.message}` : 'Regex tidak valid.', segments: [] });
      return;
    }
    const matches: { full: string; groups: (string | undefined)[]; index: number }[] = [];
    const re2 = new RegExp(re.source, re.flags.includes('g') ? re.flags : re.flags + 'g');
    let m: RegExpExecArray | null;
    let guard = 0;
    while ((m = re2.exec(text)) !== null && guard++ < 1000) {
      matches.push({ full: m[0], groups: m.slice(1), index: m.index });
      if (m[0] === '') re2.lastIndex++;
    }
    // segments untuk highlight
    const segments: { text: string; match: boolean }[] = [];
    const re3 = new RegExp(re.source, re.flags.includes('g') ? re.flags : re.flags + 'g');
    let last = 0;
    let mm: RegExpExecArray | null;
    while ((mm = re3.exec(text)) !== null) {
      if (mm.index > last) segments.push({ text: text.slice(last, mm.index), match: false });
      segments.push({ text: mm[0], match: true });
      last = mm.index + mm[0].length;
      if (mm[0] === '') re3.lastIndex++;
    }
    if (last < text.length) segments.push({ text: text.slice(last), match: false });
    setResult({ matches, error, segments });
  };

  return (
    <div className="space-y-4">
      <Button onClick={run}>Test regex</Button>
      <Panel title="Regex">
        <div className="flex flex-wrap items-center gap-2">
          <input
            value={pattern}
            onChange={(e) => setPattern(e.target.value)}
            placeholder="/pattern/"
            aria-label="Pola regex"
            className="h-9 min-w-0 flex-1 rounded-lg border border-slate-700 bg-slate-900 px-3 font-mono text-sm text-slate-200 focus:border-indigo-500 focus:outline-none"
          />
          <input
            value={flags}
            onChange={(e) => setFlags(e.target.value)}
            placeholder="flags (gim)"
            aria-label="Flag regex"
            className="h-9 w-24 rounded-lg border border-slate-700 bg-slate-900 px-3 font-mono text-sm text-slate-200 focus:border-indigo-500 focus:outline-none"
          />
        </div>
      </Panel>
      <Panel title="Test string">
        <LabeledTextarea id="regex-input" label="Teks" value={text} onChange={setText} rows={6} />
      </Panel>
      <ErrorAlert message={result.error} />
      {result.segments.length > 0 && !result.error && (
        <Panel title="Highlight">
          <p className="rounded-lg border border-slate-800 bg-slate-950/70 p-3 text-sm leading-7 text-slate-300">
            {result.segments.map((s, i) =>
              s.match ? (
                <mark key={i} className="rounded bg-amber-500/30 px-0.5 text-amber-100">{s.text}</mark>
              ) : (
                <span key={i}>{s.text}</span>
              )
            )}
          </p>
        </Panel>
      )}
      {result.matches.length > 0 && !result.error && (
        <Panel title={`Matches (${result.matches.length})`}>
          <div className="max-h-72 space-y-1 overflow-auto">
            {result.matches.map((m, i) => (
              <div key={i} className="rounded border border-slate-800 bg-slate-900/50 px-3 py-1.5">
                <p className="break-all font-mono text-xs text-slate-200">
                  [{m.index}] <span className="text-amber-300">{m.full}</span>
                </p>
                {m.groups.length > 0 && (
                  <p className="break-all font-mono text-[11px] text-slate-500">groups: {m.groups.map((g, j) => `$${j + 1}=${g ?? 'undefined'}`).join(' · ')}</p>
                )}
              </div>
            ))}
          </div>
        </Panel>
      )}
      <ToolNotes notes={webNotes(
        'Uji regex JavaScript: highlight match, daftar match + capture groups.',
        'Isi pola + flags, tempel teks, klik Test regex.',
        'Catastrophic backtracking (ReDoS) bisa terjadi pada pola buruk — hindari nested quantifier pada input besar.'
      )} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// HTTP request/response formatter
// ---------------------------------------------------------------------------

function HttpMessageFormatter({ kind }: { kind: 'request' | 'response' }) {
  const [input, setInput] = useState('');
  const [result, setResult] = useState<{
    startLine: string; headers: { name: string; value: string }[]; body: string;
    parsed: { method?: string; path?: string; version?: string; status?: string; reason?: string };
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const run = () => {
    setError(null);
    const text = input.replace(/\r\n/g, '\n');
    const lines = text.split('\n');
    const startLine = lines[0] ?? '';
    const headerEnd = lines.findIndex((l) => l.trim() === '');
    const headerLines = lines.slice(1, headerEnd === -1 ? lines.length : headerEnd);
    const body = headerEnd === -1 ? '' : lines.slice(headerEnd + 1).join('\n');
    const headers = headerLines
      .map((l) => {
        const idx = l.indexOf(':');
        return idx > 0 ? { name: l.slice(0, idx).trim(), value: l.slice(idx + 1).trim() } : null;
      })
      .filter((x): x is { name: string; value: string } => !!x);
    const parsed: { method?: string; path?: string; version?: string; status?: string; reason?: string } = {};
    if (kind === 'request') {
      const m = /^(\S+)\s+(\S+)\s+(HTTP\/[\d.]+)$/.exec(startLine);
      if (m) {
        parsed.method = m[1];
        parsed.path = m[2];
        parsed.version = m[3];
      } else {
        setError('Request line tidak valid. Format: METHOD PATH HTTP/x.y');
        return;
      }
    } else {
      const m = /^(HTTP\/[\d.]+)\s+(\d{3})(?:\s+(.*))?$/.exec(startLine);
      if (m) {
        parsed.version = m[1];
        parsed.status = m[2];
        parsed.reason = m[3];
      } else {
        setError('Status line tidak valid. Format: HTTP/x.y 200 OK');
        return;
      }
    }
    setResult({ startLine, headers, body, parsed });
  };

  return (
    <div className="space-y-4">
      <Button onClick={run}>Format</Button>
      <Panel title="Input">
        <LabeledTextarea
          id={`http-${kind}-input`}
          label={kind === 'request' ? 'Raw HTTP request' : 'Raw HTTP response'}
          value={input}
          onChange={setInput}
          rows={8}
          placeholder={kind === 'request' ? 'GET /index.html HTTP/1.1\nHost: example.com\nUser-Agent: test\n\n' : 'HTTP/1.1 200 OK\nContent-Type: text/html\n\n<html>…'}
          mono
        />
      </Panel>
      <ErrorAlert message={error} />
      {result && (
        <div className="space-y-4">
          <Panel title="Start line">
            <KeyValueTable
              rows={
                kind === 'request'
                  ? [
                      { k: 'Method', v: result.parsed.method ?? '—' },
                      { k: 'Path', v: result.parsed.path ?? '—' },
                      { k: 'Version', v: result.parsed.version ?? '—' },
                    ]
                  : [
                      { k: 'Version', v: result.parsed.version ?? '—' },
                      { k: 'Status', v: result.parsed.status ?? '—' },
                      { k: 'Reason', v: result.parsed.reason ?? '—' },
                    ]
              }
            />
          </Panel>
          <Panel title={`Headers (${result.headers.length})`} action={<CopyButton text={result.headers.map((h) => `${h.name}: ${h.value}`).join('\n')} />}>
            <KeyValueTable rows={result.headers.map((h) => ({ k: h.name, v: h.value }))} />
          </Panel>
          {result.body && (
            <Panel title={`Body (${result.body.length} char)`} action={<CopyButton text={result.body} />}>
              <pre className="max-h-64 overflow-auto whitespace-pre-wrap break-all rounded-lg border border-slate-800 bg-slate-950/70 p-3 font-mono text-xs text-slate-300">{result.body}</pre>
            </Panel>
          )}
        </div>
      )}
      <ToolNotes notes={webNotes(
        `Parse raw HTTP ${kind === 'request' ? 'request' : 'response'} menjadi struktur: start line, headers, body.`,
        'Tempel raw message, klik Format.',
        'Berguna memahami request/response saat analisis web manual.'
      )} />
    </div>
  );
}

export const tools: Record<string, ComponentType> = {
  'url-parser': UrlParserTool,
  'query-parser': QueryParserTool,
  jwt: JwtTool,
  'http-headers': HttpHeadersTool,
  'cookie-analyzer': CookieTool,
  'user-agent': UserAgentTool,
  csp: CspTool,
  cors: CorsTool,
  'security-headers': SecurityHeadersTool,
  'html-entity': () => <TransformTool {...htmlEntityTool} />,
  'js-uri': JsUriTool,
  'url-normalizer': UrlNormalizerTool,
  'open-redirect': OpenRedirectTool,
  'path-traversal': PathTraversalTool,
  'sqli-analyzer': SqliAnalyzerTool,
  'xss-analyzer': XssAnalyzerTool,
  'regex-tester': RegexTesterTool,
  'http-request': () => <HttpMessageFormatter kind="request" />,
  'http-response': () => <HttpMessageFormatter kind="response" />,
};

export default function WebModule() {
  return null;
}
