import { Server } from 'socket.io';
import type { NextApiRequest, NextApiResponse } from 'next';
import { setIO } from '../../../lib/socket-instance';
import { EventLoopManager } from '../../../lib/EventLoopManager';

/**
 * Log Streaming & Monitoring Service
 * Uses WebSockets to pipe real-time logs from background jobs to the Hive UI.
 */

export const config = {
  api: {
    bodyParser: false,
  },
};

const DEFAULT_ORIGINS = ['https://queenbee.vercel.app', 'https://queen-bee-nataos-projects.vercel.app', 'http://localhost:3000', 'http://localhost:5173'];

function getAllowedOrigins(): string[] {
  return process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',').map(s => s.trim())
    : DEFAULT_ORIGINS;
}

function isOriginAllowed(origin: string | undefined): boolean {
  if (!origin || origin === 'null' || origin.startsWith('file://')) return true;
  if (getAllowedOrigins().includes(origin)) return true;
  if (origin.endsWith('.vercel.app')) return true;
  if (/^https?:\/\/[a-z0-9-]+\.trycloudflare\.com$/.test(origin)) return true;
  if (process.env.NODE_ENV !== 'production' && /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) return true;
  return false;
}

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  // CORS is handled by middleware.ts — no manual headers here

  if (res.socket && (res.socket as any).server.io) {
    console.log('[LogRelay] Socket.io already running');
    const existingIo = (res.socket as any).server.io;
    setIO(existingIo); 
    res.end();
    return;
  }

  console.log('[LogRelay] Initializing Socket.io with CORS...');
    const io = new Server((res.socket as any).server, {
        cors: {
          origin: (reqOrigin, callback) => {
            callback(null, isOriginAllowed(reqOrigin));
          },
        methods: ["GET", "POST"],
        credentials: true
      },
    path: '/api/logs/stream',
    transports: ['websocket', 'polling'],
    allowEIO3: true
  });

  (res.socket as any).server.io = io;
  setIO(io); // BP-12: Ensure singleton is populated IMMEDIATELY on creation

  io.on('connection', (socket) => {
    console.log('[LogRelay] Dashboard connected:', socket.id);

    // Initialize the Nervous System for this client
    new EventLoopManager(socket);

    socket.on('subscribe_to_job', (jobId) => {
      console.log(`[LogRelay] Subscribed to job logs: ${jobId}`);
      socket.join(`job_${jobId}`);
    });

    socket.on('disconnect', () => {
      console.log('[LogRelay] Dashboard disconnected:', socket.id);
    });
  });

  res.end();
}
