import { FileWatcher } from './FileWatcher';
import { ContextScraper } from './ContextScraper';
import { Socket } from 'socket.io';
import { broadcast } from './socket-instance';

export class AutoContextManager {
  private watcher: FileWatcher;
  private scraper: ContextScraper;
  private socket: Socket; // Keep socket reference for broadcasting
  private activeContext: any = {};
  private currentProjectPath: string | null = null;

  constructor(socket: Socket) {
    this.socket = socket;
    this.watcher = new FileWatcher(); // FileWatcher does not take socket anymore
    this.scraper = new ContextScraper();
    this.setupFileWatcherListener();
  }

  private setupFileWatcherListener() {
    this.watcher.on('file-change', ({ eventType, filePath, relativePath, timestamp }) => {
      if (this.currentProjectPath) {
        console.log(`[AutoContext] File change detected: ${eventType} ${filePath}`);
        // Relay the file change to the EventLoopManager
        broadcast('FILE_CHANGE_DETECTED', {
          projectId: 'current_project_id', // TODO: Get actual project ID
          filePath: filePath,
          treePath: this.currentProjectPath,
          eventType: eventType,
          relativePath: relativePath,
          timestamp: timestamp,
        });
      }
    });
  }

  async focusProject(projectPath: string) {
    console.log(`[AutoContext] Focusing on ${projectPath}`);
    this.watcher.stop();
    this.currentProjectPath = projectPath;
    this.watcher.start(projectPath);
    
    // Initial deep scan
    this.activeContext = await this.scraper.scrape(projectPath);
    return this.activeContext;
  }

  getContext() {
    return this.activeContext;
  }
}
