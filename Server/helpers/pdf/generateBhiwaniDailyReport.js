const puppeteer = require("puppeteer");
const fs = require("fs").promises;
const path = require("path");
const moment = require("moment");
const mongoose = require("mongoose");
const PickupItem = require("../../models/serviceInventoryModels/pickupItemSchema");
const RepairNRejectItems = require("../../models/serviceInventoryModels/repairNRejectSchema");
const WToW = require("../../models/serviceInventoryModels/warehouse2WarehouseSchema");
const WarehouseItems = require("../../models/serviceInventoryModels/warehouseItemsSchema");

const generateHTML = (data, totals) => {
    const itemRows = data.map((item) => `
        <tr>
            <td>${item.itemName}</td>
            <td>${item.incoming}</td>
            <td>${item.rejected}</td>
            <td>${item.outgoing}</td>
            <td>${item.toBeRepaired}</td>
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
        <h3>Bhiwani Daily Report (Motor, Pump, Controller)</h3>
        <table>
            <thead>
                <tr>
                    <th>Item Name</th>
                    <th>Today Faulty In</th>
                    <th>Today Rejected Quantity</th>
                    <th>Today Repaired Items Dispatched</th>
                    <th>To Be Repaired</th>
                </tr>
            </thead>
            <tbody>
                ${itemRows}
                <tr style="font-weight: bold;">
                    <td>Total</td>
                    <td>${totals.totalIncoming}</td>
                    <td>${totals.totalRejected}</td>
                    <td>${totals.totalOutgoing}</td>
                    <td>${totals.totalDefective}</td>
                </tr>
            </tbody>
        </table>
        <div class="footer">Generated on ${moment().format("DD-MM-YYYY")}</div>
    </body>
    </html>`;
};

module.exports.generateBhiwaniDailyReport = async (req, res) => {
    try {
        const startTime = moment().subtract(1, "days").hour(17).minute(14).second(0).millisecond(0).subtract(5, "hours").subtract(30, "minutes");
        const endTime = moment().hour(17).minute(14).second(0).millisecond(0).subtract(5, "hours").subtract(30, "minutes");

        const utcStart = startTime.utc().toDate();
        const utcEnd = endTime.utc().toDate();
        console.log(utcStart);
        console.log(utcEnd);

        const itemNames = ["Motor", "Pump", "Controller"];
        const reportData = [];

        let totalIncoming = 0, totalOutgoing = 0, totalRepaired = 0, totalRejected = 0, totalDefective = 0;

        for (const itemName of itemNames) {
            const defectiveCount = await PickupItem.aggregate([
                { $match: { incoming: true, warehouse: "Bhiwani", pickupDate: { $gte: utcStart, $lt: utcEnd } } },
                { $unwind: "$items" },
                { $match: { "items.itemName": { $regex: itemName, $options: "i" } } },
                { $group: { _id: null, total: { $sum: "$items.quantity" } } }
            ]);

            const defectiveIncomingCount = await WToW.aggregate([
                { $match: { toWarehouse: "Bhiwani", isDefective: true, pickupDate: { $gte: utcStart, $lt: utcEnd } } },
                { $unwind: "$items" },
                { $match: { "items.itemName": { $regex: itemName, $options: "i" } } },
                { $group: { _id: null, total: { $sum: "$items.quantity" } } }
            ]);

            const outgoingCount = await PickupItem.aggregate([
                { $match: { incoming: false, warehouse: "Bhiwani", pickupDate: { $gte: utcStart, $lt: utcEnd } } },
                { $unwind: "$items" },
                { $match: { "items.itemName": { $regex: itemName, $options: "i" } } },
                { $group: { _id: null, total: { $sum: "$items.quantity" } } }
            ]);

            const repairedOutgoingCount = await WToW.aggregate([
                { $match: { fromWarehouse: "Bhiwani", isDefective: false, pickupDate: { $gte: utcStart, $lt: utcEnd } } },
                { $unwind: "$items" },
                { $match: { "items.itemName": { $regex: itemName, $options: "i" } } },
                { $group: { _id: null, total: { $sum: "$items.quantity" } } }
            ]);

            const repairRejectData = await RepairNRejectItems.aggregate([
                { $match: { warehouseName: "Bhiwani", createdAt: { $gte: utcStart, $lt: utcEnd }, itemName: { $regex: itemName, $options: "i" } } },
                { $group: { _id: null, repaired: { $sum: "$repaired" }, rejected: { $sum: "$rejected" } } }
            ]);

            const defectiveData = await WarehouseItems.aggregate([
                { $match: { warehouse: new mongoose.Types.ObjectId("67446a8b27dae6f7f4d985dd") } },
                { $unwind: "$items" },
                { $match: { "items.itemName": { $regex: itemName, $options: "i" } } },
                { $group: { _id: null, total: { $sum: "$items.defective" } } }
            ]);

            const defective = defectiveData[0]?.total || 0;
            totalDefective += defective;

            const defectiveTotal = (defectiveCount[0]?.total || 0) + (defectiveIncomingCount[0]?.total || 0);
            const outgoingTotal = (outgoingCount[0]?.total || 0) + (repairedOutgoingCount[0]?.total || 0);
            const repairedTotal = repairRejectData[0]?.repaired || 0;
            const rejectedTotal = repairRejectData[0]?.rejected || 0;

            totalIncoming += defectiveTotal;
            totalOutgoing += outgoingTotal;
            totalRejected += rejectedTotal;

            reportData.push({
                itemName,
                incoming: defectiveTotal,
                outgoing: outgoingTotal,
                toBeRepaired: defective,
                rejected: rejectedTotal,
            });
        }

        const htmlContent = generateHTML(reportData, { totalIncoming, totalOutgoing, totalRepaired, totalRejected, totalDefective });
        const uploadsDir = path.join(__dirname, "../../uploads");
        await fs.mkdir(uploadsDir, { recursive: true });
        const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
        const page = await browser.newPage();
        await page.setContent(htmlContent, { waitUntil: "load" });

        const fileName = `BhiwaniDailyReport_${moment().format("YYYY-MM-DD")}.pdf`;
        const filePath = path.join(uploadsDir, fileName);
        await page.pdf({ path: filePath, format: "A4", printBackground: true });
        await browser.close();

        res.status(200).json({ message: "PDF saved successfully" });
    } catch (error) {
        console.error("Error generating PDF:", error);
        res.status(500).send("Internal Server Error");
    }
};
