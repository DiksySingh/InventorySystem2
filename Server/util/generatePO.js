// const fs = require("fs");
// const path = require("path");
// const ejs = require("ejs");
// const puppeteer = require("puppeteer");

// // absolute watermark path you provided earlier:
// const WATERMARK_ABSOLUTE =
//   "C:\\Users\\Dikshant Singh\\Desktop\\InventorySystem2\\Server\\assets\\galo.png";

// // how many visible rows the table should have (fixed)
// const FIXED_ROW_COUNT = 9; // tweak if needed to match vertical spacing exactly

// function INR(n) {
//   return Number(n || 0).toLocaleString("en-IN", {
//     minimumFractionDigits: 2,
//     maximumFractionDigits: 2,
//   });
// }

// /* Indian number to words (supports up to crores) */
// function numberToIndianWords(num) {
//   if (!num && num !== 0) return "";
//   num = Math.floor(num);
//   if (num === 0) return "ZERO";

//   const ones = [
//     "",
//     "ONE",
//     "TWO",
//     "THREE",
//     "FOUR",
//     "FIVE",
//     "SIX",
//     "SEVEN",
//     "EIGHT",
//     "NINE",
//     "TEN",
//     "ELEVEN",
//     "TWELVE",
//     "THIRTEEN",
//     "FOURTEEN",
//     "FIFTEEN",
//     "SIXTEEN",
//     "SEVENTEEN",
//     "EIGHTEEN",
//     "NINETEEN",
//   ];
//   const tens = [
//     "",
//     "",
//     "TWENTY",
//     "THIRTY",
//     "FORTY",
//     "FIFTY",
//     "SIXTY",
//     "SEVENTY",
//     "EIGHTY",
//     "NINETY",
//   ];

//   function twoDigit(n) {
//     if (n < 20) return ones[n];
//     const t = Math.floor(n / 10);
//     const o = n % 10;
//     return tens[t] + (o ? " " + ones[o] : "");
//   }

//   function threeDigit(n) {
//     const h = Math.floor(n / 100);
//     const rem = n % 100;
//     let s = "";
//     if (h) s += ones[h] + " HUNDRED";
//     if (rem) s += (s ? " " : "") + twoDigit(rem);
//     return s;
//   }

//   const crore = Math.floor(num / 10000000);
//   num = num % 10000000;
//   const lakh = Math.floor(num / 100000);
//   num = num % 100000;
//   const thousand = Math.floor(num / 1000);
//   num = num % 1000;
//   const hundredPart = num;

//   let parts = [];
//   if (crore) parts.push(numberToIndianWords(crore) + " CRORE");
//   if (lakh)
//     parts.push((lakh < 100 ? twoDigit(lakh) : threeDigit(lakh)) + " LAKH");
//   if (thousand)
//     parts.push(
//       (thousand < 100 ? twoDigit(thousand) : threeDigit(thousand)) + " THOUSAND"
//     );
//   if (hundredPart) parts.push(threeDigit(hundredPart));
//   return parts.join(" ").replace(/\s+/g, " ").trim();
// }

// function toIndianWords(amount) {
//   amount = Number(amount || 0);
//   const rupees = Math.floor(amount);
//   const paise = Math.round((amount - rupees) * 100);
//   let rupeeWords = numberToIndianWords(rupees) || "ZERO";
//   let result = `${rupeeWords} ONLY`;
//   if (paise > 0) {
//     const paiseWords = numberToIndianWords(paise);
//     result = `${rupeeWords} AND ${paiseWords} PAISE ONLY`;
//   }
//   return result;
// }

// /**
//  * generatePO(po, items)
//  * - po: prisma purchaseOrder object (with company, vendor)
//  * - items: array of items
//  * returns: absolute output PDF path
//  */
// async function generatePO(po, items) {
//   // Template path
//   const tplPath = path.join(__dirname, "../templates/poTemplate.ejs");
//   let tpl = fs.readFileSync(tplPath, "utf8");

//   // watermark as base64 data URI
//   let watermarkData = "";
//   try {
//     const buff = fs.readFileSync(WATERMARK_ABSOLUTE);
//     watermarkData = `data:image/png;base64,${buff.toString("base64")}`;
//   } catch (e) {
//     console.warn("Watermark file not found at", WATERMARK_ABSOLUTE);
//     watermarkData = "";
//   }

