const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const itemSchema = new Schema(
  {
    itemName: {
      type: String,
      required: true,
    },
    stock: {
      type: Number,
      required: true,
      default: 0,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { collection: "inItems" }
);

itemSchema.pre(
  "save",
  function (next) {
    this.updatedAt = Date.now();
    next();
  }
);

const Item = mongoose.model("Item", itemSchema);
module.exports = Item;