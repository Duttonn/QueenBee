import React, { useState } from 'react';
import { 
  Terminal, 
  Layout, 
  GitBranch, 
  Settings, 
  Cpu, 
  MessageSquare 
} from 'lucide-react';
import GlobalOrchestratorOverlay from './GlobalOrchestrator';
import UniversalAuthModal from './UniversalAuthModal';
import GlobalCommandBar from './GlobalCommandBar';
import Sidebar from './Sidebar';
import AgenticWorkbench from './AgenticWorkbench';
import ReviewAndShip from '../projects/ReviewAndShip';

// Mock Editor Component
const EditorView = () => (
  <div className="flex-1 bg-[#1e1e1e] text-gray-300 font-mono text-sm p-4 overflow-auto">
    <div className="flex gap-4 text-xs text-gray-500 mb-4 border-b border-gray-800 pb-2">
      <span className="text-white border-b-2 border-blue-500 pb-2">ForgeAdapter.ts</span>
      <span>WorkTreeManager.ts</span>
      <span>DESIGN.md</span>
    </div>
    <div className="space-y-1">
      <div><span className="text-blue-400">import</span> <span className="text-green-400">{'{'} execSync {'}'}</span> <span className="text-blue-400">from</span> <span className="text-orange-300">'child_process'</span>;</div>
      <div>&nbsp;</div>
      <div><span className="text-purple-400">export class</span> <span className="text-yellow-300">ForgeAdapter</span> {'{'}</div>
      <div>&nbsp;&nbsp;<span className="text-gray-500">// Interacts with GitHub/GitLab CLI</span></div>
      <div>&nbsp;&nbsp;<span className="text-purple-400">constructor</span>() {'{'}</div>
      <div>&nbsp;&nbsp;&nbsp;&nbsp;<span className="text-blue-300">console</span>.<span className="text-yellow-200">log</span>(<span className="text-orange-300">"Forge Adapter Initialized"</span>);</div>
      <div>&nbsp;&nbsp;{'}'}</div>
      <div>{'}'}</div>
    </div>
  </div>
);

const CodexLayout = ({ children }: { children?: React.ReactNode }) => {
  const [activeTab, setActiveTab] = useState('editor');
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  return (
    <div className="flex h-screen w-full bg-[#0d0d0d] text-white overflow-hidden font-sans">
      
      <GlobalCommandBar />

      {!isAuthenticated && (
        <UniversalAuthModal onComplete={() => setIsAuthenticated(true)} />
      )}

      {/* 1. Slim Sidebar */}
      <div className="w-16 flex flex-col items-center py-6 border-r border-gray-800 bg-[#0a0a0a]">
        <div className="mb-8 p-2 bg-white/10 rounded-lg">
          <Cpu size={24} className="text-blue-400" />
        </div>
        
        <nav className="flex flex-col gap-6 w-full items-center">
          <button 
            onClick={() => setActiveTab('editor')}
            className={`p-3 rounded-xl transition-all ${activeTab === 'editor' ? 'bg-blue-600 text-white' : 'text-gray-500 hover:text-white'}`}
          >
            <Layout size={20} />
          </button>
          <button 
             onClick={() => setActiveTab('git')}
             className={`p-3 rounded-xl transition-all ${activeTab === 'git' ? 'bg-blue-600 text-white' : 'text-gray-500 hover:text-white'}`}
          >
            <GitBranch size={20} />
          </button>
          <button 
             onClick={() => setActiveTab('terminal')}
             className={`p-3 rounded-xl transition-all ${activeTab === 'terminal' ? 'bg-blue-600 text-white' : 'text-gray-500 hover:text-white'}`}
          >
            <Terminal size={20} />
          </button>
        </nav>

        <div className="mt-auto flex flex-col gap-6">
          <button className="text-gray-500 hover:text-white">
            <Settings size={20} />
          </button>
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-500 to-purple-600 border border-white/20"></div>
        </div>
      </div>

      {/* 2. The Hive Sidebar (Project Explorer) */}
      {activeTab === 'editor' && <Sidebar />}

      {/* 3. Main Work Area (Split View) */}
      <div className="flex-1 flex flex-col relative">
        {/* Top Bar */}
        <div className="h-12 border-b border-gray-800 flex items-center px-4 justify-between bg-[#0a0a0a]">
          <div className="flex items-center gap-3">
            <span className="text-xs font-medium text-gray-400 uppercase tracking-widest">Project:</span>
            <span className="text-sm font-bold text-white">QueenBee / Core</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-2 text-xs text-green-400 bg-green-400/10 px-2 py-1 rounded">
              <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></span>
              Orchestrator Online
            </span>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 flex overflow-hidden">
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
        </div>
      </div>
      
      {/* Overlay for specific notifications if needed */}
      {/* <GlobalOrchestratorOverlay /> */}
    </div>
  );
};

export default CodexLayout;
