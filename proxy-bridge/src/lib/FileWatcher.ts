import chokidar from 'chokidar';
import { Socket } from 'socket.io';

export class FileWatcher {
  private watcher: any;
  private socket: Socket;

  constructor(socket: Socket) {
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
      this.socket.emit('FILE_CHANGE', { path, timestamp: Date.now() });
    });
  }

  stop() {
    if (this.watcher) this.watcher.close();
  }
}
