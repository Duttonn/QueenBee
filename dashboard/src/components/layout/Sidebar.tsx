import React from 'react';

const Sidebar = () => {
  const remotes = [
    { id: 'gh-1', name: 'BlackJackBot', forge: 'github', user: 'Duttonn' },
    { id: 'gl-1', name: 'Internal-R&D', forge: 'gitlab', user: 'natao.dutton' },
  ];

  return (
    <div className="w-64 bg-slate-900 h-screen text-white p-4 flex flex-col border-r border-slate-700">
      <h2 className="text-xl font-bold mb-6">Codex Hive</h2>
      
      <div className="flex-1 overflow-y-auto">
        <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">Active Workspace</div>
        {/* ... (Local projects list) */}

        {/* GitHub Group */}
        <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-8 mb-3 flex items-center gap-2">
          <span>🐙 GitHub</span>
          <span className="text-[8px] bg-slate-800 px-1 rounded text-slate-400">Duttonn</span>
        </div>
        {remotes.filter(r => r.forge === 'github').map(repo => (
          <div key={repo.id} className="text-xs text-slate-400 py-1 hover:text-white cursor-pointer px-2">
            📦 {repo.name}
          </div>
        ))}

        {/* GitLab Group */}
        <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-6 mb-3 flex items-center gap-2">
          <span>🦊 GitLab</span>
          <span className="text-[8px] bg-slate-800 px-1 rounded text-slate-400">natao.dutton</span>
        </div>
        {remotes.filter(r => r.forge === 'gitlab').map(repo => (
          <div key={repo.id} className="text-xs text-slate-400 py-1 hover:text-white cursor-pointer px-2">
            🦊 {repo.name}
          </div>
        ))}
      </div>
    </div>
  );
};

export default Sidebar;
