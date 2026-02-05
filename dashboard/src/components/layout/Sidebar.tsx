import React from 'react';

const Sidebar = () => {
  const projects = [
    { id: 'bj', name: 'Blackjack Advisor', agents: ['Generator', 'Strategy-Dev'], type: 'local' },
    { id: 'vos', name: 'visionOS MCP', agents: ['Projection-Fixer'], type: 'local' },
  ];

  return (
    <div className="w-64 bg-slate-950 h-screen text-white p-4 flex flex-col border-r border-white/5 font-sans">
      {/* Sidebar Header */}
      <div className="flex items-center gap-3 mb-10 px-2">
        <div className="text-xl">👑🐝</div>
        <h2 className="text-sm font-black uppercase tracking-[0.2em] text-white/90">Queen Bee</h2>
      </div>
      
      <div className="flex-1 overflow-y-auto space-y-8">
        <div>
          <div className="text-[10px] font-black text-slate-600 uppercase tracking-[0.2em] mb-4 px-2">Projects & Workers</div>
          
          {projects.map(project => (
            <div key={project.id} className="mb-6">
              <div className="font-bold text-xs text-blue-400/80 flex items-center gap-2 px-2 mb-2">
                <span>📁</span>
                <span className="truncate">{project.name}</span>
              </div>
              
              <ul className="space-y-1">
                {project.agents.map(agent => (
                  <li key={agent} className="group flex items-center gap-3 py-1.5 px-4 rounded-xl hover:bg-white/5 cursor-pointer transition-all">
                    {/* The Worker Bee Icon */}
                    <div className="text-xs grayscale group-hover:grayscale-0 transition-all duration-300">🐝</div>
                    <div className="flex flex-col">
                      <span className="text-[11px] font-bold text-slate-300 group-hover:text-white">{agent}</span>
                      <span className="text-[8px] text-slate-600 group-hover:text-blue-400 uppercase font-black">Active</span>
                    </div>
                  </li>
                ))}
                <li className="flex items-center gap-3 py-1.5 px-4 text-[10px] text-slate-700 hover:text-slate-400 cursor-pointer italic">
                  + Add Worker
                </li>
              </ul>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-auto border-t border-white/5 pt-4 px-2">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
          <span className="text-[9px] font-black text-slate-500 uppercase">Hive Status: Online</span>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
