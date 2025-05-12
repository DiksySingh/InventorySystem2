const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const farmerItemsActivitySchema = new Schema({
    referenceType: {
        type: String,
        required: true,
        enum: ["ServicePerson", "SurveyPerson"], // List of allowed models
    },
    warehouseId: {
        type: Schema.Types.ObjectId,
        ref: "Warehouse"
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
    systemId: {
        type: Schema.Types.ObjectId,
        ref: "System",
        required: true
    },
    itemsList: [
        {
            systemItemId: {
                type: Schema.Types.ObjectId,
                ref: "SystemItem",
                required: true
            },
            quantity: {
                type: Number,
            },
            _id: false
        }
    ],
    panelNumbers: {
        type: [String],
        required: true
    },
    pumpNumber: {
        type: String,
        required: true
    },
    controllerNumber: {
        type: String,
        required: true
    },
    rmuNumber: {
        type:String,
        required: true,
        minlength: 15,
    },
    accepted: {
        type: Boolean,
        default: false
    },
    installationDone: {
        type: Boolean,
        default: false,
    },
    createdAt : {
        type: Date,
        default: Date.now,
    },
    updatedAt: {
        type: Date,
    },
    createdBy: {
        type: Schema.Types.ObjectId,
        refPath: "WarehousePerson",
        required: true
    },
    updatedBy: {
        type: Schema.Types.ObjectId,
        refPath: "referenceType",
    }
}, {collection: "inFarmerItemsActivities"});

const FarmerItemsActivity = mongoose.model("FarmerItemsActivity", farmerItemsActivitySchema);
module.exports = FarmerItemsActivity;
