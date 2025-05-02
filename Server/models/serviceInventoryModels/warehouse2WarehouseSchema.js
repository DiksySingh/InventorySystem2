const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const warehouseToWarehouseSchema = new Schema({
    fromWarehouse: {
        type: String,
        required: true
    },
    toWarehouse: {
        type: String,
        required: true,
    },
    isDefective: {
        type: Boolean,
    },
    items: [
        {
            itemName: {
                type: String,
                required: true
            },
            quantity: {
                type: Number,
                required: true
            },
            serialNumber: {
                type: [String],
                required: true
            },
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
    },
    incoming: {
        type: Boolean
    },
    isNewStock: {
        type: Boolean,
        default: false
    },
    pickupDate: {
        type: Date,
    },
    approvedBy: {
        type: String,
    },
    arrivedDate: {
        type: Date
    },
},{collection: "inWToWData"});

const WToW = mongoose.model("WToW", warehouseToWarehouseSchema);
module.exports =  WToW;