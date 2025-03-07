const moment = require("moment-timezone");
const XLSX = require("xlsx");
const fs = require("fs");
const path = require("path");
const axios = require("axios");
const Item = require("../models/serviceInventoryModels/itemSchema");
const PickupItem = require("../models/serviceInventoryModels/pickupItemSchema");
const OutgoingItemDetails = require("../models/serviceInventoryModels/outgoingItemsTotal");
const IncomingItemDetails = require("../models/serviceInventoryModels/incomingItemsTotal");
const ServicePerson = require("../models/serviceInventoryModels/servicePersonSchema");
const Warehouse = require("../models/serviceInventoryModels/warehouseSchema");
const WarehouseItems = require("../models/serviceInventoryModels/warehouseItemsSchema");

//***************************** Admin Access **************************//
module.exports.allOrderDetails = async (req, res) => {
  try {
    const page = parseInt(req.query.page);
    const limit = parseInt(req.query.limit);
    const skip = (page - 1) * limit;

    const pickupItems = await PickupItem.find()
      .populate("servicePerson", "_id name contact ")
      .skip(skip)
      .limit(limit)
      .sort({ pickupDate: -1 })
      .lean();

    const totalDocuments = await PickupItem.countDocuments();
    const totalPages = Math.ceil(totalDocuments / limit);

    // pickupItems.forEach(item => {
    //   if (item.pickupDate) {
    //     item.pickupDate = moment(item.pickupDate).tz("Asia/Kolkata").format("YYYY-MM-DD HH:mm:ss");
    //   }
    //   if (item.arrivedDate) {
    //     item.arrivedDate = moment(item.arrivedDate).tz("Asia/Kolkata").format("YYYY-MM-DD HH:mm:ss");
    //   }
    // });

    res.status(200).json({
      success: true,
      message: "Data Fetched Successfully",
      page,
      totalPages,
      limit,
      totalDocuments,
      pickupItems,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message,
    });
  }
};

module.exports.servicePersonIncomingItemsData = async (req, res) => {
  try {
    const incomingItemsData = await IncomingItemDetails.find().populate("servicePerson", "_id name contact");
    return res.status(200).json({
      success: true,
      message: "Data Fetched Successfully",
      data: incomingItemsData || []
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message
    });
  }
};

// module.exports.servicePersonIncomingItemsData2 = async (req, res) => {
//   try {
//     const incomingItemsData = await IncomingItemDetails.aggregate([
//       {
//         $lookup: {
//           from: "ServicePerson", // Replace with the actual collection name for `ServicePerson`
//           localField: "servicePerson",
//           foreignField: "_id",
//           as: "servicePersonDetails",
//         },
//       },
//       {
//         $unwind: "$servicePersonDetails",
//       },
//       {
//         $project: {
//           _id: 1,
//           servicePerson: {
//             _id: "$servicePersonDetails._id",
//             name: "$servicePersonDetails.name",
//             contact: "$servicePersonDetails.contact",
//           },
//           items: {
//             $filter: {
//               input: "$items",
//               as: "item",
//               cond: { $ne: ["$$item.quantity", 0] },
//             },
//           },
//         },
//       },
//       {
//         $match: {
//           "items.0": { $exists: true }, // Only include documents where there are non-zero items
//         },
//       },
//     ]);

//     return res.status(200).json({
//       success: true,
//       message: "Data Fetched Successfully",
//       data: incomingItemsData || [],
//     });
//   } catch (error) {
//     return res.status(500).json({
//       success: false,
//       message: "Internal Server Error",
//       error: error.message,
//     });
//   }
// };

module.exports.servicePersonOutgoingItemsData = async (req, res) => {
  try {
    const outgoingItemsData = await OutgoingItemDetails.find().populate("servicePerson", "_id name contact");
    return res.status(200).json({
      success: true,
      message: "Data Fetched Successfully",
      data: outgoingItemsData || []
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message
    });
  }
};

