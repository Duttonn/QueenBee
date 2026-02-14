import 'dotenv/config';

import { createServer } from 'http';
import { Server } from 'socket.io';
import { EventLoopManager } from './src/lib/EventLoopManager';
import { setIO } from './src/lib/socket-instance';
import { TaskManager } from './src/lib/TaskManager';
import { cronManager } from './src/lib/CronManager';
import { HeartbeatService } from './src/lib/HeartbeatService';
import { TriggerEngine } from './src/lib/TriggerEngine';
import { Paths } from './src/lib/Paths';

const PORT = parseInt(process.env.SOCKET_PORT || '3001', 10);
const HOST = process.env.SOCKET_HOST || '0.0.0.0'; // 0.0.0.0 for VPS, works fine locally too

// CORS: read from env, fall back to local dev defaults
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || 'http://127.0.0.1:5173,http://localhost:5173')
  .split(',')
  .map(s => s.trim());

// Dynamic origin checker: allows listed origins, Electron (null/file://), and trycloudflare tunnels
function isOriginAllowed(origin: string | undefined): boolean {
  if (!origin || origin === 'null') return true; // Electron sends null or no origin
  if (origin.startsWith('file://')) return true; // Electron file:// protocol
  if (ALLOWED_ORIGINS.includes(origin)) return true;
  if (/^https?:\/\/[a-z0-9-]+\.trycloudflare\.com$/.test(origin)) return true;
  // In development, allow all localhost origins
  if (process.env.NODE_ENV !== 'production' && /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) return true;
  return false;
}

// Initialize Cron Jobs
cronManager.init().catch(err => console.error('Failed to init cron manager', err));

// Start Heartbeat Service
HeartbeatService.start().catch(err => console.error('Failed to start heartbeat service', err));

// Start Trigger Engine
const triggerEngine = new TriggerEngine(Paths.getWorkspaceRoot());
triggerEngine.start().catch(err => console.error('Failed to start trigger engine', err));

const httpServer = createServer(async (req, res) => {
  // Simple router for Claim API
  if (req.url === '/api/tasks/claim' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    req.on('end', async () => {
      try {
        const { taskId, agentId } = JSON.parse(body);
        const success = await TaskManager.claimTask(taskId, agentId || 'UNKNOWN_AGENT');
        
        if (success) {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ status: 'GRANTED', taskId, agentId }));
        } else {
          res.writeHead(409, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ status: 'DENIED', message: 'Task not found or already claimed' }));
        }
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid JSON or missing fields' }));
      }
    });
    return;
  }

  // Health check
  if (req.url === '/api/health' || req.url === '/') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', server: 'Queen Bee Socket + GSD', port: PORT }));
    return;
  }

  res.writeHead(404);
  res.end();
});

const io = new Server(httpServer, {
  cors: {
    origin: (origin, callback) => {
      if (isOriginAllowed(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`Origin ${origin} not allowed`));
      }
    },
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Codex-Provider'],
    credentials: true
  }
});

// Set global instance
setIO(io);

io.on('connection', (socket) => {
  console.log(`[Socket] Client connected: ${socket.id}`);
  
  // Initialize the Nervous System for this client
  new EventLoopManager(socket);

  socket.on('disconnect', () => {
    console.log(`[Socket] Client disconnected: ${socket.id}`);
  });
});

httpServer.listen(PORT, HOST, () => {
  console.log(`
🐝 QUEEN BEE SOCKET SERVER LISTENING ON ${HOST}:${PORT}`);
  console.log(`   - Status: 🟢 ONLINE`);
  console.log(`   - Mode:   ${process.env.NODE_ENV === 'production' ? 'PRODUCTION' : 'DEVELOPMENT'}`);
});
