const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const warehouseItemsSchema = new Schema({
    warehouse: {
        type: Schema.Types.ObjectId,
        ref: "Warehouse"
    },
    items: [
        {
          itemName: {
            type: String,
          },
          quantity: {
            type: Number,
          },
          defective:{
            type: Number,
            default: 0
          },
          repaired: {
            type: Number,
            default: 0,
          },
          rejected: {
            type: Number,
            default: 0,
          },
        },
    ],   
}, {collection: "inWarehouseItems"});

const WarehouseItems = mongoose.model("WarehouseItems", warehouseItemsSchema);
module.exports = WarehouseItems;