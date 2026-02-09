import { Socket } from 'socket.io';

/**
 * RuntimeBridge: The "Atlas-grade" inspector logic.
 * Injects a proxy into the running app to allow high-precision inspection.
 */
export class RuntimeBridge {
  private socket: Socket;

  constructor(socket: Socket) {
    this.socket = socket;
  }

  /**
   * Links a UI element back to its source code
   */
  async inspectElement(componentId: string) {
    console.log(`[Inspector] Querying source for component: ${componentId}`);

    if (!this.socket.connected) {
      return {
        connected: false,
        error: 'No runtime connected. Start your app with Queen Bee Dev Server to enable inspection.'
      };
    }

    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        resolve({
          connected: false,
          error: 'Runtime query timed out. Ensure the app has the Queen Bee inspector script loaded.'
        });
      }, 5000);

      this.socket.emit('RUNTIME_QUERY', { action: 'GET_SOURCE', id: componentId });
      this.socket.once('RUNTIME_QUERY_RESULT', (data: any) => {
        clearTimeout(timeout);
        resolve(data);
      });
    });
  }

  /**
   * Executes a test action directly in the app's internal logic
   */
  async executeRuntimeAction(action: string, params: any) {
    console.log(`[Runtime] Executing autonomous test: ${action}`);
    this.socket.emit('RUNTIME_EXEC', { action, params });
  }
}
