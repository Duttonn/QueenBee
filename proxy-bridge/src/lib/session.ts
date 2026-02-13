import { NextApiRequest, NextApiResponse } from 'next';
import { v4 as uuidv4 } from 'uuid';

const SESSION_COOKIE = 'qb_session';
const SESSION_MAX_AGE = 60 * 60 * 24 * 365; // 1 year

function parseCookies(cookieHeader: string): Record<string, string> {
    const cookies: Record<string, string> = {};
    cookieHeader.split(';').forEach(part => {
        const [key, ...val] = part.trim().split('=');
        if (key) cookies[key] = decodeURIComponent(val.join('='));
    });
    return cookies;
}

/**
 * Get or create a session ID from the request cookies.
 * Sets the cookie on the response if it doesn't exist yet.
 */
export function getSessionId(req: NextApiRequest, res?: NextApiResponse): string {
    // Prefer X-Session-Id set by Next.js middleware (always present for /api/* routes)
    const fromMiddleware = req.headers['x-session-id'] as string | undefined;
    if (fromMiddleware) return fromMiddleware;

    // Fallback: parse cookie directly (e.g. if middleware didn't run)
    const cookies = parseCookies(req.headers.cookie || '');
    let sessionId = cookies[SESSION_COOKIE];

    if (!sessionId) {
        sessionId = uuidv4();
        if (res) {
            const cookie = `${SESSION_COOKIE}=${sessionId}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${SESSION_MAX_AGE}`;
            res.setHeader('Set-Cookie', cookie);
        }
    }

    return sessionId;
}