//   // Prepare and pad rows (fixed count)
//   const preparedRows = (items || []).map((it, idx) => ({
//     sno: idx + 1,
//     description: it.itemName + (it.description ? "\n" + it.description : ""),
//     hsn: it.hsnCode || "-",
//     qty: Number(it.quantity || 0).toLocaleString("en-IN"),
//     unit: it.unit || "Nos",
//     rate: INR(it.rate || 0),
//     amount: INR(it.total || Number(it.rate || 0) * Number(it.quantity || 0)),
//   }));

//   // pad to FIXED_ROW_COUNT with empty rows
//   for (let i = preparedRows.length; i < FIXED_ROW_COUNT; i++) {
//     preparedRows.push({
//       sno: "", // ✅ no serial number for blank rows
//       description: "",
//       hsn: "",
//       qty: "",
//       unit: "",
//       rate: "",
//       amount: "",
//     });
//   }

//   // Totals calculations
//   const subTotal = (items || []).reduce(
//     (s, it) => s + Number(it.total || it.rate * it.quantity || 0),
//     0
//   );
//   const gstType = (po.gstType || "").trim().toUpperCase(); // e.g. "LGST_18", "IGST_5"
//   let gstLabel = "";
//   let taxPercent = 0;
//   let taxAmount = Number(po.totalGST || po.taxAmount || 0);

//   // Extract % from "LGST_18"
//   const matches = gstType.match(/(\d+)/);
//   if (matches) {
//     taxPercent = Number(matches[1]);
//   } else {
//     taxPercent = po.gstPercent ? Number(po.gstPercent) : 18;
//   }

//   // Determine GST type and label
//   if (gstType.startsWith("IGST")) {
//     // IGST
//     gstLabel = `IGST @ ${taxPercent}%`;
//   } else {
//     // LGST / CGST+SGST / GST (local supply)
//     gstLabel = `CGST & SGST @ ${taxPercent}%`;

//     // Split half-half
//     var halfPercent = (taxPercent / 2).toFixed(2);
//     var halfAmount = (taxAmount / 2).toFixed(2);

//     var cgstPercent = halfPercent;
//     var sgstPercent = halfPercent;
//     var cgstAmount = halfAmount;
//     var sgstAmount = halfAmount;
//   }

//   const rawGrand = subTotal + taxAmount;
//   const grandRounded = Math.round(rawGrand);
//   const inWords = toIndianWords(grandRounded);
//   const totalQty = (items || []).reduce(
//     (s, it) => s + Number(it.quantity || 0),
//     0
//   );

//   // render EJS
//   const html = ejs.render(tpl, {
//     watermark: watermarkData,
//     companyName: po.company?.name || po.companyName || "",
//     companySub: po.company?.subtitle || "",
//     companyAddress: po.company?.address || "",
//     companyGST: po.company?.gstNumber || po.company?.gst || "",
//     companyShort:
//       po.company?.shortName || (po.company?.name || "").split(" ")[0] || "",
//     vendorName: po.vendor?.name || po.vendorName || "",
//     vendorAddress: po.vendor?.address || po.vendorAddress || "",
//     vendorGST: po.vendor?.gstNumber || po.vendor?.gst || "",
//     vendorEmail: po.vendor?.email || "",
//     vendorPhone: po.vendor?.phone || po.vendor?.contact || "",
//     poNumber: po.poNumber || po.id || "",
//     poDate: po.createdAt
//       ? new Date(po.createdAt).toLocaleDateString("en-IN")
//       : po.poDate || "",
//     paymentTerms: po.paymentTerms || "",
//     deliveryTerms: po.deliveryTerms || "",
//     contactPerson: po.contactPerson || "",
//     cellNo: po.cellNo || "",
//     warranty: po.warranty || "",
//     rows: preparedRows,
//     subTotal: INR(subTotal),
//     //gstBreakup: gstBreakupHTML,
//     gstLabel,
//     taxPercent,
//     taxAmount: INR(taxAmount),
//     totalQty,
//     grandTotal: INR(grandRounded),
//     inWords,
//   });

