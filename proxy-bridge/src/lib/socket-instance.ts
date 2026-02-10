import { Server } from 'socket.io';
import { logContext, logger } from './logger';

// BP-11: Hardened singleton for Next.js dev mode
// Using a symbol or a very specific string on global ensures it survives HMR
const SOCKET_KEY = '__QUEEN_BEE_IO_INSTANCE__';

export function getIO(): Server | null {
  return (global as any)[SOCKET_KEY] || null;
}

export function setIO(server: Server) {
  (global as any)[SOCKET_KEY] = server;
  console.log(`[SocketInstance] IO instance set globally via ${SOCKET_KEY}`);
}

export function broadcast(event: string, data: any) {
  const io = getIO();
  if (io) {
    const context = logContext.getStore();
    const payload = context?.requestId 
      ? { ...data, requestId: context.requestId }
      : data;
      
    logger.verbose(`[Socket] Broadcasting event: ${event}`, data);
    io.emit(event, payload);
  } else {
    console.warn(`[SocketInstance] Cannot broadcast '${event}': IO not initialized in current process.`);
  }
}
