const WToW = require("../../models/serviceInventoryModels/warehouse2WarehouseSchema");
const Warehouse = require("../../models/serviceInventoryModels/warehouseSchema");
const WarehouseItems = require("../../models/serviceInventoryModels/warehouseItemsSchema");
const mongoose = require("mongoose");

module.exports.sendingDefectiveItems = async (req, res) => {
    try {
        const { fromWarehouse, toWarehouse, isDefective, items, driverName, driverContact, remarks, status, isNewStock, pickupDate} = req.body;

        if (!fromWarehouse || !toWarehouse || !items || !driverName || !driverContact || !remarks || !pickupDate) {
            return res.status(400).json({
                success: false,
                message: "All fields are required"
            });
        }

        if (!Array.isArray(items) || items.length === 0) {
            return res.status(400).json({
                success: false,
                message: "Items must be a non-empty array",
            });
        }

        const warehouseData = await Warehouse.findOne({ warehouseName: fromWarehouse });
        const warehouseItemsData = await WarehouseItems.findOne({ warehouse: warehouseData._id });
        const toWarehouseData = await Warehouse.findOne({ warehouseName: toWarehouse });
        const toWarehouseItemsData = await WarehouseItems.findOne({ warehouse: toWarehouseData._id });


        if (!toWarehouseItemsData) {
            return res.status(404).json({
                success: false,
                message: `To: ${toWarehouseData.warehouseName} Items Data Not Found`
            });
        }

        for (let item of items) {
            let itemName = item.itemName;
            let quantity = item.quantity;

            const toWarehouseItem = toWarehouseItemsData.items.find(i => itemName === i.itemName);
            if (!toWarehouseItem) {
                return res.status(400).json({
                    success: false,
                    message: `To: ${toWarehouseData.warehouseName} Item Doesn't Exist`
                });
            }
            const warehouseItems = warehouseItemsData.items.find(i => itemName === i.itemName);

            if (isDefective === true) {
                // Ensure defective count doesn't go negative
                if (warehouseItems.defective < quantity) {
                    return res.status(400).json({
                        success: false,
                        message: `Insufficient defective stock for item: ${itemName} in ${fromWarehouse}`,
                    });
                }
                warehouseItems.defective = parseInt(warehouseItems.defective) - parseInt(quantity);
            } else if (isNewStock === true  && isDefective === false) {
                // Ensure regular quantity doesn't go negative
                if (warehouseItems.newStock < quantity) {
                    return res.status(400).json({
                        success: false,
                        message: `Insufficient new stock for item: ${itemName} in ${fromWarehouse}`,
                    });
                }
                warehouseItems.newStock = parseInt(warehouseItems.newStock) - parseInt(quantity);
            } else if (isNewStock === false && isDefective === false) {
                // Ensure regular quantity doesn't go negative
                if (warehouseItems.quantity < quantity) {
                    return res.status(400).json({
                        success: false,
                        message: `Insufficient stock for item: ${itemName} in ${fromWarehouse}`,
                    });
                }
                warehouseItems.quantity = parseInt(warehouseItems.quantity) - parseInt(quantity);
            }
        }

        await warehouseItemsData.save();

        const createDefectiveOrder = new WToW({ fromWarehouse, toWarehouse, isDefective, items, driverName, driverContact, remarks, status, isNewStock, pickupDate, createdBy: req.user._id });
        
        await createDefectiveOrder.save();

        return res.status(200).json({
            success: true,
            message: "Data Inserted Successfully",
            orderData: createDefectiveOrder
        });
    } catch (error) {
        
        return res.status(500).json({
            success: false,
            message: "Internal Server Error",
            error: error.message
        });
    }
};

module.exports.allDefectiveItemsData = async(req, res) => {
    try{
        const defectiveOrderData = await WToW.find({}).sort({pickUpDate: -1});
        return res.status(200).json({
            success: true,
            message: "Data Fetched Successfully",
            defectiveOrderData: defectiveOrderData || []
        });
    }catch(error){
        return res.status(500).json({
            success: false,
            message: "Internal Server Error",
            error: error.message
        });
    }
};

module.exports.inDefectiveItemsData = async(req, res) => {
    try{
        const warehouseId = req.user.warehouse;
        if(!warehouseId){
            return res.status(400).json({
                success: false,
                message: "WarehouseID Not Found"
            });
        }

        const warehouseData = await Warehouse.findOne({_id: warehouseId});

        const incomingDefectiveData = await WToW.find({"$and": [{"toWarehouse": warehouseData.warehouseName}, {"status": false}]}).sort({pickUpDate: -1}).select("-__v");
        // if(!incomingDefectiveData){
        //     return res.status(404).json({
        //         success: false,
        //         message: "Data Not Found",
        //         incomingDefectiveData: []
        //     });
        // }
        return res.status(200).json({
            success: true,
            message: "Data Fetched Successfully",
            incomingDefectiveData: incomingDefectiveData || []
        });
    }catch(error){
        return res.status(500).json({
            success: false,
            message: "Internal Server Error",
            error: error.message
        });
    }
};

