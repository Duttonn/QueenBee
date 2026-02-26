import { EventEmitter } from 'events';
import { PolicyStore } from './PolicyStore';
import { SessionLifecycleState } from './AutonomousRunner';

/**
 * Reaction action types
 */
export type ReactionAction = 'send-to-agent' | 'notify' | 'auto-merge';

/**
 * Reaction configuration
 */
export interface ReactionConfig {
  auto: boolean;
  action: ReactionAction;
  retries?: number;
  escalateAfter?: string; // e.g., "30m", "1h"
}

/**
 * Reactions configuration from PolicyStore
 */
export interface ReactionsConfig {
  ciFailed?: ReactionConfig;
  changesRequested?: ReactionConfig;
  approvedAndGreen?: ReactionConfig;
  agentStuck?: ReactionConfig;
}

/**
 * Event types that can trigger reactions
 */
export type ReactionEventType = 
  | 'ci.failing'
  | 'ci.passing'
  | 'review.changes_requested'
  | 'review.approved'
  | 'merge.ready'
  | 'session.stuck'
  | 'session.needs_input'
  | 'session.errored';

/**
 * Event context for reactions
 */
export interface ReactionEvent {
  type: ReactionEventType;
  threadId: string;
  timestamp: number;
  data?: Record<string, any>;
}

/**
 * Reactions Engine - Composio-style automatic responses to events
 * Handles CI failures, review changes, auto-merge, and escalation
 */
export class ReactionsEngine extends EventEmitter {
  private projectPath: string;
  private policyStore: PolicyStore;
  private reactionsConfig: ReactionsConfig = {};
  private retryCounters: Map<string, number> = new Map();
  private escalationTimers: Map<string, NodeJS.Timeout> = new Map();

  constructor(projectPath: string) {
    super();
    this.projectPath = projectPath;
    this.policyStore = new PolicyStore(projectPath);
  }

  /**
   * Initialize and load reactions config
   */
  async initialize(): Promise<void> {
    const policies = await this.policyStore.getAll();
    
    // Load reactions from policies
    if (policies.reactions) {
      this.reactionsConfig = policies.reactions as ReactionsConfig;
    } else {
      // Default reactions configuration
      this.reactionsConfig = {
        ciFailed: {
          auto: true,
          action: 'send-to-agent',
          retries: 3,
          escalateAfter: '30m',
        },
        changesRequested: {
          auto: true,
          action: 'send-to-agent',
          escalateAfter: '1h',
        },
        approvedAndGreen: {
          auto: false,
          action: 'auto-merge',
        },
        agentStuck: {
          auto: false,
          action: 'notify',
        },
      };
      
      // Save default config
      await this.policyStore.set('reactions', this.reactionsConfig);
    }

    console.log('[ReactionsEngine] Initialized with config:', this.reactionsConfig);
  }

  /**
   * Handle a lifecycle event and trigger reactions if configured
   */
  async handleEvent(event: ReactionEvent): Promise<void> {
    const { type, threadId, timestamp, data } = event;
    
    console.log(`[ReactionsEngine] Handling event: ${type} for thread ${threadId}`);

    // Determine which reaction to trigger based on event type
    let reactionConfig: ReactionConfig | undefined;
    let retryKey: string = '';

    switch (type) {
      case 'ci.failing':
        reactionConfig = this.reactionsConfig.ciFailed;
        retryKey = `ci-failed:${threadId}`;
        break;
      case 'review.changes_requested':
        reactionConfig = this.reactionsConfig.changesRequested;
        retryKey = `changes-requested:${threadId}`;
        break;
      case 'review.approved':
      case 'merge.ready':
        reactionConfig = this.reactionsConfig.approvedAndGreen;
        break;
      case 'session.stuck':
        reactionConfig = this.reactionsConfig.agentStuck;
        break;
      default:
        return; // No reaction configured for this event
    }

    if (!reactionConfig || !reactionConfig.auto) {
      console.log(`[ReactionsEngine] No auto-reaction configured for ${type}`);
      return;
    }

    // Execute the reaction
    await this.executeReaction(reactionConfig, type, threadId, data);
  }

  /**
   * Execute a reaction based on config
   */
  private async executeReaction(
    config: ReactionConfig,
    eventType: ReactionEventType,
    threadId: string,
    data?: Record<string, any>
  ): Promise<void> {
    const retryKey = `${eventType}:${threadId}`;
    
    switch (config.action) {
      case 'send-to-agent':
        await this.handleSendToAgent(retryKey, config, eventType, threadId, data);
        break;
      case 'notify':
        await this.handleNotify(eventType, threadId, data);
        break;
      case 'auto-merge':
        await this.handleAutoMerge(eventType, threadId, data);
        break;
    }
  }

