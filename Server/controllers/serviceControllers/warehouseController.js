const axios = require("axios");
const mongoose = require("mongoose");
const XLSX = require("xlsx");
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
const SerialNumber = require("../../models/systemInventoryModels/serialNumberSchema");
const DispatchDetails = require("../../models/systemInventoryModels/dispatchDetailsSchema");
const DispatchBillPhoto = require("../../models/systemInventoryModels/dispatchBillPhotoSchema");
const fs = require("fs");
const path = require("path");
const ExcelJS = require("exceljs");

//****************** Admin Access ******************//

module.exports.addWarehouse = async (req, res) => {
  const { warehouseName, createdAt } = req.body;
  if (!warehouseName) {
    return res.status(400).json({
      success: false,
      message: "All fields are required",
    });
  }

  try {
    const existingWarehouse = await Warehouse.findOne({ warehouseName });
    if (existingWarehouse) {
      return res.status(400).json({
        success: false,
        message: "Warehouse already exists",
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
      newWarehouse,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message,
    });
  }
};

module.exports.showWarehouses = async (req, res) => {
  try {
    const allWarehouses = await Warehouse.find({
      warehouseName: { $nin: ["Sirsa", "Hisar", "Jind", "Fatehabad"] },
    }).select("-__v -createdAt");

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
        message: "Warehouse Persons Data Not Found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Data Fetched Successfully",
      allWarehousePersons,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message,
    });
  }
};

