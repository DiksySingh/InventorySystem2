const prisma = require("../../config/prismaClient");
const WarehouseItems = require("../../models/serviceInventoryModels/warehouseItemsSchema");
const axios = require("axios");

const getDefectiveItemsForWarehouse = async (req, res) => {
    try {
        const warehouseName = "Bhiwani"; // Example warehouse name, can be dynamic if needed

        const result = await WarehouseItems.aggregate([
            {
                $lookup: {
                    from: "inWarehouses", // Name of the Warehouse collection in MongoDB
                    localField: "warehouse",
                    foreignField: "_id",
                    as: "warehouseDetails",
                },
            },
            { $unwind: "$warehouseDetails" }, // Unwind warehouse details array
            { $match: { "warehouseDetails.warehouseName": warehouseName } }, // Match specific warehouse name
            { $unwind: "$items" }, // Unwind items array to process individual items
            {
                $group: {
                    _id: {
                        $cond: [
                            { $regexMatch: { input: "$items.itemName", regex: /motor/i } },
                            "motor",
                            {
                                $cond: [
                                    { $regexMatch: { input: "$items.itemName", regex: /pump/i } },
                                    "pump",
                                    {
                                        $cond: [
                                            { $regexMatch: { input: "$items.itemName", regex: /controller/i } },
                                            "controller",
                                            "others",
                                        ],
                                    },
                                ],
                            },
                        ],
                    },
                    totalDefective: { $sum: "$items.defective" }, // Sum defective items
                },
            },
            {
                $group: {
                    _id: null,
                    totalsByGroup: {
                        $push: {
                            item: {
                                $concat: [
                                    { $toUpper: { $substr: ["$_id", 0, 1] } }, // Capitalize first letter
                                    { $toLower: { $substr: ["$_id", 1, { $strLenCP: "$_id" }] } }, // Rest in lowercase
                                ],
                            },
                            defectiveCount: "$totalDefective",
                        },
                    },
                    overallTotal: { $sum: "$totalDefective" }, // Calculate overall defective count
                },
            },
            {
                $project: {
                    _id: 0,
                    totalsByGroup: 1,
                    overallTotal: 1,
                },
            },
        ]);

        // Handle case when no matching warehouse is found
        if (result.length === 0) {
            return res.status(404).json({
                success: false,
                message: `No defective items found for warehouse: ${warehouseName}`,
            });
        }

        return res.status(201).json({
            success: true,
            message: `Defective items for warehouse: ${warehouseName}`,
            data: result[0] || [], // Return the aggregated data
        });
    } catch (error) {
        console.error("Error fetching defective items:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch defective items",
            error: error.message,
        });
    }
};

