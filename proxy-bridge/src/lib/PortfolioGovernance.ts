/**
 * P19-12: Portfolio Governance View
 * 
 * Aggregates agent session data across multiple projects for enterprise/power users.
 * All data already exists in: db.ts (projects), CostTracker, ExperienceArchive.
 */

import fs from 'fs-extra';
import path from 'path';
import { getDb } from './infrastructure/db';

export interface ProjectSummary {
  name: string;
  path: string;
  status: 'active' | 'stuck' | 'idle';
  lastActivity: string | null;
  sessionsCount: number;
  avgPerformance: number;
  cost7d: number;
  health: 'green' | 'yellow' | 'red';
}

export interface PortfolioSummary {
  projects: ProjectSummary[];
  totalCost7d: number;
  totalSessions: number;
  avgPerformance: number;
  lastUpdated: number;
}

/**
 * Aggregate data from all known projects into a portfolio view.
 */
export class PortfolioGovernance {
  /**
   * Get summary of all projects in the portfolio.
   */
  static async getPortfolioSummary(): Promise<PortfolioSummary> {
    const db = getDb();
    const projects = db.projects || [];
    
    const projectSummaries: ProjectSummary[] = [];
    let totalCost = 0;
    let totalSessions = 0;
    let totalPerf = 0;

    for (const project of projects) {
      try {
        const summary = await this.getProjectSummary(project.path, project.name);
        projectSummaries.push(summary);
        totalCost += summary.cost7d;
        totalSessions += summary.sessionsCount;
        totalPerf += summary.avgPerformance;
      } catch (error) {
        // Skip projects that can't be read
        console.warn(`[PortfolioGovernance] Failed to load project ${project.path}:`, error);
      }
    }

    return {
      projects: projectSummaries,
      totalCost7d: totalCost,
      totalSessions,
      avgPerformance: projectSummaries.length > 0 ? totalPerf / projectSummaries.length : 0,
      lastUpdated: Date.now(),
    };
  }

  /**
   * Get summary for a single project.
   */
  static async getProjectSummary(projectPath: string, projectName: string): Promise<ProjectSummary> {
    let status: 'active' | 'stuck' | 'idle' = 'idle';
    let lastActivity: string | null = null;
    let sessionsCount = 0;
    let avgPerformance = 0;
    let cost7d = 0;
    let health: 'green' | 'yellow' | 'red' = 'green';

    const queenbeeDir = path.join(projectPath, '.queenbee');

    // Get session count and performance from ExperienceArchive
    const archivePath = path.join(queenbeeDir, 'experience-archive.jsonl');
    if (await fs.pathExists(archivePath)) {
      const lines = (await fs.readFile(archivePath, 'utf-8')).split('\n').filter(l => l.trim());
      sessionsCount = lines.length;
      
      if (sessionsCount > 0) {
        let perfSum = 0;
        let latestTs = 0;
        
        for (const line of lines) {
          try {
            const entry = JSON.parse(line);
            perfSum += entry.performanceScore || entry.combinedScore || 0;
            if (entry.timestamp > latestTs) {
              latestTs = entry.timestamp;
            }
          } catch { /* skip */ }
        }
        
        avgPerformance = sessionsCount > 0 ? perfSum / sessionsCount : 0;
        if (latestTs > 0) {
          lastActivity = new Date(latestTs).toISOString();
          
          // Check if active (last activity within 30 minutes)
          const now = Date.now();
          if (now - latestTs < 30 * 60 * 1000) {
            status = 'active';
          } else if (now - latestTs < 24 * 60 * 60 * 1000) {
            status = 'idle';
          }
        }
      }
    }

    // Get cost from CostTracker (costs.jsonl)
    const costPath = path.join(queenbeeDir, 'costs.jsonl');
    if (await fs.pathExists(costPath)) {
      const lines = (await fs.readFile(costPath, 'utf-8')).split('\n').filter(l => l.trim());
      const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
      
      for (const line of lines) {
        try {
          const entry = JSON.parse(line);
          if (entry.timestamp && entry.timestamp > sevenDaysAgo) {
            cost7d += entry.cost || 0;
          }
        } catch { /* skip */ }
      }
    }

    // Determine health based on performance
    if (avgPerformance >= 0.7) {
      health = 'green';
    } else if (avgPerformance >= 0.4) {
      health = 'yellow';
    } else {
      health = 'red';
    }

    return {
      name: projectName,
      path: projectPath,
      status,
      lastActivity,
      sessionsCount,
      avgPerformance,
      cost7d,
      health,
    };
  }
}
