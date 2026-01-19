const W2WTransition = require("../../models/serviceInventoryModels/warehouse2WarehouseSchema");
const XLSX = require("xlsx");
const ServicePerson = require("../../models/serviceInventoryModels/servicePersonSchema");
const PickupItem = require("../../models/serviceInventoryModels/pickupItemSchema");
const fs = require("fs");
const path = require("path");
const excelToJSONConvertor = require("../../util/Excel/excelToJSONConverter"); // or your actual utility path
const FarmerItemsActivity = require("../../models/systemInventoryModels/farmerItemsActivity");
const ExcelJS = require("exceljs");
const SurveyPerson = require("../../models/serviceInventoryModels/surveyPersonSchema");
const WarehousePerson = require("../../models/serviceInventoryModels/warehousePersonSchema");
const bulkMessage = require("../../helpers/whatsapp/bulkMessageEng");
const SystemItem = require("../../models/systemInventoryModels/systemItemSchema");
const InstallationInventory = require("../../models/systemInventoryModels/installationInventorySchema");
const Warehouse = require("../../models/serviceInventoryModels/warehouseSchema");
const multer = require("multer");

// 📦 Multer config — store in memory
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
}).single("file"); // expecting form-data key: "file"

const exportActiveUsers = async (req, res) => {
  try {
    // Fetch active users from all collections
    const warehousePersons = await WarehousePerson.find(
      { isActive: true, state: "Haryana" },
      "name contact role isActive"
    );
    const surveyPersons = await SurveyPerson.find(
      { isActive: true, state: "Haryana" },
      "name contact role isActive"
    );
    const servicePersons = await ServicePerson.find(
      { isActive: true, state: "Haryana" },
      "name contact role isActive"
    );

    // Merge all results into a single array
    const allUsers = [
      ...warehousePersons.map((u) => u.toObject()),
      ...surveyPersons.map((u) => u.toObject()),
      ...servicePersons.map((u) => u.toObject()),
    ];

    if (allUsers.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "No active users found" });
    }

    // Convert data to worksheet
    const worksheetData = allUsers.map((user) => ({
      Name: user.name,
      Contact: user.contact,
      Role: user.role,
      Active: user.isActive ? "Yes" : "No",
    }));

    const worksheet = XLSX.utils.json_to_sheet(worksheetData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "ActiveUsers");

    // Generate buffer
    const excelBuffer = XLSX.write(workbook, {
      type: "buffer",
      bookType: "xlsx",
    });

    // Set response headers for download
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=ActiveUsers.xlsx"
    );
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );

    // Send file
    res.send(excelBuffer);
  } catch (error) {
    console.error("Error exporting users:", error.message);
    res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message,
    });
  }
};

const W2W = async (req, res) => {
  try {
    let { startDate, endDate, toWarehouse, fromWarehouse } = req.query;
    if (!startDate || !endDate) {
      return res
        .status(400)
        .json({ message: "Start date and end date are required" });
    }
    // Convert to Date objects
    let start = new Date(startDate);
    let end = new Date(endDate);
    end.setHours(23, 59, 59, 999); // Ensure end of the day inclusion

    const records = await W2WTransition.find({
      pickupDate: { $gte: start, $lte: end },
      fromWarehouse,
    });

    const formattedData = records.map((record) => ({
      From: record.fromWarehouse,
      To: record.toWarehouse,
      Pickup_Date: record.pickupDate,
      Arrived_Date: record.arrivedDate,
      Approved_By: record.approvedBy,
      Driver_Name: record.driverName,
      Driver_Contact: record.driverContact,
      Items: record.items
        .map((item) => `${item.itemName}(${item.quantity})`)
        .join(", "),
    }));

    // Convert JSON data to a worksheet
    const ws = XLSX.utils.json_to_sheet(formattedData);

    // Create a new workbook and append the worksheet
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Data");

    // Define the file name
    const fileName = "W2W_data.xlsx";

    // Write the Excel file to a buffer (in-memory)
    const buffer = XLSX.write(wb, { bookType: "xlsx", type: "buffer" });

    // Set the response headers to force download in the browser
    res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.send(buffer);
    // res.status(200).json(formattedData);
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error,
    });
  }
};

