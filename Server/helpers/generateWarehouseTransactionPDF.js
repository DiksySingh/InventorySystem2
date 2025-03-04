const puppeteer = require("puppeteer");
const fs = require("fs").promises;
const path = require("path");
const moment = require("moment");
const PickupItem = require("../models/serviceInventoryModels/pickupItemSchema");

// const generateHTML = (data) => {
//     let rows = data.map(
//         (item) => {
//             const totalQuantity = item.items.reduce((sum, it) => sum + it.quantity, 0); // Sum all item quantities

//             return `
//             <tr>
//                 <td>${item.warehouse}</td>
//                 <td>${item.farmerSaralId}</td>
//                 <td>${item.farmerContact}</td>
//                 <td>${item.servicePersonName}</td>
//                 <td>${item.servicePerContact}</td>
//                 <td>${totalQuantity}</td>
//                 <td>${item.items.map(it => `${it.itemName} (x${it.quantity})`).join(", ")}</td>
//                 <td>${moment(item.pickupDate).format("DD-MM-YYYY")}</td>
//             </tr>`;
//         }
//     ).join("");

//     return `
//     <html>
//     <head>
//         <style>
//             body { font-family: Arial, sans-serif; margin: 20px; }
//             h2 { text-align: center; }
//             table { width: 100%; border-collapse: collapse; margin: auto; }
//             th, td { border: 1px solid black; padding: 8px; text-align: left; }
//             th { background-color: #f2f2f2; }
//             .footer { text-align: center; margin-top: 15px; font-weight: bold; }
//             @media print {
//                 @page { margin-top: 40px; }
//                 table { page-break-inside: auto; }
//                 tr { page-break-inside: avoid; page-break-after: auto; }
//                 thead { display: table-header-group; }
//             }
//         </style>
//     </head>
//     <body>
//         <h2>Warehouse Outgoing Items Report</h2>
//         <table>
//             <thead>
//                 <tr>
//                     <th>Warehouse</th>
//                     <th>Farmer Saral ID</th>
//                     <th>Farmer Contact</th>
//                     <th>Service Person</th>
//                     <th>Contact</th>
//                     <th>Total Quantity</th>
//                     <th>Items</th>
//                     <th>Pickup Date</th>
//                 </tr>
//             </thead>
//             <tbody>
//                 ${rows}
//             </tbody>
//         </table>
//         <div class="footer">Generated on ${moment().format("DD-MM-YYYY")}</div>
//     </body>
//     </html>`;
// };

// module.exports.generateWarehouseTransactionPDF = async (req, res) => {
//     try {
//         const localNow = moment().startOf("day"); // Local start of day (00:00 in local timezone)
//         const utcStart = localNow.utc().toDate(); // Convert to UTC
        
//         // Correct UTC end of day calculation
//         const utcEnd = moment(utcStart).add(1, "day").subtract(1, "millisecond").toDate();

//         console.log("UTC Start:", utcStart);  // Debugging
//         console.log("UTC End:", utcEnd);

//         // Fetch filtered data from MongoDB (Convert pickupDate to UTC before comparison)
//         const data = await PickupItem.find({
//             incoming: false,
//             pickupDate: { $gte: utcStart, $lt: utcEnd }  // Filter for today's UTC range
//         }).populate("servicePerson");

//         if (!data.length) {
//             return res.status(404).send("No records found for today.");
//         }

//         // Generate HTML
//         const htmlContent = generateHTML(data);

//         // Launch Puppeteer to convert HTML to PDF
//         const browser = await puppeteer.launch();
//         const page = await browser.newPage();
//         await page.setContent(htmlContent, { waitUntil: "load" });

//         // Ensure `uploads` folder exists
//         const uploadDir = path.join(__dirname, "../uploads");
//         await fs.mkdir(uploadDir, { recursive: true });

//         // File path
//         const fileName = `OutgoingItemsReport_${moment().format("YYYY-MM-DD")}.pdf`;
//         const filePath = path.join(uploadDir, fileName);

