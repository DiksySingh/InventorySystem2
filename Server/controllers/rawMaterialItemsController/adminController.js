const prisma = require("../../config/prismaClient");
const WarehouseItems = require("../../models/serviceInventoryModels/warehouseItemsSchema");
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

        return res.status(200).json({
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

        return res.status(200).json({
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

        return res.status(200).json({
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

        return res.status(200).json({
            success: true,
            message: "Items fetched successfully",
            items: allItems
        });

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Internal Server Error",
            error: error.message
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

        res.status(200).json({
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

        res.status(200).json({
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

module.exports = {
    showEmployees,
    deactivateEmployee,
    activateEmployee,
    addItem,
    showItems,
    addWarehouse,
    getDefectiveItemsForWarehouse,
    getDefectiveItemsListByWarehouse
};