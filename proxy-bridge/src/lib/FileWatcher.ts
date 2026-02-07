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
      ignored: /(^|[\/\\])\..*|node_modules|dist/, // ignore dotfiles, node_modules, dist
      persistent: true,
      ignoreInitial: true,
      atomic: true
    });

    // Use 'all' to capture add/unlink as well
    this.watcher.on('all', (event, path: string) => {
      console.log(`[Watcher] File ${event}: ${path}`);
      const timestamp = Date.now();
      
      this.emit('file-change', { 
        eventType: event, 
        filePath: path,
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