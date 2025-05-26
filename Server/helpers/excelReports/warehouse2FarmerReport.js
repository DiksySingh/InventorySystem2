const path = require("path");
const fs = require("fs");
const ExcelJS = require("exceljs");
const PickupItem = require("../../models/serviceInventoryModels/pickupItemSchema");

const generateWarehouse2FarmerExcel = async (req, res) => {
try {
    const records = await PickupItem.find({
      incoming: false,
      warehouse: "Jalna Warehouse"
    }).select(
      "servicePersonName servicePerContact farmerName farmerContact farmerVillage farmerSaralId warehouse items serialNumber withoutRMU rmuRemark remark pickupDate"
    );

    if (!records.length) {
      return res.status(404).json({ message: "No matching records found." });
    }

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Pickup Report");

    worksheet.columns = [
      { header: "Farmer Name", key: "farmerName", width: 20 },
      { header: "Farmer Contact", key: "farmerContact", width: 15 },
      { header: "Village", key: "farmerVillage", width: 20 },
      { header: "Saral ID", key: "farmerSaralId", width: 20 },
      { header: "Warehouse", key: "warehouse", width: 20 },
      { header: "Items", key: "itemsCombined", width: 30 },
      { header: "Total Quantity", key: "totalQuantity", width: 15 },
      { header: "Serial Number", key: "serialNumber", width: 25 },
      { header: "Sending Date", key: "pickupDate", width: 20 },
    ];

    records.forEach(record => {
      const itemsCombined = record.items.map(i => i.itemName).join(", ");
      const totalQuantity = record.items.reduce((sum, i) => sum + (i.quantity || 0), 0);

      worksheet.addRow({
        farmerName: record.farmerName || "",
        farmerContact: record.farmerContact || "",
        farmerVillage: record.farmerVillage || "",
        farmerSaralId: record.farmerSaralId || "",
        warehouse: record.warehouse || "",
        itemsCombined,
        totalQuantity,
        serialNumber: record.serialNumber || "",
        pickupDate: record.pickupDate ? record.pickupDate.toISOString().split("T")[0] : "",
      });
    });

    const uploadDir = path.join(__dirname, "../../uploads");
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir);
    }

    const filePath = path.join(uploadDir, "Warehouse2Farmer.xlsx");
    await workbook.xlsx.writeFile(filePath);

    return res.status(200).json({
      success: true,
      message: "Excel file generated successfully.",
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

module.exports = {
  generateWarehouse2FarmerExcel
};