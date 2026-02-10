import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AgentSession } from '../AgentSession';
import { unifiedLLMService } from '../UnifiedLLMService';

// Mock dependencies
vi.mock('../UnifiedLLMService', () => ({
  unifiedLLMService: {
    chat: vi.fn(),
  },
}));

vi.mock('../socket-instance', () => ({
  broadcast: vi.fn(),
}));

describe('AgentSession - Trinity Upgrade', () => {
  const projectPath = './test-project';
  let session: AgentSession;

  beforeEach(() => {
    session = new AgentSession(projectPath);
    vi.clearAllMocks();
  });

  describe('Plan Extraction (Structured Thought Protocol)', () => {
    it('should emit plan_update event when <plan> is present in LLM response', async () => {
      const mockResponse = {
        content: `<plan>\nGOAL: test\nSTEPS: 1. do stuff\nCURRENT_STEP: 1\n</plan>\nActing now.`,
        tool_calls: [],
      };
      (unifiedLLMService.chat as any).mockResolvedValue(mockResponse);

      const planUpdateSpy = vi.fn();
      session.on('event', (ev) => {
        if (ev.type === 'plan_update') planUpdateSpy(ev.data);
      });
      
      await session.prompt('start');
      
      expect(planUpdateSpy).toHaveBeenCalledWith(expect.objectContaining({
        plan: expect.stringContaining('GOAL: test')
      }));
    });
  });

  describe('Context Pressure (Semantic Context Pruning)', () => {
    it('should prune messages when token count exceeds limit', async () => {
      // Seed with 20 messages so pruning has something to remove
      for (let i = 0; i < 20; i++) {
        session.messages.push({ role: 'user', content: `message ${i}` });
      }
      
      // Add a very long message to trigger pressure
      const longMessage = 'a'.repeat(400000); 
      session.messages.push({ role: 'user', content: longMessage });
      
      // Trigger runLoop (which calls estimateTokens and pruneMessages)
      (unifiedLLMService.chat as any).mockResolvedValue({ content: 'ok', tool_calls: [] });
      await session.prompt('continue');
      
      // Should have: system (optional), notice, and last 10 messages
      // We didn't have a system message, so: notice + 10 recent + 1 new assistant msg = 12
      expect(session.messages.length).toBeLessThan(20); 
      expect(session.messages.some(m => typeof m.content === 'string' && m.content.includes('Context pruned'))).toBe(true);
    });
  });

  describe('Circuit Breaker (Atomic Tool Resilience)', () => {
    it('should trip the circuit breaker after 3 consecutive tool failures', async () => {
      const toolName = 'write_file';
      const error = new Error('Permission denied');
      
      // Mock failure in executor
      (session as any).executor.execute = vi.fn().mockRejectedValue(error);
      
      // LLM response that keeps suggesting the same tool
      (unifiedLLMService.chat as any).mockResolvedValue({
        content: 'I will write the file.',
        tool_calls: [{ id: 'call-id', function: { name: toolName, arguments: '{}' } }],
      });

      const breakerSpy = vi.fn();
      session.on('event', (ev) => {
        if (ev.type === 'circuit_breaker') breakerSpy(ev.data);
      });

      // prompt() runs up to 10 steps. Each step calls execute and fails.
      // So circuit breaker should trip at step 3.
      await session.prompt('start loop');
      
      // Check if it was called at least once with failures: 3
      expect(breakerSpy).toHaveBeenCalledWith(expect.objectContaining({
        tool: toolName,
        failures: 3
      }));
      
      expect(session.messages.some(m => typeof m.content === 'string' && m.content.includes('CIRCUIT BREAKER'))).toBe(true);
    });
  });
});
