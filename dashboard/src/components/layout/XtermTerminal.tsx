import React, { useEffect, useRef, useState } from 'react';
import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import { io, Socket } from 'socket.io-client';
import 'xterm/css/xterm.css';
import { API_BASE } from '../../services/api';

interface XtermTerminalProps {
  /** Working directory to start the shell in */
  cwd?: string;
}

type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'error';

const XtermTerminal: React.FC<XtermTerminalProps> = ({ cwd }) => {
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const [status, setStatus] = useState<ConnectionStatus>('connecting');

  useEffect(() => {
    if (!terminalRef.current) return;

    // ── 1. Initialize Terminal ──────────────────────────────────────────
    const term = new Terminal({
      cursorBlink: true,
      fontSize: 12,
      fontFamily: '"JetBrains Mono", "Fira Code", monospace',
      theme: {
        background: '#18181b',
        foreground: '#e4e4e7',
        cursor: '#a1a1aa',
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
        brightWhite: '#ffffff',
      },
    });

    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    fitAddonRef.current = fitAddon;

    term.open(terminalRef.current);
    xtermRef.current = term;

    term.writeln('\x1b[90mConnecting to shell…\x1b[0m');

    const safeFit = () => {
      try { fitAddon.fit(); } catch { /* ignore during animation */ }
    };

    // Fit after a brief delay to let the container settle
    const fitTimer = setTimeout(safeFit, 120);
    const fitInterval = setInterval(safeFit, 600);

    // ── 2. Init socket server, then connect ────────────────────────────
    const connectShell = async () => {
      try {
        // Initialise the PTY socket server (idempotent — server guards dup init)
        await fetch(`${API_BASE}/api/terminal/socket`, { credentials: 'include' });
      } catch {
        // If the init request fails the socket connection will fail too; let it show error state
      }

      const socket: Socket = io(API_BASE, {
        path: '/api/terminal/socket',
        // Polling is blocked by Next.js routing — WebSocket only
        transports: ['websocket'],
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
        query: cwd ? { cwd } : undefined,
      });
      socketRef.current = socket;

      socket.on('connect', () => {
        setStatus('connected');
        term.clear();
        safeFit();
        // Send initial terminal dimensions
        const dims = fitAddon.proposeDimensions();
        if (dims) socket.emit('resize', { cols: dims.cols, rows: dims.rows });
      });

      socket.on('disconnect', () => setStatus('disconnected'));
      socket.on('connect_error', () => setStatus('error'));

      socket.on('output', (data: string) => term.write(data));

      term.onData((data) => {
        if (socket.connected) socket.emit('input', data);
      });

      term.onResize(({ cols, rows }) => {
        if (socket.connected) socket.emit('resize', { cols, rows });
      });
    };

    connectShell();

    // ── 3. Window resize handler ───────────────────────────────────────
    const handleResize = () => {
      safeFit();
      const dims = fitAddonRef.current?.proposeDimensions();
      if (dims && socketRef.current?.connected) {
        socketRef.current.emit('resize', { cols: dims.cols, rows: dims.rows });
      }
    };
    window.addEventListener('resize', handleResize);

    return () => {
      clearTimeout(fitTimer);
      clearInterval(fitInterval);
      window.removeEventListener('resize', handleResize);
      socketRef.current?.disconnect();
      term.dispose();
    };
  }, [cwd]);

  const statusDot: Record<ConnectionStatus, { color: string; label: string; pulse: boolean }> = {
    connecting:   { color: 'bg-yellow-400', label: 'connecting', pulse: true },
    connected:    { color: 'bg-green-500',  label: 'bash',       pulse: true },
    disconnected: { color: 'bg-zinc-500',   label: 'disconnected', pulse: false },
    error:        { color: 'bg-red-500',    label: 'error',      pulse: false },
  };
  const dot = statusDot[status];

  const handleReconnect = () => {
    setStatus('connecting');
    socketRef.current?.connect();
  };

  return (
    <div className="flex flex-col h-full bg-zinc-950 border-t border-zinc-800 animate-in slide-in-from-bottom duration-300 shadow-2xl">
      {/* Title bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-zinc-900/50 backdrop-blur-md border-b border-zinc-800">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Terminal</span>
          <div className="flex items-center gap-1.5 px-1.5 py-0.5 rounded bg-zinc-800 border border-zinc-700">
            <div className={`w-1.5 h-1.5 rounded-full ${dot.color} ${dot.pulse ? 'animate-pulse' : ''}`} />
            <span className="text-[9px] text-zinc-300 font-mono">{dot.label}</span>
          </div>
        </div>
        <div className="flex gap-3">
          {(status === 'disconnected' || status === 'error') && (
            <button
              onClick={handleReconnect}
              className="text-[10px] font-medium text-zinc-500 hover:text-yellow-400 transition-colors"
            >
              Reconnect
            </button>
          )}
          <button
            onClick={() => xtermRef.current?.clear()}
            className="text-[10px] font-medium text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            Clear
          </button>
        </div>
      </div>

      {/* Terminal container */}
      <div className="flex-1 p-1 overflow-hidden bg-zinc-950">
        <div ref={terminalRef} className="h-full w-full" />
      </div>
    </div>
  );
};

export default XtermTerminal;
