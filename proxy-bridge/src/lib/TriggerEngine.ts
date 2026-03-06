import fs from 'fs-extra';
import path from 'path';
import yaml from 'js-yaml';
import { Paths } from './infrastructure/Paths';
import { AgentEvent } from './agents/EventLog';
import { broadcast } from './infrastructure/socket-instance';
import chokidar from 'chokidar';

/* ─── Types ─────────────────────────────────────────────────────────── */

export interface Trigger {
  id: string;
  eventPattern: {
    type?: string;
    agentId?: string;
    dataMatch?: Record<string, any>;
  };
  reaction: {
    type: 'spawn_worker' | 'notify' | 'log' | 'proposal' | 'submit_proposal'
      | 'auto_fix' | 'pause_session' | 'escalate'; // P20-08: extended actions
    params: any;
    /** If true, execute automatically. If false, require user confirmation. */
    auto?: boolean;
  };
  /** Whether this rule is enabled (default: true) */
  enabled?: boolean;
  /** Optional human-readable description */
  description?: string;
}

/**
 * P20-08: YAML reaction rule format.
 * Users define these in .queenbee/reactions.yaml
 */
export interface YamlReactionRule {
  event: string;
  condition?: string;
  action: string;
  auto?: boolean;
  params?: Record<string, any>;
  description?: string;
}

/* ─── Default Triggers ──────────────────────────────────────────────── */

/**
 * P18-C1: Default triggers. Always active, cannot be overridden.
 */
const DEFAULT_TRIGGERS: Trigger[] = [
  {
    id: 'default-task_completed-spawn-test',
    eventPattern: { type: 'task_completed', agentId: 'worker-backend' },
    reaction: {
      type: 'spawn_worker',
      auto: true,
      params: {
        targetAgent: 'worker-test',
        instructions: 'The backend task was completed. Please run integration tests and verify the changes.',
      },
    },
  },
  {
    id: 'default-critical_error-notify',
    eventPattern: { type: 'critical_error' },
    reaction: {
      type: 'notify',
      auto: true,
      params: { message: 'A critical error occurred in the system. Human intervention may be needed.' },
    },
  },
  {
    id: 'default-proposal_submitted-notify',
    eventPattern: { type: 'proposal_submitted' },
    reaction: {
      type: 'notify',
      auto: true,
      params: { message: 'A new risky action proposal is pending approval.' },
    },
  },
];

/* ─── Built-in Event & Action Maps (P20-08) ─────────────────────────── */

/** Well-known events that YAML rules can reference. */
const KNOWN_EVENTS = new Set([
  'ci-failed', 'tests-passed', 'tests-failed',
  'pr-approved', 'pr-merged',
  'completion-gate-failed', 'completion-gate-passed',
  'worker-stuck', 'worker-completed', 'worker-failed',
  'budget-exceeded',
  'task_completed', 'critical_error', 'proposal_submitted',
  'COMPLETION_GATE_FAILED', 'LLM_JUDGE_RESULT',
  'BATCH_SPAWN_COMPLETE',
]);

/** Map YAML action names to Trigger reaction types. */
const ACTION_MAP: Record<string, Trigger['reaction']['type']> = {
  'auto-fix': 'auto_fix',
  'auto_fix': 'auto_fix',
  'notify': 'notify',
  'notify-user': 'notify',
  'spawn-worker': 'spawn_worker',
  'spawn_worker': 'spawn_worker',
  'pause': 'pause_session',
  'pause-session': 'pause_session',
  'pause_session': 'pause_session',
  'escalate': 'escalate',
  'log': 'log',
  'proposal': 'proposal',
};

/* ─── TriggerEngine ─────────────────────────────────────────────────── */

export class TriggerEngine {
  private projectPath: string;
  private triggersFile: string;
  private reactionsYamlFile: string;
  private eventsFile: string;
  private triggers: Trigger[] = [];
  private watcher: chokidar.FSWatcher | null = null;
  private yamlWatcher: chokidar.FSWatcher | null = null;
  private lastProcessedLine = 0;

  constructor(projectPath: string) {
    this.projectPath = projectPath;
    this.triggersFile = path.join(projectPath, '.queenbee', 'triggers.json');
    this.reactionsYamlFile = path.join(projectPath, '.queenbee', 'reactions.yaml');
    this.eventsFile = path.join(Paths.getProjectConfigDir(projectPath), 'events.jsonl');
  }

  async start() {
    await this.loadTriggers();
    await this.loadYamlReactions();
    this.watchEvents();
    this.watchYamlReactions();
    console.log(`[TriggerEngine] Started with ${this.triggers.length} custom triggers + ${DEFAULT_TRIGGERS.length} default triggers.`);
  }

  stop() {
    if (this.watcher) { this.watcher.close(); this.watcher = null; }
    if (this.yamlWatcher) { this.yamlWatcher.close(); this.yamlWatcher = null; }
    console.log('[TriggerEngine] Stopped.');
  }

