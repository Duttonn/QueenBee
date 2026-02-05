import React from 'react';

const AutonomousStatus = () => {
  const currentAction = "Optimizing Auth profiles for faster switching...";

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-[#0F172A] border-t border-blue-500/30 px-6 py-2 flex items-center justify-between z-[50]">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-blue-500 rounded-full animate-ping" />
          <span className="text-[10px] font-black text-[#3B82F6] uppercase tracking-widest">Autonomous Engine Active</span>
        </div>
        <div className="h-4 w-px bg-[#1E293B]" />
        <span className="text-xs text-slate-400 italic">"{currentAction}"</span>
      </div>
      
      <div className="flex gap-4 items-center">
        <span className="text-[10px] text-slate-600 font-mono">Tokens: 1.2k • Latency: 45ms</span>
        <button className="text-[10px] bg-[#1E293B] text-slate-400 px-2 py-1 rounded hover:text-red-400 transition-colors">Pause Autonomy</button>
      </div>
    </div>
  );
};

export default AutonomousStatus;
