import { NextApiRequest, NextApiResponse } from 'next';
import { ToolExecutor } from '../../../lib/ToolExecutor';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        res.setHeader('Allow', ['POST']);
        return res.status(405).end(`Method ${req.method} Not Allowed`);
    }

    const { command, cwd, allowedCommands } = req.body;

    if (!command) {
        return res.status(400).json({ error: 'Command is required' });
    }

    const workingDir = cwd || process.cwd();
    const executor = new ToolExecutor();

    try {
        const result = await executor.execute({
            name: 'run_shell',
            arguments: { command }
        }, {
            projectPath: workingDir,
            mode: 'local',
            allowedCommands
        });

        return res.status(200).json(result);
    } catch (error: any) {
        return res.status(500).json({
            error: error.message
        });
    }
}
