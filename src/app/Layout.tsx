import { useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { BookOpen, Map, Menu, Network, Search, X } from 'lucide-react';
import { useSiteData } from './SiteProvider';
import { TreeExplorer } from '../components/explorer/TreeExplorer';
import { cn } from '../lib/utils';

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  cn(
    'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
    isActive
      ? 'bg-indigo-500/10 text-white ring-1 ring-inset ring-indigo-500/30'
      : 'text-slate-400 hover:bg-slate-800/60 hover:text-white'
  );

/**
 * Layout utama: navbar atas + (pada halaman /docs) sidebar dokumentasi
 * yang dapat dibuka-tutup di layar kecil.
 */
export function Layout({ children }: { children: React.ReactNode }) {
  const { tree, fileMap } = useSiteData();
  const location = useLocation();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const isDocsRoute = location.pathname.startsWith('/docs');
  const activeId =
    location.pathname.startsWith('/docs/') && location.pathname !== '/docs/'
      ? decodeURIComponent(location.pathname.slice('/docs/'.length))
      : null;

  const sidebar = (
    <div className="flex h-full flex-col">
      <div className="border-b border-slate-800 px-4 py-3 text-xs uppercase tracking-wider text-slate-500">
        Explorer
      </div>
      <div className="flex-1 overflow-y-auto p-3">
        {tree ? (
          <TreeExplorer nodes={tree} activeId={activeId} variant="sidebar" />
        ) : (
          <p className="px-2 text-sm text-slate-500">Memuat tree…</p>
        )}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-950 text-slate-300">
      <header className="sticky top-0 z-40 border-b border-slate-800/60 bg-slate-950/85 backdrop-blur supports-[backdrop-filter]:bg-slate-950/70">
        <div className="mx-auto flex h-14 max-w-[1500px] items-center gap-3 px-4">
          {isDocsRoute && (
            <button
              onClick={() => setDrawerOpen((v) => !v)}
              className="rounded-md p-2 text-slate-400 hover:bg-slate-800 hover:text-white lg:hidden"
              aria-label="Buka menu"
            >
              {drawerOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          )}

          <Link to="/" className="flex items-center gap-2.5 text-slate-100">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 shadow-lg shadow-indigo-500/30">
              <BookOpen className="h-[18px] w-[18px] text-white" />
            </span>
            <span className="hidden text-sm font-semibold tracking-tight sm:block">
              Learning Web Aryanda
            </span>
          </Link>

          <nav className="ml-6 flex items-center gap-1">
            <NavLink to="/docs" className={navLinkClass}>
              Docs
            </NavLink>
            <NavLink to="/roadmap" className={navLinkClass}>
              <span className="flex items-center gap-1">
                <Map className="h-3.5 w-3.5" />
                Roadmap
              </span>
            </NavLink>
            <NavLink to="/graph" className={navLinkClass}>
              <span className="flex items-center gap-1">
                <Network className="h-3.5 w-3.5" />
                Graph
              </span>
            </NavLink>
            <NavLink to="/search" className={navLinkClass}>
              Search
            </NavLink>
          </nav>

          <div className="ml-auto flex items-center gap-2">
            <Link
              to="/search"
              className="hidden items-center gap-2 rounded-lg border border-slate-800 bg-slate-900/70 px-3 py-1.5 text-sm text-slate-500 transition-colors hover:border-slate-600 hover:bg-slate-900 hover:text-slate-300 sm:flex"
            >
              <Search className="h-4 w-4" />
              Cari materi…
              <kbd className="rounded border border-slate-700 bg-slate-800 px-1.5 py-0.5 font-mono text-[10px] text-slate-500">
                /
              </kbd>
            </Link>
            {fileMap.size > 0 && (
              <span className="hidden rounded-full border border-slate-800 bg-slate-900/60 px-2.5 py-1 text-xs tabular-nums text-slate-500 md:block">
                {fileMap.size} notes
              </span>
            )}
          </div>
        </div>
      </header>

      <div className="mx-auto flex max-w-[1500px]">
        {isDocsRoute && (
          <>
            <aside className="sticky top-14 hidden h-[calc(100vh-3.5rem)] w-72 shrink-0 border-r border-slate-800/80 lg:block">
              {sidebar}
            </aside>
            {drawerOpen && (
              <div className="fixed inset-0 z-50 lg:hidden">
                <div
                  className="absolute inset-0 bg-black/60"
                  onClick={() => setDrawerOpen(false)}
                />
                <aside className="absolute left-0 top-0 h-full w-72 border-r border-slate-800 bg-slate-950 shadow-2xl">
                  <button
                    onClick={() => setDrawerOpen(false)}
                    className="absolute right-2 top-2 z-10 rounded-md p-1.5 text-slate-400 hover:bg-slate-800"
                    aria-label="Tutup menu"
                  >
                    <X className="h-4 w-4" />
                  </button>
                  {sidebar}
                </aside>
              </div>
            )}
          </>
        )}

        <main className={cn('min-w-0 flex-1', isDocsRoute ? 'px-4 py-6 sm:px-8' : '')}>
          {children}
        </main>
      </div>

      <footer className="border-t border-slate-800/60 bg-slate-950/60">
        <div className="mx-auto max-w-[1500px] px-4 py-8">
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <div className="flex items-center gap-2.5 text-sm">
              <span className="flex h-6 w-6 items-center justify-center rounded-md bg-gradient-to-br from-indigo-500 to-violet-600">
                <BookOpen className="h-3.5 w-3.5 text-white" />
              </span>
              <span className="font-medium text-slate-300">Learning Web Aryanda</span>
              <span className="text-slate-700">·</span>
              <span className="text-xs text-slate-600">Dibangun otomatis dari Obsidian Vault</span>
            </div>
            <nav className="flex items-center gap-5 text-xs text-slate-500">
              <Link to="/docs" className="transition-colors hover:text-slate-300">
                Docs
              </Link>
              <Link to="/roadmap" className="transition-colors hover:text-slate-300">
                Roadmap
              </Link>
              <Link to="/graph" className="transition-colors hover:text-slate-300">
                Graph
              </Link>
              <Link to="/search" className="transition-colors hover:text-slate-300">
                Search
              </Link>
            </nav>
          </div>
        </div>
      </footer>
    </div>
  );
}
