import { HiveOrchestrator } from './HiveOrchestrator';
import { ContextScraper } from './ContextScraper';
import { Socket } from 'socket.io';

/**
 * OrchestrationVisualizer: Implements the UI-driven animation of the "Queen Bee" thought process.
 * Instead of hidden logic, it emits step-by-step events that the Frontend uses to "animate"
 * clicking buttons and spawning workers.
 */
export class OrchestrationVisualizer {
  private orchestrator: HiveOrchestrator;
  private scraper: ContextScraper;
  private socket: Socket;

  constructor(socket: Socket) {
    this.socket = socket;
    this.orchestrator = new HiveOrchestrator(socket);
    this.scraper = new ContextScraper();
  }

  async executeVisualPlan(complexCommand: string, projectPaths: string[]) {
    this.socket.emit('ORCH_VISUAL_START', { command: complexCommand });

    for (const path of projectPaths) {
      // Step 1: Visual Reconnaissance
      this.socket.emit('ORCH_STEP', { 
        project: path, 
        action: 'PEEKING', 
        status: 'Scanning codebase for project-specific context...' 
      });
      const context = await this.scraper.scrape(path);

      // Step 2: Prompt Engineering (Pre-flight)
      this.socket.emit('ORCH_STEP', { 
        project: path, 
        action: 'DRAFTING', 
        status: 'Synthesizing super-prompt based on README and TODOs...' 
      });
      const engineeredPrompt = await this.engineerPrompt(complexCommand, context);

      // Step 3: Visual "Spawn" (This triggers the sidebar bee to light up)
      this.socket.emit('ORCH_STEP', { 
        project: path, 
        action: 'SPAWNING', 
        status: 'Deploying Worker Bee with enhanced context.',
        engineeredPrompt
      });

      // Step 4: Actual Execution (Async)
      this.orchestrator.startFeatureWorkflow(path, engineeredPrompt, path);
      
      // Artificial delay to let the user see the "clicks" happening in the UI
      await new Promise(resolve => setTimeout(resolve, 800));
    }

    this.socket.emit('ORCH_VISUAL_COMPLETE');
  }

  private async engineerPrompt(raw: string, context: any) {
    // Logic to combine user intent with scraped context
    return `[Engineered] ${raw} (Context: ${context.todos.length} pending tasks found)`;
  }
}
