import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const SESSION_COOKIE = 'qb_session';
const SESSION_MAX_AGE = 60 * 60 * 24 * 365; // 1 year

export function middleware(request: NextRequest) {
    const requestId = request.headers.get('x-request-id') || crypto.randomUUID();
    const origin = request.headers.get('origin');

    const allowedOriginsEnv = process.env.ALLOWED_ORIGINS || "";
    const allowedOrigins = allowedOriginsEnv
        ? allowedOriginsEnv.split(',').map(s => s.trim())
        : [];

    console.log(`[CORS Check] Origin: ${origin} | Allowed: ${allowedOrigins.join(' ')}`);

    // Match origin against allowed list, .vercel.app previews, trycloudflare tunnels, and localhost
    // Localhost/127.0.0.1 is ALWAYS allowed — this is a local desktop app
    const isAllowed = origin && (
        allowedOrigins.includes(origin) ||
        origin.endsWith('.vercel.app') ||
        /^https?:\/\/[a-z0-9-]+\.trycloudflare\.com$/.test(origin) ||
        /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)
    );

    // Electron: no origin, 'null', or 'file://' — needs CORS headers for file:// → localhost
    const isElectron = !origin || origin === 'null' || origin.startsWith('file://');

    // Detect if running behind HTTPS (e.g. Cloudflare tunnel)
    const isSecure = request.headers.get('x-forwarded-proto') === 'https'
        || request.url.startsWith('https');
    const cookieOpts = {
        httpOnly: true,
        sameSite: isSecure ? 'none' as const : 'lax' as const,
        secure: isSecure,
        path: '/',
        maxAge: SESSION_MAX_AGE,
    };

    // Check/create session cookie
    let sessionId = request.cookies.get(SESSION_COOKIE)?.value;
    const needsSession = !sessionId;
    if (!sessionId) {
        sessionId = crypto.randomUUID();
    }

    // Handle CORS preflight requests
    if (request.method === 'OPTIONS') {
        if (isAllowed || isElectron) {
            const resp = new NextResponse(null, {
                status: 200,
                headers: {
                    'Access-Control-Allow-Origin': origin || 'null',
                    'Access-Control-Allow-Credentials': 'true',
                    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
                    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Codex-Provider, X-Request-Id',
                    'X-Request-Id': requestId,
                },
            });
            if (needsSession) resp.cookies.set(SESSION_COOKIE, sessionId, cookieOpts);
            return resp;
        }
        // Unmatched origin: no CORS headers
        return new NextResponse(null, { status: 200 });
    }

    // Clone request headers
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('X-Request-Id', requestId);
    requestHeaders.set('X-Session-Id', sessionId);

    const response = NextResponse.next({ request: { headers: requestHeaders } });

    // Only set CORS headers if origin is explicitly allowed — never '*'
    if (isAllowed || isElectron) {
        response.headers.set('Access-Control-Allow-Origin', origin || 'null');
        response.headers.set('Access-Control-Allow-Credentials', 'true');
        response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
        response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Codex-Provider, X-Request-Id');
        if (needsSession) response.cookies.set(SESSION_COOKIE, sessionId, cookieOpts);
    }
    // Unmatched browser origin: no CORS headers = browser blocks the request

    response.headers.set('X-Request-Id', requestId);
    return response;
}

export const config = {
    matcher: '/api/:path*',
};
