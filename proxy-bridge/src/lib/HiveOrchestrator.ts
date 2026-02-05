import { WorkTreeManager } from './WorkTreeManager';
import { LocalEnvironmentManager } from './LocalEnvironmentManager';
import { AutoContextManager } from './AutoContextManager';
import { UniversalForgeAdapter } from './ForgeAdapter';
import { Socket } from 'socket.io';

/**
 * HiveOrchestrator: The "Glue" ensuring system continuity.
 * Connects Worktrees, Environment, Watching, and Shipping.
 */
export class HiveOrchestrator {
  private wt: WorkTreeManager;
  private forge: UniversalForgeAdapter;
  private socket: Socket;

  constructor(socket: Socket) {
    this.wt = new WorkTreeManager();
    this.forge = new UniversalForgeAdapter();
    this.socket = socket;
  }

  /**
   * Complete lifecycle of an autonomous feature implementation
   */
  async startFeatureWorkflow(projectId: string, featureName: string, sourcePath: string) {
    this.socket.emit('WORKFLOW_START', { featureName });

    // 1. Create isolated branch
    const branchName = `gsd-${featureName}-${Date.now()}`;
    const treePath = await this.wt.create(projectId, branchName, sourcePath);

    // 2. Setup environment automatically
    const env = new LocalEnvironmentManager(treePath);
    await env.runSetup();

    // 3. Attach real-time monitoring
    const autoContext = new AutoContextManager(this.socket);
    await autoContext.focusProject(treePath);

    console.log(`[Hive] Pipeline ready for Agent at: ${treePath}`);
    
    return { treePath, branchName };
  }

  /**
   * Finalizes the work by shipping to GitHub/GitLab and cleaning up
   */
  async shipAndCleanup(treePath: string, repoPath: string, prTitle: string, prBody: string) {
    // 1. Create the PR
    const prUrl = await this.forge.createPR(repoPath, prTitle, prBody);
    
    // 2. Teardown the ephemeral worktree
    await this.wt.cleanup(treePath);
    
    this.socket.emit('WORKFLOW_COMPLETE', { prUrl });
    return prUrl;
  }
}
