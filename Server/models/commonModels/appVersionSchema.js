const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const appVersionSchema = new Schema({
    appVersion: {
        type: Number,
        required: true
    },
    link: {
        type: String,
        required: true,
    },
},{timestamps: true, collection: "inAppVersion"});

const AppVersion = mongoose.model("AppVersion", appVersionSchema);
module.exports = AppVersion;