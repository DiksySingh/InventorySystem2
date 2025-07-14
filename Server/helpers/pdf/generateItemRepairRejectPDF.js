const puppeteer = require("puppeteer");
const RepairNRejectItems = require("../../models/serviceInventoryModels/repairNRejectSchema");
const fs = require("fs");
const path = require("path");

module.exports.generateItemRepairRejectPDF = async (req, res) => {
    try {
        // 🔹 Fetch all repair/reject items
        const repairRejectData = await RepairNRejectItems.find().populate({
            path: "warehouseId",
            select: "warehouseName",
        });

        if (!repairRejectData.length) {
            return res.status(404).json({ message: "No repair/reject items found!" });
        }

        // 🔹 Create `uploads` folder if it doesn't exist
        const uploadsDir = path.join(__dirname, "../uploads");
        if (!fs.existsSync(uploadsDir)) {
            fs.mkdirSync(uploadsDir, { recursive: true });
        }

        // 🔹 Prepare HTML content for the PDF
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
        <h2>Repair & Reject Items Report</h2>
        <table>
          <thead>
            <tr>
              <th>Warehouse Name</th>
              <th>Warehouse Person</th>
              <th>Item Name</th>
              <th>Serial No.</th>
              <th>Repaired</th>
              <th>Rejected</th>
              <th>Repaired By</th>
              <th>Remark</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            ${repairRejectData
                .map(
                    (item) => `
              <tr>
                <td>${item.warehouseName || " "}</td>
                <td>${item.warehousePerson}</td>
                <td>${item.itemName || " "}</td>
                <td>${item.serialNumber || " "}</td>
                <td>${item.repaired || 0}</td>
                <td>${item.rejected || 0}</td>
                <td>${item.repairedBy || " "}</td>
                <td>${item.remark || " "}</td>
                <td>${item.createdAt ? new Date(item.createdAt).toLocaleDateString("en-GB") : " "}</td>
              </tr>
            `
                )
                .join("")}
          </tbody>
        </table>
      </body>
      </html>
    `;

        // 🔹 Launch Puppeteer and generate PDF
        const browser = await puppeteer.launch({
            headless: true, // Ensures it runs in headless mode
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        const page = await browser.newPage();
        await page.setContent(htmlContent, { waitUntil: "networkidle0" });

        const date = new Date().toISOString().split("T")[0];
        const pdfPath = path.join(uploadsDir, `RepairRejectReport_${date}.pdf`);

        await page.pdf({
            path: pdfPath,
            format: "A2",
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
