import { UnifiedLLMService } from './UnifiedLLMService';
import { ProjectTaskManager } from './ProjectTaskManager';

export interface JudgeInput {
  taskDescription: string;
  agentOutput: string;
  filesChanged: string[];
  userRequest?: string;
  testResults?: string;
}

export interface JudgeResult {
  score: number; // 0-100
  passed: boolean;
  feedback: string;
}

export class LLMJudge {
  private llmService: UnifiedLLMService;

  constructor(llmService: UnifiedLLMService) {
    this.llmService = llmService;
  }

  async judge(
    input: JudgeInput
  ): Promise<JudgeResult> {
    const prompt = `
      You are an expert developer and quality assurance engineer.
      Evaluate the following solution provided by an AI agent for a coding task.
      
      Task Description:
      ${input.taskDescription}
      
      Agent Output:
      ${input.agentOutput}
      
      Files Changed:
      ${input.filesChanged.join(', ')}
      
      Evaluate the solution based on:
      1. Correctness (Does it solve the problem?)
      2. Quality (Is the code clean, idiomatic, and efficient?)
      3. Completeness (Are there edge cases or missing parts?)
      
      Output a score from 0-100 and detailed feedback.
      
      Format your response as valid JSON:
      {
        "score": number,
        "passed": boolean,
        "feedback": string
      }
    `;

    // Use a different tier/model for judging (e.g., higher capability)
    const response = await this.llmService.chat('auto', [
      { role: 'user', content: prompt }
    ], {
      model: 'claude-3-5-sonnet-20241022',
      temperature: 0,
    });

    try {
      const parsed = JSON.parse(response.content || '{}');
      return {
        score: parsed.score || 0,
        passed: parsed.passed || false,
        feedback: parsed.feedback || 'No feedback provided.',
      };
    } catch (error) {
      console.error('Failed to parse LLM judge response', error);
      return {
        score: 0,
        passed: false,
        feedback: 'Failed to parse evaluation response from judge model.',
      };
    }
  }
}
