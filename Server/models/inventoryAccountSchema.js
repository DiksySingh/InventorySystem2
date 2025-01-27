const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const inventoryAccountSchema = new Schema({
    // Field to dynamically determine which model to reference
    referenceType: {
        type: String,
        required: true,
        enum: ["Admin", "WarehousePerson", "ServicePerson", "SurveyPerson"], // List of allowed models
    },
      // Field that stores the ID of the referenced document
    empId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        refPath: "referenceType", // Dynamically references the model based on referenceType
    },
    itemId: {
        type: Schema.Types.ObjectId,
        ref: "SystemItem",
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
    incoming: {
        type: Boolean,
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
},);

const InventoryAccount = mongoose.model("InventoryAccount", inventoryAccountSchema);
module.exports = InventoryAccount;
