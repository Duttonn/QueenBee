import { createServer } from 'http';
import { Server } from 'socket.io';
import { EventLoopManager } from './src/lib/EventLoopManager.ts';
import { setIO } from './src/lib/socket-instance.ts';

const PORT = 3001;

const httpServer = createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Queen Bee Socket Server is Running\\n');
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
