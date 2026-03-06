import { UnifiedLLMService } from '../UnifiedLLMService';

export interface AgentConfig {
  role: string;
  specialization: string;
  systemPrompt: string;
}

export class AgentFactory {
  private llmService: UnifiedLLMService;

  constructor(llmService: UnifiedLLMService) {
    this.llmService = llmService;
  }

  createAgent(config: AgentConfig) {
    return {
      ...config,
      execute: async (task: string) => {
        return this.llmService.chat('auto', [
          { role: 'system', content: config.systemPrompt },
          { role: 'user', content: task }
        ]);
      }
    };
  }

  createSpecializedAgent(type: 'coder' | 'reviewer' | 'architect') {
    const configs: Record<string, AgentConfig> = {
      coder: {
        role: 'Expert Coder',
        specialization: 'Implementation',
        systemPrompt: 'You are an expert software engineer. Write clean, idiomatic, test-driven code.'
      },
      reviewer: {
        role: 'Senior Reviewer',
        specialization: 'QA & Refactoring',
        systemPrompt: 'You are a senior reviewer. Identify bugs, architectural flaws, and suggest improvements.'
      },
      architect: {
        role: 'Software Architect',
        specialization: 'System Design',
        systemPrompt: 'You are a software architect. Focus on system scalability, patterns, and long-term maintainability.'
      }
    };
    return this.createAgent(configs[type]);
  }
}