const getDefectiveItemsListByWarehouse = async (req, res) => {
    try {
        const { itemName } = req.query; // Get warehouse and item names from query
        const warehouseName = "Bhiwani";
        if (!warehouseName || !itemName) {
            return res.status(400).json({
                success: false,
                message: "Please provide both warehouseName and itemName to filter by.",
            });
        }

        const items = await WarehouseItems.aggregate([
            // Lookup to get warehouse details based on warehouse ID
            {
                $lookup: {
                    from: "inWarehouses", // Collection name for warehouses in MongoDB
                    localField: "warehouse",
                    foreignField: "_id",
                    as: "warehouseDetails",
                },
            },
            { $unwind: "$warehouseDetails" }, // Unwind warehouse details to access fields
            {
                $match: {
                    "warehouseDetails.warehouseName": warehouseName, // Filter by specific warehouse name
                },
            },
            { $unwind: "$items" }, // Unwind items array to filter individual items
            {
                $match: {
                    "items.itemName": { $regex: itemName, $options: "i" }, // Case-insensitive match for item name
                },
            },
            {
                $project: {
                    itemName: "$items.itemName",
                    // quantity: "$items.quantity",
                    defective: "$items.defective",
                    // repaired: "$items.repaired",
                    // rejected: "$items.rejected",
                },
            },
        ]);

        if (items.length === 0) {
            return res.status(404).json({
                success: false,
                message: `No items found matching '${itemName}' in warehouse '${warehouseName}'.`,
            });
        }

        return res.status(201).json({
            success: true,
            message: `Items matching '${itemName}' in warehouse '${warehouseName}' found.`,
            data: items || [],
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

const addWarehouse = async (req, res) => {
    try {
        const { name, state } = req.body;

        if (!name || !state) {
            return res.status(400).json({
                success: false,
                message: "Name and state are required"
            });
        }

        const warehouseName = name.toLowerCase().trim();
        const warehouseState = state.toLowerCase().trim();

        // Case-insensitive check for existing warehouse
        const existingWarehouse = await prisma.$queryRaw`
            SELECT * FROM Warehouse
            WHERE LOWER(name) = LOWER(${warehouseName}) 
            AND LOWER(state) = LOWER(${warehouseState})
            LIMIT 1;
        `;

        if (existingWarehouse.length > 0) { // Check if an entry exists
            return res.status(400).json({
                success: false,
                message: "Warehouse with this name and state already exists"
            });
        }

        // Create new warehouse
        const newWarehouse = await prisma.warehouse.create({
            data: {
                name: name,
                state: state
            }
        });

        return res.status(201).json({
            success: true,
            message: "Warehouse added successfully",
            warehouse: newWarehouse
        });

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Internal Server Error",
            error: error.message
        });
    }
};

const showEmployees = async (req, res) => {
    try {
        const allEmployees = await prisma.user.findMany({
            select: {
                id: true,
                name: true,
                email: true,
                contact: true
            }
        });

        return res.status(201).json({
            success: true,
            message: "Data Fetched Successfully",
            data: allEmployees || []
        })

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Internal Server Error",
            error: error.message
        })
    }
};

const deactivateEmployee = async (req, res) => {
    try {
        const { empId } = req.query;
        if (!empId) {
            return res.status(400).json({
                success: false,
                message: "EmpId is required"
            });
        }

        const existingEmployee = await prisma.user.findUnique({
            where: {
                id: empId
            }
        });

        if (!existingEmployee) {
            return res.status(404).json({
                success: false,
                message: "Employee with empId doesn't exists"
            });
        }

        if (!existingEmployee.isActive) {
            return res.status(400).json({
                success: false,
                message: "Employee is already deactivated"
            });
        }

        const deactivateEmp = await prisma.user.update({
            where: {
                id: empId
            },
            data: {
                isActive: false
            }
        });

        return res.status(201).json({
            success: true,
            message: "Employee account deactivated successfully",
            data: deactivateEmp
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Internal Server Error",
            error: error.message
        });
    }
};

const activateEmployee = async (req, res) => {
    try {
        const { empId } = req.query;
        if (!empId) {
            return res.status(400).json({
                success: false,
                message: "EmpId is required"
            });
        }

        const existingEmployee = await prisma.user.findUnique({
            where: {
                id: empId
            }
        });

        if (!existingEmployee) {
            return res.status(404).json({
                success: false,
                message: "Employee with empId doesn't exists"
            });
        }

        if (existingEmployee.isActive) {
            return res.status(400).json({
                success: false,
                message: "Employee is already active"
            });
        }

        const activateEmp = await prisma.user.update({
            where: {
                id: empId
            },
            data: {
                isActive: true
            }
        });

        return res.status(201).json({
            success: true,
            message: "Employee account activated successfully",
            data: activateEmp
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Internal Server Error",
            error: error.message
        });
    }
};

