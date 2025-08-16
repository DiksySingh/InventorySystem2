const puppeteer = require("puppeteer");
const fs = require("fs").promises;
const path = require("path");
const moment = require("moment");
const axios = require("axios"); // Import axios for API calls
const PickupItem = require("../../models/serviceInventoryModels/pickupItemSchema");

const fetchFarmerDetails = async (saralId) => {
    try {
        const response = await axios.get(`http://88.222.214.93:8001/inventory/showFarmerForApp?saralId=${saralId}`);
        return response.data.data; // Assuming the API returns farmer data with state info
    } catch (error) {
        console.error(`Error fetching farmer details for Saral ID ${saralId}:`, error);
        return null; // Return null if API call fails
    }
};

const generateHTML = async (data) => {
    let totalOverallQuantity = 0;
    let stateWiseData = {}; // Grouping by state

    for (const item of data) {
        const farmerDetails = await fetchFarmerDetails(item.farmerSaralId);
        const state = farmerDetails?.state || " ";

        if (!stateWiseData[state]) {
            stateWiseData[state] = {
                totalQuantity: 0,
                rows: []
            };
        }

        const totalQuantity = item.items.reduce((sum, it) => sum + it.quantity, 0);
        totalOverallQuantity += totalQuantity;
        stateWiseData[state].totalQuantity += totalQuantity;

        stateWiseData[state].rows.push(`
        <tr>
            <td>${item.farmerSaralId}</td>
            <td>${farmerDetails?.farmerName || " "}</td>
            <td>${item.farmerContact}</td>
            <td>${item.servicePersonName}</td>
            <td>${item.servicePerContact}</td>
            <td>${item.warehouse}</td>
            <td>${totalQuantity}</td>
            <td>${item.items.map(it => `${it.itemName} (x${it.quantity})`).join(", ")}</td>
            <td>${moment(item.pickupDate).format("DD-MM-YYYY")}</td>
            <td>${item.status ? "Received" : "Not Received"}</td>
        </tr>`);
    }

    let stateTables = Object.entries(stateWiseData).map(([state, details]) => {
        return `
        <h3>${state} - Incoming Items</h3>
        <table>
            <thead>
                <tr>
                    <th>Farmer Saral ID</th>
                    <th>Farmer Name</th>
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
                ${details.rows.join("")}
                <tr>
                    <td colspan="6" style="text-align:right; font-weight:bold;">Total for ${state}:</td>
                    <td style="font-weight:bold;">${details.totalQuantity}</td>
                    <td colspan="3"></td>
                </tr>
            </tbody>
        </table>`;
    }).join("<br/>");

    return `
    <html>
    <head>
        <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            h2, h3 { text-align: center; }
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
        ${stateTables}
        <h3>Overall Total Quantity: ${totalOverallQuantity}</h3>
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

        // Generate HTML with state-wise grouping
        const htmlContent = await generateHTML(data);

        const browser = await puppeteer.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        const page = await browser.newPage();
        await page.setContent(htmlContent, { waitUntil: "load" });

        const uploadDir = path.join(__dirname, "../../uploads");
        await fs.mkdir(uploadDir, { recursive: true });

        const fileName = `IncomingItemsReport_${moment().format("YYYY-MM-DD")}.pdf`;
        const filePath = path.join(uploadDir, fileName);

        await page.pdf({ path: filePath, format: "A3", landscape: true, printBackground: true });

        await browser.close();

        console.log(`PDF saved at: ${filePath}`);

        res.status(200).json({ success: true, message: "PDF saved successfully" });

    } catch (error) {
        console.error("Error generating PDF:", error);
        res.status(500).send("Internal Server Error");
    }
};