  /**
   * Handle send-to-agent reaction
   */
  private async handleSendToAgent(
    retryKey: string,
    config: ReactionConfig,
    eventType: ReactionEventType,
    threadId: string,
    data?: Record<string, any>
  ): Promise<void> {
    const currentCount = this.retryCounters.get(retryKey) || 0;
    const maxRetries = config.retries || 3;

    if (currentCount >= maxRetries) {
      console.log(`[ReactionsEngine] Max retries reached for ${retryKey}, escalating...`);
      this.emit('escalate', { eventType, threadId, retryCount: currentCount });
      this.retryCounters.delete(retryKey);
      return;
    }

    // Increment retry counter
    this.retryCounters.set(retryKey, currentCount + 1);

    // Emit event to send to agent
    this.emit('send-to-agent', {
      threadId,
      eventType,
      retryCount: currentCount + 1,
      maxRetries,
      data,
    });

    console.log(`[ReactionsEngine] Sent ${eventType} to agent (retry ${currentCount + 1}/${maxRetries})`);

    // Set up escalation timer if configured
    if (config.escalateAfter) {
      this.setEscalationTimer(retryKey, config.escalateAfter, eventType, threadId);
    }
  }

  /**
   * Handle notify reaction
   */
  private async handleNotify(
    eventType: ReactionEventType,
    threadId: string,
    data?: Record<string, any>
  ): Promise<void> {
    this.emit('notify', {
      type: eventType,
      threadId,
      priority: this.getPriorityForEvent(eventType),
      data,
    });

    console.log(`[ReactionsEngine] Notified about ${eventType} for thread ${threadId}`);
  }

  /**
   * Handle auto-merge reaction
   */
  private async handleAutoMerge(
    eventType: ReactionEventType,
    threadId: string,
    data?: Record<string, any>
  ): Promise<void> {
    // Emit merge event - actual merge will be handled by the caller
    this.emit('auto-merge', {
      threadId,
      prUrl: data?.prUrl,
      data,
    });

    console.log(`[ReactionsEngine] Auto-merge triggered for thread ${threadId}`);
  }

  /**
   * Set up escalation timer
   */
  private setEscalationTimer(
    key: string,
    duration: string,
    eventType: ReactionEventType,
    threadId: string
  ): void {
    // Parse duration (e.g., "30m", "1h")
    const match = duration.match(/^(\d+)(m|h)$/);
    if (!match) return;

    const value = parseInt(match[1], 10);
    const unit = match[2];
    const ms = unit === 'm' ? value * 60 * 1000 : value * 60 * 60 * 1000;

    // Clear existing timer if any
    const existing = this.escalationTimers.get(key);
    if (existing) {
      clearTimeout(existing);
    }

    const timer = setTimeout(() => {
      console.log(`[ReactionsEngine] Escalation timeout reached for ${key}`);
      this.emit('escalate', { eventType, threadId, reason: 'timeout' });
      this.escalationTimers.delete(key);
    }, ms);

    this.escalationTimers.set(key, timer);
  }

  /**
   * Get priority level for event type
   */
  private getPriorityForEvent(eventType: ReactionEventType): 'urgent' | 'action' | 'warning' | 'info' {
    switch (eventType) {
      case 'session.stuck':
      case 'session.errored':
      case 'session.needs_input':
        return 'urgent';
      case 'merge.ready':
      case 'review.approved':
        return 'action';
      case 'ci.failing':
      case 'review.changes_requested':
        return 'warning';
      default:
        return 'info';
    }
  }

  /**
   * Update reactions configuration
   */
  async updateConfig(config: Partial<ReactionsConfig>): Promise<void> {
    this.reactionsConfig = { ...this.reactionsConfig, ...config };
    await this.policyStore.set('reactions', this.reactionsConfig);
    console.log('[ReactionsEngine] Config updated:', this.reactionsConfig);
  }

  /**
   * Get current config
   */
  getConfig(): ReactionsConfig {
    return { ...this.reactionsConfig };
  }

  /**
   * Reset retry counter for a thread
   */
  resetRetryCount(threadId: string): void {
    for (const key of this.retryCounters.keys()) {
      if (key.includes(threadId)) {
        this.retryCounters.delete(key);
      }
    }
  }

  /**
   * Clean up timers and counters
   */
  cleanup(): void {
    for (const timer of this.escalationTimers.values()) {
      clearTimeout(timer);
    }
    this.escalationTimers.clear();
    this.retryCounters.clear();
  }
}
