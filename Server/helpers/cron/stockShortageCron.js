const cron = require("node-cron");
const {sendAllSystemStockShortageReport} = require("../../controllers/rawMaterialItemsController/commonController");

cron.schedule(
  "31 17 * * *",
  async () => {
    console.log("⏰ Running system stock shortage cron (IST): ", new Date().toLocaleString("en-IN"));
    await sendAllSystemStockShortageReport();
  },
  {
    timezone: "Asia/Kolkata",
  }
);