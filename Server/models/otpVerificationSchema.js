const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const otpVerificationSchema = new Schema({
    phoneNumber: {
        type: Number,
        required: true,
    },
    otp: {
        type: Number,
        required: true
    },
    otpVerified: {
        type: Boolean,
        default: false
    },
    expiresAt: {
        type: Date,
    },
    created_At:{
        type:Date,
        default:Date.now,
    }
},{collection: "inOTPs"});

const OTP = mongoose.model("OTP", otpVerificationSchema);
module.exports = OTP;