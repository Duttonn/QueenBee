import React, { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Globe, Target, Loader2, AlertTriangle, X, RefreshCw, ExternalLink, Trash2, Wifi, WifiOff, Grab, Play, Square, Terminal, ChevronDown, ChevronUp } from 'lucide-react';
import { type PickedElement } from './ElementPicker';
import { API_BASE } from '../../services/api';
import { useHiveStore } from '../../store/useHiveStore';
import { useAuthStore } from '../../store/useAuthStore';

const API = `${API_BASE}/api`;

// ─── Types ────────────────────────────────────────────────────────────────────

interface BrowserPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

// ─── Inline picker overlay (no screenshots needed) ────────────────────────────

interface IframePickerProps {
  active: boolean;
  /** Page dimensions reported by Puppeteer (for coord mapping when iframe is smaller) */
  pageWidth: number;
  pageHeight: number;
  reactGrabEnabled: boolean;
  onPick: (el: PickedElement) => void;
  onError: (msg: string) => void;
  pinnedBoxes: Array<{ selector: string; x: number; y: number; width: number; height: number }>;
  /** Actual rendered size of the iframe container */
  containerRef: React.RefObject<HTMLDivElement | null>;
}

const IframePicker: React.FC<IframePickerProps> = ({
  active,
  pageWidth,
  pageHeight,
  reactGrabEnabled,
  onPick,
  onError,
  pinnedBoxes,
  containerRef,
}) => {
  const [loading, setLoading] = useState(false);
  const [crosshair, setCrosshair] = useState<{ x: number; y: number } | null>(null);
  const [hoverBox, setHoverBox] = useState<{ x: number; y: number; w: number; h: number } | null>(null);

  const getContainerSize = () => {
    const el = containerRef.current;
    if (!el) return { w: pageWidth, h: pageHeight };
    return { w: el.clientWidth, h: el.clientHeight };
  };

  const toPageCoords = (relX: number, relY: number) => {
    const { w, h } = getContainerSize();
    return {
      x: Math.round((relX / w) * pageWidth),
      y: Math.round((relY / h) * pageHeight),
    };
  };

  const toDisplayCoords = (pageX: number, pageY: number) => {
    const { w, h } = getContainerSize();
    return {
      x: (pageX / pageWidth) * w,
      y: (pageY / pageHeight) * h,
    };
  };

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!active) return;
      const rect = e.currentTarget.getBoundingClientRect();
      setCrosshair({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    },
    [active]
  );

  const handleMouseLeave = useCallback(() => {
    setCrosshair(null);
    setHoverBox(null);
  }, []);

  const handleClick = useCallback(
    async (e: React.MouseEvent<HTMLDivElement>) => {
      if (!active || loading) return;
      e.stopPropagation();

      const rect = e.currentTarget.getBoundingClientRect();
      const relX = e.clientX - rect.left;
      const relY = e.clientY - rect.top;
      const { x: pageX, y: pageY } = toPageCoords(relX, relY);

      setLoading(true);
      try {
        const res = await fetch(`${API}/browser/element-at-point?x=${pageX}&y=${pageY}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();

        if (data.boundingBox) {
          const d = toDisplayCoords(data.boundingBox.x, data.boundingBox.y);
          const { w: cw, h: ch } = getContainerSize();
          setHoverBox({
            x: d.x,
            y: d.y,
            w: (data.boundingBox.width / pageWidth) * cw,
            h: (data.boundingBox.height / pageHeight) * ch,
          });
        }

        const picked: PickedElement = {
          selector: data.selector,
          html: data.outerHTML,
          tagName: data.tagName,
          sourceFile: data.sourceFile,
          sourceLine: data.sourceLine,
          boundingBox: data.boundingBox || undefined,
        };

        if (reactGrabEnabled) {
          try {
            const rgRes = await fetch(`${API}/browser/grab?x=${pageX}&y=${pageY}`);
            if (rgRes.ok) {
              const rg = await rgRes.json();
              if (rg.componentName) picked.componentName = rg.componentName;
              if (rg.fileName) picked.reactFile = rg.fileName;
              if (rg.lineNumber) picked.reactLine = rg.lineNumber;
            }
          } catch { /* non-fatal */ }
        }

        onPick(picked);
      } catch (err: any) {
        onError(err?.message || 'Failed to pick element');
      } finally {
        setLoading(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [active, loading, pageWidth, pageHeight, reactGrabEnabled, onPick, onError]
  );

  if (!active && pinnedBoxes.length === 0) return null;

  const { w: cw, h: ch } = getContainerSize();

  return (
    <div
      className="absolute inset-0 z-10"
      style={{
        cursor: active ? (loading ? 'wait' : 'crosshair') : 'default',
        pointerEvents: active ? 'auto' : 'none',
      }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
    >
      {/* Green outlines for pinned elements */}
      {pinnedBoxes.map((box, i) => {
        const d = toDisplayCoords(box.x, box.y);
        return (
          <div
            key={`pin-${i}`}
            className="absolute pointer-events-none border-2 border-green-400 rounded-sm"
            style={{
              left: d.x,
              top: d.y,
              width: (box.width / pageWidth) * cw,
              height: (box.height / pageHeight) * ch,
            }}
          >
            <div className="absolute -top-4 left-0 px-1 py-0.5 bg-green-500 text-white text-[8px] rounded-sm font-mono">
              {box.selector}
            </div>
          </div>
        );
      })}

      {/* Hover bounding box (blue) */}
      {hoverBox && active && (
        <div
          className="absolute pointer-events-none border-2 border-indigo-400 bg-indigo-400/10 rounded-sm transition-all duration-75"
          style={{ left: hoverBox.x, top: hoverBox.y, width: hoverBox.w, height: hoverBox.h }}
        />
      )}

      {/* Crosshair */}
      {active && crosshair && !loading && (
        <>
          <div
            className="absolute pointer-events-none"
            style={{ left: 0, right: 0, top: crosshair.y, height: 1, background: 'rgba(99,102,241,0.7)' }}
          />
          <div
            className="absolute pointer-events-none"
            style={{ top: 0, bottom: 0, left: crosshair.x, width: 1, background: 'rgba(99,102,241,0.7)' }}
          />
          <div
            className="absolute pointer-events-none px-2 py-1 bg-indigo-600 text-white text-[9px] rounded-md font-mono shadow-lg"
            style={{
              left: Math.min(crosshair.x + 8, cw - 120),
              top: Math.max(crosshair.y - 28, 4),
            }}
          >
            {Math.round(crosshair.x)}, {Math.round(crosshair.y)}
          </div>
        </>
      )}

      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/40">
          <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {active && !crosshair && !loading && (
        <div className="absolute top-2 left-1/2 -translate-x-1/2 px-3 py-1.5 bg-indigo-600/90 text-white text-[10px] font-medium rounded-full shadow-lg">
          Click to pick an element
        </div>
      )}
    </div>
  );
};

// ─── LaunchApp Panel ──────────────────────────────────────────────────────────

interface LaunchResult {
  commands: string[];
  ports: number[];
  notes: string;
}

interface LaunchStatus {
  running: boolean;
  pid?: number;
  port?: number;
  url?: string;
  log?: string[];
}

const LaunchAppPanel: React.FC<{
  projectPath: string;
  onConnected: (url: string) => void;
  onClose: () => void;
}> = ({ projectPath, onConnected, onClose }) => {
  const { providers, activeProviderId } = useAuthStore();
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<LaunchResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [log, setLog] = useState<string[]>([]);
  const [logExpanded, setLogExpanded] = useState(true);
  const [runStatus, setRunStatus] = useState<LaunchStatus | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const logEndRef = useRef<HTMLDivElement>(null);

  const activeProvider = providers.find(p => p.id === activeProviderId && p.connected)
    ?? providers.find(p => p.connected);

  const analyze = useCallback(async () => {
    setAnalyzing(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch(`${API_BASE}/api/browser/launch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectPath,
          action: 'analyze',
          providerId: activeProvider?.id,
          model: activeProvider?.models?.[0],
          apiKey: activeProvider?.apiKey,
        }),
      });
      if (!res.ok) throw new Error(`API error ${res.status}`);
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setResult(data);
    } catch (err: any) {
      setError(err.message || 'Analysis failed');
    } finally {
      setAnalyzing(false);
    }
  }, [projectPath, activeProvider]);

  // Auto-analyze on mount
  useEffect(() => { analyze(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const startPoll = useCallback((expectedPort: number | null) => {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch(`${API_BASE}/api/browser/launch`);
        const status: LaunchStatus = await res.json();
        setRunStatus(status);
        setLog(status.log ?? []);
        if (!status.running) {
          clearInterval(pollRef.current!);
          setRunning(false);
        }
        if (status.url) {
          // Try to ping the URL; if reachable, auto-connect
          try {
            const ping = await fetch(status.url, { method: 'HEAD', signal: AbortSignal.timeout(1000) });
            if (ping.ok || ping.status < 500) {
              clearInterval(pollRef.current!);
              onConnected(status.url);
            }
          } catch {}
        }
      } catch {}
    }, 1500);
  }, [onConnected]);

  useEffect(() => () => { if (pollRef.current) clearInterval(pollRef.current); }, []);

  useEffect(() => {
    if (logEndRef.current) logEndRef.current.scrollIntoView({ behavior: 'smooth' });
  }, [log]);

  const runCommands = useCallback(async () => {
    if (!result?.commands.length) return;
    setRunning(true);
    setLog([]);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/browser/launch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectPath,
          action: 'run',
          commands: result.commands,
          port: result.ports?.[0] ?? null,
        }),
      });
      if (!res.ok) throw new Error(`API error ${res.status}`);
      startPoll(result.ports?.[0] ?? null);
    } catch (err: any) {
      setError(err.message);
      setRunning(false);
    }
  }, [result, projectPath, startPoll]);

  const stopServer = useCallback(async () => {
    await fetch(`${API_BASE}/api/browser/launch`, { method: 'DELETE' });
    if (pollRef.current) clearInterval(pollRef.current);
    setRunning(false);
    setRunStatus(null);
  }, []);

  return (
    <div className="absolute inset-0 bg-white flex flex-col z-20">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-zinc-100 bg-zinc-50 flex-shrink-0">
        <div className="w-6 h-6 rounded-lg bg-green-600 flex items-center justify-center">
          <Play size={12} className="text-white ml-0.5" />
        </div>
        <span className="text-sm font-semibold text-zinc-800 flex-1">Launch App</span>
        <span className="text-[10px] text-zinc-400 font-mono truncate max-w-[200px]">{projectPath}</span>
        <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-zinc-100 text-zinc-400">
          <X size={14} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Provider badge */}
        {activeProvider && (
          <div className="flex items-center gap-2 text-[10px] text-zinc-400">
            <span className="px-2 py-0.5 bg-zinc-100 rounded-full font-medium text-zinc-600">
              {activeProvider.name}
            </span>
            <span>{activeProvider.models?.[0] ?? 'default model'}</span>
          </div>
        )}

        {/* Analyzing spinner */}
        {analyzing && (
          <div className="flex items-center gap-3 py-6 justify-center text-zinc-400">
            <Loader2 size={18} className="animate-spin" />
            <span className="text-sm">Analyzing project…</span>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="flex items-start gap-2 p-3 bg-red-50 text-red-600 rounded-xl text-xs">
            <AlertTriangle size={13} className="flex-shrink-0 mt-0.5" />
            <div className="flex-1">{error}</div>
            <button onClick={analyze} className="text-red-500 underline flex-shrink-0">Retry</button>
          </div>
        )}

        {/* Result */}
        {result && !analyzing && (
          <div className="space-y-3">
            {result.notes && (
              <p className="text-xs text-zinc-500 italic">{result.notes}</p>
            )}

            {/* Commands */}
            <div className="rounded-xl border border-zinc-200 overflow-hidden">
              <div className="px-3 py-2 bg-zinc-50 border-b border-zinc-100 flex items-center gap-2">
                <Terminal size={11} className="text-zinc-400" />
                <span className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">Commands to run</span>
              </div>
              <div className="p-3 space-y-1.5">
                {result.commands.map((cmd, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <span className="text-[9px] text-zinc-300 font-mono mt-0.5 flex-shrink-0 w-4">{i + 1}.</span>
                    <code className="text-[11px] font-mono text-zinc-800 break-all">{cmd}</code>
                  </div>
                ))}
              </div>
            </div>

            {result.ports?.length > 0 && (
              <p className="text-[10px] text-zinc-400">
                Expected port{result.ports.length > 1 ? 's' : ''}: {result.ports.map(p => (
                  <span key={p} className="font-mono bg-zinc-100 px-1 rounded">{p}</span>
                ))}
              </p>
            )}
          </div>
        )}

        {/* Log output */}
        {(log.length > 0 || running) && (
          <div className="rounded-xl border border-zinc-200 overflow-hidden">
            <button
              onClick={() => setLogExpanded(v => !v)}
              className="w-full px-3 py-2 bg-zinc-900 text-zinc-300 flex items-center gap-2 text-[10px] font-mono"
            >
              <Terminal size={10} />
              <span className="flex-1 text-left">Terminal output</span>
              {running && <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse flex-shrink-0" />}
              {logExpanded ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
            </button>
            {logExpanded && (
              <div className="bg-zinc-950 p-3 max-h-48 overflow-y-auto">
                {log.map((line, i) => (
                  <div key={i} className="text-[10px] font-mono text-zinc-300 leading-relaxed whitespace-pre-wrap break-all">{line}</div>
                ))}
                {running && log.length === 0 && (
                  <div className="text-[10px] font-mono text-zinc-500 animate-pulse">Waiting for output…</div>
                )}
                <div ref={logEndRef} />
              </div>
            )}
          </div>
        )}

        {/* Detected URL */}
        {runStatus?.url && (
          <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-xl">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse flex-shrink-0" />
            <span className="text-xs text-green-700 flex-1 font-mono">{runStatus.url}</span>
            <button
              onClick={() => onConnected(runStatus.url!)}
              className="px-3 py-1 bg-green-600 text-white text-[10px] font-bold rounded-lg hover:bg-green-700"
            >
              Connect
            </button>
          </div>
        )}
      </div>

      {/* Footer actions */}
      <div className="px-4 py-3 border-t border-zinc-100 bg-zinc-50 flex items-center gap-2 flex-shrink-0">
        {!running ? (
          <>
            <button
              onClick={analyze}
              disabled={analyzing}
              className="px-3 py-1.5 text-[10px] font-semibold text-zinc-600 bg-zinc-100 hover:bg-zinc-200 rounded-lg disabled:opacity-40 transition-colors"
            >
              Re-analyze
            </button>
            {result?.commands.length ? (
              <button
                onClick={runCommands}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white text-xs font-bold rounded-lg hover:bg-green-700 transition-colors"
              >
                <Play size={12} /> Run
              </button>
            ) : null}
          </>
        ) : (
          <button
            onClick={stopServer}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-red-500 text-white text-xs font-bold rounded-lg hover:bg-red-600 transition-colors"
          >
            <Square size={12} /> Stop Server
          </button>
        )}
      </div>
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────

const BrowserPanel: React.FC<BrowserPanelProps> = ({ isOpen, onClose }) => {
  const { projects, selectedProjectId } = useHiveStore();
  const selectedProject = projects.find((p: any) => p.id === selectedProjectId);
  const projectPath: string | null = selectedProject?.path ?? null;

  // Connection state
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [connectUrl, setConnectUrl] = useState('http://localhost:5173');
  const [iframeUrl, setIframeUrl] = useState<string | null>(null);
  const [inputUrl, setInputUrl] = useState('');
  const [showLaunchApp, setShowLaunchApp] = useState(false);

  // Picker state
  const [pickerActive, setPickerActive] = useState(false);
  const [pinnedElements, setPinnedElements] = useState<PickedElement[]>([]);
  const [pinnedBoxes, setPinnedBoxes] = useState<Array<{ selector: string; x: number; y: number; width: number; height: number }>>([]);
  const [pickerError, setPickerError] = useState<string | null>(null);

  // React Grab state
  const [reactGrabEnabled, setReactGrabEnabled] = useState(false);
  const [reactGrabInjecting, setReactGrabInjecting] = useState(false);

  // Page info for coordinate mapping
  const [pageInfo, setPageInfo] = useState<{ viewportWidth: number; viewportHeight: number }>({
    viewportWidth: 1280,
    viewportHeight: 800,
  });

  // Iframe load / X-Frame error
  const [iframeError, setIframeError] = useState(false);

  const iframeRef = useRef<HTMLIFrameElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // ── Restore connection status on open ───────────────────────────────────
  useEffect(() => {
    if (!isOpen) return;
    fetch(`${API}/browser/connect`)
      .then(r => r.json())
      .then(data => {
        if (data.connected) {
          setConnected(true);
          setIframeUrl(data.url || '');
          setInputUrl(data.url || '');
          setPageInfo({ viewportWidth: data.viewportWidth || 1280, viewportHeight: data.viewportHeight || 800 });
        }
      })
      .catch(() => {});
  }, [isOpen]);

  // ── Connect: load iframe + spin up Puppeteer for React Grab ─────────────
  const handleConnect = useCallback(async () => {
    const trimmed = connectUrl.trim();
    if (!trimmed) return;
    const normalised = /^https?:\/\//i.test(trimmed) ? trimmed : `http://${trimmed}`;

    setConnecting(true);
    setIframeError(false);
    try {
      // Load iframe immediately (feels instant)
      setIframeUrl(normalised);
      setInputUrl(normalised);

      // Connect Puppeteer in background for element-at-point + React Grab
      const res = await fetch(`${API}/browser/connect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: normalised }),
      });
      const data = res.ok ? await res.json() : null;
      setConnected(true);
      if (data?.viewportWidth) {
        setPageInfo({ viewportWidth: data.viewportWidth, viewportHeight: data.viewportHeight });
      }
    } catch {
      // If Puppeteer fails, iframe still shows the page — still mark connected
      setConnected(true);
    } finally {
      setConnecting(false);
    }
  }, [connectUrl]);

  const handleDisconnect = useCallback(async () => {
    try {
      await fetch(`${API}/browser/connect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'disconnect' }),
      });
    } catch {}
    setConnected(false);
    setIframeUrl(null);
    setInputUrl('');
    setPinnedElements([]);
    setPinnedBoxes([]);
    setPickerActive(false);
    setReactGrabEnabled(false);
  }, []);

  const navigate = useCallback(async (targetUrl: string) => {
    const trimmed = targetUrl.trim();
    if (!trimmed) return;
    const normalised = /^https?:\/\//i.test(trimmed) ? trimmed : `http://${trimmed}`;
    setIframeError(false);
    setIframeUrl(normalised);
    setInputUrl(normalised);

    // Keep Puppeteer in sync
    try {
      await fetch(`${API}/browser/screenshot?url=${encodeURIComponent(normalised)}`);
    } catch { /* non-fatal */ }
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      if (!connected) handleConnect();
      else navigate(inputUrl);
    }
  };

  const handlePick = useCallback((el: PickedElement) => {
    setPinnedElements(prev => {
      if (prev.some(p => p.selector === el.selector)) return prev;
      const next = [...prev, el];
      window.dispatchEvent(new CustomEvent('queenbee:elements-pinned', { detail: next }));
      return next;
    });
    if (el.boundingBox) {
      setPinnedBoxes(prev => [
        ...prev,
        { selector: el.selector, x: el.boundingBox!.x, y: el.boundingBox!.y, width: el.boundingBox!.width, height: el.boundingBox!.height },
      ]);
    }
    setPickerActive(false);
  }, []);

  const removePin = useCallback((selector: string) => {
    setPinnedElements(prev => {
      const next = prev.filter(p => p.selector !== selector);
      window.dispatchEvent(new CustomEvent('queenbee:elements-pinned', { detail: next }));
      return next;
    });
    setPinnedBoxes(prev => prev.filter(b => b.selector !== selector));
  }, []);

  const clearAllPins = useCallback(() => {
    setPinnedElements([]);
    setPinnedBoxes([]);
    window.dispatchEvent(new CustomEvent('queenbee:elements-pinned', { detail: [] }));
  }, []);

  const toggleReactGrab = useCallback(async () => {
    if (reactGrabEnabled) {
      setReactGrabEnabled(false);
      return;
    }
    setReactGrabInjecting(true);
    try {
      await fetch(`${API}/browser/grab`, { method: 'POST' });
      setReactGrabEnabled(true);
    } catch {
      setReactGrabEnabled(true);
    } finally {
      setReactGrabInjecting(false);
    }
  }, [reactGrabEnabled]);

  const handleIframeLoad = () => {
    setIframeError(false);
  };

  const handleLaunchConnected = useCallback((url: string) => {
    setShowLaunchApp(false);
    setConnectUrl(url);
    setIframeUrl(url);
    setInputUrl(url);
    setConnected(true);
    setIframeError(false);
    // Spin up Puppeteer in background
    fetch(`${API}/browser/connect`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
    }).catch(() => {});
  }, []);

  // Detect X-Frame-Options blocks: iframe loads but shows blank (we can't truly detect cross-origin failures)
  // We just expose a manual "blocked?" hint button instead.

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ y: 40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 40, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 28 }}
          className="fixed inset-4 md:inset-8 bg-white rounded-2xl shadow-2xl z-[70] flex flex-col overflow-hidden border border-zinc-200"
        >
          {/* ── Header / URL bar ─────────────────────────────────────────────── */}
          <div className="flex items-center gap-2 px-4 py-3 border-b border-zinc-100 bg-zinc-50 flex-shrink-0">
            <div className={`w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 ${connected ? 'bg-green-600' : 'bg-zinc-400'}`}>
              {connected ? <Wifi size={13} className="text-white" /> : <WifiOff size={13} className="text-white" />}
            </div>

            <div className="flex-1 flex items-center gap-2 bg-white border border-zinc-200 rounded-xl px-3 py-1.5">
              <input
                ref={inputRef}
                type="text"
                value={connected ? inputUrl : connectUrl}
                onChange={e => connected ? setInputUrl(e.target.value) : setConnectUrl(e.target.value)}
                onKeyDown={handleKeyDown}
                onFocus={e => e.target.select()}
                placeholder={connected ? 'Navigate to URL...' : 'Enter your dev server URL (e.g. http://localhost:5173)'}
                className="flex-1 text-xs font-mono text-zinc-800 bg-transparent outline-none min-w-0"
              />
              {connecting && <Loader2 size={12} className="animate-spin text-zinc-400 flex-shrink-0" />}
            </div>

            {!connected ? (
              <button
                onClick={handleConnect}
                disabled={connecting}
                className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-40 transition-colors flex-shrink-0"
              >
                {connecting ? 'Connecting…' : 'Connect'}
              </button>
            ) : (
              <>
                <button
                  onClick={() => navigate(inputUrl)}
                  className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider bg-zinc-900 text-white rounded-lg hover:bg-zinc-800 transition-colors flex-shrink-0"
                >
                  Go
                </button>

                {/* Element picker toggle */}
                <button
                  onClick={() => { setPickerActive(v => !v); setPickerError(null); }}
                  title={pickerActive ? 'Exit Pick Mode' : 'Pick Element'}
                  className={`p-2 rounded-lg transition-colors flex-shrink-0 ${
                    pickerActive ? 'bg-indigo-100 text-indigo-600' : 'hover:bg-zinc-100 text-zinc-400'
                  }`}
                >
                  <Target size={16} />
                </button>

                {/* React Grab toggle */}
                <button
                  onClick={toggleReactGrab}
                  disabled={reactGrabInjecting}
                  title={reactGrabEnabled
                    ? 'React Grab active — picks show component name + source file'
                    : 'Enable React Grab to enrich picked elements with React component info'}
                  className={`p-2 rounded-lg transition-colors flex-shrink-0 ${
                    reactGrabEnabled ? 'bg-violet-100 text-violet-600' : 'hover:bg-zinc-100 text-zinc-400'
                  }`}
                >
                  {reactGrabInjecting ? <Loader2 size={14} className="animate-spin" /> : <Grab size={14} />}
                </button>

                {/* Reload iframe */}
                <button
                  onClick={() => { setIframeError(false); if (iframeRef.current) iframeRef.current.src = iframeUrl ?? ''; }}
                  className="p-2 rounded-lg hover:bg-zinc-100 text-zinc-400 transition-colors flex-shrink-0"
                  title="Reload"
                >
                  <RefreshCw size={14} />
                </button>

                {iframeUrl && (
                  <a href={iframeUrl} target="_blank" rel="noopener noreferrer"
                    className="p-2 rounded-lg hover:bg-zinc-100 text-zinc-400 transition-colors flex-shrink-0" title="Open in new tab">
                    <ExternalLink size={14} />
                  </a>
                )}

                <button
                  onClick={handleDisconnect}
                  className="p-2 rounded-lg hover:bg-red-50 text-red-400 transition-colors flex-shrink-0"
                  title="Disconnect"
                >
                  <WifiOff size={14} />
                </button>
              </>
            )}

            <button onClick={onClose} className="p-2 rounded-lg hover:bg-zinc-100 text-zinc-400 transition-colors flex-shrink-0">
              <X size={15} />
            </button>
          </div>

          {/* ── Pinned element chips ──────────────────────────────────────────── */}
          <AnimatePresence>
            {pinnedElements.length > 0 && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="flex items-center gap-2 px-4 py-2 bg-indigo-50 border-b border-indigo-100 flex-wrap">
                  <Target size={11} className="text-indigo-500 flex-shrink-0" />
                  <span className="text-[10px] font-semibold text-indigo-600 uppercase tracking-wider flex-shrink-0">
                    Pinned ({pinnedElements.length}):
                  </span>
                  {pinnedElements.map(el => (
                    <div key={el.selector} className="flex items-center gap-1 px-1.5 py-0.5 bg-indigo-100 rounded text-[10px] font-mono text-indigo-800">
                      {el.componentName ? (
                        <>
                          <span className="text-violet-600 font-semibold max-w-[100px] truncate" title={el.componentName}>
                            {el.componentName}
                          </span>
                          <span className="text-indigo-400">/</span>
                          <span className="max-w-[80px] truncate text-indigo-600" title={el.selector}>{el.selector}</span>
                          {el.reactFile && (
                            <span className="text-[9px] text-indigo-400 max-w-[80px] truncate" title={el.reactFile}>
                              {el.reactFile.split('/').pop()}
                              {el.reactLine ? `:${el.reactLine}` : ''}
                            </span>
                          )}
                        </>
                      ) : (
                        <span className="max-w-[120px] truncate">{el.selector}</span>
                      )}
                      <button onClick={() => removePin(el.selector)} className="p-0.5 hover:bg-indigo-200 rounded flex-shrink-0">
                        <X size={8} />
                      </button>
                    </div>
                  ))}
                  <button
                    onClick={clearAllPins}
                    className="ml-auto flex items-center gap-1 px-1.5 py-0.5 text-[9px] text-indigo-400 hover:text-indigo-600 transition-colors"
                  >
                    <Trash2 size={9} /> Clear all
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {pickerError && (
            <div className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-500 text-xs border-b border-red-100">
              <AlertTriangle size={11} />
              {pickerError}
              <button onClick={() => setPickerError(null)} className="ml-auto"><X size={11} /></button>
            </div>
          )}

          {/* ── Main content ─────────────────────────────────────────────────── */}
          <div className="flex-1 overflow-hidden bg-zinc-100 relative" ref={containerRef}>
            {/* Launch App panel (full overlay) */}
            {showLaunchApp && projectPath && (
              <LaunchAppPanel
                projectPath={projectPath}
                onConnected={handleLaunchConnected}
                onClose={() => setShowLaunchApp(false)}
              />
            )}

            {/* Not connected: landing screen */}
            {!connected && !connecting && !showLaunchApp && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-zinc-200 flex items-center justify-center">
                  <Globe size={32} className="text-zinc-400" />
                </div>
                <div className="text-center">
                  <h3 className="text-sm font-semibold text-zinc-700 mb-1">Connect to your dev server</h3>
                  <p className="text-xs text-zinc-400 max-w-xs">
                    Enter your local development URL above, or let QueenBee launch it for you.
                  </p>
                </div>
                {projectPath && (
                  <button
                    onClick={() => setShowLaunchApp(true)}
                    className="flex items-center gap-2 px-4 py-2.5 bg-green-600 text-white text-xs font-bold rounded-xl hover:bg-green-700 transition-colors shadow-sm"
                  >
                    <Play size={13} /> Launch App
                  </button>
                )}
                <div className="flex gap-2 text-[10px] text-zinc-400">
                  {['localhost:3000', 'localhost:5173', 'localhost:8080'].map(h => (
                    <button
                      key={h}
                      onClick={() => setConnectUrl(`http://${h}`)}
                      className="px-2 py-1 bg-zinc-200 hover:bg-zinc-300 rounded font-mono transition-colors"
                    >
                      {h}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {connecting && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-zinc-400">
                <Loader2 size={28} className="animate-spin" />
                <div className="text-sm">Connecting…</div>
              </div>
            )}

            {/* Live iframe */}
            {connected && iframeUrl && (
              <div className="absolute inset-0">
                <iframe
                  ref={iframeRef}
                  src={iframeUrl}
                  className="w-full h-full border-none bg-white"
                  title="Inline Browser"
                  onLoad={handleIframeLoad}
                  // Allow same-origin scripts; allow-popups so links work in new tabs
                  sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals"
                />

                {/* Pick-mode overlay — transparent, sits above iframe */}
                <IframePicker
                  active={pickerActive}
                  pageWidth={pageInfo.viewportWidth}
                  pageHeight={pageInfo.viewportHeight}
                  reactGrabEnabled={reactGrabEnabled}
                  onPick={handlePick}
                  onError={msg => setPickerError(msg)}
                  pinnedBoxes={pinnedBoxes}
                  containerRef={containerRef}
                />
              </div>
            )}

            {/* X-Frame-Options hint */}
            {iframeError && (
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 px-4 py-2 bg-amber-50 border border-amber-200 rounded-xl text-amber-700 text-xs shadow-md">
                <AlertTriangle size={13} />
                Page blocked iframe embedding.
                {iframeUrl && (
                  <a href={iframeUrl} target="_blank" rel="noopener noreferrer" className="underline font-medium">
                    Open in new tab
                  </a>
                )}
              </div>
            )}
          </div>

          {/* ── Status bar ───────────────────────────────────────────────────── */}
          <div className="px-4 py-1.5 border-t border-zinc-100 bg-zinc-50 flex items-center gap-3 flex-shrink-0">
            <div className={`w-2 h-2 rounded-full flex-shrink-0 ${connected ? 'bg-green-400' : 'bg-zinc-300'}`} />
            <span className="text-[9px] text-zinc-400 font-mono truncate flex-1">
              {connected ? iframeUrl || 'Connected' : 'Not connected'}
            </span>
            {pickerActive && (
              <span className="text-[9px] text-indigo-500 flex items-center gap-1 flex-shrink-0">
                <Target size={9} /> Pick mode active
              </span>
            )}
            {reactGrabEnabled && (
              <span className="text-[9px] text-violet-500 flex items-center gap-1 flex-shrink-0">
                <Grab size={9} /> React Grab on
              </span>
            )}
            {pinnedElements.length > 0 && (
              <span className="text-[9px] text-green-500 flex-shrink-0">
                {pinnedElements.length} pinned
              </span>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default BrowserPanel;
