import { Socket } from 'socket.io';

/**
 * IDESyncHook: Synchronizes the agent's context with your local IDE (VSCode/Xcode).
 * Allows 'Auto Context' where the agent knows which file you are currently editing.
 */
export class IDESyncHook {
  private socket: Socket;
  private currentFile: string | null = null;

  constructor(socket: Socket) {
    this.socket = socket;
    this.setupListeners();
  }

  private setupListeners() {
    /**
     * Event from the Mac Electron App (Accessibility API) 
     * or a VSCode Extension telling us the focused file.
     */
    this.socket.on('IDE_FOCUS_CHANGE', (data: { filePath: string, line?: number }) => {
      console.log(`[IDESync] Focus shifted to: ${data.filePath}`);
      this.currentFile = data.filePath;
      
      // Broadcast to the project's agentic loop
      this.socket.emit('UI_UPDATE', {
        action: 'UPDATE_AUTO_CONTEXT',
        payload: { filePath: data.filePath, line: data.line }
      });
    });
  }

  getCurrentContext() {
    return this.currentFile;
  }
}
