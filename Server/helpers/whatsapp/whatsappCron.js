const cron = require("node-cron");
const bulkMessage = require("../../helpers/whatsapp/bulkMessageEng");

// Schedule: Every day at 12:00 AM IST
cron.schedule(
  "56 22 * * *", // minute hour day month weekday
  async () => {
    try {
      const numbers = ["+919266817734", "+919519999769"]; // ✅ Add both numbers
      const message = "Happy Diwali to you and your wonderful family! 🪔✨ May this festival of lights fill your home with love, joy, and togetherness. Just as the diyas illuminate every corner, may happiness, health, and prosperity brighten every moment of your lives. Wishing you all a truly sparkling and unforgettable Diwali! ❤️";

      console.log("🕛 Triggering WhatsApp messages at 12:00 AM...");

      // Send message to each number
      for (const contactNumber of numbers) {
        const result = await bulkMessage(contactNumber, message);
        console.log(`✅ Message sent successfully to ${contactNumber}:`, result);
      }
    } catch (error) {
      console.error("❌ Error sending scheduled message:", error);
    }
  },
  {
    timezone: "Asia/Kolkata", // ✅ Ensures it runs exactly at IST midnight
  }
);

console.log("⏰ WhatsApp message scheduler initialized — runs daily at 12:00 AM IST.");