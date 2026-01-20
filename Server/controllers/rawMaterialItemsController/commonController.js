const prisma = require("../../config/prismaClient");
const xlsx = require("xlsx");
const ExcelJS = require("exceljs");
const multer = require("multer");
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });
const WarehouseItems = require("../../models/serviceInventoryModels/warehouseItemsSchema");
const Warehouse = require("../../models/serviceInventoryModels/warehouseSchema");
const System = require("../../models/systemInventoryModels/systemSchema");
const SystemItem = require("../../models/systemInventoryModels/systemItemSchema");
const SystemOrder = require("../../models/systemInventoryModels/systemOrderSchema");
const InstallationInventory = require("../../models/systemInventoryModels/installationInventorySchema");
const getDashboardService = require("../../services/systemDashboardService");
const sendMail = require("../../util/mail/sendMail");
const countries = require("../../data/countries.json");

const addRole = async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) {
      return res.status(400).json({
        success: false,
        message: "Role Name Is Required",
      });
    }

    const existingRole = await prisma.role.findUnique({
      where: { name },
    });
    if (existingRole) {
      return res.status(400).json({
        success: false,
        message: "Role Already Exists",
      });
    }

    const newRole = await prisma.role.create({ data: { name: name.trim() } });
    return res.status(201).json({
      success: true,
      message: "Role created successfully",
      data: newRole,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message,
    });
  }
};

const showRole = async (req, res) => {
  try {
    const roles = await prisma.role.findMany({
      select: {
        id: true,
        name: true,
      },
    });

    return res.status(200).json({
      success: true,
      message: "Roles fetched successfully",
      data: roles,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message,
    });
  }
};

const deleteRole = async (req, res) => {
  try {
    const { roleId } = req.query;

    if (!roleId) {
      return res.status(400).json({
        success: false,
        message: "Role ID is required",
      });
    }

    // Check if the role exists before deleting
    const existingRole = await prisma.role.findUnique({
      where: { id: roleId },
    });

    if (!existingRole) {
      return res.status(404).json({
        success: false,
        message: "Role not found",
      });
    }

    // Delete the role
    await prisma.role.delete({
      where: { id: roleId },
    });

    return res.status(200).json({
      success: true,
      message: "Role deleted successfully",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message,
    });
  }
};

const addItemRawMaterialFromExcel = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Please upload an Excel file.",
      });
    }

    // Read Excel file from buffer using xlsx
    const workbook = xlsx.read(req.file.buffer, { type: "buffer" });
    const sheetName = workbook.SheetNames[0]; // Get the first sheet
    const sheetData = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);

    // Iterate through each row and upsert data into Prisma's ItemRawMaterial model
    for (const row of sheetData) {
      const { itemId, rawMaterialId, quantity } = row;

      if (!itemId || !rawMaterialId || quantity == null) {
        console.warn(`Skipping row due to missing required fields:`, row);
        continue; // Skip rows with missing fields
      }

      // Upsert: Insert new or update existing entry
      await prisma.itemRawMaterial.upsert({
        where: { itemId_rawMaterialId: { itemId, rawMaterialId } },
        update: { quantity },
        create: { itemId, rawMaterialId, quantity },
      });
    }

    return res.status(200).json({
      success: true,
      message: "Data from Excel successfully inserted or updated.",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message,
    });
  }
};

const deleteItemRawMaterialFromExcel = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Please upload an Excel file.",
      });
    }

    // Read Excel file from buffer
    const workbook = xlsx.read(req.file.buffer, { type: "buffer" });
    const sheetName = workbook.SheetNames[0];
    const sheetData = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);

    let deletedCount = 0;
    let skippedRows = [];

    for (const row of sheetData) {
      const { itemId, rawMaterialId } = row;

      if (!itemId || !rawMaterialId) {
        skippedRows.push(row);
        continue;
      }

      try {
        await prisma.itemRawMaterial.delete({
          where: {
            itemId_rawMaterialId: {
              itemId,
              rawMaterialId,
            },
          },
        });
        deletedCount++;
      } catch (err) {
        // If it doesn't exist or fails, log or skip
        skippedRows.push(row);
      }
    }

    return res.status(200).json({
      success: true,
      message: `${deletedCount} entries deleted successfully.`,
      skipped: skippedRows.length ? skippedRows : undefined,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message,
    });
  }
};

const updateRawMaterialsUnitByExcel = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    // Read file buffer from Multer
    const workbook = xlsx.read(req.file.buffer, { type: "buffer" });
    const sheetName = workbook.SheetNames[0];
    const sheetData = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);

    if (!sheetData.length) {
      return res.status(400).json({ error: "Empty file uploaded" });
    }

    let updatedCount = 0; // Counter for successful updates

    // Loop through each row and update the database
    for (const row of sheetData) {
      const { name, unit } = row;

      if (!name || !unit) {
        continue; // Skip rows with missing data
      }

      // Update the unit where name matches
      const result = await prisma.rawMaterial.updateMany({
        where: { name: name },
        data: { unit: unit },
      });

      // Count successful updates
      if (result.count > 0) {
        updatedCount += result.count;
      }
    }

    res.status(200).json({
      message: "RawMaterial units updated successfully",
      updatedCount,
    });
  } catch (error) {
    console.error("Error updating raw materials:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

const importRawMaterialsByExcel = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No file uploaded",
      });
    }

    const workbook = xlsx.read(req.file.buffer, { type: "buffer" });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const jsonData = xlsx.utils.sheet_to_json(sheet);

    let insertedCount = 0;

    for (const row of jsonData) {
      const name = row.name;
      const unit = row.unit;

      if (!name || !unit) continue;

      try {
        await prisma.rawMaterial.create({
          data: {
            name: name.trim(),
            unit: unit.trim(),
            stock: 0,
          },
        });
        insertedCount++;
      } catch (err) {
        console.log(`Skipping duplicate or invalid entry: ${name}`);
        // Could log or handle duplicates here
      }
    }

    res.status(200).json({
      success: true,
      message: `${insertedCount} RawMaterials inserted successfully`,
    });
  } catch (error) {
    console.error("Excel import error:", error);
    res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message,
    });
  }
};

const updateRawMaterialStockByExcel = async (req, res) => {
  try {
    if (!req.file || !req.file.buffer) {
      return res
        .status(400)
        .json({ success: false, message: "Excel file is required." });
    }

    // Parse Excel buffer
    const workbook = xlsx.read(req.file.buffer, { type: "buffer" });
    const sheetName = workbook.SheetNames[0];
    const sheet = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);

    let successfulUpdates = 0;
    const failedUpdates = [];

    // Loop over rows
    for (const row of sheet) {
      const name = row.name || row.Name;
      const quantity = parseFloat(row.quantity || row.Quantity);

      // if (!name || isNaN(quantity)) {
      //   failedUpdates.push(row);
      //   continue;
      // }

      const updated = await prisma.rawMaterial.updateMany({
        where: { name },
        data: {
          stock: quantity,
        },
      });

      if (updated.count === 0) {
        failedUpdates.push(row);
      } else {
        successfulUpdates += updated.count;
      }
    }

    // Log failed ones
    if (failedUpdates.length > 0) {
      console.log("Failed to update these rows (name not found):");
      console.table(failedUpdates);
    }

    return res.status(200).json({
      success: true,
      message: "Stock update from Excel completed.",
      updatedCount: successfulUpdates,
      failedCount: failedUpdates.length,
    });
  } catch (error) {
    console.error("Error during Excel processing:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message,
    });
  }
};

