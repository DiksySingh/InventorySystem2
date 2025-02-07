const axios = require("axios");
const imageHandlerWithPath = require("../middlewares/imageHandlerWithPath");
const Item = require("../models/serviceInventoryModels/itemSchema");
const Warehouse = require("../models/serviceInventoryModels/warehouseSchema");
const WarehousePerson = require("../models/serviceInventoryModels/warehousePersonSchema");
const WarehouseItems = require("../models/serviceInventoryModels/warehouseItemsSchema");
const ServicePerson = require("../models/serviceInventoryModels/servicePersonSchema");
const SurveyPerson = require("../models/serviceInventoryModels/surveyPersonSchema");
const RepairNRejectItems = require("../models/serviceInventoryModels/repairNRejectSchema");
const PickupItem = require("../models/serviceInventoryModels/pickupItemSchema");
const System = require("../models/systemInventoryModels/systemSchema");
const SystemItem = require("../models/systemInventoryModels/systemItemSchema");
const SubItem = require("../models/systemInventoryModels/subItemSchema");
const SystemInventoryWToW = require("../models/systemInventoryModels/systemItemsWToWSchema");
const InstallationInventory = require("../models/systemInventoryModels/installationInventorySchema");
const FarmerItemsActivity = require("../models/systemInventoryModels/farmerItemsActivity");
const InstallationAssignEmp = require("../models/systemInventoryModels/installationAssignEmpSchema");
const IncomingItemsAccount = require("../models/systemInventoryModels/incomingNewSystemItems");
const NewSystemInstallation = require("../models/systemInventoryModels/newSystemInstallationSchema");
const StockUpdateActivity = require("../models/systemInventoryModels/stockUpdateActivity");

//****************** Admin Access ******************//
module.exports.addWarehouse = async (req, res) => {
    const { warehouseName, createdAt } = req.body;
    if (!warehouseName) {
        return res.status(400).json({
            success: false,
            message: "All fields are required"
        });
    }

    try {
        const existingWarehouse = await Warehouse.findOne({ warehouseName });
        if (existingWarehouse) {
            return res.status(400).json({
                success: false,
                message: "Warehouse already exists"
            });
        }
        const trimmedWarehouseName = warehouseName.trim();
        const newWarehouse = new Warehouse({
            warehouseName: trimmedWarehouseName,
            createdAt: createdAt || Date.now(),
        });
        await newWarehouse.save();

        return res.status(200).json({
            success: true,
            message: "Warehouse Added Successfully",
            newWarehouse
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Internal Server Error",
            error: error.message
        });
    }
};

module.exports.showWarehouses = async (req, res) => {
    try {
        const allWarehouses = await Warehouse.find().select("-__v -createdAt");
        if (!allWarehouses) {
            return res.status(404).json({
                success: false,
                message: "Warehouses Not Found"
            });
        }
        return res.status(200).json({
            success: true,
            message: "Data Fetched Successfully",
            allWarehouses
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Internal Server Error",
            error: error.message
        });
    }
};

module.exports.viewWarehousePersons = async (req, res) => {
    try {
        const allWarehousePersons = await WarehousePerson.find()
            .populate("warehouse", "-_id -__v -createdAt")
            .select("-password -role -createdAt -refreshToken -__v");
        if (!allWarehousePersons) {
            return res.status(404).json({
                success: false,
                message: "Warehouse Persons Data Not Found"
            });
        }

        return res.status(200).json({
            success: true,
            message: "Data Fetched Successfully",
            allWarehousePersons
        })

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Internal Server Error",
            error: error.message
        });
    }
};

module.exports.viewServicePersons = async (req, res) => {
    try {
        const allServicePersons = await ServicePerson.find().select("-password -role -createdAt -refreshToken -__v");
        if (!allServicePersons) {
            return res.status(404).json({
                success: false,
                message: "Service Persons Data Not Found"
            });
        }

        return res.status(200).json({
            success: true,
            message: "Data Fetched Successfully",
            allServicePersons
        });

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Internal Server Error",
            error: error.message
        });
    }
};

module.exports.deactivateWarehousePerson = async (req, res) => {
    try {
        const { id } = req.query;
        if (!id) {
            return res.status(400).json({
                success: false,
                message: "ID is required"
            });
        }

        const warehousePerson = await WarehousePerson.findById(id);
        warehousePerson.isActive = false;
        await warehousePerson.save();
        return res.status(200).json({
            success: true,
            message: "Warehouse Person Deactivated Successfully",
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Internal Server Error",
            error: error.message
        });
    }
};

module.exports.deactivateServicePerson = async (req, res) => {
    try {
        const { id } = req.query;
        if (!id) {
            return res.status(400).json({
                success: false,
                message: "ID is required"
            });
        }

        const servicePerson = await ServicePerson.findById(id);
        servicePerson.isActive = false;
        await servicePerson.save();
        return res.status(200).json({
            success: true,
            message: "Service Person Deactivated Successfully",
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Internal Server Error",
            error: error.message
        });
    }
};

module.exports.allRepairRejectItemsData = async (req, res) => {
    try {
        const allRepairRejectData = await RepairNRejectItems.find({}).sort({ createdAt: -1 });
        if (!allRepairRejectData) {
            return res.status(404).json({
                success: false,
                message: "RepairReject Item Data Not Found"
            });
        }

        return res.status(200).json({
            success: true,
            message: "Data Fetched Successfully",
            allRepairRejectData
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Internal Server Error",
            error: error.message
        });
    }
};

//***************** Warehouse Access *******************// 
// module.exports.addWarehouseItems = async (req, res) => {
//     try {
//         const warehouseId = req.user.warehouse;
//         const { items, defective, repaired, rejected } = req.body;
//         if(!warehouseId){
//             return res.status(400).json({
//                 success: false,
//                 message: "warehouseID not found"
//             });
//         }

//         if (!items || !Array.isArray(items) || items.length === 0) {
//             return res.status(400).json({
//                 success: false,
//                 message: "items are required and should be a non-empty array"
//             });
//         }

//         let warehouseItemsRecord = await WarehouseItems.findOne({ warehouse: warehouseId });

//         if (!warehouseItemsRecord) {
//             warehouseItemsRecord = new WarehouseItems({
//                 warehouse:warehouseId,
//                 items: []
//             });
//         }

