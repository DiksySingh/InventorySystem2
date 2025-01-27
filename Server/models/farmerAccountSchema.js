const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const farmerAccountSchema = new Schema({
    referenceType: {
        type: String,
        required: true,
        enum: ["Admin", "WarehousePerson", "ServicePerson", "SurveyPerson"], // List of allowed models
    },
    farmerId: {
        type: Schema.Types.ObjectId,
        required: true
    },
    systemId: {
        type: Schema.Types.ObjectId,
        ref: "System",
        required: true
    },
    itemId: {
        type: Schema.Types.ObjectId,
        ref: "SystemItem",
        required: true
    },
    quantity: {
        type: Number,
    },
    createdAt : {
        type: Date,
        default: Date.now,
    },
    createdBy: {
        type: Schema.Types.ObjectId,
        refPath: 'referenceType',
        required: true,
    }
}, {collection: "inFarmerAccounts"});

const FarmerAccount = mongoose.model("FarmerAccount", farmerAccountSchema);
module.exports = FarmerAccount;
