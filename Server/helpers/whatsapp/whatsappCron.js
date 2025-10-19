const cron = require("node-cron");
const { bulkMessage } = require("../../helpers/whatsapp/bulkMessageEng");

// Schedule: Every day at 10:05 PM IST
cron.schedule(
  "5 22 * * *", // minute hour day month weekday
  async () => {
    try {
      const contactNumber = "+919266817734"; // ✅ Update if needed
      const message = "Good night! 🌙 Sent automatically at 10:05 PM IST.";

      console.log("🕙 Triggering WhatsApp message at 10:05 PM...");
      const result = await bulkMessage(contactNumber, message);
      console.log("✅ Message sent successfully:", result);
    } catch (error) {
      console.error("❌ Error sending scheduled message:", error);
    }
  },
  {
    timezone: "Asia/Kolkata", // ✅ Ensures exact IST timing
  }
);

console.log("⏰ WhatsApp message scheduler initialized — runs daily at 10:05 PM IST.");

