import type { NextApiRequest, NextApiResponse } from 'next';

/**
 * Initiates GitHub OAuth flow
 * Returns the authorization URL for the frontend to redirect to
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    // CORS is handled by middleware.ts — no manual headers here

    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    // Client ID is always available via hardcoded fallback in GitHubAuthManager

    // Get the redirect URI from query or use default
    const redirectUri = req.query.redirect_uri as string || `${process.env.API_BASE_URL || 'http://localhost:3000'}/api/auth/github/callback`;
    const mode = req.query.mode as 'electron' | 'web';

    // Use the Auth Manager to decide the best flow (Hybrid Strategy)
    try {
        const { GitHubAuthManager } = require('../../../../lib/github-auth-manager');
        const authResponse = await GitHubAuthManager.initiateLogin(redirectUri, mode);
        return res.status(200).json(authResponse);
    } catch (error: any) {
        console.error('[Auth] Strategy selection failed:', error);
        return res.status(500).json({
            error: 'auth_init_failed',
            message: error.message
        });
    }
}
