const axios = require("axios");
const mongoose = require("mongoose");
const XLSX = require("xlsx");
const imageHandlerWithPath = require("../../middlewares/imageHandlerWithPath");
const Item = require("../../models/serviceInventoryModels/itemSchema");
const Warehouse = require("../../models/serviceInventoryModels/warehouseSchema");
const WarehousePerson = require("../../models/serviceInventoryModels/warehousePersonSchema");
const WarehouseItems = require("../../models/serviceInventoryModels/warehouseItemsSchema");
const ServicePerson = require("../../models/serviceInventoryModels/servicePersonSchema");
const SurveyPerson = require("../../models/serviceInventoryModels/surveyPersonSchema");
const RepairNRejectItems = require("../../models/serviceInventoryModels/repairNRejectSchema");
const PickupItem = require("../../models/serviceInventoryModels/pickupItemSchema");
const System = require("../../models/systemInventoryModels/systemSchema");
const SystemItem = require("../../models/systemInventoryModels/systemItemSchema");
const SystemItemMap = require("../../models/systemInventoryModels/systemItemMapSchema");
const ItemComponentMap = require("../../models/systemInventoryModels/itemComponentMapSchema");
const SystemInventoryWToW = require("../../models/systemInventoryModels/systemItemsWToWSchema");
const InstallationInventory = require("../../models/systemInventoryModels/installationInventorySchema");
const FarmerItemsActivity = require("../../models/systemInventoryModels/farmerItemsActivity");
const InstallationAssignEmp = require("../../models/systemInventoryModels/installationAssignEmpSchema");
const IncomingItemsAccount = require("../../models/systemInventoryModels/incomingNewSystemItems");
const NewSystemInstallation = require("../../models/systemInventoryModels/newSystemInstallationSchema");
const StockUpdateActivity = require("../../models/systemInventoryModels/stockUpdateActivity");
const StockHistory = require("../../models/serviceInventoryModels/stockHistorySchema");
const OutgoingItems = require("../../models/serviceInventoryModels/outgoingItems");

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

        if (allWarehouses.length === 0) {
            return res.status(404).json({
                success: false,
                message: "No Warehouses Found",
            });
        }

        return res.status(200).json({
            success: true,
            message: "Data Fetched Successfully",
            allWarehouses,
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Internal Server Error",
            error: error.message,
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

module.exports.showStockUpdateHistory = async (req, res) => {
    try {
        const allStockUpdateHistory = await StockHistory.find()
            .populate("empId", "name")
            .populate("warehouseId", "warehouseName")
            .select("-_id -__v")
            .sort({ createdAt: -1 });

        if (!allStockUpdateHistory) {
            return res.status(404).json({
                success: false,
                message: "Stock Update History Not Found"
            });
        }

        return res.status(200).json({
            success: true,
            message: "Data Fetched Successfully",
            data: allStockUpdateHistory
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Internal Server Error",
            error: error.message
        });
    }
}

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

module.exports.showItems = async (req, res) => {
    try {
        const itemsData = await Items

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Internal Server Error",
            error: error.message
        });
    }
}

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
                        quantity: newItem.quantity,
                        newStock: 0 // Will always be zero at this point
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
        const empId = req.user._id;
        const { items, defective } = req.body;

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

            const existingItem = warehouseItemsRecord.items.find(item => item.itemName.toLowerCase().trim() === itemName.toLowerCase().trim());

            if (!existingItem) {
                return res.status(400).json({
                    success: false,
                    message: "Item Doesn't Exists In Warehouse"
                });
            } else {
                existingItem.newStock = parseInt(existingItem.newStock) + parseInt(newItem.newStock);
                existingItem.quantity = parseInt(existingItem.quantity) + parseInt(newItem.quantity);
                existingItem.defective = parseInt(existingItem.defective) + parseInt(defective);

                const stockHistory = new StockHistory({
                    empId,
                    warehouseId,
                    itemName: existingItem.itemName,
                    newStock: newItem.newStock,
                    quantity: newItem.quantity,
                    defective: defective
                });
                await stockHistory.save();
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
        const { itemName, serialNumber, repaired, repairedBy, remark, createdAt, changeMaterial } = req.body;

        if (!itemName || !repaired || !serialNumber || !remark || !repairedBy || !createdAt || !changeMaterial) {
            return res.status(400).json({
                success: false,
                message: "itemName is required"
            });
        }

        // const itemRecord = await Item.findOne({ itemName });
        // if (!itemRecord) {
        //     return res.status(404).json({
        //         success: false,
        //         message: "Item Not Found In ItemSchema"
        //     });
        // }

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
            // if (itemRecord.defective !== 0 && itemRecord.defective >= (parseInt(repaired))) {
            //     itemRecord.defective = parseInt(itemRecord.defective) - parseInt(repaired);
            //     itemRecord.stock = parseInt(itemRecord.stock) + parseInt(repaired);
            //     itemRecord.repaired = parseInt(itemRecord.repaired) + parseInt(repaired);
            // } else {
            //     return res.status(403).json({
            //         success: false,
            //         message: "Defective is less than repaired. Cannot be updated"
            //     })
            // }
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

        //await itemRecord.save();
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
            changeMaterial
        })

        await repairProductData.save();

        return res.status(200).json({
            success: true,
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

        // const itemRecord = await Item.findOne({ itemName });
        // if (!itemRecord) {
        //     return res.status(404).json({
        //         success: false,
        //         message: "Item Not Found In ItemSchema"
        //     });
        // }

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
            // if (itemRecord.defective !== 0 && itemRecord.defective >= (parseInt(rejected))) {
            //     itemRecord.defective = parseInt(itemRecord.defective) - parseInt(rejected);
            //     itemRecord.rejected = parseInt(itemRecord.rejected) + parseInt(rejected);
            // } else {
            //     return res.status(403).json({
            //         success: false,
            //         message: "Defective is less than rejected. Cannot be updated"
            //     });
            // }
        }

        //await itemRecord.save();
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
            success: true,
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
                message: "WarehouseId not found"
            });
        }

        const warehouseData = await Warehouse.findOne({ _id: warehouseId });
        const warehouseName = warehouseData.warehouseName;
        return res.status(200).json({
            success: true,
            message: "Warehouse Fetched Successfully",
            warehouseId,
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

// module.exports.addSystemItem = async (req, res) => {
//     try {
//         const { itemName } = req.body;
//         const empId = req.user._id;
//         // const warehouseId = req.user.warehouse;
//         if (!itemName) {
//             return res.status(400).json({
//                 success: false,
//                 message: "All fields are required"
//             });
//         }

//         const insertData = {
//             itemName: itemName.trim(),
//             createdBy: empId
//         };

//         const existingSystemItem = await SystemItem.findOne({ itemName: itemName.trim() });
//         if (existingSystemItem) {
//             return res.status(400).json({
//                 success: false,
//                 message: "Duplicate Data: systemId & itemName already exists"
//             });
//         }

//         const newSystemItem = new SystemItem(insertData);
//         const savedSystemItem = await newSystemItem.save();

//         if (savedSystemItem) {
//             return res.status(200).json({
//                 success: true,
//                 message: "System Item Added Successfully",
//                 savedSystemItem,
//             });
//         }
//     } catch (error) {
//         return res.status(500).json({
//             success: false,
//             message: "Internal Server Error",
//             error: error.message
//         });
//     }
// };

module.exports.addSystemItem = async (req, res) => {
    try {
        const { itemName } = req.body;
        const empId = req.user._id;

        if (!itemName) {
            return res.status(400).json({
                success: false,
                message: "Item name is required"
            });
        }

        const trimmedName = itemName.trim();

        // Check for duplicate
        const existingSystemItem = await SystemItem.findOne({ itemName: trimmedName });
        if (existingSystemItem) {
            return res.status(400).json({
                success: false,
                message: "Duplicate Data: itemName already exists"
            });
        }

        // Save new system item
        const newSystemItem = new SystemItem({
            itemName: trimmedName,
            createdBy: empId
        });
        const savedSystemItem = await newSystemItem.save();

        // Add this item to all warehouses' inventories
        const allWarehouses = await Warehouse.find();
        for (let warehouse of allWarehouses) {
            const exists = await InstallationInventory.findOne({
                warehouseId: warehouse._id,
                systemItemId: savedSystemItem._id
            });

            if (!exists) {
                const newInventory = new InstallationInventory({
                    warehouseId: warehouse._id,
                    systemItemId: savedSystemItem._id,
                    quantity: 0,
                    createdBy: empId
                });
                await newInventory.save();
            }
        }

        return res.status(200).json({
            success: true,
            message: "System Item Added and Mapped to All Warehouses Successfully",
            data: savedSystemItem
        });

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Internal Server Error",
            error: error.message
        });
    }
};


