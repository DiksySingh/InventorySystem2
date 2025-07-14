// const puppeteer = require("puppeteer");
// const fs = require("fs").promises;
// const path = require("path");
// const moment = require("moment");
// const mongoose = require("mongoose");
// const PickupItem = require("../models/serviceInventoryModels/pickupItemSchema");
// const RepairNRejectItems = require("../models/serviceInventoryModels/repairNRejectSchema");
// const WToW = require("../models/serviceInventoryModels/warehouse2WarehouseSchema");
// const WarehouseItems = require("../models/serviceInventoryModels/warehouseItemsSchema");

// const generateHTML = (data, totals) => {
//     const itemRows = data.map((item) => `
//         <tr>
//             <td>${item.itemName}</td>
//             <td>${item.incoming}</td>
//             <td>${item.rejected}</td>
//             <td>${item.outgoing}</td>
//             <td>${item.toBeRepaired}</td>
//         </tr>
//     `).join("");

//     return `
//     <html>
//     <head>
//         <style>
//             body { font-family: Arial, sans-serif; margin: 20px; }
//             h2, h3 { text-align: center; margin-bottom: 10px; }
//             table { width: 90%; border-collapse: collapse; margin: auto; margin-bottom: 20px; }
//             th, td { border: 1px solid black; padding: 6px; text-align: left; }
//             th { background-color: rgb(240, 161, 161); }
//             .footer { text-align: center; margin-top: 15px; font-weight: bold; }
//         </style>
//     </head>
//     <body>
//         <h3>Bhiwani Overall Report (Motor, Pump, Controller)</h3>
//         <table>
//             <thead>
//                 <tr>
//                     <th>Item Name</th>
//                     <th>Total Faulty In</th>
//                     <th>Total Rejected Quantity</th>
//                     <th>Total Repaired Items Dispatched</th>
//                     <th>To Be Repaired</th>
//                 </tr>
//             </thead>
//             <tbody>
//                 ${itemRows}
//                 <tr style="font-weight: bold;">
//                     <td>Total</td>
//                     <td>${totals.totalIncoming}</td>
//                     <td>${totals.totalRejected}</td>
//                     <td>${totals.totalOutgoing}</td>
//                     <td>${totals.totalDefective}</td>
//                 </tr>
//             </tbody>
//         </table>
//         <div class="footer">Generated on ${moment().format("DD-MM-YYYY")}</div>
//     </body>
//     </html>`;
// };

// module.exports.generateBhiwaniOverallReport = async (req, res) => {
//     try {
//         const itemNames = ["Motor", "Pump", "Controller"];
//         const reportData = [];

//         let totalIncoming = 0, totalOutgoing = 0, totalRepaired = 0, totalRejected = 0, totalDefective = 0;

//         for (const itemName of itemNames) {
//             const defectiveCount = await PickupItem.aggregate([
//                 { $match: { incoming: true, warehouse: "Bhiwani", } },
//                 { $unwind: "$items" },
//                 { $match: { "items.itemName": { $regex: itemName, $options: "i" } } },
//                 { $group: { _id: null, total: { $sum: "$items.quantity" } } }
//             ]);

//             const defectiveIncomingCount = await WToW.aggregate([
//                 { $match: { toWarehouse: "Bhiwani", isDefective: true, } },
//                 { $unwind: "$items" },
//                 { $match: { "items.itemName": { $regex: itemName, $options: "i" } } },
//                 { $group: { _id: null, total: { $sum: "$items.quantity" } } }
//             ]);

//             const outgoingCount = await PickupItem.aggregate([
//                 { $match: { incoming: false, warehouse: "Bhiwani", } },
//                 { $unwind: "$items" },
//                 { $match: { "items.itemName": { $regex: itemName, $options: "i" } } },
//                 { $group: { _id: null, total: { $sum: "$items.quantity" } } }
//             ]);

