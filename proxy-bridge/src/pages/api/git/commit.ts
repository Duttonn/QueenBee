import { NextApiRequest, NextApiResponse } from 'next';
import simpleGit from 'simple-git';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        res.setHeader('Allow', ['POST']);
        return res.status(405).end(`Method ${req.method} Not Allowed`);
    }

    const { message, path: repoPath } = req.body;

    if (!repoPath) {
        return res.status(400).json({ error: 'Repository path required' });
    }

    const git = simpleGit(repoPath);

    try {
        await git.add('.');
        const result = await git.commit(message || 'Update from Queen Bee');
        return res.status(200).json(result);
    } catch (error: any) {
        return res.status(500).json({ error: error.message });
    }
}
