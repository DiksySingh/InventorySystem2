const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const newSystemInstallationSchema = new Schema ({
    referenceType: {
        type: String,
        required: true,
        enum: ["ServicePerson", "SurveyPerson"], // List of allowed models
    },
    farmerSaralId: {
        type: Schema.Types.ObjectId,
        required: true
    },
    latitude: {
        type: String,
    },
    longitude: {
        type: String,
    },
    borePhoto: {
        type: [String],
        required: true
    },
    challanPhoto: {
        type: [String],
        required: true
    },
    landDocPhoto: {
        type: [String],
        required: true
    },
    sprinklerPhoto: {
        type: [String],
        required: true
    },
    boreFarmerPhoto: {
        type: [String],
        required: true
    },
    finalFoundationFarmerPhoto: {
        type: [String],
        required: true
    },
    panelFarmerPhoto: {
        type: [String],
        required: true
    },
    controllerBoxFarmerPhoto: {
        type: [String],
        required: true
    },
    waterDischargeFarmerPhoto: {
        type: [String],
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
    },
    createdBy: {
        type: Schema.Types.ObjectId,
        ref: "referenceType",
        required: true
    },
    updatedBy: {
        type: Schema.Types.ObjectId,
        ref: "referenceType",
    },
}, {collection: "inNewSystemInstallations"});

const NewSystemInstallation = mongoose.model("NewSystemInstallation", newSystemInstallationSchema);
module.exports = NewSystemInstallation;