//   // Save PDF path
//   const outDir = path.join(__dirname, "../uploads/purchaseOrderFolder");
//   fs.mkdirSync(outDir, { recursive: true });
//   const fileName = `${(po.vendor?.name || "vendor").split(" ")[0]}-PO-${po.poNumber || po.id || Date.now()}.pdf`;
//   const outputPath = path.join(outDir, fileName);

//   // Puppeteer render
//   const browser = await puppeteer.launch({
//     headless: true,
//     args: ["--no-sandbox", "--disable-setuid-sandbox"],
//   });

//   try {
//     const page = await browser.newPage();
//     // higher resolution for crisper borders
//     await page.setViewport({ width: 1240, height: 1754, deviceScaleFactor: 2 });

//     await page.setContent(html, { waitUntil: "networkidle0" });

//     await page.pdf({
//       path: outputPath,
//       format: "A4",
//       printBackground: true,
//       margin: { top: 0, bottom: 0, left: 0, right: 0 },
//       preferCSSPageSize: true,
//     });
//   } finally {
//     await browser.close();
//   }

//   return outputPath;
// }

// module.exports = generatePO;

// const fs = require("fs");
// const path = require("path");
// const ejs = require("ejs");
// const puppeteer = require("puppeteer");

// const WATERMARK_ABSOLUTE =
//   "C:\\Users\\Dikshant Singh\\Desktop\\InventorySystem2\\Server\\assets\\galo.png";

// const FIXED_ROW_COUNT = 9;

// function INR(n) {
//   return Number(n || 0).toLocaleString("en-IN", {
//     minimumFractionDigits: 2,
//     maximumFractionDigits: 2,
//   });
// }

// function numberToIndianWords(num) {
//   if (!num && num !== 0) return "";
//   num = Math.floor(num);
//   if (num === 0) return "ZERO";

//   const ones = [
//     "",
//     "ONE",
//     "TWO",
//     "THREE",
//     "FOUR",
//     "FIVE",
//     "SIX",
//     "SEVEN",
//     "EIGHT",
//     "NINE",
//     "TEN",
//     "ELEVEN",
//     "TWELVE",
//     "THIRTEEN",
//     "FOURTEEN",
//     "FIFTEEN",
//     "SIXTEEN",
//     "SEVENTEEN",
//     "EIGHTEEN",
//     "NINETEEN",
//   ];
//   const tens = [
//     "",
//     "",
//     "TWENTY",
//     "THIRTY",
//     "FORTY",
//     "FIFTY",
//     "SIXTY",
//     "SEVENTY",
//     "EIGHTY",
//     "NINETY",
//   ];

//   function twoDigit(n) {
//     if (n < 20) return ones[n];
//     const t = Math.floor(n / 10);
//     const o = n % 10;
//     return tens[t] + (o ? " " + ones[o] : "");
//   }

//   function threeDigit(n) {
//     const h = Math.floor(n / 100);
//     const rem = n % 100;
//     let s = "";
//     if (h) s += ones[h] + " HUNDRED";
//     if (rem) s += (s ? " " : "") + twoDigit(rem);
//     return s;
//   }

//   const crore = Math.floor(num / 10000000);
//   num %= 10000000;
//   const lakh = Math.floor(num / 100000);
//   num %= 100000;
//   const thousand = Math.floor(num / 1000);
//   num %= 1000;
//   const hundred = num;

//   let parts = [];
//   if (crore) parts.push(numberToIndianWords(crore) + " CRORE");
//   if (lakh) parts.push(twoDigit(lakh) + " LAKH");
//   if (thousand) parts.push(twoDigit(thousand) + " THOUSAND");
//   if (hundred) parts.push(threeDigit(hundred));

//   return parts.join(" ").trim();
// }

// function toIndianWords(amount) {
//   amount = Number(amount || 0);
//   const rupees = Math.floor(amount);
//   const paise = Math.round((amount - rupees) * 100);
//   let words = numberToIndianWords(rupees) || "ZERO";
//   return paise > 0
//     ? `${words} AND ${numberToIndianWords(paise)} PAISE ONLY`
//     : `${words} ONLY`;
// }

