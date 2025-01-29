const axios = require("axios");
const handleBase64Images = require("../middlewares/base64ImageHandler");
const Item = require("../models/itemSchema");
const Warehouse = require("../models/warehouseSchema");
const WarehousePerson = require("../models/warehousePersonSchema");
const WarehouseItems = require("../models/warehouseItemsSchema");
const ServicePerson = require("../models/servicePersonSchema");
const SurveyPerson = require("../models/surveyPersonSchema");
const RepairNRejectItems = require("../models/repairNRejectSchema");
const PickupItem = require("../models/pickupItemSchema");
const System = require("../models/systemSchema");
const SystemItem = require("../models/systemItemSchema");
const InstallationInventory = require("../models/installationInventorySchema");
const FarmerItemsActivity = require("../models/farmerItemsActivity");
const InstallationAssignEmp = require("../models/installationAssignEmpSchema");
const InventoryAccount = require("../models/installationInventoryAccount");


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

module.exports.deleteWarehousePerson = async (req, res) => {
    try {
        const { id } = req.query;
        if (!id) {
            return res.status(400).json({
                success: false,
                message: "ID is required"
            });
        }

        const deletedWarehousePerson = await WarehousePerson.findByIdAndDelete(id);
        return res.status(200).json({
            success: true,
            message: "Warehouse Person Removed Successfully",
            deletedWarehousePerson
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Internal Server Error",
            error: error.message
        });
    }
};