//         for (const newItem of items) {          
//             newItem.itemName = newItem.itemName.trim();
//             let itemRecord = await Item.findOne({ itemName: newItem.itemName });

//             if (itemRecord) {
//                 itemRecord.stock += newItem.quantity;
//                 itemRecord.updatedAt = Date.now();
//                 await itemRecord.save();
//             } else {
//                 itemRecord = new Item({
//                     itemName: newItem.itemName,
//                     stock: newItem.quantity,
//                     defective,
//                     repaired,
//                     rejected,
//                 });
//                 await itemRecord.save();
//             }

//             const existingItem = warehouseItemsRecord.items.find(item => item.itemName === newItem.itemName);

//             if (existingItem) {
//                 existingItem.quantity += newItem.quantity;
//             } else {
//                 warehouseItemsRecord.items.push(newItem);
//             }
//         }

//         await warehouseItemsRecord.save();

//         return res.status(200).json({
//             success: true,
//             message: "Items successfully added to warehouse",
//             warehouseItemsRecord
//         });
//     } catch (error) {
//         return res.status(500).json({
//             success: false,
//             message: "Internal Server Error",
//             error: error.message
//         });
//     }
// };

module.exports.addWarehouseItems = async (req, res) => {
    try {
        // Extract items from the request body
        const { items, defective, repaired, rejected } = req.body;

        if (!items || !Array.isArray(items) || items.length === 0) {
            return res.status(400).json({
                success: false,
                message: "items are required and should be a non-empty array"
            });
        }

        // Validate and sanitize the items in req.body
        for (const newItem of items) {
            if (!newItem.itemName || typeof newItem.itemName !== "string") {
                return res.status(400).json({
                    success: false,
                    message: "Each item must have a valid itemName"
                });
            }

            // Ensure itemName is trimmed
            newItem.itemName = newItem.itemName.trim();

            // Check if quantity is provided and is zero
            if (!newItem.quantity || newItem.quantity !== 0) {
                newItem.quantity = 0; // Set to zero if not provided or invalid
            }
        }

        // Update/Create items in the Item collection
        for (const newItem of items) {
            let itemRecord = await Item.findOne({ itemName: newItem.itemName });

            if (itemRecord) {
                itemRecord.stock += newItem.quantity;
                itemRecord.updatedAt = Date.now();
                await itemRecord.save();
            } else {
                itemRecord = new Item({
                    itemName: newItem.itemName,
                    stock: newItem.quantity,
                    defective,
                    repaired,
                    rejected,
                });
                await itemRecord.save();
            }
        }

        // Fetch all warehouses
        const allWarehouses = await Warehouse.find();

        // Update the warehouseItems for each warehouse
        for (const warehouse of allWarehouses) {
            let warehouseItemsRecord = await WarehouseItems.findOne({ warehouse: warehouse._id });

            if (!warehouseItemsRecord) {
                warehouseItemsRecord = new WarehouseItems({
                    warehouse: warehouse._id,
                    items: []
                });
            }

            for (const newItem of items) {
                const existingItem = warehouseItemsRecord.items.find(item => item.itemName === newItem.itemName);

                if (!existingItem) {
                    // Add the item with quantity set to zero
                    warehouseItemsRecord.items.push({
                        itemName: newItem.itemName,
                        quantity: newItem.quantity // Will always be zero at this point
                    });
                }
                // If the item already exists, leave the quantity unchanged
            }

            await warehouseItemsRecord.save();
        }

        return res.status(200).json({
            success: true,
            message: "Items successfully added to all warehouses" //with quantity validated and set to zero where needed
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Internal Server Error",
            error: error.message
        });
    }
};

module.exports.addWarehouseItemsStock = async (req, res) => {
    try {
        const warehouseId = req.user.warehouse;
        const { items, defective } = req.body;
        console.log(req.body);

        if (!warehouseId) {
            return res.status(400).json({
                success: false,
                message: "warehouseID not found"
            });
        }

        if (!items || !Array.isArray(items) || items.length === 0) {
            return res.status(400).json({
                success: false,
                message: "items are required and should be a non-empty array"
            });
        }

        let warehouseItemsRecord = await WarehouseItems.findOne({ warehouse: warehouseId });

        for (const newItem of items) {
            let itemName = newItem.itemName.trim();
            let itemRecord = await Item.findOne({ itemName: itemName });

            if (!itemRecord) {
                return res.status(400).json({
                    success: false,
                    message: "Item Doesn't Exists"
                });
            } else {
                itemRecord.stock = parseInt(itemRecord.stock) + parseInt(newItem.quantity);
                itemRecord.defective = parseInt(itemRecord.defective) + parseInt(defective);
                itemRecord.updatedAt = Date.now();
                await itemRecord.save();
            }

            const existingItem = warehouseItemsRecord.items.find(item => item.itemName === itemName);

            if (!existingItem) {
                return res.status(400).json({
                    success: false,
                    message: "Item Doesn't Exists In Warehouse"
                });
            } else {
                existingItem.quantity = parseInt(existingItem.quantity) + parseInt(newItem.quantity);
                existingItem.defective = parseInt(existingItem.defective) + parseInt(defective);
            }
        }
        await warehouseItemsRecord.save();

        return res.status(200).json({
            success: true,
            message: "Items stock added successfully",
            warehouseItemsRecord
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Internal Server Error",
            error: error.message
        });
    }
};

module.exports.viewWarehouseItems = async (req, res) => {
    try {
        const warehouseId = req.user.warehouse;
        if (!warehouseId) {
            return res.status(404).json({
                success: false,
                message: "WarehouseId not found"
            });
        }

        const warehouseItems = await WarehouseItems.findOne({ warehouse: warehouseId });
        if (!warehouseItems) {
            return res.status(404).json({
                success: false,
                message: "Warehouse Items Not Found"
            });
        }

        let items = [];
        for (let item of warehouseItems.items) {
            items.push(item.itemName);
        }

        return res.status(200).json({
            success: true,
            message: "Warehouse Items Fetched Successfully",
            items
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Internal Server Error",
            error: error.message
        });
    }
};