module.exports.viewServicePersons = async (req, res) => {
  try {
    const allServicePersons = await ServicePerson.find().select(
      "-password -role -createdAt -refreshToken -__v"
    );
    if (!allServicePersons) {
      return res.status(404).json({
        success: false,
        message: "Service Persons Data Not Found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Data Fetched Successfully",
      allServicePersons,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message,
    });
  }
};

module.exports.deactivateWarehousePerson = async (req, res) => {
  try {
    const { id } = req.query;
    if (!id) {
      return res.status(400).json({
        success: false,
        message: "ID is required",
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
      error: error.message,
    });
  }
};

module.exports.deactivateServicePerson = async (req, res) => {
  try {
    const { id } = req.query;
    if (!id) {
      return res.status(400).json({
        success: false,
        message: "ID is required",
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
      error: error.message,
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
        message: "Stock Update History Not Found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Data Fetched Successfully",
      data: allStockUpdateHistory,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message,
    });
  }
};

module.exports.allRepairRejectItemsData = async (req, res) => {
  try {
    const allRepairRejectData = await RepairNRejectItems.find({}).sort({
      createdAt: -1,
    });
    if (!allRepairRejectData) {
      return res.status(404).json({
        success: false,
        message: "RepairReject Item Data Not Found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Data Fetched Successfully",
      allRepairRejectData,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message,
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
    const itemsData = await Items;
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message,
    });
  }
};

module.exports.addWarehouseItems = async (req, res) => {
  try {
    // Extract items from the request body
    const { items, defective, repaired, rejected } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: "items are required and should be a non-empty array",
      });
    }

    // Validate and sanitize the items in req.body
    for (const newItem of items) {
      if (!newItem.itemName || typeof newItem.itemName !== "string") {
        return res.status(400).json({
          success: false,
          message: "Each item must have a valid itemName",
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
      let warehouseItemsRecord = await WarehouseItems.findOne({
        warehouse: warehouse._id,
      });

      if (!warehouseItemsRecord) {
        warehouseItemsRecord = new WarehouseItems({
          warehouse: warehouse._id,
          items: [],
        });
      }

      for (const newItem of items) {
        const existingItem = warehouseItemsRecord.items.find(
          (item) => item.itemName === newItem.itemName
        );

        if (!existingItem) {
          // Add the item with quantity set to zero
          warehouseItemsRecord.items.push({
            itemName: newItem.itemName,
            quantity: newItem.quantity,
            newStock: 0, // Will always be zero at this point
          });
        }
        // If the item already exists, leave the quantity unchanged
      }

      await warehouseItemsRecord.save();
    }

    return res.status(200).json({
      success: true,
      message: "Items successfully added to all warehouses", //with quantity validated and set to zero where needed
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message,
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
        message: "warehouseID not found",
      });
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: "items are required and should be a non-empty array",
      });
    }

    let warehouseItemsRecord = await WarehouseItems.findOne({
      warehouse: warehouseId,
    });

    for (const newItem of items) {
      let itemName = newItem.itemName.trim();

      const existingItem = warehouseItemsRecord.items.find(
        (item) =>
          item.itemName.toLowerCase().trim() === itemName.toLowerCase().trim()
      );

      if (!existingItem) {
        return res.status(400).json({
          success: false,
          message: "Item Doesn't Exists In Warehouse",
        });
      } else {
        existingItem.newStock =
          parseInt(existingItem.newStock) + parseInt(newItem.newStock);
        existingItem.quantity =
          parseInt(existingItem.quantity) + parseInt(newItem.quantity);
        existingItem.defective =
          parseInt(existingItem.defective) + parseInt(defective);

        const stockHistory = new StockHistory({
          empId,
          warehouseId,
          itemName: existingItem.itemName,
          newStock: newItem.newStock,
          quantity: newItem.quantity,
          defective: defective,
        });
        await stockHistory.save();
      }
    }
    await warehouseItemsRecord.save();

    return res.status(200).json({
      success: true,
      message: "Items stock added successfully",
      warehouseItemsRecord,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message,
    });
  }
};

module.exports.viewWarehouseItems = async (req, res) => {
  try {
    const warehouseId = req.user.warehouse;
    if (!warehouseId) {
      return res.status(404).json({
        success: false,
        message: "WarehouseId not found",
      });
    }

    const warehouseItems = await WarehouseItems.findOne({
      warehouse: warehouseId,
    });
    if (!warehouseItems) {
      return res.status(404).json({
        success: false,
        message: "Warehouse Items Not Found",
      });
    }

    let items = [];
    for (let item of warehouseItems.items) {
      items.push(item.itemName);
    }

    return res.status(200).json({
      success: true,
      message: "Warehouse Items Fetched Successfully",
      items,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message,
    });
  }
};

module.exports.warehouseDashboard = async (req, res) => {
  try {
    const warehouseId = req.user.warehouse;
    if (!warehouseId) {
      return res.status(400).json({
        success: false,
        message: "warehouseId not found",
      });
    }

    const warehouseData = await WarehouseItems.findOne({
      warehouse: warehouseId,
    }).populate("warehouse", "warehouseName -_id");
    if (!warehouseData) {
      return res.status(404).json({
        success: false,
        message: "Warehouse Data Not Found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Data fetched successfully",
      warehouseData,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message,
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
        message: "WarehouseID not found",
      });
    }
    const {
      itemName,
      serialNumber,
      repaired,
      repairedBy,
      remark,
      createdAt,
      changeMaterial,
    } = req.body;

    if (
      !itemName ||
      !repaired ||
      !serialNumber ||
      !remark ||
      !repairedBy ||
      !createdAt ||
      !changeMaterial
    ) {
      return res.status(400).json({
        success: false,
        message: "itemName is required",
      });
    }

    // const itemRecord = await Item.findOne({ itemName });
    // if (!itemRecord) {
    //     return res.status(404).json({
    //         success: false,
    //         message: "Item Not Found In ItemSchema"
    //     });
    // }

    const warehouseItemsRecord = await WarehouseItems.findOne({
      warehouse: warehouseId,
    }).populate("warehouse", "-__v -createdAt");
    if (!warehouseItemsRecord) {
      return res.status(404).json({
        success: false,
        message: "WarehouseItemsRecord Not Found",
      });
    }
    const warehouseName = warehouseItemsRecord.warehouse.warehouseName;

    const warehouseItem = warehouseItemsRecord.items.find(
      (item) => item.itemName === itemName
    );
    if (!warehouseItem) {
      return res.status(404).json({
        success: false,
        message: "Item Not Found In Warehouse",
      });
    }

    if (parseInt(repaired)) {
      //Adjusting Warehouse Items Quantity, Defective, Repaired Field in WarehouseItems Schema
      if (
        warehouseItem.defective !== 0 &&
        warehouseItem.defective >= parseInt(repaired)
      ) {
        warehouseItem.defective =
          parseInt(warehouseItem.defective) - parseInt(repaired);
        warehouseItem.quantity =
          parseInt(warehouseItem.quantity) + parseInt(repaired);
        warehouseItem.repaired =
          parseInt(warehouseItem.repaired) + parseInt(repaired);
      } else {
        return res.status(403).json({
          success: false,
          message: "Defective is less than repaired. Cannot be updated",
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
      changeMaterial,
    });

    await repairProductData.save();

    return res.status(200).json({
      success: true,
      message: "Data Inserted Successfully",
      repairProductData,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message,
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
        message: "WarehouseID not found",
      });
    }

    const { itemName, serialNumber, rejected, remark, createdAt } = req.body;
    if (!itemName || !serialNumber || !remark || !rejected || !createdAt) {
      return res.status(400).json({
        success: false,
        message: "itemName is required",
      });
    }

    // const itemRecord = await Item.findOne({ itemName });
    // if (!itemRecord) {
    //     return res.status(404).json({
    //         success: false,
    //         message: "Item Not Found In ItemSchema"
    //     });
    // }

    const warehouseItemsRecord = await WarehouseItems.findOne({
      warehouse: warehouseId,
    }).populate("warehouse", "-__v -createdAt");
    if (!warehouseItemsRecord) {
      return res.status(404).json({
        success: false,
        message: "WarehouseItemsRecord Not Found",
      });
    }
    const warehouseName = warehouseItemsRecord.warehouse.warehouseName;

    const warehouseItem = warehouseItemsRecord.items.find(
      (item) => item.itemName === itemName
    );
    if (!warehouseItem) {
      return res.status(404).json({
        success: false,
        message: "Item Not Found In Warehouse",
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
      if (
        warehouseItem.defective !== 0 &&
        warehouseItem.defective >= parseInt(rejected)
      ) {
        warehouseItem.defective =
          parseInt(warehouseItem.defective) - parseInt(rejected);
        warehouseItem.rejected =
          parseInt(warehouseItem.rejected) + parseInt(rejected);
      } else {
        return res.status(403).json({
          success: false,
          message: "Defective is less than rejected. Cannot be updated",
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
    });

    await rejectProductData.save();

    return res.status(200).json({
      success: true,
      message: "Data Inserted Successfully",
      newRepairRejectData: rejectProductData,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message,
    });
  }
};

module.exports.warehouseRepairItemsData = async (req, res) => {
  try {
    const warehouseId = req.user.warehouse;
    if (!warehouseId) {
      return res.status(400).json({
        success: false,
        message: "WarehouseID is required",
      });
    }

    const allRepairItemData = await RepairNRejectItems.find({
      warehouseId: warehouseId,
      isRepaired: true,
    }).sort({ createdAt: -1 });
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
      error: error.message,
    });
  }
};

module.exports.warehouseRejectItemsData = async (req, res) => {
  try {
    const warehouseId = req.user.warehouse;
    if (!warehouseId) {
      return res.status(400).json({
        success: false,
        message: "WarehouseID is required",
      });
    }

    const allRejectItemData = await RepairNRejectItems.find({
      warehouseId: warehouseId,
      isRepaired: false,
    }).sort({ createdAt: -1 });
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
      error: error.message,
    });
  }
};

module.exports.viewOrdersApprovedHistory = async (req, res) => {
  try {
    const warehouseId = req.user.warehouse;
    if (!warehouseId) {
      return res.status(400).json({
        success: false,
        message: "WarehouseId Not Found",
      });
    }

    const warehouseData = await Warehouse.findOne({ _id: warehouseId });
    const warehouseItemsData = await PickupItem.find({
      warehouse: warehouseData.warehouseName,
    })
      .populate("servicePerson", "name contact")
      .sort({ pickupDate: -1 });

    let orderHistory = [];
    for (let order of warehouseItemsData) {
      if (order.status === true) {
        orderHistory.push(order);
      }
    }
    return res.status(200).json({
      success: true,
      message: "History Data Fetched Successfully",
      orderHistory,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message,
    });
  }
};

module.exports.getWarehouse = async (req, res) => {
  try {
    const warehouseId = req.user.warehouse;
    if (!warehouseId) {
      return res.status(400).json({
        success: false,
        message: "WarehouseId not found",
      });
    }

    const warehouseData = await Warehouse.findOne({ _id: warehouseId });
    const warehouseName = warehouseData.warehouseName;
    return res.status(200).json({
      success: true,
      message: "Warehouse Fetched Successfully",
      warehouseId,
      warehouseName,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message,
    });
  }
};

module.exports.viewApprovedOrderHistory = async (req, res) => {
  try {
    const servicePersonId = req.user._id;
    if (!servicePersonId) {
      return res.status(400).json({
        success: false,
        message: "servicePersonId not found",
      });
    }

    const pickupItemData = await PickupItem.find({
      servicePerson: servicePersonId,
    }).sort({ pickupDate: -1 });

    let orderHistory = [];

    for (let order of pickupItemData) {
      if (order.incoming === false && order.status === true) {
        orderHistory.push(order);
      }
    }

    return res.status(200).json({
      success: true,
      message: "History Fetched Successfully",
      orderHistory,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message,
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
        message: "systemName is required",
      });
    }

    const existingSystem = await System.findOne({ systemName });
    if (existingSystem) {
      return res.status(400).json({
        success: false,
        message: "System Already Exists",
      });
    }

    const newSystem = new System({
      systemName: systemName.trim(),
      createdBy: empId,
    });
    const savedSystem = await newSystem.save();
    if (savedSystem) {
      return res.status(200).json({
        success: true,
        message: "System Data Saved Successfully",
        data: savedSystem,
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
        message: "Item name is required",
      });
    }

    const trimmedName = itemName.trim();

    // Check for duplicate
    const existingSystemItem = await SystemItem.findOne({
      itemName: trimmedName,
    });
    if (existingSystemItem) {
      return res.status(400).json({
        success: false,
        message: "Duplicate Data: itemName already exists",
      });
    }

    // Save new system item
    const newSystemItem = new SystemItem({
      itemName: trimmedName,
      createdBy: empId,
    });
    const savedSystemItem = await newSystemItem.save();

    // Add this item to all warehouses' inventories
    const allWarehouses = await Warehouse.find();
    for (let warehouse of allWarehouses) {
      const exists = await InstallationInventory.findOne({
        warehouseId: warehouse._id,
        systemItemId: savedSystemItem._id,
      });

      if (!exists) {
        const newInventory = new InstallationInventory({
          warehouseId: warehouse._id,
          systemItemId: savedSystemItem._id,
          quantity: 0,
          createdBy: empId,
        });
        await newInventory.save();
      }
    }

    return res.status(200).json({
      success: true,
      message: "System Item Added and Mapped to All Warehouses Successfully",
      data: savedSystemItem,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message,
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
        message: "All fields are required",
      });
    }

    const systemItem = await SystemItem.findOne({ _id: systemItemId });
    if (!systemItem) {
      return res.status(404).json({
        success: false,
        message: "SystemItem Not Found",
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
      });
    }

    const insertSystemSubItem = {
      systemId,
      systemItemId,
      // subItemName: subItemName.trim(),
      quantity,
      createdBy: empId,
    };

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
        data: savedSystemSubItem,
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

module.exports.showSystems = async (req, res) => {
  try {
    const systems = await System.find()
      .select("-__v -createdAt -updatedAt -createdBy -updatedBy")
      .lean();
    if (systems) {
      res.status(200).json({
        success: true,
        data: systems,
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
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

    const systemItemData = await SystemItem.find()
      .select("-__v -createdAt -updatedAt -createdBy -updatedBy")
      .lean();
    if (systemItemData) {
      return res.status(200).json({
        success: true,
        message: "System Item Fetched Successfully",
        data: systemItemData || [],
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

module.exports.showSystemItemMapData = async (req, res) => {
  try {
    const { systemId } = req.query;
    const systemSubItemData = await SystemItemMap.find({ systemId: systemId })
      .populate({
        path: "systemItemId",
        select: {
          _id: 1,
          itemName: 1,
        },
      })
      .select("-_id -__v -createdAt -updatedAt -createdBy -updatedBy")
      .lean();
    if (!systemSubItemData.length) {
      return res.status(404).json({
        success: false,
        message: "No system items found for this system.",
      });
    }
    res.status(200).json({
      success: true,
      data: systemSubItemData,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

module.exports.showItemComponents = async (req, res) => {
  try {
    const { systemId, systemItemId } = req.query;
    if (!systemId || !systemItemId) {
      return res.status(400).json({
        success: false,
        message: "systemId and systemItemId are required",
      });
    }
    const itemComponentData = await ItemComponentMap.find({
      systemId,
      systemItemId,
    })
      .populate({
        path: "subItemId",
        select: {
          _id: 1,
          itemName: 1,
        },
      })
      .select(
        "-systemId -systemItemId -_id -__v -createdAt -updatedAt -createdBy -updatedBy"
      )
      .lean();
    if (!itemComponentData.length) {
      return res.status(404).json({
        success: false,
        message: "No item components found for this system item.",
      });
    }
    res.status(200).json({
      success: true,
      data: itemComponentData,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message,
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
    const inventorySystemItems = await InstallationInventory.find({
      warehouseId: warehouseId,
    })
      .populate({
        path: "systemItemId",
        select: {
          _id: 1,
          itemName: 1,
        },
      })
      .select(
        "-_id -warehouseId -createdAt -updatedAt -createdBy -updatedBy -__v"
      )
      .lean();
    return res.status(200).json({
      success: true,
      message: "Data Fetched Successfully",
      data: inventorySystemItems || [],
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message,
    });
  }
};

// module.exports.showItemsWithStockStatus = async (req, res) => {
//   try {
//     const warehouseId = req.user.warehouse;
//     const systemId = req.query.systemId;
//     const systemCount = 25;

//     if (!systemId) {
//       return res.status(400).json({
//         success: false,
//         message: "systemId is required",
//       });
//     }

//     // Step 1: Fetch required items and quantities for the system
//     const [systemItemMaps, subItemMaps] = await Promise.all([
//       SystemItemMap.find({ systemId }).select("systemItemId quantity").lean(),
//       ItemComponentMap.find({ systemId }).select("subItemId quantity").lean(),
//     ]);

//     const requiredQtyMap = new Map();
//     const itemIdSet = new Set();

//     systemItemMaps.forEach(({ systemItemId, quantity }) => {
//       const id = systemItemId.toString();
//       requiredQtyMap.set(
//         id,
//         (requiredQtyMap.get(id) || 0) + quantity * systemCount
//       );
//       itemIdSet.add(id);
//     });

//     subItemMaps.forEach(({ subItemId, quantity }) => {
//       const id = subItemId.toString();
//       requiredQtyMap.set(
//         id,
//         (requiredQtyMap.get(id) || 0) + quantity * systemCount
//       );
//       itemIdSet.add(id);
//     });

//     const itemIds = Array.from(itemIdSet);

//     // Step 2: Fetch inventory for these item IDs in the warehouse
//     const inventoryItems = await InstallationInventory.find({
//       warehouseId,
//       systemItemId: { $in: itemIds },
//     })
//       .populate({
//         path: "systemItemId",
//         select: "_id itemName",
//       })
//       .select("systemItemId quantity")
//       .lean();

//     const inventoryMap = new Map();

//     for (const item of inventoryItems) {
//       const id = item.systemItemId._id.toString();
//       if (!inventoryMap.has(id)) {
//         inventoryMap.set(id, {
//           systemItemId: {
//             _id: item.systemItemId._id,
//             itemName: item.systemItemId.itemName,
//           },
//           quantity: 0,
//         });
//       }
//       inventoryMap.get(id).quantity += item.quantity;
//     }

//     // Step 3: Construct final result array
//     const result = [];

//     for (const id of itemIds) {
//       const requiredQuantity = requiredQtyMap.get(id) || 0;
//       const inv = inventoryMap.get(id);

//       let quantity = 0;
//       let systemItemData = {
//         _id: id,
//         itemName: "Unknown Item",
//       };

//       if (inv) {
//         quantity = inv.quantity;
//         systemItemData = inv.systemItemId;
//       }

//       let materialShort = 0;
//       if (quantity < requiredQuantity) {
//         materialShort = requiredQuantity - quantity;
//       }

//       result.push({
//         systemItemId: systemItemData,
//         quantity,
//         requiredQuantity,
//         stockLow: quantity < requiredQuantity,
//         materialShort,
//       });
//     }

//     // Step 4: Sort by quantity ascending
//     result.sort((a, b) => a.quantity - b.quantity);

//     return res.status(200).json({
//       success: true,
//       message: "Inventory fetched with stock status",
//       data: result,
//     });
//   } catch (error) {
//     return res.status(500).json({
//       success: false,
//       message: "Internal Server Error",
//       error: error.message,
//     });
//   }
// };

module.exports.showItemsWithStockStatus = async (req, res) => {
  try {
    const warehouseId = req.user.warehouse;
    const systemId = req.query.systemId;
    const systemCount = 25; // assumed number of systems you want to plan for

    if (!systemId) {
      return res.status(400).json({
        success: false,
        message: "systemId is required",
      });
    }

    // Step 1: Fetch required items and quantities for the system
    const [systemItemMaps, subItemMaps] = await Promise.all([
      SystemItemMap.find({ systemId }).select("systemItemId quantity").lean(),
      ItemComponentMap.find({ systemId }).select("subItemId quantity").lean(),
    ]);

    const requiredQtyMap = new Map();
    const itemIdSet = new Set();

    systemItemMaps.forEach(({ systemItemId, quantity }) => {
      const id = systemItemId.toString();
      requiredQtyMap.set(id, quantity);
      itemIdSet.add(id);
    });

    subItemMaps.forEach(({ subItemId, quantity }) => {
      const id = subItemId.toString();
      requiredQtyMap.set(id, (requiredQtyMap.get(id) || 0) + quantity);
      itemIdSet.add(id);
    });

    const itemIds = Array.from(itemIdSet);

    // Step 2: Fetch inventory for these item IDs in the warehouse
    const inventoryItems = await InstallationInventory.find({
      warehouseId,
      systemItemId: { $in: itemIds },
    })
      .populate({
        path: "systemItemId",
        select: "_id itemName",
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
            itemName: item.systemItemId.itemName,
          },
          quantity: 0,
        });
      }
      inventoryMap.get(id).quantity += item.quantity;
    }

    // Step 3: Construct final result array + calculate dispatchable systems
    const result = [];
    let minPossibleSystems = Infinity; // will hold how many full systems can be built

    for (const id of itemIds) {
      const requiredPerSystem = requiredQtyMap.get(id) || 0;
      const inv = inventoryMap.get(id);
      const availableQty = inv ? inv.quantity : 0;

      // Calculate how many full systems can be made with this item
      const possibleSystems =
        requiredPerSystem > 0
          ? Math.floor(availableQty / requiredPerSystem)
          : Infinity;

      if (possibleSystems < minPossibleSystems) {
        minPossibleSystems = possibleSystems;
      }

      const systemItemData = inv
        ? inv.systemItemId
        : { _id: id, itemName: "Unknown Item" };

     // result.push({
//         systemItemId: systemItemData,
//         quantity,
//         requiredQuantity,
//         stockLow: quantity < requiredQuantity,
//         materialShort,
//       });
//     }

      result.push({
        systemItemId: systemItemData,
        quantity: availableQty,
        requiredQuantity: requiredPerSystem,
        materialShort: possibleSystems,
        stockLow: availableQty < requiredPerSystem * systemCount,
      });
    }

    if (minPossibleSystems === Infinity) minPossibleSystems = 0;

    // Step 4: Sort by available quantity ascending
    result.sort((a, b) => a.availableQuantity - b.availableQuantity);

    // Step 5: Return response
    return res.status(200).json({
      success: true,
      message: "Inventory fetched with stock status",
      dispatchableSystems: minPossibleSystems,
      data: result,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message,
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
    };
    const itemData = await InstallationInventory.findOne(filter);
    itemData.quantity = parseInt(itemData.quantity) + parseInt(updatedQuantity);
    itemData.updatedAt = Date.now();
    itemData.updatedBy = req.user._id;
    let refType;
    if (req.user.role === "admin") {
      refType = "Admin";
    } else if (req.user.role === "warehouseAdmin") {
      refType = "WarehousePerson";
    }

    const insertData = {
      referenceType: refType,
      warehouseId,
      systemItemId,
      quantity: parseInt(updatedQuantity),
      createdAt: new Date(),
      createdBy: req.user._id,
    };

    const addStock = new StockUpdateActivity(insertData);
    const savedStock = await addStock.save();
    const updatedItemData = await itemData.save();

    if (savedStock && updatedItemData) {
      return res.status(200).json({
        success: true,
        message: "Stock Activity & Data Updated Successfully",
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

// module.exports.addNewInstallationData = async (req, res) => {
//   const session = await mongoose.startSession();
//   session.startTransaction();

//   try {
//     const {
//       farmerSaralId,
//       empId,
//       systemId,
//       itemsList,
//       extraItemsList,
//       extraPanelNumbers,
//       panelNumbers,
//       pumpNumber,
//       motorNumber,
//       controllerNumber,
//       rmuNumber,
//     } = req.body;

//     const warehousePersonId = req.user._id;
//     const warehouseId = req.user.warehouse;

//     // ✅ Fetch warehouse data
//     const warehouseData = await Warehouse.findById(warehouseId).session(
//       session
//     );
//     if (!warehouseData) {
//       await session.abortTransaction();
//       session.endSession();
//       return res
//         .status(404)
//         .json({ success: false, message: "Warehouse Not Found" });
//     }

//     // ✅ Determine State
//     let state;
//     const whName = warehouseData.warehouseName;
//     if (["Bhiwani", "Jind", "Hisar", "Sirsa"].includes(whName)) {
//       state = "Haryana";
//     } else if (whName === "Jalna Warehouse") {
//       state = "Maharashtra";
//     } else if (whName === "Korba Chhattisgarh") {
//       state = "Chhattisgarh";
//     }

//     // ✅ Basic Validations
//     if (
//       !farmerSaralId ||
//       !empId ||
//       !systemId ||
//       !itemsList ||
//       !panelNumbers ||
//       !pumpNumber ||
//       !controllerNumber ||
//       !rmuNumber ||
//       !motorNumber
//     ) {
//       await session.abortTransaction();
//       session.endSession();
//       return res
//         .status(400)
//         .json({ success: false, message: "All fields are required" });
//     }

//     if (!Array.isArray(itemsList) || itemsList.length === 0) {
//       await session.abortTransaction();
//       session.endSession();
//       return res
//         .status(400)
//         .json({ success: false, message: "ItemsList is empty" });
//     }

//     // ✅ Check if farmer activity already exists
//     const existingFarmerActivity = await FarmerItemsActivity.findOne({
//       farmerSaralId,
//       systemId,
//     }).session(session);
//     if (existingFarmerActivity) {
//       await session.abortTransaction();
//       session.endSession();
//       return res.status(400).json({
//         success: false,
//         message: "Farmer activity for this system already exists",
//       });
//     }

//     // ✅ Determine Reference Type
//     let refType;
//     let empData = await ServicePerson.findById(empId).session(session);
//     if (empData) {
//       refType = "ServicePerson";
//     } else {
//       empData = await SurveyPerson.findById(empId).session(session);
//       if (!empData) {
//         await session.abortTransaction();
//         session.endSession();
//         return res
//           .status(400)
//           .json({ success: false, message: "EmpID Not Found In Database" });
//       }
//       refType = "SurveyPerson";
//     }

//     // ✅ Merge itemsList + extraItemsList
//     const combinedItemsMap = new Map();
//     const accumulateItems = (list = []) => {
//       for (const { systemItemId, quantity } of list) {
//         if (!systemItemId || !quantity) continue;
//         const key = systemItemId.toString();
//         const prevQty = combinedItemsMap.get(key) || 0;
//         combinedItemsMap.set(key, prevQty + parseInt(quantity));
//       }
//     };
//     accumulateItems(itemsList);
//     accumulateItems(extraItemsList);

//     const mergedItemList = Array.from(combinedItemsMap.entries()).map(
//       ([systemItemId, quantity]) => ({
//         systemItemId,
//         quantity,
//       })
//     );

//     // ✅ Process inventory updates
//     let warehouseItemsData;
//     if (state === "Haryana") {
//       warehouseItemsData = await WarehouseItems.findById(warehouseId).session(
//         session
//       );
//       if (!warehouseItemsData) {
//         await session.abortTransaction();
//         session.endSession();
//         return res
//           .status(404)
//           .json({ success: false, message: "Warehouse Data Not Found" });
//       }
//     }

//     for (const { systemItemId, quantity } of mergedItemList) {
//       const systemItemData = await SystemItem.findById(systemItemId).session(
//         session
//       );
//       if (!systemItemData) {
//         await session.abortTransaction();
//         session.endSession();
//         return res
//           .status(400)
//           .json({ success: false, message: "SystemItem Not Found" });
//       }

//       const systemItemName = systemItemData.itemName || "";
//       const inventoryItems = await InstallationInventory.find({ warehouseId })
//         .populate({ path: "systemItemId", select: { itemName: 1 } })
//         .session(session);

//       const inventoryItem = inventoryItems.find(
//         (inv) =>
//           inv.systemItemId?.itemName?.toLowerCase() ===
//           systemItemName.toLowerCase()
//       );
//       if (!inventoryItem) {
//         await session.abortTransaction();
//         session.endSession();
//         return res.status(404).json({
//           success: false,
//           message: `SubItem "${systemItemName}" not found in warehouse inventory`,
//         });
//       }

//       if (inventoryItem.quantity < quantity) {
//         await session.abortTransaction();
//         session.endSession();
//         return res.status(400).json({
//           success: false,
//           message: `Insufficient stock for item "${systemItemName}"`,
//         });
//       }

//       // ✅ Deduct from InstallationInventory (always)
//       inventoryItem.quantity -= quantity;
//       inventoryItem.updatedAt = new Date();
//       inventoryItem.updatedBy = warehousePersonId;
//       await inventoryItem.save({ session });

//       // ✅ Extra Haryana-specific logic
//       if (state === "Haryana") {
//         let existingItemData;

//         // MOTOR logic
//         if (systemItemName === "MOTOR 10HP AC 440V") {
//           existingItemData = warehouseItemsData.items.find(
//             (item) => item.itemName === systemItemName
//           );
//         }

//         // PUMP logic
//         if (
//           [
//             "PUMP 10HP AC 30MTR",
//             "PUMP 10HP AC 50MTR",
//             "PUMP 10HP AC 70MTR",
//             "PUMP 10HP AC 100MTR",
//           ].includes(systemItemName)
//         ) {
//           const normalizeWords = (str) =>
//             (str || "").toLowerCase().split(/\s+/);
//           const haveCommonBase = (name1, name2, minCommonWords = 3) => {
//             const words1 = normalizeWords(name1);
//             const words2 = normalizeWords(name2);
//             const common = words1.filter((word) => words2.includes(word));
//             return common.length >= minCommonWords;
//           };

//           existingItemData = warehouseItemsData.items.find((item) =>
//             haveCommonBase(item.itemName, systemItemName)
//           );
//         }

//         // Controller logic
//         if (systemItemName === "Controller - RMU - 10HP AC GALO") {
//           existingItemData = warehouseItemsData.items.find(
//             (item) => item.itemName === "CONTROLLER 10HP AC GALO"
//           );
//         }

//         if (!existingItemData) {
//           await session.abortTransaction();
//           session.endSession();
//           return res.status(404).json({
//             success: false,
//             message: `Item "${systemItemName}" Not Found In Warehouse`,
//           });
//         }

//         if (existingItemData.newStock < quantity) {
//           await session.abortTransaction();
//           session.endSession();
//           return res.status(400).json({
//             success: false,
//             message: `Insufficient stock for the ${systemItemName}`,
//           });
//         }

//         // ✅ Deduct from WarehouseItems (Haryana only)
//         existingItemData.newStock =
//           parseInt(existingItemData.newStock) - parseInt(quantity);
//       }
//     }

//     // ✅ Save Farmer Activity
//     const farmerActivity = new FarmerItemsActivity({
//       warehouseId,
//       referenceType: refType,
//       farmerSaralId,
//       empId,
//       systemId,
//       itemsList,
//       extraItemsList: extraItemsList || [],
//       extraPanelNumbers: extraPanelNumbers || [],
//       panelNumbers,
//       pumpNumber,
//       motorNumber,
//       controllerNumber,
//       rmuNumber,
//       state,
//       createdBy: warehousePersonId,
//     });

//     const savedFarmerActivity = await farmerActivity.save({ session });
//     if (!savedFarmerActivity) throw new Error("Failed to save farmer activity");

//     // ✅ Save Installation Assignment
//     const empAccountData = new InstallationAssignEmp({
//       warehouseId,
//       referenceType: refType,
//       empId,
//       farmerSaralId,
//       systemId,
//       itemsList,
//       extraItemsList,
//       createdBy: warehousePersonId,
//     });

//     const savedEmpAccountData = await empAccountData.save({ session });
//     if (!savedEmpAccountData)
//       throw new Error("Failed to save employee account data");

//     // ✅ Commit transaction
//     await session.commitTransaction();
//     session.endSession();

//     return res.status(200).json({
//       success: true,
//       message: "Data Saved Successfully",
//       farmerActivity,
//       empAccountData,
//     });
//   } catch (error) {
//     await session.abortTransaction();
//     session.endSession();
//     console.error("Error in addNewInstallationData:", error.message);
//     return res.status(500).json({
//       success: false,
//       message: "Internal Server Error",
//       error: error.message,
//     });
//   }
// };

function validateKeys(arr, requiredKeys) {
  for (let i = 0; i < arr.length; i++) {
    const obj = arr[i];

    for (const key of requiredKeys) {
      if (!obj.hasOwnProperty(key)) {
        return {
          success: false,
          message: `Missing ${key} in the data`,
        };
      }
    }
  }

  return {
    success: true,
    message: "Data validated successfully",
  };
}

module.exports.getControllerData = async (req, res) => {
  try {
    const systemId = req.query?.systemId?.trim();
    if (!systemId) {
      return res.status(400).json({
        success: false,
        message: "SystemId is required",
      });
    }
    const systemData = await System.findById(systemId).select("systemName");
    console.log(systemData);
    const systemName = systemData?.systemName;

    // 🧠 Example: "7.5HP DC System" → ["7.5HP", "DC"]
    const parts = systemName.split(" ").filter(Boolean);
    if (parts[parts.length - 1].toLowerCase() === "system") {
      parts.pop();
    }

    const [hp, controllerType] = parts;
    if (!hp || !controllerType) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid systemName format. Expected format like '7.5HP DC System'",
      });
    }

    console.log("Searching for:", hp, controllerType);

    // 🔒 Escape special characters
    const escapedHp = hp.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

    // ✅ Strict match: must have space, hyphen, or start before HP
    // and cannot have digits or dots before it
    const hpRegex = new RegExp(`(^|\\s|-)${escapedHp}(?![0-9.])`, "i");
    const controllerTypeRegex = new RegExp(controllerType, "i");
    const controllerRegex = /Controller/i;

    const matchingItems = await SystemItem.find({
      $and: [
        { itemName: { $regex: controllerRegex } },
        { itemName: { $regex: hpRegex } },
        { itemName: { $regex: controllerTypeRegex } },
      ],
    }).sort({ createdAt: 1 });

    console.log("Found items:", matchingItems.length);

    if (!matchingItems.length) {
      return res.status(404).json({
        success: false,
        message: `No matching controllers found for ${systemName}`,
      });
    }

    return res.status(200).json({
      success: true,
      systemName,
      total: matchingItems.length,
      items: matchingItems.map((item) => ({
        id: item._id,
        name: item.itemName,
      })),
    });
  } catch (error) {
    console.error("Error fetching controller data:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Internal Server Error",
    });
  }
};

// module.exports.addNewInstallationData = async (req, res) => {
//   const session = await mongoose.startSession();
//   session.startTransaction();

//   try {
//     const { dispatchedSystem, driverName, driverContact, vehicleNumber } =
//       req.body;

//     // Parse dispatched systems
//     const dispatchedSystems =
//       typeof dispatchedSystem === "string"
//         ? JSON.parse(dispatchedSystem)
//         : dispatchedSystem;

//     if (!Array.isArray(dispatchedSystems) || dispatchedSystems.length === 0)
//       return res
//         .status(400)
//         .json({ success: false, message: "No dispatched systems provided" });

//     // Map uploaded files by fieldname: dispatchBillPhoto1, dispatchBillPhoto2, ...
//     const uploadedFiles = req.files || [];
//     if (uploadedFiles.length === 0)
//       return res
//         .status(400)
//         .json({ success: false, message: "No bill photos uploaded" });

//     const billPhotosMap = {};
//     uploadedFiles.forEach((file) => {
//       const match = file.fieldname.match(/dispatchBillPhoto(\d+)/);
//       if (match) billPhotosMap[parseInt(match[1], 10) - 1] = file;
//     });

//     if (Object.keys(billPhotosMap).length !== dispatchedSystems.length)
//       return res.status(400).json({
//         success: false,
//         message: `Each dispatched system must have exactly one bill photo (${dispatchedSystems.length} required, got ${Object.keys(billPhotosMap).length})`,
//       });

//     // Validate transport details
//     if (!driverName || !driverContact || !vehicleNumber)
//       return res.status(400).json({
//         success: false,
//         message: "Driver name, contact, and vehicle number are required",
//       });

//     // Validate required keys in dispatched systems
//     const requiredKeys = ["installerId", "farmerSaralId", "systemId", "pumpId"];
//     const keyValidation = validateKeys(dispatchedSystems, requiredKeys);
//     if (!keyValidation.success) return res.status(400).json(keyValidation);

//     const warehousePersonId = req.user._id;
//     const warehouseId = req.user.warehouse;
//     const warehouseData =
//       await Warehouse.findById(warehouseId).session(session);
//     if (!warehouseData) throw new Error("Warehouse not found");

//     const stateMap = {
//       Bhiwani: "Haryana",
//       "Jalna Warehouse": "Maharashtra",
//       "Korba Chhattisgarh": "Chhattisgarh",
//     };
//     const state = stateMap[warehouseData.warehouseName] || "";

//     // Create dispatch record
//     const dispatchDetails = new DispatchDetails({
//       driverName,
//       driverContact,
//       vehicleNumber,
//       dispatchedBy: warehousePersonId,
//       warehouseId,
//       dispatchedSystems: [],
//     });
//     await dispatchDetails.save({ session });

//     const farmerActivities = [];
//     const assignedEmps = [];

//     for (let i = 0; i < dispatchedSystems.length; i++) {
//       const system = dispatchedSystems[i];
//       const billPhotoFile = billPhotosMap[i];
//       const billPhotoPath = `/uploads/dispatchedSystems/dispatchBillPhoto/${billPhotoFile.filename}`;

//       // Check existing activity
//       const existingActivity = await FarmerItemsActivity.findOne({
//         farmerSaralId: system.farmerSaralId,
//       }).session(session);
//       if (existingActivity)
//         throw new Error(
//           `Farmer ${system.farmerSaralId} system already dispatched`
//         );

//       // Find installer
//       let empData = await ServicePerson.findById(system.installerId).session(
//         session
//       );
//       let refType = "ServicePerson";
//       if (!empData) {
//         empData = await SurveyPerson.findById(system.installerId).session(
//           session
//         );
//         if (!empData) throw new Error("Installer not found");
//         refType = "SurveyPerson";
//       }

//       // Fetch system items
//       const systemItems = await SystemItemMap.find({
//         systemId: system.systemId,
//       })
//         .populate("systemItemId", "itemName")
//         .session(session);
//       if (!systemItems.length)
//         throw new Error(
//           `No system items found for systemId: ${system.systemId}`
//         );

//       // Identify pump
//       const pumpItems = systemItems.filter((item) =>
//         item.systemItemId?.itemName?.toLowerCase().includes("pump")
//       );
//       const matchingPump = pumpItems.find(
//         (item) => item.systemItemId._id.toString() === system.pumpId.toString()
//       );
//       if (!matchingPump)
//         throw new Error(`Pump with ID ${system.pumpId} not found`);

//       // Filter other system items (non-pump)
//       const filteredSystemItems = systemItems.filter((item) => {
//         const isPump = pumpItems.some(
//           (pump) =>
//             pump.systemItemId._id.toString() ===
//             item.systemItemId._id.toString()
//         );
//         return (
//           !isPump ||
//           item.systemItemId._id.toString() === system.pumpId.toString()
//         );
//       });

//       // Pump components
//       const pumpComponents = await ItemComponentMap.find({
//         systemId: system.systemId,
//         systemItemId: system.pumpId,
//       }).session(session);

//       const itemsList = [
//         ...filteredSystemItems.map((item) => ({
//           systemItemId: item.systemItemId._id,
//           quantity: item.quantity,
//         })),
//         ...pumpComponents.map((comp) => ({
//           systemItemId: comp.subItemId,
//           quantity: comp.quantity,
//         })),
//       ];

//       // Remove duplicates
//       const uniqueItemsMap = new Map();
//       itemsList.forEach((item) =>
//         uniqueItemsMap.set(item.systemItemId.toString(), item)
//       );
//       const finalItemsList = Array.from(uniqueItemsMap.values());

//       // Deduct stock
//       for (const item of finalItemsList) {
//         const stockDoc = await InstallationInventory.findOne({
//           warehouseId,
//           systemItemId: item.systemItemId,
//         })
//           .populate("systemItemId")
//           .session(session);
//         if (!stockDoc) throw new Error(`Item not found in inventory`);
//         if (stockDoc.quantity < item.quantity)
//           throw new Error(
//             `Insufficient stock for item ${stockDoc.systemItemId.itemName}`
//           );
//         // ✅ Decimal-safe rounding logic here
//         const roundTo = (num, digits = 2) =>
//           Math.round(num * Math.pow(10, digits)) / Math.pow(10, digits);

//         console.log(
//           `Deducting ${item.quantity} from ${stockDoc.systemItemId.itemName} (Old Qty: ${stockDoc.quantity})`
//         );

//         // perform the decimal-safe subtraction
//         stockDoc.quantity = roundTo(stockDoc.quantity - item.quantity, 2);

//         console.log(
//           `New Qty for ${stockDoc.systemItemId.itemName}: ${stockDoc.quantity}`
//         );
//         stockDoc.updatedAt = new Date();
//         stockDoc.updatedBy = warehousePersonId;
//         await stockDoc.save({ session });
//       }

//       // Create Farmer Activity
//       const farmerActivity = new FarmerItemsActivity({
//         referenceType: refType,
//         warehouseId,
//         farmerSaralId: system.farmerSaralId,
//         empId: system.installerId,
//         systemId: system.systemId,
//         itemsList: finalItemsList,
//         panelNumbers: [],
//         pumpNumber: "",
//         controllerNumber: "",
//         rmuNumber: "",
//         motorNumber: "",
//         state,
//         createdBy: warehousePersonId,
//       });
//       await farmerActivity.save({ session });

//       // Assign employee
//       const assignedEmp = new InstallationAssignEmp({
//         referenceType: refType,
//         warehouseId,
//         empId: system.installerId,
//         farmerSaralId: system.farmerSaralId,
//         systemId: system.systemId,
//         itemsList: finalItemsList,
//         extraItemsList: [],
//         createdBy: warehousePersonId,
//       });
//       await assignedEmp.save({ session });

//       // Save dispatch bill photo
//       const dispatchBillPhoto = new DispatchBillPhoto({
//         dispatchId: dispatchDetails._id,
//         farmerActivityId: farmerActivity._id,
//         billPhoto: billPhotoPath,
//       });
//       await dispatchBillPhoto.save({ session });

//       farmerActivities.push(farmerActivity);
//       assignedEmps.push(assignedEmp);
//       dispatchDetails.dispatchedSystems.push(farmerActivity._id);
//     }

//     await dispatchDetails.save({ session });
//     await session.commitTransaction();
//     session.endSession();

//     return res.status(200).json({
//       success: true,
//       message: `${farmerActivities.length} systems dispatched successfully`,
//       data: { dispatchDetails },
//     });
//   } catch (error) {
//     await session.abortTransaction();
//     session.endSession();

//     // Safe cleanup using callback-based fs
//     if (req.files) {
//       req.files.forEach((file) => {
//         fs.unlink(file.path, (err) => {
//           if (err) console.error("File cleanup failed:", err.message);
//         });
//       });
//     }

//     return res.status(500).json({
//       success: false,
//       message: error.message || "Internal Server Error",
//     });
//   }
// };


module.exports.addNewInstallationData = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { dispatchedSystem, driverName, driverContact, vehicleNumber } = req.body;

    // Parse the array if sent as JSON string (for form-data)
    const dispatchedSystems =
      typeof dispatchedSystem === "string"
        ? JSON.parse(dispatchedSystem)
        : dispatchedSystem;

    if (!Array.isArray(dispatchedSystems) || dispatchedSystems.length === 0)
      return res.status(400).json({ success: false, message: "No dispatched systems provided" });

    const uploadedFiles = req.files || [];
    if (uploadedFiles.length === 0)
      return res.status(400).json({ success: false, message: "No bill photos uploaded" });

    const billPhotosMap = {};
    uploadedFiles.forEach((file) => {
      const match = file.fieldname.match(/dispatchBillPhoto(\d+)/);
      if (match) billPhotosMap[parseInt(match[1], 10) - 1] = file;
    });

    if (Object.keys(billPhotosMap).length !== dispatchedSystems.length)
      return res.status(400).json({
        success: false,
        message: `Each dispatched system must have exactly one bill photo (${dispatchedSystems.length} required, got ${Object.keys(billPhotosMap).length})`,
      });

    if (!driverName || !driverContact || !vehicleNumber)
      return res.status(400).json({
        success: false,
        message: "Driver name, contact, and vehicle number are required",
      });

    const requiredKeys = ["installerId", "farmerSaralId", "systemId", "pumpId", "controllerId"];
    const keyValidation = validateKeys(dispatchedSystems, requiredKeys);
    if (!keyValidation.success) return res.status(400).json(keyValidation);

    const warehousePersonId = req.user._id;
    const warehouseId = req.user.warehouse;
    const warehouseData = await Warehouse.findById(warehouseId).session(session);
    if (!warehouseData) throw new Error("Warehouse not found");

    const stateMap = {
      Bhiwani: "Haryana",
      "Jalna Warehouse": "Maharashtra",
      "Korba Chhattisgarh": "Chhattisgarh",
    };
    const state = stateMap[warehouseData.warehouseName] || "";

    const dispatchDetails = new DispatchDetails({
      driverName,
      driverContact,
      vehicleNumber,
      dispatchedBy: warehousePersonId,
      warehouseId,
      dispatchedSystems: [],
    });
    await dispatchDetails.save({ session });

    const farmerActivities = [];
    const assignedEmps = [];

    for (let i = 0; i < dispatchedSystems.length; i++) {
      const system = dispatchedSystems[i];
      const billPhotoFile = billPhotosMap[i];
      const billPhotoPath = `/uploads/dispatchedSystems/dispatchBillPhoto/${billPhotoFile.filename}`;

      // Ensure farmer not already dispatched
      const existingActivity = await FarmerItemsActivity.findOne({
        farmerSaralId: system.farmerSaralId,
      }).session(session);
      if (existingActivity)
        throw new Error(`Farmer ${system.farmerSaralId} system already dispatched`);

      // Identify installer
      let empData = await ServicePerson.findById(system.installerId).session(session);
      let refType = "ServicePerson";
      if (!empData) {
        empData = await SurveyPerson.findById(system.installerId).session(session);
        if (!empData) throw new Error("Installer not found");
        refType = "SurveyPerson";
      }

      // ------------------------------
      // 1️⃣ Fetch system items
      // ------------------------------
      const systemItems = await SystemItemMap.find({ systemId: system.systemId })
        .populate("systemItemId", "itemName")
        .session(session);

      if (!systemItems.length)
        throw new Error(`No system items found for systemId: ${system.systemId}`);

      // ------------------------------
      // 2️⃣ Keep only selected pump, remove others and controllers
      // ------------------------------
      const filteredSystemItems = systemItems.filter((item) => {
        const name = item.systemItemId?.itemName?.toLowerCase() || "";

        if (name.includes("controller")) return false; // ❌ Remove controllers
        if (name.includes("pump") && item.systemItemId._id.toString() !== system.pumpId.toString())
          return false; // ❌ Remove pumps other than selected

        return true;
      });

      // Ensure selected pump actually exists
      const selectedPump = systemItems.find(
        (item) => item.systemItemId._id.toString() === system.pumpId.toString()
      );
      if (!selectedPump) throw new Error(`Pump with ID ${system.pumpId} not found`);

      // ------------------------------
      // 3️⃣ Fetch pump components excluding controllers
      // ------------------------------
      const pumpComponents = await ItemComponentMap.find({
        systemId: system.systemId,
        systemItemId: system.pumpId,
      })
        .populate("subItemId", "itemName")
        .session(session);

      const filteredPumpComponents = pumpComponents.filter((comp) => {
        const name = comp.subItemId?.itemName?.toLowerCase() || "";
        if (name.includes("controller") || name.includes("rmu")) return false; // ❌ Remove controllers/RMUs
        return true;
      });

      // ------------------------------
      // 4️⃣ Merge lists
      // ------------------------------
      const itemsList = [
        ...filteredSystemItems.map((item) => ({
          systemItemId: item.systemItemId._id,
          quantity: item.quantity,
        })),
        ...filteredPumpComponents.map((comp) => ({
          systemItemId: comp.subItemId._id,
          quantity: comp.quantity,
        })),
      ];

      // ------------------------------
      // 5️⃣ Add the selected pump
      // ------------------------------
      itemsList.push({
        systemItemId: selectedPump.systemItemId._id,
        quantity: selectedPump.quantity,
      });

      // ------------------------------
      // 6️⃣ Add the controller from frontend
      // ------------------------------
      if (system.controllerId) {
        const controllerItem = await SystemItem.findById(system.controllerId).session(session);
        if (!controllerItem) throw new Error("Controller not found");
        itemsList.push({
          systemItemId: controllerItem._id,
          quantity: 1,
        });
      }

      // ------------------------------
      // 7️⃣ Deduplicate items
      // ------------------------------
      const uniqueItemsMap = new Map();
      for (const item of itemsList) {
        const id = item.systemItemId.toString();
        if (uniqueItemsMap.has(id)) {
          uniqueItemsMap.get(id).quantity += item.quantity;
        } else {
          uniqueItemsMap.set(id, { ...item });
        }
      }
      const finalItemsList = Array.from(uniqueItemsMap.values());

      // ------------------------------
      // 8️⃣ Deduct stock
      // ------------------------------
      for (const item of finalItemsList) {
        const stockDoc = await InstallationInventory.findOne({
          warehouseId,
          systemItemId: item.systemItemId,
        })
          .populate("systemItemId")
          .session(session);

        if (!stockDoc)
          throw new Error(`Item not found in inventory: ${item.systemItemId}`);

        if (stockDoc.quantity < item.quantity)
          throw new Error(`Insufficient stock for item ${stockDoc.systemItemId.itemName}`);

        const roundTo = (num, digits = 2) =>
          Math.round(num * Math.pow(10, digits)) / Math.pow(10, digits);

        stockDoc.quantity = roundTo(stockDoc.quantity - item.quantity, 2);
        stockDoc.updatedAt = new Date();
        stockDoc.updatedBy = warehousePersonId;
        await stockDoc.save({ session });
      }

      // ------------------------------
      // 9️⃣ Save farmer activity
      // ------------------------------
      const farmerActivity = new FarmerItemsActivity({
        referenceType: refType,
        warehouseId,
        farmerSaralId: system.farmerSaralId,
        empId: system.installerId,
        systemId: system.systemId,
        itemsList: finalItemsList,
        panelNumbers: [],
        pumpNumber: "",
        controllerNumber: "",
        rmuNumber: "",
        motorNumber: "",
        state,
        createdBy: warehousePersonId,
      });
      await farmerActivity.save({ session });

      // ------------------------------
      // 🔟 Save assigned emp
      // ------------------------------
      const assignedEmp = new InstallationAssignEmp({
        referenceType: refType,
        warehouseId,
        empId: system.installerId,
        farmerSaralId: system.farmerSaralId,
        systemId: system.systemId,
        itemsList: finalItemsList,
        extraItemsList: [],
        createdBy: warehousePersonId,
      });
      await assignedEmp.save({ session });

      // ------------------------------
      // 11️⃣ Save bill photo
      // ------------------------------
      const dispatchBillPhoto = new DispatchBillPhoto({
        dispatchId: dispatchDetails._id,
        farmerActivityId: farmerActivity._id,
        billPhoto: billPhotoPath,
      });
      await dispatchBillPhoto.save({ session });

      farmerActivities.push(farmerActivity);
      assignedEmps.push(assignedEmp);
      dispatchDetails.dispatchedSystems.push(farmerActivity._id);
    }

    await dispatchDetails.save({ session });
    await session.commitTransaction();
    session.endSession();

    return res.status(200).json({
      success: true,
      message: `${farmerActivities.length} systems dispatched successfully`,
      data: { dispatchDetails },
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();

    if (req.files) {
      req.files.forEach((file) => {
        fs.unlink(file.path, (err) => {
          if (err) console.error("File cleanup failed:", err.message);
        });
      });
    }

    return res.status(500).json({
      success: false,
      message: error.message || "Internal Server Error",
    });
  }
};



// module.exports.getDispatchHistory = async (req, res) => {
//   try {
//     const baseUrl = `${req.protocol}://${req.get("host")}`;
//     const warehouseId = req.user?.warehouse;
//     const history = await DispatchDetails.aggregate([
//       { $sort: { createdAt: -1 } },
//       {
//         $lookup: {
//           from: "inFarmerItemsActivities",
//           localField: "dispatchedSystems",
//           foreignField: "_id",
//           as: "farmerActivities",
//         },
//       },
//       {
//         $lookup: {
//           from: "inSystems",
//           localField: "farmerActivities.systemId",
//           foreignField: "_id",
//           as: "systemsInfo",
//         },
//       },
//       {
//         $lookup: {
//           from: "inDispatchBillPhotos",
//           localField: "farmerActivities._id",
//           foreignField: "farmerActivityId",
//           as: "billPhotos",
//         },
//       },
//       {
//         $lookup: {
//           from: "inSystemItems",
//           localField: "farmerActivities.itemsList.systemItemId",
//           foreignField: "_id",
//           as: "systemItems",
//         },
//       },
//       {
//         $addFields: {
//           farmers: {
//             $map: {
//               input: "$farmerActivities",
//               as: "fa",
//               in: {
//                 farmerSaralId: "$$fa.farmerSaralId",
//                 systemName: {
//                   $first: {
//                     $map: {
//                       input: {
//                         $filter: {
//                           input: "$systemsInfo",
//                           as: "s",
//                           cond: { $eq: ["$$s._id", "$$fa.systemId"] },
//                         },
//                       },
//                       as: "matched",
//                       in: "$$matched.systemName",
//                     },
//                   },
//                 },
//                 pumpData: {
//                   $first: {
//                     $map: {
//                       input: {
//                         $filter: {
//                           input: {
//                             $map: {
//                               input: "$$fa.itemsList",
//                               as: "it",
//                               in: {
//                                 $mergeObjects: [
//                                   "$$it",
//                                   {
//                                     systemItemId: {
//                                       $first: {
//                                         $filter: {
//                                           input: "$systemItems",
//                                           as: "si",
//                                           cond: {
//                                             $eq: [
//                                               "$$si._id",
//                                               "$$it.systemItemId",
//                                             ],
//                                           },
//                                         },
//                                       },
//                                     },
//                                   },
//                                 ],
//                               },
//                             },
//                           },
//                           as: "item",
//                           cond: {
//                             $regexMatch: {
//                               input: "$$item.systemItemId.itemName",
//                               regex: /pump/i,
//                             },
//                           },
//                         },
//                       },
//                       as: "matched",
//                       in: {
//                         name: "$$matched.systemItemId.itemName",
//                       },
//                     },
//                   },
//                 },
//                 billPhoto: {
//                   $first: {
//                     $map: {
//                       input: {
//                         $filter: {
//                           input: "$billPhotos",
//                           as: "bp",
//                           cond: { $eq: ["$$bp.farmerActivityId", "$$fa._id"] },
//                         },
//                       },
//                       as: "matched",
//                       in: { $concat: [baseUrl, "$$matched.billPhoto"] }, // prepend full URL
//                     },
//                   },
//                 },
//               },
//             },
//           },
//         },
//       },
//       {
//         $project: {
//           _id: 0,
//           dispatchDate: "$createdAt",
//           driverName: 1,
//           driverContact: 1,
//           vehicleNumber: 1,
//           farmers: 1,
//         },
//       },
//     ]);

//     if (!history.length)
//       return res
//         .status(404)
//         .json({ success: false, message: "No dispatch history found" });

//     return res.status(200).json({
//       success: true,
//       message: "Dispatch history fetched successfully",
//       data: history,
//     });
//   } catch (error) {
//     console.error(error);
//     return res
//       .status(500)
//       .json({
//         success: false,
//         message: error.message || "Internal Server Error",
//       });
//   }
// };

// module.exports.addNewInstallationData = async (req, res) => {
//   const session = await mongoose.startSession();
//   session.startTransaction();

//   try {
//     const {
//       farmerSaralId,
//       empId,
//       systemId,
//       itemsList,
//       extraItemsList,
//       extraPanelNumbers,
//       panelNumbers,
//       pumpNumber,
//       motorNumber,
//       controllerNumber,
//       rmuNumber,
//     } = req.body;
//     console.log(req.body);
//     const warehousePersonId = req.user._id;
//     const warehouseId = req.user.warehouse;

//     // ✅ Fetch warehouse data
//     const warehouseData =
//       await Warehouse.findById(warehouseId).session(session);
//     if (!warehouseData) {
//       throw new Error("Warehouse Not Found");
//     }

//     // ✅ Determine State
//     let state;
//     const whName = warehouseData.warehouseName;
//     if (["Bhiwani", "Jind", "Hisar", "Sirsa"].includes(whName)) {
//       state = "Haryana";
//     } else if (whName === "Jalna Warehouse") {
//       state = "Maharashtra";
//     } else if (whName === "Korba Chhattisgarh") {
//       state = "Chhattisgarh";
//     }
//     console.log("Determined state:", state);
//     // ✅ Basic Validations
//     if (
//       !farmerSaralId ||
//       !empId ||
//       !systemId ||
//       !itemsList ||
//       !panelNumbers ||
//       !pumpNumber ||
//       !controllerNumber ||
//       !rmuNumber ||
//       !motorNumber
//     ) {
//       throw new Error("All fields are required");
//     }

//     if (!Array.isArray(itemsList) || itemsList.length === 0) {
//       throw new Error("ItemsList is empty");
//     }

//     // ✅ Check if farmer activity already exists
//     const existingFarmerActivity = await FarmerItemsActivity.findOne({
//       farmerSaralId,
//       systemId,
//     }).session(session);
//     if (existingFarmerActivity) {
//       throw new Error("Farmer activity for this system already exists");
//     }

//     // ✅ Determine Reference Type
//     let refType;
//     let empData = await ServicePerson.findById(empId).session(session);
//     if (empData) {
//       refType = "ServicePerson";
//     } else {
//       empData = await SurveyPerson.findById(empId).session(session);
//       if (!empData) {
//         throw new Error("EmpID Not Found In Database");
//       }
//       refType = "SurveyPerson";
//     }

//     // ✅ Merge itemsList + extraItemsList
//     const combinedItemsMap = new Map();
//     const accumulateItems = (list = []) => {
//       for (const { systemItemId, quantity } of list) {
//         if (!systemItemId || !quantity) continue;
//         const key = systemItemId.toString();
//         const prevQty = combinedItemsMap.get(key) || 0;
//         combinedItemsMap.set(key, prevQty + parseInt(quantity));
//       }
//     };
//     accumulateItems(itemsList);
//     accumulateItems(extraItemsList);

//     const mergedItemList = Array.from(combinedItemsMap.entries()).map(
//       ([systemItemId, quantity]) => ({
//         systemItemId,
//         quantity,
//       })
//     );

//     // ✅ Process inventory updates
//     let warehouseItemsData;
//     if (state === "Haryana") {
//       warehouseItemsData = await WarehouseItems.findOne({
//         warehouse: warehouseId,
//       }).session(session);
//       if (!warehouseItemsData) {
//         throw new Error("Warehouse Data Not Found");
//       }
//     }

//     for (const { systemItemId, quantity } of mergedItemList) {
//       const systemItemData =
//         await SystemItem.findById(systemItemId).session(session);
//       if (!systemItemData) {
//         throw new Error("SystemItem Not Found");
//       }

//       const systemItemName = systemItemData.itemName || "";
//       console.log("Processing item:", systemItemName, "Qty:", quantity);

//       const inventoryItems = await InstallationInventory.find({ warehouseId })
//         .populate({ path: "systemItemId", select: { itemName: 1 } })
//         .session(session);

//       const inventoryItem = inventoryItems.find(
//         (inv) =>
//           inv.systemItemId?.itemName?.toLowerCase() ===
//           systemItemName.toLowerCase()
//       );
//       if (!inventoryItem) {
//         throw new Error(
//           `SubItem "${systemItemName}" not found in warehouse inventory`
//         );
//       }

//       // if (inventoryItem.quantity < quantity) {
//       //   throw new Error(`Insufficient stock for item "${systemItemName}"`);
//       // }

//       // ✅ Deduct from InstallationInventory (always)
//       inventoryItem.quantity -= quantity;
//       inventoryItem.updatedAt = new Date();
//       inventoryItem.updatedBy = warehousePersonId;
//       await inventoryItem.save({ session });

//       console.log("Condition check:", { state, systemItemName });

//       // 🔹 Normalize helper
//       const normalizeWords = (str) => (str || "").toLowerCase().split(/\s+/);

//       // 🔹 Motor condition
//       if (state === "Haryana" && systemItemName === "MOTOR 10HP AC 440V") {
//         console.log(
//           "Applying Haryana-specific warehouse deduction for Motor:",
//           systemItemName
//         );

//         const motorNameNormalized = systemItemName.trim().toUpperCase();
//         const updateResult = await WarehouseItems.updateOne(
//           { _id: warehouseItemsData._id },
//           { $inc: { "items.$[elem].newStock": -parseInt(quantity, 10) } },
//           {
//             arrayFilters: [
//               {
//                 "elem.itemName": motorNameNormalized,
//                 "elem.newStock": { $gte: parseInt(quantity, 10) },
//               },
//             ],
//             session,
//           }
//         );

//         console.log("Motor updateResult:", updateResult);
//         if (updateResult.modifiedCount === 0) {
//           throw new Error(
//             `Motor update failed (matched: ${updateResult.matchedCount}, modified: ${updateResult.modifiedCount}). Check itemName/stock for "${motorNameNormalized}"`
//           );
//         }

//         const updatedDoc = await WarehouseItems.findOne(
//           { _id: warehouseItemsData._id },
//           { items: { $elemMatch: { itemName: motorNameNormalized } } }
//         ).session(session);

//         console.log("Updated Motor Item:", updatedDoc?.items?.[0]);
//       }

//       // 🔹 Pump condition
//       if (
//         state === "Haryana" &&
//         systemItemName.toUpperCase().startsWith("PUMP")
//       ) {
//         console.log(
//           "Applying Haryana-specific warehouse deduction for Pump:",
//           systemItemName
//         );

//         const mustHaveWords = normalizeWords(systemItemName);
//         const regex = new RegExp(
//           mustHaveWords.map((w) => `(?=.*${w})`).join(""),
//           "i"
//         );

//         // Find actual pump name from warehouse data
//         const matchedPump = warehouseItemsData.items.find((it) =>
//           regex.test(it.itemName)
//         );
//         if (!matchedPump) {
//           throw new Error(
//             `Pump "${systemItemName}" not found in warehouse items`
//           );
//         }
//         const pumpItemName = matchedPump.itemName;

//         const updateResult = await WarehouseItems.updateOne(
//           { _id: warehouseItemsData._id },
//           { $inc: { "items.$[elem].newStock": -parseInt(quantity, 10) } },
//           {
//             arrayFilters: [
//               {
//                 "elem.itemName": pumpItemName,
//                 "elem.newStock": { $gte: parseInt(quantity, 10) },
//               },
//             ],
//             session,
//           }
//         );

//         console.log("Pump updateResult:", updateResult);
//         if (updateResult.modifiedCount === 0) {
//           throw new Error(
//             `Pump update failed (matched: ${updateResult.matchedCount}, modified: ${updateResult.modifiedCount}). Check "${pumpItemName}" and stock`
//           );
//         }

//         const updatedDoc = await WarehouseItems.findOne(
//           { _id: warehouseItemsData._id },
//           { items: { $elemMatch: { itemName: pumpItemName } } }
//         ).session(session);

//         console.log("Updated Pump Item:", updatedDoc?.items?.[0]);
//       }

//       // 🔹 Controller condition
//       if (
//         state === "Haryana" &&
//         systemItemName === "Controller - RMU - 10HP AC GALO"
//       ) {
//         console.log(
//           "Applying Haryana-specific warehouse deduction for Controller:",
//           systemItemName
//         );

//         const normalizedName = "CONTROLLER 10HP AC GALO";

//         const updateResult = await WarehouseItems.updateOne(
//           { _id: warehouseItemsData._id },
//           { $inc: { "items.$[elem].newStock": -parseInt(quantity, 10) } },
//           {
//             arrayFilters: [
//               {
//                 "elem.itemName": normalizedName,
//                 "elem.newStock": { $gte: parseInt(quantity, 10) },
//               },
//             ],
//             session,
//           }
//         );

//         console.log("Controller updateResult:", updateResult);
//         if (updateResult.modifiedCount === 0) {
//           throw new Error(
//             `Controller update failed (matched: ${updateResult.matchedCount}, modified: ${updateResult.modifiedCount})`
//           );
//         }

//         const updatedDoc = await WarehouseItems.findOne(
//           { _id: warehouseItemsData._id },
//           { items: { $elemMatch: { itemName: normalizedName } } }
//         ).session(session);

//         console.log("Updated Controller Item:", updatedDoc?.items?.[0]);
//       }
//     }

//     // ✅ Save Farmer Activity
//     const farmerActivity = new FarmerItemsActivity({
//       warehouseId,
//       referenceType: refType,
//       farmerSaralId,
//       empId,
//       systemId,
//       itemsList,
//       extraItemsList: extraItemsList || [],
//       extraPanelNumbers: extraPanelNumbers || [],
//       panelNumbers,
//       pumpNumber: pumpNumber.trim().toUpperCase(),
//       motorNumber: motorNumber.trim().toUpperCase(),
//       controllerNumber: controllerNumber.trim().toUpperCase(),
//       rmuNumber: rmuNumber.trim().toUpperCase(),
//       state,
//       createdBy: warehousePersonId,
//     });

//     await farmerActivity.save({ session });

//     // ✅ Save Installation Assignment
//     const empAccountData = new InstallationAssignEmp({
//       warehouseId,
//       referenceType: refType,
//       empId,
//       farmerSaralId,
//       systemId,
//       itemsList,
//       extraItemsList,
//       createdBy: warehousePersonId,
//     });

//     await empAccountData.save({ session });

//     // ✅ Mark serial numbers as used (inside transaction)
//     const updates = [];

//     // Panel Numbers (multiple)
//     if (Array.isArray(panelNumbers)) {
//       panelNumbers.forEach((sn) => {
//         updates.push({
//           updateOne: {
//             filter: {
//               productType: "panel",
//               serialNumber: sn.toUpperCase(),
//               state,
//             },
//             update: { $set: { isUsed: true } },
//           },
//         });
//       });
//     }

//     // Pump
//     updates.push({
//       updateOne: {
//         filter: {
//           productType: "pump",
//           serialNumber: pumpNumber.toUpperCase(),
//           state,
//         },
//         update: { $set: { isUsed: true } },
//       },
//     });

//     // Motor
//     updates.push({
//       updateOne: {
//         filter: {
//           productType: "motor",
//           serialNumber: motorNumber.toUpperCase(),
//           state,
//         },
//         update: { $set: { isUsed: true } },
//       },
//     });

//     // Controller
//     updates.push({
//       updateOne: {
//         filter: {
//           productType: "controller",
//           serialNumber: controllerNumber.toUpperCase(),
//           state,
//         },
//         update: { $set: { isUsed: true } },
//       },
//     });

//     // RMU
//     updates.push({
//       updateOne: {
//         filter: {
//           productType: "rmu",
//           serialNumber: rmuNumber.toUpperCase(),
//           state,
//         },
//         update: { $set: { isUsed: true } },
//       },
//     });

//     if (updates.length > 0) {
//       await SerialNumber.bulkWrite(updates, { session });
//     }

//     // ✅ Commit transaction
//     await session.commitTransaction();
//     session.endSession();

//     return res.status(200).json({
//       success: true,
//       message: "Data Saved Successfully & Serial Numbers Marked as Used",
//     });
//   } catch (error) {
//     await session.abortTransaction();
//     session.endSession();
//     console.error("Error in addNewInstallationData:", error.message);
//     return res.status(500).json({
//       success: false,
//       message: "Internal Server Error",
//       error: error.message,
//     });
//   }
// };

// module.exports.getDispatchHistory = async (req, res) => {
//   try {
//     const baseUrl = `${req.protocol}://${req.get("host")}`;
//     const warehouseId = req.user?.warehouse;

//     const history = await DispatchDetails.aggregate([
//       // ✅ Filter by warehouseId (convert to ObjectId)
//       {
//         $match: {
//           warehouseId: new mongoose.Types.ObjectId(warehouseId),
//         },
//       },

//       // Sort by newest first
//       { $sort: { createdAt: -1 } },

//       // Lookups
//       {
//         $lookup: {
//           from: "inFarmerItemsActivities",
//           localField: "dispatchedSystems",
//           foreignField: "_id",
//           as: "farmerActivities",
//         },
//       },
//       {
//         $lookup: {
//           from: "inSystems",
//           localField: "farmerActivities.systemId",
//           foreignField: "_id",
//           as: "systemsInfo",
//         },
//       },
//       {
//         $lookup: {
//           from: "inDispatchBillPhotos",
//           localField: "farmerActivities._id",
//           foreignField: "farmerActivityId",
//           as: "billPhotos",
//         },
//       },
//       {
//         $lookup: {
//           from: "inSystemItems",
//           localField: "farmerActivities.itemsList.systemItemId",
//           foreignField: "_id",
//           as: "systemItems",
//         },
//       },

//       // Add combined farmer and item info
//       {
//         $addFields: {
//           farmers: {
//             $map: {
//               input: "$farmerActivities",
//               as: "fa",
//               in: {
//                 farmerSaralId: "$$fa.farmerSaralId",
//                 systemName: {
//                   $first: {
//                     $map: {
//                       input: {
//                         $filter: {
//                           input: "$systemsInfo",
//                           as: "s",
//                           cond: { $eq: ["$$s._id", "$$fa.systemId"] },
//                         },
//                       },
//                       as: "matched",
//                       in: "$$matched.systemName",
//                     },
//                   },
//                 },
//                 pumpData: {
//                   $first: {
//                     $map: {
//                       input: {
//                         $filter: {
//                           input: {
//                             $map: {
//                               input: "$$fa.itemsList",
//                               as: "it",
//                               in: {
//                                 $mergeObjects: [
//                                   "$$it",
//                                   {
//                                     systemItemId: {
//                                       $first: {
//                                         $filter: {
//                                           input: "$systemItems",
//                                           as: "si",
//                                           cond: {
//                                             $eq: [
//                                               "$$si._id",
//                                               "$$it.systemItemId",
//                                             ],
//                                           },
//                                         },
//                                       },
//                                     },
//                                   },
//                                 ],
//                               },
//                             },
//                           },
//                           as: "item",
//                           cond: {
//                             $regexMatch: {
//                               input: "$$item.systemItemId.itemName",
//                               regex: /pump/i,
//                             },
//                           },
//                         },
//                       },
//                       as: "matched",
//                       in: {
//                         name: "$$matched.systemItemId.itemName",
//                       },
//                     },
//                   },
//                 },
//                 billPhoto: {
//                   $first: {
//                     $map: {
//                       input: {
//                         $filter: {
//                           input: "$billPhotos",
//                           as: "bp",
//                           cond: { $eq: ["$$bp.farmerActivityId", "$$fa._id"] },
//                         },
//                       },
//                       as: "matched",
//                       in: { $concat: [baseUrl, "$$matched.billPhoto"] },
//                     },
//                   },
//                 },
//               },
//             },
//           },
//         },
//       },

//       // Only show the necessary fields
//       {
//         $project: {
//           _id: 0,
//           dispatchDate: "$createdAt",
//           driverName: 1,
//           driverContact: 1,
//           vehicleNumber: 1,
//           farmers: 1,
//         },
//       },
//     ]);

//     if (!history.length) {
//       return res.status(404).json({
//         success: false,
//         message: "No dispatch history found for this warehouse",
//       });
//     }

//     return res.status(200).json({
//       success: true,
//       message: "Dispatch history fetched successfully",
//       data: history,
//     });
//   } catch (error) {
//     console.error(error);
//     return res.status(500).json({
//       success: false,
//       message: error.message || "Internal Server Error",
//     });
//   }
// };

module.exports.getDispatchHistory = async (req, res) => {
  try {
    const baseUrl = `${req.protocol}://${req.get("host")}`;
    const warehouseId = req.user?.warehouse;

    const history = await DispatchDetails.aggregate([
      {
        $match: {
          warehouseId: new mongoose.Types.ObjectId(warehouseId),
        },
      },

      { $sort: { createdAt: -1 } },

      {
        $lookup: {
          from: "inFarmerItemsActivities",
          localField: "dispatchedSystems",
          foreignField: "_id",
          as: "farmerActivities",
        },
      },
      {
        $lookup: {
          from: "inSystems",
          localField: "farmerActivities.systemId",
          foreignField: "_id",
          as: "systemsInfo",
        },
      },
      {
        $lookup: {
          from: "inDispatchBillPhotos",
          localField: "farmerActivities._id",
          foreignField: "farmerActivityId",
          as: "billPhotos",
        },
      },
      {
        $lookup: {
          from: "inSystemItems",
          localField: "farmerActivities.itemsList.systemItemId",
          foreignField: "_id",
          as: "systemItems",
        },
      },

      {
        $addFields: {
          farmers: {
            $map: {
              input: "$farmerActivities",
              as: "fa",
              in: {
                farmerSaralId: "$$fa.farmerSaralId",

                systemName: {
                  $first: {
                    $map: {
                      input: {
                        $filter: {
                          input: "$systemsInfo",
                          as: "s",
                          cond: { $eq: ["$$s._id", "$$fa.systemId"] },
                        },
                      },
                      as: "matched",
                      in: "$$matched.systemName",
                    },
                  },
                },

                // ✅ Pump Data
                pumpData: {
                  $first: {
                    $map: {
                      input: {
                        $filter: {
                          input: {
                            $map: {
                              input: "$$fa.itemsList",
                              as: "it",
                              in: {
                                $mergeObjects: [
                                  "$$it",
                                  {
                                    systemItemId: {
                                      $first: {
                                        $filter: {
                                          input: "$systemItems",
                                          as: "si",
                                          cond: {
                                            $eq: [
                                              "$$si._id",
                                              "$$it.systemItemId",
                                            ],
                                          },
                                        },
                                      },
                                    },
                                  },
                                ],
                              },
                            },
                          },
                          as: "item",
                          cond: {
                            $regexMatch: {
                              input: "$$item.systemItemId.itemName",
                              regex: /pump/i,
                            },
                          },
                        },
                      },
                      as: "matched",
                      in: {
                        name: "$$matched.systemItemId.itemName",
                      },
                    },
                  },
                },

                // ✅ Controller Data
                controllerData: {
                  $first: {
                    $map: {
                      input: {
                        $filter: {
                          input: {
                            $map: {
                              input: "$$fa.itemsList",
                              as: "it",
                              in: {
                                $mergeObjects: [
                                  "$$it",
                                  {
                                    systemItemId: {
                                      $first: {
                                        $filter: {
                                          input: "$systemItems",
                                          as: "si",
                                          cond: {
                                            $eq: [
                                              "$$si._id",
                                              "$$it.systemItemId",
                                            ],
                                          },
                                        },
                                      },
                                    },
                                  },
                                ],
                              },
                            },
                          },
                          as: "item",
                          cond: {
                            $regexMatch: {
                              input: "$$item.systemItemId.itemName",
                              regex: /controller/i,
                            },
                          },
                        },
                      },
                      as: "matched",
                      in: {
                        name: "$$matched.systemItemId.itemName",
                      },
                    },
                  },
                },

                billPhoto: {
                  $first: {
                    $map: {
                      input: {
                        $filter: {
                          input: "$billPhotos",
                          as: "bp",
                          cond: { $eq: ["$$bp.farmerActivityId", "$$fa._id"] },
                        },
                      },
                      as: "matched",
                      in: { $concat: [baseUrl, "$$matched.billPhoto"] },
                    },
                  },
                },
              },
            },
          },
        },
      },

      {
        $project: {
          _id: 0,
          dispatchDate: "$createdAt",
          driverName: 1,
          driverContact: 1,
          vehicleNumber: 1,
          farmers: 1,
        },
      },
    ]);

    if (!history.length) {
      return res.status(404).json({
        success: false,
        message: "No dispatch history found for this warehouse",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Dispatch history fetched successfully",
      data: history,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: error.message || "Internal Server Error",
    });
  }
};


module.exports.showInstallationDataToWarehouse = async (req, res) => {
  try {
    const warehouseId = req.user.warehouse;
    const showData = await FarmerItemsActivity.find({
      warehouseId: warehouseId,
    })
      .populate({
        path: "warehouseId",
        select: {
          _id: 0,
          warehouseName: 1,
        },
      })
      .populate({
        path: "empId",
        select: {
          _id: 0,
          name: 1,
          contact: 1,
        },
      })
      .populate({
        path: "itemsList.systemItemId", // Populate subItem details
        model: "SystemItem",
        select: {
          _id: 0,
          itemName: 1,
        },
      })
      .populate({
        path: "extraItemsList.systemItemId", // Populate subItem details
        model: "SystemItem",
        select: {
          _id: 0,
          itemName: 1,
        },
      })
      .sort({ createdAt: -1 });

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
          console.error(
            "Failed to fetch farmer details for SaralId:",
            data.farmerSaralId,
            err.message
          );
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
      data: activitiesWithFarmerDetails || [],
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message,
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
        message: "All fields are required",
      });
    }

    if (!Array.isArray(itemsList) || itemsList.length === 0) {
      return res.status(400).json({
        success: false,
        message: "items is an array & should be non-empty",
      });
    }

    let refType;
    if (role === "admin") {
      refType = "Admin";
    } else if (role === "warehouseAdmin") {
      refType = "WarehousePerson";
    }

    for (let item of itemsList) {
      const { systemItemId, quantity } = item;
      const systemItemData = await SystemItem.findOne({ _id: systemItemId });
      if (!systemItemData) {
        return res.status(400).json({
          success: false,
          message: "SubItem Not Found",
        });
      }

      const existingInventoryItems = await InstallationInventory.find({
        warehouseId: req.user.warehouse,
      }).populate({
        path: "systemItemId",
        select: "itemName",
      });

      // Check if any inventory item has a subItemId with a matching subItemName
      const existingItem = existingInventoryItems.find(
        (inv) =>
          inv.systemItemId.itemName.toLowerCase().trim() ===
          systemItemData.itemName.toLowerCase().trim()
      );

      if (!existingItem) {
        throw new Error(
          `SubItem "${systemItemData.itemName}" not found in warehouse inventory`
        );
      }

      // Update inventory quantity
      existingItem.quantity =
        parseInt(existingItem.quantity) + parseInt(quantity);
      await existingItem.save();
    }

    const insertData = {
      referenceType: refType,
      from,
      toWarehouse,
      itemsList,
      company,
      arrivedDate,
      createdBy: req.user._id,
    };

    const incomingInstallationItems = new IncomingItemsAccount(insertData);
    const savedData = await incomingInstallationItems.save();
    if (savedData) {
      return res.status(200).json({
        success: true,
        message:
          "Items Added & Stock Updated To Installation Inventory Account",
        data: savedData,
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

module.exports.showIncomingItemToWarehouse = async (req, res) => {
  try {
    const warehouseId = req.user.warehouse;
    const incomingItems = await IncomingItemsAccount.find({
      toWarehouse: warehouseId,
    })
      .populate({
        path: "toWarehouse",
        select: {
          _id: 0,
          warehouseName: 1,
        },
      })
      .populate({
        path: "itemsList.systemItemId",
        model: "SystemItem",
        select: {
          _id: 1,
          itemName: 1,
        },
      })
      .select("-createdAt -__v")
      .lean();

    return res.status(200).json({
      success: true,
      message: "Data Fetched Successfully",
      data: incomingItems || [],
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message,
    });
  }
};

module.exports.warehouse2WarehouseTransaction = async (req, res) => {
  try {
    const {
      fromWarehouse,
      toWarehouse,
      itemsList,
      driverName,
      driverContact,
      serialNumber,
      remarks,
      outgoing,
      pickupDate,
    } = req.body;
    if (
      !fromWarehouse ||
      !toWarehouse ||
      !itemsList ||
      !driverName ||
      !driverContact ||
      !remarks ||
      !outgoing ||
      !pickupDate
    ) {
      return res.status(400).json({
        success: false,
        message: "All fields are required",
      });
    }

    if (!Array.isArray(itemsList) || itemsList.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Items is an array & should be non-empty",
      });
    }

    if (outgoing === true) {
      for (let item of itemsList) {
        const { systemItemId, quantity } = item;
        const systemItemData = await SystemItem.findOne({ _id: systemItemId });
        if (!systemItemData) {
          return res.status(400).json({
            success: false,
            message: "SubItem Not Found",
          });
        }

        const existingInventoryItems = await InstallationInventory.find({
          warehouseId: req.user.warehouse,
        }).populate({
          path: "systemItemId",
          select: "itemName",
        });

        // Check if any inventory item has a subItemId with a matching subItemName
        const existingItem = existingInventoryItems.find(
          (inv) =>
            inv.systemItemId.itemName.toLowerCase().trim() ===
            systemItemData.itemName.toLowerCase().trim()
        );

        if (!existingItem) {
          throw new Error(
            `SubItem "${systemItemData.itemName}" not found in warehouse inventory`
          );
        }

        if (existingItem.quantity < quantity || existingItem.quantity === 0) {
          throw new Error(
            `Insufficient stock for item "${systemItemData.itemName}"`
          );
        }

        existingItem.quantity =
          parseInt(existingItem?.quantity) - parseInt(quantity);
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
      createdBy: req.user._id,
    };
    const incomingInventoryStock = new SystemInventoryWToW(insertData);
    const savedIncomingStock = await incomingInventoryStock.save();
    if (savedIncomingStock) {
      return res.status(200).json({
        success: true,
        message: "Incoming Inventory Stock Data Saved/Updated Successfully",
        data: savedIncomingStock,
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

module.exports.showIncomingWToWItems = async (req, res) => {
  try {
    const warehouseId = req.user.warehouse;
    if (!warehouseId) {
      return res.status(400).json({
        success: false,
        message: "WarehouseId Not Found",
      });
    }

    const result = await SystemInventoryWToW.find({
      toWarehouse: warehouseId,
      status: false,
    })
      .populate({
        path: "fromWarehouse",
        select: {
          _id: 1,
          warehouseName: 1,
        },
      })
      .populate({
        path: "toWarehouse",
        select: {
          _id: 1,
          warehouseName: 1,
        },
      })
      .populate({
        path: "itemsList.systemItemId",
        model: "SystemItem",
        select: {
          _id: 1,
          itemName: 1,
        },
      })
      .select("-createdAt -createdBy -__v")
      .sort({ createdAt: -1 });
    return res.status(200).json({
      success: true,
      message: "Data Fetched Successfully",
      data: result || [],
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message,
    });
  }
};

module.exports.showOutgoingWToWItems = async (req, res) => {
  try {
    const warehouseId = req.user.warehouse;
    if (!warehouseId) {
      return res.status(400).json({
        success: false,
        message: "WarehouseId Not Found",
      });
    }

    const result = await SystemInventoryWToW.find({
      fromWarehouse: warehouseId,
    })
      .populate({
        path: "fromWarehouse",
        select: {
          _id: 1,
          warehouseName: 1,
        },
      })
      .populate({
        path: "toWarehouse",
        select: {
          _id: 1,
          warehouseName: 1,
        },
      })
      .populate({
        path: "itemsList.systemItemId",
        model: "SystemItem",
        select: {
          _id: 1,
          itemName: 1,
        },
      })
      .select("-createdAt -createdBy -__v")
      .sort({ pickupDate: -1 });
    return res.status(200).json({
      success: true,
      message: "Data Fetched Successfully",
      data: result || [],
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message,
    });
  }
};

module.exports.acceptingWToWIncomingItems = async (req, res) => {
  try {
    const { transactionId, status, arrivedDate } = req.body;
    if (!transactionId) {
      return res.status(400).json({
        success: false,
        message: "TransactionId not found",
      });
    }
    let incomingSystemItems = await SystemInventoryWToW.findOne({
      _id: transactionId,
    })
      .populate({
        path: "fromWarehouse",
        select: {
          _id: 1,
          warehouseName: 1,
        },
      })
      .populate({
        path: "toWarehouse",
        select: {
          _id: 1,
          warehouseName: 1,
        },
      })
      .populate({
        path: "itemsList.systemItemId",
        model: "SystemItem",
        select: {
          _id: 1,
          itemName: 1,
        },
      })
      .select("-createdAt -createdBy -__v")
      .sort({ pickupDate: -1 });
    if (!incomingSystemItems) {
      return res.status(400).json({
        success: false,
        message: "Incoming System Items Data Not Found",
      });
    }

    if (incomingSystemItems.status === true) {
      return res.status(400).json({
        success: false,
        message: "Incoming Items Already Approved",
      });
    }

    if (status === true) {
      for (let item of incomingSystemItems.itemsList) {
        const { systemItemId, quantity } = item;
        const systemItemData = await SystemItem.findOne({ _id: systemItemId });
        if (!systemItemData) {
          return res.status(400).json({
            success: false,
            message: "SubItem Not Found",
          });
        }

        const existingInventoryItems = await InstallationInventory.find({
          warehouseId: req.user.warehouse,
        }).populate({
          path: "systemItemId",
          select: "itemName",
        });

        // Check if any inventory item has a subItemId with a matching subItemName
        const existingItem = existingInventoryItems.find(
          (inv) =>
            inv.systemItemId.itemName.toLowerCase().trim() ===
            systemItemData.itemName.toLowerCase().trim()
        );

        if (!existingItem) {
          throw new Error(
            `SubItem "${systemItemData.itemName}" not found in warehouse inventory`
          );
        }

        existingItem.quantity =
          parseInt(existingItem?.quantity) + parseInt(quantity);
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
        message: "Incoming System Items Approved Successfully",
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

module.exports.incomingWToWSystemItemsHistory = async (req, res) => {
  try {
    const warehouseId = req.user.warehouse;
    const approvedData = await SystemInventoryWToW.find({
      toWarehouse: warehouseId,
      status: true,
    })
      .populate({
        path: "fromWarehouse",
        select: {
          _id: 1,
          warehouseName: 1,
        },
      })
      .populate({
        path: "toWarehouse",
        select: {
          _id: 1,
          warehouseName: 1,
        },
      })
      .populate({
        path: "itemsList.systemItemId",
        model: "SystemItem",
        select: {
          _id: 1,
          itemName: 1,
        },
      })
      .sort({ arrivedDate: -1 });

    return res.status(200).json({
      success: true,
      message: "Approved Data Fetched Successfully",
      data: approvedData || [],
    });
  } catch (error) {
    return res.status(200).json({
      success: false,
      message: "Internal Server Error",
      error: error.message,
    });
  }
};

module.exports.outgoingWToWSystemItemsHistory = async (req, res) => {
  try {
    const warehouseId = req.user.warehouse;
    const approvedOutgoingItems = await SystemInventoryWToW.find({
      fromWarehouse: warehouseId,
      status: true,
    })
      .populate({
        path: "fromWarehouse",
        select: {
          _id: 1,
          warehouseName: 1,
        },
      })
      .populate({
        path: "toWarehouse",
        select: {
          _id: 1,
          warehouseName: 1,
        },
      })
      .populate({
        path: "itemsList.systemItemId",
        model: "SystemItem",
        select: {
          _id: 1,
          itemName: 1,
        },
      })
      .sort({ pickupDate: -1 });
    return res.status(200).json({
      success: true,
      message: "Approved Outgoing Items History",
      data: approvedOutgoingItems || [],
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message,
    });
  }
};

//Service Team Access
// module.exports.allServiceSurveyPersons = async (req, res) => {
//   try {
//     const { state } = req.query;
//     console.log("State:", state);
//     const filter = { isActive: true };
//     if (state) {
//       filter.state = state;
//     }
//     const [servicePersons, surveyPersons] = await Promise.all([
//       ServicePerson.find(filter)
//         .select(
//           "-password -createdAt -createdBy -updatedAt -updatedBy -refreshToken -isActive -__v"
//         )
//         .sort({ state: 1, district: 1 }),
//       SurveyPerson.find(filter)
//         .select(
//           "-password -createdAt -createdBy -updatedAt -updatedBy -refreshToken -isActive -__v"
//         )
//         .sort({ state: 1, district: 1 }),
//     ]);

//     const filterServicePerson = servicePersons.filter((person) => {
//       return person.role === "serviceperson";
//       //|| person.role === 'fieldsales';
//     });

//     const allPersons = [
//       ...surveyPersons.map((person) => ({ ...person, role: "surveyperson" })),
//       ...filterServicePerson.map((person) => ({
//         ...person,
//         role: "serviceperson",
//       })),
//     ];

//     const cleanedData = allPersons.map((item) => ({
//       _id: item._doc._id,
//       name: item._doc.name,
//       role: item.role,
//       email: item._doc.email,
//       contact: item._doc.contact,
//       state: item._doc.state,
//       district: item._doc.district,
//       block: item._doc.block,
//       latitude: item._doc.latitude,
//       longitude: item._doc.longitude,
//     }));

//     return res.status(200).json({
//       success: true,
//       message: "Data Fetched Successfully",
//       data: cleanedData || [],
//     });
//   } catch (error) {
//     return res.status(500).json({
//       success: false,
//       message: "Internal Server Error",
//       error: error.message,
//     });
//   }
// };

module.exports.allServiceSurveyPersons = async (req, res) => {
  try {
    const { state } = req.query;
    console.log("State:", state);

    const filter = { isActive: true };
    if (state) {
      filter.state = state;
    }

    // Fetch servicepersons with role = serviceperson OR fieldsales
    const servicePersons = await ServicePerson.find({
      ...filter,
      role: { $in: ["serviceperson", "fieldsales"] },
    })
      .select(
        "-password -createdAt -createdBy -updatedAt -updatedBy -refreshToken -isActive -__v"
      )
      .sort({ state: 1, district: 1 });

    // Fetch survey persons
    const surveyPersons = await SurveyPerson.find(filter)
      .select(
        "-password -createdAt -createdBy -updatedAt -updatedBy -refreshToken -isActive -__v"
      )
      .sort({ state: 1, district: 1 });

    // Merge both lists
    const allPersons = [
      ...surveyPersons.map((person) => ({
        ...person._doc,
        role: "surveyperson",
      })),
      ...servicePersons.map((person) => ({
        ...person._doc,
        role: person.role,
      })), // keep actual role
    ];

    const cleanedData = allPersons.map((item) => ({
      _id: item._id,
      name: item.name,
      role: item.role,
      email: item.email,
      contact: item.contact,
      state: item.state,
      district: item.district,
      block: item.block,
      latitude: item.latitude,
      longitude: item.longitude,
    }));

    return res.status(200).json({
      success: true,
      message: "Data Fetched Successfully",
      data: cleanedData || [],
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message,
    });
  }
};

module.exports.fieldWorkerList = async (req, res) => {
  try {
    const { state } = req.query;
    console.log("State:", state);
    const filter = { isActive: true };
    if (state) {
      filter.state = state;
    }
    const [servicePersons, surveyPersons] = await Promise.all([
      ServicePerson.find(filter)
        .select(
          "-password -createdAt -createdBy -updatedAt -updatedBy -refreshToken -isActive -__v"
        )
        .sort({ state: 1, district: 1 }),
      SurveyPerson.find(filter)
        .select(
          "-password -createdAt -createdBy -updatedAt -updatedBy -refreshToken -isActive -__v"
        )
        .sort({ state: 1, district: 1 }),
    ]);

    // const filterServicePerson = servicePersons.filter((person) => {
    //     return person.role === 'serviceperson';
    //         //|| person.role === 'fieldsales'
    //     });

    const allPersons = [
      ...surveyPersons.map((person) => ({ ...person })),
      ...servicePersons.map((person) => ({ ...person })),
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
      longitude: item._doc.longitude,
    }));

    return res.status(200).json({
      success: true,
      message: "Data Fetched Successfully",
      data: cleanedData || [],
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message,
    });
  }
};

module.exports.servicePersonForMaharashtra = async (req, res) => {
  try {
    const { state } = req.query;
    console.log("State:", state);
    const filter = { isActive: true };
    if (state) {
      filter.state = state;
    }
    const [servicePersons, surveyPersons] = await Promise.all([
      ServicePerson.find(filter)
        .select(
          "-password -createdAt -createdBy -updatedAt -updatedBy -refreshToken -isActive -__v"
        )
        .sort({ state: 1, district: 1 }),
      SurveyPerson.find(filter)
        .select(
          "-password -createdAt -createdBy -updatedAt -updatedBy -refreshToken -isActive -__v"
        )
        .sort({ state: 1, district: 1 }),
    ]);

    //const filterServicePerson = servicePersons.filter((person) => { return person.role === 'serviceperson'});

    const allPersons = [
      ...surveyPersons.map((person) => ({ ...person })),
      ...servicePersons.map((person) => ({ ...person })),
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
      longitude: item._doc.longitude,
    }));

    return res.status(200).json({
      success: true,
      message: "Data Fetched Successfully",
      data: cleanedData || [],
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message,
    });
  }
};

module.exports.filterServicePersonById = async (req, res) => {
  try {
    const { id } = req.query;
    let employeeName = await ServicePerson.findById({ _id: id }).select(
      "-email -password -role -createdAt -refreshToken -__v -createdAt -updatedAt -createdBy -updatedBy"
    );
    if (!employeeName) {
      employeeName = await SurveyPerson.findById({ _id: id }).select(
        "-email -password -role -createdAt -refreshToken -__v -createdAt -updatedAt -createdBy -updatedBy"
      );
    }
    return res.status(200).json({
      success: true,
      message: "Service Person Found",
      data: employeeName || "",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message,
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
            state: { $ne: null }, // Exclude documents with null state
          },
        },
        {
          $group: {
            _id: "$state", // Group by state
            count: { $sum: 1 }, // Count the number of documents
          },
        },
        {
          $project: {
            state: "$_id", // Rename `_id` to `state`
            count: 1, // Include the count field
            _id: 0, // Exclude the original `_id` field
          },
        },
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
      data: blockData || [],
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message,
    });
  }
};

module.exports.showWarehousePersons = async (req, res) => {
  try {
    const id = req.query.id;
    const filter = {};
    if (id) filter._id = id;
    const allWarehousePersons =
      await WarehousePerson.find(filter).select("_id name");
    return res.status(200).json({
      success: true,
      message: "Warehouse Persons Data Fetched Successfully",
      data: allWarehousePersons || [],
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message,
    });
  }
};

// module.exports.showIncomingItemsFromFarmer = async (req, res) => {
//     try {
//         const { contact, contact2 } = req.query;
//         // If neither contact nor contact2 is provided, return error
//         if (!contact && !contact2) {
//             return res.status(400).json({
//                 success: false,
//                 message: "At least one contact (contact or contact2) is required"
//             });
//         }

//         let filter = { incoming: true };

//         // If both contact and contact2 are provided, search for either of them
//         if (contact && contact2) {
//             filter.$or = [
//                 { farmerContact: Number(contact) },
//                 { farmerContact: Number(contact2) }
//             ];
//         }
//         // If only contact is provided, search for it
//         else if (contact) {
//             filter.farmerContact = Number(contact);
//         }
//         // If only contact2 is provided, search for it
//         else if (contact2) {
//             filter.farmerContact = Number(contact2);
//         }

//         // Fetch data based on the filter
//         let incomingItemsData = await PickupItem.find(filter)
//             .populate({
//                 path: "servicePerson",
//                 select: { "_id": 0, "name": 1 }
//             })
//             .sort({ pickupDate: -1 })
//             .select("-servicePersonName -servicePerContact -__v -image")
//             .lean();

//         // If no data is found, return an empty array
//         if (!incomingItemsData.length) {
//             return res.status(200).json({
//                 success: true,
//                 message: "No data found",
//                 data: []
//             });
//         }

//         // Format the data before returning
//         const formattedData = incomingItemsData.map(item => ({
//             ...item,
//             items: item.items.map(({ _id, ...rest }) => rest),
//             pickupDate: item.pickupDate
//                 ? new Date(item.pickupDate).toISOString().split("T")[0]
//                 : null,
//             arrivedDate: item.arrivedDate
//                 ? new Date(item.arrivedDate).toISOString().split("T")[0]
//                 : null
//         }));

//         // Return the fetched and formatted data
//         return res.status(200).json({
//             success: true,
//             message: "Data Fetched Successfully",
//             data: formattedData
//         });

//     } catch (error) {
//         return res.status(500).json({
//             success: false,
//             message: "Internal Server Error",
//             error: error.message
//         });
//     }
// };

module.exports.showIncomingItemsFromFarmer = async (req, res) => {
  try {
    const contact = req.query.contact;
    const contact2 = req.query.contact2;

    // Validate that at least one contact is provided and is a number
    if ((!contact || isNaN(contact)) && (!contact2 || isNaN(contact2))) {
      return res.status(400).json({
        success: false,
        message: "At least one valid contact (contact or contact2) is required",
      });
    }

    // Prepare base filter
    let filter = { incoming: true };

    // Build contact filter based on input
    if (contact && contact2 && !isNaN(contact) && !isNaN(contact2)) {
      filter.$or = [
        { farmerContact: Number(contact) },
        { farmerContact: Number(contact2) },
      ];
    } else if (contact && !isNaN(contact)) {
      filter.farmerContact = Number(contact);
    } else if (contact2 && !isNaN(contact2)) {
      filter.farmerContact = Number(contact2);
    }

    // Fetch data
    let incomingItemsData = await PickupItem.find(filter)
      .populate({
        path: "servicePerson",
        select: { _id: 0, name: 1 },
      })
      .sort({ pickupDate: -1 })
      .select("-servicePersonName -servicePerContact -__v -image")
      .lean();

    if (!incomingItemsData || !incomingItemsData.length) {
      return res.status(200).json({
        success: true,
        message: "No data found",
        data: [],
      });
    }

    // Format response
    const formattedData = incomingItemsData.map((item) => ({
      ...item,
      items: Array.isArray(item.items)
        ? item.items.map(({ _id, ...rest }) => rest)
        : [],
      pickupDate: item.pickupDate
        ? new Date(item.pickupDate).toISOString().split("T")[0]
        : null,
      arrivedDate: item.arrivedDate
        ? new Date(item.arrivedDate).toISOString().split("T")[0]
        : null,
    }));

    return res.status(200).json({
      success: true,
      message: "Data Fetched Successfully",
      data: formattedData,
    });
  } catch (error) {
    console.error("Error in showIncomingItemsFromFarmer:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message,
    });
  }
};

module.exports.showAllSystemInstallation = async (req, res) => {
  try {
    const allSystemInstallations = await NewSystemInstallation.find().select(
      "-referenceType -createdBy -__v"
    );
    return res.status(200).json({
      success: true,
      message: "Data Fetched Successfully",
      data: allSystemInstallations || [],
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message,
    });
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
    const warehouseItemsData = await WarehouseItems.findOne({
      warehouse: warehouseId,
    });

    if (!warehouseItemsData) {
      return res.status(404).json({
        success: false,
        message: "Warehouse Items Data Not Found",
      });
    }

    // Check if itemName exists in the warehouse items
    const itemIndex = warehouseItemsData.items.findIndex(
      (item) => item.itemName === itemName
    );

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
      itemToUpdate.defective =
        parseInt(itemToUpdate.defective) - parseInt(quantityToUpdate);
      itemToUpdate.quantity =
        parseInt(itemToUpdate.quantity) + parseInt(quantityToUpdate);
      itemToUpdate.repaired =
        parseInt(itemToUpdate.repaired) + parseInt(quantityToUpdate);
    } else {
      itemToUpdate.defective =
        parseInt(itemToUpdate.defective) - parseInt(quantityToUpdate);
      itemToUpdate.rejected =
        parseInt(itemToUpdate.rejected) + parseInt(quantityToUpdate);
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
        message: "All fields are required",
      });
    }

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: "items should be a non-empty array",
      });
    }

    const warehouseItemsData = await WarehouseItems.findOne({
      warehouse: req.user.warehouse,
    });

    if (!warehouseItemsData) {
      return res.status(404).json({
        success: false,
        message: "Warehouse Items Data Not Found",
      });
    }
    for (let item of items) {
      const existingItem = warehouseItemsData.items.find(
        (i) => i.itemName === item.itemName
      );

      if (!existingItem) {
        return res.status(404).json({
          success: false,
          message: "Item Not Found In Warehouse",
        });
      }
      if (
        existingItem.defective === 0 ||
        existingItem.defective < item.quantity
      ) {
        return res.status(403).json({
          success: false,
          message: `Warehouse item defective count: ${existingItem.defective}, is less than sending defective count: ${item.quantity}`,
        });
      }

      existingItem.defective =
        parseInt(existingItem.defective) - parseInt(item.quantity);
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
        data: newOutgoingItemsData,
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

module.exports.showOutgoingItemsData = async (req, res) => {
  try {
    const warehouseId = req.user.warehouse;
    if (!warehouseId) {
      return res.status(400).json({
        success: false,
        message: "WarehouseId Not Found",
      });
    }
    const warehouseData = await Warehouse.findById({ _id: warehouseId });
    if (!warehouseData) {
      return res.status(404).json({
        success: false,
        message: "Warehouse Data Not Found",
      });
    }
    const outgoingItemsData = await OutgoingItems.find({
      fromWarehouse: warehouseData.warehouseName,
    }).sort({ sendingDate: -1 });
    if (!outgoingItemsData) {
      return res.status(404).json({
        success: false,
        message: "Outgoing Items Data Not Found",
      });
    }

    const cleanedData = outgoingItemsData.map((doc) => {
      const docObj = doc.toObject();
      if (Array.isArray(docObj.items)) {
        docObj.items = docObj.items.map((item) => {
          const { _id, ...rest } = item;
          return rest;
        });
      }
      return docObj;
    });
    return res.status(200).json({
      success: true,
      message: "Data Fetched Successfully",
      data: cleanedData || [],
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message,
    });
  }
};

module.exports.showWarehouseItemsData = async (req, res) => {
  try {
    const warehouseId = "67446a8b27dae6f7f4d985dd";
    if (!warehouseId) {
      return res.status(400).json({
        success: false,
        message: "WarehouseId Not Found",
      });
    }
    //const warehouseItemsData = await WarehouseItems.find({warehouse: warehouseId});
    const warehouseItemsData = await WarehouseItems.aggregate([
      {
        $match: { warehouse: new mongoose.Types.ObjectId(warehouseId) },
      },
      {
        $project: {
          _id: 0,
          items: {
            $map: {
              input: "$items",
              as: "item",
              in: { itemName: "$$item.itemName" },
            },
          },
        },
      },
    ]);
    if (!warehouseItemsData) {
      return res.status(404).json({
        success: false,
        message: "Warehouse Items Data Not Found",
      });
    }
    return res.status(200).json({
      success: true,
      message: "Data Fetched Successfully",
      data: warehouseItemsData || [],
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message,
    });
  }
};

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
        message: "SystemId Not Found",
      });
    }
    const systemData = await SystemItem.find({ systemId: systemId });
    if (!systemData) {
      return res.status(404).json({
        success: false,
        message: "System Data Not Found",
      });
    }

    systemData.map(async (system) => {
      system.systemId = "68145a57c633b11fd5905f70";
      await system.save();
    });
    return res.status(200).json({
      success: true,
      message: "SystemId Updated Successfully",
      data: systemData || [],
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message,
    });
  }
};

module.exports.attachItemSubItem = async (req, res) => {
  try {
    const { systemId, systemItemId, subItemId } = req.body;
    if (!systemId || !systemItemId || !subItemId) {
      return res.status(400).json({
        success: false,
        message: "SystemItemId & SubItemId are required",
      });
    }
    const itemSubItemData = await ItemComponentMap.findOne({
      systemId: systemId,
      systemItemId: systemItemId,
      subItemId: subItemId,
    });
    if (itemSubItemData) {
      return res.status(400).json({
        success: false,
        message: "Item SubItem Data Already Exists",
      });
    }
    const newItemSubItemData = new ItemComponentMap({
      systemId: systemId,
      systemItemId,
      subItemId,
      createdBy: req.user._id,
    });
    const savedItemSubItemData = await newItemSubItemData.save();
    if (savedItemSubItemData) {
      return res.status(200).json({
        success: true,
        message: "Item SubItem Data Saved Successfully",
        data: savedItemSubItemData,
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

module.exports.uploadSystemItemsFromExcel = async (req, res) => {
  try {
    if (!req.file) {
      return res
        .status(400)
        .json({ success: false, message: "No file uploaded" });
    }

    const workbook = XLSX.read(req.file.buffer, { type: "buffer" });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(sheet);

    if (!Array.isArray(data) || data.length === 0) {
      return res
        .status(400)
        .json({ success: false, message: "Excel file is empty or invalid" });
    }

    const adminId = req.user?._id || "67446a4296f7ef394e784136";

    // Step 1: Add items to SystemItem
    const itemsToInsert = data
      .map((row) => ({
        itemName: row.itemName?.trim(),
        createdBy: adminId,
      }))
      .filter((item) => item.itemName);

    const insertedItems = await SystemItem.insertMany(itemsToInsert);

    // Step 2: Fetch all warehouses
    const warehouses = await Warehouse.find({}, "_id");

    // Step 3: Prepare and insert InstallationInventory records
    const inventoryRecords = [];

    insertedItems.forEach((item) => {
      warehouses.forEach((wh) => {
        inventoryRecords.push({
          warehouseId: wh._id,
          systemItemId: item._id,
          quantity: 0,
          createdBy: adminId,
        });
      });
    });

    await InstallationInventory.insertMany(inventoryRecords);

    res.status(201).json({
      success: true,
      message: `${insertedItems.length} items added and linked to all warehouses.`,
      data: insertedItems,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports.attachItemComponentMapByExcel = async (req, res) => {
  try {
    if (!req.file) {
      return res
        .status(400)
        .json({ success: false, message: "Excel file is required" });
    }

    const workbook = XLSX.read(req.file.buffer, { type: "buffer" });
    const sheetName = workbook.SheetNames[0];
    const data = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);

    const insertData = [];

    for (const row of data) {
      const { systemId, systemItemId, subItemId, quantity } = row;

      if (!systemId || !systemItemId || !subItemId) continue;

      const exists = await ItemComponentMap.findOne({
        systemId,
        systemItemId,
        subItemId,
      });
      if (!exists) {
        insertData.push({
          systemId,
          systemItemId,
          subItemId,
          quantity,
          createdBy: req.user._id,
        });
      }
    }

    const inserted = await ItemComponentMap.insertMany(insertData);

    return res.status(200).json({
      success: true,
      message: "Data inserted successfully",
      insertedCount: inserted.length,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message,
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
        select: {
          _id: 1,
          itemName: 1,
        },
      })
      .select("-createdAt -createdBy -__v");

    const result = [];

    // Step 2: For each system item, check for subitems
    for (const item of systemItems) {
      const subItems = await ItemComponentMap.find({
        systemId: systemId,
        systemItemId: item.systemItemId._id,
      })
        .populate({
          path: "subItemId",
          select: {
            _id: 1,
            itemName: 1,
          },
        })
        .select("-createdAt -createdBy -__v");

      result.push({
        systemItemId: item.systemItemId,
        quantity: item.quantity,
        createdBy: item.createdBy,
        subItems: subItems.map((sub) => ({
          subItemId: sub.subItemId,
          quantity: sub.quantity,
          createdBy: sub.createdBy,
        })),
      });
    }

    return res.status(200).json({
      success: true,
      message: "System Items with SubItems fetched successfully",
      data: result,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message,
    });
  }
};

module.exports.getSystemItemsFromItemComponentMap = async (req, res) => {
  const { systemId } = req.query;

  try {
    const items = await ItemComponentMap.find({ systemId }).populate({
      path: "systemItemId",
      select: "_id itemName",
    });

    if (!items || items.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No system items found for the system",
      });
    }

    // Filter unique systemItemId
    const uniqueItemsMap = new Map();
    items.forEach((item) => {
      const id = item.systemItemId?._id?.toString();
      if (id && !uniqueItemsMap.has(id)) {
        uniqueItemsMap.set(id, {
          _id: item.systemItemId._id,
          itemName: item.systemItemId.itemName,
        });
      }
    });

    const uniqueItems = Array.from(uniqueItemsMap.values());

    // ✅ Custom sort for pumps (like "PUMP 3HP DC 30M")
    const sortedItems = uniqueItems.sort((a, b) => {
      const extractPumpInfo = (name) => {
        const match = name.match(/PUMP\s*(\d+)HP.*?(\d+)M/i);
        return match ? { hp: +match[1], head: +match[2] } : { hp: 0, head: 0 };
      };

      const aInfo = extractPumpInfo(a.itemName);
      const bInfo = extractPumpInfo(b.itemName);

      if (aInfo.hp !== bInfo.hp) return aInfo.hp - bInfo.hp; // Sort by HP first
      return aInfo.head - bInfo.head; // Then by Head (M)
    });

    res.status(200).json({
      success: true,
      message: "Unique system items fetched and sorted successfully",
      data: sortedItems,
    });
  } catch (error) {
    console.error("Error fetching items by systemId:", error);
    res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message,
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
          reason: "Missing required fields",
        });

        failedCount++;
        continue;
      }

      const escapedName = itemName
        .trim()
        .replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const systemItem = await SystemItem.findOne({
        itemName: new RegExp(`^${escapedName}$`, "i"),
      });

      if (!systemItem) {
        failedList.push({
          itemName,
          warehouseId,
          quantity,
          reason: "SystemItem not found",
        });
        failedCount++;
        continue;
      }

      const inventory = await InstallationInventory.findOne({
        warehouseId,
        systemItemId: systemItem._id,
      });

      if (!inventory) {
        failedList.push({
          itemName,
          warehouseId,
          quantity,
          reason: "InstallationInventory not found",
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
        status: "Updated successfully",
      });
      successCount++;
    }

    return res.status(200).json({
      success: true,
      message: "Inventory update completed",
      summary: {
        totalProcessed: successCount + failedCount,
        updated: successCount,
        failed: failedCount,
      },
      updatedItems: successList,
      failedItems: failedList,
    });
  } catch (error) {
    console.error("Error while updating inventory from Excel:", error);
    res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message,
    });
  }
};

module.exports.declinePickupItemsTransaction = async (req, res) => {
  try {
    const { transactionId, remark } = req.body;

    if (!transactionId || !remark.trim()) {
      return res.status(400).json({
        success: false,
        message: "Incomplete Data",
      });
    }

    const existingData = await PickupItem.findOneAndUpdate(
      { _id: transactionId, status: null },
      {
        status: false,
        warehouseRemark: remark,
        declinedBy: req.user?.name,
        declineDate: new Date(),
      },
      { new: true }
    );

    if (!existingData) {
      return res.status(404).json({
        success: false,
        message: "Data Not Found or Already Processed",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Transaction Declined Successfully",
      data: existingData,
    });
  } catch (error) {
    console.error("ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message,
    });
  }
};

module.exports.addSerialNumber = async (req, res) => {
  try {
    let { productType, serialNumber, state } = req.body;

    if (!productType || !serialNumber || !state) {
      return res.status(400).json({
        success: false,
        message: "Product type and serial number are required",
      });
    }

    productType = productType.trim().toLowerCase();
    const trimmedSerialNumber = serialNumber.trim().toUpperCase();

    // Check if serial number already exists
    const isExist = await SerialNumber.findOne({
      serialNumber: trimmedSerialNumber,
    }).lean();

    if (isExist) {
      return res.status(400).json({
        success: false,
        message: "Serial number already exists",
      });
    }

    // Create new document
    const newSerial = new SerialNumber({
      productType,
      serialNumber: trimmedSerialNumber,
      state,
      isUsed: false,
    });

    await newSerial.save();

    return res.status(201).json({
      success: true,
      message: "Serial number inserted successfully",
      data: newSerial,
    });
  } catch (error) {
    console.error("ERROR:", error.stack);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message,
    });
  }
};

module.exports.getSerialNumber = async (req, res) => {
  try {
    const productType = req.query?.productType?.trim().toLowerCase();
    if (!productType) {
      return res.status(400).json({
        success: false,
        message: "Product Type is required",
      });
    }

    // Fetch all serial numbers for the given product type
    const serialNumbers = await SerialNumber.find(
      { productType },
      { _id: 0, serialNumber: 1, state: 1, isUsed: 1 }
    ).lean();

    if (!serialNumbers || serialNumbers.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No serial numbers found for the given product type",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Data fetched successfully",
      data: serialNumbers,
    });
  } catch (error) {
    console.error("ERROR: ", error.stack);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

module.exports.checkSerialNumber = async (req, res) => {
  const session = await mongoose.startSession();
  try {
    const { productType, serialNumber, panelNumberList } = req.body;
    console.log("Received Data:", {
      productType,
      serialNumber,
      panelNumberList,
    });
    const trimmedProductType = productType
      ? String(productType).trim().toLowerCase()
      : null;
    const trimmedSerialNumber = serialNumber
      ? String(serialNumber).trim().toUpperCase()
      : null;
    console.log("Trimmed Data:", {
      trimmedProductType,
      trimmedSerialNumber,
      panelNumberList,
    });
    if (
      !trimmedProductType ||
      (!trimmedSerialNumber &&
        (!Array.isArray(panelNumberList) || panelNumberList.length === 0))
    ) {
      return res.status(400).json({
        success: false,
        message: "Product Type & Serial Number(s) are required",
      });
    }

    if (trimmedProductType === "rmu" && trimmedSerialNumber.length !== 15) {
      return res.status(400).json({
        success: false,
        message: "RMU Number must be exactly 15 characters long",
      });
    }

    const warehouseId = req.user.warehouse;

    // ✅ Fetch warehouse data
    const warehouseData = await Warehouse.findById(warehouseId);
    if (!warehouseData) {
      return res
        .status(404)
        .json({ success: false, message: "Warehouse Not Found" });
    }

    // ✅ Determine State
    let state;
    const whName = warehouseData.warehouseName;
    if (["Bhiwani"].includes(whName)) {
      state = "Haryana";
    } else if (whName === "Jalna Warehouse") {
      state = "Maharashtra";
    } else if (whName === "Korba Chhattisgarh") {
      state = "Chhattisgarh";
    }
    console.log("Determined State:", state);

    // 🔹 CASE 1: Multiple Panel Numbers
    // 🔹 CASE 1: Multiple Panel Numbers
    if (Array.isArray(panelNumberList) && panelNumberList.length > 0) {
      const trimmedPanelNumbers = panelNumberList.map((num) =>
        String(num).trim().toUpperCase()
      );

      // Find in SerialNumber collection
      const serials = await SerialNumber.find({
        productType: trimmedProductType,
        state,
        serialNumber: { $in: trimmedPanelNumbers },
      }).lean();

      // Find in FarmerItemsActivity collection
      const farmerActivity = await FarmerItemsActivity.find({
        panelNumbers: { $in: trimmedPanelNumbers },
        state,
      }).lean();

      if ((!serials || serials.length === 0) && farmerActivity.length === 0) {
        return res.status(404).json({
          success: false,
          message: "No panel numbers found for this product type",
        });
      }

      // Extract FarmerActivity numbers (only those present in frontend input)
      const farmerActivityNumbers = farmerActivity
        .map((f) => f.panelNumbers)
        .flat()
        .filter((num) => trimmedPanelNumbers.includes(num));

      // Prepare used & unused lists (deduplicated)
      const usedSerials = [
        ...new Set([
          ...serials.filter((s) => s.isUsed).map((s) => s.serialNumber),
          ...farmerActivityNumbers,
        ]),
      ];

      const unusedSerials = [
        ...new Set(
          serials
            .filter(
              (s) =>
                !s.isUsed && !farmerActivityNumbers.includes(s.serialNumber)
            )
            .map((s) => s.serialNumber)
        ),
      ];

      return res.status(200).json({
        success: true,
        message: "Panel numbers checked successfully",
        data: {
          usedSerials,
          unusedSerials,
        },
      });
    }

    // Check in SerialNumber collection
    const existsSerial = await SerialNumber.findOne({
      productType: trimmedProductType,
      state,
      serialNumber: trimmedSerialNumber,
    }).lean();

    // Check in FarmerItemsActivity (for pump, motor, controller, rmu, panels)
    const existsInFarmerActivity = await FarmerItemsActivity.findOne({
      $or: [
        { pumpNumber: trimmedSerialNumber },
        { motorNumber: trimmedSerialNumber },
        { controllerNumber: trimmedSerialNumber },
        { rmuNumber: trimmedSerialNumber },
        { panelNumbers: trimmedSerialNumber },
        { extraPanelNumbers: trimmedSerialNumber },
      ],
    }).lean();

    if (!existsSerial && !existsInFarmerActivity) {
      return res.status(404).json({
        success: false,
        message: `Serial Number not found for this product type for ${state}`,
      });
    }

    // If found in FarmerItemsActivity → Already assigned
    if (existsInFarmerActivity) {
      return res.status(200).json({
        success: true,
        message: `Farmer Already Assigned - ${existsInFarmerActivity.farmerSaralId}`,
      });
    }

    // Else check SerialNumber.isUsed flag
    if (existsSerial && existsSerial.isUsed) {
      return res.status(200).json({
        success: true,
        message: "Already Dispatched",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Good to go",
    });
  } catch (error) {
    console.error("ERROR: ", error.stack);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message,
    });
  } finally {
    session.endSession();
  }
};

module.exports.checkRMUNumber = async (req, res) => {
  try {
    const { productType, rmuNumber } = req.body;
    if (productType.trim().toLowerCase() !== "rmu" || !rmuNumber) {
      return res.status(400).json({
        success: false,
        message: "Product Type & RMU Number is required",
      });
    }

    const warehouseId = req.user.warehouse;
    const warehouseData = await Warehouse.findById(warehouseId);

    if (!warehouseData) {
      return res.status(404).json({
        success: false,
        message: "Warehouse Not Found",
      });
    }

    // ✅ State mapping
    const whName = warehouseData.warehouseName;
    let state;
    if (["Bhiwani"].includes(whName)) {
      state = "Haryana";
    } else if (whName === "Jalna Warehouse") {
      state = "Maharashtra";
    } else if (whName === "Korba Chhattisgarh") {
      state = "Chhattisgarh";
    }

    const trimmedRMUNumber = rmuNumber.trim().toUpperCase();

    // ✅ Check in SerialNumber
    let existingRMU = await SerialNumber.findOne({
      productType: productType.trim().toLowerCase(),
      state,
      serialNumber: trimmedRMUNumber,
    });

    if (!existingRMU) {
      // Check in FarmerItemsActivity (already dispatched)
      const dispatchedSystem = await FarmerItemsActivity.findOne({
        rmuNumber: trimmedRMUNumber,
      });

      if (dispatchedSystem) {
        return res.status(400).json({
          success: false,
          message: `${state} - RMU Number ${trimmedRMUNumber} already dispatched.`,
        });
      }

      // If not found anywhere, create new SerialNumber
      existingRMU = new SerialNumber({
        productType: productType.trim().toLowerCase(),
        state,
        serialNumber: trimmedRMUNumber,
        isUsed: false, // keep available until actually dispatched
      });
      await existingRMU.save();

      return res.status(200).json({
        success: true,
        message: `RMU Number ${trimmedRMUNumber} registered & can be used.`,
      });
    }

    // ✅ If already exists but marked used
    if (existingRMU.isUsed) {
      return res.status(400).json({
        success: false,
        message: `${state} - RMU Number ${trimmedRMUNumber} already dispatched.`,
      });
    }

    return res.status(200).json({
      success: true,
      message: `RMU Number ${trimmedRMUNumber} can be used.`,
    });
  } catch (error) {
    console.error("ERROR in checkRMUNumber: ", error.stack);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message,
    });
  }
};

module.exports.uploadSerialNumbers = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No file uploaded",
      });
    }

    // Parse Excel buffer
    const workbook = XLSX.read(req.file.buffer, { type: "buffer" });
    const sheetName = workbook.SheetNames[0];
    const sheetData = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);

    if (!sheetData.length) {
      return res.status(400).json({
        success: false,
        message: "Excel file is empty",
      });
    }

    const bulkInsertData = [];
    const duplicateRows = [];

    for (const row of sheetData) {
      // Convert values to string safely
      const productType = row.productType
        ? String(row.productType).trim().toLowerCase()
        : null;

      const serialNumber = row.serialNumber
        ? String(row.serialNumber).trim().toUpperCase()
        : null;

      const state = row.state ? String(row.state).trim() : null;
      if (!productType || !serialNumber) {
        duplicateRows.push({ ...row, reason: "Invalid data" });
        continue;
      }

      // Check if serial number already exists
      const exists = await SerialNumber.findOne({
        productType,
        serialNumber,
        state,
      }).lean();

      if (exists) {
        duplicateRows.push({ productType, serialNumber, reason: "Duplicate" });
      } else {
        bulkInsertData.push({
          productType,
          serialNumber,
          state,
          isUsed: false,
        });
      }
    }

    // Insert only valid unique serial numbers
    if (bulkInsertData.length > 0) {
      await SerialNumber.insertMany(bulkInsertData);
    }

    // If duplicates exist, generate an Excel file
    if (duplicateRows.length > 0) {
      const newWB = XLSX.utils.book_new();
      const newWS = XLSX.utils.json_to_sheet(duplicateRows);
      XLSX.utils.book_append_sheet(newWB, newWS, "Duplicates");

      const filePath = path.join(__dirname, "../../uploads/duplicates.xlsx");
      XLSX.writeFile(newWB, filePath);

      return res.download(filePath, "Duplicates_SerialNumber.xlsx", (err) => {
        if (err) {
          console.error("Download error:", err);
        }
        // optionally remove file after download
        fs.unlinkSync(filePath);
      });
    }

    return res.status(200).json({
      success: true,
      message: `${bulkInsertData.length} Serial Numbers Uploaded Successfully. No duplicates found.`,
    });
  } catch (error) {
    console.error("ERROR:", error.stack);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

module.exports.updateSerialNumbersAsUsed = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No file uploaded",
      });
    }

    // Parse Excel buffer
    const workbook = XLSX.read(req.file.buffer, { type: "buffer" });
    const sheetName = workbook.SheetNames[0];
    const sheetData = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);

    if (!sheetData.length) {
      return res.status(400).json({
        success: false,
        message: "Excel file is empty",
      });
    }

    const failedRows = [];
    let updatedCount = 0;

    // Build bulk operations
    const bulkOps = sheetData
      .map((row) => {
        const productType = row.productType
          ? String(row.productType).trim().toLowerCase()
          : null;

        const serialNumber = row.serialNumber
          ? String(row.serialNumber).trim().toUpperCase()
          : null;

        const state = row.state ? String(row.state).trim() : null;

        if (!productType || !serialNumber) {
          failedRows.push({ ...row, reason: "Invalid data" });
          return null;
        }

        return {
          updateOne: {
            filter: { productType, serialNumber },
            update: { $set: { isUsed: true } },
          },
        };
      })
      .filter(Boolean); // remove nulls

    // Run bulkWrite in one go
    if (bulkOps.length > 0) {
      const result = await SerialNumber.bulkWrite(bulkOps, { ordered: false });
      updatedCount = result.modifiedCount;
    }

    // If there are failed rows, export them into an Excel
    if (failedRows.length > 0) {
      const newWB = XLSX.utils.book_new();
      const newWS = XLSX.utils.json_to_sheet(failedRows);
      XLSX.utils.book_append_sheet(newWB, newWS, "Failed Updates");

      const filePath = path.join(
        __dirname,
        "../../uploads/failed_updates.xlsx"
      );
      XLSX.writeFile(newWB, filePath);

      return res.download(filePath, "failed_updates.xlsx", (err) => {
        if (err) {
          console.error("Download error:", err);
        }
        // remove after download
        fs.unlinkSync(filePath);
      });
    }

    return res.status(200).json({
      success: true,
      message: `${updatedCount} Serial Numbers updated successfully. No failures.`,
    });
  } catch (error) {
    console.error("ERROR:", error.stack);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

module.exports.updateIncomingPickupItemSerial = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { transactionId, updatedSerialNumber } = req.body;
    const empRole = req.user?.role;
    console.log(transactionId, updatedSerialNumber);
    // Role check
    if (empRole !== "warehouseAdmin") {
      await session.abortTransaction();
      session.endSession();
      return res.status(403).json({
        success: false,
        message: "Only warehouse person is allowed to update",
      });
    }

    // Input validation
    if (!transactionId || !updatedSerialNumber) {
      await session.abortTransaction();
      session.endSession();
      return res.status(422).json({
        success: false,
        message: "transactionId and updatedSerialNumber are required",
      });
    }

    // Normalize serial number
    const normalizedSerial = updatedSerialNumber.trim().toUpperCase();

    // Check uniqueness inside transaction
    const existingSerial = await PickupItem.findOne(
      { updatedSerialNumber: normalizedSerial, incoming: true },
      null,
      { session }
    );
    if (existingSerial) {
      await session.abortTransaction();
      session.endSession();
      return res.status(409).json({
        success: false,
        message: "This serial number is already in use",
      });
    }
    console.log("Hi");
    // Update document atomically
    const updatedPickupItem = await PickupItem.findOneAndUpdate(
      { _id: transactionId, incoming: true },
      {
        $set: {
          updatedSerialNumber: normalizedSerial,
          updatedBy: req.user?._id,
          updatedAt: new Date(),
        },
      },
      { new: true, session }
    );
    console.log(updatedPickupItem);
    if (!updatedPickupItem) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({
        success: false,
        message: `Incoming PickupItem with id ${transactionId} not found`,
      });
    }

    await session.commitTransaction();
    session.endSession();

    return res.status(200).json({
      success: true,
      message: "PickupItem updated successfully",
      data: updatedPickupItem,
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error("Error updating PickupItem:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message,
    });
  }
};

