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
      ignored: /(^|[\/\\])\..*|node_modules|dist/, // Ignore dotfiles, node_modules and dist
      persistent: true,
      ignoreInitial: true,
      depth: 9,
      atomic: true
    });

    this.watcher.on('all', (eventType, filePath) => {
      console.log(`[FileWatcher] Event '${eventType}' for file: ${filePath}`);
      const timestamp = Date.now();
      
      const eventData = { 
        eventType, 
        filePath,
        projectPath, 
        timestamp 
      };

      this.emit('file-change', eventData);
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
