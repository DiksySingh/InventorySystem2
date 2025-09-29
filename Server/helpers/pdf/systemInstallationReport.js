const path = require("path");
const fs = require("fs/promises");
const puppeteer = require("puppeteer");
const SystemItemMap = require("../../models/systemInventoryModels/systemItemMapSchema");
const ItemComponentMap = require("../../models/systemInventoryModels/itemComponentMapSchema");
const InstallationInventory = require("../../models/systemInventoryModels/installationInventorySchema");
const System = require("../../models/systemInventoryModels/systemSchema");
const Warehouse = require("../../models/serviceInventoryModels/warehouseSchema");

const installationInventoryStockReport = async (req, res) => {
  try {
    const { id } = req.query;

    // Fetch inventory
    const inventories = await InstallationInventory.find({ warehouseId: id })
      .populate("warehouseId", "warehouseName")
      .populate("systemItemId", "itemName");

    if (!inventories.length) {
      return res
        .status(404)
        .json({ message: "No inventory found for this warehouse" });
    }

    const warehouseName =
      inventories[0].warehouseId?.warehouseName || "Unknown_Warehouse";

    // HTML Template
    const html = `
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; margin: 40px; }
            h1 { text-align: center; margin-bottom: 30px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #333; padding: 8px; text-align: center; }
            th { background-color: #f2f2f2; font-size: 14px; }
            td { font-size: 12px; }
          </style>
        </head>
        <body>
          <h1>Installation Inventory of ${warehouseName}</h1>
          <table>
            <thead>
              <tr>
                <th>Item Name</th>
                <th>Quantity</th>
              </tr>
            </thead>
            <tbody>
              ${inventories
                .map(
                  (inv) => `
                <tr>
                  <td>${inv.systemItemId?.itemName || "Unknown"}</td>
                  <td>${inv.quantity}</td>
                </tr>`
                )
                .join("")}
            </tbody>
          </table>
          <p style="text-align:right; margin-top:30px; font-size:10px;">
            Generated on: ${new Date().toLocaleString()}
          </p>
        </body>
      </html>
    `;

    // Puppeteer launch
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0" });

    // Ensure uploads folder exists
    const uploadDir = path.join(__dirname, "../../uploads");
    await fs.mkdir(uploadDir, { recursive: true });

    // File path
    const filePath = path.join(
      uploadDir,
      `InstallationInventory_${warehouseName}.pdf`
    );

    // Generate PDF
    await page.pdf({
      path: filePath,
      format: "A4",
      printBackground: true,
      margin: { top: "40px", bottom: "40px", left: "20px", right: "20px" },
    });

    await browser.close();

    res.json({
      success: true,
      message: "PDF generated successfully",
      //filePath: `/uploads/InstallationInventory_${warehouseName}.pdf`,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      message: "Error generating PDF",
      error: err.message,
    });
  }
};

// // Systems we care about
// const SYSTEMS_TO_CHECK = ["3HP DC", "5HP DC", "7.5HP DC"];

// // Helper: Calculate pump-wise sets for a system
// async function calculatePumpWiseSets(system, warehouseId, inventoryMap) {
//   const systemMaps = await SystemItemMap.find({ systemId: system._id })
//     .populate("systemItemId", "itemName");

//   const pumpVariants = systemMaps.filter((m) =>
//     m.systemItemId.itemName.toLowerCase().includes("pump")
//   );

//   const pumpWise = [];

//   for (const pumpMap of pumpVariants) {
//     const pumpName = pumpMap.systemItemId.itemName;

//     // Get subcomponents (if any)
//     const subItems = await ItemComponentMap.find({
//       systemId: system._id,
//       systemItemId: pumpMap.systemItemId._id,
//     }).populate("subItemId", "itemName");

//     const requiredItems = [
//       { name: pumpName, qty: pumpMap.quantity },
//       ...subItems.map((s) => ({
//         name: s.subItemId.itemName,
//         qty: s.quantity,
//       })),
//     ];

//     let setsAvailable = Infinity;
//     for (const req of requiredItems) {
//       const available = Math.floor((inventoryMap[req.name] || 0) / req.qty);
//       setsAvailable = Math.min(setsAvailable, available);
//     }

