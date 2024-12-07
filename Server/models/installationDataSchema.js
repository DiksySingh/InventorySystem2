const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const installationSchema = new Schema({
    farmerName: {
        type: String,
        required: true
    },
    farmerContact: {
        type: String,
        required: true
    },
    farmerVillage: {
        type: String, 
        required: true
    },
    photos: [
        {
            type: String,
            required: true
        }
    ],
    longitude: {
        type: String,
        required: true
    },
    latitude: {
        type: String,
        required: true
    },
    status: {
        type: Boolean,
        default: false
    },
    installationDate: {
        type: Date,
    }
}, {collection: "inInstallationData"});

const InstallationData = mongoose.model("InstallationData", installationSchema);
module.exports = InstallationData;