const getServicePersonForStates = async (req, res) => {
  try {
    const state = ["Maharashtra", "Punjab", "Chattisgarh", "Rajasthan"];

    // Assuming you have a ServicePerson model to fetch service persons from MongoDB
    const servicePersons = await ServicePerson.find({ state: { $in: state } });

    // Transform data into a format suitable for Excel
    const data = servicePersons.map((person) => ({
      Name: person.name,
      Contact: person.contact,
      State: person.state,
      Latitude: person.latitude || "",
      Longitude: person.longitude || ""
    }));

    // Create a new worksheet from the data
    const worksheet = XLSX.utils.json_to_sheet(data);

    // Create a new workbook and append the worksheet
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "ServicePersons");

    // Write the workbook to a buffer
    const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

    // Optional: Set headers for file download and Excel content type (if needed)
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=Service_Persons.xlsx"
    );
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );

    // Send the buffer as the response
    res.status(200).send(buffer);
  } catch (error) {
    console.error("Error generating Excel:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message,
    });
  }
};

const exportPickupItemsToExcel = async (req, res) => {
  try {
    const warehouse = "Bhiwani"; // Get warehouse from query params

    // Set date range from 20th February of the current year to today
    const startDate = new Date(new Date().getFullYear(), 1, 20); // 1 = February (0-based)
    const endDate = new Date();

    // Query the database with filters
    const filteredItems = await PickupItem.find({
      warehouse,
      pickupDate: { $gte: startDate, $lte: endDate },
      incoming: true,
    });

    // Initialize overall total count
    let overallTotal = 0;

    // Map data into array of objects for Excel sheet, adding 'Total Quantity' per row
    const dataForExcel = filteredItems.map((item) => {
      // Calculate total quantity of all items in the row
      const totalQuantity = item.items.reduce((sum, i) => sum + i.quantity, 0);
      overallTotal += totalQuantity; // Add to overall total

      return {
        "Service Person Name": item.servicePersonName || "",
        "Service Person Contact": item.servicePerContact || "",
        "Farmer Name": item.farmerName || "",
        "Farmer Contact": item.farmerContact || "",
        "Farmer Saral ID": item.farmerSaralId || "",
        Warehouse: item.warehouse || "",
        "Serial Number": item.serialNumber || "",
        "Pickup Date": item.pickupDate ? item.pickupDate.toISOString() : "",
        "Arrived Date": item.arrivedDate ? item.arrivedDate.toISOString() : "",
        Status: item.status
          ? "Approved By Warehouse"
          : "Not Approved By Warehouse",
        "Total Quantity": totalQuantity, // Add total quantity per row
      };
    });

    // Add overall total row at the end
    dataForExcel.push({
      "Service Person Name": "Overall Total",
      "Service Person Contact": "",
      "Farmer Name": "",
      "Farmer Contact": "",
      "Farmer Saral Id": "",
      Warehouse: "",
      "Serial Number": "",
      "Pickup Date": "",
      "Arrived Date": "",
      Status: "",
      "Total Quantity": overallTotal, // Add overall total
    });

    // Create a new workbook and add the data to a worksheet
    const worksheet = XLSX.utils.json_to_sheet(dataForExcel);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Pickup Items");

    // Write Excel file to buffer
    const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

    // Set headers for file download
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=pickup_items.xlsx"
    );

    // Send the file as a response
    res.send(buffer);
  } catch (error) {
    console.error("Error exporting pickup items to Excel:", error);
    res.status(500).json({
      success: false,
      message: "Failed to export pickup items to Excel",
      error: error.message,
    });
  }
};

const excelToJSON = async (req, res) => {
  try {
    const JSON_Data = await excelToJSONConvertor(req.file.buffer);

    const groupedData = {};

    JSON_Data.forEach((item) => {
      const talukaCode = parseInt(item.TALUKA_CODE);
      const village = {
        id: parseInt(item.CENSUS_CODE),
        name: item.VILLAGE_NAME,
      };

      if (!groupedData[talukaCode]) {
        groupedData[talukaCode] = [];
      }
      groupedData[talukaCode].push(village);
    });

    // Save to JSON file
    fs.writeFileSync("converted.json", JSON.stringify(groupedData, null, 2));

    return res.status(200).json({
      success: true,
      message: "Excel converted and grouped successfully.",
      data: groupedData,
    });
  } catch (error) {
    console.error("Error converting Excel:", error);
    return res.status(400).json({
      success: false,
      message: "Something went wrong. Please contact the developer.",
    });
  }
};

