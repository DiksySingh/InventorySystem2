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
        console.log(req.body);

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
        console.log(addRawMaterial);

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

const addServiceRecord = async (req, res) => {
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
            userId,
        } = req.body;

        // Basic validation
        if (
            !item ||
            !subItem ||
            !quantity ||
            !serialNumber ||
            !faultAnalysis ||
            !repairedRejectedBy ||
            !remarks ||
            !Array.isArray(repairedParts) ||
            repairedParts.length === 0 ||
            !userId
        ) {
            return res.status(400).json({
                success: false,
                message: "All fields are required",
            });
        }

        const rawMaterialMap = {};

        for (const part of repairedParts) {
            const { rawMaterialId, quantity, unit } = part;

            if (!rawMaterialMap[rawMaterialId]) {
                const rawMaterial = await prisma.rawMaterial.findUnique({
                    where: { id: rawMaterialId },
                });

                if (!rawMaterial) {
                    return res.status(404).json({
                        success: false,
                        message: `Raw Material - ${rawMaterial.name} not found`,
                    });
                }

                rawMaterialMap[rawMaterialId] = rawMaterial;
            }

            const rawMaterial = rawMaterialMap[rawMaterialId];

            // ✅ Check unit match
            if (rawMaterial.unit !== unit) {
                return res.status(400).json({
                    success: false,
                    message: `Unit mismatch for ${rawMaterial.name}. Expected: ${rawMaterial.unit}, Provided: ${unit}`,
                });
            }

            // ✅ Check stock if repaired
            if (isRepaired && rawMaterial.stock < quantity) {
                return res.status(400).json({
                    success: false,
                    message: `Not enough stock for ${rawMaterial.name}. Available: ${rawMaterial.stock}, Required: ${quantity}`,
                });
            }
        }

        // ✅ Create service record
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
                repairedParts,
                userId,
            },
        });

        // ✅ Update stock and log service usage
        for (const part of repairedParts) {
            const { rawMaterialId, quantity, unit } = part;
            const rawMaterial = rawMaterialMap[rawMaterialId];

            const updatedStock = isRepaired
                ? rawMaterial.stock - quantity
                : rawMaterial.stock + quantity;

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

        // ✅ Call external API
        try {
            const response = await axios.post(
                `http://88.222.214.93:5000/common/update-item-defective?itemName=${subItem}&quantity=${quantity}&isRepaired=${isRepaired}`
            );
            console.log("API Response:", response.data);
        } catch (apiError) {
            console.error("Error calling defective stock API:", apiError.message);
        }

        // ✅ Success Response
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
            message: "itemId, rawMaterialId, and updatedBy are required",
        });
    }

    try {
        // Always update updatedBy (and quantity if it's provided)
        const updateData = {
            updatedBy: req.user.id,
        };

        // If name is provided, update name in RawMaterial table
        if (name) {
            await prisma.rawMaterial.update({
                where: {
                    id: rawMaterialId,
                },
                data: {
                    name,
                },
            });
        }

        if (quantity !== 0 || quantity !== undefined || quantity !== null) {
            updateData.quantity = parseFloat(quantity);
        }

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
    deleteItemRawMaterial
};