const puppeteer = require("puppeteer");
const prisma = require("../../config/prismaClient");
const fs = require("fs");
const path = require("path");
const moment = require("moment");
const momentTz = require("moment-timezone");

const generateRawMaterialStockPDF = async (req, res) => {
  try {
    const rawMaterials = await prisma.rawMaterial.findMany({
      orderBy: {
        name: "asc",
      },
    });

    // Generate HTML content
    const htmlContent = `
      <html>
        <head>
          <style>
              @page {
                margin: 0.5in 0.5in;
              }
              body {
                font-family: Arial, sans-serif;
                padding: 10px;
                display: flex;
                justify-content: center;
              }
              table {
                width: 98%;
                border-collapse: collapse;
                margin: auto;
              }
              th, td {
                border: 1px solid #ccc;
                padding: 8px;
                vertical-align: top;
              }
              th {
                background-color: #f4f4f4;
                text-align: center;
              }
              td {
                text-align: center;
              }
              td.left-align {
                text-align: left;
              }
              h2 {
                text-align: center;
                margin-top: 0;
                margin-bottom: 15px;
              }
              .generated-at {
                text-align: center;
                font-weight: bold;
                font-size: 15px;
                margin-top: 20px;
              }
            </style>
        </head>
        <body>
          <div style="width: 100%;">
            <h2>Raw Material Stock Report</h2>
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Stock</th>
                  <th>Unit</th>
                </tr>
              </thead>
              <tbody>
                ${rawMaterials.map(material => `
                  <tr>
                    <td>${material.name || "-"}</td>
                    <td>${material.stock ?? "-"}</td>
                    <td>${material.unit || "-"}</td>
                  </tr>
                `).join("")}
              </tbody>
            </table>
            <p class="generated-at">
              Generated at: ${moment().format("DD-MM-YYYY")}
            </p>
          </div>
        </body>
      </html>
    `;

    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();
    await page.setContent(htmlContent, { waitUntil: "networkidle0" });

    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: {
        top: '1in',
        bottom: '1in',
        left: '0.5in',
        right: '0.5in'
      }
    });
    await browser.close();

    const uploadDir = path.join(__dirname, "../../uploads/rawMaterial");
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const fileName = `RawMaterialStockReport_${moment().format("YYYY-MM-DD")}.pdf`;
    const filePath = path.join(uploadDir, fileName);
    fs.writeFileSync(filePath, pdfBuffer);

    return res.status(200).json({
      success: true,
      message: "PDF generated and saved successfully",
    });

  } catch (error) {
    console.error("Raw Material PDF generation error:", error);
    res.status(500).json({
      success: false,
      message: "Raw Material PDF generation failed",
      error: error.message,
    });
  }
};

