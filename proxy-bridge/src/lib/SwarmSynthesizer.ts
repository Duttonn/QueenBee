import fs from 'fs-extra';
import path from 'path';

/**
 * SwarmSynthesizer: Generates a session summary from roundtable, findings,
 * proposals, and PLAN.md. Called at the end of each heartbeat cycle.
 * Output: .queenbee/session-summary.md
 */
export async function synthesizeSwarmSession(projectPath: string): Promise<string> {
  const queenbeeDir = path.join(projectPath, '.queenbee');

  // 1. Last 20 roundtable messages
  const rtPath = path.join(queenbeeDir, 'roundtable.jsonl');
  let recentMessages: any[] = [];
  try {
    const rtRaw = await fs.readFile(rtPath, 'utf-8');
    recentMessages = rtRaw
      .trim()
      .split('\n')
      .filter(Boolean)
      .slice(-20)
      .map(l => { try { return JSON.parse(l); } catch { return null; } })
      .filter(Boolean);
  } catch { /* no roundtable yet */ }

  // 2. Last 10 findings
  const findingsPath = path.join(queenbeeDir, 'findings.json');
  let recentFindings: any[] = [];
  try {
    const allFindings = await fs.readJson(findingsPath).catch(() => []);
    recentFindings = allFindings.slice(-10);
  } catch { /* no findings yet */ }

  // 3. Judged proposals (last 5)
  const proposalsPath = path.join(queenbeeDir, 'proposals.json');
  let judgedProposals: any[] = [];
  try {
    const allProposals = await fs.readJson(proposalsPath).catch(() => []);
    judgedProposals = allProposals
      .filter((p: any) => p.status === 'approved' || p.status === 'rejected')
      .slice(-5);
  } catch { /* no proposals yet */ }

  // 4. Task status from PLAN.md
  const planPath = path.join(projectPath, 'PLAN.md');
  let doneTasks: string[] = [];
  let inProgressTasks: string[] = [];
  try {
    const planContent = await fs.readFile(planPath, 'utf-8');
    doneTasks = (planContent.match(/^- \[(?:x|DONE)\] .+/gm) || []).slice(-10)
      .map(t => t.replace(/^- \[(?:x|DONE)\] /, '').trim());
    inProgressTasks = (planContent.match(/^- \[IN PROGRESS.*?\] .+/gm) || [])
      .map(t => t.replace(/^- \[IN PROGRESS.*?\] /, '').trim());
  } catch { /* no PLAN.md yet */ }

  // 5. Build summary
  const timestamp = new Date().toISOString();

  const doneLine = doneTasks.length
    ? doneTasks.map(t => `- ${t}`).join('\n')
    : '_None yet_';

  const inProgressLine = inProgressTasks.length
    ? inProgressTasks.map(t => `- ${t}`).join('\n')
    : '_None_';

  const findingsLine = recentFindings.length
    ? recentFindings.map((f: any) =>
        `- **${f.title || 'Finding'}** (confidence: ${f.confidence ?? '?'}) — ${String(f.content || '').slice(0, 100)}...`
      ).join('\n')
    : '_No findings recorded_';

  const proposalsLine = judgedProposals.length
    ? judgedProposals.map((p: any) =>
        `- ${(p.status || '?').toUpperCase()}: ${p.action || p.title || '?'}${p.judgment?.stressor ? ` (stressor: ${p.judgment.stressor})` : ''}`
      ).join('\n')
    : '_No proposals judged_';

  const messagesLine = recentMessages.length
    ? recentMessages.slice(-5).map((m: any) =>
        `- [${m.agentId || m.agent || '?'}]: ${String(m.content || m.message || '').slice(0, 80)}...`
      ).join('\n')
    : '_No messages_';

  const summary = `# Session Summary — ${timestamp}

## Completed Tasks (last 10)
${doneLine}

## In-Progress Tasks
${inProgressLine}

## Key Findings (last 10)
${findingsLine}

## Proposal Outcomes (last 5)
${proposalsLine}

## Recent Roundtable Activity (last 5 of 20)
${messagesLine}
`;

  await fs.ensureDir(queenbeeDir);
  await fs.writeFile(path.join(queenbeeDir, 'session-summary.md'), summary);
  return summary;
}
