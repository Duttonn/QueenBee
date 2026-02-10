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

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  // Set CORS headers for preflight
  const allowedOrigins = [
    'http://127.0.0.1:5173', 
    'http://localhost:5173', 
    process.env.FRONTEND_URL || 'http://127.0.0.1:5173'
  ];
  
  const origin = req.headers.origin as string;
  const allowOrigin = allowedOrigins.includes(origin) ? origin : allowedOrigins[0];

  res.setHeader('Access-Control-Allow-Origin', allowOrigin);
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Request-Id');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

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
      origin: allowedOrigins,
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
