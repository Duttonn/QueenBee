import { Socket } from 'socket.io';
import { HiveOrchestrator } from './HiveOrchestrator';
import { UniversalDispatcher } from './UniversalDispatcher';
import { broadcast } from './socket-instance';
import { exec } from 'child_process';
import path from 'path';

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
      console.log(`[EventLoop] File change detected in ${filePath}. Calculating Diff.`);
      
      try {
        const scriptPath = path.join(process.cwd(), 'src/lib/git_diff_extractor.py');
        const diffProcess = exec(`python3 ${scriptPath} "${treePath}" "${filePath}"`);
        let diffOutput = '';
        diffProcess.stdout?.on('data', (data) => {
          diffOutput += data.toString();
        });
        diffProcess.stderr?.on('data', (data) => {
          console.error(`[DiffExtractor Error] ${data.toString()}`);
        });

        await new Promise<void>((resolve, reject) => {
          diffProcess.on('close', (code) => {
            if (code === 0) {
              resolve();
            } else {
              reject(new Error(`git_diff_extractor.py exited with code ${code}`));
            }
          });
        });

        const diffJson = JSON.parse(diffOutput);
        
        broadcast('DIFF_UPDATE', {
          projectId,
          file: filePath,
          added: diffJson.diff.filter((l: any) => l.type === 'add').length,
          removed: diffJson.diff.filter((l: any) => l.type === 'del').length
        });

        broadcast('UI_UPDATE', {
          action: 'UPDATE_LIVE_DIFF',
          payload: {
            projectId,
            filePath,
            diff: diffJson.diff // Send the full structured diff
          }
        });

      } catch (error) {
        console.error(`[EventLoop] Failed to calculate diff for ${filePath}: ${error}`);
      }
    });
  }
}
