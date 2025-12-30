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
const System = require("../../models/systemInventoryModels/systemSchema");
const SystemOrder = require("../../models/systemInventoryModels/systemOrderSchema");
const ItemComponentMap = require("../../models/systemInventoryModels/itemComponentMapSchema");
const SystemItemMap = require("../../models/systemInventoryModels/systemItemMapSchema");
const getDashboardService = require("../../services/systemDashboardService");

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

const STATE_CODE_MAP = {
  "andhra pradesh": "AP",
  "arunachal pradesh": "AR",
  assam: "AS",
  bihar: "BR",
  chhattisgarh: "CG",
  goa: "GA",
  gujarat: "GJ",
  haryana: "HR",
  "himachal pradesh": "HP",
  jharkhand: "JH",
  karnataka: "KA",
  kerala: "KL",
  "madhya pradesh": "MP",
  maharashtra: "MH",
  manipur: "MN",
  meghalaya: "ML",
  mizoram: "MZ",
  nagaland: "NL",
  odisha: "OD",
  punjab: "PB",
  rajasthan: "RJ",
  sikkim: "SK",
  "tamil nadu": "TN",
  telangana: "TS",
  tripura: "TR",
  "uttar pradesh": "UP",
  uttarakhand: "UK",
  "west bengal": "WB",
  "andaman and nicobar islands": "AN",
  chandigarh: "CH",
  "dadra and nagar haveli and daman and diu": "DN",
  delhi: "DL",
  "jammu and kashmir": "JK",
  ladakh: "LA",
  lakshadweep: "LD",
  puducherry: "PY",
};

function getStateCode(stateName) {
  if (!stateName) return "XX";

  const input = stateName.toLowerCase().trim();

  // 🔍 Match full or partial state names
  for (const [state, code] of Object.entries(STATE_CODE_MAP)) {
    if (input.includes(state)) {
      return code;
    }
  }

  // 🧯 fallback (first 2 letters)
  return input.substring(0, 2).toUpperCase();
}

// function getStateCode(stateName) {
//   if (!stateName) return "XX";
//   const s = stateName.toLowerCase();
//   if (s.includes("haryana")) return "HR";
//   if (s.includes("maharashtra")) return "MH";
//   if (s.includes("uttarakhand") || s.includes("haridwar") || s.includes("uk"))
//     return "UK";
//   if (s.includes("gujarat")) return "GJ";
//   if (s.includes("rajasthan")) return "RJ";
//   if (s.includes("delhi")) return "DL";
//   return s.substring(0, 2).toUpperCase();
// }

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
  return `${prefix}-DN-${fy}-${nextSeq}`;
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
      contactPerson,
      contactNumber,
    } = req.body;

    const performedBy = req.user?.id;

    if (
      !name ||
      !gstNumber ||
      !address ||
      !contactPerson ||
      !contactNumber ||
      !email ||
      !country ||
      !currency ||
      !exchangeRate ||
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
          contactPerson,
          contactNumber,
          alternateNumber: null,
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
      contactPerson,
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
      ...(contactPerson && { contactPerson }),
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
        contactPerson: true,
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

// const getItemsList = async (req, res) => {
//   try {
//     const mysqlItems = await prisma.rawMaterial.findMany({
//       where: {
//         isUsed: true,
//       },
//       select: {
//         id: true,
//         name: true,
//       },
//     });

//     const formattedMySQL = mysqlItems.map((item) => ({
//       id: item.id,
//       name: item.name,
//       source: "mysql",
//     }));

//     const mongoItems = await SystemItem.find(
//       { isUsed: true },
//       { itemName: 1 }
//     ).lean();

//     const formattedMongo = mongoItems.map((item) => ({
//       id: item._id.toString(),
//       name: item.itemName,
//       source: "mongo",
//     }));

//     const allItems = [...formattedMySQL, ...formattedMongo];

//     return res.status(200).json({
//       success: true,
//       count: allItems.length,
//       items: allItems || [],
//     });
//   } catch (error) {
//     return res.status(500).json({
//       success: false,
//       message: error.message || "Failed to fetch items",
//     });
//   }
// };

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

    const mongoItems = await SystemItem.find(
      { isUsed: true },
      { itemName: 1 }
    ).lean();

    const formattedMongo = mongoItems.map((item) => ({
      id: item._id.toString(),
      name: item.itemName,
      source: "mongo",
    }));

    // 🔁 MERGE
    const allItems = [...formattedMySQL, ...formattedMongo];

    // 🔤 SORT BY NAME (CASE-INSENSITIVE)
    allItems.sort((a, b) =>
      a.name.localeCompare(b.name, undefined, {
        sensitivity: "base",
      })
    );

    return res.status(200).json({
      success: true,
      count: allItems.length,
      items: allItems,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch items",
    });
  }
};

const getItemDetails = async (req, res) => {
  try {
    const { id } = req.params;

    const mysqlItem = await prisma.rawMaterial.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        unit: true,
        description: true,
      },
    });

    if (mysqlItem) {
      return res.status(200).json({
        success: true,
        source: "mysql",
        item: mysqlItem,
      });
    }

    const mongoItem = await SystemItem.findById(id, {
      itemName: 1,
      unit: 1,
      description: 1,
    }).lean();

    if (mongoItem) {
      return res.status(200).json({
        success: true,
        source: "mongo",
        item: {
          id: mongoItem._id.toString(),
          name: mongoItem.itemName,
          unit: mongoItem.unit || "",
          description: mongoItem.description || "",
        },
      });
    }

    return res.status(404).json({
      success: false,
      message: "Item data not found",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch item details",
    });
  }
};