module.exports.deleteServicePerson = async (req, res) => {
    try {
        const { id } = req.query;
        if (!id) {
            return res.status(400).json({
                success: false,
                message: "ID is required"
            });
        }

        const deletedServicePerson = await ServicePerson.findByIdAndDelete(id);
        return res.status(200).json({
            success: true,
            message: "Service Person Removed Successfully",
            deletedServicePerson
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
        const { systemId, itemName, quantity } = req.body;
        const warehousePersonId = req.user._id;
        // const warehouseId = req.user.warehouse;
        if (!systemId || !itemName || !quantity) {
            return res.status(400).json({
                success: false,
                message: "All fields are required"
            });
        }

        const insertData = {
            systemId,
            itemName: itemName.trim(),
            quantity,
            createdBy: warehousePersonId
        };

        const existingSystemItem = await SystemItem.findOne({ itemName });
        if (existingSystemItem) {
            return res.status(400).json({
                success: false,
                message: "System Item Already Exists"
            });
        }

        const allWarehouses = await Warehouse.find();
        let newInventoryItem, savedInventoryItem;

        for (let warehouse of allWarehouses){
            const existingInventoryItem = await InstallationInventory.findOne({warehouseId: warehouse._id, itemName});
            if(!existingInventoryItem) {
                newInventoryItem = new InstallationInventory({warehouseId: warehouse._id, itemName, quantity: 0});
                savedInventoryItem = await newInventoryItem.save();
            }
        }
        const newSystemItem = new SystemItem(insertData);
        const savedSystemItem = await newSystemItem.save();
        if (savedSystemItem && savedInventoryItem) {
            return res.status(200).json({
                success: true,
                message: "System Item & Warehouse Inventory Item Added Successfully",
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

module.exports.showSystems = async (req, res) => {
    try {
        const systems = await System.find()
            .populate({
                path: 'createdBy',
                select: {
                    "name": 1,
                    "email": 1
                }
            }) // Adjust the fields you want from the `WarehousePerson`
            .populate({
                path: "updatedBy",
                select: {
                    "name": 1,
                    "email": 1
                }
            }).select("-__v -createdAt -updatedAt");

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
        const { systemId } = req.query;
        const systemItems = await SystemItem.find({ systemId: systemId })
            .populate("createdBy", "name email")
            .populate("updatedBy", "name email");

        if (!systemItems.length) {
            return res.status(404).json({
                success: false,
                message: "No system items found for this system."
            });
        }
        res.status(200).json({
            success: true,
            data: systemItems,
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
        const inventorySystemItems = await InstallationInventory.find({warehouseId: warehouseId}).select("_id itemName");
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
        const { itemName, updatedQuantity } = req.body;
        const filter = {
            warehouseId: warehouseId,
            itemName: itemName
        }
        const itemData = await InstallationInventory.findOne(filter);
        itemData.quantity = parseInt(itemData.quantity) + parseInt(updatedQuantity);
        const updatedItemData = await itemData.save();
        if (updatedItemData) {
            return res.status(200).json({
                success: true,
                message: "Data Updated Successfully"
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
            borePhoto, 
            challanPhoto, 
            landDocPhoto, 
            sprinklerPhoto, 
            boreFarmerPhoto, 
            finalFoundationFarmerPhoto,
            panelFarmerPhoto,
            controllerBoxFarmerPhoto,
            waterDischargeFarmerPhoto
        } = req.body;

        const warehousePersonId = req.user._id;
        const warehouseId = warehousePersonId; 

        if (
            !farmerId || 
            !empId || 
            !itemsList ||
            !panelNumbers ||
            !pumpNumber ||
            !controllerNumber ||
            !rmuNumber ||
            !borePhoto || 
            !challanPhoto || 
            !landDocPhoto || 
            !sprinklerPhoto || 
            !boreFarmerPhoto || 
            !finalFoundationFarmerPhoto ||
            !panelFarmerPhoto ||
            !controllerBoxFarmerPhoto ||
            !waterDischargeFarmerPhoto
        ) {
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
        let empData = await ServicePerson.find({ _id: empId });
        if (!empData) {
            empData = await SurveyPerson.find({ _id: empId });
            if (!empData) {
                return res.status(400).json({
                    success: false,
                    message: "Employee Data Is Not Available"
                });
            }
            refType = "SurveyPerson";
        }
        refType = "ServicePerson";

        const savedBorePhoto = await handleBase64Images(borePhoto);
        const borePhotoUrl = savedBorePhoto.map((file) => `${req.protocol}://${req.get("host")}/uploads/${file.fileName}`);

        const savedChallanPhoto = await handleBase64Images(challanPhoto);
        const challanPhotoUrl = savedChallanPhoto.map((file) => `${req.protocol}://${req.get("host")}/uploads/${file.fileName}`);

        const savedLandDocPhoto = await handleBase64Images(landDocPhoto);
        const landDocPhotoUrl = savedLandDocPhoto.map((file) => `${req.protocol}://${req.get("host")}/uploads/${file.fileName}`);

        const savedSprinklerPhoto = await handleBase64Images(sprinklerPhoto);
        const sprinklerPhotoUrl = savedSprinklerPhoto.map((file) => `${req.protocol}://${req.get("host")}/uploads/${file.fileName}`);

        const savedBoreFarmerPhoto = await handleBase64Images(boreFarmerPhoto);
        const boreFarmerPhotoUrl = savedBoreFarmerPhoto.map((file) => `${req.protocol}://${req.get("host")}/uploads/${file.fileName}`);

        const savedFoundationFarmerPhoto = await handleBase64Images(finalFoundationFarmerPhoto);
        const foundationFarmerPhotoUrl = savedFoundationFarmerPhoto.map((file) => `${req.protocol}://${req.get("host")}/uploads/${file.fileName}`);
        
        const savedPanelFarmerPhoto = await handleBase64Images(panelFarmerPhoto);
        const panelFarmerPhotoUrl = savedPanelFarmerPhoto.map((file) => `${req.protocol}://${req.get("host")}/uploads/${file.fileName}`);

        const savedControllerFarmerPhoto = await handleBase64Images(controllerBoxFarmerPhoto);
        const controllerFarmerPhotoUrl = savedControllerFarmerPhoto.map((file) => `${req.protocol}://${req.get("host")}/uploads/${file.fileName}`);

        const savedWaterDischargePhoto = await handleBase64Images(waterDischargeFarmerPhoto);
        const waterDischargeFarmerPhotoUrl = savedWaterDischargePhoto.map((file) => `${req.protocol}://${req.get("host")}/uploads/${file.fileName}`);


        for (const item of itemsList) {
            const { itemId, quantity } = item;

            // Find the item in InstallationInventory
            const systemItem = await SystemItem.findById(itemId);
            const inventoryItem = await InstallationInventory.findOne({ itemName: systemItem.itemName });
            if (!inventoryItem) {
                throw new Error(`Item with ID ${itemId} not found in inventory`);
            }

            if (inventoryItem.quantity < quantity) {
                throw new Error(`Insufficient stock for item ${inventoryItem.itemName}`);
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
            createdBy: warehousePersonId
        };

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
            borePhoto: borePhotoUrl, 
            challanPhoto: challanPhotoUrl, 
            landDocPhoto: landDocPhotoUrl, 
            sprinklerPhoto: sprinklerPhotoUrl, 
            boreFarmerPhoto: boreFarmerPhotoUrl, 
            finalFoundationFarmerPhoto: foundationFarmerPhotoUrl,
            panelFarmerPhoto: panelFarmerPhotoUrl,
            controllerBoxFarmerPhoto: controllerFarmerPhotoUrl,
            waterDischargeFarmerPhoto: waterDischargeFarmerPhotoUrl,
            createdBy: warehousePersonId
        }

        const empAccountData = new InstallationAssignEmp(accountData);
        await empAccountData.save();

        const farmerActivity = new FarmerItemsActivity(activityData);
        await farmerActivity.save();

        return res.status(200).json({
            success: true,
            message: "Data Saved Successfully",
            empAccountData,
            farmerActivity
        });

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Internal Server Error",
            error: error.message
        });
    }
};

module.exports.showNewInstallationDataToInstaller = async (req, res) => {
    try {
        const installerId = req.user._id
        const activities = await FarmerItemsActivity.find({ empId: installerId })
            .populate({
                path: "warehouseId",
                select: {
                    "name": 1,
                    "email": 1,
                    "contact": 1,
                    "warehouse": 1
                }
            })
            .populate({
                path: "empId",
                select: {
                    "name": 1,
                    "email": 1,
                    "contact": 1
                }
            });
        const activitiesWithFarmerDetails = await Promise.all(
            activities.map(async (activity) => {
                const response = await axios.get(
                    `http://88.222.214.93:8001/farmer/showSingleFarmer?id=${activity.farmerId}`
                );
                if (response) {
                    return {
                        ...activity.toObject(),
                        farmerDetails: (response?.data?.data) ? response?.data?.data : null, // Assuming the farmer API returns farmer details
                    };
                }
            })
        );

        return res.status(200).json({
            success: true,
            message: "Data Fetched Successfully",
            data: activitiesWithFarmerDetails
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
        const warehousePersonId = req.user._id;
        const showData = await FarmerItemsActivity.find({ warehouseId: warehousePersonId })
            .populate({
                path: "warehouseId",
                select: {
                    "name": 1,
                    "email": 1,
                    "contact": 1
                }
            })
            .populate({
                path: "empId",
                select: {
                    "name": 1,
                    "email": 1,
                    "contact": 1
                }
            });
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
            data: activitiesWithFarmerDetails
        });

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Internal Server Error",
            error: error.message
        });
    }
};

module.exports.itemComingToWarehouse = async(req, res) => {
    try {
        const {from, toWarehouse, items, company, arrivedDate } = req.body;
        const role = req.user.role;
        if(!from || !toWarehouse || !items || !company || !arrivedDate) {
            return res.status(400).json({
                success: false,
                message: "All fields are required"
            });
        }

        if(Array.isArray(items) || items.length === 0){
            return res.status(400).json({
                success: false,
                message: "items is an array & should be non-empty"
            });
        }

        let refType;
        if(role === 'admin'){
            refType = "Admin"
        }else if (role === 'warehousePerson'){
            refType = "WarehousePerson"
        }

        for (let item of items) {
            const existingItem = await InstallationInventory.findOne({_id: item.itemId, warehouseId: req.user.warehouse});
            existingItem.quantity = parseInt(existingItem.quantity) + parseInt(item.quantity);
            await existingItem.save();
        }

        const insertData = {
            referenceType: refType,
            from,
            toWarehouse,
            items,
            company,
            arrivedDate,
            createdBy: req.user._id
        }

        const incomingInstallationItems = new InventoryAccount(insertData);
        const savedData = await incomingInstallationItems.save();
        if(savedData) {
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
        if(!employeeName) {
            employeeName = await SurveyPerson.findById({_id: id}).select("-_id -email -contact -password -role -createdAt -latitude -longitude -state -block -district -refreshToken -__v -createdAt -updatedAt -createdBy -updatedBy");
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
        if(id) filter._id = id;
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