  /* ─── Loading ──────────────────────────────────────────────────── */

  private async loadTriggers() {
    try {
      if (await fs.pathExists(this.triggersFile)) {
        this.triggers = await fs.readJson(this.triggersFile);
      } else {
        this.triggers = [];
        await fs.ensureDir(path.dirname(this.triggersFile));
        await fs.writeJson(this.triggersFile, [], { spaces: 2 });
      }
    } catch (error) {
      console.error('[TriggerEngine] Error loading triggers:', error);
    }
  }

  /**
   * P20-08: Load declarative reaction rules from YAML.
   * YAML format:
   *   - event: completion-gate-failed
   *     action: auto-fix
   *     auto: true
   *     description: "Auto-fix when completion gate fails"
   *   - event: tests-failed
   *     action: notify-user
   *     auto: false
   *     params:
   *       message: "Tests failed — review needed"
   */
  private async loadYamlReactions() {
    try {
      if (!(await fs.pathExists(this.reactionsYamlFile))) {
        // Create a default reactions.yaml with examples
        await this.createDefaultYaml();
        return;
      }

      const content = await fs.readFile(this.reactionsYamlFile, 'utf-8');
      const rules = yaml.load(content) as YamlReactionRule[] | null;

      if (!Array.isArray(rules)) {
        console.warn('[TriggerEngine] reactions.yaml is not an array. Skipping.');
        return;
      }

      // Convert YAML rules to Trigger format and merge
      const yamlTriggers: Trigger[] = [];
      for (const rule of rules) {
        const trigger = this.yamlToTrigger(rule);
        if (trigger) {
          yamlTriggers.push(trigger);
        } else {
          console.warn(`[TriggerEngine] Invalid YAML rule skipped:`, rule);
        }
      }

      // Remove old YAML-sourced triggers and add new ones
      this.triggers = this.triggers.filter(t => !t.id.startsWith('yaml-'));
      this.triggers.push(...yamlTriggers);
      console.log(`[TriggerEngine] Loaded ${yamlTriggers.length} YAML reaction rules.`);
    } catch (error) {
      console.error('[TriggerEngine] Error loading reactions.yaml:', error);
    }
  }

  /**
   * Convert a YAML reaction rule to a Trigger object.
   */
  private yamlToTrigger(rule: YamlReactionRule): Trigger | null {
    if (!rule.event || !rule.action) return null;

    const actionType = ACTION_MAP[rule.action];
    if (!actionType) {
      console.warn(`[TriggerEngine] Unknown action "${rule.action}" in YAML rule.`);
      return null;
    }

    // Parse condition (simple key=value format for now)
    let dataMatch: Record<string, any> | undefined;
    if (rule.condition) {
      dataMatch = {};
      rule.condition.split('&&').map(s => s.trim()).forEach(cond => {
        const match = cond.match(/(\w+)\s*=\s*(.+)/);
        if (match) dataMatch![match[1]] = match[2].trim();
      });
    }

    return {
      id: `yaml-${rule.event}-${rule.action}-${Date.now().toString(36)}`,
      description: rule.description,
      enabled: true,
      eventPattern: {
        type: rule.event,
        dataMatch,
      },
      reaction: {
        type: actionType,
        auto: rule.auto ?? true,
        params: rule.params || {},
      },
    };
  }

  /**
   * Create a default reactions.yaml with documented examples.
   */
  private async createDefaultYaml(): Promise<void> {
    const defaultYaml = `# QueenBee Declarative Reaction Rules
# Each rule maps an event to an automatic action.
# See docs for full event/action reference.

# Built-in events: ci-failed, tests-passed, tests-failed, pr-approved,
#   completion-gate-failed, worker-stuck, worker-completed, budget-exceeded

# Built-in actions: auto-fix, notify-user, spawn-worker, pause-session, escalate, log

# Example rules (uncomment to activate):

# - event: completion-gate-failed
#   action: auto-fix
#   auto: true
#   description: "Auto-retry when completion gate fails"

# - event: tests-failed
#   action: notify-user
#   auto: true
#   params:
#     message: "Tests failed — review needed"

# - event: budget-exceeded
#   action: pause-session
#   auto: true
#   description: "Pause all sessions when budget is exceeded"

# - event: worker-stuck
#   action: escalate
#   auto: false
#   description: "Escalate to user when a worker is stuck"
`;

    await fs.ensureDir(path.dirname(this.reactionsYamlFile));
    await fs.writeFile(this.reactionsYamlFile, defaultYaml);
    console.log('[TriggerEngine] Created default reactions.yaml');
  }

