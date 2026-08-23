/**
 * Google Dork Search: bangun query pencarian Google secara visual, 100% lokal.
 * Tidak ada request ke Google dari frontend; tombol "Search Google" hanya membuka
 * https://www.google.com/search?q=... di tab baru (browser user yang mencari).
 */

import { useMemo, useState } from 'react';
import { Button } from '../../../../components/ui/button';
import {
  CopyButton, ErrorAlert, LabeledTextarea, Notice, Panel, ToolNotes,
} from '../../../cysec-tools/components/ui';
import {
  buildDork, googleSearchUrl, EMPTY_DORK_FORM, FILE_TYPES, CUSTOM_OPERATOR_IDS,
  operatorLabel, DORK_PRESETS, type DorkForm, type DorkTarget, type DorkOperatorId,
} from '../../utils/dork';
import { exportTxt } from '../../utils/shared';
import { cn } from '../../../../lib/utils';
import type { ComponentType } from 'react';

const TARGET_OPTIONS: { id: DorkTarget; label: string }[] = [
  { id: 'anywhere', label: 'Anywhere' },
  { id: 'url', label: 'URL' },
  { id: 'title', label: 'Title' },
  { id: 'text', label: 'Text / Description' },
];

function Field({
  id, label, value, onChange, placeholder, type = 'text', mono,
}: {
  id: string; label: string; value: string; onChange: (v: string) => void;
  placeholder?: string; type?: 'text' | 'select'; mono?: boolean;
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-xs font-medium text-slate-400">{label}</label>
      <input
        id={id}
        type={type === 'select' ? 'text' : 'text'}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        spellCheck={false}
        className={cn(
          'h-9 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 text-sm text-slate-200 placeholder:text-slate-600 focus:border-accent-500 focus:outline-none focus:ring-2 focus:ring-accent-500/30',
          mono && 'font-mono text-[13px]'
        )}
      />
    </div>
  );
}

function SelectField({
  id, label, value, onChange, options,
}: {
  id: string; label: string; value: string; onChange: (v: string) => void; options: { value: string; label: string }[];
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-xs font-medium text-slate-400">{label}</label>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-9 w-full rounded-lg border border-slate-700 bg-slate-900 px-2 text-sm text-slate-200 focus:border-accent-500 focus:outline-none"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </div>
  );
}

let customOpCounter = 0;

