const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const receivingItemsSchema = new Schema(
  {
    outgoingId: {
      type: Schema.Types.ObjectId,
      ref: "OutgoingItems", // link to outgoing record
      required: true,
    },
    // ✅ Each farmerSaralId has its own items
    farmers: [
      {
        farmerSaralId: {
          type: String,
          required: true,
        },
        receivedItems: [
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

    remarks: {
      type: String,
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
    receivedDate: {
      type: Date,
      default: Date.now,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { collection: "inReceivingItems" }
);

const ReceivingItems = mongoose.model("ReceivingItems", receivingItemsSchema);
module.exports = ReceivingItems;
