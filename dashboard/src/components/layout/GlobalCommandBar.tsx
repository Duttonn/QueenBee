import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Mic, Command, Search, Cpu, GitBranch, Zap, Layers, Loader2, Bot, X, PenSquare, RefreshCw, Activity } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useHiveStore } from '../../store/useHiveStore';
import { useAppStore } from '../../store/useAppStore';
import { useVoiceRecording } from '../../hooks/useVoiceRecording';
import { healthCheck } from '../../services/api';

const GlobalCommandBar = () => {
  const { isCommandBarOpen: isOpen, setCommandBarOpen: setIsOpen } = useAppStore();
  const [query, setQuery] = useState('');
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Hive state
  const { socket, projects, setSelectedProjectId, addThread, setActiveThread, fetchProjects } = useHiveStore();
  const selectedProjectId = useHiveStore((s) => s.selectedProjectId);
  const activeProject = projects.find(p => p.id === selectedProjectId) || (projects.length > 0 ? projects[0] : null);

  // Voice Recording Hook
  const { isRecording, toggleRecording, stopRecording } = useVoiceRecording(
    useCallback((transcript) => {
      setQuery(prev => (prev ? `${prev} ${transcript}` : transcript));
    }, [])
  );

  const actions = [
    {
      title: 'Spawn New Agent',
      description: 'Create a new thread with an autonomous worker',
      icon: <Zap size={18} />,
      shortcut: 'S',
      perform: () => {
        if (!activeProject) return;
        const threadId = `thread-${Date.now()}`;
        addThread(activeProject.id, {
          id: threadId,
          title: 'New Agent Thread',
          agentId: 'codex-agent',
        });
        setActiveThread(threadId);
      }
    },
    {
      title: 'Switch Project Workspace',
      description: 'Cycle to the next active project',
      icon: <Layers size={18} />,
      perform: () => {
        if (projects.length < 2) return;
        const currentIdx = projects.findIndex(p => p.id === selectedProjectId);
        const nextIdx = (currentIdx + 1) % projects.length;
        setSelectedProjectId(projects[nextIdx].id);
        setStatusMessage(`Switched to: ${projects[nextIdx].name}`);
        setTimeout(() => setStatusMessage(null), 2000);
      }
    },
    {
      title: 'System Status',
      description: 'Check backend health and connectivity',
      icon: <Cpu size={18} />,
      perform: async () => {
        setStatusMessage('Checking backend...');
        const ok = await healthCheck();
        setStatusMessage(ok ? 'Backend is healthy and connected.' : 'Backend is unreachable.');
        setTimeout(() => setStatusMessage(null), 3000);
      }
    },
    {
      title: 'New Thread',
      description: 'Start a fresh conversation thread',
      icon: <PenSquare size={18} />,
      perform: () => {
        setActiveThread(null);
      }
    },
    {
      title: 'Refresh Projects',
      description: 'Re-fetch project list from backend',
      icon: <RefreshCw size={18} />,
      perform: async () => {
        setStatusMessage('Refreshing projects...');
        await fetchProjects();
        setStatusMessage(`Loaded ${useHiveStore.getState().projects.length} projects.`);
        setTimeout(() => setStatusMessage(null), 2000);
      }
    },
  ];

  const filteredActions = actions.filter(a => a.title.toLowerCase().includes(query.toLowerCase()));

  // Toggle with Cmd+K and Ctrl+M for Voice
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(!isOpen);
      }
      if (e.key === 'Escape') {
        setIsOpen(false);
        stopRecording();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, setIsOpen, stopRecording]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const handleSubmit = () => {
    if (!query.trim() || !socket) return;
    socket.emit('CMD_SUBMIT', {
      prompt: query,
      projectId: activeProject?.id || 'default',
      projectPath: activeProject?.path || '.'
    });
    setQuery('');
    setIsOpen(false);
    stopRecording();
  };

  // Clear status when closing
  useEffect(() => {
    if (!isOpen) setStatusMessage(null);
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-start justify-center pt-[15vh]">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-zinc-950/20 backdrop-blur-sm"
        onClick={() => setIsOpen(false)}
      />

      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: -20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: -20 }}
        className="relative w-full max-w-2xl bg-white rounded-3xl shadow-[0_32px_64px_-16px_rgba(0,0,0,0.2)] border border-zinc-200 overflow-hidden flex flex-col"
      >
        <div className="flex items-center px-6 py-5 border-b border-zinc-100">
          <Search className="text-zinc-400 mr-4" size={20} />
          <input
            ref={inputRef}
            className="flex-1 bg-transparent border-none outline-none text-lg font-medium text-zinc-900 placeholder:text-zinc-400"
            placeholder={isRecording ? "Listening..." : "Search files, components, or ask anything..."}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
          />
          <div className="flex items-center gap-3">
            <button 
                onClick={toggleRecording}
                className={`p-2 rounded-xl transition-all ${isRecording ? 'bg-red-50 text-red-600' : 'hover:bg-zinc-100 text-zinc-400 hover:text-zinc-600'}`}
            >
              {isRecording ? <Loader2 size={18} className="animate-spin" /> : <Mic size={18} />}
            </button>
            <div className="flex items-center gap-1.5 px-2 py-1 bg-zinc-100 rounded-lg border border-zinc-200">
               <span className="text-[10px] font-black text-zinc-500 uppercase">ESC</span>
            </div>
          </div>
        </div>

        <div className="p-2 max-h-[60vh] overflow-y-auto bg-zinc-50/30">
          {filteredActions.length > 0 ? (
            <div className="space-y-1">
              {filteredActions.map((action, idx) => (
                <button
                  key={idx}
                  onClick={() => { action.perform(); if (!['System Status', 'Refresh Projects'].includes(action.title)) setIsOpen(false); }}
                  className={`w-full flex items-center justify-between px-4 py-3.5 rounded-2xl transition-all ${
                    idx === selectedIdx ? 'bg-zinc-900 text-white shadow-xl shadow-black/10' : 'hover:bg-zinc-50 text-zinc-600'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div className={`p-2 rounded-xl ${idx === selectedIdx ? 'bg-white/10 text-white' : 'bg-zinc-100 text-zinc-500'}`}>
                      {action.icon}
                    </div>
                    <div className="text-left">
                      <div className={`text-sm font-bold uppercase tracking-wide ${idx === selectedIdx ? 'text-white' : 'text-zinc-900'}`}>
                        {action.title}
                      </div>
                      <div className={`text-[10px] font-medium ${idx === selectedIdx ? 'text-white/50' : 'text-zinc-400'}`}>
                        {action.description}
                      </div>
                    </div>
                  </div>
                  {action.shortcut && (
                    <div className={`text-[10px] font-black px-2 py-1 rounded-lg border ${
                      idx === selectedIdx ? 'bg-white/10 border-white/20 text-white' : 'bg-white border-zinc-200 text-zinc-400'
                    }`}>
                      {action.shortcut}
                    </div>
                  )}
                </button>
              ))}
            </div>
          ) : (
            <div className="py-20 text-center">
              <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center mx-auto mb-4 border border-zinc-100 shadow-sm">
                 <Bot size={24} className="text-zinc-300" />
              </div>
              <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">No matching commands found</p>
            </div>
          )}
        </div>

        {statusMessage && (
          <div className="px-6 py-3 bg-blue-50 border-t border-blue-100 flex items-center gap-2">
            <Activity size={14} className="text-blue-500" />
            <span className="text-xs font-bold text-blue-700">{statusMessage}</span>
          </div>
        )}

        <div className="px-6 py-3 bg-white border-t border-zinc-100 flex items-center justify-between">
           <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5 text-[10px] font-bold text-zinc-400">
                 <div className="w-4 h-4 rounded bg-white border border-zinc-200 flex items-center justify-center text-[8px] font-black">↑↓</div>
                 <span>NAVIGATE</span>
              </div>
              <div className="flex items-center gap-1.5 text-[10px] font-bold text-zinc-400">
                 <div className="w-4 h-4 rounded bg-white border border-zinc-200 flex items-center justify-center text-[8px] font-black">↵</div>
                 <span>EXECUTE</span>
              </div>
           </div>
           <div className="text-[10px] font-black text-zinc-300 uppercase tracking-widest">Queen Bee Core v2.4</div>
        </div>
      </motion.div>
    </div>
  );
};

export default GlobalCommandBar;