module.exports.updateOutogingItemFarmerDetails = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const {
      transactionId,
      farmerName,
      farmerContact,
      farmerVillage,
      farmerComplaintId,
      farmerSaralId,
    } = req.body;

    if (!transactionId) {
      return res.status(422).json({
        success: false,
        message: "transactionId is required",
      });
    }

    if (req?.user?.role !== "warehouseAdmin") {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        success: false,
        message: "Only warehouse person is allowed to update.",
      });
    }
    const verifyOutgoingItem = await PickupItem.findOne({
      _id: transactionId,
      incoming: false,
    });

    if (!verifyOutgoingItem) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        success: false,
        message: "Outgoing Item Data Not Found",
      });
    }

    // Build update object dynamically (only provided fields will update)
    const updateFields = {};
    if (farmerName) updateFields.farmerName = farmerName.trim();
    if (farmerContact) updateFields.farmerContact = farmerContact;
    if (farmerVillage) updateFields.farmerVillage = farmerVillage.trim();
    if (farmerComplaintId) updateFields.farmerComplaintId = farmerComplaintId;
    if (farmerSaralId) updateFields.farmerSaralId = farmerSaralId.trim();
    updateFields.updatedAt = new Date();
    updateFields.updatedBy = req.user?._id;

    const updatedPickupItem = await PickupItem.findByIdAndUpdate(
      transactionId,
      { $set: updateFields },
      { new: true, session }
    );

    if (!updatedPickupItem) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({
        success: false,
        message: `PickupItem with id ${transactionId} not found`,
      });
    }

    await session.commitTransaction();
    session.endSession();

    return res.status(200).json({
      success: true,
      message: "Farmer details updated successfully",
      data: updatedPickupItem,
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error("Error updating farmer details:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message,
    });
  }
};

