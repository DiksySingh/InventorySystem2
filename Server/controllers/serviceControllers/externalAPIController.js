const prisma = require("../../config/prismaClient");

const getVehicleReceiptStatusToday = async (req, res) => {
  try {
    const { vehicleNo } = req.query;

    if (!vehicleNo) {
      return res.status(400).json({
        success: false,
        message: "vehicleNo is required",
      });
    }

    const normalizedVehicle = vehicleNo
      .replace(/[^a-zA-Z0-9]/g, "")
      .toUpperCase();

    // ✅ IST-safe (recommended)
    const now = new Date().toLocaleString("en-US", {
      timeZone: "Asia/Kolkata",
    });
    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(now);
    endOfDay.setHours(23, 59, 59, 999);

    // ✅ Use count instead of findMany (faster)
    const count = await prisma.purchaseOrderReceipt.count({
      where: {
        vehicleNumber: normalizedVehicle,
        receivedDate: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
    });

    return res.status(200).json({
      success: true,
      data: {
        receivedToday: count > 0,
      },
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

module.exports = {
  getVehicleReceiptStatusToday,
};