const excelToJSFile = async (req, res) => {
  try {
    const jsonData = await excelToJSONConvertor(req.file.buffer);

    const groupedData = {};

    jsonData.forEach((row) => {
      const talukaCode = parseInt(row.TALUKA_CODE);
      const village = {
        id: parseInt(row.CENSUS_CODE),
        name: row.VILLAGE_NAME.trim(),
      };

      if (!groupedData[talukaCode]) {
        groupedData[talukaCode] = [];
      }

      groupedData[talukaCode].push(village);
    });

    // Build string for JS file content
    let output = `module.exports = {\n  talukaMap: {\n`;

    for (const [talukaCode, villages] of Object.entries(groupedData)) {
      output += `    ${talukaCode}: [\n`;
      villages.forEach((v) => {
        output += `      { id: ${v.id}, name: "${v.name}" },\n`;
      });
      output += `    ],\n`;
    }

    output += `  }\n};\n`;

    const outputPath = path.join(__dirname, "../talukaMap.js");
    fs.writeFileSync(outputPath, output, "utf-8");

    return res.status(200).json({
      success: true,
      message: "Converted and saved to talukaMap.js",
      path: outputPath,
    });
  } catch (err) {
    console.error("Conversion Error:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to convert Excel to JS file.",
    });
  }
};

const addStateFieldToOldDocuments = async (req, res) => {
  try {
    const { state } = req.body;

    if (!state) {
      return res
        .status(400)
        .json({ message: "State value is required in the request body." });
    }

    const result = await FarmerItemsActivity.updateMany(
      { state: { $exists: false } }, // Filter: only documents missing the 'state' field
      { $set: { state } } // Set the new state value
    );

    res.status(200).json({
      message: `${result.modifiedCount} documents updated successfully.`,
      details: result,
    });
  } catch (error) {
    console.error("Error updating state field:", error);
    res.status(500).json({ message: "Internal server error." });
  }
};

const exportActiveServicePersons = async (req, res) => {
  try {
    // Fetch only active service persons
    const servicePersons = await ServicePerson.find({ isActive: true }).select(
      "name contact block"
    );

    // Create a new workbook
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Active Service Persons");

    // Add header row
    worksheet.columns = [
      { header: "Name", key: "name", width: 25 },
      { header: "Contact", key: "contact", width: 15 },
      { header: "Blocks", key: "block", width: 50 },
    ];

    // Add rows
    servicePersons.forEach((person) => {
      worksheet.addRow({
        name: person.name,
        contact: person.contact,
        block: person.block.join(", "), // Convert array to comma-separated string
      });
    });

    // Set response headers for download
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=ActiveServicePersons.xlsx"
    );

    // Write to response
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error("Error generating Excel:", error);
    res.status(500).json({ message: "Failed to generate Excel" });
  }
};

const getItemRawMaterialExcel = async (req, res) => {
  try {
    // 1. Fetch only required data
    const data = await prisma.itemRawMaterial.findMany({
      include: {
        item: true,
        rawMaterial: true,
      },
    });

    // 2. Create workbook & worksheet
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("ItemRawMaterial");

    // 3. Define columns
    worksheet.columns = [
      { header: "Item Name", key: "itemName", width: 30 },
      { header: "Raw Material Name", key: "rawMaterialName", width: 30 },
      { header: "Quantity", key: "quantity", width: 15 },
    ];

    // 4. Add rows
    data.forEach((row) => {
      worksheet.addRow({
        itemName: row.item ? row.item.name : null,
        rawMaterialName: row.rawMaterial ? row.rawMaterial.name : null,
        quantity: row.quantity,
      });
    });

    // 5. Ensure uploads folder exists
    const uploadDir = path.join(__dirname, "uploads");
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    // 6. Save file inside uploads folder
    const filePath = path.join(uploadDir, "ItemRawMaterial.xlsx");
    await workbook.xlsx.writeFile(filePath);

    console.log("✅ Excel file saved at:", filePath);
  } catch (error) {
    console.error("❌ Error exporting to Excel:", error);
  } finally {
    await prisma.$disconnect();
  }
};