module.exports.warehouseDashboard = async (req, res) => {
    try {
        const warehouseId = req.user.warehouse;
        if (!warehouseId) {
            return res.status(400).json({
                success: false,
                message: "warehouseId not found"
            });
        }

        const warehouseData = await WarehouseItems.findOne({ warehouse: warehouseId }).populate('warehouse', "warehouseName -_id");
        if (!warehouseData) {
            return res.status(404).json({
                success: false,
                message: "Warehouse Data Not Found"
            });
        }

        return res.status(200).json({
            success: true,
            message: "Data fetched successfully",
            warehouseData
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Internal Server Error",
            error: error.message
        });
    }
};

module.exports.repairItemData = async (req, res) => {
    try {
        const warehouseId = req.user.warehouse;
        const personName = req.user.name;
        if (!warehouseId) {
            return res.status(400).json({
                success: false,
                message: "WarehouseID not found"
            });
        }
        const { itemName, serialNumber, repaired, repairedBy, remark, createdAt } = req.body;
        if (!itemName || !repaired || !serialNumber || !remark || !repairedBy || !createdAt) {
            return res.status(400).json({
                success: false,
                message: "itemName is required"
            });
        }

        const itemRecord = await Item.findOne({ itemName });
        if (!itemRecord) {
            return res.status(404).json({
                success: false,
                message: "Item Not Found In ItemSchema"
            });
        }

        const warehouseItemsRecord = await WarehouseItems.findOne({ warehouse: warehouseId }).populate('warehouse', "-__v -createdAt");
        if (!warehouseItemsRecord) {
            return res.status(404).json({
                success: false,
                message: "WarehouseItemsRecord Not Found"
            });
        }
        const warehouseName = warehouseItemsRecord.warehouse.warehouseName;

        const warehouseItem = warehouseItemsRecord.items.find(item => item.itemName === itemName);
        if (!warehouseItem) {
            return res.status(404).json({
                success: false,
                message: "Item Not Found In Warehouse"
            });
        }

        if (parseInt(repaired)) {
            //Adjusting Warehouse Items Quantity, Defective, Repaired Field in WarehouseItems Schema
            if (warehouseItem.defective !== 0 && warehouseItem.defective >= (parseInt(repaired))) {
                warehouseItem.defective = parseInt(warehouseItem.defective) - parseInt(repaired);
                warehouseItem.quantity = parseInt(warehouseItem.quantity) + parseInt(repaired);
                warehouseItem.repaired = parseInt(warehouseItem.repaired) + parseInt(repaired);
            } else {
                return res.status(403).json({
                    success: false,
                    message: "Defective is less than repaired. Cannot be updated"
                });
            }

            //Adjusting Items Stock, Defective, Repaired Field in ItemSchema
            if (itemRecord.defective !== 0 && itemRecord.defective >= (parseInt(repaired))) {
                itemRecord.defective = parseInt(itemRecord.defective) - parseInt(repaired);
                itemRecord.stock = parseInt(itemRecord.stock) + parseInt(repaired);
                itemRecord.repaired = parseInt(itemRecord.repaired) + parseInt(repaired);
            } else {
                return res.status(403).json({
                    success: false,
                    message: "Defective is less than repaired. Cannot be updated"
                })
            }
        }

        // if(parseInt(rejected)){
        //     //Adjusting Warehouse Items Defective and Rejected Field in WarehouseItems Schema
        //     if(warehouseItem.defective !== 0 && warehouseItem.defective >= (parseInt(rejected))){
        //         warehouseItem.defective = parseInt(warehouseItem.defective) - parseInt(rejected);
        //         warehouseItem.rejected = parseInt(warehouseItem.rejected) + parseInt(rejected);
        //     }else{
        //         return res.status(403).json({
        //             success: false,
        //             message: "Defective is less than rejected. Cannot be updated"
        //         });
        //     }

        //     //Adjusting Items Defective and Rejected Field in ItemSchema
        //     if(itemRecord.defective !== 0 && itemRecord.defective >= (parseInt(rejected))){
        //         itemRecord.defective = parseInt(itemRecord.defective) - parseInt(rejected);
        //         itemRecord.rejected = parseInt(itemRecord.rejected) + parseInt(rejected);
        //     }else{
        //         return res.status(403).json({
        //             success: false,
        //             message: "Defective is less than rejected. Cannot be updated"
        //         });
        //     }
        // }

        await itemRecord.save();
        await warehouseItemsRecord.save();

        const repairProductData = new RepairNRejectItems({
            warehouseId: warehouseId,
            warehousePerson: personName,
            warehouseName: warehouseName,
            itemName,
            serialNumber: serialNumber || "",
            isRepaired: true,
            repaired: parseInt(repaired),
            rejected: 0,
            repairedBy,
            remark: remark || "",
            createdAt,
        })

        await repairProductData.save();

        return res.status(200).json({
            sucess: true,
            message: "Data Inserted Successfully",
            repairProductData
        });

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Internal Server Error",
            error: error.message
        });
    }
};

