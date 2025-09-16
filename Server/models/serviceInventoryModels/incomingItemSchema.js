const mongoose = require("mongoose");
const { create } = require("./warehouse2WarehouseSchema");
const Schema = mongoose.Schema;

const incomingItemSchema = new Schema(
  {
    warehouse: {
      type: String,
      required: true,
    },
    itemComingFrom: {
      type: String,
      required: true,
    },
    itemName: {
        type: String,
        //required: true
    },
    quantity: {
        type: Number,
        //required: true
    },
    items: [
      {
          itemName: {
              type: String,
              required: true
          },
          quantity: {
              type: Number,
              required: true
          },
          defective: {
            type: Number,
            default: 0
          },
          _id: false
      }
    ],
    // defectiveItem: {
    //     type:Number,
    //     default: 0,
    // },
    arrivedDate: {
      type: Date,
      default: Date.now(),
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
  },
  { collection: "inIncomingItems" }
);

const IncomingItem = mongoose.model("IncomingItem", incomingItemSchema);
module.exports = IncomingItem;
