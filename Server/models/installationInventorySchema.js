const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const installationInventorySchema = new Schema({
    warehouseId: {
        type: Schema.Types.ObjectId,
        ref: "Warehouse",
        required: true,
    },
    itemName: {
        type: String,
        required: true
    },
    quantity: {
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
    }
}, {collection: "inInstallationInventories"});

const InstallationInventory = mongoose.model("InstallationInventory", installationInventorySchema);
module.exports = InstallationInventory;