module.exports.rejectItemData = async (req, res) => {
    try {
        const warehouseId = req.user.warehouse;
        const personName = req.user.name;
        if (!warehouseId) {
            return res.status(400).json({
                success: false,
                message: "WarehouseID not found"
            });
        }
        const { itemName, serialNumber, rejected, remark, createdAt } = req.body;
        if (!itemName || !serialNumber || !remark || !rejected || !createdAt) {
            return res.status(400).json({
                success: false,
                message: "itemName is required"
            });
        }

        const itemRecord = await Item.findOne({ itemName });
        if (!itemRecord) {
            return res.status(404).json({
                success: false,
                message: "Item Not Found In ItemSchema"
            });
        }

        const warehouseItemsRecord = await WarehouseItems.findOne({ warehouse: warehouseId }).populate('warehouse', "-__v -createdAt");
        if (!warehouseItemsRecord) {
            return res.status(404).json({
                success: false,
                message: "WarehouseItemsRecord Not Found"
            });
        }
        const warehouseName = warehouseItemsRecord.warehouse.warehouseName;

        const warehouseItem = warehouseItemsRecord.items.find(item => item.itemName === itemName);
        if (!warehouseItem) {
            return res.status(404).json({
                success: false,
                message: "Item Not Found In Warehouse"
            });
        }

        // if(parseInt(repaired)){
        //     //Adjusting Warehouse Items Quantity, Defective, Repaired Field in WarehouseItems Schema
        //     if(warehouseItem.defective !== 0 && warehouseItem.defective >= (parseInt(repaired) + parseInt(rejected))){
        //         warehouseItem.defective = parseInt(warehouseItem.defective) - parseInt(repaired);
        //         warehouseItem.quantity = parseInt(warehouseItem.quantity) + parseInt(repaired);
        //         warehouseItem.repaired = parseInt(warehouseItem.repaired) + parseInt(repaired);
        //     }else{
        //         return res.status(403).json({
        //             success: false,
        //             message: "Defective is less than repaired. Cannot be updated"
        //         });
        //     }

        //     //Adjusting Items Stock, Defective, Repaired Field in ItemSchema
        //     if(itemRecord.defective !== 0 && itemRecord.defective >= (parseInt(repaired) + parseInt(rejected))){
        //         itemRecord.defective = parseInt(itemRecord.defective) - parseInt(repaired);
        //         itemRecord.stock = parseInt(itemRecord.stock) + parseInt(repaired);
        //         itemRecord.repaired = parseInt(itemRecord.repaired) + parseInt(repaired);
        //     }else{
        //         return res.status(403).json({
        //             success: false,
        //             message: "Defective is less than repaired. Cannot be updated"
        //         })
        //     }
        // }

        if (parseInt(rejected)) {
            //Adjusting Warehouse Items Defective and Rejected Field in WarehouseItems Schema
            if (warehouseItem.defective !== 0 && warehouseItem.defective >= (parseInt(rejected))) {
                warehouseItem.defective = parseInt(warehouseItem.defective) - parseInt(rejected);
                warehouseItem.rejected = parseInt(warehouseItem.rejected) + parseInt(rejected);
            } else {
                return res.status(403).json({
                    success: false,
                    message: "Defective is less than rejected. Cannot be updated"
                });
            }

            //Adjusting Items Defective and Rejected Field in ItemSchema
            if (itemRecord.defective !== 0 && itemRecord.defective >= (parseInt(rejected))) {
                itemRecord.defective = parseInt(itemRecord.defective) - parseInt(rejected);
                itemRecord.rejected = parseInt(itemRecord.rejected) + parseInt(rejected);
            } else {
                return res.status(403).json({
                    success: false,
                    message: "Defective is less than rejected. Cannot be updated"
                });
            }
        }

        await itemRecord.save();
        await warehouseItemsRecord.save();

        const rejectProductData = new RepairNRejectItems({
            warehouseId: warehouseId,
            warehousePerson: personName,
            warehouseName: warehouseName,
            itemName,
            serialNumber: serialNumber || "",
            isRepaired: false,
            repaired: 0,
            rejected: parseInt(rejected),
            repairedBy: null,
            remark: remark || "",
            createdAt,
        })

        await rejectProductData.save();

        return res.status(200).json({
            sucess: true,
            message: "Data Inserted Successfully",
            newRepairRejectData: rejectProductData
        });

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Internal Server Error",
            error: error.message
        });
    }
};

module.exports.warehouseRepairItemsData = async (req, res) => {
    try {
        const warehouseId = req.user.warehouse;
        if (!warehouseId) {
            return res.status(400).json({
                success: false,
                message: "WarehouseID is required"
            });
        }

        const allRepairItemData = await RepairNRejectItems.find({ warehouseId: warehouseId, isRepaired: true }).sort({ createdAt: -1 });
        // if(!allRepairRejectData){
        //     return res.status(404).json({
        //         success: false,
        //         message: "Data Not Found For The Warehouse"
        //     });
        // }

        return res.status(200).json({
            success: true,
            message: "Data Fetched Successfully",
            allRepairItemData: allRepairItemData || [],
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Internal Server Error",
            error: error.message
        });
    }
};

module.exports.warehouseRejectItemsData = async (req, res) => {
    try {
        const warehouseId = req.user.warehouse;
        if (!warehouseId) {
            return res.status(400).json({
                success: false,
                message: "WarehouseID is required"
            });
        }

        const allRejectItemData = await RepairNRejectItems.find({ warehouseId: warehouseId, isRepaired: false }).sort({ createdAt: -1 });
        // if(!allRepairRejectData){
        //     return res.status(404).json({
        //         success: false,
        //         message: "Data Not Found For The Warehouse"
        //     });
        // }

        return res.status(200).json({
            success: true,
            message: "Data Fetched Successfully",
            allRejectItemData: allRejectItemData || [],
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Internal Server Error",
            error: error.message
        });
    }
};

module.exports.viewOrdersApprovedHistory = async (req, res) => {
    try {
        const warehouseId = req.user.warehouse;
        if (!warehouseId) {
            return res.status(400).json({
                success: false,
                message: "WarehouseId Not Found"
            });
        }

        const warehouseData = await Warehouse.findOne({ _id: warehouseId });
        const warehouseItemsData = await PickupItem.find({ warehouse: warehouseData.warehouseName }).populate("servicePerson", "name contact").sort({ pickupDate: -1 });

        let orderHistory = [];
        for (let order of warehouseItemsData) {
            if (order.status === true) {
                orderHistory.push(order);
            }
        }
        return res.status(200).json({
            success: true,
            message: "History Data Fetched Successfully",
            orderHistory
        });

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Internal Server Error",
            error: error.message
        });
    }
};

module.exports.getWarehouse = async (req, res) => {
    try {
        const warehouseId = req.user.warehouse;
        if (!warehouseId) {
            return res.status(400).json({
                success: false,
                message: "WarebouseId not found"
            });
        }

        const warehouseData = await Warehouse.findOne({ _id: warehouseId });
        const warehouseName = warehouseData.warehouseName;
        return res.status(200).json({
            success: true,
            message: "Warehouse Fetched Successfully",
            warehouseName
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Internal Server Error",
            error: error.message
        });
    }
};

module.exports.viewApprovedOrderHistory = async (req, res) => {
    try {
        const servicePersonId = req.user._id;
        if (!servicePersonId) {
            return res.status(400).json({
                success: false,
                message: "servicePersonId not found"
            });
        }

        const pickupItemData = await PickupItem.find({ servicePerson: servicePersonId }).sort({ pickupDate: -1 });

        let orderHistory = [];

        for (let order of pickupItemData) {
            if ((order.incoming === false) && (order.status === true)) {
                orderHistory.push(order);
            }
        }

        return res.status(200).json({
            success: true,
            message: "History Fetched Successfully",
            orderHistory
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Internal Server Error",
            error: error.message
        });
    }
};

