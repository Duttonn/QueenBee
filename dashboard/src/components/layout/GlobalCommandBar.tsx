import React, { useState } from 'react';

/**
 * GlobalCommandBar - The "Queen Bee" interface for Codex Hive.
 * Features:
 * - Idle state: An elegant Queen Bee logo at top-center.
 * - Interaction: Morphs into a wide, brilliant white command bar on hover.
 */
const GlobalCommandBar = () => {
  const [isHovered, setIsHovered] = useState(false);
  const [command, setCommand] = useState('');

  return (
    <div 
      className={`fixed top-0 left-1/2 -translate-x-1/2 z-[100] transition-all duration-700 ease-in-out
        ${isHovered ? 'top-10 scale-100' : 'top-4 scale-100'}
      `}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => !command && setIsHovered(false)}
    >
      <div className={`
        relative transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] flex items-center justify-center
        ${isHovered 
          ? 'w-[700px] bg-white shadow-[0_20px_50px_rgba(0,0,0,0.2)] rounded-2xl p-6 border-none' 
          : 'w-14 h-14 bg-slate-900 border border-slate-700 rounded-full shadow-lg cursor-pointer'}
      `}>
        
        {/* The Queen Bee / Logo */}
        <div className={`transition-all duration-500 absolute ${isHovered ? 'left-6 scale-75 opacity-20' : 'scale-100 opacity-100'}`}>
          <span className="text-2xl" role="img" aria-label="Queen Bee">👑🐝</span>
        </div>

        {/* Input Field (Visible only when hovered) */}
        <div className={`flex items-center w-full gap-3 transition-opacity duration-300 ${isHovered ? 'opacity-100 delay-200' : 'opacity-0 pointer-events-none'}`}>
          <div className="w-2 h-2 rounded-full bg-blue-600 animate-pulse ml-10" />
          <input 
            type="text"
            placeholder="Command the Hive..."
            className="bg-transparent border-none outline-none w-full font-medium text-slate-900 text-xl placeholder:text-slate-300"
            value={command}
            onChange={(e) => setCommand(e.target.value)}
            autoFocus={isHovered}
          />
          <div className="flex gap-2">
            <span className="text-[10px] bg-slate-100 text-slate-400 px-2 py-1 rounded font-mono">⌘K</span>
          </div>
        </div>

        {/* The Hive Title (appears next to logo when idle) */}
        {!isHovered && (
          <div className="absolute -bottom-6 whitespace-nowrap text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
            The Hive
          </div>
        )}

        {/* Quick Actions (Dropdown style when expanded) */}
        {isHovered && (
          <div className="absolute top-full left-0 w-full mt-4 bg-white/90 backdrop-blur-md rounded-2xl shadow-xl p-4 border border-white/20 animate-in fade-in slide-in-from-top-4 duration-500">
             <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-blue-600 text-white shadow-lg shadow-blue-200 cursor-pointer transition-all hover:scale-[1.02] flex items-center gap-3">
                  <div className="text-xl">✨</div>
                  <div className="flex flex-col">
                    <div className="text-xs font-bold uppercase">Suggest a Prompt</div>
                    <div className="text-[10px] opacity-80">Queen Bee scans & drafts improvements</div>
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 hover:bg-blue-50 cursor-pointer transition-colors flex items-center gap-3">
                  <div className="text-xl">🤖</div>
                  <div className="flex flex-col">
                    <div className="text-xs font-bold text-slate-700 uppercase">Spawn Agent</div>
                    <div className="text-[10px] text-slate-400">Deploy a worker to a project</div>
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 hover:bg-blue-50 cursor-pointer transition-colors flex items-center gap-3">
                  <div className="text-xl">🌿</div>
                  <div className="flex flex-col">
                    <div className="text-xs font-bold text-slate-700 uppercase">New WorkTree</div>
                    <div className="text-[10px] text-slate-400">Create isolated feature branch</div>
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 hover:bg-blue-50 cursor-pointer transition-colors flex items-center gap-3">
                  <div className="text-xl">📊</div>
                  <div className="flex flex-col">
                    <div className="text-xs font-bold text-slate-700 uppercase">Hive Status</div>
                    <div className="text-[10px] text-slate-400">Monitor all parallel agents</div>
                  </div>
                </div>
             </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default GlobalCommandBar;
