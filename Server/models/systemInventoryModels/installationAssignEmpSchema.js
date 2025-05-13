const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const installationAssignEmpSchema = new Schema({
    referenceType: {
        type: String,
        required: true,
        enum: ["ServicePerson", "SurveyPerson"], // List of allowed models
    },
    warehouseId: {
        type: Schema.Types.ObjectId,
        ref: "Warehouse"
    },
    empId: {
        type: Schema.Types.ObjectId,
        required: true,
        refPath: "referenceType", // Dynamically references the model based on referenceType
    },
    farmerSaralId: {
        type: String,
        required: true,
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
            },
            quantity: {
                type: Number,
            },
            _id: false,
        }
    ],
    createdAt: {
        type: Date,
        default: Date.now,
    },
    updatedAt: {
        type: Date,
    },
    createdBy: {
        type: Schema.Types.ObjectId,
        required: true,
        refPath: "WarehousePerson",
    },
    updatedBy: {
        type: Schema.Types.ObjectId,
        refPath: "WarehousePerson",
    }
}, {collection: "inInstallationAssignEmp"});

const InstallationAssignEmp = mongoose.model("InstallationAssignEmp", installationAssignEmpSchema);
module.exports = InstallationAssignEmp;