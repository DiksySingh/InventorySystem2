const puppeteer = require("puppeteer");
const WarehouseItems = require("../../models/serviceInventoryModels/warehouseItemsSchema");
const fs = require("fs");
const path = require("path");
const Warehouse = require("../../models/serviceInventoryModels/warehouseSchema");
const mongoose = require("mongoose"); // by shiv
module.exports.getSpecificWarehouseStockReportPDF = async (req, res) => {
  try {
    // 🔹 Fetch all warehouses and their stock data
    const warehouseName = req.query.warehouseName; // Get the warehouse name from the query parameter
    const warehouseData = await Warehouse.findOne({ warehouseName: warehouseName });
    if (!warehouseData) {
      return res.status(404).json({success: false, message: "Warehouse not found!" });
    }
    //const warehouseObjectId = new mongoose.Types.ObjectId(warehouseData._id); // by shiv //67446ab527dae6f7f4d985f1 -> Hisar
    const warehouses = await WarehouseItems.find({warehouse : warehouseData._id})
        .populate({
            path: "warehouse",
            select: { warehouseName: 1 },
        });

    warehouses.forEach(warehouse => {
      warehouse.items.sort((a, b) => a.itemName.localeCompare(b.itemName));
    });
    if (!warehouses.length) {
      return res.status(404).json({ message: "No warehouses found!" });
    }

    // 🔹 Create `uploads` folder if it doesn't exist
    const uploadsDir = path.join(__dirname, "../uploads");
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    // 🔹 Launch Puppeteer
    const browser = await puppeteer.launch({
      headless: true, // Ensures it runs in headless mode
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();

    let htmlContent = `
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; }
          h2 { text-align: center; margin-top: 20px; }
          table { width: 90%; border-collapse: collapse; margin: auto; }
          th, td { border: 1px solid black; padding: 8px; text-align: left; }
          th { background-color: rgb(240, 161, 161); }
          .footer { text-align: center; margin-top: 15px; font-weight: bold; }
          @media print {
            @page { margin-top: 40px; }
            table { page-break-inside: auto; }
            tr { page-break-inside: avoid; page-break-after: auto; }
            thead { display: table-header-group; }
          }
        </style>
      </head>
      <body>
    `;

    // 🔹 Generate content for each warehouse
    warehouses.forEach((warehouse, index) => {
      const filteredItems = warehouse.items.filter(item => item.itemName !== "Laptop");
      // by shiv 
      // Calculate totals
      const totalNewStock = filteredItems.reduce((sum, item) => sum + item.newStock, 0);
      const totalQuantity = filteredItems.reduce((sum, item) => sum + item.quantity, 0);
      const totalDefective = filteredItems.reduce((sum, item) => sum + item.defective, 0);
      // end by shiv

      htmlContent += `
        ${index > 0 ? '<div style="page-break-before: always;"></div>' : ""}
        <h2>Warehouse Stock Report - ${warehouseName}</h2>
        <table>
          <thead>
            <tr>
              <th>Item Name</th>
              <th>New Stock</th>
              <th>Serviced Stock</th>
              <th>Defective</th>
            </tr>
          </thead>
          <tbody>
            ${filteredItems.map(item => `
              <tr>
                 <td>${item.itemName}</td>
                <td>${item.newStock || 0}</td>
                <td>${item.quantity}</td>
                <td>${item.defective}</td>
              </tr>
            `).join("")}
             <tr>
              <td><strong>Total</strong></td>
              <td><strong>${totalNewStock}</strong></td>
              <td><strong>${totalQuantity}</strong></td>
              <td><strong>${totalDefective}</strong></td>
            </tr>
          </tbody>
        </table>
      `;
    });

    htmlContent += `</body></html>`;

    // 🔹 Set page content and generate PDF
    await page.setContent(htmlContent, { waitUntil: "networkidle0" });

    const date = new Date().toISOString().split("T")[0];
    const pdfPath = path.join(uploadsDir, `${warehouseName}StockReport_${date}.pdf`);

    await page.pdf({
      path: pdfPath,
      format: "A3",
      printBackground: true,
    });

    await browser.close();
    console.log("PDF generated successfully:", pdfPath);

    res.status(200).json({ success: true, message: "PDF Generated Successfully" });
  } catch (error) {
    console.error("Error generating PDF:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
};


module.exports.generateAllWarehouseStockReportPDF = async (req, res) => {
  try {
    // 🔹 Fetch all warehouses and their stock data
    const warehouses = await WarehouseItems.find()
      .populate({
        path: "warehouse",
        select: { warehouseName: 1 },
      });
    warehouses.forEach(warehouse => {
      warehouse.items.sort((a, b) => a.itemName.localeCompare(b.itemName));
    });
    if (!warehouses.length) {
      return res.status(404).json({ message: "No warehouses found!" });
    }

    // 🔹 Create `uploads` folder if it doesn't exist
    const uploadsDir = path.join(__dirname, "../uploads/warehouseStockReport");
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    // 🔹 Launch Puppeteer
    const browser = await puppeteer.launch({
      headless: true, // Ensures it runs in headless mode
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();

    let htmlContent = `
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; }
          h2 { text-align: center; margin-top: 20px; }
          table { width: 90%; border-collapse: collapse; margin: auto; }
          th, td { border: 1px solid black; padding: 8px; text-align: left; }
          th { background-color: rgb(240, 161, 161); }
          .footer { text-align: center; margin-top: 15px; font-weight: bold; }
          @media print {
            @page { margin-top: 40px; }
            table { page-break-inside: auto; }
            tr { page-break-inside: avoid; page-break-after: auto; }
            thead { display: table-header-group; }
          }
        </style>
      </head>
      <body>
    `;

    // 🔹 Generate content for each warehouse
    warehouses.forEach((warehouse, index) => {
      const filteredItems = warehouse.items.filter(item => item.itemName !== "Laptop");
      // by shiv 
      // Calculate totals
      const totalNewStock = filteredItems.reduce((sum, item) => sum + item.newStock, 0);
      const totalQuantity = filteredItems.reduce((sum, item) => sum + item.quantity, 0);
      const totalDefective = filteredItems.reduce((sum, item) => sum + item.defective, 0);
      // end by shiv

      htmlContent += `
        ${index > 0 ? '<div style="page-break-before: always;"></div>' : ""}
        <h2>Warehouse Stock Report - ${warehouse.warehouse.warehouseName}</h2>
        <table>
          <thead>
            <tr>
              <th>Item Name</th>
              <th>New Stock</th>
              <th>Repaired Quantity</th>
              <th>Defective</th>
            </tr>
          </thead>
          <tbody>
            ${filteredItems.map(item => `
              <tr>
                <td>${item.itemName}</td>
                <td>${item.newStock || 0}</td>
                <td>${item.quantity}</td>
                <td>${item.defective}</td>
              </tr>
            `).join("")}
             <tr>
              <td><strong>Total</strong></td>
              <td><strong>${totalNewStock}</strong></td>
              <td><strong>${totalQuantity}</strong></td>
              <td><strong>${totalDefective}</strong></td>
            </tr>
          </tbody>
        </table>
      `;
    });

    htmlContent += `</body></html>`;

    // 🔹 Set page content and generate PDF
    await page.setContent(htmlContent, { waitUntil: "networkidle0" });

    const date = new Date().toISOString().split("T")[0];
    const pdfPath = path.join(uploadsDir, `OverallWarehouseStockReport_${date}.pdf`);

    await page.pdf({
      path: pdfPath,
      format: "A3",
      printBackground: true,
    });

    await browser.close();
    console.log("PDF generated successfully:", pdfPath);

    res.status(200).json({ success: true, message: "PDF Generated Successfully" });
  } catch (error) {
    console.error("Error generating PDF:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
};