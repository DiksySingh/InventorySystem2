const moment = require("moment-timezone");
const Item = require("../models/itemSchema");
const IncomingItem = require("../models/incomingItemSchema");
const WarehouseItems = require("../models/warehouseItemsSchema");
const Warehouse = require("../models/warehouseSchema");


// //Add New Item
// module.exports.addItem = async (req, res) => {
//   const itemName = req.body.itemName.trim();
//   const { stock, createdAt, updatedAt } = req.body;
//   console.log(stock);
//   if (!itemName) {
//     return res.status(400).json({
//       success: false,
//       message: "itemName is required",
//     });
//   }
  
//   let isStock;
//   if(stock !== undefined){
//     isStock = stock;
//   }else{
//     isStock = 0;
//   }

//   try{
//   const existingItem = await Item.findOne({itemName: { $regex: new RegExp(`^${itemName}$`, "i") }});
//   console.log(existingItem);
//   if(existingItem){
//     return res.status(400).json({
//       success: false,
//       message: "Item exists in warehouse"
//     });
//   }
  
//     const newItem = new Item({ 
//       itemName, 
//       stock: isStock,
//       createdAt, 
//       updatedAt 
//     });
//     const itemData = await newItem.save();
//     if (!itemData) {
//       return res.status(400).json({
//         success: false,
//         message: "Data Insertion Failed",
//       });
//     }

//     return res.status(200).json({
//       success: true,
//       message: "Data Inserted Successfully",
//       data: itemData,
//     });
//   } catch (error) {
//     return res.status(500).json({
//       success: false,
//       error: error.message,
//     });
//   }
// };

// //View All Items
// module.exports.showItems = async (req, res) => {
//   try {
//     const allItems = await Item.find();
//     if (!allItems) {
//       return res.status(404).json({
//         success: false,
//         message: "Data Not Found",
//       });
//     }
//     res.status(200).json({
//       success: true,
//       message: "Data Fetched Successfully",
//       data: allItems,
//     });
//   } catch (error) {
//     res.status(500).json({
//       success: false,
//       error: error.message,
//     });
//   }
// };


//************************* Warehouse Access *****************************// 
module.exports.incomingItems = async (req, res) => {
  try {
    const {
      warehouse,
      itemComingFrom,
      itemName,
      quantity,
      defectiveItem,
      arrivedDate,
    } = req.body;
    if (!warehouse || !itemComingFrom || !itemName || !quantity) {
      return res.status(400).json({
        success: false,
        message: "All fields are required",
      });
    }

    const foundItem = await Item.findOne({ itemName });
    if (!foundItem) {
      return res.status(404).json({
        success: false,
        message: `Item ${itemName} not found`,
      });
    }
    
    const warehouseData = await Warehouse.findOne({warehouseName: warehouse});
    if(!warehouseData){
      return res.status(404).json({
        success: false,
        message: "Warehouse Not Found"
      });
    }

    const warehouseItemsData = await WarehouseItems.findOne({warehouse: warehouseData._id});
    if(!warehouseItemsData){
      return res.status(404).json({
        success: false,
        message: "Warehouse Items Data Not Found"
      });
    }
    
    const nondefectItem = quantity - defectiveItem;

    const warehouseItem = warehouseItemsData.items.find(item => item.itemName === itemName)
    warehouseItem.quantity = parseInt(warehouseItem.quantity) + parseInt(nondefectItem);
    if(defectiveItem !== 0){
      warehouseItem.defective = parseInt(warehouseItem.defective) + parseInt(defectiveItem);
    }
    await warehouseItemsData.save();

    foundItem.stock = parseInt(foundItem.stock) + parseInt(nondefectItem);
    foundItem.defective = parseInt(foundItem.defective) + parseInt(defectiveItem);
    foundItem.updatedAt = Date.now();
    
    await foundItem.save();

    const incomingItems = new IncomingItem({
      warehouse,
      itemComingFrom,
      itemName,
      quantity,
      defectiveItem,
      arrivedDate,
    });

    await incomingItems.save();

    res.status(200).json({
      success: true,
      message: "Data Inserted Successfully",
      incomingItems,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message,
    });
  }
};

