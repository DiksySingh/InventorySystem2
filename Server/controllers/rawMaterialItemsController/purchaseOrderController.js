const prisma = require("../../config/prismaClient");
const Decimal = require("decimal.js");
const SystemItem = require("../../models/systemInventoryModels/systemItemSchema");
const { where } = require("../../models/serviceInventoryModels/warehouseSchema");

function getISTDate() {
  const now = new Date();
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  // IST = UTC + 5 hours 30 minutes
  return new Date(utc + 5.5 * 60 * 60 * 1000);
}

function getFinancialYear(date = getISTDate()) {
  const year = date.getFullYear();
  const month = date.getMonth() + 1; // Jan = 1
  const startYear = month >= 4 ? year : year - 1;
  const endYear = startYear + 1;
  return `${startYear.toString().slice(-2)}${endYear.toString().slice(-2)}`;
}

function getStateCode(stateName) {
  if (!stateName) return "XX";
  const s = stateName.toLowerCase();
  if (s.includes("Haryana")) return "HR";
  if (s.includes("Maharashtra")) return "MH";
  if (s.includes("Uttarakhand") || s.includes("Haridwar") || s.includes("UK"))
    return "UK";
  if (s.includes("Gujarat")) return "GJ";
  if (s.includes("Rajasthan")) return "RJ";
  if (s.includes("Delhi")) return "DL";
  return s.substring(0, 2).toUpperCase();
}

async function generatePONumber(company) {
  const fy = getFinancialYear();
  const stateCode = getStateCode(company.state);
  const prefix = `${company.companyCode}${stateCode}`;
  const counterKey = `${company.id}_${fy}`;

  const counter = await prisma.counter.upsert({
    where: { name: counterKey },
    update: { seq: { increment: 1 } },
    create: {
      name: counterKey,
      companyId: company.id,
      financialYear: fy,
      seq: 1,
    },
  });

  const nextSeq = counter.seq.toString().padStart(4, "0");
  return `${prefix}${fy}${nextSeq}`;
}

const createCompany = async (req, res) => {
  try {
    const {
      name,
      companyCode,
      gstNumber,
      address,
      city,
      state,
      pincode,
      country,
      contactNumber,
      alternateNumber,
      email,
      currency,
    } = req.body;

    const createdBy = req.user?.id;

    // 🔹 Basic validation
    if (
      !name ||
      !companyCode ||
      !gstNumber ||
      !address ||
      !contactNumber ||
      !email
    ) {
      return res.status(400).json({
        success: false,
        message: "Company name and createdBy are required.",
      });
    }

    const trimmedName = name.trim();
    const upperCaseGST = gstNumber.toUpperCase().trim();
    const trimmedAddress = address.trim();
    const lowerCaseEmail = email.toLowerCase().trim();

    // 🔹 Email format validation
    if (email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(lowerCaseEmail)) {
        return res.status(400).json({
          success: false,
          message: "Invalid email format.",
        });
      }
    }

    // 🔹 GST number duplicate check
    if (gstNumber) {
      const existingCompany = await prisma.company.findFirst({
        where: { gstNumber: upperCaseGST },
      });

      if (existingCompany) {
        return res.status(400).json({
          success: false,
          message: `A company with GST number '${upperCaseGST}' already exists.`,
        });
      }
    }

    const allowedCountries = [
      "INDIA",
      "USA",
      "UAE",
      "UK",
      "CHINA",
      "RUSSIA",
      "OTHER",
    ];
    const allowedCurrencies = [
      "INR",
      "USD",
      "EUR",
      "GBP",
      "CNY",
      "AED",
      "OTHER",
    ];

    if (country && !allowedCountries.includes(country)) {
      return res.status(400).json({
        success: false,
        message: `Invalid country. Allowed values: ${allowedCountries.join(", ")}`,
      });
    }

    if (currency && !allowedCurrencies.includes(currency)) {
      return res.status(400).json({
        success: false,
        message: `Invalid currency. Allowed values: ${allowedCurrencies.join(", ")}`,
      });
    }
    const trimmedCompanyCode = companyCode.toUpperCase().trim();
    const newCompany = await prisma.company.create({
      data: {
        name: trimmedName,
        companyCode: trimmedCompanyCode,
        gstNumber: upperCaseGST,
        address: trimmedAddress,
        city,
        state,
        pincode,
        contactNumber,
        alternateNumber,
        email: lowerCaseEmail,
        country: country || "INDIA",
        currency: currency || "INR",
        createdBy,
      },
    });

    return res.status(201).json({
      success: true,
      message: "Company created successfully.",
      data: newCompany,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Internal Server Error",
    });
  }
};

