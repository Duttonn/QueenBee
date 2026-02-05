import React, { useState } from 'react';
import { 
  Folder, 
  ChevronRight, 
  ChevronDown, 
  Github, 
  Gitlab, 
  Download, 
  Clock, 
  Inbox, 
  PlayCircle,
  Settings
} from 'lucide-react';

const Sidebar = () => {
  const [expandedSections, setExpandedSections] = useState<any>({
    workspaces: true,
    local: true,
    remote: false,
    automation: true
  });

  const toggleSection = (section: string) => {
    setExpandedSections((prev: any) => ({ ...prev, [section]: !prev[section] }));
  };

  const workspaces = [
    { name: 'clawd', path: '/home/fish/clawd' }
  ];

  const localProjects = [
    { id: 'p1', name: 'QueenBee', status: 'working' }, // working, thinking, idle, blocked
    { id: 'p2', name: 'BlackJackAdvisor', status: 'idle' },
    { id: 'p3', name: 'visionOS-MCP', status: 'blocked' },
  ];

  const remotes = [
    { id: 'gh-1', name: 'BlackJackBot', forge: 'github', user: 'Duttonn' },
    { id: 'gh-2', name: 'Codex-CLI', forge: 'github', user: 'Duttonn' },
    { id: 'gl-1', name: 'Internal-R&D', forge: 'gitlab', user: 'natao.dutton' },
  ];

  const automations = [
    { id: 'auto-1', name: 'Nightly Sync', time: '2:00 AM' },
    { id: 'auto-2', name: 'Inbox Triage', time: 'Every 30m' },
  ];

  return (
    <div className="w-64 bg-zinc-900/50 backdrop-blur-xl h-full text-zinc-400 flex flex-col border-r border-white/5 font-sans text-sm select-none pt-4">
      
      {/* macOS Traffic Lights Spacing */}
      <div className="px-5 mb-6 flex gap-2 opacity-100 transition-opacity hover:opacity-100">
         <div className="w-3 h-3 rounded-full bg-[#FF5F56] border border-[#E0443E]"></div>
         <div className="w-3 h-3 rounded-full bg-[#FFBD2E] border border-[#DEA123]"></div>
         <div className="w-3 h-3 rounded-full bg-[#27C93F] border border-[#1AAB29]"></div>
      </div>

      <div className="flex-1 overflow-y-auto px-2 space-y-6">
        
        {/* 1. Workspaces */}
        <div>
          <SectionHeader 
            title="WORKSPACES" 
            isOpen={expandedSections.workspaces} 
            onClick={() => toggleSection('workspaces')} 
          />
          {expandedSections.workspaces && (
            <div className="space-y-0.5 mt-1">
              {workspaces.map(ws => (
                 <div key={ws.name} className="flex items-center gap-2 px-3 py-1.5 hover:bg-white/5 rounded-md cursor-pointer text-zinc-300 transition-colors">
                   <Folder size={14} className="text-blue-500/80" strokeWidth={1.5} />
                   <span className="truncate">{ws.name}</span>
                 </div>
              ))}
            </div>
          )}
        </div>

        {/* 2. Active Projects */}
        <div>
          <SectionHeader 
            title="ACTIVE PROJECTS" 
            isOpen={expandedSections.local} 
            onClick={() => toggleSection('local')} 
          />
          {expandedSections.local && (
            <div className="space-y-0.5 mt-1">
              {localProjects.map(p => (
                <div key={p.id} className={`flex items-center justify-between px-3 py-1.5 rounded-md cursor-pointer group transition-all ${p.status === 'working' ? 'bg-white/10 text-white shadow-sm' : 'hover:bg-white/5'}`}>
                  <span className="truncate font-medium">{p.name}</span>
                  <StatusDot status={p.status} />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 3. Remote Forges */}
        <div>
          <SectionHeader 
            title="REMOTE FORGES" 
            isOpen={expandedSections.remote} 
            onClick={() => toggleSection('remote')} 
          />
          {expandedSections.remote && (
            <div className="space-y-3 mt-1">
              {/* GitHub Group */}
              <div>
                <div className="flex items-center gap-2 px-3 text-[10px] font-bold text-zinc-500 mb-1 uppercase tracking-wider">
                   <Github size={10} strokeWidth={1.5} /> <span>Duttonn</span>
                </div>
                {remotes.filter(r => r.forge === 'github').map(repo => (
                  <div key={repo.id} className="flex items-center justify-between px-3 py-1 hover:bg-white/5 rounded-md cursor-pointer group transition-colors">
                    <span className="truncate text-xs">{repo.name}</span>
                    <Download size={12} className="opacity-0 group-hover:opacity-100 text-zinc-400" strokeWidth={1.5} />
                  </div>
                ))}
              </div>
              
              {/* GitLab Group */}
              <div>
                 <div className="flex items-center gap-2 px-3 text-[10px] font-bold text-zinc-500 mb-1 uppercase tracking-wider">
                   <Gitlab size={10} strokeWidth={1.5} /> <span>natao.dutton</span>
                </div>
                {remotes.filter(r => r.forge === 'gitlab').map(repo => (
                  <div key={repo.id} className="flex items-center justify-between px-3 py-1 hover:bg-white/5 rounded-md cursor-pointer group transition-colors">
                    <span className="truncate text-xs">{repo.name}</span>
                    <Download size={12} className="opacity-0 group-hover:opacity-100 text-orange-400" strokeWidth={1.5} />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* 4. Automations */}
        <div>
          <SectionHeader 
            title="TRIAGE & AUTOMATION" 
            isOpen={expandedSections.automation} 
            onClick={() => toggleSection('automation')} 
          />
          {expandedSections.automation && (
            <div className="space-y-0.5 mt-1">
               <div className="flex items-center gap-2 px-3 py-1.5 hover:bg-white/5 rounded-md cursor-pointer text-zinc-300 transition-colors">
                 <Inbox size={14} className="text-purple-500/80" strokeWidth={1.5} />
                 <span>Inbox (3)</span>
               </div>
               {automations.map(auto => (
                 <div key={auto.id} className="flex items-center justify-between px-3 py-1.5 hover:bg-white/5 rounded-md cursor-pointer group text-xs text-zinc-500 transition-colors">
                    <div className="flex items-center gap-2">
                      <Clock size={12} strokeWidth={1.5} />
                      <span>{auto.name}</span>
                    </div>
                    <PlayCircle size={12} className="opacity-0 group-hover:opacity-100 text-green-400" strokeWidth={1.5} />
                 </div>
               ))}
            </div>
          )}
        </div>
      </div>

      {/* Footer: User Profile */}
      <div className="p-3 border-t border-white/5 bg-zinc-900/80 backdrop-blur-md">
         <div className="flex items-center gap-3 p-2 hover:bg-white/5 rounded-lg cursor-pointer transition-colors group">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-zinc-700 to-zinc-600 border border-white/10 flex items-center justify-center text-xs text-white font-bold shadow-inner">
               ND
            </div>
            <div className="flex-1 overflow-hidden">
               <div className="text-xs font-bold text-zinc-200 truncate">Natao Dutton</div>
               <div className="text-[10px] text-zinc-500 truncate">Pro Plan • Active</div>
            </div>
            <Settings size={14} className="text-zinc-600 group-hover:text-zinc-400 transition-colors" strokeWidth={1.5} />
         </div>
      </div>

    </div>
  );
};

const SectionHeader = ({ title, isOpen, onClick }: any) => (
  <div 
    onClick={onClick}
    className="flex items-center gap-1 px-3 py-1 cursor-pointer hover:text-white transition-colors group"
  >
    <div className={`text-zinc-600 group-hover:text-zinc-400 transition-colors ${isOpen ? '' : '-rotate-90'}`}>
      <ChevronDown size={10} strokeWidth={2} />
    </div>
    <span className="text-[10px] font-bold tracking-[0.15em] text-zinc-500 group-hover:text-zinc-400">{title}</span>
  </div>
);

const StatusDot = ({ status }: { status: string }) => {
  switch(status) {
    case 'working': return <span className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.4)] animate-pulse" />;
    case 'thinking': return <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.4)] animate-ping" />;
    case 'blocked': return <span className="w-1.5 h-1.5 rounded-full bg-red-500/80" />;
    default: return <span className="w-1.5 h-1.5 rounded-full bg-zinc-700" />;
  }
};

export default Sidebar;