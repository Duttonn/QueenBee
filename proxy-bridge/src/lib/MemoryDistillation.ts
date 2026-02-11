import { LLMMessage } from './types/llm';
import { unifiedLLMService } from './UnifiedLLMService';
import { MemoryStore, MemoryType } from './MemoryStore';
import { Roundtable } from './Roundtable';

export class MemoryDistillation {
  constructor(private memoryStore: MemoryStore) {}

  async distillTeamChat(projectPath: string, providerId: string = 'auto', apiKey?: string): Promise<void> {
    console.log('[MemoryDistillation] Distilling team chat memory...');
    
    try {
      const roundtable = new Roundtable(projectPath);
      const messages = await roundtable.getRecentMessages(20);
      
      if (messages.length === 0) return;

      const chatHistory = messages.map(m => `[${m.agentId}]: ${m.content}`).join('\n');

      const summaryPrompt: LLMMessage = {
        role: 'system',
        content: `Analyze the following agent group chat (Roundtable). 
        Extract any AGREED STANDARDS, TEAM DECISIONS, or SHARED PREFERENCES that should persist across all agents.
        
        Respond with a JSON object containing a "memories" array:
        {
          "memories": [
            { 
              "type": "pattern" | "insight", 
              "content": "Description of the team standard or decision", 
              "confidence": 0.0 to 1.0 
            }
          ]
        }
        
        - "pattern": Preferred technologies, coding styles, naming conventions, or specific "ways we do things".
        - "insight": Shared technical facts or architectural decisions discovered during the swarm.`
      };

      const historyMsg: LLMMessage = { role: 'user', content: `Chat history:\n${chatHistory}` };
      
      const response = await unifiedLLMService.chat(providerId, [summaryPrompt, historyMsg], {
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
          console.log(`[MemoryDistillation] Added team standard ${m.type} to MemoryStore.`);
        }
      }
    } catch (error) {
      console.error('[MemoryDistillation] Failed to distill team chat:', error);
    }
  }

  async distill(providerId: string, messages: LLMMessage[], apiKey?: string): Promise<void> {
    console.log('[MemoryDistillation] Distilling session memory...');
    
    try {
      const summaryPrompt: LLMMessage = {
        role: 'system',
        content: `Analyze the following agent session history. 
        Extract technical changes, architectural findings, key lessons learned, and any USER-DEFINED CONVENTIONS or PREFERENCES.
        
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
        
        - "insight": Architectural discoveries, high-level technical facts, or project-specific knowledge.
        - "pattern": USER PREFERENCES, coding styles, naming conventions (e.g. "Use QB- prefix"), or repeated logic.
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
