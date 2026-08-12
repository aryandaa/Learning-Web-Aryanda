import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  forceCenter,
  forceCollide,
  forceLink,
  forceManyBody,
  forceSimulation,
  type SimulationNodeDatum,
} from 'd3-force';
import type { GraphData, GraphNode } from '../../domain/types';
import { useTheme } from '../../app/ThemeProvider';

interface GNode extends SimulationNodeDatum {
  id: string;
  title: string;
  folder: string;
  degree: number;
  color: string;
  radius: number;
}

interface GLink {
  source: string;
  target: string;
}

const FOLDER_COLORS: Record<string, string> = {
  CyberSecurity: '#fb7185',
  DevOps: '#a78bfa',
  Jaringan: '#38bdf8',
  Pemrograman: '#34d399',
};
const FALLBACK_COLOR = '#94a3b8';
// Warna edge/label mengikuti tema (dark vs light).
const EDGE_COLOR_DARK = 'rgba(148, 163, 184, 0.22)';
const EDGE_DIM_DARK = 'rgba(148, 163, 184, 0.04)';
const EDGE_HOT_DARK = 'rgba(129, 140, 248, 0.7)';
const EDGE_COLOR_LIGHT = 'rgba(71, 85, 105, 0.35)';
const EDGE_DIM_LIGHT = 'rgba(71, 85, 105, 0.08)';
const EDGE_HOT_LIGHT = 'rgba(79, 70, 229, 0.75)';
const LABEL_COLOR_DARK = '#e2e8f0';
const LABEL_OUTLINE_DARK = 'rgba(2, 6, 23, 0.9)';
const LABEL_DIM_DARK = 'rgba(148, 163, 184, 0.85)';
const LABEL_COLOR_LIGHT = '#334155';
const LABEL_OUTLINE_LIGHT = 'rgba(248, 250, 252, 0.92)';
const LABEL_DIM_LIGHT = 'rgba(71, 85, 105, 0.8)';

function folderColor(folder: string): string {
  const top = folder.split('/')[0];
  return FOLDER_COLORS[top] ?? FALLBACK_COLOR;
}

interface ForceGraphProps {
  data: GraphData;
  showIsolated: boolean;
  onNodeClick: (id: string) => void;
  onHoverChange: (node: GraphNode | null) => void;
  /** Nilai berubah = minta view disesuaikan (fit). */
  fitSignal?: number;
}

/**
 * Force-directed graph (gaya Obsidian Graph View) yang dirender di canvas.
 * Physics memakai d3-force; interaksi: hover (sorot tetangga), drag (pan),
 * wheel (zoom), klik node (buka catatan).
 */
