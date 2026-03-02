import React, { useState, useCallback } from 'react';
import { API_BASE } from '../../services/api';

const API = `${API_BASE}/api`;

export interface PickedElement {
  selector: string;
  html: string;
  tagName?: string;
  sourceFile?: string;
  sourceLine?: string;
  boundingBox?: { x: number; y: number; width: number; height: number };
}

interface ElementPickerProps {
  active: boolean;
  imageWidth: number;
  imageHeight: number;
  pageWidth?: number;
  pageHeight?: number;
  onPick: (el: PickedElement) => void;
  onError?: (msg: string) => void;
  /** Bounding boxes for pinned elements (page coords) */
  pinnedBoxes?: Array<{ selector: string; x: number; y: number; width: number; height: number }>;
}

const ElementPicker: React.FC<ElementPickerProps> = ({
  active,
  imageWidth,
  imageHeight,
  pageWidth,
  pageHeight,
  onPick,
  onError,
  pinnedBoxes = [],
}) => {
  const [loading, setLoading] = useState(false);
  const [crosshair, setCrosshair] = useState<{ x: number; y: number } | null>(null);
  const [hoverBox, setHoverBox] = useState<{ x: number; y: number; w: number; h: number } | null>(null);

  const pw = pageWidth || 1280;
  const ph = pageHeight || 800;
  const scaleX = imageWidth / pw;
  const scaleY = imageHeight / ph;

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
      const relX = (e.clientX - rect.left) / imageWidth;
      const relY = (e.clientY - rect.top) / imageHeight;

      const pageX = Math.round(relX * pw);
      const pageY = Math.round(relY * ph);

      setLoading(true);
      try {
        const res = await fetch(`${API}/browser/element-at-point?x=${pageX}&y=${pageY}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();

        // Show bounding box highlight
        if (data.boundingBox) {
          setHoverBox({
            x: data.boundingBox.x * scaleX,
            y: data.boundingBox.y * scaleY,
            w: data.boundingBox.width * scaleX,
            h: data.boundingBox.height * scaleY,
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
        onPick(picked);
      } catch (err: any) {
        onError?.(err?.message || 'Failed to pick element');
      } finally {
        setLoading(false);
      }
    },
    [active, loading, imageWidth, imageHeight, pw, ph, scaleX, scaleY, onPick, onError]
  );

  if (!active && pinnedBoxes.length === 0) return null;

  return (
    <div
      className="absolute inset-0 z-10"
      style={{ cursor: active ? (loading ? 'wait' : 'crosshair') : 'default', pointerEvents: active ? 'auto' : 'none' }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
    >
      {/* Green outlines for already-pinned elements */}
      {pinnedBoxes.map((box, i) => (
        <div
          key={`pin-${i}`}
          className="absolute pointer-events-none border-2 border-green-400 rounded-sm"
          style={{
            left: box.x * scaleX,
            top: box.y * scaleY,
            width: box.width * scaleX,
            height: box.height * scaleY,
          }}
        >
          <div className="absolute -top-4 left-0 px-1 py-0.5 bg-green-500 text-white text-[8px] rounded-sm font-mono">
            {box.selector}
          </div>
        </div>
      ))}

      {/* Hover bounding box highlight (blue) */}
      {hoverBox && active && (
        <div
          className="absolute pointer-events-none border-2 border-indigo-400 bg-indigo-400/10 rounded-sm transition-all duration-75"
          style={{
            left: hoverBox.x,
            top: hoverBox.y,
            width: hoverBox.w,
            height: hoverBox.h,
          }}
        />
      )}

      {/* Crosshair lines */}
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
      {active && !crosshair && !loading && (
        <div className="absolute top-2 left-1/2 -translate-x-1/2 px-3 py-1.5 bg-indigo-600/90 text-white text-[10px] font-medium rounded-full shadow-lg">
          Click to pick an element
        </div>
      )}
    </div>
  );
};

export default ElementPicker;
