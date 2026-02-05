import React, { useState, useEffect } from 'react';

const TerminalPane = ({ isOpen }: { isOpen: boolean }) => {
  return (
    <div className={`transition-all duration-300 border-t border-slate-800 bg-black overflow-hidden ${isOpen ? 'h-64' : 'h-0'}`}>
      <div className="flex items-center justify-between px-4 py-1 bg-slate-900 border-b border-slate-800">
        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Integrated Terminal</span>
        <div className="flex gap-2">
          <div className="w-2 h-2 rounded-full bg-slate-700" />
          <div className="w-2 h-2 rounded-full bg-slate-700" />
        </div>
      </div>
      <div className="p-4 font-mono text-xs text-green-400">
        <div>fitch@hive:~/projects/codex-clone$ <span className="animate-pulse">_</span></div>
      </div>
    </div>
  );
};

export default TerminalPane;
