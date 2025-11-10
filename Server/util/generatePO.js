// const fs = require("fs");
// const path = require("path");
// const ejs = require("ejs");
// const puppeteer = require("puppeteer");
// const numberToWords = require("./numberToWords");

// function getWatermark(companyName) {
//   if (!companyName) return null;
//   const lower = companyName.toLowerCase();
//   if (lower.startsWith("galo"))
//     return path.join(__dirname, "../assets/galo.png");
//   if (lower.startsWith("gautam"))
//     return path.join(__dirname, "../assets/gautam.png");
//   return null; // default no watermark
// }

// function formatCurrency(n) {
//   return Number(n || 0).toLocaleString("en-IN", {
//     minimumFractionDigits: 2,
//     maximumFractionDigits: 2,
//   });
// }

// function toIndianWords(amount) {
//   return numberToWords(amount);
// }

// function getGSTLabel(po) {
//   const gstType = po.gstType || "";
//   if (gstType.includes("ITEMWISE") || gstType.includes("EXEMPTED")) return "";
//   if (gstType.startsWith("IGST_")) return `IGST @ ${gstType.split("_")[1]}%`;
//   if (gstType.startsWith("LGST_")) {
//     const rate = gstType.split("_")[1];
//     return `CGST @ ${rate / 2}% + SGST @ ${rate / 2}%`;
//   }
//   return "";
// }

// async function generatePOBuffer(po, items) {
//   const tplPath = path.join(__dirname, "../templates/poTemplate.ejs");
//   const tpl = fs.readFileSync(tplPath, "utf8");

//   // Watermark
//   let watermark = "";
//   const selectedWatermark = getWatermark(po.company?.name);
//   if (selectedWatermark && fs.existsSync(selectedWatermark)) {
//     const buff = fs.readFileSync(selectedWatermark);
//     watermark = `data:image/png;base64,${buff.toString("base64")}`;
//   }

//   const gstType = (po.gstType || "").toUpperCase();
//   const isItemWise = gstType.includes("ITEMWISE");
//   const isExempted = gstType.includes("EXEMPTED");
//   const isIGST = gstType.startsWith("IGST_");
//   const isLGST = gstType.startsWith("LGST_");

//   let totalQty = 0,
//     grandTotal = 0,
//     totalGST = 0,
//     totalCGST = 0,
//     totalSGST = 0,
//     totalIGST = 0;

//   const preparedRows = (items || []).map((it, i) => {
//     const qty = Number(it.quantity || 0);
//     const rate = Number(it.rate || 0);
//     totalQty += qty;
//     const lineAmount = qty * rate;

//     let gstRate = 0,
//       gstAmount = 0,
//       finalAmount = lineAmount;
//     if (isItemWise) {
//       gstRate = Number(it.gstRate || 0);
//       gstAmount = (lineAmount * gstRate) / 100;
//       finalAmount += gstAmount;
//       totalGST += gstAmount;
//     }

//     grandTotal += finalAmount;

//      return {
//       sno: i + 1,
//       itemName: it.itemName != null ? it.itemName : "",       // keep numbers
//       modelNumber: it.modelNumber != null ? it.modelNumber : "",
//       itemDetail: it.itemDetail != null ? String(it.itemDetail) : "",
//       hsn: it.hsnCode || "",
//       qty,
//       unit: it.unit || "Nos",
//       rate: formatCurrency(rate),
//       lineAmount: formatCurrency(lineAmount),
//       gstRate: isItemWise ? `${gstRate}%` : "",
//       gstAmount: isItemWise ? formatCurrency(gstAmount) : "",
//       amount: formatCurrency(finalAmount),
//     };
//   });

//   // Smart Pagination
//   const FULL_PAGE_LIMIT = 5;
//   const FOOTER_PAGE_LIMIT = 5;
//   let rowsArr = [...preparedRows],
//     pages = [];

//   const totalRows = rowsArr.length;

