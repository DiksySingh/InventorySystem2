const Item = require("../models/itemSchema");
const Warehouse = require("../models/warehouseSchema");
const WarehouseItems = require("../models/warehouseItemsSchema");

module.exports.addWarehouse = async (req, res) => {
    const { warehouseName, createdAt } = req.body;
    if(!warehouseName){
        return res.status(400).json({
            success: false,
            message: "All fields are required"
        });
    }

    try{
        const existingWarehouse = await Warehouse.findOne({warehouseName});
        if(existingWarehouse){
            return res.status(400).json({
                success: false,
                message: "Warehouse already exists"
            });
        }

        const newWarehouse = new Warehouse({warehouseName, createdAt});
        await newWarehouse.save();

        return res.status(200).json({
            success: true,
            message: "Warehouse Added Successfully",
            newWarehouse
        });
    }catch(error){
        return res.status(500).json({
            success: false,
            message: "Internal Server Error",
            error: error.message
        });
    }
}

module.exports.addWarehouseItems = async (req, res) => {
    try {
        const { warehouseId, items } = req.body;
        if(!warehouseId){
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
        
        if (!warehouseItemsRecord) {
            warehouseItemsRecord = new WarehouseItems({
                warehouse:warehouseId,
                items: []
            });
        }

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
                });
                await itemRecord.save();
            }

            const existingItem = warehouseItemsRecord.items.find(item => item.itemName === newItem.itemName);

            if (existingItem) {
                existingItem.quantity += newItem.quantity;
            } else {
                warehouseItemsRecord.items.push(newItem);
            }
        }

        await warehouseItemsRecord.save();

        return res.status(200).json({
            success: true,
            message: "Items successfully added to warehouse",
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

module.exports.getWarehouseItemsData = async(req, res) => {
    try{
        const { warehouseId } = req.body;
        if(!warehouseId){
            return res.status(400).json({
                success: false,
                message: "warehouseId not found"
            });
        }

        const warehouseData = await WarehouseItems.findOne({warehouse: warehouseId}).populate('warehouse', "warehouseName -_id");
        if(!warehouseData){
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
    }catch(error){
        return res.status(500).json({
            success: false,
            message: "Internal Server Error",
            error: error.message
        });
    }
}
