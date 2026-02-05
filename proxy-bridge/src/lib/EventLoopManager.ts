import { Socket } from 'socket.io';
import { HiveOrchestrator } from './HiveOrchestrator';
import { UniversalDispatcher } from './UniversalDispatcher';
import { broadcast } from './socket-instance';

/**
 * EventLoopManager: The "Nervous System" of Queen Bee.
 * Ensures that backend actions trigger the correct UI state changes and logical continuity.
 */
export class EventLoopManager {
  private socket: Socket;
  private orchestrator: HiveOrchestrator;
  private dispatcher: UniversalDispatcher;

  constructor(socket: Socket) {
    this.socket = socket;
    this.orchestrator = new HiveOrchestrator(socket);
    this.dispatcher = new UniversalDispatcher(socket);
    this.setupListeners();
  }

  private setupListeners() {
    /**
     * Scenario: User submits a prompt in the Global Bar
     */
    this.socket.on('CMD_SUBMIT', async ({ prompt, projectPath, projectId }) => {
      console.log(`[EventLoop] Processing global prompt: ${prompt}`);
      
      broadcast('QUEEN_STATUS', { status: 'thinking', target: projectId });

      const result = await this.dispatcher.dispatch(prompt, projectPath);

      if (result.type === 'ACTION') {
        const agentName = result.agentName || 'Worker Bee';
        broadcast('UI_UPDATE', {
          action: 'SPAWN_AGENT_UI',
          payload: {
            projectId: projectId,
            agentName: agentName,
            status: 'initializing'
          }
        });

        // After successful workflow start, trigger initial DIFF update
        broadcast('UI_UPDATE', {
          action: 'SET_AGENT_STATUS',
          payload: { projectId, agentName, status: 'working' }
        });
      }
    });

    /**
     * Scenario: Agent modified a file
     * This is triggered by the FileWatcher inside AutoContextManager
     */
    this.socket.on('FILE_CHANGE_DETECTED', async ({ projectId, filePath, treePath }) => {
      console.log(`[EventLoop] File change detected in ${filePath}. Updating Diff View.`);
      
      // Notify UI to refresh the Diff for this specific file
      broadcast('UI_UPDATE', {
        action: 'UPDATE_LIVE_DIFF',
        payload: {
          projectId,
          filePath,
          // The UI will now call /api/git/diff to get the structured JSON
        }
      });
    });

    /**
     * Scenario: Agent finishes code implementation
     */
    this.socket.on('AGENT_CODE_COMPLETE', async ({ projectId, treePath }) => {
      broadcast('UI_UPDATE', { action: 'SET_AGENT_STATUS', payload: { projectId, status: 'verifying' } });
      
      broadcast('UI_UPDATE', { 
        action: 'OPEN_REVIEW_PANE', 
        payload: { projectId, treePath } 
      });
    });
  }
}
