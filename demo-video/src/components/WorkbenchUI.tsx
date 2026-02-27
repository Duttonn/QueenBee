import React from 'react';
import { Terminal, Code, Settings2, GitPullRequest, GitCommit, Search, Sparkles, CheckCircle2, Loader2, Bot, FileCode, Edit3, Play } from 'lucide-react';

export const WorkbenchUI: React.FC<{
  children?: React.ReactNode;
  rightPanel?: React.ReactNode;
  showRightPanel?: boolean;
}> = ({ children, rightPanel, showRightPanel = true }) => {
  return (
    <div className="flex h-full w-full relative bg-white">
      {/* Main Chat/Action Area */}
      <div className="flex-1 flex flex-col min-w-0 min-h-0 bg-white">
        {/* Scrollable Main Area */}
        <div className="flex-1 overflow-y-auto px-6 py-8 relative">
          <div className="max-w-3xl mx-auto w-full space-y-6">
            {children}
          </div>
        </div>
      </div>

      {/* Right Panel - Agent Steps (exactly like your app) */}
      {showRightPanel && (
        <div className="w-[320px] flex-shrink-0 border-l border-zinc-200 bg-zinc-50/50 flex flex-col z-20">
          <div className="p-4 border-b border-zinc-200 bg-white">
            <div className="text-[10px] font-black uppercase tracking-widest text-zinc-400 flex items-center justify-between">
              <span>Agent Trace</span>
              <span className="bg-amber-100 text-amber-600 px-2 py-0.5 rounded-full flex items-center gap-1">
                <Loader2 size={10} className="animate-spin" /> Active
              </span>
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {/* Steps like your app */}
            <AgentStep label="Analyzing requirements" status="completed" />
            <AgentStep label="Checking tax schemas" status="completed" />
            <AgentStep label="Implementing fix" status="running" />
            <AgentStep label="Running tests" status="pending" />
          </div>

          {/* File changes summary */}
          <div className="p-3 border-t border-zinc-200 bg-white">
            <div className="text-[9px] font-black text-zinc-400 uppercase tracking-widest mb-2">Changes</div>
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-[11px]">
                <FileCode size={12} className="text-emerald-500" />
                <span className="text-zinc-700 font-medium">src/utils/pricing.ts</span>
                <span className="ml-auto text-emerald-500 font-bold">+12</span>
              </div>
              <div className="flex items-center gap-2 text-[11px]">
                <FileCode size={12} className="text-emerald-500" />
                <span className="text-zinc-700 font-medium">src/utils/tax.ts</span>
                <span className="ml-auto text-emerald-500 font-bold">+8</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Agent Step component matching your app
const AgentStep = ({ label, status }: { label: string; status: 'completed' | 'running' | 'pending' }) => {
  const isCompleted = status === 'completed';
  const isRunning = status === 'running';
  const isPending = status === 'pending';

  return (
    <div className={`p-3 rounded-xl border transition-all ${
      isRunning ? 'bg-white border-blue-200 shadow-md' : 
      isCompleted ? 'bg-zinc-50 border-zinc-200 opacity-60' : 
      'bg-white border-zinc-100 opacity-40'
    }`}>
      <div className="flex items-center gap-2">
        {isRunning ? (
          <Loader2 size={14} className="text-blue-500 animate-spin" />
        ) : isCompleted ? (
          <CheckCircle2 size={14} className="text-green-500" />
        ) : (
          <div className="w-3.5 h-3.5 rounded-full border-2 border-zinc-300" />
        )}
        <span className={`text-xs font-semibold ${
          isRunning ? 'text-blue-900' : 
          isCompleted ? 'text-zinc-500 line-through' : 
          'text-zinc-400'
        }`}>
          {label}
        </span>
      </div>
    </div>
  );
};