module.exports.inDefectiveItemsOrderHistory = async(req, res) => {
    try{
        const warehouseId = req.user.warehouse;
        if(!warehouseId){
            return res.status(400).json({
                success: false,
                message: "WarehouseID Not Found"
            });
        }

        const warehouseData = await Warehouse.findOne({_id: warehouseId});
        const incomingDefectiveData = await WToW.find({toWarehouse: warehouseData.warehouseName}).sort({pickUpDate: -1}).select("-__v");
        let defectiveOrderHistory = [];
        for(let order of incomingDefectiveData){
            if(order.status === true){
                defectiveOrderHistory.push(order);
            }
        }
        return res.status(200).json({
            success: true,
            message: "Defective Order History Fetched Successfully",
            defectiveOrderHistory: defectiveOrderHistory || []
        });
    }catch(error){
        return res.status(500).json({
            success: false,
            message: "Internal Server Error",
            error: error.message
        });
    }
};

module.exports.outgoingDefectiveOrderData = async(req, res) => {
    try{
        const warehouseId = req.user.warehouse;
        if(!warehouseId){
            return res.status(400).json({
                success: false,
                message: "WarehouseID Not Found"
            });
        }

        const warehouseData = await Warehouse.findOne({_id: warehouseId});
        const defectiveOrderData = await WToW.find({fromWarehouse: warehouseData.warehouseName}).sort({pickupDate: -1});
        return res.status(200).json({
            success: true,
            message: "Data Fetched Successfully",
            defectiveOrderData: defectiveOrderData || []
        });
    }catch(error){
        return res.status(500).json({
            success: false,
            message: "Internal Server Error",
            error: error.message
        });
    }
};

// module.exports.updateDefectiveOrderStatus = async(req, res) => {
//     try{
//         const {defectiveOrderId, status, arrivedDate} = req.body;
//         const warehousePersonName = req.user.name;

//         const defectiveOrderData = await WToW.findById(defectiveOrderId);
//         if(defectiveOrderData.status === true){
//             return res.status(400).json({
//                 success: false,
//                 message: "Order Already Approved"
//             });
//         }
//         //const fromWarehouseName = defectiveOrderData.fromWarehouse;
//         const toWarehouseName = defectiveOrderData.toWarehouse;

//         //const fromWarehouseData = await Warehouse.findOne({warehouseName: fromWarehouseName});
//         const toWarehouseData = await Warehouse.findOne({warehouseName: toWarehouseName});

//         //const fromWarehouseItemsData = await WarehouseItems.findOne({warehouse: fromWarehouseData._id});
//         const toWarehouseItemsData = await WarehouseItems.findOne({warehouse: toWarehouseData._id});

//         if(status === true && defectiveOrderData.isDefective){
//             for (let item of defectiveOrderData.items){
//                 let itemName = item.itemName;
//                 let quantity = item.quantity;

//                 // const itemData = await Item.find({itemName});
//                 let warehouseItems = toWarehouseItemsData.items.find(i => itemName === i.itemName);
                
//                 warehouseItems.defective = parseInt(warehouseItems.defective) + parseInt(quantity);
                
//             }
//         }else if(status === true && defectiveOrderData.isDefective === false && defectiveOrderData.isNewStock === true){
//             for (let item of defectiveOrderData.items){
//                 let itemName = item.itemName;
//                 let quantity = item.quantity;

//                 // const itemData = await Item.find({itemName});
//                 let warehouseItems = toWarehouseItemsData.items.find(i => itemName === i.itemName);
//                 if (!warehouseItems) {
//                     console.warn(`Item '${itemName}' not found in toWarehouseItemsData`);
//                     continue;
//                 }
        
//                 if (typeof warehouseItems.newStock !== "number") {
//                     warehouseItems.newStock = 0;
//                 }
                
//                 warehouseItems.newStock = parseInt(warehouseItems.newStock) + parseInt(quantity);        
        
//             toWarehouseItemsData.markModified("items");
//             }
//         }else if(status === true && defectiveOrderData.isDefective === false && defectiveOrderData.isNewStock === false){
//             for (let item of defectiveOrderData.items){
//                 let itemName = item.itemName;
//                 let quantity = item.quantity;

