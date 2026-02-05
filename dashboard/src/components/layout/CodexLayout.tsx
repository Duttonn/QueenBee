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

      {/* 2. Main Work Area (Split View) */}
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
          {/* Main View (Editor) */}
          <div className="flex-1 flex flex-col min-w-0">
             {activeTab === 'editor' ? <EditorView /> : children}
          </div>

          {/* Right Pane (Chat/Context) - Always visible in Codex mode */}
          <div className="w-[400px] border-l border-gray-800 bg-[#111] flex flex-col">
            <div className="h-12 border-b border-gray-800 flex items-center px-4 gap-2">
               <MessageSquare size={16} className="text-gray-400" />
               <span className="text-xs font-bold text-gray-300 uppercase">Orchestrator Chat</span>
            </div>
            <div className="flex-1 p-4 overflow-auto space-y-4">
              {/* Chat History Mock */}
              <div className="flex gap-3">
                <div className="w-6 h-6 rounded bg-blue-600 flex items-center justify-center text-[10px] flex-shrink-0">QM</div>
                <div className="text-sm text-gray-300 leading-relaxed">
                  I've set up the basic project structure. The <code className="bg-gray-800 px-1 rounded text-xs">proxy-bridge</code> is running on port 3000.
                </div>
              </div>
              
              <div className="flex gap-3 flex-row-reverse">
                <div className="w-6 h-6 rounded bg-purple-600 flex items-center justify-center text-[10px] flex-shrink-0">YOU</div>
                <div className="text-sm text-gray-300 leading-relaxed bg-gray-800/50 p-2 rounded-lg">
                  Great. Can you show me the Git status?
                </div>
              </div>

               <div className="flex gap-3">
                <div className="w-6 h-6 rounded bg-blue-600 flex items-center justify-center text-[10px] flex-shrink-0">QM</div>
                <div className="text-sm text-gray-300 leading-relaxed">
                  Checking <code className="bg-gray-800 px-1 rounded text-xs">git status</code>...
                  <div className="mt-2 bg-black rounded p-2 font-mono text-xs text-green-400">
                    On branch main<br/>
                    Your branch is up to date.<br/>
                    nothing to commit, working tree clean
                  </div>
                </div>
              </div>
            </div>

            {/* Input Area */}
            <div className="p-4 border-t border-gray-800 bg-[#0a0a0a]">
              <div className="relative">
                <input 
                  type="text" 
                  placeholder="Ask Queen Bee to make changes..." 
                  className="w-full bg-[#1e1e1e] border border-gray-700 rounded-xl py-3 px-4 text-sm text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
                <div className="absolute right-3 top-3 text-xs text-gray-500 bg-gray-800 px-1.5 py-0.5 rounded border border-gray-700">
                  ⏎
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Overlay for specific notifications if needed */}
      {/* <GlobalOrchestratorOverlay /> */}
    </div>
  );
};

export default CodexLayout;
