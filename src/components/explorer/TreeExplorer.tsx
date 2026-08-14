import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown, ChevronRight, FileText, Folder, Map } from 'lucide-react';
import type { TreeNode } from '../../domain/types';
import { countFiles } from '../../services/docs';
import { cn } from '../../lib/utils';

interface TreeExplorerProps {
  nodes: TreeNode[];
  activeId?: string | null;
  /** Sidebar: kompak, bisa collapse. Page: mode eksplorasi penuh. */
  variant?: 'sidebar' | 'page';
  className?: string;
  /** Dipanggil saat file diklik (mis. menutup drawer mobile). */
  onNavigate?: () => void;
}

function ancestorsOf(nodes: TreeNode[], id: string, trail: string[] = []): string[] {
  for (const node of nodes) {
    if (node.type === 'file') {
      if (node.id === id) return trail;
    } else {
      const found = ancestorsOf(node.children, id, [...trail, node.relativePath]);
      if (found.length > 0) return found;
    }
  }
  return [];
}

/**
 * Sidebar dokumentasi recursive, dibangun dari tree.json (spec §34).
 * Tidak ada folder yang di-hardcode. semuanya berasal dari Obsidian.
 */
export function TreeExplorer({ nodes, activeId, variant = 'sidebar', className, onNavigate }: TreeExplorerProps) {
  const autoExpand = useMemo(
    () => (activeId ? new Set(ancestorsOf(nodes, activeId)) : new Set<string>()),
    [nodes, activeId]
  );
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  useEffect(() => {
    setExpanded((prev) => new Set([...prev, ...autoExpand]));
  }, [autoExpand]);

  const toggle = (relativePath: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(relativePath)) next.delete(relativePath);
      else next.add(relativePath);
      return next;
    });
  };

  return (
    <nav className={cn('select-none', className)} aria-label="Navigasi dokumen">
      {nodes.length === 0 && (
        <p className="px-2 text-sm text-slate-500">Tidak ada dokumen.</p>
      )}
      <ul className="space-y-px">
        {nodes.map((node) => (
          <TreeNodeRow
            key={node.type === 'file' ? node.id : node.relativePath}
            node={node}
            depth={0}
            activeId={activeId}
            expanded={expanded}
            onToggle={toggle}
            variant={variant}
            onNavigate={onNavigate}
          />
        ))}
      </ul>
    </nav>
  );
}

interface RowProps {
  node: TreeNode;
  depth: number;
  activeId?: string | null;
  expanded: Set<string>;
  onToggle: (path: string) => void;
  variant: 'sidebar' | 'page';
  onNavigate?: () => void;
}

function TreeNodeRow({ node, depth, activeId, expanded, onToggle, variant, onNavigate }: RowProps) {
  if (node.type === 'file') {
    const active = activeId === node.id;
    const padding = variant === 'sidebar' ? 8 + depth * 14 : 8 + depth * 18;
    return (
      <li>
        <Link
          to={`/docs/${node.id}`}
          onClick={onNavigate}
          className={cn(
            'flex items-center gap-2 rounded-md py-1.5 pr-2 text-sm transition-colors',
            active
              ? 'bg-indigo-500/15 text-indigo-300 font-medium'
              : node.isRoadmap
                ? 'font-medium text-slate-200 hover:bg-slate-800/70 hover:text-slate-100'
                : 'text-slate-400 hover:bg-slate-800/70 hover:text-slate-200'
          )}
          style={{ paddingLeft: padding }}
        >
          {node.isRoadmap ? (
            <Map className="h-3.5 w-3.5 shrink-0 text-indigo-400" />
          ) : (
            <FileText className="h-3.5 w-3.5 shrink-0 opacity-60" />
          )}
          <span className="truncate">{node.title}</span>
          {node.isRoadmap && (
            <span className="ml-auto shrink-0 rounded bg-indigo-500/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-indigo-300">
              roadmap
            </span>
          )}
        </Link>
      </li>
    );
  }

  const isOpen = expanded.has(node.relativePath);
  const count = countFiles([node]);
  const padding = variant === 'sidebar' ? 8 + depth * 14 : 8 + depth * 18;

  return (
    <li>
      <button
        onClick={() => onToggle(node.relativePath)}
        className="flex w-full items-center gap-2 rounded-md py-1.5 pr-2 text-left text-sm text-slate-300 transition-colors hover:bg-slate-800/70 hover:text-slate-100"
        style={{ paddingLeft: padding }}
        aria-expanded={isOpen}
      >
        {isOpen ? (
          <ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-70" />
        ) : (
          <ChevronRight className="h-3.5 w-3.5 shrink-0 opacity-70" />
        )}
        <Folder className="h-3.5 w-3.5 shrink-0 text-amber-400/70" />
        <span className="truncate font-medium">{node.name}</span>
        <span className="ml-auto pr-1 text-xs tabular-nums text-slate-600">{count}</span>
      </button>
      {isOpen && (
        <ul className="space-y-px">
          {node.children.map((child) => (
            <TreeNodeRow
              key={child.type === 'file' ? child.id : child.relativePath}
              node={child}
              depth={depth + 1}
              activeId={activeId}
              expanded={expanded}
              onToggle={onToggle}
              variant={variant}
              onNavigate={onNavigate}
            />
          ))}
        </ul>
      )}
    </li>
  );
}