const migrateServiceRecordJSON = async (req, res) => {
  try {
    // 1️⃣ Fetch all ServiceRecord rows where either field is non-null
    const records = await prisma.serviceRecord.findMany({
      where: {
        OR: [{ faultAnalysis: { not: null } }, { initialRCA: { not: null } }],
      },
    });

    console.log(`Found ${records.length} records to check.`);

    for (const record of records) {
      const { id, faultAnalysis, initialRCA } = record;
      let updateData = {};

      // ✅ faultAnalysis
      if (faultAnalysis !== null) {
        try {
          JSON.parse(faultAnalysis); // already valid JSON?
        } catch {
          // Not valid JSON → clean and wrap as array
          const cleaned = `[\"${faultAnalysis
            .replace(/[\n\r]+/g, " ")
            .replace(/"/g, '\\"')}"]`;
          updateData.faultAnalysis = cleaned;
        }
      }

      // ✅ initialRCA
      if (initialRCA !== null) {
        try {
          JSON.parse(initialRCA);
        } catch {
          const cleaned = `[\"${initialRCA
            .replace(/[\n\r]+/g, " ")
            .replace(/"/g, '\\"')}"]`;
          updateData.initialRCA = cleaned;
        }
      }

      // Update only if any changes needed
      if (Object.keys(updateData).length > 0) {
        await prisma.serviceRecord.update({
          where: { id },
          data: updateData,
        });
        console.log(`Updated record: ${id}`);
      }
    }

    console.log(
      "✅ Migration complete. All strings converted to JSON arrays, nulls preserved."
    );
    return res.status(200).json({
      success: true,
      message: "Success",
    });
  } catch (error) {
    console.error("Error migrating ServiceRecord JSON:", error);
  } finally {
    await prisma.$disconnect();
  }
};

const fixInvalidJSON = async (req, res) => {
  try {
    // Fetch only invalid JSON rows
    const records = await prisma.$queryRaw`
      SELECT id, faultAnalysis, initialRCA
      FROM ServiceRecord
      WHERE (faultAnalysis IS NOT NULL AND JSON_VALID(faultAnalysis) = 0)
         OR (initialRCA IS NOT NULL AND JSON_VALID(initialRCA) = 0);
    `;

    console.log(`Found ${records.length} invalid records.`);

    for (const record of records) {
      const updates = {};

      // ✅ Try to fix faultAnalysis
      if (record.faultAnalysis && typeof record.faultAnalysis === "string") {
        try {
          // Try parsing; if it fails, fix by cleaning string
          JSON.parse(record.faultAnalysis);
        } catch {
          // Convert string into proper JSON array
          let clean = record.faultAnalysis
            .replace(/[\[\]\r\n"]/g, " ")
            .split(/[,;]/)
            .map((s) => s.trim())
            .filter(Boolean);
          updates.faultAnalysis = clean.length ? clean : null;
        }
      }

      // ✅ Try to fix initialRCA
      if (record.initialRCA && typeof record.initialRCA === "string") {
        try {
          JSON.parse(record.initialRCA);
        } catch {
          let clean = record.initialRCA
            .replace(/[\[\]\r\n"]/g, " ")
            .split(/[,;]/)
            .map((s) => s.trim())
            .filter(Boolean);
          updates.initialRCA = clean.length ? clean : null;
        }
      }

      // Only update if we have something to fix
      if (Object.keys(updates).length > 0) {
        await prisma.serviceRecord.update({
          where: { id: record.id },
          data: updates,
        });
        console.log(`✅ Fixed record ID: ${record.id}`);
      }
    }

    console.log("🎉 Migration completed successfully!");
  } catch (error) {
    console.error("❌ Error migrating invalid JSON:", error);
  } finally {
    await prisma.$disconnect();
  }
};

const addProduct = async (req, res) => {
  try {
    const { productName } = req?.body;
    if (!productName) {
      return res.status(400).json({
        success: false,
        message: "Product name is required",
      });
    }
    const trimmedProductName = productName.toUpperCase().trim();
    const existingProduct = await prisma.product.findFirst({
      where: {
        productName: trimmedProductName,
      },
    });

    if (existingProduct) {
      return res.status(400).json({
        success: false,
        message: "Product already exists",
      });
    }

    const addProduct = await prisma.product.create({
      data: {
        productName: trimmedProductName,
      },
    });

    return res.status(200).json({
      success: true,
      message: "Product added successfully",
      data: addProduct,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Internal Server Error",
    });
  }
};

const getProduct = async (req, res) => {
  try {
    const product = await prisma.product.findMany({
      select: {
        id: true,
        productName: true,
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    const formatted = product.map((p) => ({
      id: p.id,
      name: p.productName,
    }));

    return res.status(200).json({
      success: true,
      message:
        formatted.length > 0 ? "Data Fetched Successfully" : "No Data Found",
      data: formatted,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Internal Server Error",
    });
  }
};

const deleteProduct = async (req, res) => {
  try {
    const productId = req.query?.productId;
    if (!productId) {
      return res.status(400).json({
        success: false,
        message: "Incomplete Data",
      });
    }

    const existingProduct = await prisma.product.findUnique({
      where: {
        id: productId,
      },
    });

    if (!existingProduct) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    const deletedProduct = await prisma.product.delete({
      where: {
        id: productId,
      },
    });

    return res.status(200).json({
      success: true,
      message: "Product removed successfully",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Internal Server Error",
    });
  }
};

const addProductItemMap = async (req, res) => {
  try {
    const { productId, itemId } = req.body;

    if (!productId || !Array.isArray(itemId) || itemId.length === 0) {
      return res.status(400).json({
        success: false,
        message: "productId and itemId array are required.",
      });
    }

    let existing = [];
    let created = [];
    let invalidItemIds = [];
    let failed = [];

    for (const id of itemId) {
      try {
        // Check if item exists
        const itemExists = await prisma.item.findUnique({
          where: { id },
        });

        if (!itemExists) {
          invalidItemIds.push(id);
          continue;
        }

        // Check if map exists
        const existingMap = await prisma.product_Item_Map.findUnique({
          where: {
            unique_product_item: {
              productId,
              itemId: id,
            },
          },
        });

        if (existingMap) {
          existing.push(existingMap);
          continue;
        }

        // Insert if valid + not existing
        const newMap = await prisma.product_Item_Map.create({
          data: {
            productId,
            itemId: id,
          },
        });

        created.push(newMap);
      } catch (err) {
        failed.push({ itemId: id, error: err.message });
      }
    }

    return res.status(200).json({
      success: true,
      message: "Product-item mapping processing completed.",
      result: {
        existing,
        created,
        failed,
        invalidItemIds, // ⭐ non-existing item IDs will appear here
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Internal Server Error",
    });
  }
};

const getItemsByProductId = async (req, res) => {
  try {
    const { productId } = req.query;

    if (!productId) {
      return res.status(400).json({
        success: false,
        message: "productId is required",
      });
    }

    let mappings = await prisma.product_Item_Map.findMany({
      where: { productId },
      select: {
        item: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    mappings.sort(sortPumps);
    let data = [];
    mappings.map((i) => {
      if (i.item.name !== "MOTOR 10HP AC") data.push(i.item);
    });

    return res.status(200).json({
      success: true,
      data: data,
    });
  } catch (error) {
    console.log("Error fetching mapping:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message,
    });
  }
};

function extractValues(name) {
  const hp = parseFloat(name.match(/(\d+(\.\d+)?)HP/i)?.[1] || 0);
  const type = name.includes("AC") ? "AC" : "DC";
  const meter = parseInt(name.match(/(\d+)MTR/i)?.[1] || 0);

  return { hp, type, meter };
}

function sortPumps(a, b) {
  const A = extractValues(a.item.name);
  const B = extractValues(b.item.name);

  // 1) Sort by HP
  if (A.hp !== B.hp) return A.hp - B.hp;

  // 2) Sort by AC before DC
  if (A.type !== B.type) return A.type === "AC" ? -1 : 1;

  // 3) Sort by Meter
  return A.meter - B.meter;
}

const deleteProductItemMap = async (req, res) => {
  try {
    const { productId, itemId } = req.body;

    if (!productId || !itemId) {
      return res.status(400).json({
        success: false,
        message: "Both productId and itemId are required.",
      });
    }

    const existingMap = await prisma.product_Item_Map.findUnique({
      where: {
        unique_product_item: {
          productId,
          itemId,
        },
      },
    });

    if (!existingMap) {
      return res.status(404).json({
        success: false,
        message: "No mapping found for the given product and item.",
      });
    }

    await prisma.product_Item_Map.delete({
      where: {
        unique_product_item: {
          productId,
          itemId,
        },
      },
    });

    return res.status(200).json({
      success: true,
      message: "Product-item mapping deleted successfully.",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Internal Server Error",
    });
  }
};

const getDefectiveItemsListByWarehouse = async (req, res) => {
  try {
    const { itemName } = req.query;
    const warehouseName = "Bhiwani";

    if (!warehouseName || !itemName) {
      return res.status(400).json({
        success: false,
        message: "Please provide both warehouseName and itemName to filter by.",
      });
    }

    const normalize = (str) =>
      str.toLowerCase().trim().replace(/\s+/g, " ").split(" ");

    const searchTokens = normalize(itemName);

    const items = await WarehouseItems.aggregate([
      {
        $lookup: {
          from: "inWarehouses",
          localField: "warehouse",
          foreignField: "_id",
          as: "warehouseDetails",
        },
      },
      { $unwind: "$warehouseDetails" },

      {
        $match: {
          "warehouseDetails.warehouseName": warehouseName,
        },
      },

      { $unwind: "$items" },

      // ⭐ Add a cleanedTokens array inside the pipeline
      {
        $addFields: {
          tokens: {
            $split: [
              {
                $trim: {
                  input: {
                    $toLower: {
                      $replaceAll: {
                        input: "$items.itemName",
                        find: "  ",
                        replacement: " ",
                      },
                    },
                  },
                },
              },
              " ",
            ],
          },
        },
      },

      // ⭐ EXACT token matching (NO PARTIAL MATCH)
      {
        $match: {
          tokens: { $all: searchTokens },
        },
      },

      {
        $project: {
          name: "$items.itemName",
          defective: "$items.defective",
        },
      },
    ]);

    if (items.length === 0) {
      return res.status(404).json({
        success: false,
        message: `No items found matching '${itemName}' in warehouse '${warehouseName}'.`,
      });
    }

    return res.status(200).json({
      success: true,
      message: `Items matching '${itemName}' in warehouse '${warehouseName}' found.`,
      data: items,
    });
  } catch (error) {
    console.error("Error fetching items:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch items.",
      error: error.message,
    });
  }
};

const getItemType = async (req, res) => {
  try {
    const data = await prisma.itemType.findMany({
      select: {
        id: true,
        name: true,
      },
    });

    return res.status(200).json({
      success: true,
      message: "Data fetched successfully",
      data: data,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Internal Server Error",
    });
  }
};

const addModel = async (req, res) => {
  try {
    const { model } = req.body;

    if (!model) {
      return res.status(400).json({
        success: false,
        message: "Model name is required.",
      });
    }

    const upperCaseModel = model.trim().toUpperCase();
    const existingModel = await prisma.item_Model.findFirst({
      where: {
        model: upperCaseModel,
      },
    });

    if (existingModel) {
      return res.status(400).json({
        success: false,
        message: "Model already exists",
      });
    }

    const createModel = await prisma.item_Model.create({
      data: {
        model: upperCaseModel,
      },
    });

    return res.status(200).json({
      success: true,
      message: "Model created successfully",
      data: createModel,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Internal Server Error",
    });
  }
};

const showModel = async (req, res) => {
  try {
    const modelData = await prisma.item_Model.findMany({
      select: {
        id: true,
        model: true,
      },
    });

    return res.status(200).json({
      success: true,
      message: "Model's fetched successfully",
      data: modelData || [],
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Internal Server Error",
    });
  }
};

const getRawMaterialIdByName = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Please upload an Excel file",
      });
    }

    // Read uploaded excel from buffer
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(req.file.buffer);

    const worksheet = workbook.worksheets[0]; // first sheet

    const resultData = [];

    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return; // skip header row

      const name = row.getCell(1).value;
      const unit = row.getCell(2).value;

      resultData.push({ name, unit });
    });

    // Fetch IDs from Prisma
    for (let row of resultData) {
      const raw = await prisma.rawMaterial.findFirst({
        where: { name: row.name },
        select: { id: true },
      });

      row.id = raw ? raw.id : "NOT FOUND";
    }

    // Create new Excel
    const newWorkbook = new ExcelJS.Workbook();
    const newSheet = newWorkbook.addWorksheet("Result");

    // Header
    newSheet.addRow(["Name", "Unit", "ID"]);

    // Insert rows
    resultData.forEach((r) => {
      newSheet.addRow([r.name, r.unit, r.id]);
    });

    // Send file
    const buffer = await newWorkbook.xlsx.writeBuffer();

    res.setHeader(
      "Content-Disposition",
      "attachment; filename=rawmaterial_result.xlsx"
    );
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );

    return res.send(buffer);
  } catch (error) {
    console.error("Excel Processing Error:", error);
    return res.status(500).json({
      success: false,
      message: "Something went wrong while processing Excel",
      error: error.message,
    });
  }
};

const updateRawMaterialFromExcel = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Excel file is required",
      });
    }

    // Read Excel File
    const workbook = xlsx.read(req.file.buffer, { type: "buffer" });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];

    const rows = xlsx.utils.sheet_to_json(sheet); // Converts rows to JSON

    // Example Excel Expected Columns:
    // id | unit | minQty | stock

    const results = [];
    const errors = [];

    for (let row of rows) {
      const { id, unit, minQty, stock } = row;

      if (!id) {
        errors.push({ row, error: "ID is missing" });
        continue;
      }

      // Update the RawMaterial
      const updated = await prisma.rawMaterial.updateMany({
        where: { id: id },
        data: {
          unit: unit ?? undefined,
          minQty: minQty ?? undefined,
          stock: stock ?? undefined,
        },
      });

      if (updated.count === 0) {
        errors.push({ id, error: "RawMaterial not found" });
      } else {
        results.push({ id, message: "Updated successfully" });
      }
    }

    return res.status(200).json({
      success: true,
      message: "RawMaterials updated",
      updated: results,
      errors,
    });
  } catch (error) {
    console.log("Error updating raw materials:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

const updateRawMaterialUsageFromExcel = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Excel file is required",
      });
    }

    // Read Excel
    const workbook = xlsx.read(req.file.buffer, { type: "buffer" });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rows = xlsx.utils.sheet_to_json(sheet);

    // Extract only IDs from Excel
    const excelIds = rows.map((row) => row.id).filter(Boolean);

    if (excelIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Excel has no valid IDs",
      });
    }

    // 1️⃣ Set ALL as isUsed = false
    await prisma.rawMaterial.updateMany({
      data: { isUsed: false },
    });

    // 2️⃣ Set only matched IDs as isUsed = true
    await prisma.rawMaterial.updateMany({
      where: {
        id: { in: excelIds },
      },
      data: { isUsed: true },
    });

    return res.status(200).json({
      success: true,
      message: "Raw material usage status updated successfully",
      totalIdsFound: excelIds.length,
    });
  } catch (err) {
    console.error("Error updating usage:", err);
    return res.status(500).json({
      success: false,
      message: "Server Error",
      error: err.message,
    });
  }
};