// async function generatePO(po, items) {
//   const tplPath = path.join(__dirname, "../templates/poTemplate.ejs");
//   let tpl = fs.readFileSync(tplPath, "utf8");

//   let watermark = "";
//   try {
//     const buff = fs.readFileSync(WATERMARK_ABSOLUTE);
//     watermark = `data:image/png;base64,${buff.toString("base64")}`;
//   } catch (e) {
//     watermark = "";
//   }

//   const preparedRows = (items || []).map((it, i) => ({
//     sno: i + 1,
//     description: it.itemName + (it.description ? "\n" + it.description : ""),
//     hsn: it.hsnCode || "-",
//     qty: Number(it.quantity || 0).toLocaleString("en-IN"),
//     unit: it.unit || "Nos",
//     rate: INR(it.rate || 0),
//     amount: INR(it.total || Number(it.rate || 0) * Number(it.quantity || 0)),
//   }));

//   while (preparedRows.length < FIXED_ROW_COUNT) {
//     preparedRows.push({
//       sno: "",
//       description: "",
//       hsn: "",
//       qty: "",
//       unit: "",
//       rate: "",
//       amount: "",
//     });
//   }

//   const subTotal = (items || []).reduce(
//     (s, it) => s + Number(it.total || it.rate * it.quantity || 0),
//     0
//   );

//   const gstType = (po.gstType || "").toUpperCase();

//   // read values from DB
//   const totalCGST = Number(po.totalCGST || 0);
//   const totalSGST = Number(po.totalSGST || 0);
//   const totalIGST = Number(po.totalIGST || 0);
//   const taxAmount = Number(po.totalGST || 0);

//   let gstLabel = "";
//   let cgstPercent = 0,
//     sgstPercent = 0,
//     igstPercent = 0;
//   let cgstAmount = totalCGST;
//   let sgstAmount = totalSGST;
//   let igstAmount = totalIGST;

//   // extract % (works only if global GST)
//   let extracted = parseInt(gstType.match(/\d+/)?.[0] || "0");

//   // Global IGST cases
//   if (gstType.startsWith("IGST") && extracted > 0) {
//     igstPercent = extracted;
//     gstLabel = `IGST @ ${igstPercent}%`;
//   }

//   // Global LGST cases
//   else if (gstType.startsWith("LGST") && extracted > 0) {
//     cgstPercent = sgstPercent = extracted / 2;
//     gstLabel = `CGST @ ${cgstPercent}% + SGST @ ${sgstPercent}%`;
//   }

//   // Itemwise cases (no fixed %)
//   else if (gstType.includes("ITEMWISE")) {
//     gstLabel = "GST (Item-wise)";
//   }

//   // Exempt cases
//   else {
//     gstLabel = "GST Exempted";
//   }

//   const grandTotalNum = Math.round(subTotal + taxAmount);
//   const inWords = toIndianWords(grandTotalNum);

//   const html = ejs.render(tpl, {
//     watermark,
//     companyName: po.company?.name || "",
//     companySub: po.company?.subtitle || "",
//     companyAddress: po.company?.address || "",
//     companyGST: po.company?.gstNumber || "",
//     companyShort:
//       po.company?.shortName || po.company?.name?.split(" ")[0] || "",
//     vendorName: po.vendor?.name || "",
//     vendorAddress: po.vendor?.address || "",
//     vendorGST: po.vendor?.gstNumber || "",
//     vendorEmail: po.vendor?.email || "",
//     vendorPhone: po.vendor?.phone || "",
//     poNumber: po.poNumber || po.id,
//     poDate: po.createdAt
//       ? new Date(po.createdAt).toLocaleDateString("en-IN")
//       : "",
//     paymentTerms: po.paymentTerms || "",
//     deliveryTerms: po.deliveryTerms || "",
//     contactPerson: po.contactPerson || "",
//     cellNo: po.cellNo || "",
//     warranty: po.warranty || "",
//     rows: preparedRows,

