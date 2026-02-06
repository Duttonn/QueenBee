import React, { useEffect, useRef } from 'react';
import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import { io } from 'socket.io-client';
import { API_BASE } from '../../config';

import 'xterm/css/xterm.css';

const XtermTerminal = () => {
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<Terminal | null>(null);

  useEffect(() => {
    if (!terminalRef.current) return;

    // 1. Initialize Terminal instance
    const term = new Terminal({
      cursorBlink: true,
      fontSize: 12,
      fontFamily: '"Cascadia Code", Menlo, monospace',
      theme: {
        background: '#000000',
        foreground: '#ffffff'
      }
    });

    // 2. Load FitAddon
    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);

    // Open terminal in ref
    term.open(terminalRef.current);
    
    // Small delay to ensure container is ready for fit
    setTimeout(() => {
        fitAddon.fit();
    }, 100);
    
    xtermRef.current = term;

    // 3. Connect to /api/terminal/shell via Socket.io
    const socket = io('${API_BASE}', {
      path: '/api/terminal/socket'
    });

    // 4. pty.onData -> term.write
    socket.on('output', (data) => {
      term.write(data);
    });

    // 5. term.onData -> pty.write
    term.onData((data) => {
      socket.emit('input', data);
    });

    // Handle resizing
    const handleResize = () => {
        fitAddon.fit();
    };
    window.addEventListener('resize', handleResize);
    
    term.onResize(({ cols, rows }) => {
      socket.emit('resize', { cols, rows });
    });

    return () => {
      socket.disconnect();
      term.dispose();
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return (
    <div className="flex flex-col h-full bg-black border-t border-slate-800 animate-in slide-in-from-bottom duration-300">
      <div className="flex items-center justify-between px-4 py-1.5 bg-[#0F172A] border-b border-slate-800">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Interactive Shell</span>
          <span className="text-[8px] bg-[#1E293B] text-[#22C55E] px-1.5 rounded font-mono">bash</span>
        </div>
        <div className="flex gap-4">
          <button 
            onClick={() => xtermRef.current?.clear()}
            className="text-[10px] text-slate-500 hover:text-white"
          >
            Clear
          </button>
          <button className="text-[10px] text-slate-500 hover:text-white font-bold">Cmd+J</button>
        </div>
      </div>
      
      {/* Actual Terminal Container */}
      <div 
        ref={terminalRef} 
        className="flex-1 p-2 overflow-hidden"
      />
    </div>
  );
};

export default XtermTerminal;