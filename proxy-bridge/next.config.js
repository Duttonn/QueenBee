/** @type {import('next').NextConfig} */
const nextConfig = {
    // CORS is handled entirely by src/middleware.ts which dynamically
    // reflects the request origin. No static headers here — a static
    // Access-Control-Allow-Origin would conflict with the middleware's
    // per-request origin logic and break credentials mode.
};

export default nextConfig;
