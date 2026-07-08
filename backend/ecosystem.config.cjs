module.exports = {
  apps: [
    {
      name: 'codevault-api',
      script: 'app.js',
      cwd: __dirname,
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
      },
      max_memory_restart: '700M',
    },
  ],
};
