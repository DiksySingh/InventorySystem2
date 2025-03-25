const mongoose = require("mongoose");
const puppeteer = require("puppeteer");
const fs = require("fs").promises;
const path = require("path");
const moment = require("moment");
const PickupItem = require("../models/serviceInventoryModels/pickupItemSchema");
const RepairNRejectItems = require("../models/serviceInventoryModels/repairNRejectSchema");

const generateHTML = async (data, repairRejectData) => {
  let warehouseWiseData = {}; // Grouping defective items by warehouse
  let repairRejectSummary = {}; // Grouping repaired and rejected items by warehouse

  // Organize defective items by warehouse
  for (const item of data) {
    const warehouse = item.warehouse;

    if (!warehouseWiseData[warehouse]) {
      warehouseWiseData[warehouse] = {
        totalQuantity: 0,
        rows: []
      };
    }

    const totalQuantity = item.items.reduce((sum, it) => sum + it.quantity, 0);
    warehouseWiseData[warehouse].totalQuantity += totalQuantity;

    warehouseWiseData[warehouse].rows.push(`
      <tr>
          <td>${item.servicePersonName}</td>
          <td>${item.servicePerContact}</td>
          <td>${totalQuantity}</td>
          <td>${item.items.map(it => `${it.itemName} (x${it.quantity})`).join(", ")}</td>
      </tr>`);
  }

  // Organize repair and reject data by warehouse
  for (const repairItem of repairRejectData) {
    const warehouse = repairItem.warehouseName;

    if (!repairRejectSummary[warehouse]) {
      repairRejectSummary[warehouse] = {
        repaired: 0,
        rejected: 0,
        repairedRows: [],
        rejectedRows: []
      };
    }

    // Check isRepaired flag to categorize into repaired or rejected
    if (repairItem.isRepaired) {
      repairRejectSummary[warehouse].repaired += repairItem.repaired - repairItem.rejected; // Deduct rejected quantity from repaired
      repairRejectSummary[warehouse].repairedRows.push(`
        <tr>
            <td>${repairItem.itemName}</td>
            <td>${repairItem.serialNumber || "N/A"}</td>
            <td>${repairItem.repaired}</td>
            <td>${repairItem.repairedBy || "N/A"}</td>
            <td>${repairItem.remark}</td>
            <td>${repairItem.changeMaterial}</td>
        </tr>`);
    } else {
      repairRejectSummary[warehouse].rejected += repairItem.rejected - repairItem.repaired; // Deduct repaired quantity from rejected
      repairRejectSummary[warehouse].rejectedRows.push(`
        <tr>
            <td>${repairItem.itemName}</td>
            <td>${repairItem.serialNumber || "N/A"}</td>
            <td>${repairItem.rejected}</td>
            <td>${repairItem.remark}</td>
        </tr>`);
    }
  }

  // Sort warehouses to move 'Bhiwani' to the top
  const sortedWarehouses = Object.keys(warehouseWiseData).sort((a, b) => {
    if (a === "Bhiwani") return -1; // Prioritize Bhiwani
    if (b === "Bhiwani") return 1;
    return a.localeCompare(b);
  });

  // Generate tables for each warehouse, with page breaks for all except the last warehouse
  const warehouseTables = sortedWarehouses.map((warehouse, index) => {
    const details = warehouseWiseData[warehouse];
    const repairReject = repairRejectSummary[warehouse] || {
      repairedRows: [],
      rejectedRows: [],
      repaired: 0,
      rejected: 0
    };

    return `
      <div class="warehouse-section">
        <h3>${warehouse} Report</h3>
        <table>
            <thead>
                <tr>
                    <th>Service Person Name</th>
                    <th>Contact</th>
                    <th>Total Quantity</th>
                    <th>Items</th>
                </tr>
            </thead>
            <tbody>
                ${details.rows.join("")}
                <tr>
                    <td colspan="2" style="text-align:right; font-weight:bold;">Total for ${warehouse}:</td>
                    <td style="font-weight:bold;">${details.totalQuantity}</td>
                    <td></td>
                </tr>
            </tbody>
        </table>

        <h3>${warehouse} - Repaired Items</h3>
        <table>
            <thead>
                <tr>
                    <th>Item Name</th>
                    <th>Serial Number</th>
                    <th>Repaired Quantity</th>
                    <th>Repaired By</th>
                    <th>Remark</th>
                    <th>Changed Material</th>
                </tr>
            </thead>
            <tbody>
                ${repairReject.repairedRows.join("")}
                <tr>
                    <td colspan="2" style="text-align:right; font-weight:bold;">Total Repaired:</td>
                    <td style="font-weight:bold;">${repairReject.repaired}</td>
                    <td></td>
                    <td></td>
                    <td></td>
                </tr>
            </tbody>
        </table>

        <h3>${warehouse} - Rejected Items</h3>
        <table>
            <thead>
                <tr>
                    <th>Item Name</th>
                    <th>Serial Number</th>
                    <th>Rejected Quantity</th>
                    <th>Remark</th>
                </tr>
            </thead>
            <tbody>
                ${repairReject.rejectedRows.join("")}
                <tr>
                    <td colspan="2" style="text-align:right; font-weight:bold;">Total Rejected:</td>
                    <td style="font-weight:bold;">${repairReject.rejected}</td>
                    <td></td>
                </tr>
            </tbody>
        </table>
      </div>
      ${index < sortedWarehouses.length - 1 ? '<div class="page-break"></div>' : ""}
    `;
  }).join("");

  return `
    <html>
    <head>
        <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            h2, h3 { text-align: center; }
            table { width: 100%; border-collapse: collapse; margin: auto; }
            th, td { border: 1px solid black; padding: 8px; text-align: left; }
            th { background-color: rgb(240, 161, 161); }
            .footer { text-align: center; margin-top: 15px; font-weight: bold; }
            .page-break { page-break-after: always; }
            @media print {
                @page { margin-top: 40px; }
                table { page-break-inside: auto; }
                tr { page-break-inside: avoid; page-break-after: auto; }
                thead { display: table-header-group; }
            }
        </style>
    </head>
    <body>
        <h2>Daily Incoming Defective Items Report</h2>
        <div class="container">
            ${warehouseTables}
        </div>
        <div class="footer">Generated on ${moment().format("DD-MM-YYYY")}</div>
    </body>
    </html>`;
};

