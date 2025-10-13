const prisma = require("../../config/prismaClient");
const xlsx = require('xlsx');
const multer = require('multer');
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

const addRole = async(req, res) => {
    try {
        const {name} = req.body;
        if(!name) {
            return res.status(400).json({
                success: false,
                message: "Role Name Is Required"
            });
        }

        const existingRole = await prisma.role.findUnique({
            where: { name }
        });
        if(existingRole) {
            return res.status(400).json({
                success: false,
                message: "Role Already Exists"
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
            error: error.message
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
                message: "Please upload an Excel file."
            });
        }

        // Read Excel file from buffer using xlsx
        const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
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

        res.status(200).json({ message: "RawMaterial units updated successfully", updatedCount });

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
        return res.status(400).json({ success: false, message: "Excel file is required." });
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
        OR: [
          { faultAnalysis: { not: null } },
          { initialRCA: { not: null } }
        ]
      }
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
            .replace(/[\n\r]+/g, ' ')
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
            .replace(/[\n\r]+/g, ' ')
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

    console.log("✅ Migration complete. All strings converted to JSON arrays, nulls preserved.");
    return res.status(200).json({
        success: true,
        message: "Success"
    });
  } catch (error) {
    console.error("Error migrating ServiceRecord JSON:", error);
  } finally {
    await prisma.$disconnect();
  }
}

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
            .map(s => s.trim())
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
            .map(s => s.trim())
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
};