const puppeteer = require("puppeteer");
const fs = require("fs").promises;
const mongoose = require("mongoose");
const path = require("path");
const moment = require("moment");
const PickupItem = require("../models/serviceInventoryModels/pickupItemSchema");
const RepairNRejectItems = require("../models/serviceInventoryModels/repairNRejectSchema");
const WToW = require("../models/serviceInventoryModels/warehouse2WarehouseSchema");
const WarehouseItems = require("../models/serviceInventoryModels/warehouseItemsSchema");

const generateHTML = (data, totals) => {
    const itemRows = data.map((item) => `
        <tr>
            <td>${item.itemName}</td>
            <td>${item.stock}</td>
            <td>${item.defective}</td>
            <td>${item.repaired}</td>
            <td>${item.rejected}</td>
        </tr>
    `).join("");

    return `
    <html>
    <head>
        <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            h2, h3 { text-align: center; margin-bottom: 10px; }
            table { width: 90%; border-collapse: collapse; margin: auto; margin-bottom: 20px; }
            th, td { border: 1px solid black; padding: 6px; text-align: left; }
            th { background-color: rgb(240, 161, 161); }
            .footer { text-align: center; margin-top: 15px; font-weight: bold; }
        </style>
    </head>
    <body>
        <h3>Bhiwani Overall Report (Motor, Pump, Controller)</h3>
        <table>
            <thead>
                <tr>
                    <th>Item Name</th>
                    <th>Stock</th>
                    <th>Defective Nos</th>
                    <th>Repaired Nos</th>
                    <th>Rejected Nos</th>
                </tr>
            </thead>
            <tbody>
                ${itemRows}
                <tr style="font-weight: bold;">
                    <td>Total</td>
                    <td>${totals.totalStock}</td>
                    <td>${totals.totalDefective}</td>
                    <td>${totals.totalRepaired}</td>
                    <td>${totals.totalRejected}</td>
                </tr>
            </tbody>
        </table>
        <div class="footer">Generated on ${moment().format("DD-MM-YYYY")}</div>
    </body>
    </html>`;
};

module.exports.generateBhiwaniOverallDefectiveReport = async (req, res) => {
    try {
        const itemNames = ["Motor", "Pump", "Controller"];
        const reportData = [];

        let totalStock = 0, totalDefective = 0, totalRepaired = 0, totalRejected = 0;

        for (const itemName of itemNames) {
            const stockData = await WarehouseItems.aggregate([
                { $match: { warehouse: new mongoose.Types.ObjectId("67446a8b27dae6f7f4d985dd") } },
                { $unwind: "$items" },
                { $match: { "items.itemName": { $regex: itemName, $options: "i" } } },
                { $group: { _id: null, total: { $sum: "$items.quantity" } } }
            ]);

            const stock = stockData[0]?.total || 0;
            totalStock += stock;

            const defectiveData = await WarehouseItems.aggregate([
                { $match: { warehouse: new mongoose.Types.ObjectId("67446a8b27dae6f7f4d985dd") } },
                { $unwind: "$items" },
                { $match: { "items.itemName": { $regex: itemName, $options: "i" } } },
                { $group: { _id: null, total: { $sum: "$items.defective" } } }
            ]);

            const defective = defectiveData[0]?.total || 0;
            totalDefective += defective;

            const repairRejectData = await RepairNRejectItems.aggregate([
                { $match: { warehouseName: "Bhiwani", itemName: { $regex: itemName, $options: "i" } } },
                { $group: { _id: null, repaired: { $sum: "$repaired" }, rejected: { $sum: "$rejected" } } }
            ]);

            const repairedTotal = repairRejectData[0]?.repaired || 0;
            const rejectedTotal = repairRejectData[0]?.rejected || 0;

            totalRepaired += repairedTotal;
            totalRejected += rejectedTotal;

            reportData.push({
                itemName,
                stock,
                defective,
                repaired: repairedTotal,
                rejected: rejectedTotal,
            });
        }

        const htmlContent = generateHTML(reportData, {
            totalStock,
            totalDefective,
            totalRepaired,
            totalRejected
        });
        const uploadsDir = path.join(__dirname, "../uploads");
        await fs.mkdir(uploadsDir, { recursive: true });
        const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
        const page = await browser.newPage();
        await page.setContent(htmlContent, { waitUntil: "load" });

        const fileName = `BhiwaniStockDefectiveReport_${moment().format("YYYY-MM-DD")}.pdf`;
        const filePath = path.join(__dirname, "../uploads", fileName);
        await page.pdf({ path: filePath, format: "A4", printBackground: true });
        await browser.close();

        res.status(200).json({ message: "PDF saved successfully"});
    } catch (error) {
        console.error("Error generating PDF:", error);
        res.status(500).send("Internal Server Error");
    }
};