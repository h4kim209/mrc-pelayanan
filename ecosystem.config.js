module.exports = {
  apps: [
    {
      name: "mrc-web",
      cwd: "./mrc",
      script: "npm",
      args: "start",
      autorestart: true,
      restart_delay: 3000,
      env: {
        NODE_ENV: "production",
        PORT: 3554,
        BOT_API_URL: "http://127.0.0.1:3445",
      },
    },
    {
      name: "mrc-bot",
      cwd: "./mrc-bot",
      script: "index.js",
      autorestart: true,
      restart_delay: 3000,
      exp_backoff_restart_delay: 1000,
      env: {
        NODE_ENV: "production",
        PORT: 3445,
      },
    },
    {
      name: "mrc-scheduler",
      cwd: "./mrc",
      script: "scripts/notificationScheduler.js",
      autorestart: true,
      restart_delay: 5000,
      env: {
        NODE_ENV: "production",
      },
    },
  ],
};
