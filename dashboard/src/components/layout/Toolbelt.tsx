import React from 'react';

const Toolbelt = () => {
  const skills = [
    { id: 'gsd', name: 'GSD Autonomy', type: 'Skill', icon: '⚡' },
    { id: 'sb', name: 'Stealth Browser', type: 'Skill', icon: '👻' }
  ];

  const mcpServers = [
    { id: 'vos', name: 'visionOS Simulator', status: 'online', icon: '🥽' },
    { id: 'xc', name: 'Xcode Build', status: 'offline', icon: '🛠️' }
  ];

  return (
    <div className="mt-6 border-t border-slate-700 pt-4 px-4">
      <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">Hive Toolbelt</div>
      
      {/* Skills Section */}
      <div className="space-y-2 mb-4">
        {skills.map(skill => (
          <div key={skill.id} className="flex items-center gap-2 p-2 bg-slate-800/50 rounded-lg hover:bg-slate-800 cursor-pointer transition-colors group">
            <span className="text-sm">{skill.icon}</span>
            <span className="text-xs text-slate-300 group-hover:text-white">{skill.name}</span>
          </div>
        ))}
      </div>

      {/* MCP Servers Section */}
      <div className="space-y-2">
        {mcpServers.map(server => (
          <div key={server.id} className="flex items-center justify-between p-2 bg-slate-800/50 rounded-lg group">
            <div className="flex items-center gap-2">
              <span className="text-sm">{server.icon}</span>
              <span className="text-xs text-slate-300">{server.name}</span>
            </div>
            <div className={`w-2 h-2 rounded-full ${server.status === 'online' ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
          </div>
        ))}
      </div>
      
      <button className="w-full mt-4 py-1.5 border border-dashed border-slate-600 rounded-lg text-[10px] text-slate-500 hover:border-slate-400 hover:text-slate-300 transition-all">
        + Install from ClawdHub
      </button>
    </div>
  );
};

export default Toolbelt;
