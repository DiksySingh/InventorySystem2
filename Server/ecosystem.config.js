module.exports = {
  apps: [
    {
      name: "pm2-daily-restart",
      script: "pm2",
      args: "restart all",     // this command restarts ALL processes
      cron_restart: "0 0 * * *", // every day at midnight (00:00)
      autorestart: false,        // don’t auto-restart this scheduler
    },
  ],
};