module.exports.addMotorNumbersFromExcel = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No file uploaded",
      });
    }

    // Parse Excel buffer
    const workbook = XLSX.read(req.file.buffer, { type: "buffer" });
    const sheetName = workbook.SheetNames[0];
    const sheetData = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);

    // 2. Loop through Excel rows
    for (const row of sheetData) {
      const { farmerSaralId, motorNumber } = row;

      // Skip if motorNumber is empty
      if (!motorNumber || motorNumber.trim() === "") {
        console.log(
          `⏭ Skipping row for farmerSaralId ${farmerSaralId} (empty motorNumber)`
        );
        continue;
      }

      // 3. Update only if motorNumber is not already present
      const updated = await FarmerItemsActivity.updateOne(
        {
          farmerSaralId,
          $or: [{ motorNumber: { $exists: false } }, { motorNumber: "" }],
        },
        { $set: { motorNumber: motorNumber.toUpperCase().trim() } }
      );

      if (updated.modifiedCount > 0) {
        console.log(
          `✅ Updated motorNumber for farmerSaralId ${farmerSaralId}`
        );
      } else {
        console.log(
          `⚠️ Skipped farmerSaralId ${farmerSaralId} (already has motorNumber or not found)`
        );
      }
    }

    console.log("🎉 Update process completed!");
  } catch (error) {
    console.error("❌ Error updating motorNumbers:", error);
  }
};

