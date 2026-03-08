import { Server } from 'socket.io';
import { logContext, logger } from './logger';
import { DedupeCache } from './DedupeCache';
import crypto from 'crypto';

// BP-11: Hardened singleton for Next.js dev mode
// Using a symbol or a very specific string on global ensures it survives HMR
const SOCKET_KEY = '__QUEEN_BEE_IO_INSTANCE__';

// OP-05: Dedup cache for broadcast events (30s TTL, 1000 max entries)
const broadcastDedup = new DedupeCache<boolean>(30000, 1000);

export function getIO(): Server | null {
  return (global as any)[SOCKET_KEY] || null;
}

export function setIO(server: Server) {
  (global as any)[SOCKET_KEY] = server;
  console.log(`[SocketInstance] IO instance set globally via ${SOCKET_KEY}`);
}

/**
 * Generate a dedup key from event name + data.
 * Uses a hash of the serialized payload to avoid storing large keys.
 */
function dedupKey(event: string, data: any): string {
  const serialized = event + ':' + JSON.stringify(data);
  return crypto.createHash('md5').update(serialized).digest('hex');
}

export function broadcast(event: string, data: any) {
  const io = getIO();

  const context = logContext.getStore();
  const payload = context?.requestId
    ? { ...data, requestId: context.requestId }
    : data;

  // OP-05: Skip duplicate events within TTL window
  const key = dedupKey(event, payload);
  if (broadcastDedup.has(key)) {
    logger.verbose(`[Socket] Dedup: Skipping duplicate broadcast '${event}'`);
    return;
  }
  broadcastDedup.set(key, true);

  if (io) {
    logger.verbose(`[Socket] Broadcasting event: ${event}`, data);
    io.emit(event, payload);
  } else {
    // Next.js API process doesn't have the socket server — relay via HTTP
    const socketPort = process.env.SOCKET_PORT || '3001';
    const http = require('http');
    const body = JSON.stringify({ event, data: payload });
    const req = http.request({
      hostname: '127.0.0.1',
      port: parseInt(socketPort),
      path: '/internal/broadcast',
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) }
    });
    req.on('error', (err: Error) => {
      logger.verbose(`[SocketInstance] Relay broadcast '${event}' failed: ${err.message}`);
    });
    req.write(body);
    req.end();
  }
}
