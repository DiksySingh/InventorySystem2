const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const systemSchema = new Schema({
    systemName: {
        type: String,
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
    updatedAt: {
        type: Date,
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
},{collection: "inSystems"});

const System = mongoose.model("System", systemSchema);
module.exports = System;


