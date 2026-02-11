module.exports = {
  apps: [
    {
      name: 'queenbee-api',
      script: 'node_modules/.bin/next',
      args: 'start -p 3000',
      cwd: __dirname,
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
        SOCKET_PORT: 3001,
        FRONTEND_URL: 'https://queenbee.vercel.app',
        ALLOWED_ORIGINS: 'https://queenbee.vercel.app,http://localhost:5173,http://127.0.0.1:5173',
        API_BASE_URL: 'https://api.queenbee.dev',
        CODEX_HOME: process.env.CODEX_HOME || require('path').join(require('os').homedir(), '.codex'),
        PROJECTS_ROOT: process.env.PROJECTS_ROOT || require('path').resolve(__dirname, '..'),
      },
    },
    {
      name: 'queenbee-socket',
      script: 'server.ts',
      interpreter: 'node',
      interpreter_args: '--import tsx',
      cwd: __dirname,
      env: {
        NODE_ENV: 'production',
        SOCKET_PORT: 3001,
        ALLOWED_ORIGINS: 'https://queenbee.vercel.app,http://localhost:5173,http://127.0.0.1:5173',
        CODEX_HOME: process.env.CODEX_HOME || require('path').join(require('os').homedir(), '.codex'),
        PROJECTS_ROOT: process.env.PROJECTS_ROOT || require('path').resolve(__dirname, '..'),
      },
    },
  ],
};
