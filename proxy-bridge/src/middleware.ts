import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const SESSION_COOKIE = 'qb_session';
const SESSION_MAX_AGE = 60 * 60 * 24 * 365; // 1 year

export function middleware(request: NextRequest) {
    const requestId = request.headers.get('x-request-id') || crypto.randomUUID();
    const origin = request.headers.get('origin');
    const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://127.0.0.1:5173,http://localhost:5173')
        .split(',')
        .map(s => s.trim());
    
    // Electron sends origin 'null' or 'file://' or no origin at all
    const isElectron = !origin || origin === 'null' || origin.startsWith('file://');
    // Allow any trycloudflare.com subdomain dynamically
    const isAllowed = isElectron || (origin && (
        allowedOrigins.includes(origin) ||
        /^https?:\/\/[a-z0-9-]+\.trycloudflare\.com$/.test(origin) ||
        // In dev, allow any localhost origin
        (process.env.NODE_ENV !== 'production' && /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin))
    ));
    // For Electron, reflect '*' since credentials aren't cookie-based there
    const allowOrigin = isElectron ? '*' : (isAllowed ? origin! : allowedOrigins[0]);

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
        const headers: Record<string, string> = {
            'Access-Control-Allow-Origin': allowOrigin,
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Codex-Provider, X-Request-Id',
            'X-Request-Id': requestId,
        };
        // credentials: true is invalid with origin: * (CORS spec)
        if (allowOrigin !== '*') headers['Access-Control-Allow-Credentials'] = 'true';

        const resp = new NextResponse(null, { status: 200, headers });
        if (needsSession && allowOrigin !== '*') {
            resp.cookies.set(SESSION_COOKIE, sessionId, cookieOpts);
        }
        return resp;
    }

    // Clone request headers and set X-Request-Id + session for the actual request handler
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('X-Request-Id', requestId);
    requestHeaders.set('X-Session-Id', sessionId);

    // For all other requests, add CORS headers
    const response = NextResponse.next({
        request: {
            headers: requestHeaders,
        },
    });
    
    response.headers.set('Access-Control-Allow-Origin', allowOrigin);
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Codex-Provider, X-Request-Id');
    if (allowOrigin !== '*') response.headers.set('Access-Control-Allow-Credentials', 'true');
    response.headers.set('X-Request-Id', requestId);

    if (needsSession && allowOrigin !== '*') {
        response.cookies.set(SESSION_COOKIE, sessionId, cookieOpts);
    }

    return response;
}

export const config = {
    matcher: '/api/:path*',
};
