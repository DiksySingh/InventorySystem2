const ExcelJS = require("exceljs");
const path = require("path");
const fs = require("fs");
const WarehouseItems = require("../../models/serviceInventoryModels/warehouseItemsSchema");

const generateWarehouseExcel = async (req, res) => {
  try {
    const  warehouseId = "67446a8b27dae6f7f4d985dd";

    const data = await WarehouseItems.findOne({ warehouse: warehouseId });

    if (!data) {
      return res.status(404).json({ success: false, message: "Warehouse not found" });
    }

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Warehouse Items");

    worksheet.columns = [
      { header: "Item Name", key: "itemName", width: 25 },
      { header: "Quantity", key: "quantity", width: 15 },
      { header: "New Stock", key: "newStock", width: 15 },
      { header: "Defective", key: "defective", width: 15 },
      { header: "Repaired", key: "repaired", width: 15 },
      { header: "Rejected", key: "rejected", width: 15 }
    ];

    data.items.forEach((item) => {
      worksheet.addRow({
        itemName: item.itemName,
        quantity: item.quantity,
        newStock: item.newStock,
        defective: item.defective,
        repaired: item.repaired,
        rejected: item.rejected
      });
    });

    const fileName = `Warehouse_Report_${data.warehouse.name}_${new Date().toISOString().split("T")[0]}.xlsx`;
    const filePath = path.join(__dirname, "../uploads", fileName);

    await workbook.xlsx.writeFile(filePath);

    return res.download(filePath, fileName, (err) => {
      if (err) {
        console.error("Download error:", err);
      } else {
        fs.unlinkSync(filePath); // delete after download
      }
    });
  } catch (error) {
    console.error("Excel export error:", error);
    return res.status(500).json({ success: false, message: "Something went wrong", error: error.message });
  }
};

module.exports = { generateWarehouseExcel };