import { NextApiRequest, NextApiResponse } from 'next';
import { Roundtable } from '../../../lib/Roundtable';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const { projectPath } = req.query;

    if (!projectPath) {
        return res.status(400).json({ error: 'projectPath is required' });
    }

    try {
        const roundtable = new Roundtable(projectPath as string);
        const messages = await roundtable.getRecentMessages(50);
        return res.status(200).json(messages);
    } catch (error: any) {
        return res.status(500).json({ error: error.message });
    }
}