const markCompanyOrVendorNotActive = async (req, res) => {
  try {
    const { id } = req.params;
    let { isActive } = req.params;

    isActive = isActive === "true";

    const [company, vendor] = await Promise.all([
      prisma.company.findUnique({ where: { id } }),
      prisma.vendor.findUnique({ where: { id } }),
    ]);

    if (!company && !vendor) {
      return res.status(404).json({
        success: false,
        message: "No company or vendor found with this ID",
      });
    }

    let entityType = company ? "Company" : "Vendor";
    let existingRecord = company || vendor;

    if (existingRecord.isActive === isActive) {
      return res.status(400).json({
        success: false,
        message: `${entityType} is already ${isActive ? "Active" : "Not Active"}`,
      });
    }

    const updatedRecord = company
      ? await prisma.company.update({
          where: { id },
          data: { isActive },
        })
      : await prisma.vendor.update({
          where: { id },
          data: { isActive },
        });

    await prisma.auditLog.create({
      data: {
        entityType: entityType,
        entityId: id,
        action: `STATUS_UPDATED`,
        performedBy: req.user?.id || null,
        oldValue: { isActive: existingRecord.isActive },
        newValue: { isActive: updatedRecord.isActive },
      },
    });

    return res.json({
      success: true,
      message: `${entityType} marked as ${isActive ? "Active" : "Not Active"}`,
      data: updatedRecord,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Internal Server Error",
    });
  }
};

