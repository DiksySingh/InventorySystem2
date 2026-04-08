const OTP = require("../../models/serviceInventoryModels/otpVerificationSchema.js");
const InstallationData = require("../../models/serviceInventoryModels/installationDataSchema.js");
const PickupItem = require("../../models/serviceInventoryModels/pickupItemSchema.js");
const Warehouse = require("../../models/serviceInventoryModels/warehouseSchema.js");
const OutgoingItemDetails = require("../../models/serviceInventoryModels/outgoingItemsTotal.js");
const ServicePerson = require("../../models/serviceInventoryModels/servicePersonSchema.js");
const NewSystemInstallation = require("../../models/systemInventoryModels/newSystemInstallationSchema.js");
const sendOtp = require("../../helpers/pdf/otpGeneration.js");
const handleBase64Images = require("../../middlewares/base64ImageHandler.js");
const Stage = require("../../models/systemInventoryModels/stageSchema.js");
const Remarks = require("../../models/systemInventoryModels/remarksSchema.js");
const XLSX = require("xlsx");

module.exports.getPickupItemData = async (req, res) => {
  try {
    const { pickupItemId } = req.query || req.body;
    if (!pickupItemId) {
      return res.status(400).json({
        success: false,
        message: "PickupItemId Not Found",
      });
    }

    const pickupItemData = await PickupItem.findById({
      _id: pickupItemId,
    }).select({
      servicePerson: 0,
      servicePersonName: 0,
      servicePerContact: 0,
      image: 0,
      warehouse: 0,
      withoutRMU: 0,
      rmuRemark: 0,
      remark: 0,
      status: 0,
      incoming: 0,
      approvedBy: 0,
      pickupDate: 0,
      __v: 0,
    });
    return res.status(200).json({
      success: true,
      message: "Data Fetched Successfully",
      data: pickupItemData || [],
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message,
    });
  }
};

module.exports.createInstallationData = async (req, res) => {
  try {
    const {
      pickupItemId,
      farmerName,
      farmerContact,
      farmerVillage,
      items,
      serialNumber,
      photos,
      longitude,
      latitude,
      installationDone,
      installationDate,
    } = req.body;
    const servicePersonId = req.user._id;
    const servicePersonName = req.user.name;
    //const itemsData = JSON.parse(items);

    if (
      !pickupItemId ||
      !farmerName ||
      !farmerContact ||
      !farmerVillage ||
      !items ||
      !serialNumber ||
      !installationDate
    ) {
      return res.status(400).json({
        success: false,
        message: "All fields are required",
      });
    }

    if (!photos || photos.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No photos uploaded",
      });
    }

    const savedPhotos = await handleBase64Images(photos);

    const pickupItemData = await PickupItem.findById({ _id: pickupItemId });
    if (!pickupItemData) {
      return res.status(400).json({
        success: false,
        message: "Pickup Item Data Not Found",
      });
    }

    const warehouseData = await Warehouse.findOne({
      warehouseName: pickupItemData.warehouse,
    });
    const outgoingOrderDetails = await OutgoingItemDetails.findOne({
      servicePerson: servicePersonId,
    });
    if (!outgoingOrderDetails) {
      return res.status(400).json({
        success: false,
        message: "Outgoing items for the service person is not available",
      });
    }

    const photoUrls = savedPhotos.map(
      (file) => `${req.protocol}://${req.get("host")}/uploads/${file.fileName}`,
    );

    if (pickupItemData.incoming === false) {
      for (let item of items) {
        const matchingItem = outgoingOrderDetails.items.find(
          (i) => i.itemName === item.itemName,
        );

        if (matchingItem.quantity < item.quantity) {
          return res.status(400).json({
            success: false,
            message: `Not enough quantity for ${item.itemName}`,
          });
        }

        if (matchingItem.quantity === item.quantity) {
          matchingItem.quantity = 0;
        } else {
          matchingItem.quantity -= item.quantity;
        }
      }
    }

    const newInstallation = new InstallationData({
      warehouseId: warehouseData._id,
      servicePersonId: servicePersonId,
      farmerName,
      farmerContact: Number(farmerContact),
      farmerVillage,
      items: items,
      serialNumber,
      photos: photoUrls,
      longitude: longitude || "",
      latitude: latitude || "",
      installationDone,
      installedBy: servicePersonName,
      installationDate,
    });

    const installationData = await newInstallation.save();
    pickupItemData.installationId = installationData._id;
    pickupItemData.installationDone = true;

    await pickupItemData.save();
    await outgoingOrderDetails.save();

    return res.status(200).json({
      success: true,
      message: "Data Logged Successfully",
      data: installationData,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message,
    });
  }
};

