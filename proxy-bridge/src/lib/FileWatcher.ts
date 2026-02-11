import chokidar from 'chokidar';
import { EventEmitter } from 'events';
import { broadcast } from './socket-instance';
import path from 'path';

/**
 * FileWatcher: Monitors the filesystem for changes.
 * Used by EventLoopManager to trigger UI updates and diff calculations.
 */
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
      depth: 9,
    });

    this.watcher.on('all', (eventType, filePath) => {
      // Avoid tracking temp files created by ToolExecutor
      if (filePath.includes('agent_cmd_')) return;

      const relativePath = this.projectPath ? path.relative(this.projectPath, filePath) : filePath;
      const eventData = {
        eventType,
        filePath,
        relativePath,
        projectPath: this.projectPath,
        timestamp: Date.now()
      };
      
      this.emit('file-change', eventData);
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
