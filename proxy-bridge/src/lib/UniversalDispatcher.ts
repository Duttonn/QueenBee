import { RepoContextAggregator } from './RepoContextAggregator';
import { HiveOrchestrator } from './HiveOrchestrator';
import { Socket } from 'socket.io';

/**
 * UniversalDispatcher: The backend logic for the unified Cmd+K bar.
 * Decides whether to Search (Context Retrieval) or Command (Orchestration).
 */
export class UniversalDispatcher {
  private aggregator: RepoContextAggregator;
  private orchestrator: HiveOrchestrator;
  private socket: Socket;

  constructor(socket: Socket) {
    this.socket = socket;
    this.aggregator = new RepoContextAggregator();
    this.orchestrator = new HiveOrchestrator(socket);
  }

  async dispatch(input: string, activeProjectPath: string) {
    console.log(`[Dispatcher] Processing: "${input}"`);

    // 1. Heuristic Detection
    const isAction = this.detectIfAction(input);

    if (isAction) {
      this.socket.emit('DISPATCH_TYPE', { type: 'ACTION' });
      return this.orchestrator.startFeatureWorkflow(activeProjectPath, input, activeProjectPath);
    } else {
      this.socket.emit('DISPATCH_TYPE', { type: 'SEARCH' });
      // Search logic: uses the aggregator to find relevant snippets or files
      const results = await this.performSearch(input, activeProjectPath);
      this.socket.emit('SEARCH_RESULTS', results);
      return results;
    }
  }

  private detectIfAction(input: string): boolean {
    const actionKeywords = ['create', 'build', 'fix', 'add', 'implement', 'change', 'deploy', 'run', 'test'];
    const lowercaseInput = input.toLowerCase();
    return actionKeywords.some(keyword => lowercaseInput.startsWith(keyword));
  }

  private async performSearch(query: string, path: string) {
    console.log(`[Search] Searching for "${query}" in ${path}`);
    // Integrates with existing search tools (grep/qmd)
    return { query, matches: [], status: 'Searching codebase...' };
  }
}
