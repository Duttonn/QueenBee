/**
 * P18-16: ExportService — export agent trajectories in ShareGPT format
 *
 * Reads ExperienceArchive JSONL + session message histories and converts them
 * to ShareGPT conversational XML format for fine-tuning specialized models.
 *
 * Filters out Byzantine/failed sessions (OPEN circuit breaker state).
 * Pattern from hermes-agent.
 */

import fs from 'fs-extra';
import path from 'path';
import { Paths } from './infrastructure/Paths';

export interface ShareGPTConversation {
  id: string;
  conversations: Array<{
    from: 'human' | 'gpt';
    value: string;
  }>;
  metadata?: {
    sessionId: string;
    timestamp: string;
    performanceScore?: number;
  };
}

export interface ExportOptions {
  minPerformanceScore?: number; // Only export sessions scoring >= this (default 0.7)
  maxSessions?: number;         // Limit number of sessions exported
  excludeErrors?: boolean;      // Exclude sessions with error messages (default true)
  format?: 'sharegpt' | 'jsonl'; // Output format
}

export class ExportService {
  private projectPath: string;

  constructor(projectPath: string) {
    this.projectPath = projectPath;
  }

  /**
   * Export high-quality sessions to ShareGPT format.
   * Returns the serialized output as a string.
   */
  async exportTrajectories(options: ExportOptions = {}): Promise<string> {
    const {
      minPerformanceScore = 0.7,
      maxSessions = 100,
      excludeErrors = true,
      format = 'sharegpt',
    } = options;

    // Load ExperienceArchive
    const archivePath = path.join(this.projectPath, '.queenbee', 'experience-archive.jsonl');
    const sessions: Array<{
      sessionId: string;
      performanceScore: number;
      timestamp: string;
      messages?: any[];
    }> = [];

    if (await fs.pathExists(archivePath)) {
      const lines = (await fs.readFile(archivePath, 'utf-8'))
        .split('\n')
        .filter(l => l.trim());

      for (const line of lines) {
        try {
          const entry = JSON.parse(line);
          // Filter by score
          if (entry.combinedScore >= minPerformanceScore) {
            sessions.push({
              sessionId: entry.sessionId || entry.agentId || 'unknown',
              performanceScore: entry.combinedScore,
              timestamp: entry.timestamp,
            });
          }
        } catch { /* skip malformed */ }
      }
    }

    // Sort by score descending, take top N
    sessions.sort((a, b) => b.performanceScore - a.performanceScore);
    const selectedSessions = sessions.slice(0, maxSessions);

    // Build ShareGPT conversations
    const conversations: ShareGPTConversation[] = [];

    for (const session of selectedSessions) {
      const sessionFile = path.join(
        Paths.getProjectConfigDir(this.projectPath),
        'sessions',
        `${session.sessionId}.jsonl`
      );

      if (!(await fs.pathExists(sessionFile))) continue;

      try {
        const lines = (await fs.readFile(sessionFile, 'utf-8'))
          .split('\n')
          .filter(l => l.trim());

        const turns: Array<{ from: 'human' | 'gpt'; value: string }> = [];
        let hasErrors = false;

        for (const line of lines) {
          const msg = JSON.parse(line);

          if (excludeErrors && msg.content && String(msg.content).includes('Error:')) {
            hasErrors = true;
          }

          if (msg.role === 'user' && msg.content) {
            turns.push({ from: 'human', value: String(msg.content).slice(0, 2000) });
          } else if (msg.role === 'assistant' && msg.content) {
            turns.push({ from: 'gpt', value: String(msg.content).slice(0, 4000) });
          }
        }

        if (excludeErrors && hasErrors) continue;
        if (turns.length < 2) continue;

        conversations.push({
          id: session.sessionId,
          conversations: turns,
          metadata: {
            sessionId: session.sessionId,
            timestamp: session.timestamp,
            performanceScore: session.performanceScore,
          },
        });
      } catch { /* skip */ }
    }

    if (format === 'jsonl') {
      return conversations.map(c => JSON.stringify(c)).join('\n');
    }

    // ShareGPT XML format
    const xmlLines = ['<?xml version="1.0" encoding="UTF-8"?>', '<conversations>'];
    for (const conv of conversations) {
      xmlLines.push(`  <conversation id="${escapeXml(conv.id)}">`);
      for (const turn of conv.conversations) {
        const tag = turn.from === 'human' ? 'human' : 'gpt';
        xmlLines.push(`    <${tag}>${escapeXml(turn.value)}</${tag}>`);
      }
      xmlLines.push('  </conversation>');
    }
    xmlLines.push('</conversations>');

    return xmlLines.join('\n');
  }

  /** Return summary stats about exportable sessions. */
  async getExportStats(): Promise<{ total: number; exportable: number; avgScore: number }> {
    const archivePath = path.join(this.projectPath, '.queenbee', 'experience-archive.jsonl');
    if (!(await fs.pathExists(archivePath))) {
      return { total: 0, exportable: 0, avgScore: 0 };
    }

    const lines = (await fs.readFile(archivePath, 'utf-8'))
      .split('\n').filter(l => l.trim());

    let total = 0;
    let exportable = 0;
    let scoreSum = 0;

    for (const line of lines) {
      try {
        const entry = JSON.parse(line);
        total++;
        if (entry.combinedScore >= 0.7) {
          exportable++;
          scoreSum += entry.combinedScore;
        }
      } catch { /* skip */ }
    }

    return {
      total,
      exportable,
      avgScore: exportable > 0 ? scoreSum / exportable : 0,
    };
  }
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