module.exports.exportMotorNumbersExcel = async (req, res) => {
  try {
    // Fetch only motorNumbers where state = Maharashtra
    const records = await FarmerItemsActivity.find(
      { state: "Maharashtra" },
      { motorNumber: 1, _id: 0 }
    ).lean();

    if (!records.length) {
      return res.status(404).json({
        success: false,
        message: "No motor numbers found for Maharashtra",
      });
    }

    // Create workbook & worksheet
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("MotorNumbers");

    // Define header
    worksheet.columns = [
      { header: "Motor Number", key: "motorNumber", width: 30 },
    ];

    // Insert rows
    records.forEach((record) => {
      worksheet.addRow({ motorNumber: record.motorNumber });
    });

    // Set response headers for file download
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=motorNumbers_maharashtra.xlsx"
    );

    // Write to response
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error("Error exporting motor numbers:", error);
    res.status(500).json({
      success: false,
      message: "Error generating Excel file",
      error: error.message,
    });
  }
};

// module.exports.importDispatchedSystemExcelData = async (req, res) => {
//   try {
//     if (!req.file || !req.file.buffer) {
//       return res.status(400).json({ message: "Please upload an Excel file" });
//     }

//     // Parse Excel
//     const workbook = XLSX.read(req.file.buffer, { type: "buffer" });
//     const sheetName = workbook.SheetNames[0];
//     const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);