//   if (totalRows <= FOOTER_PAGE_LIMIT) {
//     while (rowsArr.length < FOOTER_PAGE_LIMIT) rowsArr.push(null);
//     pages.push(rowsArr);
//   } else if (totalRows <= 8) {
//     let firstPageCount = totalRows - 1;
//     let page1 = rowsArr.splice(0, firstPageCount);
//     while (page1.length < FULL_PAGE_LIMIT) page1.push(null);
//     let page2 = rowsArr.splice(0);
//     while (page2.length < FOOTER_PAGE_LIMIT) page2.push(null);
//     pages.push(page1, page2);
//   } else {
//     while (rowsArr.length > FOOTER_PAGE_LIMIT)
//       pages.push(rowsArr.splice(0, FULL_PAGE_LIMIT));
//     let last = rowsArr.splice(0);
//     while (last.length < FOOTER_PAGE_LIMIT) last.push(null);
//     pages.push(last);
//   }

//   // NON-ITEMWISE GST
//   if (!isItemWise && !isExempted) {
//     const rate = Number(gstType.split("_")[1] || 0);
//     if (isIGST) {
//       totalIGST = (grandTotal * rate) / 100;
//       totalGST = totalIGST;
//       grandTotal += totalIGST;
//     }
//     if (isLGST) {
//       totalCGST = (grandTotal * rate) / 2 / 100;
//       totalSGST = (grandTotal * rate) / 2 / 100;
//       totalGST = totalCGST + totalSGST;
//       grandTotal += totalGST;
//     }
//   }

//   const gstLabel = getGSTLabel(po);
//   const inWords = toIndianWords(grandTotal);

//   const html = ejs.render(tpl, {
//     watermark,
//     companyName: po.company?.name,
//     companySub: po.company?.subtitle,
//     companyAddress: po.company?.address,
//     companyGST: po.company?.gstNumber,
//     vendorName: po.vendor?.name,
//     vendorAddress: po.vendor?.address,
//     vendorGST: po.vendor?.gstNumber,
//     vendorEmail: po.vendor?.email,
//     vendorPhone: po.vendor?.phone,
//     poNumber: po.poNumber,
//     poDate: new Date(po.createdAt).toLocaleDateString("en-IN"),
//     paymentTerms: po.paymentTerms,
//     deliveryTerms: po.deliveryTerms,
//     contactPerson: po.contactPerson,
//     cellNo: po.cellNo,
//     warranty: po.warranty,
//     gstType,
//     gstRate: po.gstRate,
//     rows: preparedRows,
//     pages,
//     gstLabel,
//     totalQty,
//     grandTotal,
//     grandTotalFormatted: formatCurrency(grandTotal),
//     inWords,
//     taxAmount: formatCurrency(totalGST),
//     cgst: formatCurrency(totalCGST),
//     sgst: formatCurrency(totalSGST),
//     igst: formatCurrency(totalIGST),
//   });

//   const browser = await puppeteer.launch({
//     headless: true,
//     args: ["--no-sandbox", "--disable-setuid-sandbox"],
//   });
//   try {
//     const page = await browser.newPage();
//     await page.setContent(html, { waitUntil: "networkidle0" });
//     const pdfBuffer = await page.pdf({
//       format: "A4",
//       printBackground: true,
//       margin: { top: 0, bottom: 0, left: 0, right: 0 },
//       preferCSSPageSize: true,
//     });
//     return pdfBuffer; // ✅ return buffer for direct download
//   } finally {
//     await browser.close();
//   }
// }

// module.exports = generatePOBuffer;

const fs = require("fs");
const path = require("path");
const ejs = require("ejs");
const puppeteer = require("puppeteer");
const numberToWords = require("./numberToWords");

function getWatermark(companyName) {
  if (!companyName) return null;
  const lower = companyName.toLowerCase();
  if (lower.startsWith("galo"))
    return path.join(__dirname, "../assets/galo.png");
  if (lower.startsWith("gautam"))
    return path.join(__dirname, "../assets/gautam.png");
  return null;
}

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
  const gstType = po.gstType || "";
  if (gstType.includes("ITEMWISE") || gstType.includes("EXEMPTED")) return "";
  if (gstType.startsWith("IGST_")) return `IGST @ ${gstType.split("_")[1]}%`;
  if (gstType.startsWith("LGST_")) {
    const rate = gstType.split("_")[1];
    return `CGST @ ${rate / 2}% + SGST @ ${rate / 2}%`;
  }
  return "";
}

