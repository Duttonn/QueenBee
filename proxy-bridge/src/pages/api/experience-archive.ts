import type { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs-extra';
import path from 'path';
import { ExperienceArchive, ArchiveEntry } from '../../lib/ExperienceArchive';
import { withLogging } from '../../lib/api-utils';

/**
 * GEA-01: Experience Archive API
 * GET  /api/experience-archive?projectPath=...&limit=20&sortBy=combinedScore
 * GET  /api/experience-archive?projectPath=...&aggregate=weekly
 * GET  /api/experience-archive?projectPath=...&summary=true
 * POST /api/experience-archive  { projectPath, ...entry }
 */

/** ISO week string in YYYY-WXX format */
function getISOWeek(ts: number): string {
  const d = new Date(ts);
  const jan4 = new Date(d.getFullYear(), 0, 4);
  const week = Math.ceil(((d.getTime() - jan4.getTime()) / 86400000 + jan4.getDay() + 1) / 7);
  const paddedWeek = String(week).padStart(2, '0');
  return `${d.getFullYear()}-W${paddedWeek}`;
}

/** Compute top-3 most used tools across a list of entries */
function topTools(entries: ArchiveEntry[]): string[] {
  const counts = new Map<string, number>();
  for (const entry of entries) {
    for (const toolUse of entry.toolHistory ?? []) {
      const t = toolUse.tool;
      counts.set(t, (counts.get(t) ?? 0) + 1);
    }
  }
  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([tool]) => tool);
}

/** Read all entries from the JSONL file without limit/sort. */
async function readAllEntries(archive: ExperienceArchive): Promise<ArchiveEntry[]> {
  // Use a very high limit with timestamp sort to get all entries in time order
  return archive.query({ limit: 1_000_000, sortBy: 'timestamp' });
}

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const projectPath = (req.query.projectPath || req.body?.projectPath) as string;

  if (!projectPath) {
    return res.status(400).json({ error: 'projectPath is required' });
  }

  const archive = new ExperienceArchive(projectPath);

  if (req.method === 'GET') {
    try {
      // --- ?aggregate=weekly ---
      if (req.query.aggregate === 'weekly') {
        const all = await readAllEntries(archive);

        // Bucket by ISO week
        const buckets = new Map<string, ArchiveEntry[]>();
        for (const entry of all) {
          const week = getISOWeek(entry.timestamp);
          if (!buckets.has(week)) buckets.set(week, []);
          buckets.get(week)!.push(entry);
        }

        const result = Array.from(buckets.entries())
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([week, entries]) => {
            const sessionCount = entries.length;
            const avgCombinedScore =
              entries.reduce((s, e) => s + (e.combinedScore ?? 0), 0) / sessionCount;
            const avgPerformanceScore =
              entries.reduce((s, e) => s + (e.performanceScore ?? 0), 0) / sessionCount;
            const successRate =
              entries.filter(e => (e.performanceScore ?? 0) > 0.7).length / sessionCount;

            return {
              week,
              avgCombinedScore,
              avgPerformanceScore,
              successRate,
              sessionCount,
              topTools: topTools(entries),
            };
          });

        return res.status(200).json(result);
      }

      // --- ?summary=true ---
      if (req.query.summary === 'true') {
        const all = await readAllEntries(archive);

        // Build weekly buckets (reuse logic from above)
        const buckets = new Map<string, ArchiveEntry[]>();
        for (const entry of all) {
          const week = getISOWeek(entry.timestamp);
          if (!buckets.has(week)) buckets.set(week, []);
          buckets.get(week)!.push(entry);
        }

        const sortedWeeks = Array.from(buckets.entries()).sort(([a], [b]) =>
          a.localeCompare(b)
        );

        const firstWeekEntries = sortedWeeks.length > 0 ? sortedWeeks[0][1] : [];
        const latestWeekEntries =
          sortedWeeks.length > 0 ? sortedWeeks[sortedWeeks.length - 1][1] : [];

        const avg = (entries: ArchiveEntry[]) =>
          entries.length === 0
            ? 0
            : entries.reduce((s, e) => s + (e.combinedScore ?? 0), 0) / entries.length;

        const firstWeekAvg = avg(firstWeekEntries);
        const latestWeekAvg = avg(latestWeekEntries);
        const improvementPct =
          sortedWeeks.length >= 2 && firstWeekAvg !== 0
            ? ((latestWeekAvg - firstWeekAvg) / firstWeekAvg) * 100
            : 0;

        // Read evolved-config.json for directives
        const evolvedConfigPath = path.join(projectPath, '.queenbee', 'evolved-config.json');
        let currentDirectives: string[] = [];
        let currentAvoidPatterns: string[] = [];
        try {
          if (await fs.pathExists(evolvedConfigPath)) {
            const cfg = await fs.readJson(evolvedConfigPath);
            // EvolvedConfig has workflowDirectives only in EvolutionDirectives, not EvolvedConfig
            // evolved-config stores avoidPatterns directly; workflowDirectives live in evolution-directives.json
            currentAvoidPatterns = Array.isArray(cfg.avoidPatterns) ? cfg.avoidPatterns : [];
          }
        } catch { /* ignore */ }

        // Also read evolution-directives.json for workflowDirectives
        const directivesPath = path.join(projectPath, '.queenbee', 'evolution-directives.json');
        try {
          if (await fs.pathExists(directivesPath)) {
            const directives = await fs.readJson(directivesPath);
            currentDirectives = Array.isArray(directives.workflowDirectives)
              ? directives.workflowDirectives
              : [];
          }
        } catch { /* ignore */ }

        return res.status(200).json({
          totalSessions: all.length,
          firstWeekAvg,
          latestWeekAvg,
          improvementPct,
          currentDirectives,
          currentAvoidPatterns,
        });
      }

      // --- default: paginated query ---
      const limit  = parseInt(req.query.limit as string) || 20;
      const sortBy = (req.query.sortBy as any) || 'combinedScore';
      const entries = await archive.query({ limit, sortBy });
      return res.status(200).json(entries);
    } catch (error: any) {
      return res.status(500).json({ error: 'Failed to query archive', details: error.message });
    }
  }

  if (req.method === 'POST') {
    try {
      const entry = req.body;
      const saved = await archive.append(entry);
      return res.status(201).json(saved);
    } catch (error: any) {
      return res.status(500).json({ error: 'Failed to append entry', details: error.message });
    }
  }

  res.setHeader('Allow', ['GET', 'POST']);
  res.status(405).end(`Method ${req.method} Not Allowed`);
}

export default withLogging(handler);