const getNotApprovedPickupData = async (req, res) => {
  try {
    // 1. Fetch data where incoming is null or false
    const data = await PickupItem.find({
      $or: [{ incoming: true }, { incoming: false }],
      status: null,
    }).lean();

    // 2. Create workbook & worksheet
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Unapproved Pickup Items");

    // 3. Define columns
    worksheet.columns = [
      { header: "Service Person Name", key: "servicePersonName", width: 25 },
      { header: "Service Person Contact", key: "servicePerContact", width: 20 },
      { header: "Farmer Name", key: "farmerName", width: 20 },
      { header: "Farmer Contact", key: "farmerContact", width: 20 },
      { header: "Farmer Village", key: "farmerVillage", width: 20 },
      { header: "Farmer Saral ID", key: "farmerSaralId", width: 20 },
      { header: "Warehouse", key: "warehouse", width: 20 },
      { header: "Serial Number", key: "serialNumber", width: 20 },
      { header: "Items", key: "items", width: 40 },
      { header: "Incoming", key: "incoming", width: 20 },
      { header: "Status", key: "status", width: 15 },
      { header: "Pickup Date", key: "pickupDate", width: 20 },
    ];

    // 4. Add rows
    data.forEach((row) => {
      worksheet.addRow({
        servicePersonName: row.servicePersonName,
        servicePerContact: row.servicePerContact,
        farmerName: row.farmerName,
        farmerContact: row.farmerContact,
        farmerVillage: row.farmerVillage,
        farmerSaralId: row.farmerSaralId,
        warehouse: row.warehouse,
        serialNumber: row.serialNumber,
        items: row.items
          .map((i) => `${i.itemName} (x${i.quantity})`)
          .join(", "),
        incoming: row.incoming === true ? "Yes" : "No",
        status:
          row.status === null
            ? "Not Approved"
            : row.status === false
              ? "Declined"
              : "Approved",
        pickupDate: row.pickupDate
          ? new Date(row.pickupDate).toLocaleDateString()
          : "",
      });
    });

    // 5. Ensure uploads folder exists
    const uploadDir = path.join(__dirname, "../../uploads");
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    // 6. Save file
    const filePath = path.join(uploadDir, "Unapproved_PickupItems.xlsx");
    await workbook.xlsx.writeFile(filePath);

    // 7. Respond
    res.status(200).json({
      success: true,
      message: "Excel file created successfully",
      //filePath: `/uploads/Unapproved_PickupItems.xlsx`,
    });
  } catch (error) {
    console.error("❌ Error generating Excel:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

const exportFarmerSaralIdsToExcel = async (req, res) => {
  try {
    // 1️⃣ Fetch data
    const data = await FarmerItemsActivity.find(
      {},
      { farmerSaralId: 1, _id: 0 }
    );

    if (!data.length) {
      return res.status(404).json({ message: "No records found" });
    }

    // 2️⃣ Prepare Excel data
    const excelData = data.map((record, index) => ({
      "S.No": index + 1,
      "Farmer Saral ID": record.farmerSaralId,
    }));

    // 3️⃣ Create workbook and sheet
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(excelData);
    XLSX.utils.book_append_sheet(workbook, worksheet, "FarmerSaralIds");

    // 4️⃣ Define path and ensure folder exists
    const uploadDir = path.join(__dirname, "../../uploads/farmerSaralIds");

    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const fileName = `FarmerSaralIds_${Date.now()}.xlsx`;
    const filePath = path.join(uploadDir, fileName);

    // 5️⃣ Write Excel file
    XLSX.writeFile(workbook, filePath);

    // 6️⃣ Return success
    res.status(200).json({
      message: "Farmer Saral IDs exported successfully",
      filePath: `/uploads/farmerSaralIds/${fileName}`, // relative path for frontend
    });
  } catch (error) {
    console.error("Error exporting data:", error);
    res.status(500).json({
      message: "Internal Server Error",
      error: error.message,
    });
  }
};

const exportFarmerItemsActivityToExcel = async (req, res) => {
  try {
    // Fetch all records with nested population
    const activities = await FarmerItemsActivity.find()
      .populate("empId") // employee info
      .populate("systemId") // system info
      .populate({
        path: "itemsList.systemItemId", // populate items inside itemsList
        select: "itemName", // only need itemName
      });

    if (!activities || activities.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No farmer activity records found",
      });
    }

    // Prepare rows for Excel
    const excelData = activities.map((activity) => {
      // Find the pump item from itemsList
      const pumpItem = activity.itemsList?.find((item) =>
        item.systemItemId?.itemName?.toUpperCase().includes("PUMP")
      );

      const row = {
        farmerSaralId: activity.farmerSaralId || "",
        employeeName: activity.empId?.name || "",
        systemName: activity.systemId?.systemName || "",
        pumpHead: pumpItem ? pumpItem.systemItemId.itemName : "", // Use pump item name
        pumpNumber: activity.pumpNumber || "",
        controllerNumber: activity.controllerNumber || "",
        rmuNumber: activity.rmuNumber || "",
        motorNumber: activity.motorNumber || "",
        state: activity.state || "",
      };

      // Dynamically add panel1, panel2, ...
      (activity.panelNumbers || []).forEach((panel, index) => {
        row[`panel${index + 1}`] = panel;
      });

      return row;
    });

    // Create a new workbook and sheet
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(excelData);
    XLSX.utils.book_append_sheet(wb, ws, "FarmerActivities");

    // Convert workbook to buffer
    const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

    // Send the Excel file
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=FarmerItemsActivity.xlsx"
    );
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );

    return res.send(buffer);
  } catch (error) {
    console.error("Error exporting farmer activity data:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to export farmer activity data",
      error: error.message,
    });
  }
};

