import fs from 'fs-extra';
import path from 'path';

export class ContextCompressor {
  private thresholdTokens: number;
  private scratchpadDir: string;

  constructor(thresholdTokens: number = 2000, projectPath: string) {
    this.thresholdTokens = thresholdTokens;
    this.scratchpadDir = path.join(projectPath, '.queenbee', 'scratchpad');
  }

  static extractGoalFromPlan(content: string): string | null {
    const match = content.match(/Goal: (.*)/);
    return match ? match[1] : null;
  }

  pruneByGoal(messages: any[], goal: string): any[] {
    return messages.filter(m => m.role === 'system' || m.content?.includes(goal));
  }

  async processHistory(messages: any[]): Promise<any[]> {
    return messages.filter(m => m.role !== 'tool' || m.content?.length < 100);
  }

  async estimateContextPressure(messages: any[]): Promise<number> {
    const totalChars = messages.map(m => typeof m.content === 'string' ? m.content.length : 0).reduce((a, b) => a + b, 0);
    return totalChars / (this.thresholdTokens * 4);
  }

  async hardClear(messages: any[]): Promise<{ messages: any[]; ratio: number }> {
    const cleared = messages.map(m => m.role === 'tool' ? { ...m, content: '[Tool output cleared]' } : m);
    return { messages: cleared, ratio: 0.5 };
  }

  async compress(data: string, taskId: string): Promise<string> {
    // Rough estimate: 1 token ≈ 4 characters
    if (data.length < this.thresholdTokens * 4) return data;

    await fs.ensureDir(this.scratchpadDir);
    const fileName = `scratchpad-${taskId}-${Date.now()}.txt`;
    const filePath = path.join(this.scratchpadDir, fileName);

    await fs.writeFile(filePath, data);
    return `[Context Compressed] Tool output too large (${data.length} chars). Saved to: ${filePath}. Please read this file if you need the full data.`;
  }
}
