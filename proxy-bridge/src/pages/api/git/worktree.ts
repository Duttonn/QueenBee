import { NextApiRequest, NextApiResponse } from 'next';
import simpleGit from 'simple-git';
import fs from 'fs';
import path from 'path';
import { Paths } from '../../../lib/Paths';

/**
 * Git Worktree Management API
 * Enables safe experimentation by creating isolated worktrees
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST' && req.method !== 'GET' && req.method !== 'DELETE') {
        res.setHeader('Allow', ['POST', 'GET', 'DELETE']);
        return res.status(405).end(`Method ${req.method} Not Allowed`);
    }

    // Common query params: path (to repo), name (of worktree)
    const rawRepoPath = (req.body?.path || req.query.path) as string;
    const worktreeName = (req.body?.name || req.query.name) as string;

    if (!rawRepoPath) {
        return res.status(400).json({ error: 'Repository path required' });
    }

    const repoPath = path.isAbsolute(rawRepoPath) 
        ? rawRepoPath 
        : path.resolve(Paths.getWorkspaceRoot(), rawRepoPath);

    if (!fs.existsSync(repoPath)) {
        return res.status(400).json({ error: `Repository path does not exist: ${repoPath}` });
    }

    const git = simpleGit(repoPath);

    try {
        // GET: List worktrees
        if (req.method === 'GET') {
            const result = await git.raw(['worktree', 'list']);
            // parse the output which is like:
            // /path/to/main  (main)
            // /path/to/wt    (branch-name)
            const worktrees = result.split('\n').filter(Boolean).map(line => {
                const [path, ...rest] = line.split(/\s+/);
                const commit = rest[0]; // usually hash or branch
                const branch = rest[rest.length - 1].replace(/[()]/g, '');
                return { path, branch, commit };
            });
            return res.status(200).json({ worktrees });
        }

        // POST: Create worktree
        if (req.method === 'POST') {
            if (!worktreeName) return res.status(400).json({ error: 'Worktree name required' });

            const worktreePath = path.join(Paths.getWorktreesDir(), worktreeName);

            // Check if branch exists or create new
            const branchName = `experiment/${worktreeName}`;

            await git.raw(['worktree', 'add', '-b', branchName, worktreePath, 'HEAD']);

            return res.status(201).json({
                success: true,
                path: worktreePath,
                branch: branchName,
                message: `Worktree ${worktreeName} created at ${worktreePath}`
            });
        }

        // DELETE: Remove worktree
        if (req.method === 'DELETE') {
            if (!worktreeName) return res.status(400).json({ error: 'Worktree name required' });
            
            const worktreePath = path.join(Paths.getWorktreesDir(), worktreeName);

            await git.raw(['worktree', 'remove', worktreePath]);

            return res.status(200).json({ success: true, message: 'Worktree removed' });
        }

    } catch (error: any) {
        console.error('Worktree operation failed:', error);
        return res.status(500).json({ error: error.message });
    }
}
