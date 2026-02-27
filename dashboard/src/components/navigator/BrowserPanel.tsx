import React, { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Globe, Target, Loader2, AlertTriangle, X, RefreshCw, ExternalLink } from 'lucide-react';
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
  const [url, setUrl] = useState('https://');
  const [inputUrl, setInputUrl] = useState('https://');
  const [screenshot, setScreenshot] = useState<string | null>(null);
  const [loadingScreenshot, setLoadingScreenshot] = useState(false);
  const [screenshotError, setScreenshotError] = useState<string | null>(null);
  const [pickerActive, setPickerActive] = useState(false);
  const [pickedElement, setPickedElement] = useState<PickedElement | null>(null);
  const [pickerError, setPickerError] = useState<string | null>(null);
  const [imgDims, setImgDims] = useState({ w: 0, h: 0 });

  const imgRef = useRef<HTMLImageElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const navigate = useCallback(async (targetUrl: string) => {
    const trimmed = targetUrl.trim();
    if (!trimmed || trimmed === 'https://') return;

    const normalised = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
    setUrl(normalised);
    setInputUrl(normalised);
    setScreenshot(null);
    setScreenshotError(null);
    setPickedElement(null);
    setPickerActive(false);
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
    if (e.key === 'Enter') navigate(inputUrl);
  };

  const handleImageLoad = () => {
    if (imgRef.current) {
      setImgDims({
        w: imgRef.current.offsetWidth,
        h: imgRef.current.offsetHeight,
      });
    }
  };

  const handlePick = useCallback((el: PickedElement) => {
    setPickedElement(el);
    setPickerActive(false);

    // Inject chip into ComposerBar via custom event
    window.dispatchEvent(
      new CustomEvent('queenbee:element-picked', { detail: el })
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
            <div className="w-6 h-6 rounded-lg bg-blue-600 flex items-center justify-center flex-shrink-0">
              <Globe size={13} className="text-white" />
            </div>

            {/* URL input */}
            <div className="flex-1 flex items-center gap-2 bg-white border border-zinc-200 rounded-xl px-3 py-1.5">
              <input
                ref={inputRef}
                type="text"
                value={inputUrl}
                onChange={e => setInputUrl(e.target.value)}
                onKeyDown={handleKeyDown}
                onFocus={e => e.target.select()}
                placeholder="Enter URL and press Enter"
                className="flex-1 text-xs font-mono text-zinc-800 bg-transparent outline-none min-w-0"
              />
              {loadingScreenshot && <Loader2 size={12} className="animate-spin text-zinc-400 flex-shrink-0" />}
            </div>

            {/* Go button */}
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
                setPickedElement(null);
                setPickerError(null);
              }}
              title={pickerActive ? 'Exit Pick Mode' : 'Pick Element'}
              disabled={!screenshot}
              className={`p-2 rounded-lg transition-colors flex-shrink-0 ${
                pickerActive
                  ? 'bg-indigo-100 text-indigo-600'
                  : 'hover:bg-zinc-100 text-zinc-400 disabled:opacity-30'
              }`}
            >
              <Target size={16} />
            </button>

            {/* Refresh */}
            {screenshot && (
              <button
                onClick={() => navigate(url)}
                disabled={loadingScreenshot}
                className="p-2 rounded-lg hover:bg-zinc-100 text-zinc-400 transition-colors flex-shrink-0"
                title="Refresh"
              >
                <RefreshCw size={14} className={loadingScreenshot ? 'animate-spin' : ''} />
              </button>
            )}

            {/* Open in new tab */}
            {url && url !== 'https://' && (
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 rounded-lg hover:bg-zinc-100 text-zinc-400 transition-colors flex-shrink-0"
                title="Open in new tab"
              >
                <ExternalLink size={14} />
              </a>
            )}

            <button onClick={onClose} className="p-2 rounded-lg hover:bg-zinc-100 text-zinc-400 transition-colors flex-shrink-0">
              <X size={15} />
            </button>
          </div>

          {/* Picked element chip */}
          <AnimatePresence>
            {pickedElement && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="flex items-center gap-2 px-4 py-2 bg-indigo-50 border-b border-indigo-100">
                  <Target size={11} className="text-indigo-500 flex-shrink-0" />
                  <span className="text-[10px] font-semibold text-indigo-600 uppercase tracking-wider flex-shrink-0">
                    Picked:
                  </span>
                  <code className="text-[10px] text-indigo-800 font-mono bg-indigo-100 px-1.5 py-0.5 rounded truncate max-w-xs">
                    {pickedElement.selector}
                  </code>
                  <span className="text-[9px] text-indigo-400 ml-1 flex-shrink-0">Injected into Composer</span>
                  <button
                    onClick={() => setPickedElement(null)}
                    className="ml-auto p-0.5 rounded hover:bg-indigo-100 text-indigo-400"
                  >
                    <X size={10} />
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

          {/* Screenshot area */}
          <div className="flex-1 overflow-auto bg-zinc-100 relative">
            {!screenshot && !loadingScreenshot && !screenshotError && (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-zinc-300 gap-3">
                <Globe size={40} className="opacity-30" />
                <div className="text-sm">Enter a URL above and click Go</div>
              </div>
            )}

            {loadingScreenshot && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-zinc-400">
                <Loader2 size={28} className="animate-spin" />
                <div className="text-sm">Taking screenshot...</div>
              </div>
            )}

            {screenshotError && !loadingScreenshot && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-red-400">
                <AlertTriangle size={28} />
                <div className="text-sm">{screenshotError}</div>
                <button
                  onClick={() => navigate(url)}
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
                      onPick={handlePick}
                      onError={msg => setPickerError(msg)}
                    />
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Status bar */}
          <div className="px-4 py-1.5 border-t border-zinc-100 bg-zinc-50 flex items-center gap-3 flex-shrink-0">
            <span className="text-[9px] text-zinc-400 font-mono truncate flex-1">{url}</span>
            {pickerActive && (
              <span className="text-[9px] text-indigo-500 flex items-center gap-1 flex-shrink-0">
                <Target size={9} /> Pick mode active
              </span>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default BrowserPanel;
