
import { NextApiRequest, NextApiResponse } from 'next';
import { AuthManager } from '../../../lib/auth-manager';
import { AuthProfileStore } from '../../../lib/auth-profile-store';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method === 'GET') {
        const profiles = await AuthProfileStore.listProfiles();
        // Remove secrets before sending to client
        const safeProfiles = profiles.map(p => ({
            id: p.id,
            provider: p.provider,
            mode: p.mode,
            expires: p.expires
        }));
        return res.json({ profiles: safeProfiles });
    }

    if (req.method === 'POST') {
        const { provider, token, alias } = req.body;

        if (!provider || !token) {
            return res.status(400).json({ error: 'Provider and token required' });
        }

        try {
            await AuthManager.addStaticToken(provider, token, alias);
            return res.status(200).json({ success: true });
        } catch (e: any) {
            return res.status(500).json({ error: e.message });
        }
    }

    if (req.method === 'DELETE') {
        const { id } = req.body;
        if (!id) return res.status(400).json({ error: 'ID required' });
        await AuthProfileStore.deleteProfile(id);
        return res.json({ success: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
}