module.exports.generateDailyInDefectiveItems = async (req, res) => {
  try {
    const now = moment();
    const startTime = moment().subtract(1, "days").hour(17).minute(14).subtract(5, "hours").subtract(30, "minutes");
    const endTime = moment().hour(17).minute(14).subtract(5, "hours").subtract(30, "minutes");

    const utcStart = startTime.utc().toDate();
    const utcEnd = endTime.utc().toDate();

    const defectiveItems = await PickupItem.find({
      incoming: true,
      pickupDate: { $gte: utcStart, $lt: utcEnd }
    }).populate("servicePerson");

    const repairRejectData = await RepairNRejectItems.find({
      createdAt: { $gte: utcStart, $lt: utcEnd }
    });

    const htmlContent = await generateHTML(defectiveItems, repairRejectData);

    const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
    const page = await browser.newPage();
    await page.setContent(htmlContent, { waitUntil: "load" });

    const uploadDir = path.join(__dirname, "../uploads");
    await fs.mkdir(uploadDir, { recursive: true });

    const fileName = `DailyInDefectiveItems_${moment().format("YYYY-MM-DD")}.pdf`;
    const filePath = path.join(uploadDir, fileName);

    await page.pdf({ path: filePath, format: "A3", landscape: true, printBackground: true });

    await browser.close();

    res.status(200).json({ message: "PDF saved successfully" });
  } catch (error) {
    console.error("Error generating PDF:", error);
    res.status(500).send("Internal Server Error");
  }
};