//     const farmerActivityDocs = [];
//     const employeeAssignedDocs = [];
//     const serialNumbersToUpdate = [];
//     const failedRows = [];

//     for (let row of rows) {
//       try {
//         // --- System check ---
//         const system = await System.findOne({ systemName: row.systemName });
//         console.log("System: ", system);
//         if (!system) {
//           failedRows.push({ ...row, reason: "System not found" });
//           continue;
//         }

//         // --- Employee check ---
//         console.log("Employee Name", row.employeeName);
//         const empData = await ServicePerson.findOne({
//           name: new RegExp("^" + row.employeeName.trim() + "$", "i"),
//           state: new RegExp("^" + row.state.trim() + "$", "i"),
//         });

//         console.log("EMP: ", empData);
//         if (!empData) {
//           failedRows.push({ ...row, reason: "Employee not found" });
//           continue;
//         }

//         // --- Mandatory numbers check ---
//         if (!row.pumpNumber || !row.controllerNumber || !row.rmuNumber) {
//           failedRows.push({
//             ...row,
//             reason: "Missing pump/controller/rmu number",
//           });
//           continue;
//         }

//         const existingActivity = await FarmerItemsActivity.findOne({
//           farmerSaralId: row.farmerSaralId,
//           state: row.state,
//         });
//         console.log("Exist Farmer Activity: ", existingActivity);
//         if (existingActivity) {
//           failedRows.push({
//             ...row,
//             reason: `FarmerSaralId ${row.farmerSaralId} already exists in FarmerItemsActivity`,
//           });
//           continue;
//         }