const getGSTPercent = (type) => {
  if (!type) return new Decimal(0);
  if (type.includes("EXEMPTED")) return new Decimal(0);

  const match = type.match(/_(\d+(\.\d+)?)/);
  return match ? new Decimal(match[1]) : new Decimal(0);
};

function roundGrandTotal(value) {
  const amount = new Decimal(value).toDecimalPlaces(4, Decimal.ROUND_DOWN);
  const integerPart = amount.floor();
  const decimalPart = amount.minus(integerPart);

  if (decimalPart.greaterThanOrEqualTo(new Decimal(0.5))) {
    return integerPart.plus(1).toDecimalPlaces(4, Decimal.ROUND_DOWN);
  }

  return integerPart.toDecimalPlaces(4, Decimal.ROUND_DOWN);
}

const createPurchaseOrder = async (req, res) => {
  try {
    const {
      warehouseId,
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
      currency,
      exchangeRate,
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

    if (!warehouseId || !companyId || !vendorId || !gstType || !items?.length) {
      return res.status(400).json({
        success: false,
        message:
          "Receiving Warheouse, Company, Vendor, GST Type & Items are required",
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
    const finalCurrency = currency || "INR";
    const finalExchangeRate =
      exchangeRate && Number(exchangeRate) > 0
        ? new Decimal(exchangeRate).toDecimalPlaces(4, Decimal.ROUND_DOWN)
        : new Decimal(1);

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
      const qty = new Decimal(item.quantity).toDecimalPlaces(
        4,
        Decimal.ROUND_DOWN
      );
      const rateForeign = new Decimal(item.rate).toDecimalPlaces(
        4,
        Decimal.ROUND_DOWN
      );
      const amountForeign = rateForeign
        .mul(qty)
        .toDecimalPlaces(4, Decimal.ROUND_DOWN);
      const amountINR = amountForeign
        .mul(finalExchangeRate)
        .toDecimalPlaces(4, Decimal.ROUND_DOWN);

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
        otherChargesTotal = otherChargesTotal
          .plus(new Decimal(ch.amount))
          .toDecimalPlaces(4, Decimal.ROUND_DOWN);
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
        totalCGST = totalCGST
          .plus(normalTotalINR.mul(poGSTPercent.div(200)))
          .toDecimalPlaces(4, Decimal.ROUND_DOWN);
        totalSGST = totalSGST
          .plus(normalTotalINR.mul(poGSTPercent.div(200)))
          .toDecimalPlaces(4, Decimal.ROUND_DOWN);
      } else if (gstType.startsWith("IGST")) {
        totalIGST = totalIGST
          .plus(normalTotalINR.mul(poGSTPercent.div(100)))
          .toDecimalPlaces(4, Decimal.ROUND_DOWN);
      }
    }

    // Item-wise GST
    if (isItemWise) {
      for (const item of itemWiseItems) {
        const totalINR = new Decimal(item.rate)
          .mul(item.quantity)
          .mul(finalExchangeRate)
          .toDecimalPlaces(4, Decimal.ROUND_DOWN);
        const rate = new Decimal(item.gstRate).toDecimalPlaces(
          4,
          Decimal.ROUND_DOWN
        );

        if (gstType === "LGST_ITEMWISE") {
          totalCGST = totalCGST
            .plus(totalINR.mul(rate.div(200)))
            .toDecimalPlaces(4, Decimal.ROUND_DOWN);
          totalSGST = totalSGST
            .plus(totalINR.mul(rate.div(200)))
            .toDecimalPlaces(4, Decimal.ROUND_DOWN);
        } else if (gstType === "IGST_ITEMWISE") {
          totalIGST = totalIGST
            .plus(totalINR.mul(rate.div(100)))
            .toDecimalPlaces(4, Decimal.ROUND_DOWN);
        }
      }
    }

    const totalGST = totalCGST
      .plus(totalSGST)
      .plus(totalIGST)
      .toDecimalPlaces(4, Decimal.ROUND_DOWN);
    const rawGrandTotal = subTotalINR.plus(totalGST);
    const grandTotalINR = roundGrandTotal(rawGrandTotal);
    const foreignGrandTotal = foreignSubTotal.toDecimalPlaces(
      4,
      Decimal.ROUND_DOWN
    );

    let warehouseName = null;
    const warehouseData = await Warehouse.findById(warehouseId);
    if (warehouseData) {
      warehouseName = warehouseData?.warehouseName;
    }
    console.log(warehouseName);
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
          warehouseId,
          warehouseName,
          gstType,
          gstRate: poGSTPercent,
          currency: finalCurrency,
          exchangeRate: finalExchangeRate,
          foreignSubTotal: foreignSubTotal.toDecimalPlaces(
            4,
            Decimal.ROUND_DOWN
          ),
          foreignGrandTotal,
          subTotal: subTotalINR.toDecimalPlaces(4, Decimal.ROUND_DOWN),
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
      currency,
      exchangeRate,
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
    const finalCurrency = currency || "INR";
    const finalExchangeRate =
      exchangeRate && Number(exchangeRate) > 0
        ? new Decimal(exchangeRate).toDecimalPlaces(4, Decimal.ROUND_DOWN)
        : new Decimal(1);

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
      const qty = new Decimal(item.quantity).toDecimalPlaces(
        4,
        Decimal.ROUND_DOWN
      );
      const rateForeign = new Decimal(item.rate).toDecimalPlaces(
        4,
        Decimal.ROUND_DOWN
      );
      const amountForeign = rateForeign
        .mul(qty)
        .toDecimalPlaces(4, Decimal.ROUND_DOWN);
      const amountINR = amountForeign
        .mul(finalExchangeRate)
        .toDecimalPlaces(4, Decimal.ROUND_DOWN);

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
        otherChargesTotal = otherChargesTotal
          .plus(new Decimal(ch.amount))
          .toDecimalPlaces(4, Decimal.ROUND_DOWN);
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
        totalCGST = totalCGST
          .plus(normalTotalINR.mul(poGSTPercent.div(200)))
          .toDecimalPlaces(4, Decimal.ROUND_DOWN);
        totalSGST = totalSGST
          .plus(normalTotalINR.mul(poGSTPercent.div(200)))
          .toDecimalPlaces(4, Decimal.ROUND_DOWN);
      } else if (gstType.startsWith("IGST")) {
        totalIGST = totalIGST
          .plus(normalTotalINR.mul(poGSTPercent.div(100)))
          .toDecimalPlaces(4, Decimal.ROUND_DOWN);
      }
    }

    // Item-wise GST
    if (isItemWise) {
      for (const item of itemWiseItems) {
        const totalINR = new Decimal(item.rate)
          .mul(item.quantity)
          .mul(finalExchangeRate)
          .toDecimalPlaces(4, Decimal.ROUND_DOWN);
        const rate = new Decimal(item.gstRate).toDecimalPlaces(
          4,
          Decimal.ROUND_DOWN
        );

        if (gstType === "LGST_ITEMWISE") {
          totalCGST = totalCGST
            .plus(totalINR.mul(rate.div(200)))
            .toDecimalPlaces(4, Decimal.ROUND_DOWN);
          totalSGST = totalSGST
            .plus(totalINR.mul(rate.div(200)))
            .toDecimalPlaces(4, Decimal.ROUND_DOWN);
        } else if (gstType === "IGST_ITEMWISE") {
          totalIGST = totalIGST
            .plus(totalINR.mul(rate.div(100)))
            .toDecimalPlaces(4, Decimal.ROUND_DOWN);
        }
      }
    }

    const totalGST = totalCGST
      .plus(totalSGST)
      .plus(totalIGST)
      .toDecimalPlaces(4, Decimal.ROUND_DOWN);
    const rawGrandTotal = subTotalINR.plus(totalGST);
    const grandTotalINR = roundGrandTotal(rawGrandTotal);
    const foreignGrandTotal = foreignSubTotal.toDecimalPlaces(
      4,
      Decimal.ROUND_DOWN
    );

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
          currency: finalCurrency,
          exchangeRate: finalExchangeRate,
          foreignSubTotal: foreignSubTotal.toDecimalPlaces(
            4,
            Decimal.ROUND_DOWN
          ),
          foreignGrandTotal,
          subTotal: subTotalINR.toDecimalPlaces(4, Decimal.ROUND_DOWN),
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
      warehouseId,
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
      currency,
      exchangeRate,
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
    let normalizedOtherCharges = [];
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

    const finalCurrency = currency || "INR";
    const finalExchangeRate =
      finalCurrency === "INR"
        ? new Decimal(1)
        : new Decimal(exchangeRate || 1).toDecimalPlaces(4, Decimal.ROUND_DOWN);

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
      const qty = new Decimal(item.quantity).toDecimalPlaces(
        4,
        Decimal.ROUND_DOWN
      );
      const rateForeign = new Decimal(item.rate).toDecimalPlaces(
        4,
        Decimal.ROUND_DOWN
      );
      const amountForeign = rateForeign
        .mul(qty)
        .toDecimalPlaces(4, Decimal.ROUND_DOWN);
      const amountINR = amountForeign
        .mul(finalExchangeRate)
        .toDecimalPlaces(4, Decimal.ROUND_DOWN);

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
        itemGSTRate = new Decimal(item.gstRate).toDecimalPlaces(
          4,
          Decimal.ROUND_DOWN
        );
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
        otherChargesTotal = otherChargesTotal
          .plus(new Decimal(amt))
          .toDecimalPlaces(4, Decimal.ROUND_DOWN);
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
        totalCGST = totalCGST
          .plus(normalTotalINR.mul(new Decimal(poGSTPercent).div(200)))
          .toDecimalPlaces(4, Decimal.ROUND_DOWN);
        totalSGST = totalSGST
          .plus(normalTotalINR.mul(new Decimal(poGSTPercent).div(200)))
          .toDecimalPlaces(4, Decimal.ROUND_DOWN);
      } else if (gstType.startsWith("IGST")) {
        totalIGST = totalIGST
          .plus(normalTotalINR.mul(new Decimal(poGSTPercent).div(100)))
          .toDecimalPlaces(4, Decimal.ROUND_DOWN);
      }
    }

    // GST FOR ITEMWISE
    if (isItemWise) {
      for (const item of itemWiseItems) {
        const totalINR = new Decimal(item.rate)
          .mul(item.quantity)
          .mul(finalExchangeRate)
          .toDecimalPlaces(4, Decimal.ROUND_DOWN);
        const rate = new Decimal(item.gstRate).toDecimalPlaces(
          4,
          Decimal.ROUND_DOWN
        );

        if (gstType === "LGST_ITEMWISE") {
          totalCGST = totalCGST
            .plus(totalINR.mul(rate.div(200)))
            .toDecimalPlaces(4, Decimal.ROUND_DOWN);
          totalSGST = totalSGST
            .plus(totalINR.mul(rate.div(200)))
            .toDecimalPlaces(4, Decimal.ROUND_DOWN);
        } else if (gstType === "IGST_ITEMWISE") {
          totalIGST = totalIGST
            .plus(totalINR.mul(rate.div(100)))
            .toDecimalPlaces(4, Decimal.ROUND_DOWN);
        }
      }
    }

    const totalGST = totalCGST
      .plus(totalSGST)
      .plus(totalIGST)
      .toDecimalPlaces(4, Decimal.ROUND_DOWN);
    const rawGrandTotalINR = subTotalINR
      .plus(totalGST)
      .toDecimalPlaces(4, Decimal.ROUND_DOWN);
    const grandTotalINR = roundGrandTotal(rawGrandTotalINR);
    const foreignGrandTotal = foreignSubTotal.toDecimalPlaces(
      4,
      Decimal.ROUND_DOWN
    );

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
          foreignSubTotal: foreignSubTotal.toDecimalPlaces(
            4,
            Decimal.ROUND_DOWN
          ),
          foreignGrandTotal,
          subTotal: subTotalINR.toDecimalPlaces(4, Decimal.ROUND_DOWN),
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
          otherCharges: normalizedOtherCharges,
          warehouseId: warehouseId || existingPO.warehouseId,
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
      currency,
      exchangeRate,
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
    let normalizedOtherCharges = [];
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

    const finalCurrency = currency || "INR";
    const finalExchangeRate =
      finalCurrency === "INR"
        ? new Decimal(1)
        : new Decimal(exchangeRate || 1).toDecimalPlaces(4, Decimal.ROUND_DOWN);

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
      const qty = new Decimal(item.quantity).toDecimalPlaces(
        4,
        Decimal.ROUND_DOWN
      );
      const rateForeign = new Decimal(item.rate).toDecimalPlaces(
        4,
        Decimal.ROUND_DOWN
      );
      const amountForeign = rateForeign
        .mul(qty)
        .toDecimalPlaces(4, Decimal.ROUND_DOWN);
      const amountINR = amountForeign
        .mul(finalExchangeRate)
        .toDecimalPlaces(4, Decimal.ROUND_DOWN);

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
        itemGSTRate = new Decimal(item.gstRate).toDecimalPlaces(
          4,
          Decimal.ROUND_DOWN
        );
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
        otherChargesTotal = otherChargesTotal
          .plus(new Decimal(amt))
          .toDecimalPlaces(4, Decimal.ROUND_DOWN);
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
        totalCGST = totalCGST
          .plus(normalTotalINR.mul(new Decimal(poGSTPercent).div(200)))
          .toDecimalPlaces(4, Decimal.ROUND_DOWN);
        totalSGST = totalSGST
          .plus(normalTotalINR.mul(new Decimal(poGSTPercent).div(200)))
          .toDecimalPlaces(4, Decimal.ROUND_DOWN);
      } else if (gstType.startsWith("IGST")) {
        totalIGST = totalIGST
          .plus(normalTotalINR.mul(new Decimal(poGSTPercent).div(100)))
          .toDecimalPlaces(4, Decimal.ROUND_DOWN);
      }
    }

    // GST FOR ITEMWISE
    if (isItemWise) {
      for (const item of itemWiseItems) {
        const totalINR = new Decimal(item.rate)
          .mul(item.quantity)
          .mul(finalExchangeRate)
          .toDecimalPlaces(4, Decimal.ROUND_DOWN);
        const rate = new Decimal(item.gstRate).toDecimalPlaces(
          4,
          Decimal.ROUND_DOWN
        );

        if (gstType === "LGST_ITEMWISE") {
          totalCGST = totalCGST
            .plus(totalINR.mul(rate.div(200)))
            .toDecimalPlaces(4, Decimal.ROUND_DOWN);
          totalSGST = totalSGST
            .plus(totalINR.mul(rate.div(200)))
            .toDecimalPlaces(4, Decimal.ROUND_DOWN);
        } else if (gstType === "IGST_ITEMWISE") {
          totalIGST = totalIGST
            .plus(totalINR.mul(rate.div(100)))
            .toDecimalPlaces(4, Decimal.ROUND_DOWN);
        }
      }
    }

    const totalGST = totalCGST
      .plus(totalSGST)
      .plus(totalIGST)
      .toDecimalPlaces(4, Decimal.ROUND_DOWN);
    const rawGrandTotalINR = subTotalINR
      .plus(totalGST)
      .toDecimalPlaces(4, Decimal.ROUND_DOWN);
    const grandTotalINR = roundGrandTotal(rawGrandTotalINR);
    const foreignGrandTotal = foreignSubTotal.toDecimalPlaces(
      4,
      Decimal.ROUND_DOWN
    );

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
          foreignSubTotal: foreignSubTotal.toDecimalPlaces(
            4,
            Decimal.ROUND_DOWN
          ),
          foreignGrandTotal,
          subTotal: subTotalINR.toDecimalPlaces(4, Decimal.ROUND_DOWN),
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
        companyId: true,
        companyName: true,
        vendorId: true,
        vendorName: true,
        warehouseId: true,
        poDate: true,
        gstType: true,
        gstRate: true,
        currency: true,
        exchangeRate: true,
        foreignSubTotal: true,
        foreignGrandTotal: true,
        subTotal: true,
        grandTotal: true,
        status: true,
        remarks: true,
        paymentTerms: true,
        deliveryTerms: true,
        contactPerson: true,
        cellNo: true,
        warranty: true,
        createdAt: true,
        otherCharges: true,
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
            total: true,
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

    let warehouseName = null;
    if (po.warehouseId) {
      const warehouse = await Warehouse.findById(po.warehouseId).select(
        "warehouseName"
      );
      warehouseName = warehouse?.warehouseName || null;
    }

    return res.json({
      success: true,
      message: "PO details fetched successfully",
      data: {
        ...po,
        warehouseName,
      },
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

    const pdfBuffer = await generatePO(po, items);

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

    const pdfBuffer = await generatePO(po, items);

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

const cancelPurchaseOrder = async (req, res) => {
  try {
    const { poId } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized: user not logged in",
      });
    }

    if (!poId) {
      return res.status(400).json({
        success: false,
        message: "poId is required.",
      });
    }

    const userData = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        role: {
          select: { name: true },
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
      return res.status(403).json({
        success: false,
        message:
          "Only purchase department are allowed to cancel purchase orders.",
      });
    }

    const existingPO = await prisma.purchaseOrder.findUnique({
      where: { id: poId },
    });

    if (!existingPO) {
      return res.status(404).json({
        success: false,
        message: "Purchase order not found.",
      });
    }
    if (
      existingPO.status === "Received" ||
      existingPO.status === "PartiallyReceived"
    ) {
      return res.status(400).json({
        success: false,
        message: `Purchase order status - ${existingPO.status}. Cannot be cancelled`,
      });
    }

    if (existingPO.status === "Cancelled") {
      return res.status(400).json({
        success: false,
        message: "Purchase order is already cancelled.",
      });
    }

    // 🔥 Transaction: Cancel PO + Create Audit Log
    const [updatedPO] = await prisma.$transaction([
      prisma.purchaseOrder.update({
        where: { id: poId },
        data: {
          status: "Cancelled",
        },
      }),

      prisma.auditLog.create({
        data: {
          entityType: "PurchaseOrder",
          entityId: poId,
          action: "CANCELLED",
          performedBy: userId,
          oldValue: {
            status: existingPO.status,
          },
          newValue: {
            status: "Cancelled",
          },
        },
      }),
    ]);

    return res.status(200).json({
      success: true,
      message: "✅ Purchase order cancelled successfully.",
      data: updatedPO,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Error while cancelling purchase order.",
    });
  }
};

