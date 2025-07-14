const puppeteer = require("puppeteer");
const fs = require("fs").promises;
const path = require("path");
const OutgoingItemsTotal = require("../../models/serviceInventoryModels/outgoingItemsTotal");

const generateHTML = (data) => {
  let grandTotal = 0;
  console.log(data);

  let rows = data
    .map((stateData) => {
      let stateTotal = stateData.stateTotal;
      grandTotal += stateTotal;

      let servicePersonsRows = stateData.servicePersons
        .map(
          (item) => `
          <tr>
              <td>${item.name}</td>
              <td>${item.contact}</td>
              <td>${item.total}</td>
              <td>${item.itemList
                .map((it) => `${it.itemName} (x${it.quantity})`)
                .join(", ")}</td>
          </tr>`
        )
        .join("");

      return `
        <tr class="state-header">
            <td colspan="4"><strong>State: ${stateData._id}</strong></td>
        </tr>
        ${servicePersonsRows}
        <tr class="total-row">
            <td colspan="2" style="text-align: right;">Total for ${stateData._id}:</td>
            <td>${stateTotal}</td>
            <td></td>
        </tr>
      `;
    })
    .join("");

  return `
    <html>
    <head>
        <style>
            h2 { text-align: center; }
            body { font-family: Arial, sans-serif; margin: 20px; }
            table { 
                width: 90%; 
                border-collapse: collapse; 
                margin: auto;
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
            .state-header {
                background-color: #d9edf7;
                font-weight: bold;
            }
            .total-row {
                font-weight: bold;
                background-color: #f2f2f2;
            }
            /* Page setup for printing */
            @media print {
                @page { margin-top: 40px; } /* Adds margin at the top of every new page */
                table { page-break-inside: auto; }
                tr { page-break-inside: avoid; page-break-after: auto; }
                thead { display: table-header-group; }
                tfoot { display: table-footer-group; }
            }
        </style>
    </head>
    <body>
        <h2>Repaired Items On Service Person (State Wise)</h2>
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
                <tr class="total-row">
                    <td colspan="2" style="text-align: right;">Grand Total:</td>
                    <td>${grandTotal}</td>
                    <td></td>
                </tr>
            </tbody>
        </table>
        <div class="footer">Generated on ${new Date().toLocaleDateString()}</div>
    </body>
    </html>`;
};

exports.servicePersonRepairedHoldingItemsPDF = async (req, res) => {
  try {
    // Fetch data from MongoDB with state-wise grouping
    const data = await OutgoingItemsTotal.aggregate([
      {
        $lookup: {
          from: "inServicePersons",
          localField: "servicePerson",
          foreignField: "_id",
          as: "servicePersonDetails",
        },
      },
      { $unwind: "$servicePersonDetails" },
      {
        $match: {
          "servicePersonDetails.name": { $nin: ["Atul Singh", "Nitesh Kumar"] }, // Exclude specific names
          "servicePersonDetails.isActive": true, // Include only active service persons
        },
      },
      {
        $group: {
          _id: {
            state: "$servicePersonDetails.state",
            servicePerson: "$servicePerson",
          },
          name: { $first: "$servicePersonDetails.name" },
          contact: { $first: "$servicePersonDetails.contact" },
          state: { $first: "$servicePersonDetails.state" },
          totalItems: { $sum: { $sum: "$items.quantity" } },
          itemList: {
            $push: {
              $filter: {
                input: "$items",
                as: "item",
                cond: { $gt: ["$$item.quantity", 0] },
              },
            },
          },
        },
      },
      {
        $project: {
          _id: 0,
          state: 1,
          name: 1,
          contact: 1,
          totalItems: 1,
          itemList: {
            $reduce: {
              input: "$itemList",
              initialValue: [],
              in: { $concatArrays: ["$$value", "$$this"] },
            },
          },
        },
      },
      {
        $group: {
          _id: "$state",
          servicePersons: {
            $push: {
              name: "$name",
              contact: "$contact",
              total: "$totalItems",
              itemList: "$itemList",
            },
          },
          stateTotal: { $sum: "$totalItems" },
        },
      },
      {
        $sort: { _id: 1 }, // Sort states alphabetically
      },
    ]);    

    // Ensure uploads directory exists
    const uploadDir = path.join(__dirname, "../uploads");
    await fs.mkdir(uploadDir, { recursive: true });

    // Generate HTML content
    const htmlContent = generateHTML(data);

    // Launch Puppeteer and generate PDF
    const browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });
    const page = await browser.newPage();
    await page.setContent(htmlContent, { waitUntil: "networkidle0" });

    const date = new Date().toISOString().split("T")[0];
    const filePath = path.join(uploadDir, `SPRepairedItemsHoldingReport_${date}.pdf`);

    await page.pdf({
      path: filePath,
      format: "A3",
      landscape: true,
      printBackground: true,
    });

    await browser.close();

    res.status(200).json({
      message: "PDF has been successfully generated",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to generate PDF" });
  }
};
