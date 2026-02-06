import { createServer } from 'http';
import { Server } from 'socket.io';
import { EventLoopManager } from './src/lib/EventLoopManager.js';
import { setIO } from './src/lib/socket-instance.js';
import { TaskManager } from './src/lib/TaskManager.js';

const PORT = 3001;

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
    origin: '*', // Allow all origins for local dev
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

httpServer.listen(PORT, () => {
  console.log(`
🐝 QUEEN BEE SOCKET SERVER LISTENING ON PORT ${PORT}`);
  console.log(`   - Status: 🟢 ONLINE`);
  console.log(`   - Mode:   BOOTSTRAP`);
});
