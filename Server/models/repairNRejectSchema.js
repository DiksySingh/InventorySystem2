const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const repairNRejectSchema = new Schema ({
    warehouseId: {
        type: Schema.Types.ObjectId,
        ref: "Warehouse",
        required: true,
    },
    warehousePerson: {
        type: String,
        required: true,
    },
    warehouseName: {
        type: String,
        requried: true,
    },
    itemName: {
        type: String,
        required: true,
    },
    repaired: {
        type: Number,
        default: 0,
    },
    rejected: {
        type: Number,
        default: 0,
    },
    createdAt: {
        type: Date,
    }
},{collection: "inRepairNRejectItems"});

const RepairNRejectItems = mongoose.model("RepairNRejectItems", repairNRejectSchema);
module.exports = RepairNRejectItems; 