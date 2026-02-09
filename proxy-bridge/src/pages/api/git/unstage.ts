import { NextApiRequest, NextApiResponse } from 'next';
import simpleGit from 'simple-git';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        res.setHeader('Allow', ['POST']);
        return res.status(405).end(`Method ${req.method} Not Allowed`);
    }

    const { path: repoPath, file } = req.body;

    if (!repoPath || !file) {
        return res.status(400).json({ error: 'Repository path and file required' });
    }

    const git = simpleGit(repoPath);

    try {
        // git reset HEAD <file> unstages the file
        await git.reset(['HEAD', file]);
        return res.status(200).json({ success: true });
    } catch (error: any) {
        return res.status(500).json({ error: error.message });
    }
}
