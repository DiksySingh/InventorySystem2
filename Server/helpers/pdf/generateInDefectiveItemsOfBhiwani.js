const puppeteer = require("puppeteer");
const fs = require("fs").promises;
const path = require("path");
const moment = require("moment");
const PickupItem = require("../../models/serviceInventoryModels/pickupItemSchema");
const RepairNRejectItems = require("../../models/serviceInventoryModels/repairNRejectSchema");
const WToW = require("../../models/serviceInventoryModels/warehouse2WarehouseSchema");

const generateHTML = (data, totals, wToWData, wToWTotal) => {
    const rows = data.map((item) => `
        <tr>
            <td>${item.date}</td>
            <td>${item.totalQuantity}</td>
            <td>${item.outgoingQuantity}</td>
            <td>${item.repaired}</td>
            <td>${item.rejected}</td>
        </tr>`).join("");

    const wToWRows = wToWData.map((item) => `
        <tr>
            <td>${item.date}</td>
            <td>${item.incomingDefective}</td>
            <td>${item.repairedOut}</td>
        </tr>`).join("");

    return `
    <html>
    <head>
        <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            h2, h3 { text-align: center; }
            table { width: 90%; border-collapse: collapse; margin: auto; }
            th, td { border: 1px solid black; padding: 8px; text-align: left; }
            th { background-color: rgb(240, 161, 161); }
            .footer { text-align: center; margin-top: 15px; font-weight: bold; }
            .page-break { page-break-before: always; }
            @media print {
                @page { margin-top: 40px; }
                table { page-break-inside: auto; }
                tr { page-break-inside: avoid; page-break-after: auto; }
                thead { display: table-header-group; }
            }
        </style>
    </head>
    <body>
        <h3>Bhiwani Monthly Report (Defective, Outgoing, Repaired, Rejected)</h3>
        <table>
            <thead>
                <tr>
                    <th>Date</th>
                    <th>Defective Nos</th>
                    <th>Outgoing Nos</th>
                    <th>Repaired Nos</th>
                    <th>Rejected Nos</th>
                </tr>
            </thead>
            <tbody>
                ${rows}
                <tr style="font-weight: bold;">
                    <td>Total</td>
                    <td>${totals.totalQuantity}</td>
                    <td>${totals.totalOutgoing}</td>
                    <td>${totals.totalRepaired}</td>
                    <td>${totals.totalRejected}</td>
                </tr>
            </tbody>
        </table>

        <div class="page-break"></div>

        <h3>Bhiwani Report (Warehouse 2 Warehouse)</h3>
        <table>
            <thead>
                <tr>
                    <th>Date</th>
                    <th>Incoming Defective to Bhiwani</th>
                    <th>Repaired Items Sent from Bhiwani</th>
                </tr>
            </thead>
            <tbody>
                ${wToWRows}
                <tr style="font-weight: bold;">
                    <td>Total</td>
                    <td>${wToWTotal.totalIncomingDefective}</td>
                    <td>${wToWTotal.totalRepairedOut}</td>
                </tr>
            </tbody>
        </table>

        <div class="footer">Generated on ${moment().format("DD-MM-YYYY")}</div>
    </body>
    </html>`;
};

module.exports.generateBhiwaniInDefectiveItems = async (req, res) => {
    try {
        const startDate = moment("2025-02-20", "YYYY-MM-DD").startOf("day");
        const endDate = moment().endOf("day");

        const utcStart = startDate.utc().toDate();
        const utcEnd = endDate.utc().toDate();

        const days = [];
        for (let m = moment(utcStart); m.isBefore(utcEnd); m.add(1, "day")) {
            days.push(m.clone().startOf("day"));
        }

        const reportData = [];
        const wToWData = [];

        let totalQuantity = 0, totalOutgoing = 0, totalRepaired = 0, totalRejected = 0;
        let totalIncomingDefective = 0, totalRepairedOut = 0;

        for (const date of days) {
            const nextDay = date.clone().add(1, "day");

            // Defective (incoming = true)
            const pickups = await PickupItem.find({
                incoming: true,
                warehouse: "Bhiwani",
                pickupDate: { $gte: date.toDate(), $lt: nextDay.toDate() },
            });

            const totalItemsForDate = pickups.reduce((sum, item) => sum + item.items.reduce((s, i) => s + i.quantity, 0), 0);
            totalQuantity += totalItemsForDate;

            // Outgoing (incoming = false)
            const outgoingPickups = await PickupItem.find({
                incoming: false,
                warehouse: "Bhiwani",
                pickupDate: { $gte: date.toDate(), $lt: nextDay.toDate() },
            });

            const outgoingItemsForDate = outgoingPickups.reduce((sum, item) => sum + item.items.reduce((s, i) => s + i.quantity, 0), 0);
            totalOutgoing += outgoingItemsForDate;

            const repairRejectData = await RepairNRejectItems.aggregate([
                {
                    $match: {
                        warehouseName: "Bhiwani",
                        createdAt: { $gte: date.toDate(), $lt: nextDay.toDate() },
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

            totalRepaired += repairedCount;
            totalRejected += rejectedCount;

            reportData.push({
                date: date.format("DD-MM-YYYY"),
                totalQuantity: totalItemsForDate,
                outgoingQuantity: outgoingItemsForDate,
                repaired: repairedCount,
                rejected: rejectedCount,
            });

            // Second Table: Warehouse Transfers (Incoming Defective, Repaired Out)
            const warehouseTransfers = await WToW.find({
                $or: [
                    { toWarehouse: "Bhiwani", isDefective: true },
                    { fromWarehouse: "Bhiwani", isDefective: false },
                ],
                pickupDate: { $gte: date.toDate(), $lt: nextDay.toDate() },
            });

            const incomingDefective = warehouseTransfers
                .filter((transfer) => transfer.toWarehouse === "Bhiwani" && transfer.isDefective)
                .reduce((sum, transfer) => sum + transfer.items.reduce((s, i) => s + i.quantity, 0), 0);

            totalIncomingDefective += incomingDefective;

            const repairedOut = warehouseTransfers
                .filter((transfer) => transfer.fromWarehouse === "Bhiwani" && !transfer.isDefective)
                .reduce((sum, transfer) => sum + transfer.items.reduce((s, i) => s + i.quantity, 0), 0);

            totalRepairedOut += repairedOut;

            wToWData.push({
                date: date.format("DD-MM-YYYY"),
                incomingDefective,
                repairedOut,
            });
        }

        const totals = {
            totalQuantity,
            totalOutgoing,
            totalRepaired,
            totalRejected,
        };

        const wToWTotal = {
            totalIncomingDefective,
            totalRepairedOut,
        };

        const htmlContent = generateHTML(reportData, totals, wToWData, wToWTotal);

        const browser = await puppeteer.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox'],
        });

        const page = await browser.newPage();
        await page.setContent(htmlContent, { waitUntil: "load" });

        const uploadDir = path.join(__dirname, "../uploads");
        await fs.mkdir(uploadDir, { recursive: true });

        const fileName = `BhiwaniMonthlyReport_${moment().format("YYYY-MM-DD")}.pdf`;
        const filePath = path.join(uploadDir, fileName);

        await page.pdf({ path: filePath, format: "A4", printBackground: true });

        await browser.close();

        res.status(200).json({ message: "PDF saved successfully" });

    } catch (error) {
        console.error("Error generating PDF:", error);
        res.status(500).send("Internal Server Error");
    }
};
