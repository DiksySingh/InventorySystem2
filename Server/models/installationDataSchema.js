const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const installationSchema = new Schema({
    warehouseId: {
        type: Schema.Types.ObjectId,
        ref: "Warehouse"
    },
    servicePersonId: {
        type: Schema.Types.ObjectId,
        ref: "ServicePerson"
    },
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
    items: [
        {
            itemName: {
                type: String,
                required: true
            },
            quantity: {
                type: Number,
                required: true
            }
        }
    ],
    serialNumber: {
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
    otpRecordId: {
        type: Schema.Types.ObjectId,
        ref: "OTP"
    },
    installedBy: {
        type: String,
    },
    installationDate: {
        type: Date,
        required: true
    },
}, {collection: "inInstallationData"});

const InstallationData = mongoose.model("InstallationData", installationSchema);
module.exports = InstallationData;