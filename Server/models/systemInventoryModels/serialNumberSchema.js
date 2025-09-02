const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const serialNumberSchema = new Schema({
    productType: {
        type: String,
        trim: true,
        lowercase: true,
        required: true
    },
    serialNumber: {
        type: String,
        required: true,
        trim: true,
        uppercase: true,
    },
    state: {
        type: String,
        required: true,
        trim: true,
    },
    isUsed: {
        type: Boolean,
        default: false
    }
},{timestamps: true, collection: "inSerialNumbers"});

const SerialNumber = mongoose.model("SerialNumber", serialNumberSchema);
module.exports = SerialNumber;
