/**
 * CodeGraphPanel — Obsidian-style dependency graph viewer
 *
 * Force-directed simulation rendered on <canvas> with dark background,
 * glowing nodes, visible edges, hover labels — no external deps.
 * Data: GET /api/graph/build?projectPath=...
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Search, RefreshCw, AlertCircle, GitBranch, Loader2, ChevronDown, ChevronRight } from 'lucide-react';
import { API_BASE } from '../../services/api';

// ─── Types ────────────────────────────────────────────────────────────────────

interface FunctionNode { name: string; line: number; calls: string[]; }
interface FileNode {
  id: string; imports: string[]; importedBy: string[];
  isOrphan: boolean; thirdParty: string[]; functions: FunctionNode[];
}
interface ProjectGraph {
  projectPath: string; builtAt: number; files: Record<string, FileNode>;
  totalFiles: number; orphanFiles: string[]; circularDeps: string[][];
}
interface SimNode {
  id: string; x: number; y: number; vx: number; vy: number;
  pinned: boolean; isOrphan: boolean; inCircular: boolean; importedByCount: number;
}
interface SimEdge { source: string; target: string; }
interface ImpactData {
  targetFile: string; directDependents: string[]; transitiveDependents: string[];
  directDependencies: string[]; totalImpact: number; orphanRisk: boolean;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const REPULSION     = 6000;
const ATTRACTION    = 0.028;
const DAMPING       = 0.84;
const CENTER_PULL   = 0.003;
const IDEAL_EDGE_LEN = 110;

// Obsidian-style palette
const BG       = '#0d0f14';
const C_NODE   = '#5b6af0';   // default indigo
const C_HUB    = '#a78bfa';   // violet — high connectivity
const C_ORPHAN = '#f87171';   // red
const C_CIRC   = '#fb923c';   // orange
const C_SELECT = '#ffffff';   // white
const C_CONN   = '#38bdf8';   // sky — directly connected
const C_EDGE   = 'rgba(100,110,220,0.22)';
const C_EDGE_H = 'rgba(99,179,255,0.75)';

function nodeColor(n: SimNode, selected: string | null, highlightedIds: Set<string>): string {
  if (n.id === selected) return C_SELECT;
  if (n.inCircular) return C_CIRC;
  if (n.isOrphan) return C_ORPHAN;
  if (highlightedIds.has(n.id)) return C_CONN;
  if (n.importedByCount >= 5) return C_HUB;
  return C_NODE;
}

function nodeRadius(n: SimNode): number {
  return 5 + Math.min(11, Math.log(n.importedByCount + 1) * 4);
}

function fileLabel(id: string): string {
  return id.split('/').pop() ?? id;
}

// ─── Component ────────────────────────────────────────────────────────────────

interface Props { isOpen: boolean; onClose: () => void; projectPath: string | null; }

export default function CodeGraphPanel({ isOpen, onClose, projectPath }: Props) {
  const canvasRef      = useRef<HTMLCanvasElement>(null);
  const containerRef   = useRef<HTMLDivElement>(null);
  const animFrameRef   = useRef<number>(0);

  const [graph,          setGraph]          = useState<ProjectGraph | null>(null);
  const [loading,        setLoading]        = useState(false);
  const [error,          setError]          = useState<string | null>(null);

  const nodesRef    = useRef<SimNode[]>([]);
  const edgesRef    = useRef<SimEdge[]>([]);
  const nodeMapRef  = useRef<Map<string, SimNode>>(new Map());
  const selectedRef = useRef<string | null>(null);
  const dragRef     = useRef<{ id: string; ox: number; oy: number } | null>(null);
  const isDraggingRef = useRef(false);
  const transformRef  = useRef({ x: 0, y: 0, scale: 1 });
  const panRef        = useRef<{ startX: number; startY: number; tx: number; ty: number } | null>(null);
  const hoverRef      = useRef<string | null>(null);
  const pulseRef      = useRef(0);

  const [selectedFile,  setSelectedFile]  = useState<string | null>(null);
  const [impactData,    setImpactData]    = useState<ImpactData | null>(null);
  const [impactLoading, setImpactLoading] = useState(false);
  const [search,        setSearch]        = useState('');
  const [showFunctions, setShowFunctions] = useState(false);
  const [showTransitive,setShowTransitive]= useState(false);

  // ── Load graph ──────────────────────────────────────────────────────────────

  const loadGraph = useCallback(async (force = false) => {
    if (!projectPath) return;
    setLoading(true); setError(null);
    try {
      const method = force ? 'POST' : 'GET';
      const url = force
        ? `${API_BASE}/api/graph/build`
        : `${API_BASE}/api/graph/build?projectPath=${encodeURIComponent(projectPath)}`;
      const res = await fetch(url, {
        method,
        ...(force ? { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ projectPath }) } : {}),
      });
      if (!res.ok) throw new Error(await res.text());
      setGraph(await res.json());
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [projectPath]);

  useEffect(() => { if (isOpen && projectPath) loadGraph(); }, [isOpen, projectPath]); // eslint-disable-line

  // ── Build simulation ────────────────────────────────────────────────────────

  useEffect(() => {
    if (!graph || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const W = canvas.offsetWidth || 800;
    const H = canvas.offsetHeight || 600;
    canvas.width = W; canvas.height = H;
    const cx = W / 2, cy = H / 2;
    const circularParticipants = new Set(graph.circularDeps.flat());
    const fileList = Object.values(graph.files);

    const nodes: SimNode[] = fileList.map((f, i) => {
      const angle = (i / fileList.length) * Math.PI * 2;
      const ring  = Math.floor(i / 16);
      const r     = 100 + ring * 70;
      return { id: f.id, x: cx + Math.cos(angle) * r, y: cy + Math.sin(angle) * r,
               vx: 0, vy: 0, pinned: false, isOrphan: f.isOrphan,
               inCircular: circularParticipants.has(f.id), importedByCount: f.importedBy.length };
    });

    const edges: SimEdge[] = [];
    for (const f of fileList) {
      for (const imp of f.imports) {
        if (graph.files[imp]) edges.push({ source: f.id, target: imp });
      }
    }

    const nodeMap = new Map<string, SimNode>();
    for (const n of nodes) nodeMap.set(n.id, n);
    nodesRef.current = nodes; edgesRef.current = edges; nodeMapRef.current = nodeMap;
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [graph]);

  // ── Animation / render loop ─────────────────────────────────────────────────

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !graph) return;
    const ctx = canvas.getContext('2d')!;
    let running = true;

    const tick = () => {
      if (!running) return;
      pulseRef.current = (pulseRef.current + 0.05) % (Math.PI * 2);

      if (containerRef.current) {
        const cw = containerRef.current.clientWidth;
        const ch = containerRef.current.clientHeight;
        if (canvas.width !== cw || canvas.height !== ch) {
          canvas.width = cw; canvas.height = ch;
        }
      }

      const nodes   = nodesRef.current;
      const edges   = edgesRef.current;
      const nodeMap = nodeMapRef.current;
      const W = canvas.width, H = canvas.height;
      const cx = W / 2, cy = H / 2;

      // ── Physics ─────────────────────────────────────────────────────────────

      for (let i = 0; i < nodes.length; i++) {
        const a = nodes[i];
        if (a.pinned) continue;
        for (let j = i + 1; j < nodes.length; j++) {
          const b = nodes[j];
          const dx = a.x - b.x, dy = a.y - b.y;
          const dist2 = dx * dx + dy * dy + 1;
          const force = REPULSION / dist2;
          const fx = dx * force, fy = dy * force;
          a.vx += fx; a.vy += fy;
          if (!b.pinned) { b.vx -= fx; b.vy -= fy; }
        }
        a.vx += (cx - a.x) * CENTER_PULL;
        a.vy += (cy - a.y) * CENTER_PULL;
        a.vx *= DAMPING; a.vy *= DAMPING;
        a.x += a.vx; a.y += a.vy;
      }

      for (const e of edges) {
        const s = nodeMap.get(e.source), t = nodeMap.get(e.target);
        if (!s || !t) continue;
        const dx = t.x - s.x, dy = t.y - s.y;
        const dist = Math.sqrt(dx * dx + dy * dy) + 0.01;
        const force = (dist - IDEAL_EDGE_LEN) * ATTRACTION;
        const fx = (dx / dist) * force, fy = (dy / dist) * force;
        if (!s.pinned) { s.vx += fx; s.vy += fy; }
        if (!t.pinned) { t.vx -= fx; t.vy -= fy; }
      }

      // ── Draw ────────────────────────────────────────────────────────────────

      const { x: tx, y: ty, scale } = transformRef.current;
      const selected  = selectedRef.current;
      const hovered   = hoverRef.current;

      // Dark background
      ctx.fillStyle = BG;
      ctx.fillRect(0, 0, W, H);

      // Faint radial vignette
      const vgrad = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, Math.max(W, H) * 0.6);
      vgrad.addColorStop(0, 'rgba(0,0,0,0)');
      vgrad.addColorStop(1, 'rgba(0,0,0,0.45)');
      ctx.fillStyle = vgrad;
      ctx.fillRect(0, 0, W, H);

      ctx.save();
      ctx.translate(tx, ty);
      ctx.scale(scale, scale);

      // Build highlight sets
      const highlightedIds   = new Set<string>();
      const highlightedEdges = new Set<string>();
      const focusId = selected ?? hovered;

      if (focusId) {
        const fd = graph.files[focusId];
        if (fd) {
          highlightedIds.add(focusId);
          for (const imp of fd.imports)    { highlightedIds.add(imp);   highlightedEdges.add(`${focusId}||${imp}`); }
          for (const imp of fd.importedBy) { highlightedIds.add(imp);   highlightedEdges.add(`${imp}||${focusId}`); }
        }
      }

      const hasFocus = focusId !== null;

      // ── Edges ───────────────────────────────────────────────────────────────
      for (const e of edges) {
        const s = nodeMap.get(e.source), t = nodeMap.get(e.target);
        if (!s || !t) continue;
        const key = `${e.source}||${e.target}`;
        const isHl = highlightedEdges.has(key);
        const dimmed = hasFocus && !isHl;

        ctx.beginPath();
        ctx.moveTo(s.x, s.y);
        ctx.lineTo(t.x, t.y);

        if (isHl) {
          ctx.shadowBlur = 6 / scale;
          ctx.shadowColor = C_EDGE_H;
          ctx.strokeStyle = C_EDGE_H;
          ctx.lineWidth = 1.4 / scale;
        } else {
          ctx.shadowBlur = 0;
          ctx.strokeStyle = dimmed ? 'rgba(80,90,160,0.06)' : C_EDGE;
          ctx.lineWidth = 0.8 / scale;
        }
        ctx.stroke();
        ctx.shadowBlur = 0;
      }

      // ── Nodes ───────────────────────────────────────────────────────────────
      for (const n of nodes) {
        const isSelected  = n.id === selected;
        const isHovered   = n.id === hovered;
        const isHighlight = highlightedIds.has(n.id);
        const dimmed      = hasFocus && !isSelected && !isHighlight;

        const col = nodeColor(n, selected, highlightedIds);
        const r   = nodeRadius(n) * (isSelected ? 1.5 : isHovered ? 1.25 : 1);

        ctx.globalAlpha = dimmed ? 0.12 : 1.0;

        // Outer glow ring for selected / hover
        if (isSelected) {
          const pulse = 1 + Math.sin(pulseRef.current) * 0.3;
          ctx.beginPath();
          ctx.arc(n.x, n.y, r * 2.2 * pulse, 0, Math.PI * 2);
          const rg = ctx.createRadialGradient(n.x, n.y, r * 0.5, n.x, n.y, r * 2.2 * pulse);
          rg.addColorStop(0, 'rgba(255,255,255,0.18)');
          rg.addColorStop(1, 'rgba(255,255,255,0)');
          ctx.fillStyle = rg;
          ctx.fill();
        }

        // Glow
        ctx.shadowBlur  = isSelected ? 24 / scale : isHovered ? 14 / scale : isHighlight ? 10 / scale : 5 / scale;
        ctx.shadowColor = col;

        // Node fill
        ctx.beginPath();
        ctx.arc(n.x, n.y, r, 0, Math.PI * 2);

        if (isSelected) {
          const grad = ctx.createRadialGradient(n.x - r * 0.3, n.y - r * 0.3, 0, n.x, n.y, r);
          grad.addColorStop(0, '#fff');
          grad.addColorStop(1, 'rgba(200,210,255,0.9)');
          ctx.fillStyle = grad;
        } else {
          // Inner glow gradient
          const grad = ctx.createRadialGradient(n.x - r * 0.35, n.y - r * 0.35, 0, n.x, n.y, r);
          grad.addColorStop(0, lighten(col, 0.45));
          grad.addColorStop(1, col);
          ctx.fillStyle = grad;
        }
        ctx.fill();
        ctx.shadowBlur = 0;

        // Thin border ring
        if (!dimmed) {
          ctx.beginPath();
          ctx.arc(n.x, n.y, r, 0, Math.PI * 2);
          ctx.strokeStyle = isSelected ? 'rgba(255,255,255,0.9)' : `${col}88`;
          ctx.lineWidth = (isSelected ? 1.5 : 0.8) / scale;
          ctx.stroke();
        }

        ctx.globalAlpha = 1.0;

        // ── Labels ──────────────────────────────────────────────────────────
        const showLabel = isSelected || isHovered || isHighlight || n.importedByCount >= 4 || scale > 2;
        if (showLabel && !dimmed) {
          const label = fileLabel(n.id);
          const baseFontSize = 10;
          const fontSize = Math.max(7, baseFontSize / scale);
          ctx.font = `${isSelected ? 600 : 500} ${fontSize}px ui-sans-serif, system-ui, sans-serif`;

          const textX = n.x + r + 4 / scale;
          const textY = n.y + fontSize * 0.38;

          // Label backdrop
          const metrics = ctx.measureText(label);
          const padH = 2.5 / scale, padV = 1.5 / scale;
          ctx.fillStyle = 'rgba(13,15,20,0.72)';
          ctx.beginPath();
          ctx.roundRect(
            textX - padH, textY - fontSize * 0.85,
            metrics.width + padH * 2, fontSize + padV * 2,
            2 / scale
          );
          ctx.fill();

          // Label text
          ctx.fillStyle = isSelected ? '#ffffff'
            : isHovered   ? '#e0e7ff'
            : isHighlight ? '#7dd3fc'
            : '#c4c9e8';
          ctx.fillText(label, textX, textY);
        }
      }

      ctx.restore();
      animFrameRef.current = requestAnimationFrame(tick);
    };

    animFrameRef.current = requestAnimationFrame(tick);
    return () => { running = false; cancelAnimationFrame(animFrameRef.current); };
  }, [graph]);

  // ── Helpers ─────────────────────────────────────────────────────────────────

  const canvasToWorld = useCallback((cx: number, cy: number) => {
    const { x: tx, y: ty, scale } = transformRef.current;
    return { x: (cx - tx) / scale, y: (cy - ty) / scale };
  }, []);

  const hitTest = useCallback((wx: number, wy: number): SimNode | null => {
    const nodes = nodesRef.current;
    for (let i = nodes.length - 1; i >= 0; i--) {
      const n = nodes[i];
      const dx = n.x - wx, dy = n.y - wy;
      const r = nodeRadius(n) + 6;
      if (dx * dx + dy * dy <= r * r) return n;
    }
    return null;
  }, []);

  // ── Pointer events ───────────────────────────────────────────────────────────

  const handlePointerDown = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    isDraggingRef.current = false;
    const rect = canvasRef.current!.getBoundingClientRect();
    const { x: wx, y: wy } = canvasToWorld(e.clientX - rect.left, e.clientY - rect.top);
    const hit = hitTest(wx, wy);
    if (hit) {
      dragRef.current = { id: hit.id, ox: wx - hit.x, oy: wy - hit.y };
      canvasRef.current!.setPointerCapture(e.pointerId);
    } else {
      panRef.current = { startX: e.clientX, startY: e.clientY, tx: transformRef.current.x, ty: transformRef.current.y };
    }
  }, [canvasToWorld, hitTest]);

  const handlePointerMove = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    if (dragRef.current) {
      isDraggingRef.current = true;
      const rect = canvasRef.current!.getBoundingClientRect();
      const { x: wx, y: wy } = canvasToWorld(e.clientX - rect.left, e.clientY - rect.top);
      const n = nodeMapRef.current.get(dragRef.current.id);
      if (n) { n.x = wx - dragRef.current.ox; n.y = wy - dragRef.current.oy; n.vx = 0; n.vy = 0; n.pinned = true; }
    } else if (panRef.current) {
      isDraggingRef.current = true;
      transformRef.current = { ...transformRef.current,
        x: panRef.current.tx + (e.clientX - panRef.current.startX),
        y: panRef.current.ty + (e.clientY - panRef.current.startY),
      };
    } else {
      // Hover tracking (no drag)
      const rect = canvasRef.current!.getBoundingClientRect();
      const { x: wx, y: wy } = canvasToWorld(e.clientX - rect.left, e.clientY - rect.top);
      const hit = hitTest(wx, wy);
      hoverRef.current = hit ? hit.id : null;
    }
  }, [canvasToWorld, hitTest]);

  const handlePointerUp = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    if (dragRef.current) { canvasRef.current!.releasePointerCapture(e.pointerId); dragRef.current = null; }
    panRef.current = null;
    setTimeout(() => { isDraggingRef.current = false; }, 0);
  }, []);

  const handlePointerLeave = useCallback(() => { hoverRef.current = null; }, []);

  const handleClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isDraggingRef.current) return;
    const rect = canvasRef.current!.getBoundingClientRect();
    const { x: wx, y: wy } = canvasToWorld(e.clientX - rect.left, e.clientY - rect.top);
    const hit = hitTest(wx, wy);
    const newSelected = hit ? hit.id : null;
    selectedRef.current = newSelected;
    setSelectedFile(newSelected);
    setShowFunctions(false); setShowTransitive(false);

    if (newSelected && projectPath) {
      setImpactLoading(true); setImpactData(null);
      fetch(`${API_BASE}/api/graph/impact?projectPath=${encodeURIComponent(projectPath)}&filePath=${encodeURIComponent(newSelected)}`)
        .then(r => r.json()).then(d => setImpactData(d))
        .catch(() => setImpactData(null)).finally(() => setImpactLoading(false));
    } else {
      setImpactData(null);
    }
  }, [canvasToWorld, hitTest, projectPath]);

  const handleWheel = useCallback((e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.12 : 1 / 1.12;
    const rect = canvasRef.current!.getBoundingClientRect();
    const mx = e.clientX - rect.left, my = e.clientY - rect.top;
    const { x: tx, y: ty, scale } = transformRef.current;
    const newScale = Math.min(8, Math.max(0.1, scale * factor));
    transformRef.current = {
      x: mx - (mx - tx) * (newScale / scale),
      y: my - (my - ty) * (newScale / scale),
      scale: newScale,
    };
  }, []);

  // ── Search ──────────────────────────────────────────────────────────────────

  const jumpToFile = useCallback((q: string) => {
    if (!q) return;
    const match = nodesRef.current.find(n => n.id.toLowerCase().includes(q.toLowerCase()));
    if (match && canvasRef.current) {
      const W = canvasRef.current.width, H = canvasRef.current.height;
      transformRef.current = { x: W / 2 - match.x * 2.5, y: H / 2 - match.y * 2.5, scale: 2.5 };
      selectedRef.current = match.id; setSelectedFile(match.id);
    }
  }, []);

  const handleSearch = useCallback((q: string) => {
    setSearch(q);
    if (q.length >= 2) jumpToFile(q);
  }, [jumpToFile]);

  const selectedFileData = selectedFile && graph ? graph.files[selectedFile] : null;
  const transitiveDiff   = impactData
    ? impactData.transitiveDependents.filter(f => !impactData.directDependents.includes(f))
    : [];

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0, x: 24 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 24 }}
      transition={{ duration: 0.18, ease: 'easeOut' }}
      className="fixed inset-y-0 right-0 w-[820px] flex flex-col z-50"
      style={{ background: '#0d0f14', borderLeft: '1px solid rgba(99,102,241,0.18)' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 flex-shrink-0" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="flex items-center gap-2.5">
          <GitBranch size={14} style={{ color: '#818cf8' }} />
          <span className="text-sm font-semibold" style={{ color: '#e2e8f0' }}>Code Graph</span>
          {graph && (
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-md" style={{ background: 'rgba(99,102,241,0.12)', color: '#818cf8', border: '1px solid rgba(99,102,241,0.2)' }}>
              {graph.totalFiles} files · {graph.orphanFiles.length} orphans · {graph.circularDeps.length} circular
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          <button onClick={() => loadGraph(true)} disabled={loading}
            className="p-1.5 rounded-lg transition-colors"
            style={{ color: '#6b7280' }}
            onMouseEnter={e => (e.currentTarget.style.color = '#e2e8f0')}
            onMouseLeave={e => (e.currentTarget.style.color = '#6b7280')}
            title="Force-rebuild graph"
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
          </button>
          <button onClick={onClose} className="p-1.5 rounded-lg transition-colors"
            style={{ color: '#6b7280' }}
            onMouseEnter={e => (e.currentTarget.style.color = '#e2e8f0')}
            onMouseLeave={e => (e.currentTarget.style.color = '#6b7280')}
          >
            <X size={14} />
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="px-4 py-2 flex-shrink-0" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
        <div className="relative">
          <Search size={11} className="absolute left-2.5 top-1/2 -translate-y-1/2" style={{ color: '#4b5563' }} />
          <input
            type="text" value={search} onChange={e => handleSearch(e.target.value)}
            placeholder="Jump to file…"
            className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg focus:outline-none focus:ring-1"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: '#e2e8f0', caretColor: '#818cf8' }}
            onFocus={e => (e.currentTarget.style.borderColor = 'rgba(129,140,248,0.5)')}
            onBlur={e  => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)')}
          />
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 px-4 py-1.5 flex-shrink-0 text-[10px]" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', color: '#4b5563' }}>
        <Dot color={C_NODE}   label="File" />
        <Dot color={C_HUB}    label="Hub" />
        <Dot color={C_ORPHAN} label="Orphan" />
        <Dot color={C_CIRC}   label="Circular" />
        <Dot color={C_SELECT} label="Selected" />
        <Dot color={C_CONN}   label="Connected" />
        <span className="ml-auto opacity-50">Scroll=zoom · Drag=pan/move · Click=inspect</span>
      </div>

      {/* Main area */}
      <div className="flex flex-1 min-h-0">
        <div ref={containerRef} className="flex-1 relative min-w-0" style={{ background: BG }}>
          {loading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 z-10" style={{ background: 'rgba(13,15,20,0.85)' }}>
              <Loader2 size={22} className="animate-spin" style={{ color: '#818cf8' }} />
              <span className="text-xs" style={{ color: '#6b7280' }}>Building graph…</span>
            </div>
          )}
          {error && !loading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-8" style={{ color: '#f87171' }}>
              <AlertCircle size={18} />
              <span className="text-xs text-center">{error}</span>
            </div>
          )}
          {!loading && !error && !graph && (
            <div className="absolute inset-0 flex items-center justify-center text-xs" style={{ color: '#374151' }}>
              No project selected
            </div>
          )}
          <canvas
            ref={canvasRef}
            className="w-full h-full touch-none"
            style={{ cursor: dragRef.current ? 'grabbing' : 'grab' }}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerLeave}
            onClick={handleClick}
            onWheel={handleWheel}
          />
        </div>

        {/* Impact sidebar */}
        <AnimatePresence>
          {selectedFile && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 230, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.16 }}
              className="overflow-hidden flex-shrink-0 flex flex-col"
              style={{ minWidth: 0, background: '#0a0c11', borderLeft: '1px solid rgba(255,255,255,0.06)' }}
            >
              <div className="px-3 py-2.5 flex-shrink-0" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                <div className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: '#374151' }}>Selected</div>
                <div className="text-[10px] font-mono break-all leading-tight" style={{ color: '#a5b4fc' }}>{selectedFile}</div>
              </div>

              <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: 'none' }}>
                {impactLoading ? (
                  <div className="flex items-center justify-center p-6">
                    <Loader2 size={14} className="animate-spin" style={{ color: '#374151' }} />
                  </div>
                ) : impactData ? (
                  <div className="p-3 space-y-3 text-[11px]">
                    <DarkSection color="#a855f7" label="Blast radius" count={impactData.totalImpact}>
                      {impactData.directDependents.length === 0
                        ? <div className="pl-2 italic" style={{ color: '#374151' }}>No direct dependents</div>
                        : impactData.directDependents.map(f => (
                          <DarkFileLink key={f} path={f} onClick={() => jumpToFile(f.split('/').pop()!)} />
                        ))
                      }
                    </DarkSection>

                    {transitiveDiff.length > 0 && (
                      <div>
                        <button className="flex items-center gap-1 font-semibold w-full text-left mb-1" style={{ color: '#4b5563' }}
                          onClick={() => setShowTransitive(v => !v)}>
                          {showTransitive ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
                          <span className="w-2 h-2 rounded-full inline-block flex-shrink-0" style={{ background: '#38bdf8' }} />
                          Transitive
                          <span className="ml-auto font-mono" style={{ color: '#38bdf8' }}>{transitiveDiff.length}</span>
                        </button>
                        {showTransitive && transitiveDiff.map(f => (
                          <DarkFileLink key={f} path={f} onClick={() => jumpToFile(f.split('/').pop()!)} />
                        ))}
                      </div>
                    )}

                    <DarkSection color={C_NODE} label="Imports" count={impactData.directDependencies.length}>
                      {impactData.directDependencies.map(f => (
                        <DarkFileLink key={f} path={f} onClick={() => jumpToFile(f.split('/').pop()!)} />
                      ))}
                    </DarkSection>

                    {selectedFileData && selectedFileData.thirdParty.length > 0 && (
                      <DarkSection color="#34d399" label="npm" count={selectedFileData.thirdParty.length}>
                        {selectedFileData.thirdParty.map(p => (
                          <div key={p} className="font-mono truncate pl-2 py-0.5" style={{ color: '#4b5563' }}>{p}</div>
                        ))}
                      </DarkSection>
                    )}

                    {selectedFileData && selectedFileData.functions.length > 0 && (
                      <div>
                        <button className="flex items-center gap-1 font-semibold w-full text-left mb-1" style={{ color: '#4b5563' }}
                          onClick={() => setShowFunctions(v => !v)}>
                          {showFunctions ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
                          <span className="w-2 h-2 rounded-full inline-block flex-shrink-0" style={{ background: '#fbbf24' }} />
                          Functions
                          <span className="ml-auto font-mono" style={{ color: '#fbbf24' }}>{selectedFileData.functions.length}</span>
                        </button>
                        {showFunctions && selectedFileData.functions.map(fn => (
                          <div key={`${fn.name}:${fn.line}`} className="pl-2 py-0.5">
                            <span className="font-mono" style={{ color: '#c4b5fd' }}>{fn.name}</span>
                            <span className="ml-1" style={{ color: '#374151' }}>:{fn.line}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {impactData.orphanRisk && (
                      <div className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 mt-1" style={{ background: 'rgba(239,68,68,0.1)', color: '#f87171' }}>
                        <AlertCircle size={10} /><span>Orphan — nothing imports this</span>
                      </div>
                    )}
                    {selectedFileData?.id && graph?.circularDeps.some(c => c.includes(selectedFileData.id)) && (
                      <div className="flex items-center gap-1.5 rounded-lg px-2 py-1.5" style={{ background: 'rgba(251,146,60,0.1)', color: '#fb923c' }}>
                        <AlertCircle size={10} /><span>Part of a circular dependency</span>
                      </div>
                    )}
                  </div>
                ) : null}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

// ─── Tiny colour helper ────────────────────────────────────────────────────────

function lighten(hex: string, amount: number): string {
  const n = parseInt(hex.replace('#', ''), 16);
  const r = Math.min(255, ((n >> 16) & 0xff) + Math.round(255 * amount));
  const g = Math.min(255, ((n >> 8)  & 0xff) + Math.round(255 * amount));
  const b = Math.min(255, ( n        & 0xff) + Math.round(255 * amount));
  return `rgb(${r},${g},${b})`;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function Dot({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1">
      <span className="w-1.5 h-1.5 rounded-full inline-block flex-shrink-0" style={{ backgroundColor: color, boxShadow: `0 0 4px ${color}` }} />
      <span style={{ color: '#4b5563' }}>{label}</span>
    </span>
  );
}

function DarkSection({ color, label, count, children }: { color: string; label: string; count: number; children: React.ReactNode }) {
  return (
    <div>
      <div className="font-semibold mb-1 flex items-center gap-1 text-[11px]" style={{ color: '#374151' }}>
        <span className="w-2 h-2 rounded-full inline-block flex-shrink-0" style={{ backgroundColor: color }} />
        {label}
        <span className="ml-auto font-mono" style={{ color }}>{count}</span>
      </div>
      {children}
    </div>
  );
}

function DarkFileLink({ path, onClick }: { path: string; onClick: () => void }) {
  const parts = path.split('/');
  const name  = parts[parts.length - 1];
  const dir   = parts.slice(0, -1).join('/');
  return (
    <button className="w-full text-left pl-2 py-0.5 rounded transition-colors group" title={path}
      onClick={onClick}
      style={{ color: '#6b7280' }}
      onMouseEnter={e => (e.currentTarget.style.color = '#a5b4fc')}
      onMouseLeave={e => (e.currentTarget.style.color = '#6b7280')}
    >
      <span className="font-mono">{name}</span>
      {dir && <span className="ml-1 text-[9px]" style={{ color: '#374151' }}>{dir}</span>}
    </button>
  );
}
