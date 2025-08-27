const W2WTransition = require('../../models/serviceInventoryModels/warehouse2WarehouseSchema');
const XLSX = require('xlsx');
const ServicePerson = require("../../models/serviceInventoryModels/servicePersonSchema");
const PickupItem = require("../../models/serviceInventoryModels/pickupItemSchema");
const fs = require("fs");
const path = require("path");
const excelToJSONConvertor = require("../../util/Excel/excelToJSONConverter"); // or your actual utility path
const FarmerItemsActivity = require("../../models/systemInventoryModels/farmerItemsActivity");

const SurveyPerson = require("../../models/serviceInventoryModels/surveyPersonSchema");
const WarehousePerson = require("../../models/serviceInventoryModels/warehousePersonSchema");

const exportActiveUsers = async (req, res) => {
  try {
    // Fetch active users from all collections
    const warehousePersons = await WarehousePerson.find({ isActive: true, state: "Haryana" }, "name contact role isActive");
    const surveyPersons = await SurveyPerson.find({ isActive: true, state: "Haryana"}, "name contact role isActive");
    const servicePersons = await ServicePerson.find({ isActive: true, state: "Haryana"}, "name contact role isActive");

    // Merge all results into a single array
    const allUsers = [
      ...warehousePersons.map(u => u.toObject()),
      ...surveyPersons.map(u => u.toObject()),
      ...servicePersons.map(u => u.toObject())
    ];

    if (allUsers.length === 0) {
      return res.status(404).json({ success: false, message: "No active users found" });
    }

    // Convert data to worksheet
    const worksheetData = allUsers.map(user => ({
      Name: user.name,
      Contact: user.contact,
      Role: user.role,
      Active: user.isActive ? "Yes" : "No"
    }));

    const worksheet = XLSX.utils.json_to_sheet(worksheetData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "ActiveUsers");

    // Generate buffer
    const excelBuffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

    // Set response headers for download
    res.setHeader("Content-Disposition", "attachment; filename=ActiveUsers.xlsx");
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");

    // Send file
    res.send(excelBuffer);
  } catch (error) {
    console.error("Error exporting users:", error.message);
    res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message
    });
  }
};

const W2W = async(req,res) =>{
    try {
        let { startDate, endDate, toWarehouse , fromWarehouse } = req.query;
        if (!startDate || !endDate) {
            return res.status(400).json({ message: "Start date and end date are required" });
        }
        // Convert to Date objects
        let start = new Date(startDate);
        let end = new Date(endDate);
        end.setHours(23, 59, 59, 999); // Ensure end of the day inclusion
        
        const records = await W2WTransition.find({
            pickupDate: { $gte: start, $lte: end },
            fromWarehouse
        });
      
        const formattedData = records.map(record => ({
            "From": record.fromWarehouse,
            "To": record.toWarehouse,
            "Pickup_Date": record.pickupDate,
            "Arrived_Date": record.arrivedDate,
            "Approved_By": record.approvedBy,
            "Driver_Name": record.driverName,
            "Driver_Contact": record.driverContact,
            "Items": record.items.map(item => `${item.itemName}(${item.quantity})`).join(", ")
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
        res.setHeader(
            "Content-Disposition",
            `attachment; filename="${fileName}"`
        );
        res.setHeader(
            "Content-Type",
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        );
        res.send(buffer);
        // res.status(200).json(formattedData);
    } catch (error) {
        return res.status(400).json({
            success:false,
            message:error
        })
    }
}

const getServicePersonForStates = async (req, res) => {
    try {
        const state = ["Maharashtra", "Punjab", "Chhattisgarh", "Rajasthan"];

        // Assuming you have a ServicePerson model to fetch service persons from MongoDB
        const servicePersons = await ServicePerson.find({ state: { $in: state } });

        // Transform data into a format suitable for Excel
        const data = servicePersons.map((person) => ({
            Name: person.name,
            Contact: person.contact,
            Email: person.email,
            State: person.state,
        }));

        // Create a new worksheet from the data
        const worksheet = XLSX.utils.json_to_sheet(data);

        // Create a new workbook and append the worksheet
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "ServicePersons");

        // Write the workbook to a buffer
        const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

        // Optional: Set headers for file download and Excel content type (if needed)
        res.setHeader("Content-Disposition", "attachment; filename=Service_Persons.xlsx");
        res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");

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
      const warehouse = "Bhiwani"  // Get warehouse from query params
  
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
      const dataForExcel = filteredItems.map(item => {
        // Calculate total quantity of all items in the row
        const totalQuantity = item.items.reduce((sum, i) => sum + i.quantity, 0);
        overallTotal += totalQuantity; // Add to overall total
  
        return {
          "Service Person Name": item.servicePersonName || "",
          "Service Person Contact": item.servicePerContact || "",
          "Farmer Name": item.farmerName || "",
          "Farmer Contact": item.farmerContact || "",
          "Farmer Saral ID": item.farmerSaralId || "",
          "Warehouse": item.warehouse || "",
          "Serial Number": item.serialNumber || "",
          "Pickup Date": item.pickupDate ? item.pickupDate.toISOString() : "",
          "Arrived Date": item.arrivedDate ? item.arrivedDate.toISOString() : "",
          "Status": item.status ? "Approved By Warehouse" : "Not Approved By Warehouse",
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
        "Warehouse": "",
        "Serial Number": "",
        "Pickup Date": "",
        "Arrived Date": "",
        "Status": "",
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
            return res.status(400).json({ message: "State value is required in the request body." });
        }

        const result = await FarmerItemsActivity.updateMany(
            { state: { $exists: false } },   // Filter: only documents missing the 'state' field
            { $set: { state } }              // Set the new state value
        );

        res.status(200).json({
            message: `${result.modifiedCount} documents updated successfully.`,
            details: result
        });
    } catch (error) {
        console.error("Error updating state field:", error);
        res.status(500).json({ message: "Internal server error." });
    }
};

module.exports = {
    exportActiveUsers,
    W2W,
    getServicePersonForStates,
    exportPickupItemsToExcel,
    excelToJSON,
    excelToJSFile,
    addStateFieldToOldDocuments
}
