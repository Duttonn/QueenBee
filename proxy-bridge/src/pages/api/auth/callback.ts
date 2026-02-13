
import { NextApiRequest, NextApiResponse } from 'next';
import { AuthManager } from '../../../lib/auth-manager';
import { getSessionId } from '../../../lib/session';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { code, state, error } = req.query;

    if (error) {
        return res.status(400).json({ error });
    }

    if (!code || typeof code !== 'string') {
        return res.status(400).json({ error: 'Authorization code missing' });
    }

    // Retrieve verifier from cookie
    const verifierCookie = req.headers.cookie?.split(';').find(c => c.trim().startsWith('auth_verifier='));
    const codeVerifier = verifierCookie ? verifierCookie.split('=')[1] : undefined;

    // We attempt to decode provider and mode from state
    let provider = 'google';
    let isElectron = false;
    if (state && typeof state === 'string') {
        try {
            const decoded = JSON.parse(Buffer.from(state, 'base64').toString());
            if (decoded.p) provider = decoded.p;
            if (decoded.mode === 'electron') isElectron = true;
        } catch (e) {
            console.warn('Failed to decode state, defaulting to google/web');
        }
    }

    try {
        const sessionId = getSessionId(req, res);
        const profile = await AuthManager.exchangeCodeForToken(provider, code, codeVerifier, sessionId);

        // Clear verifier cookie
        res.setHeader('Set-Cookie', `auth_verifier=; Path=/; HttpOnly; Max-Age=0`);

        // Redirect to dashboard (isElectron ? custom protocol : web url)
        const frontendUrl = process.env.FRONTEND_URL || 'http://127.0.0.1:5173';
        const redirectBase = isElectron ? 'queenbee://auth/callback' : `${frontendUrl}/auth/callback`;
        const authData = encodeURIComponent(JSON.stringify({
            success: true,
            user: {
                id: profile.id,
                name: profile.id.split(':')[1],
                email: profile.id.split(':')[1],
                avatarUrl: '',
                plan: 'pro'
            },
            accessToken: profile.access,
            profileId: profile.id
        }));

        res.redirect(`${redirectBase}?auth_data=${authData}&state=${state}`);
    } catch (err: any) {
        console.error('Callback error:', err);
        res.status(500).json({ error: err.message });
    }
}