//         // --- Collect serial numbers (panels flexible) ---
//         const panelNumbers = ["panel1", "panel2", "panel3", "panel4", "panel5", "panel6", "panel7", "panel8", "panel9", "panel10", "panel11", "panel12", "panel13"]
//           .map((p) => row[p]?.toString().trim().toUpperCase())
//           .filter(Boolean);

//         const pumpNumber = row.pumpNumber.toString().trim().toUpperCase();
//         const controllerNumber = row.controllerNumber
//           .toString()
//           .trim()
//           .toUpperCase();
//         const rmuNumber = row.rmuNumber.toString().trim().toUpperCase();

//         const serialNumbers = [
//           ...panelNumbers,
//           pumpNumber,
//           controllerNumber,
//           rmuNumber,
//         ];
//         console.log("SerialNumbers: ", serialNumbers);
//         // --- Validate serial numbers ---
//         const existingSerials = await SerialNumber.find({
//           serialNumber: { $in: serialNumbers },
//           state: row.state,
//         })
//           .select("serialNumber")
//           .lean();

//         const existingSet = new Set(existingSerials.map((s) => s.serialNumber));
//         const missingSerials = serialNumbers.filter(
//           (sn) => !existingSet.has(sn)
//         );

//         if (missingSerials.length > 0) {
//           failedRows.push({
//             ...row,
//             reason: `Missing serial numbers: ${missingSerials.join(", ")}`,
//           });
//           continue;
//         }

