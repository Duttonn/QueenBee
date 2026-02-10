import { NextApiRequest, NextApiResponse } from 'next';
import simpleGit from 'simple-git';
import fs from 'fs-extra';
import path from 'path';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        res.setHeader('Allow', ['POST']);
        return res.status(405).end(`Method ${req.method} Not Allowed`);
    }

    const { path: rawPath, file } = req.body;

    if (!rawPath || !file) {
        return res.status(400).json({ error: 'Repository path and file required' });
    }

    // Resolve absolute path
    const repoPath = path.isAbsolute(rawPath) ? rawPath : path.resolve(process.cwd(), '..', rawPath);
    const absoluteFilePath = path.join(repoPath, file);

    const git = simpleGit(repoPath);

    try {
        const status = await git.status();
        const isUntracked = status.not_added.includes(file);

        if (isUntracked) {
            // If it's untracked, we discard by deleting the file
            await fs.remove(absoluteFilePath);
            console.log(`[Discard] Deleted untracked file: ${file}`);
        } else {
            // If it's tracked, we checkout to revert changes
            await git.checkout(['--', file]);
            console.log(`[Discard] Reverted tracked file: ${file}`);
        }

        return res.status(200).json({ success: true });
    } catch (error: any) {
        console.error(`[Discard] Failed to discard ${file}:`, error.message);
        return res.status(500).json({ error: error.message });
    }
}
