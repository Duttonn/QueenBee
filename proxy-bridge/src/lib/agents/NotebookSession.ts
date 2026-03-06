import { ExecutionContext } from './ExecutionContext';
import { MemoryStore } from '../infrastructure/MemoryStore';

/**
 * NotebookSession encapsulates a focused agent workspace.
 * It combines the execution context with persistent memory and source artifacts.
 */
export class NotebookSession {
  private context: ExecutionContext;
  private memory: MemoryStore;
  private sessionId: string;

  constructor(sessionId: string, context: ExecutionContext) {
    this.sessionId = sessionId;
    this.context = context;
    this.memory = new MemoryStore(context.projectPath);
  }

  async getSummary(): Promise<string> {
    const memory = await this.memory.getBySession(this.sessionId);
    return memory.map(m => m.content).join('\n');
  }

  async askQuestion(question: string, providerId: string, apiKey?: string): Promise<string> {
    const memory = await this.getSummary();
    const systemPrompt = `You are an expert AI assistant. Use the following context from your notebook to answer the question:\n\n${memory}\n\nQuestion: ${question}`;
    
    const { unifiedLLMService } = await import('../UnifiedLLMService');
    const response = await unifiedLLMService.chat(providerId, [{ role: 'user', content: systemPrompt }], {
      apiKey
    });

    return response.content || 'I could not find an answer.';
  }

  getContext(): ExecutionContext {
    return this.context;
  }
}

