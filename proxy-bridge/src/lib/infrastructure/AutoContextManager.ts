import { ContextScraper } from './ContextScraper';
import { Socket } from 'socket.io';

export class AutoContextManager {
  private scraper: ContextScraper;
  private socket: Socket;
  private activeContext: any = {};
  private currentProjectPath: string | null = null;

  constructor(socket: Socket) {
    this.socket = socket;
    this.scraper = new ContextScraper();
  }

  async focusProject(projectPath: string) {
    console.log(`[AutoContext] Focusing on ${projectPath}`);
    this.currentProjectPath = projectPath;
    
    // Initial deep scan
    this.activeContext = await this.scraper.scrape(projectPath);
    return this.activeContext;
  }

  getContext() {
    return this.activeContext;
  }
}
