const moment = require("moment-timezone");
const Item = require("../models/itemSchema");
const PickupItem = require("../models/pickupItemSchema");
const OutgoingItemDetails = require("../models/outgoingItemsTotal");
const IncomingItemDetails = require("../models/incomingItemsTotal");
const ServicePerson = require("../models/servicePersonSchema");
const Warehouse = require("../models/warehouseSchema");
const WarehouseItems = require("../models/warehouseItemsSchema");

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
module.exports.outgoingItemsData = async (req, res) => {
  try {
    const {
      servicePersonName,
      servicePerContact,
      farmerName,
      farmerContact,
      farmerVillage,
      items,
      warehouse,
      serialNumber,
      remark,
      status,
      incoming,
      approvedBy,
      pickupDate,
    } = req.body;

    let contact = Number(farmerContact);
    let servicePersonContact = Number(servicePerContact);

    if (
      !servicePersonName ||
      !servicePersonContact ||
      !farmerName ||
      !contact ||
      !farmerVillage ||
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

    const outgoingItemsData = [];
    const servicePersonData = await ServicePerson.findOne({ contact: servicePersonContact });
    if (!servicePersonData) {
      return res.status(404).json({
        success: false,
        message: "Service Person Contact Not Found",
      });
    }
    const id = servicePersonData._id;

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
      const itemRecord = await Item.findOne({ itemName });
      if (!itemRecord) {
        return res.status(404).json({
          success: false,
          message: `Item ${itemName} not found in inventory`,
        });
      }

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
        if (warehouseItem.quantity < quantityToAdjust || itemRecord.stock < quantityToAdjust) {
          return res.status(400).json({
            success: false,
            message: `Not enough stock for item ${itemName}`,
          });
        }

        // Decrease the stock in Item schema
        itemRecord.stock -= quantityToAdjust;

        // Decrease the stock in WarehouseItems schema
        warehouseItem.quantity -= quantityToAdjust;
      }
      // Save the updated item record
      outgoingItemsData.push({ itemName, quantity: quantityToAdjust });
      await itemRecord.save();
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

    const returnItems = new PickupItem({
      servicePerson: id,
      servicePersonName: servicePersonData.name,
      servicePerContact: servicePersonData.contact,
      farmerName,
      farmerContact: contact,
      farmerVillage,
      items,
      warehouse,
      serialNumber,
      remark: remark || "",
      status,
      incoming,
      approvedBy,
      pickupDate,
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
      pickupItem.arrivedDate = arrivedDate;
      const items = pickupItem.items;

      for (let item of items) {
        const itemName = item.itemName;
        const quantityToAdjust = item.quantity;

        const itemRecord = await Item.findOne({ itemName });

        if (!itemRecord) {
          return res.status(404).json({
            success: false,
            message: `Item ${itemName} not found in inventory`,
          });
        }

        const warehouseItem = warehouseItemRecord.items.find(wItem => wItem.itemName === itemName);
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
          (i) => i.itemName === item.itemName
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
            (item) => item.itemName === outgoingItem.itemName
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

module.exports.incomingItemsData = async (req, res) => {
  try {
    const id = req.user._id;
    const {
      farmerName,
      farmerContact,
      farmerVillage,
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

    let contact = Number(farmerContact);

    if (
      !farmerName ||
      !contact ||
      !farmerVillage ||
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

    const returnItems = new PickupItem({
      servicePerson: id,
      servicePersonName: req.user.name,
      servicePerContact: Number(req.user.contact),
      farmerName,
      farmerContact: contact,
      farmerVillage,
      items,
      warehouse,
      serialNumber,
      remark: remark || "",
      withoutRMU,
      rmuRemark,
      status,
      incoming,
      approvedBy,
      pickupDate,
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

