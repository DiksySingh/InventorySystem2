const Item = require("../models/itemSchema");
const Warehouse = require("../models/warehouseSchema");
const WarehousePerson = require("../models/warehousePersonSchema");
const WarehouseItems = require("../models/warehouseItemsSchema");
const ServicePerson = require("../models/servicePersonSchema");
const RepairNRejectItems = require("../models/repairNRejectSchema");

//****************** Admin Access ******************//
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

        const newWarehouse = new Warehouse({
            warehouseName, 
            createdAt: createdAt || Date.now(),
        });
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

module.exports.showWarehouses = async(req, res) => {
    try{
        const allWarehouses = await Warehouse.find().select("-__v -createdAt");
        if(!allWarehouses){
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
    }catch(error){
        return res.status(500).json({
            success: false,
            message: "Internal Server Error",
            error: error.message
        });
    }
}

module.exports.viewWarehousePersons = async(req, res) => {
    try {
      const allWarehousePersons = await WarehousePerson.find()
      .populate("warehouse", "-_id -__v -createdAt")
      .select("-password -role -createdAt -refreshToken -__v");
      if(!allWarehousePersons){
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
  }
  
module.exports.viewServicePersons = async(req, res) => {
    try{
      const allServicePersons = await ServicePerson.find().select("-password -role -createdAt -refreshToken -__v");
      if(!allServicePersons){
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
  
    }catch(error){
      return res.status(500).json({
        success: false,
        message: "Internal Server Error",
        error: error.message
      });
    }
  };

//Delete Warehouse Person
module.exports.deleteWarehousePerson = async(req, res) => {
    try{
        const {id} = req.query;
        if(!id){
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
    }catch(error){
        return res.status(500).json({
            success: false,
            message: "Internal Server Error",
            error: error.message
        });
    }
} 

//Delete Service Person
module.exports.deleteServicePerson = async(req, res) => {
    try{
        const {id} = req.query;
        if(!id){
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
    }catch(error){
        return res.status(500).json({
            success: false,
            message: "Internal Server Error",
            error: error.message
        });
    }
}

module.exports.allRepairRejectItemsData = async(req, res) => {
    try{
        const allRepairRejectData = await RepairNRejectItems.find({});
        if(!allRepairRejectData){
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
    }catch(error){
        return res.status(500).json({
            success: false,
            message: "Internal Server Error",
            error: error.message
        });
    }
}

//***************** Warehouse Access *******************// 
module.exports.addWarehouseItems = async (req, res) => {
    try {
        const warehouseId = req.user.warehouse;
        const { items, defective, repaired, rejected } = req.body;
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
            newItem.itemName = newItem.itemName.trim();
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

module.exports.viewWarehouseItems = async(req, res) => {
    try{
        const warehouseId = req.user.warehouse;
        if(!warehouseId){
            return res.status(404).json({
                success: false,
                message: "WarehouseId not found"
            });
        }

        const warehouseItems = await WarehouseItems.findOne({warehouse: warehouseId});
        if(!warehouseItems){
            return res.status(404).json({
                success: false,
                message: "Warehouse Items Not Found"
            });
        }
        
        let items = [];
        for(let item of warehouseItems.items){
            items.push(item.itemName);
        }
       
        return res.status(200).json({
            success: true,
            message: "Warehouse Items Fetched Successfully",
            items
        });
    }catch(error){
        return res.status(500).json({
            success: false,
            message: "Internal Server Error",
            error: error.message
        });
    }
}

module.exports.warehouseDashboard = async(req, res) => {
    try{
        const  warehouseId = req.user.warehouse;
        console.log(warehouseId)
        if(!warehouseId){
            return res.status(400).json({
                success: false,
                message: "warehouseId not found"
            });
        }

        const warehouseData = await WarehouseItems.findOne({warehouse: warehouseId}).populate('warehouse', "warehouseName -_id");
        console.log(warehouseData);
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

module.exports.newRepairNRejectItemData = async(req, res) => {
    try{
        const warehouseId = req.user.warehouse;
        const personName = req.user.name;
        console.log(warehouseId," ",personName);
        if(!warehouseId){
            return res.status(400).json({
                success: false,
                message: "WarehouseID not found"
            });
        }
        const {itemName, repaired, rejected, createdAt} = req.body;
        if(!itemName || !repaired || !rejected || !createdAt){
            return res.status(400).json({
                success: false,
                message: "itemName is required"
            });
        }

        const itemRecord = await Item.findOne({itemName});
        if(!itemRecord){
            return res.status(404).json({
                success: false,
                message: "Item Not Found In ItemSchema"
            });
        }

        const warehouseItemsRecord = await WarehouseItems.findOne({warehouse: warehouseId}).populate('warehouse', "-__v -createdAt");
        if(!warehouseItemsRecord){
            return res.status(404).json({
                success: false,
                message: "WarehouseItemsRecord Not Found"
            });
        }
        const warehouseName = warehouseItemsRecord.warehouse.warehouseName;
        console.log(warehouseName);

        const warehouseItem = warehouseItemsRecord.items.find(item => item.itemName === itemName);
        if(!warehouseItem){
            return res.status(404).json({
                success: false,
                message: "Item Not Found In Warehouse"
            });
        }

        if(repaired){
            //Adjusting Warehouse Items Quantity, Defective, Repaired Field in WarehouseItems Schema
            if(warehouseItem.defective !== 0 && warehouseItem.defective >= (repaired + rejected)){
                warehouseItem.defective = parseInt(warehouseItem.defective) - parseInt(repaired);
                warehouseItem.quantity = parseInt(warehouseItem.quantity) + parseInt(repaired);
                warehouseItem.repaired = parseInt(warehouseItem.repaired) + parseInt(repaired);
            }else{
                return res.status(403).json({
                    success: false,
                    message: "Defective is less than repaired. Cannot be updated"
                });
            }
            
            //Adjusting Items Stock, Defective, Repaired Field in ItemSchema
            if(itemRecord.defective !== 0 && itemRecord.defective >= (repaired + rejected)){
                itemRecord.defective = parseInt(itemRecord.defective) - parseInt(repaired);
                itemRecord.stock = parseInt(itemRecord.stock) + parseInt(repaired);
                itemRecord.repaired = parseInt(itemRecord.repaired) + parseInt(repaired);
            }else{
                return res.status(403).json({
                    success: false,
                    message: "Defective is less than repaired. Cannot be updated"
                })
            }
        }

        if(rejected){
            //Adjusting Warehouse Items Defective and Rejected Field in WarehouseItems Schema
            if(warehouseItem.defective !== 0 && warehouseItem.defective >= (rejected)){
                warehouseItem.defective = parseInt(warehouseItem.defective) - parseInt(rejected);
                warehouseItem.rejected = parseInt(warehouseItem.rejected) + parseInt(rejected);
            }else{
                return res.status(403).json({
                    success: false,
                    message: "Defective is less than rejected. Cannot be updated"
                });
            }

            //Adjusting Items Defective and Rejected Field in ItemSchema
            if(itemRecord.defective !== 0 && itemRecord.defective >= (rejected)){
                itemRecord.defective = parseInt(itemRecord.defective) - parseInt(rejected);
                itemRecord.rejected = parseInt(itemRecord.rejected) + parseInt(rejected);
            }else{
                return res.status(403).json({
                    success: false,
                    message: "Defective is less than rejected. Cannot be updated"
                });
            }
        }
        
        await itemRecord.save();
        await warehouseItemsRecord.save();

        const newRepairRejectData = new RepairNRejectItems({
            warehouseId: warehouseId,
            warehousePerson: personName,
            warehouseName: warehouseName,
            itemName,
            repaired,
            rejected,
            createdAt, 
        })

        await newRepairRejectData.save();

        return res.status(200).json({
            sucess: true,
            message: "Data Inserted Successfully",
            newRepairRejectData
        });

    }catch(error){
        return res.status(500).json({
            success: false,
            message: "Internal Server Error",
            error: error.message
        });
    }
};

module.exports.warehouseRepairRejectItemsData = async(req, res) => {
    try{
        const warehouseId = req.user.warehouse;
        if(!warehouseId){
            return res.status(400).json({
                success: false,
                message: "WarehouseID is required"
            });
        }

        const allRepairRejectData = await RepairNRejectItems.find({warehouseId}).sort({createdAt: -1});
        if(!allRepairRejectData){
            return res.status(404).json({
                success: false,
                message: "Data Not Found For The Warehouse"
            });
        }

        return res.status(200).json({
            success: true,
            message: "Data Fetched Successfully",
            allRepairRejectData,
        });
    }catch(error){
        return res.status(500).json({
            success: false,
            message: "Internal Server Error",
            error: error.message
        });
    }
}

//****************** Service Person Access *************************//