//     // ✅ pass raw & formatted values
//     subTotal: INR(subTotal),
//     gstLabel,
//     taxAmountNum: taxAmount,
//     taxAmount: INR(taxAmount),
//     cgstPercent,
//     sgstPercent,
//     igstPercent,
//     cgstAmount: INR(cgstAmount),
//     sgstAmount: INR(sgstAmount),
//     igstAmount: INR(igstAmount),
//     totalQty: (items || []).reduce((s, it) => s + Number(it.quantity || 0), 0),
//     grandTotal: INR(grandTotalNum),
//     grandTotalNum,
//     inWords,
//     INR, // ✅ pass INR to EJS
//   });

//   const outDir = path.join(__dirname, "../uploads/purchaseOrderFolder");
//   fs.mkdirSync(outDir, { recursive: true });

//   const fileName = `${(po.vendor?.name || "vendor").split(" ")[0]}-PO-${po.poNumber}.pdf`;
//   const outputPath = path.join(outDir, fileName);

//   const browser = await puppeteer.launch({
//     headless: true,
//     args: ["--no-sandbox", "--disable-setuid-sandbox"],
//   });

//   try {
//     const page = await browser.newPage();
//     await page.setViewport({ width: 1240, height: 1754, deviceScaleFactor: 2 });
//     await page.setContent(html, { waitUntil: "networkidle0" });
//     await page.pdf({
//       path: outputPath,
//       format: "A4",
//       printBackground: true,
//       margin: { top: 0, bottom: 0, left: 0, right: 0 },
//       preferCSSPageSize: true,
//     });
//   } finally {
//     await browser.close();
//   }

//   return outputPath;
// }

// module.exports = generatePO;

const fs = require("fs");
const path = require("path");
const ejs = require("ejs");
const puppeteer = require("puppeteer");

const WATERMARK_ABSOLUTE =
  "C:\\Users\\Dikshant Singh\\Desktop\\InventorySystem2\\Server\\assets\\galo.png";

const FIXED_ROW_COUNT = 9;

