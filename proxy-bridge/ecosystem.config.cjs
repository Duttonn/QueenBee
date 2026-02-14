module.exports = {
  apps: [
      {
        name: 'queenbee-api',
        script: 'node_modules/.bin/next',
        args: 'start -p 3000',
        cwd: __dirname,
        env_file: '/home/fish/queen-bee/.env.bridge',
        env: {
          NODE_ENV: 'production',
          PORT: 3000,
        },
      },
      {
        name: 'queenbee-socket',
        script: 'server.ts',
        interpreter: 'node',
        interpreter_args: '--import tsx',
        cwd: __dirname,
        env_file: '/home/fish/queen-bee/.env.bridge',
        env: {
          NODE_ENV: 'production',
          SOCKET_PORT: 3001,
        },
      },
  ],
};