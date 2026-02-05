import { FileWatcher } from './FileWatcher';
import { ContextScraper } from './ContextScraper';
import { Socket } from 'socket.io';

export class AutoContextManager {
  private watcher: FileWatcher;
  private scraper: ContextScraper;
  private activeContext: any = {};

  constructor(socket: Socket) {
    this.watcher = new FileWatcher(socket);
    this.scraper = new ContextScraper();
  }

  async focusProject(projectPath: string) {
    console.log(`[AutoContext] Focusing on ${projectPath}`);
    this.watcher.stop();
    this.watcher.start(projectPath);
    
    // Initial deep scan
    this.activeContext = await this.scraper.scrape(projectPath);
    return this.activeContext;
  }

  getContext() {
    return this.activeContext;
  }
}