export function ForceGraph({ data, showIsolated, onNodeClick, onHoverChange, fitSignal = 0 }: ForceGraphProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });

  // refs agar draw() tetap stabil
  const nodesRef = useRef<GNode[]>([]);
  const linksRef = useRef<GLink[]>([]);
  const hoveredRef = useRef<string | null>(null);
  const transformRef = useRef({ zoom: 1, panX: 0, panY: 0 });
  const sizeRef = useRef(size);
  sizeRef.current = size;

  const [hoveredNode, setHoveredNode] = useState<GraphNode | null>(null);
  const { theme } = useTheme();
  const themeRef = useRef(theme);
  themeRef.current = theme;

  const graphNodes = useMemo(() => {
    const degree = new Map<string, number>();
    for (const link of data.links) {
      degree.set(link.source, (degree.get(link.source) ?? 0) + 1);
      degree.set(link.target, (degree.get(link.target) ?? 0) + 1);
    }
    const nodes: GNode[] = [];
    for (const node of data.nodes) {
      const deg = degree.get(node.id) ?? 0;
      if (!showIsolated && deg === 0) continue;
      nodes.push({
        id: node.id,
        title: node.title,
        folder: node.folder,
        degree: deg,
        color: folderColor(node.folder),
        radius: Math.min(3 + Math.sqrt(deg) * 0.9, 9),
      });
    }
    return nodes;
  }, [data, showIsolated]);

  const graphLinks = useMemo(() => {
    const ids = new Set(graphNodes.map((n) => n.id));
    return data.links.filter((link) => ids.has(link.source) && ids.has(link.target));
  }, [data.links, graphNodes]);

  // ukuran container
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      const rect = entries[0].contentRect;
      setSize({ width: rect.width, height: rect.height });
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // sim + draw
  useEffect(() => {
    if (size.width < 10 || size.height < 10) return;
    nodesRef.current = graphNodes;
    linksRef.current = graphLinks;

    const simulation = forceSimulation<GNode>(graphNodes)
      .force(
        'link',
        forceLink<GNode, GLink>(graphLinks)
          .id((d) => d.id)
          .distance(26)
          .strength(0.65)
      )
      .force('charge', forceManyBody<GNode>().strength(-35))
      .force('center', forceCenter(size.width / 2, size.height / 2))
      .force('collide', forceCollide<GNode>().radius((d) => d.radius + 2).strength(0.9))
      .alphaDecay(0.02)
      .velocityDecay(0.4);

    simulation.on('tick', draw);
    // Posisi awal (phyllotaxis) tidak mewakili layout akhir — ikuti
    // pergerakan node dengan re-fit berkala, lalu finalisasi saat selesai.
    const fitInterval = setInterval(() => {
      if (simulation.alpha() > 0.02) fitView();
    }, 500);
    simulation.on('end', () => {
      clearInterval(fitInterval);
      fitView();
    });

    return () => {
      clearInterval(fitInterval);
      simulation.stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [graphNodes, graphLinks, size.width, size.height]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || sizeRef.current.width < 10) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { width, height } = sizeRef.current;
    const dpr = window.devicePixelRatio || 1;
    if (canvas.width !== Math.round(width * dpr) || canvas.height !== Math.round(height * dpr)) {
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);

    const { zoom, panX, panY } = transformRef.current;
    const nodes = nodesRef.current;
    const links = linksRef.current;
    const hovered = hoveredRef.current;
    const light = themeRef.current === 'light';
    const EDGE_COLOR = light ? EDGE_COLOR_LIGHT : EDGE_COLOR_DARK;
    const EDGE_DIM = light ? EDGE_DIM_LIGHT : EDGE_DIM_DARK;
    const EDGE_HOT = light ? EDGE_HOT_LIGHT : EDGE_HOT_DARK;
    const LABEL_COLOR = light ? LABEL_COLOR_LIGHT : LABEL_COLOR_DARK;
    const LABEL_OUTLINE = light ? LABEL_OUTLINE_LIGHT : LABEL_OUTLINE_DARK;
    const LABEL_DIM = light ? LABEL_DIM_LIGHT : LABEL_DIM_DARK;

    const neighbors = new Set<string>();
    if (hovered) {
      neighbors.add(hovered);
      for (const link of links) {
        if (link.source === hovered) neighbors.add(link.target);
        if (link.target === hovered) neighbors.add(link.source);
      }
    }

    ctx.save();
    ctx.translate(panX, panY);
    ctx.scale(zoom, zoom);

    for (const link of links) {
      const s = link.source as unknown as GNode;
      const t = link.target as unknown as GNode;
      if (!s.x || !t.x) continue;
      const isHot = hovered && (s.id === hovered || t.id === hovered);
      const dimmed = hovered && !isHot;
      ctx.strokeStyle = dimmed ? EDGE_DIM : isHot ? EDGE_HOT : EDGE_COLOR;
      ctx.lineWidth = isHot ? 1.6 / zoom : 1 / zoom;
      ctx.beginPath();
      ctx.moveTo(s.x!, s.y!);
      ctx.lineTo(t.x!, t.y!);
      ctx.stroke();
    }

    for (const node of nodes) {
      if (hovered && !neighbors.has(node.id)) continue;
      const active = hovered === node.id;
      const dimmed = hovered && !active;
      ctx.globalAlpha = dimmed ? 0.4 : active ? 1 : 0.95;
      ctx.beginPath();
      ctx.arc(node.x!, node.y!, node.radius, 0, Math.PI * 2);
      ctx.fillStyle = active ? '#ffffff' : node.color;
      ctx.fill();
      if (active) {
        ctx.globalAlpha = 1;
        ctx.strokeStyle = node.color;
        ctx.lineWidth = 1.5 / zoom;
        ctx.stroke();
      }
    }
    ctx.globalAlpha = 1;
    ctx.restore();

    // label node yang sedang di-hover (screen space)
    if (hovered) {
      const node = nodes.find((n) => n.id === hovered);
      if (node && node.x && node.y) {
        const sx = node.x * zoom + panX;
        const sy = node.y * zoom + panY;
        drawLabel(ctx, sx, sy - node.radius - 8, node.title, 12, LABEL_COLOR, LABEL_OUTLINE);
      }
    }

    // label node ber-degree tinggi saat zoom cukup dalam
    if (zoom > 1.6) {
      const labeled = [...nodes]
        .filter((n) => n.degree >= 3 && n.x)
        .sort((a, b) => b.degree - a.degree)
        .slice(0, 70);
      for (const node of labeled) {
        drawLabel(
          ctx,
          node.x! * zoom + panX,
          node.y! * zoom + panY - node.radius - 4,
          node.title,
          10,
          LABEL_DIM,
          LABEL_OUTLINE
        );
      }
    }
  }, []);

  // ---------- interaksi ----------
  const worldPoint = useCallback((clientX: number, clientY: number) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    const { zoom, panX, panY } = transformRef.current;
    return {
      x: (clientX - rect.left - panX) / zoom,
      y: (clientY - rect.top - panY) / zoom,
    };
  }, []);

  const nodeAt = useCallback((x: number, y: number): GNode | null => {
    let best: GNode | null = null;
    let bestDist = Infinity;
    for (const node of nodesRef.current) {
      const dx = node.x! - x;
      const dy = node.y! - y;
      const d = dx * dx + dy * dy;
      const r = node.radius + 4;
      if (d < r * r && d < bestDist) {
        best = node;
        bestDist = d;
      }
    }
    return best;
  }, []);

  const setHovered = useCallback(
    (node: GNode | null) => {
      const id = node?.id ?? null;
      hoveredRef.current = id;
      const info = node ? { id: node.id, title: node.title, folder: node.folder } : null;
      setHoveredNode(info);
      onHoverChange(info);
      draw();
    },
    [draw, onHoverChange]
  );

  // pointer events
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let dragging = false;
    let moved = 0;
    let lastX = 0;
    let lastY = 0;

    const onPointerDown = (event: PointerEvent) => {
      dragging = true;
      moved = 0;
      lastX = event.clientX;
      lastY = event.clientY;
      canvas.setPointerCapture(event.pointerId);
    };

    const onPointerMove = (event: PointerEvent) => {
      if (dragging) {
        const dx = event.clientX - lastX;
        const dy = event.clientY - lastY;
        moved += Math.abs(dx) + Math.abs(dy);
        lastX = event.clientX;
        lastY = event.clientY;
        transformRef.current.panX += dx;
        transformRef.current.panY += dy;
        draw();
        return;
      }
      const point = worldPoint(event.clientX, event.clientY);
      setHovered(nodeAt(point.x, point.y));
    };

    const onPointerUp = (event: PointerEvent) => {
      if (!dragging) return;
      dragging = false;
      if (moved < 5) {
        const point = worldPoint(event.clientX, event.clientY);
        const node = nodeAt(point.x, point.y);
        if (node) onNodeClick(node.id);
      }
    };

    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      const rect = canvas.getBoundingClientRect();
      const mx = event.clientX - rect.left;
      const my = event.clientY - rect.top;
      const { zoom, panX, panY } = transformRef.current;
      const factor = Math.exp(-event.deltaY * 0.0015);
      const nextZoom = Math.min(4, Math.max(0.25, zoom * factor));
      const k = nextZoom / zoom;
      transformRef.current = {
        zoom: nextZoom,
        panX: mx - (mx - panX) * k,
        panY: my - (my - panY) * k,
      };
      draw();
    };

    canvas.addEventListener('pointerdown', onPointerDown);
    canvas.addEventListener('pointermove', onPointerMove);
    canvas.addEventListener('pointerup', onPointerUp);
    canvas.addEventListener('wheel', onWheel, { passive: false });
    return () => {
      canvas.removeEventListener('pointerdown', onPointerDown);
      canvas.removeEventListener('pointermove', onPointerMove);
      canvas.removeEventListener('pointerup', onPointerUp);
      canvas.removeEventListener('wheel', onWheel);
    };
  }, [draw, nodeAt, onNodeClick, setHovered, worldPoint]);

  const fitView = useCallback(() => {
    const nodes = nodesRef.current;
    if (nodes.length === 0 || sizeRef.current.width < 10) return;
    let minX = Infinity,
      minY = Infinity,
      maxX = -Infinity,
      maxY = -Infinity;
    for (const node of nodes) {
      minX = Math.min(minX, node.x!);
      maxX = Math.max(maxX, node.x!);
      minY = Math.min(minY, node.y!);
      maxY = Math.max(maxY, node.y!);
    }
    const bw = Math.max(maxX - minX, 100);
    const bh = Math.max(maxY - minY, 100);
    const { width, height } = sizeRef.current;
    const zoom = Math.min((width - 80) / bw, (height - 80) / bh, 1.6);
    transformRef.current = {
      zoom,
      panX: width / 2 - ((minX + maxX) / 2) * zoom,
      panY: height / 2 - ((minY + maxY) / 2) * zoom,
    };
    draw();
  }, [draw]);

  useEffect(() => {
    fitView();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [graphNodes.length]);

  // permintaan fit dari luar (tombol "Fit")
  useEffect(() => {
    if (fitSignal > 0) fitView();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fitSignal]);

  return (
    <div ref={containerRef} className="relative h-full w-full overflow-hidden">
      <canvas
        ref={canvasRef}
        className="h-full w-full cursor-grab touch-none active:cursor-grabbing"
      />
    </div>
  );
}

function drawLabel(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  text: string,
  fontSize: number,
  color: string,
  outlineColor: string
): void {
  ctx.font = `${fontSize}px ui-sans-serif, system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  ctx.lineWidth = 3;
  ctx.strokeStyle = outlineColor;
  ctx.strokeText(text, x, y);
  ctx.fillStyle = color;
  ctx.fillText(text, x, y);
}

export type { GraphNode };