const createRawMaterial = async (req, res) => {
  try {
    const {
      rawMaterialName,
      description,
      unit,
      conversionUnit,
      conversionFactor,
    } = req.body;

    if (
      !rawMaterialName ||
      !unit ||
      !description ||
      !conversionUnit ||
      !conversionFactor
    ) {
      return res.status(400).json({
        success: false,
        message:
          "rawMaterialName, description, unit, conversionUnit, conversionFactor are required.",
      });
    }

    const name = rawMaterialName.trim();

    if (conversionUnit) {
      if (!conversionFactor || conversionFactor <= 0) {
        throw new Error("Valid conversionFactor is required");
      }

      if (unit === conversionUnit && conversionFactor !== 1) {
        throw new Error(
          "conversionFactor must be 1 when unit and conversionUnit are same"
        );
      }
    }

    // 1️⃣ Check if raw material already exists
    const existingItem = await prisma.rawMaterial.findUnique({
      where: { name },
    });

    if (existingItem) {
      return res.status(400).json({
        success: false,
        message: "RawMaterial Already Exists",
      });
    }

    /**
     * 🔹 Fetch all warehouses from MongoDB
     * This should return something like:
     * [{ _id: "abc" }, { _id: "xyz" }]
     */
    const warehouses = await Warehouse.find({}); // 👈 YOU already have this

    if (!warehouses || warehouses.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No warehouses found",
      });
    }

    // 2️⃣ Transaction: create rawMaterial + warehouseStock
    const result = await prisma.$transaction(async (tx) => {
      // Create RawMaterial
      const rawMaterial = await tx.rawMaterial.create({
        data: {
          name,
          stock: 0,
          description,
          unit,
          conversionUnit,
          conversionFactor,
        },
      });

      // Prepare warehouse stock entries
      const warehouseStockData = warehouses.map((wh) => ({
        warehouseId: wh._id.toString(),
        rawMaterialId: rawMaterial.id,
        quantity: 0,
        unit,
        isUsed: true,
      }));

      // Create WarehouseStock for ALL warehouses
      await tx.warehouseStock.createMany({
        data: warehouseStockData,
        skipDuplicates: true, // safety for @@unique
      });

      return rawMaterial;
    });

    return res.status(201).json({
      success: true,
      message: "Raw-Material added and initialized for all warehouses",
      data: result,
    });
  } catch (error) {
    console.error("Create RawMaterial Error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message,
    });
  }
};

const createSystemItem = async (req, res) => {
  try {
    const { itemName, unit, description, conversionUnit, conversionFactor } =
      req.body;
    const empId = req.user?.id;

    if (
      !itemName ||
      !unit ||
      !description ||
      !conversionFactor ||
      !conversionUnit
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Item name, unit, description, conversionUnit, conversionFactor is required",
      });
    }

    const trimmedName = itemName.trim();

    const existingSystemItem = await SystemItem.findOne({
      itemName: trimmedName,
    });
    if (existingSystemItem) {
      return res.status(400).json({
        success: false,
        message: "Duplicate Data: itemName already exists",
      });
    }

    // Save new system item
    const newSystemItem = new SystemItem({
      itemName: trimmedName,
      unit: unit,
      description: description,
      converionUnit: conversionUnit,
      conversionFactor: conversionFactor,
      createdByEmpId: empId,
    });
    const savedSystemItem = await newSystemItem.save();

    // Add this item to all warehouses' inventories
    const allWarehouses = await Warehouse.find();
    for (let warehouse of allWarehouses) {
      const exists = await InstallationInventory.findOne({
        warehouseId: warehouse._id,
        systemItemId: savedSystemItem._id,
      });

      if (!exists) {
        const newInventory = new InstallationInventory({
          warehouseId: warehouse._id,
          systemItemId: savedSystemItem._id,
          quantity: 0,
          createdByEmpId: empId,
        });
        await newInventory.save();
      }
    }

    return res.status(200).json({
      success: true,
      message: "System Item Added and Mapped to All Warehouses Successfully",
      data: savedSystemItem,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message,
    });
  }
};

function parseConversionFactor(value) {
  // default
  if (value === undefined || value === null || value === "") {
    return 1;
  }

  // normalize to string
  if (typeof value === "number") {
    value = value.toString();
  }

  if (typeof value !== "string") {
    throw new Error("conversionFactor must be a string or number");
  }

  const trimmed = value.trim();

  // fraction case: "1/30"
  if (trimmed.includes("/")) {
    const [num, den] = trimmed.split("/").map(Number);

    if (!num || !den || den === 0) {
      throw new Error("Invalid conversionFactor fraction");
    }

    return num / den;
  }

  // normal number string: "30", "0.5"
  const numVal = Number(trimmed);
  if (isNaN(numVal) || numVal <= 0) {
    throw new Error("conversionFactor must be a valid number > 0");
  }

  return numVal;
}

const createItem = async (req, res) => {
  try {
    let { name, unit, description, source, hsnCode, conversionUnit, conversionFactor } =
      req.body;

    const empId = req.user?.id;

    if (!name || !unit  || !source) {
      return res.status(400).json({
        success: false,
        message: "name, unit, source are required",
      });
    }

    const trimmedName = name.trim();

    /* =====================================================
       🔁 SAFE CONVERSION LOGIC (STRING BASED)
    ====================================================== */
    let numericConversionFactor;
    try {
      numericConversionFactor =
        conversionFactor === undefined || conversionFactor === null
          ? 1
          : parseConversionFactor(String(conversionFactor));
    } catch (err) {
      return res.status(400).json({
        success: false,
        message: err.message,
      });
    }


    const finalConversionUnit = conversionUnit || unit;

    /* =====================================================
       🔴 RAW MATERIAL FLOW (Prisma)
    ====================================================== */
    if (source === "Raw Material") {
      const existingItem = await prisma.rawMaterial.findUnique({
        where: { name: trimmedName },
      });

      if (existingItem) {
        return res.status(400).json({
          success: false,
          message: "Raw Material already exists",
        });
      }

      const warehouses = await Warehouse.find({});
      if (!warehouses.length) {
        return res.status(400).json({
          success: false,
          message: "No warehouses found",
        });
      }

      const result = await prisma.$transaction(async (tx) => {
        const rawMaterial = await tx.rawMaterial.create({
          data: {
            name: trimmedName,
            stock: 0,
            description: description || null,
            unit,
            hsnCode: hsnCode || null,
            conversionUnit: finalConversionUnit,
            conversionFactor: numericConversionFactor,
            createdBy: empId,
          },
        });

        const warehouseStockData = warehouses.map((wh) => ({
          warehouseId: wh._id.toString(),
          rawMaterialId: rawMaterial.id,
          quantity: 0,
          unit,
          isUsed: true,
        }));

        await tx.warehouseStock.createMany({
          data: warehouseStockData,
          skipDuplicates: true,
        });

        return rawMaterial;
      });

      return res.status(201).json({
        success: true,
        message: "Raw Material Created Successfully",
        data: result,
      });
    }

    /* =====================================================
       🔵 INSTALLATION MATERIAL FLOW (Mongo)
    ====================================================== */
    if (source === "Installation Material") {
      const existingSystemItem = await SystemItem.findOne({
        itemName: trimmedName,
      });

      if (existingSystemItem) {
        return res.status(400).json({
          success: false,
          message: "System Item already exists",
        });
      }

      const newSystemItem = new SystemItem({
        itemName: trimmedName,
        unit,
        hsnCode: hsnCode || null,
        description: description || null,
        converionUnit: finalConversionUnit,
        conversionFactor: numericConversionFactor,
        createdByEmpId: empId,
      });

      const savedSystemItem = await newSystemItem.save();

      const allWarehouses = await Warehouse.find();

      for (let warehouse of allWarehouses) {
        const exists = await InstallationInventory.findOne({
          warehouseId: warehouse._id,
          systemItemId: savedSystemItem._id,
        });

        if (!exists) {
          await new InstallationInventory({
            warehouseId: warehouse._id,
            systemItemId: savedSystemItem._id,
            quantity: 0,
            createdByEmpId: empId,
          }).save();
        }
      }

      return res.status(201).json({
        success: true,
        message: "Installation Material Created Successfully",
        data: savedSystemItem,
      });
    }

    /* =====================================================
       ❌ INVALID SOURCE
    ====================================================== */
    return res.status(400).json({
      success: false,
      message: "Invalid source value",
    });
  } catch (error) {
    console.error("Create Item Error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message,
    });
  }
};