  /**
   * Watch reactions.yaml for hot-reload.
   */
  private watchYamlReactions() {
    this.yamlWatcher = chokidar.watch(this.reactionsYamlFile, {
      persistent: true,
      ignoreInitial: true,
    });

    this.yamlWatcher.on('change', async () => {
      console.log('[TriggerEngine] reactions.yaml changed, reloading...');
      await this.loadYamlReactions();
    });
  }

  /* ─── Event Watching ───────────────────────────────────────────── */

  private watchEvents() {
    this.watcher = chokidar.watch(this.eventsFile, {
      persistent: true,
      usePolling: true,
      interval: 1000,
    });

    this.watcher.on('change', async () => {
      await this.processNewEvents();
    });

    this.processNewEvents(true);
  }

  private async processNewEvents(skip = false) {
    try {
      if (!(await fs.pathExists(this.eventsFile))) return;

      const content = await fs.readFile(this.eventsFile, 'utf-8');
      const lines = content.split('\n').filter(l => l.trim() !== '');

      if (skip) {
        this.lastProcessedLine = lines.length;
        return;
      }

      if (lines.length > this.lastProcessedLine) {
        const newLines = lines.slice(this.lastProcessedLine);
        this.lastProcessedLine = lines.length;

        for (const line of newLines) {
          try {
            const event: AgentEvent = JSON.parse(line);
            await this.evaluateEvent(event);
          } catch (e) {
            console.error('[TriggerEngine] Error parsing event line:', e);
          }
        }
      }
    } catch (error) {
      console.error('[TriggerEngine] Error processing events:', error);
    }
  }

  /* ─── Evaluation & Execution ───────────────────────────────────── */

  private async evaluateEvent(event: AgentEvent) {
    const allTriggers = [...this.triggers, ...DEFAULT_TRIGGERS];
    for (const trigger of allTriggers) {
      if (trigger.enabled === false) continue;
      if (this.matches(event, trigger)) {
        await this.executeReaction(trigger, event);
      }
    }
  }

  private matches(event: AgentEvent, trigger: Trigger): boolean {
    const { eventPattern } = trigger;
    if (eventPattern.type && eventPattern.type !== event.type) return false;
    if (eventPattern.agentId && eventPattern.agentId !== event.agentId) return false;

    if (eventPattern.dataMatch) {
      for (const [key, value] of Object.entries(eventPattern.dataMatch)) {
        if (event.data?.[key] !== value) return false;
      }
    }

    return true;
  }

  private async executeReaction(trigger: Trigger, event: AgentEvent) {
    console.log(`[TriggerEngine] Firing reaction: ${trigger.id} (${trigger.reaction.type}) on event ${event.type}`);

    // Emit socket event for UI
    broadcast('REACTION_FIRED', {
      triggerId: trigger.id,
      eventType: event.type,
      reactionType: trigger.reaction.type,
      auto: trigger.reaction.auto,
      description: trigger.description,
    });

    switch (trigger.reaction.type) {
      case 'spawn_worker':
        console.log(`[TriggerEngine] Would spawn worker:`, trigger.reaction.params);
        break;

      case 'notify':
        console.log(`[TriggerEngine] Notification: ${trigger.reaction.params.message}`);
        broadcast('NOTIFICATION', {
          source: 'TriggerEngine',
          message: trigger.reaction.params.message || `Reaction triggered: ${trigger.id}`,
          level: 'info',
        });
        break;

      case 'auto_fix':
        console.log(`[TriggerEngine] Auto-fix triggered for event: ${event.type}`);
        broadcast('AUTO_FIX_TRIGGERED', {
          triggerId: trigger.id,
          eventType: event.type,
          params: trigger.reaction.params,
        });
        break;

      case 'pause_session':
        console.log(`[TriggerEngine] Pause session triggered`);
        broadcast('SESSION_PAUSE_REQUESTED', {
          triggerId: trigger.id,
          reason: trigger.description || `Triggered by ${event.type}`,
        });
        break;

      case 'escalate':
        console.log(`[TriggerEngine] Escalation: ${trigger.description}`);
        broadcast('ESCALATION', {
          triggerId: trigger.id,
          eventType: event.type,
          description: trigger.description || 'Automatic escalation',
          params: trigger.reaction.params,
        });
        break;

      case 'proposal':
      case 'submit_proposal':
        console.log(`[TriggerEngine] Auto-submitting proposal: ${trigger.reaction.params.action}`);
        break;

      case 'log':
        console.log(`[TriggerEngine] Log:`, trigger.reaction.params);
        break;
    }
  }

  /* ─── Public API ───────────────────────────────────────────────── */

  /** Get all active triggers (including YAML-loaded ones). */
  getTriggers(): Trigger[] {
    return [...this.triggers, ...DEFAULT_TRIGGERS];
  }

  /** Manually fire an event (for testing). */
  async fireEvent(event: AgentEvent): Promise<void> {
    await this.evaluateEvent(event);
  }
}
