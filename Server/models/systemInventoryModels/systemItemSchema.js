const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const systemItemSchema = new Schema({
    // systemId: {
    //     type: Schema.Types.ObjectId,
    //     ref: "System",
    //     required: true
    // },
    itemName: {
        type: String,
        required: true
    },
    // quantity: {   //According to System
    //     type: Number,
    //     required: true
    // },
    unit: {
        type: String,
        default: ""
    },
    converionUnit: {
        type: String,
        default: ""
    },
    conversionFactor: {
        type: Number,
    },
    hsnCode: {
        type: String
    },
    description: {
        type: String,
        default: ""
    },
    isUsed: {
        type: Boolean,
        default: true,
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
    updatedAt: {
        type: Date
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
        ref: "Admin"
    },
    updatedByEmpId: {
        type: String,
    }
}, {collection: "inSystemItems"});

const SystemItem = mongoose.model("SystemItem", systemItemSchema);
module.exports = SystemItem;

