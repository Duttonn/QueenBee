import { setInterval, clearInterval } from 'timers';
import { getDb } from './db';
import { PolicyStore } from './PolicyStore';
import { EventLog } from './EventLog';
import fs from 'fs-extra';
import path from 'path';
import { broadcast } from './socket-instance';

export class HeartbeatService {
  private static instance: HeartbeatService | null = null;
  private interval: NodeJS.Timeout | null = null;
  private isTicking = false;

  static async start() {
    if (!this.instance) {
      this.instance = new HeartbeatService();
    }
    return this.instance.start();
  }

  static async ping(threadId: string) {
    // Pulse recorded. In future, this can update a liveness map.
    // console.log(`[Heartbeat] Pulse from ${threadId}`);
  }

  static stop() {
    if (this.instance) {
      this.instance.stop();
    }
  }

  async start() {
    if (this.interval) return;

    // Use a default for first run
    const intervalMs = 300000; // 5 minutes default

    this.interval = setInterval(() => this.tick(), intervalMs);
    console.log(`[Heartbeat] Started with ${intervalMs}ms interval`);
    
    // Run immediate first tick
    await this.tick();
  }

  stop() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
  }

  private async tick() {
    if (this.isTicking) return;
    this.isTicking = true;

    console.log(`[Heartbeat] Tick started at ${new Date().toISOString()}`);

    try {
      const db = getDb();
      for (const project of db.projects) {
        await this.processProject(project);
      }
    } catch (error) {
      console.error('[Heartbeat] Global tick error:', error);
    } finally {
      this.isTicking = false;
    }
  }

  private async processProject(project: { name: string; path: string }) {
    try {
      const policyStore = new PolicyStore(project.path);
      const eventLog = new EventLog(project.path);
      
      // 1. Stale Task Recovery
      await this.recoverStaleTasks(project, policyStore, eventLog);
      
      // Future steps: Trigger evaluation, Reaction processing, etc.
      
    } catch (error) {
      console.error(`[Heartbeat] Error processing project ${project.name}:`, error);
    }
  }

  private async recoverStaleTasks(project: { name: string; path: string }, policyStore: PolicyStore, eventLog: EventLog) {
    const staleTimeoutMinutes = await policyStore.get('stale_task_timeout_minutes') || 30;
    const planPath = path.join(project.path, 'PLAN.md');
    
    if (!(await fs.pathExists(planPath))) return;

    let content = await fs.readFile(planPath, 'utf-8');
    const now = new Date();
    let recoveredCount = 0;

    // Pattern matching: - [IN PROGRESS: agent-name @ 2026-02-09T10:00:00Z] `TASK-XX`
    const regex = /- \[IN PROGRESS: (.*?) @ (.*?)\] `(.*?)`/g;

    const newContent = content.replace(regex, (fullMatch, agentId, timestampStr, taskId) => {
      const timestamp = new Date(timestampStr);
      const diffMs = now.getTime() - timestamp.getTime();
      const diffMinutes = diffMs / (1000 * 60);

      if (diffMinutes > staleTimeoutMinutes) {
        console.log(`[Heartbeat] Recovering stale task ${taskId} from ${agentId} in ${project.name}`);
        recoveredCount++;
        eventLog.emit('task_stale_recovered', 'heartbeat', { taskId, agentId, staleTimeMinutes: diffMinutes });
        return `- [ ] \`${taskId}\``;
      }
      return fullMatch;
    });

    if (recoveredCount > 0) {
      await fs.writeFile(planPath, newContent);
      broadcast('TASK_RECOVERED', { projectPath: project.path, count: recoveredCount });
    }
  }
}

export const heartbeatService = new HeartbeatService();