//Installation Controllers For Warehouse
module.exports.addSystem = async (req, res) => {
    try {
        const { systemName } = req.body;
        const empId = req.user._id;
        if (!systemName) {
            return res.status(400).json({
                success: false,
                message: "systemName is required"
            });
        }

        const existingSystem = await System.findOne({ systemName });
        if (existingSystem) {
            return res.status(400).json({
                success: false,
                message: "System Already Exists"
            });
        }

        const newSystem = new System({ systemName: systemName.trim(), createdBy: empId });
        const savedSystem = await newSystem.save();
        if (savedSystem) {
            return res.status(200).json({
                success: true,
                message: "System Data Saved Successfully",
                data: savedSystem
            });
        }
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Internal Server Error",
            error: error.message
        });
    }
};

module.exports.addSystemItem = async (req, res) => {
    try {
        const { systemId, itemName} = req.body;
        const empId = req.user._id;
        // const warehouseId = req.user.warehouse;
        if (!systemId || !itemName) {
            return res.status(400).json({
                success: false,
                message: "All fields are required"
            });
        }

        const insertData = {
            systemId,
            itemName: itemName.trim(),
            createdBy: empId
        };

        const existingSystemItem = await SystemItem.findOne({ itemName });
        if (existingSystemItem) {
            return res.status(400).json({
                success: false,
                message: "System Item Already Exists"
            });
        }

        const newSystemItem = new SystemItem(insertData);
        const savedSystemItem = await newSystemItem.save();

        // const allWarehouses = await Warehouse.find();
        // let newInventoryItem, savedInventoryItem;

        // for (let warehouse of allWarehouses) {
        //     const existingInventoryItem = await InstallationInventory.findOne({ warehouseId: warehouse._id, itemName });
        //     if (!existingInventoryItem) {
        //         newInventoryItem = new InstallationInventory({ warehouseId: warehouse._id, itemName, quantity: 0 });
        //         savedInventoryItem = await newInventoryItem.save();
        //     }
        // }
        
        if (savedSystemItem) {
            return res.status(200).json({
                success: true,
                message: "System Item Added Successfully",
                savedSystemItem,
            });
        }
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Internal Server Error",
            error: error.message
        });
    }
};

module.exports.addSubItem = async (req, res) => {
    try {
        const {systemId, itemId, subItemName, quantity} = req.body;
        const empId = req.user._id;
        if(!itemId || !quantity) {
            return res.status(400).json({
                success: false,
                message: "All fields are required"
            });
        }

        const systemItem = await SystemItem.findOne({_id: itemId});
        if(!systemItem) {
            return res.status(404).json({
                success: false,
                message: "SystemItem Not Found"
            });
        }

        const insertSubItem = {
            systemId,
            itemId,
            subItemName,
            quantity,
            createdBy: empId,
        }

        const newSubItem = new SubItem(insertSubItem);
        const savedSubItem = await newSubItem.save();

        const allWarehouses = await Warehouse.find();
        let newInventoryItem, savedInventoryItem;

        for (let warehouse of allWarehouses) {
            const existingInventoryItem = await InstallationInventory.findOne({ warehouseId: warehouse._id, subItemId: savedSubItem._id });
            if (!existingInventoryItem) {
                newInventoryItem = new InstallationInventory({ warehouseId: warehouse._id, subItemId: savedSubItem._id, quantity: 0, createdBy: empId });
                savedInventoryItem = await newInventoryItem.save();
            }
        }
        
        if(savedSubItem && savedInventoryItem) {
            return res.status(200).json({
                success: true,
                message: "SubItem Added To Warehouses Successfully",
                data: savedSubItem
            });
        }
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Internal Server Error",
            error: error.message
        });
    }
}

