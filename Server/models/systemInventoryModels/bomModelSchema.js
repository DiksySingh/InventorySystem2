const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const bomSchema = new Schema({
    name: {
        type: String,
        required: true,
        trim: true,
        uppercase: true,
        unique: true
    },
    description: {
        type: String
    },
    isActive: {
        type: Boolean,
        default: true
    },
    createdBy: {
        type: String,
        required: true
    },
    updatedBy: {
        type: String,
    }
}, { collection: "inBOM", timestamps: true });

const BOM = mongoose.model("BOM", bomSchema)

module.exports = BOM;