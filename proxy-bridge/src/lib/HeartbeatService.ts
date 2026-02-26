import { setInterval, clearInterval } from 'timers';
import { getDb } from './db';
import { PolicyStore } from './PolicyStore';
import { EventLog } from './EventLog';
import { diagnosticCollector } from './DiagnosticCollector';
import { MemoryDistillation } from './MemoryDistillation';
import { MemoryStore } from './MemoryStore';
import { synthesizeSwarmSession } from './SwarmSynthesizer';
import { runGEAReflection } from './GEAReflection';
import { runWorkflowOptimizerCycle } from './WorkflowOptimizer';
import { MetacognitivePlanner } from './MetacognitivePlanner';
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
      // OP-03: Run diagnostic health check alongside heartbeat
      diagnosticCollector.checkHealth();

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
      
      // NB-03: Team Chat Distillation
      const memoryStore = new MemoryStore(project.path);
      const distillation = new MemoryDistillation(memoryStore);
      await distillation.distillTeamChat(project.path);

      // LS-06: Session synthesis — write .queenbee/session-summary.md
      await synthesizeSwarmSession(project.path).catch(err =>
        console.error(`[Heartbeat] Synthesis failed for ${project.name}:`, err)
      );

      // P17-05: MetacognitivePlanner — triggered evolution scheduling
      const planner = new MetacognitivePlanner(project.path);
      await planner.load();
      const cycleCount = planner.incrementCycleCount();
      await planner.save();

      const triggerResult = planner.hasTrigger();
      const forceReflect  = cycleCount % 10 === 0; // every 10 heartbeat cycles

      // Check for second-order meta-reflection prompt
      const metaPrompt = planner.getSecondOrderTrigger();
      if (metaPrompt) {
        console.warn(`[Heartbeat][MetaCog] Second-order trigger for ${project.name}: ${metaPrompt}`);
        broadcast('metacognition:meta_reflection', {
          projectPath:  project.path,
          metaPrompt,
          cycleCount,
        });
      }

      // GEA-03: Reflection cycle — run only on LP stagnation trigger OR every 10 cycles
      if (triggerResult.triggered || forceReflect) {
        const focusTaskType = triggerResult.triggered ? triggerResult.taskType : undefined;
        if (triggerResult.triggered) {
          console.log(
            `[Heartbeat][MetaCog] LP stagnation detected for task type "${focusTaskType}" ` +
            `(stagnationRate=${triggerResult.stagnationRate?.toFixed(2)}) in ${project.name}. ` +
            `Running focused GEA reflection.`
          );
        } else {
          console.log(`[Heartbeat][MetaCog] Forced reflection cycle (every 10) for ${project.name}.`);
        }

        // Build full reflection prompt, optionally appending meta-reflection context
        await runGEAReflection(project.path, 'auto', undefined, focusTaskType).catch(err =>
          console.error(`[Heartbeat] GEA reflection failed for ${project.name}:`, err)
        );

        // After reflection, mark trigger handled so second-order count updates correctly
        if (triggerResult.triggered && triggerResult.taskType) {
          planner.markTriggerHandled(triggerResult.taskType);
          await planner.save();
        }
      } else {
        console.log(`[Heartbeat][MetaCog] Skipping GEA reflection for ${project.name} (no stagnation, cycle=${cycleCount}).`);
      }

      // GEA-07: MCTS workflow optimizer cycle — update UCB1 bandit from archive
      await runWorkflowOptimizerCycle(project.path).catch(err =>
        console.error(`[Heartbeat] Workflow optimizer failed for ${project.name}:`, err)
      );

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

      // OC-09: Stuck Session Detection
      // If task is not yet stale but has no event activity in 10 minutes, log diagnostic
      if (diffMinutes > 10) {
        // This is a bit tricky since we don't await the emit here in a replace, 
        // but it's consistent with existing emit usage in this file.
        eventLog.query({ 
          agentId, 
          startTime: new Date(now.getTime() - 10 * 60 * 1000).toISOString() 
        }).then(recentEvents => {
          if (recentEvents.length === 0) {
            eventLog.emit('diagnostic_warning', 'heartbeat', {
              agentId,
              taskId,
              reason: 'STUCK_SESSION',
              message: 'Agent has in-progress task but no event activity for >10m.'
            });
          }
        }).catch(() => {});
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