module.exports.sendOtp = async (req, res) => {
  try {
    const { installationId } = req.query;
    const installationData = await InstallationData.findById({
      _id: installationId,
    });
    if (!installationData) {
      return res.status(404).json({
        success: false,
        message: "Installation Data Not Found",
      });
    }

    const phoneNumber = Number(installationData.farmerContact);
    const otpGenerate = Math.floor(100000 + Math.random() * 900000);
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
    const newOtpData = new OTP({
      phoneNumber: phoneNumber,
      otp: otpGenerate,
      otpVerified: false,
      expiresAt: expiresAt,
      createdAt: new Date(),
    });
    const otpData = await newOtpData.save();
    installationData.otpRecordId = otpData._id;
    await installationData.save();

    const result = await sendOtp(phoneNumber, otpGenerate);
    if (result.success) {
      return res.status(200).json({
        success: true,
        message: "OTP sent successfully",
        installationData,
        otpData,
      });
    } else {
      return res.status(500).json({
        success: false,
        message: "Failed to send OTP",
        error: result.error,
      });
    }
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message,
    });
  }
};

module.exports.verifyOtp = async (req, res) => {
  try {
    const { installationId, phoneNumber, otp } = req.body;
    if (!installationId || !phoneNumber || !otp) {
      return res.status(400).json({
        success: false,
        message: "All fields are required",
      });
    }

    const installationData = await InstallationData.findById({
      _id: installationId,
    });

    const otpRecordId = installationData.otpRecordId;
    const otpRecord = await OTP.findById({ _id: otpRecordId });

    if (otpRecord.phoneNumber !== phoneNumber || otpRecord.otp !== otp) {
      return res.status(400).json({
        success: false,
        message: "Invalid OTP",
      });
    }

    if (otpRecord.otpVerified) {
      return res.status(400).json({
        success: false,
        message: "OTP has already been verified",
      });
    }

    if (otpRecord.expiresAt < new Date()) {
      return res.status(400).json({
        success: false,
        message: "OTP has expired.",
      });
    }

    otpRecord.otpVerified = true;
    installationData.status = true;

    await otpRecord.save();
    await installationData.save();

    return res.status(200).json({
      success: true,
      message: "OTP Verified Successfully",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message,
    });
  }
};

module.exports.resendOtp = async (req, res) => {
  try {
    const { installationId } = req.query;
    if (!installationId) {
      return res.status(400).json({
        success: false,
        message: "PickupItem ID Not Found",
      });
    }

    const installationData = await InstallationData.findById({
      _id: installationId,
    });
    const otpRecordId = installationData.otpRecordId;
    const existingOtpRecord = await OTP.findById({ _id: otpRecordId });
    if (!existingOtpRecord) {
      return res.status(404).json({
        success: false,
        message: "OTP record not found",
      });
    }
    const newOtp = Math.floor(100000 + Math.random() * 900000);
    const newExpiresAt = new Date(Date.now() + 5 * 60 * 1000);

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
    } else {
      return res.status(500).json({
        success: false,
        message: "Failed to resend OTP",
        error: result
          ? result.message
          : "Unknown error occurred while sending OTP",
      });
    }
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message,
    });
  }
};

module.exports.getInstallationsData = async (req, res) => {
  try {
    const allInstallationsData = await InstallationData.find().sort({
      installationDate: -1,
    });

    // const installationsWithPhotoUrls = installationsData.map(installation => {
    //     const photosWithUrls = installation.photos.map(photo =>
    //         `${req.protocol}://${req.get("host")}/uploads/${photo}`
    //     );
    //     return {
    //         ...installation._doc,
    //         photos: photosWithUrls,
    //     };
    // });

    return res.status(200).json({
      success: true,
      message: "Data Fetched Successfully",
      data: allInstallationsData || [],
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message,
    });
  }
};

module.exports.getWarehouseInstallationData = async (req, res) => {
  try {
    const warehouseId = req.user.warehouse;
    if (!warehouseId) {
      return res.status(400).json({
        success: false,
        message: "WarehouseId Not Found",
      });
    }

    const installationData = await InstallationData.find({
      warehouseId: warehouseId,
    }).sort({ installationDate: -1 });
    return res.status(200).json({
      success: true,
      message: "Installation Data Fetched Successfully",
      data: installationData || [],
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message,
    });
  }
};

module.exports.getServicePersonInstallationData = async (req, res) => {
  try {
    const servicePersonId = req.user._id;
    if (!servicePersonId) {
      return res.status(400).json({
        success: false,
        message: "ServicePersonId Not Found",
      });
    }

    const installationData = await InstallationData.find({
      servicePersonId: servicePersonId,
    }).sort({ installationDate: -1 });
    return res.status(200).json({
      success: true,
      message: "Data Fetched Successfully",
      data: installationData || [],
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message,
    });
  }
};

