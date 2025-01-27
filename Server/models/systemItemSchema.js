const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const systemItemSchema = new Schema({
    systemId: {
        type: Schema.Types.ObjectId,
        ref: "System",
        required: true
    },
    itemName: {
        type: String,
        required: true
    },
    quantity: {   //According to System
        type: Number,
        required: true
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
        ref: "WarehousePerson",
        required: true
    },
    updatedBy: {
        type: Schema.Types.ObjectId,
        ref: "WarehousePerson"
    }
}, {collection: "inSystemItems"});

const SystemItem = mongoose.model("SystemModel", systemItemSchema);
module.exports = SystemItem;