//         // --- Check serialNumbers already used in FarmerItemsActivity ---
//         const serialsAlreadyUsed = await FarmerItemsActivity.findOne({
//           $or: [
//             { pumpNumber: { $in: serialNumbers } },
//             { controllerNumber: { $in: serialNumbers } },
//             { rmuNumber: { $in: serialNumbers } },
//             { panelNumbers: { $in: serialNumbers } },
//           ],
//           state: row.state,
//         });

//         if (serialsAlreadyUsed) {
//           failedRows.push({
//             ...row,
//             reason: `Some serial numbers already used in FarmerItemsActivity: ${serialsAlreadyUsed.farmerSaralId}`,
//           });
//           continue;
//         }

//         // --- Build items list ---
//         const systemItems = await SystemItemMap.find({
//           systemId: system._id,
//         }).populate("systemItemId");
//         let itemsList = [];

//         for (let si of systemItems) {
//           const isPump = si.systemItemId?.itemName
//             .toLowerCase()
//             .includes("pump");
//             console.log("isPump: ", isPump);

//           if (isPump) {
//             // Only include correct pump variant
//             if (si.systemItemId?.itemName === row.pumpHead) {
//               console.log("Pump Data: ", si.systemItemId?.itemName);
//               itemsList.push({
//                 systemItemId: si.systemItemId._id,
//                 quantity: si.quantity,
//               });

//               // Fetch sub-items for this pump
//               const components = await ItemComponentMap.find({
//                 systemId: system._id,
//                 systemItemId: si.systemItemId._id,
//               }).populate("systemItemId");
//               console.log(components);
//               for (let comp of components) {
//                 itemsList.push({
//                   systemItemId: comp.subItemId,
//                   quantity: comp.quantity,
//                 });
//               }
//             }
//           } else {
//             itemsList.push({
//               systemItemId: si.systemItemId._id,
//               quantity: si.quantity,
//             });
//           }
//         }
//         console.log("systemId: ", system._id);
//         console.log("itemsList: ", itemsList);
//         // --- Prepare documents ---
//         farmerActivityDocs.push({
//           referenceType: "ServicePerson",
//           warehouseId: new mongoose.Types.ObjectId("67beef9e2fffc2145da032f3"),
//           farmerSaralId: row.farmerSaralId,
//           empId: empData._id,
//           systemId: system._id,
//           itemsList,
//           extraItemsList: [],
//           panelNumbers,
//           extraPanelNumbers: [],
//           pumpNumber,
//           motorNumber: "",
//           controllerNumber,
//           rmuNumber,
//           state: row.state,
//           accepted: false,
//           installationDone: false,
//           createdBy: new mongoose.Types.ObjectId("679b10c19cffe98b71683bc5"),
//           sendingDate: new Date(),
//           createdAt: new Date(),
//         });

//         employeeAssignedDocs.push({
//           referenceType: "ServicePerson",
//           warehouseId: new mongoose.Types.ObjectId("67beef9e2fffc2145da032f3"),
//           empId: empData._id,
//           farmerSaralId: row.farmerSaralId,
//           systemId: system._id,
//           itemsList,
//           extraItemsList: [],
//           createdBy: new mongoose.Types.ObjectId("679b10c19cffe98b71683bc5"),
//           createdAt: new Date(),
//         });

//         // --- Collect serials for update ---
//         serialNumbers.forEach((sn) =>
//           serialNumbersToUpdate.push({ serialNumber: sn, state: row.state })
//         );
//       } catch (innerErr) {
//         failedRows.push({
//           ...row,
//           reason: `Unexpected error: ${innerErr.message}`,
//         });
//       }
//     }
//     console.log("Farmer Activity Length: ", farmerActivityDocs.length);
//     console.log("Installation Assign Emp: ", employeeAssignedDocs.length);
//     console.log("New Farmer Activittes: ", farmerActivityDocs);
//     console.log("New Assigned Emp: ", employeeAssignedDocs);
//     // --- Insert valid rows ---
//     if (farmerActivityDocs.length > 0) {
//       await FarmerItemsActivity.insertMany(farmerActivityDocs);
//     }
//     if (employeeAssignedDocs.length > 0) {
//       await InstallationAssignEmp.insertMany(employeeAssignedDocs);
//     }

//     // --- Mark serial numbers as used ---
//     if (serialNumbersToUpdate.length > 0) {
//       const bulkOps = serialNumbersToUpdate.map((sn) => ({
//         updateOne: {
//           filter: { serialNumber: sn.serialNumber, state: sn.state },
//           update: { $set: { isUsed: true } },
//           upsert: false,
//         },
//       }));
//       await SerialNumber.bulkWrite(bulkOps);
//     }

//     // --- If any rows failed, return an Excel ---
//     if (failedRows.length > 0) {
//       const ws = XLSX.utils.json_to_sheet(failedRows);
//       const wb = XLSX.utils.book_new();
//       XLSX.utils.book_append_sheet(wb, ws, "FailedRows");
//       const excelBuffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

//       res.setHeader(
//         "Content-Disposition",
//         "attachment; filename=Failed_Rows.xlsx"
//       );
//       res.setHeader(
//         "Content-Type",
//         "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
//       );
//       return res.send(excelBuffer);
//     }

//     return res.status(200).json({
//       sucess: true,
//       message: "Excel data imported successfully",
//       recordsProcessed: farmerActivityDocs.length,
//     });
//   } catch (err) {
//     console.error(err);
//     return res
//       .status(500)
//       .json({ status: false, message: "Server error", error: err.message });
//   }
// };

module.exports.importDispatchedSystemExcelData = async (req, res) => {
  try {
    if (!req.file || !req.file.buffer) {
      return res.status(400).json({ message: "Please upload an Excel file" });
    }

    // Parse Excel
    const workbook = XLSX.read(req.file.buffer, { type: "buffer" });
    const sheetName = workbook.SheetNames[0];
    const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);

    const farmerActivityDocs = [];
    const employeeAssignedDocs = [];
    const serialNumbersToUpdate = [];
    const failedRows = [];

    for (let row of rows) {
      try {
        // --- System check ---
        const system = await System.findOne({ systemName: row.systemName });
        if (!system) {
          failedRows.push({ ...row, reason: "System not found" });
          continue;
        }

        // --- Employee check ---
        const empData = await ServicePerson.findOne({
          name: new RegExp("^" + row.employeeName.trim() + "$", "i"),
          state: new RegExp("^" + row.state.trim() + "$", "i"),
        });
        if (!empData) {
          failedRows.push({ ...row, reason: "Employee not found" });
          continue;
        }

        // --- Mandatory numbers check ---
        if (!row.pumpNumber || !row.controllerNumber || !row.rmuNumber) {
          failedRows.push({
            ...row,
            reason: "Missing pump/controller/rmu number",
          });
          continue;
        }

        // --- Collect serial numbers (panels flexible up to 13) ---
        const panelNumbers = Array.from(
          { length: 13 },
          (_, i) => "panel" + (i + 1)
        )
          .map((p) => row[p]?.toString().trim().toUpperCase())
          .filter(Boolean);

        const pumpNumber = row.pumpNumber?.toString().trim().toUpperCase();
        const controllerNumber = row.controllerNumber
          ?.toString()
          .trim()
          .toUpperCase();
        const rmuNumber = row.rmuNumber?.toString().trim().toUpperCase();

        const serialNumbers = [
          ...panelNumbers,
          pumpNumber,
          controllerNumber,
          rmuNumber,
        ].filter(Boolean);

        // --- Insert missing serials into SerialNumber ---
        for (let sn of serialNumbers) {
          const found = await SerialNumber.findOne({
            serialNumber: sn,
            state: row.state,
          });
          if (!found) {
            let productType = "panel";
            if (sn === pumpNumber) productType = "pump";
            if (sn === controllerNumber) productType = "controller";
            if (sn === rmuNumber) productType = "rmu";

            await SerialNumber.create({
              serialNumber: sn,
              state: row.state,
              productType,
              isUsed: false,
            });
          }
        }

        // --- Build items list ---
        const systemItems = await SystemItemMap.find({
          systemId: system._id,
        }).populate("systemItemId");
        let itemsList = [];

        for (let si of systemItems) {
          const isPump = si.systemItemId?.itemName
            .toLowerCase()
            .includes("pump");

          if (isPump) {
            // Only include correct pump variant
            if (si.systemItemId?.itemName === row.pumpHead) {
              itemsList.push({
                systemItemId: si.systemItemId._id,
                quantity: si.quantity,
              });

              // Fetch sub-items for this pump
              const components = await ItemComponentMap.find({
                systemId: system._id,
                systemItemId: si.systemItemId._id,
              }).populate("systemItemId");

              for (let comp of components) {
                itemsList.push({
                  systemItemId: comp.subItemId,
                  quantity: comp.quantity,
                });
              }
            }
          } else {
            itemsList.push({
              systemItemId: si.systemItemId._id,
              quantity: si.quantity,
            });
          }
        }

        // --- Check if FarmerActivity already exists ---
        let existingActivity = await FarmerItemsActivity.findOne({
          farmerSaralId: new RegExp(`${row.farmerSaralId}`, "i"),
          state: row.state,
        });

        if (existingActivity) {
          // Update existing FarmerActivity with new serials
          await FarmerItemsActivity.updateOne(
            { _id: existingActivity._id },
            {
              $set: {
                panelNumbers,
                pumpNumber,
                controllerNumber,
                rmuNumber,
                updatedAt: new Date(),
              },
            }
          );
        } else {
          // --- Prepare new documents ---
          farmerActivityDocs.push({
            referenceType: "ServicePerson",
            warehouseId: new mongoose.Types.ObjectId(
              "67beef9e2fffc2145da032f3"
            ),
            farmerSaralId: row.farmerSaralId,
            empId: empData._id,
            systemId: system._id,
            itemsList,
            extraItemsList: [],
            panelNumbers,
            extraPanelNumbers: [],
            pumpNumber,
            motorNumber: "",
            controllerNumber,
            rmuNumber,
            state: row.state,
            accepted: false,
            installationDone: false,
            createdBy: new mongoose.Types.ObjectId("679b10c19cffe98b71683bc5"),
            sendingDate: new Date(),
            createdAt: new Date(),
          });

          employeeAssignedDocs.push({
            referenceType: "ServicePerson",
            warehouseId: new mongoose.Types.ObjectId(
              "67beef9e2fffc2145da032f3"
            ),
            empId: empData._id,
            farmerSaralId: row.farmerSaralId,
            systemId: system._id,
            itemsList,
            extraItemsList: [],
            createdBy: new mongoose.Types.ObjectId("679b10c19cffe98b71683bc5"),
            createdAt: new Date(),
          });
        }

        // --- Collect serials for update ---
        serialNumbers.forEach((sn) =>
          serialNumbersToUpdate.push({ serialNumber: sn, state: row.state })
        );
      } catch (innerErr) {
        failedRows.push({
          ...row,
          reason: `Unexpected error: ${innerErr.message}`,
        });
      }
    }

    // --- Insert valid new rows ---
    if (farmerActivityDocs.length > 0) {
      await FarmerItemsActivity.insertMany(farmerActivityDocs);
    }
    if (employeeAssignedDocs.length > 0) {
      await InstallationAssignEmp.insertMany(employeeAssignedDocs);
    }

    // --- Mark serial numbers as used ---
    if (serialNumbersToUpdate.length > 0) {
      const bulkOps = serialNumbersToUpdate.map((sn) => ({
        updateOne: {
          filter: { serialNumber: sn.serialNumber, state: sn.state },
          update: { $set: { isUsed: true } },
          upsert: false,
        },
      }));
      await SerialNumber.bulkWrite(bulkOps);
    }

    // --- If any rows failed, return an Excel ---
    if (failedRows.length > 0) {
      const ws = XLSX.utils.json_to_sheet(failedRows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "FailedRows");
      const excelBuffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

      res.setHeader(
        "Content-Disposition",
        "attachment; filename=Failed_Rows.xlsx"
      );
      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      );
      return res.send(excelBuffer);
    }

    return res.status(200).json({
      success: true,
      message: "Excel data imported successfully",
      recordsProcessed: farmerActivityDocs.length,
    });
  } catch (err) {
    console.error(err);
    return res
      .status(500)
      .json({ status: false, message: "Server error", error: err.message });
  }
};

module.exports.getInstallerData = async (req, res) => {
  try {
    const warehouseId = req.user?.warehouse;
    if (!warehouseId) {
      return res.status(400).json({
        success: false,
        message: "Warehouse Invalid User",
      });
    }

    const warehouseData = await Warehouse.findById(warehouseId);
    let state = null;
    if (warehouseData?.warehouseName === "Bhiwani") {
      state = "Haryana";
    } else if (warehouseData?.warehouseName === "Jalna Warehouse") {
      state = "Maharashtra";
    }

    const installerData = await ServicePerson.find({
      role: "installer",
      state,
      isActive: true,
    })
      .select("_id name")
      .lean();

    return res.status(200).json({
      success: true,
      message: "Data Fetched Successfully",
      data: installerData || [],
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message,
    });
  }
};
