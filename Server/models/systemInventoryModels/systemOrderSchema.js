const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const systemOrderSchema = new Schema({
    systemId: {
        type: Schema.Types.ObjectId,
        ref: "System"
    },
    pumpId: {
        type: Schema.Types.ObjectId,
        ref: "SystemItem"
    },
    pumpHead: {
        type: String,
        enum: ['30M', '50M', '70M', '100M']
    },
    totalOrder: {
        type: Number,
        default: 0,
    },
    dispatchedOrder: {
        type: Number,
        default: 0,
    },
},{timestamps: true, collection: "inSystemOrder"});

const SystemOrder = mongoose.model("SystemOrder", systemOrderSchema);
module.exports = SystemOrder;