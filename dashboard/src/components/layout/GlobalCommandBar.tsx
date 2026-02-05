import React, { useState, useEffect, useRef } from 'react';
import { Mic, Command, Search, Cpu, GitBranch, Zap, Layers } from 'lucide-react';

const GlobalCommandBar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Toggle with Cmd+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(prev => !prev);
      }
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Focus input when opened
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-start justify-center pt-[15vh]">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={() => setIsOpen(false)}
      ></div>

      {/* Command Modal */}
      <div className="relative w-full max-w-2xl bg-zinc-900/80 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200 ring-1 ring-black/5">
        
        {/* Header / Input Area */}
        <div className="flex items-center px-4 py-4 border-b border-white/5">
          <Command className="w-5 h-5 text-zinc-400 mr-4" strokeWidth={1.5} />
          <input
            ref={inputRef}
            type="text"
            className="flex-1 bg-transparent text-lg text-white placeholder-zinc-500 outline-none font-medium"
            placeholder="Command the Queen Bee..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          
          <div className="flex items-center gap-3">
             {/* Context Indicator */}
            <div className="hidden sm:flex items-center gap-1.5 px-2 py-1 bg-white/5 rounded-md text-[10px] text-zinc-400 font-mono border border-white/5">
               <GitBranch size={10} className="text-blue-500" strokeWidth={1.5} />
               <span>QueenBee / Core</span>
            </div>
            
            {/* Voice Toggle */}
            <button className="p-2 hover:bg-white/10 rounded-lg text-zinc-500 hover:text-white transition-colors">
              <Mic size={18} strokeWidth={1.5} />
            </button>
            
            <div className="px-2 py-1 bg-zinc-800/50 rounded text-[10px] text-zinc-400 font-mono border border-white/5">
              ESC
            </div>
          </div>
        </div>

        {/* Results / Actions Area */}
        <div className="max-h-[60vh] overflow-y-auto p-2">
          
          {/* Section: Suggested Actions */}
          <div className="mb-2">
            <div className="px-3 py-2 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
              Orchestration
            </div>
            <div className="space-y-1">
              <CommandItem icon={<Zap className="text-yellow-400" size={18} />} title="Spawn New Agent" shortcut="S" />
              <CommandItem icon={<Layers className="text-blue-400" size={18} />} title="Switch Project Workspace" />
              <CommandItem icon={<Cpu className="text-green-400" size={18} />} title="View Hive System Status" />
            </div>
          </div>

          {/* Section: Recent Context */}
          <div>
            <div className="px-3 py-2 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
              Recent Files
            </div>
            <div className="space-y-1">
              <CommandItem icon={<span className="text-zinc-500 text-xs font-mono">TS</span>} title="GlobalCommandBar.tsx" desc="dashboard/src/components/layout" />
              <CommandItem icon={<span className="text-zinc-500 text-xs font-mono">TS</span>} title="CodexLayout.tsx" desc="dashboard/src/components/layout" />
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="px-4 py-2 bg-zinc-950/30 border-t border-white/5 flex justify-between items-center text-[10px] text-zinc-500 font-medium">
           <span>Queen Bee Orchestrator v2.0</span>
           <div className="flex gap-2">
             <span>Select ↵</span>
             <span>Navigate ↑↓</span>
           </div>
        </div>

      </div>
    </div>
  );
};

const CommandItem = ({ icon, title, desc, shortcut }: any) => (
  <button className="w-full flex items-center px-3 py-3 rounded-lg hover:bg-white/5 hover:text-white group transition-all text-left">
    <div className="w-8 h-8 flex items-center justify-center mr-3 rounded-md bg-white/5 group-hover:bg-white/10 transition-colors">
      {icon}
    </div>
    <div className="flex-1">
      <div className="text-sm font-medium text-zinc-300 group-hover:text-white">{title}</div>
      {desc && <div className="text-xs text-zinc-500 group-hover:text-zinc-400">{desc}</div>}
    </div>
    {shortcut && (
      <span className="text-[10px] bg-zinc-800 group-hover:bg-blue-600 group-hover:text-white px-1.5 py-0.5 rounded text-zinc-400 font-mono transition-colors">
        {shortcut}
      </span>
    )}
  </button>
);

export default GlobalCommandBar;