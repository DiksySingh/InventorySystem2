const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const installationInventorySchema = new Schema({
    warehouseId: {
        type: Schema.Types.ObjectId,
        ref: "Warehouse",
        required: true,
    },
    systemItemId: {
        type: Schema.Types.ObjectId,
        ref: "SystemItem",
        required: true
    },
    quantity: {
        type: Number,
        required: true,
        default: 0,
    },
    unit: {
        type: String,
    },
    isUsed: {
        type: Boolean,
        default: true
    },
    defective: {
        type: Number,
        default: 0
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
    updatedAt: {
        type: Date,
    },
    createdBy: {
        type: Schema.Types.ObjectId,
        ref: "Admin",
    },
    createdByEmpId: {
        type: String
    },
    updatedBy: {
        type: Schema.Types.ObjectId,
        ref: "WarehousePerson"
    },
    updatedByEmpId: {
        type: String
    },
}, {collection: "inInstallationInventories"});

const InstallationInventory = mongoose.model("InstallationInventory", installationInventorySchema);
module.exports = InstallationInventory;
