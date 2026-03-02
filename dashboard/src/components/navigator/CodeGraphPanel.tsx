/**
 * CodeGraphPanel — interactive dependency graph viewer
 *
 * Force-directed simulation (no external deps) rendered on a <canvas>.
 * Data comes from GET /api/graph/build?projectPath=...
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Search, RefreshCw, AlertCircle, GitBranch, Loader2, ChevronDown, ChevronRight } from 'lucide-react';
import { API_BASE } from '../../services/api';

// ─── Types ────────────────────────────────────────────────────────────────────

interface FunctionNode {
  name: string;
  line: number;
  calls: string[];
}

interface FileNode {
  id: string;
  imports: string[];
  importedBy: string[];
  isOrphan: boolean;
  thirdParty: string[];
  functions: FunctionNode[];
}

interface ProjectGraph {
  projectPath: string;
  builtAt: number;
  files: Record<string, FileNode>;
  totalFiles: number;
  orphanFiles: string[];
  circularDeps: string[][];
}

interface SimNode {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  pinned: boolean;
  isOrphan: boolean;
  inCircular: boolean;
  importedByCount: number;
}

interface SimEdge {
  source: string;
  target: string;
}

interface ImpactData {
  targetFile: string;
  directDependents: string[];
  transitiveDependents: string[];
  directDependencies: string[];
  totalImpact: number;
  orphanRisk: boolean;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const REPULSION = 3500;
const ATTRACTION = 0.035;
const DAMPING = 0.82;
const CENTER_PULL = 0.004;
const NODE_RADIUS = 5;
const IDEAL_EDGE_LEN = 90;

// ─── Component ────────────────────────────────────────────────────────────────

interface Props {
  isOpen: boolean;
  onClose: () => void;
  projectPath: string | null;
}

export default function CodeGraphPanel({ isOpen, onClose, projectPath }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const animFrameRef = useRef<number>(0);

  const [graph, setGraph] = useState<ProjectGraph | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Simulation state — stored in refs to avoid re-renders on every tick
  const nodesRef = useRef<SimNode[]>([]);
  const edgesRef = useRef<SimEdge[]>([]);
  const nodeMapRef = useRef<Map<string, SimNode>>(new Map());    // O(1) lookup
  const selectedRef = useRef<string | null>(null);
  const dragRef = useRef<{ id: string; ox: number; oy: number } | null>(null);
  const isDraggingRef = useRef(false);
  const transformRef = useRef({ x: 0, y: 0, scale: 1 });
  const panRef = useRef<{ startX: number; startY: number; tx: number; ty: number } | null>(null);

  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [impactData, setImpactData] = useState<ImpactData | null>(null);
  const [impactLoading, setImpactLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [showFunctions, setShowFunctions] = useState(false);
  const [showTransitive, setShowTransitive] = useState(false);

  // ── Load graph ──────────────────────────────────────────────────────────────

  const loadGraph = useCallback(async (force = false) => {
    if (!projectPath) return;
    setLoading(true);
    setError(null);
    try {
      const method = force ? 'POST' : 'GET';
      const url = force
        ? `${API_BASE}/api/graph/build`
        : `${API_BASE}/api/graph/build?projectPath=${encodeURIComponent(projectPath)}`;
      const res = await fetch(url, {
        method,
        ...(force
          ? { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ projectPath }) }
          : {}),
      });
      if (!res.ok) throw new Error(await res.text());
      const data: ProjectGraph = await res.json();
      setGraph(data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [projectPath]);

  useEffect(() => {
    if (isOpen && projectPath) loadGraph();
  }, [isOpen, projectPath]); // eslint-disable-line

  // ── Build simulation from graph data ────────────────────────────────────────

  useEffect(() => {
    if (!graph || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const W = canvas.offsetWidth || 500;
    const H = canvas.offsetHeight || 500;
    canvas.width = W;
    canvas.height = H;
    const cx = W / 2, cy = H / 2;

    const circularParticipants = new Set(graph.circularDeps.flat());

    // Place nodes in a spiral to reduce initial overlap
    const fileList = Object.values(graph.files);
    const nodes: SimNode[] = fileList.map((f, i) => {
      const angle = (i / fileList.length) * Math.PI * 2;
      const ring = Math.floor(i / 20);
      const radius = 80 + ring * 55;
      return {
        id: f.id,
        x: cx + Math.cos(angle) * radius,
        y: cy + Math.sin(angle) * radius,
        vx: 0,
        vy: 0,
        pinned: false,
        isOrphan: f.isOrphan,
        inCircular: circularParticipants.has(f.id),
        importedByCount: f.importedBy.length,
      };
    });

    // Build edges
    const edges: SimEdge[] = [];
    for (const f of fileList) {
      for (const imp of f.imports) {
        if (graph.files[imp]) {
          edges.push({ source: f.id, target: imp });
        }
      }
    }

    // Build O(1) node map
    const nodeMap = new Map<string, SimNode>();
    for (const n of nodes) nodeMap.set(n.id, n);

    nodesRef.current = nodes;
    edgesRef.current = edges;
    nodeMapRef.current = nodeMap;

    return () => {
      cancelAnimationFrame(animFrameRef.current);
    };
  }, [graph]);

  // ── Animation / force loop ──────────────────────────────────────────────────

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !graph) return;
    const ctx = canvas.getContext('2d')!;
    let running = true;

    const tick = () => {
      if (!running) return;

      // Keep canvas dimensions in sync with container (cheap check)
      if (containerRef.current) {
        const cw = containerRef.current.clientWidth;
        const ch = containerRef.current.clientHeight;
        if (canvas.width !== cw || canvas.height !== ch) {
          canvas.width = cw;
          canvas.height = ch;
        }
      }

      const nodes = nodesRef.current;
      const edges = edgesRef.current;
      const nodeMap = nodeMapRef.current;
      const W = canvas.width;
      const H = canvas.height;
      const cx = W / 2, cy = H / 2;

      // ── Force integration ─────────────────────────────────────────────────

      // O(n²) repulsion — acceptable up to ~500 nodes
      for (let i = 0; i < nodes.length; i++) {
        const a = nodes[i];
        if (a.pinned) continue;
        for (let j = i + 1; j < nodes.length; j++) {
          const b = nodes[j];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const dist2 = dx * dx + dy * dy + 1;
          const force = REPULSION / dist2;
          const fx = dx * force, fy = dy * force;
          a.vx += fx; a.vy += fy;
          if (!b.pinned) { b.vx -= fx; b.vy -= fy; }
        }

        // Weak center gravity
        a.vx += (cx - a.x) * CENTER_PULL;
        a.vy += (cy - a.y) * CENTER_PULL;

        // Damping + integrate
        a.vx *= DAMPING;
        a.vy *= DAMPING;
        a.x += a.vx;
        a.y += a.vy;
      }

      // Edge spring attraction
      for (const e of edges) {
        const s = nodeMap.get(e.source);
        const t = nodeMap.get(e.target);
        if (!s || !t) continue;
        const dx = t.x - s.x;
        const dy = t.y - s.y;
        const dist = Math.sqrt(dx * dx + dy * dy) + 0.01;
        const force = (dist - IDEAL_EDGE_LEN) * ATTRACTION;
        const fx = (dx / dist) * force;
        const fy = (dy / dist) * force;
        if (!s.pinned) { s.vx += fx; s.vy += fy; }
        if (!t.pinned) { t.vx -= fx; t.vy -= fy; }
      }

      // ── Draw ──────────────────────────────────────────────────────────────
      const { x: tx, y: ty, scale } = transformRef.current;
      ctx.clearRect(0, 0, W, H);
      ctx.save();
      ctx.translate(tx, ty);
      ctx.scale(scale, scale);

      const selected = selectedRef.current;
      const highlightedIds = new Set<string>();
      const highlightedEdges = new Set<string>();

      if (selected) {
        const fileData = graph.files[selected];
        if (fileData) {
          highlightedIds.add(selected);
          for (const imp of fileData.imports) {
            highlightedIds.add(imp);
            highlightedEdges.add(`${selected}||${imp}`);
          }
          for (const imp of fileData.importedBy) {
            highlightedIds.add(imp);
            highlightedEdges.add(`${imp}||${selected}`);
          }
        }
      }

      // Draw edges
      for (const e of edges) {
        const s = nodeMap.get(e.source);
        const t = nodeMap.get(e.target);
        if (!s || !t) continue;
        const key = `${e.source}||${e.target}`;
        const isHighlighted = highlightedEdges.has(key);
        ctx.beginPath();
        ctx.moveTo(s.x, s.y);
        ctx.lineTo(t.x, t.y);
        ctx.strokeStyle = isHighlighted ? 'rgba(99,102,241,0.85)' : 'rgba(161,161,170,0.18)';
        ctx.lineWidth = isHighlighted ? 1.5 / scale : 0.6 / scale;
        ctx.stroke();
      }

      // Draw nodes
      const hasSelection = selected !== null;
      for (const n of nodes) {
        const isSelected = n.id === selected;
        const isHighlighted = highlightedIds.has(n.id);
        const dimmed = hasSelection && !isSelected && !isHighlighted;

        // Radius scales with popularity
        const r = NODE_RADIUS + (n.importedByCount > 8 ? 4 : n.importedByCount > 3 ? 2 : 0);

        ctx.beginPath();
        ctx.arc(n.x, n.y, r, 0, Math.PI * 2);

        let fill = '#818cf8'; // default indigo-400
        if (isSelected) fill = '#a855f7';      // purple-500
        else if (n.inCircular) fill = '#f97316'; // orange-500
        else if (n.isOrphan) fill = '#f87171'; // red-400
        else if (isHighlighted) fill = '#22d3ee'; // cyan-400

        ctx.globalAlpha = dimmed ? 0.18 : 1.0;
        ctx.fillStyle = fill;
        ctx.fill();

        if (isSelected || isHighlighted) {
          ctx.strokeStyle = dimmed ? 'transparent' : '#fff';
          ctx.lineWidth = 1.2 / scale;
          ctx.stroke();
        }
        ctx.globalAlpha = 1.0;

        // Label for selected / highlighted nodes, or all when zoomed in enough
        if (isSelected || isHighlighted || scale > 2) {
          const parts = n.id.split('/');
          const label = parts[parts.length - 1];
          const fontSize = Math.max(8, 10 / scale);
          ctx.font = `${fontSize}px ui-monospace, monospace`;
          ctx.globalAlpha = dimmed ? 0.2 : 1.0;
          ctx.fillStyle = isSelected ? '#a855f7' : isHighlighted ? '#0891b2' : '#52525b';
          ctx.fillText(label, n.x + r + 2 / scale, n.y + fontSize * 0.4);
          ctx.globalAlpha = 1.0;
        }
      }

      ctx.restore();
      animFrameRef.current = requestAnimationFrame(tick);
    };

    animFrameRef.current = requestAnimationFrame(tick);
    return () => {
      running = false;
      cancelAnimationFrame(animFrameRef.current);
    };
  }, [graph]);

  // ── Pointer event helpers ───────────────────────────────────────────────────

  const canvasToWorld = useCallback((cx: number, cy: number) => {
    const { x: tx, y: ty, scale } = transformRef.current;
    return { x: (cx - tx) / scale, y: (cy - ty) / scale };
  }, []);

  const hitTest = useCallback((wx: number, wy: number): SimNode | null => {
    const nodes = nodesRef.current;
    // Iterate in reverse so topmost (last drawn) gets priority
    for (let i = nodes.length - 1; i >= 0; i--) {
      const n = nodes[i];
      const dx = n.x - wx, dy = n.y - wy;
      const r = NODE_RADIUS + (n.importedByCount > 8 ? 4 : n.importedByCount > 3 ? 2 : 0);
      if (dx * dx + dy * dy <= (r + 5) * (r + 5)) return n;
    }
    return null;
  }, []);

  const handlePointerDown = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    isDraggingRef.current = false;
    const rect = canvasRef.current!.getBoundingClientRect();
    const { x: wx, y: wy } = canvasToWorld(e.clientX - rect.left, e.clientY - rect.top);
    const hit = hitTest(wx, wy);
    if (hit) {
      dragRef.current = { id: hit.id, ox: wx - hit.x, oy: wy - hit.y };
      canvasRef.current!.setPointerCapture(e.pointerId);
    } else {
      panRef.current = {
        startX: e.clientX,
        startY: e.clientY,
        tx: transformRef.current.x,
        ty: transformRef.current.y,
      };
    }
  }, [canvasToWorld, hitTest]);

  const handlePointerMove = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    if (dragRef.current) {
      isDraggingRef.current = true;
      const rect = canvasRef.current!.getBoundingClientRect();
      const { x: wx, y: wy } = canvasToWorld(e.clientX - rect.left, e.clientY - rect.top);
      const n = nodeMapRef.current.get(dragRef.current.id);
      if (n) {
        n.x = wx - dragRef.current.ox;
        n.y = wy - dragRef.current.oy;
        n.vx = 0; n.vy = 0;
        n.pinned = true;
      }
    } else if (panRef.current) {
      isDraggingRef.current = true;
      const dx = e.clientX - panRef.current.startX;
      const dy = e.clientY - panRef.current.startY;
      transformRef.current = {
        ...transformRef.current,
        x: panRef.current.tx + dx,
        y: panRef.current.ty + dy,
      };
    }
  }, [canvasToWorld]);

  const handlePointerUp = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    if (dragRef.current) {
      canvasRef.current!.releasePointerCapture(e.pointerId);
      dragRef.current = null;
    }
    panRef.current = null;
    // Reset drag flag after a tick so click handler can read it
    setTimeout(() => { isDraggingRef.current = false; }, 0);
  }, []);

  const handleClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isDraggingRef.current) return;
    const rect = canvasRef.current!.getBoundingClientRect();
    const { x: wx, y: wy } = canvasToWorld(e.clientX - rect.left, e.clientY - rect.top);
    const hit = hitTest(wx, wy);
    const newSelected = hit ? hit.id : null;
    selectedRef.current = newSelected;
    setSelectedFile(newSelected);
    setShowFunctions(false);
    setShowTransitive(false);

    if (newSelected && projectPath) {
      setImpactLoading(true);
      setImpactData(null);
      fetch(
        `${API_BASE}/api/graph/impact?projectPath=${encodeURIComponent(projectPath)}&filePath=${encodeURIComponent(newSelected)}`
      )
        .then(r => r.json())
        .then(d => setImpactData(d))
        .catch(() => setImpactData(null))
        .finally(() => setImpactLoading(false));
    } else {
      setImpactData(null);
    }
  }, [canvasToWorld, hitTest, projectPath]);

  const handleWheel = useCallback((e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.12 : 1 / 1.12;
    const rect = canvasRef.current!.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const { x: tx, y: ty, scale } = transformRef.current;
    const newScale = Math.min(6, Math.max(0.15, scale * factor));
    transformRef.current = {
      x: mx - (mx - tx) * (newScale / scale),
      y: my - (my - ty) * (newScale / scale),
      scale: newScale,
    };
  }, []);

  // ── Search / jump ───────────────────────────────────────────────────────────

  const jumpToFile = useCallback((q: string) => {
    if (!q) return;
    const match = nodesRef.current.find(n => n.id.toLowerCase().includes(q.toLowerCase()));
    if (match && canvasRef.current) {
      const W = canvasRef.current.width, H = canvasRef.current.height;
      transformRef.current = { x: W / 2 - match.x * 2, y: H / 2 - match.y * 2, scale: 2 };
      selectedRef.current = match.id;
      setSelectedFile(match.id);
    }
  }, []);

  const handleSearch = useCallback((q: string) => {
    setSearch(q);
    if (q.length >= 2) jumpToFile(q);
  }, [jumpToFile]);

  // ── Selected file data ──────────────────────────────────────────────────────

  const selectedFileData = selectedFile && graph ? graph.files[selectedFile] : null;
  const transitiveDiff = impactData
    ? impactData.transitiveDependents.filter(f => !impactData.directDependents.includes(f))
    : [];

  // ─── Render ────────────────────────────────────────────────────────────────

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0, x: 24 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 24 }}
      transition={{ duration: 0.18, ease: 'easeOut' }}
      className="fixed inset-y-0 right-0 w-[800px] bg-white border-l border-zinc-200 shadow-2xl flex flex-col z-50"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-zinc-100 flex-shrink-0">
        <div className="flex items-center gap-2.5">
          <GitBranch size={14} className="text-indigo-500" />
          <span className="text-sm font-semibold text-zinc-800">Code Graph</span>
          {graph && (
            <span className="text-[10px] text-zinc-400 font-mono bg-zinc-50 border border-zinc-100 rounded-md px-1.5 py-0.5">
              {graph.totalFiles} files · {graph.orphanFiles.length} orphans · {graph.circularDeps.length} circular
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => loadGraph(true)}
            className="p-1.5 text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 rounded-lg transition-colors"
            title="Force-rebuild graph"
            disabled={loading}
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
          </button>
          <button
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 rounded-lg transition-colors"
          >
            <X size={14} />
          </button>
        </div>
      </div>

      {/* Search bar */}
      <div className="px-4 py-2 border-b border-zinc-50 flex-shrink-0">
        <div className="relative">
          <Search size={11} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            value={search}
            onChange={e => handleSearch(e.target.value)}
            placeholder="Jump to file…"
            className="w-full pl-8 pr-3 py-1.5 text-xs bg-zinc-50 border border-zinc-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-300"
          />
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 px-4 py-1.5 border-b border-zinc-50 text-[10px] text-zinc-400 flex-shrink-0">
        <Dot color="#818cf8" label="File" />
        <Dot color="#f87171" label="Orphan" />
        <Dot color="#f97316" label="Circular" />
        <Dot color="#a855f7" label="Selected" />
        <Dot color="#22d3ee" label="Connected" />
        <span className="ml-auto opacity-60">Scroll=zoom · Drag=pan · Click=impact</span>
      </div>

      {/* Main area */}
      <div className="flex flex-1 min-h-0">
        {/* Canvas */}
        <div ref={containerRef} className="flex-1 relative bg-zinc-50/60 min-w-0">
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center bg-zinc-50/90 z-10 flex-col gap-2">
              <Loader2 size={20} className="animate-spin text-indigo-400" />
              <span className="text-xs text-zinc-500">Building graph…</span>
            </div>
          )}
          {error && !loading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-red-500 px-8">
              <AlertCircle size={18} />
              <span className="text-xs text-center">{error}</span>
            </div>
          )}
          {!loading && !error && !graph && (
            <div className="absolute inset-0 flex items-center justify-center text-zinc-400 text-xs">
              No project selected
            </div>
          )}
          <canvas
            ref={canvasRef}
            className="w-full h-full cursor-grab active:cursor-grabbing touch-none"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onClick={handleClick}
            onWheel={handleWheel}
          />
        </div>

        {/* Impact sidebar */}
        <AnimatePresence>
          {selectedFile && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 224, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.16 }}
              className="border-l border-zinc-100 bg-white overflow-hidden flex-shrink-0 flex flex-col"
              style={{ minWidth: 0 }}
            >
              {/* File name header */}
              <div className="px-3 py-2.5 border-b border-zinc-50 flex-shrink-0">
                <div className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest mb-0.5">Selected</div>
                <div className="text-[10px] font-mono text-zinc-700 break-all leading-tight">{selectedFile}</div>
              </div>

              <div className="flex-1 overflow-y-auto">
                {impactLoading ? (
                  <div className="flex items-center justify-center p-6">
                    <Loader2 size={14} className="animate-spin text-zinc-300" />
                  </div>
                ) : impactData ? (
                  <div className="p-3 space-y-3 text-[11px]">

                    {/* Blast radius */}
                    <Section
                      color="#a855f7"
                      label="Blast radius"
                      count={impactData.totalImpact}
                    >
                      {impactData.directDependents.length === 0 ? (
                        <div className="text-zinc-400 pl-2 italic">No direct dependents</div>
                      ) : (
                        impactData.directDependents.map(f => (
                          <FileLink key={f} path={f} onClick={() => jumpToFile(f.split('/').pop()!)} />
                        ))
                      )}
                    </Section>

                    {/* Transitive dependents (collapsible) */}
                    {transitiveDiff.length > 0 && (
                      <div>
                        <button
                          className="flex items-center gap-1 font-semibold text-zinc-500 w-full text-left mb-1"
                          onClick={() => setShowTransitive(v => !v)}
                        >
                          {showTransitive ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
                          <span className="w-2 h-2 rounded-full bg-cyan-400 inline-block flex-shrink-0" />
                          Transitive
                          <span className="ml-auto font-mono text-cyan-500">{transitiveDiff.length}</span>
                        </button>
                        {showTransitive && transitiveDiff.map(f => (
                          <FileLink key={f} path={f} onClick={() => jumpToFile(f.split('/').pop()!)} />
                        ))}
                      </div>
                    )}

                    {/* Direct imports */}
                    <Section color="#818cf8" label="Imports" count={impactData.directDependencies.length}>
                      {impactData.directDependencies.map(f => (
                        <FileLink key={f} path={f} onClick={() => jumpToFile(f.split('/').pop()!)} />
                      ))}
                    </Section>

                    {/* npm packages */}
                    {selectedFileData && selectedFileData.thirdParty.length > 0 && (
                      <Section color="#34d399" label="npm" count={selectedFileData.thirdParty.length}>
                        {selectedFileData.thirdParty.map(p => (
                          <div key={p} className="text-zinc-500 font-mono truncate pl-2 py-0.5">{p}</div>
                        ))}
                      </Section>
                    )}

                    {/* Functions (collapsible) */}
                    {selectedFileData && selectedFileData.functions.length > 0 && (
                      <div>
                        <button
                          className="flex items-center gap-1 font-semibold text-zinc-500 w-full text-left mb-1"
                          onClick={() => setShowFunctions(v => !v)}
                        >
                          {showFunctions ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
                          <span className="w-2 h-2 rounded-full bg-amber-400 inline-block flex-shrink-0" />
                          Functions
                          <span className="ml-auto font-mono text-amber-500">{selectedFileData.functions.length}</span>
                        </button>
                        {showFunctions && selectedFileData.functions.map(fn => (
                          <div key={`${fn.name}:${fn.line}`} className="pl-2 py-0.5">
                            <span className="font-mono text-zinc-700">{fn.name}</span>
                            <span className="text-zinc-400 ml-1">:{fn.line}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Orphan warning */}
                    {impactData.orphanRisk && (
                      <div className="flex items-center gap-1.5 text-red-500 bg-red-50 rounded-lg px-2 py-1.5 mt-1">
                        <AlertCircle size={10} />
                        <span>Orphan — nothing imports this</span>
                      </div>
                    )}

                    {/* Circular dep warning */}
                    {selectedFileData?.id && graph?.circularDeps.some(cycle => cycle.includes(selectedFileData.id)) && (
                      <div className="flex items-center gap-1.5 text-orange-500 bg-orange-50 rounded-lg px-2 py-1.5">
                        <AlertCircle size={10} />
                        <span>Part of a circular dependency</span>
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

// ─── Small helpers ─────────────────────────────────────────────────────────────

function Dot({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1">
      <span className="w-2 h-2 rounded-full inline-block flex-shrink-0" style={{ backgroundColor: color }} />
      {label}
    </span>
  );
}

function Section({
  color,
  label,
  count,
  children,
}: {
  color: string;
  label: string;
  count: number;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="font-semibold text-zinc-600 mb-1 flex items-center gap-1 text-[11px]">
        <span className="w-2 h-2 rounded-full inline-block flex-shrink-0" style={{ backgroundColor: color }} />
        {label}
        <span className="ml-auto font-mono" style={{ color }}>{count}</span>
      </div>
      {children}
    </div>
  );
}

function FileLink({ path, onClick }: { path: string; onClick: () => void }) {
  const parts = path.split('/');
  const name = parts[parts.length - 1];
  const dir = parts.slice(0, -1).join('/');
  return (
    <button
      className="w-full text-left pl-2 py-0.5 hover:bg-zinc-50 rounded group"
      onClick={onClick}
      title={path}
    >
      <span className="font-mono text-zinc-700 group-hover:text-indigo-600 transition-colors">{name}</span>
      {dir && <span className="text-zinc-400 ml-1 text-[9px] truncate">{dir}</span>}
    </button>
  );
}
