const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const systemItemsWToWSchema = new Schema({
    fromWarehouse: {
        type: Schema.Types.ObjectId,
        ref: 'Warehouse',
        required: true
    },
    toWarehouse: {
        type: Schema.Types.ObjectId,
        ref: 'Warehouse',
        required: true
    },
    itemsList: [
        {
            itemId: {
                type: Schema.Types.ObjectId,
                ref: "InstallationInventory",
                required: true
            },
            quantity: {
                type: Number,
                required: true
            }
        }
    ],
    driverName: {
        type: String,
        required: true,
    },
    driverContact: {
        type: Number,
        required: true
    },
    remarks: {
        type: String,
        required: true,
    },
    status: {
        type: Boolean,
        default: false,
    },
    outgoing: {
        type: Boolean
    },
    pickupDate: {
        type: Date,
    },
    arrivedDate: {
        type: Date
    },
    approvedBy: {
        type: Schema.Types.ObjectId,
        ref: "WarehousePerson"
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
    createdBy: {
        type: Schema.Types.ObjectId,
        ref: "WarehousePerson",
        required: true
    },
},{collection: "inSystemInventoryWToW"});

const SystemInventoryWToW = mongoose.model("SystemInventoryWToW", systemItemsWToWSchema);
module.exports = SystemInventoryWToW;