function formatCurrency(n, currency = "INR") {
  const val = Number(n || 0);

  if (currency === "INR") {
    return val.toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }

  // foreign format (standard)
  return val.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function INR(n) {
  return formatCurrency(n, "INR");
}

function numberToIndianWords(num) {
  if (!num && num !== 0) return "";
  num = Math.floor(num);
  if (num === 0) return "ZERO";

  const ones = [
    "",
    "ONE",
    "TWO",
    "THREE",
    "FOUR",
    "FIVE",
    "SIX",
    "SEVEN",
    "EIGHT",
    "NINE",
    "TEN",
    "ELEVEN",
    "TWELVE",
    "THIRTEEN",
    "FOURTEEN",
    "FIFTEEN",
    "SIXTEEN",
    "SEVENTEEN",
    "EIGHTEEN",
    "NINETEEN",
  ];
  const tens = [
    "",
    "",
    "TWENTY",
    "THIRTY",
    "FORTY",
    "FIFTY",
    "SIXTY",
    "SEVENTY",
    "EIGHTY",
    "NINETY",
  ];

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
  num %= 10000000;
  const lakh = Math.floor(num / 100000);
  num %= 100000;
  const thousand = Math.floor(num / 1000);
  num %= 1000;
  const hundred = num;

  let parts = [];
  if (crore) parts.push(numberToIndianWords(crore) + " CRORE");
  if (lakh) parts.push(twoDigit(lakh) + " LAKH");
  if (thousand) parts.push(twoDigit(thousand) + " THOUSAND");
  if (hundred) parts.push(threeDigit(hundred));

  return parts.join(" ").trim();
}

function toIndianWords(amount) {
  amount = Number(amount || 0);
  const rupees = Math.floor(amount);
  const paise = Math.round((amount - rupees) * 100);
  let words = numberToIndianWords(rupees) || "ZERO";
  return paise > 0
    ? `${words} AND ${numberToIndianWords(paise)} PAISE ONLY`
    : `${words} ONLY`;
}

async function generatePO(po, items) {
  const tplPath = path.join(__dirname, "../templates/poTemplate.ejs");
  let tpl = fs.readFileSync(tplPath, "utf8");

  let watermark = "";
  try {
    const buff = fs.readFileSync(WATERMARK_ABSOLUTE);
    watermark = `data:image/png;base64,${buff.toString("base64")}`;
  } catch (e) {}

  const currency = po.currency || "INR";
  const fxRate = Number(po.exchangeRate || 1);
  const isForeign = currency !== "INR";

  const currencySymbol = currency === "USD" ? "$"
    : currency === "EUR" ? "€"
    : currency === "AED" ? "د.إ"
    : currency; // fallback

  const preparedRows = (items || []).map((it, i) => {
    const total = Number(it.total || it.rate * it.quantity || 0);

    return {
      sno: i + 1,
      description: it.itemName + (it.description ? "\n" + it.description : ""),
      hsn: it.hsnCode || "-",
      qty: Number(it.quantity || 0).toLocaleString("en-IN"),
      unit: it.unit || "Nos",
      rate: formatCurrency(it.rate, currency),
      amount: formatCurrency(total, currency),
      amountINR: isForeign ? INR(total * fxRate) : "",
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
      amount: "",
      amountINR: "",
    });
  }

  // FX + INR
  const foreignSubTotal = Number(po.foreignSubTotal || 0);
  const foreignGrandTotal = Number(po.foreignGrandTotal || 0);
  const subTotal = Number(po.subTotal || 0);
  const taxAmount = Number(po.totalGST || 0);
  const grandTotalNum = Number(po.grandTotal || 0);

  const inWords = toIndianWords(grandTotalNum);

  const gstType = (po.gstType || "").toUpperCase();
  const totalCGST = Number(po.totalCGST || 0);
  const totalSGST = Number(po.totalSGST || 0);
  const totalIGST = Number(po.totalIGST || 0);

  let gstLabel = "";
  const extracted = parseInt(gstType.match(/\d+/)?.[0] || "0");

  if (gstType.startsWith("IGST") && extracted > 0)
    gstLabel = `IGST @ ${extracted}%`;
  else if (gstType.startsWith("LGST") && extracted > 0)
    gstLabel = `CGST @ ${extracted / 2}% + SGST @ ${extracted / 2}%`;
  else if (gstType.includes("ITEMWISE"))
    gstLabel = "GST (Item-wise)";
  else
    gstLabel = "GST Exempted";

  // ✅ total quantity
const totalQty = (items || []).reduce((t, i) => t + Number(i.quantity || 0), 0);

  const html = ejs.render(tpl, {
    watermark,
    companyName: po.company?.name || "",
    companySub: po.company?.subtitle || "",
    companyAddress: po.company?.address || "",
    companyGST: po.company?.gstNumber || "",
    companyShort: po.company?.shortName || po.company?.name?.split(" ")[0] || "",
    vendorName: po.vendor?.name || "",
    vendorAddress: po.vendor?.address || "",
    vendorGST: po.vendor?.gstNumber || "",
    vendorEmail: po.vendor?.email || "",
    vendorPhone: po.vendor?.phone || "",
    poNumber: po.poNumber || po.id,
    poDate: po.createdAt ? new Date(po.createdAt).toLocaleDateString("en-IN") : "",
    paymentTerms: po.paymentTerms || "",
    deliveryTerms: po.deliveryTerms || "",
    contactPerson: po.contactPerson || "",
    cellNo: po.cellNo || "",
    warranty: po.warranty || "",
    rows: preparedRows,

    // ✅ Currency data
    currency,
    currencySymbol,
    isForeign,
    fxRate,

    // ✅ Values for table
    foreignSubTotal: formatCurrency(foreignSubTotal, currency),
    foreignGrandTotal: formatCurrency(foreignGrandTotal, currency),
    subTotal: INR(subTotal),
    cgst: INR(totalCGST),
    sgst: INR(totalSGST),
    igst: INR(totalIGST),
    taxAmount: INR(taxAmount),
    gstLabel,
    grandTotal: INR(grandTotalNum),
    inWords,
  });

  const outDir = path.join(__dirname, "../uploads/purchaseOrderFolder");
  fs.mkdirSync(outDir, { recursive: true });

  const fileName = `${(po.vendor?.name || "vendor").split(" ")[0]}-PO-${po.poNumber}.pdf`;
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
