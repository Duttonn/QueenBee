import { NextApiRequest, NextApiResponse } from 'next';
import simpleGit from 'simple-git';
import { SecurityAuditAgent } from '../../../lib/SecurityAuditAgent';
import { Paths } from '../../../lib/Paths';
import fs from 'fs';

const securityAudit = new SecurityAuditAgent();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        res.setHeader('Allow', ['POST']);
        return res.status(405).end(`Method ${req.method} Not Allowed`);
    }

    const { message, path: repoPath, addAll = true, push = false, files, onlyStaged = false } = req.body;

    console.log('[Git Commit] Request body:', JSON.stringify({ message, repoPath, addAll, push, files, onlyStaged }));

    if (!repoPath) {
        return res.status(400).json({ error: 'Repository path required' });
    }

    if (!fs.existsSync(repoPath)) {
        return res.status(400).json({ error: `Repository path does not exist: ${repoPath}` });
    }

    const git = simpleGit(repoPath);

    try {
        // Ensure .queenbee/ is always in .gitignore before any commit
        Paths.ensureGitignore(repoPath);
        // Ensure git identity is configured (needed on fresh VPS)
        try {
            const name = await git.getConfig('user.name');
            if (!name.value) {
                await git.addConfig('user.name', 'Queen Bee');
                await git.addConfig('user.email', 'queenbee@local');
            }
        } catch { /* ignore */ }

        // Stage files (filter out .queenbee/ files)
        const safeFiles = (files && Array.isArray(files))
            ? files.filter((f: string) => !f.startsWith('.queenbee/'))
            : [];
        if (safeFiles.length > 0) {
            await git.add(safeFiles);
        } else if (!onlyStaged && addAll) {
            // Only auto-add everything if not in "staged only" mode
            await git.add('.');
            // Unstage any .queenbee/ files that may have been tracked before .gitignore update
            try {
                await git.raw(['rm', '--cached', '-r', '--ignore-unmatch', '.queenbee']);
            } catch { /* ignore — dir may not exist */ }
        }

        // Pre-commit security audit on staged files only
        const findings = await securityAudit.auditProject(repoPath);
        if (findings.length > 0) {
            console.warn(`[Security] Blocked commit — ${findings.length} finding(s) in ${repoPath}`);
            // Unstage so the user can fix issues
            await git.reset(['HEAD']).catch(() => {});
            return res.status(422).json({
                error: 'security_audit_failed',
                message: `Security audit found ${findings.length} issue(s). Commit blocked.`,
                findings,
            });
        }

        const result = await git.commit(message || 'Update from Queen Bee');
        console.log('[Git Commit] Commit result:', JSON.stringify(result));

        if (push) {
            console.log('[Git Commit] Pushing...');
            // Fix remote URL: GitHub OAuth tokens (gho_*) need x-access-token: prefix
            try {
                const remotes = await git.getRemotes(true);
                const origin = remotes.find(r => r.name === 'origin');
                if (origin?.refs?.push) {
                    const url = origin.refs.push;
                    // Detect https://gho_TOKEN@github.com (missing x-access-token:)
                    const badTokenMatch = url.match(/^https:\/\/(gho_[^@]+)@github\.com/);
                    if (badTokenMatch) {
                        const token = badTokenMatch[1];
                        const fixedUrl = url.replace(`https://${token}@`, `https://x-access-token:${token}@`);
                        console.log('[Git Commit] Fixing malformed remote URL (adding x-access-token prefix)');
                        await git.remote(['set-url', 'origin', fixedUrl]);
                    }
                }
            } catch (e) {
                console.warn('[Git Commit] Could not check/fix remote URL:', e);
            }
            const pushResult = await git.push();
            console.log('[Git Commit] Push result:', JSON.stringify(pushResult));
        } else {
            console.log('[Git Commit] Push not requested (push=' + push + ')');
        }

        return res.status(200).json(result);
    } catch (error: any) {
        const errMsg = error?.message || error?.toString() || 'Unknown git error';
        console.error('[Git Commit] Error:', errMsg, error);
        return res.status(500).json({ error: errMsg });
    }
}
