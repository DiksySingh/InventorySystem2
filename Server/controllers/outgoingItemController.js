const moment = require("moment-timezone");
const Item = require("../models/itemSchema");
const ServicePerson = require("../models/servicePersonSchema");

//Service Person: Add Outgoing Item Data
const addOutgoingTransaction = async (req, res) => {
  try {
    console.log(req.body);
    const id = req.user._id;
    const {
      farmerName,
      farmerContact,
      farmerVillage,
      items,
      warehouse,
      serialNumber,
      remark,
      status,
      pickupDate,
    } = req.body;

    let contact = Number(farmerContact);
    //let parsedItems = JSON.parse(items);

    if (
      !farmerName ||
      !contact ||
      !farmerVillage ||
      !items ||
      !warehouse ||
      !serialNumber
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

    // if (!req.file) {
    //   return res.status(400).json({
    //     success: false,
    //     message: "Image is required",
    //   });
    // }
    // const image = req.file.filename;

     for (let item of items) {
       const itemName = item.itemName;
       const quantityToDecrease = item.quantity;

       // Find the corresponding item in the Item schema
       const itemRecord = await Item.findOne({ itemName });

       if (!itemRecord) {
         return res.status(404).json({
           success: false,
           message: `Item ${itemName} not found in inventory`,
         });
       }

       // Check if there is enough stock
       if (itemRecord.stock < quantityToDecrease) {
         return res.status(400).json({
           success: false,
           message: `Not enough stock for item ${itemName}`,
         });
       }

       // Decrease the stock
       itemRecord.stock -= quantityToDecrease;

       // Save the updated item record
       await itemRecord.save();
     }

    const returnItems = new OutgoingItem({
      servicePerson: id,
      farmerName,
      farmerContact: contact,
      farmerVillage,
      items,
      warehouse,
      serialNumber,
      remark: remark || "",
      status: status || false,
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

//View All Transactions
const viewTransactions = async (req, res) => {
  try {
    const allTransactions = await Transaction.find().populate("servicePerson");
    if (!allTransactions) {
      return res.status(404).json({
        success: false,
        message: "Data Not Found",
      });
    }
    res.status(200).json({
      success: true,
      message: "Data Fetched Successfully",
      data: allTransactions,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

//View Particular Transaction Using ID
const getTransactionByID = async (req, res) => {
  const { id } = req.query;
  if (!id) {
    return res.status(400).json({
      success: false,
      message: "Transaction ID is required",
    });
  }

  try {
    const transaction = await Transaction.findById(id).populate(
      "servicePerson",
      "name email contact"
    );
    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: "Transaction Not Found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Transaction Fetched Successfully",
      transaction,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

//Update a transaction using ID
const updateTransaction = async (req, res) => {
  try {
    const { id } = req.query;
    const updates = req.body;
    console.log(req.body);
    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Transaction ID is required",
      });
    }

    const transaction = await Transaction.findById(id).populate(
      "servicePerson"
    );
    console.log(transaction);
    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: "Transaction not found",
      });
    }

    // if (updates.name) transaction.name = updates.name;
    // if (updates.contact) transaction.contact = Number(updates.contact);

    if (updates.name || updates.contact || updates.email) {
      console.log(transaction.servicePerson._id);
      const servicePerson = await ServicePerson.findById({
        _id: transaction.servicePerson._id,
      });
      console.log(servicePerson);
      if (!servicePerson) {
        return res.status(404).json({
          success: false,
          message: "Person not found",
        });
      }
      if (updates.name) {
        servicePerson.name = updates.name;
      }

      if (updates.email) {
        servicePerson.email = updates.email;
      }
      if (updates.contact) {
        const servicePersonContact = Number(updates.contact);
        servicePerson.contact = servicePersonContact;
      }

      await servicePerson.save();
    }

    if (updates.items) {
      const newItems = JSON.parse(updates.items);

      for (const newItem of newItems) {
        const { itemName, quantity: newQuantity } = newItem;

        const foundItem = await Item.findOne({ itemName });

        if (!foundItem) {
          return res.status(404).json({
            success: false,
            message: `Item ${itemName} not found`,
          });
        }

        // Find the corresponding old item in the transaction
        const oldItem = transaction.items.find(
          (item) => item.itemName === itemName
        );

        if (!oldItem) {
          // If the item is new in the transaction, just reduce the stock
          if (foundItem.stock < newQuantity) {
            return res.status(400).json({
              success: false,
              message: `Not enough stock for ${itemName}`,
            });
          }
          foundItem.stock -= newQuantity;
        } else {
          const oldQuantity = oldItem.quantity;
          const quantityDifference = newQuantity - oldQuantity;

          if (quantityDifference > 0) {
            // Quantity has increased, decrease stock accordingly
            if (foundItem.stock < quantityDifference) {
              return res.status(400).json({
                success: false,
                message: `Not enough stock for ${itemName}`,
              });
            }
            foundItem.stock -= quantityDifference;
          } else if (quantityDifference < 0) {
            // Quantity has decreased, increase stock accordingly
            foundItem.stock += Math.abs(quantityDifference);
          }
        }

        // Update stock and save the item
        foundItem.updatedAt = Date.now();
        await foundItem.save();
      }

      // Replace old items with new ones
      transaction.items = newItems;
    }

    if (updates.warehouse) transaction.warehouse = updates.warehouse;
    if (updates.status) transaction.status = updates.status;
    if (updates.status === "IN") {
      transaction.activity = "Success";
    }

    // Check if a new videoProof file is uploaded
    // if (req.file) {
    //     const videoProof = req.file.path;
    //     transaction.videoProof = videoProof;
    // }

    // Save the updated transaction
    await transaction.save();
    const updatedTransaction = await Transaction.findById(id).populate(
      "servicePerson",
      "name email contact"
    );
    res.status(200).json({
      success: true,
      message: "Transaction updated successfully",
      updatedTransaction,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

//Return Items at Inventory
const returnItems = async (req, res) => {
  try {
    // const {id} = req.query;

    console.log(req.body);
    const itemData = req.body.itemsToReturn;
    const personContact = Number(req.body.contact);
    console.log(personContact);
    console.log(itemData);
    if (!personContact || !itemData || !Array.isArray(itemData)) {
      return res.status(400).json({
        success: false,
        message: "Contact and itemData required",
      });
    }

    // const transaction = await Transaction.findById(id);
    // if(!transaction){
    //     return res.status(404).json({
    //         success: false,
    //         message: "Transaction Not Found"
    //     });
    // }
    const servicePerson = await ServicePerson.findOne({
      contact: personContact,
    });
    if (!servicePerson) {
      return res.status(404).json({
        success: false,
        message: "servicePerson not found",
      });
    }

    for (const item of itemData) {
      const { itemName, quantity } = item;
      const foundItem = await Item.findOne({ itemName });
      if (!foundItem) {
        return res.status(404).json({
          success: false,
          message: `Item ${itemName} not found`,
        });
      }

      // const oldItem = transaction.items.find(item => item.itemName === itemName);
      // if (!oldItem || oldItem.quantity < quantity) {
      //     return res.status(400).json({
      //         success: false,
      //         message: `Cannot return more ${itemName} than was taken`
      //     });
      // }

      // Update stock
      foundItem.stock += quantity;
      foundItem.updatedAt = Date.now();
      await foundItem.save();

      // Log the returned item
      //transaction.returnedItems.push({ itemName, quantity, returnDate: Date.now() });
    }

    // Save the updated original transaction
    //await transaction.save();
    const returnItemData = new ReturnItem({
      itemsToReturn: itemData,
      returnDate: req.body.returnDate,
      returnedBy: servicePerson._id,
    });
    await returnItemData.save();

    res.status(200).json({
      success: true,
      message: "Items returned successfully",
      returnItemData,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

//Delete a transaction using ID
const deleteTransaction = async (req, res) => {
  const { id } = req.query;
  if (!id) {
    return res.status(400).json({
      success: false,
      message: "Transaction ID is required",
    });
  }

  try {
    const deletedTransaction = await Transaction.findByIdAndDelete(id);
    if (!deletedTransaction) {
      return res.status(404).json({
        success: false,
        message: "Transaction Not Found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Transaction Removed Successfully",
      deletedTransaction,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

//ServicePerson Controller
//Dashboard API
// const servicePersonDashboard = async (req, res) => {
//   try {
//     const items = await Item.find();
//     if (!items) {
//       return res.status(404).json({
//         success: false,
//         message: "Items Data Not Found",
//       });
//     }

//     const transactions = await Transaction.find({
//       servicePerson: req.user._id,
//     });

//    const itemValues = {};


//    transactions.forEach((transaction) => {
//      const transactionItems = transaction.items; 

//      transactionItems.forEach((item) => {
//        const itemName = item.itemName; 
//        const itemValue = item.quantity; 

//        if (itemValues[itemName]) {
//          itemValues[itemName] += itemValue; 
//        } else {
//          itemValues[itemName] = itemValue; 
//        }
//      });
//    });
  
//    const itemsData = items.map((item) => ({
//      name: item.itemName,
//      value: itemValues[item.itemName] || 0, 
//    }));

//     res.status(200).json({
//       success: true,
//       message: "Items Fetched Successfully",
//       data: itemsData,
//     });
//   } catch (error) {
//     res.status(500).json({
//       success: false,
//       message: "Internal Server Error",
//       error: error.message,
//     });
//   }
// };


//Get Specific Transaction of ServicePerson
const getServicePersonTransactions = async (req, res) => {
  try {
    const transactions = await Transaction.find({
      servicePerson: req.user._id,
    }).select("-__v -servicePerson");
    if (!transactions) {
      return res.status(404).json({
        success: false,
        message: "Data Not Found",
      });
    }

     const transactionsWithISTDate = transactions.map((transaction) => {
       return {
         ...transaction.toObject(), 
         transactionDate: moment(transaction.transactionDate)
           .tz("Asia/Kolkata")
           .format("YYYY-MM-DD HH:mm:ss"), 
       };
     });

    res.status(200).json({
      success: true,
      transaction: transactionsWithISTDate,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

//Update Status of Transaction
const updateTransactionStatus = async (req, res) => {
  const servicePersonId = req.user._id;
  const { id } = req.query;
  const { newStatus } = req.body;
  if (!id) {
    return res.status(400).json({
      success: false,
      message: "Transaction ID is required",
    });
  }
  if (!newStatus) {
    return res.status(400).json({
      success: false,
      message: "Status is required",
    });
  }

  try {
    const transaction = await Transaction.findById(id);
    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: "Data Not Found",
      });
    }

    if (newStatus === "IN") {
      transaction.status = newStatus;
      transaction.activity = "Success";
    }
    await transaction.save();
    const updatedStatus = await Transaction.findById(id).select(
      "-__v -servicePerson"
    );
    res.status(200).json({
      success: true,
      message: "Status Updated Successfully",
      data: updatedStatus,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

module.exports = {
  addOutgoingTransaction,
  viewTransactions,
  getTransactionByID,
  updateTransaction,
  returnItems,
  deleteTransaction,
  getServicePersonTransactions,
  updateTransactionStatus,
};
