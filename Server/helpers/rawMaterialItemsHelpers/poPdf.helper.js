const generatePO = require("../../util/generatePO");

const buildPOPdfBuffer = async ({ po, userId }) => {
  // Freeze item values exactly as stored
  const items = po.items.map((it) => ({
    itemName: it.itemName,
    hsnCode: it.hsnCode || "-",
    quantity: Number(it.quantity),
    modelNumber: it.modelNumber || null,
    itemDetail: it.itemDetail || null,
    unit: it.unit || "Nos",
    rate: Number(it.rate),
    total: Number(it.total),
    gstRate: it.gstRate ? Number(it.gstRate) : 0,
    rateInForeign: it.rateInForeign ? Number(it.rateInForeign) : null,
    amountInForeign: it.amountInForeign ? Number(it.amountInForeign) : null,
  }));

  const pdfBuffer = await generatePO(po, items);
  
  const fileName = `PO-${po.poNumber}.pdf`;

  return { pdfBuffer, fileName };
};

module.exports = buildPOPdfBuffer;
