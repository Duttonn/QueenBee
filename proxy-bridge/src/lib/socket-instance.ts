import { Server } from 'socket.io';

let io: Server | null = null;

export function getIO(): Server | null {
  return io;
}

export function setIO(server: Server) {
  io = server;
}

export function broadcast(event: string, data: any) {
  if (io) {
    io.emit(event, data);
  } else {
    console.warn(`[SocketInstance] Cannot broadcast '${event}': IO not initialized.`);
  }
}
