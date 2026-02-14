import fs from 'fs-extra';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

export interface MedicIntervention {
  id: string;
  targetAgentId: string;
  interventionType: 'context_injection' | 'rollback' | 'consensus_override';
  details: string;
  timestamp: string;
  success?: boolean;
}

export interface RollbackPoint {
  id: string;
  filePath: string;
  content: string; // Pre-failure content to restore
  timestamp: string;
  reason: string;
}

export interface MedicConfig {
  failureThreshold: number; // Activate after N failures (default: 3)
  maxInterventionsPerSession: number;
  rollbackRetentionDays: number;
}

/**
 * MedicAgent - Emergency Role for Stuck/Failing Swarms
 * 
 * Activates after 3+ task failures with super-permissions:
 * 1. Context Injection - Force correct observations into Builder
 * 2. Rollback Authority - Restore files to pre-failure state
 * 3. Consensus Override - Bypass stuck Reviewer
 * 
 * Triggered automatically or via @medic command.
 */
export class MedicAgent {
  private projectPath: string;
  private interventionsFile: string;
  private rollbackFile: string;
  private config: MedicConfig;
  private failureCount: number = 0;
  private interventionCount: number = 0;
  private activeInterventions: Map<string, MedicIntervention> = new Map();

  constructor(
    projectPath: string,
    config: Partial<MedicConfig> = {}
  ) {
    this.projectPath = projectPath;
    this.interventionsFile = path.join(projectPath, '.queenbee', 'medic-interventions.json');
    this.rollbackFile = path.join(projectPath, '.queenbee', 'rollback-points.json');
    
    this.config = {
      failureThreshold: config.failureThreshold ?? 3,
      maxInterventionsPerSession: config.maxInterventionsPerSession ?? 5,
      rollbackRetentionDays: config.rollbackRetentionDays ?? 7,
    };
  }

  /**
   * Record a task failure - returns true if medic should activate
   */
  async recordFailure(): Promise<boolean> {
    this.failureCount++;
    console.log(`[Medic] Failure recorded (${this.failureCount}/${this.config.failureThreshold})`);
    
    if (this.failureCount >= this.config.failureThreshold) {
      return true;
    }
    return false;
  }

  /**
   * Check if medic can intervene
   */
  canIntervene(): boolean {
    return this.interventionCount < this.config.maxInterventionsPerSession;
  }

  /**
   * Reset failure counter
   */
  resetFailures(): void {
    this.failureCount = 0;
  }

  /**
   * Create a rollback point before risky operations
   */
  async createRollbackPoint(
    filePath: string,
    reason: string
  ): Promise<RollbackPoint | null> {
    try {
      if (!await fs.pathExists(filePath)) {
        console.warn(`[Medic] Cannot create rollback - file not found: ${filePath}`);
        return null;
      }

      const content = await fs.readFile(filePath, 'utf-8');
      const rollbackPoint: RollbackPoint = {
        id: uuidv4(),
        filePath: path.relative(this.projectPath, filePath),
        content,
        timestamp: new Date().toISOString(),
        reason,
      };

      // Save rollback point
      const points = await this.loadRollbackPoints();
      points.push(rollbackPoint);
      await this.saveRollbackPoints(points);

      console.log(`[Medic] Rollback point created for: ${filePath}`);
      return rollbackPoint;
    } catch (error) {
      console.error('[Medic] Failed to create rollback point:', error);
      return null;
    }
  }

  /**
   * Rollback a file to a previous state
   */
  async rollbackToPoint(rollbackId: string): Promise<boolean> {
    try {
      const points = await this.loadRollbackPoints();
      const point = points.find(p => p.id === rollbackId);
      
      if (!point) {
        console.error(`[Medic] Rollback point not found: ${rollbackId}`);
        return false;
      }

      const fullPath = path.join(this.projectPath, point.filePath);
      await fs.writeFile(fullPath, point.content, 'utf-8');
      
      console.log(`[Medic] Rolled back to: ${point.filePath}`);
      return true;
    } catch (error) {
      console.error('[Medic] Rollback failed:', error);
      return false;
    }
  }

  /**
   * Inject context into a stuck agent
   */
  async injectContext(
    targetAgentId: string,
    observation: string,
    hint?: string
  ): Promise<MedicIntervention> {
    const intervention: MedicIntervention = {
      id: uuidv4(),
      targetAgentId,
      interventionType: 'context_injection',
      details: `Observation: ${observation}${hint ? `\nHint: ${hint}` : ''}`,
      timestamp: new Date().toISOString(),
    };

    this.activeInterventions.set(intervention.id, intervention);
    await this.saveIntervention(intervention);
    this.interventionCount++;

    console.log(`[Medic] Context injected into ${targetAgentId}: ${observation}`);
    return intervention;
  }

