const prisma = require("../../config/prismaClient");
const Decimal = require("decimal.js");
const fs = require("fs");
const path = require("path");
const nodemailer = require("nodemailer");
const SystemItem = require("../../models/systemInventoryModels/systemItemSchema");
const generatePO = require("../../util/generatePO");

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
  if (s.includes("haryana")) return "HR";
  if (s.includes("maharashtra")) return "MH";
  if (s.includes("uttarakhand") || s.includes("haridwar") || s.includes("uk"))
    return "UK";
  if (s.includes("gujarat")) return "GJ";
  if (s.includes("rajasthan")) return "RJ";
  if (s.includes("delhi")) return "DL";
  return s.substring(0, 2).toUpperCase();
}

async function generatePONumber(company) {
  const fy = getFinancialYear();
  const stateCode = getStateCode(company.state);
  console.log(stateCode);
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
        message: "Company name, code, gstNumber, address, contact number, email are required.",
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

    const upperCaseName = name.trim();
    const upperCaseGST = gstNumber.toUpperCase().trim();
    const upperCaseAddress = address.trim();
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

const getCompaniesList = async (req, res) => {
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
      companyName: `${company.name}${company.state ? `, ${company.state}` : ""}`,
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

const getVendorsList = async (req, res) => {
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

const getItemsList = async (req, res) => {
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
      if (!item.id || !item.source || !item.name || !item.unit || !item.itemGSTType) {
        return res.status(400).json({
          success: false,
          message: "Each item must include id, source, name, unit, itemGSTType",
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
          companyName: company.name,
          vendorId,
          vendorName: vendor.name,
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

const downloadPOPDF = async (req, res) => {
  try {
    const { poId } = req.query;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized: User not found.",
      });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { role: true },
    });

    if (!user || user.role?.name !== "Purchase") {
      return res.status(403).json({
        success: false,
        message: "Access Denied: Only Purchase Department can generate PO.",
      });
    }

    const po = await prisma.purchaseOrder.findUnique({
      where: { id: poId },
      include: {
        company: true,
        vendor: true,
        items: true,
      },
    });

    if (!po) {
      return res.status(404).json({
        success: false,
        message: "PO not found.",
      });
    }

    // ✅ Prepare Items Array
    const items = po.items.map(it => ({
      itemName: it.itemName,
      hsnCode: it.hsnCode || "-",
      quantity: Number(it.quantity),
      unit: it.unit || "Nos",
      rate: Number(it.rate),
      total: Number(it.total),
    }));

    // ✅ Generate PDF
    const filePath = await generatePO(po, items);

    const fileName = path.basename(filePath);
    const relativePath = `/uploads/purchaseOrderFolder/${fileName}`;

    // ✅ Save PDF Metadata In DB
    await prisma.purchaseOrder.update({
      where: { id: poId },
      data: {
        pdfUrl: relativePath,
        pdfName: fileName,
        pdfGeneratedAt: new Date(),
        pdfGeneratedBy: userId,
      },
    });

    return res.status(200).json({
      success: true,
      message: "PO PDF generated successfully.",
      pdfUrl: relativePath,
      fileName,
    });

  } catch (err) {
    console.error("Error generating PO PDF:", err);
    res.status(500).json({
      success: false,
      message: "Server Error while generating PO PDF",
      error: err.message,
    });
  }
};

//----------------- Send PO -------------------//
// const sendPO = async (req, res) => {
//   try {
//     const { poId } = req.query;
//     const userId = req?.user?.id;
//     if (!poId) {
//       return res.status(404).json({
//         success: false,
//         message: "PO-Id is required",
//       });
//     }
//     const userData = await prisma.user.findUnique({
//       where: {
//         id: userId,
//       },
//       include: {
//         role: {
//           select: {
//             name: true,
//           },
//         },
//       },
//     });

//     if (!userData) {
//       return res.status(404).json({
//         success: false,
//         message: "User not found",
//       });
//     }

//     if (userData.role?.name !== "Purchase") {
//       return res.status(400).json({
//         success: false,
//         message: "Only purchase department is allowed to send mail.",
//       });
//     }

//     const po = await prisma.purchaseOrder.findUnique({
//       where: { id: poId },
//       include: { vendor: true, company: true },
//     });

//     if (!po)
//       return res.status(404).json({ success: false, message: "PO not found" });
//     if (!po.vendor.email)
//       return res
//         .status(400)
//         .json({ success: false, message: "Vendor email missing" });
//     if (!po.pdfName || !po.pdfUrl) {
//       return res
//         .status(400)
//         .json({ success: false, message: "PDF not generated yet" });
//     }

//     const pdfPath = path.join(
//       __dirname,
//       "../../uploads/purchaseOrder",
//       po.pdfName
//     );
//     if (!fs.existsSync(pdfPath)) {
//       return res
//         .status(404)
//         .json({ success: false, message: "PDF file missing on server" });
//     }

//     // ✅ Prepare email transporter
//     const transporter = nodemailer.createTransport({
//       service: "gmail",
//       auth: {
//         user: process.env.EMAIL_USER,
//         pass: process.env.EMAIL_PASSWORD,
//       },
//     });

//     const mailOptions = {
//       from: process.env.EMAIL_USER,
//       to: po.vendor.email,
//       subject: `Purchase Order - ${po.poNumber}`,
//       text: `Dear ${po.vendor.name},

// Please find the attached Purchase Order.

// Regards,
// ${req.user?.name || "Team"}
// ${po.company.name}
// ${po.company.address}
//       `,
//       attachments: [{ filename: po.pdfName, path: pdfPath }],
//     };

//     // ✅ Send Email First (outside transaction)
//     const emailResponse = await transporter.sendMail(mailOptions);

//     if (!emailResponse.accepted || emailResponse.accepted.length === 0) {
//       throw new Error("Email not accepted by SMTP server");
//     }
//     console.log("Email sent:", emailResponse.messageId);
//     // ✅ Transaction — only runs if email was successful
//     await prisma.$transaction(async (tx) => {
//       await tx.purchaseOrder.update({
//         where: { id: poId },
//         data: {
//           status: "Sent",
//           emailSentAt: new Date(),
//           emailSentBy: req.user?.id || null,
//         },
//       });

//       await tx.auditLog.create({
//         data: {
//           entityType: "PurchaseOrder",
//           entityId: poId,
//           action: "EMAIL_SENT",
//           performedBy: req.user?.id || null,
//           oldValue: { status: po.status },
//           newValue: { status: "Sent", emailTo: po.vendor.email },
//         },
//       });
//     });

//     return res.status(200).json({
//       success: true,
//       message: "PO emailed successfully & status updated.",
//     });
//   } catch (err) {
//     console.error("Email/DB Error:", err);
//     return res.status(500).json({
//       success: false,
//       message: "Failed to email PO",
//       error: err.message,
//     });
//   }
// };

// const resendPO = async (req, res) => {
//   try {
//     const { poId } = req.query;
//     const userId = req?.user?.id;
//     if (!poId) {
//       return res.status(404).json({
//         success: false,
//         message: "PO-Id is required",
//       });
//     }
//     const userData = await prisma.user.findUnique({
//       where: {
//         id: userId,
//       },
//       include: {
//         role: {
//           select: {
//             name: true,
//           },
//         },
//       },
//     });

//     if (!userData) {
//       return res.status(404).json({
//         success: false,
//         message: "User not found",
//       });
//     }

//     if (userData.role?.name !== "Purchase") {
//       return res.status(400).json({
//         success: false,
//         message: "Only purchase department is allowed to send mail.",
//       });
//     }

//     const po = await prisma.purchaseOrder.findUnique({
//       where: { id: poId },
//       include: { vendor: true, company: true },
//     });

//     if (!po)
//       return res.status(404).json({ success: false, message: "PO not found" });
//     if (!po.vendor.email)
//       return res
//         .status(400)
//         .json({ success: false, message: "Vendor email missing" });
//     if (!po.pdfName || !po.pdfUrl) {
//       return res
//         .status(400)
//         .json({ success: false, message: "PDF not generated yet" });
//     }

//     const pdfPath = path.join(
//       __dirname,
//       "../../uploads/purchaseOrder",
//       po.pdfName
//     );
//     if (!fs.existsSync(pdfPath)) {
//       return res
//         .status(404)
//         .json({ success: false, message: "PDF file missing on server" });
//     }

//     // ✅ Email transporter
//     const transporter = nodemailer.createTransport({
//       service: "gmail",
//       auth: {
//         user: process.env.EMAIL_USER,
//         pass: process.env.EMAIL_PASS,
//       },
//     });

//     const mailOptions = {
//       from: process.env.EMAIL_USER,
//       to: po.vendor.email,
//       subject: `RESEND: Purchase Order - ${po.poNumber}`,
//       text: `Dear ${po.vendor.name},

// This is a re-sent copy of the Purchase Order.

// Regards,
// ${req.user?.name || "Team"}
// ${po.company.name}
// ${po.company.state}, ${po.company.pincode}`,
//       attachments: [{ filename: po.pdfName, path: pdfPath }],
//     };

//     // ✅ Send email first
//     const emailResponse = await transporter.sendMail(mailOptions);

//     if (!emailResponse.accepted || emailResponse.accepted.length === 0) {
//       throw new Error("Email not accepted by SMTP server");
//     }
//     console.log("Email sent:", emailResponse.messageId);

//     // ✅ TX only after email success
//     await prisma.$transaction(async (tx) => {
//       await tx.purchaseOrder.update({
//         where: { id: poId },
//         data: {
//           emailResentCount: { increment: 1 },
//           emailLastResentAt: new Date(),
//         },
//       });

//       await tx.auditLog.create({
//         data: {
//           entityType: "PurchaseOrder",
//           entityId: poId,
//           action: "EMAIL_RESENT",
//           performedBy: req.user?.id || null,
//           oldValue: { resentCount: po.emailResentCount },
//           newValue: { resentCount: po.emailResentCount + 1 },
//         },
//       });
//     });

//     return res.status(200).json({
//       success: true,
//       message: "PO resent successfully.",
//     });
//   } catch (err) {
//     console.error("Email Resend Error:", err);
//     return res.status(500).json({
//       success: false,
//       message: "Failed to resend PO",
//       error: err.message,
//     });
//   }
// };

const sendOrResendPO = async (req, res) => {
  try {
    const { poId } = req.query;
    const userId = req?.user?.id;

    if (!poId) {
      return res.status(404).json({ success: false, message: "PO-Id is required" });
    }

    const userData = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        role: { select: { name: true } },
      },
    });

    if (!userData) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    if (userData.role?.name !== "Purchase") {
      return res.status(403).json({
        success: false,
        message: "Only purchase department is allowed to send mail.",
      });
    }

    const po = await prisma.purchaseOrder.findUnique({
      where: { id: poId },
      include: { vendor: true, company: true },
    });

    if (!po) return res.status(404).json({ success: false, message: "PO not found" });
    if (!po.vendor.email)
      return res.status(400).json({ success: false, message: "Vendor email missing" });
    if (!po.pdfName || !po.pdfUrl) {
      return res.status(400).json({ success: false, message: "PDF not generated yet" });
    }

    const pdfPath = path.join(__dirname, "../../uploads/purchaseOrder", po.pdfName);
    if (!fs.existsSync(pdfPath)) {
      return res.status(404).json({ success: false, message: "PDF file missing on server" });
    }

    // ✅ Determine action (Send or Resend)
    const isResend = po.status === "Sent";

    // ✅ Prepare email transporter
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD,
      },
    });

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: po.vendor.email,
      subject: `${isResend ? "RESEND:" : ""} Purchase Order - ${po.poNumber}`,
      text: `Dear ${po.vendor.name},

${isResend ? "Resending the" : "Please find the attached"} Purchase Order.

Regards,
${po.company.name}
${po.company.state}, ${po.company.pincode}
Contact: ${po.company.contactNumber}
      `,
      attachments: [{ filename: po.pdfName, path: pdfPath }],
    };

    // ✅ Send email
    const emailResponse = await transporter.sendMail(mailOptions);
    if (!emailResponse.accepted?.length) throw new Error("Email rejected");

    console.log("Email sent:", emailResponse.messageId);

    // ✅ DB Update only after email success
    await prisma.$transaction(async (tx) => {
      if (isResend) {
        await tx.purchaseOrder.update({
          where: { id: poId },
          data: {
            emailResentCount: { increment: 1 },
            emailLastResentAt: new Date(),
          },
        });

        await tx.auditLog.create({
          data: {
            entityType: "PurchaseOrder",
            entityId: poId,
            action: "EMAIL_RESENT",
            performedBy: userId,
            oldValue: { resentCount: po.emailResentCount },
            newValue: { resentCount: po.emailResentCount + 1 },
          },
        });
      } else {
        await tx.purchaseOrder.update({
          where: { id: poId },
          data: {
            status: "Sent",
            emailSentAt: new Date(),
            emailSentBy: userId,
          },
        });

        await tx.auditLog.create({
          data: {
            entityType: "PurchaseOrder",
            entityId: poId,
            action: "EMAIL_SENT",
            performedBy: userId,
            oldValue: { status: po.status },
            newValue: { status: "Sent", emailTo: po.vendor.email },
          },
        });
      }
    });

    return res.status(200).json({
      success: true,
      message: isResend
        ? "PO re-emailed successfully."
        : "PO emailed successfully.",
    });

  } catch (err) {
    console.error("Email/DB Error:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to send PO email",
      error: err.message,
    });
  }
};

module.exports = {
  createCompany,
  createVendor,
  getCompaniesList,
  getVendorsList,
  getItemsList,
  createPurchaseOrder,
  updatePurchaseOrder,
  getPOListByCompany,
  getPurchaseOrderDetails,
  downloadPOPDF,
  sendOrResendPO
};
