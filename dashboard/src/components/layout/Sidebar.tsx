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
  PlayCircle
} from 'lucide-react';

const Sidebar = () => {
  const [expandedSections, setExpandedSections] = useState<any>({
    workspaces: true,
    local: true,
    github: false,
    gitlab: false,
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

  const StatusDot = ({ status }: { status: string }) => {
    switch(status) {
      case 'working': return <span className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)] animate-pulse" />;
      case 'thinking': return <span className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.6)] animate-ping" />;
      case 'blocked': return <span className="w-2 h-2 rounded-full bg-red-500" />;
      default: return <span className="w-2 h-2 rounded-full bg-gray-600" />;
    }
  };

  return (
    <div className="w-64 bg-[#111] h-screen text-gray-400 flex flex-col border-r border-gray-800 font-sans text-sm select-none">
      
      {/* 1. Workspaces */}
      <SectionHeader 
        title="WORKSPACES" 
        isOpen={expandedSections.workspaces} 
        onClick={() => toggleSection('workspaces')} 
      />
      {expandedSections.workspaces && (
        <div className="px-2 pb-2 space-y-1">
          {workspaces.map(ws => (
             <div key={ws.name} className="flex items-center gap-2 px-2 py-1.5 hover:bg-gray-800 rounded cursor-pointer text-gray-300">
               <Folder size={14} className="text-blue-400" />
               <span className="truncate">{ws.name}</span>
             </div>
          ))}
        </div>
      )}

      {/* 2. Active Projects (Local) */}
      <SectionHeader 
        title="ACTIVE PROJECTS" 
        isOpen={expandedSections.local} 
        onClick={() => toggleSection('local')} 
      />
      {expandedSections.local && (
        <div className="px-2 pb-2 space-y-1">
          {localProjects.map(p => (
            <div key={p.id} className="flex items-center justify-between px-2 py-1.5 hover:bg-gray-800 rounded cursor-pointer group">
              <span className={`truncate ${p.status === 'working' ? 'text-white font-medium' : 'text-gray-400'}`}>{p.name}</span>
              <StatusDot status={p.status} />
            </div>
          ))}
        </div>
      )}

      {/* 3. Remote Forges */}
      <SectionHeader 
        title="REMOTE FORGES" 
        isOpen={expandedSections.github} 
        onClick={() => toggleSection('github')} 
      />
      {expandedSections.github && (
        <div className="px-2 pb-2 space-y-3">
          {/* GitHub Group */}
          <div>
            <div className="flex items-center gap-2 px-2 text-xs font-bold text-gray-500 mb-1">
               <Github size={12} /> <span>Duttonn</span>
            </div>
            {remotes.filter(r => r.forge === 'github').map(repo => (
              <div key={repo.id} className="flex items-center justify-between px-2 py-1 hover:bg-gray-800 rounded cursor-pointer group">
                <span className="truncate text-xs">{repo.name}</span>
                <Download size={12} className="opacity-0 group-hover:opacity-100 text-blue-400" />
              </div>
            ))}
          </div>
          
          {/* GitLab Group */}
          <div>
             <div className="flex items-center gap-2 px-2 text-xs font-bold text-gray-500 mb-1">
               <Gitlab size={12} /> <span>natao.dutton</span>
            </div>
            {remotes.filter(r => r.forge === 'gitlab').map(repo => (
              <div key={repo.id} className="flex items-center justify-between px-2 py-1 hover:bg-gray-800 rounded cursor-pointer group">
                <span className="truncate text-xs">{repo.name}</span>
                <Download size={12} className="opacity-0 group-hover:opacity-100 text-orange-400" />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 4. Automations */}
      <div className="mt-auto border-t border-gray-800">
        <SectionHeader 
          title="TRIAGE & AUTOMATION" 
          isOpen={expandedSections.automation} 
          onClick={() => toggleSection('automation')} 
        />
        {expandedSections.automation && (
          <div className="px-2 pb-4 space-y-1">
            <div className="flex items-center gap-2 px-2 py-1.5 hover:bg-gray-800 rounded cursor-pointer text-gray-300">
               <Inbox size={14} className="text-purple-400" />
               <span>Inbox (3)</span>
            </div>
             {automations.map(auto => (
               <div key={auto.id} className="flex items-center justify-between px-2 py-1.5 hover:bg-gray-800 rounded cursor-pointer group text-xs text-gray-500">
                  <div className="flex items-center gap-2">
                    <Clock size={12} />
                    <span>{auto.name}</span>
                  </div>
                  <PlayCircle size={12} className="opacity-0 group-hover:opacity-100 text-green-400" />
               </div>
             ))}
          </div>
        )}
      </div>

    </div>
  );
};

const SectionHeader = ({ title, isOpen, onClick }: any) => (
  <div 
    onClick={onClick}
    className="flex items-center gap-1 px-4 py-3 cursor-pointer hover:text-white transition-colors"
  >
    {isOpen ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
    <span className="text-[10px] font-bold tracking-widest">{title}</span>
  </div>
);

export default Sidebar;