//------------Debit Note Section ---------------//
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

//Work to do on debit note update
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

const addTermCondition = async (req, res) => {
  try {
    const { term } = req.body;
    const userId = req.user?.id;

    if (!term || !term.trim()) {
      return res.status(400).json({
        success: false,
        message: "Term is required",
      });
    }

    const newTerm = await prisma.terms_Conditions.create({
      data: {
        term: term.trim(),
        createdBy: userId,
      },
    });

    return res.status(201).json({
      success: true,
      message: "Term added successfully",
      data: newTerm,
    });
  } catch (error) {
    console.error("Add Term Error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

const toggleTermConditionStatus = async (req, res) => {
  try {
    const { id, isActive } = req.query;
    const userId = req.user?.id;

    if (!id || typeof isActive === "undefined") {
      return res.status(400).json({
        success: false,
        message: "Term ID and isActive flag are required",
      });
    }

    const isActiveBoolean = isActive === "true";

    const existingTerm = await prisma.terms_Conditions.findUnique({
      where: { id },
    });

    if (!existingTerm) {
      return res.status(404).json({
        success: false,
        message: "Term not found",
      });
    }

    if (existingTerm.isActive === isActiveBoolean) {
      return res.status(400).json({
        success: false,
        message: `Term is already ${isActiveBoolean ? "Active" : "Inactive"}`,
      });
    }

    const updatedTerm = await prisma.terms_Conditions.update({
      where: { id },
      data: {
        isActive: isActiveBoolean,
        updatedBy: userId,
      },
    });

    return res.status(200).json({
      success: true,
      message: `Term ${
        isActiveBoolean ? "Activated" : "Deactivated"
      } successfully`,
      data: updatedTerm,
    });
  } catch (error) {
    console.error("Toggle Term Status Error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

const getAllTerms = async (req, res) => {
  try {
    const terms = await prisma.terms_Conditions.findMany({
      orderBy: {
        createdAt: "asc",
      },
      select: {
        id: true,
        term: true,
        isActive: true,
      },
    });

    return res.status(200).json({
      success: true,
      count: terms.length,
      data: terms,
    });
  } catch (error) {
    console.error("Error fetching all terms:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

const getActiveTerms = async (req, res) => {
  try {
    const terms = await prisma.terms_Conditions.findMany({
      where: {
        isActive: true,
      },
      orderBy: {
        createdAt: "asc",
      },
      select: {
        id: true,
        term: true,
      },
    });

    return res.status(200).json({
      success: true,
      count: terms.length,
      data: terms,
    });
  } catch (error) {
    console.error("Error fetching terms:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

// Helper to extract pump head from itemName
// function getPumpHead(itemName) {
//   if (!itemName) return null;
//   const match = itemName.trim().match(/(\d+\.?\d*)\s*M$/i);
//   if (match) return match[0].toUpperCase().replace(/\s+/g, "");
//   return null;
// }
const getPumpHead = (itemName = "") => {
  const heads = ["30M", "50M", "70M", "100M"];
  return heads.find((h) => itemName.includes(h)) || null;
};

const buildItemResponse = ({
  item,
  requiredPerSystem,
  systemOrder,
  availableStock,
}) => {
  const requiredForOrder = requiredPerSystem * systemOrder;

  return {
    id: item?._id || null,
    itemName: item?.itemName || "Unknown Item",
    unit: item?.unit || "-",
    requiredPerSystem,
    requiredForOrder,
    availableStock,
    shortageStock: Math.max(0, requiredForOrder - availableStock),
  };
};

const calculateDispatchableSystems = (items = []) => {
  let minSystems = Infinity;

  for (const item of items) {
    if (item.requiredPerSystem > 0) {
      const possible = Math.floor(item.availableStock / item.requiredPerSystem);
      minSystems = Math.min(minSystems, possible);
    }
  }

  return minSystems === Infinity ? 0 : minSystems;
};

const showItemsWithStockStatus = async (req, res) => {
  try {
    const { warehouseId, systemId } = req.params;
    if (!warehouseId || !systemId) {
      return res.status(400).json({
        success: false,
        message: "warehouseId & systemId is required",
      });
    }

    // Step 1: Fetch all system items
    const systemItems = await SystemItemMap.find({ systemId })
      .populate({ path: "systemItemId", select: "_id itemName" })
      .select("systemItemId quantity")
      .lean();

    // Extract pumpHead from itemName
    systemItems.forEach((item) => {
      item.systemItemId.pumpHead = getPumpHead(item.systemItemId.itemName);
    });

    const pumps = systemItems.filter((i) => i.systemItemId.pumpHead);
    const commonItems = systemItems.filter((i) => !i.systemItemId.pumpHead);

    // Step 2: Fetch all sub-items
    const subItems = await ItemComponentMap.find({ systemId })
      .populate({ path: "subItemId", select: "_id itemName" })
      .select("systemItemId subItemId quantity")
      .lean();

    // Step 3: Fetch inventory for all items
    const allItemIds = [
      ...systemItems.map((i) => i.systemItemId._id.toString()),
      ...subItems.map((i) => i.subItemId._id.toString()),
    ];

    const inventoryItems = await InstallationInventory.find({
      warehouseId,
      systemItemId: { $in: allItemIds },
    })
      .populate({ path: "systemItemId", select: "_id itemName" })
      .select("systemItemId quantity")
      .lean();

    const inventoryMap = new Map();
    inventoryItems.forEach((item) => {
      const id = item.systemItemId._id.toString();
      inventoryMap.set(id, {
        systemItemId: item.systemItemId,
        quantity: item.quantity,
      });
    });

    // -------------------------------
    // Step 4: Calculate overall stock (global)
    // -------------------------------
    let overallRequiredQtyMap = new Map();
    let overallItemIds = new Set();

    systemItems.forEach(({ systemItemId, quantity }) => {
      const id = systemItemId._id.toString();
      overallRequiredQtyMap.set(id, quantity);
      overallItemIds.add(id);
    });

    subItems.forEach(({ subItemId, quantity }) => {
      const id = subItemId._id.toString();
      overallRequiredQtyMap.set(
        id,
        (overallRequiredQtyMap.get(id) || 0) + quantity
      );
      overallItemIds.add(id);
    });

    const overallItemIdsArray = Array.from(overallItemIds);
    let overallMinDispatchableSystems = Infinity;
    const overallStockStatus = [];

    for (const id of overallItemIdsArray) {
      const requiredPerSystem = overallRequiredQtyMap.get(id);
      const availableQty = inventoryMap.get(id)?.quantity || 0;
      const possibleSystems =
        requiredPerSystem > 0
          ? Math.floor(availableQty / requiredPerSystem)
          : Infinity;

      if (possibleSystems < overallMinDispatchableSystems)
        overallMinDispatchableSystems = possibleSystems;

      overallStockStatus.push({
        systemItemId: inventoryMap.get(id)?.systemItemId || {
          _id: id,
          itemName: "Unknown Item",
        },
        quantity: availableQty,
        requiredQuantity: requiredPerSystem,
        stockLow: availableQty < requiredPerSystem,
        materialShort: Math.max(0, requiredPerSystem - availableQty),
      });
    }

    if (overallMinDispatchableSystems === Infinity)
      overallMinDispatchableSystems = 0;

    // Sort overall stock by quantity ascending
    overallStockStatus.sort((a, b) => a.quantity - b.quantity);

    // -------------------------------
    // Step 5: Group by pump head
    // -------------------------------
    const uniquePumpHeads = [
      ...new Set(pumps.map((p) => p.systemItemId.pumpHead)),
    ];
    const pumpDispatchData = [];
    let totalDispatchableSystems = 0;

    for (const pumpHead of uniquePumpHeads) {
      const pumpsForHead = pumps.filter(
        (p) => p.systemItemId.pumpHead === pumpHead
      );

      let requiredQtyMap = new Map();
      let itemIdSet = new Set();

      pumpsForHead.forEach(({ systemItemId, quantity }) => {
        const id = systemItemId._id.toString();
        requiredQtyMap.set(id, quantity);
        itemIdSet.add(id);
      });

      const relevantSubItems = subItems.filter((sub) =>
        pumpsForHead.some(
          (p) => p.systemItemId._id.toString() === sub.systemItemId.toString()
        )
      );

      relevantSubItems.forEach(({ subItemId, quantity }) => {
        const id = subItemId._id.toString();
        requiredQtyMap.set(id, (requiredQtyMap.get(id) || 0) + quantity);
        itemIdSet.add(id);
      });

      commonItems.forEach(({ systemItemId, quantity }) => {
        const id = systemItemId._id.toString();
        requiredQtyMap.set(id, (requiredQtyMap.get(id) || 0) + quantity);
        itemIdSet.add(id);
      });

      const itemIds = Array.from(itemIdSet);
      let minDispatchableSystems = Infinity;
      const stockStatus = [];

      for (const id of itemIds) {
        const requiredPerSystem = requiredQtyMap.get(id);
        const availableQty = inventoryMap.get(id)?.quantity || 0;
        const possibleSystems =
          requiredPerSystem > 0
            ? Math.floor(availableQty / requiredPerSystem)
            : Infinity;

        if (possibleSystems < minDispatchableSystems)
          minDispatchableSystems = possibleSystems;

        stockStatus.push({
          systemItemId: inventoryMap.get(id)?.systemItemId || {
            _id: id,
            itemName: "Unknown Item",
          },
          quantity: availableQty,
          requiredQuantity: requiredPerSystem,
          stockLow: availableQty < requiredPerSystem,
          materialShort: Math.max(0, requiredPerSystem - availableQty),
        });
      }

      if (minDispatchableSystems === Infinity) minDispatchableSystems = 0;
      totalDispatchableSystems += minDispatchableSystems;

      // Sort pump head stock by quantity ascending
      stockStatus.sort((a, b) => a.quantity - b.quantity);

      pumpDispatchData.push({
        pumpHead,
        dispatchableSystems: minDispatchableSystems,
        stockStatus,
      });
      pumpDispatchData.sort((a, b) => {
        const numA = parseFloat(a.pumpHead.replace("M", ""));
        const numB = parseFloat(b.pumpHead.replace("M", ""));
        return numA - numB;
      });
    }

    return res.status(200).json({
      success: true,
      message: "Inventory fetched with overall and pump-head grouped stock",
      data: overallStockStatus,
      pumpHeadData: pumpDispatchData,
      totalDispatchableSystems,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message,
    });
  }
};

// const getSystemDashboardData = async (req, res) => {
//   try {
//     const { systemId, warehouseId } = req.params;

//     if (!systemId || !warehouseId) {
//       return res.status(400).json({
//         success: false,
//         message: "systemId and warehouseId are required",
//       });
//     }

//     const warehouseData = await Warehouse.findById(warehouseId);
//     if(!warehouseData) {
//       return res.status(404).json({
//         success: false,
//         message: `Warehouse not found`
//       });
//     }

//     const systemData = await System.findById(systemId);
//     if(!systemData) {
//       return res.status(404).json({
//         success: false,
//         message: `System not found`
//       });
//     }

//     /* =====================================================
//        STEP 1: SYSTEM ORDERS (HEAD-WISE DESIRED)
//     ===================================================== */
//     const systemOrders = await SystemOrder.find({ systemId }).lean();

//     const headWiseOrders = {};
//     let totalDesired = 0;

//     systemOrders.forEach((order) => {
//       if (!order.pumpHead) return;

//       const remainingOrder = Math.max(
//         order.totalOrder - order.dispatchedOrder,
//         0
//       );

//       headWiseOrders[order.pumpHead] = {
//         pumpId: order.pumpId,
//         totalOrder: order.totalOrder,
//         dispatchedOrder: order.dispatchedOrder,
//         remainingOrder,
//       };

//       totalDesired += remainingOrder;
//     });

//     /* =====================================================
//        STEP 2: SYSTEM ITEMS (COMMON + PUMPS)
//     ===================================================== */
//     const systemItems = await SystemItemMap.find({ systemId })
//       .populate("systemItemId", "itemName")
//       .lean();

//     const commonItems = [];
//     const pumpItems = [];

//     systemItems.forEach((item) => {
//       if (!item.systemItemId) return; // 🔒 NULL SAFE

//       const pumpHead = getPumpHead(item.systemItemId.itemName);

//       if (pumpHead) {
//         pumpItems.push({ ...item, pumpHead });
//       } else {
//         commonItems.push(item);
//       }
//     });

//     /* =====================================================
//        STEP 3: ITEM COMPONENT MAP (SUB-ITEMS)
//     ===================================================== */
//     const itemComponentsRaw = await ItemComponentMap.find({ systemId })
//       .populate("subItemId", "itemName")
//       .lean();

//     // filter broken refs
//     const itemComponents = itemComponentsRaw.filter(
//       (c) => c.systemItemId && c.subItemId
//     );

//     /* =====================================================
//        STEP 4: INVENTORY (WAREHOUSE)
//     ===================================================== */
//     const inventoryItems = await InstallationInventory.find({ warehouseId })
//       .populate("systemItemId", "itemName")
//       .lean();

//     const inventoryMap = new Map();

//     inventoryItems.forEach((item) => {
//       if (!item.systemItemId) return; // 🔒 NULL SAFE

//       inventoryMap.set(item.systemItemId._id.toString(), item.quantity);
//     });

//     /* =====================================================
//        STEP 5: COMMON ITEMS
//     ===================================================== */
//     const commonItemsResponse = commonItems.map((item) => {
//       const itemId = item.systemItemId?._id?.toString();
//       const stockQty = itemId ? inventoryMap.get(itemId) || 0 : 0;

//       const requiredQty = item.quantity * totalDesired;

//       return {
//         itemId: item.systemItemId._id,
//         itemName: item.systemItemId.itemName,
//         bomQty: item.quantity,
//         requiredQty,
//         stockQty,
//         shortageQty: Math.max(requiredQty - stockQty, 0),
//       };
//     });

//     /* =====================================================
//        STEP 6: COMMON POSSIBLE
//     ===================================================== */
//     const commonPossible = commonItemsResponse.length
//       ? Math.min(
//           ...commonItemsResponse.map((i) =>
//             i.bomQty > 0 ? Math.floor(i.stockQty / i.bomQty) : Infinity
//           )
//         )
//       : 0;

//     /* =====================================================
//        STEP 7: VARIABLE ITEMS (HEAD-WISE)
//     ===================================================== */
//     const variableItemsResponse = [];

//     for (const pumpHead of Object.keys(headWiseOrders)) {
//       const desiredSystems = headWiseOrders[pumpHead].remainingOrder;

//       const pumpsForHead = pumpItems.filter((p) => p.pumpHead === pumpHead);

//       const items = [];

//       /* ---------- Pump item ---------- */
//       pumpsForHead.forEach((pump) => {
//         const pumpItemId = pump.systemItemId?._id?.toString();
//         const stockQty = pumpItemId ? inventoryMap.get(pumpItemId) || 0 : 0;

//         const requiredQty = pump.quantity * desiredSystems;

//         items.push({
//           itemId: pump.systemItemId._id,
//           itemName: pump.systemItemId.itemName,
//           bomQty: pump.quantity,
//           requiredQty,
//           stockQty,
//           shortageQty: Math.max(requiredQty - stockQty, 0),
//         });
//       });

//       /* ---------- Sub-items ---------- */
//       itemComponents
//         .filter((comp) =>
//           pumpsForHead.some(
//             (p) =>
//               p.systemItemId._id.toString() === comp.systemItemId.toString()
//           )
//         )
//         .forEach((comp) => {
//           const subItemId = comp.subItemId?._id?.toString();
//           const stockQty = subItemId ? inventoryMap.get(subItemId) || 0 : 0;

//           const requiredQty = comp.quantity * desiredSystems;

//           items.push({
//             itemId: comp.subItemId._id,
//             itemName: comp.subItemId.itemName,
//             bomQty: comp.quantity,
//             requiredQty,
//             stockQty,
//             shortageQty: Math.max(requiredQty - stockQty, 0),
//           });
//         });

//       /* ---------- VARIABLE POSSIBLE ---------- */
//       const variablePossible = items.length
//         ? Math.min(
//             ...items.map((i) =>
//               i.bomQty > 0 ? Math.floor(i.stockQty / i.bomQty) : Infinity
//             )
//           )
//         : 0;

//       /* ---------- FINAL POSSIBLE ---------- */
//       const possibleSystems = Math.min(commonPossible, variablePossible);

//       variableItemsResponse.push({
//         pumpHead,
//         desiredSystems,
//         possibleSystems,
//         items,
//       });
//     }

//     // Build headWiseSystem summary with possibleSystems
//     const headWiseSystemSummary = {};
//     variableItemsResponse.forEach((v) => {
//       headWiseSystemSummary[v.pumpHead] = {
//         desiredSystem: v.desiredSystems,
//         possibleSystem: v.possibleSystems,
//       };
//     });

//     return res.status(200).json({
//       success: true,
//       data: {
//         warehouse: warehouseData.warehouseName,
//         system: systemData.systemName,
//         summary: {
//           motorCommonSystem: {
//             totalDesired,
//             possibleSystem: commonPossible,
//           },
//           headWiseSystem: headWiseSystemSummary,
//         },
//         commonItems: commonItemsResponse,
//         variableItems: variableItemsResponse,
//       },
//     });
//   } catch (error) {
//     console.error("Dashboard Controller Error:", error);
//     return res.status(500).json({
//       success: false,
//       message: "Internal Server Error",
//       error: error.message,
//     });
//   }
// };

const getSystemDashboardData = async (req, res) => {
  try {
    const data = await getDashboardService(
      req.params.systemId,
      req.params.warehouseId
    );

    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
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
  getItemDetails,
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
  getPODashboard,
  getCompaniesData,
  getVendorsData,
  getWarehouses,
  cancelPurchaseOrder,
  getPurchaseOrderDetailsWithDamagedItems,
  createDebitNote,
  getDebitNoteListByPO,
  downloadDebitNote,
  getDebitNoteDetails,
  updateDebitNote,
  debitNoteReceivingBill,
  addTermCondition,
  toggleTermConditionStatus,
  getAllTerms,
  getActiveTerms,
  showItemsWithStockStatus,
  getSystemDashboardData,
};

// "data": {
//       "summary": {
//           "totalDesired": 375,
//           "commonPossible": 33,
//           "headWiseDesired": {
//               "30M": 250,
//               "50M": 50,
//               "70M": 75
//           }
//       },

//       "summary": {
//         "motorCommonSystem" : {
//           "totalDesired": 375,
//           "possibleSystem": 33
//         },
//         "headWiseSystem": {
//           "30M": {
//             "desiredSystem": 250,
//             "possibleSystem": xyz,
//           },
//           "50M": {
//             "desiredSystem": 50,
//             "possibleSystem": xyz,
//           },
//           "70M": {
//             "desiredSystem": 75,
//             "possibleSystem": xyz,
//           }
//         }
//       }