//             const repairedOutgoingCount = await WToW.aggregate([
//                 { $match: { fromWarehouse: "Bhiwani", isDefective: false, } },
//                 { $unwind: "$items" },
//                 { $match: { "items.itemName": { $regex: itemName, $options: "i" } } },
//                 { $group: { _id: null, total: { $sum: "$items.quantity" } } }
//             ]);

//             const repairRejectData = await RepairNRejectItems.aggregate([
//                 { $match: { warehouseName: "Bhiwani", itemName: { $regex: itemName, $options: "i" } } },
//                 { $group: { _id: null, repaired: { $sum: "$repaired" }, rejected: { $sum: "$rejected" } } }
//             ]);

//             const defectiveData = await WarehouseItems.aggregate([
//                 { $match: { warehouse: new mongoose.Types.ObjectId("67446a8b27dae6f7f4d985dd") } },
//                 { $unwind: "$items" },
//                 { $match: { "items.itemName": { $regex: itemName, $options: "i" } } },
//                 { $group: { _id: null, total: { $sum: "$items.defective" } } }
//             ]);

//             const defective = defectiveData[0]?.total || 0;
//             totalDefective += defective;

//             const defectiveTotal = (defectiveCount[0]?.total || 0) + (defectiveIncomingCount[0]?.total || 0);
//             const outgoingTotal = (outgoingCount[0]?.total || 0) + (repairedOutgoingCount[0]?.total || 0);
//             const repairedTotal = repairRejectData[0]?.repaired || 0;
//             const rejectedTotal = repairRejectData[0]?.rejected || 0;

//             totalIncoming += defectiveTotal;
//             totalOutgoing += outgoingTotal;
//             totalRejected += rejectedTotal;

//             reportData.push({
//                 itemName,
//                 incoming: defectiveTotal,
//                 outgoing: outgoingTotal,
//                 toBeRepaired: defective,
//                 rejected: rejectedTotal,
//             });
//         }

//         const htmlContent = generateHTML(reportData, { totalIncoming, totalOutgoing, totalRepaired, totalRejected, totalDefective });
//         const uploadsDir = path.join(__dirname, "../uploads");
//         await fs.mkdir(uploadsDir, { recursive: true });
//         const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
//         const page = await browser.newPage();
//         await page.setContent(htmlContent, { waitUntil: "load" });

//         const fileName = `BhiwaniOverallReport_${moment().format("YYYY-MM-DD")}.pdf`;
//         const filePath = path.join(uploadsDir, fileName);
//         await page.pdf({ path: filePath, format: "A4", printBackground: true });
//         await browser.close();

//         res.status(200).json({ message: "PDF saved successfully" });
//     } catch (error) {
//         console.error("Error generating PDF:", error);
//         res.status(500).send("Internal Server Error");
//     }
// };


const puppeteer = require("puppeteer");
const fs = require("fs").promises;
const path = require("path");
const moment = require("moment");
const mongoose = require("mongoose");
const PickupItem = require("../../models/serviceInventoryModels/pickupItemSchema");
const RepairNRejectItems = require("../../models/serviceInventoryModels/repairNRejectSchema");
const WToW = require("../../models/serviceInventoryModels/warehouse2WarehouseSchema");
const Warehouse = require("../../models/serviceInventoryModels/warehouseSchema");
const WarehouseItems = require("../../models/serviceInventoryModels/warehouseItemsSchema");

