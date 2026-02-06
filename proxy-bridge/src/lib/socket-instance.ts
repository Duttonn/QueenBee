import { Server } from 'socket.io';

// Use global to persist across hot-reloads in Next.js development
const globalForSocket = global as unknown as { io: Server | undefined };

export function getIO(): Server | null {
  return globalForSocket.io || null;
}

export function setIO(server: Server) {
  globalForSocket.io = server;
}

export function broadcast(event: string, data: any) {
  const io = getIO();
  if (io) {
    io.emit(event, data);
  } else {
    console.warn(`[SocketInstance] Cannot broadcast '${event}': IO not initialized.`);
  }
}