const sendWhatsAppMessage = async (req, res) => {
  try {
    const { contactNumber, message } = req.body;
    if (!contactNumber || !message) {
      return res.status(400).json({
        success: false,
        message: "All fields are required",
      });
    }

    const result = await bulkMessage(contactNumber, message);
    console.log(result);
    return;
  } catch (error) {
    console.error("Error sending message:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Internal Server Error",
    });
  }
};

const matchSystemItemsFromExcel = async (req, res) => {
  upload(req, res, async (err) => {
    if (err) {
      return res.status(400).json({
        success: false,
        message:
          err.code === "LIMIT_FILE_SIZE"
            ? "Excel file too large (max 5MB)"
            : err.message,
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No Excel file uploaded",
      });
    }

    try {
      // ✅ Read Excel directly from buffer
      const workbook = XLSX.read(req.file.buffer, { type: "buffer" });
      const sheetName = workbook.SheetNames[0];
      const sheetData = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], {
        header: 1,
      });

      // Validate sheet data
      if (sheetData.length < 2) {
        return res.status(400).json({
          success: false,
          message: "Excel file is empty or missing data",
        });
      }

      // Process each row
      const resultData = [["Item ID", "Item Name", "Quantity"]];
      const notFoundItems = [];

      const allSystemItems = await SystemItem.find({}, "itemName");

      for (let i = 1; i < sheetData.length; i++) {
        const [itemName, quantity] = sheetData[i];
        if (!itemName) continue;

        const cleanName = itemName
          .replace(/\s+/g, " ")
          .replace(/\u00A0/g, " ")
          .trim()
          .toLowerCase();

        const matchedItem = allSystemItems.find((dbItem) => {
          const dbClean = dbItem.itemName
            .replace(/\s+/g, " ")
            .replace(/\u00A0/g, " ")
            .trim()
            .toLowerCase();
          return dbClean === cleanName;
        });

        if (matchedItem) {
          resultData.push([
            matchedItem._id.toString(),
            matchedItem.itemName,
            quantity || 0,
          ]);
        } else {
          notFoundItems.push(itemName);
        }
      }

      // ✅ Create Excel file in memory (buffer)
      const newWorkbook = XLSX.utils.book_new();
      const worksheet = XLSX.utils.aoa_to_sheet(resultData);
      XLSX.utils.book_append_sheet(newWorkbook, worksheet, "MatchedItems");
      const excelBuffer = XLSX.write(newWorkbook, {
        type: "buffer",
        bookType: "xlsx",
      });

      // ✅ Send buffer as downloadable Excel
      res.setHeader(
        "Content-Disposition",
        'attachment; filename="matched_items.xlsx"'
      );
      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      );
      console.log(notFoundItems);
      return res.status(200).send(excelBuffer);
    } catch (error) {
      console.error("Error processing Excel:", error);
      return res.status(500).json({
        success: false,
        message: error.message || "Internal Server Error",
      });
    }
  });
};

