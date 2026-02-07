import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Mic, Command, Search, Cpu, GitBranch, Zap, Layers, Loader2 } from 'lucide-react';
import { useHiveStore } from '../../store/useHiveStore';
import { useAppStore } from '../../store/useAppStore';
import { useVoiceRecording } from '../../hooks/useVoiceRecording';

const GlobalCommandBar = () => {
  const { isCommandBarOpen: isOpen, setCommandBarOpen: setIsOpen } = useAppStore();
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Hive state
  const { socket, projects } = useHiveStore();
  const activeProject = projects.length > 0 ? projects[0] : null;

  // Voice Recording Hook
  const { isRecording, toggleRecording, stopRecording } = useVoiceRecording(
    useCallback((transcript) => {
      setQuery(prev => (prev ? `${prev} ${transcript}` : transcript));
    }, [])
  );

  // Toggle with Cmd+K and Ctrl+M for Voice
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Toggle Modal
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(prev => !prev);
      }
      
      // Voice Shortcut (Ctrl+M) - TOGGLE
      if ((e.metaKey || e.ctrlKey) && e.key === 'm') {
        e.preventDefault();
        if (!isOpen) setIsOpen(true);
        toggleRecording();
      }

      if (e.key === 'Escape') {
        setIsOpen(false);
        stopRecording();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, toggleRecording, stopRecording]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const handleSubmit = () => {
    if (!query.trim() || !socket) return;

    console.log(`[GlobalCommandBar] Submitting: ${query}`);
    socket.emit('CMD_SUBMIT', {
      prompt: query,
      projectId: activeProject?.id || 'default',
      projectPath: activeProject?.path || '.'
    });

    setQuery('');
    setIsOpen(false);
    stopRecording();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSubmit();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-start justify-center pt-[15vh]">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={() => setIsOpen(false)}
      ></div>

      {/* Command Modal */}
      <div className="relative w-full max-w-2xl bg-[#0F172A]/80 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200 ring-1 ring-black/5">
        
        {/* Header / Input Area */}
        <div className="flex items-center px-4 py-4 border-b border-white/5">
          <Command className="w-5 h-5 text-zinc-400 mr-4" strokeWidth={1.5} />
          <input
            ref={inputRef}
            type="text"
            className="flex-1 bg-transparent text-lg text-white placeholder-zinc-500 outline-none font-medium"
            placeholder={isRecording ? "Listening..." : "Command the Queen Bee..."}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          
          <div className="flex items-center gap-3">
             {/* Context Indicator */}
            <div className="hidden sm:flex items-center gap-1.5 px-2 py-1 bg-white/5 rounded-md text-[10px] text-zinc-400 font-mono border border-white/5">
               <GitBranch size={10} className="text-blue-500" strokeWidth={1.5} />
               <span>QueenBee / Core</span>
            </div>
            
            {/* Voice Toggle */}
            <button 
                onClick={toggleRecording}
                className={`p-2 rounded-lg transition-colors ${isRecording ? 'bg-red-500/20 text-red-400' : 'hover:bg-white/10 text-zinc-500 hover:text-white'}`}
            >
              {isRecording ? <Loader2 size={18} className="animate-spin" /> : <Mic size={18} strokeWidth={1.5} />}
            </button>
            
            <div className="px-2 py-1 bg-[#1E293B]/50 rounded text-[10px] text-zinc-400 font-mono border border-white/5">
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
              <CommandItem icon={<Layers className="text-[#3B82F6]" size={18} />} title="Switch Project Workspace" />
              <CommandItem icon={<Cpu className="text-[#22C55E]" size={18} />} title="View Hive System Status" />
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
        <div className="px-4 py-2 bg-[#0F172A]/30 border-t border-white/5 flex justify-between items-center text-[10px] text-zinc-500 font-medium">
           <span>Queen Bee Orchestrator v2.0</span>
           <div className="flex gap-2">
             <span className="flex items-center gap-1"><span className="bg-[#1E293B] px-1 rounded">Ctrl+M</span> Voice</span>
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
      <span className="text-[10px] bg-[#1E293B] group-hover:bg-blue-600 group-hover:text-white px-1.5 py-0.5 rounded text-zinc-400 font-mono transition-colors">
        {shortcut}
      </span>
    )}
  </button>
);

export default GlobalCommandBar;