const createVendor = async (req, res) => {
  try {
    const {
      name,
      email,
      gstNumber,
      address,
      city,
      state,
      pincode,
      country,
      currency,
      contactNumber,
      alternateNumber,
    } = req.body;

    const createdBy = req.user?.id || req.body.createdBy;

    if (
      !name ||
      !gstNumber ||
      !address ||
      !contactNumber ||
      !email ||
      !country ||
      !currency ||
      !pincode
    ) {
      return res.status(400).json({
        success: false,
        message: "All fields are required",
      });
    }

    const upperCaseName = name.toUpperCase().trim();
    const upperCaseGST = gstNumber.toUpperCase().trim();
    const upperCaseAddress = address.toUpperCase().trim();
    const lowerCaseEmail = email.toLowerCase().trim();

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(lowerCaseEmail)) {
      return res.status(400).json({
        success: false,
        message: "Invalid email format.",
      });
    }

    const existingVendor = await prisma.vendor.findFirst({
      where: { gstNumber: upperCaseGST },
    });

    if (existingVendor) {
      return res.status(400).json({
        success: false,
        message: `A vendor with GST number '${upperCaseGST}' already exists.`,
      });
    }

    // 🔹 Validate enum values
    const allowedCountries = [
      "INDIA",
      "USA",
      "UAE",
      "UK",
      "CHINA",
      "RUSSIA",
      "OTHER",
    ];
    const allowedCurrencies = [
      "INR",
      "USD",
      "EUR",
      "GBP",
      "CNY",
      "AED",
      "OTHER",
    ];

    if (country && !allowedCountries.includes(country)) {
      return res.status(400).json({
        success: false,
        message: `Invalid country. Allowed values: ${allowedCountries.join(", ")}`,
      });
    }

    if (currency && !allowedCurrencies.includes(currency)) {
      return res.status(400).json({
        success: false,
        message: `Invalid currency. Allowed values: ${allowedCurrencies.join(", ")}`,
      });
    }

    // ✅ Create vendor
    const newVendor = await prisma.vendor.create({
      data: {
        name: upperCaseName,
        email: lowerCaseEmail,
        gstNumber: upperCaseGST,
        address: upperCaseAddress,
        city,
        state,
        pincode,
        country: country || "INDIA",
        currency: currency || "INR",
        contactNumber,
        alternateNumber,
        createdBy,
      },
    });

    return res.status(201).json({
      success: true,
      message: "Vendor created successfully.",
      data: newVendor,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Internal Server Error",
    });
  }
};

const getAllCompanies = async (req, res) => {
  try {
    const companies = await prisma.company.findMany({
      select: {
        id: true,
        name: true,
        state: true,
      },
      orderBy: {
        name: "asc",
      },
    });

    const formattedCompanies = companies.map((company) => ({
      id: company.id,
      displayName: `${company.name}${company.state ? `, ${company.state}` : ""}`,
    }));

    return res.status(200).json({
      success: true,
      message: "Companies fetched successfully.",
      data: formattedCompanies || [],
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Internal Server Error",
    });
  }
};

const getAllVendors = async (req, res) => {
  try {
    const vendors = await prisma.vendor.findMany({
      select: {
        id: true,
        name: true,
        country: true,
      },
      orderBy: {
        name: "asc",
      },
    });

    const formattedVendors = vendors.map((vendor) => ({
      id: vendor.id,
      displayName: `${vendor.name}${vendor.country ? `, ${vendor.country}` : ""}`,
    }));

    return res.status(200).json({
      success: true,
      message: "Vendors fetched successfully.",
      data: formattedVendors || [],
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Internal Server Error",
    });
  }
};

