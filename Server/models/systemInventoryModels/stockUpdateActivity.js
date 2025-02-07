const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const stockUpdateActivitySchema = new Schema({
    referenceType: {
        type: String,
        enum: ["Admin", "WarehousePerson"],
        required: true
    },
    subItemId: {
        type: Schema.Types.ObjectId,
        ref: "SubItem",
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