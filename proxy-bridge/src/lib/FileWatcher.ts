import chokidar from 'chokidar';
import { Socket } from 'socket.io';
import { EventEmitter } from 'events';

export class FileWatcher extends EventEmitter {
  private watcher: any;
  private socket: Socket;

  constructor(socket: Socket) {
    super();
    this.socket = socket;
  }

  start(projectPath: string) {
    console.log(`[Watcher] Starting auto-context for ${projectPath}`);
    this.watcher = chokidar.watch(projectPath, {
      ignored: /(^|[\/\\])\../, // ignore dotfiles
      persistent: true
    });

    this.watcher.on('change', (path: string) => {
      console.log(`[Watcher] File changed: ${path}`);
      const timestamp = Date.now();
      
      // Emit locally for AutoContextManager
      this.emit('file-change', { 
        eventType: 'change', 
        filePath: path, 
        relativePath: path, // Simplified for now
        timestamp 
      });

      // Emit to socket for frontend
      this.socket.emit('FILE_CHANGE', { path, timestamp });
    });
  }

  stop() {
    if (this.watcher) this.watcher.close();
  }
}
