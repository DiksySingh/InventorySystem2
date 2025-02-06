const mongoose = require("mongoose");
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
        required: true
    },
    quantity: {
        type: Number,
        required: true
    },
    defectiveItem: {
        type:Number,
        default: 0,
    },
    arrivedDate: {
      type: Date,
      default: Date.now(),
    },
  },
  { collection: "inIncomingItems" }
);

const IncomingItem = mongoose.model("IncomingItem", incomingItemSchema);
module.exports = IncomingItem;
