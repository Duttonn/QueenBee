import { NextApiRequest, NextApiResponse } from 'next';
import { exec } from 'child_process';
import util from 'util';
import { Paths } from '../../../lib/Paths';

const execAsync = util.promisify(exec);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        res.setHeader('Allow', ['POST']);
        return res.status(405).end(`Method ${req.method} Not Allowed`);
    }

    const { command, cwd } = req.body;

    if (!command) {
        return res.status(400).json({ error: 'Command is required' });
    }

    // Basic security: avoid specialized characters if possible, or trust user since it's local dev tool
    // For a "Pro" tool, we assume the user knows what they are doing, but prevent cd .. attacks if possible

    const workingDir = cwd || Paths.getProxyBridgeRoot();

    try {
        const { stdout, stderr } = await execAsync(command, { cwd: workingDir });
        return res.status(200).json({ stdout, stderr });
    } catch (error: any) {
        return res.status(500).json({
            error: error.message,
            stdout: error.stdout,
            stderr: error.stderr,
            code: error.code
        });
    }
}