//     pumpWise.push({
//       pumpVariant: pumpName,
//       setsAvailable: setsAvailable === Infinity ? 0 : setsAvailable,
//     });
//   }

//   return pumpWise;
// }

// // Main Controller
// const systemSetReport = async (req, res) => {
//   try {
//     const { warehouseId } = req.query;
//     if (!warehouseId) {
//       return res.status(400).json({ message: "warehouseId is required" });
//     }

//     const warehouse = await Warehouse.findById(warehouseId);
//     if (!warehouse) {
//       return res.status(404).json({ message: "Warehouse not found" });
//     }

//     // Build inventory map
//     const inventories = await InstallationInventory.find({ warehouseId })
//       .populate("systemItemId", "itemName");

//     const inventoryMap = {};
//     inventories.forEach((inv) => {
//       inventoryMap[inv.systemItemId.itemName] = inv.quantity;
//     });

//     // Fetch systems (match "3HP DC" → "3HP DC System")
//     const systems = await System.find({
//       systemName: {
//         $in: SYSTEMS_TO_CHECK.map((s) => new RegExp(`^${s}(\\sSystem)?$`, "i")),
//       },
//     });

//     if (!systems.length) {
//       return res.status(404).json({ message: "No systems found in DB" });
//     }

//     const results = [];
//     for (const sys of systems) {
//       const pumpWise = await calculatePumpWiseSets(sys, warehouseId, inventoryMap);
//       results.push({ systemName: sys.systemName, pumps: pumpWise });
//     }

//     // Build HTML
//     const tableHtml = results
//       .map(
//         (sys) => `
//       <h2>${sys.systemName}</h2>
//       <table>
//         <thead>
//           <tr>
//             <th>Pump Variant</th>
//             <th>Sets Available</th>
//           </tr>
//         </thead>
//         <tbody>
//           ${sys.pumps
//             .map(
//               (p) => `
//             <tr>
//               <td>${p.pumpVariant}</td>
//               <td>${p.setsAvailable}</td>
//             </tr>
//           `
//             )
//             .join("")}
//         </tbody>
//       </table>
//     `
//       )
//       .join("<br/>");

//     const html = `
//       <html>
//         <head>
//           <style>
//             body { font-family: Arial, sans-serif; margin: 20px; }
//             h1, h2 { text-align: center; }
//             table { width: 100%; border-collapse: collapse; margin-top: 10px; }
//             th, td { border: 1px solid #000; padding: 8px; text-align: center; }
//             th { background: #f2f2f2; }
//           </style>
//         </head>
//         <body>
//           <h1>Installation Inventory Report</h1>
//           <h2>Warehouse: ${warehouse.warehouseName}</h2>
//           ${tableHtml}
//         </body>
//       </html>
//     `;

//     // Generate PDF
//     const browser = await puppeteer.launch();
//     const page = await browser.newPage();
//     await page.setContent(html, { waitUntil: "networkidle0" });

//     const uploadDir = path.join(__dirname, "../../uploads/reports");
//     await fs.mkdir(uploadDir, { recursive: true });

//     const filePath = path.join(
//       uploadDir,
//       `SystemReport_${warehouse.warehouseName}.pdf`
//     );
//     await page.pdf({ path: filePath, format: "A4" });
//     await browser.close();

//     res.json({
//       success: true,
//       message: "PDF generated successfully",
//       filePath: `/uploads/reports/SystemReport_${warehouse.warehouseName}.pdf`,
//     });
//   } catch (err) {
//     console.error("Error in systemSetReport:", err);
//     res.status(500).json({ message: "Server error", error: err.message });
//   }
// };

// Systems we care about
const SYSTEMS_TO_CHECK = ["3HP DC", "5HP DC", "7.5HP DC"];
const PUMP_SORT_ORDER = ["30m", "50m", "70m", "100m"]; // Pump sort order

