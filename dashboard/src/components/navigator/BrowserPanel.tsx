import React, { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Globe, Target, Loader2, AlertTriangle, X, RefreshCw, ExternalLink, Trash2, Wifi, WifiOff } from 'lucide-react';
import ElementPicker, { type PickedElement } from './ElementPicker';
import { API_BASE } from '../../services/api';

const API = `${API_BASE}/api`;

// ─── Types ────────────────────────────────────────────────────────────────────

interface BrowserPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

// ─── Main Component ───────────────────────────────────────────────────────────

const BrowserPanel: React.FC<BrowserPanelProps> = ({ isOpen, onClose }) => {
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [connectUrl, setConnectUrl] = useState('http://localhost:3000');
  const [url, setUrl] = useState('');
  const [inputUrl, setInputUrl] = useState('');
  const [screenshot, setScreenshot] = useState<string | null>(null);
  const [loadingScreenshot, setLoadingScreenshot] = useState(false);
  const [screenshotError, setScreenshotError] = useState<string | null>(null);
  const [pickerActive, setPickerActive] = useState(false);
  const [pinnedElements, setPinnedElements] = useState<PickedElement[]>([]);
  const [pinnedBoxes, setPinnedBoxes] = useState<Array<{ selector: string; x: number; y: number; width: number; height: number }>>([]);
  const [pickerError, setPickerError] = useState<string | null>(null);
  const [imgDims, setImgDims] = useState({ w: 0, h: 0 });
  const [pageInfo, setPageInfo] = useState<{ viewportWidth: number; viewportHeight: number } | null>(null);

  const imgRef = useRef<HTMLImageElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const autoRefreshRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Check connection status on open ─────────────────────────────────────
  useEffect(() => {
    if (!isOpen) return;
    fetch(`${API}/browser/connect`)
      .then(r => r.json())
      .then(data => {
        if (data.connected) {
          setConnected(true);
          setUrl(data.url || '');
          setInputUrl(data.url || '');
          setPageInfo({ viewportWidth: data.viewportWidth || 1280, viewportHeight: data.viewportHeight || 800 });
          refreshScreenshot();
        }
      })
      .catch(() => {});
  }, [isOpen]);

  // ── Auto-refresh screenshot every 5s when connected ─────────────────────
  useEffect(() => {
    if (connected && isOpen) {
      autoRefreshRef.current = setInterval(() => {
        if (!loadingScreenshot && !pickerActive) refreshScreenshot();
      }, 5000);
    }
    return () => {
      if (autoRefreshRef.current) clearInterval(autoRefreshRef.current);
    };
  }, [connected, isOpen, loadingScreenshot, pickerActive]);

  const handleConnect = useCallback(async () => {
    const trimmed = connectUrl.trim();
    if (!trimmed) return;
    setConnecting(true);
    try {
      const res = await fetch(`${API}/browser/connect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: trimmed }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (data.connected) {
        setConnected(true);
        setUrl(data.pageUrl || trimmed);
        setInputUrl(data.pageUrl || trimmed);
        setPageInfo({ viewportWidth: data.viewportWidth || 1280, viewportHeight: data.viewportHeight || 800 });
        refreshScreenshot();
      }
    } catch (e: any) {
      setScreenshotError(e?.message || 'Failed to connect');
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
    setScreenshot(null);
    setUrl('');
    setPinnedElements([]);
    setPinnedBoxes([]);
  }, []);

  const refreshScreenshot = useCallback(async () => {
    setLoadingScreenshot(true);
    setScreenshotError(null);
    try {
      const res = await fetch(`${API}/browser/screenshot`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setScreenshot(data.screenshot);
    } catch (e: any) {
      setScreenshotError(e?.message || 'Failed to take screenshot');
    } finally {
      setLoadingScreenshot(false);
    }
  }, []);

  const navigate = useCallback(async (targetUrl: string) => {
    const trimmed = targetUrl.trim();
    if (!trimmed) return;
    const normalised = /^https?:\/\//i.test(trimmed) ? trimmed : `http://${trimmed}`;
    setUrl(normalised);
    setInputUrl(normalised);
    setScreenshotError(null);
    setLoadingScreenshot(true);
    try {
      const res = await fetch(`${API}/browser/screenshot?url=${encodeURIComponent(normalised)}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: { screenshot: string } = await res.json();
      setScreenshot(data.screenshot);
    } catch (e: any) {
      setScreenshotError(e?.message || 'Failed to take screenshot');
    } finally {
      setLoadingScreenshot(false);
    }
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      if (!connected) handleConnect();
      else navigate(inputUrl);
    }
  };

  const handleImageLoad = () => {
    if (imgRef.current) {
      setImgDims({ w: imgRef.current.offsetWidth, h: imgRef.current.offsetHeight });
    }
  };

  const handlePick = useCallback((el: PickedElement) => {
    // Don't add duplicates
    setPinnedElements(prev => {
      if (prev.some(p => p.selector === el.selector)) return prev;
      const next = [...prev, el];

      // Dispatch event for ComposerBar — send entire array
      window.dispatchEvent(
        new CustomEvent('queenbee:elements-pinned', { detail: next })
      );
      return next;
    });

    // Track bounding box for green overlay
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
      window.dispatchEvent(
        new CustomEvent('queenbee:elements-pinned', { detail: next })
      );
      return next;
    });
    setPinnedBoxes(prev => prev.filter(b => b.selector !== selector));
  }, []);

  const clearAllPins = useCallback(() => {
    setPinnedElements([]);
    setPinnedBoxes([]);
    window.dispatchEvent(
      new CustomEvent('queenbee:elements-pinned', { detail: [] })
    );
  }, []);

  // Update image dims on resize
  useEffect(() => {
    if (!screenshot) return;
    const observer = new ResizeObserver(() => {
      if (imgRef.current) {
        setImgDims({ w: imgRef.current.offsetWidth, h: imgRef.current.offsetHeight });
      }
    });
    if (imgRef.current) observer.observe(imgRef.current);
    return () => observer.disconnect();
  }, [screenshot]);

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
          {/* Header / URL bar */}
          <div className="flex items-center gap-2 px-4 py-3 border-b border-zinc-100 bg-zinc-50 flex-shrink-0">
            {/* Connection status dot */}
            <div className={`w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 ${connected ? 'bg-green-600' : 'bg-zinc-400'}`}>
              {connected ? <Wifi size={13} className="text-white" /> : <WifiOff size={13} className="text-white" />}
            </div>

            {/* URL input */}
            <div className="flex-1 flex items-center gap-2 bg-white border border-zinc-200 rounded-xl px-3 py-1.5">
              <input
                ref={inputRef}
                type="text"
                value={connected ? inputUrl : connectUrl}
                onChange={e => connected ? setInputUrl(e.target.value) : setConnectUrl(e.target.value)}
                onKeyDown={handleKeyDown}
                onFocus={e => e.target.select()}
                placeholder={connected ? 'Navigate to URL...' : 'Enter your dev server URL (e.g. http://localhost:3000)'}
                className="flex-1 text-xs font-mono text-zinc-800 bg-transparent outline-none min-w-0"
              />
              {(loadingScreenshot || connecting) && <Loader2 size={12} className="animate-spin text-zinc-400 flex-shrink-0" />}
            </div>

            {/* Connect / Go button */}
            {!connected ? (
              <button
                onClick={handleConnect}
                disabled={connecting}
                className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-40 transition-colors flex-shrink-0"
              >
                Connect
              </button>
            ) : (
              <>
                <button
                  onClick={() => navigate(inputUrl)}
                  disabled={loadingScreenshot}
                  className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider bg-zinc-900 text-white rounded-lg hover:bg-zinc-800 disabled:opacity-40 transition-colors flex-shrink-0"
                >
                  Go
                </button>

                {/* Element picker toggle */}
                <button
                  onClick={() => {
                    if (!screenshot) return;
                    setPickerActive(v => !v);
                    setPickerError(null);
                  }}
                  title={pickerActive ? 'Exit Pick Mode' : 'Pick Element'}
                  disabled={!screenshot}
                  className={`p-2 rounded-lg transition-colors flex-shrink-0 ${
                    pickerActive ? 'bg-indigo-100 text-indigo-600' : 'hover:bg-zinc-100 text-zinc-400 disabled:opacity-30'
                  }`}
                >
                  <Target size={16} />
                </button>

                {/* Refresh */}
                <button
                  onClick={refreshScreenshot}
                  disabled={loadingScreenshot}
                  className="p-2 rounded-lg hover:bg-zinc-100 text-zinc-400 transition-colors flex-shrink-0"
                  title="Refresh"
                >
                  <RefreshCw size={14} className={loadingScreenshot ? 'animate-spin' : ''} />
                </button>

                {/* Open in new tab */}
                {url && (
                  <a href={url} target="_blank" rel="noopener noreferrer"
                    className="p-2 rounded-lg hover:bg-zinc-100 text-zinc-400 transition-colors flex-shrink-0" title="Open in new tab">
                    <ExternalLink size={14} />
                  </a>
                )}

                {/* Disconnect */}
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

          {/* Pinned elements chips */}
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
                  {pinnedElements.map((el, i) => (
                    <div key={el.selector} className="flex items-center gap-1 px-1.5 py-0.5 bg-indigo-100 rounded text-[10px] font-mono text-indigo-800">
                      <span className="max-w-[120px] truncate">{el.selector}</span>
                      <button onClick={() => removePin(el.selector)} className="p-0.5 hover:bg-indigo-200 rounded">
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
            </div>
          )}

          {/* Screenshot area / Connection dialog */}
          <div className="flex-1 overflow-auto bg-zinc-100 relative">
            {/* Connection dialog when not connected */}
            {!connected && !connecting && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-zinc-200 flex items-center justify-center">
                  <Globe size={32} className="text-zinc-400" />
                </div>
                <div className="text-center">
                  <h3 className="text-sm font-semibold text-zinc-700 mb-1">Connect to your dev server</h3>
                  <p className="text-xs text-zinc-400 max-w-xs">
                    Enter your local development URL above and click Connect to start visual testing.
                  </p>
                </div>
                <div className="flex gap-2 text-[10px] text-zinc-400">
                  <span className="px-2 py-1 bg-zinc-200 rounded font-mono">localhost:3000</span>
                  <span className="px-2 py-1 bg-zinc-200 rounded font-mono">localhost:5173</span>
                  <span className="px-2 py-1 bg-zinc-200 rounded font-mono">localhost:8080</span>
                </div>
              </div>
            )}

            {connecting && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-zinc-400">
                <Loader2 size={28} className="animate-spin" />
                <div className="text-sm">Connecting to browser...</div>
              </div>
            )}

            {connected && !screenshot && !loadingScreenshot && !screenshotError && (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-zinc-300 gap-3">
                <Globe size={40} className="opacity-30" />
                <div className="text-sm">Navigate to a URL to see the page</div>
              </div>
            )}

            {loadingScreenshot && !connecting && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-zinc-400">
                <Loader2 size={28} className="animate-spin" />
                <div className="text-sm">Taking screenshot...</div>
              </div>
            )}

            {screenshotError && !loadingScreenshot && !connecting && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-red-400">
                <AlertTriangle size={28} />
                <div className="text-sm">{screenshotError}</div>
                <button
                  onClick={refreshScreenshot}
                  className="text-xs px-3 py-1.5 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-colors"
                >
                  Retry
                </button>
              </div>
            )}

            {screenshot && !loadingScreenshot && (
              <div className="relative inline-block min-w-full min-h-full flex items-start justify-center">
                <div className="relative">
                  <img
                    ref={imgRef}
                    src={`data:image/png;base64,${screenshot}`}
                    alt="Browser screenshot"
                    className="max-w-full block select-none"
                    style={{ display: 'block' }}
                    onLoad={handleImageLoad}
                    draggable={false}
                  />
                  {imgDims.w > 0 && imgDims.h > 0 && (
                    <ElementPicker
                      active={pickerActive}
                      imageWidth={imgDims.w}
                      imageHeight={imgDims.h}
                      pageWidth={pageInfo?.viewportWidth}
                      pageHeight={pageInfo?.viewportHeight}
                      onPick={handlePick}
                      onError={msg => setPickerError(msg)}
                      pinnedBoxes={pinnedBoxes}
                    />
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Status bar */}
          <div className="px-4 py-1.5 border-t border-zinc-100 bg-zinc-50 flex items-center gap-3 flex-shrink-0">
            <div className={`w-2 h-2 rounded-full flex-shrink-0 ${connected ? 'bg-green-400' : 'bg-zinc-300'}`} />
            <span className="text-[9px] text-zinc-400 font-mono truncate flex-1">
              {connected ? url || 'Connected' : 'Not connected'}
            </span>
            {pickerActive && (
              <span className="text-[9px] text-indigo-500 flex items-center gap-1 flex-shrink-0">
                <Target size={9} /> Pick mode active
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
