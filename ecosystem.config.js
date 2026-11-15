module.exports = {
  apps: [
    {
      name: "mrc-web",
      cwd: "./mrc",
      script: "npm",
      args: "start",
      env: {
        NODE_ENV: "production",
        PORT: 3554,
        BOT_API_URL: "http://127.0.0.1:3445",
      },
      restart_delay: 3000,
      max_restarts: 10,
    },
    {
      name: "mrc-bot",
      cwd: "./mrc-bot",
      script: "index.js",
      env: {
        NODE_ENV: "production",
        PORT: 3445,
      },
      restart_delay: 5000,
      max_restarts: 10,
    },
    {
      name: "mrc-scheduler",
      cwd: "./mrc",
      script: "scripts/notificationScheduler.js",
      env: {
        NODE_ENV: "production",
      },
      restart_delay: 5000,
      max_restarts: 10,
    },
  ],
};
