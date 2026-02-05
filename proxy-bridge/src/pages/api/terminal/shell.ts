import type { NextApiRequest, NextApiResponse } from 'next';
import { Server } from 'socket.io';
import { spawn } from 'node-pty';

/**
 * Terminal Bridge Service (Xterm.js <-> PTY)
 * Spawns a real shell on the VPS and pipes it to the UI via WebSockets.
 */

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (res.socket && (res.socket as any).server.io_terminal) {
    res.end();
    return;
  }

  const io = new Server((res.socket as any).server, {
    path: '/api/terminal/socket',
  });
  (res.socket as any).server.io_terminal = io;

  io.on('connection', (socket) => {
    console.log('[Terminal] User connected to shell');

    // Spawn a PTY (Pseudo-Terminal)
    const ptyProcess = spawn('bash', [], {
      name: 'xterm-color',
      cols: 80,
      rows: 24,
      cwd: '/home/fish/clawd',
      env: process.env
    });

    // Pipe PTY output to UI
    ptyProcess.onData((data) => {
      socket.emit('output', data);
    });

    // Pipe UI input to PTY
    socket.on('input', (data) => {
      ptyProcess.write(data);
    });

    // Handle resizing
    socket.on('resize', ({ cols, rows }) => {
      ptyProcess.resize(cols, rows);
    });

    socket.on('disconnect', () => {
      ptyProcess.kill();
      console.log('[Terminal] Shell process killed');
    });
  });

  res.end();
}
