const fs = require("fs");
const path = require("path");
const ejs = require("ejs");
const puppeteer = require("puppeteer");
const numberToWords = require("./numberToWords");

const WATERMARK_ABSOLUTE = path.join(__dirname, "../assets/galo.png");
const FIXED_ROW_COUNT = 9;

function formatCurrency(n) {
  return Number(n || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function toIndianWords(amount) {
  return numberToWords(amount);
}

function getGSTLabel(po) {
  const gstType = po.gstType;

  if (gstType.includes("ITEMWISE")) return "";
  if (gstType.includes("EXEMPTED")) return "";

  if (gstType.startsWith("IGST_")) {
    const rate = gstType.split("_")[1];
    return `IGST @ ${rate}%`;
  }

  if (gstType.startsWith("LGST_")) {
    const rate = gstType.split("_")[1];
    return `CGST @ ${rate / 2}% + SGST @ ${rate / 2}%`;
  }

  return "";
}

async function generatePO(po, items) {
  const tplPath = path.join(__dirname, "../templates/poTemplate.ejs");
  let tpl = fs.readFileSync(tplPath, "utf8");

  let watermark = "";
  try {
    const buff = fs.readFileSync(WATERMARK_ABSOLUTE);
    watermark = `data:image/png;base64,${buff.toString("base64")}`;
  } catch (e) {}

  const gstType = (po.gstType || "").toUpperCase();
  const isItemWise = gstType.includes("ITEMWISE");
  console.log(isItemWise);
  const isExempted = gstType.includes("EXEMPTED");
  const isIGST = gstType.startsWith("IGST_");
  const isLGST = gstType.startsWith("LGST_");

  let totalQty = 0;
  let grandTotal = 0;

  let totalGST = 0;
  let totalCGST = 0;
  let totalSGST = 0;
  let totalIGST = 0;

  const preparedRows = (items || []).map((it, i) => {
    console.log(it);
    const qty = Number(it.quantity || 0);
    const rate = Number(it.rate || 0);
    totalQty += qty;

    const lineAmount = qty * rate;

    let gstRate = 0;
    let gstAmount = 0;
    let finalAmount = lineAmount;
    console.log(Number(it.gstRate));
    // ✅ ITEMWISE GST
    if (isItemWise) {
      gstRate = Number(it.gstRate || 0);
      console.log(gstRate);
      gstAmount = Number(lineAmount * gstRate) / 100;
      console.log(gstAmount);
      finalAmount = lineAmount + gstAmount;
      totalGST += gstAmount;
    }

    grandTotal += finalAmount;

    return {
      sno: i + 1,
      description: it.itemName + (it.description ? "\n" + it.description : ""),
      hsn: it.hsnCode || "-",
      qty,
      unit: it.unit || "Nos",
      rate: formatCurrency(rate),
      lineAmount: formatCurrency(lineAmount),
      gstRate: isItemWise ? `${gstRate}%` : "",
      gstAmount: isItemWise ? formatCurrency(gstAmount) : "",
      amount: formatCurrency(finalAmount),
    };
  });

  while (preparedRows.length < FIXED_ROW_COUNT) {
    preparedRows.push({
      sno: "",
      description: "",
      hsn: "",
      qty: "",
      unit: "",
      rate: "",
      lineAmount: "",
      gstRate: "",
      gstAmount: "",
      amount: "",
    });
  }

  // ✅ Handle NON–ITEMWISE GST globally
  if (!isItemWise && !isExempted) {
    const rate = Number(gstType.split("_")[1] || 0);

    if (isIGST) {
      totalIGST = (grandTotal * rate) / 100;
      totalGST = totalIGST;
      grandTotal += totalIGST;
    }

    if (isLGST) {
      totalCGST = (grandTotal * (rate / 2)) / 100;
      totalSGST = (grandTotal * (rate / 2)) / 100;
      totalGST = totalCGST + totalSGST;
      grandTotal += totalGST;
    }
  }

  const gstLabel = getGSTLabel(po);
  const inWords = toIndianWords(grandTotal);

  let gstRate = 0;

  // If global GST types (IGST/LGST), use the GST value from PO
  if (po.gstType !== "ITEMWISE" && po.gstType !== "EXEMPTED") {
    gstRate = po.gstRate; // whatever field you store
  }

  const html = ejs.render(tpl, {
    watermark,

    companyName: po.company?.name,
    companySub: po.company?.subtitle,
    companyAddress: po.company?.address,
    companyGST: po.company?.gstNumber,

    vendorName: po.vendor?.name,
    vendorAddress: po.vendor?.address,
    vendorGST: po.vendor?.gstNumber,
    vendorEmail: po.vendor?.email,
    vendorPhone: po.vendor?.phone,

    poNumber: po.poNumber,
    poDate: new Date(po.createdAt).toLocaleDateString("en-IN"),
    paymentTerms: po.paymentTerms,
    deliveryTerms: po.deliveryTerms,
    contactPerson: po.contactPerson,
    cellNo: po.cellNo,
    warranty: po.warranty,

    gstType,
    gstRate,
    rows: preparedRows,
    gstLabel,
    totalQty,

    // ✅ Values after calculation
    grandTotal,
    grandTotalFormatted: formatCurrency(grandTotal),
    inWords,

    taxAmount: formatCurrency(totalGST),
    cgst: formatCurrency(totalCGST),
    sgst: formatCurrency(totalSGST),
    igst: formatCurrency(totalIGST),
  });

  const outDir = path.join(__dirname, "../uploads/purchaseOrderFolder");
  fs.mkdirSync(outDir, { recursive: true });

  const fileName = `${po.vendor?.name?.split(" ")[0] || "vendor"}-PO-${po.poNumber}.pdf`;
  const outputPath = path.join(outDir, fileName);

  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1240, height: 1754, deviceScaleFactor: 2 });
    await page.setContent(html, { waitUntil: "networkidle0" });
    await page.pdf({
      path: outputPath,
      format: "A4",
      printBackground: true,
      margin: { top: 0, bottom: 0, left: 0, right: 0 },
      preferCSSPageSize: true,
    });
  } finally {
    await browser.close();
  }

  return outputPath;
}

module.exports = generatePO;
