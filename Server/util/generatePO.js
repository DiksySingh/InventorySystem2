const fs = require("fs");
const path = require("path");
const puppeteer = require("puppeteer");
const num2words = require("num2words");

const INR = n => Number(n).toLocaleString("en-IN", { minimumFractionDigits: 2 });

async function generatePO(po, items) {
  const templatePath = path.join(__dirname, "../templates/poTemplate.html");
  let html = fs.readFileSync(templatePath, "utf8");

  const watermark = path.join(__dirname, "../../assets/galo.png");

  const rowsHTML = items.map((i, idx) => `
    <tr>
      <td>${idx + 1}</td>
      <td>${i.itemName}</td>
      <td>${i.hsnCode}</td>
      <td>${i.quantity}</td>
      <td>${i.unit}</td>
      <td class="text-right">${INR(i.rate)}</td>
      <td class="text-right">${INR(i.total)}</td>
    </tr>
  `).join("");

  html = html
    .replace("{{watermark}}", watermark)
    .replace(/{{companyName}}/g, po.company.name)
    .replace(/{{companyAddress}}/g, po.company.address)
    .replace("{{companyGST}}", po.company.gstNumber)
    .replace("{{vendorName}}", po.vendor.name)
    .replace("{{vendorAddress}}", po.vendor.address)
    .replace("{{vendorGST}}", po.vendor.gstNumber)
    .replace("{{poNumber}}", po.poNumber)
    .replace("{{poDate}}", new Date(po.createdAt).toLocaleDateString("en-IN"))
    .replace("{{paymentTerms}}", po.paymentTerms)
    .replace("{{deliveryTerms}}", po.deliveryTerms)
    .replace("{{contactPerson}}", po.contactPerson)
    .replace("{{cellNo}}", po.cellNo)
    .replace("{{gstRate}}", "18")
    .replace("{{totalGST}}", INR(po.totalGST))
    .replace("{{totalQty}}", items.reduce((s,a)=>s + Number(a.quantity), 0))
    .replace("{{grandTotal}}", INR(po.grandTotal))
    .replace("{{inWords}}", num2words(po.grandTotal,{lang:"en"}).toUpperCase()+" ONLY")
    .replace("{{rows}}", rowsHTML);

  const folder = path.join(__dirname, "../../uploads/purchaseOrderFolder/");
  fs.mkdirSync(folder, { recursive: true });

  const fileName = `${po.vendor.name.split(" ")[0]}-PO-${po.poNumber}.pdf`;
  const outputPath = path.join(folder, fileName);

  const browser = await puppeteer.launch({
    headless: true,
    defaultViewport: null,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--font-render-hinting=medium"
    ]
  });

  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: "load" });

  await page.pdf({
    path: outputPath,
    format: "A4",
    printBackground: true,
    preferCSSPageSize: true,
    margin: {
      top: "5mm",
      right: "5mm",
      bottom: "10mm",
      left: "5mm"
    }
  });

  await browser.close();

  return outputPath;
}

module.exports = generatePO;
