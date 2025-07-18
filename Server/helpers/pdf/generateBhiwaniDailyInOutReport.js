const puppeteer = require("puppeteer");
const mongoose = require("mongoose");
const moment = require("moment");
const fs = require("fs").promises;
const path = require("path");
const PickupItem = require("../../models/serviceInventoryModels/pickupItemSchema");
const WToW = require("../../models/serviceInventoryModels/warehouse2WarehouseSchema");
const RepairNRejectItems = require("../../models/serviceInventoryModels/repairNRejectSchema");

const generateHTML = (defectiveIncoming, outgoingItems, repairedItems, rejectedItems) => {
    const generateRows = (data) => {
        return data.map((item) => `
            <tr>
                <td>${item._id}</td>
                <td>${item.quantity}</td>
            </tr>
        `).join('');
    };   

    const totalQuantity = (data) => {
        return data.reduce((sum, item) => sum + item.quantity, 0);
    };

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
        <h3>Bhiwani Daily In-Out Report</h3>

        <h3>Today Faulty In</h3>
        <table>
            <thead>
                <tr><th>Item Name</th><th>Quantity</th></tr>
            </thead>
            <tbody>${generateRows(defectiveIncoming)}</tbody>
            <tfoot><tr><th>Total</th><th>${totalQuantity(defectiveIncoming)}</th></tr></tfoot>
        </table>

        <h3>Today Rejected Quantity</h3>
        <table>
            <thead>
                <tr><th>Item Name</th><th>Quantity</th></tr>
            </thead>
            <tbody>${generateRows(rejectedItems)}</tbody>
            <tfoot><tr><th>Total</th><th>${totalQuantity(rejectedItems)}</th></tr></tfoot>
        </table>

        <h3>Today Repaired Items Dispatched</h3>
        <table>
            <thead>
                <tr><th>Item Name</th><th>Quantity</th></tr>
            </thead>
            <tbody>${generateRows(outgoingItems)}</tbody>
            <tfoot><tr><th>Total</th><th>${totalQuantity(outgoingItems)}</th></tr></tfoot>
        </table>

        <div class="footer">Generated on ${moment().format("DD-MM-YYYY")}</div>
    </body>
    </html>`;
};

module.exports.generateBhiwaniDailyInOutReport = async (req, res) => {
    try {
        const startTime = moment().subtract(1, "days").hour(17).minute(14).second(0).millisecond(0).subtract(5, "hours").subtract(30, "minutes");
        const endTime = moment().hour(17).minute(14).second(0).millisecond(0).subtract(5, "hours").subtract(30, "minutes");
        const utcStart = startTime.utc().toDate();
        const utcEnd = endTime.utc().toDate();

        const defectivePickupIncoming = await PickupItem.aggregate([
            { $match: { warehouse: "Bhiwani", incoming: true, status: true, arrivedDate: { $gte: utcStart, $lt: utcEnd } } },
            { $unwind: "$items" },
            { $group: { _id: "$items.itemName", quantity: { $sum: "$items.quantity" } } }
        ]);

        const outgoingPickupItems = await PickupItem.aggregate([
            { $match: { warehouse: "Bhiwani", incoming: false, pickupDate: { $gte: utcStart, $lt: utcEnd } } },
            { $unwind: "$items" },
            { $group: { _id: "$items.itemName", quantity: { $sum: "$items.quantity" } } }
        ]);

        const defectiveWToWIncoming = await WToW.aggregate([
            { $match: { toWarehouse: "Bhiwani", isDefective: true, status: true, arrivedDate: { $gte: utcStart, $lt: utcEnd } } },
            { $unwind: "$items" },
            { $group: { _id: "$items.itemName", quantity: { $sum: "$items.quantity" } } }
        ]);

        const outgoingWToWItems = await WToW.aggregate([
            { $match: { fromWarehouse: "Bhiwani", isDefective: false, pickupDate: { $gte: utcStart, $lt: utcEnd } } },
            { $unwind: "$items" },  // If items is an array
            { $group: { _id: "$items.itemName", quantity: { $sum: "$items.quantity" } } }
        ]);

        const repairedItems = await RepairNRejectItems.aggregate([
            { $match: { warehouseName: "Bhiwani", isRepaired: true, createdAt: { $gte: utcStart, $lt: utcEnd } } },
            { $group: { _id: "$itemName", quantity: { $sum: "$repaired" } } }
        ]);

        const rejectedItems = await RepairNRejectItems.aggregate([
            { $match: { warehouseName: "Bhiwani", isRepaired: false, createdAt: { $gte: utcStart, $lt: utcEnd } } },
            { $group: { _id: "$itemName", quantity: { $sum: "$rejected" } } }
        ]);

        const defectiveIncoming = mergeAndSumQuantities([...defectivePickupIncoming, ...defectiveWToWIncoming]);
        const outgoingItems = mergeAndSumQuantities([...outgoingPickupItems, ...outgoingWToWItems]);

        const htmlContent = generateHTML(defectiveIncoming, outgoingItems, repairedItems, rejectedItems);

        const uploadsDir = path.join(__dirname, "../../uploads");
        await fs.mkdir(uploadsDir, { recursive: true });

        const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
        const page = await browser.newPage();
        await page.setContent(htmlContent, { waitUntil: "load" });

        const fileName = `BhiwaniDailyItemsInOutReport_${moment().format("YYYY-MM-DD")}.pdf`;
        const filePath = path.join(uploadsDir, fileName);
        await page.pdf({ path: filePath, format: "A4", printBackground: true });
        await browser.close();

        res.status(200).json({ message: "PDF saved successfully" });
    } catch (error) {
        console.error("Error generating PDF:", error);
        res.status(500).send("Internal Server Error");
    }
};

const mergeAndSumQuantities = (data) => {
    return data.reduce((acc, item) => {
        const existingItem = acc.find((i) => i._id === item._id);
        if (existingItem) {
            existingItem.quantity += item.quantity;
        } else {
            acc.push({ _id: item._id, quantity: item.quantity });
        }
        return acc;
    }, []);
};