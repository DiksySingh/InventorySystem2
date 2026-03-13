const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const remarksSchema = new Schema({
    remark: {
        type: String,
        trim: true,
        required: true
    }
}, {timestamps: true, collection: "inRemarks"});

const Remarks = mongoose.model("Remarks", remarksSchema);
module.exports = Remarks;