module.exports.checkServicePersonLatLong = async (req, res) => {
  try {
    const servicePersonId = req.query;
    if (!servicePersonId) {
      return res.status(400).json({
        success: false,
        message: "ServicePerson ID Not Found",
      });
    }
    let isLatLong;
    const servicePersonData = await ServicePerson.findOne({
      _id: servicePersonId,
    });
    if (servicePersonData) {
      if (
        servicePersonData.longitude !== null &&
        servicePersonData.latitude !== null
      ) {
        isLatLong = true;
      } else {
        isLatLong = false;
      }
    }

    return res.status(200).json({
      success: true,
      message: "Data Fetched Successfully",
      isLatLong: isLatLong,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message,
    });
  }
};

module.exports.addStage = async (req, res) => {
  try {
    const { stage } = req.body;

    if (!stage) {
      return res.status(400).json({
        success: false,
        message: "Stage is required",
      });
    }

    // Optional: prevent duplicate stage
    const existingStage = await Stage.findOne({ stage: stage.trim() });

    if (existingStage) {
      return res.status(409).json({
        success: false,
        message: "Stage already exists",
      });
    }

    const newStage = new Stage({
      stage: stage.trim(),
    });

    await newStage.save();

    return res.status(201).json({
      success: true,
      message: "Stage added successfully",
      data: newStage,
    });
  } catch (error) {
    console.error("Add Stage Error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

module.exports.getAllStages = async (req, res) => {
  try {
    const stages = await Stage.find().select("_id stage");

    return res.status(200).json({
      success: true,
      count: stages.length,
      data: stages,
    });
  } catch (error) {
    console.error("Get Stages Error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

module.exports.addRemark = async (req, res) => {
  try {
    const { remark } = req.body;

    if (!remark) {
      return res.status(400).json({
        success: false,
        message: "Remark is required",
      });
    }

    const existingRemark = await Remarks.findOne({ remark: remark.trim() });

    if (existingRemark) {
      return res.status(409).json({
        success: false,
        message: "Remark already exists",
      });
    }

    const newRemark = new Remarks({
      remark: remark.trim(),
    });

    await newRemark.save();

    return res.status(201).json({
      success: true,
      message: "Remark added successfully",
      data: newRemark,
    });
  } catch (error) {
    console.error("Add Remark Error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

module.exports.getAllRemarks = async (req, res) => {
  try {
    const remarks = await Remarks.find().select("_id remark");

    return res.status(200).json({
      success: true,
      count: remarks.length,
      data: remarks,
    });
  } catch (error) {
    console.error("Get Stages Error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

module.exports.exportVT2ApprovedExcel = async (req, res) => {
  try {
    const VT2_APPROVED_STAGE_ID = "69b28076d994f4a0d866607e";

    const data = await NewSystemInstallation.find({
      state: "Maharashtra",
      stageId: VT2_APPROVED_STAGE_ID,
    })
      .populate("stageId", "_id stage")
      .lean();

    if (!data.length) {
      return res.status(404).json({
        success: false,
        message: "No VT-2 Approved data found",
      });
    }

    const formattedData = data.map((item) => ({
      "Beneficiary ID": item.farmerSaralId,
      Stage: item.stageId?.stage,
    }));

    const worksheet = XLSX.utils.json_to_sheet(formattedData);

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Approved By VT-2");

    const buffer = XLSX.write(workbook, {
      type: "buffer",
      bookType: "xlsx",
    });

    res.setHeader(
      "Content-Disposition",
      "attachment; filename=VT2_Approved_Installations.xlsx",
    );
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );

    res.send(buffer);
  } catch (error) {
    console.error("Export Error:", error);
    res.status(500).json({
      success: false,
      message: "Error exporting Excel",
    });
  }
};

module.exports.exportInstalledSystemExcel = async (req, res) => {
  try {
    const data = await NewSystemInstallation.find({
      state: "Maharashtra"
    }).lean();

    if (!data.length) {
      return res.status(404).json({
        success: false,
        message: "No VT-2 Approved data found",
      });
    }

    const formattedData = data.map((item) => ({
      "Beneficiary ID": item.farmerSaralId,
    }));

    const worksheet = XLSX.utils.json_to_sheet(formattedData);

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Installed_System_Data");

    const buffer = XLSX.write(workbook, {
      type: "buffer",
      bookType: "xlsx",
    });

    res.setHeader(
      "Content-Disposition",
      "attachment; filename=Installed_System.xlsx",
    );
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );

    res.send(buffer);
  } catch (error) {
    console.error("Export Error:", error);
    res.status(500).json({
      success: false,
      message: "Error exporting Excel",
    });
  }
};
