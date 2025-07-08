const prisma = require("../../config/prismaClient");
const WarehouseItems = require("../../models/serviceInventoryModels/warehouseItemsSchema");
const axios = require("axios");
const moment = require("moment");
const mongoose = require("mongoose");

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
        if (!name || name.trim() === "") {
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
        const { rawMaterialName, unit } = req.body;
        if (!rawMaterialName || !unit) {
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
                stock: 0,
                unit: unit
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

// const showRawMaterials = async (req, res) => {
//     try {
//         const allRawMaterials = await prisma.rawMaterial.findMany({
//             select: {
//                 id: true,
//                 name: true,
//                 stock: true
//             }
//         });

//         return res.status(201).json({
//             success: true,
//             message: "Raw-Materials fetched successfully",
//             data: allRawMaterials
//         });

//     } catch (error) {
//         return res.status(500).json({
//             success: false,
//             message: "Internal Server Error",
//             error: error.message
//         })
//     }
// }

// const showRawMaterials = async (req, res) => {
//     try {
//         // Get all raw materials
//         const allRawMaterials = await prisma.rawMaterial.findMany({
//             select: {
//                 id: true,
//                 name: true,
//                 stock: true
//             }
//         });

//         // For each raw material, find the max quantity used in any item
//         const enrichedRawMaterials = await Promise.all(
//             allRawMaterials.map(async (rm) => {
//                 const maxUsed = await prisma.itemRawMaterial.aggregate({
//                     where: { rawMaterialId: rm.id },
//                     _max: {
//                         quantity: true
//                     }
//                 });

//                 const maxQuantity = maxUsed._max.quantity || 0;
//                 const isLow = maxQuantity === 0 ? false : rm.stock < maxQuantity * 50;

//                 return {
//                     ...rm,
//                     stockIsLow: isLow
//                 };
//             })
//         );

//         enrichedRawMaterials.sort((a, b) => {
//             if (a.stockIsLow === b.stockIsLow) return 0;
//             return a.stockIsLow ? -1 : 1;
//         });

//         return res.status(200).json({
//             success: true,
//             message: "Raw-Materials fetched successfully",
//             data: enrichedRawMaterials
//         });

//     } catch (error) {
//         return res.status(500).json({
//             success: false,
//             message: "Internal Server Error",
//             error: error.message
//         });
//     }
// };

// const showRawMaterials = async (req, res) => {
//     try {
//         const allRawMaterials = await prisma.rawMaterial.findMany({
//             select: {
//                 id: true,
//                 name: true,
//                 stock: true
//             }
//         });

//         const enrichedRawMaterials = await Promise.all(
//             allRawMaterials.map(async (rm) => {
//                 const maxUsed = await prisma.itemRawMaterial.aggregate({
//                     where: { rawMaterialId: rm.id },
//                     _max: { quantity: true }
//                 });

//                 const maxQuantity = maxUsed._max.quantity || 0;
//                 const isLow = maxQuantity === 0 ? false : rm.stock < maxQuantity * 50;

//                 return {
//                     ...rm,
//                     stockIsLow: isLow
//                 };
//             })
//         );

//         enrichedRawMaterials.sort((a, b) => {
//             if (a.stockIsLow && b.stockIsLow) {
//                 return a.stock - b.stock;
//             }
//             if (a.stockIsLow) return -1;
//             if (b.stockIsLow) return 1;
//             return 0;
//         });

//         return res.status(200).json({
//             success: true,
//             message: "Raw-Materials fetched successfully",
//             data: enrichedRawMaterials
//         });

//     } catch (error) {
//         return res.status(500).json({
//             success: false,
//             message: "Internal Server Error",
//             error: error.message
//         });
//     }
// };

const showRawMaterials = async (req, res) => {
    try {
        const { itemId } = req.query;

        if (!itemId) {
            return res.status(400).json({
                success: false,
                message: "ItemId is required"
            });
        }

        // Step 1: Get raw materials attached to this itemId
        const rawMaterialsForItem = await prisma.itemRawMaterial.findMany({
            where: { itemId },
            select: {
                rawMaterial: {
                    select: {
                        id: true,
                        name: true,
                        stock: true,
                        unit: true
                    }
                },
                quantity: true
            }
        });

        // Step 2: Enrich each raw material with stock health
        const enrichedRawMaterials = await Promise.all(
            rawMaterialsForItem.map(async (entry) => {
                const { rawMaterial, quantity } = entry;

                const maxUsed = await prisma.itemRawMaterial.aggregate({
                    where: { rawMaterialId: rawMaterial.id },
                    _max: { quantity: true }
                });

                const maxQuantity = maxUsed._max.quantity || 0;
                const stockIsLow = maxQuantity === 0 ? false : rawMaterial.stock < maxQuantity * 50;

                return {
                    id: rawMaterial.id,
                    name: rawMaterial.name,
                    stock: rawMaterial.stock,
                    unit: rawMaterial.unit,
                    quantityUsedInThisItem: quantity,
                    stockIsLow
                };
            })
        );

        // Step 3: Sort: low stock first, then all in ascending order of stock
        enrichedRawMaterials.sort((a, b) => {
            if (a.stockIsLow !== b.stockIsLow) {
                return a.stockIsLow ? -1 : 1;
            }
            return a.stock - b.stock;
        });

        // Step 4: Send response
        return res.status(200).json({
            success: true,
            message: "Raw materials fetched successfully for this item",
            data: enrichedRawMaterials
        });

    } catch (error) {
        console.error("Error in showRawMaterials:", error);
        return res.status(500).json({
            success: false,
            message: "Internal Server Error",
            error: error.message
        });
    }
};

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
                unit: rawMaterial.unit,
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
                    select: { id: true, name: true, unit: true },
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

// const addServiceRecord = async (req, res) => {
//     try {
//         const {
//             item,
//             subItem,
//             quantity,
//             serialNumber,
//             faultAnalysis,
//             isRepaired,
//             repairedRejectedBy,
//             remarks,
//             repairedParts, // Array of objects: [{ rawMaterialId: "123", quantity: 2, unit: "pcs" }]
//             userId,
//         } = req.body;

//         if (
//             !item ||
//             !subItem ||
//             !quantity ||
//             !serialNumber ||
//             !faultAnalysis ||
//             !repairedRejectedBy ||
//             !remarks ||
//             !repairedParts ||
//             !userId
//         ) {
//             return res.status(400).json({
//                 success: false,
//                 message: "All fields are required"
//             });
//         }

//         for (const part of repairedParts) {
//             const { rawMaterialId, quantity } = part;
//             const rawMaterial = await prisma.rawMaterial.findUnique({
//                 where: { id: rawMaterialId },
//             });

//             if (!rawMaterial) {
//                 return res.status(404).json({
//                     success: false,
//                     message: `Raw Material with ID ${rawMaterial.name} not found`,
//                 });
//             }
//             if (isRepaired) {
//                 if (rawMaterial.stock < quantity) {
//                     return res.status(400).json({
//                         success: false,
//                         message: `Not enough stock for Raw Material ID ${rawMaterial.name}. Available: ${rawMaterial.stock}, Required: ${quantity}`,
//                     });
//                 }
//             }
//         }

//         const serviceRecord = await prisma.serviceRecord.create({
//             data: {
//                 item,
//                 subItem,
//                 quantity,
//                 serialNumber,
//                 faultAnalysis,
//                 isRepaired,
//                 repairedRejectedBy,
//                 remarks,
//                 repairedParts,
//                 userId,
//             },
//         });

//         for (const part of repairedParts) {
//             const { rawMaterialId, quantity, unit } = part;

//             const rawMaterial = await prisma.rawMaterial.findUnique({
//                 where: { id: rawMaterialId },
//             });

//             // if (!rawMaterial) {
//             //     return res.status(404).json({
//             //         success: false,
//             //         message: `Raw Material with ID ${rawMaterial.name} not found`,
//             //     });
//             // }

//             if (isRepaired) {
//                 // if (rawMaterial.stock < quantity) {
//                 //     return res.status(400).json({
//                 //         success: false,
//                 //         message: `Not enough stock for Raw Material ID ${rawMaterial.name}. Available: ${rawMaterial.stock}, Required: ${quantity}`,
//                 //     });
//                 // }
//                 await prisma.rawMaterial.update({
//                     where: { id: rawMaterialId },
//                     data: { stock: rawMaterial.stock - quantity },
//                 });
//             } else {
//                 await prisma.rawMaterial.update({
//                     where: { id: rawMaterialId },
//                     data: { stock: rawMaterial.stock + quantity },
//                 });
//             }

//             await prisma.serviceUsage.create({
//                 data: {
//                     serviceId: serviceRecord.id,
//                     rawMaterialId,
//                     quantityUsed: quantity,
//                     unit: unit
//                 },
//             });
//         }

//         try {
//             const response = await axios.post(`http://88.222.214.93:5000/common/update-item-defective?itemName=${subItem}&quantity=${quantity}&isRepaired=${isRepaired}`);
//             console.log('API Response:', response.data);
//         } catch (apiError) {
//             console.error('Error calling defective stock API:', apiError.message);
//         }

//         // Return success response
//         return res.status(201).json({
//             success: true,
//             message: 'Service record created successfully!',
//             serviceRecord,
//         });

//     } catch (error) {
//         return res.status(500).json({
//             success: false,
//             message: 'Failed to create service record',
//             error: error.message,
//         });
//     }
// };

// const addServiceRecord = async (req, res) => {
//     try {
//         const {
//             item,
//             subItem,
//             quantity,
//             serialNumber,
//             faultAnalysis,
//             isRepaired,
//             repairedRejectedBy,
//             remarks,
//             repairedParts, // Array of objects: [{ rawMaterialId: "123", quantity: 2, unit: "pcs" }]
//             userId,
//         } = req.body;

//         // Basic validation
//         if (
//             !item ||
//             !subItem ||
//             !quantity ||
//             !serialNumber ||
//             !faultAnalysis ||
//             !repairedRejectedBy ||
//             !remarks ||
//             !Array.isArray(repairedParts) ||
//             repairedParts.length === 0 ||
//             !userId
//         ) {
//             return res.status(400).json({
//                 success: false,
//                 message: "All fields are required",
//             });
//         }

//         const rawMaterialMap = {};

//         for (const part of repairedParts) {
//             const { rawMaterialId, quantity, unit } = part;

//             if (!rawMaterialMap[rawMaterialId]) {
//                 const rawMaterial = await prisma.rawMaterial.findUnique({
//                     where: { id: rawMaterialId },
//                 });

//                 if (!rawMaterial) {
//                     return res.status(404).json({
//                         success: false,
//                         message: `Raw Material - ${rawMaterial.name} not found`,
//                     });
//                 }

//                 rawMaterialMap[rawMaterialId] = rawMaterial;
//             }

//             const rawMaterial = rawMaterialMap[rawMaterialId];

//             // ✅ Check unit match
//             if (rawMaterial.unit !== unit) {
//                 return res.status(400).json({
//                     success: false,
//                     message: `Unit mismatch for ${rawMaterial.name}. Expected: ${rawMaterial.unit}, Provided: ${unit}`,
//                 });
//             }

//             // ✅ Check stock if repaired
//             if (isRepaired && rawMaterial.stock < quantity) {
//                 return res.status(400).json({
//                     success: false,
//                     message: `Not enough stock for ${rawMaterial.name}. Available: ${rawMaterial.stock}, Required: ${quantity}`,
//                 });
//             }
//         }

//         // ✅ Create service record
//         const serviceRecord = await prisma.serviceRecord.create({
//             data: {
//                 item,
//                 subItem,
//                 quantity,
//                 serialNumber,
//                 faultAnalysis,
//                 isRepaired,
//                 repairedRejectedBy,
//                 remarks,
//                 repairedParts,
//                 userId,
//             },
//         });

//         // ✅ Update stock and log service usage
//         for (const part of repairedParts) {
//             const { rawMaterialId, quantity, unit } = part;
//             const rawMaterial = rawMaterialMap[rawMaterialId];

//             const updatedStock = isRepaired
//                 ? rawMaterial.stock - quantity
//                 : rawMaterial.stock + quantity;

//             await prisma.rawMaterial.update({
//                 where: { id: rawMaterialId },
//                 data: { stock: updatedStock },
//             });

//             await prisma.serviceUsage.create({
//                 data: {
//                     serviceId: serviceRecord.id,
//                     rawMaterialId,
//                     quantityUsed: quantity,
//                     unit: unit,
//                 },
//             });
//         }

//         // ✅ Call external API
//         try {
//             const response = await axios.post(
//                 `http://88.222.214.93:5000/common/update-item-defective?itemName=${subItem}&quantity=${quantity}&isRepaired=${isRepaired}`
//             );
//             console.log("API Response:", response.data);
//         } catch (apiError) {
//             console.error("Error calling defective stock API:", apiError.message);
//         }

//         // ✅ Success Response
//         return res.status(201).json({
//             success: true,
//             message: "Service record created successfully!",
//             serviceRecord,
//         });

//     } catch (error) {
//         console.error("Error adding service record:", error);
//         return res.status(500).json({
//             success: false,
//             message: "Failed to create service record",
//             error: error.message,
//         });
//     }
// };

const  addServiceRecord = async (req, res) => {
    try {
        const {
            item,
            subItem,
            quantity,
            serialNumber,
            faultAnalysis,
            isRepaired,
            repairedRejectedBy,
            remarks,
            repairedParts, // Array of objects: [{ rawMaterialId: "123", quantity: 2, unit: "pcs" }]
            farmerSaralId,
            userId,
        } = req.body;

        // ✅ Basic validation
        if (
            !item || !subItem || !quantity || !serialNumber || !faultAnalysis ||
            !repairedRejectedBy || !remarks || !farmerSaralId || !Array.isArray(repairedParts) ||
            repairedParts.length === 0 || !userId
        ) {
            return res.status(400).json({
                success: false,
                message: "All fields are required",
            });
        }

        const rawMaterialMap = {};
        const insufficientStock = [];

        // ✅ Check unit and stock for all raw materials before proceeding
        for (const part of repairedParts) {
            const { rawMaterialId, quantity, unit } = part;

            if (!rawMaterialMap[rawMaterialId]) {
                const rawMaterial = await prisma.rawMaterial.findUnique({
                    where: { id: rawMaterialId },
                });

                if (!rawMaterial) {
                    return res.status(404).json({
                        success: false,
                        message: `Raw Material with ID ${rawMaterialId} not found`,
                    });
                }

                rawMaterialMap[rawMaterialId] = rawMaterial;
            }

            const rawMaterial = rawMaterialMap[rawMaterialId];

            // ✅ Unit check
            if (rawMaterial.unit !== unit) {
                return res.status(400).json({
                    success: false,
                    message: `Unit mismatch for ${rawMaterial.name}. Expected: ${rawMaterial.unit}, Provided: ${unit}`,
                });
            }

            // ✅ Stock check (only if item is being repaired)
            if (isRepaired && rawMaterial.stock < quantity) {
                insufficientStock.push({
                    name: rawMaterial.name,
                    available: rawMaterial.stock,
                    required: quantity
                });
            }
        }

        // ✅ If any stock is insufficient, abort and notify
        if (insufficientStock.length > 0) {
            console.error("Insufficient stock for raw materials:", insufficientStock);
            return res.status(400).json({
                success: false,
                message: `Insufficient stock for one or more raw materials. Details: ${insufficientStock} `,
                insufficientStock
            });
        }

        // ✅ Proceed to create service record
        const serviceRecord = await prisma.serviceRecord.create({
            data: {
                item,
                subItem,
                quantity,
                serialNumber,
                faultAnalysis,
                isRepaired,
                repairedRejectedBy,
                remarks,
                farmerSaralId,
                repairedParts,
                userId,
            },
        });

        // ✅ Update stock and log service usage
        for (const part of repairedParts) {
            const { rawMaterialId, quantity, unit } = part;
            const rawMaterial = rawMaterialMap[rawMaterialId];

            let updatedStock = rawMaterial.stock;

            if (isRepaired) {
                updatedStock = rawMaterial.stock - quantity;
            } else {
                updatedStock = rawMaterial.stock + quantity;
            }

            await prisma.rawMaterial.update({
                where: { id: rawMaterialId },
                data: { stock: updatedStock },
            });

            await prisma.serviceUsage.create({
                data: {
                    serviceId: serviceRecord.id,
                    rawMaterialId,
                    quantityUsed: quantity,
                    unit: unit,
                },
            });
        }

        // ✅ Call external API (non-blocking, errors handled)
        try {
            const response = await axios.post(
                `http://88.222.214.93:5000/common/update-item-defective?itemName=${subItem}&quantity=${quantity}&isRepaired=${isRepaired}`
            );
            console.log("API Response:", response.data);
        } catch (apiError) {
            console.error("Error calling defective stock API:", apiError.message);
        }

        // ✅ Final success response
        return res.status(201).json({
            success: true,
            message: "Service record created successfully!",
            serviceRecord,
        });

    } catch (error) {
        console.error("Error adding service record:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to create service record",
            error: error.message,
        });
    }
};


// const getItemRawMaterials = async (req, res) => {
//     const { subItem } = req.query;
//     console.log(subItem);
//     if (!subItem) {
//         return res.status(400).json({ success: false, error: "Item name is required" });
//     }

//     try {
//         const allItems = await prisma.item.findMany();
//         const lowerSubItem = subItem.toLowerCase();

//         // Try to find closest match manually
//         const matchedItem = allItems.find(item => {
//             const name = item.name.toLowerCase();
//             return lowerSubItem.includes(name) || name.includes(lowerSubItem);
//         });
//         console.log(matchedItem);


//         if (!matchedItem) {
//             return res.status(404).json({ success: false, message: "Item Not Found" });
//         }

//         const itemRawMaterials = await prisma.itemRawMaterial.findMany({
//             where: {
//                 itemId: matchedItem.id,
//             },
//             include: {
//                 rawMaterial: true,
//             },
//         });
//         console.log(itemRawMaterials);
//         const result = itemRawMaterials.map((entry) => ({
//             id: entry.rawMaterialId,
//             name: entry.rawMaterial.name,
//             quantity: entry.quantity,
//         }));

//         return res.status(200).json({
//             success: true,
//             message: "Raw Material Fetched Successfully",
//             data: result,
//         });

//     } catch (error) {
//         console.error("Error fetching raw materials:", error);
//         return res.status(500).json({
//             success: false,
//             message: "Internal Server Error",
//             error: error.message,
//         });
//     }
// };

const getItemRawMaterials = async (req, res) => {
    const { subItem } = req.query;

    if (!subItem) {
        return res.status(400).json({ success: false, error: "Item name is required" });
    }

    try {
        const keyword = subItem.toLowerCase().split(" ")[0]; // Extract keyword like "MOTOR"

        // Fetch all items
        const allItems = await prisma.item.findMany();

        // Filter items that contain the keyword
        const matchedItems = allItems.filter(item =>
            item.name.toLowerCase().includes(keyword)
        );

        if (matchedItems.length === 0) {
            return res.status(404).json({ success: false, message: "No matching items found" });
        }

        const rawMaterialMap = new Map();

        for (const item of matchedItems) {
            const itemRawMaterials = await prisma.itemRawMaterial.findMany({
                where: {
                    itemId: item.id,
                },
                include: {
                    rawMaterial: true,
                },
            });

            for (const entry of itemRawMaterials) {
                const id = entry.rawMaterialId;

                // Avoid duplicates
                if (!rawMaterialMap.has(id)) {
                    rawMaterialMap.set(id, {
                        id,
                        name: entry.rawMaterial.name,
                        quantity: entry.quantity,
                    });
                }
            }
        }

        const result = Array.from(rawMaterialMap.values());

        return res.status(200).json({
            success: true,
            message: "Unique Raw Materials Fetched Successfully",
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

const getRepairedServiceRecords = async (req, res) => {
    try {
        // Fetch service records based on isRepaired filter and sort by servicedAt
        const serviceRecords = await prisma.serviceRecord.findMany({
            where: { isRepaired: true },
            orderBy: { servicedAt: "desc" },
        });

        const result = await Promise.all(
            serviceRecords.map(async (record) => {
                // Handle both string and object cases for `repairedParts`
                const repairedParts = Array.isArray(record.repairedParts)
                    ? record.repairedParts // Already parsed (if it's an object/array)
                    : JSON.parse(record.repairedParts || "[]"); // Parse if it's a JSON string

                const rawMaterialDetails = await Promise.all(
                    repairedParts.map(async (part) => {
                        const rawMaterial = await prisma.rawMaterial.findUnique({
                            where: { id: part.rawMaterialId },
                        });
                        return {
                            rawMaterialId: part.rawMaterialId,
                            rawMaterialName: rawMaterial?.name || "Unknown",
                            quantity: part.quantity,
                            unit: part.unit
                        };
                    })
                );

                return {
                    ...record,
                    repairedParts: rawMaterialDetails,
                };
            })
        );

        res.status(200).json({
            success: true,
            message: `Repaired Service Records Fetched Successfully`,
            data: result,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Internal Server Error",
            error: error.message,
        });
    }
};

const getRejectedServiceRecords = async (req, res) => {
    try {
        // Fetch service records based on isRepaired filter and sort by servicedAt
        const serviceRecords = await prisma.serviceRecord.findMany({
            where: { isRepaired: false },
            orderBy: { servicedAt: "desc" },
        });

        const result = await Promise.all(
            serviceRecords.map(async (record) => {
                // Handle both string and object cases for `repairedParts`
                const repairedParts = Array.isArray(record.repairedParts)
                    ? record.repairedParts // Already parsed (if it's an object/array)
                    : JSON.parse(record.repairedParts || "[]"); // Parse if it's a JSON string

                const rawMaterialDetails = await Promise.all(
                    repairedParts.map(async (part) => {
                        const rawMaterial = await prisma.rawMaterial.findUnique({
                            where: { id: part.rawMaterialId },
                        });
                        return {
                            rawMaterialId: part.rawMaterialId,
                            rawMaterialName: rawMaterial?.name || "Unknown",
                            quantity: part.quantity,
                            unit: part.unit
                        };
                    })
                );

                return {
                    ...record,
                    repairedParts: rawMaterialDetails,
                };
            })
        );

        res.status(200).json({
            success: true,
            message: `Rejected Service Records Fetched Successfully`,
            data: result,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Internal Server Error",
            error: error.message,
        });
    }
};

const addUnit = async (req, res) => {
    try {
        const { name } = req.body;
        if (!name) {
            return res.status(400).json({
                success: false,
                message: "All fields are required"
            });
        }


        const unitName = name.trim(); // Trim only once

        // Check if item already exists
        const existingUnit = await prisma.unit.findUnique({
            where: { name: unitName }
        });

        if (existingUnit) {
            return res.status(400).json({
                success: false,
                message: "Unit Already Exists"
            });
        }

        const addUnit = await prisma.unit.create({
            data: {
                name: name
            }
        });

        res.status(200).json({
            success: true,
            message: `Unit Added Successfully`,
            data: addUnit,
        });

    } catch (error) {
        res.status(500).json({
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
            }
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

const updateItemRawMaterial = async (req, res) => {
    const { itemId, rawMaterialId, quantity, name } = req.body;

    if (!itemId || !rawMaterialId) {
        return res.status(400).json({
            success: false,
            message: "itemId and rawMaterialId are required",
        });
    }

    try {
        const updateData = {
            updatedBy: req.user.id,
        };
        
        // Check if the composite entry exists
        const existing = await prisma.itemRawMaterial.findUnique({
            where: {
                itemId_rawMaterialId: {
                    itemId,
                    rawMaterialId,
                },
            },
        });

        if (!existing) {
            return res.status(404).json({
                success: false,
                message: "Item-RawMaterial link not found",
            });
        }

        // Update RawMaterial name if provided
        if (name) {
            await prisma.rawMaterial.update({
                where: { id: rawMaterialId },
                data: { name },
            });
        }

        // Update quantity if valid
        if (quantity !== undefined && quantity !== null && !isNaN(quantity)) {
            updateData.quantity = parseFloat(quantity);
        }

        // Update itemRawMaterial link
        await prisma.itemRawMaterial.update({
            where: {
                itemId_rawMaterialId: {
                    itemId,
                    rawMaterialId,
                },
            },
            data: updateData,
        });
        
        return res.status(200).json({
            success: true,
            message: "Raw Material and/or Quantity updated successfully",
        });
    } catch (error) {
        console.error("Update Error:", error);
        return res.status(500).json({
            success: false,
            message: "Internal Server Error",
            error: error.message,
        });
    }
};


const deleteItemRawMaterial = async (req, res) => {
    const { itemId, rawMaterialId } = req.body;

    if (!itemId || !rawMaterialId) {
        return res.status(400).json({
            success: false,
            message: "itemId and rawMaterialId are required to delete the row",
        });
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

        return res.status(200).json({
            success: true,
            message: "ItemRawMaterial row deleted successfully",
        });
    } catch (error) {
        console.error("Delete Error:", error);
        return res.status(500).json({
            success: false,
            message: "Internal Server Error",
            error: error.message,
        });
    }
};

// const produceNewItem = async (req, res) => {
//     try {
//         const { itemId, subItem, quantityProduced, userId } = req.body;

//         const itemRawMaterials = await prisma.itemRawMaterial.findMany({
//             where: { itemId },
//             include: {
//                 rawMaterial: true
//             }
//         });

//         if (!itemRawMaterials.length) {
//             return res.status(404).json({ success: false, message: 'No raw materials linked to this item.' });
//         }

//         // 🛑 Step 1: Check stock availability before proceeding
//         const insufficientMaterials = itemRawMaterials.filter(rm => {
//             const requiredQty = (rm.quantity || 0) * quantityProduced;
//             return (rm.rawMaterial?.stock ?? 0) < requiredQty;
//         });

//         if (insufficientMaterials.length > 0) {
//             const message = insufficientMaterials.map(rm =>
//                 `Insufficient stock for ${rm.rawMaterial?.name ?? 'Unknown Material'} (required: ${(rm.quantity || 0) * quantityProduced}, available: ${rm.rawMaterial?.stock ?? 0})`
//             );
//             return res.status(400).json({
//                 success: false,
//                 message: "Not enough raw material to produce item.",
//                 details: message
//             });
//         }

//         const timestamp = new Date();
//         const stockUpdates = [];
//         const manufacturingUsages = [];

//         for (const rm of itemRawMaterials) {
//             const totalUsed = (rm.quantity || 0) * quantityProduced;

//             stockUpdates.push(
//                 prisma.rawMaterial.update({
//                     where: { id: rm.rawMaterialId },
//                     data: {
//                         stock: { decrement: totalUsed }
//                     }
//                 })
//             );

//             manufacturingUsages.push(
//                 prisma.manufacturingUsage.create({
//                     data: {
//                         itemId,
//                         rawMaterialId: rm.rawMaterialId,
//                         quantityUsed: totalUsed,
//                         unit: rm.rawMaterial?.unit ?? null,
//                         manufacturingDate: timestamp
//                     }
//                 })
//             );
//         }

//         const warehouseId = "67446a8b27dae6f7f4d985dd";
//         const warehouseItemsData = await WarehouseItems.findOne({ warehouse: warehouseId });

//         if (!warehouseItemsData) {
//             return res.status(404).json({
//                 success: false,
//                 message: "Warehouse Items Data Not Found",
//             });
//         }

//         const itemIndex = warehouseItemsData.items.findIndex((item) => item.itemName === subItem);

//         if (itemIndex === -1) {
//             return res.status(404).json({
//                 success: false,
//                 message: "Item Not Found In Warehouse",
//             });
//         }

//         const itemToUpdate = warehouseItemsData.items[itemIndex];
//         const quantityToUpdate = parseInt(quantityProduced);
//         itemToUpdate.newStock += quantityToUpdate;
//         await warehouseItemsData.save();

//         await prisma.$transaction([
//             ...stockUpdates,
//             ...manufacturingUsages,
//             prisma.productionLog.create({
//                 data: {
//                     item: { connect: { id: itemId } },
//                     subItem,
//                     quantityProduced,
//                     manufacturingDate: timestamp,
//                     user: { connect: { id: userId } }
//                 }
//             })
//         ]);

//         return res.status(201).json({
//             success: true,
//             message: `Produced ${subItem}: ${quantityProduced} and updated warehouse stock.`
//         });
//     } catch (error) {
//         return res.status(500).json({
//             success: false,
//             message: "Internal Server Error",
//             error: error.message
//         });
//     }
// };

const produceNewItem = async (req, res) => {
    const session = await mongoose.startSession();
    await session.startTransaction();

    try {
        const { itemId, subItem, quantityProduced, userId } = req.body;

        const itemRawMaterials = await prisma.itemRawMaterial.findMany({
            where: { itemId },
            include: { rawMaterial: true }
        });

        if (!itemRawMaterials.length) {
            await session.abortTransaction();
            session.endSession();
            return res.status(404).json({ success: false, message: 'No raw materials linked to this item.' });
        }

        const insufficientMaterials = itemRawMaterials.filter(rm => {
            const requiredQty = (rm.quantity || 0) * quantityProduced;
            return (rm.rawMaterial?.stock ?? 0) < requiredQty;
        });

        if (insufficientMaterials.length > 0) {
            const message = insufficientMaterials.map(rm =>
                `Insufficient stock for ${rm.rawMaterial?.name ?? 'Unknown Material'} (required: ${(rm.quantity || 0) * quantityProduced}, available: ${rm.rawMaterial?.stock ?? 0})`
            );
            await session.abortTransaction();
            session.endSession();
            return res.status(400).json({
                success: false,
                message: "Not enough raw material to produce item.",
                details: message
            });
        }

        const timestamp = new Date();
        const stockUpdates = [];
        const manufacturingUsages = [];

        for (const rm of itemRawMaterials) {
            const totalUsed = (rm.quantity || 0) * quantityProduced;

            stockUpdates.push(
                prisma.rawMaterial.update({
                    where: { id: rm.rawMaterialId },
                    data: {
                        stock: { decrement: totalUsed }
                    }
                })
            );

            manufacturingUsages.push(
                prisma.manufacturingUsage.create({
                    data: {
                        itemId,
                        rawMaterialId: rm.rawMaterialId,
                        quantityUsed: totalUsed,
                        unit: rm.rawMaterial?.unit ?? null,
                        manufacturingDate: timestamp
                    }
                })
            );
        }

        const warehouseId = "67446a8b27dae6f7f4d985dd";
        const warehouseItemsData = await WarehouseItems.findOne({ warehouse: warehouseId }).session(session);
        console.log(warehouseItemsData);
        if (!warehouseItemsData) {
            await session.abortTransaction();
            session.endSession();
            return res.status(404).json({
                success: false,
                message: "Warehouse Items Data Not Found",
            });
        }

        // ✅ Using find() instead of findIndex()
        const itemToUpdate = warehouseItemsData.items.find(item => item.itemName === subItem);
        console.log(itemToUpdate);
        if (!itemToUpdate) {
            await session.abortTransaction();
            session.endSession();
            return res.status(404).json({
                success: false,
                message: "Item Not Found In Warehouse",
            });
        }

        itemToUpdate.newStock += parseInt(quantityProduced);
        await warehouseItemsData.save({ session });

        // 🔒 Prisma transaction execution
        await prisma.$transaction([
            ...stockUpdates,
            ...manufacturingUsages,
            prisma.productionLog.create({
                data: {
                    item: { connect: { id: itemId } },
                    subItem,
                    quantityProduced,
                    manufacturingDate: timestamp,
                    user: { connect: { id: userId } }
                }
            })
        ]);

        await session.commitTransaction();
        session.endSession();

        return res.status(201).json({
            success: true,
            message: `Produced ${subItem}: ${quantityProduced} and updated warehouse stock.`
        });

    } catch (error) {
        if (session.inTransaction()) {
            await session.abortTransaction();
        }
        session.endSession();

        return res.status(500).json({
            success: false,
            message: "Internal Server Error",
            error: error.message
        });
    }
};

// const getItemsProducibleCount = async (req, res) => {
//     try {
//         const items = await prisma.item.findMany({
//             include: {
//                 rawMaterials: {
//                     include: {
//                         rawMaterial: true,
//                     },
//                 },
//             },
//         });

//         const results = items.map((item) => {
//             const itemRawMaterials = item.rawMaterials;

//             if (itemRawMaterials.length === 0) {
//                 return {
//                     itemId: item.id,
//                     itemName: item.name,
//                     maxProducibleUnits: 0,
//                 };
//             }

//             const producibleUnits = itemRawMaterials.map((irm) => {
//                 const requiredQty = irm.quantity ?? 0;
//                 const availableStock = irm.rawMaterial?.stock ?? 0;

//                 if (requiredQty === 0) return Infinity;
//                 return availableStock / requiredQty;
//             });

//             const minProducible = Math.floor(Math.min(...producibleUnits));

//             return {
//                 itemId: item.id,
//                 itemName: item.name,
//                 maxProducibleUnits: minProducible > 0 ? minProducible : 0
//             };
//         });

//         return res.status(200).json({
//             success: true,
//             message: "Data Fetched Successfully",
//             results
//         });
//     } catch (error) {
//         return res.status(500).json({
//             success: false,
//             message: "Internal server error",
//             error: error.message
//         });
//     }
// };

const getItemsProducibleCount = async (req, res) => {
    try {
        const { name } = req.query;

        const items = await prisma.item.findMany({
            include: {
                rawMaterials: {
                    include: {
                        rawMaterial: true,
                    },
                },
            },
        });

        // Filter manually if name query param is passed
        const filteredItems = name
            ? items.filter(item =>
                item.name.toLowerCase().includes(name.toLowerCase())
            )
            : items;

        const results = filteredItems.map((item) => {
            const itemRawMaterials = item.rawMaterials;

            if (itemRawMaterials.length === 0) {
                return {
                    itemId: item.id,
                    itemName: item.name,
                    maxProducibleUnits: 0,
                };
            }

            const producibleUnits = itemRawMaterials.map((irm) => {
                const requiredQty = irm.quantity ?? 0;
                const availableStock = irm.rawMaterial?.stock ?? 0;

                if (requiredQty === 0) return Infinity;
                return availableStock / requiredQty;
            });

            const minProducible = Math.floor(Math.min(...producibleUnits));

            return {
                itemId: item.id,
                itemName: item.name,
                maxProducibleUnits: minProducible > 0 ? minProducible : 0,
            };
        });

        return res.status(200).json({
            success: true,
            message: "Data Fetched Successfully",
            results,
        });

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Internal server error",
            error: error.message,
        });
    }
};

const getInsufficientRawMaterials = async (req, res) => {
    try {
        const { itemId } = req.query; // or use req.params depending on your route

        if (!itemId) {
            return res.status(400).json({
                success: false,
                message: "Item ID is required",
            });
        }

        const item = await prisma.item.findUnique({
            where: {
                id: itemId,
            },
            include: {
                rawMaterials: {
                    include: {
                        rawMaterial: true,
                    },
                },
            },
        });

        if (!item) {
            return res.status(404).json({
                success: false,
                message: "Item not found",
            });
        }

        const insufficientMaterials = item.rawMaterials
            .filter((irm) => {
                const requiredQty = irm.quantity ?? 0;
                const availableStock = irm.rawMaterial?.stock ?? 0;

                // If requiredQty is zero, skip it
                if (requiredQty === 0) return false;

                return availableStock < requiredQty;
            })
            .map((irm) => ({
                rawMaterialId: irm.rawMaterial?.id,
                rawMaterialName: irm.rawMaterial?.name,
                availableStock: irm.rawMaterial?.stock ?? 0,
                requiredQuantity: irm.quantity ?? 0,
            }));

        return res.status(200).json({
            success: true,
            message: "Insufficient raw materials fetched successfully",
            item: {
                itemId: item.id,
                itemName: item.name,
            },
            insufficientMaterials,
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Internal server error",
            error: error.message,
        });
    }
};

const showOverallRepairedOrRejectedData = async (req, res) => {
    try {
        // Subtract 5.5 hours to convert IST time to match UTC in DB
        const isRepaired = req.query.isRepaired === "1";
        const offsetMinutes = 330;

        const startOfToday = moment().startOf("day").subtract(offsetMinutes, "minutes").toDate();
        
        const startOfWeek = moment().startOf("week").subtract(offsetMinutes, "minutes").toDate();
    
        const startOfMonth = moment().startOf("month").subtract(offsetMinutes, "minutes").toDate();

        const baseWhere = { isRepaired };

        const [total, daily, weekly, monthly] = await Promise.all([
            prisma.serviceRecord.count({ where: baseWhere }),
            prisma.serviceRecord.count({
                where: {
                    ...baseWhere,
                    servicedAt: { gte: startOfToday },
                },
            }),
            prisma.serviceRecord.count({
                where: {
                    ...baseWhere,
                    servicedAt: { gte: startOfWeek },
                },
            }),
            prisma.serviceRecord.count({
                where: {
                    ...baseWhere,
                    servicedAt: { gte: startOfMonth },
                },
            }),
        ]);

        res.status(201).json({
            success: true,
            message: `Daily, Weekly, Monthly, Totally ${isRepaired ? "Repaired": "Rejected"} Data Fetched Successfully`,
            total: total,
            daily: daily,
            weekly: weekly,
            monthly: monthly,
        });
    } catch (error) {
        res.status(500).json({ success: false, message: "Internal Server Error", error: error.message });
    }
};

const showProductionSummary = async (req, res) => {
    try {
        const offsetMinutes = 330; // IST offset (5.5 hours)

        const startOfToday = moment().startOf("day").subtract(offsetMinutes, "minutes").toDate();
        const startOfWeek = moment().startOf("week").subtract(offsetMinutes, "minutes").toDate();
        const startOfMonth = moment().startOf("month").subtract(offsetMinutes, "minutes").toDate();

        const [total, daily, weekly, monthly] = await Promise.all([
            prisma.productionLog.aggregate({
                _sum: { quantityProduced: true }
            }),
            prisma.productionLog.aggregate({
                _sum: { quantityProduced: true },
                where: { manufacturingDate: { gte: startOfToday } }
            }),
            prisma.productionLog.aggregate({
                _sum: { quantityProduced: true },
                where: { manufacturingDate: { gte: startOfWeek } }
            }),
            prisma.productionLog.aggregate({
                _sum: { quantityProduced: true },
                where: { manufacturingDate: { gte: startOfMonth } }
            }),
        ]);

        res.status(200).json({
            success: true,
            message: "Production Summary Fetched Successfully",
            total: total._sum.quantityProduced || 0,
            daily: daily._sum.quantityProduced || 0,
            weekly: weekly._sum.quantityProduced || 0,
            monthly: monthly._sum.quantityProduced || 0,
        });

    } catch (error) {
        res.status(500).json({
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
    getRepairedServiceRecords,
    getRejectedServiceRecords,
    getItemRawMaterials,
    addUnit,
    showUnit,
    attachItemToRawMaterial,
    updateItemRawMaterial,
    deleteItemRawMaterial,
    produceNewItem,
    getItemsProducibleCount,
    getInsufficientRawMaterials,
    showOverallRepairedOrRejectedData,
    showProductionSummary
};