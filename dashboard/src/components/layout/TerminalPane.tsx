import React, { useState, useEffect } from 'react';

const TerminalPane = ({ isOpen }: { isOpen: boolean }) => {
  return (
    <div className={`transition-all duration-300 border-t border-zinc-800 bg-zinc-950 overflow-hidden ${isOpen ? 'h-64' : 'h-0'}`}>
      <div className="flex items-center justify-between px-4 py-2 bg-zinc-900 border-b border-zinc-800">
        <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Integrated Terminal</span>
        <div className="flex gap-2">
          <div className="w-2 h-2 rounded-full bg-zinc-700" />
          <div className="w-2 h-2 rounded-full bg-zinc-700" />
        </div>
      </div>
      <div className="p-4 font-mono text-xs text-green-500">
        <div>fitch@hive:~/projects/codex-clone$ <span className="animate-pulse">_</span></div>
      </div>
    </div>
  );
};

export default TerminalPane;
