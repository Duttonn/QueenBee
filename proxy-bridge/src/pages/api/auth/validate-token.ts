import type { NextApiRequest, NextApiResponse } from 'next';

/**
 * POST /api/auth/validate-token
 * Validates a GitHub personal access token server-side (avoids browser CORS).
 * Body: { token: string }
 * Returns: { user: { id, name, email, avatarUrl, login }, accessToken }
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { token } = req.body;
    if (!token || typeof token !== 'string' || !token.trim()) {
        return res.status(400).json({ error: 'Missing token' });
    }

    const trimmed = token.trim();

    try {
        const userResponse = await fetch('https://api.github.com/user', {
            headers: {
                'Authorization': `Bearer ${trimmed}`,
                'Accept': 'application/vnd.github.v3+json',
                'User-Agent': 'QueenBee-Dashboard'
            }
        });

        if (!userResponse.ok) {
            const text = await userResponse.text();
            console.error(`[ValidateToken] GitHub /user failed (${userResponse.status}):`, text);
            return res.status(401).json({ error: 'Invalid token', message: 'GitHub rejected the token. Check it has the required scopes.' });
        }

        const ghUser = await userResponse.json();

        // Try to get primary email if not public
        let email = ghUser.email;
        if (!email) {
            try {
                const emailsRes = await fetch('https://api.github.com/user/emails', {
                    headers: {
                        'Authorization': `Bearer ${trimmed}`,
                        'Accept': 'application/vnd.github.v3+json',
                        'User-Agent': 'QueenBee-Dashboard'
                    }
                });
                if (emailsRes.ok) {
                    const emails: { email: string; primary: boolean; verified: boolean }[] = await emailsRes.json();
                    const primary = emails.find(e => e.primary && e.verified);
                    email = primary?.email ?? emails[0]?.email ?? `${ghUser.login}@users.noreply.github.com`;
                }
            } catch {
                // ignore — email is optional
            }
        }

        return res.status(200).json({
            user: {
                id: String(ghUser.id),
                name: ghUser.name || ghUser.login,
                email: email || `${ghUser.login}@users.noreply.github.com`,
                avatarUrl: ghUser.avatar_url,
                login: ghUser.login
            },
            accessToken: trimmed
        });
    } catch (err: any) {
        console.error('[ValidateToken] Error:', err);
        return res.status(500).json({ error: 'Server error', message: err.message });
    }
}
