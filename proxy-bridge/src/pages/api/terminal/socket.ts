import type { NextApiRequest, NextApiResponse } from 'next';
import { Server } from 'socket.io';
import { spawn } from 'node-pty';
import os from 'os';
import path from 'path';
import fs from 'fs';

/**
 * Terminal Bridge Service (Xterm.js <-> PTY)
 *
 * FIX-09 improvements:
 *  - Passes `cwd` from socket query param to the pty spawn
 *  - Validates cwd exists before using it (falls back to $HOME)
 *  - Forwards a richer env (includes $SHELL, $TERM_PROGRAM, $PATH) so
 *    macOS shells pick up the correct profile
 *  - Handles pty spawn errors gracefully (sends error message to UI)
 *  - Cleans up pty on socket error event (not just disconnect)
 */
export default function handler(req: NextApiRequest, res: NextApiResponse) {
  // Guard against duplicate initialisation (Next.js hot-reload safe)
  if (res.socket && (res.socket as any).server.io_terminal) {
    res.end();
    return;
  }

  const io = new Server((res.socket as any).server, {
    path: '/api/terminal/socket',
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
  });
  (res.socket as any).server.io_terminal = io;

  io.on('connection', (socket) => {
    // Resolve working directory from query (sent by XtermTerminal)
    const rawCwd = typeof socket.handshake.query?.cwd === 'string'
      ? socket.handshake.query.cwd
      : undefined;

    let cwd = os.homedir();
    if (rawCwd) {
      const resolved = path.resolve(rawCwd);
      try {
        if (fs.existsSync(resolved) && fs.statSync(resolved).isDirectory()) {
          cwd = resolved;
        }
      } catch { /* keep default */ }
    }

    // Resolve a shell binary that actually exists on this system.
    // GUI Electron apps on macOS often have SHELL unset; probe candidates.
    const shellCandidates = [
      process.env.SHELL,
      '/bin/zsh',
      '/bin/bash',
      '/usr/bin/zsh',
      '/usr/bin/bash',
      '/bin/sh',
    ].filter(Boolean) as string[];

    const shell = shellCandidates.find(s => {
      try { fs.accessSync(s, fs.constants.X_OK); return true; } catch { return false; }
    }) ?? '/bin/sh';

    console.log(`[Terminal] Connected — cwd: ${cwd}, shell: ${shell}`);

    // Build a rich env so macOS shells get correct PATH, TERM, etc.
    const shellEnv: Record<string, string> = {
      ...process.env as Record<string, string>,
      TERM: 'xterm-256color',
      COLORTERM: 'truecolor',
      TERM_PROGRAM: 'QueenBee',
      HOME: os.homedir(),
      SHELL: shell,
    };

    let ptyProcess: ReturnType<typeof spawn> | null = null;
    try {
      ptyProcess = spawn(shell, [], {
        name: 'xterm-256color',
        cols: 80,
        rows: 24,
        cwd,
        env: shellEnv,
      });
    } catch (err: any) {
      console.error('[Terminal] Failed to spawn PTY:', err.message);
      socket.emit('output', `\r\n\x1b[31m[Terminal] Failed to start shell: ${err.message}\x1b[0m\r\n`);
      socket.disconnect();
      return;
    }

    // Pipe PTY output → UI
    ptyProcess.onData((data) => {
      socket.emit('output', data);
    });

    // Pipe UI input → PTY
    socket.on('input', (data: string) => {
      try { ptyProcess?.write(data); } catch { /* pty may have exited */ }
    });

    // Handle resize
    socket.on('resize', ({ cols, rows }: { cols: number; rows: number }) => {
      try {
        if (cols > 0 && rows > 0) ptyProcess?.resize(cols, rows);
      } catch { /* ignore */ }
    });

    const cleanup = () => {
      try { ptyProcess?.kill(); } catch { /* already dead */ }
      console.log('[Terminal] Shell process killed');
    };

    socket.on('disconnect', cleanup);
    socket.on('error', cleanup);
  });

  res.end();
}