const getItemById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "id is required",
      });
    }

    const rawMaterial = await prisma.rawMaterial.findUnique({
      where: { id },
    });

    if (rawMaterial) {
      return res.status(200).json({
        success: true,
        source: "Raw Material",
        data: {
          id: rawMaterial.id,
          name: rawMaterial.name,
          unit: rawMaterial.unit,
          hsnCode: rawMaterial.hsnCode,
          description: rawMaterial.description,
          conversionUnit: rawMaterial.conversionUnit,
          conversionFactor: rawMaterial.conversionFactor,
        },
      });
    }

    const systemItem = await SystemItem.findById(id);

    if (systemItem) {
      return res.status(200).json({
        success: true,
        source: "Installation Material",
        data: {
          id: systemItem._id,
          name: systemItem.itemName,
          unit: systemItem.unit,
          hsnCode: systemItem.hsnCode,
          description: systemItem.description,
          conversionUnit: systemItem.converionUnit,
          conversionFactor: systemItem.conversionFactor,
        },
      });
    }

    return res.status(404).json({
      success: false,
      message: "Item not found",
    });
  } catch (error) {
    console.error("Get Item Error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message,
    });
  }
};

const updateItem = async (req, res) => {
  try {
    const { id, name, unit, hsnCode, description, conversionUnit, conversionFactor } =
      req.body;

    const empId = req.user?.id;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "id is required",
      });
    }

    const updateData = {};

    if (name) updateData.name = name.trim();
    if (unit) updateData.unit = unit;
    if (hsnCode) updateData.hsnCode = hsnCode;
    if (description) updateData.description = description;

    // Handle conversionUnit and conversionFactor
    if (conversionUnit) {
      updateData.conversionUnit = conversionUnit;
    }

    if (conversionFactor !== undefined && conversionFactor !== null) {
      const numericFactor = Number(conversionFactor);
      if (isNaN(numericFactor) || numericFactor <= 0) {
        return res.status(400).json({
          success: false,
          message: "conversionFactor must be a valid number > 0",
        });
      }
      updateData.conversionFactor = numericFactor;
    }

    const rawMaterial = await prisma.rawMaterial.findUnique({
      where: { id },
    });

    if (rawMaterial) {
      // ❗ Duplicate name check
      if (updateData.name) {
        const duplicate = await prisma.rawMaterial.findFirst({
          where: {
            name: updateData.name,
            NOT: { id },
          },
        });

        if (duplicate) {
          return res.status(400).json({
            success: false,
            message: "Raw Material name already exists",
          });
        }
      }

      // Set defaults if conversionFactor/conversionUnit are not provided
      if ((conversionFactor === undefined || conversionFactor === null) && rawMaterial.conversionFactor == null) {
        updateData.conversionFactor = 1;
        updateData.conversionUnit = unit || rawMaterial.unit; // base unit
      }

      const updatedRawMaterial = await prisma.$transaction(async (tx) => {
        const updated = await tx.rawMaterial.update({
          where: { id },
          data: updateData,
        });

        // 🔁 Sync unit in warehouse stock ONLY if unit updated
        if (updateData.unit) {
          await tx.warehouseStock.updateMany({
            where: { rawMaterialId: id },
            data: { unit: updateData.unit },
          });
        }

        return updated;
      });

      return res.status(200).json({
        success: true,
        message: "Raw Material updated successfully",
        data: updatedRawMaterial,
      });
    }

    // Handle SystemItem (MongoDB)
    const systemItem = await SystemItem.findById(id);

    if (systemItem) {
      // ❗ Duplicate name check
      if (name) {
        const duplicate = await SystemItem.findOne({
          itemName: name.trim(),
          _id: { $ne: id },
        });

        if (duplicate) {
          return res.status(400).json({
            success: false,
            message: "System Item name already exists",
          });
        }
      }

      if (name) systemItem.itemName = name.trim();
      if (unit) systemItem.unit = unit;
      if (hsnCode) systemItem.hsnCode = hsnCode;
      if (description) systemItem.description = description;
      if (conversionUnit) systemItem.converionUnit = conversionUnit;

      if (conversionFactor !== undefined && conversionFactor !== null) {
        systemItem.conversionFactor = Number(conversionFactor);
      } else if (systemItem.conversionFactor == null) {
        // Default to 1 and base unit
        systemItem.conversionFactor = 1;
        systemItem.converionUnit = unit || systemItem.unit;
      }

      systemItem.updatedAt = new Date();
      systemItem.updatedByEmpId = empId;

      await systemItem.save();

      return res.status(200).json({
        success: true,
        message: "System Item updated successfully",
        data: systemItem,
      });
    }

    return res.status(404).json({
      success: false,
      message: "Item not found in Raw Material or Installation Material",
    });
  } catch (error) {
    console.error("Update Item Error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message,
    });
  }
};

const showUnit = async (req, res) => {
  try {
    const getUnit = await prisma.unit.findMany({
      select: {
        id: true,
        name: true,
      },
    });

    res.status(200).json({
      success: true,
      message: `Units Fetched Successfully`,
      data: getUnit,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message,
    });
  }
};

const syncRawMaterialsToWarehouses = async (req, res) => {
  try {
    const rawMaterials = await prisma.rawMaterial.findMany({
      select: {
        id: true,
        unit: true,
        isUsed: true,
      },
    });

    if (!rawMaterials.length) {
      return res.status(400).json({
        success: false,
        message: "No raw materials found",
      });
    }

    // 2️⃣ Fetch all warehouses (MongoDB)
    const warehouses = await Warehouse.find({});
    if (!warehouses.length) {
      return res.status(400).json({
        success: false,
        message: "No warehouses found",
      });
    }

    const warehouseStockData = [];

    for (const warehouse of warehouses) {
      for (const rawMaterial of rawMaterials) {
        warehouseStockData.push({
          warehouseId: warehouse._id.toString(),
          rawMaterialId: rawMaterial.id,
          quantity: 0,
          unit: rawMaterial.unit,
          isUsed: rawMaterial.isUsed,
        });
      }
    }

    // 4️⃣ Insert safely (no duplicates)
    const result = await prisma.warehouseStock.createMany({
      data: warehouseStockData,
      skipDuplicates: true, // 🔥 KEY
    });

    return res.status(200).json({
      success: true,
      message: "All raw materials synced to all warehouses successfully",
      insertedCount: result.count,
    });
  } catch (error) {
    console.error("Sync Error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message,
    });
  }
};

const syncWarehouseStock = async (req, res) => {
  try {
    const { warehouseId } = req.params;

    if (!warehouseId) {
      return res
        .status(400)
        .json({ success: false, message: "warehouseId is required" });
    }

    // 1. Fetch all raw materials and their master stock levels
    const rawMaterials = await prisma.rawMaterial.findMany({
      select: {
        id: true,
        stock: true,
        unit: true,
      },
    });

    // 2. Perform upserts for each material into the specific warehouse
    // We use Promise.all to run these operations in parallel for better performance
    const syncOperations = rawMaterials.map((material) => {
      return prisma.warehouseStock.upsert({
        where: {
          // Using the composite unique key defined in your schema
          warehouseId_rawMaterialId: {
            warehouseId: warehouseId,
            rawMaterialId: material.id,
          },
        },
        update: {
          quantity: material.stock || 0,
          unit: material.unit,
        },
        create: {
          warehouseId: warehouseId,
          rawMaterialId: material.id,
          quantity: material.stock || 0,
          unit: material.unit,
        },
      });
    });

    await Promise.all(syncOperations);

    return res.status(200).json({
      success: true,
      message: `Successfully synchronized ${rawMaterials.length} materials for warehouse ${warehouseId}.`,
    });
  } catch (error) {
    console.error("Sync Error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Internal Server Error",
    });
  }
};