const getAllItems = async (req, res) => {
  try {
    const mysqlItems = await prisma.rawMaterial.findMany({
      select: {
        id: true,
        name: true,
      },
    });

    const formattedMySQL = mysqlItems.map((item) => ({
      id: item.id,
      name: item.name,
      source: "mysql",
    }));

    const mongoItems = await SystemItem.find({}, { itemName: 1 }).lean();

    const formattedMongo = mongoItems.map((item) => ({
      id: item._id.toString(),
      name: item.itemName,
      source: "mongo",
    }));

    const allItems = [...formattedMySQL, ...formattedMongo];

    return res.status(200).json({
      success: true,
      count: allItems.length,
      items: allItems || [],
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch items",
    });
  }
};

const createPurchaseOrder = async (req, res) => {
  try {
    const {
      companyId,
      vendorId,
      gstType,
      items,
      remarks,
      paymentTerms,
      deliveryTerms,
      warranty,
      contactPerson,
      cellNo,
    } = req.body;

    const userId = req.user?.id;
    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "User data is missing",
      });
    }

    const userData = await prisma.user.findUnique({
      where: {
        id: userId,
      },
      include: {
        role: {
          select: {
            name: true,
          },
        },
      },
    });

    if (!userData) {
      return res.status(404).json({
        success: false,
        message: "User data not found in database",
      });
    }

    if (userData.role.name !== "Purchase") {
      return res.status(400).json({
        success: false,
        message:
          "Only Purchase Department is allowed to create purchase order.",
      });
    }

    if (!companyId || !vendorId || !gstType || !items)
      return res.status(400).json({
        success: false,
        message: "Company, Vendor, GST Type, Items are required",
      });

    if (!items?.length)
      return res
        .status(400)
        .json({ success: false, message: "Items are required" });

    for (const item of items) {
      if (!item.id || !item.source || !item.name) {
        return res.status(400).json({
          success: false,
          message: "Each item must include id, source, and name.",
        });
      }

      if (!item.rate || !item.quantity || Number(item.quantity) <= 0) {
        return res.status(400).json({
          success: false,
          message: "Item quantity and rate must be greater than zero.",
        });
      }
    }

    const company = await prisma.company.findUnique({
      where: { id: companyId },
    });
    if (!company)
      return res
        .status(404)
        .json({ success: false, message: "Company not found" });

    const vendor = await prisma.vendor.findUnique({
      where: {
        id: vendorId,
      },
    });
    if (!vendor)
      return res
        .status(404)
        .json({ success: false, message: "Vendor not found" });

    const poNumber = await generatePONumber(company);

    // Check duplicate (extra safety)
    if (await prisma.purchaseOrder.findUnique({ where: { poNumber } }))
      return res
        .status(400)
        .json({ success: false, message: `PO ${poNumber} already exists.` });

    // -------- GST Calculation --------
    let subTotal = new Decimal(0);
    let totalCGST = new Decimal(0);
    let totalSGST = new Decimal(0);
    let totalIGST = new Decimal(0);

    const normalItems = [];
    const itemWiseItems = [];

    for (const item of items) {
      const total = new Decimal(item.rate).mul(item.quantity);
      subTotal = subTotal.plus(total);

      const itype = item.itemGSTType || gstType;
      itype.includes("ITEMWISE")
        ? itemWiseItems.push(item)
        : normalItems.push(item);
    }

    // 🌍 Global GST on combined total of normal items
    if (normalItems.length) {
      const normalTotal = normalItems.reduce(
        (sum, i) => sum.plus(new Decimal(i.rate).mul(i.quantity)),
        new Decimal(0)
      );

      switch (gstType) {
        case "LGST_18":
          totalCGST = totalCGST.plus(normalTotal.mul(0.09));
          totalSGST = totalSGST.plus(normalTotal.mul(0.09));
          break;
        case "LGST_5":
          totalCGST = totalCGST.plus(normalTotal.mul(0.025));
          totalSGST = totalSGST.plus(normalTotal.mul(0.025));
          break;
        case "IGST_18":
          totalIGST = totalIGST.plus(normalTotal.mul(0.18));
          break;
        case "IGST_5":
          totalIGST = totalIGST.plus(normalTotal.mul(0.05));
          break;
        case "LGST_EXEMPTED":
        case "IGST_EXEMPTED":
          break;
      }
    }

    // 🧮 Itemwise GST
    for (const item of itemWiseItems) {
      const total = new Decimal(item.rate).mul(item.quantity);
      const rate = new Decimal(item.gstRate || 0);
      const type = item.itemGSTType;

      if (type === "LGST_ITEMWISE") {
        totalCGST = totalCGST.plus(total.mul(rate.div(200)));
        totalSGST = totalSGST.plus(total.mul(rate.div(200)));
      } else if (type === "IGST_ITEMWISE") {
        totalIGST = totalIGST.plus(total.mul(rate.div(100)));
      }
    }

    const totalGST = totalCGST.plus(totalSGST).plus(totalIGST);
    const grandTotal = subTotal.plus(totalGST);

    // -------- Persist PO + Audit Log Tx --------
    const newPO = await prisma.$transaction(async (tx) => {
      const po = await tx.purchaseOrder.create({
        data: {
          poNumber,
          financialYear: getFinancialYear(),
          companyId,
          vendorId,
          gstType,
          subTotal,
          totalCGST,
          totalSGST,
          totalIGST,
          totalGST,
          grandTotal,
          remarks,
          paymentTerms,
          deliveryTerms,
          warranty,
          contactPerson,
          cellNo,
          createdBy: req.user?.id,
          items: {
            create: items.map((i) => ({
              itemId: i.id,
              itemSource: i.source,
              itemName: i.name,
              hsnCode: i.hsnCode || null,
              modelNumber: i.modelNumber || null,
              unit: i.unit || "Nos",
              rate: new Decimal(i.rate),
              gstRate: new Decimal(i.gstRate || 0),
              quantity: new Decimal(i.quantity),
              total: new Decimal(i.rate).mul(i.quantity),
              itemGSTType: i.itemGSTType || gstType,
            })),
          },
        },
        include: { items: true, vendor: true, company: true },
      });

      await tx.auditLog.create({
        data: {
          entityType: "PurchaseOrder",
          entityId: po.id,
          action: "CREATED",
          performedBy: req.user?.id,
          newValue: po,
        },
      });

      return po;
    });

    return res.status(201).json({
      success: true,
      message: "✅ Purchase Order Created Successfully",
      data: newPO,
    });
  } catch (err) {
    console.error("PO Create Error:", err);
    if (err.code === "P2002" && err.meta?.target?.includes("poNumber")) {
      return res.status(400).json({
        success: false,
        message: "Duplicate PO number detected. Please retry.",
      });
    }

    return res.status(500).json({ message: err.message || "Server error" });
  }
};

