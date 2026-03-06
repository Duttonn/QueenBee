import { UnifiedLLMService } from '../UnifiedLLMService';

export interface TaskPlan {
  goal: string;
  subTasks: {
    id: string;
    description: string;
    dependencies: string[];
  }[];
}

export class GoalDecomposer {
  private llmService: UnifiedLLMService;

  constructor(llmService: UnifiedLLMService) {
    this.llmService = llmService;
  }

  async decompose(goal: string): Promise<TaskPlan> {
    const prompt = `
      You are an expert project planner. Break down the following goal into logical, executable sub-tasks.
      
      Goal:
      ${goal}
      
      Return a plan in JSON format:
      {
        "goal": "${goal}",
        "subTasks": [
          { "id": "task-1", "description": "...", "dependencies": [] },
          { "id": "task-2", "description": "...", "dependencies": ["task-1"] }
        ]
      }
    `;

    const response = await this.llmService.chat('auto', [{ role: 'user', content: prompt }]);
    try {
      return JSON.parse(response.content || '{}');
    } catch {
      return { goal, subTasks: [{ id: 'task-1', description: goal, dependencies: [] }] };
    }
  }
}
