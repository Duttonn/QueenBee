import type { NextApiRequest, NextApiResponse } from 'next';

/**
 * GitHub OAuth Callback Handler - REAL Implementation
 * Exchanges authorization code for access token and fetches user data
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    const { code, state, error: oauthError, error_description } = req.query;

    // Handle OAuth errors from GitHub
    if (oauthError) {
        console.error('[Auth] GitHub OAuth error:', oauthError, error_description);
        return res.status(400).json({
            error: oauthError as string,
            message: error_description as string || 'GitHub authentication failed',
            success: false
        });
    }

    if (!code || typeof code !== 'string') {
        return res.redirect(`http://localhost:5173/auth/callback?error=${encodeURIComponent('Authorization code is missing')}`);
    }

    const clientId = process.env.GITHUB_CLIENT_ID;
    const clientSecret = process.env.GITHUB_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
        return res.status(500).json({
            error: 'not_configured',
            message: 'GitHub OAuth credentials are not configured on the server.',
            success: false,
            help: 'Set GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET in .env.local'
        });
    }

    try {
        console.log('[Auth] Exchanging code for access token...');

        // Decode state to recover the redirect_uri used during authorization
        let redirectUri = 'http://localhost:3000/api/auth/github/callback';

        // Exchange code for access token
        const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                client_id: clientId,
                client_secret: clientSecret,
                code: code,
                redirect_uri: redirectUri,
            }),
        });

        const tokenData = await tokenResponse.json();

        if (tokenData.error) {
            console.error('[Auth] Token exchange failed:', tokenData.error, tokenData.error_description);
            return res.status(400).json({
                error: tokenData.error,
                message: tokenData.error_description || 'Failed to exchange authorization code',
                success: false
            });
        }

        const accessToken = tokenData.access_token;
        const tokenType = tokenData.token_type || 'bearer';
        const scope = tokenData.scope;

        if (!accessToken) {
            console.error('[Auth] Token exchange returned no access_token:', JSON.stringify(tokenData));
            return res.status(401).json({
                error: 'no_token',
                message: 'GitHub returned no access token. The OAuth app credentials may be invalid.',
                success: false
            });
        }

        console.log(`[Auth] Token received (scope: ${scope}), fetching user profile...`);

        // Fetch user profile
        const userResponse = await fetch('https://api.github.com/user', {
            headers: {
                'Authorization': `${tokenType} ${accessToken}`,
                'Accept': 'application/vnd.github.v3+json',
                'User-Agent': 'QueenBee-Dashboard'
            },
        });

        if (!userResponse.ok) {
            const errorText = await userResponse.text();
            console.error(`[Auth] GitHub /user failed (${userResponse.status}):`, errorText);
            return res.status(userResponse.status).json({
                error: 'user_fetch_failed',
                message: `GitHub API rejected the token (${userResponse.status}). Please try logging in again.`,
                success: false
            });
        }

        const user = await userResponse.json();

        // Fetch user emails (primary email may be private)
        let primaryEmail = user.email;
        if (!primaryEmail) {
            const emailResponse = await fetch('https://api.github.com/user/emails', {
                headers: {
                    'Authorization': `${tokenType} ${accessToken}`,
                    'Accept': 'application/vnd.github.v3+json',
                    'User-Agent': 'QueenBee-Dashboard'
                },
            });

            if (emailResponse.ok) {
                const emails = await emailResponse.json();
                const primary = emails.find((e: any) => e.primary && e.verified);
                primaryEmail = primary?.email || emails[0]?.email;
            }
        }

        // Fetch user's organizations
        const orgsResponse = await fetch('https://api.github.com/user/orgs', {
            headers: {
                'Authorization': `${tokenType} ${accessToken}`,
                'Accept': 'application/vnd.github.v3+json',
                'User-Agent': 'QueenBee-Dashboard'
            },
        });

        let organizations: any[] = [];
        if (orgsResponse.ok) {
            organizations = await orgsResponse.json();
        }

        // Fetch user's repositories count
        const reposResponse = await fetch('https://api.github.com/user/repos?per_page=1', {
            headers: {
                'Authorization': `${tokenType} ${accessToken}`,
                'Accept': 'application/vnd.github.v3+json',
                'User-Agent': 'QueenBee-Dashboard'
            },
        });

        let repoCount = 0;
        if (reposResponse.ok) {
            // Get total count from Link header if available
            const linkHeader = reposResponse.headers.get('Link');
            if (linkHeader) {
                const match = linkHeader.match(/page=(\d+)>; rel="last"/);
                repoCount = match ? parseInt(match[1]) : user.public_repos + user.total_private_repos;
            } else {
                repoCount = user.public_repos + (user.total_private_repos || 0);
            }
        }

        // Fetch user's repositories (First 10 sorted by updated)
        const reposListResponse = await fetch('https://api.github.com/user/repos?sort=updated&per_page=10', {
            headers: {
                'Authorization': `${tokenType} ${accessToken}`,
                'Accept': 'application/vnd.github.v3+json',
                'User-Agent': 'QueenBee-Dashboard'
            },
        });

        let repositories: any[] = [];
        if (reposListResponse.ok) {
            const repos = await reposListResponse.json();
            repositories = repos.map((r: any) => ({
                id: r.id,
                name: r.name,
                full_name: r.full_name,
                private: r.private,
                html_url: r.html_url,
                description: r.description,
                language: r.language,
                updated_at: r.updated_at
            }));
        }

        console.log(`[Auth] Successfully authenticated: ${user.login} (${primaryEmail})`);

        // Save token securely
        try {
            // dynamic import to avoid issues if file doesn't exist yet during build
            const { saveToken } = await import('../../../../lib/auth-store');
            await saveToken(accessToken);
            console.log('[Auth] Token saved to store');
        } catch (storeError) {
            console.error('[Auth] Failed to save token:', storeError);
            // Don't block login if storage fails, but log it
        }

        const authData = JSON.stringify({
            success: true,
            user: {
                id: user.id.toString(),
                login: user.login,
                name: user.name || user.login,
                email: primaryEmail,
                avatarUrl: user.avatar_url,
                bio: user.bio,
                company: user.company,
                location: user.location,
                blog: user.blog,
                publicRepos: user.public_repos,
                privateRepos: user.total_private_repos || 0,
                followers: user.followers,
                following: user.following,
                createdAt: user.created_at,
            },
            organizations: organizations.map((org: any) => ({
                id: org.id,
                login: org.login,
                avatarUrl: org.avatar_url,
                description: org.description,
            })),
            repositories,
            accessToken,
            tokenType,
            scope: scope?.split(',') || [],
            repoCount,
        });

        // Check if we should redirect to the custom protocol (Electron)
        let isElectron = false;
        try {
            if (state) {
                const decodedState = JSON.parse(Buffer.from(state as string, 'base64').toString());
                isElectron = decodedState.mode === 'electron';
            }
        } catch (e) {
            console.error('[Auth] Failed to decode state:', e);
            // Fallback to user-agent check
            isElectron = req.headers['user-agent']?.includes('Electron') || false;
        }
        
        // Use custom protocol if it looks like an electron request
        const redirectBase = isElectron ? 'queenbee://auth/callback' : 'http://localhost:5173/auth/callback';

        return res.redirect(`${redirectBase}?auth_data=${encodeURIComponent(authData)}&state=${state}`);

    } catch (error: any) {
        console.error('[Auth] GitHub OAuth error:', error);
        // Fallback error redirect
        const isElectron = state?.toString().includes('electron');
        const redirectBase = isElectron ? 'queenbee://auth/callback' : 'http://localhost:5173/auth/callback';
        return res.redirect(`${redirectBase}?error=${encodeURIComponent(error.message || 'Unknown error')}`);
    }
}
