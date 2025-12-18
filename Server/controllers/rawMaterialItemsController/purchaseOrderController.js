const prisma = require("../../config/prismaClient");
const Decimal = require("decimal.js");
const fs = require("fs");
const path = require("path");
const nodemailer = require("nodemailer");
const SystemItem = require("../../models/systemInventoryModels/systemItemSchema");
const InstallationInventory = require("../../models/systemInventoryModels/installationInventorySchema");
const generatePO = require("../../util/generatePO");
const poGenerate = require("../../util/poGenerate");
const debitNoteGenerate = require("../../util/debitNoteGenerate");
const Warehouse = require("../../models/serviceInventoryModels/warehouseSchema");

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

async function generateDebitNoteNumber(company) {
  const fy = getFinancialYear(); // e.g. "2024-2025"
  const stateCode = getStateCode(company.state);
  const prefix = `${company.companyCode}${stateCode}`;
  const counterName = `DN_${company.id}_${fy}`;

  const counter = await prisma.counter.upsert({
    where: { name: counterName },
    update: { seq: { increment: 1 } },
    create: {
      name: counterName,
      companyId: company.id,
      financialYear: fy,
      seq: 1,
    },
  });

  const nextSeq = counter.seq.toString().padStart(4, "0");
  return `${prefix}DN${fy}${nextSeq}`;
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

    const performedBy = req.user?.id;

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
        message:
          "Company name, code, gstNumber, address, contact number, and email are required.",
      });
    }

    const trimmedName = name.trim();
    const upperCaseGST = gstNumber.toUpperCase().trim();
    const trimmedAddress = address.trim();
    const lowerCaseEmail = email.toLowerCase().trim();
    const trimmedCompanyCode = companyCode.toUpperCase().trim();

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(lowerCaseEmail)) {
      return res.status(400).json({
        success: false,
        message: "Invalid email format.",
      });
    }

    const existingCompany = await prisma.company.findFirst({
      where: { gstNumber: upperCaseGST },
    });
    if (existingCompany) {
      return res.status(400).json({
        success: false,
        message: `A company with GST number '${upperCaseGST}' already exists.`,
      });
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
        message: `Invalid country. Allowed: ${allowedCountries.join(", ")}`,
      });
    }

    if (currency && !allowedCurrencies.includes(currency)) {
      return res.status(400).json({
        success: false,
        message: `Invalid currency. Allowed: ${allowedCurrencies.join(", ")}`,
      });
    }

    const result = await prisma.$transaction(async (tx) => {
      const newCompany = await tx.company.create({
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
          createdBy: performedBy,
        },
      });

      await tx.auditLog.create({
        data: {
          entityType: "Company",
          entityId: newCompany.id,
          action: "Created",
          performedBy,
          newValue: newCompany,
        },
      });

      return newCompany;
    });

    return res.status(201).json({
      success: true,
      message: "Company created successfully.",
      data: result,
    });
  } catch (error) {
    console.error("❌ Error in createCompany:", error);
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
      exchangeRate,
      contactNumber,
      alternateNumber,
    } = req.body;

    const performedBy = req.user?.id;

    if (
      !name ||
      !gstNumber ||
      !address ||
      !contactNumber ||
      !email ||
      !country ||
      !currency ||
      //!exchangeRate ||
      !pincode
    ) {
      return res.status(400).json({
        success: false,
        message: "All fields are required.",
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

    const result = await prisma.$transaction(async (tx) => {
      const newVendor = await tx.vendor.create({
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
          exchangeRate: exchangeRate || null,
          contactNumber,
          alternateNumber,
          createdBy: performedBy,
        },
      });

      await tx.auditLog.create({
        data: {
          entityType: "Vendor",
          entityId: newVendor.id,
          action: "Created",
          performedBy,
          oldValue: null,
          newValue: newVendor,
        },
      });

      return newVendor;
    });

    return res.status(201).json({
      success: true,
      message: "Vendor created successfully.",
      data: result,
    });
  } catch (error) {
    console.error("❌ Error in createVendor:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Internal Server Error",
    });
  }
};

const updateCompany = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    const {
      name,
      companyCode,
      gstNumber,
      address,
      city,
      state,
      pincode,
      contactNumber,
      alternateNumber,
      email,
      country,
      currency,
    } = req.body;

    const existingCompany = await prisma.company.findUnique({ where: { id } });
    if (!existingCompany) {
      return res.status(404).json({ message: "Company not found" });
    }

    const updateData = {
      ...(name && { name }),
      ...(companyCode && { companyCode }),
      ...(gstNumber && { gstNumber }),
      ...(address && { address }),
      ...(city && { city }),
      ...(state && { state }),
      ...(pincode && { pincode }),
      ...(contactNumber && { contactNumber }),
      ...(alternateNumber && { alternateNumber }),
      ...(email && { email }),
      ...(country && { country }),
      ...(currency && { currency }),
    };

    const changedOldValues = {};
    const changedNewValues = {};
    for (const key in updateData) {
      if (existingCompany[key] !== updateData[key]) {
        changedOldValues[key] = existingCompany[key];
        changedNewValues[key] = updateData[key];
      }
    }

    if (Object.keys(changedNewValues).length === 0) {
      return res.status(400).json({ message: "No fields were changed." });
    }

    const [updatedCompany, auditLog] = await prisma.$transaction([
      prisma.company.update({
        where: { id },
        data: updateData,
      }),
      prisma.auditLog.create({
        data: {
          entityType: "Company",
          entityId: id,
          action: "Updated",
          performedBy: userId || null,
          oldValue: changedOldValues,
          newValue: changedNewValues,
        },
      }),
    ]);

    res.status(200).json({
      message: "Company data updated successfully",
      company: updatedCompany,
      auditLog,
    });
  } catch (error) {
    console.error("Error updating company:", error);
    res.status(500).json({
      message: error.message || "Internal Server Error",
      // error: error.message,
    });
  }
};

const updateVendor = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

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
      exchangeRate,
      contactNumber,
      alternateNumber,
    } = req.body;

    const existingVendor = await prisma.vendor.findUnique({ where: { id } });
    if (!existingVendor) {
      return res.status(404).json({ message: "Vendor not found" });
    }

    const updateData = {
      ...(name && { name }),
      ...(email && { email }),
      ...(gstNumber && { gstNumber }),
      ...(address && { address }),
      ...(city && { city }),
      ...(state && { state }),
      ...(pincode && { pincode }),
      ...(country && { country }),
      ...(currency && { currency }),
      ...(exchangeRate && { exchangeRate }),
      ...(contactNumber && { contactNumber }),
      ...(alternateNumber && { alternateNumber }),
    };

    const changedOldValues = {};
    const changedNewValues = {};

    for (const key in updateData) {
      if (existingVendor[key] !== updateData[key]) {
        changedOldValues[key] = existingVendor[key];
        changedNewValues[key] = updateData[key];
      }
    }

    if (Object.keys(changedNewValues).length === 0) {
      return res.status(400).json({ message: "No fields were changed." });
    }

    const [updatedVendor, auditLog] = await prisma.$transaction([
      prisma.vendor.update({
        where: { id },
        data: updateData,
      }),
      prisma.auditLog.create({
        data: {
          entityType: "Vendor",
          entityId: id,
          action: "Updated",
          performedBy: userId || null,
          oldValue: changedOldValues,
          newValue: changedNewValues,
        },
      }),
    ]);

    res.status(200).json({
      message: "Vendor updated successfully",
      vendor: updatedVendor,
      auditLog,
    });
  } catch (error) {
    console.error("Error updating vendor:", error);
    res.status(500).json({
      message: error.message || "Internal Server Error",
      // error: error.message,
    });
  }
};

//for dropdown
const getCompaniesList = async (req, res) => {
  try {
    const companies = await prisma.company.findMany({
      where: {
        isActive: true,
      },
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

const getCompaniesData = async (req, res) => {
  try {
    const companies = await prisma.company.findMany({
      select: {
        id: true,
        name: true,
        gstNumber: true,
        state: true,
        address: true,
        country: true,
        isActive: true,
      },
      orderBy: {
        name: "asc",
      },
    });

    return res.status(200).json({
      success: true,
      message: "Companies fetched successfully.",
      data: companies || [],
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Internal Server Error",
    });
  }
};

const getCompanyById = async (req, res) => {
  try {
    const id = req.params.id || req.query?.id;

    if (!id) {
      return res.status(400).json({ message: "Company ID is required" });
    }

    const company = await prisma.company.findUnique({
      where: { id: id },
      select: {
        id: true,
        name: true,
        companyCode: true,
        gstNumber: true,
        address: true,
        city: true,
        state: true,
        pincode: true,
        contactNumber: true,
        alternateNumber: true,
        email: true,
        country: true,
        currency: true,
        isActive: true,
      },
    });

    if (!company) {
      return res.status(404).json({ message: "Company not found" });
    }

    res.status(200).json({
      success: true,
      data: company,
    });
  } catch (error) {
    console.error("Error fetching company by ID:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Internal Server Error",
    });
  }
};

const getVendorsList = async (req, res) => {
  try {
    const vendors = await prisma.vendor.findMany({
      where: {
        isActive: true,
      },
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

const getVendorsData = async (req, res) => {
  try {
    const vendors = await prisma.vendor.findMany({
      select: {
        id: true,
        name: true,
        gstNumber: true,
        state: true,
        address: true,
        country: true,
        isActive: true,
      },
      orderBy: {
        name: "asc",
      },
    });

    return res.status(200).json({
      success: true,
      message: "Vendors fetched successfully.",
      data: vendors || [],
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Internal Server Error",
    });
  }
};

const getVendorById = async (req, res) => {
  try {
    const id = req.params.id || req.query?.id;

    if (!id) {
      return res.status(400).json({ message: "Vendor ID is required" });
    }

    const vendor = await prisma.vendor.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        gstNumber: true,
        address: true,
        city: true,
        state: true,
        pincode: true,
        country: true,
        currency: true,
        exchangeRate: true,
        contactNumber: true,
        alternateNumber: true,
        isActive: true,
      },
    });

    if (!vendor) {
      return res.status(404).json({ message: "Vendor not found" });
    }

    res.status(200).json({
      success: true,
      data: vendor,
    });
  } catch (error) {
    console.error("Error fetching vendor by ID:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Internal Server Error",
    });
  }
};

const getItemsList = async (req, res) => {
  try {
    const mysqlItems = await prisma.rawMaterial.findMany({
      where: {
        isUsed: true,
      },
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

const getGSTPercent = (type) => {
  if (!type) return new Decimal(0);
  if (type.includes("EXEMPTED")) return new Decimal(0);

  const match = type.match(/_(\d+(\.\d+)?)/);
  return match ? new Decimal(match[1]) : new Decimal(0);
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
      currency = "INR",
      exchangeRate = 1,
      otherCharges = [], // 🆕 add this
    } = req.body;

    const userId = req.user?.id;
    if (!userId)
      return res
        .status(400)
        .json({ success: false, message: "User not found" });

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { role: true },
    });

    if (!user || user.role?.name !== "Purchase") {
      return res.status(403).json({
        success: false,
        message: "Only Purchase Department can create PO",
      });
    }

    if (!companyId || !vendorId || !gstType || !items?.length) {
      return res.status(400).json({
        success: false,
        message: "Company, Vendor, GST Type & Items are required",
      });
    }

    const isItemWise = gstType.includes("ITEMWISE");

    // ✅ Validate items
    for (const item of items) {
      if (!item.id || !item.name || !item.unit) {
        return res.status(400).json({
          success: false,
          message: "Items must include id, name, unit",
        });
      }
      if (!item.rate || !item.quantity || Number(item.quantity) <= 0) {
        return res.status(400).json({
          success: false,
          message: "Each item must have valid quantity & rate",
        });
      }
      if (isItemWise && (item.gstRate == null || item.gstRate === "")) {
        return res.status(400).json({
          success: false,
          message: "Each item must have gstRate for item-wise GST PO",
        });
      }
      if (!isItemWise && item.gstRate) {
        return res.status(400).json({
          success: false,
          message: "gstRate is only allowed when PO GST type is ITEMWISE",
        });
      }
    }

    const [company, vendor] = await Promise.all([
      prisma.company.findUnique({ where: { id: companyId } }),
      prisma.vendor.findUnique({ where: { id: vendorId } }),
    ]);

    if (!company || !vendor) {
      return res.status(404).json({
        success: false,
        message: "Company/Vendor not found",
      });
    }

    const poNumber = await generatePONumber(company);
    if (await prisma.purchaseOrder.findUnique({ where: { poNumber } })) {
      return res.status(400).json({
        success: false,
        message: `PO ${poNumber} already exists`,
      });
    }

    // ----------------------------------------------------
    // 🧮 Subtotal & GST Calculations
    // ----------------------------------------------------
    let foreignSubTotal = new Decimal(0);
    let subTotalINR = new Decimal(0);
    let totalCGST = new Decimal(0);
    let totalSGST = new Decimal(0);
    let totalIGST = new Decimal(0);

    const normalItems = [];
    const itemWiseItems = [];

    for (const item of items) {
      const totalForeign = new Decimal(item.rate).mul(item.quantity);
      const totalINR = totalForeign.mul(exchangeRate);
      foreignSubTotal = foreignSubTotal.plus(totalForeign);
      subTotalINR = subTotalINR.plus(totalINR);

      isItemWise ? itemWiseItems.push(item) : normalItems.push(item);
    }

    // 🆕 Calculate total of otherCharges
    let otherChargesTotal = new Decimal(0);
    if (Array.isArray(otherCharges) && otherCharges.length > 0) {
      for (const ch of otherCharges) {
        if (!ch.amount || isNaN(ch.amount)) continue;
        otherChargesTotal = otherChargesTotal.plus(new Decimal(ch.amount));
      }
    }

    // Add otherCharges to subtotal (always)
    subTotalINR = subTotalINR.plus(otherChargesTotal);

    const poGSTPercent =
      isItemWise || gstType.includes("EXEMPTED")
        ? null
        : getGSTPercent(gstType);

    if (normalItems.length && poGSTPercent) {
      // 💡 Now GST applies on subtotal (including otherCharges)
      const normalTotalINR = subTotalINR; // already includes otherCharges

      if (gstType.startsWith("LGST")) {
        totalCGST = totalCGST.plus(normalTotalINR.mul(poGSTPercent.div(200)));
        totalSGST = totalSGST.plus(normalTotalINR.mul(poGSTPercent.div(200)));
      } else if (gstType.startsWith("IGST")) {
        totalIGST = totalIGST.plus(normalTotalINR.mul(poGSTPercent.div(100)));
      }
    }

    // 🧾 Item-wise GST calculation
    if (isItemWise) {
      for (const item of itemWiseItems) {
        const totalINR = new Decimal(item.rate)
          .mul(item.quantity)
          .mul(exchangeRate);
        const rate = new Decimal(item.gstRate);

        if (gstType === "LGST_ITEMWISE") {
          totalCGST = totalCGST.plus(totalINR.mul(rate.div(200)));
          totalSGST = totalSGST.plus(totalINR.mul(rate.div(200)));
        } else if (gstType === "IGST_ITEMWISE") {
          totalIGST = totalIGST.plus(totalINR.mul(rate.div(100)));
        }
      }
    }

    const totalGST = totalCGST.plus(totalSGST).plus(totalIGST);
    const grandTotalINR = subTotalINR.plus(totalGST);
    const foreignGrandTotal = foreignSubTotal;

    // ----------------------------------------------------
    // 💾 Save Purchase Order
    // ----------------------------------------------------
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
          gstRate: poGSTPercent,
          currency,
          exchangeRate,
          foreignSubTotal,
          foreignGrandTotal,
          subTotal: subTotalINR,
          totalCGST,
          totalSGST,
          totalIGST,
          totalGST,
          grandTotal: grandTotalINR,
          remarks,
          paymentTerms,
          deliveryTerms,
          warranty,
          contactPerson,
          cellNo,
          createdBy: userId,
          otherCharges, // 🆕 save JSON array directly
          items: {
            create: items.map((i) => ({
              itemId: i.id,
              itemName: i.name,
              itemSource: i.source,
              itemDetail: i.itemDetail || null,
              hsnCode: i.hsnCode || null,
              modelNumber: i.modelNumber || null,
              unit: i.unit,
              rate: new Decimal(i.rate),
              gstRate: isItemWise ? new Decimal(i.gstRate) : null,
              quantity: new Decimal(i.quantity),
              total: new Decimal(i.rate).mul(i.quantity),
              itemGSTType: isItemWise ? gstType : null,
            })),
          },
        },
        include: { items: true },
      });

      await tx.auditLog.create({
        data: {
          entityType: "PurchaseOrder",
          entityId: po.id,
          action: "CREATED",
          performedBy: userId,
          newValue: po,
        },
      });

      return po;
    });

    return res.status(201).json({
      success: true,
      message: "✅ Purchase Order created successfully",
      data: newPO,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      success: false,
      message: err.message || "Server error while creating PO",
    });
  }
};