const addItem = async (req, res) => {
    try {
        let { name } = req.body;

        // Validate input
        if (!name || typeof name !== "string" || name.trim() === "") {
            return res.status(400).json({
                success: false,
                message: "Invalid item name"
            });
        }

        name = name.trim(); // Trim only once

        // Check if item already exists
        const existingItem = await prisma.item.findUnique({
            where: { name }
        });

        if (existingItem) {
            return res.status(400).json({
                success: false,
                message: "Item Already Exists"
            });
        }

        // Create new item
        const newItem = await prisma.item.create({
            data: { name }
        });

        return res.status(201).json({
            success: true,
            message: "Item Added Successfully",
            data: newItem
        });

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Internal Server Error",
            error: error.message
        });
    }
};

const showItems = async (req, res) => {
    try {
        const allItems = await prisma.item.findMany({
            select: {
                id: true,
                name: true
            }
        });

        return res.status(201).json({
            success: true,
            message: "Items fetched successfully",
            data: allItems
        });

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Internal Server Error",
            error: error.message
        });
    }
};

const deleteItem = async (req, res) => {
    try {
        const { itemId } = req.query;
        if (!itemId) {
            return res.status(400).json({
                success: false,
                message: "ItemId is required"
            });
        }

        const deletedItem = await prisma.item.delete({
            where: { id: itemId },  // Ensure the itemId is cast to a number if it's an integer in your DB
        });

        return res.status(201).json({
            success: true,
            message: "Item deleted successfully",
            data: deletedItem
        });

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Internal Server Error",
            error: error.message
        })
    }
};

const addRawMaterial = async (req, res) => {
    try {
        const { rawMaterialName } = req.body;
        if (!rawMaterialName) {
            return res.status(400).json({
                success: false,
                message: "rawMaterialName is required"
            });
        }

        const name = rawMaterialName.trim(); // Trim only once

        // Check if item already exists
        const existingItem = await prisma.rawMaterial.findUnique({
            where: { name }
        });

        if (existingItem) {
            return res.status(400).json({
                success: false,
                message: "RawMaterial Already Exists"
            });
        }

        const addRawMaterial = await prisma.rawMaterial.create({
            data: {
                name: rawMaterialName,
                stock: 0
            }
        });

        return res.status(201).json({
            success: true,
            message: "Raw-Material Added Successfully",
            data: addRawMaterial
        });

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Internal Server Error",
            error: error.message
        })
    }
}

const showRawMaterials = async (req, res) => {
    try {
        const allRawMaterials = await prisma.rawMaterial.findMany({
            select: {
                id: true,
                name: true,
                stock: true
            }
        });

        return res.status(201).json({
            success: true,
            message: "Raw-Materials fetched successfully",
            data: allRawMaterials
        });

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Internal Server Error",
            error: error.message
        })
    }
}

const updateRawMaterialStock = async (req, res) => {
    const { rawMaterialId, userId, warehouseId, quantity, type } = req.body;

    try {
        if (!rawMaterialId || !quantity || !type) {
            return res.status(400).json({
                success: false,
                message: "rawMaterialId, quantity, and type are required.",
            });
        }

        const rawMaterial = await prisma.rawMaterial.findUnique({
            where: { id: rawMaterialId },
        });

        if (!rawMaterial) {
            return res.status(404).json({
                success: false,
                message: "Raw Material not found",
            });
        }

        // Calculate updated stock based on type ("IN" or "OUT")
        let updatedStock;
        if (type === "IN") {
            updatedStock = (rawMaterial.stock || 0) + quantity;
        } else if (type === "OUT") {
            if ((rawMaterial.stock || 0) < quantity) {
                return res.status(400).json({
                    success: false,
                    message: "Insufficient stock for this operation.",
                });
            }
            updatedStock = rawMaterial.stock - quantity;
        } else {
            return res.status(400).json({
                success: false,
                message: "Invalid type. It should be 'IN' or 'OUT'.",
            });
        }

        // Update the raw material's stock
        await prisma.rawMaterial.update({
            where: { id: rawMaterialId },
            data: { stock: updatedStock },
        });

        if (userId) {
            const userExists = await prisma.user.findUnique({ where: { id: userId } });
            if (!userExists) {
                return res.status(404).json({ success: false, message: "User not found" });
            }
        }

        // Create stock movement with nested relation syntax
        const stockMovement = await prisma.stockMovement.create({
            data: {
                rawMaterial: {
                    connect: { id: rawMaterialId }, // Connects to existing rawMaterial
                },
                user: userId
                    ? {
                        connect: { id: userId }, // Connects to existing user if provided
                    }
                    : undefined,
                warehouse: warehouseId
                    ? {
                        connect: { id: warehouseId }, // Connects to existing warehouse if provided
                    }
                    : undefined,
                quantity,
                type
            },
        });

        // Return success response
        return res.status(201).json({
            success: true,
            message: "Stock updated successfully and stock movement entry created.",
            updatedStock,
            stockMovement,
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Internal Server Error",
            error: error.message,
        });
    }
};


