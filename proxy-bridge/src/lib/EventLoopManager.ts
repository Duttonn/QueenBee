import { Socket } from 'socket.io';
import { HiveOrchestrator } from './HiveOrchestrator';
import { UniversalDispatcher } from './UniversalDispatcher';

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
      
      // 1. Notify UI that the Queen is thinking
      this.socket.emit('QUEEN_STATUS', { status: 'thinking', target: projectId });

      // 2. Dispatch logic (Search vs Action)
      const result = await this.dispatcher.dispatch(prompt, projectPath);

      // 3. If Action: The Dispatcher already triggered startFeatureWorkflow.
      // We must ensure the UI knows a NEW agent is born under this project.
      if (result.type === 'ACTION') {
        this.socket.emit('UI_UPDATE', {
          action: 'SPAWN_AGENT_UI',
          payload: {
            projectId: projectId,
            agentName: result.agentName || 'Worker Bee',
            status: 'initializing'
          }
        });
      }
    });

    /**
     * Scenario: Agent finishes code implementation
     */
    this.socket.on('AGENT_CODE_COMPLETE', async ({ projectId, treePath }) => {
      // 1. Logically trigger the Visual Verification
      this.socket.emit('UI_UPDATE', { action: 'SET_AGENT_STATUS', payload: { projectId, status: 'verifying' } });
      
      // 2. The Verification Engine kicks in (connected in Orchestrator)
      // 3. Once verified, transition to "Review" mode in the dashboard
      this.socket.emit('UI_UPDATE', { 
        action: 'OPEN_REVIEW_PANE', 
        payload: { projectId, treePath } 
      });
    });
  }
}
