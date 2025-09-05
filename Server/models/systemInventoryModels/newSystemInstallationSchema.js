const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const newSystemInstallationSchema = new Schema ({
    referenceType: {
        type: String,
        required: true,
        enum: ["ServicePerson", "SurveyPerson"], // List of allowed models
    },
    farmerSaralId: {
        type: "String",
        required: true
    },
    latitude: {
        type: String,
    },
    longitude: {
        type: String,
    },
    pitPhoto: {
        type: [String],
       // required: true
    },
    borePhoto: {
        type: [String],
       // required: true
    },
    earthingFarmerPhoto: {
        type: [String],
    },
    antiTheftNutBoltPhoto: {
        type: [String],
    },
    lightingArresterInstallationPhoto: {
        type: [String],
    },
    finalFoundationFarmerPhoto: {
        type: [String],
      //  required: true
    },
    panelFarmerPhoto: {
        type: [String],
      //  required: true
    },
    controllerBoxFarmerPhoto: {
        type: [String],
      //  required: true
    },
    waterDischargeFarmerPhoto: {
        type: [String],
        //required: true
    },
    installationVideo: {
        type: [String], // Changed to array to allow multiple videos
    },
    state: {
        type: String,
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
        type: String, // Changed to String to store employee name
    },
}, {collection: "inNewSystemInstallations"});

const NewSystemInstallation = mongoose.model("NewSystemInstallation", newSystemInstallationSchema);
module.exports = NewSystemInstallation;