const generateHTML = (warehouseName, data, totals) => {
    const itemRows = data.map((item) => `
        <tr>
            <td>${item.itemName}</td>
            <td>${item.incoming}</td>
            <td>${item.rejected}</td>
            <td>${item.outgoing}</td>
            <td>${item.toBeRepaired}</td>
        </tr>
    `).join("");

    const subTables = data.map((item) => {
        if (!item.subItems || item.subItems.length === 0) return '';
    
        const subRows = item.subItems.map(sub => `
            <tr>
                <td>${sub.name}</td>
                <td>${sub.defective}</td>
            </tr>
        `).join("");
    
        return `
            <div class="page-break-container">
            <div class="spacer"></div>
                <h4 style="text-align:center;">${item.itemName} - Defective Category Breakdown</h4>
                <table>
                    <thead>
                        <tr>
                            <th>Sub Item</th>
                            <th>Defective Quantity</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${subRows}
                    </tbody>
                </table>
            </div>
        `;
    }).join("");
    return `
    <html>
    <head>
        <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            h2, h3, h4 { text-align: center; margin-bottom: 10px; }
            table { width: 90%; border-collapse: collapse; margin: auto; margin-bottom: 20px; }
            th, td { border: 1px solid black; padding: 6px; text-align: left; }
            th { background-color: rgb(240, 161, 161); }
            .footer { text-align: center; margin-top: 15px; font-weight: bold; }
            .spacer {
                height: 15px; /* Add vertical space at the top of the new page */
            }
            .page-break-container {
                page-break-inside: avoid;
                break-inside: avoid;
                display: block;
            }
        </style>
    </head>
    <body>
        <h3>${warehouseName} Overall Report (Motor, Pump, Controller)</h3>
        <div class="page-break-container">
        <table>
            <thead>
                <tr>
                    <th>Item Name</th>
                    <th>Total Faulty In</th>
                    <th>Total Rejected Quantity</th>
                    <th>Total Repaired Items Dispatched</th>
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
        </div>
        ${subTables}
        <div class="footer">Generated on ${moment().format("DD-MM-YYYY")}</div>
    </body>
    </html>`;
};