//*************************** Warehouse Access ****************************//
//Warehouse person sending back the items back to the farmer 
//Added saralId and complaintId into the model for better tracking of the complaints
module.exports.outgoingItemsData = async (req, res) => {
  try {
    const {
      servicePerson,
      farmerName,
      farmerVillage,
      farmerContact,
      farmerComplaintId,
      farmerSaralId,
      items,
      warehouse,
      serialNumber,
      remark,
      status,
      incoming,
      approvedBy,
      pickupDate,
    } = req.body;
    console.log(req.body);
    let contact = Number(farmerContact);
    //const warehousePersonName = req.user.name;
    if (
      !farmerContact ||
      !servicePerson ||
      // !farmerComplaintId || 
      // !farmerSaralId ||
      !items ||
      !warehouse ||
      !serialNumber ||
      !pickupDate
    ) {
      console.log("All fields are required")
      return res.status(400).json({
        success: false,
        message: "All fields are required",
      });
    }

    if (!Array.isArray(items) || items.length === 0) {
      console.log("Items must be a non-empty array")
      return res.status(400).json({
        success: false,
        message: "Items must be a non-empty array",
      });
    }

    const existingPickupData = await PickupItem.findOne({
      farmerComplaintId,
      farmerSaralId,
      items: { $size: items.length, $all: items.map(item => ({ itemName: item.itemName, quantity: item.quantity }))},
      incoming: false
    });
    
    if (existingPickupData) {
      return res.status(400).json({
        success: false,
        message: "You have already submitted the form.",
      });
    }

    const outgoingItemsData = [];
    const servicePersonData = await ServicePerson.findOne({ _id: servicePerson });
    if (!servicePersonData) {
      return res.status(404).json({
        success: false,
        message: "Service Person Contact Not Found",
      });
    }

    const warehouseData = await Warehouse.findOne({ warehouseName: warehouse });
    if (!warehouseData) {
      return res.status(404).json({
        success: false,
        message: "Warehouse Doesn't Exist",
      });
    }
    const warehouseId = warehouseData._id;

    const warehouseItemRecord = await WarehouseItems.findOne({ warehouse: warehouseId });
    if (!warehouseItemRecord) {
      return res.status(404).json({
        success: false,
        message: "Warehouse Items Data Not Found",
      });
    }

    for (let item of items) {
      const itemName = item.itemName;
      const quantityToAdjust = item.quantity;

      // Find the corresponding item in the Item schema
      // const itemRecord = await Item.findOne({ itemName });
      // if (!itemRecord) {
      //   return res.status(404).json({
      //     success: false,
      //     message: `Item ${itemName} not found in inventory`,
      //   });
      // }

      // Find the item in the warehouse's items array
      const warehouseItem = warehouseItemRecord.items.find(wItem => wItem.itemName === itemName);
      if (!warehouseItem) {
        return res.status(404).json({
          success: false,
          message: `Item ${itemName} not found in warehouse`,
        });
      }

      if (incoming === false) {
        // Check if there is enough stock
        if (warehouseItem.quantity < quantityToAdjust) {
          console.log(`Not enough stock for item ${itemName}`)
          return res.status(400).json({
            success: false,
            message: `Not enough stock for item ${itemName}`,
          });
        }

        // Decrease the stock in Item schema
        //itemRecord.stock -= quantityToAdjust;

        // Decrease the stock in WarehouseItems schema
        warehouseItem.quantity = parseInt(warehouseItem.quantity) - parseInt(quantityToAdjust);
      }
      // Save the updated item record
      outgoingItemsData.push({ itemName, quantity: quantityToAdjust });
      //await itemRecord.save();
    }

    // Save the updated WarehouseItems record
    await warehouseItemRecord.save();

    // if (incoming === false) {
    //   // Update OutgoingItemDetails for outgoing items
    //   let existingOutgoingRecord = await OutgoingItemDetails.findOne({
    //     servicePerson: id,
    //   });

    //   if (existingOutgoingRecord) {
    //     // Update existing quantities or add new items
    //     outgoingItemsData.forEach((outgoingItem) => {
    //       const existingItemIndex = existingOutgoingRecord.items.findIndex(
    //         (item) => item.itemName === outgoingItem.itemName
    //       );

    //       if (existingItemIndex > -1) {
    //         existingOutgoingRecord.items[existingItemIndex].quantity +=
    //           outgoingItem.quantity;
    //       } else {
    //         existingOutgoingRecord.items.push(outgoingItem);
    //       }
    //     });

    //     await existingOutgoingRecord.save();
    //   } else {
    //     // No existing record, so create a new one
    //     existingOutgoingRecord = new OutgoingItemDetails({
    //       servicePerson: id,
    //       items: outgoingItemsData,
    //     });
    //     await existingOutgoingRecord.save();
    //   }
    // }

    let refType;
    if (req.user.role === "serviceperson") {
      refType = "ServicePerson";
    } else if (req.user.role === "warehouseAdmin") {
      refType = "WarehousePerson"
    } else if (req.user.role === "surveyperson") {
      refType = "SurveyPerson"
    }

    const returnItems = new PickupItem({
      servicePerson,
      servicePersonName: servicePersonData.name,
      servicePerContact: Number(servicePersonData.contact),
      farmerName: farmerName ||  "",
      farmerContact: contact,
      farmerVillage: farmerVillage || "",
      farmerComplaintId: farmerComplaintId || null,
      farmerSaralId: farmerSaralId || "",
      items,
      warehouse,
      serialNumber,
      remark: remark || "",
      status,
      itemResend: true,
      incoming,
      approvedBy,
      pickupDate,
      referenceType: refType,
      itemSendBy: req.user._id
    });
    await returnItems.save();

    if (farmerComplaintId && farmerSaralId) {
      const incomingItemsDataFromFarmer = await PickupItem.findOne({ farmerComplaintId });
      if (!incomingItemsDataFromFarmer) {
        return res.status(404).json({
          success: false,
          message: "No incoming items found for the farmer"
        });
      }
      incomingItemsDataFromFarmer.itemResend = true;
      await incomingItemsDataFromFarmer.save();
    }

    res.status(200).json({
      success: true,
      message: "Data Logged Successfully",
      returnItems,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message,
    });
  }
};