async function generatePOBuffer(po, items) {
  const tplPath = path.join(__dirname, "../templates/poTemplate.ejs");
  const tpl = fs.readFileSync(tplPath, "utf8");

  // Watermark
  let watermark = "";
  const selectedWatermark = getWatermark(po.company?.name);
  if (selectedWatermark && fs.existsSync(selectedWatermark)) {
    const buff = fs.readFileSync(selectedWatermark);
    watermark = `data:image/png;base64,${buff.toString("base64")}`;
  }

  const gstType = (po.gstType || "").toUpperCase();
  const isItemWise = gstType.includes("ITEMWISE");
  const isExempted = gstType.includes("EXEMPTED");
  const isIGST = gstType.startsWith("IGST_");
  const isLGST = gstType.startsWith("LGST_");

  let totalQty = 0,
    grandTotal = 0,
    totalGST = 0,
    totalCGST = 0,
    totalSGST = 0,
    totalIGST = 0;

  // 🧾 Prepare item rows
  const preparedRows = (items || []).map((it, i) => {
    const qty = Number(it.quantity || 0);
    const rate = Number(it.rate || 0);
    totalQty += qty;
    const lineAmount = qty * rate;

    let gstRate = 0,
      gstAmount = 0,
      finalAmount = lineAmount;
    if (isItemWise) {
      gstRate = Number(it.gstRate || 0);
      gstAmount = (lineAmount * gstRate) / 100;
      finalAmount += gstAmount;
      totalGST += gstAmount;
    }

    grandTotal += finalAmount;

    return {
      sno: i + 1,
      itemName: it.itemName != null ? it.itemName : "",
      modelNumber: it.modelNumber != null ? it.modelNumber : "",
      itemDetail: it.itemDetail != null ? String(it.itemDetail) : "",
      hsn: it.hsnCode || "",
      qty,
      unit: it.unit || "Nos",
      rate: formatCurrency(rate),
      lineAmount: formatCurrency(lineAmount),
      gstRate: isItemWise ? `${gstRate}%` : "",
      gstAmount: isItemWise ? formatCurrency(gstAmount) : "",
      amount: formatCurrency(finalAmount),
    };
  });

  // // 📄 Smart Pagination
  // const FULL_PAGE_LIMIT = 5;
  // const FOOTER_PAGE_LIMIT = 4;
  // let rowsArr = [...preparedRows],
  //   pages = [];

  // const totalRows = rowsArr.length;
  // if (totalRows <= FOOTER_PAGE_LIMIT) {
  //   while (rowsArr.length < FOOTER_PAGE_LIMIT) rowsArr.push(null);
  //   pages.push(rowsArr);
  // } else if (totalRows <= 8) {
  //   let firstPageCount = totalRows - 1;
  //   let page1 = rowsArr.splice(0, firstPageCount);
  //   while (page1.length < FULL_PAGE_LIMIT) page1.push(null);
  //   let page2 = rowsArr.splice(0);
  //   while (page2.length < FOOTER_PAGE_LIMIT) page2.push(null);
  //   pages.push(page1, page2);
  // } else {
  //   while (rowsArr.length > FOOTER_PAGE_LIMIT)
  //     pages.push(rowsArr.splice(0, FULL_PAGE_LIMIT));
  //   let last = rowsArr.splice(0);
  //   while (last.length < FOOTER_PAGE_LIMIT) last.push(null);
  //   pages.push(last);
  // }

  function getPageSplits(preparedRows) {
    const FULL_PAGE = 5;
    const FOOTER_PAGE = 4;
    const LAST_PAGE = 1;

    let rows = [...preparedRows];
    let pages = [];
    let total = rows.length;

    // Helper to push a page with padding
    const pushPage = (arr, padTo = FULL_PAGE) => {
      while (arr.length < padTo) arr.push(null);
      pages.push(arr);
    };

    // --- Handle small datasets (<5) ---
    if (total < FULL_PAGE) {
      // Pad to 4 rows first
      pushPage(rows.splice(0), FOOTER_PAGE);
      return pages;
    }

    // --- Handle exactly 5 rows ---
    if (total === FULL_PAGE) {
      pushPage(rows.splice(0, FULL_PAGE - 1), FULL_PAGE); // 4 rows
      pushPage(rows.splice(0, 1), FOOTER_PAGE); // last page 1 + footer
      return pages;
    }

    // --- Handle multiples of 5 (>5) ---
    if (total % FULL_PAGE === 0) {
      while (rows.length > FULL_PAGE) {
        pushPage(rows.splice(0, FULL_PAGE));
      }
      // Pre-last page (4 rows)
      pushPage(rows.splice(0, FULL_PAGE - 1));
      // Last page 1 row + footer
      pushPage(rows.splice(0, 1), FOOTER_PAGE);
      return pages;
    }

    // --- Handle non-multiples of 5 (>5) ---
    while (rows.length > FULL_PAGE) {
      pushPage(rows.splice(0, FULL_PAGE));
    }

    // Last page: remaining rows + footer padding
    if (rows.length > 0) {
      pushPage(rows.splice(0, rows.length), FOOTER_PAGE);
    }

    return pages;
  }

  // 🧾 Generate pages dynamically
  const pages = getPageSplits(preparedRows);

  // 🆕 Handle Other Charges
  const otherCharges = po.otherCharges || [];
  let totalOtherCharges = 0;
  for (const ch of otherCharges) {
    totalOtherCharges += Number(ch.amount || 0);
  }

  // --- STEP 1: Subtotal from items ---
  const subTotal = grandTotal;

  // --- STEP 2: Apply Logic Based on GST Type ---
  if (isItemWise) {
    // 🟢 Itemwise GST — no GST on other charges
    grandTotal = subTotal + totalOtherCharges;
  } else if (isExempted) {
    // 🟡 Exempted — no GST, just add charges
    grandTotal = subTotal + totalOtherCharges;
  } else {
    // 🔵 Non-itemwise GST — add charges first, then apply GST
    const taxableAmount = subTotal + totalOtherCharges;
    const rate = Number(gstType.split("_")[1] || 0);

    if (isIGST) {
      totalIGST = (taxableAmount * rate) / 100;
      totalGST = totalIGST;
      grandTotal = taxableAmount + totalIGST;
    } else if (isLGST) {
      totalCGST = (taxableAmount * rate) / 2 / 100;
      totalSGST = (taxableAmount * rate) / 2 / 100;
      totalGST = totalCGST + totalSGST;
      grandTotal = taxableAmount + totalGST;
    }
  }

  const gstLabel = getGSTLabel(po);
  const inWords = toIndianWords(grandTotal);

  const runningTotalAmount = subTotal;
  const totalOtherChargesRaw =
    typeof totalOtherCharges === "string"
      ? parseFloat(totalOtherCharges.replace(/,/g, "")) || 0
      : totalOtherCharges || 0;

  // 🧾 Render EJS
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
    gstRate: po.gstRate,
    rows: preparedRows,
    pages,
    gstLabel,
    totalQty,
    grandTotal,
    grandTotalFormatted: formatCurrency(grandTotal),
    inWords,
    taxAmount: formatCurrency(totalGST),
    cgst: formatCurrency(totalCGST),
    sgst: formatCurrency(totalSGST),
    igst: formatCurrency(totalIGST),
    otherCharges,
    runningTotalAmount,
    totalOtherChargesRaw,
    totalOtherCharges: formatCurrency(totalOtherCharges),
  });

  const browser = await puppeteer.launch({
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-extensions",
      "--disable-background-timer-throttling",
      "--disable-backgrounding-occluded-windows",
    ],
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1200, height: 800 });
    await page.setContent(html, { waitUntil: "domcontentloaded" }); // Faster than networkidle0
    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: 0, bottom: 0, left: 0, right: 0 },
      preferCSSPageSize: true,
    });
    return pdfBuffer;
  } finally {
    await browser.close();
  }
}

module.exports = generatePOBuffer;