module.exports.addSystemSubItem = async (req, res) => {
    try {
        const { systemId, systemItemId, quantity } = req.body;
        const empId = req.user._id;
        if (!systemId || !systemItemId || !quantity) {
            return res.status(400).json({
                success: false,
                message: "All fields are required"
            });
        }

        const systemItem = await SystemItem.findOne({ _id: systemItemId });
        if (!systemItem) {
            return res.status(404).json({
                success: false,
                message: "SystemItem Not Found"
            });
        }

        const existingSystemSubItem = await SystemSubItem.findOne({
            systemId,
            systemItemId,
            // subItemName: { $regex: new RegExp("^" + subItemName + "$", "i") } // Case-insensitive search
        });
        if (existingSystemSubItem) {
            return res.status(400).json({
                success: false,
                message: "Duplicate Data: With Same systemId, systemItemId ",
                data: existingSystemSubItem,
            })
        }

        const insertSystemSubItem = {
            systemId,
            systemItemId,
            // subItemName: subItemName.trim(),
            quantity,
            createdBy: empId,
        }

        const newSystemSubItem = new SystemSubItem(insertSystemSubItem);
        const savedSystemSubItem = await newSystemSubItem.save();

        // const allWarehouses = await Warehouse.find();
        // //let newInventoryItem, savedInventoryItem;

        // // for (let warehouse of allWarehouses) {
        // //     const existingInventoryItem = await InstallationInventory.findOne({ warehouseId: warehouse._id, subItemId: savedSubItem._id });
        // //     if (!existingInventoryItem) {
        // //         newInventoryItem = new InstallationInventory({ warehouseId: warehouse._id, subItemId: savedSubItem._id, quantity: 0, createdBy: empId });
        // //         savedInventoryItem = await newInventoryItem.save();
        // //     }
        // // }

        // for (let warehouse of allWarehouses) {
        //     // Find an existing inventory item in the warehouse and populate the subItemId to check its name
        //     // const existingInventoryItem = await InstallationInventory.findOne({ warehouseId: warehouse._id })
        //     //     .populate('systemItemId'); // Populate subItemId to get the name field

        //     // // Check if an inventory item exists with the same name
        //     // const itemExists = existingInventoryItem && existingInventoryItem.systemItemId.itemName.toLowerCase().trim() === savedSystemSubItem.itemName.toLowerCase().trim();

        //     // if (!itemExists) {
        //     //     const newInventoryItem = new InstallationInventory({
        //     //         warehouseId: warehouse._id,
        //     //         systemItemId: savedSubItem._id,
        //     //         quantity: 0,
        //     //         createdBy: empId
        //     //     });

        //     //     await newInventoryItem.save();

        //     // Check if inventory item already exists for that warehouse, systemId, and systemItemId
        //     const existingInventoryItem = await InstallationInventory.findOne({
        //         warehouseId: warehouse._id,
        //         //systemId: systemId,
        //         systemItemId: systemItemId
        //     });

        //     if (!existingInventoryItem) {
        //         const newInventoryItem = new InstallationInventory({
        //             warehouseId: warehouse._id,
        //             //systemId: systemId,
        //             systemItemId: systemItemId,
        //             quantity: 0,
        //             createdBy: empId
        //         });

        //         await newInventoryItem.save();
        //     }
        // }
        if (savedSystemSubItem) {
            return res.status(200).json({
                success: true,
                message: "System & SystemItem Attached Successfully",
                data: savedSystemSubItem
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

module.exports.showSystemItems = async (req, res) => {
    try {
        // const { systemId } = req.query;
        // if (!systemId) {
        //     return res.status(400).json({
        //         success: false,
        //         message: "SystemId Not Found"
        //     });
        // }

        const systemItemData = await SystemItem.find().select("-__v -createdAt -updatedAt -createdBy -updatedBy").lean();
        if (systemItemData) {
            return res.status(200).json({
                success: true,
                message: "System Item Fetched Successfully",
                data: systemItemData || []
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

module.exports.showSystemItemMapData = async (req, res) => {
    try {
        const { systemId } = req.query;
        const systemSubItemData = await SystemItemMap.find({ systemId: systemId })
            .populate({
                path: "systemItemId",
                select: {
                    "_id": 1,
                    "itemName": 1,
                }
            }).select("-_id -__v -createdAt -updatedAt -createdBy -updatedBy").lean();
        if (!systemSubItemData.length) {
            return res.status(404).json({
                success: false,
                message: "No system items found for this system."
            });
        }
        res.status(200).json({
            success: true,
            data: systemSubItemData
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

module.exports.showItemComponents = async (req, res) => {
    try {
        const { systemId, systemItemId } = req.query;
        if (!systemId || !systemItemId) {
            return res.status(400).json({
                success: false,
                message: "systemId and systemItemId are required"
            });
        }
        const itemComponentData = await ItemComponentMap.find({ systemId, systemItemId })
            .populate({
                path: "subItemId",
                select: {
                    "_id": 1,
                    "itemName": 1,
                }
            }).select("-systemId -systemItemId -_id -__v -createdAt -updatedAt -createdBy -updatedBy").lean();
        if (!itemComponentData.length) {
            return res.status(404).json({
                success: false,
                message: "No item components found for this system item."
            });
        }
        res.status(200).json({
            success: true,
            data: itemComponentData
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Internal Server Error",
            error: error.message
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

module.exports.showInstallationInventoryItems = async (req, res) => {
    try {
        const warehouseId = req.user.warehouse;
        const inventorySystemItems = await InstallationInventory.find({ warehouseId: warehouseId })
            .populate({
                path: "systemItemId",
                select: ({
                    "_id": 1,
                    "itemName": 1,
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

module.exports.showItemsWithStockStatus = async (req, res) => {
    try {
        const warehouseId = req.user.warehouse;
        const systemId = req.query.systemId;
        const systemCount = 25;

        if (!systemId) {
            return res.status(400).json({
                success: false,
                message: "systemId is required"
            });
        }

        // Step 1: Fetch required items and quantities for the system
        const [systemItemMaps, subItemMaps] = await Promise.all([
            SystemItemMap.find({ systemId }).select("systemItemId quantity").lean(),
            ItemComponentMap.find({ systemId }).select("subItemId quantity").lean()
        ]);

        const requiredQtyMap = new Map();
        const itemIdSet = new Set();

        systemItemMaps.forEach(({ systemItemId, quantity }) => {
            const id = systemItemId.toString();
            requiredQtyMap.set(id, (requiredQtyMap.get(id) || 0) + quantity * systemCount);
            itemIdSet.add(id);
        });

        subItemMaps.forEach(({ subItemId, quantity }) => {
            const id = subItemId.toString();
            requiredQtyMap.set(id, (requiredQtyMap.get(id) || 0) + quantity * systemCount);
            itemIdSet.add(id);
        });

        const itemIds = Array.from(itemIdSet);

        // Step 2: Fetch inventory for these item IDs in the warehouse
        const inventoryItems = await InstallationInventory.find({
            warehouseId,
            systemItemId: { $in: itemIds }
        })
            .populate({
                path: "systemItemId",
                select: "_id itemName"
            })
            .select("systemItemId quantity")
            .lean();

        const inventoryMap = new Map();

        for (const item of inventoryItems) {
            const id = item.systemItemId._id.toString();
            if (!inventoryMap.has(id)) {
                inventoryMap.set(id, {
                    systemItemId: {
                        _id: item.systemItemId._id,
                        itemName: item.systemItemId.itemName
                    },
                    quantity: 0
                });
            }
            inventoryMap.get(id).quantity += item.quantity;
        }

        // Step 3: Construct final result array
        const result = [];

        for (const id of itemIds) {
            const requiredQuantity = requiredQtyMap.get(id) || 0;
            const inv = inventoryMap.get(id);

            let quantity = 0;
            let systemItemData = {
                _id: id,
                itemName: "Unknown Item"
            };

            if (inv) {
                quantity = inv.quantity;
                systemItemData = inv.systemItemId;
            }

            let materialShort = 0;
            if (quantity < requiredQuantity) {
                materialShort = requiredQuantity - quantity;
            }

            result.push({
                systemItemId: systemItemData,
                quantity,
                requiredQuantity,
                stockLow: quantity < requiredQuantity,
                materialShort
            });
        }

        // Step 4: Sort by quantity ascending
        result.sort((a, b) => a.quantity - b.quantity);

        return res.status(200).json({
            success: true,
            message: "Inventory fetched with stock status",
            data: result
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
        const { systemItemId, updatedQuantity } = req.body;

        const filter = {
            warehouseId: warehouseId,
            systemItemId: systemItemId,
        }
        const itemData = await InstallationInventory.findOne(filter);
        itemData.quantity = parseInt(itemData.quantity) + parseInt(updatedQuantity);
        itemData.updatedAt = Date.now();
        itemData.updatedBy = req.user._id;
        let refType;
        if (req.user.role === "admin") {
            refType = "Admin";
        } else if (req.user.role === "warehouseAdmin") {
            refType = "WarehousePerson"
        }

        const insertData = {
            referenceType: refType,
            warehouseId,
            systemItemId,
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

// module.exports.addNewInstallationData = async (req, res) => {
//     try {
//         const {
//             farmerSaralId,
//             empId,
//             systemId,
//             itemsList,
//             panelNumbers,
//             pumpNumber,
//             controllerNumber,
//             rmuNumber,
//         } = req.body;
//         console.log(req.body);
//         const warehousePersonId = req.user._id;
//         const warehouseId = req.user.warehouse;

//         if (
//             !farmerSaralId ||
//             !empId ||
//             !systemId ||
//             !itemsList ||
//             !panelNumbers ||
//             !pumpNumber ||
//             !controllerNumber ||
//             !rmuNumber) {
//             return res.status(400).json({
//                 success: false,
//                 message: "All fields are required"
//             });
//         }

//         if (!Array.isArray(itemsList) || itemsList.length === 0) {
//             return res.status(400).json({
//                 success: false,
//                 message: "itemsList should be a non-empty array"
//             });
//         }

//         let refType;
//         let empData = await ServicePerson.findOne({ _id: empId });
//         if (empData) {
//             refType = "ServicePerson";
//         } else {
//             empData = await SurveyPerson.findOne({ _id: empId });
//             if (!empData) {
//                 return res.status(400).json({
//                     success: false,
//                     message: "EmpID Not Found In Database"
//                 })
//             }
//             refType = "SurveyPerson";
//         }


//         for (const item of itemsList) {
//             const { systemItemId, quantity } = item; // Get subItemName instead of subItemId

//             const systemItemData = await SystemItem.findOne({ _id: systemItemId });
//             if (!systemItemData) {
//                 return res.status(400).json({
//                     success: false,
//                     message: "SystemItem Not Found"
//                 });
//             }

//             // Find all inventory items in the warehouse
//             const inventoryItems = await InstallationInventory.find({ warehouseId: req.user.warehouse })
//                 .populate({
//                     path: "systemItemId",
//                     select: { itemName: 1 },
//                 });

//             // Find the item in the inventory based on subItemName (case-insensitive)
//             const inventoryItem = inventoryItems.find(
//                 (inv) => inv.systemItemId.itemName.toLowerCase() === systemItemData.itemName.toLowerCase()
//             );

//             if (!inventoryItem) {
//                 return res.status(404).json({
//                     success: false,
//                     message: `SubItem "${systemItemData.itemName}" not found in warehouse inventory`
//                 });
//                 //throw new Error(`SubItem "${systemItemData.itemName}" not found in warehouse inventory`);
//             }

//             if (inventoryItem.quantity < quantity) {
//                 return res.status(400).json({
//                     success: false,
//                     message: `Insufficient stock for item "${systemItemData.itemName}"`
//                 });
//                 //throw new Error(`Insufficient stock for item "${systemItemData.itemName}"`);
//             }

//             // Update inventory quantity
//             inventoryItem.quantity = parseInt(inventoryItem.quantity) - parseInt(quantity);
//             inventoryItem.updatedAt = new Date();
//             inventoryItem.updatedBy = warehousePersonId;
//             await inventoryItem.save();
//         }

//         const accountData = {
//             warehouseId,
//             referenceType: refType,
//             empId,
//             farmerSaralId,
//             systemId,
//             itemsList: itemsList,
//             createdBy: warehousePersonId
//         };
//         console.log(accountData);

//         const activityData = {
//             warehouseId,
//             referenceType: refType,
//             farmerSaralId,
//             empId,
//             systemId,
//             itemsList,
//             panelNumbers,
//             pumpNumber,
//             controllerNumber,
//             rmuNumber,
//             createdBy: warehousePersonId
//         }
//         console.log(activityData);

//         const farmerActivity = new FarmerItemsActivity(activityData);
//         const savedFarmerActivity = await farmerActivity.save();
//         if (!savedFarmerActivity) {
//             console.log("Hi");
//             return res.status(400).json({
//                 success: false,
//                 message: "Failed to save farmer activity"
//             });
//         }
//         console.log("savedFarmerActivity", savedFarmerActivity);

//         const empAccountData = new InstallationAssignEmp(accountData);
//         const savedEmpAccountData = await empAccountData.save();
//         if (!savedEmpAccountData) {
//             console.log("Hi2");
//             return res.status(400).json({
//                 success: false,
//                 message: "Failed to save employee account data"
//             });
//         }
//         console.log("savedEmpAccountData", savedEmpAccountData);

//         if (savedFarmerActivity && savedEmpAccountData) {
//             // try {
//             //     const apiUrl = `http://88.222.214.93:8001/warehouse/assignWarehouseUpdate?farmerId=${farmerSaralId}`
//             //     await axios.put(apiUrl);
//             //     console.log("API request sent successfully");
//             // } catch (error) {
//             //     console.log("Error sending API request: ", error.message);
//             // }
//             return res.status(200).json({
//                 success: true,
//                 message: "Data Saved Successfully",
//                 farmerActivity,
//                 empAccountData,
//             });
//         }
//     } catch (error) {
//         return res.status(500).json({
//             success: false,
//             message: "Internal Server Error",
//             error: error.message
//         });
//     }
// };

// module.exports.addNewInstallationData = async (req, res) => {
//     const session = await mongoose.startSession();
//     session.startTransaction();

//     try {
//         const {
//             farmerSaralId,
//             empId,
//             systemId,
//             itemsList,
//             panelNumbers,
//             pumpNumber,
//             controllerNumber,
//             rmuNumber,
//         } = req.body;
//         console.log(req.body);
//         const warehousePersonId = req.user._id;
//         const warehouseId = req.user.warehouse;

//         if (
//             !farmerSaralId || !empId || !systemId || !itemsList || !panelNumbers ||
//             !pumpNumber || !controllerNumber || !rmuNumber
//         ) {
//             await session.abortTransaction();
//             session.endSession();
//             return res.status(400).json({ success: false, message: "All fields are required" });
//         }

//         if (!Array.isArray(itemsList) || itemsList.length === 0) {
//             await session.abortTransaction();
//             session.endSession();
//             return res.status(400).json({ success: false, message: "itemsList should be a non-empty array" });
//         }

//         let refType;
//         let empData = await ServicePerson.findOne({ _id: empId }).session(session);
//         if (empData) {
//             refType = "ServicePerson";
//         } else {
//             empData = await SurveyPerson.findOne({ _id: empId }).session(session);
//             if (!empData) {
//                 await session.abortTransaction();
//                 session.endSession();
//                 return res.status(400).json({ success: false, message: "EmpID Not Found In Database" });
//             }
//             refType = "SurveyPerson";
//         }

//         for (const item of itemsList) {
//             const { systemItemId, quantity } = item;

//             const systemItemData = await SystemItem.findOne({ _id: systemItemId }).session(session);
//             if (!systemItemData) {
//                 await session.abortTransaction();
//                 session.endSession();
//                 return res.status(400).json({ success: false, message: "SystemItem Not Found" });
//             }

//             const inventoryItems = await InstallationInventory.find({ warehouseId })
//                 .populate({
//                     path: "systemItemId",
//                     select: { itemName: 1 },
//                 })
//                 .session(session);

//             const inventoryItem = inventoryItems.find(
//                 (inv) => inv.systemItemId.itemName.toLowerCase() === systemItemData.itemName.toLowerCase()
//             );

//             if (!inventoryItem) {
//                 await session.abortTransaction();
//                 session.endSession();
//                 return res.status(404).json({
//                     success: false,
//                     message: `SubItem "${systemItemData.itemName}" not found in warehouse inventory`
//                 });
//             }

//             if (inventoryItem.quantity < quantity) {
//                 await session.abortTransaction();
//                 session.endSession();
//                 return res.status(400).json({
//                     success: false,
//                     message: `Insufficient stock for item "${systemItemData.itemName}"`
//                 });
//             }

//             // Update inventory quantity
//             inventoryItem.quantity = parseInt(inventoryItem.quantity) - parseInt(quantity);
//             inventoryItem.updatedAt = new Date();
//             inventoryItem.updatedBy = warehousePersonId;
//             await inventoryItem.save({ session });
//         }

//         const accountData = {
//             warehouseId,
//             referenceType: refType,
//             empId,
//             farmerSaralId,
//             systemId,
//             itemsList,
//             createdBy: warehousePersonId
//         };

//         const activityData = {
//             warehouseId,
//             referenceType: refType,
//             farmerSaralId,
//             empId,
//             systemId,
//             itemsList,
//             panelNumbers,
//             pumpNumber,
//             controllerNumber,
//             rmuNumber,
//             createdBy: warehousePersonId
//         };

//         const farmerActivity = new FarmerItemsActivity(activityData);
//         const savedFarmerActivity = await farmerActivity.save({ session });
//         if (!savedFarmerActivity) {
//             await session.abortTransaction();
//             session.endSession();
//             return res.status(400).json({
//                 success: false,
//                 message: "Failed to save farmer activity"
//             });
//         }

//         const empAccountData = new InstallationAssignEmp(accountData);
//         const savedEmpAccountData = await empAccountData.save({ session });
//         if (!savedEmpAccountData) {
//             await session.abortTransaction();
//             session.endSession();
//             return res.status(400).json({
//                 success: false,
//                 message: "Failed to save employee account data"
//             });
//         }

//         // COMMIT transaction
//         await session.commitTransaction();
//         session.endSession();

//         return res.status(200).json({
//             success: true,
//             message: "Data Saved Successfully",
//             farmerActivity,
//             empAccountData,
//         });

//     } catch (error) {
//         await session.abortTransaction();
//         session.endSession();
//         return res.status(500).json({
//             success: false,
//             message: "Internal Server Error",
//             error: error.message
//         });
//     }
// };

module.exports.addNewInstallationData = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const {
            farmerSaralId,
            empId,
            systemId,
            itemsList,
            panelNumbers,
            pumpNumber,
            motorNumber,
            controllerNumber,
            rmuNumber,
            extraItemsList,
        } = req.body;

        // const existingFarmer = await axios.get(`http://88.222.214.93:8000/farmer/showFarmerAccordingToSaralId?saralId=${farmerSaralId}`);
        // if(existingFarmer.data.data.length === 0) {
        //     await session.abortTransaction();
        //     session.endSession();
        //     return res.status(404).json({
        //         success: false,
        //         message: "Farmer Not Found"
        //     });
        // }

        const warehousePersonId = req.user._id;
        const warehouseId = req.user.warehouse;

        if (
            !farmerSaralId || !empId || !systemId || !panelNumbers ||
            !pumpNumber || !motorNumber || !controllerNumber || !rmuNumber
        ) {
            await session.abortTransaction();
            session.endSession();
            return res.status(400).json({ success: false, message: "All fields are required" });
        }

        // Determine employee type
        let refType;
        let empData = await ServicePerson.findOne({ _id: empId }).session(session);
        if (empData) {
            refType = "ServicePerson";
        } else {
            empData = await SurveyPerson.findOne({ _id: empId }).session(session);
            if (!empData) {
                await session.abortTransaction();
                session.endSession();
                return res.status(400).json({ success: false, message: "EmpID Not Found In Database" });
            }
            refType = "SurveyPerson";
        }

        // Build itemsList from SystemItemMap and ItemComponentMap
        const systemItemsMapped = await SystemItemMap.find({ systemId }).session(session);
        let allItems = [];

        for (const itemMap of systemItemsMapped) {
            const mainItemId = itemMap.systemItemId;
            const mainQuantity = itemMap.quantity;

            allItems.push({ systemItemId: mainItemId.toString(), quantity: mainQuantity });
        }

        for (const item of itemsList) {
            const subItemMaps = await ItemComponentMap.find({
                systemId,
                systemItemId: item.systemItemId
            }).session(session);

            for (const subMap of subItemMaps) {
                allItems.push({
                    systemItemId: subMap.subItemId.toString(),
                    quantity: subMap.quantity
                });
            }
        }

        const itemsMap = new Map();
        for (const item of allItems) {
            if (itemsMap.has(item.systemItemId)) {
                itemsMap.set(item.systemItemId, itemsMap.get(item.systemItemId) + item.quantity);
            } else {
                itemsMap.set(item.systemItemId, item.quantity);
            }
        }

        const finalItemsList = Array.from(itemsMap.entries()).map(([systemItemId, quantity]) => ({
            systemItemId,
            quantity
        }));
        console.log("Final Items List:", finalItemsList);

        // Inventory check and update
        for (const item of finalItemsList) {
            const { systemItemId, quantity } = item;

            const systemItemData = await SystemItem.findOne({ _id: systemItemId }).session(session);
            if (!systemItemData) {
                await session.abortTransaction();
                session.endSession();
                return res.status(400).json({ success: false, message: "SystemItem Not Found" });
            }

            const inventoryItems = await InstallationInventory.find({ warehouseId })
                .populate({
                    path: "systemItemId",
                    select: { itemName: 1 },
                })
                .session(session);

            const inventoryItem = inventoryItems.find(
                (inv) => inv.systemItemId._id.toString() === systemItemId
            );

            if (!inventoryItem) {
                await session.abortTransaction();
                session.endSession();
                return res.status(404).json({
                    success: false,
                    message: `Item "${systemItemData.itemName}" not found in warehouse inventory`
                });
            }

            if (inventoryItem.quantity < quantity) {
                await session.abortTransaction();
                session.endSession();
                return res.status(400).json({
                    success: false,
                    message: `Insufficient stock for item "${systemItemData.itemName}"`
                });
            }

            // Update inventory quantity
            inventoryItem.quantity = inventoryItem.quantity - quantity;
            inventoryItem.updatedAt = new Date();
            inventoryItem.updatedBy = warehousePersonId;
            await inventoryItem.save({ session });
        }

        if (extraItemsList && Array.isArray(extraItemsList) && extraItemsList.length > 0) {
            for (const item of finalItemsList) {
                const { systemItemId, quantity } = item;

                const systemItemData = await SystemItem.findOne({ _id: systemItemId }).session(session);
                if (!systemItemData) {
                    await session.abortTransaction();
                    session.endSession();
                    return res.status(400).json({ success: false, message: "SystemItem Not Found" });
                }

                const inventoryItems = await InstallationInventory.find({ warehouseId })
                    .populate({
                        path: "systemItemId",
                        select: { itemName: 1 },
                    })
                    .session(session);

                const inventoryItem = inventoryItems.find(
                    (inv) => inv.systemItemId._id.toString() === systemItemId
                );

                if (!inventoryItem) {
                    await session.abortTransaction();
                    session.endSession();
                    return res.status(404).json({
                        success: false,
                        message: `Item "${systemItemData.itemName}" not found in warehouse inventory`
                    });
                }

                if (inventoryItem.quantity < quantity) {
                    await session.abortTransaction();
                    session.endSession();
                    return res.status(400).json({
                        success: false,
                        message: `Insufficient stock for item "${systemItemData.itemName}"`
                    });
                }

                // Update inventory quantity
                inventoryItem.quantity = inventoryItem.quantity - quantity;
                inventoryItem.updatedAt = new Date();
                inventoryItem.updatedBy = warehousePersonId;
                await inventoryItem.save({ session });
            }
        }


        // Save activity and assignment
        const accountData = {
            warehouseId,
            referenceType: refType,
            empId,
            farmerSaralId,
            systemId,
            itemsList: finalItemsList,
            extraItemsList: extraItemsList || [],
            createdBy: warehousePersonId
        };

        const activityData = {
            warehouseId,
            referenceType: refType,
            farmerSaralId,
            empId,
            systemId,
            itemsList: finalItemsList,
            extraItemsList: extraItemsList || [],
            panelNumbers,
            pumpNumber,
            motorNumber,
            controllerNumber,
            rmuNumber,
            createdBy: warehousePersonId
        };

        const farmerActivity = new FarmerItemsActivity(activityData);
        const savedFarmerActivity = await farmerActivity.save({ session });
        if (!savedFarmerActivity) {
            await session.abortTransaction();
            session.endSession();
            return res.status(400).json({
                success: false,
                message: "Failed to save farmer activity"
            });
        }

        const empAccountData = new InstallationAssignEmp(accountData);
        const savedEmpAccountData = await empAccountData.save({ session });
        if (!savedEmpAccountData) {
            await session.abortTransaction();
            session.endSession();
            return res.status(400).json({
                success: false,
                message: "Failed to save employee account data"
            });
        }

        // COMMIT transaction
        await session.commitTransaction();
        session.endSession();

        return res.status(200).json({
            success: true,
            message: "Data Saved Successfully",
            farmerActivity,
            empAccountData,
        });

    } catch (error) {
        await session.abortTransaction();
        session.endSession();
        return res.status(500).json({
            success: false,
            message: "Internal Server Error",
            error: error.message
        });
    }
}

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
                path: "itemsList.systemItemId", // Populate subItem details
                model: "SystemItem",
                select: ({
                    "_id": 0,
                    "itemName": 1,
                })
            }).sort({ createdAt: -1 });
        
        const activitiesWithFarmerDetails = await Promise.all(
            showData.map(async (data) => {
                try {
                    const response = await axios.get(
                        `http://88.222.214.93:8001/farmer/showFarmerAccordingToSaralId?saralId=${data.farmerSaralId}`
                    );

                    return {
                        ...data.toObject(),
                        farmerDetails: response?.data?.data || null,
                    };
                } catch (err) {
                    console.error("Failed to fetch farmer details for SaralId:", data.farmerSaralId, err.message);
                    return {
                        ...data.toObject(),
                        farmerDetails: null,
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
            const { systemItemId, quantity } = item;
            const systemItemData = await SystemItem.findOne({ _id: systemItemId });
            if (!systemItemData) {
                return res.status(400).json({
                    success: false,
                    message: "SubItem Not Found"
                });
            }

            const existingInventoryItems = await InstallationInventory.find({ warehouseId: req.user.warehouse })
                .populate({
                    path: "systemItemId",
                    select: "itemName",
                });

            // Check if any inventory item has a subItemId with a matching subItemName
            const existingItem = existingInventoryItems.find(
                (inv) => inv.systemItemId.itemName.toLowerCase().trim() === systemItemData.itemName.toLowerCase().trim()
            );

            if (!existingItem) {
                throw new Error(`SubItem "${systemItemData.itemName}" not found in warehouse inventory`);
            }

            // Update inventory quantity
            existingItem.quantity = parseInt(existingItem.quantity) + parseInt(quantity);
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
                message: "Items Added & Stock Updated To Installation Inventory Account",
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
        const incomingItems = await IncomingItemsAccount.find({ toWarehouse: warehouseId })
            .populate({
                path: "toWarehouse",
                select: ({
                    "_id": 0,
                    "warehouseName": 1,
                })
            })
            .populate({
                path: "itemsList.systemItemId",
                model: "SystemItem",
                select: ({
                    "_id": 1,
                    "itemName": 1,
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

module.exports.warehouse2WarehouseTransaction = async (req, res) => {
    try {
        const { fromWarehouse, toWarehouse, itemsList, driverName, driverContact, serialNumber, remarks, outgoing, pickupDate } = req.body;
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
                const { systemItemId, quantity } = item;
                const systemItemData = await SystemItem.findOne({ _id: systemItemId });
                if (!systemItemData) {
                    return res.status(400).json({
                        success: false,
                        message: "SubItem Not Found"
                    });
                }

                const existingInventoryItems = await InstallationInventory.find({ warehouseId: req.user.warehouse })
                    .populate({
                        path: "systemItemId",
                        select: "itemName",
                    });

                // Check if any inventory item has a subItemId with a matching subItemName
                const existingItem = existingInventoryItems.find(
                    (inv) => inv.systemItemId.itemName.toLowerCase().trim() === systemItemData.itemName.toLowerCase().trim()
                );

                if (!existingItem) {
                    throw new Error(`SubItem "${systemItemData.itemName}" not found in warehouse inventory`);
                }

                if (existingItem.quantity < quantity || existingItem.quantity === 0) {
                    throw new Error(`Insufficient stock for item "${systemItemData.itemName}"`);
                }

                existingItem.quantity = parseInt(existingItem?.quantity) - parseInt(quantity);
                existingItem.updatedAt = new Date();
                existingItem.updatedBy = req.user._id;
                await existingItem.save();
            }
        }

        const insertData = {
            fromWarehouse,
            toWarehouse,
            itemsList,
            driverName,
            driverContact: Number(driverContact),
            serialNumber,
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
                path: "itemsList.systemItemId",
                model: "SystemItem",
                select: ({
                    "_id": 1,
                    "itemName": 1,
                })
            })
            .select("-createdAt -createdBy -__v").sort({ createdAt: -1 });
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
                path: "itemsList.systemItemId",
                model: "SystemItem",
                select: ({
                    "_id": 1,
                    "itemName": 1,
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
                path: "itemsList.systemItemId",
                model: "SystemItem",
                select: ({
                    "_id": 1,
                    "itemName": 1,
                })
            }).select("-createdAt -createdBy -__v").sort({ pickupDate: -1 });
        if (!incomingSystemItems) {
            return res.status(400).json({
                success: false,
                message: "Incoming System Items Data Not Found"
            });
        }

        if (incomingSystemItems.status === true) {
            return res.status(400).json({
                success: false,
                message: "Incoming Items Already Approved"
            });
        }

        if (status === true) {
            for (let item of incomingSystemItems.itemsList) {
                const { systemItemId, quantity } = item;
                const systemItemData = await SystemItem.findOne({ _id: systemItemId });
                if (!systemItemData) {
                    return res.status(400).json({
                        success: false,
                        message: "SubItem Not Found"
                    });
                }

                const existingInventoryItems = await InstallationInventory.find({ warehouseId: req.user.warehouse })
                    .populate({
                        path: "systemItemId",
                        select: "itemName",
                    });

                // Check if any inventory item has a subItemId with a matching subItemName
                const existingItem = existingInventoryItems.find(
                    (inv) => inv.systemItemId.itemName.toLowerCase().trim() === systemItemData.itemName.toLowerCase().trim()
                );

                if (!existingItem) {
                    throw new Error(`SubItem "${systemItemData.itemName}" not found in warehouse inventory`);
                }

                existingItem.quantity = parseInt(existingItem?.quantity) + parseInt(quantity);
                existingItem.updatedAt = new Date();
                existingItem.updatedBy = req.user._id;
                await existingItem.save();
            }
        }

        incomingSystemItems.status = status;
        incomingSystemItems.arrivedDate = arrivedDate;
        incomingSystemItems.approvedBy = req.user._id;
        incomingSystemItems.updatedAt = new Date();
        incomingSystemItems.updatedBy = req.user._id;
        const approvedData = await incomingSystemItems.save();
        if (approvedData) {
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
                path: "itemsList.systemItemId",
                model: "SystemItem",
                select: ({
                    "_id": 1,
                    "itemName": 1,
                })
            }).sort({ arrivedDate: -1 });

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
                path: "itemsList.systemItemId",
                model: "SystemItem",
                select: ({
                    "_id": 1,
                    "itemName": 1,
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
        const { state } = req.query;
        const filter = { isActive: true };
        if (state) {
            filter.state = state;
        }
        const [servicePersons, surveyPersons] = await Promise.all([
            ServicePerson.find(filter).select("-password -createdAt -createdBy -updatedAt -updatedBy -refreshToken -isActive -__v").sort({ state: 1, district: 1 }),
            SurveyPerson.find(filter).select("-password -createdAt -createdBy -updatedAt -updatedBy -refreshToken -isActive -__v").sort({ state: 1, district: 1 })
        ]);

        const allPersons = [
            ...surveyPersons.map((person) => ({ ...person, role: "surveyperson" })),
            ...servicePersons.map((person) => ({ ...person, role: "serviceperson" })),
        ];

        const cleanedData = allPersons.map((item) => ({
            _id: item._doc._id,
            name: item._doc.name,
            role: item.role,
            email: item._doc.email,
            contact: item._doc.contact,
            state: item._doc.state,
            district: item._doc.district,
            block: item._doc.block,
            latitude: item._doc.latitude,
            longitude: item._doc.longitude
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
        let employeeName = await ServicePerson.findById({ _id: id }).select("-email -password -role -createdAt -isActive -refreshToken -__v -createdAt -updatedAt -createdBy -updatedBy");
        if (!employeeName) {
            employeeName = await SurveyPerson.findById({ _id: id }).select("-email -password -role -createdAt -isActive -refreshToken -__v -createdAt -updatedAt -createdBy -updatedBy");
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
        const { contact, contact2 } = req.query;
        // If neither contact nor contact2 is provided, return error
        if (!contact && !contact2) {
            return res.status(400).json({
                success: false,
                message: "At least one contact (contact or contact2) is required"
            });
        }

        let filter = { incoming: true };

        // If both contact and contact2 are provided, search for either of them
        if (contact && contact2) {
            filter.$or = [
                { farmerContact: Number(contact) },
                { farmerContact: Number(contact2) }
            ];
        }
        // If only contact is provided, search for it
        else if (contact) {
            filter.farmerContact = Number(contact);
        }
        // If only contact2 is provided, search for it
        else if (contact2) {
            filter.farmerContact = Number(contact2);
        }

        // Fetch data based on the filter
        let incomingItemsData = await PickupItem.find(filter)
            .populate({
                path: "servicePerson",
                select: { "_id": 0, "name": 1 }
            })
            .sort({ pickupDate: -1 })
            .select("-servicePersonName -servicePerContact -__v -image")
            .lean();

        // If no data is found, return an empty array
        if (!incomingItemsData.length) {
            return res.status(200).json({
                success: true,
                message: "No data found",
                data: []
            });
        }

        // Format the data before returning
        const formattedData = incomingItemsData.map(item => ({
            ...item,
            items: item.items.map(({ _id, ...rest }) => rest),
            pickupDate: item.pickupDate
                ? new Date(item.pickupDate).toISOString().split("T")[0]
                : null,
            arrivedDate: item.arrivedDate
                ? new Date(item.arrivedDate).toISOString().split("T")[0]
                : null
        }));

        // Return the fetched and formatted data
        return res.status(200).json({
            success: true,
            message: "Data Fetched Successfully",
            data: formattedData
        });

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Internal Server Error",
            error: error.message
        });
    }
};

module.exports.showAllSystemInstallation = async (req, res) => {
    try {
        const allSystemInstallations = await NewSystemInstallation.find().select("-referenceType -createdBy -__v");
        return res.status(200).json({
            success: true,
            message: "Data Fetched Successfully",
            data: allSystemInstallations || []
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Internal Server Error",
            error: error.message
        })
    }
};

module.exports.deductFromDefectiveOfItems = async (req, res) => {
    try {
        const { itemName, quantity, isRepaired } = req.query;

        // Validate required fields
        if (!itemName || !quantity) {
            return res.status(400).json({
                success: false,
                message: "itemName & quantity are required",
            });
        }

        const warehouseId = "67446a8b27dae6f7f4d985dd";

        // Find the warehouse items data by warehouseId
        const warehouseItemsData = await WarehouseItems.findOne({ warehouse: warehouseId });

        if (!warehouseItemsData) {
            return res.status(404).json({
                success: false,
                message: "Warehouse Items Data Not Found",
            });
        }

        // Check if itemName exists in the warehouse items
        const itemIndex = warehouseItemsData.items.findIndex((item) => item.itemName === itemName);

        if (itemIndex === -1) {
            return res.status(404).json({
                success: false,
                message: "Item Not Found In Warehouse",
            });
        }

        // Get the item based on the found index
        const itemToUpdate = warehouseItemsData.items[itemIndex];

        // Parse the quantity to be deducted
        const quantityToUpdate = parseInt(quantity);

        // Check if defective stock is enough before reducing
        if (itemToUpdate.defective < quantityToUpdate) {
            return res.status(400).json({
                success: false,
                message: `Insufficient defective stock. Available defective stock: ${itemToUpdate.defective}`,
            });
        }

        // Update quantities based on the isRepaired flag
        if (isRepaired === "true") {
            itemToUpdate.defective = parseInt(itemToUpdate.defective) - parseInt(quantityToUpdate);
            itemToUpdate.quantity = parseInt(itemToUpdate.quantity) + parseInt(quantityToUpdate);
            itemToUpdate.repaired = parseInt(itemToUpdate.repaired) + parseInt(quantityToUpdate);
        } else {
            itemToUpdate.defective = parseInt(itemToUpdate.defective) - parseInt(quantityToUpdate);
            itemToUpdate.rejected = parseInt(itemToUpdate.rejected) + parseInt(quantityToUpdate);
        }

        // Save the updated warehouse items data
        await warehouseItemsData.save();

        return res.status(200).json({
            success: true,
            message: "Item defective count updated successfully",
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Internal Server Error",
            error: error.message,
        });
    }
};


module.exports.addOutgoingItemsData = async (req, res) => {
    try {
        const { fromWarehouse, toServiceCenter, items } = req.body;

        if (!fromWarehouse || !toServiceCenter || !items) {
            return res.status(400).json({
                success: false,
                message: "All fields are required"
            });
        }

        if (!Array.isArray(items) || items.length === 0) {
            return res.status(400).json({
                success: false,
                message: "items should be a non-empty array"
            });
        }

        const warehouseItemsData = await WarehouseItems.findOne({ warehouse: req.user.warehouse });

        if (!warehouseItemsData) {
            return res.status(404).json({
                success: false,
                message: "Warehouse Items Data Not Found"
            });
        }
        for (let item of items) {
            const existingItem = warehouseItemsData.items.find(i => i.itemName === item.itemName);

            if (!existingItem) {
                return res.status(404).json({
                    success: false,
                    message: "Item Not Found In Warehouse"
                });
            }
            if (existingItem.defective === 0 || existingItem.defective < item.quantity) {
                return res.status(403).json({
                    success: false,
                    message: `Warehouse item defective count: ${existingItem.defective}, is less than sending defective count: ${item.quantity}`
                });
            }

            existingItem.defective = parseInt(existingItem.defective) - parseInt(item.quantity);
        }

        const savedWarehouseItemsData = await warehouseItemsData.save();

        const newOutgoingItemsData = new OutgoingItems({
            fromWarehouse,
            toServiceCenter,
            items,
            sendingDate: Date.now(),
            createdBy: req.user._id,
            createdAt: new Date(),
        });
        const savedOutgoingItemsData = await newOutgoingItemsData.save();

        if (savedWarehouseItemsData && savedOutgoingItemsData) {
            return res.status(200).json({
                success: true,
                message: "Data logged and warehouse items data updated successfully",
                data: newOutgoingItemsData
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

module.exports.showOutgoingItemsData = async (req, res) => {
    try {
        const warehouseId = req.user.warehouse;
        if (!warehouseId) {
            return res.status(400).json({
                success: false,
                message: "WarehouseId Not Found"
            });
        }
        const warehouseData = await Warehouse.findById({ _id: warehouseId });
        if (!warehouseData) {
            return res.status(404).json({
                success: false,
                message: "Warehouse Data Not Found"
            });
        }
        const outgoingItemsData = await OutgoingItems.find({ fromWarehouse: warehouseData.warehouseName }).sort({ sendingDate: -1 });
        if (!outgoingItemsData) {
            return res.status(404).json({
                success: false,
                message: "Outgoing Items Data Not Found"
            });
        }

        const cleanedData = outgoingItemsData.map((doc) => {
            const docObj = doc.toObject();
            if (Array.isArray(docObj.items)) {
                docObj.items = docObj.items.map(item => {
                    const { _id, ...rest } = item;
                    return rest;
                });
            }
            return docObj;
        });
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
}

module.exports.showWarehouseItemsData = async (req, res) => {
    try {
        const warehouseId = "67446a8b27dae6f7f4d985dd";
        if (!warehouseId) {
            return res.status(400).json({
                success: false,
                message: "WarehouseId Not Found"
            });
        }
        //const warehouseItemsData = await WarehouseItems.find({warehouse: warehouseId});
        const warehouseItemsData = await WarehouseItems.aggregate([
            {
                $match: { warehouse: new mongoose.Types.ObjectId(warehouseId) }
            },
            {
                $project: {
                    _id: 0,
                    items: {
                        $map: {
                            input: "$items",
                            as: "item",
                            in: { itemName: "$$item.itemName" }
                        }
                    }
                }
            }
        ]);
        if (!warehouseItemsData) {
            return res.status(404).json({
                success: false,
                message: "Warehouse Items Data Not Found"
            });
        }
        return res.status(200).json({
            success: true,
            message: "Data Fetched Successfully",
            data: warehouseItemsData || []
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Internal Server Error",
            error: error.message
        });
    }
}

module.exports.uploadSystemSubItemsFromExcel = async (req, res) => {
    try {
        if (!req.file || !req.file.buffer) {
            return res.status(400).json({
                success: false,
                message: "Excel file is required",
            });
        }

        const workbook = XLSX.read(req.file.buffer, { type: "buffer" });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const data = XLSX.utils.sheet_to_json(sheet);

        const createdBy = req.user._id; // assuming JWT-based auth adds this

        const systemItemMap = data.map((row) => ({
            systemId: row.systemId,
            systemItemId: row.systemItemId,
            quantity: row.quantity,
            createdBy,
        }));

        await SystemItemMap.insertMany(systemItemMap);

        return res.status(201).json({
            success: true,
            message: "Sub-items uploaded successfully",
            insertedCount: systemItemMap.length,
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Internal Server Error",
            error: error.message,
        });
    }
};

module.exports.updateSystemId = async (req, res) => {
    try {
        const { systemId } = req.query;
        if (!systemId) {
            return res.status(400).json({
                success: false,
                message: "SystemId Not Found"
            });
        }
        const systemData = await SystemItem.find({ systemId: systemId });
        if (!systemData) {
            return res.status(404).json({
                success: false,
                message: "System Data Not Found"
            });
        }

        systemData.map(async (system) => {
            system.systemId = "68145a57c633b11fd5905f70";
            await system.save();
        })
        return res.status(200).json({
            success: true,
            message: "SystemId Updated Successfully",
            data: systemData || []
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Internal Server Error",
            error: error.message
        });
    }
}

module.exports.attachItemSubItem = async (req, res) => {
    try {
        const { systemId, systemItemId, subItemId } = req.body;
        if (!systemId || !systemItemId || !subItemId) {
            return res.status(400).json({
                success: false,
                message: "SystemItemId & SubItemId are required"
            });
        }
        const itemSubItemData = await ItemComponentMap.findOne({ systemId: systemId, systemItemId: systemItemId, subItemId: subItemId });
        if (itemSubItemData) {
            return res.status(400).json({
                success: false,
                message: "Item SubItem Data Already Exists"
            });
        }
        const newItemSubItemData = new ItemComponentMap({
            systemId: systemId,
            systemItemId,
            subItemId,
            createdBy: req.user._id
        });
        const savedItemSubItemData = await newItemSubItemData.save();
        if (savedItemSubItemData) {
            return res.status(200).json({
                success: true,
                message: "Item SubItem Data Saved Successfully",
                data: savedItemSubItemData
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

module.exports.uploadSystemItemsFromExcel = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: "No file uploaded" });
        }

        const workbook = XLSX.read(req.file.buffer, { type: "buffer" });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const data = XLSX.utils.sheet_to_json(sheet);

        if (!Array.isArray(data) || data.length === 0) {
            return res.status(400).json({ success: false, message: "Excel file is empty or invalid" });
        }

        const adminId = req.user?._id || "67446a4296f7ef394e784136";

        // Step 1: Add items to SystemItem
        const itemsToInsert = data.map(row => ({
            itemName: row.itemName?.trim(),
            createdBy: adminId,
        })).filter(item => item.itemName);

        const insertedItems = await SystemItem.insertMany(itemsToInsert);

        // Step 2: Fetch all warehouses
        const warehouses = await Warehouse.find({}, "_id");

        // Step 3: Prepare and insert InstallationInventory records
        const inventoryRecords = [];

        insertedItems.forEach(item => {
            warehouses.forEach(wh => {
                inventoryRecords.push({
                    warehouseId: wh._id,
                    systemItemId: item._id,
                    quantity: 0,
                    createdBy: adminId
                });
            });
        });

        await InstallationInventory.insertMany(inventoryRecords);

        res.status(201).json({
            success: true,
            message: `${insertedItems.length} items added and linked to all warehouses.`,
            data: insertedItems
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: error.message });
    }
};

module.exports.attachItemComponentMapByExcel = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: "Excel file is required" });
        }

        const workbook = XLSX.read(req.file.buffer, { type: "buffer" });
        const sheetName = workbook.SheetNames[0];
        const data = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);

        const insertData = [];

        for (const row of data) {
            const { systemId, systemItemId, subItemId, quantity } = row;

            if (!systemId || !systemItemId || !subItemId) continue;

            const exists = await ItemComponentMap.findOne({ systemId, systemItemId, subItemId });
            if (!exists) {
                insertData.push({
                    systemId,
                    systemItemId,
                    subItemId,
                    quantity,
                    createdBy: req.user._id
                });
            }
        }

        const inserted = await ItemComponentMap.insertMany(insertData);

        return res.status(200).json({
            success: true,
            message: "Data inserted successfully",
            insertedCount: inserted.length
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Internal Server Error",
            error: error.message
        });
    }
};

module.exports.getSystemItemsWithSubItems = async (req, res) => {
    try {
        const { systemId } = req.query;

        // Step 1: Get all system items for the given system
        const systemItems = await SystemItemMap.find({ systemId })
            .populate({
                path: "systemItemId",
                select: ({
                    "_id": 1,
                    "itemName": 1,
                })
            }).select("-createdAt -createdBy -__v");

        const result = [];

        // Step 2: For each system item, check for subitems
        for (const item of systemItems) {
            const subItems = await ItemComponentMap.find({
                systemId: systemId,
                systemItemId: item.systemItemId._id
            })
                .populate({
                    path: "subItemId",
                    select: ({
                        "_id": 1,
                        "itemName": 1,
                    })
                }).select("-createdAt -createdBy -__v");

            result.push({
                systemItemId: item.systemItemId,
                quantity: item.quantity,
                createdBy: item.createdBy,
                subItems: subItems.map(sub => ({
                    subItemId: sub.subItemId,
                    quantity: sub.quantity,
                    createdBy: sub.createdBy
                }))
            });
        }

        return res.status(200).json({
            success: true,
            message: "System Items with SubItems fetched successfully",
            data: result
        });

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Internal Server Error",
            error: error.message
        });
    }
};

module.exports.getSystemItemsFromItemComponentMap = async (req, res) => {
    const { systemId } = req.query;

    try {
        const items = await ItemComponentMap.find({ systemId })
            .populate({
                path: "systemItemId",
                select: "_id itemName"
            });

        if (!items || items.length === 0) {
            return res.status(404).json({
                success: false,
                message: "No system items found for the system"
            });
        }

        // Filter unique systemItemId
        const uniqueItemsMap = new Map();
        items.forEach(item => {
            const id = item.systemItemId?._id?.toString();
            if (id && !uniqueItemsMap.has(id)) {
                uniqueItemsMap.set(id, {
                    _id: item.systemItemId._id,
                    itemName: item.systemItemId.itemName
                });
            }
        });

        const uniqueItems = Array.from(uniqueItemsMap.values());

        res.status(200).json({
            success: true,
            message: "Unique system items fetched successfully",
            data: uniqueItems
        });

    } catch (error) {
        console.error("Error fetching items by systemId:", error);
        res.status(500).json({
            success: false,
            message: "Internal Server Error",
            error: error.message
        });
    }
};

module.exports.updateInstallationInventoryFromExcel = async (req, res) => {
    try {
        const workbook = XLSX.read(req.file.buffer, { type: "buffer" });
        const sheetName = workbook.SheetNames[0];
        const worksheet = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);

        const results = [];
        const successList = [];
        const failedList = [];

        let successCount = 0;
        let failedCount = 0;

        for (const row of worksheet) {
            const { warehouseId, itemName, quantity } = row;

            if (!warehouseId || !itemName || quantity == null) {
                failedList.push({
                    itemName,
                    warehouseId,
                    quantity,
                    reason: "Missing required fields"
                });

                failedCount++;
                continue;
            }

            const escapedName = itemName.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const systemItem = await SystemItem.findOne({
                itemName: new RegExp(`^${escapedName}$`, 'i')
            });

            if (!systemItem) {
                failedList.push({
                    itemName,
                    warehouseId,
                    quantity,
                    reason: "SystemItem not found"
                });
                failedCount++;
                continue;
            }

            const inventory = await InstallationInventory.findOne({
                warehouseId,
                systemItemId: systemItem._id
            });

            if (!inventory) {
                failedList.push({
                    itemName,
                    warehouseId,
                    quantity,
                    reason: "InstallationInventory not found"
                });
                failedCount++;
                continue;
            }

            inventory.quantity = quantity;
            inventory.updatedAt = new Date();
            await inventory.save();

            successList.push({
                itemName,
                warehouseId,
                quantity,
                status: "Updated successfully"
            });
            successCount++;
        }

        return res.status(200).json({
            success: true,
            message: "Inventory update completed",
            summary: {
                totalProcessed: successCount + failedCount,
                updated: successCount,
                failed: failedCount
            },
            updatedItems: successList,
            failedItems: failedList
        });

    } catch (error) {
        console.error("Error while updating inventory from Excel:", error);
        res.status(500).json({
            success: false,
            message: "Internal Server Error",
            error: error.message
        });
    }
};