const generateServiceRecordPDF = async (req, res) => {
  try {
    const serviceRecords = await prisma.serviceRecord.findMany({
      include: {
        user: true,
        serviceUsages: true,
      },
      orderBy: {
        servicedAt: "asc", // 🔽 Sorts by latest date first
      },
    });

    // Collect all unique rawMaterialIds from repairedParts
    const rawMaterialIds = new Set();
    for (const record of serviceRecords) {
      if (record.repairedParts) {
        const parts = Array.isArray(record.repairedParts)
          ? record.repairedParts
          : JSON.parse(record.repairedParts);
        parts.forEach(part => {
          if (part.rawMaterialId) {
            rawMaterialIds.add(part.rawMaterialId);
          }
        });
      }
    }

    // Fetch raw material names and units
    const rawMaterials = await prisma.rawMaterial.findMany({
      where: { id: { in: [...rawMaterialIds] } },
    });

    // Map rawMaterialId to name and unit
    const rawMaterialMap = {};
    rawMaterials.forEach(rm => {
      rawMaterialMap[rm.id] = {
        name: rm.name,
        unit: rm.unit,
      };
    });

    // Generate HTML for PDF
    const htmlContent = `
      <html>
        <head>
          <style>
            body {
              font-family: Arial, sans-serif;
              padding: 20px;
              display: flex;
              justify-content: center;
            }
            table {
              width: 98%;
              border-collapse: collapse;
              margin: auto;
            }
            th, td {
              border: 1px solid #ccc;
              padding: 8px;
              vertical-align: top;
            }
            th {
              background-color: #f4f4f4;
              text-align: center;
            }
            td {
              text-align: center;
            }
            td.left-align {
              text-align: left;
            }
            h2 {
              text-align: center;
              margin-bottom: 30px;
            }
          </style>
        </head>
        <body>
          <div style="width: 100%;">
            <h2>Service Record Report</h2>
            <table>
              <thead>
                <tr>
                  <th>Item</th>
                  <th>SubItem</th>
                  <th>Quantity</th>
                  <th>Serial Number</th>
                  <th>Fault Analysis</th>
                  <th>Status</th>
                  <th>Repaired By</th>
                  <th>Remarks</th>
                  <th>Repaired Parts</th>
                  <th>Form Filled By</th>
                  <th>Serviced Date</th>
                </tr>
              </thead>
              <tbody>
                ${serviceRecords.map(record => {
      const repairedParts = (() => {
        if (!record.repairedParts) return [];
        if (Array.isArray(record.repairedParts)) return record.repairedParts;
        try {
          return JSON.parse(record.repairedParts);
        } catch (e) {
          return [];
        }
      })();

      const repairedPartsHtml = repairedParts.length > 0
        ? `<ul style="padding-left: 18px; margin: 0;">` +
        repairedParts.map(part => {
          const material = rawMaterialMap[part.rawMaterialId];
          const name = material?.name || "Unknown";
          const qty = part.quantity ?? "-";
          const unit = material?.unit ? ` ${material.unit}` : "";
          return `<li>${name} (Qty: ${qty}${unit})</li>`;
        }).join("") +
        `</ul>`
        : "-";

      return `
                    <tr>
                      <td>${record.item || "-"}</td>
                      <td>${record.subItem || "-"}</td>
                      <td>${record.quantity || "-"}</td>
                      <td>${record.serialNumber || "-"}</td>
                      <td>${record.faultAnalysis || "-"}</td>
                      <td>${record.isRepaired ? "Repaired" : "Rejected"}</td>
                      <td>${record.repairedRejectedBy || "-"}</td>
                      <td>${record.remarks || "-"}</td>
                      <td class="left-align">${repairedPartsHtml}</td>
                      <td>${record.user?.name || "-"}</td>
                      <td>${moment(record.servicedAt).format("DD-MM-YYYY")}</td>
                    </tr>
                  `;
    }).join("")}
              </tbody>
            </table>
          </div>
        </body>
      </html>
    `;

    // Launch puppeteer and generate PDF
    const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
    const page = await browser.newPage();
    await page.setContent(htmlContent, { waitUntil: "networkidle0" });

    const pdfBuffer = await page.pdf({ format: "A2", printBackground: true });
    await browser.close();

    // Ensure uploads/rawMaterial folder exists
    const uploadDir = path.join(__dirname, "../../uploads/rawMaterial");
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    // Save the PDF
    const fileName = `ServiceRecord_${moment().format("YYYY-MM-DD")}.pdf`;
    const filePath = path.join(uploadDir, fileName);
    fs.writeFileSync(filePath, pdfBuffer);

    return res.status(200).json({
      success: true,
      message: "PDF generated and saved successfully",
    });

  } catch (error) {
    console.error("PDF generation error:", error);
    res.status(500).json({
      success: false,
      message: "PDF generation failed",
      error: error.message,
    });
  }
};

