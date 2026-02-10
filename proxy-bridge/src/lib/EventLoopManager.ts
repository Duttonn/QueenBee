import { Socket } from 'socket.io';
import { HiveOrchestrator } from './HiveOrchestrator';
import { UniversalDispatcher } from './UniversalDispatcher';
import { ToolExecutor } from './ToolExecutor';
import { broadcast } from './socket-instance';
import { exec } from 'child_process';
import path from 'path';
import fs from 'fs';
import { FileWatcher } from './FileWatcher';
import { Paths } from './Paths';

/**
 * EventLoopManager: The "Nervous System" of Queen Bee.
 * Ensures that backend actions trigger the correct UI state changes and logical continuity.
 */
export class EventLoopManager {
  private socket: Socket;
  private orchestrator: HiveOrchestrator;
  private dispatcher: UniversalDispatcher;
  private toolExecutor: ToolExecutor;
  private appLogPath: string;
  private fileWatcher: FileWatcher;

  constructor(socket: Socket) {
    this.socket = socket;
    this.orchestrator = new HiveOrchestrator(socket);
    this.dispatcher = new UniversalDispatcher(socket);
    this.toolExecutor = new ToolExecutor();
    this.appLogPath = path.join(Paths.getWorkspaceRoot(), 'app.log');
    this.fileWatcher = new FileWatcher();
    this.setupListeners();
  }

  private setupListeners() {
    /**
     * Scenario: Global Log Relay from Frontend
     */
    this.socket.on('LOG_RELAY', (data: { type: string, message: string, timestamp: string }) => {
      const logEntry = `[${data.timestamp}] [${data.type.toUpperCase()}] ${data.message}\n`;
      try {
        fs.appendFileSync(this.appLogPath, logEntry);
      } catch (e) {
        console.error('Failed to write to app.log', e);
      }
    });

    /**
     * Scenario: User selects a project to work on
     * This starts the file watcher for that project.
     */
    this.socket.on('PROJECT_SELECT', ({ projectPath }) => {
      console.log(`[EventLoop] Project selected: ${projectPath}. Starting file watcher.`);
      this.fileWatcher.stop(); // Stop any previous watcher
      this.fileWatcher.start(projectPath);
    });

    /**
     * Scenario: User submits a prompt in the Global Bar
     */
    this.socket.on('CMD_SUBMIT', async ({ prompt, projectPath, projectId }) => {
      console.log(`[EventLoop] Processing global prompt: ${prompt}`);
      
      broadcast('QUEEN_STATUS', { status: 'thinking', target: projectId });

      const result = await this.dispatcher.dispatch(prompt, projectPath);

      if (result.type === 'ACTION') {
        const agentName = (result as any).agentName || 'Worker Bee';
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

    this.socket.on('TOOL_APPROVAL', async ({ projectId, threadId, toolCallId, approved, tool, args, projectPath }) => {
        console.log(`[EventLoop] Tool approval received for ${toolCallId}: ${approved ? 'APPROVED' : 'REJECTED'} (Tool: ${tool})`);
        
        // Resume any suspended ToolExecutor calls
        ToolExecutor.confirm(toolCallId, approved);

        // Legacy/Fallback handling for non-suspended flows (if any)
        if (approved && tool) {
            try {
                // If ToolExecutor already had this ID pending, confirm() above handles it.
                // If not, we run it manually here.
                const result = await this.toolExecutor.execute({
                    name: tool,
                    arguments: args,
                    id: toolCallId
                }, {
                    projectPath: projectPath || Paths.getProxyBridgeRoot(),
                    projectId,
                    threadId,
                    toolCallId
                });
            } catch (error: any) {
                console.error(`[EventLoop] Manual tool execution failed for ${tool}:`, error.message);
            }
        } else if (approved && !tool) {
            console.warn(`[EventLoop] TOOL_APPROVAL received 'approved' but tool name is missing for ${toolCallId}.`);
        } else if (!approved) {
            broadcast('TOOL_RESULT', {
                projectId,
                threadId,
                toolCallId,
                status: 'rejected'
            });
        }
    });

    /**
     * Deep Inspector Relay (P4-02)
     * Relays messages between the Dashboard and the target application runtime.
     */
    this.socket.on('RUNTIME_QUERY', (data) => {
      console.log('[EventLoop] Relay RUNTIME_QUERY to target app', data);
      this.socket.broadcast.emit('RUNTIME_QUERY_RELAY', data);
    });

    this.socket.on('RUNTIME_EXEC', (data) => {
      console.log('[EventLoop] Relay RUNTIME_EXEC to target app', data);
      this.socket.broadcast.emit('RUNTIME_EXEC_RELAY', data);
    });

    this.socket.on('RUNTIME_RESPONSE', (data) => {
      console.log('[EventLoop] Relay RUNTIME_RESPONSE to dashboard', data);
      this.socket.broadcast.emit('RUNTIME_RESPONSE_RELAY', data);
    });

    /**
     * Scenario: Agent modified a file
     * This is triggered by the FileWatcher.
     */
    this.fileWatcher.on('file-change', async ({ filePath, projectPath }) => {
      console.log(`[EventLoop] File change detected in ${filePath}. Calculating Diff.`);
      
      try {
        const scriptPath = path.join(Paths.getProxyBridgeRoot(), 'src', 'lib', 'git_diff_extractor.py');
        const diffProcess = exec(`python3 "${scriptPath}" "${projectPath}" "${filePath}"`);
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
          file: filePath,
          added: diffJson.added || 0,
          removed: diffJson.removed || 0
        });

        broadcast('UI_UPDATE', {
          action: 'UPDATE_LIVE_DIFF',
          payload: {
            filePath,
            diff: diffJson.files?.[0]?.hunks || [] // Send the full structured diff
          }
        });

      } catch (error) {
        console.error(`[EventLoop] Failed to calculate diff for ${filePath}: ${error}`);
      }
    });
  }
}