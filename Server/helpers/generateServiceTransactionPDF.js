const puppeteer = require("puppeteer");
const fs = require("fs").promises;
const path = require("path");
const moment = require("moment");
const PickupItem = require("../models/serviceInventoryModels/pickupItemSchema");

const generateHTML = (data) => {
    let totalOverallQuantity = 0;

    let rows = data.map((item) => {
        const totalQuantity = item.items.reduce((sum, it) => sum + it.quantity, 0);
        totalOverallQuantity += totalQuantity; // Accumulate the total

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
            <td>${item.status ? "Received" : "Not Received"}</td>
        </tr>`;
    }).join("");

    // If no rows, show a "No Data" message
    if (!rows) {
        rows = `<tr><td colspan="9" style="text-align:center; font-weight:bold;">No records available for today.</td></tr>`;
    }

    // Add the total row at the bottom
    const totalRow = `
    <tr>
        <td colspan="5" style="text-align:right; font-weight:bold;">Overall Total Quantity:</td>
        <td style="font-weight:bold;">${totalOverallQuantity}</td>
        <td colspan="3"></td>
    </tr>`;

    return `
    <html>
    <head>
        <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            h2 { text-align: center; }
            table { width: 100%; border-collapse: collapse; margin: auto; }
            th, td { border: 1px solid black; padding: 8px; text-align: left; }
            th { background-color:rgb(240, 161, 161); }
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
        <h2>Warehouse Incoming Items Report</h2>
        <table>
            <thead>
                <tr>
                    <th>Farmer Saral ID</th>
                    <th>Farmer Contact</th>
                    <th>Service Person</th>
                    <th>Contact</th>
                    <th>To Warehouse</th>
                    <th>Total Quantity</th>
                    <th>Items</th>
                    <th>Pickup Date</th>
                    <th>Status</th>
                </tr>
            </thead>
            <tbody>
                ${rows}
                ${totalRow} <!-- Add the total row -->
            </tbody>
        </table>
        <div class="footer">Generated on ${moment().format("DD-MM-YYYY")}</div>
    </body>
    </html>`;
};

module.exports.generateServicePersonTransactionPDF = async (req, res) => {
    try {
        const now = moment();
        const startTime = moment().subtract(1, "days").hour(17).minute(14).second(0).millisecond(0).subtract(5, "hours").subtract(30, "minutes");
        const endTime = moment().hour(17).minute(14).second(0).millisecond(0).subtract(5, "hours").subtract(30, "minutes");

        const utcStart = startTime.utc().toDate();
        const utcEnd = endTime.utc().toDate();

        console.log("UTC Start:", utcStart);
        console.log("UTC End:", utcEnd);

        const data = await PickupItem.find({
            incoming: true,
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

        const fileName = `IncomingItemsReport_${moment().format("YYYY-MM-DD")}.pdf`;
        const filePath = path.join(uploadDir, fileName);

        await page.pdf({ path: filePath, format: "A3", landscape: true, printBackground: true });

        await browser.close();

        console.log(`PDF saved at: ${filePath}`);

        res.status(200).json({ message: "PDF saved successfully" });

    } catch (error) {
        console.error("Error generating PDF:", error);
        res.status(500).send("Internal Server Error");
    }
};