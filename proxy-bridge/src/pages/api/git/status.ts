import { NextApiRequest, NextApiResponse } from 'next';
import simpleGit from 'simple-git';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'GET') {
        res.setHeader('Allow', ['GET']);
        return res.status(405).end(`Method ${req.method} Not Allowed`);
    }

    const { path: repoPath } = req.query;

    if (!repoPath || typeof repoPath !== 'string') {
        return res.status(400).json({ error: 'Repository path required' });
    }

    const git = simpleGit(repoPath);

    try {
        const status = await git.status();
        return res.status(200).json(status);
    } catch (error: any) {
        return res.status(500).json({ error: error.message });
    }
}
