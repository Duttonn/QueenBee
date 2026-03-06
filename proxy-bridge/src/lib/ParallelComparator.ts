import { UnifiedLLMService } from './UnifiedLLMService';

export interface ComparisonResult {
  winner: string; // Model name
  scores: Record<string, number>;
  analysis: string;
}

export class ParallelComparator {
  private llmService: UnifiedLLMService;

  constructor(llmService: UnifiedLLMService) {
    this.llmService = llmService;
  }

  async compare(
    task: string,
    candidates: { model: string; output: string }[]
  ): Promise<ComparisonResult> {
    const prompt = `
      You are an expert developer evaluating multiple AI agent outputs for a coding task.
      Compare the following solutions side-by-side and determine which one is superior.
      
      Task:
      ${task}
      
      Candidate Solutions:
      ${candidates.map(c => `Model: ${c.model}\nOutput:\n${c.output}\n---`).join('\n')}
      
      Evaluate based on:
      1. Correctness
      2. Code quality and efficiency
      3. Adherence to task requirements
      
      Output a score (0-100) for each model and identify the winner.
      Format your response as valid JSON:
      {
        "winner": "model_name",
        "scores": { "model_name": score, ... },
        "analysis": "Detailed comparison and justification"
      }
    `;

    const response = await this.llmService.chat('auto', [
      { role: 'user', content: prompt }
    ], {
      model: 'claude-3-5-sonnet-20241022',
      temperature: 0,
    });

    try {
      return JSON.parse(response.content || '{}');
    } catch {
      return {
        winner: candidates[0].model,
        scores: Object.fromEntries(candidates.map(c => [c.model, 0])),
        analysis: 'Failed to parse comparison response.',
      };
    }
  }
}
