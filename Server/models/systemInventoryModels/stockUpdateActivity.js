const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const stockUpdateActivitySchema = new Schema({
    referenceType: {
        type: String,
        enum: ["Admin", "WarehousePerson"],
        required: true
    },
    warehouseId: {
        type: Schema.Types.ObjectId,
        ref: "Warehouse",
        required: true
    },
    systemItemId: {
        type: Schema.Types.ObjectId,
        ref: "SystemItem",
        required: true
    },
    quantity: {
        type: Number,
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    createdBy: {
        type: Schema.Types.ObjectId,
        refPath: "referenceType",
        required: true
    }
}, {collection: "inStockUpdateActivities"});

const StockUpdateActivity = mongoose.model("StockUpdateActivity", stockUpdateActivitySchema);
module.exports = StockUpdateActivity;