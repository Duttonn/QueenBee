import { NextApiRequest, NextApiResponse } from 'next';
import { Roundtable } from '../../../lib/Roundtable';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        res.setHeader('Allow', ['POST']);
        return res.status(405).end(`Method ${req.method} Not Allowed`);
    }

    const { projectPath, content, agentId = 'user', role = 'user', targetAgentId, swarmId } = req.body;

    if (!projectPath || !content) {
        return res.status(400).json({ error: 'projectPath and content required' });
    }

    try {
        const roundtable = new Roundtable(projectPath);
        const message = await roundtable.postMessage(agentId, role, content, { targetAgentId, swarmId });
        return res.status(200).json(message);
    } catch (error: any) {
        return res.status(500).json({ error: error.message });
    }
}
