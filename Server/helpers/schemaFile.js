const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const remarkSchema = new Schema({
    roleId: {
        type: Schema.Types.ObjectId,
        ref: "Role"
    },
    remark: {
        type: String,
        required: true
    },
    created_At: {
        type: Date,
        default: Date.now()
    },
    updated_At: {
        type: Date,
        default: Date.now()
    },
    created_By: {
        type: Schema.Types.ObjectId,
        ref: "Employee",
        required: true
    },
    updated_By: {
        type: Schema.Types.ObjectId,
        ref: "Employee"
    }
});

const Remark = mongoose.model("Remark", remarkSchema);
module.exports = Remark;