module.exports.showSystems = async (req, res) => {
    try {
        const systems = await System.find().select("-__v -createdAt -updatedAt -createdBy -updatedBy").lean();
        if (systems) {
            res.status(200).json({
                success: true,
                data: systems,
            });
        }
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

module.exports.showSystemSubItems = async (req, res) => {
    try {
        const { systemId } = req.query;
        const subItems = await SubItem.find({ systemId: systemId }).select("_id subItemName").lean();
        if (!subItems.length) {
            return res.status(404).json({
                success: false,
                message: "No system items found for this system."
            });
        }
        res.status(200).json({
            success: true,
            data: subItems,
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// module.exports.addInventoryItem = async (req, res) => {
//     try {
//         const {itemName} = req.body;
//         if(!itemName) {
//             return res.status(400).json({
//                 success: false,
//                 message: "ItemName is required"
//             });
//         }

//         const newInventoryItem = new InstallationInventory({itemName, quantity});


//     } catch (error) {
//         return res.status(500).json({
//             success: false,
//             message: "Internal Server Error",
//             error: error.message
//         })
//     }
// };

//****************** Service Person Access *************************//

module.exports.showInstallationInventoryItems = async (req, res) => {
    try {
        const warehouseId = req.user.warehouse;
        const inventorySystemItems = await InstallationInventory.find({ warehouseId: warehouseId })
        .populate({
            path: "subItemId",
            select: ({
                "_id": 1,
                "subItemName": 1,
            })
        }).select("-_id -warehouseId -createdAt -updatedAt -createdBy -updatedBy -__v").lean();
        return res.status(200).json({
            success: true,
            message: "Data Fetched Successfully",
            data: inventorySystemItems || []
        });

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Internal Server Error",
            error: error.message
        });
    }
};

module.exports.updateItemQuantity = async (req, res) => {
    try {
        const warehouseId = req.user.warehouse;
        const { subItemId, updatedQuantity } = req.body;
        const filter = {
            warehouseId: warehouseId,
            subItemId: subItemId
        }
        const itemData = await InstallationInventory.findOne(filter);
        itemData.quantity = parseInt(itemData.quantity) + parseInt(updatedQuantity);

        let refType;
        if(req.user.role === "admin") {
            refType = "Admin";
        }else if(req.user.role === "warehouseAdmin"){
            refType = "WarehousePerson"
        }

        const insertData = {
            referenceType: refType,
            subItemId,
            quantity: parseInt(updatedQuantity),
            createdAt: new Date(),
            createdBy: req.user._id
        }

        const addStock = new StockUpdateActivity(insertData);
        const savedStock = await addStock.save();
        const updatedItemData = await itemData.save();

        if (savedStock && updatedItemData) {
            return res.status(200).json({
                success: true,
                message: "Stock Activity & Data Updated Successfully"
            });
        }
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Internal Server Error",
            error: error.message
        });
    }
};

module.exports.addNewInstallationData = async (req, res) => {
    try {
        const {
            farmerId,
            empId,
            systemId,
            itemsList,
            panelNumbers,
            pumpNumber,
            controllerNumber,
            rmuNumber,
        } = req.body;

        const warehousePersonId = req.user._id;
        const warehouseId = req.user.warehouse;

        if (
            !farmerId ||
            !empId ||
            !itemsList ||
            !panelNumbers ||
            !pumpNumber ||
            !controllerNumber ||
            !rmuNumber) {
            return res.status(400).json({
                success: false,
                message: "All fields are required"
            });
        }

        if (!Array.isArray(itemsList) || itemsList.length === 0) {
            return res.status(400).json({
                success: false,
                message: "itemsList should be a non-empty array"
            });
        }

        let refType;
        let empData = await ServicePerson.findOne({ _id: empId });
        if (empData) {
            refType = "ServicePerson";
        }else {
            empData = await SurveyPerson.findOne({ _id: empId });
            if(!empData){
                return res.status(400).json({
                    success: false,
                    message: "EmpID Not Found In Database"
                })
            }
            refType = "SurveyPerson";
        }
       

        for (const item of itemsList) {
            const { subItemId, quantity } = item;

            // Find the item in InstallationInventory
            const inventoryItem = await InstallationInventory.findOne({warehouseId: req.user.warehouse, subItemId }).populate({
                path: "subItemId",
                select: ({
                    "subItemName": 1,
                })
            });
            if (!inventoryItem) {
                throw new Error(`SubItem with ID ${subItemId} not found in warehouse inventory`);
            }

            if (inventoryItem.quantity < quantity) {
                throw new Error(`Insufficient stock for item ${inventoryItem.subItemId.subItemName}`);
            }

            // Update inventory quantity
            inventoryItem.quantity = parseInt(inventoryItem.quantity) - parseInt(quantity);
            inventoryItem.updatedAt = new Date();
            await inventoryItem.save();
        }

        const accountData = {
            warehouseId,
            referenceType: refType,
            empId,
            farmerId,
            systemId,
            itemsList: itemsList,
            createdBy: warehousePersonId
        };
        console.log(accountData);

        const activityData = {
            warehouseId,
            referenceType: refType,
            farmerId,
            empId,
            systemId,
            itemsList,
            panelNumbers,
            pumpNumber,
            controllerNumber,
            rmuNumber,
            createdBy: warehousePersonId
        }
        console.log(activityData);

        const farmerActivity = new FarmerItemsActivity(activityData);
        await farmerActivity.save();

        const empAccountData = new InstallationAssignEmp(accountData);
        await empAccountData.save();

        return res.status(200).json({
            success: true,
            message: "Data Saved Successfully",
            farmerActivity,
            empAccountData,
        });

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Internal Server Error",
            error: error.message
        });
    }
};

module.exports.showInstallationDataToWarehouse = async (req, res) => {
    try {
        const warehouseId = req.user.warehouse;
        const showData = await FarmerItemsActivity.find({ warehouseId: warehouseId })
            .populate({
                path: "warehouseId",
                select: {
                  "_id": 0,
                  "warehouseName": 1,
                }
            })
            .populate({
                path: "empId",
                select: {
                    "_id": 0,
                    "name": 1,
                    "contact": 1
                }
            })
            .populate({
                path: "itemsList.subItemId", // Populate subItem details
                model: "SubItem",
                select: ({
                    "_id": 0,
                    "subItemName": 1,
                })
            }).sort({ createdAt: -1 });
        const activitiesWithFarmerDetails = await Promise.all(
            showData.map(async (data) => {
                const response = await axios.get(
                    `http://88.222.214.93:8001/farmer/showSingleFarmer?id=${data.farmerId}`
                );
                if (response) {
                    return {
                        ...data.toObject(),
                        farmerDetails: (response?.data?.data) ? response?.data?.data : null, // Assuming the farmer API returns farmer details
                    };
                }
            })
        );

        return res.status(200).json({
            success: true,
            message: "Data Fetched Successfully",
            data: activitiesWithFarmerDetails || []
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Internal Server Error",
            error: error.message
        });
    }
};

module.exports.itemComingToWarehouse = async (req, res) => {
    try {
        const { from, toWarehouse, itemsList, company, arrivedDate } = req.body;
        const role = req.user.role;
        if (!from || !toWarehouse || !itemsList || !company || !arrivedDate) {
            return res.status(400).json({
                success: false,
                message: "All fields are required"
            });
        }

        if (!Array.isArray(itemsList) || itemsList.length === 0) {
            return res.status(400).json({
                success: false,
                message: "items is an array & should be non-empty"
            });
        }

        let refType;
        if (role === 'admin') {
            refType = "Admin"
        } else if (role === 'warehouseAdmin') {
            refType = "WarehousePerson"
        }

        for (let item of itemsList) {
            const existingItem = await InstallationInventory.findOne({ subItemId: item.subItemId, warehouseId: req.user.warehouse });
            existingItem.quantity = parseInt(existingItem.quantity) + parseInt(item.quantity);
            await existingItem.save();
        }

        const insertData = {
            referenceType: refType,
            from,
            toWarehouse,
            itemsList,
            company,
            arrivedDate,
            createdBy: req.user._id
        }

        const incomingInstallationItems = new IncomingItemsAccount(insertData);
        const savedData = await incomingInstallationItems.save();
        if (savedData) {
            return res.status(200).json({
                success: true,
                message: "Items Added To Installation Inventory Account",
                data: savedData
            });
        }
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Internal Server Error",
            error: error.message
        });
    }
};