//         // Generate PDF and save it
//         await page.pdf({ path: filePath, format: "A3", landscape: true, printBackground: true });

//         await browser.close();

//         console.log(`PDF saved at: ${filePath}`); // Debugging log

//         res.status(200).json({ message: "PDF saved successfully", filePath });

//     } catch (error) {
//         console.error("Error generating PDF:", error);
//         res.status(500).send("Internal Server Error");
//     }
// };


const generateHTML = (data) => {
    let rows = data.map((item) => {
        const totalQuantity = item.items.reduce((sum, it) => sum + it.quantity, 0);

        return `
        <tr>
            <td>${item.farmerSaralId}</td>
            <td>${item.farmerContact}</td>
            <td>${item.servicePersonName}</td>
            <td>${item.servicePerContact}</td>
            <td>${item.warehouse}</td>
            <td>${totalQuantity}</td>
            <td>${item.items.map(it => `${it.itemName} (x${it.quantity})`).join(", ")}</td>
            <td>${moment(item.pickupDate).format("DD-MM-YYYY")}</td>
        </tr>`;
    }).join("");

    // If no rows, show a "No Data" message
    if (!rows) {
        rows = `<tr><td colspan="8" style="text-align:center; font-weight:bold;">No records available for today.</td></tr>`;
    }

    return `
    <html>
    <head>
        <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            h2 { text-align: center; }
            table { width: 100%; border-collapse: collapse; margin: auto; }
            th, td { border: 1px solid black; padding: 8px; text-align: left; }
            th { background-color:rgb(240, 161, 161);  }
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
        <h2>Warehouse Outgoing Items Report</h2>
        <table>
            <thead>
                <tr>  
                    <th>Farmer Saral ID</th>
                    <th>Farmer Contact</th>
                    <th>Service Person</th>
                    <th>Contact</th>
                    <th>From Warehouse</th>
                    <th>Total Quantity</th>
                    <th>Items</th>
                    <th>Pickup Date</th>
                </tr>
            </thead>
            <tbody>
                ${rows}
            </tbody>
        </table>
        <div class="footer">Generated on ${moment().format("DD-MM-YYYY")}</div>
    </body>
    </html>`;
};

module.exports.generateWarehouseTransactionPDF = async (req, res) => {
    try {
        const now = moment(); 
        const startTime = moment().subtract(1, "days").hour(17).minute(14).second(0).millisecond(0).subtract(5, "hours").subtract(30, "minutes"); 
        const endTime = moment().hour(17).minute(14).second(0).millisecond(0).subtract(5, "hours").subtract(30, "minutes"); 
        
        const utcStart = startTime.utc().toDate();
        const utcEnd = endTime.utc().toDate();
        console.log("UTC Start:", utcStart);
        console.log("UTC End:", utcEnd);

        const data = await PickupItem.find({
            incoming: false,
            pickupDate: { $gte: utcStart, $lt: utcEnd }
        }).populate("servicePerson");

        // Generate HTML, even if no data is found
        const htmlContent = generateHTML(data);

        const browser = await puppeteer.launch({
            headless: true, // Ensures it runs in headless mode
            args: ['--no-sandbox', '--disable-setuid-sandbox'] 
        });
        const page = await browser.newPage();
        await page.setContent(htmlContent, { waitUntil: "load" });

        const uploadDir = path.join(__dirname, "../uploads");
        await fs.mkdir(uploadDir, { recursive: true });

        const fileName = `OutgoingItemsReport_${moment().format("YYYY-MM-DD")}.pdf`;
        const filePath = path.join(uploadDir, fileName);

        await page.pdf({ path: filePath, format: "A3", landscape: true, printBackground: true });

        await browser.close();

        console.log(`PDF saved at: ${filePath}`);

        res.status(200).json({ message: "PDF saved successfully"});

    } catch (error) {
        console.error("Error generating PDF:", error);
        res.status(500).send("Internal Server Error");
    }
};
