const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const inventoryAccountSchema = new Schema({
    // Field to dynamically determine which model to reference
    referenceType: {
        type: String,
        required: true,
        enum: ["Admin", "WarehousePerson", "ServicePerson", "SurveyPerson"], // List of allowed models
    },
    itemId: {
        type: Schema.Types.ObjectId,
        ref: "InstallationInventory",
        required: true,
    },
    quantity: {
        type: Number,
        required: true
    },
    company: {
        type: String,
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        refPath: "referenceType", // Dynamically references the model based on referenceType
    },
},);

const InventoryAccount = mongoose.model("InventoryAccount", inventoryAccountSchema);
module.exports = InventoryAccount;
