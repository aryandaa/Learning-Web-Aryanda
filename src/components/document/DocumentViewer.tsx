import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Calendar, ChevronDown, ChevronRight, Clock, Hash } from 'lucide-react';
import type { DocumentData } from '../../domain/types';
import { useTheme } from '../../app/ThemeProvider';
import { TagBadge } from './TagBadge';
import { sortTags } from '../../lib/tagColors';
import { Breadcrumb } from './Breadcrumb';
import { PrevNext } from './PrevNext';
import { Backlinks } from './Backlinks';
import { cn } from '../../lib/utils';

/**
 * Menyalin teks ke clipboard dengan fallback (desktop & mobile).
 */
async function copyToClipboard(text: string): Promise<void> {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }
  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  document.body.appendChild(textarea);
  textarea.select();
  try {
    document.execCommand('copy');
  } finally {
    document.body.removeChild(textarea);
  }
}

/** Label tampilan bahasa untuk code block. */
const LANG_LABELS: Record<string, string> = {
  javascript: 'JavaScript',
  js: 'JavaScript',
  jsx: 'JSX',
  typescript: 'TypeScript',
  ts: 'TypeScript',
  tsx: 'TSX',
  php: 'PHP',
  python: 'Python',
  py: 'Python',
  java: 'Java',
  c: 'C',
  cpp: 'C++',
  'c++': 'C++',
  csharp: 'C#',
  cs: 'C#',
  html: 'HTML',
  xml: 'XML',
  css: 'CSS',
  scss: 'SCSS',
  less: 'Less',
  sql: 'SQL',
  bash: 'Bash',
  shell: 'Shell',
  sh: 'Shell',
  zsh: 'Zsh',
  json: 'JSON',
  yaml: 'YAML',
  yml: 'YAML',
  markdown: 'Markdown',
  md: 'Markdown',
  plaintext: 'Text',
  text: 'Text',
  diff: 'Diff',
  dockerfile: 'Dockerfile',
  go: 'Go',
  rust: 'Rust',
  ruby: 'Ruby',
  kotlin: 'Kotlin',
  swift: 'Swift',
  graphql: 'GraphQL',
  ini: 'INI',
  makefile: 'Makefile',
  perl: 'Perl',
  r: 'R',
  objectivec: 'Objective-C',
  vbnet: 'VB.NET',
  http: 'HTTP',
};

function languageFromCode(code: HTMLElement | null): string {
  if (!code) return '';
  for (const cls of code.classList) {
    if (cls.startsWith('language-')) {
      return cls.slice('language-'.length).toLowerCase();
    }
  }
  return '';
}

/**
 * Scroll ke elemen heading berdasarkan hash. Anchor Obsidian bisa berbeda
 * case dari slug heading ([[Note#Soal]] vs id "soal"), jadi cari dengan
 * fallback case-insensitive agar seluruh materi tetap bisa dinavigasi.
 */
function scrollToHash(rawHash: string): boolean {
  const id = decodeURIComponent(rawHash);
  let el = document.getElementById(id);
  if (!el) {
    const lower = id.toLowerCase();
    const candidates = document.querySelectorAll<HTMLElement>('h1,h2,h3,h4,h5,h6,[id]');
    for (const candidate of candidates) {
      if ((candidate.id || '').toLowerCase() === lower) {
        el = candidate;
        break;
      }
    }
  }
  if (!el) return false;
  el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  return true;
}

/**
 * Document viewer utama. HTML sudah disanitasi saat parsing
 * (rehype-sanitize), jadi aman dirender via innerHTML.
 *
 * Perbaikan routing: semua tautan hash memakai URL absolut
 * (pathname#anchor) karena <base href> membuat `#anchor` relatif
 * berubah menjadi `/#anchor` → dashboard. Tautan hash di dalam konten
 * juga di-intercept untuk smooth-scroll tanpa meninggalkan halaman.
 */