const generateDailyServiceRecordPDF = async (req, res) => {
  try {
    const startTime = moment().subtract(1, "days").hour(17).minute(14).second(0).millisecond(0).subtract(5, "hours").subtract(30, "minutes");
    const endTime = moment().hour(17).minute(14).second(0).millisecond(0).subtract(5, "hours").subtract(30, "minutes");

    const utcStart = startTime.utc().toDate();
    const utcEnd = endTime.utc().toDate();
    console.log("UTC Start:", utcStart);
    console.log("UTC End:", utcEnd);
    const serviceRecords = await prisma.serviceRecord.findMany({
      where: {
        servicedAt: {
          gte: utcStart,
          lt: utcEnd,
        },
      },
      include: {
        user: true,
        serviceUsages: true,
      },
      orderBy: {
        servicedAt: "asc",
      },
    });
    console.log("Service Records:", serviceRecords);
    const rawMaterialIds = new Set();
    for (const record of serviceRecords) {
      if (record.repairedParts) {
        const parts = Array.isArray(record.repairedParts)
          ? record.repairedParts
          : JSON.parse(record.repairedParts);
        parts.forEach(part => {
          if (part.rawMaterialId) rawMaterialIds.add(part.rawMaterialId);
        });
      }
    }

    const rawMaterials = await prisma.rawMaterial.findMany({
      where: { id: { in: [...rawMaterialIds] } },
    });

    const rawMaterialMap = {};
    rawMaterials.forEach(rm => {
      rawMaterialMap[rm.id] = { name: rm.name, unit: rm.unit };
    });

    const tableRows = serviceRecords.length === 0
      ? `
        <tr>
          <td colspan="11" style="text-align: center; font-style: italic;">No data available</td>
        </tr>`
      : serviceRecords.map(record => {
        const repairedParts = (() => {
          if (!record.repairedParts) return [];
          if (Array.isArray(record.repairedParts)) return record.repairedParts;
          try {
            return JSON.parse(record.repairedParts);
          } catch (e) {
            return [];
          }
        })();

        const repairedPartsHtml = repairedParts.length > 0
          ? `<ul style="padding-left: 18px; margin: 0;">` +
          repairedParts.map(part => {
            const material = rawMaterialMap[part.rawMaterialId];
            const name = material?.name || "Unknown";
            const qty = part.quantity ?? "-";
            const unit = material?.unit ? ` ${material.unit}` : "";
            return `<li>${name} (Qty: ${qty}${unit})</li>`;
          }).join("") +
          `</ul>`
          : "-";

        return `
          <tr>
            <td>${record.item || "-"}</td>
            <td>${record.subItem || "-"}</td>
            <td>${record.quantity || "-"}</td>
            <td>${record.serialNumber || "-"}</td>
            <td>${record.faultAnalysis || "-"}</td>
            <td>${record.isRepaired ? "Repaired" : "Rejected"}</td>
            <td>${record.repairedRejectedBy || "-"}</td>
            <td>${record.remarks || "-"}</td>
            <td class="left-align">${repairedPartsHtml}</td>
            <td>${record.user?.name || "-"}</td>
            <td>${moment(record.servicedAt).format("DD-MM-YYYY")}</td>
          </tr>`;
      }).join("");

    const htmlContent = `
      <html>
        <head>
          <style>
            body {
              font-family: Arial, sans-serif;
              padding: 20px;
              display: flex;
              justify-content: center;
            }
            table {
              width: 98%;
              border-collapse: collapse;
              margin: auto;
            }
            th, td {
              border: 1px solid #ccc;
              padding: 8px;
              vertical-align: top;
            }
            th {
              background-color: #f4f4f4;
              text-align: center;
            }
            td {
              text-align: center;
            }
            td.left-align {
              text-align: left;
            }
            h2 {
              text-align: center;
              margin-bottom: 30px;
            }
          </style>
        </head>
        <body>
          <div style="width: 100%;">
            <h2>Daily Service Record Report</h2>
            <table>
              <thead>
                <tr>
                  <th>Item</th>
                  <th>SubItem</th>
                  <th>Quantity</th>
                  <th>Serial Number</th>
                  <th>Fault Analysis</th>
                  <th>Status</th>
                  <th>Repaired By</th>
                  <th>Remarks</th>
                  <th>Repaired Parts</th>
                  <th>Form Filled By</th>
                  <th>Serviced Date</th>
                </tr>
              </thead>
              <tbody>
                ${tableRows}
              </tbody>
            </table>
          </div>
        </body>
      </html>`;

    const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
    const page = await browser.newPage();
    await page.setContent(htmlContent, { waitUntil: "networkidle0" });

    const pdfBuffer = await page.pdf({ format: "A2", printBackground: true });
    await browser.close();

    const uploadDir = path.join(__dirname, "../../uploads/rawMaterial");
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const fileName = `DailyServiceRecord_${moment().format("YYYY-MM-DD")}.pdf`;
    const filePath = path.join(uploadDir, fileName);
    fs.writeFileSync(filePath, pdfBuffer);

    return res.status(200).json({
      success: true,
      message: "PDF generated and saved successfully"
    });

  } catch (error) {
    console.error("PDF generation error:", error);
    res.status(500).json({
      success: false,
      message: "PDF generation failed",
      error: error.message,
    });
  }
};

module.exports = { generateRawMaterialStockPDF, generateServiceRecordPDF, generateDailyServiceRecordPDF };
