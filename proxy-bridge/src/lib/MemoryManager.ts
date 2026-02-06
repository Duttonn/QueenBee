import { LLMMessage } from './types/llm';
import { unifiedLLMService } from './UnifiedLLMService';

const SUMMARY_PROMPT = `
Summarize the following conversation session into a concise paragraph.
Focus on key decisions, outcomes, and unresolved questions.
This summary will be used as context for the next session.
`;

export class MemoryManager {
  /**
   * Generates a summary of the conversation.
   * @param messages - The array of LLM messages from the session.
   * @returns A promise that resolves to the summary string.
   */
  static async generateSummary(messages: LLMMessage[]): Promise<string> {
    if (messages.length === 0) {
      return 'Session was empty.';
    }

    const conversation = messages.map(m => `[${m.role}]: ${m.content}`).join('
');
    const fullPrompt = `${SUMMARY_PROMPT}

---

${conversation}`;

    const response = await unifiedLLMService.chat('auto', [{ role: 'user', content: fullPrompt }]);
    
    return response.content || 'Failed to generate summary.';
  }
}