const createPurchaseOrder2 = async (req, res) => {
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
      exchangeRate: requestExchangeRate = 1,
      otherCharges = [],
    } = req.body;

    const userId = req.user?.id;
    if (!userId)
      return res
        .status(400)
        .json({ success: false, message: "User not found" });

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { role: true },
    });

    if (!user || user.role?.name !== "Purchase") {
      return res.status(403).json({
        success: false,
        message: "Only Purchase Department can create PO",
      });
    }

    if (!companyId || !vendorId || !gstType || !items?.length) {
      return res.status(400).json({
        success: false,
        message: "Company, Vendor, GST Type & Items are required",
      });
    }

    let normalizedOtherCharges = [];

    // Case 1: Frontend sends single empty object → treat as empty
    if (
      Array.isArray(otherCharges) &&
      otherCharges.length === 1 &&
      otherCharges[0]?.name === "" &&
      otherCharges[0]?.amount === ""
    ) {
      normalizedOtherCharges = [];
    }
    // Case 2: Validate proper other charges
    else if (Array.isArray(otherCharges) && otherCharges.length > 0) {
      for (const ch of otherCharges) {
        if (
          !ch.name ||
          ch.name.trim() === "" ||
          ch.amount === "" ||
          ch.amount == null ||
          isNaN(ch.amount)
        ) {
          return res.status(400).json({
            success: false,
            message:
              "Invalid otherCharges: name and amount are required for each charge",
          });
        }

        normalizedOtherCharges.push({
          name: ch.name.trim(),
          amount: new Decimal(ch.amount),
        });
      }
    }

    const isItemWise = gstType.includes("ITEMWISE");

    // Validate items
    for (const item of items) {
      if (!item.id || !item.name || !item.unit) {
        return res.status(400).json({
          success: false,
          message: "Items must include id, name, unit",
        });
      }
      if (!item.rate || !item.quantity || Number(item.quantity) <= 0) {
        return res.status(400).json({
          success: false,
          message: "Each item must have valid quantity & rate",
        });
      }
      if (isItemWise && (item.gstRate == null || item.gstRate === "")) {
        return res.status(400).json({
          success: false,
          message: "Each item must have gstRate for item-wise GST PO",
        });
      }
      if (!isItemWise && item.gstRate) {
        return res.status(400).json({
          success: false,
          message: "gstRate is only allowed when PO GST type is ITEMWISE",
        });
      }
    }

    const mongoIds = [];
    const mysqlIds = [];

    // Separate IDs by source
    for (const item of items) {
      if (!item.source) {
        return res.status(400).json({
          success: false,
          message: "item.source is required (mongo/mysql)",
        });
      }

      if (item.source === "mongo") {
        mongoIds.push(item.id);
      } else if (item.source === "mysql") {
        mysqlIds.push(item.id);
      } else {
        return res.status(400).json({
          success: false,
          message: `Invalid item.source '${item.source}'. Use 'mongo' or 'mysql'.`,
        });
      }
    }

    // Fetch all mongo items in one query
    let existingMongoItems = [];
    if (mongoIds.length) {
      existingMongoItems = await SystemItem.find({ _id: { $in: mongoIds } })
        .select("_id")
        .lean();
    }

    // Fetch all mysql items in one query
    let existingMysqlItems = [];
    if (mysqlIds.length) {
      existingMysqlItems = await prisma.rawMaterial.findMany({
        where: { id: { in: mysqlIds } },
        select: { id: true },
      });
    }

    // Convert to fast lookup sets
    const mongoSet = new Set(existingMongoItems.map((m) => String(m._id)));
    const mysqlSet = new Set(existingMysqlItems.map((m) => m.id));

    // Validate each item
    for (const item of items) {
      if (item.source === "mongo" && !mongoSet.has(item.id)) {
        throw new Error(`System Item with id '${item.id}' Not Found in`);
      }

      if (item.source === "mysql" && !mysqlSet.has(item.id)) {
        throw new Error(`Raw Material with id '${item.id}' Not Found`);
      }
    }
    // Fetch company & vendor
    const [company, vendor] = await Promise.all([
      prisma.company.findUnique({ where: { id: companyId } }),
      prisma.vendor.findUnique({ where: { id: vendorId } }),
    ]);

    if (!company || !vendor) {
      return res.status(404).json({
        success: false,
        message: "Company/Vendor not found",
      });
    }

    // PO currency and exchange rate
    const currency = vendor.currency || "INR";
    const exchangeRate = vendor.exchangeRate || requestExchangeRate || 1;

    const poNumber = await generatePONumber(company);
    if (await prisma.purchaseOrder.findUnique({ where: { poNumber } })) {
      return res.status(400).json({
        success: false,
        message: `PO ${poNumber} already exists`,
      });
    }

    // ------------------------------------
    // 🧮 Subtotal & GST Calculations
    // ------------------------------------
    let foreignSubTotal = new Decimal(0);
    let subTotalINR = new Decimal(0);
    let totalCGST = new Decimal(0);
    let totalSGST = new Decimal(0);
    let totalIGST = new Decimal(0);

    const normalItems = [];
    const itemWiseItems = [];

    // Process items for DB
    const processedItems = items.map((item) => {
      const qty = new Decimal(item.quantity);
      const rateForeign = new Decimal(item.rate);
      const amountForeign = rateForeign.mul(qty);
      const amountINR = amountForeign.mul(exchangeRate);

      foreignSubTotal = foreignSubTotal.plus(amountForeign);
      subTotalINR = subTotalINR.plus(amountINR);

      isItemWise ? itemWiseItems.push(item) : normalItems.push(item);

      return {
        itemId: item.id,
        itemSource: item.source,
        itemName: item.name,
        hsnCode: item.hsnCode || null,
        modelNumber: item.modelNumber || null,
        itemDetail: item.itemDetail || null,
        unit: item.unit,
        rateInForeign: currency !== "INR" ? rateForeign : null,
        amountInForeign: currency !== "INR" ? amountForeign : null,
        rate: new Decimal(item.rate),
        gstRate: isItemWise ? new Decimal(item.gstRate) : null,
        quantity: qty,
        total: amountINR,
        itemGSTType: isItemWise ? gstType : null,
      };
    });

    // Add otherCharges to subtotal
    let otherChargesTotal = new Decimal(0);
    if (
      Array.isArray(normalizedOtherCharges) &&
      normalizedOtherCharges.length > 0
    ) {
      for (const ch of normalizedOtherCharges) {
        if (!ch.amount || isNaN(ch.amount)) continue;
        otherChargesTotal = otherChargesTotal.plus(new Decimal(ch.amount));
      }
    }
    subTotalINR = subTotalINR.plus(otherChargesTotal);

    // GST for normal items
    const poGSTPercent =
      isItemWise || gstType.includes("EXEMPTED")
        ? null
        : getGSTPercent(gstType);

    if (normalItems.length && poGSTPercent) {
      const normalTotalINR = subTotalINR;

      if (gstType.startsWith("LGST")) {
        totalCGST = totalCGST.plus(normalTotalINR.mul(poGSTPercent.div(200)));
        totalSGST = totalSGST.plus(normalTotalINR.mul(poGSTPercent.div(200)));
      } else if (gstType.startsWith("IGST")) {
        totalIGST = totalIGST.plus(normalTotalINR.mul(poGSTPercent.div(100)));
      }
    }

    // Item-wise GST
    if (isItemWise) {
      for (const item of itemWiseItems) {
        const totalINR = new Decimal(item.rate)
          .mul(item.quantity)
          .mul(exchangeRate);
        const rate = new Decimal(item.gstRate);

        if (gstType === "LGST_ITEMWISE") {
          totalCGST = totalCGST.plus(totalINR.mul(rate.div(200)));
          totalSGST = totalSGST.plus(totalINR.mul(rate.div(200)));
        } else if (gstType === "IGST_ITEMWISE") {
          totalIGST = totalIGST.plus(totalINR.mul(rate.div(100)));
        }
      }
    }

    const totalGST = totalCGST.plus(totalSGST).plus(totalIGST);
    const grandTotalINR = subTotalINR.plus(totalGST);
    const foreignGrandTotal = foreignSubTotal;

    // ------------------------------------
    // 💾 Save Purchase Order
    // ------------------------------------
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
          gstRate: poGSTPercent,
          currency,
          exchangeRate,
          foreignSubTotal,
          foreignGrandTotal,
          subTotal: subTotalINR,
          totalCGST,
          totalSGST,
          totalIGST,
          totalGST,
          grandTotal: grandTotalINR,
          remarks,
          paymentTerms,
          deliveryTerms,
          warranty,
          contactPerson,
          cellNo,
          createdBy: userId,
          otherCharges: normalizedOtherCharges,
          items: {
            create: processedItems,
          },
        },
        include: { items: true },
      });

      await tx.auditLog.create({
        data: {
          entityType: "PurchaseOrder",
          entityId: po.id,
          action: "CREATED",
          performedBy: userId,
          newValue: po,
        },
      });

      return po;
    });

    return res.status(201).json({
      success: true,
      message: "✅ Purchase Order created successfully",
      data: newPO,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      success: false,
      message: err.message || "Server error while creating PO",
    });
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
      currency = "INR",
      exchangeRate = 1,
      otherCharges = [], // 🆕 Added field
    } = req.body;

    const userId = req.user?.id;
    if (!userId)
      return res
        .status(400)
        .json({ success: false, message: "User not found" });

    // ✅ Check role
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { role: true },
    });

    if (!user || user.role?.name !== "Purchase") {
      return res.status(403).json({
        success: false,
        message: "Only Purchase Department can update PO",
      });
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

    if (!items?.length)
      return res.status(400).json({
        success: false,
        message: "At least one item is required",
      });

    const isItemWise = gstType.includes("ITEMWISE");

    // ✅ Validate items
    for (const item of items) {
      if (!item.id || !item.name || !item.unit) {
        return res.status(400).json({
          success: false,
          message: "Each item must include id, name, and unit",
        });
      }

      if (!item.rate || !item.quantity || Number(item.quantity) <= 0) {
        return res.status(400).json({
          success: false,
          message: "Each item must have valid rate and quantity",
        });
      }

      // ✅ gstRate rules
      if (isItemWise && (item.gstRate == null || item.gstRate === "")) {
        return res.status(400).json({
          success: false,
          message: "Each item must have gstRate for item-wise GST PO",
        });
      }

      if (!isItemWise && item.gstRate) {
        return res.status(400).json({
          success: false,
          message: "gstRate is only allowed when PO GST type is ITEMWISE",
        });
      }
    }

    const oldValue = JSON.parse(JSON.stringify(existingPO));

    // ----------------------------------------------------
    // 🧮 Subtotal & GST Calculations
    // ----------------------------------------------------
    let foreignSubTotal = new Decimal(0);
    let subTotalINR = new Decimal(0);
    let totalCGST = new Decimal(0);
    let totalSGST = new Decimal(0);
    let totalIGST = new Decimal(0);

    const normalItems = [];
    const itemWiseItems = [];

    // ✅ Split items
    for (const item of items) {
      const totalForeign = new Decimal(item.rate).mul(item.quantity);
      const totalINR = totalForeign.mul(exchangeRate);

      foreignSubTotal = foreignSubTotal.plus(totalForeign);
      subTotalINR = subTotalINR.plus(totalINR);

      isItemWise ? itemWiseItems.push(item) : normalItems.push(item);
    }

    // 🆕 Calculate total of otherCharges
    let otherChargesTotal = new Decimal(0);
    if (Array.isArray(otherCharges) && otherCharges.length > 0) {
      for (const ch of otherCharges) {
        if (!ch.amount || isNaN(ch.amount)) continue;
        otherChargesTotal = otherChargesTotal.plus(new Decimal(ch.amount));
      }
    }

    // ✅ Add otherCharges to subtotal (always)
    subTotalINR = subTotalINR.plus(otherChargesTotal);

    // ✅ GST % for non-itemwise
    const poGSTPercent =
      isItemWise || gstType.includes("EXEMPTED")
        ? null
        : getGSTPercent(gstType);

    // ✅ Calculate normal GST
    if (normalItems.length && poGSTPercent) {
      // GST applies on subtotal (including otherCharges)
      const normalTotalINR = subTotalINR;

      if (gstType.startsWith("LGST")) {
        totalCGST = totalCGST.plus(normalTotalINR.mul(poGSTPercent.div(200)));
        totalSGST = totalSGST.plus(normalTotalINR.mul(poGSTPercent.div(200)));
      } else if (gstType.startsWith("IGST")) {
        totalIGST = totalIGST.plus(normalTotalINR.mul(poGSTPercent.div(100)));
      }
    }

    // ✅ Calculate Item-wise GST
    if (isItemWise) {
      for (const item of itemWiseItems) {
        const totalINR = new Decimal(item.rate)
          .mul(item.quantity)
          .mul(exchangeRate);
        const rate = new Decimal(item.gstRate);

        if (gstType === "LGST_ITEMWISE") {
          totalCGST = totalCGST.plus(totalINR.mul(rate.div(200)));
          totalSGST = totalSGST.plus(totalINR.mul(rate.div(200)));
        } else if (gstType === "IGST_ITEMWISE") {
          totalIGST = totalIGST.plus(totalINR.mul(rate.div(100)));
        }
      }
    }

    const totalGST = totalCGST.plus(totalSGST).plus(totalIGST);
    const grandTotalINR = subTotalINR.plus(totalGST);
    const foreignGrandTotal = foreignSubTotal;

    // ----------------------------------------------------
    // 💾 Update PO in a transaction
    // ----------------------------------------------------
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
          gstRate: poGSTPercent,
          currency,
          exchangeRate,
          foreignSubTotal,
          foreignGrandTotal,
          subTotal: subTotalINR,
          totalCGST,
          totalSGST,
          totalIGST,
          totalGST,
          grandTotal: grandTotalINR,
          remarks,
          paymentTerms,
          deliveryTerms,
          warranty,
          contactPerson,
          cellNo,
          otherCharges, // 🆕 Save JSON array directly
          items: {
            create: items.map((i) => ({
              itemId: i.id,
              itemName: i.name,
              itemSource: i.source,
              hsnCode: i.hsnCode || null,
              modelNumber: i.modelNumber || null,
              itemDetail: i.itemDetail || null,
              unit: i.unit,
              rate: new Decimal(i.rate),
              gstRate: isItemWise ? new Decimal(i.gstRate) : null,
              quantity: new Decimal(i.quantity),
              total: new Decimal(i.rate).mul(i.quantity),
              itemGSTType: isItemWise ? gstType : null,
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
          performedBy: userId,
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
    res.status(500).json({
      success: false,
      message: err.message || "Server error while updating PO",
    });
  }
};

const updatePurchaseOrder2 = async (req, res) => {
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
      otherCharges = [],
    } = req.body;

    const userId = req.user?.id;
    if (!userId)
      return res
        .status(400)
        .json({ success: false, message: "User not found" });

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { role: true },
    });

    if (!user || user.role?.name !== "Purchase") {
      return res.status(403).json({
        success: false,
        message: "Only Purchase Department can update PO",
      });
    }

    const existingPO = await prisma.purchaseOrder.findUnique({
      where: { id: poId },
      include: { items: true },
    });

    if (!existingPO)
      return res.status(404).json({ success: false, message: "PO not found" });

    // if (existingPO.status !== "Draft") {
    //   return res.status(400).json({
    //     success: false,
    //     message: "Only Draft PO can be updated",
    //   });
    // }

    if (!items?.length)
      return res.status(400).json({
        success: false,
        message: "At least one item is required",
      });

    const isItemWise = gstType.includes("ITEMWISE");

    // Validate items
    for (const item of items) {
      if (!item.id || !item.name || !item.unit)
        return res.status(400).json({
          success: false,
          message: "Each item must include id, name, and unit",
        });

      if (!item.rate || !item.quantity || Number(item.quantity) <= 0)
        return res.status(400).json({
          success: false,
          message: "Each item must have valid rate and quantity",
        });

      if (isItemWise && (item.gstRate == null || item.gstRate === ""))
        return res.status(400).json({
          success: false,
          message: "Each item must have gstRate for item-wise GST PO",
        });

      if (!isItemWise && item.gstRate)
        return res.status(400).json({
          success: false,
          message: "gstRate is only allowed when PO GST type is ITEMWISE",
        });
    }

    const oldValue = JSON.parse(JSON.stringify(existingPO));

    // Fetch vendor
    const vendorToUseId = vendorId || existingPO.vendorId;
    const vendor = await prisma.vendor.findUnique({
      where: { id: vendorToUseId },
    });

    if (!vendor)
      return res
        .status(404)
        .json({ success: false, message: "Vendor not found" });

    const finalCurrency = existingPO.currency || "INR";
    const finalExchangeRate =
      finalCurrency === "INR"
        ? new Decimal(1)
        : new Decimal(vendor.exchangeRate || 1);

    // -------------------------
    // Totals
    // -------------------------
    let foreignSubTotal = new Decimal(0);
    let subTotalINR = new Decimal(0);
    let totalCGST = new Decimal(0);
    let totalSGST = new Decimal(0);
    let totalIGST = new Decimal(0);

    const normalItems = [];
    const itemWiseItems = [];

    // -------------------------
    // ⭐ UNIVERSAL GST LOGIC FOR EACH ITEM ⭐
    // -------------------------
    const processedItems = items.map((item) => {
      const qty = new Decimal(item.quantity);
      const rateForeign = new Decimal(item.rate);
      const amountForeign = rateForeign.mul(qty);
      const amountINR = amountForeign.mul(finalExchangeRate);

      foreignSubTotal = foreignSubTotal.plus(amountForeign);
      subTotalINR = subTotalINR.plus(amountINR);

      isItemWise ? itemWiseItems.push(item) : normalItems.push(item);

      let itemGSTType = null;
      let itemGSTRate = null;

      const isExempted = gstType.includes("EXEMPTED");
      const isItemWiseGST = gstType.includes("ITEMWISE");

      if (isExempted) {
        // CASE 1 — EXEMPTED
        itemGSTType = null;
        itemGSTRate = null;
      } else if (isItemWiseGST) {
        // CASE 2 — ITEMWISE
        itemGSTType = gstType;
        itemGSTRate = new Decimal(item.gstRate);
      } else {
        // CASE 3 — Normal IGST/LGST 5/12/18/28
        itemGSTRate = null;
        itemGSTType = null;
      }

      return {
        itemId: item.id,
        itemSource: item.source,
        itemName: item.name,
        hsnCode: item.hsnCode || null,
        modelNumber: item.modelNumber || null,
        itemDetail: item.itemDetail || null,
        unit: item.unit,

        rateInForeign: finalCurrency !== "INR" ? rateForeign : null,
        amountInForeign: finalCurrency !== "INR" ? amountForeign : null,

        rate: new Decimal(item.rate),
        quantity: qty,

        gstRate: itemGSTRate,
        itemGSTType: itemGSTType,

        total: amountINR,
      };
    });

    // OTHER CHARGES
    let otherChargesTotal = new Decimal(0);
    if (Array.isArray(otherCharges)) {
      for (const ch of otherCharges) {
        if (ch == null) continue;
        const amt = ch.amount ?? ch.value ?? null;
        if (amt == null || isNaN(amt)) continue;
        otherChargesTotal = otherChargesTotal.plus(new Decimal(amt));
      }
    }
    subTotalINR = subTotalINR.plus(otherChargesTotal);

    // GST FOR NORMAL ITEMS
    const poGSTPercent =
      isItemWise || gstType.includes("EXEMPTED")
        ? null
        : getGSTPercent(gstType);

    if (normalItems.length && poGSTPercent) {
      const normalTotalINR = subTotalINR;

      if (gstType.startsWith("LGST")) {
        totalCGST = totalCGST.plus(
          normalTotalINR.mul(new Decimal(poGSTPercent).div(200))
        );
        totalSGST = totalSGST.plus(
          normalTotalINR.mul(new Decimal(poGSTPercent).div(200))
        );
      } else if (gstType.startsWith("IGST")) {
        totalIGST = totalIGST.plus(
          normalTotalINR.mul(new Decimal(poGSTPercent).div(100))
        );
      }
    }

    // GST FOR ITEMWISE
    if (isItemWise) {
      for (const item of itemWiseItems) {
        const totalINR = new Decimal(item.rate)
          .mul(item.quantity)
          .mul(finalExchangeRate);
        const rate = new Decimal(item.gstRate);

        if (gstType === "LGST_ITEMWISE") {
          totalCGST = totalCGST.plus(totalINR.mul(rate.div(200)));
          totalSGST = totalSGST.plus(totalINR.mul(rate.div(200)));
        } else if (gstType === "IGST_ITEMWISE") {
          totalIGST = totalIGST.plus(totalINR.mul(rate.div(100)));
        }
      }
    }

    const totalGST = totalCGST.plus(totalSGST).plus(totalIGST);
    const grandTotalINR = subTotalINR.plus(totalGST);
    const foreignGrandTotal = foreignSubTotal;

    // -------------------------
    // UPDATE PO
    // -------------------------
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
          gstRate: poGSTPercent,
          currency: finalCurrency,
          exchangeRate: finalExchangeRate.toString(),
          foreignSubTotal,
          foreignGrandTotal,
          subTotal: subTotalINR,
          totalCGST,
          totalSGST,
          totalIGST,
          totalGST,
          grandTotal: grandTotalINR,
          remarks,
          paymentTerms,
          deliveryTerms,
          warranty,
          contactPerson,
          cellNo,
          otherCharges,
          items: {
            create: processedItems,
          },
        },
        include: { items: true },
      });

      await tx.auditLog.create({
        data: {
          entityType: "PurchaseOrder",
          entityId: po.id,
          action: "UPDATED",
          performedBy: userId,
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
    res.status(500).json({
      success: false,
      message: err.message || "Server error while updating PO",
    });
  }
};

const getPOListByCompany = async (req, res) => {
  try {
    const { companyId } = req.params;

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
    const { poId } = req.params;

    if (!poId) {
      return res.status(400).json({
        success: false,
        message: "Purchase Order ID is required",
      });
    }

    const po = await prisma.purchaseOrder.findUnique({
      where: { id: poId },
      select: {
        id: true,
        poNumber: true,
        //financialYear: true,
        companyId: true,
        companyName: true,
        vendorId: true,
        vendorName: true,
        //bankDetailId: true,
        //createdBy: true,
        poDate: true,
        gstType: true,
        gstRate: true,
        currency: true,
        exchangeRate: true,
        foreignSubTotal: true,
        foreignGrandTotal: true,
        subTotal: true,
        //totalCGST: true,
        //totalSGST: true,
        //totalIGST: true,
        //totalGST: true,
        grandTotal: true,
        status: true,
        remarks: true,
        //pdfUrl: true,
        //pdfName: true,
        //pdfGeneratedAt: true,
        //pdfGeneratedBy: true,
        //emailSentAt: true,
        //emailSentBy: true,
        //emailResentCount: true,
        //emailLastResentAt: true,
        paymentTerms: true,
        deliveryTerms: true,
        contactPerson: true,
        cellNo: true,
        warranty: true,
        createdAt: true,
        otherCharges: true,
        //updatedAt: true,
        items: {
          select: {
            id: true,
            purchaseOrderId: true,
            itemId: true,
            itemSource: true,
            itemName: true,
            hsnCode: true,
            modelNumber: true,
            itemDetail: true,
            unit: true,
            rate: true,
            gstRate: true,
            quantity: true,
            amountInForeign: true,
            receivedQty: true,
            //itemGSTType: true,
            total: true,
            //createdAt: true,
            //updatedAt: true,
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
    const { poId } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return res
        .status(401)
        .json({ success: false, message: "Unauthorized: User not found." });
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
      include: { company: true, vendor: true, items: true },
    });

    if (!po) {
      return res.status(404).json({ success: false, message: "PO not found." });
    }

    const items = po.items.map((it) => ({
      itemName: it.itemName,
      hsnCode: it.hsnCode || "-",
      quantity: Number(it.quantity),
      modelNumber: it.modelNumber || null,
      itemDetail: it.itemDetail || null,
      unit: it.unit || "Nos",
      rate: Number(it.rate),
      total: Number(it.total),
      gstRate: Number(it.gstRate),
    }));

    // Generate PDF buffer (takes some time)
    const pdfBuffer = await generatePO(po, items);

    const vendor = po.vendor.name.split(" ")[0];
    console.log(vendor);
    const fileName = `${vendor.toUpperCase()}-PO-${po.poNumber}.pdf`;

    // ✅ Transaction: Update PO + log audit
    await prisma.$transaction(async (tx) => {
      const oldPdfData =
        po.pdfUrl || po.pdfName || po.pdfGeneratedAt
          ? {
              pdfName: po.pdfName || null,
              pdfUrl: po.pdfUrl || null,
              generatedAt: po.pdfGeneratedAt || null,
              generatedBy: po.pdfGeneratedBy || null,
            }
          : null;

      const newPdfData = {
        pdfName: fileName,
        pdfUrl: null,
        generatedAt: new Date(),
        generatedBy: userId,
      };

      // Update PO status and PDF details
      await tx.purchaseOrder.update({
        where: { id: poId },
        data: {
          //status: "Generated_Downloaded",
          pdfName: fileName,
          pdfGeneratedAt: new Date(),
          pdfGeneratedBy: userId,
        },
      });

      // Log to audit table
      await tx.auditLog.create({
        data: {
          entityType: "PurchaseOrder",
          entityId: poId,
          action: "Generated PDF",
          performedBy: userId,
          oldValue: oldPdfData,
          newValue: newPdfData,
        },
      });
    });

    // ✅ Send PDF directly to browser
    res.set({
      "Content-Type": "application/pdf",
      "Content-Length": pdfBuffer.length,
      "Content-Disposition": `attachment; filename="${fileName}"`,
    });

    return res.end(pdfBuffer);
  } catch (err) {
    console.error("❌ Error generating PO PDF:", err);
    return res.status(500).json({
      success: false,
      message: "Server Error while generating PO PDF",
      error: err.message,
    });
  }
};

const downloadPOPDF2 = async (req, res) => {
  try {
    const { poId } = req.params;
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
      include: { company: true, vendor: true, items: true },
    });

    if (!po) {
      return res.status(404).json({ success: false, message: "PO not found." });
    }

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

    const pdfBuffer = await poGenerate(po, items);

    // sanitize vendor name
    const vendor = po.vendor.name.split(" ")[0];
    const fileName = `${vendor}-PO-${po.poNumber}.pdf`;

    const now = new Date();

    await prisma.$transaction(async (tx) => {
      const oldPdfData =
        po.pdfUrl || po.pdfName || po.pdfGeneratedAt
          ? {
              pdfName: po.pdfName,
              pdfUrl: po.pdfUrl,
              generatedAt: po.pdfGeneratedAt,
              generatedBy: po.pdfGeneratedBy,
            }
          : null;

      const newPdfData = {
        pdfName: fileName,
        pdfUrl: null,
        generatedAt: now,
        generatedBy: userId,
      };

      await tx.purchaseOrder.update({
        where: { id: poId },
        data: {
          //status: "Generated_Downloaded",
          pdfName: fileName,
          pdfGeneratedAt: now,
          pdfGeneratedBy: userId,
        },
      });

      await tx.auditLog.create({
        data: {
          entityType: "PurchaseOrder",
          entityId: poId,
          action: "Generated PDF",
          performedBy: userId,
          oldValue: oldPdfData,
          newValue: newPdfData,
        },
      });
    });

    res.set({
      "Content-Type": "application/pdf",
      "Content-Length": Buffer.byteLength(pdfBuffer),
      "Content-Disposition": `attachment; filename="${fileName}"`,
    });

    return res.end(pdfBuffer);
  } catch (err) {
    console.error("❌ Error generating PO PDF:", err.stack || err);
    return res.status(500).json({
      success: false,
      message: "Server Error while generating PO PDF",
      error: err.message,
    });
  }
};

const sendOrResendPO = async (req, res) => {
  try {
    const { poId } = req.query;
    const userId = req?.user?.id;

    if (!poId) {
      return res
        .status(404)
        .json({ success: false, message: "PO-Id is required" });
    }

    const userData = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        role: { select: { name: true } },
      },
    });

    if (!userData) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
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

    if (!po)
      return res.status(404).json({ success: false, message: "PO not found" });
    if (!po.vendor.email)
      return res
        .status(400)
        .json({ success: false, message: "Vendor email missing" });
    if (!po.pdfName || !po.pdfUrl) {
      return res
        .status(400)
        .json({ success: false, message: "PDF not generated yet" });
    }

    const pdfPath = path.join(
      __dirname,
      "../../uploads/purchaseOrder",
      po.pdfName
    );
    if (!fs.existsSync(pdfPath)) {
      return res
        .status(404)
        .json({ success: false, message: "PDF file missing on server" });
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

function convertUnit(value, fromUnit, toUnit) {
  const unitMap = {
    // Weight
    kg: 1000 * 1000, // base = mg
    gm: 1000,
    mg: 1,

    // Length
    mtr: 1000, // base = mm
    cm: 10,
    mm: 1,

    // Volume
    ltr: 1000, // base = ml
    ml: 1,

    // Count units
    nos: 1,
    pcs: 1,
    "pcs/nos": 1,
  };

  const f = fromUnit?.toLowerCase();
  const t = toUnit?.toLowerCase();

  if (!unitMap[f] || !unitMap[t]) {
    throw new Error(`Unsupported unit conversion: ${fromUnit} → ${toUnit}`);
  }

  const baseValue = value * unitMap[f]; // convert to base
  return baseValue / unitMap[t]; // convert to target
}

const createOrUpdatePurchaseOrderReceipts = async (req, res) => {
  const userId = req.user?.id;
  let uploadedFilePath = null;

  const deleteUploadedFile = () => {
    if (uploadedFilePath) {
      try {
        fs.unlinkSync(uploadedFilePath);
        console.log("🗑️ Uploaded bill file deleted due to error.");
      } catch (err) {
        console.error("⚠️ File delete failed:", err);
      }
    }
  };

  const validateItems = async (items, po) => {
    for (const item of items) {
      const { itemId, itemSource, purchaseOrderItemId } = item;

      if (!itemId || !itemSource || !purchaseOrderItemId) {
        throw new Error("Invalid item data.");
      }

      const poItem = po.items.find((p) => p.id === purchaseOrderItemId);
      if (!poItem) {
        throw new Error(`PO item ${purchaseOrderItemId} not found.`);
      }

      if (itemSource === "mongo") {
        const systemItem = await SystemItem.findById(itemId);
        if (!systemItem) throw new Error(`SystemItem ${itemId} not found.`);
      } else if (itemSource === "mysql") {
        const rawMat = await prisma.rawMaterial.findUnique({
          where: { id: itemId },
        });
        if (!rawMat) throw new Error(`RawMaterial ${itemId} not found.`);
      } else {
        throw new Error(`Invalid itemSource for ${itemId}.`);
      }
    }
  };

  try {
    // Parse items if sent as JSON string
    if (req.body.items) {
      try {
        req.body.items = JSON.parse(req.body.items);
      } catch (err) {
        return res
          .status(400)
          .json({ success: false, message: "Invalid JSON format for items." });
      }
    }

    const { purchaseOrderId, items, warehouseId } = req.body;
    const billFile = req.files?.billFile?.[0];

    if (!billFile)
      return res
        .status(400)
        .json({ success: false, message: "Bill file is required." });

    uploadedFilePath = path.join(
      __dirname,
      "../../uploads/purchaseOrder/receivingBill",
      billFile.filename
    );

    if (
      !purchaseOrderId ||
      !Array.isArray(items) ||
      items.length === 0 ||
      !warehouseId
    ) {
      deleteUploadedFile();
      return res.status(400).json({
        success: false,
        message: "purchaseOrderId, warehouseId and items[] are required.",
      });
    }

    const warehouseData = await Warehouse.findById(warehouseId);
    if (!warehouseData) throw new Error("Warehouse not found.");

    const po = await prisma.purchaseOrder.findUnique({
      where: { id: purchaseOrderId },
      include: { items: true },
    });

    if (!po) throw new Error("Purchase Order not found.");

    if (["Received", "Cancelled"].includes(po.status)) {
      throw new Error(`PO already ${po.status}.`);
    }

    // Validate all items before processing
    await validateItems(items, po);

    const { receiptResults, stockUpdates } = await prisma.$transaction(
      async (tx) => {
        const receiptResults = [];
        const stockUpdates = [];
        let allFullyDamaged = true;
        let poStatusFlags = { allReceived: true, someReceived: false };

        // Save uploaded bill
        await tx.purchaseOrderBill.create({
          data: {
            purchaseOrderId,
            fileName: billFile.filename,
            fileUrl: `/uploads/purchaseOrder/receivingBill/${billFile.filename}`,
            mimeType: billFile.mimetype,
            uploadedBy: userId,
          },
        });

        for (const item of items) {
          const {
            purchaseOrderItemId,
            itemId,
            itemSource,
            itemName,
            receivedQty = 0,
            goodQty = 0,
            damagedQty = 0,
            remarks = "",
          } = item;

          const poItem = po.items.find((p) => p.id === purchaseOrderItemId);
          const poQty = Number(poItem.quantity);
          const poUnit = poItem.unit?.toLowerCase();
          const alreadyReceived = Number(poItem.receivedQty || 0);

          // Prevent over-receiving
          if (alreadyReceived >= poQty)
            throw new Error(`${itemName} already fully received (${poQty}).`);
          if (alreadyReceived + receivedQty > poQty)
            throw new Error(
              `Cannot receive ${receivedQty} of ${itemName}. Only ${poQty - alreadyReceived} remaining.`
            );

          if (goodQty > 0) allFullyDamaged = false;

          const totalReceived = alreadyReceived + receivedQty;

          // Create receipt
          await tx.purchaseOrderReceipt.create({
            data: {
              purchaseOrderId,
              purchaseOrderItemId,
              itemId,
              itemSource,
              itemName,
              receivedQty,
              goodQty,
              damagedQty,
              remarks,
              createdBy: userId,
              receivedDate: new Date(),
            },
          });

          // Update PO item receivedQty
          await tx.purchaseOrderItem.update({
            where: { id: purchaseOrderItemId },
            data: { receivedQty: totalReceived },
          });

          // Damaged stock handling
          if (damagedQty > 0) {
            const existingDamage = await tx.damagedStock.findFirst({
              where: { itemId, itemSource, purchaseOrderId },
            });

            if (existingDamage) {
              await tx.damagedStock.update({
                where: { id: existingDamage.id },
                data: {
                  quantity: { increment: damagedQty },
                  remarks: `${existingDamage.remarks || ""}${existingDamage.remarks ? "; " : ""}${remarks}`,
                },
              });
            } else {
              await tx.damagedStock.create({
                data: {
                  purchaseOrderId,
                  itemId,
                  itemSource,
                  itemName,
                  quantity: damagedQty,
                  unit,
                  remarks,
                },
              });
            }
          }

          // Stock updates
          if (goodQty > 0)
            stockUpdates.push({
              itemSource,
              itemId,
              goodQty,
              warehouseId,
              poUnit,
            });

          // Track PO status flags
          poStatusFlags.someReceived =
            poStatusFlags.someReceived || totalReceived > 0;
          poStatusFlags.allReceived =
            poStatusFlags.allReceived && totalReceived >= poQty;

          receiptResults.push({
            itemId,
            itemName,
            receivedQty,
            goodQty,
            damagedQty,
            remainingQty: poQty - totalReceived,
          });
        }

        // Update PO status
        let newPOStatus = po.status;
        if (allFullyDamaged) newPOStatus = "Cancelled";
        else if (poStatusFlags.allReceived) newPOStatus = "Received";
        else if (poStatusFlags.someReceived) newPOStatus = "PartiallyReceived";

        if (newPOStatus !== po.status) {
          await tx.purchaseOrder.update({
            where: { id: purchaseOrderId },
            data: { status: newPOStatus },
          });
        }

        return { receiptResults, stockUpdates };
      }
    );

    // Update warehouse and raw materials
    await Promise.all(
      stockUpdates.map(
        async ({ itemSource, itemId, goodQty, warehouseId, poUnit }) => {
          if (itemSource === "mongo") {
            const inventoryItem = await InstallationInventory.findOne({
              warehouseId,
              systemItemId: itemId,
            });
            if (inventoryItem) {
              inventoryItem.quantity += goodQty;
              await inventoryItem.save();
            } else {
              await InstallationInventory.create({
                warehouseId,
                systemItemId: itemId,
                quantity: goodQty,
              });
            }
          }

          if (itemSource === "mysql") {
            const rawMat = await prisma.rawMaterial.findUnique({
              where: { id: itemId },
            });
            if (!rawMat) throw new Error(`RawMaterial ${itemId} not found.`);
            const dbUnit = rawMat.unit?.toLowerCase();
            const convertedQty =
              dbUnit === poUnit
                ? goodQty
                : convertUnit(goodQty, poUnit, dbUnit);
            await prisma.rawMaterial.update({
              where: { id: itemId },
              data: { stock: { increment: convertedQty } },
            });
          }
        }
      )
    );

    return res.status(200).json({
      success: true,
      message: "Purchase Order Receipts processed successfully.",
      data: receiptResults,
    });
  } catch (error) {
    console.error("❌ Error in PO Receipt creation:", error);
    deleteUploadedFile();
    return res.status(500).json({
      success: false,
      message: error.message || "Server error while processing PO Receipts.",
    });
  }
};

const purchaseOrderReceivingBill = async (req, res) => {
  const userId = req.user?.id;
  let uploadedFilePath = null;

  const deleteUploadedFile = () => {
    if (uploadedFilePath) {
      try {
        fs.unlinkSync(uploadedFilePath);
        console.log("🗑️ Uploaded bill file deleted due to error.");
      } catch (err) {
        console.error("⚠️ File delete failed:", err);
      }
    }
  };

  const validateItems = async (items, po) => {
    for (const item of items) {
      const { itemId, itemSource, purchaseOrderItemId } = item;

      if (!itemId || !itemSource || !purchaseOrderItemId) {
        throw new Error("Invalid item data.");
      }

      const poItem = po.items.find((p) => p.id === purchaseOrderItemId);
      if (!poItem) {
        throw new Error(`PO item ${purchaseOrderItemId} not found.`);
      }

      if (itemSource === "mongo") {
        const systemItem = await SystemItem.findById(itemId);
        if (!systemItem) throw new Error(`SystemItem ${itemId} not found.`);
      } else if (itemSource === "mysql") {
        const rawMat = await prisma.rawMaterial.findUnique({
          where: { id: itemId },
        });
        if (!rawMat) throw new Error(`RawMaterial ${itemId} not found.`);
      } else {
        throw new Error(`Invalid itemSource for ${itemId}.`);
      }
    }
  };

  try {
    // Parse JSON items if needed
    if (req.body.items) {
      try {
        req.body.items = JSON.parse(req.body.items);
      } catch (err) {
        return res
          .status(400)
          .json({ success: false, message: "Invalid JSON format for items." });
      }
    }

    const { purchaseOrderId, items, warehouseId, invoiceNumber } = req.body;
    const billFile = req.files?.billFile?.[0];

    if (!billFile)
      return res
        .status(400)
        .json({ success: false, message: "Bill file is required." });

    uploadedFilePath = path.join(
      __dirname,
      "../../uploads/purchaseOrder/receivingBill",
      billFile.filename
    );

    if (
      !purchaseOrderId ||
      !invoiceNumber ||
      !Array.isArray(items) ||
      items.length === 0 ||
      !warehouseId
    ) {
      deleteUploadedFile();
      return res.status(400).json({
        success: false,
        message:
          "purchaseOrderId, warehouseId, invoiceNumber and items[] are required.",
      });
    }

    const warehouseData = await Warehouse.findById(warehouseId);
    if (!warehouseData) throw new Error("Warehouse not found.");

    const po = await prisma.purchaseOrder.findUnique({
      where: { id: purchaseOrderId },
      include: { items: true },
    });

    if (!po) throw new Error("Purchase Order not found.");

    if (["Received", "Cancelled"].includes(po.status)) {
      throw new Error(`PO already ${po.status}.`);
    }

    // Validate items exist
    await validateItems(items, po);

    const { receiptResults, stockUpdates } = await prisma.$transaction(
      async (tx) => {
        const receiptResults = [];
        const stockUpdates = [];
        let allFullyDamaged = true;
        let poStatusFlags = { allReceived: true, someReceived: false };

        // Save bill
        await tx.purchaseOrderBill.create({
          data: {
            purchaseOrderId,
            invoiceNumber,
            fileName: billFile.filename,
            fileUrl: `/uploads/purchaseOrder/receivingBill/${billFile.filename}`,
            mimeType: billFile.mimetype,
            uploadedBy: userId,
          },
        });

        for (const item of items) {
          const {
            purchaseOrderItemId,
            itemId,
            itemSource,
            itemName,
            receivedQty = 0,
            goodQty = 0,
            damagedQty = 0,
            remarks = "",
          } = item;

          const poItem = po.items.find((p) => p.id === purchaseOrderItemId);
          const poQty = Number(poItem.quantity);
          const poUnit = poItem.unit?.toLowerCase();
          const alreadyReceived = Number(poItem.receivedQty || 0);

          // Prevent over receiving (GOOD QTY CHECK)
          if (alreadyReceived >= poQty)
            throw new Error(`${itemName} already fully received (${poQty}).`);

          if (alreadyReceived + goodQty > poQty)
            throw new Error(
              `Cannot receive goodQty ${goodQty} of ${itemName}. Only ${
                poQty - alreadyReceived
              } remaining.`
            );

          if (goodQty > 0) allFullyDamaged = false;

          // ❗ FIX: Only update TOTAL RECEIVED with GOOD QTY
          const totalReceived = alreadyReceived + goodQty;

          // Create receipt entry
          await tx.purchaseOrderReceipt.create({
            data: {
              purchaseOrderId,
              purchaseOrderItemId,
              invoiceNumber,
              itemId,
              itemSource,
              itemName,
              receivedQty,
              goodQty,
              damagedQty,
              remarks,
              createdBy: userId,
              receivedDate: new Date(),
            },
          });

          // ❗ FIX: Update only with GOOD QTY
          await tx.purchaseOrderItem.update({
            where: { id: purchaseOrderItemId },
            data: { receivedQty: totalReceived },
          });

          // Handle damaged stock
          if (damagedQty > 0) {
            const existingDamage = await tx.damagedStock.findFirst({
              where: { itemId, itemSource, purchaseOrderId },
            });

            if (existingDamage) {
              await tx.damagedStock.update({
                where: { id: existingDamage.id },
                data: {
                  quantity: { increment: damagedQty },
                  status: "Pending",
                  remarks: `${existingDamage.remarks || ""}${
                    existingDamage.remarks ? "; " : ""
                  }${remarks}`,
                },
              });
            } else {
              await tx.damagedStock.create({
                data: {
                  purchaseOrderId,
                  invoiceNumber,
                  itemId,
                  itemSource,
                  itemName,
                  unit: poItem.unit,
                  quantity: damagedQty,
                  status: "Pending",
                  remarks,
                },
              });
            }

            hasDamage = true;
          }

          // Stock update only for goodQty
          if (goodQty > 0)
            stockUpdates.push({
              itemSource,
              itemId,
              goodQty,
              warehouseId,
              poUnit,
            });

          poStatusFlags.someReceived =
            poStatusFlags.someReceived || totalReceived > 0;
          poStatusFlags.allReceived =
            poStatusFlags.allReceived && totalReceived >= poQty;

          receiptResults.push({
            itemId,
            itemName,
            receivedQty,
            goodQty,
            damagedQty,
            remainingQty: poQty - totalReceived,
          });
        }

        // Check pending damage
        const pendingDamage = await prisma.damagedStock.findMany({
          where: {
            purchaseOrderId,
            status: "Pending",
          },
        });

        const hasPendingDamage = pendingDamage.length > 0;

        // Update PO status
        let newPOStatus = po.status;

        if (allFullyDamaged) {
          newPOStatus = "Cancelled";
        } else if (poStatusFlags.allReceived && !hasPendingDamage) {
          newPOStatus = "Received";
        } else {
          newPOStatus = "PartiallyReceived";
        }

        if (newPOStatus !== po.status) {
          await tx.purchaseOrder.update({
            where: { id: purchaseOrderId },
            data: { status: newPOStatus },
          });
        }

        return { receiptResults, stockUpdates };
      }
    );

    // Update inventory or raw materials
    await Promise.all(
      stockUpdates.map(
        async ({ itemSource, itemId, goodQty, warehouseId, poUnit }) => {
          if (itemSource === "mongo") {
            const inventoryItem = await InstallationInventory.findOne({
              warehouseId,
              systemItemId: itemId,
            });
            if (inventoryItem) {
              inventoryItem.quantity += goodQty;
              await inventoryItem.save();
            } else {
              await InstallationInventory.create({
                warehouseId,
                systemItemId: itemId,
                quantity: goodQty,
              });
            }
          }

          if (itemSource === "mysql") {
            // 1️⃣ Get raw material
            const rawMat = await prisma.rawMaterial.findUnique({
              where: { id: itemId },
            });
            if (!rawMat) throw new Error(`RawMaterial ${itemId} not found.`);

            // 2️⃣ Unit conversion
            const dbUnit = rawMat.unit?.toLowerCase();
            const convertedQty =
              dbUnit === poUnit
                ? goodQty
                : convertUnit(goodQty, poUnit, dbUnit);

            // 3️⃣ Find warehouse stock (composite unique key)
            const warehouseStock = await prisma.warehouseStock.findUnique({
              where: {
                warehouseId_rawMaterialId: {
                  warehouseId,
                  rawMaterialId: itemId,
                },
              },
            });

            if (warehouseStock) {
              // 4️⃣ Update quantity
              await prisma.warehouseStock.update({
                where: {
                  warehouseId_rawMaterialId: {
                    warehouseId,
                    rawMaterialId: itemId,
                  },
                },
                data: {
                  quantity: { increment: convertedQty },
                  unit: dbUnit, // keep unit in sync
                },
              });
            }
          }
        }
      )
    );

    return res.status(200).json({
      success: true,
      message: "Purchase Order Receipts processed successfully.",
      data: receiptResults,
    });
  } catch (error) {
    console.error("❌ Error in PO Receipt creation:", error);
    deleteUploadedFile();
    return res.status(500).json({
      success: false,
      message: error.message || "Server error while processing PO Receipts.",
    });
  }
};

const getPurchaseOrderDetailsWithDamagedItems = async (req, res) => {
  try {
    const { poId } = req.params;

    if (!poId) {
      return res.status(400).json({
        success: false,
        message: "Purchase Order ID is required",
      });
    }

    const po = await prisma.purchaseOrder.findUnique({
      where: { id: poId },
      select: {
        id: true,
        poNumber: true,
        companyId: true,
        companyName: true,
        vendorId: true,
        vendorName: true,
        // gstType: true,
        // 🔥 THIS IS THE CHANGE
        damagedStock: {
          select: {
            id: true,
            itemId: true,
            itemSource: true,
            itemName: true,
            quantity: true,
            unit: true,
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
      message: "PO details with damaged stock fetched successfully",
      data: po || [],
    });
  } catch (error) {
    console.error("❌ Error fetching PO details:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Internal Server Error",
    });
  }
};

const createDebitNote = async (req, res) => {
  try {
    const {
      purchaseOrderId,
      companyId,
      vendorId,
      gstType,
      damagedItems,
      remarks,
      orgInvoiceNo,
      orgInvoiceDate,
      gr_rr_no,
      transport,
      vehicleNumber,
      station,
      exchangeRate: requestExchangeRate = 1,
      otherCharges = [],
    } = req.body;

    const userId = req.user?.id;
    if (!userId)
      return res
        .status(400)
        .json({ success: false, message: "User not found" });

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { role: true },
    });

    if (!user || user.role?.name !== "Purchase") {
      return res.status(403).json({
        success: false,
        message: "Only Purchase Department can create Debit Note.",
      });
    }

    if (
      !purchaseOrderId ||
      !companyId ||
      !vendorId ||
      !gstType ||
      !damagedItems?.length
    ) {
      return res.status(400).json({
        success: false,
        message:
          "PurchaseOrderId, Company, Vendor, GST Type & damagedItems are required",
      });
    }

    const isItemWise = gstType.includes("ITEMWISE");

    // Validate items
    for (const item of damagedItems) {
      if (
        !item.damagedStockId ||
        !item.itemId ||
        !item.name ||
        !item.source ||
        !item.unit
      ) {
        return res.status(400).json({
          success: false,
          message:
            "DamagedItems must include damagedStockId, itemId, name, source, unit",
        });
      }
      if (!item.rate || !item.quantity || Number(item.quantity) <= 0) {
        return res.status(400).json({
          success: false,
          message: "Each item must have valid quantity & rate",
        });
      }
      if (isItemWise && (item.gstRate == null || item.gstRate === "")) {
        return res.status(400).json({
          success: false,
          message: "Each item must have gstRate for item-wise GST Debit Note",
        });
      }
      if (!isItemWise && item.gstRate) {
        return res.status(400).json({
          success: false,
          message:
            "gstRate is only allowed when Debit Note GST type is ITEMWISE",
        });
      }
    }

    const mongoIds = [];
    const mysqlIds = [];

    // Separate IDs by source
    for (const item of damagedItems) {
      if (!item.source) {
        return res.status(400).json({
          success: false,
          message: "item.source is required (mongo/mysql)",
        });
      }

      if (item.source === "mongo") {
        mongoIds.push(item.itemId);
      } else if (item.source === "mysql") {
        mysqlIds.push(item.itemId);
      } else {
        return res.status(400).json({
          success: false,
          message: `Invalid item.source '${item.source}'. Use 'mongo' or 'mysql'.`,
        });
      }
    }

    // Fetch all mongo items in one query
    let existingMongoItems = [];
    if (mongoIds.length) {
      existingMongoItems = await SystemItem.find({ _id: { $in: mongoIds } })
        .select("_id")
        .lean();
    }

    // Fetch all mysql items in one query
    let existingMysqlItems = [];
    if (mysqlIds.length) {
      existingMysqlItems = await prisma.rawMaterial.findMany({
        where: { id: { in: mysqlIds } },
        select: { id: true },
      });
    }

    // Convert to fast lookup sets
    const mongoSet = new Set(existingMongoItems.map((m) => String(m._id)));
    const mysqlSet = new Set(existingMysqlItems.map((m) => m.id));

    // Validate each item
    for (const item of damagedItems) {
      if (item.source === "mongo" && !mongoSet.has(item.itemId)) {
        throw new Error(`System Item with id '${item.itemId}' Not Found in`);
      }

      if (item.source === "mysql" && !mysqlSet.has(item.itemId)) {
        throw new Error(`Raw Material with id '${item.itemId}' Not Found`);
      }
    }
    // Fetch company & vendor
    const [company, vendor] = await Promise.all([
      prisma.company.findUnique({ where: { id: companyId } }),
      prisma.vendor.findUnique({ where: { id: vendorId } }),
    ]);

    if (!company || !vendor) {
      return res.status(404).json({
        success: false,
        message: "Company/Vendor not found",
      });
    }

    // Debit Note currency and exchange rate
    const currency = vendor.currency || "INR";
    const exchangeRate = vendor.exchangeRate || requestExchangeRate || 1;

    const debitNoteNo = await generateDebitNoteNumber(company);
    if (await prisma.debitNote.findUnique({ where: { debitNoteNo } })) {
      return res.status(400).json({
        success: false,
        message: `Debit Note ${debitNoteNo} already exists`,
      });
    }

    // ------------------------------------
    // 🧮 Subtotal & GST Calculations
    // ------------------------------------
    let foreignSubTotal = new Decimal(0);
    let subTotalINR = new Decimal(0);
    let totalCGST = new Decimal(0);
    let totalSGST = new Decimal(0);
    let totalIGST = new Decimal(0);

    const normalItems = [];
    const itemWiseItems = [];

    // Process items for DB
    const processedItems = damagedItems.map((item) => {
      const qty = new Decimal(item.quantity);
      const rateForeign = new Decimal(item.rate);
      const amountForeign = rateForeign.mul(qty);
      const amountINR = amountForeign.mul(exchangeRate);

      foreignSubTotal = foreignSubTotal.plus(amountForeign);
      subTotalINR = subTotalINR.plus(amountINR);

      isItemWise ? itemWiseItems.push(item) : normalItems.push(item);

      return {
        purchaseOrderId,
        itemId: item.itemId,
        itemSource: item.source,
        itemName: item.name,
        hsnCode: item.hsnCode || null,
        modelNumber: item.modelNumber || null,
        itemDetail: item.itemDetail || null,
        unit: item.unit,
        rateInForeign: currency !== "INR" ? rateForeign : null,
        amountInForeign: currency !== "INR" ? amountForeign : null,
        rate: new Decimal(item.rate),
        gstRate: isItemWise ? new Decimal(item.gstRate) : null,
        quantity: qty,
        total: amountINR,
        itemGSTType: isItemWise ? gstType : null,
      };
    });

    // Add otherCharges to subtotal
    let otherChargesTotal = new Decimal(0);
    if (Array.isArray(otherCharges) && otherCharges.length > 0) {
      for (const ch of otherCharges) {
        if (!ch.amount || isNaN(ch.amount)) continue;
        otherChargesTotal = otherChargesTotal.plus(new Decimal(ch.amount));
      }
    }
    subTotalINR = subTotalINR.plus(otherChargesTotal);

    // GST for normal items
    const debitNoteGSTPercent =
      isItemWise || gstType.includes("EXEMPTED")
        ? null
        : getGSTPercent(gstType);

    if (normalItems.length && debitNoteGSTPercent) {
      const normalTotalINR = subTotalINR;

      if (gstType.startsWith("LGST")) {
        totalCGST = totalCGST.plus(
          normalTotalINR.mul(debitNoteGSTPercent.div(200))
        );
        totalSGST = totalSGST.plus(
          normalTotalINR.mul(debitNoteGSTPercent.div(200))
        );
      } else if (gstType.startsWith("IGST")) {
        totalIGST = totalIGST.plus(
          normalTotalINR.mul(debitNoteGSTPercent.div(100))
        );
      }
    }

    // Item-wise GST
    if (isItemWise) {
      for (const item of itemWiseItems) {
        const totalINR = new Decimal(item.rate)
          .mul(item.quantity)
          .mul(exchangeRate);
        const rate = new Decimal(item.gstRate);

        if (gstType === "LGST_ITEMWISE") {
          totalCGST = totalCGST.plus(totalINR.mul(rate.div(200)));
          totalSGST = totalSGST.plus(totalINR.mul(rate.div(200)));
        } else if (gstType === "IGST_ITEMWISE") {
          totalIGST = totalIGST.plus(totalINR.mul(rate.div(100)));
        }
      }
    }

    const totalGST = totalCGST.plus(totalSGST).plus(totalIGST);
    const grandTotalINR = subTotalINR.plus(totalGST);
    const foreignGrandTotal = foreignSubTotal;

    // ------------------------------------
    // 💾 Save Purchase Order
    // ------------------------------------
    const existingDamagedStocks = await prisma.damagedStock.findMany({
      where: {
        purchaseOrderId,
        status: "Pending",
        debitNoteId: null,
      },
    });

    if (!existingDamagedStocks.length) {
      return res.status(400).json({
        success: false,
        message: "No pending damaged stock found for this Purchase Order",
      });
    }

    const damagedStockMap = new Map();
    for (const ds of existingDamagedStocks) {
      damagedStockMap.set(`${ds.itemId}_${ds.itemSource}`, ds);
    }

    const newDebitNote = await prisma.$transaction(async (tx) => {
      const debitNote = await tx.debitNote.create({
        data: {
          debitNoteNo,
          financialYear: getFinancialYear(),
          purchaseOrderId,
          companyId,
          companyName: company.name,
          vendorId,
          vendorName: vendor.name,
          gstType,
          gstRate: debitNoteGSTPercent,
          currency,
          exchangeRate,
          foreignSubTotal,
          foreignGrandTotal,
          subTotal: subTotalINR,
          totalCGST,
          totalSGST,
          totalIGST,
          totalGST,
          grandTotal: grandTotalINR,
          remarks,
          orgInvoiceNo: orgInvoiceNo || null,
          orgInvoiceDate: orgInvoiceDate || null,
          gr_rr_no: gr_rr_no || null,
          transport: transport || null,
          vehicleNumber: vehicleNumber || null,
          station: station || null,
          createdBy: userId,
          otherCharges,
        },
      });

      // ✅ UPDATE existing DamagedStock
      for (const item of processedItems) {
        const key = `${item.itemId}_${item.itemSource}`;
        const damaged = damagedStockMap.get(key);

        if (!damaged) {
          throw new Error(`Damaged stock not found for ${item.itemName}`);
        }

        if (new Decimal(item.quantity).gt(damaged.quantity)) {
          throw new Error(
            `Debit quantity exceeds damaged quantity for ${item.itemName}`
          );
        }

        await tx.damagedStock.update({
          where: { id: damaged.id },
          data: {
            debitNoteId: debitNote.id,
            hsnCode: item.hsnCode || null,
            modelNumber: item.modelNumber || null,
            itemDetail: item.itemDetail || null,
            rate: item.rate,
            gstRate: item.gstRate,
            rateInForeign: item.rateInForeign,
            amountInForeign: item.amountInForeign,
            total: item.total,
            itemGSTType: item.itemGSTType,
            status: "Debited",
            updatedBy: userId,
          },
        });

        await tx.auditLog.create({
          data: {
            entityType: "DamagedStock",
            entityId: damaged.id,
            action: "DEBITED",
            performedBy: userId,
            newValue: { debitNoteId: debitNote.id, status: "Debited" },
          },
        });
      }

      await tx.auditLog.create({
        data: {
          entityType: "DebitNote",
          entityId: debitNote.id,
          action: "CREATED",
          performedBy: userId,
          newValue: debitNote,
        },
      });

      return debitNote;
    });

    return res.status(201).json({
      success: true,
      message: "✅ Debit Note created successfully",
      data: newDebitNote,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      success: false,
      message: err.message || "Server error while creating debit note",
    });
  }
};

const getDebitNoteListByPO = async (req, res) => {
  try {
    const { poId } = req.params;

    if (!poId) {
      return res.status(400).json({
        success: false,
        message: "poId is required",
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

    const debitNoteList = await prisma.debitNote.findMany({
      where: { purchaseOrderId: poId },
      select: {
        id: true,
        debitNoteNo: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return res.status(200).json({
      success: true,
      message: "Debit Note list fetched successfully",
      data: debitNoteList || [],
    });
  } catch (error) {
    console.error("Error fetching Debit Note list:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Internal Server Error",
    });
  }
};

const downloadDebitNote = async (req, res) => {
  try {
    const { poId, debitNoteId } = req.params;
    const userId = req.user?.id;
    if (!poId || !debitNoteId) {
      return res.status(400).json({
        success: false,
        message: "Missing Data: PO Id or Debit Note Id",
      });
    }
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

    const debitNote = await prisma.debitNote.findUnique({
      where: { id: debitNoteId, purchaseOrderId: poId },
      include: { company: true, vendor: true, damagedStock: true },
    });

    if (!debitNote) {
      return res
        .status(404)
        .json({ success: false, message: "Debit Note not found." });
    }

    // Freeze item values exactly as stored
    const items = debitNote.damagedStock.map((it) => ({
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

    const pdfBuffer = await debitNoteGenerate(debitNote, items);

    // sanitize vendor name
    const vendor = debitNote.vendor.name.split(" ")[0];
    const fileName = `${vendor}-DEBIT-${debitNote.debitNoteNo}.pdf`;

    const now = new Date();

    await prisma.$transaction(async (tx) => {
      const oldPdfData =
        debitNote.pdfUrl || debitNote.pdfName || debitNote.pdfGeneratedAt
          ? {
              pdfName: debitNote.pdfName,
              pdfUrl: debitNote.pdfUrl,
              generatedAt: debitNote.pdfGeneratedAt,
              generatedBy: debitNote.pdfGeneratedBy,
            }
          : null;

      const newPdfData = {
        pdfName: fileName,
        pdfUrl: null,
        generatedAt: now,
        generatedBy: userId,
      };

      await tx.debitNote.update({
        where: { id: debitNoteId },
        data: {
          //status: "Generated_Downloaded",
          pdfName: fileName,
          pdfGeneratedAt: now,
          pdfGeneratedBy: userId,
        },
      });

      await tx.auditLog.create({
        data: {
          entityType: "DebitNote",
          entityId: debitNoteId,
          action: "Generated PDF",
          performedBy: userId,
          oldValue: oldPdfData,
          newValue: newPdfData,
        },
      });
    });

    res.set({
      "Content-Type": "application/pdf",
      "Content-Length": Buffer.byteLength(pdfBuffer),
      "Content-Disposition": `attachment; filename="${fileName}"`,
    });

    return res.end(pdfBuffer);
  } catch (err) {
    console.error("❌ Error generating Debit Note PDF:", err.stack || err);
    return res.status(500).json({
      success: false,
      message: "Server Error while generating Debite Note PDF",
      error: err.message,
    });
  }
};

const getDebitNoteDetails = async (req, res) => {
  try {
    const { debitNoteId } = req.params;

    if (!debitNoteId) {
      return res.status(400).json({
        success: false,
        message: "Debit Note ID is required",
      });
    }

    const debitNote = await prisma.debitNote.findUnique({
      where: { id: debitNoteId },
      select: {
        id: true,
        purchaseOrderId: true,
        debitNoteNo: true,
        //financialYear: true,
        companyId: true,
        companyName: true,
        vendorId: true,
        vendorName: true,
        //bankDetailId: true,
        //createdBy: true,
        drNoteDate: true,
        gstType: true,
        gstRate: true,
        currency: true,
        exchangeRate: true,
        foreignSubTotal: true,
        foreignGrandTotal: true,
        subTotal: true,
        //totalCGST: true,
        //totalSGST: true,
        //totalIGST: true,
        //totalGST: true,
        grandTotal: true,
        status: true,
        remarks: true,
        //pdfUrl: true,
        //pdfName: true,
        //pdfGeneratedAt: true,
        //pdfGeneratedBy: true,
        //emailSentAt: true,
        //emailSentBy: true,
        //emailResentCount: true,
        //emailLastResentAt: true,
        orgInvoiceNo: true,
        orgInvoiceDate: true,
        gr_rr_no: true,
        transport: true,
        vehicleNumber: true,
        station: true,
        createdAt: true,
        otherCharges: true,
        //updatedAt: true,
        damagedStock: {
          select: {
            id: true,
            purchaseOrderId: true,
            debitNoteId: true,
            itemId: true,
            itemSource: true,
            itemName: true,
            hsnCode: true,
            modelNumber: true,
            itemDetail: true,
            unit: true,
            rate: true,
            gstRate: true,
            quantity: true,
            amountInForeign: true,
            receivedQty: true,
            //itemGSTType: true,
            total: true,
            //createdAt: true,
            //updatedAt: true,
          },
        },
      },
    });

    if (!debitNote) {
      return res.status(404).json({
        success: false,
        message: "Purchase Order not found",
      });
    }

    return res.json({
      success: true,
      message: "Debit Note details fetched successfully",
      data: debitNote,
    });
  } catch (error) {
    console.error("❌ Error fetching Debit Note details:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Internal Server Error",
    });
  }
};

const updateDebitNote = async (req, res) => {
  try {
    const { debitNoteId } = req.params;
    const {
      companyId,
      vendorId,
      gstType,
      damagedItems,
      remarks,
      orgInvoiceNo,
      orgInvoiceDate,
      gr_rr_no,
      transport,
      vehicleNumber,
      station,
      otherCharges = [],
    } = req.body;

    const userId = req.user?.id;
    if (!userId)
      return res
        .status(400)
        .json({ success: false, message: "User not found" });

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { role: true },
    });

    if (!user || user.role?.name !== "Purchase") {
      return res.status(403).json({
        success: false,
        message: "Only Purchase Department can update PO",
      });
    }

    const existingDebitNote = await prisma.debitNote.findUnique({
      where: { id: debitNoteId },
      include: { damagedItems: true },
    });

    if (!existingDebitNote)
      return res
        .status(404)
        .json({ success: false, message: "Debit Note not found" });

    // if (existingPO.status !== "Draft") {
    //   return res.status(400).json({
    //     success: false,
    //     message: "Only Draft PO can be updated",
    //   });
    // }

    if (!damagedItems?.length)
      return res.status(400).json({
        success: false,
        message: "At least one item is required",
      });

    const isItemWise = gstType.includes("ITEMWISE");

    // Validate items
    for (const item of damagedItems) {
      if (!item.itemId || !item.name || !item.unit)
        return res.status(400).json({
          success: false,
          message: "Each item must include id, name, and unit",
        });

      if (!item.rate || !item.quantity || Number(item.quantity) <= 0)
        return res.status(400).json({
          success: false,
          message: "Each item must have valid rate and quantity",
        });

      if (isItemWise && (item.gstRate == null || item.gstRate === ""))
        return res.status(400).json({
          success: false,
          message: "Each item must have gstRate for item-wise GST PO",
        });

      if (!isItemWise && item.gstRate)
        return res.status(400).json({
          success: false,
          message: "gstRate is only allowed when PO GST type is ITEMWISE",
        });
    }

    const oldValue = JSON.parse(JSON.stringify(existingPO));

    // Fetch vendor
    const vendorToUseId = vendorId || existingDebitNote.vendorId;
    const vendor = await prisma.vendor.findUnique({
      where: { id: vendorToUseId },
    });

    if (!vendor)
      return res
        .status(404)
        .json({ success: false, message: "Vendor not found" });

    const finalCurrency = existingDebitNote.currency || "INR";
    const finalExchangeRate =
      finalCurrency === "INR"
        ? new Decimal(1)
        : new Decimal(vendor.exchangeRate || 1);

    let foreignSubTotal = new Decimal(0);
    let subTotalINR = new Decimal(0);
    let totalCGST = new Decimal(0);
    let totalSGST = new Decimal(0);
    let totalIGST = new Decimal(0);

    const normalItems = [];
    const itemWiseItems = [];

    // -------------------------
    // ⭐ UNIVERSAL GST LOGIC FOR EACH ITEM ⭐
    // -------------------------
    const processedItems = damagedItems.map((item) => {
      const qty = new Decimal(item.quantity);
      const rateForeign = new Decimal(item.rate);
      const amountForeign = rateForeign.mul(qty);
      const amountINR = amountForeign.mul(finalExchangeRate);

      foreignSubTotal = foreignSubTotal.plus(amountForeign);
      subTotalINR = subTotalINR.plus(amountINR);

      isItemWise ? itemWiseItems.push(item) : normalItems.push(item);

      let itemGSTType = null;
      let itemGSTRate = null;

      const isExempted = gstType.includes("EXEMPTED");
      const isItemWiseGST = gstType.includes("ITEMWISE");

      if (isExempted) {
        // CASE 1 — EXEMPTED
        itemGSTType = null;
        itemGSTRate = null;
      } else if (isItemWiseGST) {
        // CASE 2 — ITEMWISE
        itemGSTType = gstType;
        itemGSTRate = new Decimal(item.gstRate);
      } else {
        // CASE 3 — Normal IGST/LGST 5/12/18/28
        itemGSTRate = null;
        itemGSTType = null;
      }

      return {
        itemId: item.id,
        itemSource: item.source,
        itemName: item.name,
        hsnCode: item.hsnCode || null,
        modelNumber: item.modelNumber || null,
        itemDetail: item.itemDetail || null,
        unit: item.unit,

        rateInForeign: finalCurrency !== "INR" ? rateForeign : null,
        amountInForeign: finalCurrency !== "INR" ? amountForeign : null,

        rate: new Decimal(item.rate),
        quantity: qty,

        gstRate: itemGSTRate,
        itemGSTType: itemGSTType,

        total: amountINR,
      };
    });

    // OTHER CHARGES
    let otherChargesTotal = new Decimal(0);
    if (Array.isArray(otherCharges)) {
      for (const ch of otherCharges) {
        if (ch == null) continue;
        const amt = ch.amount ?? ch.value ?? null;
        if (amt == null || isNaN(amt)) continue;
        otherChargesTotal = otherChargesTotal.plus(new Decimal(amt));
      }
    }
    subTotalINR = subTotalINR.plus(otherChargesTotal);

    // GST FOR NORMAL ITEMS
    const poGSTPercent =
      isItemWise || gstType.includes("EXEMPTED")
        ? null
        : getGSTPercent(gstType);

    if (normalItems.length && poGSTPercent) {
      const normalTotalINR = subTotalINR;

      if (gstType.startsWith("LGST")) {
        totalCGST = totalCGST.plus(
          normalTotalINR.mul(new Decimal(poGSTPercent).div(200))
        );
        totalSGST = totalSGST.plus(
          normalTotalINR.mul(new Decimal(poGSTPercent).div(200))
        );
      } else if (gstType.startsWith("IGST")) {
        totalIGST = totalIGST.plus(
          normalTotalINR.mul(new Decimal(poGSTPercent).div(100))
        );
      }
    }

    // GST FOR ITEMWISE
    if (isItemWise) {
      for (const item of itemWiseItems) {
        const totalINR = new Decimal(item.rate)
          .mul(item.quantity)
          .mul(finalExchangeRate);
        const rate = new Decimal(item.gstRate);

        if (gstType === "LGST_ITEMWISE") {
          totalCGST = totalCGST.plus(totalINR.mul(rate.div(200)));
          totalSGST = totalSGST.plus(totalINR.mul(rate.div(200)));
        } else if (gstType === "IGST_ITEMWISE") {
          totalIGST = totalIGST.plus(totalINR.mul(rate.div(100)));
        }
      }
    }

    const totalGST = totalCGST.plus(totalSGST).plus(totalIGST);
    const grandTotalINR = subTotalINR.plus(totalGST);
    const foreignGrandTotal = foreignSubTotal;

    // -------------------------
    // UPDATE PO
    // -------------------------
    const updateddebitNote = await prisma.$transaction(async (tx) => {
      await tx.purchaseOrderItem.deleteMany({
        where: { purchaseOrderId: poId },
      });

      const po = await tx.purchaseOrder.update({
        where: { id: poId },
        data: {
          companyId: companyId || existingPO.companyId,
          vendorId: vendorId || existingPO.vendorId,
          gstType,
          gstRate: poGSTPercent,
          currency: finalCurrency,
          exchangeRate: finalExchangeRate.toString(),
          foreignSubTotal,
          foreignGrandTotal,
          subTotal: subTotalINR,
          totalCGST,
          totalSGST,
          totalIGST,
          totalGST,
          grandTotal: grandTotalINR,
          remarks,
          paymentTerms,
          deliveryTerms,
          warranty,
          contactPerson,
          cellNo,
          otherCharges,
          damagedItems: {
            create: processedItems,
          },
        },
        include: { items: true },
      });

      await tx.auditLog.create({
        data: {
          entityType: "DebitNote",
          entityId: debitNote.id,
          action: "UPDATED",
          performedBy: userId,
          oldValue,
          newValue: po,
        },
      });

      return po;
    });

    res.json({
      success: true,
      message: "✅ Debit Note updated successfully",
      data: updatedPO,
    });
  } catch (err) {
    console.error("Debit Note Update Error:", err);
    res.status(500).json({
      success: false,
      message: err.message || "Server error while updating Debit Note",
    });
  }
};

const debitNoteReceivingBill = async (req, res) => {
  const userId = req.user?.id;
  let uploadedFilePath = null;

  const deleteUploadedFile = () => {
    if (uploadedFilePath) {
      try {
        fs.unlinkSync(uploadedFilePath);
        console.log("🗑️ Uploaded bill file deleted due to error.");
      } catch (err) {
        console.error("⚠️ File delete failed:", err);
      }
    }
  };

  try {
    // Parse items JSON
    if (req.body.items) {
      try {
        req.body.items = JSON.parse(req.body.items);
      } catch (err) {
        return res
          .status(400)
          .json({ success: false, message: "Invalid JSON format for items." });
      }
    }

    const {
      purchaseOrderId,
      debitNoteId,
      damagedItems,
      warehouseId,
      invoiceNumber,
    } = req.body;
    const billFile = req.files?.billFile?.[0];

    if (
      !purchaseOrderId ||
      !debitNoteId ||
      !Array.isArray(damagedItems) ||
      items.length === 0 ||
      !warehouseId ||
      !billFile
    ) {
      return res.status(400).json({
        success: false,
        message: "warehouseId, items[] and a single bill file are required.",
      });
    }

    uploadedFilePath = path.join(
      __dirname,
      "../../uploads/debitNote/receivingBill",
      billFile.filename
    );

    // let purchaseOrderId = null;
    // let debitNoteId = null;

    const stockUpdates = []; // collect stock updates to perform later

    const receiptResults = await prisma.$transaction(async (tx) => {
      const results = [];

      // Use the first item's damagedStock to get PO & DebitNote
      // const firstDamaged = await tx.damagedStock.findUnique({
      //   where: { id: items[0].damagedStockId },
      // });

      // if (!firstDamaged) throw new Error("Damaged stock not found");
      // purchaseOrderId = firstDamaged.purchaseOrderId;
      // debitNoteId = firstDamaged.debitNoteId;

      // 1️⃣ Create a single bill for the debit note
      await tx.damagedStockBill.create({
        data: {
          debitNoteId,
          fileName: billFile.filename,
          fileUrl: `/uploads/debitNote/receivingBill/${billFile.filename}`,
          mimeType: billFile.mimetype,
          uploadedBy: userId,
          invoiceNumber: invoiceNumber || null,
        },
      });

      // 2️⃣ Process each damaged stock item
      for (const item of damagedItems) {
        const {
          damagedStockId,
          goodQty = 0,
          damagedQty = 0,
          remarks = "",
        } = item;

        const damaged = await tx.damagedStock.findUnique({
          where: { id: damagedStockId },
          include: {
            purchaseOrder: { include: { items: true } },
          },
        });

        if (!damaged) throw new Error("Damaged stock not found");
        if (damaged.status === "Resolved")
          throw new Error("Damaged stock already resolved");

        const remainingQty =
          Number(damaged.quantity) - Number(damaged.receivedQty || 0);
        if (goodQty > remainingQty)
          throw new Error(
            "Total received quantity exceeds pending damaged quantity"
          );

        // Update damaged stock
        const newReceivedQty = Number(damaged.receivedQty || 0) + goodQty;
        const newStatus =
          newReceivedQty >= Number(damaged.quantity) ? "Resolved" : "Pending";

        await tx.damagedStock.update({
          where: { id: damagedStockId },
          data: {
            receivedQty: newReceivedQty,
            status: newStatus,
            remarks,
            updatedBy: userId,
          },
        });

        const poItem = damaged.purchaseOrder.items.find(
          (i) =>
            i.itemId === damaged.itemId && i.itemSource === damaged.itemSource
        );

        if (!poItem) throw new Error("Purchase order item not found");

        const poQty = Number(poItem.quantity);
        const alreadyReceived = Number(poItem.receivedQty || 0);

        // ❗ CRITICAL VALIDATION
        if (alreadyReceived >= poQty) {
          throw new Error(
            `${damaged.itemName} already fully received (${poQty}).`
          );
        }

        if (alreadyReceived + goodQty > poQty) {
          throw new Error(
            `Cannot receive goodQty ${goodQty} for ${damaged.itemName}. 
     Only ${poQty - alreadyReceived} quantity can be received.`
          );
        }

        if (goodQty > 0) {
          await tx.purchaseOrderItem.update({
            where: { id: poItem.id },
            data: { receivedQty: { increment: goodQty } },
          });

          // Collect stock updates for later
          stockUpdates.push({
            itemSource: damaged.itemSource,
            itemId: damaged.itemId,
            qty: goodQty,
            warehouseId,
            unit: damaged.unit?.toLowerCase(),
          });
        }

        results.push({
          damagedStockId,
          itemName: damaged.itemName,
          goodQty,
          damagedQty,
          remainingQty: Number(damaged.quantity) - newReceivedQty,
          status: newStatus,
          debitNoteId,
        });
      }

      // 3️⃣ Auto-close Debit Note & PO if all damages resolved
      const pendingDamageCount = await tx.damagedStock.count({
        where: { purchaseOrderId, status: "Pending" },
      });

      if (pendingDamageCount === 0) {
        await tx.debitNote.updateMany({
          where: { purchaseOrderId, status: "Pending" },
          data: { status: "Received", updatedBy: userId },
        });

        await tx.purchaseOrder.update({
          where: { id: purchaseOrderId },
          data: { status: "Received", updatedBy: userId },
        });
      }

      return results;
    });

    // 4️⃣ Update stock outside transaction
    for (const s of stockUpdates) {
      const { itemSource, itemId, qty, warehouseId, unit } = s;

      if (itemSource === "mongo") {
        const inventoryItem = await InstallationInventory.findOne({
          warehouseId,
          systemItemId: itemId,
        });
        if (inventoryItem) {
          inventoryItem.quantity += qty;
          await inventoryItem.save();
        } else {
          await InstallationInventory.create({
            warehouseId,
            systemItemId: itemId,
            quantity: qty,
          });
        }
      } else if (itemSource === "mysql") {
        const rawMat = await prisma.rawMaterial.findUnique({
          where: { id: itemId },
        });
        if (!rawMat) throw new Error(`RawMaterial ${itemId} not found.`);
        const dbUnit = rawMat.unit?.toLowerCase();
        const convertedQty =
          dbUnit === unit ? qty : convertUnit(qty, unit, dbUnit);
        await prisma.rawMaterial.update({
          where: { id: itemId },
          data: { stock: { increment: convertedQty } },
        });
      }
    }

    return res.status(200).json({
      success: true,
      message:
        "Damaged stock receipt completed with single bill and stock updated",
      data: receiptResults,
    });
  } catch (error) {
    console.error("Damaged receipt error:", error);
    deleteUploadedFile();
    return res.status(400).json({
      success: false,
      message: error.message || "Damaged stock receipt failed",
    });
  }
};

function getFinancialYearRange() {
  const now = getISTDate();

  const year = now.getFullYear();
  const month = now.getMonth(); // April = 3

  const fyStartYear = month < 3 ? year - 1 : year;

  return {
    startFY: new Date(fyStartYear, 3, 1),
    endFY: new Date(fyStartYear + 1, 2, 31, 23, 59, 59, 999),
  };
}

// ----------------------- Date Ranges -----------------------
function getDateRanges() {
  const now = getISTDate();

  const startOfToday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate()
  );
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const day = now.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() + mondayOffset);
  startOfWeek.setHours(0, 0, 0, 0);

  const { startFY, endFY } = getFinancialYearRange();

  return { startOfToday, startOfMonth, startOfWeek, startFY, endFY };
}

const getPODashboard = async (req, res) => {
  try {
    const { startOfToday, startOfMonth, startOfWeek, startFY, endFY } =
      getDateRanges();

    // ------------------------------ FASTEST VERSION ------------------------------
    const [counts, spend] = await Promise.all([
      // Single count query (MySQL evaluates all conditions internally)
      prisma.purchaseOrder.findMany({
        select: { createdAt: true },
      }),

      // Single spend sum query
      prisma.purchaseOrder.findMany({
        select: { createdAt: true, grandTotal: true },
      }),
    ]);

    // -------------------------------- PROCESS DATA --------------------------------
    let poStats = {
      total: 0,
      yearly: 0,
      monthly: 0,
      weekly: 0,
      today: 0,
    };

    let spendStats = {
      total: 0,
      yearly: 0,
      monthly: 0,
      weekly: 0,
      today: 0,
    };

    counts.forEach((po) => {
      const d = po.createdAt;

      poStats.total++;

      if (d >= startFY && d <= endFY) poStats.yearly++;
      if (d >= startOfMonth) poStats.monthly++;
      if (d >= startOfWeek) poStats.weekly++;
      if (d >= startOfToday) poStats.today++;
    });

    spend.forEach((po) => {
      const d = po.createdAt;
      const amount = Number(po.grandTotal);

      spendStats.total += amount;

      if (d >= startFY && d <= endFY) spendStats.yearly += amount;
      if (d >= startOfMonth) spendStats.monthly += amount;
      if (d >= startOfWeek) spendStats.weekly += amount;
      if (d >= startOfToday) spendStats.today += amount;
    });

    // ------------------------------------------------------------------------------
    return res.status(200).json({
      success: true,
      message: "PO dashboard stats fetched successfully",
      data: {
        poStats,
        spendStats,
      },
    });
  } catch (error) {
    console.error("Dashboard Error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Internal Server Error",
    });
  }
};

const getWarehouses = async (req, res) => {
  try {
    const allWarehouses = await Warehouse.find({
      warehouseName: { $nin: ["Sirsa", "Hisar", "Jind", "Fatehabad"] },
    }).select("_id warehouseName");

    if (allWarehouses.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No Warehouses Found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Data Fetched Successfully",
      data: allWarehouses || [],
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message,
    });
  }
};

module.exports = {
  createCompany,
  createVendor,
  updateCompany,
  updateVendor,
  getCompaniesList,
  getVendorsList,
  getItemsList,
  createPurchaseOrder,
  createPurchaseOrder2,
  updatePurchaseOrder,
  updatePurchaseOrder2,
  getPOListByCompany,
  getPurchaseOrderDetails,
  downloadPOPDF,
  downloadPOPDF2,
  sendOrResendPO,
  getCompanyById,
  getVendorById,
  createOrUpdatePurchaseOrderReceipts,
  purchaseOrderReceivingBill,
  getPODashboard,
  getCompaniesData,
  getVendorsData,
  getWarehouses,
  getPurchaseOrderDetailsWithDamagedItems,
  createDebitNote,
  getDebitNoteListByPO,
  downloadDebitNote,
  getDebitNoteDetails,
  updateDebitNote,
  debitNoteReceivingBill,
};

// [{
//   "purchaseOrderId": "4bb311bc-6b45-4472-9707-2384a0529d29",
//   "warehouseId": "67446a8b27dae6f7f4d985dd",
//   "items": [
//     {
//       "purchaseOrderItemId": "311a45de-f462-4736-b336-1bac23fa3c11",
//       "itemId": "a49965aa-9d51-4a23-8e9d-a3112b3274c8",
//       "itemSource": "mysql",
//       "itemName": "10HP Card",
//       "receivedQty": 25,
//       "goodQty": 20,
//       "damagedQty": 5,
//       "remarks": "Received partial batch"
//     },
//     {
//       "purchaseOrderItemId": "d65dbe71-bc00-4015-9d52-d32274135a6c",
//       "itemId": "6866287ced731e67948ad7ed",
//       "itemSource": "mongo",
//       "itemName": "Panel Purlin (HDG) - Small",
//       "receivedQty":25,
//       "goodQty": 25,
//       "damagedQty": 0,
//       "remarks": "Received partial batch"
//     },
//     {
//       "purchaseOrderItemId": "f251047a-8ce5-4007-9d54-e4e2d27b8449",
//       "itemId": "9fcbb066-0795-4d84-8a13-b27fb026a8ec",
//       "itemSource": "mysql",
//       "itemName": "Bowl Bush",
//       "receivedQty": 50,
//       "goodQty": 50,
//       "damagedQty": 0,
//       "remarks": "Received partial batch"
//     }
//   ]
// }]
