/**
 * Google Dork Search: query builder murni (pure functions, mudah dites).
 *
 * Prinsip: tool hanya MENYUSUN query. Tidak ada request ke Google dari frontend.
 * "Search Google" membuka https://www.google.com/search?q=... di tab baru (browser
 * user yang melakukan pencarian). Tidak ada scraping, tidak ada API key, tidak ada backend.
 */

export type DorkTarget = 'anywhere' | 'url' | 'title' | 'text';

export type DorkOperatorId =
  | 'site' | 'inurl' | 'intitle' | 'intext' | 'filetype' | 'ext'
  | 'allinurl' | 'allintitle' | 'allintext' | 'before' | 'after';

export interface DorkCustomOperator {
  id: string;
  operator: DorkOperatorId;
  value: string;
}

export interface DorkForm {
  keyword: string;
  target: DorkTarget;
  site: string;
  exactPhrase: string;
  exclude: string;
  urlContains: string;
  titleContains: string;
  textContains: string;
  fileType: string;
  orKeywords: string[];
  customOperators: DorkCustomOperator[];
}

export interface DorkSegment {
  query: string;
  explanation: string;
}

export interface DorkResult {
  query: string;
  segments: DorkSegment[];
  warnings: string[];
}

export const EMPTY_DORK_FORM: DorkForm = {
  keyword: '',
  target: 'anywhere',
  site: '',
  exactPhrase: '',
  exclude: '',
  urlContains: '',
  titleContains: '',
  textContains: '',
  fileType: '',
  orKeywords: ['', ''],
  customOperators: [],
};

export const FILE_TYPES = [
  'pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt',
  'csv', 'xml', 'json', 'sql', 'log', 'conf', 'env', 'js', 'zip', 'bak', 'sql.gz',
];

export const CUSTOM_OPERATOR_IDS: DorkOperatorId[] = [
  'site', 'inurl', 'intitle', 'intext', 'filetype', 'ext',
  'allinurl', 'allintitle', 'allintext', 'before', 'after',
];

export function operatorLabel(op: DorkOperatorId): string {
  return `${op}:`;
}

