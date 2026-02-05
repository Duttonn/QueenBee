
import { NextApiRequest, NextApiResponse } from 'next';
import { AuthManager } from '../../../lib/auth-manager';

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

    // We attempt to decode provider from state
    let provider = 'google';
    if (state && typeof state === 'string') {
        try {
            const decoded = JSON.parse(Buffer.from(state, 'base64').toString());
            if (decoded.p) provider = decoded.p;
        } catch (e) {
            console.warn('Failed to decode state, defaulting to google');
        }
    }

    try {
        const profile = await AuthManager.exchangeCodeForToken(provider, code, codeVerifier);

        // Clear verifier cookie
        res.setHeader('Set-Cookie', `auth_verifier=; Path=/; HttpOnly; Max-Age=0`);

        // Redirect to dashboard (assuming running on 5173)
        res.redirect(`http://localhost:5173?auth_success=true&profile_id=${profile.id}`);
    } catch (err: any) {
        console.error('Callback error:', err);
        res.status(500).json({ error: err.message });
    }
}
