const OTP = require("../models/otpVerificationSchema");
const InstallationData = require("../models/installationDataSchema");
const PickupItem = require("../models/pickupItemSchema");
const sendOtp = require("../helpers/otpGeneration.js");

module.exports.createInstallationData = async(req, res) => {
    try{
        const {pickupItemId, farmerName, farmerContact, farmerVillage, longitude, latitude, status, installationDate} = req.body;
        if(!pickupItemId || !farmerName || !farmerContact || !farmerVillage || !longitude || !latitude || !installationDate){
            return res.status(400).json({
                success: false,
                message: "All fields are required"
            });
        }

        if(!req.files || req.files.length === 0){
            return res.status(400).json({
                success: false,
                message: "No photos uploaded"
            });
        }

        //const photoFilenames = req.files.map((file) => file.filename);
        const photoUrls = req.files.map((file) => `${req.protocol}://${req.get("host")}/uploads/${file.filename}`);

        const newInstallation = new InstallationData({
            farmerName,
            farmerContact: Number(farmerContact),
            farmerVillage,
            photos: photoUrls,
            longitude,
            latitude,
            status,
            installationDate
        });

        const installationData = await newInstallation.save();
        const pickupItemData = await PickupItem.findById({_id: pickupItemId});
        if(!pickupItemData){
            return res.status(400).json({
                success: false,
                message: "Pickup Item Data Not Found"
            });
        }

        pickupItemData.installationId = installationData._id;
        const phoneNumber = Number(farmerContact);
        const otpGenerate = Math.floor(100000 + Math.random() * 900000);
        const expiresAt = new Date(Date.now() + 2 * 60 * 1000);
        const newOtpData = new OTP({
            phoneNumber: phoneNumber,
            otp: otpGenerate,
            otpVerified: false,
            expiresAt: expiresAt,
            createdAt: new Date()
        });
        const otpData = await newOtpData.save();
        pickupItemData.otpRecordId = otpData._id;

        await pickupItemData.save();

        // const result = await sendOtp(phoneNumber, otpGenerate); //Sending OTP to the recipient using FAST2SMS
        // if (result.success) {
        //     return res.status(200).json({
        //         success: true,
        //         message: "Data logged and OTP sent successfully",
        //         installationData,
        //     });
        // }else{
        //     return res.status(500).json({
        //         success: false,
        //         message: "Failed to send OTP",
        //         error: result.message || "Unknown error",
        //     });
        // }
        return res.status(200).json({
            success: true,
            message: "Data Logged Successfully",
            installationData,
            newOtpData
        })
    }catch(error){
        return res.status(500).json({
            success: false, 
            message: "Internal Server Error",
            error: error.message
        });
    }
};

module.exports.verifyOtp = async(req, res) => {
    try{
        const {pickupItemId, phoneNumber, otp} = req.body;
        if (!pickupItemId || !phoneNumber || !otp) {
            return res.status(400).json({
                success: false,
                message: "All fields are required",
            });
        }

        const pickupItemData = await PickupItem.findById({_id: pickupItemId});
        // if(!pickupItemData){
        //     return res.status(404).json({
        //         success: false,
        //         message: "Pickup Item Data Not Found"
        //     });
        // }

        const otpRecordId = pickupItemData.otpRecordId;
        const otpRecord  = await OTP.findById({_id: otpRecordId});

        if(otpRecord.phoneNumber !== phoneNumber || otpRecord.otp !== otp){
            return res.status(400).json({
                success: false,
                message: "Invalid OTP"
            });
        }

        if(otpRecord.otpVerified){
            return res.status(400).json({
                success: false,
                message: "OTP has already been verified"
            });
        }

        if (otpRecord.expiresAt < new Date()) {
            return res.status(400).json({ 
                success: false,
                message: "OTP has expired." 
            });
        }

        otpRecord.otpVerified = true;
        await otpRecord.save();
        return res.status(200).json({
            success: true,
            message: "OTP Verified Successfully"
        });
    }catch(error){
        return res.status(500).json({
            success: false,
            message: "Internal Server Error",
            error: error.message
        });
    }
};

module.exports.resendOTP = async (req, res) => {
    try{
        const {pickupItemId} = req.body;
        if(!pickupItemId) {
            return res.status(400).json({
                success: false,
                message: "PickupItem ID Not Found"
            });
        }

        const pickupItemData = await PickupItem.findById({_id: pickupItemId});
        const otpRecordId = pickupItemData.otpRecordId;
        const existingOtpRecord = await OTP.findById({_id: otpRecordId});
        if (!existingOtpRecord) {
            return res.status(404).json({
                success: false,
                message: "OTP record not found",
            });
        }
        const newOtp = Math.floor(100000 + Math.random() * 900000);
        const newExpiresAt = new Date(Date.now() + 2 * 60 * 1000);

        const phoneNumber = existingOtpRecord.phoneNumber;
        existingOtpRecord.otp = newOtp;
        existingOtpRecord.expiresAt = newExpiresAt;
        existingOtpRecord.otpVerified = false;
        await existingOtpRecord.save();

        const result = await sendOtp(phoneNumber, newOtp);

        if (result && result.success) {
            return res.status(200).json({
                success: true,
                message: "OTP resend successfully",
            });
        }else{
            return res.status(500).json({
                success: false,
                message: "Failed to resend OTP",
                error: result ? result.message : "Unknown error occurred while sending OTP",
            });
        }
    }catch(error){
        return res.status(500).json({
            success: false,
            message: "Internal Server Error",
            error: error.message
        });
    }
};

module.exports.getInstallationsData = async(req, res) => {
    try{
        const installationsData = await InstallationData.find().sort({installationDate: -1});

        const installationsWithPhotoUrls = installationsData.map(installation => {
            const photosWithUrls = installation.photos.map(photo =>
                `${req.protocol}://${req.get("host")}/uploads/${photo}`
            );
            return {
                ...installation._doc, 
                photos: photosWithUrls,
            };
        });

        return res.status(200).json({
            success: true,
            message: "Data Fetched Successfully",
            data: installationsWithPhotoUrls || []
        }); 
    }catch(error){
        return res.status(500).json({
            success: false,
            message: "Internal Server Error",
            error: error.message
        });
    }
};



