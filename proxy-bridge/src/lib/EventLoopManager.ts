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
  private fileWatcher: FileWatcher;
  private appLogPath: string;

  constructor(socket: Socket) {
    this.socket = socket;
    this.orchestrator = new HiveOrchestrator(socket);
    this.dispatcher = new UniversalDispatcher(socket);
    this.toolExecutor = new ToolExecutor();
    this.fileWatcher = new FileWatcher();
    this.appLogPath = path.join(Paths.getWorkspaceRoot(), 'app.log');
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
     * Scenario: User submits a prompt in the Global Bar
     */
    this.socket.on('CMD_SUBMIT', async ({ prompt, projectPath, projectId }) => {
      console.log(`[EventLoop] Processing global prompt: ${prompt}`);
      
      this.fileWatcher.start(projectPath);
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

    /**
     * Scenario: Human-in-the-loop Tool Approval
     */
    this.socket.on('TOOL_APPROVAL', async ({ projectId, threadId, toolCallId, approved, tool, args, projectPath }) => {
        console.log(`[EventLoop] Tool approval received for ${toolCallId}: ${approved ? 'APPROVED' : 'REJECTED'}`);
        
        if (approved) {
            try {
                // We need to know which tool to execute. 
                // If the client sends back the full tool info:
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
                // ToolExecutor already broadcasts error with context
            }
        } else {
            broadcast('TOOL_RESULT', {
                projectId,
                threadId,
                toolCallId,
                status: 'rejected'
            });
        }
    });

    this.fileWatcher.on('file-change', async ({ filePath, projectPath, eventType, timestamp }) => {
        console.log(`[EventLoop] File change detected in ${filePath}. Calculating Diff.`);
        // In a real scenario, we would map the projectPath to a projectId from a store/database
        const projectId = "default"; 
        
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
              projectId,
              file: filePath,
              added: diffJson.added || 0,
              removed: diffJson.removed || 0
            });
    
            broadcast('UI_UPDATE', {
              action: 'UPDATE_LIVE_DIFF',
              payload: {
                projectId,
                filePath,
                diff: diffJson.files?.[0]?.hunks || [] // Send the hunks for the changed file
              }
            });
    
          } catch (error) {
            console.error(`[EventLoop] Failed to calculate diff for ${filePath}: ${error}`);
          }
    });
  }
}