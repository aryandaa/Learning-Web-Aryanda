import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import {
  BookOpen,
  ChevronsRight,
  Map,
  Menu,
  Moon,
  Network,
  PanelLeftClose,
  Search,
  Sun,
  X,
} from 'lucide-react';
import { useSiteData } from './SiteProvider';
import { useTheme } from './ThemeProvider';
import { TreeExplorer } from '../components/explorer/TreeExplorer';
import { cn } from '../lib/utils';

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  cn(
    'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
    isActive ? 'nav-active' : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-100'
  );

const SIDEBAR_STORAGE_KEY = 'lw-sidebar-collapsed';

function readSidebarState(): boolean {
  try {
    return window.localStorage.getItem(SIDEBAR_STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

/**
 * Layout utama: navbar atas (responsive) + drawer navigasi (mobile/tablet)
 * + sidebar dokumentasi (desktop, bisa di-collapse) + footer.
 *
 * - Mobile (< lg): hamburger membuka drawer berisi nav + explorer.
 * - Desktop (>= lg): sidebar explorer sticky; bisa di-collapse agar materi
 *   mendapat ruang lebih besar. State collapse disimpan di localStorage.
 * - Tema dark/light: toggle di navbar (kanan search bar), disimpan di
 *   localStorage oleh ThemeProvider.
 */
export function Layout({ children }: { children: React.ReactNode }) {
  const { tree } = useSiteData();
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(readSidebarState);

  const isDocsRoute = location.pathname.startsWith('/docs');
  const activeId =
    location.pathname.startsWith('/docs/') && location.pathname !== '/docs/'
      ? decodeURIComponent(location.pathname.slice('/docs/'.length))
      : null;

  // Tutup drawer saat rute berubah (klik item navigasi).
  useEffect(() => {
    setDrawerOpen(false);
  }, [location.pathname]);

  // ESC menutup drawer.
  useEffect(() => {
    if (!drawerOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setDrawerOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [drawerOpen]);

  // Kunci scroll halaman saat drawer terbuka.
  useEffect(() => {
    if (!drawerOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [drawerOpen]);

  // Persist state collapse sidebar desktop.
  useEffect(() => {
    try {
      window.localStorage.setItem(SIDEBAR_STORAGE_KEY, sidebarCollapsed ? '1' : '0');
    } catch {
      /* abaikan */
    }
  }, [sidebarCollapsed]);

  const closeDrawer = () => setDrawerOpen(false);

  const explorer = (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
        <span className="text-xs uppercase tracking-wider text-slate-500">Explorer</span>
        <button
          onClick={() => setSidebarCollapsed(true)}
          className="hidden rounded-md p-1.5 text-slate-500 transition-colors hover:bg-slate-800 hover:text-slate-100 lg:block"
          aria-label="Ciutkan sidebar"
          title="Ciutkan sidebar"
        >
          <PanelLeftClose className="h-4 w-4" />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-3">
        {tree ? (
          <TreeExplorer nodes={tree} activeId={activeId} variant="sidebar" onNavigate={closeDrawer} />
        ) : (
          <p className="px-2 text-sm text-slate-500">Memuat tree…</p>
        )}
      </div>
    </div>
  );

  const drawerNav = (
    <nav className="flex flex-col gap-1 p-3" aria-label="Navigasi utama">
      <p className="px-2 pb-1 text-xs uppercase tracking-wider text-slate-500">Menu</p>
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
      <div className="mt-2 border-t border-slate-800" />
    </nav>
  );

  return (
    <div className="min-h-screen bg-slate-950 text-slate-300">
      {/* ============ NAVBAR ============ */}
      <header className="sticky top-0 z-40 border-b border-slate-800/60 bg-slate-950/85 backdrop-blur supports-[backdrop-filter]:bg-slate-950/70">
        <div className="mx-auto flex h-14 max-w-[1500px] items-center gap-2 px-3 sm:gap-3 sm:px-4">
          {/* Hamburger — mobile/tablet (< lg) */}
          <button
            onClick={() => setDrawerOpen(true)}
            className="rounded-md p-2 text-slate-400 transition-colors hover:bg-slate-800 hover:text-slate-100 lg:hidden"
            aria-label="Buka menu"
          >
            <Menu className="h-5 w-5" />
          </button>

          <Link to="/" className="flex min-w-0 items-center gap-2.5 text-slate-100">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 shadow-lg shadow-indigo-500/30">
              <BookOpen className="h-[18px] w-[18px] text-white" />
            </span>
            <span className="hidden truncate text-sm font-semibold tracking-tight sm:block">
              Learning Web Aryanda
            </span>
          </Link>

          {/* Nav utama — tablet/desktop */}
          <nav className="ml-6 hidden items-center gap-1 md:flex">
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
          </nav>

          <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
            {/* Search bar — sm+ */}
            <Link
              to="/search"
              className="hidden items-center gap-2 rounded-lg border border-slate-800 bg-slate-900/70 px-3 py-1.5 text-sm text-slate-500 transition-colors hover:border-slate-600 hover:bg-slate-900 hover:text-slate-300 sm:flex"
            >
              <Search className="h-4 w-4" />
              <span className="hidden md:inline">Cari materi…</span>
              <span className="md:hidden">Cari</span>
              <kbd className="hidden rounded border border-slate-700 bg-slate-800 px-1.5 py-0.5 font-mono text-[10px] text-slate-500 md:inline">
                /
              </kbd>
            </Link>
            {/* Search icon — mobile (< sm) */}
            <Link
              to="/search"
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-800 bg-slate-900/70 text-slate-400 transition-colors hover:border-slate-600 hover:text-slate-200 sm:hidden"
              aria-label="Cari materi"
            >
              <Search className="h-4 w-4" />
            </Link>

            {/* Theme toggle — selalu tampil di kanan search bar */}
            <button
              onClick={toggleTheme}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-800 bg-slate-900/70 text-slate-400 transition-colors hover:border-slate-600 hover:text-slate-200"
              aria-label={theme === 'dark' ? 'Ganti ke tema terang' : 'Ganti ke tema gelap'}
              title={theme === 'dark' ? 'Tema terang' : 'Tema gelap'}
            >
              {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto flex max-w-[1500px]">
        {/* ============ DRAWER (mobile/tablet) ============ */}
        {drawerOpen && (
          <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true">
            <div
              className="drawer-overlay absolute inset-0 bg-black/60"
              onClick={closeDrawer}
              aria-hidden
            />
            <aside className="drawer-panel absolute left-0 top-0 flex h-full w-80 max-w-[85vw] flex-col border-r border-slate-800 bg-slate-950 shadow-2xl">
              <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
                <span className="text-sm font-semibold text-slate-200">Navigasi</span>
                <button
                  onClick={closeDrawer}
                  className="rounded-md p-1.5 text-slate-400 transition-colors hover:bg-slate-800 hover:text-slate-100"
                  aria-label="Tutup menu"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              {drawerNav}
              <div className="min-h-0 flex-1">{explorer}</div>
            </aside>
          </div>
        )}

        {/* ============ SIDEBAR DESKTOP (collapsible) ============ */}
        {isDocsRoute && (
          <aside
            className={cn(
              'sticky top-14 hidden h-[calc(100vh-3.5rem)] shrink-0 border-r border-slate-800/80 transition-[width] duration-200 lg:block',
              sidebarCollapsed ? 'w-14' : 'w-72'
            )}
          >
            {sidebarCollapsed ? (
              <div className="flex h-full flex-col items-center pt-3">
                <button
                  onClick={() => setSidebarCollapsed(false)}
                  className="rounded-md p-2 text-slate-500 transition-colors hover:bg-slate-800 hover:text-slate-100"
                  aria-label="Buka sidebar"
                  title="Buka sidebar"
                >
                  <ChevronsRight className="h-5 w-5" />
                </button>
                <span className="mt-2 text-[10px] font-semibold uppercase tracking-wider text-slate-600 [writing-mode:vertical-rl]">
                  Docs
                </span>
              </div>
            ) : (
              explorer
            )}
          </aside>
        )}

        <main className={cn('min-w-0 flex-1', isDocsRoute ? 'px-4 py-6 sm:px-8' : '')}>
          {children}
        </main>
      </div>

      {/* ============ FOOTER ============ */}
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
            </nav>
          </div>
        </div>
      </footer>
    </div>
  );
}
