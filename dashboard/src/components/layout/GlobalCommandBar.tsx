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
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={() => setIsOpen(false)}
      ></div>

      {/* Command Modal */}
      <div className="relative w-full max-w-2xl bg-[#1e1e1e] border border-gray-700 rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header / Input Area */}
        <div className="flex items-center px-4 py-4 border-b border-gray-700 bg-[#252526]">
          <Command className="w-5 h-5 text-gray-400 mr-4" />
          <input
            ref={inputRef}
            type="text"
            className="flex-1 bg-transparent text-lg text-white placeholder-gray-500 outline-none"
            placeholder="Command the Queen Bee..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          
          <div className="flex items-center gap-3">
             {/* Context Indicator */}
            <div className="hidden sm:flex items-center gap-1.5 px-2 py-1 bg-[#0a0a0a] rounded text-[10px] text-gray-400 font-mono border border-gray-800">
               <GitBranch size={10} className="text-blue-500" />
               <span>QueenBee / Core</span>
            </div>
            
            {/* Voice Toggle */}
            <button className="p-2 hover:bg-gray-700 rounded-lg text-gray-400 hover:text-white transition-colors">
              <Mic size={18} />
            </button>
            
            <div className="px-2 py-1 bg-gray-800 rounded text-[10px] text-gray-400 font-mono">
              ESC
            </div>
          </div>
        </div>

        {/* Results / Actions Area */}
        <div className="max-h-[60vh] overflow-y-auto p-2">
          
          {/* Section: Suggested Actions */}
          <div className="mb-2">
            <div className="px-3 py-2 text-[10px] font-bold text-gray-500 uppercase tracking-widest">
              Orchestration
            </div>
            <div className="space-y-1">
              <CommandItem icon={<Zap className="text-yellow-400" />} title="Spawn New Agent" shortcut="S" />
              <CommandItem icon={<Layers className="text-blue-400" />} title="Switch Project Workspace" />
              <CommandItem icon={<Cpu className="text-green-400" />} title="View Hive System Status" />
            </div>
          </div>

          {/* Section: Recent Context */}
          <div>
            <div className="px-3 py-2 text-[10px] font-bold text-gray-500 uppercase tracking-widest">
              Recent Files
            </div>
            <div className="space-y-1">
              <CommandItem icon={<span className="text-gray-400 text-xs">TS</span>} title="GlobalCommandBar.tsx" desc="dashboard/src/components/layout" />
              <CommandItem icon={<span className="text-gray-400 text-xs">TS</span>} title="CodexLayout.tsx" desc="dashboard/src/components/layout" />
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="px-4 py-2 bg-[#252526] border-t border-gray-700 flex justify-between items-center text-[10px] text-gray-500">
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
  <button className="w-full flex items-center px-3 py-3 rounded-lg hover:bg-blue-600/20 hover:text-white group transition-colors text-left">
    <div className="w-6 h-6 flex items-center justify-center mr-3 opacity-80 group-hover:opacity-100">
      {icon}
    </div>
    <div className="flex-1">
      <div className="text-sm font-medium text-gray-300 group-hover:text-white">{title}</div>
      {desc && <div className="text-xs text-gray-500 group-hover:text-blue-200">{desc}</div>}
    </div>
    {shortcut && (
      <span className="text-[10px] bg-gray-800 group-hover:bg-blue-600 group-hover:text-white px-1.5 py-0.5 rounded text-gray-400 font-mono">
        {shortcut}
      </span>
    )}
  </button>
);

export default GlobalCommandBar;