export function DocumentViewer({ doc }: { doc: DocumentData }) {
  const articleRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const { theme } = useTheme();
  const [tocOpen, setTocOpen] = useState(false);

  // Intercept klik pada link internal agar SPA tidak reload/redirect.
  useEffect(() => {
    const element = articleRef.current;
    if (!element) return;

    const onClick = (event: MouseEvent) => {
      const anchor = (event.target as HTMLElement).closest('a');
      if (!anchor) return;
      const href = anchor.getAttribute('href') ?? '';

      if (href.startsWith('/docs/')) {
        // Link antar dokumen (wiki-link / markdown link). SPA navigation.
        event.preventDefault();
        navigate(href);
      } else if (href === '#') {
        // Link rusak / anchor kosong. jangan redirect ke dashboard.
        event.preventDefault();
      } else if (href.startsWith('#')) {
        // Anchor heading di dalam dokumen: scroll + update hash dengan aman.
        event.preventDefault();
        const id = href.slice(1);
        scrollToHash(id);
        navigate(`${location.pathname}${location.search}#${id}`, { replace: true });
      }
    };

    element.addEventListener('click', onClick);
    return () => element.removeEventListener('click', onClick);
  }, [navigate, doc.id, location.pathname, location.search]);

  // Scroll ke heading saat URL membawa anchor (#...).
  useEffect(() => {
    if (!location.hash) return;
    const rawHash = location.hash.slice(1);
    const timer = setTimeout(() => {
      scrollToHash(rawHash);
    }, 60);
    return () => clearTimeout(timer);
  }, [location.hash, doc.id]);

  // Tingkatkan code block: label bahasa + tombol copy.
  useEffect(() => {
    const root = articleRef.current;
    if (!root) return;

    root.querySelectorAll<HTMLPreElement>('pre').forEach((pre) => {
      if (pre.querySelector('.code-block-header')) return; // sudah diproses
      const code = pre.querySelector('code');
      const lang = languageFromCode(code);
      const label = LANG_LABELS[lang] ?? (lang ? lang.charAt(0).toUpperCase() + lang.slice(1) : 'Text');

      const header = document.createElement('div');
      header.className = 'code-block-header';

      const langEl = document.createElement('span');
      langEl.className = 'code-block-lang';
      langEl.textContent = label;

      const copyBtn = document.createElement('button');
      copyBtn.type = 'button';
      copyBtn.className = 'code-block-copy';
      copyBtn.textContent = 'Copy';
      copyBtn.setAttribute('aria-label', `Salin kode ${label}`);

      copyBtn.addEventListener('click', async () => {
        const text = code?.innerText ?? '';
        try {
          await copyToClipboard(text);
          copyBtn.textContent = 'Copied';
          copyBtn.classList.add('copied');
        } catch {
          copyBtn.textContent = 'Gagal';
        }
        window.setTimeout(() => {
          copyBtn.textContent = 'Copy';
          copyBtn.classList.remove('copied');
        }, 1600);
      });

      header.append(langEl, copyBtn);
      pre.prepend(header);
      pre.classList.add('code-block');
    });
  }, [doc.id, doc.html]);

  // TOC mencakup seluruh level heading Obsidian (# .. ######);
  // item yang lebih dalam (banyak #) diindent sesuai levelnya.
  const toc = doc.headings.filter((h) => h.depth >= 1 && h.depth <= 6);
  const tocAnchor = (id: string) => `${location.pathname}${location.search}#${id}`;

  /** Gaya item daftar isi per kedalaman heading. semakin dalam, semakin indent. */
  const TOC_DEPTH_CLASSES: Record<number, string> = {
    1: 'pl-0 font-medium text-slate-300',
    2: 'pl-3 text-slate-400',
    3: 'pl-6 text-slate-500',
    4: 'pl-9 text-slate-500',
    5: 'pl-11 text-slate-500',
    6: 'pl-14 text-slate-500',
  };
  const tocItemClass = (depth: number) =>
    `block py-0.5 transition-colors hover:text-indigo-300 ${TOC_DEPTH_CLASSES[depth] ?? TOC_DEPTH_CLASSES[6]}`;

  const tocList = (mobile: boolean) => (
    <ul className={mobile ? 'mt-2 space-y-0.5 text-sm' : 'mt-3 space-y-0.5 text-sm'}>
      {toc.map((heading) => (
        <li key={`${heading.id}-${heading.text}`}>
          <a
            href={tocAnchor(heading.id)}
            onClick={() => setTocOpen(false)}
            className={tocItemClass(heading.depth)}
          >
            {heading.text}
          </a>
        </li>
      ))}
    </ul>
  );

  return (
    <article className="mx-auto max-w-3xl">
      <Breadcrumb folder={doc.folder} current={doc.title} />

      <header className="mt-4 border-b border-slate-800 pb-7">
        <h1 className="text-3xl font-bold tracking-tight text-slate-50 sm:text-4xl">{doc.title}</h1>

        <div className="mt-4 flex flex-wrap items-center gap-x-2 gap-y-1.5 text-xs text-slate-500">
          <span className="flex items-center gap-1.5 rounded-full border border-slate-800 bg-slate-900/60 px-2.5 py-1">
            <Clock className="h-3.5 w-3.5 text-indigo-400" />
            {doc.readingTime} menit baca
          </span>
          {doc.updated && (
            <span className="flex items-center gap-1.5 rounded-full border border-slate-800 bg-slate-900/60 px-2.5 py-1">
              <Calendar className="h-3.5 w-3.5 text-indigo-400" />
              {doc.updated}
            </span>
          )}
          {sortTags(doc.tags).map((tag) => (
            <TagBadge key={tag} tag={tag} />
          ))}
        </div>
      </header>

      <div className="mt-6 flex gap-10">
        {/* Konten */}
        <div className="min-w-0 flex-1">
          {/* TOC mobile/tablet (di bawah xl) */}
          {toc.length > 1 && (
            <div className="mb-6 rounded-xl border border-slate-800 bg-slate-900/40 xl:hidden">
              <button
                onClick={() => setTocOpen((v) => !v)}
                className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left text-sm font-medium text-slate-300 transition-colors hover:text-slate-100"
                aria-expanded={tocOpen}
              >
                <span className="flex items-center gap-1.5">
                  <Hash className="h-3.5 w-3.5 text-indigo-400" />
                  Daftar Isi
                </span>
                {tocOpen ? (
                  <ChevronDown className="h-4 w-4 text-slate-500" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-slate-500" />
                )}
              </button>
              {tocOpen && <div className="border-t border-slate-800 px-4 pb-3">{tocList(true)}</div>}
            </div>
          )}

          <div
            ref={articleRef}
            className={cn(
              'doc-content prose prose-slate max-w-none',
              theme === 'dark' && 'prose-invert'
            )}
            dangerouslySetInnerHTML={{ __html: doc.html }}
          />

          <Backlinks doc={doc} />
          <PrevNext doc={doc} />
        </div>

        {/* TOC sticky di layar besar */}
        {toc.length > 1 && (
          <aside className="hidden w-52 shrink-0 xl:block">
            <div className="sticky top-24 max-h-[calc(100vh-8rem)] overflow-y-auto border-l border-slate-800 pl-4">
              <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-500">
                <Hash className="h-3 w-3" />
                Daftar Isi
              </p>
              {tocList(false)}
            </div>
          </aside>
        )}
      </div>
    </article>
  );
}
