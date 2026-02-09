import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
    const requestId = request.headers.get('x-request-id') || crypto.randomUUID();

    // Handle CORS preflight requests
    if (request.method === 'OPTIONS') {
        return new NextResponse(null, {
            status: 200,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Codex-Provider, X-Request-Id',
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
    
    response.headers.set('Access-Control-Allow-Origin', '*');
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Codex-Provider, X-Request-Id');
    response.headers.set('X-Request-Id', requestId);

    return response;
}

export const config = {
    matcher: '/api/:path*',
};
