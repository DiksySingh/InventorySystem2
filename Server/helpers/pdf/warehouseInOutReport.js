const moment = require("moment");
const puppeteer = require("puppeteer");
const fs = require("fs");
const path = require("path");
const PickupItem = require("../../models/serviceInventoryModels/pickupItemSchema"); // adjust path

// Controller function
const generateJalnaReport = async (req, res) => {
  try {
    const startOfDay = moment().startOf("day").toDate();
    const endOfDay = moment().endOf("day").toDate();

    // Fetch data
    const incomingTrue = await PickupItem.find({
      warehouse: "Maharashtra Warehouse - Ambad",
      incoming: true,
      pickupDate: { $gte: startOfDay, $lte: endOfDay },
    }).lean();

    const incomingAndStatusTrue = await PickupItem.find({
      warehouse: "Maharashtra Warehouse - Ambad",
      incoming: true,
      status: true,
      arrivedDate: { $gte: startOfDay, $lte: endOfDay },
    }).lean();

    const incomingFalse = await PickupItem.find({
      warehouse: "Maharashtra Warehouse - Ambad",
      incoming: false,
      pickupDate: { $gte: startOfDay, $lte: endOfDay },
    }).lean();

    // Helper function to create HTML table
    const tableHTML = (data) => {
      let rows = "";

      if (data.length === 0) {
        rows = `<tr><td colspan="5" style="text-align: center;">No data available</td></tr>`;
      } else {
        rows = data.map(d => {
          const items = d.items.map(i => `${i.itemName} (${i.quantity})`).join(", ");
          return `<tr>
            <td>${d.farmerName || ""}</td>
            <td>${d.farmerContact || ""}</td>
            <td>${d.serialNumber || ""}</td>
            <td>${items}</td>
            <td>${moment(d.pickupDate).format("DD-MM-YYYY")}</td>
          </tr>`;
        }).join("");
      }

      return `
        <table border="1" cellspacing="0" cellpadding="5" style="width: 100%; border-collapse: collapse;">
          <thead>
            <tr style="background-color: #f2f2f2;">
              <th>Farmer Name</th>
              <th>Farmer Contact</th>
              <th>Serial Number</th>
              <th>Items</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            ${rows}
          </tbody>
        </table>
      `;
    };

    const reportDate = moment().format("DD-MM-YYYY HH:mm");

    const htmlContent = `
      <html>
      <head>
        <title>Maharashtra Warehouse - Ambad Report</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          h1, h2 { text-align: center; }
          h2 { margin-top: 40px; }
          table { margin-top: 10px; }
          .report-date { text-align: center; margin-top: 40px; font-style: italic; }
        </style>
      </head>
      <body>
        <h1>Maharashtra Warehouse - Ambad Report</h1>

        <h2>Items Picked-Up (Today)</h2>
        ${tableHTML(incomingTrue)}

        <h2>Items Arrived (Today)</h2>
        ${tableHTML(incomingAndStatusTrue)}

        <h2>Items Dispatched (Today)</h2>
        ${tableHTML(incomingFalse)}

        <div class="report-date">Report generated on: ${reportDate}</div>
      </body>
      </html>
    `;

    // Ensure uploads folder exists
    const uploadsDir = path.join(__dirname, "../../uploads");
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    const filePath = path.join(uploadsDir, `JalnaWarehouseReport_${moment().format("YYYY-MM-DD")}.pdf`);

    // Launch Puppeteer
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.setContent(htmlContent, { waitUntil: "networkidle0" });

    await page.pdf({
      path: filePath,
      format: "A2",
      printBackground: true,
      margin: { top: "20px", bottom: "20px", left: "20px", right: "20px" },
    });

    await browser.close();

    // Return PDF file URL or path
    return res.status(200).json({
        success: true,
        message: "PDF generated successfully",
        //file: `/uploads/${path.basename(filePath)}`,
    });

  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Failed to generate PDF" });
  }
};

module.exports = { generateJalnaReport };
