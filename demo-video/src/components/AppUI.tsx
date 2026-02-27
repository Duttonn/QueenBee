import React from 'react';
import { Layers, Zap, Menu, MessageSquare, Bot, Cpu, Monitor, FileCode, Check, GitBranch, Shield, Zap as Zap2, Clock, Plug, Inbox, Search, Folder, Users, Settings, Cloud } from 'lucide-react';

interface AppUIProps {
  children?: React.ReactNode;
  activeProjectName?: string;
  activeTab?: string;
}

const tabs = [
  { id: 'build', label: 'Automations', icon: Clock },
  { id: 'triage', label: 'Triage', icon: Inbox },
  { id: 'skills', label: 'Skills', icon: Plug },
];

export const AppUI: React.FC<AppUIProps> = ({ children, activeProjectName = 'calculator-app', activeTab = 'build' }) => {
  const activeTabData = tabs.find(t => t.id === activeTab) || tabs[0];
  const ActiveIcon = activeTabData.icon;

  return (
    <div class="flex w-full h-full bg-white text-zinc-900 font-sans selection:bg-blue-100 overflow-hidden text-base relative">
      {/* Sidebar - Exact copy from your app */}
      <div class="w-[340px] bg-zinc-50/80 backdrop-blur-xl flex flex-col border-r border-zinc-200 shadow-xl relative z-20">
        {/* Search Bar */}
        <div class="px-4 mb-3 flex-shrink-0 pt-4">
          <div class="flex items-center gap-3 px-4 py-3 bg-white rounded-xl text-zinc-500 border border-zinc-200 shadow-sm">
            <Search size={16} strokeWidth={2} />
            <span class="text-sm font-bold text-left flex-1 uppercase tracking-widest">Search</span>
            <span class="text-xs text-zinc-600 font-mono font-black opacity-50">⌘K</span>
          </div>
        </div>

        {/* Project Picker */}
        <div class="px-3 mb-3">
          <div class="flex items-center gap-3 px-4 py-3 rounded-xl bg-white border border-zinc-200 shadow-sm text-sm font-black uppercase tracking-widest text-zinc-900">
            <span class="text-blue-500"><Folder size={18} /></span>
            <span class="flex-1 truncate">{activeProjectName}</span>
          </div>
        </div>

        {/* Nav Items */}
        <div class="px-3 space-y-1 mb-3">
          {tabs.map((item, i) => {
            const Icon = item.icon;
            const isActive = item.id === activeTab;
            return (
              <div key={i} class={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-black uppercase tracking-widest transition-all ${isActive ? 'bg-white text-zinc-900 border border-zinc-200 shadow-sm' : 'text-zinc-500 hover:bg-zinc-100 hover:text-zinc-700'}`}>
                <span class={isActive ? 'text-blue-400' : 'text-zinc-600'}><Icon size={18} /></span>
                <span>{item.label}</span>
              </div>
            );
          })}
        </div>

        <div class="mx-4 h-px bg-zinc-200 mb-4"></div>

        {/* Threads Section */}
        <div class="flex-1 overflow-y-auto px-3">
          <div class="px-4 mb-3">
            <div class="text-xs font-black text-zinc-500 uppercase tracking-[0.2em]">Threads</div>
          </div>
          
          {/* Project Status */}
          <div class="flex items-center gap-3 px-4 py-3 rounded-xl cursor-pointer transition-all bg-white text-zinc-900 border border-zinc-200 shadow-sm mb-3">
            <LayoutTemplate size={16} class="text-blue-500" />
            <span class="text-sm font-bold truncate tracking-tight uppercase tracking-widest">Project Status</span>
          </div>

          {/* Example Thread */}
          <div class="flex items-center gap-3 px-4 py-3 rounded-xl cursor-pointer transition-all text-zinc-500 hover:bg-zinc-100 hover:text-zinc-700">
            <Bot size={16} class="text-zinc-400" />
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2">
                <span class="text-sm font-bold truncate tracking-tight block">Fix calculateTotal bug</span>
              </div>
              <div class="flex items-center gap-2 mt-1">
                <span class="text-sm"><span class="text-emerald-500 font-bold">+45</span></span>
                <span class="text-sm text-zinc-400">2m ago</span>
              </div>
            </div>
          </div>
        </div>

        {/* Remotes Section */}
        <div class="px-6 mb-5">
          <div class="text-xs font-black text-zinc-400 uppercase tracking-[0.2em] mb-4">Remotes</div>
          <div class="flex items-center gap-3 text-sm font-bold text-zinc-500 p-2 rounded-lg hover:bg-zinc-100 cursor-pointer">
            <GitBranch size={16} class="text-zinc-400" />
            <span>GitHub</span>
            <span class="ml-auto text-xs bg-zinc-200 text-zinc-600 px-2 py-1 rounded-full">3</span>
          </div>
        </div>

        {/* User Profile */}
        <div class="p-4 border-t border-zinc-200 bg-white">
          <div class="flex items-center gap-4 p-3 rounded-2xl hover:bg-zinc-50 transition-all cursor-pointer group border border-transparent hover:border-zinc-100">
            <div class="relative">
              <div class="w-10 h-10 rounded-full bg-zinc-100 flex items-center justify-center text-zinc-900 text-xs font-black shadow-sm border border-zinc-200 group-hover:bg-white">ND</div>
              <div class="absolute -bottom-1 -right-1 w-4 h-4 bg-white rounded-full flex items-center justify-center shadow-sm border border-zinc-100">
                <Cloud size={10} class="text-blue-500" fill="currentColor" />
              </div>
            </div>
            <div class="flex-1 min-w-0">
              <div class="text-sm font-black text-zinc-900 truncate uppercase tracking-widest group-hover:text-blue-600">Natao Dutton</div>
              <div class="flex items-center gap-2">
                <div class="text-xs text-blue-600 font-bold uppercase tracking-widest">Pro Plan</div>
                <div class="w-1 h-1 rounded-full bg-zinc-300"></div>
                <div class="text-xs text-zinc-400 font-bold uppercase tracking-widest">Synced</div>
              </div>
            </div>
            <Settings size={16} class="text-zinc-400 group-hover:text-zinc-600" />
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div class="flex-1 flex flex-col min-w-0 min-h-0 relative bg-zinc-50/30">
        {/* Header with branch picker */}
        <div class="h-16 border-b border-zinc-100 flex items-center justify-between px-5 flex-shrink-0 bg-white">
          <div class="flex items-center gap-5">
            {/* Project Badge */}
            <div class="flex items-center gap-3 px-3 py-2 rounded-xl bg-zinc-50 border border-zinc-100 shadow-sm">
              <div class="w-5 h-5 rounded bg-blue-500 flex items-center justify-center text-xs text-white font-black uppercase">{activeProjectName[0]}</div>
              <span class="text-sm font-bold text-zinc-900 uppercase tracking-tight">{activeProjectName}</span>
            </div>

            {/* Branch Picker */}
            <div class="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-zinc-50 text-xs font-medium text-zinc-500 border border-transparent hover:border-zinc-100">
              <GitBranch size={14} />
              <span class="max-w-[120px] truncate">main</span>
            </div>

            {/* Workbench Tabs */}
            <div class="flex bg-zinc-100 p-1 rounded-xl border border-zinc-200 shadow-inner">
              <div class="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest bg-white text-zinc-900 shadow-sm">Code</div>
              <div class="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest text-zinc-500">Chat</div>
              <div class="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest text-zinc-500">Plan</div>
            </div>
          </div>

          {/* Action Buttons */}
          <div class="flex items-center gap-3">
            <div class="p-2 hover:bg-zinc-100 rounded-xl text-zinc-400 hover:text-blue-500"><Search size={20} /></div>
            <div class="p-2 hover:bg-zinc-100 rounded-xl text-zinc-500"><Layers size={20} /></div>
            <div class="p-2 hover:bg-zinc-100 rounded-xl text-zinc-500"><Bot size={20} /></div>
            <div class="p-2 hover:bg-zinc-100 rounded-xl text-zinc-500"><GitBranch size={20} /></div>
            <div class="px-5 py-2 bg-zinc-900 hover:bg-zinc-800 text-white text-sm font-black uppercase rounded-xl flex items-center gap-2 shadow-xl">
              <GitBranch size={16} />
              Commit <span class="text-emerald-400">+45</span>
            </div>
          </div>
        </div>
        
        <div className="flex-1 flex min-h-0 overflow-hidden relative w-full">
          {children}
        </div>
      </div>
    </div>
  );
};

// Helper component
const LayoutTemplate = ({ size, className }: { size: number; className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <rect x="3" y="3" width="18" height="18" rx="2" />
    <path d="M3 9h18" />
    <path d="M9 21V9" />
  </svg>
);