module.exports.warehouseIncomingItemDetails = async(req, res) => {
  try{
    const warehouseId = req.user.warehouse;
    if(!warehouseId){
      return res.status(400).json({
        success: false,
        message: "warehouseId not found"
      });
    }

    const warehouseData = await Warehouse.findById({_id: warehouseId});
    if(!warehouseData){
      return res.status(404).json({
        success: false,
        message: "Warehouse Not Found"
      });
    }
    
    const incomingItemsData = await IncomingItem.find({warehouse: warehouseData.warehouseName});
    if(!incomingItemsData){
      return res.status(404).json({
        success: false,
        message: "Incoming Items (Upper) Data Not Found"
      });
    }
    
    return res.status(200).json({
      success: true,
      message: "Data Fetched Successfully",
      incomingItemsData
    });
  }catch(error){
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message
    });
  }
};

//****************************** Admin Access ******************************// 
module.exports.allIncomingItemDetails = async(req, res) => {
    try{
        const itemDetails = await IncomingItem.find();
        if(!itemDetails){
            return res.status(404).json({
                success: false,
                message: "Data Not Found",
            });
        }

        const itemDetailsWithISTDate = itemDetails.map((item) => {
          return {
            ...item.toObject(), 
            arrivedDate: moment(item.arrivedDate)
              .tz("Asia/Kolkata")
              .format("YYYY-MM-DD HH:mm:ss"), 
          };
        });

        res.status(200).json({
            success: true,
            message: "Data Fetched Successfully",
            itemDetails: itemDetailsWithISTDate
        });
    }catch(error){
        res.status(500).json({
            success: false,
            message: "Internal Server Error",
            error: error.message
        });
    }
};

//Udpate Item Name - Admin Access
module.exports.updateItemName = async (req, res) => {
  try {
    const { updateItemName, itemID } = req.body;
    const warehouseID = req.user.warehouse;
    console.log(warehouseID);
    if (!updateItemName || !itemID) {
      return res.status(400).json({
        success: false,
        message: "updateItemName and itemID is required to update",
      });
    }

    const itemData = await Item.findOne({_id: itemID});
    console.log(itemData);
    if (!itemData) {
      return res.status(404).json({
        success: false,
        message: "Item not found",
      });
    }
    const oldItemName = itemData.itemName;
    itemData.itemName = updateItemName;
    await itemData.save();

    await WarehouseItems.updateMany(
      { "items.itemName": oldItemName }, // filter where items have the old item name
      { $set: { "items.$[elem].itemName": updateItemName } }, // set the new item name
      { arrayFilters: [{ "elem.itemName": oldItemName }] } // update only matching elements in the array
    );
    const warehouseItemsData = await WarehouseItems.find();

    return res.status(200).json({
      success: true,
      message: "Item name updated successfully in both Item and WarehouseItems",
      warehouseItemsData,
      itemData,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message,
    });
  }
};


//Admin Access
module.exports.showItemsData = async (req, res) => {
  try {
    const { option } = req.body; 
    if(!option){
      return res.status(400).json({
        success: false,
        message: "Option not provided"
      });
    }
    

    if (option === "Overall") {
      const allItems = await Item.find();
      return res.status(200).json({
        success: true,
        message: "All items fetched successfully",
        data: allItems,
      });
    } else {
      const warehouseItems = await WarehouseItems.findOne()
        .populate({
          path: 'warehouse', 
          match: { warehouseName: option }
        })
        .exec();

      if (!warehouseItems || !warehouseItems.warehouse) {
        return res.status(404).json({
          success: false,
          message: `No items found for the warehouse: ${option}`,
        });
      }

      return res.status(200).json({
        success: true,
        message: `Items for warehouse ${option} fetched successfully`,
        data: warehouseItems.items, 
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


//Delete Item
module.exports.deleteItem = async (req, res) => {
  const { id } = req.query;
  if (!id) {
    return res.status(400).json({
      success: false,
      message: "Item ID is required",
    });
  }

  try {
    const deletedItem = await Item.findByIdAndDelete(id);
    if (!deletedItem) {
      return res.status(404).json({
        success: false,
        message: "Item Not Found",
      });
    }
    res.status(200).json({
      success: true,
      message: "Item removed successfully",
      data: deletedItem,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};
