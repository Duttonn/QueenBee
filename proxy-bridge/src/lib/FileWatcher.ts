import chokidar from 'chokidar';
import { EventEmitter } from 'events';

export class FileWatcher extends EventEmitter {
  private watcher: chokidar.FSWatcher | null = null;

  constructor() {
    super();
  }

  start(projectPath: string) {
    console.log(`[Watcher] Starting file watcher for ${projectPath}`);
    if (this.watcher) {
      this.watcher.close();
    }
    
    this.watcher = chokidar.watch(projectPath, {
      ignored: /(^|[\/\\])\..+/, // ignore dotfiles and dot-directories
      persistent: true,
      ignoreInitial: true, // Don't send a deluge of events on startup
      atomic: true // Helps with stability on some systems
    });

    this.watcher.on('change', (path: string) => {
      console.log(`[Watcher] File changed: ${path}`);
      const timestamp = Date.now();
      
      this.emit('file-change', { 
        eventType: 'change', 
        filePath: path,
        // Passing projectPath to be used by the listener
        projectPath: projectPath, 
        timestamp 
      });
    });
  }

  stop() {
    if (this.watcher) {
      console.log('[Watcher] Stopping file watcher.');
      this.watcher.close();
      this.watcher = null;
    }
  }
}