//                 // const itemData = await Item.find({itemName});
//                 let warehouseItems = toWarehouseItemsData.items.find(i => itemName === i.itemName);

//                 warehouseItems.quantity = parseInt(warehouseItems.quantity) + parseInt(quantity);
//             }
//         }
//         defectiveOrderData.status = status;
//         defectiveOrderData.approvedBy = warehousePersonName;
//         defectiveOrderData.arrivedDate = arrivedDate;

//         await toWarehouseItemsData.save();
//         await defectiveOrderData.save();
//         return res.status(200).json({
//             success: true,
//             message: "Status updated successfully & Data manipulated accordingly",
//             updatedData: defectiveOrderData
//         });
//     }catch(error){
//         return res.status(500).json({
//             success: false,
//             message: "Internal Server Error",
//             error: error.message
//         });
//     }
// };

module.exports.updateDefectiveOrderStatus = async (req, res) => {
    const session = await mongoose.startSession();
    
    try {
        await session.withTransaction(async () => {
            const { defectiveOrderId, status, arrivedDate } = req.body;
            const warehousePersonName = req.user.name;

            const defectiveOrderData = await WToW.findById(defectiveOrderId).session(session);
            if (defectiveOrderData.status === true) {
                throw new Error("Order Already Approved");
            }
            console.log("Defective Order Data:", defectiveOrderData);

            const toWarehouseName = defectiveOrderData.toWarehouse;
            console.log("To Warehouse Name:", toWarehouseName);
            const toWarehouseData = await Warehouse.findOne({ warehouseName: toWarehouseName }).session(session);
            const toWarehouseItemsData = await WarehouseItems.findOne({ warehouse: toWarehouseData._id }).session(session);
            console.log("To Warehouse Items Data:", toWarehouseItemsData);
            if (status === true && defectiveOrderData.isDefective) {
                for (let item of defectiveOrderData.items) {
                    const { itemName, quantity } = item;
                    let warehouseItems = toWarehouseItemsData.items.find(i => i.itemName === itemName);
                    console.log("Warehouse Items:", warehouseItems);
                    if (!warehouseItems) throw new Error(`Item '${itemName}' not found in warehouse`);
                    warehouseItems.defective = parseInt(warehouseItems.defective || 0) + parseInt(quantity);
                    console.log(`Updated defective stock for ${itemName}:`, warehouseItems.defective);
                }
            } else if (status === true && !defectiveOrderData.isDefective && defectiveOrderData.isNewStock) {
                for (let item of defectiveOrderData.items) {
                    const { itemName, quantity } = item;
                    let warehouseItems = toWarehouseItemsData.items.find(i => i.itemName === itemName);
                    console.log("Warehouse Items:", warehouseItems);
                    if (!warehouseItems) throw new Error(`Item '${itemName}' not found in warehouse`);
                    warehouseItems.newStock = parseInt(warehouseItems.newStock || 0) + parseInt(quantity);
                    console.log(`Updated new stock for ${itemName}:`, warehouseItems.newStock);
                }
                toWarehouseItemsData.markModified("items");
            } else if (status === true && !defectiveOrderData.isDefective && !defectiveOrderData.isNewStock) {
                for (let item of defectiveOrderData.items) {
                    const { itemName, quantity } = item;
                    let warehouseItems = toWarehouseItemsData.items.find(i => i.itemName === itemName);
                    console.log("Warehouse Items:", warehouseItems);
                    if (!warehouseItems) throw new Error(`Item '${itemName}' not found in warehouse`);
                    warehouseItems.quantity = parseInt(warehouseItems.quantity || 0) + parseInt(quantity);
                    console.log(`Updated quantity for ${itemName}:`, warehouseItems.quantity);
                }
            }

            defectiveOrderData.status = status;
            defectiveOrderData.approvedBy = warehousePersonName;
            defectiveOrderData.arrivedDate = arrivedDate;

            await toWarehouseItemsData.save({ session });
            await defectiveOrderData.save({ session });
        });

        session.endSession();

        return res.status(200).json({
            success: true,
            message: "Status updated successfully & Data manipulated accordingly"
        });

    } catch (error) {
        session.endSession();
        console.error("Transaction failed:", error);
        return res.status(500).json({
            success: false,
            message: "Transaction failed. Rolled back.",
            error: error.message
        });
    }
};

//Installation Inventory Warehouse To Warehouse Transaction
module.exports.outgoingInstallationItemsToWarehouse = async (req, res) => {
    try {
        
        
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Internal Server Error",
            error: error.message
        });
    }
};