module.exports.showIncomingItemToWarehouse = async (req, res) => {
    try {
        const warehouseId = req.user.warehouse;
        const incomingItems = await IncomingItemsAccount.find({toWarehouse: warehouseId})
        .populate({
            path: "toWarehouse",
            select: ({
                "_id": 0,
                "warehouseName": 1,
            })
        })
        .populate({
            path: "itemsList.subItemId",
            model: "SubItem",
            select: ({
                "_id": 1,
                "subItemName": 1,
            })
        }).select("-createdAt -__v").lean();
        
        return res.status(200).json({
            success: true,
            message: "Data Fetched Successfully",
            data: incomingItems || []
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Internal Server Error",
            error: error.message
        });
    }
};

module.exports.incomingWToWItem = async (req, res) => {
    try {
        const { fromWarehouse, toWarehouse, itemsList, driverName, driverContact, remarks, outgoing, pickupDate } = req.body;
        if (!fromWarehouse || !toWarehouse || !itemsList || !driverName || !driverContact || !remarks || !outgoing || !pickupDate) {
            return res.status(400).json({
                success: false,
                message: "All fields are required"
            });
        }

        if (!Array.isArray(itemsList) || itemsList.length === 0) {
            return res.status(400).json({
                success: false,
                message: "Items is an array & should be non-empty"
            });
        }

        if (outgoing === true) {
            for (let item of itemsList) {
                const existingItemData = await InstallationInventory.findOne({subItemId: item.subItemId, warehouseId: fromWarehouse });
                existingItemData.quantity = parseInt(existingItemData?.quantity) - parseInt(item.quantity);
                await existingItemData.save();
            }
        }

        const insertData = {
            fromWarehouse,
            toWarehouse,
            itemsList,
            driverName,
            driverContact: Number(driverContact),
            remarks,
            outgoing,
            pickupDate,
            createdBy: req.user._id
        }
        const incomingInventoryStock = new SystemInventoryWToW(insertData);
        const savedIncomingStock = await incomingInventoryStock.save();
        if (savedIncomingStock) {
            return res.status(200).json({
                success: true,
                message: "Incoming Inventory Stock Data Saved/Updated Successfully",
                data: savedIncomingStock
            });
        }
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Internal Server Error",
            error: error.message
        });
    }
};

module.exports.showIncomingWToWItems = async (req, res) => {
    try {
        const warehouseId = req.user.warehouse;
        if (!warehouseId) {
            return res.status(400).json({
                success: false,
                message: "WarehouseId Not Found"
            });
        }

        const result = await SystemInventoryWToW.find({ toWarehouse: warehouseId, status: false })
        .populate({
            path: "fromWarehouse",
            select: ({
                "_id": 1,
                "warehouseName": 1,
            })
        })
        .populate({
            path: "toWarehouse",
            select: ({
                "_id": 1,
                "warehouseName": 1,
            })
        })
        .populate({
            path: "itemsList.subItemId",
            model: "SubItem",
            select: ({
                "_id": 1,
                "subItemName": 1,
            })
        }).sort({ createdAt: -1 });
        return res.status(200).json({
            success: true,
            message: "Data Fetched Successfully",
            data: result || []
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Internal Server Error",
            error: error.message
        });
    }
};

module.exports.showOutgoingWToWItems = async (req, res) => {
    try {
        const warehouseId = req.user.warehouse;
        if (!warehouseId) {
            return res.status(400).json({
                success: false,
                message: "WarehouseId Not Found"
            });
        }

        const result = await SystemInventoryWToW.find({ fromWarehouse: warehouseId })
        .populate({
            path: "fromWarehouse",
            select: ({
                "_id": 1,
                "warehouseName": 1,
            })
        })
        .populate({
            path: "toWarehouse",
            select: ({
                "_id": 1,
                "warehouseName": 1,
            })
        })
        .populate({
            path: "itemsList.subItemId",
            model: "SubItem",
            select: ({
                "_id": 1,
                "subItemName": 1,
            })
        })
        .select("-createdAt -createdBy -__v").sort({ pickupDate: -1 });
        return res.status(200).json({
            success: true,
            message: "Data Fetched Successfully",
            data: result || []
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Internal Server Error",
            error: error.message
        });
    }
};

module.exports.acceptingWToWIncomingItems = async (req, res) => {
    try {
        const { transactionId, status, arrivedDate } = req.body;
        if (!transactionId) {
            return res.status(400).json({
                success: false,
                message: "TransactionId not found"
            });
        }
        let incomingSystemItems = await SystemInventoryWToW.findOne({ _id: transactionId })
        .populate({
            path: "fromWarehouse",
            select: ({
                "_id": 1,
                "warehouseName": 1,
            })
        })
        .populate({
            path: "toWarehouse",
            select: ({
                "_id": 1,
                "warehouseName": 1,
            })
        })
        .populate({
            path: "itemsList.subItemId",
            model: "SubItem",
            select: ({
                "_id": 1,
                "subItemName": 1,
            })
        }).select("-createdAt -createdBy -__v").sort({pickupDate: -1});
        if (!incomingSystemItems) {
            return res.status(400).json({
                success: false,
                message: "Incoming System Items Data Not Found"
            });
        }

        if(incomingSystemItems.status === true) {
            return res.status(400).json({
                success: false,
                message: "Incoming Items Already Approved"
            });
        }
        
        if (status === true) {
            for (let item of incomingSystemItems.itemsList) {
                const existingItemData = await InstallationInventory.findOne({ subItemId: item.subItemId, warehouseId: incomingSystemItems.toWarehouse });

                existingItemData.quantity = parseInt(existingItemData?.quantity) + parseInt(item.quantity);

                await existingItemData.save();
            }
        }

        incomingSystemItems.status = status;
        incomingSystemItems.arrivedDate = arrivedDate;
        incomingSystemItems.approvedBy = req.user._id;
        const approvedData = await incomingSystemItems.save();
        if(approvedData){
            return res.status(200).json({
                success: true,
                message: "Incoming System Items Approved Successfully"
            });
        }
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Internal Server Error",
            error: error.message
        });
    }

};

