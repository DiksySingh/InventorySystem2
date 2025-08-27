const path = require("path");
const fs = require("fs");
const ExcelJS = require("exceljs");
const WToW = require("../../models/serviceInventoryModels/warehouse2WarehouseSchema");

const generateWToWExcel = async (req, res) => {
  try {
    const records = await WToW.find({
      status: false
    }).select("fromWarehouse toWarehouse items isDefective pickupDate");
    
    if (!records.length) {
      return res.status(404).json({ message: "No matching records found." });
    }

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Warehouse Transfers");

    // Header Row
    worksheet.columns = [
      { header: "From Warehouse", key: "fromWarehouse", width: 20 },
      { header: "To Warehouse", key: "toWarehouse", width: 25 },
      { header: "Item Name", key: "itemName", width: 20 },
      { header: "Quantity", key: "quantity", width: 10 },
      { header: "Serial Numbers", key: "serialNumber", width: 30 },
      { header: "Is Defective", key: "isDefective", width: 15 },
      { header: "Pickup Date", key: "pickupDate", width: 20 }
    ];

    // Populate data rows
    records.forEach(record => {
      record.items.forEach(item => {
        worksheet.addRow({
          fromWarehouse: record.fromWarehouse,
          toWarehouse: record.toWarehouse,
          itemName: item.itemName,
          quantity: item.quantity,
          serialNumber: item.serialNumber ? item.serialNumber.join(", "): "",
          isDefective: record.isDefective ? "Yes" : "No",
          pickupDate: record.pickupDate ? record.pickupDate.toISOString().split("T")[0] : ""
        });
      });
    });

    // Ensure uploads folder exists
    const uploadDir = path.join(__dirname, "../../uploads");
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir);
    }

    const filePath = path.join(uploadDir, "WToW_Report.xlsx");
    await workbook.xlsx.writeFile(filePath);

    return res.status(200).json({
      success: true,
      message: "Excel file generated successfully.",
      filePath: `/uploads/WToW_Report.xlsx`
    });

  } catch (error) {
    console.error("Excel generation error:", error);
    return res.status(500).json({
      success: false,
      message: "Error generating Excel file.",
      error: error.message
    });
  }
};

module.exports = { generateWToWExcel };