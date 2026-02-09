import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
    const requestId = request.headers.get('x-request-id') || crypto.randomUUID();
    const origin = request.headers.get('origin');
    const allowedOrigins = ['http://127.0.0.1:5173', 'http://localhost:5173'];
    const allowOrigin = origin && allowedOrigins.includes(origin) ? origin : '*';

    // Handle CORS preflight requests
    if (request.method === 'OPTIONS') {
        return new NextResponse(null, {
            status: 200,
            headers: {
                'Access-Control-Allow-Origin': allowOrigin,
                'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Codex-Provider, X-Request-Id',
                'Access-Control-Allow-Credentials': 'true',
                'X-Request-Id': requestId,
            },
        });
    }

    // Clone request headers and set X-Request-Id for the actual request handler to read
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('X-Request-Id', requestId);

    // For all other requests, add CORS headers
    const response = NextResponse.next({
        request: {
            headers: requestHeaders,
        },
    });
    
    response.headers.set('Access-Control-Allow-Origin', allowOrigin);
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Codex-Provider, X-Request-Id');
    response.headers.set('Access-Control-Allow-Credentials', 'true');
    response.headers.set('X-Request-Id', requestId);

    return response;
}

export const config = {
    matcher: '/api/:path*',
};
