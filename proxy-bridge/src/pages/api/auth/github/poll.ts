
import type { NextApiRequest, NextApiResponse } from 'next';
import { GitHubAuthManager } from '../../../../lib/github-auth-manager';
import { saveToken } from '../../../../lib/auth-store';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { device_code } = req.body;

    if (!device_code) {
        return res.status(400).json({ error: 'Device code is required' });
    }

    try {
        const data = await GitHubAuthManager.pollForToken(device_code);

        if (data.access_token) {
            // Success! Save the token
            await saveToken(data.access_token);

            // Fetch user data to return to frontend (similar to callback flow)
            // Ideally we'd reuse the logic from callback.ts, but for now we'll do a quick fetch
            const userResponse = await fetch('https://api.github.com/user', {
                headers: {
                    'Authorization': `Bearer ${data.access_token}`,
                    'Accept': 'application/vnd.github.v3+json',
                    'User-Agent': 'QueenBee-Dashboard'
                },
            });

            const user = await userResponse.json();

            // Format minimal user data needed for immediate login
            // The frontend might need to do a full refresh to get everything, or we can send essential data
            return res.status(200).json({
                status: 'complete',
                access_token: data.access_token,
                user: {
                    id: user.id,
                    login: user.login,
                    name: user.name,
                    avatarUrl: user.avatar_url,
                    email: user.email
                }
            });
        }

        // Relay GitHub's error/status
        return res.status(200).json({
            status: 'pending',
            error: data.error,
            interval: data.interval
        });

    } catch (error: any) {
        console.error('[Auth] Device polling failed:', error);
        return res.status(500).json({ error: error.message });
    }
}