const exportRawMaterialsExcel = async (req, res) => {
  try {
    // 1️⃣ Fetch only raw material name
    const rawMaterials = await prisma.rawMaterial.findMany({
      where: {
        isUsed: true,
      },
      select: {
        name: true,
      },
    });

    if (!rawMaterials.length) {
      return res.status(404).json({
        success: false,
        message: "No raw materials found",
      });
    }

    // 2️⃣ Prepare Excel data
    const excelData = rawMaterials.map((item) => ({
      RawMaterialName: item.name,
    }));

    // 3️⃣ Create workbook & worksheet
    const workbook = xlsx.utils.book_new();
    const worksheet = xlsx.utils.json_to_sheet(excelData);

    xlsx.utils.book_append_sheet(workbook, worksheet, "RawMaterials");

    // 4️⃣ Convert to buffer
    const excelBuffer = xlsx.write(workbook, {
      bookType: "xlsx",
      type: "buffer",
    });

    // 5️⃣ Send file
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=RawMaterials.xlsx"
    );
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );

    return res.send(excelBuffer);
  } catch (error) {
    console.error("Raw Material Excel Export Error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message,
    });
  }
};

const updateItemsFromExcel = async (req, res) => {
  try {
    const empId = req.user?.id;

    if (!req.file || !req.file.buffer) {
      return res.status(400).json({
        success: false,
        message: "Excel file is required",
      });
    }

    /* ================= READ EXCEL BUFFER ================= */
    const workbook = xlsx.read(req.file.buffer, { type: "buffer" });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];

    const rows = xlsx.utils.sheet_to_json(sheet, { defval: "" });

    if (!rows.length) {
      return res.status(400).json({
        success: false,
        message: "Excel sheet is empty",
      });
    }

    let updatedCount = 0;
    const errors = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];

      try {
        const name = row.name?.toString().trim();
        const unit = row.unit?.toString().trim();
        const conversionUnit = row.conversionUnit?.toString().trim() || unit;
        const conversionFactor = row.conversionFactor;

        if (!name || !unit) {
          throw new Error("name and unit are required");
        }

        /* ================= RAW MATERIAL ================= */
        const rawMaterial = await prisma.rawMaterial.findUnique({
          where: { name },
        });

        if (rawMaterial) {
          await prisma.$transaction(async (tx) => {
            await tx.rawMaterial.update({
              where: { id: rawMaterial.id },
              data: {
                unit,
                conversionUnit,
                conversionFactor,
                updatedBy: empId,
              },
            });

            await tx.warehouseStock.updateMany({
              where: { rawMaterialId: rawMaterial.id },
              data: { unit },
            });
          });

          updatedCount++;
          continue;
        }

        /* ================= SYSTEM ITEM ================= */
        const systemItem = await SystemItem.findOne({
          itemName: name,
        });

        if (systemItem) {
          systemItem.unit = unit;
          systemItem.converionUnit = conversionUnit;
          systemItem.conversionFactor = conversionFactor;
          systemItem.updatedAt = new Date();
          systemItem.updatedByEmpId = empId;

          await systemItem.save();
          updatedCount++;
          continue;
        }

        throw new Error("Item not found in RawMaterial or SystemItem");
      } catch (rowError) {
        errors.push({
          row: i + 2, // Excel row number
          name: row.name,
          error: rowError.message,
        });
      }
    }

    return res.json({
      success: true,
      message: "Excel unit conversion update completed",
      updatedCount,
      failedCount: errors.length,
      errors,
    });
  } catch (err) {
    console.error("Excel Conversion Update Error:", err);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

const addSystemOrder = async (req, res) => {
  try {
    const { systemId, pumpId, pumpHead } = req.body;

    if (!systemId || !pumpHead) {
      return res.status(400).json({
        success: false,
        message: "systemId, pumpId and pumpHead are required",
      });
    }

    const existingSystemOrder = await SystemOrder.findOne({
      systemId,
      pumpHead,
    });

    if (existingSystemOrder) {
      return res.status(400).json({
        success: false,
        message: `System order with ${pumpHead} head already exists.`,
      });
    }

    const createSystemOrder = new SystemOrder({
      systemId,
      pumpId: pumpId || null,
      pumpHead,
    });

    const savedData = await createSystemOrder.save();

    return res.status(201).json({
      success: true,
      message: `System order with ${pumpHead} head created successfully.`,
      data: savedData,
    });
  } catch (error) {
    console.error("addSystemOrder error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Internal Server Error",
    });
  }
};

const increaseOrDecreaseSystemOrder = async (req, res) => {
  try {
    const { systemId, pumpHead, orderQty } = req.body;

    // ✅ Validation
    if (!systemId || !pumpHead || orderQty === undefined) {
      return res.status(400).json({
        success: false,
        message: "systemId, pumpHead and orderQty are required",
      });
    }

    const qty = Number(orderQty);

    if (Number.isNaN(qty) || qty === 0) {
      return res.status(400).json({
        success: false,
        message: "orderQty must be a non-zero number",
      });
    }

    // 🔍 Fetch current order
    const systemOrder = await SystemOrder.findOne({ systemId, pumpHead });

    if (!systemOrder) {
      return res.status(404).json({
        success: false,
        message: "System order not found",
      });
    }

    // 🛑 Prevent negative totalOrder
    const newTotalOrder = systemOrder.totalOrder + qty;

    if (newTotalOrder < 0) {
      return res.status(400).json({
        success: false,
        message: "Total order cannot be negative",
      });
    }

    // ✅ Atomic update
    systemOrder.totalOrder = newTotalOrder;
    await systemOrder.save();

    return res.status(200).json({
      success: true,
      message:
        qty > 0
          ? "Order quantity increased successfully"
          : "Order quantity decreased successfully",
      data: systemOrder,
    });

  } catch (error) {
    console.error("increaseOrDecreaseSystemOrder error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Internal Server Error",
    });
  }
};

// const sendAllSystemStockShortageReport = async () => {
//   try {
//     const warehouseId = "690835908a80011de511b648";

//     const systems = await System.find({
//       systemName: { $nin: ["10HP AC System"] },
//     })
//       .select("_id systemName")
//       .lean();

//     if (!systems.length) {
//       console.log("❌ No systems found");
//       return;
//     }

//     const workbook = xlsx.utils.book_new();
//     let hasAnyShortage = false;

//     /* =====================================================
//        STEP 1: TRACK ITEM USAGE ACROSS SYSTEMS
//        (COMMON + VARIABLE)
//     ===================================================== */
//     const itemUsageMap = new Map(); 
//     // itemId -> { itemName, systems:Set }

//     for (const system of systems) {
//       const dashboardData = await getDashboardService(system._id, warehouseId);

//       const registerItem = (item) => {
//         const itemId = item.itemId?.toString();
//         if (!itemId) return;

//         if (!itemUsageMap.has(itemId)) {
//           itemUsageMap.set(itemId, {
//             itemName: item.itemName,
//             systems: new Set(),
//           });
//         }

//         itemUsageMap.get(itemId).systems.add(system.systemName);
//       };

//       dashboardData.commonItems.forEach(registerItem);

//       dashboardData.variableItems.forEach((head) => {
//         head.items.forEach(registerItem);
//       });
//     }

//     /* =====================================================
//        STEP 2: COLLECTORS
//     ===================================================== */
//     const globalItemMap = new Map(); // multi-system items
//     const singleSheetRows = [];

//     /* =====================================================
//        STEP 3: MAIN LOOP
//     ===================================================== */
//     for (const system of systems) {
//       const dashboardData = await getDashboardService(system._id, warehouseId);
//       const systemRows = [];

//       /* ================= COMMON ITEMS ================= */
//       const commonDesiredSystem =
//         dashboardData.summary.motorCommonSystem.totalDesired;

//       dashboardData.commonItems.forEach((item) => {
//         if (item.shortageQty <= 0) return;
//         hasAnyShortage = true;

