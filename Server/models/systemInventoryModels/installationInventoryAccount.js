const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const incomingInstallationItemsAccount = new Schema({
    // Field to dynamically determine which model to reference
    referenceType: {
        type: String,
        required: true,
        enum: ["Admin", "WarehousePerson"], // List of allowed models
    },
    from: {
        type: String,
        required: true
    },
    toWarehouse: {
        type: Schema.Types.ObjectId,
        ref: "Warehouse",
        required: true
    },
    itemsList: [
        {
            itemId: {
                type: Schema.Types.ObjectId,
                ref: "InstallationInventory",
                required: true,
            },
            quantity: {
                type: Number,
                required: true
            },
        }
    ],
    company: {
        type: String,
        required: true
    },
    arrivedDate: {
        type: Date,
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        refPath: "referenceType", // Dynamically references the model based on referenceType
    },
}, {collection: "inIncomingItemsAccounts"});

const IncomingItemsAccount = mongoose.model("IncomingItemsAccount", incomingInstallationItemsAccount);
module.exports = IncomingItemsAccount;
