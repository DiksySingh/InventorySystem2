const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const systemItemMapSchema = new Schema({
    systemId: {
        type: Schema.Types.ObjectId,
        ref: "System",
        required: true
    },
    systemItemId: {
        type: Schema.Types.ObjectId,
        ref: "SystemItem",
        required: true
    },
    // subItemName: {
    //     type: String,
    //     required: true
    // },
    quantity: {  
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
        ref: "Admin",
        required: true
    },
    updatedBy: {
        type: Schema.Types.ObjectId,
        ref: "Admin"
    }
}, {collection: "inSystemItemMap"});

const SystemItemMap = mongoose.model("SystemItemMap", systemItemMapSchema);
module.exports = SystemItemMap;