//         const itemId = item.itemId.toString();
//         const usedInSystems = itemUsageMap.get(itemId)?.systems.size || 0;

//         // 🔁 MULTI-SYSTEM ITEM
//         if (usedInSystems > 1) {
//           if (!globalItemMap.has(itemId)) {
//             globalItemMap.set(itemId, {
//               SystemName: "MULTI SYSTEM",
//               PumpHead: "ALL",
//               ItemType: "GLOBAL",
//               ItemName: item.itemName,
//               BOM_Qty: item.bomQty,
//               Stock_Qty: item.stockQty,
//               Desired_Systems: 0,
//               Required_Qty: 0,
//               Shortage_Qty: 0,
//             });
//           }

//           const g = globalItemMap.get(itemId);
//           g.Desired_Systems += commonDesiredSystem;
//           g.Required_Qty += item.requiredQty;
//           g.Shortage_Qty += item.shortageQty;
//         }
//         // 🔁 SINGLE SYSTEM
//         else {
//           const row = {
//             SystemName: system.systemName,
//             PumpHead: "ALL",
//             ItemType: "Common",
//             ItemName: item.itemName,
//             BOM_Qty: item.bomQty,
//             Stock_Qty: item.stockQty,
//             Desired_Systems: commonDesiredSystem,
//             Required_Qty: item.requiredQty,
//             Shortage_Qty: item.shortageQty,
//           };

//           systemRows.push(row);
//           singleSheetRows.push(row);
//         }
//       });

//       /* ================= VARIABLE ITEMS ================= */
//       dashboardData.variableItems.forEach((head) => {
//         const headDesiredSystem = head.desiredSystems;

//         head.items.forEach((item) => {
//           if (item.shortageQty <= 0) return;
//           hasAnyShortage = true;

//           const itemId = item.itemId.toString();
//           const usedInSystems = itemUsageMap.get(itemId)?.systems.size || 0;

//           // 🔁 MULTI-SYSTEM VARIABLE ITEM
//           if (usedInSystems > 1) {
//             if (!globalItemMap.has(itemId)) {
//               globalItemMap.set(itemId, {
//                 SystemName: "MULTI SYSTEM",
//                 PumpHead: "MULTI",
//                 ItemType: "GLOBAL",
//                 ItemName: item.itemName,
//                 BOM_Qty: item.bomQty,
//                 Stock_Qty: item.stockQty,
//                 Desired_Systems: 0,
//                 Required_Qty: 0,
//                 Shortage_Qty: 0,
//               });
//             }

//             const g = globalItemMap.get(itemId);
//             g.Desired_Systems += headDesiredSystem;
//             g.Required_Qty += item.requiredQty;
//             g.Shortage_Qty += item.shortageQty;
//           }
//           // 🔁 SINGLE SYSTEM VARIABLE
//           else {
//             const row = {
//               SystemName: system.systemName,
//               PumpHead: head.pumpHead,
//               ItemType: "VARIABLE",
//               ItemName: item.itemName,
//               BOM_Qty: item.bomQty,
//               Stock_Qty: item.stockQty,
//               Desired_Systems: headDesiredSystem,
//               Required_Qty: item.requiredQty,
//               Shortage_Qty: item.shortageQty,
//             };

//             systemRows.push(row);
//             singleSheetRows.push(row);
//           }
//         });
//       });

//       /* ================= SYSTEM SHEET ================= */
//       if (systemRows.length) {
//         const worksheet = xlsx.utils.json_to_sheet(systemRows);
//         xlsx.utils.book_append_sheet(
//           workbook,
//           worksheet,
//           system.systemName.slice(0, 31)
//         );
//       }
//     }

//     if (!hasAnyShortage) {
//       console.log("✅ No stock shortage found");
//       return;
//     }

//     /* =====================================================
//        FINAL CONSOLIDATED SHEET
//     ===================================================== */
//     const finalSingleSheet = [
//       ...Array.from(globalItemMap.values()),
//       ...singleSheetRows,
//     ];

//     const consolidatedSheet =
//       xlsx.utils.json_to_sheet(finalSingleSheet);

//     xlsx.utils.book_append_sheet(
//       workbook,
//       consolidatedSheet,
//       "SYSTEM_STOCK_SHORTAGE"
//     );

//     /* =====================================================
//        SEND MAIL
//     ===================================================== */
//     const excelBuffer = xlsx.write(workbook, {
//       bookType: "xlsx",
//       type: "buffer",
//     });

//     await sendMail({
//       to: [
//         process.env.PURCHASE_EMAIL,
//         process.env.ADMIN_EMAIL,
//         process.env.DEVELOPER_EMAIL,
//       ],
//       subject: "⚠️ Stock Shortage Report (Synced Items)",
//       text: "Attached is the synced system-wise stock shortage report.",
//       attachments: [
//         {
//           filename: `Stock_Shortage_${new Date()
//             .toISOString()
//             .slice(0, 10)}.xlsx`,
//           content: excelBuffer,
//         },
//       ],
//     });

//     console.log("📧 Stock shortage mail sent successfully");
//   } catch (error) {
//     console.error("❌ Stock shortage cron failed:", error);
//   }
// };


