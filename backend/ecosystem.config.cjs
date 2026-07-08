module.exports = {
  apps: [
    {
      name: 'codevault-api',
      script: 'app.js',
      cwd: __dirname,
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'development',
        INIT_SCHEMA: 'true',
      },
      env_production: {
        NODE_ENV: 'production',
        INIT_SCHEMA: 'false',
      },
      max_memory_restart: '500M',
      kill_timeout: 5000,
      listen_timeout: 10000,
    },
  ],
};
