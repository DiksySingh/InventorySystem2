const prisma = require("../../config/prismaClient");
const xlsx = require("xlsx");
const multer = require("multer");
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });
const WarehouseItems = require("../../models/serviceInventoryModels/warehouseItemsSchema");

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

    return res.status(200).json({
      success: true,
      message:
        product.length > 0 ? "Data Fetched Successfully" : "No Data Found",
      data: product,
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
    mappings.map((i) => data.push(i.item));

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
          itemName: "$items.itemName",
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
};