function GoogleDorkSearchTool() {
  const [form, setForm] = useState<DorkForm>(EMPTY_DORK_FORM);
  const [copied, setCopied] = useState(false);
  const [presetNote, setPresetNote] = useState<string | null>(null);

  const set = <K extends keyof DorkForm>(key: K, value: DorkForm[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const result = useMemo(() => buildDork(form), [form]);

  const applyPreset = (id: string) => {
    const preset = DORK_PRESETS.find((p) => p.id === id);
    if (!preset) return;
    setForm((prev) => ({
      ...prev,
      ...preset.values,
      // Pertahankan site user; isi example.com hanya jika masih kosong.
      site: prev.site.trim() ? prev.site : 'example.com',
    }));
    setPresetNote(`Preset "${preset.name}" diterapkan. Ganti "example.com" dengan domain target Anda.`);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const copyQuery = async () => {
    if (!result.query) return;
    try {
      await navigator.clipboard.writeText(result.query);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard tidak tersedia */
    }
  };

  const openGoogle = () => {
    window.open(googleSearchUrl(result.query), '_blank', 'noopener,noreferrer');
  };

  const updateCustomOp = (index: number, patch: Partial<{ operator: DorkOperatorId; value: string }>) => {
    set('customOperators', form.customOperators.map((op, i) => (i === index ? { ...op, ...patch } : op)));
  };
  const removeCustomOp = (index: number) => {
    set('customOperators', form.customOperators.filter((_, i) => i !== index));
  };
  const addCustomOp = () => {
    set('customOperators', [...form.customOperators, { id: `op-${++customOpCounter}`, operator: 'site', value: '' }]);
  };

  const setOrKeyword = (index: number, value: string) => {
    set('orKeywords', form.orKeywords.map((k, i) => (i === index ? value : k)));
  };

  return (
    <div className="space-y-4">
      <Notice tone="info">
        Tool ini hanya <strong>menyusun query</strong> Google Dork di browser Anda. Tidak ada request/scraping ke
        Google dari website ini. Tombol "Search Google" membuka pencarian di tab baru (browser Anda yang mencari).
      </Notice>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Form kiri */}
        <Panel title="Input query">
          <div className="space-y-3">
            <Field id="dork-keyword" label="Keyword" value={form.keyword} onChange={(v) => set('keyword', v)} placeholder="contoh: admin" />
            <SelectField
              id="dork-target"
              label="Search Target"
              value={form.target}
              onChange={(v) => set('target', v as DorkTarget)}
              options={TARGET_OPTIONS.map((o) => ({ value: o.id, label: o.label }))}
            />
            <Field id="dork-site" label="Site" value={form.site} onChange={(v) => set('site', v)} placeholder="example.com" mono />
            <Field id="dork-phrase" label="Exact Phrase" value={form.exactPhrase} onChange={(v) => set('exactPhrase', v)} placeholder="admin login panel" mono />
            <Field id="dork-exclude" label="Exclude Keyword (pisah dengan koma / baris baru)" value={form.exclude} onChange={(v) => set('exclude', v)} placeholder="admin, test, example" mono />
            <div className="grid gap-3 sm:grid-cols-3">
              <Field id="dork-url" label="URL contains" value={form.urlContains} onChange={(v) => set('urlContains', v)} placeholder="admin" mono />
              <Field id="dork-title" label="Title contains" value={form.titleContains} onChange={(v) => set('titleContains', v)} placeholder="login" mono />
              <Field id="dork-text" label="Text contains" value={form.textContains} onChange={(v) => set('textContains', v)} placeholder="password" mono />
            </div>
            <SelectField
              id="dork-filetype"
              label="File Type"
              value={form.fileType}
              onChange={(v) => set('fileType', v)}
              options={[{ value: '', label: 'None' }, ...FILE_TYPES.map((f) => ({ value: f, label: f }))]}
            />
          </div>
        </Panel>

        {/* Form kanan: OR + custom operators */}
        <div className="space-y-4">
          <Panel title="OR Support">
            <div className="grid gap-3 sm:grid-cols-2">
              {form.orKeywords.map((kw, i) => (
                <Field key={i} id={`dork-or-${i}`} label={i === 0 ? 'Keyword A' : 'Keyword B'} value={kw} onChange={(v) => setOrKeyword(i, v)} placeholder={i === 0 ? 'login' : 'admin'} />
              ))}
            </div>
            <p className="mt-2 text-xs text-slate-500">Jika kedua keyword terisi, hasil berupa: A OR B.</p>
          </Panel>

          <Panel
            title={`Additional Operators (${form.customOperators.length})`}
            action={
              <Button type="button" variant="secondary" size="sm" onClick={addCustomOp} disabled={form.customOperators.length >= 10}>
                + Add Operator
              </Button>
            }
          >
            {form.customOperators.length === 0 ? (
              <p className="text-sm text-slate-500">Belum ada operator tambahan. Klik "+ Add Operator".</p>
            ) : (
              <div className="space-y-2">
                {form.customOperators.map((op, i) => (
                  <div key={op.id} className="flex flex-wrap items-center gap-2">
                    <select
                      value={op.operator}
                      onChange={(e) => updateCustomOp(i, { operator: e.target.value as DorkOperatorId })}
                      aria-label={`Operator ${i + 1}`}
                      className="h-9 w-32 rounded-lg border border-slate-700 bg-slate-900 px-2 font-mono text-sm text-slate-200 focus:border-accent-500 focus:outline-none"
                    >
                      {CUSTOM_OPERATOR_IDS.map((oid) => (
                        <option key={oid} value={oid}>{operatorLabel(oid)}</option>
                      ))}
                    </select>
                    <input
                      value={op.value}
                      onChange={(e) => updateCustomOp(i, { value: e.target.value })}
                      placeholder="value…"
                      aria-label={`Nilai operator ${i + 1}`}
                      className="h-9 min-w-0 flex-1 rounded-lg border border-slate-700 bg-slate-900 px-3 font-mono text-sm text-slate-200 placeholder:text-slate-600 focus:border-accent-500 focus:outline-none"
                    />
                    <button
                      onClick={() => removeCustomOp(i)}
                      aria-label="Hapus operator"
                      className="rounded-md p-1.5 text-slate-500 transition-colors hover:bg-slate-800 hover:text-red-300"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
          </Panel>

          <Panel title="Presets pembelajaran">
            <p className="mb-2 text-xs text-slate-500">
              Preset hanya mengisi form untuk pencarian informasi publik (OSINT). Tidak ada scanning otomatis.
            </p>
            <div className="flex flex-wrap gap-1.5">
              {DORK_PRESETS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => applyPreset(p.id)}
                  title={p.description}
                  className="rounded-lg border border-slate-700 bg-slate-900/60 px-3 py-1.5 text-xs text-slate-300 transition-colors hover:border-accent-500/50 hover:text-accent-300"
                >
                  {p.name}
                </button>
              ))}
            </div>
            {presetNote && <p className="mt-2 text-xs text-amber-200">{presetNote}</p>}
          </Panel>
        </div>
      </div>

      {/* Hasil */}
      <Panel title="Generated Query">
        <pre className="max-h-40 overflow-x-auto whitespace-pre-wrap break-all rounded-lg border border-slate-800 bg-slate-950/70 p-3 font-mono text-[13px] leading-6 text-emerald-300">
          {result.query || <span className="text-slate-600">Query akan tampil di sini secara realtime…</span>}
        </pre>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Button type="button" onClick={() => void copyQuery()} disabled={!result.query}>
            {copied ? 'Query copied ✓' : 'Copy Query'}
          </Button>
          <Button type="button" variant="secondary" onClick={openGoogle} disabled={!result.query}>
            Search Google ↗
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={() => exportTxt(result.query, 'google-dork.txt')} disabled={!result.query}>
            Export TXT
          </Button>
        </div>
        {result.query === '' && (
          <p className="mt-2 text-xs text-amber-200">Query masih kosong. Isi minimal satu field untuk menyusun dork.</p>
        )}
      </Panel>

      <ErrorAlert message={result.warnings.length ? result.warnings.join(' ') : null} />

      {/* Penjelasan dinamis */}
      {result.segments.length > 0 && (
        <Panel title="Query Explanation">
          <div className="space-y-2">
            {result.segments.map((s, i) => (
              <div key={i} className="flex flex-col gap-0.5 rounded-lg border border-slate-800 bg-slate-900/50 px-3 py-2 sm:flex-row sm:items-baseline sm:gap-3">
                <code className="shrink-0 font-mono text-xs text-accent-300">{s.query}</code>
                <span className="text-xs text-slate-400">→ {s.explanation}</span>
              </div>
            ))}
          </div>
        </Panel>
      )}

      {/* Materi belajar */}
      <Panel title="Learn Google Dorking">
        <div className="space-y-3 text-sm leading-6 text-slate-400">
          <p>
            <strong className="text-slate-200">Apa itu Google Dorking?</strong> Teknik memanfaatkan operator pencarian
            Google untuk menemukan informasi publik yang tersedia di internet, misalnya dokumen, halaman login, file
            konfigurasi, atau endpoint API. Digunakan dalam OSINT dan security research terhadap aset yang Anda
            miliki/diizinkan.
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            {[
              ['site:', 'Membatasi hasil pada satu domain.'],
              ['inurl:', 'Kata yang dicari ada di URL halaman.'],
              ['intitle:', 'Kata yang dicari ada di judul (title) halaman.'],
              ['intext:', 'Kata yang dicari ada di isi halaman.'],
              ['filetype:', 'Membatasi hasil ke jenis file (pdf, docx, dst).'],
              ['before:', 'Hanya hasil yang diindeks sebelum tanggal tertentu.'],
              ['after:', 'Hanya hasil yang diindeks setelah tanggal tertentu.'],
              ['"frasa"', 'Mencari frasa persis (kombinasi kata yang urut).'],
              ['-kata', 'Mengecualikan kata dari hasil.'],
              ['A OR B', 'Hasil yang mengandung A atau B.'],
            ].map(([op, desc]) => (
              <div key={op} className="flex items-baseline gap-2 rounded-lg border border-slate-800/70 bg-slate-900/40 px-3 py-1.5">
                <code className="shrink-0 font-mono text-xs text-emerald-300">{op}</code>
                <span className="text-xs text-slate-400">{desc}</span>
              </div>
            ))}
          </div>
          <p>
            <strong className="text-slate-200">Menggabungkan operator:</strong> tulis operator berurutan dipisah spasi,
            contoh: <code className="font-mono text-xs text-accent-300">site:example.com inurl:admin filetype:pdf</code>.
            Pencarian biasa hanya mencocokkan kata; advanced search dengan operator menyaring lebih presisi.
          </p>
          <p className="rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-2 text-xs text-amber-200">
            Gunakan hanya untuk tujuan pembelajaran dan terhadap aset yang sah. Jangan untuk doxxing, credential
            attack, atau aktivitas ilegal.
          </p>
        </div>
      </Panel>

      <ToolNotes
        notes={[
          { title: 'What is this?', content: 'Membangun query Google Dork secara visual: keyword, target, site, exact phrase, exclude, filetype, custom operator, dan OR.' },
          { title: 'How to use', content: 'Isi form. Query diperbarui realtime. Klik Copy Query untuk menyalin, atau Search Google untuk membuka pencarian di tab baru.' },
          { title: 'Input', content: 'Form query builder.' },
          { title: 'Output', content: 'Query + penjelasan operator + link pencarian Google.' },
          { title: 'Notes', content: '100% lokal. Tidak ada request ke Google dari website; tidak ada API key; tidak ada scraping. Browser Anda yang membuka Google saat tombol ditekan.' },
        ]}
      />
    </div>
  );
}

export const tools: Record<string, ComponentType> = { 'google-dork-search': GoogleDorkSearchTool };
export default GoogleDorkSearchTool;
