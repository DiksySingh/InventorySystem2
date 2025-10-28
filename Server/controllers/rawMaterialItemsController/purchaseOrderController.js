const prisma = require("../../config/prismaClient");
const SystemItem = require("../../models/systemInventoryModels/systemItemSchema");

function getFinancialYear(date = new Date()) {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const startYear = month >= 4 ? year : year - 1;
  const endYear = startYear + 1;
  return `${startYear.toString().slice(-2)}${endYear.toString().slice(-2)}`;
}

function getStateCode(stateName) {
  if (!stateName) return "XX";
  const state = stateName.toLowerCase();
  if (state.includes("haryana")) return "HR";
  if (state.includes("maharashtra")) return "MH";
  if (state.includes("uttarakhand") || state.includes("haridwar") || state.includes("uk")) return "UK";
  return state.substring(0, 2).toUpperCase();
}

async function generatePONumber(company) {
  const fy = getFinancialYear();
  const stateCode = getStateCode(company.state);
  const prefix = `${company.companyCode || "GEPL"}${stateCode}`;
  const counterKey = `${company.id}_${fy}`;

  const counter = await prisma.counter.upsert({
    where: { name: counterKey },
    update: { seq: { increment: 1 } },
    create: { name: counterKey, seq: 1 },
  });

  const nextSeq = counter.seq.toString().padStart(4, "0");
  return `${prefix}${fy}${nextSeq}`;
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

module.exports = {
    createCompany,
    createVendor,
    getAllCompanies,
    getAllVendors,
    getAllItems
}