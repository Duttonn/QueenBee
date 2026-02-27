/**
 * P18-13: IntentClassifier — lightweight task intent classification
 *
 * Single fast Haiku-tier LLM call at the start of each task to determine:
 *  - intent: 'research' | 'implement' | 'investigate' | 'fix' | 'refactor' | 'review'
 *  - complexity: 'trivial' | 'moderate' | 'complex'
 *  - suggested_model_tier: 'haiku' | 'sonnet' | 'opus'
 *
 * Feeds:
 *  - Model selection in UnifiedLLMService (route trivial tasks to Haiku)
 *  - WorkflowOptimizer (skip ensemble for trivial; use review_revise for complex)
 *  - Tool priority ordering in system prompt
 *
 * Pattern from oh-my-opencode IntentGate.
 */

export type TaskIntent = 'research' | 'implement' | 'investigate' | 'fix' | 'refactor' | 'review';
export type TaskComplexity = 'trivial' | 'moderate' | 'complex';
export type ModelTier = 'haiku' | 'sonnet' | 'opus';

export interface IntentClassification {
  intent: TaskIntent;
  complexity: TaskComplexity;
  suggestedModelTier: ModelTier;
  toolPriority: string[]; // Ordered list of most-relevant tool categories
  reasoning: string;      // Short justification (for debug/logs)
}

const DEFAULT_CLASSIFICATION: IntentClassification = {
  intent: 'implement',
  complexity: 'moderate',
  suggestedModelTier: 'sonnet',
  toolPriority: ['write_file', 'read_file', 'run_shell'],
  reasoning: 'default classification',
};

// Map intent → tool ordering hint for system prompt injection
const INTENT_TOOL_PRIORITY: Record<TaskIntent, string[]> = {
  research:    ['read_file', 'read_file_range', 'session_search', 'read_memory'],
  implement:   ['write_file', 'hashline_edit', 'read_file', 'run_shell'],
  investigate: ['read_file', 'run_shell', 'search_files', 'session_search'],
  fix:         ['read_file_range', 'hashline_edit', 'run_shell', 'write_file'],
  refactor:    ['read_file', 'hashline_edit', 'run_shell', 'write_file'],
  review:      ['read_file', 'read_file_range', 'run_shell'],
};

// Complexity → model tier mapping
const COMPLEXITY_MODEL: Record<TaskComplexity, ModelTier> = {
  trivial:  'haiku',
  moderate: 'sonnet',
  complex:  'opus',
};

export class IntentClassifier {
  /**
   * Classify a task prompt. Falls back to DEFAULT_CLASSIFICATION on any error.
   * Uses Haiku for speed — should complete in < 1 second.
   */
  static async classify(
    taskPrompt: string,
    providerId: string,
    apiKey?: string
  ): Promise<IntentClassification> {
    try {
      const { unifiedLLMService } = await import('./UnifiedLLMService');

      const systemPrompt = `You are a task classifier. Classify the given coding task.

Respond with ONLY a JSON object, no markdown:
{
  "intent": "<research|implement|investigate|fix|refactor|review>",
  "complexity": "<trivial|moderate|complex>",
  "reasoning": "<one sentence>"
}

Definitions:
- research: reading/understanding code, no changes
- implement: building new features or files
- investigate: debugging, finding root cause
- fix: targeted bug fix (small change)
- refactor: restructuring existing code
- review: code review or analysis`;

      // P18-21: Use exploration-tier model for intent classification (cheap scan operation)
      const response = await unifiedLLMService.chat(
        providerId,
        [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Task: ${taskPrompt.slice(0, 500)}` }
        ],
        unifiedLLMService.getExplorationOptions(providerId, { maxTokens: 150, temperature: 0, apiKey })
      );

      if (!response.content) return DEFAULT_CLASSIFICATION;

      const parsed = JSON.parse(response.content.trim());
      const intent: TaskIntent = parsed.intent || 'implement';
      const complexity: TaskComplexity = parsed.complexity || 'moderate';

      return {
        intent,
        complexity,
        suggestedModelTier: COMPLEXITY_MODEL[complexity],
        toolPriority: INTENT_TOOL_PRIORITY[intent] || INTENT_TOOL_PRIORITY.implement,
        reasoning: parsed.reasoning || '',
      };
    } catch (err) {
      console.warn('[IntentClassifier] Classification failed (using default):', err);
      return DEFAULT_CLASSIFICATION;
    }
  }

  /**
   * Generate a brief context injection for the system prompt based on classification.
   */
  static formatContextHint(classification: IntentClassification): string {
    return `## Task Classification
Intent: ${classification.intent} | Complexity: ${classification.complexity} | Model tier: ${classification.suggestedModelTier}
Recommended tool order: ${classification.toolPriority.slice(0, 4).join(' → ')}
`;
  }
}
