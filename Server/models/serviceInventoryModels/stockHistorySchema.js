const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const stockHistorySchema = new Schema ({
    empId: {
        type: Schema.Types.ObjectId,
        ref: "WarehousePerson",
        required: true
    },
    warehouseId: {
        type: Schema.Types.ObjectId,
        ref: "Warehouse",
        required: true
    },
    itemName: {
        type: String,
        required: true
    },
    newStock: {
        type: Number,
        required: true
    },
    quantity: {
        type: Number
    },
    defective: {
        type: Number
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
}, {collection: "inStockHistory"});

const StockHistory = mongoose.model("StockHistory", stockHistorySchema);
module.exports = StockHistory;