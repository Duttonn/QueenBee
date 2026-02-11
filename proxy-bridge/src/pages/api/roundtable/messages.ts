import { NextApiRequest, NextApiResponse } from 'next';
import { Roundtable } from '../../../lib/Roundtable';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method === 'DELETE') {
        const { projectPath, swarmId } = req.query;
        if (!projectPath || !swarmId) {
            return res.status(400).json({ error: 'projectPath and swarmId are required' });
        }
        try {
            const roundtable = new Roundtable(projectPath as string);
            const removed = await roundtable.clearBySwarmId(swarmId as string);
            return res.status(200).json({ removed });
        } catch (error: any) {
            return res.status(500).json({ error: error.message });
        }
    }

    const { projectPath, swarmId } = req.query;

    if (!projectPath) {
        return res.status(400).json({ error: 'projectPath is required' });
    }

    try {
        const roundtable = new Roundtable(projectPath as string);
        const messages = await roundtable.getRecentMessages(50, swarmId as string | undefined);
        return res.status(200).json(messages);
    } catch (error: any) {
        return res.status(500).json({ error: error.message });
    }
}
