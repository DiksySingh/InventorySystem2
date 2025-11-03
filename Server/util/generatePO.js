const fs = require("fs");
const path = require("path");
const ejs = require("ejs");
const puppeteer = require("puppeteer");

// absolute watermark path you provided earlier:
const WATERMARK_ABSOLUTE = "C:\\Users\\Dikshant Singh\\Desktop\\InventorySystem2\\Server\\assets\\galo.png";

// how many visible rows the table should have (fixed)
const FIXED_ROW_COUNT = 12; // tweak if needed to match vertical spacing exactly

function INR(n) {
  return Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/* Indian number to words (supports up to crores) */
function numberToIndianWords(num) {
  if (!num && num !== 0) return "";
  num = Math.floor(num);
  if (num === 0) return "ZERO";

  const ones = ["","ONE","TWO","THREE","FOUR","FIVE","SIX","SEVEN","EIGHT","NINE","TEN","ELEVEN","TWELVE","THIRTEEN","FOURTEEN","FIFTEEN","SIXTEEN","SEVENTEEN","EIGHTEEN","NINETEEN"];
  const tens = ["","","TWENTY","THIRTY","FORTY","FIFTY","SIXTY","SEVENTY","EIGHTY","NINETY"];

  function twoDigit(n) {
    if (n < 20) return ones[n];
    const t = Math.floor(n / 10);
    const o = n % 10;
    return tens[t] + (o ? " " + ones[o] : "");
  }

  function threeDigit(n) {
    const h = Math.floor(n / 100);
    const rem = n % 100;
    let s = "";
    if (h) s += ones[h] + " HUNDRED";
    if (rem) s += (s ? " " : "") + twoDigit(rem);
    return s;
  }

  const crore = Math.floor(num / 10000000);
  num = num % 10000000;
  const lakh = Math.floor(num / 100000);
  num = num % 100000;
  const thousand = Math.floor(num / 1000);
  num = num % 1000;
  const hundredPart = num;

  let parts = [];
  if (crore) parts.push(numberToIndianWords(crore) + " CRORE");
  if (lakh) parts.push((lakh < 100 ? twoDigit(lakh) : threeDigit(lakh)) + " LAKH");
  if (thousand) parts.push((thousand < 100 ? twoDigit(thousand) : threeDigit(thousand)) + " THOUSAND");
  if (hundredPart) parts.push(threeDigit(hundredPart));
  return parts.join(" ").replace(/\s+/g, " ").trim();
}

function toIndianWords(amount) {
  amount = Number(amount || 0);
  const rupees = Math.floor(amount);
  const paise = Math.round((amount - rupees) * 100);
  let rupeeWords = numberToIndianWords(rupees) || "ZERO";
  let result = `${rupeeWords} ONLY`;
  if (paise > 0) {
    const paiseWords = numberToIndianWords(paise);
    result = `${rupeeWords} AND ${paiseWords} PAISE ONLY`;
  }
  return result;
}

/**
 * generatePO(po, items)
 * - po: prisma purchaseOrder object (with company, vendor)
 * - items: array of items
 * returns: absolute output PDF path
 */
async function generatePO(po, items) {
  // Template path
  const tplPath = path.join(__dirname, "../templates/poTemplate.ejs");
  let tpl = fs.readFileSync(tplPath, "utf8");

  // watermark as base64 data URI
  let watermarkData = "";
  try {
    const buff = fs.readFileSync(WATERMARK_ABSOLUTE);
    watermarkData = `data:image/png;base64,${buff.toString("base64")}`;
  } catch (e) {
    console.warn("Watermark file not found at", WATERMARK_ABSOLUTE);
    watermarkData = "";
  }

  // Prepare and pad rows (fixed count)
  const preparedRows = (items || []).map((it, idx) => ({
    sno: idx + 1,
    description: it.itemName + (it.description ? ("\n" + it.description) : ""),
    hsn: it.hsnCode || "-",
    qty: Number(it.quantity || 0).toLocaleString("en-IN"),
    unit: it.unit || "Nos",
    rate: INR(it.rate || 0),
    amount: INR(it.total || (Number(it.rate || 0) * Number(it.quantity || 0)))
  }));

  // pad to FIXED_ROW_COUNT with empty rows
  for (let i = preparedRows.length; i < FIXED_ROW_COUNT; i++) {
    preparedRows.push({
      sno: i + 1,
      description: "",
      hsn: "",
      qty: "",
      unit: "",
      rate: "",
      amount: ""
    });
  }

  // Totals calculations
  const subTotal = (items || []).reduce((s, it) => s + Number(it.total || (it.rate * it.quantity) || 0), 0);
  const taxAmount = Number(po.totalGST || po.taxAmount || 0);
  const gstType = (po.gstType || "").toUpperCase();
  let gstBreakupHTML = "";
  let gstLabel = "";
  let taxPercent = po.gstPercent ?? (gstType === "IGST" ? 5 : 18);

  if (gstType === "LOCAL" || gstType === "GST" || gstType === "CGST_SGST") {
    gstLabel = "CGST / SGST";
    const half = Number((taxAmount / 2).toFixed(2));
    gstBreakupHTML = `<tr><td>CGST 9%</td><td style="text-align:right;">₹ ${INR(half)}</td></tr>
                      <tr><td>SGST 9%</td><td style="text-align:right;">₹ ${INR(half)}</td></tr>`;
  } else {
    gstLabel = "IGST";
    gstBreakupHTML = `<tr><td>IGST ${taxPercent}%</td><td style="text-align:right;">₹ ${INR(taxAmount)}</td></tr>`;
  }

  const rawGrand = subTotal + taxAmount;
  const grandRounded = Math.round(rawGrand);
  const inWords = toIndianWords(grandRounded);
  const totalQty = (items || []).reduce((s, it) => s + Number(it.quantity || 0), 0);

  // render EJS
  const html = ejs.render(tpl, {
    watermark: watermarkData,
    companyName: po.company?.name || po.companyName || "",
    companySub: po.company?.subtitle || "",
    companyAddress: po.company?.address || "",
    companyGST: po.company?.gstNumber || po.company?.gst || "",
    companyShort: po.company?.shortName || (po.company?.name || "").split(" ")[0] || "",
    vendorName: po.vendor?.name || po.vendorName || "",
    vendorAddress: po.vendor?.address || po.vendorAddress || "",
    vendorGST: po.vendor?.gstNumber || po.vendor?.gst || "",
    vendorEmail: po.vendor?.email || "",
    vendorPhone: po.vendor?.phone || po.vendor?.contact || "",
    poNumber: po.poNumber || po.id || "",
    poDate: po.createdAt ? new Date(po.createdAt).toLocaleDateString("en-IN") : (po.poDate || ""),
    paymentTerms: po.paymentTerms || "",
    deliveryTerms: po.deliveryTerms || "",
    contactPerson: po.contactPerson || "",
    cellNo: po.cellNo || "",
    warranty: po.warranty || "",
    rows: preparedRows,
    subTotal: INR(subTotal),
    gstBreakup: gstBreakupHTML,
    gstLabel,
    taxPercent,
    taxAmount: INR(taxAmount),
    totalQty,
    grandTotal: INR(grandRounded),
    inWords,
  });

  // Save PDF path
  const outDir = path.join(__dirname, "../uploads/purchaseOrderFolder");
  fs.mkdirSync(outDir, { recursive: true });
  const fileName = `${(po.vendor?.name || "vendor").split(" ")[0]}-PO-${po.poNumber || po.id || Date.now()}.pdf`;
  const outputPath = path.join(outDir, fileName);

  // Puppeteer render
  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"]
  });

  try {
    const page = await browser.newPage();
    // higher resolution for crisper borders
    await page.setViewport({ width: 1240, height: 1754, deviceScaleFactor: 2 });

    await page.setContent(html, { waitUntil: "networkidle0" });

    await page.pdf({
      path: outputPath,
      format: "A4",
      printBackground: true,
      margin: { top: 0, bottom: 0, left: 0, right: 0 },
      preferCSSPageSize: true
    });
  } finally {
    await browser.close();
  }

  return outputPath;
}

module.exports = generatePO;
