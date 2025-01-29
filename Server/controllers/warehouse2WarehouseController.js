const WToW = require("../models/warehouse2WarehouseSchema");
const Warehouse = require("../models/warehouseSchema");
const WarehouseItems = require("../models/warehouseItemsSchema");

module.exports.sendingDefectiveItems = async(req, res) => {
    try{
        const { fromWarehouse, toWarehouse, isDefective, items, driverName, driverContact, remarks, status, pickupDate} = req.body;
        if(!fromWarehouse || !toWarehouse || !items || !driverName || !driverContact || !remarks || !pickupDate){
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
        if(isDefective === true){
            const warehouseData = await Warehouse.findOne({warehouseName: fromWarehouse});
            const warehouseItemsData = await WarehouseItems.findOne({warehouse: warehouseData._id});

            const toWarehouseData = await Warehouse.findOne({warehouseName: toWarehouse});
            const toWarehouseItemsData = await WarehouseItems.findOne({warehouse: toWarehouseData._id});
            if(!toWarehouseItemsData){
                return res.status(404).json({
                    success: false,
                    message: `To: ${toWarehouseData.warehouseName} Items Data Not Found`
                });
            }
            
            for(let item of items){
                let itemName = item.itemName;
                let quantity = item.quantity;

                const toWarehouseItem = toWarehouseItemsData.items.find(i => itemName === i.itemName);
                if(!toWarehouseItem){
                    return res.status(400).json({
                        success: false,
                        message: `To: ${toWarehouseData.warehouseName} Item Doesn't Exist`
                    });
                } 

                const warehouseItems = warehouseItemsData.items.find(i => itemName === i.itemName);
                
                warehouseItems.defective = parseInt(warehouseItems.defective) - parseInt(quantity);
                
            }
            await warehouseItemsData.save();
        }else if(isDefective === false){
            const warehouseData = await Warehouse.findOne({warehouseName: fromWarehouse});
            const warehouseItemsData = await WarehouseItems.findOne({warehouse: warehouseData._id});

            const toWarehouseData = await Warehouse.findOne({warehouseName: toWarehouse});
            const toWarehouseItemsData = await WarehouseItems.findOne({warehouse: toWarehouseData._id});
            if(!toWarehouseItemsData){
                return res.status(404).json({
                    success: false,
                    message: `To: ${toWarehouseData.warehouseName} Items Data Not Found`
                });
            }

            for(let item of items){
                let itemName = item.itemName;
                let quantity = item.quantity;

                const toWarehouseItem = toWarehouseItemsData.items.find(i => itemName === i.itemName);
                if(!toWarehouseItem){
                    return res.status(400).json({
                        success: false,
                        message: `To: ${toWarehouseData.warehouseName} Item Doesn't Exist`
                    });
                } 

                const warehouseItems = warehouseItemsData.items.find(i => itemName === i.itemName);
                warehouseItems.quantity = parseInt(warehouseItems.quantity) - parseInt(quantity);
            }
            await warehouseItemsData.save();
        }

        const createDefectiveOrder = new WToW({ fromWarehouse, toWarehouse, isDefective, items, driverName, driverContact, remarks, status, pickupDate});
        await createDefectiveOrder.save();
        return res.status(200).json({
            success: true,
            message: "Data Inserted Successfully",
            orderData: createDefectiveOrder
        });
    }catch(error){
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

module.exports.updateDefectiveOrderStatus = async(req, res) => {
    try{
        const {defectiveOrderId, status, arrivedDate} = req.body;
        const warehousePersonName = req.user.name;

        const defectiveOrderData = await WToW.findById(defectiveOrderId);
        //const fromWarehouseName = defectiveOrderData.fromWarehouse;
        const toWarehouseName = defectiveOrderData.toWarehouse;

        //const fromWarehouseData = await Warehouse.findOne({warehouseName: fromWarehouseName});
        const toWarehouseData = await Warehouse.findOne({warehouseName: toWarehouseName});

        //const fromWarehouseItemsData = await WarehouseItems.findOne({warehouse: fromWarehouseData._id});
        const toWarehouseItemsData = await WarehouseItems.findOne({warehouse: toWarehouseData._id});

        if(status === true && defectiveOrderData.isDefective === true){
            for (let item of defectiveOrderData.items){
                let itemName = item.itemName;
                let quantity = item.quantity;

                // const itemData = await Item.find({itemName});
                let warehouseItems = toWarehouseItemsData.items.find(i => itemName === i.itemName);
                warehouseItems.defective = parseInt(warehouseItems.defective) + parseInt(quantity);
            }
        }else if(status === true && defectiveOrderData.isDefective === false){
            for (let item of defectiveOrderData.items){
                let itemName = item.itemName;
                let quantity = item.quantity;

                // const itemData = await Item.find({itemName});
                let warehouseItems = toWarehouseItemsData.items.find(i => itemName === i.itemName);
                warehouseItems.quantity = parseInt(warehouseItems.quantity) + parseInt(quantity);
            }
        }
        defectiveOrderData.status = status;
        defectiveOrderData.approvedBy = warehousePersonName;
        defectiveOrderData.arrivedDate = arrivedDate;

        await toWarehouseItemsData.save();
        await defectiveOrderData.save();
        return res.status(200).json({
            success: true,
            message: "Status updated successfully & Data manipulated accordingly",
            updatedData: defectiveOrderData
        });
    }catch(error){
        return res.status(500).json({
            success: false,
            message: "Internal Server Error",
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