import { LLMMessage } from '../types/llm';
import { unifiedLLMService } from '../UnifiedLLMService';
import { MemoryStore } from '../MemoryStore';

export class DiffLearner {
  private memoryStore: MemoryStore;

  constructor(projectPath: string) {
    this.memoryStore = new MemoryStore(projectPath);
  }

  /**
   * Learns from a diff between agent output and user correction.
   */
  async learnFromDiff(file: string, originalContent: string, correctedContent: string, providerId: string = 'auto'): Promise<string | null> {
    console.log(`[DiffLearner] Analyzing user correction in ${file}...`);

    if (originalContent === correctedContent) return null;

    const prompt: LLMMessage[] = [
      {
        role: 'system',
        content: [
          'You are a Mimicry Expert. Your goal is to analyze the difference between what an AI agent produced and what the USER manually corrected.',
          'Extract ONE clear, concise stylistic rule or preference that the user demonstrated.',
          '',
          '# EXAMPLES:',
          '- "User prefers \'const\' over \'var\' for variable declarations."',
          '- "User uses early returns instead of nested if-else."',
          '- "User prefers single quotes for strings in TypeScript."',
          '- "User wants 2 spaces for indentation, not 4."',
          '',
          'Respond with ONLY the extracted rule. If no significant stylistic preference is found, respond with "NONE".'
        ].join('\n')
      },
      {
        role: 'user',
        content: `FILE: ${file}\n\nAGENT VERSION:\n\`\`\`\n${originalContent}\n\`\`\`\n\nUSER VERSION (Correction):\n\`\`\`\n${correctedContent}\n\`\`\``
      }
    ];

    try {
      const response = await unifiedLLMService.chat(providerId, prompt, {
        temperature: 0.1,
      });

      const rule = response.content?.trim();
      if (rule && rule !== 'NONE') {
        await this.memoryStore.add('style', rule, 0.9);
        console.log(`[DiffLearner] Extracted style rule: ${rule}`);
        return rule;
      }
    } catch (error) {
      console.error('[DiffLearner] Failed to learn from diff:', error);
    }

    return null;
  }
}
