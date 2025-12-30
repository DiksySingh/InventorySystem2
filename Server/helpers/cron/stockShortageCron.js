const cron = require("node-cron");
const {sendAllSystemStockShortageReport} = require("../../controllers/rawMaterialItemsController/commonController");

const now = new Date();
const istTime = new Date(now.getTime() + 5.5 * 60 * 60 * 1000) // Convert to IST
    .toISOString()
    .replace("T", " ") // Replace "T" with space for readability
    .replace("Z", " IST"); // Add "IST" at the end

cron.schedule(
  "23 10 * * *",
  async () => {
    console.log(`⏰ Running system stock shortage cron (IST): ${istTime}`);
    await sendAllSystemStockShortageReport();
  },
  {
    timezone: "Asia/Kolkata",
  }
);