function clean(value: string): string {
  return value.trim().replace(/\s+/g, ' ').replace(/["\u0000-\u001f]/g, '');
}

function quoteIfNeeded(value: string): string {
  const v = clean(value);
  return /\s/.test(v) ? `"${v}"` : v;
}

function opExplanation(op: DorkOperatorId, value: string): string {
  switch (op) {
    case 'site': return `Membatasi pencarian pada domain ${value}.`;
    case 'inurl': return `Mencari halaman yang URL-nya mengandung ${value}.`;
    case 'intitle': return `Mencari halaman yang title-nya mengandung ${value}.`;
    case 'intext': return `Mencari halaman yang isi/teks-nya mengandung ${value}.`;
    case 'filetype': return `Membatasi hasil ke file berjenis ${value}.`;
    case 'ext': return `Membatasi hasil ke ekstensi file ${value}.`;
    case 'allinurl': return `Semua kata (${value}) harus ada di URL halaman.`;
    case 'allintitle': return `Semua kata (${value}) harus ada di title halaman.`;
    case 'allintext': return `Semua kata (${value}) harus ada di teks halaman.`;
    case 'before': return `Hanya hasil yang diindeks sebelum tanggal ${value}.`;
    case 'after': return `Hanya hasil yang diindeks setelah tanggal ${value}.`;
  }
}

const DATE_RE = /^\d{4}(-\d{2}(-\d{2})?)?$/;

/** Bangun query Google Dork dari form. Deterministik. */
export function buildDork(form: DorkForm): DorkResult {
  const segments: DorkSegment[] = [];
  const warnings: string[] = [];

  const site = clean(form.site);
  if (site) {
    segments.push({ query: `site:${site}`, explanation: `Membatasi pencarian pada domain ${site}.` });
  }

  const kw = clean(form.keyword);
  if (kw) {
    if (form.target === 'url') segments.push({ query: `inurl:${kw}`, explanation: `Mencari halaman yang URL-nya mengandung ${kw}.` });
    else if (form.target === 'title') segments.push({ query: `intitle:${kw}`, explanation: `Mencari halaman yang title-nya mengandung ${kw}.` });
    else if (form.target === 'text') segments.push({ query: `intext:${kw}`, explanation: `Mencari halaman yang isi/teks-nya mengandung ${kw}.` });
    else segments.push({ query: kw, explanation: `Kata kunci utama: ${kw}.` });
  }

  const ors = form.orKeywords.map(clean).filter(Boolean);
  if (ors.length >= 2) {
    segments.push({
      query: ors.join(' OR '),
      explanation: `Menampilkan hasil yang mengandung salah satu kata: ${ors.join(' atau ')}.`,
    });
  }

  const phrase = clean(form.exactPhrase);
  if (phrase) {
    segments.push({ query: `"${phrase}"`, explanation: `Mencari frasa persis: "${phrase}".` });
  }

  const urlC = clean(form.urlContains);
  if (urlC) segments.push({ query: `inurl:${quoteIfNeeded(urlC)}`, explanation: `Mencari halaman yang URL-nya mengandung ${urlC}.` });

  const titleC = clean(form.titleContains);
  if (titleC) segments.push({ query: `intitle:${quoteIfNeeded(titleC)}`, explanation: `Mencari halaman yang title-nya mengandung ${titleC}.` });

  const textC = clean(form.textContains);
  if (textC) segments.push({ query: `intext:${quoteIfNeeded(textC)}`, explanation: `Mencari halaman yang isi/teks-nya mengandung ${textC}.` });

  const excludes = form.exclude.split(/[\n,]+/).map(clean).filter(Boolean);
  if (excludes.length > 0) {
    segments.push({
      query: excludes.map((e) => `-${e}`).join(' '),
      explanation: `Mengecualikan kata: ${excludes.map((e) => `-${e}`).join(', ')}.`,
    });
  }

  const ft = clean(form.fileType).toLowerCase();
  if (ft) {
    if (!FILE_TYPES.includes(ft)) {
      warnings.push(`File type "${ft}" tidak dikenal. Gunakan salah satu: ${FILE_TYPES.join(', ')}.`);
    } else {
      segments.push({ query: `filetype:${ft}`, explanation: `Membatasi hasil ke file berjenis ${ft}.` });
    }
  }

  for (const op of form.customOperators) {
    const val = clean(op.value);
    if (!val) {
      warnings.push(`Operator ${op.operator}: nilai kosong, dilewati.`);
      continue;
    }
    if ((op.operator === 'before' || op.operator === 'after') && !DATE_RE.test(val)) {
      warnings.push(`Format tanggal untuk ${op.operator} tidak valid. Gunakan YYYY-MM-DD (mis. 2025-01-01).`);
      continue;
    }
    segments.push({ query: `${op.operator}:${val}`, explanation: opExplanation(op.operator, val) });
  }

  const query = segments.map((s) => s.query).join(' ');
  return { query, segments, warnings };
}

/** Link pencarian Google (hanya dibuka saat user menekan tombol). */
export function googleSearchUrl(query: string): string {
  const q = query.trim();
  return q ? `https://www.google.com/search?q=${encodeURIComponent(q)}` : 'https://www.google.com/';
}

// ---------------------------------------------------------------------------
// Preset pembelajaran (hanya mengisi form, tidak menjalankan apa pun)
// ---------------------------------------------------------------------------

export interface DorkPreset {
  id: string;
  name: string;
  description: string;
  values: Partial<DorkForm>;
}

export const DORK_PRESETS: DorkPreset[] = [
  { id: 'docs', name: 'Public Documents', description: 'Dokumen publik (PDF) pada domain target.', values: { fileType: 'pdf' } },
  { id: 'login', name: 'Login Pages', description: 'Halaman login pada domain target.', values: { urlContains: 'login' } },
  { id: 'admin', name: 'Admin Pages', description: 'Halaman admin pada domain target.', values: { urlContains: 'admin' } },
  { id: 'conf', name: 'Configuration Files', description: 'File konfigurasi (conf) pada domain target.', values: { fileType: 'conf' } },
  { id: 'js', name: 'JavaScript Files', description: 'File JavaScript pada domain target.', values: { fileType: 'js' } },
  { id: 'api', name: 'API Discovery', description: 'Endpoint API pada domain target.', values: { urlContains: 'api' } },
  { id: 'error', name: 'Error Pages', description: 'Halaman error pada domain target.', values: { titleContains: 'error' } },
  { id: 'tech', name: 'Technology Discovery', description: 'Deteksi teknologi via teks "powered by".', values: { textContains: 'powered by' } },
];