const updatePurchaseOrder = async (req, res) => {
  try {
    const { poId } = req.params;
    const {
      companyId,
      vendorId,
      gstType,
      items,
      remarks,
      paymentTerms,
      deliveryTerms,
      warranty,
      contactPerson,
      cellNo,
    } = req.body;

    const userId = req.user?.id;
    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "User data missing",
      });
    }

    // ✅ Check if user has Purchase role
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { role: { select: { name: true } } },
    });

    if (!user || user.role?.name !== "Purchase") {
      return res.status(403).json({
        success: false,
        message: "Only Purchase Department can update PO",
      });
    }

    if (!items?.length) {
      return res
        .status(400)
        .json({ success: false, message: "Items are required" });
    }

    // ✅ Validate item input
    for (const item of items) {
      if (!item.id || !item.source || !item.name) {
        return res.status(400).json({
          success: false,
          message: "Each item must include id, source, and name",
        });
      }

      if (!item.rate || !item.quantity || Number(item.quantity) <= 0) {
        return res.status(400).json({
          success: false,
          message: "Item quantity and rate must be greater than zero",
        });
      }
    }

    // ✅ Fetch existing PO
    const existingPO = await prisma.purchaseOrder.findUnique({
      where: { id: poId },
      include: { items: true },
    });

    if (!existingPO)
      return res.status(404).json({ success: false, message: "PO not found" });

    // ✅ Only Draft PO can be updated
    if (existingPO.status !== "Draft") {
      return res.status(400).json({
        success: false,
        message: "Only Draft PO can be updated",
      });
    }

    const oldValue = JSON.parse(JSON.stringify(existingPO));

    // ---- GST Calculations ----
    let subTotal = new Decimal(0);
    let totalCGST = new Decimal(0);
    let totalSGST = new Decimal(0);
    let totalIGST = new Decimal(0);

    const normalItems = [];
    const itemWiseItems = [];

    for (const item of items) {
      const total = new Decimal(item.rate).mul(item.quantity);
      subTotal = subTotal.plus(total);

      const type = item.itemGSTType || gstType;
      type.includes("ITEMWISE")
        ? itemWiseItems.push(item)
        : normalItems.push(item);
    }

    // ✅ Global GST
    if (normalItems.length) {
      const normalTotal = normalItems.reduce(
        (sum, i) => sum.plus(new Decimal(i.rate).mul(i.quantity)),
        new Decimal(0)
      );

      switch (gstType) {
        case "LGST_18":
          totalCGST = totalCGST.plus(normalTotal.mul(0.09));
          totalSGST = totalSGST.plus(normalTotal.mul(0.09));
          break;
        case "LGST_5":
          totalCGST = totalCGST.plus(normalTotal.mul(0.025));
          totalSGST = totalSGST.plus(normalTotal.mul(0.025));
          break;
        case "IGST_18":
          totalIGST = totalIGST.plus(normalTotal.mul(0.18));
          break;
        case "IGST_5":
          totalIGST = totalIGST.plus(normalTotal.mul(0.05));
          break;
        case "LGST_EXEMPTED":
        case "IGST_EXEMPTED":
          break;
      }
    }

    // ✅ Itemwise GST
    for (const item of itemWiseItems) {
      const total = new Decimal(item.rate).mul(item.quantity);
      const rate = new Decimal(item.gstRate || 0);

      if (item.itemGSTType === "LGST_ITEMWISE") {
        totalCGST = totalCGST.plus(total.mul(rate.div(200)));
        totalSGST = totalSGST.plus(total.mul(rate.div(200)));
      } else if (item.itemGSTType === "IGST_ITEMWISE") {
        totalIGST = totalIGST.plus(total.mul(rate.div(100)));
      }
    }

    const totalGST = totalCGST.plus(totalSGST).plus(totalIGST);
    const grandTotal = subTotal.plus(totalGST);

    // ✅ Update PO in transaction
    const updatedPO = await prisma.$transaction(async (tx) => {
      await tx.purchaseOrderItem.deleteMany({
        where: { purchaseOrderId: poId },
      });

      const po = await tx.purchaseOrder.update({
        where: { id: poId },
        data: {
          companyId: companyId || existingPO.companyId,
          vendorId: vendorId || existingPO.vendorId,
          gstType,
          subTotal,
          totalCGST,
          totalSGST,
          totalIGST,
          totalGST,
          grandTotal,
          remarks,
          paymentTerms,
          deliveryTerms,
          warranty,
          contactPerson,
          cellNo,
          items: {
            create: items.map((i) => ({
              itemId: i.id,
              itemSource: i.source,
              itemName: i.name,
              hsnCode: i.hsnCode || null,
              modelNumber: i.modelNumber || null,
              unit: i.unit || "Nos",
              rate: new Decimal(i.rate),
              gstRate: new Decimal(i.gstRate || 0),
              quantity: new Decimal(i.quantity),
              total: new Decimal(i.rate).mul(i.quantity),
              itemGSTType: i.itemGSTType || gstType,
            })),
          },
        },
        include: { items: true },
      });

      await tx.auditLog.create({
        data: {
          entityType: "PurchaseOrder",
          entityId: po.id,
          action: "UPDATED",
          performedBy: req.user?.id,
          oldValue,
          newValue: po,
        },
      });

      return po;
    });

    res.json({
      success: true,
      message: "✅ Purchase Order updated successfully",
      data: updatedPO,
    });
  } catch (err) {
    console.error("PO Update Error:", err);

    if (err.code === "P2002") {
      return res.status(400).json({
        success: false,
        message: "Duplicate data entry detected",
      });
    }

    res.status(500).json({
      success: false,
      message: err.message || "Internal Server Error",
    });
  }
};