module.exports.getSpecificWarehouseOverallReport = async (req, res) => {
    try {
        const warehouseName = req.query.warehouseName;
        const itemNames = ["Motor", "Pump", "Controller"];
        const reportData = [];

        let totalIncoming = 0, totalOutgoing = 0, totalRepaired = 0, totalRejected = 0, totalDefective = 0;

        for (const itemName of itemNames) {
            const defectiveCount = await PickupItem.aggregate([
                { $match: { incoming: true, warehouse: warehouseName, } },
                { $unwind: "$items" },
                { $match: { "items.itemName": { $regex: itemName, $options: "i" } } },
                { $group: { _id: null, total: { $sum: "$items.quantity" } } }
            ]);

            const defectiveIncomingCount = await WToW.aggregate([
                { $match: { toWarehouse: warehouseName, isDefective: true, } },
                { $unwind: "$items" },
                { $match: { "items.itemName": { $regex: itemName, $options: "i" } } },
                { $group: { _id: null, total: { $sum: "$items.quantity" } } }
            ]);

            const outgoingCount = await PickupItem.aggregate([
                { $match: { incoming: false, warehouse: warehouseName, } },
                { $unwind: "$items" },
                { $match: { "items.itemName": { $regex: itemName, $options: "i" } } },
                { $group: { _id: null, total: { $sum: "$items.quantity" } } }
            ]);

            const repairedOutgoingCount = await WToW.aggregate([
                { $match: { fromWarehouse: warehouseName, isDefective: false, } },
                { $unwind: "$items" },
                { $match: { "items.itemName": { $regex: itemName, $options: "i" } } },
                { $group: { _id: null, total: { $sum: "$items.quantity" } } }
            ]);

            const repairRejectData = await RepairNRejectItems.aggregate([
                { $match: { warehouseName: warehouseName, itemName: { $regex: itemName, $options: "i" } } },
                { $group: { _id: null, repaired: { $sum: "$repaired" }, rejected: { $sum: "$rejected" } } }
            ]);

            const warehouseData = await Warehouse.findOne({warehouseName: warehouseName});
            if(!warehouseData) {
                return res.status(404).json({ success: false, message: "Warehouse not found" });
            }

            const defectiveData = await WarehouseItems.aggregate([
                { $match: { warehouse: warehouseData._id } },
                { $unwind: "$items" },
                { $match: { "items.itemName": { $regex: itemName, $options: "i" } } },
                { $group: { _id: null, total: { $sum: "$items.defective" } } }
            ]);

            const defective = defectiveData[0]?.total || 0;
            totalDefective += defective;

            const defectiveTotal = (defectiveCount[0]?.total || 0) + (defectiveIncomingCount[0]?.total || 0);
            const outgoingTotal = (outgoingCount[0]?.total || 0) + (repairedOutgoingCount[0]?.total || 0);
            //const repairedTotal = repairRejectData[0]?.repaired || 0;
            const rejectedTotal = repairRejectData[0]?.rejected || 0;

            totalIncoming += defectiveTotal;
            totalOutgoing += outgoingTotal;
            totalRejected += rejectedTotal;

            const subItems = {
                "Motor": ["MOTOR 3HP AC", "MOTOR 5HP AC", "MOTOR 7.5HP AC", "MOTOR 10HP AC", "MOTOR AC", "MOTOR 3HP DC", "MOTOR 5HP DC", "MOTOR 7.5HP DC", "MOTOR 10HP DC", "MOTOR DC"],
                "Pump": ["PUMP 3HP AC", "PUMP 5HP AC", "PUMP 7.5HP AC", "PUMP 10HP AC", "PUMP 3HP DC", "PUMP 5HP DC", "PUMP 7.5HP DC", "PUMP 10HP DC"],
                "Controller": ["CONTROLLER 3HP AC", "CONTROLLER 5HP AC", "CONTROLLER 7.5HP AC", "CONTROLLER 10HP AC", "CONTROLLER 3HP DC", "CONTROLLER 5HP DC", "CONTROLLER 7.5HP DC", "CONTROLLER 10HP DC", "CONTROLLER RMU"]
            };
            
            //const warehouseId = "67446a8b27dae6f7f4d985dd";
            const selectedSubItems = subItems[itemName] || [];
            
            // Get all matching items once
            const subDefectiveData = await WarehouseItems.aggregate([
                {
                    $match: {
                        warehouse: new mongoose.Types.ObjectId(warehouseData._id)
                    }
                },
                { $unwind: "$items" },
                {
                    $match: {
                        $or: selectedSubItems.map(name => ({
                            "items.itemName": { $regex: name, $options: "i" }
                        }))
                    }
                },
                {
                    $group: {
                        _id: null,
                        data: {
                            $push: {
                                itemName: "$items.itemName",
                                defective: "$items.defective"
                            }
                        }
                    }
                }
            ]);
            
            const grouped = {};
            if (subDefectiveData[0]) {
                for (const { itemName, defective } of subDefectiveData[0].data) {
                    for (const base of selectedSubItems) {
                        if (itemName.toLowerCase().includes(base.toLowerCase())) {
                            grouped[base] = (grouped[base] || 0) + defective;
                            break;
                        }
                    }
                }
            }
            
            const subItemDetails = selectedSubItems.map(sub => ({
                name: sub,
                defective: grouped[sub] || 0
            }));
            
            console.log(subItemDetails);                     

            reportData.push({
                itemName,
                incoming: defectiveTotal,
                outgoing: outgoingTotal,
                toBeRepaired: defective,
                rejected: rejectedTotal,
                subItems: subItemDetails
            });
        }

        const htmlContent = generateHTML(warehouseName, reportData, { totalIncoming, totalOutgoing, totalRepaired, totalRejected, totalDefective });
        const uploadsDir = path.join(__dirname, "../uploads");
        await fs.mkdir(uploadsDir, { recursive: true });
        const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
        const page = await browser.newPage();
        await page.setContent(htmlContent, { waitUntil: "load" });

        const fileName = `${warehouseName}_OverallReport_${moment().format("YYYY-MM-DD")}.pdf`;
        const filePath = path.join(uploadsDir, fileName);
        await page.pdf({ path: filePath, format: "A4", printBackground: true });
        await browser.close();

        res.status(200).json({ message: "PDF saved successfully" });
    } catch (error) {
        console.error("Error generating PDF:", error);
        res.status(500).send("Internal Server Error");
    }
};

