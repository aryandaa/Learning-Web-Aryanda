import { useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Calendar, Clock, Hash } from 'lucide-react';
import type { DocumentData } from '../../domain/types';
import { TagBadge } from './TagBadge';
import { sortTags } from '../../lib/tagColors';
import { Breadcrumb } from './Breadcrumb';
import { PrevNext } from './PrevNext';
import { Backlinks } from './Backlinks';

/**
 * Document viewer utama. HTML sudah disanitasi saat parsing
 * (rehype-sanitize), jadi aman dirender via innerHTML.
 */
export function DocumentViewer({ doc }: { doc: DocumentData }) {
  const articleRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const location = useLocation();

  // Intercept klik pada link internal (/docs/...) agar SPA tidak reload.
  useEffect(() => {
    const element = articleRef.current;
    if (!element) return;

    const onClick = (event: MouseEvent) => {
      const anchor = (event.target as HTMLElement).closest('a');
      if (!anchor) return;
      const href = anchor.getAttribute('href') ?? '';
      if (href.startsWith('/docs/')) {
        event.preventDefault();
        navigate(href);
      }
    };

    element.addEventListener('click', onClick);
    return () => element.removeEventListener('click', onClick);
  }, [navigate, doc.id]);

  // Scroll ke heading saat URL membawa anchor (#...).
  useEffect(() => {
    if (!location.hash) return;
    const id = decodeURIComponent(location.hash.slice(1));
    const timer = setTimeout(() => {
      document.getElementById(id)?.scrollIntoView({ block: 'start' });
    }, 60);
    return () => clearTimeout(timer);
  }, [location.hash, doc.id]);

  const toc = doc.headings.filter((h) => h.depth >= 2 && h.depth <= 3);

  return (
    <article className="mx-auto max-w-3xl">
      <Breadcrumb folder={doc.folder} current={doc.title} />

      <header className="mt-4 border-b border-slate-800 pb-6">
        <h1 className="text-3xl font-bold tracking-tight text-slate-50">{doc.title}</h1>

        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-slate-500">
          <span className="flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5" />
            {doc.readingTime} menit baca
          </span>
          {doc.updated && (
            <span className="flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5" />
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
          <div
            ref={articleRef}
            className="doc-content prose prose-invert prose-slate max-w-none"
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
              <ul className="mt-3 space-y-1 text-sm">
                {toc.map((heading) => (
                  <li key={`${heading.id}-${heading.text}`}>
                    <a
                      href={`#${heading.id}`}
                      className={
                        heading.depth === 2
                          ? 'block py-0.5 text-slate-400 hover:text-indigo-300'
                          : 'block py-0.5 pl-3 text-slate-500 hover:text-indigo-300'
                      }
                    >
                      {heading.text}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </aside>
        )}
      </div>
    </article>
  );
}