const sendAllSystemStockShortageReport = async () => {
  try {
    const warehouseId = "690835908a80011de511b648";

    const systems = await System.find({
      systemName: { $nin: ["10HP AC System"] },
    })
      .select("_id systemName")
      .lean();

    if (!systems.length) {
      console.log("❌ No systems found");
      return;
    }

    const workbook = xlsx.utils.book_new();
    let hasAnyShortage = false;

    /* =====================================================
       STEP 1: TRACK ITEM USAGE ACROSS SYSTEMS
       (COMMON + VARIABLE)
    ===================================================== */
    const itemUsageMap = new Map();
    // itemId -> { itemName, systems:Set }

    for (const system of systems) {
      const dashboardData = await getDashboardService(system._id, warehouseId);

      const registerItem = (item) => {
        const itemId = item.itemId?.toString();
        if (!itemId) return;

        if (!itemUsageMap.has(itemId)) {
          itemUsageMap.set(itemId, {
            itemName: item.itemName,
            systems: new Set(),
          });
        }

        itemUsageMap.get(itemId).systems.add(system.systemName);
      };

      dashboardData.commonItems.forEach(registerItem);
      dashboardData.variableItems.forEach((head) =>
        head.items.forEach(registerItem)
      );
    }

    /* =====================================================
       STEP 2: COLLECTORS
    ===================================================== */
    const globalItemMap = new Map(); // multi-system items
    const singleSheetRows = [];

    /* =====================================================
       STEP 3: MAIN LOOP
    ===================================================== */
    for (const system of systems) {
      const dashboardData = await getDashboardService(system._id, warehouseId);
      const systemRows = [];

      /* ================= COMMON ITEMS ================= */
      dashboardData.commonItems.forEach((item) => {
        if (item.shortageQty <= 0) return;
        hasAnyShortage = true;

        const itemId = item.itemId.toString();
        const usedInSystems = itemUsageMap.get(itemId)?.systems.size || 0;

        // 🔁 GLOBAL COMMON ITEM
        if (usedInSystems > 1) {
          if (!globalItemMap.has(itemId)) {
            globalItemMap.set(itemId, {
              SystemName: "MULTI SYSTEM",
              PumpHead: "ALL",
              ItemType: "GLOBAL",
              ItemName: item.itemName,
              Stock_Qty: item.stockQty,
              Required_Qty: 0,
              Shortage_Qty: 0, // calculated later
            });
          }

          const g = globalItemMap.get(itemId);
          g.Required_Qty += item.requiredQty;
        }
        // 🔁 SYSTEM-SPECIFIC COMMON
        else {
          const row = {
            SystemName: system.systemName,
            PumpHead: "ALL",
            ItemType: "Common",
            ItemName: item.itemName,
            Stock_Qty: item.stockQty,
            Required_Qty: item.requiredQty,
            Shortage_Qty: item.shortageQty,
          };

          systemRows.push(row);
          singleSheetRows.push(row);
        }
      });

      /* ================= VARIABLE ITEMS ================= */
      dashboardData.variableItems.forEach((head) => {
        head.items.forEach((item) => {
          if (item.shortageQty <= 0) return;
          hasAnyShortage = true;

          const itemId = item.itemId.toString();
          const usedInSystems = itemUsageMap.get(itemId)?.systems.size || 0;

          // 🔁 GLOBAL VARIABLE ITEM
          if (usedInSystems > 1) {
            if (!globalItemMap.has(itemId)) {
              globalItemMap.set(itemId, {
                SystemName: "MULTI SYSTEM",
                PumpHead: "MULTI",
                ItemType: "GLOBAL",
                ItemName: item.itemName,
                Stock_Qty: item.stockQty,
                Required_Qty: 0,
                Shortage_Qty: 0, // calculated later
              });
            }

            const g = globalItemMap.get(itemId);
            g.Required_Qty += item.requiredQty;
          }
          // 🔁 SYSTEM-SPECIFIC VARIABLE
          else {
            const row = {
              SystemName: system.systemName,
              PumpHead: head.pumpHead,
              ItemType: "VARIABLE",
              ItemName: item.itemName,
              Stock_Qty: item.stockQty,
              Required_Qty: item.requiredQty,
              Shortage_Qty: item.shortageQty,
            };

            systemRows.push(row);
            singleSheetRows.push(row);
          }
        });
      });

      /* ================= SYSTEM SHEET ================= */
      if (systemRows.length) {
        const worksheet = xlsx.utils.json_to_sheet(systemRows);
        xlsx.utils.book_append_sheet(
          workbook,
          worksheet,
          system.systemName.slice(0, 31)
        );
      }
    }

    if (!hasAnyShortage) {
      console.log("✅ No stock shortage found");
      return;
    }

    /* =====================================================
       STEP 4: FINAL SHORTAGE CALCULATION (GLOBAL ITEMS)
    ===================================================== */
    for (const g of globalItemMap.values()) {
      g.Shortage_Qty = Math.max(g.Required_Qty - g.Stock_Qty, 0);
    }

    /* =====================================================
       STEP 5: FINAL CONSOLIDATED SHEET
    ===================================================== */
    const finalSingleSheet = [
      ...Array.from(globalItemMap.values()),
      ...singleSheetRows,
    ];

    const consolidatedSheet =
      xlsx.utils.json_to_sheet(finalSingleSheet);

    xlsx.utils.book_append_sheet(
      workbook,
      consolidatedSheet,
      "SYSTEM_STOCK_SHORTAGE"
    );

    /* =====================================================
       STEP 6: SEND MAIL
    ===================================================== */
    const excelBuffer = xlsx.write(workbook, {
      bookType: "xlsx",
      type: "buffer",
    });

    await sendMail({
      to: [
        process.env.PURCHASE_EMAIL,
        process.env.ADMIN_EMAIL,
        process.env.DEVELOPER_EMAIL,
      ],
      subject: "⚠️ Stock Shortage Report (Final)",
      text:
        "Attached is the system-wise stock shortage report. " +
        "BOM Qty and Desired Systems have been removed as requested.",
      attachments: [
        {
          filename: `Stock_Shortage_${new Date()
            .toISOString()
            .slice(0, 10)}.xlsx`,
          content: excelBuffer,
          contentType:
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        },
      ],
    });

    console.log("📧 Stock shortage mail sent successfully");
  } catch (error) {
    console.error("❌ Stock shortage cron failed:", error);
  }
};

const updateWarehouseStockByExcel = async (req, res) => {
  try {
    const { warehouseId } = req.body;

    if (!warehouseId) {
      return res.status(400).json({
        success: false,
        message: "warehouseId is required",
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Excel file is required",
      });
    }

    // Read Excel
    const workbook = xlsx.read(req.file.buffer, { type: "buffer" });
    const sheetName = workbook.SheetNames[0];
    const sheetData = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);

    if (!sheetData.length) {
      return res.status(400).json({
        success: false,
        message: "Excel file is empty",
      });
    }

    const rawMaterialIds = [
      ...new Set(sheetData.map((r) => r.rawMaterialId).filter(Boolean)),
    ];

    // 🔹 Fetch existing warehouse stock
    const existingStock = await prisma.warehouseStock.findMany({
      where: {
        warehouseId,
        rawMaterialId: {
          in: rawMaterialIds,
        },
      },
      select: {
        rawMaterialId: true,
      },
    });

    const existingStockIds = existingStock.map(
      (stock) => stock.rawMaterialId
    );

    // 🔹 Find missing rawMaterialIds (not present in warehouseStock)
    const missingRows = sheetData.filter(
      (row) => !existingStockIds.includes(row.rawMaterialId)
    );

    // 🔥 If missing found → generate Excel and return
    if (missingRows.length) {
      const missingSheet = xlsx.utils.json_to_sheet(missingRows);
      const missingWorkbook = xlsx.utils.book_new();
      xlsx.utils.book_append_sheet(
        missingWorkbook,
        missingSheet,
        "Missing_WarehouseStock"
      );

      const buffer = xlsx.write(missingWorkbook, {
        type: "buffer",
        bookType: "xlsx",
      });

      res.setHeader(
        "Content-Disposition",
        "attachment; filename=missing-warehouse-stock.xlsx"
      );
      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      );

      return res.status(200).send(buffer);
    }

    // 🔹 No missing → proceed with update
    const operations = sheetData.map((row) => {
      const { rawMaterialId, quantity, isUsed } = row;

      return prisma.warehouseStock.update({
        where: {
          warehouseId_rawMaterialId: {
            warehouseId,
            rawMaterialId,
          },
        },
        data: {
          quantity: Number(quantity) || 0,
          //isUsed: true,
        },
      });
    });

    await prisma.$transaction(operations);

    return res.status(200).json({
      success: true,
      message: "Warehouse stock updated successfully",
      updatedCount: operations.length,
    });
  } catch (error) {
    console.error("Excel warehouse stock update error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

const getCountries = async (req, res) => {
  try {
    const countryList = countries.map((c) => c.country);
    res.status(200).json({
      success: true,
      count: countryList.length,
      countries: countryList,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message
    })
  }
};

const getCurrencyByCountry = async (req, res) => {
  try {
    const selectedCountry = req.params.country.toUpperCase();
    const result = countries.find(
      (c) => c.country.toUpperCase() === selectedCountry
    );

    if (!result) {
      return res.status(404).json({
        success: false,
        message: `Country '${selectedCountry}' not found`,
      });
    }

    res.status(200).json({
      success: true,
      country: result.country,
      currency: result.currency,
    }); 
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message
    });
  }
};

const getCurrencies = async (req, res) => {
  try {
    const currencyList = countries.map((c) => c.currency);

    const uniqueCurrencies = [...new Set(currencyList)];

    res.status(200).json({
      success: true,
      count: uniqueCurrencies.length,
      currencies: uniqueCurrencies,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message
    });
  }
};

module.exports = {
  addRole,
  showRole,
  deleteRole,
  addItemRawMaterialFromExcel,
  deleteItemRawMaterialFromExcel,
  updateRawMaterialsUnitByExcel,
  importRawMaterialsByExcel,
  updateRawMaterialStockByExcel,
  upload,
  migrateServiceRecordJSON,
  fixInvalidJSON,
  addProduct,
  getProduct,
  deleteProduct,
  addProductItemMap,
  getItemsByProductId,
  deleteProductItemMap,
  getDefectiveItemsListByWarehouse,
  getItemType,
  addModel,
  showModel,
  getRawMaterialIdByName,
  updateRawMaterialFromExcel,
  updateRawMaterialUsageFromExcel,
  markCompanyOrVendorNotActive,
  createRawMaterial,
  createSystemItem,
  showUnit,
  syncRawMaterialsToWarehouses,
  syncWarehouseStock,
  exportRawMaterialsExcel,
  createItem,
  getItemById,
  updateItem,
  updateItemsFromExcel,
  addSystemOrder,
  increaseOrDecreaseSystemOrder,
  sendAllSystemStockShortageReport,
  updateWarehouseStockByExcel,
  getCountries,
  getCurrencyByCountry,
  getCurrencies
};
