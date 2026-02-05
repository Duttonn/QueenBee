import { Server } from 'socket.io';
import type { NextApiRequest, NextApiResponse } from 'next';
import { createServer } from 'http';

/**
 * Log Streaming & Monitoring Service
 * Uses WebSockets to pipe real-time logs from background jobs to the Hive UI.
 */

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (res.socket && (res.socket as any).server.io) {
    console.log('[LogRelay] Socket.io already running');
    res.end();
    return;
  }

  console.log('[LogRelay] Initializing Socket.io...');
  const io = new Server((res.socket as any).server);
  (res.socket as any).server.io = io;

  io.on('connection', (socket) => {
    console.log('[LogRelay] Dashboard connected:', socket.id);

    socket.on('subscribe_to_job', (jobId) => {
      console.log(`[LogRelay] Subscribed to job logs: ${jobId}`);
      socket.join(`job_${jobId}`);
    });
  });

  res.end();
}
