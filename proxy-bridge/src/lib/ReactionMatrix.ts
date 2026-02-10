export interface Reaction {
  triggerEvent: string;
  sourceAgent?: string;
  sourceData?: Record<string, any>;
  reactionType: 'spawn_worker' | 'notify' | 'submit_proposal';
  targetAgent?: string;
  params: any;
}

export const REACTION_MATRIX: Reaction[] = [
  {
    triggerEvent: 'task_completed',
    sourceAgent: 'worker-backend',
    reactionType: 'spawn_worker',
    targetAgent: 'worker-test',
    params: {
      instructions: 'The backend task was completed. Please run integration tests and verify the changes.'
    }
  },
  {
    triggerEvent: 'critical_error',
    reactionType: 'notify',
    params: {
      message: 'A critical error occurred in the system. Human intervention may be needed.'
    }
  },
  {
      triggerEvent: 'proposal_submitted',
      reactionType: 'notify',
      params: {
          message: 'A new risky action proposal is pending approval.'
      }
  }
];

export class ReactionMatrix {
    static getReactionsForEvent(eventType: string, agentId: string, data: any): Reaction[] {
        return REACTION_MATRIX.filter(r => {
            if (r.triggerEvent !== eventType) return false;
            if (r.sourceAgent && r.sourceAgent !== agentId) return false;
            if (r.sourceData) {
                for (const [key, value] of Object.entries(r.sourceData)) {
                    if (data?.[key] !== value) return false;
                }
            }
            return true;
        });
    }
}
