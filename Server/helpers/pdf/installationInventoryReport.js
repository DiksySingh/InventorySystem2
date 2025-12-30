const puppeteer = require("puppeteer");
const InstallationInventory = require("../../models/systemInventoryModels/installationInventorySchema");
const mongoose = require("mongoose");

async function generateInventoryPDF(data, outputFile) {
  const lengths = ["30M", "50M", "70M", "100M"];
  const mergedHDPE = [];

  // Track first occurrence of each value per length
  const addedHDPE = {
    "30M": new Map(),
    "50M": new Map(),
    "70M": new Map(),
    "100M": new Map(),
  };

  // data.hdpe.forEach((row) => {
  //   const newRow = { PN: row.PN, HP: row.HP };

  //   lengths.forEach((len) => {
  //   const val = row[len] || 0;

  //   // Allow merging also for ZERO values  
  //   const mergeKey = val === 0 ? "__ZERO__" : val; 

  //   if (addedHDPE[len].has(mergeKey)) {
  //     // This row should not display the cell
  //     newRow[len] = { value: "", rowspan: 0 };
  //     addedHDPE[len].get(mergeKey).rowspan++;
  //   } else {
  //     // First occurrence (even if it's 0)
  //     newRow[len] = { value: val, rowspan: 1 };
  //     addedHDPE[len].set(mergeKey, newRow[len]);
  //   }
  // });
  //   mergedHDPE.push(newRow);
  // });

  data.hdpe.forEach((row) => {
  const newRow = { PN: row.PN, HP: row.HP };

  lengths.forEach((len) => {
    const val = row[len] ?? 0;
    let mergeKey;

    /* ================= MERGE RULES BASED ON MAPPING ================= */

    if (len === "30M") {
      // Diameter differs → NEVER merge
      mergeKey = `${row.HP}_${val}`;
    }

    else if (len === "50M" || len === "70M") {
      // Same item across all HP
      mergeKey = `${val}`;
    }

    else if (len === "100M") {
      // Only 5HP & 7.5HP share same item
      if (row.HP === "5HP" || row.HP === "7.5HP") {
        mergeKey = `${val}`;
      } else {
        mergeKey = `${row.HP}_${val}`;
      }
    }

    /* ================= APPLY MERGE ================= */

    if (addedHDPE[len].has(mergeKey)) {
      newRow[len] = { value: "", rowspan: 0 };
      addedHDPE[len].get(mergeKey).rowspan++;
    } else {
      newRow[len] = { value: val, rowspan: 1 };
      addedHDPE[len].set(mergeKey, newRow[len]);
    }
  });

  mergedHDPE.push(newRow);
});

  const html = `
<html>
<head>
<style>
    body { font-family: Arial, sans-serif; margin: 10px; }
    table { width: 100%; border-collapse: collapse; font-size: 11px; margin-bottom: 25px; }
    th, td { border: 1px solid #000; padding: 4px; text-align: center; height: 22px; }
    .small-table { width: auto; margin: 0 auto; }
    .small-tables-container { display: flex; justify-content: space-around; align-items: flex-start; margin-bottom: 25px; gap: 10px; }
</style>
</head>
<body>

<!-- Solar Module -->
<table>
    <tr>
        <th rowspan="2">HP</th>
        <th rowspan="2">Solar Module</th>
        <th rowspan="2">Qty</th>
        <th rowspan="2">Motor</th>
        <th colspan="4">Pump</th>
        <th colspan="4">Controller</th>
    </tr>
    <tr>
        <th>30M</th><th>50M</th><th>70M</th><th>100M</th>
        <th>30M</th><th>50M</th><th>70M</th><th>100M</th>
    </tr>
    ${data.solar
      .map(
        (row) => `
      <tr>
        <td>${row.HP}</td>
        <td>${row.Module}</td>
        <td>${row.Qty}</td>
        <td>${row.Motor ?? ""}</td>
        <td>${row.Pump30 ?? ""}</td>
        <td>${row.Pump50 ?? ""}</td>
        <td>${row.Pump70 ?? ""}</td>
        <td>${row.Pump100 ?? ""}</td>
        <td>${row.Ctrl30 ?? ""}</td>
        <td>${row.Ctrl50 ?? ""}</td>
        <td>${row.Ctrl70 ?? ""}</td>
        <td>${row.Ctrl100 ?? ""}</td>
      </tr>
    `
      )
      .join("")}
</table>

<!-- HDPE PIPE -->
<table>
  <tr>
    <th>Pressure</th>
    <th>HP</th>
    <th>30M</th>
    <th>50M</th>
    <th>70M</th>
    <th>100M</th>
  </tr>
  ${mergedHDPE
    .map(
      (row) => `
    <tr>
      <td>${row.PN}</td>
      <td>${row.HP}</td>
      ${lengths
        .map((len) =>
          row[len].rowspan > 0
            ? `<td rowspan="${row[len].rowspan}">${row[len].value}</td>`
            : ""
        )
        .join("")}
    </tr>
  `
    )
    .join("")}
</table>

<div class="small-tables-container">
  <!-- ROPE -->
  <table class="small-table">
    <tr><th>12MM ROPE</th><th>Quantity</th></tr>
    ${data.rope.map((row) => `<tr><td>${row.Size}</td><td>${row.Qty}</td></tr>`).join("")}
  </table>

  <!-- CABLE -->
  <table class="small-table">
    <tr><th>2.5SQMM CABLE</th><th>Quantity</th></tr>
    ${data.cable.map((row) => `<tr><td>${row.Size}</td><td>${row.Qty}</td></tr>`).join("")}
  </table>

  <!-- STRUCTURE -->
  <table class="small-table">
    <tr><th>Structure (MMS & Hardware)</th><th>Quantity</th></tr>
    ${data.structure.map((row) => `<tr><td>${row.Type}</td><td>${row.Qty}</td></tr>`).join("")}
  </table>
</div>

</body>
</html>
`;

  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: "networkidle0" });

  const pdfBuffer = await page.pdf({
    format: "A4",
    printBackground: true,
    margin: { top: "10px", bottom: "10px", left: "10px", right: "10px" },
  });

  await browser.close();
  return pdfBuffer;
}