  /**
   * Override stuck consensus
   */
  async overrideConsensus(
    targetAgentId: string,
    overrideDecision: string,
    reason: string
  ): Promise<MedicIntervention> {
    const intervention: MedicIntervention = {
      id: uuidv4(),
      targetAgentId,
      interventionType: 'consensus_override',
      details: `Override: ${overrideDecision}\nReason: ${reason}`,
      timestamp: new Date().toISOString(),
    };

    this.activeInterventions.set(intervention.id, intervention);
    await this.saveIntervention(intervention);
    this.interventionCount++;

    console.log(`[Medic] Consensus overridden for ${targetAgentId}: ${overrideDecision}`);
    return intervention;
  }

  /**
   * Generate a system prompt for the medic to diagnose the situation
   */
  generateDiagnosticPrompt(
    failedTask: string,
    errorLog?: string
  ): string {
    return `🩺 MEDIC DIAGNOSIS REQUEST

You are the Medic Agent - an emergency specialist called in to diagnose and fix a failing swarm task.

### Failed Task:
${failedTask}

### Error Log:
${errorLog || 'No error log available'}

### Your Mission:
1. Analyze the failure pattern - what went wrong?
2. Identify the root cause - is it a stuck loop, bad context, or wrong approach?
3. Determine the best intervention:
   - Context Injection: If the agent has wrong assumptions, inject correct observations
   - Rollback: If files were corrupted, restore from backup
   - Consensus Override: If reviewers are stuck in infinite loop, make the decision

### Output Format:
Respond with your diagnosis and proposed intervention in this format:

<diagnosis>
[What's wrong - be specific]
</diagnosis>

<intervention>
type: [context_injection | rollback | consensus_override]
target: [agent ID if applicable]
action: [specific action to take]
</intervention>`;
  }

  /**
   * Generate intervention response for a stuck agent
   */
  generateInterventionPrompt(
    intervention: MedicIntervention
  ): string {
    switch (intervention.interventionType) {
      case 'context_injection':
        return `🩺 MEDIC INTERVENTION

A medic has analyzed your situation and injected the following observation:

${intervention.details}

Please acknowledge this and adjust your approach accordingly.`;

      case 'consensus_override':
        return `🩺 MEDIC OVERRIDE

The consensus mechanism has failed to reach a decision. The medic has made the following decision:

${intervention.details}

Please proceed with this decision immediately.`;

      case 'rollback':
        return `🩺 MEDIC ROLLBACK

Files have been rolled back to a previous state due to corruption.

${intervention.details}

Please restart your task with the restored files.`;

      default:
        return `🩺 MEDIC: ${intervention.details}`;
    }
  }

  /**
   * Load rollback points from file
   */
  private async loadRollbackPoints(): Promise<RollbackPoint[]> {
    try {
      if (await fs.pathExists(this.rollbackFile)) {
        const points = await fs.readJson(this.rollbackFile);
        // Filter out old points
        const cutoff = Date.now() - (this.config.rollbackRetentionDays * 24 * 60 * 60 * 1000);
        return points.filter((p: RollbackPoint) => 
          new Date(p.timestamp).getTime() > cutoff
        );
      }
    } catch (error) {
      console.error('[Medic] Error loading rollback points:', error);
    }
    return [];
  }

  /**
   * Save rollback points to file
   */
  private async saveRollbackPoints(points: RollbackPoint[]): Promise<void> {
    try {
      await fs.ensureDir(path.dirname(this.rollbackFile));
      await fs.writeJson(this.rollbackFile, points, { spaces: 2 });
    } catch (error) {
      console.error('[Medic] Error saving rollback points:', error);
    }
  }

  /**
   * Save intervention to file
   */
  private async saveIntervention(intervention: MedicIntervention): Promise<void> {
    try {
      await fs.ensureDir(path.dirname(this.interventionsFile));
      
      let interventions: MedicIntervention[] = [];
      if (await fs.pathExists(this.interventionsFile)) {
        interventions = await fs.readJson(this.interventionsFile);
      }
      
      interventions.push(intervention);
      
      // Keep last 50 interventions
      if (interventions.length > 50) {
        interventions = interventions.slice(-50);
      }
      
      await fs.writeJson(this.interventionsFile, interventions, { spaces: 2 });
    } catch (error) {
      console.error('[Medic] Error saving intervention:', error);
    }
  }

  /**
   * Get intervention history
   */
  async getInterventionHistory(): Promise<MedicIntervention[]> {
    try {
      if (await fs.pathExists(this.interventionsFile)) {
        return await fs.readJson(this.interventionsFile);
      }
    } catch (error) {
      console.error('[Medic] Error loading intervention history:', error);
    }
    return [];
  }

  /**
   * Get current failure count
   */
  getFailureCount(): number {
    return this.failureCount;
  }

  /**
   * Get current intervention count
   */
  getInterventionCount(): number {
    return this.interventionCount;
  }
}
