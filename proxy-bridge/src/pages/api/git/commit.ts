import { NextApiRequest, NextApiResponse } from 'next';
import simpleGit from 'simple-git';
import { SecurityAuditAgent } from '../../../lib/SecurityAuditAgent';
import fs from 'fs';

const securityAudit = new SecurityAuditAgent();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        res.setHeader('Allow', ['POST']);
        return res.status(405).end(`Method ${req.method} Not Allowed`);
    }

    const { message, path: repoPath, addAll = true, push = false, files, onlyStaged = false } = req.body;

    if (!repoPath) {
        return res.status(400).json({ error: 'Repository path required' });
    }

    if (!fs.existsSync(repoPath)) {
        return res.status(400).json({ error: `Repository path does not exist: ${repoPath}` });
    }

    const git = simpleGit(repoPath);

    try {
        // Ensure git identity is configured (needed on fresh VPS)
        try {
            const name = await git.getConfig('user.name');
            if (!name.value) {
                await git.addConfig('user.name', 'Queen Bee');
                await git.addConfig('user.email', 'queenbee@local');
            }
        } catch { /* ignore */ }

        // Pre-commit security audit (always runs, cannot be bypassed)
        const findings = await securityAudit.auditProject(repoPath);
        if (findings.length > 0) {
            console.warn(`[Security] Blocked commit — ${findings.length} finding(s) in ${repoPath}`);
            return res.status(422).json({
                error: 'security_audit_failed',
                message: `Security audit found ${findings.length} issue(s). Commit blocked.`,
                findings,
            });
        }

        // Only stage files if onlyStaged is false
        if (!onlyStaged) {
            if (files && Array.isArray(files) && files.length > 0) {
                await git.add(files);
            } else if (addAll) {
                await git.add('.');
            }
        }

        const result = await git.commit(message || 'Update from Queen Bee');

        if (push) {
            await git.push();
        }

        return res.status(200).json(result);
    } catch (error: any) {
        console.error('[Git Commit] Error:', error.message);
        return res.status(500).json({ error: error.message });
    }
}