const updateInstallationInventoryFromExcel = async (req, res) => {
  try {
    if (!req.file || !req.file.buffer) {
      return res.status(400).json({
        success: false,
        message: "Excel file not provided",
      });
    }

    // Read Excel
    const workbook = XLSX.read(req.file.buffer, { type: "buffer" });
    const sheet = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);

    if (!sheet.length) {
      return res.status(400).json({
        success: false,
        message: "Excel contains no rows",
      });
    }

    const bulkOps = [];

    for (const row of sheet) {
      const warehouseId = row.warehouseId;
      const systemItemId = row.systemItemId;
      let quantity = row.quantity;

      if (!warehouseId || !systemItemId) continue;

      // 🔥 Convert quantity if string
      if (typeof quantity === "string") {
        quantity = quantity.trim();
        quantity = Number(quantity);

        // If still NaN → skip that row
        if (isNaN(quantity)) continue;
      }

      // Ensure quantity is a number
      if (typeof quantity !== "number") continue;

      bulkOps.push({
        updateOne: {
          filter: { warehouseId, systemItemId },
          update: {
            $set: {
              quantity,
              updatedAt: new Date(),
            },
          },
        },
      });
    }

    if (bulkOps.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No valid rows found in Excel",
      });
    }

    const result = await InstallationInventory.bulkWrite(bulkOps);

    return res.status(200).json({
      success: true,
      message: "Inventory updated successfully",
      updatedCount: result.modifiedCount,
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Internal Server Error",
    });
  }
};

const exportInstallationInventoryExcel = async (req, res) => {
  try {
    const warehouseId = req.query?.warehouseId;

    if (!warehouseId) {
      return res.status(400).json({
        success: false,
        message: "warehouseId is required"
      });
    }

    // Check warehouse exists
    const warehouse = await Warehouse.findById(warehouseId);
    if (!warehouse) {
      return res.status(404).json({
        success: false,
        message: "Warehouse not found"
      });
    }

    // Fetch inventory + item details
    const inventory = await InstallationInventory.find({ warehouseId })
      .populate("systemItemId", "itemName");

    if (!inventory.length) {
      return res.status(404).json({
        success: false,
        message: "No inventory data found for this warehouse"
      });
    }

    // Create Excel workbook
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Installation Inventory");

    // Header row
    worksheet.columns = [
      { header: "Item Name", key: "itemName", width: 30 },
      { header: "Quantity", key: "quantity", width: 15 },
    ];

    // Fill rows
    inventory.forEach(inv => {
      worksheet.addRow({
        itemName: inv.systemItemId?.itemName || "",
        quantity: inv.quantity,
      });
    });

    // Set headers for Excel download
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=${warehouse.warehouseName}_Stock.xlsx`
    );

    await workbook.xlsx.write(res);
    res.status(200).end();

  } catch (error) {
    console.log("Excel Export Error:", error);

    return res.status(500).json({
      success: false,
      message: error.message || "Internal Server Error"
    });
  }
};

const exportSystemItemsExcel = async (req, res) => {
  try {
    const items = await SystemItem.find(
      {},
      { _id: 1, itemName: 1 }
    );

    if (!items.length) {
      return res.status(404).json({
        success: false,
        message: "No system items found",
      });
    }

    // 2️⃣ Convert data for Excel
    const excelData = items.map((item) => ({
      Id: item._id,
      ItemName: item.itemName,
    }));

    // 3️⃣ Create workbook & sheet
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(excelData);

    XLSX.utils.book_append_sheet(workbook, worksheet, "SystemItems");

    // 4️⃣ Write file to buffer
    const excelBuffer = XLSX.write(workbook, {
      bookType: "xlsx",
      type: "buffer",
    });

    // 5️⃣ Send file
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=SystemItems.xlsx"
    );
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );

    return res.send(excelBuffer);
  } catch (error) {
    console.error("Excel Export Error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message,
    });
  }
};


module.exports = {
  exportActiveUsers,
  W2W,
  getServicePersonForStates,
  exportPickupItemsToExcel,
  excelToJSON,
  excelToJSFile,
  addStateFieldToOldDocuments,
  exportActiveServicePersons,
  getItemRawMaterialExcel,
  getNotApprovedPickupData,
  exportFarmerSaralIdsToExcel,
  exportFarmerItemsActivityToExcel,
  sendWhatsAppMessage,
  matchSystemItemsFromExcel,
  updateInstallationInventoryFromExcel,
  exportInstallationInventoryExcel,
  exportSystemItemsExcel
};
