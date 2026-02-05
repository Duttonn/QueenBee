
import { NextApiRequest, NextApiResponse } from 'next';
import { ConfigManager, QueenBeeConfig } from '../../lib/config-manager';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method === 'GET') {
        const config = await ConfigManager.getConfig();
        return res.json(config);
    }

    if (req.method === 'POST') {
        try {
            const config = req.body as QueenBeeConfig;
            // Basic validation
            if (!config.models) {
                return res.status(400).json({ error: 'Config must contain models array' });
            }
            await ConfigManager.saveConfig(config);
            return res.status(200).json({ success: true });
        } catch (error: any) {
            return res.status(500).json({ error: error.message });
        }
    }

    return res.status(405).json({ error: 'Method not allowed' });
}
