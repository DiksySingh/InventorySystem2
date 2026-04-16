const prisma = require("../../config/prismaClient");

const getVehicleReceiptStatusToday = async (req, res) => {
  try {
    const { vehicleNo, entryTime } = req.query;

    if (!vehicleNo || !entryTime) {
      return res.status(400).json({
        success: false,
        message: "vehicleNo and entryTime is required",
      });
    }

    const normalizedVehicle = vehicleNo.toUpperCase().trim();

    const entryDate = new Date(entryTime);
    console.log(entryDate);

    if (isNaN(entryDate)) {
      return res.status(400).json({
        success: false,
        message: "Invalid entryTime format",
      });
    }

    const now = new Date();
    console.log(now);

    const count = await prisma.purchaseOrderReceipt.count({
      where: {
        vehicleNumber: normalizedVehicle,
        receivedDate: {
          gte: entryDate,
          lte: now,
        },
      },
    });

    return res.status(200).json({
      success: true,
      data: {
        receivedAfterEntry: count > 0,
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
