import React, { useEffect, useRef } from 'react';
// import { Terminal } from 'xterm'; // To be installed via npm
// import { FitAddon } from 'xterm-addon-fit';

const XtermTerminal = () => {
  const terminalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Logic for Xterm.js initialization
    console.log('[UI] Initializing Xterm.js on', terminalRef.current);
    
    // 1. Initialize Terminal instance
    // 2. Load FitAddon
    // 3. Connect to /api/terminal/shell via Socket.io
    // 4. pty.onData -> term.write
    // 5. term.onData -> pty.write
  }, []);

  return (
    <div className="flex flex-col h-full bg-black border-t border-slate-800 animate-in slide-in-from-bottom duration-300">
      <div className="flex items-center justify-between px-4 py-1.5 bg-slate-900 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Interactive Shell</span>
          <span className="text-[8px] bg-slate-800 text-green-400 px-1.5 rounded font-mono">bash</span>
        </div>
        <div className="flex gap-4">
          <button className="text-[10px] text-slate-500 hover:text-white">Clear</button>
          <button className="text-[10px] text-slate-500 hover:text-white font-bold">Cmd+J</button>
        </div>
      </div>
      
      {/* Actual Terminal Container */}
      <div 
        ref={terminalRef} 
        className="flex-1 p-2 overflow-hidden"
        style={{ fontFamily: '"Cascadia Code", Menlo, monospace' }}
      >
        <div className="text-green-400 text-xs">
          fitch@hive:~/clawd$ <span className="animate-pulse">_</span>
        </div>
      </div>
    </div>
  );
};

export default XtermTerminal;
