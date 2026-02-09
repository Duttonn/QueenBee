import { NextApiRequest, NextApiResponse } from 'next';
import simpleGit from 'simple-git';
import fs from 'fs-extra';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import os from 'os';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        res.setHeader('Allow', ['POST']);
        return res.status(405).end(`Method ${req.method} Not Allowed`);
    }

    const { path: repoPath, patch } = req.body;

    if (!repoPath || !patch) {
        return res.status(400).json({ error: 'Repository path and patch required' });
    }

    const git = simpleGit(repoPath);
    const tempPatchPath = path.join(os.tmpdir(), `patch-${uuidv4()}.patch`);

    try {
        // Write the patch to a temporary file
        await fs.writeFile(tempPatchPath, patch);

        // Apply the patch to the index (staging only)
        // --cached applies to the index
        // --whitespace=nowarn avoids strict whitespace errors that often occur with constructed patches
        await git.raw(['apply', '--cached', '--whitespace=nowarn', tempPatchPath]);

        // Cleanup
        await fs.remove(tempPatchPath);

        return res.status(200).json({ success: true });
    } catch (error: any) {
        console.error('[Stage Lines API] Error:', error.message);
        if (await fs.pathExists(tempPatchPath)) {
            await fs.remove(tempPatchPath);
        }
        return res.status(500).json({ error: 'Failed to apply partial patch', details: error.message });
    }
}
