import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Terminal, 
  Layout, 
  GitBranch, 
  Settings, 
  Cpu, 
  X,
  Circle
} from 'lucide-react';
import UniversalAuthModal from './UniversalAuthModal';
import GlobalCommandBar from './GlobalCommandBar';
import Sidebar from './Sidebar';
import AgenticWorkbench from './AgenticWorkbench';
import ReviewAndShip from '../projects/ReviewAndShip';

// Mock Editor Component
const EditorView = () => (
  <div className="flex-1 bg-zinc-900/30 text-zinc-300 font-mono text-sm p-4 overflow-auto">
    <div className="flex gap-4 text-xs text-zinc-500 mb-4 border-b border-white/5 pb-2">
      <span className="text-zinc-100 border-b-2 border-blue-500 pb-2">ForgeAdapter.ts</span>
      <span>WorkTreeManager.ts</span>
      <span>DESIGN.md</span>
    </div>
    <div className="space-y-1">
      <div><span className="text-blue-400">import</span> <span className="text-green-400">{'{'} execSync {'}'}</span> <span className="text-blue-400">from</span> <span className="text-orange-300">'child_process'</span>;</div>
      <div>&nbsp;</div>
      <div><span className="text-purple-400">export class</span> <span className="text-yellow-300">ForgeAdapter</span> {'{'}</div>
      <div>&nbsp;&nbsp;<span className="text-zinc-500">// Interacts with GitHub/GitLab CLI</span></div>
      <div>&nbsp;&nbsp;<span className="text-purple-400">constructor</span>() {'{'}</div>
      <div>&nbsp;&nbsp;&nbsp;&nbsp;<span className="text-blue-300">console</span>.<span className="text-yellow-200">log</span>(<span className="text-orange-300">"Forge Adapter Initialized"</span>);</div>
      <div>&nbsp;&nbsp;{'}'}</div>
      <div>{'}'}</div>
    </div>
  </div>
);

const TerminalDrawer = ({ onClose }: { onClose: () => void }) => (
  <motion.div 
    initial={{ y: '100%' }}
    animate={{ y: 0 }}
    exit={{ y: '100%' }}
    transition={{ type: 'spring', damping: 25, stiffness: 200 }}
    className="absolute bottom-0 left-0 right-0 h-72 bg-zinc-950/95 backdrop-blur-md border-t border-white/10 shadow-2xl z-50 flex flex-col"
  >
    <div className="flex justify-between items-center px-4 py-3 bg-white/5 border-b border-white/5">
       <div className="flex items-center gap-2 text-xs font-bold text-zinc-400">
          <Terminal size={14} strokeWidth={1.5} />
          <span>TERMINAL - Local</span>
       </div>
       <button onClick={onClose} className="text-zinc-500 hover:text-white"><X size={14} strokeWidth={1.5} /></button>
    </div>
    <div className="flex-1 p-4 font-mono text-sm text-zinc-300 overflow-auto">
       <div><span className="text-green-400">➜</span> <span className="text-blue-400">~/projects/queen-bee</span> git status</div>
       <div className="text-zinc-500">On branch main</div>
       <div className="text-zinc-500">Your branch is up to date with 'origin/main'.</div>
       <div className="mt-2"><span className="text-green-400">➜</span> <span className="text-blue-400">~/projects/queen-bee</span> <span className="animate-pulse">_</span></div>
    </div>
  </motion.div>
);

