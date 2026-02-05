import { Socket } from 'socket.io';

/**
 * NativeNotificationBridge: Sends system-level notifications to the Mac App.
 */
export class NativeNotificationBridge {
  private socket: Socket;

  constructor(socket: Socket) {
    this.socket = socket;
  }

  send(title: string, body: string, urgency: 'normal' | 'high' = 'normal') {
    this.socket.emit('NATIVE_NOTIFICATION', {
      title,
      body,
      urgency,
      timestamp: Date.now()
    });
  }
}
