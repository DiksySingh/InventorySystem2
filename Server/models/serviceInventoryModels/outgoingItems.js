// const mongoose = require("mongoose");
// const Schema = mongoose.Schema;

// const outgoingItemsSchema = new Schema({
//     fromWarehouse: {
//         type: String,
//         required: true
//     },
//     toServiceCenter: {
//         type: String,
//         required: true
//     },
//     items: [
//         {
//             itemName: {
//                 type: String,
//                 required: true
//             },
//             quantity: {
//                 type: Number,
//                 required: true
//             },
//             _id: false
//         }
//     ],
//     farmerSaralId: {
//         type: [String],
//     },
//     sendingDate: {
//         type: Date,
//         default: Date.now
//     },
//     createdAt: {
//         type: Date,
//         default: Date.now
//     },
//     createdBy: {
//         type: Schema.Types.ObjectId,
//         required: true,
//         ref: "WarehousePerson"
//     },
// }, {collection: "inOutgoingItems"});

// const OutgoingItems = mongoose.model("OutgoingItems", outgoingItemsSchema);
// module.exports = OutgoingItems;

const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const outgoingItemsSchema = new Schema(
  {
    fromWarehouse: {
      type: String,
      required: true,
    },
    toServiceCenter: {
      type: String,
      required: true,
    },

    // 🔹 Each farmerSaralId now has its own item list
    farmers: [
      {
        farmerSaralId: {
          type: String,
          required: true,
        },
        items: [
          {
            itemName: {
              type: String,
              required: true,
            },
            quantity: {
              type: Number,
              required: true,
            },
            _id: false,
          },
        ],
        _id: false,
      },
    ],
    sendingDate: {
      type: Date,
      default: Date.now,
    },
    status: {
      type: String,
      enum: ["Pending", "Partially Received", "Fully Received"],
      default: "Pending",
    },
    driverName: {
      type: String,
      trim: true,
      uppercase: true,
    },
    driverContact: {
      type: String,
      trim: true,
      minLength: 10,
    },
    vehicleNumber: {
      type: String,
      trim: true,
      uppercase: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: "WarehousePerson",
    },
    updatedAt: {
      type: Date,
    },
    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: "WarehousePerson",
    },
  },
  { collection: "inOutgoingItems" }
);

const OutgoingItems = mongoose.model("OutgoingItems", outgoingItemsSchema);
module.exports = OutgoingItems;
