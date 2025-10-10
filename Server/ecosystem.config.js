module.exports = {
    app: [
        {
            name: "auto-restart-all",
            script: "pm2 restart all",
            cron_restart: "0 3 * * *", //every day at 3 AM
            autorestart: false, //don't restart this script itelf
        },
    ],
};