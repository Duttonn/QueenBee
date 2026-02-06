import chokidar from 'chokidar';
import { EventEmitter } from 'events';
import { broadcast } from './socket-instance';
import path from 'path';

export class FileWatcher extends EventEmitter {
  private watcher: chokidar.FSWatcher | null = null;
  private projectPath: string | null = null;

  constructor() {
    super();
  }

  start(projectPath: string) {
    if (this.watcher) {
      this.stop();
    }
    
    this.projectPath = projectPath;
    console.log(`[FileWatcher] Starting for ${projectPath}`);
    
    this.watcher = chokidar.watch(projectPath, {
      ignored: /(^|[\/\\])\..*|node_modules|dist/,
      persistent: true,
      ignoreInitial: true,
      depth: 9, // Adjust as needed
    });

    this.watcher.on('all', (eventType, filePath) => {
      console.log(`[FileWatcher] Event '${eventType}' for file: ${filePath}`);
      
      const relativePath = this.projectPath ? path.relative(this.projectPath, filePath) : filePath;
      const eventData = {
        eventType,
        filePath,
        relativePath,
        projectPath: this.projectPath,
        timestamp: Date.now()
      };
      
      // Emit locally for EventLoopManager
      this.emit('file-change', eventData);

      // Emit globally to all clients
      broadcast('FILE_CHANGE', eventData);
    });
  }

  stop() {
    if (this.watcher) {
      console.log(`[FileWatcher] Stopping for ${this.projectPath}`);
      this.watcher.close();
      this.watcher = null;
      this.projectPath = null;
    }
  }
}