const CodexLayout = ({ children }: { children?: React.ReactNode }) => {
  const [activeTab, setActiveTab] = useState('editor');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isTerminalOpen, setIsTerminalOpen] = useState(false);

  // Toggle Terminal with Cmd+J
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'j') {
        e.preventDefault();
        setIsTerminalOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className="flex h-screen w-full bg-zinc-950 text-zinc-100 overflow-hidden font-sans selection:bg-blue-500/30">
      
      <GlobalCommandBar />

      <AnimatePresence>
        {!isAuthenticated && (
          <UniversalAuthModal onComplete={() => setIsAuthenticated(true)} />
        )}
      </AnimatePresence>

      {/* 1. Slim Sidebar (Activity Bar) */}
      <div className="w-16 flex flex-col items-center py-6 border-r border-white/5 bg-zinc-900/50 backdrop-blur-xl z-20">
        <div className="mb-8 p-2 bg-white/5 rounded-xl border border-white/5 shadow-lg shadow-black/20">
          <Cpu size={24} className="text-zinc-100" strokeWidth={1.5} />
        </div>
        
        <nav className="flex flex-col gap-6 w-full items-center">
          <NavButton 
            active={activeTab === 'editor'} 
            onClick={() => setActiveTab('editor')} 
            icon={<Layout size={20} strokeWidth={1.5} />} 
          />
          <NavButton 
            active={activeTab === 'git'} 
            onClick={() => setActiveTab('git')} 
            icon={<GitBranch size={20} strokeWidth={1.5} />} 
          />
          <NavButton 
            active={isTerminalOpen} 
            onClick={() => setIsTerminalOpen(prev => !prev)} 
            icon={<Terminal size={20} strokeWidth={1.5} />} 
          />
        </nav>

        <div className="mt-auto flex flex-col gap-6 items-center">
          <button className="text-zinc-500 hover:text-white transition-colors">
            <Settings size={20} strokeWidth={1.5} />
          </button>
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-zinc-700 to-zinc-600 border border-white/10 shadow-inner"></div>
        </div>
      </div>

      {/* 2. The Hive Sidebar (Project Explorer) */}
      {activeTab === 'editor' && <Sidebar />}

      {/* 3. Main Work Area */}
      <div className="flex-1 flex flex-col relative min-w-0 bg-zinc-950/30">
        
        {/* Top Bar (Traffic Lights + Context) */}
        <div className="h-12 border-b border-white/5 flex items-center justify-between px-4 bg-zinc-900/30 backdrop-blur-sm">
           {/* macOS Traffic Lights Placeholder (Visual only, functional on real app) */}
           <div className="flex items-center gap-2 absolute left-4 opacity-0"> {/* Hidden here, moved to Sidebar for native look */}
             <div className="w-3 h-3 rounded-full bg-red-500/80"></div>
             <div className="w-3 h-3 rounded-full bg-yellow-500/80"></div>
             <div className="w-3 h-3 rounded-full bg-green-500/80"></div>
           </div>

           <div className="flex items-center gap-3 ml-2">
            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Active Context</span>
            <div className="flex items-center gap-2 text-sm font-medium text-zinc-200">
               <span>QueenBee</span>
               <span className="text-zinc-600">/</span>
               <span>Core</span>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-[10px] font-medium text-green-400 bg-green-500/5 px-2.5 py-1 rounded-full border border-green-500/10">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse"></span>
              Orchestrator Online
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 flex overflow-hidden relative">
          {activeTab === 'git' ? (
             <ReviewAndShip />
          ) : (
            <>
              {/* Main View (Editor) */}
              <div className="flex-1 flex flex-col min-w-0">
                 {activeTab === 'editor' ? <EditorView /> : children}
              </div>

              {/* Right Pane (Chat/Context) - The Agentic Workbench */}
              <AgenticWorkbench />
            </>
          )}

          {/* Bottom Drawer (Terminal) */}
          <AnimatePresence>
            {isTerminalOpen && (
              <TerminalDrawer onClose={() => setIsTerminalOpen(false)} />
            )}
          </AnimatePresence>
        </div>
      </div>
      
    </div>
  );
};

const NavButton = ({ active, onClick, icon }: any) => (
  <button 
    onClick={onClick}
    className={`p-3 rounded-xl transition-all duration-300 ease-out ${
      active 
        ? 'bg-white/10 text-white shadow-lg shadow-white/5 ring-1 ring-white/10' 
        : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/5'
    }`}
  >
    {icon}
  </button>
);

export default CodexLayout;