const deleteAllRawMaterials = async (req, res) => {
    try {
        await prisma.rawMaterial.deleteMany();  // Deletes all rows in the RawMaterial table

        return res.status(201).json({
            success: true,
            message: "All raw materials have been deleted successfully."
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Internal Server Error",
            error: error.message
        });
    }
};

const attachItemToRawMaterial = async (req, res) => {
    try {
        const { itemId, rawMaterialId, quantity } = req.body;

        // Validation to ensure required fields are provided
        if (!itemId || !rawMaterialId || quantity == null) {
            return res.status(400).json({
                success: false,
                message: "itemId, rawMaterialId, and quantity are required."
            });
        }

        // Check if the item and rawMaterial exist
        const itemExists = await prisma.item.findUnique({ where: { id: itemId } });
        const rawMaterialExists = await prisma.rawMaterial.findUnique({ where: { id: rawMaterialId } });

        if (!itemExists || !rawMaterialExists) {
            return res.status(404).json({
                success: false,
                message: "Item or Raw Material not found."
            });
        }

        // Create or update the ItemRawMaterial relationship
        const itemRawMaterial = await prisma.itemRawMaterial.upsert({
            where: { itemId_rawMaterialId: { itemId, rawMaterialId } },
            update: { quantity }, // Update quantity if the relation already exists
            create: { itemId, rawMaterialId, quantity }, // Create new relation if it doesn't exist
        });

        return res.status(201).json({
            success: true,
            message: "Item successfully attached to Raw Material.",
            data: itemRawMaterial,
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Internal Server Error",
            error: error.message,
        });
    }
};

const getItemsByName = async (req, res) => {
    try {
        const { searchQuery } = req.query;

        if (!searchQuery) {
            return res.status(400).json({
                success: false,
                message: "Search query is required.",
            });
        }

        const items = await prisma.item.findMany({
            where: {
                name: {
                    contains: searchQuery, // Partial match
                    //mode: "insensitive",   // Case-insensitive
                },
            },
            select: {
                id: true,
                name: true,
            },
        });

        if (!items.length) {
            return res.status(404).json({
                success: false,
                message: "No items found matching the search query.",
            });
        }

        return res.status(201).json({
            success: true,
            message: "Items fetched successfully.",
            data: items,
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Internal Server Error",
            error: error.message,
        });
    }
};

const getRawMaterialsByItemId = async (req, res) => {
    try {
        const { itemId } = req.query;

        if (!itemId) {
            return res.status(400).json({
                success: false,
                message: "itemId is required.",
            });
        }

        const rawMaterials = await prisma.itemRawMaterial.findMany({
            where: { itemId },
            select: {
                rawMaterial: {
                    select: { name: true },
                },
                quantity: true,
            },
        });

        if (!rawMaterials.length) {
            return res.status(404).json({
                success: false,
                message: "No raw materials found for the given item.",
            });
        }

        return res.status(201).json({
            success: true,
            message: "Raw materials fetched successfully for item.",
            data: rawMaterials,
        });
    } catch (error) {
        console.error("Error fetching raw materials:", error);
        return res.status(500).json({
            success: false,
            message: "Internal Server Error",
            error: error.message,
        });
    }
};

