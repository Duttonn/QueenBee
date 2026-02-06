import type { NextApiRequest, NextApiResponse } from 'next';

/**
 * Initiates GitHub OAuth flow
 * Returns the authorization URL for the frontend to redirect to
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const clientId = process.env.GITHUB_CLIENT_ID;

    if (!clientId) {
        return res.status(500).json({
            error: 'GitHub OAuth not configured',
            message: 'Please set GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET in your environment variables.',
            setup: {
                step1: 'Go to https://github.com/settings/developers',
                step2: 'Create a new OAuth App',
                step3: 'Set Homepage URL to http://localhost:5173',
                step4: 'Set Authorization callback URL to http://localhost:3000/api/auth/github/callback',
                step5: 'Copy Client ID and Client Secret to .env.local'
            }
        });
    }

    // Get the redirect URI from query or use default
    const redirectUri = req.query.redirect_uri as string || 'http://localhost:3000/api/auth/github/callback';
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
