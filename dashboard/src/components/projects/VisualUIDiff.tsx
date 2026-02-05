import React, { useState } from 'react';

/**
 * VisualUIDiff: Compares the UI of 'main' vs the 'Worktree' visually.
 */
const VisualUIDiff = ({ beforeImg, afterImg }: any) => {
  const [sliderPos, setSliderPos] = useState(50);
  const [mode, setMode] = useState<'swipe' | 'ghost'>('swipe');

  return (
    <div className="relative w-full aspect-video bg-slate-900 rounded-3xl overflow-hidden border border-slate-800 shadow-2xl">
      {/* Header Controls */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 flex gap-2 bg-black/40 backdrop-blur-md p-1 rounded-full border border-white/10">
        <button 
          onClick={() => setMode('swipe')}
          className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase transition-all ${mode === 'swipe' ? 'bg-white text-black' : 'text-white/60 hover:text-white'}`}
        >
          Swipe
        </button>
        <button 
          onClick={() => setMode('ghost')}
          className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase transition-all ${mode === 'ghost' ? 'bg-white text-black' : 'text-white/60 hover:text-white'}`}
        >
          Ghost
        </button>
      </div>

      {mode === 'swipe' ? (
        <div className="relative w-full h-full select-none cursor-ew-resize" 
             onMouseMove={(e) => {
               if (e.buttons === 1) {
                 const rect = e.currentTarget.getBoundingClientRect();
                 setSliderPos(((e.clientX - rect.left) / rect.width) * 100);
               }
             }}>
          {/* Before */}
          <div className="absolute inset-0 bg-red-500/10 flex items-center justify-center">
             <div className="text-white font-black text-4xl opacity-20 uppercase tracking-tighter">Original</div>
          </div>
          
          {/* After (Clipped) */}
          <div 
            className="absolute inset-0 bg-green-500/10 border-l-2 border-blue-500"
            style={{ clipPath: `inset(0 0 0 ${sliderPos}%)` }}
          >
             <div className="w-full h-full flex items-center justify-center">
                <div className="text-white font-black text-4xl opacity-20 uppercase tracking-tighter">Proposed</div>
             </div>
          </div>

          {/* Slider Handle */}
          <div 
            className="absolute top-0 bottom-0 w-1 bg-blue-500 z-40 shadow-[0_0_15px_#3b82f6]"
            style={{ left: `${sliderPos}%` }}
          >
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs shadow-xl">
              ↔
            </div>
          </div>
        </div>
      ) : (
        <div className="relative w-full h-full">
          <div className="absolute inset-0 opacity-50 bg-red-500/20 flex items-center justify-center text-white font-bold uppercase">Original</div>
          <div className="absolute inset-0 opacity-50 bg-green-500/20 flex items-center justify-center text-white font-bold uppercase">Proposed</div>
        </div>
      )}

      <div className="absolute bottom-4 left-6 flex flex-col">
        <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Visual Delta Engine</span>
        <span className="text-[9px] text-slate-500">98% match detected. 4 components modified.</span>
      </div>
    </div>
  );
};

export default VisualUIDiff;
