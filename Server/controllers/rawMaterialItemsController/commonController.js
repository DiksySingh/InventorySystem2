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
        console.log(jsonData);

        let insertedCount = 0;

        for (const row of jsonData) {
            console.log(row);
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
  
        if (!name || isNaN(quantity)) {
          failedUpdates.push(row);
          continue;
        }
  
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

module.exports = {
    addRole,
    showRole, 
    deleteRole,
    addItemRawMaterialFromExcel,
    updateRawMaterialsUnitByExcel,
    importRawMaterialsByExcel,
    updateRawMaterialStockByExcel,
    upload 
};