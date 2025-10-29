const prisma = require("../../config/prismaClient");
const Decimal = require("decimal.js");
const SystemItem = require("../../models/systemInventoryModels/systemItemSchema");

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
  if (s.includes("Uttarakhand") || s.includes("Haridwar") || s.includes("UK")) return "UK";
  if (s.includes("Gujarat")) return "GJ";
  if (s.includes("Rajasthan")) return "RJ";
  if (s.includes("Delhi")) return "DL";
  return s.substring(0, 2).toUpperCase();
}

async function generatePONumber(company) {
  const fy = getFinancialYear(); // IST safe
  const stateCode = getStateCode(company.state);
  console.log(company.name.substring(0, 4).toUpperCase());
  const prefix = `${company.companyCode || company.name.substring(0, 4).toUpperCase()}${stateCode}`;
  const counterKey = `${company.id}_${fy}`;

  const counter = await prisma.counter.upsert({
    where: { name: counterKey },
    update: { seq: { increment: 1 } },
    create: { name: counterKey, seq: 1 },
  });

  const seq = counter.seq.toString().padStart(4, "0");
  return `${prefix}${fy}${seq}`;
}

const createCompany = async (req, res) => {
  try {
    const {
      name,
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
    if (!name  || !gstNumber || !address || !contactNumber || !email) {
      return res.status(400).json({
        success: false,
        message: 'Company name and createdBy are required.',
      });
    }

    const uppperCaseName = name.toUpperCase().trim();
    const upperCaseGST = gstNumber.toUpperCase().trim();
    const upperCaseAddress = address.toUpperCase().trim();
    const lowerCaseEmail = email.toLowerCase().trim();

    // 🔹 Email format validation
    if (email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(lowerCaseEmail)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid email format.',
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

    const allowedCountries = ['INDIA', 'USA', 'UAE', 'UK', 'CHINA', 'RUSSIA', 'OTHER'];
    const allowedCurrencies = ['INR', 'USD', 'EUR', 'GBP', 'CNY', 'AED', 'OTHER'];

    if (country && !allowedCountries.includes(country)) {
      return res.status(400).json({
        success: false,
        message: `Invalid country. Allowed values: ${allowedCountries.join(', ')}`,
      });
    }

    if (currency && !allowedCurrencies.includes(currency)) {
      return res.status(400).json({
        success: false,
        message: `Invalid currency. Allowed values: ${allowedCurrencies.join(', ')}`,
      });
    }

    const newCompany = await prisma.company.create({
      data: {
        name: uppperCaseName,
        gstNumber: upperCaseGST,
        address: upperCaseAddress,
        city,
        state,
        pincode,
        contactNumber,
        alternateNumber,
        email: lowerCaseEmail,
        country: country || 'INDIA',
        currency: currency || 'INR',
        createdBy,
      },
    });

    return res.status(201).json({
      success: true,
      message: 'Company created successfully.',
      data: newCompany,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Internal Server Error',
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

    if (!name || !gstNumber || !address || !contactNumber || !email || !country || !currency || !pincode) {
      return res.status(400).json({
        success: false,
        message:
          'All fields are required',
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
        message: 'Invalid email format.',
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
    const allowedCountries = ['INDIA', 'USA', 'UAE', 'UK', 'CHINA', 'RUSSIA', 'OTHER'];
    const allowedCurrencies = ['INR', 'USD', 'EUR', 'GBP', 'CNY', 'AED', 'OTHER'];

    if (country && !allowedCountries.includes(country)) {
      return res.status(400).json({
        success: false,
        message: `Invalid country. Allowed values: ${allowedCountries.join(', ')}`,
      });
    }

    if (currency && !allowedCurrencies.includes(currency)) {
      return res.status(400).json({
        success: false,
        message: `Invalid currency. Allowed values: ${allowedCurrencies.join(', ')}`,
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
        country: country || 'INDIA',
        currency: currency || 'INR',
        contactNumber,
        alternateNumber,
        createdBy,
      },
    });

    return res.status(201).json({
      success: true,
      message: 'Vendor created successfully.',
      data: newVendor,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Internal Server Error',
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
        name: 'asc',
      },
    });

    const formattedCompanies = companies.map((company) => ({
      id: company.id,
      displayName: `${company.name}${company.state ? `, ${company.state}` : ''}`,
    }));

    return res.status(200).json({
      success: true,
      message: 'Companies fetched successfully.',
      data: formattedCompanies || [],
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Internal Server Error',
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
        name: 'asc',
      },
    });

    const formattedVendors = vendors.map((vendor) => ({
      id: vendor.id,
      displayName: `${vendor.name}${vendor.country ? `, ${vendor.country}` : ''}`,
    }));

    return res.status(200).json({
      success: true,
      message: 'Vendors fetched successfully.',
      data: formattedVendors || [],
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Internal Server Error',
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

     if(!companyId || !vendorId || !gstType) {
      return res.status(400).json({ success: false, message: "Company, Vendor, GST Type are required"});
    }

    if (!items || items.length === 0) {
      return res.status(400).json({ success: false, message: "No items provided." });
    }

    // 1️⃣ Company fetch
    const company = await prisma.company.findUnique({ where: { id: companyId } });
    if (!company)
      return res.status(404).json({ success: false, message: "Company not found" });

    // 2️⃣ Generate PO number
    const poNumber = await generatePONumber(company);

    // 3️⃣ Prevent duplicates
    const existingPO = await prisma.purchaseOrder.findUnique({ where: { poNumber } });
    if (existingPO)
      return res.status(400).json({
        success: false,
        message: `Purchase Order number ${poNumber} already exists.`,
      });

    // 4️⃣ Totals init
    let subTotal = new Decimal(0);
    let totalCGST = new Decimal(0);
    let totalSGST = new Decimal(0);
    let totalIGST = new Decimal(0);

    // 5️⃣ Split items: normal vs itemwise
    const normalItems = [];
    const itemWiseItems = [];

    for (const item of items) {
      const itemTotal = new Decimal(item.rate).mul(item.quantity);
      subTotal = subTotal.plus(itemTotal);

      const type = item.itemGSTType || gstType;
      if (type.includes("ITEMWISE")) itemWiseItems.push(item);
      else normalItems.push(item);
    }

    // 6️⃣ Handle non-itemwise (group GST based on gstType)
    if (normalItems.length > 0) {
      const normalTotal = normalItems.reduce(
        (acc, i) => acc.plus(new Decimal(i.rate).mul(i.quantity)),
        new Decimal(0)
      );

      switch (gstType) {
        // --- Local GST (split CGST + SGST) ---
        case "LGST_18":
          totalCGST = totalCGST.plus(normalTotal.mul(0.09));
          totalSGST = totalSGST.plus(normalTotal.mul(0.09));
          break;
        case "LGST_5":
          totalCGST = totalCGST.plus(normalTotal.mul(0.025));
          totalSGST = totalSGST.plus(normalTotal.mul(0.025));
          break;
        case "LGST_EXEMPTED":
          // No tax
          break;

        // --- Integrated GST (single slab) ---
        case "IGST_18":
          totalIGST = totalIGST.plus(normalTotal.mul(0.18));
          break;
        case "IGST_5":
          totalIGST = totalIGST.plus(normalTotal.mul(0.05));
          break;
        case "IGST_EXEMPTED":
          // No tax
          break;

        default:
          // itemwise handled separately
          break;
      }
    }

    // 7️⃣ Itemwise GST calculation
    for (const item of itemWiseItems) {
      const itemTotal = new Decimal(item.rate).mul(item.quantity);
      const itemGstRate = new Decimal(item.gstRate || 0);
      const type = item.itemGSTType;

      switch (true) {
        case type === "LGST_ITEMWISE":
          totalCGST = totalCGST.plus(itemTotal.mul(itemGstRate.div(200)));
          totalSGST = totalSGST.plus(itemTotal.mul(itemGstRate.div(200)));
          break;
        case type === "IGST_ITEMWISE":
          totalIGST = totalIGST.plus(itemTotal.mul(itemGstRate.div(100)));
          break;
        case type === "LGST_EXEMPTED" || type === "IGST_EXEMPTED":
          // Exempted items → no GST
          break;
        default:
          break;
      }
    }

    // 8️⃣ Compute totals
    const totalGST = totalCGST.plus(totalSGST).plus(totalIGST);
    const grandTotal = subTotal.plus(totalGST);

    // 9️⃣ Save PO + items atomically
    const newPO = await prisma.$transaction(async (tx) => {
      return await tx.purchaseOrder.create({
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
            create: items.map((item) => ({
              itemId: item.id,
              itemSource: item.source,
              itemName: item.name,
              hsnCode: item.hsnCode || null,
              modelNumber: item.modelNumber || null,
              unit: item.unit || "Nos",
              rate: new Decimal(item.rate),
              gstRate: new Decimal(item.gstRate || 0),
              quantity: new Decimal(item.quantity),
              total: new Decimal(item.rate).mul(item.quantity),
              itemGSTType: item.itemGSTType || gstType,
            })),
          },
        },
        include: { items: true, company: true, vendor: true },
      });
    });

    // ✅ Success response
    res.status(201).json({
      success: true,
      message: "Purchase Order created successfully",
      purchaseOrder: newPO,
    });
  } catch (error) {
    console.error("❌ Error creating PO:", error);
    if (error.code === "P2002" && error.meta?.target?.includes("poNumber")) {
      return res.status(400).json({
        success: false,
        message: "Duplicate PO number detected. Please retry.",
      });
    }

    res.status(500).json({
      success: false,
      message: error.message || "Failed to create purchase order",
    });
  }
};

module.exports = {
    createCompany,
    createVendor,
    getAllCompanies,
    getAllVendors,
    getAllItems,
    createPurchaseOrder
}