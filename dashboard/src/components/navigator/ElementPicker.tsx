import React, { useState, useCallback } from 'react';
import { API_BASE } from '../../services/api';

const API = `${API_BASE}/api`;

export interface PickedElement {
  selector: string;
  html: string;
}

interface ElementPickerProps {
  /** Whether pick mode is active */
  active: boolean;
  /** The screenshot image element ref dimensions for coordinate mapping */
  imageWidth: number;
  imageHeight: number;
  /** The natural page dimensions (from backend, if known) */
  pageWidth?: number;
  pageHeight?: number;
  /** Called when an element is picked */
  onPick: (el: PickedElement) => void;
  /** Called on any error */
  onError?: (msg: string) => void;
}

const ElementPicker: React.FC<ElementPickerProps> = ({
  active,
  imageWidth,
  imageHeight,
  pageWidth,
  pageHeight,
  onPick,
  onError,
}) => {
  const [loading, setLoading] = useState(false);
  const [crosshair, setCrosshair] = useState<{ x: number; y: number } | null>(null);

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
  }, []);

  const handleClick = useCallback(
    async (e: React.MouseEvent<HTMLDivElement>) => {
      if (!active || loading) return;
      e.stopPropagation();

      const rect = e.currentTarget.getBoundingClientRect();
      const relX = (e.clientX - rect.left) / imageWidth;
      const relY = (e.clientY - rect.top) / imageHeight;

      // Map to page coordinates if known
      const pageX = pageWidth ? Math.round(relX * pageWidth) : Math.round(relX * 1280);
      const pageY = pageHeight ? Math.round(relY * pageHeight) : Math.round(relY * 800);

      setLoading(true);
      try {
        const res = await fetch(
          `${API}/browser/dom?selector=*&x=${pageX}&y=${pageY}`
        );
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data: { html: string; selector: string } = await res.json();
        onPick({ selector: data.selector, html: data.html });

        // Also emit custom event for ComposerBar or other listeners
        window.dispatchEvent(
          new CustomEvent('queenbee:element-picked', {
            detail: { selector: data.selector, html: data.html },
          })
        );
      } catch (err: any) {
        onError?.(err?.message || 'Failed to pick element');
      } finally {
        setLoading(false);
      }
    },
    [active, loading, imageWidth, imageHeight, pageWidth, pageHeight, onPick, onError]
  );

  if (!active) return null;

  return (
    <div
      className="absolute inset-0 z-10"
      style={{ cursor: loading ? 'wait' : 'crosshair' }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
    >
      {/* Crosshair lines */}
      {crosshair && !loading && (
        <>
          {/* Horizontal */}
          <div
            className="absolute pointer-events-none"
            style={{
              left: 0,
              right: 0,
              top: crosshair.y,
              height: 1,
              background: 'rgba(99,102,241,0.7)',
            }}
          />
          {/* Vertical */}
          <div
            className="absolute pointer-events-none"
            style={{
              top: 0,
              bottom: 0,
              left: crosshair.x,
              width: 1,
              background: 'rgba(99,102,241,0.7)',
            }}
          />
          {/* Tooltip */}
          <div
            className="absolute pointer-events-none px-2 py-1 bg-indigo-600 text-white text-[9px] rounded-md font-mono shadow-lg"
            style={{
              left: Math.min(crosshair.x + 8, imageWidth - 120),
              top: Math.max(crosshair.y - 28, 4),
            }}
          >
            {Math.round(crosshair.x)}, {Math.round(crosshair.y)}
          </div>
        </>
      )}

      {/* Loading spinner overlay */}
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/40">
          <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* Activation hint */}
      {!crosshair && !loading && (
        <div className="absolute top-2 left-1/2 -translate-x-1/2 px-3 py-1.5 bg-indigo-600/90 text-white text-[10px] font-medium rounded-full shadow-lg">
          Click to pick an element
        </div>
      )}
    </div>
  );
};

export default ElementPicker;
