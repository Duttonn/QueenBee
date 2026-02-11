/** @type {import('next').NextConfig} */
const nextConfig = {
    async headers() {
        const allowedOrigin = process.env.FRONTEND_URL || '*';
        return [
            {
                // Apply to all API routes
                source: '/api/:path*',
                headers: [
                    { key: 'Access-Control-Allow-Credentials', value: 'true' },
                    { key: 'Access-Control-Allow-Origin', value: allowedOrigin },
                    { key: 'Access-Control-Allow-Methods', value: 'GET,DELETE,PATCH,POST,PUT,OPTIONS' },
                    { key: 'Access-Control-Allow-Headers', value: 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization, X-Codex-Provider' },
                ],
            },
        ];
    },
};

export default nextConfig;
