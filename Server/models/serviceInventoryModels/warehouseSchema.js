const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const warehouseSchema = new Schema({
    warehouseName: {
        type: String,
        required: true
    },
    latitude: {
        type: String
    },
    longitude: {
        type: String
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
},{collection: "inWarehouses"});

const Warehouse = mongoose.model("Warehouse", warehouseSchema);
module.exports = Warehouse;
