import fs from 'fs-extra';
import path from 'path';
import { Paths } from './Paths';

export interface CostEntry {
  timestamp: string;
  agentId: string;
  threadId: string;
  model: string;
  promptTokens: number;
  completionTokens: number;
  cost: number;
  tool?: string;
  latencyMs?: number;
}

export class CostTracker {
  private filePath: string;

  constructor(projectPath: string) {
    const configDir = Paths.getProjectConfigDir(projectPath);
    this.filePath = path.join(configDir, 'costs.jsonl');
  }

  private async ensureInitialized(): Promise<void> {
    await fs.ensureDir(path.dirname(this.filePath));
    if (!(await fs.pathExists(this.filePath))) {
      await fs.ensureFile(this.filePath);
    }
  }

  async log(entry: Omit<CostEntry, 'timestamp'>): Promise<void> {
    await this.ensureInitialized();
    const fullEntry: CostEntry = {
      ...entry,
      timestamp: new Date().toISOString(),
    };
    await fs.appendFile(this.filePath, JSON.stringify(fullEntry) + '\n', 'utf-8');
  }

  static calculateCost(model: string, promptTokens: number, completionTokens: number): number {
    // Basic pricing model (averages across common providers for the prototype)
    // $15 per 1M tokens for high-end models as a safe baseline
    const pricePerToken = 15 / 1000000;
    return (promptTokens + completionTokens) * pricePerToken;
  }

  async getSummary() {
    await this.ensureInitialized();
    const content = await fs.readFile(this.filePath, 'utf-8');
    const lines = content.split('\n').filter(l => l.trim() !== '');
    const entries = lines.map(l => JSON.parse(l) as CostEntry);

    const summary = {
      totalCost: 0,
      totalTokens: 0,
      byAgent: {} as Record<string, number>,
      byModel: {} as Record<string, number>,
    };

    for (const e of entries) {
      summary.totalCost += e.cost;
      summary.totalTokens += (e.promptTokens + e.completionTokens);
      summary.byAgent[e.agentId] = (summary.byAgent[e.agentId] || 0) + e.cost;
      summary.byModel[e.model] = (summary.byModel[e.model] || 0) + e.cost;
    }

    return summary;
  }

  /**
   * Get all entries, optionally filtered by date range.
   */
  async getEntries(range?: { startDate?: string; endDate?: string }): Promise<CostEntry[]> {
    await this.ensureInitialized();
    const content = await fs.readFile(this.filePath, 'utf-8');
    const lines = content.split('\n').filter(l => l.trim() !== '');
    let entries = lines.map(l => JSON.parse(l) as CostEntry);

    if (range?.startDate) {
      const start = new Date(range.startDate).getTime();
      entries = entries.filter(e => new Date(e.timestamp).getTime() >= start);
    }
    if (range?.endDate) {
      const end = new Date(range.endDate).getTime();
      entries = entries.filter(e => new Date(e.timestamp).getTime() <= end);
    }

    return entries;
  }

  /**
   * Aggregate costs by date (YYYY-MM-DD).
   */
  async getDailySummary(range?: { startDate?: string; endDate?: string }): Promise<Record<string, { cost: number; tokens: number; calls: number }>> {
    const entries = await this.getEntries(range);
    const daily: Record<string, { cost: number; tokens: number; calls: number }> = {};

    for (const e of entries) {
      const day = e.timestamp.slice(0, 10); // YYYY-MM-DD
      if (!daily[day]) daily[day] = { cost: 0, tokens: 0, calls: 0 };
      daily[day].cost += e.cost;
      daily[day].tokens += e.promptTokens + e.completionTokens;
      daily[day].calls++;
    }

    return daily;
  }

  /**
   * Breakdown of LLM calls per tool that triggered them.
   */
  async getToolBreakdown(range?: { startDate?: string; endDate?: string }): Promise<Record<string, { cost: number; calls: number; avgTokens: number }>> {
    const entries = await this.getEntries(range);
    const tools: Record<string, { cost: number; calls: number; totalTokens: number }> = {};

    for (const e of entries) {
      const tool = e.tool || 'unknown';
      if (!tools[tool]) tools[tool] = { cost: 0, calls: 0, totalTokens: 0 };
      tools[tool].cost += e.cost;
      tools[tool].calls++;
      tools[tool].totalTokens += e.promptTokens + e.completionTokens;
    }

    const result: Record<string, { cost: number; calls: number; avgTokens: number }> = {};
    for (const [tool, stats] of Object.entries(tools)) {
      result[tool] = {
        cost: stats.cost,
        calls: stats.calls,
        avgTokens: stats.calls > 0 ? Math.round(stats.totalTokens / stats.calls) : 0,
      };
    }
    return result;
  }

  /**
   * Latency statistics per provider/model (p50, p95, p99).
   */
  async getLatencyStats(range?: { startDate?: string; endDate?: string }): Promise<Record<string, { p50: number; p95: number; p99: number; count: number }>> {
    const entries = await this.getEntries(range);
    const byModel: Record<string, number[]> = {};

    for (const e of entries) {
      if (e.latencyMs != null) {
        if (!byModel[e.model]) byModel[e.model] = [];
        byModel[e.model].push(e.latencyMs);
      }
    }

    const result: Record<string, { p50: number; p95: number; p99: number; count: number }> = {};
    for (const [model, latencies] of Object.entries(byModel)) {
      latencies.sort((a, b) => a - b);
      const len = latencies.length;
      result[model] = {
        p50: latencies[Math.floor(len * 0.5)] || 0,
        p95: latencies[Math.floor(len * 0.95)] || 0,
        p99: latencies[Math.floor(len * 0.99)] || 0,
        count: len,
      };
    }
    return result;
  }
}
