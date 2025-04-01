// const puppeteer = require("puppeteer");
// const mongoose = require("mongoose");
// const moment = require("moment");
// const fs = require("fs");
// const path = require("path");
// const PickupItem = require("../models/serviceInventoryModels/pickupItemSchema");
// const WToW = require("../models/serviceInventoryModels/warehouse2WarehouseSchema");

// const generateHTML = (defectiveIncoming, outgoingItems) => {
//     const generateRows = (data) => {
//         return data.map((item) => `
//         <tr>
//           <td>${item._id}</td>  <!-- Use _id as itemName -->
//           <td>${item.quantity}</td>
//         </tr>
//       `).join('');
//     };

//     const totalQuantity = (data) => {
//         return data.reduce((sum, item) => sum + item.quantity, 0);
//     };

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
//         <h3>Bhiwani Daily Report</h3>

//         <!-- Defective Incoming Items -->
//         <h3>Defective Incoming Items</h3>
//         <table>
//             <thead>
//                 <tr>
//                     <th>Item Name</th>
//                     <th>Quantity</th>
//                 </tr>
//             </thead>
//             <tbody>
//                 ${generateRows(defectiveIncoming)}
//             </tbody>
//             <tfoot>
//                 <tr>
//                     <th>Total</th>
//                     <th>${totalQuantity(defectiveIncoming)}</th>
//                 </tr>
//             </tfoot>
//         </table>

//         <!-- Outgoing Items -->
//         <h3>Outgoing Items</h3>
//         <table>
//             <thead>
//                 <tr>
//                     <th>Item Name</th>
//                     <th>Quantity</th>
//                 </tr>
//             </thead>
//             <tbody>
//                 ${generateRows(outgoingItems)}
//             </tbody>
//             <tfoot>
//                 <tr>
//                     <th>Total</th>
//                     <th>${totalQuantity(outgoingItems)}</th>
//                 </tr>
//             </tfoot>
//         </table>

//         <div class="footer">Generated on ${moment().format("DD-MM-YYYY")}</div>
//     </body>
//     </html>`;
// };

// module.exports.generateBhiwaniOverallReport = async (req, res) => {
//     try {
//         const startTime = moment().subtract(1, "days").hour(17).minute(14).second(0).millisecond(0).subtract(5, "hours").subtract(30, "minutes");
//         const endTime = moment().hour(17).minute(14).second(0).millisecond(0).subtract(5, "hours").subtract(30, "minutes");

//         const utcStart = startTime.utc().toDate();
//         const utcEnd = endTime.utc().toDate();
//         console.log(utcStart);
//         console.log(utcEnd);

//         // Defective Incoming Items (PickupItem and WToW)
//         const defectiveIncomingFromPickupItem = await PickupItem.aggregate([
//             { $match: { warehouse: "Bhiwani", incoming: true, pickupDate: { $gte: utcStart, $lt: utcEnd } } },
//             { $unwind: "$items" },
//             { $group: { _id: "$items.itemName", quantity: { $sum: "$items.quantity" } } }
//         ]);
//         console.log(defectiveIncomingFromPickupItem)

//         const defectiveIncomingFromWToW = await WToW.aggregate([
//             { $match: { toWarehouse: "Bhiwani", isDefective: true, pickupDate: { $gte: utcStart, $lt: utcEnd } } },
//             { $unwind: "$items" },
//             { $group: { _id: "$items.itemName", quantity: { $sum: "$items.quantity" } } }
//         ]);
//         console.log(defectiveIncomingFromWToW)
//         const defectiveIncoming = [
//             ...defectiveIncomingFromPickupItem,
//             ...defectiveIncomingFromWToW
//         ];
//         console.log(defectiveIncoming);

//         // Outgoing Items (PickupItem and WToW)
//         const outgoingFromPickupItem = await PickupItem.aggregate([
//             { $match: { warehouse: "Bhiwani", incoming: false, pickupDate: { $gte: utcStart, $lt: utcEnd } } },
//             { $unwind: "$items" },
//             { $group: { _id: "$items.itemName", quantity: { $sum: "$items.quantity" } } }
//         ]);
//         console.log(outgoingFromPickupItem)
//         const outgoingFromWToW = await WToW.aggregate([
//             { $match: { fromWarehouse: "Bhiwani", isDefective: false, pickupDate: { $gte: utcStart, $lt: utcEnd } } },
//             { $unwind: "$items" },
//             { $group: { _id: "$items.itemName", quantity: { $sum: "$items.quantity" } } }
//         ]);
//         console.log(outgoingFromWToW);
//         const outgoingItems = [
//             ...outgoingFromPickupItem,
//             ...outgoingFromWToW
//         ];
//         console.log(outgoingItems);
//         // Generate the HTML report
//         const htmlContent = generateHTML(defectiveIncoming, outgoingItems);

//         // Launch Puppeteer to generate PDF
//         const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
//         const page = await browser.newPage();
//         await page.setContent(htmlContent, { waitUntil: "load" });

//         const fileName = `BhiwaniOverallReport_${moment().format("YYYY-MM-DD")}.pdf`;
//         const filePath = path.join(__dirname, "../uploads", fileName);
//         await page.pdf({ path: filePath, format: "A4", printBackground: true });
//         await browser.close();

