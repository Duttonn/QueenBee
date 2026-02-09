import React, { useEffect, useRef } from 'react';
import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import { io } from 'socket.io-client';
import 'xterm/css/xterm.css';
import { API_BASE } from '../../services/api';

const XtermTerminal = () => {
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);

  useEffect(() => {
    if (!terminalRef.current) return;

    // 1. Initialize Terminal instance
    const term = new Terminal({
      cursorBlink: true,
      fontSize: 12,
      fontFamily: '"JetBrains Mono", "Fira Code", monospace',
      theme: {
        background: '#18181b', // zinc-950
        foreground: '#e4e4e7', // zinc-200
        cursor: '#a1a1aa',     // zinc-400
        selectionBackground: 'rgba(255, 255, 255, 0.1)',
        black: '#18181b',
        red: '#ef4444',
        green: '#22c55e',
        yellow: '#eab308',
        blue: '#3b82f6',
        magenta: '#a855f7',
        cyan: '#06b6d4',
        white: '#e4e4e7',
        brightBlack: '#71717a',
        brightRed: '#f87171',
        brightGreen: '#4ade80',
        brightYellow: '#facc15',
        brightBlue: '#60a5fa',
        brightMagenta: '#c084fc',
        brightCyan: '#22d3ee',
        brightWhite: '#ffffff'
      }
    });

    // 2. Load FitAddon
    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    fitAddonRef.current = fitAddon;

    // Open terminal in ref
    term.open(terminalRef.current);
    xtermRef.current = term;

    // Safely fit
    const safeFit = () => {
        try {
            fitAddon.fit();
        } catch (e) {
            // Ignore dimension errors during animation
        }
    };

    // Small delay to ensure container is ready for fit
    setTimeout(safeFit, 100);
    // Poll for readiness
    const fitInterval = setInterval(safeFit, 500);

    // 3. Connect to /api/terminal/socket via Socket.io
    // First, hit the endpoint to ensure the server is initialized
    let socket: any = null;
    
    fetch(`${API_BASE}/api/terminal/socket`).finally(() => {
        socket = io(API_BASE, {
            path: '/api/terminal/socket',
            reconnectionAttempts: 5
        });

        // 4. pty.onData -> term.write
        socket.on('output', (data: any) => {
            term.write(data);
        });

        // 5. term.onData -> pty.write
        term.onData((data) => {
            socket.emit('input', data);
        });
        
        socket.on('connect', () => {
            safeFit();
            // Send initial resize
            const dims = fitAddon.proposeDimensions();
            if (dims) {
                socket.emit('resize', { cols: dims.cols, rows: dims.rows });
            }
        });
    });

    // Handle resizing
    const handleResize = () => {
        safeFit();
        if (socket && fitAddon) {
            const dims = fitAddon.proposeDimensions();
            if (dims) {
                socket.emit('resize', { cols: dims.cols, rows: dims.rows });
            }
        }
    };
    window.addEventListener('resize', handleResize);
    
    term.onResize(({ cols, rows }) => {
        if (socket) {
            socket.emit('resize', { cols, rows });
        }
    });

    return () => {
      clearInterval(fitInterval);
      if (socket) socket.disconnect();
      term.dispose();
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return (
    <div className="flex flex-col h-full bg-zinc-950 border-t border-zinc-800 animate-in slide-in-from-bottom duration-300 shadow-2xl">
      <div className="flex items-center justify-between px-4 py-2 bg-zinc-900/50 backdrop-blur-md border-b border-zinc-800">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Terminal</span>
          <div className="flex items-center gap-1.5 px-1.5 py-0.5 rounded bg-zinc-800 border border-zinc-700">
            <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></div>
            <span className="text-[9px] text-zinc-300 font-mono">bash</span>
          </div>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={() => xtermRef.current?.clear()}
            className="text-[10px] font-medium text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            Clear
          </button>
        </div>
      </div>
      
      {/* Actual Terminal Container */}
      <div 
        className="flex-1 p-1 overflow-hidden bg-zinc-950"
      >
        <div ref={terminalRef} className="h-full w-full" />
      </div>
    </div>
  );
};

export default XtermTerminal;