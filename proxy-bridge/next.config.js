/** @type {import('next').NextConfig} */
const nextConfig = {
    // CORS is handled entirely by src/middleware.ts which dynamically
    // reflects the request origin. No static headers here — a static
    // Access-Control-Allow-Origin would conflict with the middleware's
    // per-request origin logic and break credentials mode.

    // Disable @vercel/nft "Collecting build traces" pass.
    // Native modules (node-pty, puppeteer-core) use runtime __dirname /
    // bindings() calls that nft cannot statically resolve, causing
    // ERR_INVALID_ARG_TYPE and exit code 1. Trace files are only needed
    // for `output: 'standalone'` deployments — we ship via `next start`
    // inside Electron, so they are not required.
    outputFileTracing: false,

    // Prevent Next.js from bundling native modules — they must be loaded
    // directly from node_modules at runtime, not inlined by webpack.
    serverExternalPackages: ['node-pty'],
};

export default nextConfig;