const installationInventoryReport = async (req, res) => {
  try {
    const warehouseId = "690835908a80011de511b648";

    const inventoryData = await InstallationInventory.find({
      warehouseId: new mongoose.Types.ObjectId(warehouseId),
    }).populate("systemItemId");
    const solar = [];
    const hdpe = [];
    const rope = [];
    const cable = [];
    const structure = [];

    const hpList = ["3 HP", "5 HP", "7.5 HP"];
    hpList.forEach((hp) => {
      solar.push({
        HP: hp,
        Module: 0,
        Qty: 0,
        Motor: 0,
        Pump30: "",
        Pump50: "",
        Pump70: "",
        Pump100: "",
        Ctrl30: "",
        Ctrl50: "",
        Ctrl70: "",
        Ctrl100: "",
      });
    });

    const hdpeRows = {
      "3HP": { PN: "PN-8", HP: "3HP", "30M": 0, "50M": 0, "70M": 0, "100M": 0 },
      "5HP": {
        PN: "PN-10",
        HP: "5HP",
        "30M": 0,
        "50M": 0,
        "70M": 0,
        "100M": 0,
      },
      "7.5HP": {
        PN: "PN-10",
        HP: "7.5HP",
        "30M": 0,
        "50M": 0,
        "70M": 0,
        "100M": 0,
      },
    };

    const hdpeMapping = {
      "3HP": {
        30: "HDPE-30M-2inch With Nut Bolt",
        50: "HDPE-50M-2inch With Nut Bolt",
        70: "HDPE-70M-2inch With Nut Bolt",
        100: null,
      },
      "5HP": {
        30: "HDPE-30M-2.5inch With Nut Bolt",
        50: "HDPE-50M-2inch With Nut Bolt",
        70: "HDPE-70M-2inch With Nut Bolt",
        100: "HDPE-100M-2inch With Nut Bolt",
      },
      "7.5HP": {
        30: "HDPE-30M-3inch With Nut Bolt",
        50: "HDPE-50M-2inch With Nut Bolt",
        70: "HDPE-70M-2inch With Nut Bolt",
        100: "HDPE-100M-2inch With Nut Bolt",
      },
    };

    const panel6Items = [
      "6 Panel Rotation Plate",
      "6 Panel Main Tube",
      "6 Panel Side Tube (Rafter)",
      "6 Panel Purlin (HDG)",
      "6 Panel Pillar",
    ];

    const panel9Items = [
      "9 Panel Rotation Plate",
      "9 Panel Main Tube",
      "9 Panel Side Tube (Rafter)",
      "9 Panel Purlin (HDG)",
      "9 Panel Pillar",
    ];

    const panelGroups = {
      "6 Panel": [],
      "9 Panel": [],
    };

    // Populate hdpeRows with quantities
    inventoryData.forEach((inv) => {
      const item = inv.systemItemId;
      if (!item || !item.itemName) return;
      const qty = inv.quantity || 0;
      const name = item.itemName.toUpperCase();

      // ---------------- SOLAR PANELS ----------------
      if (name.includes("SOLAR PANEL - 500 WP")) {
        solar[0].Module = 500;
        solar[0].Qty = qty || 0;
      }

      if (name.includes("SOLAR PANEL - 540 WP")) {
        solar[1].Module = 540;
        solar[1].Qty = qty || 0;
      }

      if (name.includes("SOLAR PANEL - 567 WP")) {
        solar[2].Module = 567;
        solar[2].Qty = qty || 0;
      }

      // ---------------- MOTOR ----------------
      if (name.includes("MOTOR 3HP DC")) solar[0].Motor = qty || 0;
      if (name.includes("MOTOR 5HP DC")) solar[1].Motor = qty || 0;
      if (name.includes("MOTOR 7.5HP DC")) solar[2].Motor = qty || 0;

      // ---------------- PUMP ----------------
      if (name.includes("PUMP 3HP DC")) {
        if (name.includes("30")) solar[0].Pump30 = qty || 0;
        if (name.includes("50")) solar[0].Pump50 = qty || 0;
        if (name.includes("70")) solar[0].Pump70 = qty || 0;
        if (name.includes("100")) solar[0].Pump100 = qty || 0;
      }

      if (name.includes("PUMP 5HP DC")) {
        if (name.includes("30")) solar[1].Pump30 = qty || 0;
        if (name.includes("50")) solar[1].Pump50 = qty || 0;
        if (name.includes("70")) solar[1].Pump70 = qty || 0;
        if (name.includes("100")) solar[1].Pump100 = qty || 0;
      }

      if (name.includes("PUMP 7.5HP DC")) {
        if (name.includes("30")) solar[2].Pump30 = qty || 0;
        if (name.includes("50")) solar[2].Pump50 = qty || 0;
        if (name.includes("70")) solar[2].Pump70 = qty || 0;
        if (name.includes("100")) solar[2].Pump100 = qty || 0;
      }

      // ---------------- CONTROLLER ----------------
      if (name.includes("CONTROLLER")) {
        // Match HP (3, 5, 7.5) + Head (30, 50, 70, 100)
        const match = name.match(/(\d+(\.\d+)?)HP.*?(\d+)M/i);

        if (match) {
          const hp = match[1]; // "3", "5", "7.5"
          const head = match[3]; // "30", "50", "70", "100"

          let index = null;
          if (hp === "3") index = 0;
          if (hp === "5") index = 1;
          if (hp === "7.5") index = 2;

          if (index !== null) {
            if (head === "30") solar[index].Ctrl30 = qty;
            if (head === "50") solar[index].Ctrl50 = qty;
            if (head === "70") solar[index].Ctrl70 = qty;
            if (head === "100") solar[index].Ctrl100 = qty;
          }
        }
      }

      if (name.includes("HDPE")) {
        for (const hp of Object.keys(hdpeMapping)) {
          for (const headStr of Object.keys(hdpeMapping[hp])) {
            const expectedName = hdpeMapping[hp][headStr];
            if (!expectedName) continue;
            if (name.includes(expectedName.toUpperCase())) {
              hdpeRows[hp][`${headStr}M`] = qty;
            }
          }
        }
      }
            // ---------------- ROPE ----------------
      if (name.includes("12MM ROPE")) {
        const cleanedName = item.itemName.replace(/\s+/g, " ").trim();
        const sizeMatch = cleanedName.match(
          /(\d+(?:\.\d+)?)\s*mm.*?(\d+(?:\.\d+)?)\s*M/i
        );

        let length = "";
        if (sizeMatch) length = sizeMatch[2];

        rope.push({
          Size: length + "M",
          Qty: qty || 0,
        });
      }

      // ---------------- CABLE ----------------
      if (name.includes("2.5SQMM CABLE")) {
        const cleanedName = item.itemName.replace(/\s+/g, " ").trim();
        const sizeMatch = cleanedName.match(
          /(\d+(?:\.\d+)?)\s*sqmm.*?(\d+(?:\.\d+)?)\s*M/i
        );

        let length = "";
        if (sizeMatch) length = sizeMatch[2];
        cable.push({
          Size: length + "M",
          Qty: qty || 0,
        });
      }

      // ---------------- STRUCTURE (6/9 PANEL) ----------------
      if (panel6Items.includes(item.itemName)) {
        panelGroups["6 Panel"].push(qty);
      } else if (panel9Items.includes(item.itemName)) {
        panelGroups["9 Panel"].push(qty);
      }
    });

       // Push grouped items with min qty
    if (panelGroups["6 Panel"].length > 0) {
      structure.push({
        Type: "6 Panel",
        Qty: Math.min(...panelGroups["6 Panel"]),
      });
    }

    if (panelGroups["9 Panel"].length > 0) {
      structure.push({
        Type: "9 Panel",
        Qty: Math.min(...panelGroups["9 Panel"]),
      });
    }

    // Convert hdpeRows to array
    const hdpeForPDF = Object.values(hdpeRows);
    //return res.json({ solar, hdpe: hdpeForPDF, rope, cable, structure });
    // Generate PDF
    const mongoData = { solar, hdpe: hdpeForPDF, rope, cable, structure };
     const pdfBuffer = await generateInventoryPDF(mongoData);

    // Set proper headers
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", 'attachment; filename="Badnapur_Inventory.pdf"');
    res.setHeader("Content-Length", pdfBuffer.length);

    // Send PDF buffer
    res.end(pdfBuffer);
  } catch (err) {
    console.error(err);
    res
      .status(500)
      .json({ message: "Internal Server Error", error: err.message });
  }
};

module.exports = installationInventoryReport;
