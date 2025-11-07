const mongoose = require("mongoose");
const PickupItem = require("../../models/serviceInventoryModels/pickupItemSchema");
const XLSX = require("xlsx");

// Controller to export data as Excel and send it as a buffer
module.exports.exportToExcel = async (req, res) => {
  try {
    const marchFirst = new Date("2025-03-01T00:00:00.000Z");
    const warehouseName = "Maharashtra Warehouse - Ambad";

    // Fetch filtered data
    const items = await PickupItem.find({
      warehouse: warehouseName,
      pickupDate: { $gte: marchFirst },
    }).select("-__v -_id");

    // Prepare the data for the Excel file
    const itemsData = items.map(item => ({
      ServicePerson: item.servicePersonName || "",
      ServicePersonContact: item.servicePerContact || "",
      FarmerName: item.farmerName || "",
      FarmerContact: item.farmerContact || "",
      Warehouse: item.warehouse,
      SerialNumber: item.serialNumber,
      PickupDate: item.pickupDate.toISOString().slice(0, 10),
      Status: item.status ? "Approved" : "Not Approved",
      Track: item.incoming ? "IN" : "OUT",
      ItemNames: item.items.map(i => `${i.itemName} (Qty: ${i.quantity})`).join(", "),
      Remark: item.remark || "",
    }));

    // Create a worksheet and workbook
    const worksheet = XLSX.utils.json_to_sheet(itemsData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Pickup Items");

    // Generate the Excel file as a buffer
    const excelBuffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

    // Set response headers and send the buffer as a downloadable Excel file
    res.setHeader("Content-Disposition", 'attachment; filename="Filtered_Pickup_Items.xlsx"');
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");

    return res.status(200).send(excelBuffer);
  } catch (error) {
    console.error("Error exporting data to Excel:", error);
    res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message,
    });
  }
};

