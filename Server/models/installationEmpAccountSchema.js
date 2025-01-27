const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const installationEmpAccountSchema = new Schema({
    referenceType: {
        type: String,
        required: true,
        enum: ["Admin", "WarehousePerson", "ServicePerson", "SurveyPerson"], // List of allowed models
    },
    empId: {
        type: Schema.Types.ObjectId,
        required: true,
        refPath: "referenceType", // Dynamically references the model based on referenceType
    },
    farmerId: {
        type: Schema.Types.ObjectId,
        required: true,
    },
    itemId: {
        type: Schema.Types.ObjectId,
        ref: "SystemItem",
        required: true
    },
    quantity: {
        type: Number,
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
    createdBy: {
        type: Schema.Types.ObjectId,
        refPath: "referenceType",
        required: true
    }
}, {collection: "inInstallationEmpAccounts"});

const InstallationEmpAccount = mongoose.model("InstallationEmpAccount", installationEmpAccountSchema);
module.exports = InstallationEmpAccount;