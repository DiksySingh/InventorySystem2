const moment = require("moment-timezone");
const Item = require("../../models/serviceInventoryModels/itemSchema");
const IncomingItem = require("../../models/serviceInventoryModels/incomingItemSchema");
const WarehouseItems = require("../../models/serviceInventoryModels/warehouseItemsSchema");
const Warehouse = require("../../models/serviceInventoryModels/warehouseSchema");

//************************* Warehouse Access *****************************// 
// View All Items
module.exports.showItems = async (req, res) => {
  try {
    const allItems = await Item.find();
    if (!allItems) {
      return res.status(404).json({
        success: false,
        message: "Data Not Found",
      });
    }
    res.status(200).json({
      success: true,
      message: "Data Fetched Successfully",
      data: allItems,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

module.exports.incomingItems = async (req, res) => {
  try {
    const {
      warehouse,
      itemComingFrom,
      //itemName,
      //quantity,
      //defectiveItem,
      items,
      arrivedDate,
    } = req.body;
    if (!warehouse || !itemComingFrom || !items) {
      return res.status(400).json({
        success: false,
        message: "All fields are required",
      });
    }

    // const foundItem = await Item.findOne({ itemName });
    // if (!foundItem) {
    //   return res.status(404).json({
    //     success: false,
    //     message: `Item ${itemName} not found`,
    //   });
    // }


    const warehouseItemsData = await WarehouseItems.findOne({ warehouse: req.user.warehouse });
    if (!warehouseItemsData) {
      return res.status(404).json({
        success: false,
        message: "Warehouse Items Data Not Found"
      });
    }

    // const warehouseItemsData = await WarehouseItems.findOne({warehouse: warehouseData._id});
    // if(!warehouseItemsData){
    //   return res.status(404).json({
    //     success: false,
    //     message: "Warehouse Items Data Not Found"
    //   });
    // }

    //const nondefectItem = quantity - defectiveItem;

    for (let item of items) {
      const existingItem = warehouseItemsData.items.find(i => i.itemName === item.itemName);
      if (!existingItem) {
        return res.status(404).json({
          success: false,
          message: "Item Not Found In Warehouse"
        });
      }
      existingItem.quantity = parseInt(existingItem.quantity) + parseInt(item.quantity);
      if(item.defective) {
        existingItem.defective = parseInt(existingItem.defective) + parseInt(item.defective);
      }
    }
    
    await warehouseItemsData.save();

    // foundItem.stock = parseInt(foundItem.stock) + parseInt(quantity);
    // foundItem.defective = parseInt(foundItem.defective) + parseInt(defectiveItem);
    // foundItem.updatedAt = Date.now();

    //await foundItem.save();

    const incomingItems = new IncomingItem({
      warehouse,
      itemComingFrom,
      items,
      //quantity,
      //defectiveItem,
      arrivedDate: Date.now(),
      createdAt: Date.now(),
      createdBy: req.user._id,
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

module.exports.warehouseIncomingItemDetails = async (req, res) => {
  try {
    const warehouseId = req.user.warehouse;
    if (!warehouseId) {
      return res.status(400).json({
        success: false,
        message: "warehouseId not found"
      });
    }

    const warehouseData = await Warehouse.findById({ _id: warehouseId });
    if (!warehouseData) {
      return res.status(404).json({
        success: false,
        message: "Warehouse Not Found"
      });
    }

    const incomingItemsData = await IncomingItem.find({ warehouse: warehouseData.warehouseName }).sort({ arrivedDate: -1 });
    if (!incomingItemsData) {
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
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message
    });
  }
};

//****************************** Admin Access ******************************// 
module.exports.allIncomingItemDetails = async (req, res) => {
  try {
    const itemDetails = await IncomingItem.find();
    if (!itemDetails) {
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
  } catch (error) {
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
    if (!updateItemName || !itemID) {
      return res.status(400).json({
        success: false,
        message: "updateItemName and itemID is required to update",
      });
    }

    const itemData = await Item.findOne({ _id: itemID });
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
    const { option } = req.query;
    if (!option) {
      return res.status(400).json({
        success: false,
        message: "Option not provided"
      });
    }

    if (option === "Total Items") {
      const allItems = await Item.find();
      return res.status(200).json({
        success: true,
        message: "All items fetched successfully",
        data: allItems,
      });
    } else {
      const warehouseData = await Warehouse.findOne({ warehouseName: option });
      if (!warehouseData) {
        return res.status(404).json({
          success: false,
          message: "Warehouse Data Not Found"
        });
      }
      const warehouseItems = await WarehouseItems.findOne({ warehouse: warehouseData._id })

      return res.status(200).json({
        success: true,
        message: `Items for warehouse ${option} fetched successfully`,
        data: warehouseItems ? warehouseItems.items : [],
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