//         // Return response
//         res.status(200).json({ message: "PDF saved successfully", filePath: filePath });
//     } catch (error) {
//         console.error("Error generating PDF:", error);
//         res.status(500).send("Internal Server Error");
//     }
// };

const puppeteer = require("puppeteer");
const mongoose = require("mongoose");
const moment = require("moment");
const fs = require("fs");
const path = require("path");
const PickupItem = require("../models/serviceInventoryModels/pickupItemSchema");
const WToW = require("../models/serviceInventoryModels/warehouse2WarehouseSchema");
const RepairNRejectItems = require("../models/serviceInventoryModels/repairNRejectSchema");

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
        <h3>Bhiwani Daily Report</h3>
  
        <!-- Defective Incoming Items -->
        <h3>Defective Incoming Items</h3>
        <table>
            <thead>
                <tr>
                    <th>Item Name</th>
                    <th>Quantity</th>
                </tr>
            </thead>
            <tbody>
                ${generateRows(defectiveIncoming)}
            </tbody>
            <tfoot>
                <tr>
                    <th>Total</th>
                    <th>${totalQuantity(defectiveIncoming)}</th>
                </tr>
            </tfoot>
        </table>
  
        <!-- Outgoing Items -->
        <h3>Outgoing Items</h3>
        <table>
            <thead>
                <tr>
                    <th>Item Name</th>
                    <th>Quantity</th>
                </tr>
            </thead>
            <tbody>
                ${generateRows(outgoingItems)}
            </tbody>
            <tfoot>
                <tr>
                    <th>Total</th>
                    <th>${totalQuantity(outgoingItems)}</th>
                </tr>
            </tfoot>
        </table>

        <!-- Repaired Items -->
        <h3>Repaired Items</h3>
        <table>
            <thead>
                <tr>
                    <th>Item Name</th>
                    <th>Quantity</th>
                </tr>
            </thead>
            <tbody>
                ${generateRows(repairedItems)}
            </tbody>
            <tfoot>
                <tr>
                    <th>Total</th>
                    <th>${totalQuantity(repairedItems)}</th>
                </tr>
            </tfoot>
        </table>

        <!-- Rejected Items -->
        <h3>Rejected Items</h3>
        <table>
            <thead>
                <tr>
                    <th>Item Name</th>
                    <th>Quantity</th>
                </tr>
            </thead>
            <tbody>
                ${generateRows(rejectedItems)}
            </tbody>
            <tfoot>
                <tr>
                    <th>Total</th>
                    <th>${totalQuantity(rejectedItems)}</th>
                </tr>
            </tfoot>
        </table>
  
        <div class="footer">Generated on ${moment().format("DD-MM-YYYY")}</div>
    </body>
    </html>`;
};

module.exports.generateBhiwaniOverallReport = async (req, res) => {
    try {
        const startTime = moment().subtract(1, "days").hour(17).minute(14).second(0).millisecond(0).subtract(5, "hours").subtract(30, "minutes");
        const endTime = moment().hour(17).minute(14).second(0).millisecond(0).subtract(5, "hours").subtract(30, "minutes");

        const utcStart = startTime.utc().toDate();
        const utcEnd = endTime.utc().toDate();

        // Defective Incoming Items
        const defectiveIncoming = await PickupItem.aggregate([
            { $match: { warehouse: "Bhiwani", incoming: true, pickupDate: { $gte: utcStart, $lt: utcEnd } } },
            { $unwind: "$items" },
            { $group: { _id: "$items.itemName", quantity: { $sum: "$items.quantity" } } }
        ]);

        // Outgoing Items
        const outgoingItems = await PickupItem.aggregate([
            { $match: { warehouse: "Bhiwani", incoming: false, pickupDate: { $gte: utcStart, $lt: utcEnd } } },
            { $unwind: "$items" },
            { $group: { _id: "$items.itemName", quantity: { $sum: "$items.quantity" } } }
        ]);

        // Repaired Items
        const repairedItems = await RepairNRejectItems.aggregate([
            { $match: { warehouseName: "Bhiwani", isRepaired: true, createdAt: { $gte: utcStart, $lt: utcEnd } } },
            { $group: { _id: "$itemName", quantity: { $sum: "$repaired" } } }
        ]);

        // Rejected Items
        const rejectedItems = await RepairNRejectItems.aggregate([
            { $match: { warehouseName: "Bhiwani", isRepaired: false, createdAt: { $gte: utcStart, $lt: utcEnd } } },
            { $group: { _id: "$itemName", quantity: { $sum: "$rejected" } } }
        ]);

        // Generate the HTML report
        const htmlContent = generateHTML(defectiveIncoming, outgoingItems, repairedItems, rejectedItems);

        // Launch Puppeteer to generate PDF
        const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
        const page = await browser.newPage();
        await page.setContent(htmlContent, { waitUntil: "load" });

        const fileName = `BhiwaniDailyItemsInOutReport_${moment().format("YYYY-MM-DD")}.pdf`;
        const filePath = path.join(__dirname, "../uploads", fileName);
        await page.pdf({ path: filePath, format: "A4", printBackground: true });
        await browser.close();

        // Return response
        res.status(200).json({ message: "PDF saved successfully"});
    } catch (error) {
        console.error("Error generating PDF:", error);
        res.status(500).send("Internal Server Error");
    }
};

