const puppeteer = require("puppeteer");
const fs = require("fs").promises;
const path = require("path");
const IncomingItemDetails = require("../models/serviceInventoryModels/incomingItemsTotal");

// const generateHTML = (data) => {
//     let rows = data.map(
//         (item) => `
//         <tr>
//             <td>${item.name}</td>
//             <td>${item.contact}</td>
//             <td>${item.total}</td>
//             <td>${item.itemList.map(it => `${it.itemName} (x${it.quantity})`).join(", ")}</td>
//         </tr>`
//     ).join("");

//     return `
//     <html>
//     <head>
//         <style>
//             h2 { text-align: center; }
//             body { font-family: Arial, sans-serif; margin: 20px; }
//             table { 
//                 width: 90%; 
//                 border-collapse: collapse; 
//                 margin: auto; /* Centers the table */
//             }
//             th, td { 
//                 border: 1px solid black; 
//                 padding: 8px; 
//                 text-align: left; 
//             }
//             th { background-color: #f2f2f2; }
//             .footer { 
//                 font-weight: bold; 
//                 text-align: center; 
//                 margin-top: 15px;
//             }
//             /* Page setup for printing */
//             @media print {
//                 @page { margin-top: 40px; } /* Adds margin at the top of every new page */
//                 table { page-break-inside: auto; }
//                 tr { page-break-inside: avoid; page-break-after: auto; }
//                 thead { display: table-header-group; }
//                 tfoot { display: table-footer-group; }
//             }
//         </style>
//     </head>
//     <body>
//         <h2>Items Report - Service Person</h2>
//         <table>
//             <thead>
//                 <tr>
//                     <th>Name</th>
//                     <th>Contact</th>
//                     <th>Total Quantity</th>
//                     <th>Items List</th>
//                 </tr>
//             </thead>
//             <tbody>
//                 ${rows}
//             </tbody>
//         </table>
//         <div class="footer">Generated on ${new Date().toLocaleDateString()}</div>
//     </body>
//     </html>`;
// };

const generateHTML = (data) => {
    // Calculate total quantity
    const totalQuantity = data.reduce((sum, item) => sum + item.total, 0);

    let rows = data.map(
        (item) => `
        <tr>
            <td>${item.name}</td>
            <td>${item.contact}</td>
            <td>${item.total}</td>
            <td>${item.itemList.map(it => `${it.itemName} (x${it.quantity})`).join(", ")}</td>
        </tr>`
    ).join("");

    return `
    <html>
    <head>
        <style>
            h2 { text-align: center; }
            body { font-family: Arial, sans-serif; margin: 20px; }
            table { 
                width: 90%; 
                border-collapse: collapse; 
                margin: auto; /* Centers the table */
            }
            th, td { 
                border: 1px solid black; 
                padding: 8px; 
                text-align: left; 
            }
            th { background-color: #f2f2f2; }
            .footer { 
                font-weight: bold; 
                text-align: center; 
                margin-top: 15px;
            }
            /* Page setup for printing */
            @media print {
                @page { margin-top: 40px; } /* Adds margin at the top of every new page */
                table { page-break-inside: auto; }
                tr { page-break-inside: avoid; page-break-after: auto; }
                thead { display: table-header-group; }
                tfoot { display: table-footer-group; }
            }
            /* Style for the total row */
            .total-row {
                font-weight: bold;
                background-color: #f2f2f2;
            }
        </style>
    </head>
    <body>
        <h2>Items Report - Service Person</h2>
        <table>
            <thead>
                <tr>
                    <th>Name</th>
                    <th>Contact</th>
                    <th>Total Quantity</th>
                    <th>Items List</th>
                </tr>
            </thead>
            <tbody>
                ${rows}
                <!-- Total Row -->
                <tr class="total-row">
                    <td colspan="2" style="text-align: right;">Total:</td>
                    <td>${totalQuantity}</td>
                    <td></td>
                </tr>
            </tbody>
        </table>
        <div class="footer">Generated on ${new Date().toLocaleDateString()}</div>
    </body>
    </html>`;
};


exports.generateIncomingItemsPDF = async (req, res) => {
    try {
        // Fetch data from MongoDB
        const data = await IncomingItemDetails.aggregate([
            {
                $lookup: {
                    from: "inServicePersons",
                    localField: "servicePerson",
                    foreignField: "_id",
                    as: "servicePersonDetails"
                }
            },
            { $unwind: "$servicePersonDetails" },
            {
                $match: {
                    "servicePersonDetails.name": { 
                        $nin: ["Atul Singh", "Nitesh Kumar"]  // Exclude these names
                    }
                }
            },
            {
                $group: {
                    _id: "$servicePerson",
                    name: { $first: "$servicePersonDetails.name" },
                    contact: { $first: "$servicePersonDetails.contact" },
                    total: { $sum: { $sum: "$items.quantity" } },
                    itemList: {
                        $push: {
                            $filter: {
                                input: "$items",
                                as: "item",
                                cond: { $gt: ["$$item.quantity", 0] }
                            }
                        }
                    }
                }
            },
            {
                $project: {
                    _id: 0,
                    name: 1,
                    contact: 1,
                    total: 1,
                    itemList: {
                        $reduce: {
                            input: "$itemList",
                            initialValue: [],
                            in: { $concatArrays: ["$$value", "$$this"] }
                        }
                    }
                }
            }
        ]);

        // Ensure uploads directory exists
        const uploadDir = path.join(__dirname, "../uploads");
        await fs.mkdir(uploadDir, { recursive: true });

        // Generate HTML content
        const htmlContent = generateHTML(data);

        // Launch Puppeteer and generate PDF
        const browser = await puppeteer.launch({
            headless: true, // Ensures it runs in headless mode
            args: ['--no-sandbox', '--disable-setuid-sandbox'] 
        });
        const page = await browser.newPage();
        await page.setContent(htmlContent, { waitUntil: "networkidle0" });
        const date = new Date().toISOString().split('T')[0];
        // Define file path for saving
        const filePath = path.join(uploadDir, `ItemsReport_${date}.pdf`);
        await page.pdf({ path: filePath, format: "A3", landscape: true, printBackground: true });

        await browser.close();

        // Send success response (without file path)
        res.status(200).json({
            message: "PDF has been successfully generated"
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Failed to generate PDF" });
    }
};
