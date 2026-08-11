import { useEffect, useMemo, useState } from 'react';
import { ChevronDown, ChevronRight, Folder, Map as MapIcon } from 'lucide-react';
import type { RoadmapInfo } from '../../domain/types';
import { cn } from '../../lib/utils';

interface RNode {
  type: 'folder' | 'file';
  name: string;
  path: string;
  id?: string;
  children?: RNode[];
}

/** Membangun pohon folder dari daftar roadmap (parent directory sebagai node). */
function buildTree(roadmaps: RoadmapInfo[]): RNode[] {
  const roots: RNode[] = [];
  const folders = new Map<string, RNode>();

  const ensureFolder = (rel: string): RNode => {
    const existing = folders.get(rel);
    if (existing) return existing;
    const parts = rel.split('/');
    const node: RNode = { type: 'folder', name: parts[parts.length - 1], path: rel, children: [] };
    if (parts.length === 1) {
      roots.push(node);
    } else {
      ensureFolder(parts.slice(0, -1).join('/')).children!.push(node);
    }
    folders.set(rel, node);
    return node;
  };

  for (const roadmap of roadmaps) {
    const leaf: RNode = { type: 'file', name: roadmap.title, path: roadmap.folder, id: roadmap.id };
    if (!roadmap.folder) {
      roots.push(leaf);
    } else {
      ensureFolder(roadmap.folder).children!.push(leaf);
    }
  }

  const sort = (nodes: RNode[]): void => {
    nodes.sort((a, b) => {
      if (a.type !== b.type) return a.type === 'folder' ? -1 : 1;
      return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
    });
    for (const node of nodes) if (node.children) sort(node.children);
  };
  sort(roots);
  return roots;
}

interface RoadmapTreeProps {
  roadmaps: RoadmapInfo[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

/**
 * Daftar roadmap sebagai pohon folder (bukan daftar rata):
 * folder parent tampil sebagai node, roadmap di dalamnya sebagai daun.
 */
export function RoadmapTree({ roadmaps, selectedId, onSelect }: RoadmapTreeProps) {
  const tree = useMemo(() => buildTree(roadmaps), [roadmaps]);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  // auto-expand folder nenek moyang roadmap yang dipilih
  useEffect(() => {
    const selected = roadmaps.find((r) => r.id === selectedId);
    if (!selected || !selected.folder) return;
    const ancestors: string[] = [];
    let acc = '';
    for (const part of selected.folder.split('/')) {
      acc = acc ? `${acc}/${part}` : part;
      ancestors.push(acc);
    }
    setExpanded((prev) => new Set([...prev, ...ancestors]));
  }, [selectedId, roadmaps]);

  const toggle = (path: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  };

  return (
    <nav aria-label="Daftar roadmap">
      {tree.map((node) => (
        <Row
          key={node.type === 'file' ? node.id : node.path}
          node={node}
          depth={0}
          expanded={expanded}
          onToggle={toggle}
          selectedId={selectedId}
          onSelect={onSelect}
        />
      ))}
    </nav>
  );
}

interface RowProps {
  node: RNode;
  depth: number;
  expanded: Set<string>;
  onToggle: (path: string) => void;
  selectedId: string | null;
  onSelect: (id: string) => void;
}

function Row({ node, depth, expanded, onToggle, selectedId, onSelect }: RowProps) {
  const padding = 8 + depth * 14;

  if (node.type === 'file') {
    const active = selectedId === node.id;
    return (
      <button
        onClick={() => node.id && onSelect(node.id)}
        className={cn(
          'flex w-full items-center gap-1.5 rounded-md py-1.5 pr-2 text-left text-sm transition-colors',
          active
            ? 'bg-indigo-500/15 font-medium text-indigo-300'
            : 'text-slate-400 hover:bg-slate-800/70 hover:text-slate-200'
        )}
        style={{ paddingLeft: padding }}
      >
        <MapIcon className="h-3.5 w-3.5 shrink-0 text-amber-400" />
        <span className="truncate">{node.name}</span>
      </button>
    );
  }

  const isOpen = expanded.has(node.path);
  return (
    <div>
      <button
        onClick={() => onToggle(node.path)}
        className="flex w-full items-center gap-1.5 rounded-md py-1.5 pr-2 text-left text-sm font-medium text-slate-300 transition-colors hover:bg-slate-800/70 hover:text-white"
        style={{ paddingLeft: padding }}
        aria-expanded={isOpen}
      >
        {isOpen ? (
          <ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-70" />
        ) : (
          <ChevronRight className="h-3.5 w-3.5 shrink-0 opacity-70" />
        )}
        <Folder className="h-3.5 w-3.5 shrink-0 text-amber-400/70" />
        <span className="truncate">{node.name}</span>
      </button>
      {isOpen &&
        node.children?.map((child) => (
          <Row
            key={child.type === 'file' ? child.id : child.path}
            node={child}
            depth={depth + 1}
            expanded={expanded}
            onToggle={onToggle}
            selectedId={selectedId}
            onSelect={onSelect}
          />
        ))}
    </div>
  );
}
