import { LLMMessage } from './types/llm';
import { unifiedLLMService } from './UnifiedLLMService';
import { MemoryStore, MemoryType } from './MemoryStore';

export class MemoryDistillation {
  constructor(private memoryStore: MemoryStore) {}

  async distill(providerId: string, messages: LLMMessage[], apiKey?: string): Promise<void> {
    console.log('[MemoryDistillation] Distilling session memory...');
    
    try {
      const summaryPrompt: LLMMessage = {
        role: 'system',
        content: `Analyze the following agent session history. 
        Extract technical changes, architectural findings, and key lessons learned.
        
        Respond with a JSON object containing a "memories" array:
        {
          "memories": [
            { 
              "type": "insight" | "pattern" | "lesson", 
              "content": "Description of the memory", 
              "confidence": 0.0 to 1.0 
            }
          ]
        }
        
        - "insight": Architectural discoveries or high-level technical facts.
        - "pattern": Coding styles, conventions, or repeated logic observed.
        - "lesson": Mistakes made and how to avoid them, or specific successes.`
      };

      const history = messages.slice(-20); // Last 20 messages for context
      const response = await unifiedLLMService.chat(providerId, [summaryPrompt, ...history], {
        apiKey,
        response_format: { type: 'json_object' }
      });

      if (response.content) {
        const data = JSON.parse(response.content);
        const memories = data.memories || [];
        
        for (const m of memories) {
          await this.memoryStore.add(
            m.type as MemoryType,
            m.content,
            m.confidence || 1.0
          );
          console.log(`[MemoryDistillation] Added ${m.type} to MemoryStore.`);
        }
      }
    } catch (error) {
      console.error('[MemoryDistillation] Failed to distill memory:', error);
    }
  }
}
