const cron = require("node-cron");
const {sendAllSystemStockShortageReport} = require("../../controllers/rawMaterialItemsController/commonController");

const now = new Date();
const istTime = new Date(now.getTime() + 5.5 * 60 * 60 * 1000)
    .toISOString()
    .replace("T", " ")
    .replace("Z", " IST");

cron.schedule(
  "10 11 * * *",
  async () => {
    console.log(`⏰ Running system stock shortage cron (IST): ${istTime}`);
    await sendAllSystemStockShortageReport();
  },
  {
    timezone: "Asia/Kolkata",
  }
);