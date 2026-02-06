
import { NextApiRequest, NextApiResponse } from 'next';
import { AuthManager } from '../../../lib/auth-manager';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { provider, mode } = req.query;

    if (!provider || typeof provider !== 'string') {
        return res.status(400).json({ error: 'Provider is required' });
    }

    try {
        const { url, state, codeVerifier } = await AuthManager.initiateOAuth(provider, mode as any);

        // Store verifier/state in cookie or session if needed for strict security
        // For this implementation, we might skip persistent state storage but it's recommended
        // Or we pass state as param.

        // In a real app, store codeVerifier in a secure HTTP-only cookie
        if (codeVerifier) {
            res.setHeader('Set-Cookie', `auth_verifier=${codeVerifier}; Path=/; HttpOnly; SameSite=Lax; Max-Age=600`);
        }

        res.redirect(url);
    } catch (error: any) {
        console.error('Login error:', error);
        res.status(500).json({ error: error.message });
    }
}