const getPOListByCompany = async (req, res) => {
  try {
    const { companyId } = req.query;

    if (!companyId) {
      return res.status(400).json({
        success: false,
        message: "companyId is required",
      });
    }

    const userId = req.user?.id;
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { role: true },
    });

    if (!user || !["Purchase", "Admin"].includes(user.role?.name)) {
      return res.status(403).json({
        success: false,
        message: "Access denied",
      });
    }

    const poList = await prisma.purchaseOrder.findMany({
      where: { companyId },
      select: {
        id: true,
        poNumber: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return res.status(200).json({
      success: true,
      message: "PO list fetched successfully",
      data: poList,
    });
  } catch (error) {
    console.error("Error fetching PO list:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Internal Server Error",
    });
  }
};

const getPurchaseOrderDetails = async (req, res) => {
  try {
    const { poId } = req.query;

    if (!poId) {
      return res.status(400).json({
        success: false,
        message: "Purchase Order ID is required",
      });
    }

    const po = await prisma.purchaseOrder.findUnique({
      where: { id: poId },
      include: {
        company: {
          select: {
            id: true,
            name: true,
            gstNumber: true,
            address: true,
            state: true,
          },
        },
        vendor: {
          select: {
            id: true,
            name: true,
            gstNumber: true,
            address: true,
            state: true,
            contactPerson: true,
            contactNumber: true,
          },
        },
        items: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!po) {
      return res.status(404).json({
        success: false,
        message: "Purchase Order not found",
      });
    }

    return res.json({
      success: true,
      message: "PO details fetched successfully",
      data: po,
    });
  } catch (error) {
    console.error("❌ Error fetching PO details:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Internal Server Error",
    });
  }
};

//------------ Download PO Pdf -------------------//

function addWatermark(doc) {
  try {
    const logoPath = path.join(__dirname, "../../assets/galo.png");
    doc.save();
    doc.opacity(0.1).image(logoPath, 120, 180, { width: 350 });
    doc.opacity(1);
    doc.restore();
  } catch (err) {
    console.log("Logo missing");
  }
}

function drawTableHeader(doc, y = doc.y) {
  doc.fontSize(10).font("Helvetica-Bold");
  doc.text("Item", 20, y);
  doc.text("HSN", 180, y);
  doc.text("Qty", 250, y);
  doc.text("Rate", 290, y);
  doc.text("GST%", 340, y);
  doc.text("Total", 390, y);
  doc.moveDown(0.5);
  doc.font("Helvetica");
}

function getFirstTwoWords(str) {
  if (!str) return "";
  const words = str.trim().split(/\s+/);
  if (words.length <= 1) {
    return words[0] || "";
  }
  return words.slice(0, 2).join(" ");
}

const downloadPOPDF = async (req, res) => {
  try {
    const { poId } = req.params;
    const userId = req.user?.id;
    if(userId) {
      return res.status(404).json({
        success: false,
        message: "UserId not found."
      });
    }

    const userData = await prisma.user.findUnique({
      where: {
        id: userId
      },
      include: {
        role: {
          select: {
            name: true
          }
        }
      }
    });

    if(!userData) {
       return res.status(404).json({
        success: false,
        message: "User not found."
      });
    }

    if(userData.role?.name !== "Purchase") {
      return res.status(404).json({
        success: false,
        message: "Only Purchase Department can download the PO file."
      });
    }

    const po = await prisma.purchaseOrder.findUnique({
      where: { id: poId },
      include: { company: true, vendor: true, items: true, user: true },
    });

    if (!po) {
      return res.status(404).json({ success: false, message: "PO not found" });
    }

    const doc = new PDFDocument({ size: "A4", margin: 20 });
    const vendorName = getFirstTwoWords(po?.vendor?.name);
    const fileName = `${vendorName}-PO-${po.poNumber}.pdf`;
    const folderPath = path.join(__dirname, "../../uploads/purchaseOrder/");
    const filePath = path.join(folderPath, fileName);

    fs.mkdirSync(folderPath, { recursive: true });

    const stream = fs.createWriteStream(filePath);
    doc.pipe(stream);

    /* ---- PDF CONTENT ---- */

    addWatermark(doc);

    // Header
    doc.fontSize(14).text(po.company.name, { align: "center" });
    doc.fontSize(10).text(po.company.address, { align: "center" });
    doc.text(`GST: ${po.company.gstNumber}`, { align: "center" });
    doc.moveDown();
    doc
      .fontSize(12)
      .text("PURCHASE ORDER", { align: "center", underline: true });
    doc.moveDown(1);

    doc.fontSize(10);
    doc.text(`PO No: ${po.poNumber}`);
    doc.text(`PO Date: ${new Date(po.createdAt).toLocaleDateString()}`);
    doc.text(`Vendor: ${po.vendor.name}`);
    doc.text(`Vendor GST: ${po.vendor.gstNumber}`);
    doc.text(`Vendor Address: ${po.vendor.address}`);
    doc.moveDown();

    // Table
    drawTableHeader(doc);

    let y = doc.y;

    for (const item of po.items) {
      if (y > 720) {
        doc.addPage();
        addWatermark(doc);
        drawTableHeader(doc, 20);
        y = doc.y;
      }

      doc.fontSize(9);
      doc.text(item.itemName, 20, y, { width: 150 });
      doc.text(item.hsnCode || "-", 180, y);
      doc.text(item.quantity.toString(), 250, y);
      doc.text(item.rate.toFixed(2), 290, y);
      doc.text(item.gstRate.toString(), 340, y);
      doc.text(item.total.toFixed(2), 390, y);

      y += 18;
      doc
        .moveTo(20, y - 5)
        .lineTo(550, y - 5)
        .strokeColor("#e6e6e6")
        .stroke();
    }

    doc.moveDown(2);
    doc.font("Helvetica-Bold").fontSize(10);
    doc.text("SUMMARY", 20, doc.y, { underline: true });

    const line = (label, amount) =>
      doc.text(`${label.padEnd(20)} ₹ ${Number(amount).toFixed(2)}`);

    line("Sub Total", po.subTotal);
    line("CGST", po.totalCGST);
    line("SGST", po.totalSGST);
    line("IGST", po.totalIGST);
    line("Total GST", po.totalGST);
    line("Grand Total", po.grandTotal);

    doc.moveDown(2);
    doc.fontSize(9).text(`Prepared By: ${po.user?.name}`);
    doc.text(`Contact: ${po.contactPerson || ""} (${po.cellNo || ""})`);

    doc.end();

    /* --------- On file finish --------- */
    stream.on("finish", async () => {
      try {
        const relativePath = `uploads/purchaseOrder/${fileName}`;

        await prisma.purchaseOrder.update({
          where: { id: poId },
          data: {
            pdfUrl: relativePath,
            pdfName: fileName,
            pdfGeneratedAt: new Date(),
            pdfGeneratedBy: req.user?.id,
          },
        });

        await prisma.auditLog.create({
          data: {
            entityType: "PurchaseOrder",
            entityId: poId,
            action: "PO_PDF_GENERATED",
            performedBy: req.user?.id,
            oldValue: {},
            newValue: {
              pdfUrl: relativePath,
              pdfName: fileName,
              pdfGeneratedAt: new Date(),
            },
          },
        });

        return res.download(filePath);
      } catch (err) {
        console.error("DB Update Error: ", err);
        return res.download(filePath);
      }
    });
  } catch (err) {
    console.error("Error Generating PO PDF:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = {
  createCompany,
  createVendor,
  getAllCompanies,
  getAllVendors,
  getAllItems,
  createPurchaseOrder,
  updatePurchaseOrder,
  getPOListByCompany,
  getPurchaseOrderDetails,
  downloadPOPDF,
};