const addServiceRecord = async (req, res) => {
    try {
        const {
            item,
            subItem,
            quantity,
            serialNumber,
            faultAnalysis,
            isRepaired,
            repairedBy,
            remarks,
            repairedParts, // Array of objects: [{ rawMaterialId: "123", quantity: 2 }]
            userId,
        } = req.body;

        const serviceRecord = await prisma.serviceRecord.create({
            data: {
                item,
                subItem,
                quantity,
                serialNumber,
                faultAnalysis,
                isRepaired,
                repairedBy,
                remarks,
                repairedParts,
                userId,
            },
        });

        for (const part of repairedParts) {
            const { rawMaterialId, quantity } = part;

            await prisma.serviceUsage.create({
                data: {
                    serviceId: serviceRecord.id,
                    rawMaterialId,
                    quantityUsed: quantity,
                },
            });

            const rawMaterial = await prisma.rawMaterial.findUnique({
                where: { id: rawMaterialId },
            });

            if (rawMaterial) {
                if (isRepaired) {
                    await prisma.rawMaterial.update({
                        where: { id: rawMaterialId },
                        data: { stock: rawMaterial.stock - quantity },
                    });
                } else {
                    await prisma.rawMaterial.update({
                        where: { id: rawMaterialId },
                        data: { stock: rawMaterial.stock + quantity },
                    });
                }
            }
        }

        try {
            const response = await axios.post(`http://88.222.214.93:5000/common/update-item-defective?itemName=${subItem}&quantity=${quantity}&isRepaired=${isRepaired}`);
            console.log('API Response:', response.data); // Log the API response
        } catch (apiError) {
            console.error('Error calling defective stock API:', apiError.message);
        }

        // Return success response
        return res.status(201).json({
            success: true,
            message: 'Service record created successfully!',
            serviceRecord,
        });

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Failed to create service record',
            error: error.message,
        });
    }
};

const getItemRawMaterials = async (req, res) => {
    const { subItem } = req.body; // Get itemName from request body
  
    if (!subItem) {
      return res.status(400).json({ success: false, error: "Item name is required" });
    }
  
    try {
      // Extract the key name from subItem by taking the first part (before extra details)
      const mainName = subItem.split(" ").slice(0, 3).join(" "); // Use the first 2-3 words as a key part
  
      // Find the item that exactly matches the key part of the subItem
      const item = await prisma.item.findFirst({
        where: {
          name: mainName, // Exact match query
        },
      });
      console.log(item)
      if (!item) {
        return res.status(404).json({ success: false, message: "Item Not Found" });
      }
  
      // Fetch related raw materials if item is found
      const itemRawMaterials = await prisma.itemRawMaterial.findMany({
        where: {
          itemId: item.id,
        },
        include: {
          rawMaterial: true, // Include raw material details (name, etc.)
        },
      });
  
      // Format the response
      const result = itemRawMaterials.map((entry) => ({
        id: entry.rawMaterialId,
        name: entry.rawMaterial.name,
        quantity: entry.quantity,
      }));
  
      // Return the result
      return res.status(200).json({
        success: true,
        message: "Raw Material Fetched Successfully",
        data: result,
      });
    } catch (error) {
      console.error("Error fetching raw materials:", error);
      return res.status(500).json({
        success: false,
        message: "Internal Server Error",
        error: error.message,
      });
    }
};

module.exports = {
    showEmployees,
    deactivateEmployee,
    activateEmployee,
    addItem,
    addRawMaterial,
    showItems,
    showRawMaterials,
    deleteItem,
    deleteAllRawMaterials,
    addWarehouse,
    updateRawMaterialStock,
    getItemsByName,
    getRawMaterialsByItemId,
    getDefectiveItemsForWarehouse,
    getDefectiveItemsListByWarehouse,
    addServiceRecord,
    getItemRawMaterials
};