// Helper: Calculate pump-wise sets for a system
async function calculatePumpWiseSets(system, warehouseId, inventoryMap) {
  const systemMaps = await SystemItemMap.find({ systemId: system._id })
    .populate("systemItemId", "itemName");

  const pumpVariants = systemMaps.filter((m) =>
    m.systemItemId.itemName.toLowerCase().includes("pump")
  );

  const pumpWise = [];

  for (const pumpMap of pumpVariants) {
    const pumpName = pumpMap.systemItemId.itemName;

    // Get subcomponents (if any)
    const subItems = await ItemComponentMap.find({
      systemId: system._id,
      systemItemId: pumpMap.systemItemId._id,
    }).populate("subItemId", "itemName");

    const requiredItems = [
      { name: pumpName, qty: pumpMap.quantity },
      ...subItems.map((s) => ({
        name: s.subItemId.itemName,
        qty: s.quantity,
      })),
    ];

    let setsAvailable = Infinity;
    for (const req of requiredItems) {
      const available = Math.floor((inventoryMap[req.name] || 0) / req.qty);
      setsAvailable = Math.min(setsAvailable, available);
    }

    pumpWise.push({
      pumpVariant: pumpName,
      setsAvailable: setsAvailable === Infinity ? 0 : setsAvailable,
    });
  }

  // Sort pump variants: 30m, 50m, 70m, 100m
  pumpWise.sort((a, b) => {
    const aIndex = PUMP_SORT_ORDER.findIndex((p) =>
      a.pumpVariant.toLowerCase().includes(p)
    );
    const bIndex = PUMP_SORT_ORDER.findIndex((p) =>
      b.pumpVariant.toLowerCase().includes(p)
    );
    return aIndex - bIndex;
  });

  return pumpWise;
}

// Main Controller
const systemSetReport = async (req, res) => {
  try {
    const { warehouseId } = req.query;
    if (!warehouseId) {
      return res.status(400).json({ message: "warehouseId is required" });
    }

    const warehouse = await Warehouse.findById(warehouseId);
    if (!warehouse) {
      return res.status(404).json({ message: "Warehouse not found" });
    }

    // Build inventory map
    const inventories = await InstallationInventory.find({ warehouseId })
      .populate("systemItemId", "itemName");

    const inventoryMap = {};
    inventories.forEach((inv) => {
      inventoryMap[inv.systemItemId.itemName] = inv.quantity;
    });

    // Fetch systems (match "3HP DC" → "3HP DC System")
    const systems = await System.find({
      systemName: {
        $in: SYSTEMS_TO_CHECK.map((s) => new RegExp(`^${s}(\\sSystem)?$`, "i")),
      },
    });

    if (!systems.length) {
      return res.status(404).json({ message: "No systems found in DB" });
    }

    const results = [];
    for (const sys of systems) {
      const pumpWise = await calculatePumpWiseSets(sys, warehouseId, inventoryMap);
      results.push({ systemName: sys.systemName, pumps: pumpWise });
    }

    // Build HTML for PDF
    const tableHtml = results
      .map(
        (sys) => `
      <h2>${sys.systemName}</h2>
      <table>
        <thead>
          <tr>
            <th>Pump Variant</th>
            <th>Sets Available</th>
          </tr>
        </thead>
        <tbody>
          ${sys.pumps
            .map(
              (p) => `
            <tr>
              <td>${p.pumpVariant}</td>
              <td>${p.setsAvailable}</td>
            </tr>
          `
            )
            .join("")}
        </tbody>
      </table>
    `
      )
      .join("<br/>");

    const html = `
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            h1, h2 { text-align: center; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            th, td { border: 1px solid #000; padding: 8px; text-align: center; }
            th { background: #f2f2f2; }
          </style>
        </head>
        <body>
          <h1>Installation Inventory Report</h1>
          <h2>Warehouse: ${warehouse.warehouseName}</h2>
          ${tableHtml}
        </body>
      </html>
    `;

    // Generate PDF
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0" });

    const uploadDir = path.join(__dirname, "../../uploads");
    await fs.mkdir(uploadDir, { recursive: true });

    const filePath = path.join(
      uploadDir,
      `SystemReport_${warehouse.warehouseName}.pdf`
    );
    await page.pdf({ path: filePath, format: "A4" });
    await browser.close();

    res.json({
      success: true,
      message: "PDF generated successfully",
    });
  } catch (err) {
    console.error("Error in systemSetReport:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

module.exports = { installationInventoryStockReport, systemSetReport };
