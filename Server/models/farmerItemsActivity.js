const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const farmerItemsActivitySchema = new Schema({
    referenceType: {
        type: String,
        required: true,
        enum: ["Admin", "WarehousePerson", "ServicePerson", "SurveyPerson"], // List of allowed models
    },
    farmerId: {
        type: Schema.Types.ObjectId,
        required: true
    },
    empId: {
        type: Schema.Types.ObjectId,
        refPath: "referenceType",
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
    updatedAt: {
        type: Date,
    }
}, {collection: "inFarmerItemsActivities"});

const FarmerItemsActivity = mongoose.model("FarmerItemsActivity", farmerItemsActivitySchema);
module.exports = FarmerItemsActivity;
