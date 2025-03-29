const puppeteer = require("puppeteer");
const fs = require("fs").promises;
const path = require("path");
const moment = require("moment");
const PickupItem = require("../models/serviceInventoryModels/pickupItemSchema");
const RepairNRejectItems = require("../models/serviceInventoryModels/repairNRejectSchema");
const WToW = require("../models/serviceInventoryModels/warehouse2WarehouseSchema");

const generateHTML = (data, totals, wToWData, wToWTotals) => {
    const itemRows = data.map((item) => `
        <tr>
            <td>${item.itemName}</td>
            <td>${item.incoming}</td>
            <td>${item.outgoing}</td>
            <td>${item.repaired}</td>
            <td>${item.rejected}</td>
        </tr>
    `).join("");

    const wToWRows = wToWData.map((item) => `
        <tr>
            <td>${item.itemName}</td>
            <td>${item.defectiveIncoming}</td>
            <td>${item.repairedOutgoing}</td>
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
                    <th>Defective Nos</th>
                    <th>Outgoing Nos</th>
                    <th>Repaired Nos</th>
                    <th>Rejected Nos</th>
                </tr>
            </thead>
            <tbody>
                ${itemRows}
                <tr style="font-weight: bold;">
                    <td>Total</td>
                    <td>${totals.totalIncoming}</td>
                    <td>${totals.totalOutgoing}</td>
                    <td>${totals.totalRepaired}</td>
                    <td>${totals.totalRejected}</td>
                </tr>
            </tbody>
        </table>

        <h3>Warehouse 2 Warehouse Report (Motor, Pump, Controller)</h3>
        <table>
            <thead>
                <tr>
                    <th>Item Name</th>
                    <th>Defective Incoming</th>
                    <th>Repaired Outgoing</th>
                </tr>
            </thead>
            <tbody>
                ${wToWRows}
                <tr style="font-weight: bold;">
                    <td>Total</td>
                    <td>${wToWTotals.totalDefectiveIncoming}</td>
                    <td>${wToWTotals.totalRepairedOutgoing}</td>
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
        console.log("UTC Start:", utcStart);
        console.log("UTC End:", utcEnd);

        const itemNames = ["Motor", "Pump", "Controller"];
        const reportData = [];

        let totalIncoming = 0, totalOutgoing = 0, totalRepaired = 0, totalRejected = 0;

        for (const itemName of itemNames) {
            // Get all defective (incoming = true)
            const defectivePickups = await PickupItem.find({
                incoming: true,
                warehouse: "Bhiwani",
                pickupDate: { $gte: utcStart, $lt: utcEnd },
                items: { $elemMatch: { itemName: { $regex: itemName, $options: "i" } } },
            });

            const defectiveCount = defectivePickups.reduce(
                (sum, item) => sum + item.items.filter(i => new RegExp(itemName, "i").test(i.itemName))
                    .reduce((s, i) => s + i.quantity, 0),
                0
            );

            // Get all outgoing (incoming = false)
            const outgoingPickups = await PickupItem.find({
                incoming: false,
                warehouse: "Bhiwani",
                pickupDate: { $gte: utcStart, $lt: utcEnd },
                items: { $elemMatch: { itemName: { $regex: itemName, $options: "i" } } },
            });

            const outgoingCount = outgoingPickups.reduce(
                (sum, item) => sum + item.items.filter(i => new RegExp(itemName, "i").test(i.itemName))
                    .reduce((s, i) => s + i.quantity, 0),
                0
            );

            // Get repaired and rejected counts
            const repairRejectData = await RepairNRejectItems.aggregate([
                {
                    $match: {
                        warehouseName: "Bhiwani",
                        createdAt: { $gte: utcStart, $lt: utcEnd },
                        itemName: { $regex: itemName, $options: "i" },
                    },
                },
                {
                    $group: {
                        _id: null,
                        repaired: { $sum: "$repaired" },
                        rejected: { $sum: "$rejected" },
                    },
                },
            ]);

            const repairedCount = repairRejectData[0]?.repaired || 0;
            const rejectedCount = repairRejectData[0]?.rejected || 0;

            totalIncoming += defectiveCount;
            totalOutgoing += outgoingCount;
            totalRepaired += repairedCount;
            totalRejected += rejectedCount;

            reportData.push({
                itemName,
                incoming: defectiveCount,
                outgoing: outgoingCount,
                repaired: repairedCount,
                rejected: rejectedCount,
            });
        }

        const wToWData = [];
        let totalDefectiveIncoming = 0, totalRepairedOutgoing = 0;

        for (const itemName of itemNames) {
            // Get defective incoming data (toWarehouse: "Bhiwani", isDefective: true)
            const defectiveIncomingData = await WToW.find({
                toWarehouse: "Bhiwani",
                isDefective: true,
                pickupDate: { $gte: utcStart, $lt: utcEnd },
                items: { $elemMatch: { itemName: { $regex: itemName, $options: "i" } } },
            });

            const defectiveIncomingCount = defectiveIncomingData.reduce(
                (sum, entry) => sum + entry.items.filter(i => new RegExp(itemName, "i").test(i.itemName))
                    .reduce((s, i) => s + i.quantity, 0),
                0
            );

            // Get repaired outgoing data (fromWarehouse: "Bhiwani", isDefective: false)
            const repairedOutgoingData = await WToW.find({
                fromWarehouse: "Bhiwani",
                isDefective: false,
                pickupDate: { $gte: utcStart, $lt: utcEnd },
                items: { $elemMatch: { itemName: { $regex: itemName, $options: "i" } } },
            });

            const repairedOutgoingCount = repairedOutgoingData.reduce(
                (sum, entry) => sum + entry.items.filter(i => new RegExp(itemName, "i").test(i.itemName))
                    .reduce((s, i) => s + i.quantity, 0),
                0
            );

            totalDefectiveIncoming += defectiveIncomingCount;
            totalRepairedOutgoing += repairedOutgoingCount;

            wToWData.push({
                itemName,
                defectiveIncoming: defectiveIncomingCount,
                repairedOutgoing: repairedOutgoingCount,
            });
        }

        const wToWTotals = { totalDefectiveIncoming, totalRepairedOutgoing };
        const htmlContent = generateHTML(reportData, { totalIncoming, totalOutgoing, totalRepaired, totalRejected }, wToWData, wToWTotals);

        const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
        const page = await browser.newPage();
        await page.setContent(htmlContent, { waitUntil: "load" });

        const uploadDir = path.join(__dirname, "../uploads");
        await fs.mkdir(uploadDir, { recursive: true });

        const fileName = `BhiwaniDailyReport_${moment().format("YYYY-MM-DD")}.pdf`;
        const filePath = path.join(uploadDir, fileName);

        await page.pdf({ path: filePath, format: "A4", printBackground: true });
        await browser.close();

        res.status(200).json({ message: "PDF saved successfully" });

    } catch (error) {
        console.error("Error generating PDF:", error);
        res.status(500).send("Internal Server Error");
    }
};