module.exports.incomingWToWSystemItemsHistory = async (req, res) => {
    try {
        const warehouseId = req.user.warehouse;
        const approvedData = await SystemInventoryWToW.find({ toWarehouse: warehouseId, status: true })
        .populate({
            path: "fromWarehouse",
            select: ({
                "_id": 1,
                "warehouseName": 1,
            })
        })
        .populate({
            path: "toWarehouse",
            select: ({
                "_id": 1,
                "warehouseName": 1,
            })
        })
        .populate({
            path: "itemsList.subItemId",
            model: "SubItem",
            select: ({
                "_id": 1,
                "subItemName": 1,
            })
        }).sort({ arrivedDate: -1 });
        console.log(approvedData);
        return res.status(200).json({
            success: true,
            message: "Approved Data Fetched Successfully",
            data: approvedData || []
        });
    } catch (error) {
        return res.status(200).json({
            success: false,
            message: "Internal Server Error",
            error: error.message
        })
    }
};

module.exports.outgoingWToWSystemItemsHistory = async (req, res) => {
    try {
        const warehouseId = req.user.warehouse;
        const approvedOutgoingItems = await SystemInventoryWToW.find({ fromWarehouse: warehouseId, status: true })
        .populate({
            path: "fromWarehouse",
            select: ({
                "_id": 1,
                "warehouseName": 1,
            })
        })
        .populate({
            path: "toWarehouse",
            select: ({
                "_id": 1,
                "warehouseName": 1,
            })
        })
        .populate({
            path: "itemsList.subItemId",
            model: "SubItem",
            select: ({
                "_id": 1,
                "subItemName": 1,
            })
        }).sort({ pickupDate: -1 });
        return res.status(200).json({
            success: true,
            message: "Approved Outgoing Items History",
            data: approvedOutgoingItems || []
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Internal Server Error",
            error: error.message
        });
    }
};

//Service Team Access 
module.exports.allServiceSurveyPersons = async (req, res) => {
    try {
        const [servicePersons, surveyPersons] = await Promise.all([
            ServicePerson.find().select("_id name"),
            SurveyPerson.find().select("_id name")
        ]);

        const allPersons = [
            ...surveyPersons.map((person) => ({ ...person, role: "surveyperson" })),
            ...servicePersons.map((person) => ({ ...person, role: "serviceperson" })),
        ];

        const cleanedData = allPersons.map((item) => ({
            _id: item._doc._id,
            name: item._doc.name,
            role: item.role
        }));

        return res.status(200).json({
            success: true,
            message: "Data Fetched Successfully",
            data: cleanedData || []
        });

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Internal Server Error",
            error: error.message
        });
    }
};

module.exports.filterServicePersonById = async (req, res) => {
    try {
        const { id } = req.query;
        let employeeName = await ServicePerson.findById({ _id: id }).select("-_id -email -contact -password -role -createdAt -latitude -longitude -state -block -district -refreshToken -__v -createdAt -updatedAt -createdBy -updatedBy");
        if (!employeeName) {
            employeeName = await SurveyPerson.findById({ _id: id }).select("-_id -email -contact -password -role -createdAt -latitude -longitude -state -block -district -refreshToken -__v -createdAt -updatedAt -createdBy -updatedBy");
        }
        return res.status(200).json({
            success: true,
            message: "Service Person Found",
            data: employeeName || ""
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Internal Server Error",
            error: error.message
        });
    }
};

module.exports.filterStateWiseServicePerson = async (req, res) => {
    try {
        const { state } = req.query;

        if (state) {
            // Query to count service persons in the specified state
            const count = await ServicePerson.countDocuments({ state });
            return res.status(200).json({
                success: true,
                message: `Number of service persons in state: ${state}`,
                state,
                count,
            });
        } else {
            // Aggregate query to group service persons by state and count them
            const servicePersonsByState = await ServicePerson.aggregate([
                {
                    $match: {
                        state: { $ne: null } // Exclude documents with null state
                    }
                },
                {
                    $group: {
                        _id: "$state", // Group by state
                        count: { $sum: 1 } // Count the number of documents
                    }
                },
                {
                    $project: {
                        state: "$_id", // Rename `_id` to `state`
                        count: 1, // Include the count field
                        _id: 0 // Exclude the original `_id` field
                    }
                }
            ]);

            return res.status(200).json({
                success: true,
                message: "All service persons grouped by state",
                data: servicePersonsByState,
            });
        }
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Internal Server Error",
            error: error.message,
        });
    }
};

module.exports.servicePersonBlockData = async (req, res) => {
    try {
        const blockData = await ServicePerson.find().select("_id name block");
        return res.status(200).json({
            success: true,
            message: "Data Fetched Successfully",
            data: blockData || []
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Internal Server Error",
            error: error.message
        });
    }
};

module.exports.showWarehousePersons = async (req, res) => {
    try {
        const id = req.query.id;
        const filter = {};
        if (id) filter._id = id;
        const allWarehousePersons = await WarehousePerson.find(filter).select("_id name");
        return res.status(200).json({
            success: true,
            message: "Warehouse Persons Data Fetched Successfully",
            data: allWarehousePersons || []
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Internal Server Error",
            error: error.message
        });
    }
};

module.exports.showIncomingItemsFromFarmer = async (req, res) => {
    try {
        const { page = 1, limit = 10 } = req.query;

        const pageNumber = parseInt(page, 10);
        const limitNumber = parseInt(limit, 10);
        const skip = (pageNumber - 1) * limitNumber;

        const incomingItemsData = await PickupItem.find({ incoming: true })
            .sort({ pickupDate: -1 })
            .skip(skip)
            .limit(limitNumber)
            .select("-servicePerson -__v -image");

        const totalItems = await PickupItem.countDocuments({ incoming: true });

        return res.status(200).json({
            success: true,
            message: "Data Fetched Successfully",
            data: incomingItemsData || [],
            pagination: {
                totalItems,
                totalPages: Math.ceil(totalItems / limitNumber),
                currentPage: pageNumber,
                perPage: limitNumber
            }
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Internal Server Error",
            error: error.message
        });
    }
};

// module.exports.showAllSystemInstallation = async (req, res) => {
//     try {
//         const allSystemInstallations = await NewSystemInstallation.find().select("-referenceType -createdBy -__v");
//         return res.status(200).json({
//             success: true,
//             message: "Data Fetched Successfully",
//             data: allSystemInstallations || []
//         });
//     } catch (error) {
//         return res.status(500).json({
//             success: false,
//             message: "Internal Server Error",
//             error: error.message
//         })
//     }
// };
