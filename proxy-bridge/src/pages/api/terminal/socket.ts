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

    // Build a minimal, clean environment for the PTY.
    // Do NOT spread all of process.env — Electron injects variables like
    // ELECTRON_RUN_AS_NODE, CHROME_*, etc. that can cause posix_spawnp to
    // fail or produce unexpected shell behavior on macOS.
    const macosExtraPaths = '/opt/homebrew/bin:/opt/homebrew/sbin:/usr/local/bin:/usr/local/sbin';
    const basePath = process.env.PATH || '/usr/bin:/bin:/usr/sbin:/sbin';
    const fullPath = basePath.includes('/opt/homebrew') ? basePath : `${macosExtraPaths}:${basePath}`;

    const userInfo = (() => { try { return os.userInfo(); } catch { return { username: 'user' }; } })();

    const shellEnv: Record<string, string> = {
      TERM:         'xterm-256color',
      COLORTERM:    'truecolor',
      TERM_PROGRAM: 'QueenBee',
      HOME:         os.homedir(),
      SHELL:        shell,
      PATH:         fullPath,
      USER:         process.env.USER || userInfo.username,
      LOGNAME:      process.env.LOGNAME || userInfo.username,
      LANG:         process.env.LANG || 'en_US.UTF-8',
      TMPDIR:       process.env.TMPDIR || os.tmpdir(),
      // Carry through SSH keys and agent socket if present (needed for git ops)
      ...(process.env.SSH_AUTH_SOCK  ? { SSH_AUTH_SOCK:  process.env.SSH_AUTH_SOCK  } : {}),
      ...(process.env.SSH_AGENT_PID  ? { SSH_AGENT_PID:  process.env.SSH_AGENT_PID  } : {}),
      // Pass NVM/ASDF/mise shims if they exist in PATH
      ...(process.env.NVM_DIR        ? { NVM_DIR:        process.env.NVM_DIR        } : {}),
      ...(process.env.ASDF_DIR       ? { ASDF_DIR:       process.env.ASDF_DIR       } : {}),
    };

    // Helper: attempt a single PTY spawn
    const trySpawn = (args: string[]): ReturnType<typeof spawn> => {
      return spawn(shell, args, {
        name: 'xterm-256color',
        cols: 80,
        rows: 24,
        cwd,
        env: shellEnv,
      });
    };

    let ptyProcess: ReturnType<typeof spawn> | null = null;
    try {
      // Try login shell first — ensures .profile/.zprofile are sourced
      ptyProcess = trySpawn(['-l']);
    } catch (loginErr: any) {
      console.warn('[Terminal] Login shell failed, retrying without -l:', loginErr.message);
      try {
        ptyProcess = trySpawn([]);
      } catch (err: any) {
        console.error('[Terminal] Failed to spawn PTY:', err.message);
        socket.emit('output', `\r\n\x1b[31m[Terminal] Failed to start shell: ${err.message}\x1b[0m\r\n`);
        socket.emit('output', `\r\n\x1b[33mShell tried: ${shell}\x1b[0m\r\n`);
        socket.emit('output', `\r\n\x1b[33mTip: If you see this in the packaged app, try installing Node.js from https://nodejs.org\x1b[0m\r\n`);
        socket.disconnect();
        return;
      }
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
