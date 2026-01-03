const XLSX = require("xlsx");
const mongoose = require("mongoose");
const SystemOrder = require("../../models/systemInventoryModels/systemOrderSchema");
const AppVersion = require("../../models/commonModels/appVersionSchema");
const InstallationInventory = require("../../models/systemInventoryModels/installationInventorySchema")
const createAppVersion = async (req, res) => {
    try {
        const newAppVersion = new AppVersion({
            appVersion: 1,
            link: "https://service.galosolar.com"
        });

        await newAppVersion.save();
        return res.status(200).json({
            success: true,
            message: "App Version Added Successfully"
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Internal Server Error",
            error: error.message
        });
    }
};

const WAREHOUSE_ID = "67beef9e2fffc2145da032f3";
const updateInstallationInventoryFromExcel = async (req, res) => {
  try {
    // Validate file
    if (!req.file || !req.file.buffer) {
      return res.status(400).json({ success: false, message: "No Excel file uploaded" });
    }

    // Read Excel buffer
    const workbook = XLSX.read(req.file.buffer, { type: "buffer" });
    const sheetName = workbook.SheetNames[0];
    const sheetData = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);

    if (!sheetData.length) {
      return res.status(400).json({ success: false, message: "Excel file is empty" });
    }

    let updatedCount = 0;
    let notFound = [];

    // Loop through each row
    for (const row of sheetData) {
      const { systemItemId, quantity } = row;

      if (!systemItemId || typeof quantity !== "number") {
        console.log("Skipping invalid row:", row);
        continue;
      }

      const updated = await InstallationInventory.findOneAndUpdate(
        { warehouseId: WAREHOUSE_ID, systemItemId },
        {
          $set: {
            quantity,
            updatedAt: new Date(),
          },
        },
        { new: true }
      );

      if (updated) updatedCount++;
      else notFound.push(systemItemId);
    }

    return res.status(200).json({
      success: true,
      message: `✅ Updated ${updatedCount} inventory records successfully.`,
      notFound: notFound.length ? notFound : undefined,
    });

  } catch (error) {
    console.error("❌ Error updating installation inventory:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message,
    });
  }
};

const importSystemOrdersFromExcel = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Excel file is required",
      });
    }

    // Read workbook
    const workbook = XLSX.read(req.file.buffer, { type: "buffer" });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];

    // Convert to JSON
    const rows = XLSX.utils.sheet_to_json(sheet, { defval: "" });

    if (!rows.length) {
      return res.status(400).json({
        success: false,
        message: "Excel file is empty",
      });
    }

    const payload = [];

    rows.forEach((row, index) => {
      const { warehouseId, systemId, pumpId, pumpHead } = row;

      if (!warehouseId || !systemId || !pumpHead) {
        throw new Error(`Missing required fields at row ${index + 2}`);
      }

      payload.push({
        warehouseId: new mongoose.Types.ObjectId(warehouseId),
        systemId: new mongoose.Types.ObjectId(systemId),
        pumpId: pumpId ? new mongoose.Types.ObjectId(pumpId) : null,
        pumpHead: pumpHead || "UNKNOWN",
        totalOrder: 0,
        dispatchedOrder: 0,
      });
    });

    await SystemOrder.insertMany(payload);

    return res.status(201).json({
      success: true,
      message: "System orders imported successfully",
      insertedCount: payload.length,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Excel import failed",
    });
  }
};


module.exports = {
    createAppVersion,
    updateInstallationInventoryFromExcel,
    importSystemOrdersFromExcel
}