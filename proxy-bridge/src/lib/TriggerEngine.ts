import fs from 'fs-extra';
import path from 'path';
import { Paths } from './Paths';
import { AgentEvent } from './EventLog';
import chokidar from 'chokidar';

export interface Trigger {
  id: string;
  eventPattern: {
    type?: string;
    agentId?: string;
    dataMatch?: Record<string, any>;
  };
  reaction: {
    type: 'spawn_worker' | 'notify' | 'log' | 'proposal' | 'submit_proposal';
    params: any;
  };
}

/**
 * P18-C1: Default triggers (formerly ReactionMatrix). These are always active
 * and cannot be overridden by triggers.json — they represent system-level reactions.
 */
const DEFAULT_TRIGGERS: Trigger[] = [
  {
    id: 'default-task_completed-spawn-test',
    eventPattern: { type: 'task_completed', agentId: 'worker-backend' },
    reaction: {
      type: 'spawn_worker',
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
      params: { message: 'A critical error occurred in the system. Human intervention may be needed.' },
    },
  },
  {
    id: 'default-proposal_submitted-notify',
    eventPattern: { type: 'proposal_submitted' },
    reaction: {
      type: 'notify',
      params: { message: 'A new risky action proposal is pending approval.' },
    },
  },
];

export class TriggerEngine {
  private projectPath: string;
  private triggersFile: string;
  private eventsFile: string;
  private triggers: Trigger[] = [];
  private watcher: chokidar.FSWatcher | null = null;
  private lastProcessedLine = 0;

  constructor(projectPath: string) {
    this.projectPath = projectPath;
    this.triggersFile = path.join(projectPath, '.queenbee', 'triggers.json');
    this.eventsFile = path.join(Paths.getProjectConfigDir(projectPath), 'events.jsonl');
  }

  async start() {
    await this.loadTriggers();
    this.watchEvents();
    console.log('[TriggerEngine] Started.');
  }

  stop() {
    if (this.watcher) {
      this.watcher.close();
      this.watcher = null;
    }
    console.log('[TriggerEngine] Stopped.');
  }

  private async loadTriggers() {
    try {
      if (await fs.pathExists(this.triggersFile)) {
        this.triggers = await fs.readJson(this.triggersFile);
      } else {
        // Initialize with default triggers or empty
        this.triggers = [];
        await fs.ensureDir(path.dirname(this.triggersFile));
        await fs.writeJson(this.triggersFile, [], { spaces: 2 });
      }
    } catch (error) {
      console.error('[TriggerEngine] Error loading triggers:', error);
    }
  }

  private watchEvents() {
    // We watch the events.jsonl file for additions
    this.watcher = chokidar.watch(this.eventsFile, {
        persistent: true,
        usePolling: true, // Use polling for better reliability with append-only files on some OSs
        interval: 1000,
    });

    this.watcher.on('change', async () => {
        await this.processNewEvents();
    });

    // Initial process to set the pointer to the end of the file (don't process old events on start)
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

  private async evaluateEvent(event: AgentEvent) {
    // Check dynamic triggers from triggers.json + default system triggers (P18-C1)
    const allTriggers = [...this.triggers, ...DEFAULT_TRIGGERS];
    for (const trigger of allTriggers) {
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
    console.log(`[TriggerEngine] Executing reaction for trigger ${trigger.id} on event ${event.type}`);
    // Implementation of reactions will be expanded
    // For now, we log it.
    switch (trigger.reaction.type) {
      case 'spawn_worker':
        console.log(`[TriggerEngine] Would spawn worker with params:`, trigger.reaction.params);
        break;
      case 'notify':
        console.log(`[TriggerEngine] Notification: ${trigger.reaction.params.message}`);
        break;
      case 'proposal':
          console.log(`[TriggerEngine] Auto-submitting proposal: ${trigger.reaction.params.action}`);
          break;
      case 'log':
        console.log(`[TriggerEngine] Log reaction:`, trigger.reaction.params);
        break;
    }
  }
}
