const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const dispatchDetailsSchema = new Schema({
    driverName: {
        type: String,
        required: true,
        trim: true
    },
    driverContact: {
        type: String,
        required: true,
        trim: true,
        match: /^[0-9]{10}$/,
    },
    vehicleNumber: {
        type: String,
        required: true,
        trim: true,
        upperCase: true
    },
    dispatchedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "WarehousePerson",
        required: true
    },
    warehouseId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Warehouse",
        required: true
    },
    dispatchedSystems: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "FarmerItemsActivity",
    }],
    dispatchedPanels: {
        type: [String],
    },
    dispatchedPumps: {
        type: [String]
    },
    dispatchedControllers: {
        type: [String]
    }
},{timestamps: true, collection: "inDispatchDetails"});

const DispatchDetails = mongoose.model("DispatchDetails", dispatchDetailsSchema);
module.exports = DispatchDetails;