module.exports.warehouseOrderDetails = async (req, res) => {
  try {
    const page = parseInt(req.query.page);
    const limit = parseInt(req.query.limit);
    const skip = (page - 1) * limit;

    const warehouseId = req.user.warehouse;
    const warehouseData = await Warehouse.findById({ _id: warehouseId });
    if (!warehouseData) {
      return res.status(404).json({
        success: false,
        message: "WarehouseData Not Found"
      });
    }

    const pickupItems = await PickupItem.find({ warehouse: warehouseData.warehouseName })
      .populate("servicePerson", "_id name contact")
      .skip(skip)
      .limit(limit)
      .sort({ pickupDate: -1 });

    const totalDocuments = await PickupItem.countDocuments();
    const totalPages = Math.ceil(totalDocuments / limit);

    res.status(200).json({
      success: true,
      message: "Data Fetched Successfully",
      page,
      totalPages,
      limit,
      totalDocuments,
      pickupItems,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message,
    });
  }
};

module.exports.updateOrderStatus = async (req, res) => {
  try {
    const { status, pickupItemId, incoming, arrivedDate } = req.body;
    const approvedBy = req.user.name;

    if (status === true && incoming === true) {
      const pickupItem = await PickupItem.findById(pickupItemId);
      if (!pickupItem) {
        return res.status(404).json({
          success: false,
          message: "PickupItem not found",
        });
      }

      const warehouseData = await Warehouse.findOne({ warehouseName: pickupItem.warehouse });
      if (!warehouseData) {
        return res.status(404).json({
          success: false,
          message: "Warehouse Doesn't Exist",
        });
      }

      if (String(warehouseData._id) !== String(req.user.warehouse)) {
        return res.status(403).json({
          success: false,
          message: "User does not have permission to access this warehouse",
        });
      }
      const warehouseId = warehouseData._id;

      const warehouseItemRecord = await WarehouseItems.findOne({ warehouse: warehouseId });
      if (!warehouseItemRecord) {
        return res.status(404).json({
          success: false,
          message: "Warehouse Items Data Not Found",
        });
      }
      pickupItem.status = true;
      pickupItem.approvedBy = approvedBy;
      pickupItem.arrivedDate = new Date();
      const items = pickupItem.items;

      for (let item of items) {
        const itemName = item.itemName;
        const quantityToAdjust = item.quantity;

        // const itemRecord = await Item.findOne({ itemName });
        const itemRecord = await Item.findOne({ itemName: { $regex: new RegExp(`^${itemName}$`, "i") } });

        if (!itemRecord) {
          return res.status(404).json({
            success: false,
            message: `Item ${itemName} not found in inventory`,
          });
        }

        const warehouseItem = warehouseItemRecord.items.find(wItem => new RegExp(`^${itemName}$`, "i").test(wItem.itemName));
        if (!warehouseItem) {
          return res.status(404).json({
            success: false,
            message: `Item ${itemName} not found in warehouse`,
          });
        }

        if (incoming === true) {
          itemRecord.defective = parseInt(itemRecord.defective) + parseInt(quantityToAdjust); //Adding incoming items from SP to Items Defect Field
          warehouseItem.defective = parseInt(warehouseItem.defective) + parseInt(quantityToAdjust); //Addding incoming items from SP to WarehouseItems Defect Field
        }
        await itemRecord.save();

      }
      await warehouseItemRecord.save();

      const itemsToUpdate = pickupItem.items;
      const servicePersonId = pickupItem.servicePerson;

      const orderDetails = await IncomingItemDetails.findOne({
        servicePerson: servicePersonId,
      });
      if (!orderDetails) {
        return res.status(400).json({
          success: false,
          message: "IncomingItemDetails not found for the service person",
        });
      }

      for (let item of itemsToUpdate) {
        const matchingItem = orderDetails.items.find(
          (i) => i.itemName.toLowerCase().trim() === item.itemName.toLowerCase().trim()
        );

        if (!matchingItem) {
          return res.status(404).json({
            success: false,
            message: `Item ${item.itemName} not found in IncomingItemDetails`,
          });
        }

        if (matchingItem.quantity < item.quantity) {
          return res.status(400).json({
            success: false,
            message: `Not enough quantity for ${item.itemName}`,
          });
        }

        if (matchingItem.quantity === item.quantity) {
          matchingItem.quantity = 0;
        } else {
          matchingItem.quantity -= item.quantity;
        }
      }

      await orderDetails.save();

      await pickupItem.save();

      return res.status(200).json({
        success: true,
        message: "Status updated and quantities adjusted successfully",
        pickupItem,
        incomingDetails: orderDetails,
      });
    } else if (status === true && incoming === false) {
      let outgoingItemsData = [];
      const pickupItem = await PickupItem.findById(pickupItemId);
      if (!pickupItem) {
        return res.status(404).json({
          success: false,
          message: "PickupItem not found",
        });
      }
      // const warehouseData = await Warehouse.findOne({ warehouseName: pickupItem.warehouse });
      // if (!warehouseData) {
      //   return res.status(404).json({
      //     success: false,
      //     message: "Warehouse Doesn't Exist",
      //   });
      // }
      // if (String(warehouseData._id) !== String(req.user.warehouse)) {
      //   return res.status(403).json({
      //     success: false,
      //     message: "User does not have permission to access this warehouse",
      //   });
      // }

      pickupItem.status = true;
      pickupItem.approvedBy = approvedBy;
      pickupItem.arrivedDate = arrivedDate;

      const itemsToUpdate = pickupItem.items;
      const servicePersonId = pickupItem.servicePerson;

      // const outgoingOrderDetails = await OutgoingItemDetails.findOne({
      //   servicePerson: servicePersonId,
      // });

      // if (!outgoingOrderDetails) {
      //   return res.status(400).json({
      //     success: false,
      //     message: "OutgoingItemDetails not found for the service person",
      //   });
      // }

      for (let item of itemsToUpdate) {
        let itemName = item.itemName;
        let quantity = item.quantity;
        outgoingItemsData.push({ itemName, quantity });
        // const matchingItem = outgoingOrderDetails.items.find(
        //   (i) => i.itemName === item.itemName
        // );

        // if (!matchingItem) {
        //   return res.status(404).json({
        //     success: false,
        //     message: `Item ${item.itemName} not found in OutgoingItemDetails`,
        //   });
        // }

        // if (matchingItem.quantity < item.quantity) {
        //   return res.status(400).json({
        //     success: false,
        //     message: `Not enough quantity for ${item.itemName}`,
        //   });
        // }

        // if (matchingItem.quantity === item.quantity) {
        //   matchingItem.quantity = 0;
        // } else {
        //   matchingItem.quantity += item.quantity;
        // }
      }

      // await outgoingOrderDetails.save();
      let existingOutgoingRecord = await OutgoingItemDetails.findOne({
        servicePerson: servicePersonId,
      });

      if (existingOutgoingRecord) {
        // Update existing quantities or add new items
        outgoingItemsData.forEach((outgoingItem) => {
          const existingItemIndex = existingOutgoingRecord.items.findIndex(
            (item) => new RegExp(`^${outgoingItem.itemName}$`, "i").test(item.itemName)
          );

          if (existingItemIndex > -1) {
            existingOutgoingRecord.items[existingItemIndex].quantity +=
              outgoingItem.quantity;
          } else {
            existingOutgoingRecord.items.push(outgoingItem);
          }
        });

        await existingOutgoingRecord.save();
      } else {
        // No existing record, so create a new one
        existingOutgoingRecord = new OutgoingItemDetails({
          servicePerson: servicePersonId,
          items: outgoingItemsData,
        });
        await existingOutgoingRecord.save();
      }

      await pickupItem.save();

      return res.status(200).json({
        success: true,
        message: "Status updated and quantities adjusted successfully",
        pickupItem,
        outgoingDetails: existingOutgoingRecord,
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

//******************* ServicePerson Access ****************************//
module.exports.servicePersonDashboard = async (req, res) => {
  try {
    const servicePersonId = req.user._id

    const incomingItemData = await IncomingItemDetails.find({ servicePerson: servicePersonId }).select(
      "-servicePerson"
    );
    const outgoingItemData = await OutgoingItemDetails.find({ servicePerson: servicePersonId }).select(
      "-servicePerson"
    );

    // Create a unified response array
    const mergedData = [];

    // Add incoming items to mergedData
    incomingItemData.forEach((item) => {
      mergedData.push({
        type: "incoming",
        items: item.items,
      });
    });

    // Add outgoing items to mergedData
    outgoingItemData.forEach((item) => {
      mergedData.push({
        type: "outgoing",
        items: item.items,
      });
    });
    res.status(200).json({
      success: true,
      message: "Data Merged Successfully",
      mergedData: mergedData,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message,
    });
  }
};

module.exports.showWarehouseItems = async (req, res) => {
  try {
    const { option } = req.query;
    if (!option) {
      return res.status(400).json({
        success: false,
        message: "Option is required"
      });
    }

    const warehouseData = await Warehouse.findOne({ warehouseName: option });
    if (!warehouseData) {
      return res.status(404).json({
        success: false,
        message: "Warehouse Not Found"
      });
    }


    const warehouseItemsData = await WarehouseItems.findOne({ warehouse: warehouseData._id });
    // if(!warehouseItemsData){
    //     return res.status(404).json({
    //         success: false,
    //         message: "WarehouseItems Data Not Found"
    //     });
    // }

    let itemsData = [];
    if (warehouseItemsData) {
      for (let item of warehouseItemsData.items) {
        itemsData.push(item.itemName);
      }
    }

    return res.status(200).json({
      success: true,
      message: "Data Fetched Successfully",
      itemsData
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message
    });
  }
}

//Field service person is bringing the items from farmer
module.exports.incomingItemsData = async (req, res) => {
  try {
    const id = req.user._id;
    const {
      farmerName,
      farmerVillage,
      farmerContact,
      farmerComplaintId,
      farmerSaralId,
      items,
      warehouse,
      serialNumber,
      remark,
      withoutRMU,
      rmuRemark,
      status,
      incoming,
      approvedBy,
      pickupDate
    } = req.body;

    if (
      !farmerContact ||
      !farmerComplaintId ||
      !farmerSaralId ||
      !items ||
      !warehouse ||
      !serialNumber ||
      !pickupDate
    ) {
      return res.status(400).json({
        success: false,
        message: "All fields are required",
      });
    }
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Items must be a non-empty array",
      });
    }

    const existingPickupData = await PickupItem.findOne({
      farmerComplaintId,
      farmerSaralId,
      items: { $size: items.length, $all: items.map(item => ({ itemName: item.itemName, quantity: item.quantity }))},
      incoming: true
    });
    
    if (existingPickupData) {
      return res.status(400).json({
        success: false,
        message: "You have already submitted the form.",
      });
    }
    
    const outgoingItemsData = [];

    const warehouseData = await Warehouse.findOne({ warehouseName: warehouse });
    if (!warehouseData) {
      return res.status(404).json({
        success: false,
        message: "Warehouse Doesn't Exist",
      });
    }
    const warehouseId = warehouseData._id;

    const warehouseItemRecord = await WarehouseItems.findOne({ warehouse: warehouseId });
    if (!warehouseItemRecord) {
      return res.status(404).json({
        success: false,
        message: "Warehouse Items Data Not Found",
      });
    }


    for (let item of items) {
      const itemName = item.itemName;
      const quantityToAdjust = item.quantity;

      // const warehouseItem = warehouseItemRecord.items.find(i => i.itemName === itemName);
      // warehouseItem.defective = parseInt(warehouseItem.defective) + parseInt(quantityToAdjust);

      outgoingItemsData.push({ itemName, quantity: quantityToAdjust });
      // // Find the corresponding item in the Item schema
      // const itemRecord = await Item.findOne({ itemName });
      // console.log("itemrecord", itemRecord);
      // if (!itemRecord) {
      //   return res.status(404).json({
      //     success: false,
      //     message: `Item ${itemName} not found in inventory`,
      //   });
      // }

      // // Find the item in the warehouse's items array
      // const warehouseItem = warehouseItemRecord.items.find(wItem => wItem.itemName === itemName);
      // console.log("warehouseItem", warehouseItem);
      // if (!warehouseItem) {
      //   return res.status(404).json({
      //     success: false,
      //     message: `Item ${itemName} not found in warehouse`,
      //   });
      // }

      // if (incoming === false) {
      //   // Check if there is enough stock
      //   if (warehouseItem.quantity < quantityToAdjust || itemRecord.stock < quantityToAdjust) {
      //     return res.status(400).json({
      //       success: false,
      //       message: `Not enough stock for item ${itemName}`,
      //     });
      //   }

      //   // Decrease the stock in Item schema
      //   itemRecord.stock -= quantityToAdjust;

      //   // Decrease the stock in WarehouseItems schema
      //   warehouseItem.quantity -= quantityToAdjust;

      //   console.log("outgoingItemsData:", outgoingItemsData);
      // }
      // // Save the updated item record

      //console.log("ItemsSchemaData:", await itemRecord.save());
    }

    //await warehouseItemRecord.save();

    // if (incoming === false) {
    //   // Update OutgoingItemDetails for outgoing items
    //   let existingOutgoingRecord = await OutgoingItemDetails.findOne({
    //     servicePerson: id,
    //   });

    //   if (existingOutgoingRecord) {
    //     // Update existing quantities or add new items
    //     outgoingItemsData.forEach((outgoingItem) => {
    //       const existingItemIndex = existingOutgoingRecord.items.findIndex(
    //         (item) => item.itemName === outgoingItem.itemName
    //       );

    //       if (existingItemIndex > -1) {
    //         existingOutgoingRecord.items[existingItemIndex].quantity +=
    //           outgoingItem.quantity;
    //       } else {
    //         existingOutgoingRecord.items.push(outgoingItem);
    //       }
    //     });

    //     await existingOutgoingRecord.save();
    //   } else {
    //     // No existing record, so create a new one
    //     existingOutgoingRecord = new OutgoingItemDetails({
    //       servicePerson: id,
    //       items: outgoingItemsData,
    //     });
    //     console.log("Outgoing:", existingOutgoingRecord);
    //     await existingOutgoingRecord.save();
    //   }
    // } else {
    if (incoming === true) {
      // Update or create IncomingItemDetails for incoming items
      let existingIncomingRecord = await IncomingItemDetails.findOne({
        servicePerson: id,
      });

      items.forEach((incomingItem) => {
        const existingItemIndex = existingIncomingRecord?.items.findIndex(
          (item) => item.itemName === incomingItem.itemName
        );

        if (existingIncomingRecord && existingItemIndex > -1) {
          existingIncomingRecord.items[existingItemIndex].quantity += incomingItem.quantity;
        } else if (existingIncomingRecord) {
          existingIncomingRecord.items.push(incomingItem);
        }
      });

      if (existingIncomingRecord) {
        await existingIncomingRecord.save();
      } else {
        // No existing record, so create a new one
        existingIncomingRecord = new IncomingItemDetails({
          servicePerson: id,
          items,
        });
        await existingIncomingRecord.save();
      }
    }

    let refType;
    if (req.user.role === "serviceperson") {
      refType = "ServicePerson";
    } else if (req.user.role === "warehouseAdmin") {
      refType = "WarehousePerson"
    } else if (req.user.role === "surveyperson") {
      refType = "SurveyPerson"
    }

    const returnItems = new PickupItem({
      servicePerson: id,
      servicePersonName: req.user.name,
      servicePerContact: Number(req.user.contact),
      farmerName: farmerName || "",
      farmerVillage: farmerVillage || "",
      farmerContact: Number(farmerContact),
      farmerComplaintId,
      farmerSaralId,
      items,
      warehouse,
      serialNumber,
      remark: remark || "",
      withoutRMU,
      rmuRemark,
      status,
      itemResend: false,
      incoming,
      approvedBy,
      pickupDate,
      referenceType: refType,
      itemSendBy: req.user._id
    });
    await returnItems.save();

    res.status(200).json({
      success: true,
      message: "Data Logged Successfully",
      returnItems,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message,
    });
  }
};

module.exports.pickupItemOfServicePerson = async (req, res) => {
  try {
    const id = req.user._id;
    if (!id) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const page = parseInt(req.query.page);
    const limit = parseInt(req.query.limit);
    const skip = (page - 1) * limit;

    const pickupItems = await PickupItem.find({ servicePerson: id })
      .populate("servicePerson", "-__v -password -refreshToken -role -createdAt -email")
      .sort({ pickupDate: -1 })
      .skip(skip)
      .limit(limit)
      .select("-__v");

    if (!pickupItems) {
      return res.status(404).json({
        success: false,
        message: "Data Not Found",
      });
    }

    const pickupItemsDetail = pickupItems.map((pickupItem) => {
      return {
        ...pickupItem.toObject(),
        pickupDate: moment(pickupItem.pickupDate)
          .tz("Asia/Kolkata")
          .format("YYYY-MM-DD HH:mm:ss"),
      };
    });

    const totalDocuments = await PickupItem.countDocuments({ servicePerson: id });
    const totalPages = Math.ceil(totalDocuments / limit);

    res.status(200).json({
      success: true,
      message: "Data Fetched Successfully",
      page,
      totalPages,
      limit,
      totalDocuments,
      pickupItemsDetail,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message,
    });
  }
};

// module.exports.exportIncomingPickupItemsToExcel = async (req, res) => {
//     try {
//         // Fetch Data Where incoming = true and populate the servicePerson field
//         const pickupItems = await PickupItem.find({ incoming: true , status: null})
//             .populate("servicePerson", "name contact") // Populate servicePerson
//             .lean();

//         if (!pickupItems.length) {
//             return res.status(404).json({ success: false, message: "No data found with incoming: true" });
//         }

//         // Convert JSON to a format suitable for Excel
//         const formattedData = pickupItems.map(item => ({
//             ServicePerson_Name: item.servicePerson ? item.servicePerson.name : "N/A",
//             //ServicePerson_Contact: item.servicePerson ? item.servicePerson.contact : "N/A",
//             FarmerName: item.farmerName ? item.farmerName : " ",
//             FarmerContact: item.farmerContact ? item.farmerContact : " ",
//             //Village: item.farmerVillage,
//             To_Warehouse: item.warehouse,
//             // SerialNumber: item.serialNumber,
//             Status: "Not Received By Warehouse",
//             // PickupDate: item.pickupDate ? new Date(item.pickupDate).toLocaleDateString() : "",
//             // ArrivedDate: item.arrivedDate ? new Date(item.arrivedDate).toLocaleDateString() : "",
//             Items_Quantity: item.items.map(i => `${i.itemName} (${i.quantity})`).join(", ") // Format items list
//         }));

//         // Create a new workbook and worksheet
//         const wb = XLSX.utils.book_new();
//         const ws = XLSX.utils.json_to_sheet(formattedData);
//         XLSX.utils.book_append_sheet(wb, ws, "PickupItems");

//         // Set response headers
//         res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
//         res.setHeader("Content-Disposition", "attachment; filename=IncomingItems_Details.xlsx");

//         // Generate Excel file buffer and send response
//         const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
//         return res.send(buffer);

//     } catch (error) {
//         console.error("Error exporting data:", error);
//         return res.status(500).json({
//             success: false,
//             message: "Internal Server Error",
//             error: error.message,
//         });
//     }
// };

// module.exports.exportIncomingPickupItemsToExcel = async (req, res) => {
//   try {
//     // Fetch Data Where incoming = true and populate the servicePerson field
//     const pickupItems = await PickupItem.find({ incoming: true })
//       .populate("servicePerson", "name contact") // Populate servicePerson
//       .lean();

//     if (!pickupItems.length) {
//       return res.status(404).json({ success: false, message: "No data found with incoming: true" });
//     }

//     // Grouping data by servicePerson
//     const servicePersonMap = {};

//     pickupItems.forEach((item) => {
//       if (!item.servicePerson) return; // Skip items without servicePerson

//       const servicePersonId = item.servicePerson._id.toString();

//       if (!servicePersonMap[servicePersonId]) {
//         servicePersonMap[servicePersonId] = {
//           ServicePerson_Name: item.servicePerson.name,
//           ServicePerson_Contact: item.servicePerson.contact,
//           Total_Items: 0,
//           Items_List: new Set(), // Use a Set to avoid duplicate item names
//         };
//       }

//       // Sum up the total quantity
//       item.items.forEach((i) => {
//         servicePersonMap[servicePersonId].Total_Items += i.quantity;
//         servicePersonMap[servicePersonId].Items_List.add(i.itemName);
//       });
//     });

//     // Convert grouped data to an array for Excel formatting
//     const formattedData = Object.values(servicePersonMap).map((person) => ({
//       ServicePerson_Name: person.ServicePerson_Name,
//       ServicePerson_Contact: person.ServicePerson_Contact,
//       Total_Items: person.Total_Items,
//       Items_List: Array.from(person.Items_List).join(", "), // Convert Set to comma-separated string
//     }));

//     // Create a new workbook and worksheet
//     const wb = XLSX.utils.book_new();
//     const ws = XLSX.utils.json_to_sheet(formattedData);
//     XLSX.utils.book_append_sheet(wb, ws, "ServicePerson_Items");

//     // Define the uploads folder path
//     const uploadsDir = path.join(__dirname, "../uploads");

//     // Ensure the uploads directory exists
//     if (!fs.existsSync(uploadsDir)) {
//       fs.mkdirSync(uploadsDir, { recursive: true });
//     }

//     // Define file path inside uploads folder
//     const filePath = path.join(uploadsDir, "ServicePerson_Items.xlsx");

//     // Write the Excel file to the uploads folder
//     XLSX.writeFile(wb, filePath);

//     console.log("File saved at:", filePath);

//     return res.json({
//       success: true,
//       message: "Excel file saved successfully",
//       filePath: filePath,
//     });

//   } catch (error) {
//     console.error("Error exporting data:", error);
//     return res.status(500).json({
//       success: false,
//       message: "Internal Server Error",
//       error: error.message,
//     });
//   }
// };

module.exports.exportIncomingPickupItemsToExcel = async (req, res) => {
  try {
      // Fetch Data Where incoming = true and status = null
      const pickupItems = await PickupItem.find({ incoming: true, status: null })
          .populate("servicePerson", "name contact") // Populate servicePerson
          .lean();

      if (!pickupItems.length) {
          return res.status(404).json({ success: false, message: "No data found with incoming: true" });
      }

      // Function to fetch farmer details from API using saralId
      const fetchFarmerDetails = async (saralId) => {
          try {
              const apiResponse = await axios.get(`http://88.222.214.93:8001/inventory/showFarmerForApp?saralId=${saralId}`);
              console.log(apiResponse);
              return apiResponse.data.data; // Ensure API returns an object with `name` and `contact`
          } catch (error) {
              console.error(`Error fetching farmer details for Saral ID: ${saralId}`, error.message);
              return { name: "N/A", contact: "N/A" }; // Fallback values
          }
      };

      // Process data and fetch missing farmer details
      const formattedData = await Promise.all(
          pickupItems.map(async (item) => {
              let farmerName = item.farmerName || "N/A";
              let farmerContact = item.farmerContact || "N/A";

              // If farmer details are missing, fetch from API using saralId
              if (!item.farmerName || !item.farmerContact) {
                  if (item.farmerSaralId) {
                      console.log(item.farmerSaralId);
                      const farmerDetails = await fetchFarmerDetails(item.farmerSaralId);
                      farmerName = farmerDetails.farmerName;
                      console.log(farmerName);
                      farmerContact = farmerDetails.contact;
                      console.log(farmerContact);
                  }
              }

              return {
                  ServicePerson_Name: item.servicePerson ? item.servicePerson.name : "N/A",
                  FarmerName: farmerName,
                  FarmerContact: farmerContact,
                  To_Warehouse: item.warehouse,
                  Status: "Not Received By Warehouse",
                  Items_Quantity: item.items.map(i => `${i.itemName} (${i.quantity})`).join(", "), // Format items list
                  Transaction_Date: item.pickupDate ? item.pickupDate.toISOString().split('T')[0] : ""
              };
          })
      );

      // Create a new workbook and worksheet
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(formattedData);
      XLSX.utils.book_append_sheet(wb, ws, "PickupItems");

      // Set response headers
      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      res.setHeader("Content-Disposition", "attachment; filename=IncomingItems_Details.xlsx");

      // Generate Excel file buffer and send response
      const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
      return res.send(buffer);

  } catch (error) {
      console.error("Error exporting data:", error);
      return res.status(500).json({
          success: false,
          message: "Internal Server Error",
          error: error.message,
      });
  }
};

module.exports.exportIncomingTotalItemsToExcel = async (req, res) => {
  try {
    // Fetch all data and populate the servicePerson details
    const data = await IncomingItemDetails.find()
      .populate("servicePerson", "_id name contact") // Populate servicePerson details
      .lean();

    if (!data.length) {
      return res.status(404).json({ success: false, message: "No data found" });
    }

    // Define names to exclude
    const excludedNames = new Set(["Atul Singh", "Nitesh Kumar"]);

    // Aggregate total quantities and list of items for each servicePerson
    const aggregatedData = {};

    data.forEach((entry) => {
      const { servicePerson, items } = entry;

      if (!servicePerson) {
        console.warn(`Skipping entry with missing servicePerson:`, entry);
        return; // Skip this entry
      }

      // Skip excluded names
      if (excludedNames.has(servicePerson.name)) {
        return;
      }

      const servicePersonId = servicePerson._id.toString();

      if (!aggregatedData[servicePersonId]) {
        aggregatedData[servicePersonId] = {
          Name: servicePerson.name,
          Contact: servicePerson.contact,
          Total_Quantity: 0,
          Items_List: new Set(), // Using a Set to avoid duplicate item names
        };
      }

      // Sum up the total item quantity for each service person, excluding zero-quantity items
      items.forEach((item) => {
        if (item.quantity > 0) { // Exclude items with zero quantity
          aggregatedData[servicePersonId].Total_Quantity += item.quantity;
          aggregatedData[servicePersonId].Items_List.add(`${item.itemName} (${item.quantity})`);
        }
      });
    });

    // Convert aggregated data to an array for Excel
    const excelData = Object.values(aggregatedData).map((entry) => ({
      Name: entry.Name,
      Contact: entry.Contact,
      "Total Quantity": entry.Total_Quantity,
      "Items List": Array.from(entry.Items_List).join(", ") || "No Items", // Convert Set to string
    }));

    // Create a new Excel workbook and worksheet
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(excelData);
    XLSX.utils.book_append_sheet(workbook, worksheet, "Total Incoming Items");

    // Define the uploads folder path
    const uploadsDir = path.join(__dirname, "../uploads");

    // Ensure the uploads directory exists
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    // Define file path inside uploads folder
    const filePath = path.join(uploadsDir, "IncomingTotalItems.xlsx");

    // Write Excel file to uploads folder
    XLSX.writeFile(workbook, filePath);

    console.log("File saved at:", filePath);

    return res.json({
      success: true,
      message: "Excel file saved successfully",
      filePath: filePath,
    });

  } catch (error) {
    console.error("Error generating Excel:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message,
    });
  }
};

exports.uploadExcelAndUpdatePickupItems = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    // Read file buffer from memory
    const workbook = XLSX.read(req.file.buffer, { type: "buffer" });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];

    // Convert Excel data to JSON
    const data = XLSX.utils.sheet_to_json(sheet);

    if (!data.length) {
      return res.status(400).json({ error: "Excel file is empty" });
    }

    // Extract farmerContact numbers from Excel
    const farmerContacts = data.map(row => row.farmerContact);

    if (!farmerContacts.length) {
      return res.status(400).json({ error: "No farmer contacts found in the file" });
    }

    // Update only records where incoming is true
    const result = await PickupItem.updateMany(
      {
        farmerContact: { $in: farmerContacts }, // Match contacts from Excel
        incoming: true // Apply filter
      },
      {
        $set: {
          status: true,
          arrivedDate: new Date() // Directly setting the current date
        }
      }
    );

    res.status(200).json({
      message: "Pickup items updated successfully",
      updatedCount: result.modifiedCount
    });

  } catch (error) {
    console.error("Error processing Excel upload:", error);
    res.status(500).json({ error: "Failed to update pickup items" });
  }
};