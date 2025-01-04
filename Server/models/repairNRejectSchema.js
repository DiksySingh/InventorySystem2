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
    serialNumber: {
        type: String,
    },
    isRepaired: {
        type: Boolean,
    },
    repaired: {
        type: Number,
    },
    rejected: {
        type: Number,
    },
    repairedBy: {
        type: String,
    },
    remark: {
        type: String,
        required: true
    },
    createdAt: {
        type: Date,
    },
},{collection: "inRepairNRejectItems"});

const RepairNRejectItems = mongoose.model("RepairNRejectItems", repairNRejectSchema);
module.exports = RepairNRejectItems; 