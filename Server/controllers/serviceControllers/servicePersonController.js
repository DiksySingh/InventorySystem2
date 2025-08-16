const axios = require("axios");
const processExcelFile = require("../../util/Excel/excelProcess");
const ServicePerson = require("../../models/serviceInventoryModels/servicePersonSchema");
const SurveyPerson = require("../../models/serviceInventoryModels/surveyPersonSchema");
const PickupItem = require("../../models/serviceInventoryModels/pickupItemSchema");
const imageHandlerWithPath = require("../../middlewares/imageHandlerWithPath");
const FarmerItemsActivity = require("../../models/systemInventoryModels/farmerItemsActivity");
const NewSystemInstallation = require("../../models/systemInventoryModels/newSystemInstallationSchema");
const EmpInstallationAccount = require("../../models/systemInventoryModels/empInstallationItemAccount");
const ExcelJS = require("exceljs");
const mongoose = require("mongoose");
const fs = require("fs/promises");
const path = require("path");
const { save } = require("pdfkit");

const BASE_URL = process.env.BASE_URL;
const buildFullURLs = (pathsArray) => {
  if (!pathsArray || !Array.isArray(pathsArray)) return [];
  return pathsArray.map((path) => `${BASE_URL}${path}`);
};
const updateLatitudeLongitude = async (req, res) => {
  try {
    const fileBuffer = req.file.buffer;
    if (!fileBuffer) {
      return res.status(400).json({
        success: false,
        message: "File Not Found",
      });
    }

    const result = processExcelFile(fileBuffer);
    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: "Failed to process Excel file",
        error: result.error,
      });
    }

    const sheetData = result.data;

    for (const row of sheetData) {
      //const { contact, district, block, longitude, latitude } = row;
      const { contact, latitude, longitude } = row;

      if (!contact || !latitude || !longitude) {
        console.log(`Skipping row with missing fields: ${JSON.stringify(row)}`);
        continue;
      }
      let phoneNumber = parseInt(contact);
      //let blockArray = block.split("-").map((b) => b.trim());

      const updatedPerson = await ServicePerson.findOneAndUpdate(
        { contact: phoneNumber },
        { latitude, longitude },
        { new: true, upsert: false }
      );

      if (!updatedPerson) {
        console.log(`Contact ${contact} not found in the database.`);
      }
    }

    return res.status(200).json({
      success: true,
      message: "Data from Excel file added/updated successfully",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message,
    });
  }
};

const addServicePersonState = async (req, res) => {
  try {
    const fileBuffer = req.file.buffer;
    if (!fileBuffer) {
      return res.status(400).json({
        success: false,
        message: "File Not Found",
      });
    }

    const result = processExcelFile(fileBuffer);
    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: "Failed to process Excel file",
        error: result.error,
      });
    }

    const sheetData = result.data;

    for (const row of sheetData) {
      const { contact, state } = row;

      if (!contact || !state) {
        console.log(`Skipping row with missing fields: ${JSON.stringify(row)}`);
        continue;
      }
      let phoneNumber = parseInt(contact);

      const updatedPerson = await ServicePerson.findOneAndUpdate(
        { contact: phoneNumber },
        { state },
        { new: true, upsert: false }
      );

      if (!updatedPerson) {
        console.log(`Contact ${contact} not found in the database.`);
      }
    }

    return res.status(200).json({
      success: true,
      message: "Data from Excel file added/updated successfully",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message,
    });
  }
};

const showNewInstallationDataToInstaller = async (req, res) => {
  try {
    const installerId = req.query.installerId || req.user?.id;
    console.log(installerId);
    if (!installerId) {
      throw new Error("Employee ID is not valid");
    }
    const activities = await FarmerItemsActivity.find({
      empId: installerId,
      accepted: false,
    })
      .populate({
        path: "warehouseId",
        select: {
          warehouseName: 1,
        },
      })
      .populate({
        path: "empId",
        select: {
          name: 1,
        },
      })
      .populate({
        path: "systemId",
        select: {
          systemName: 1,
        },
      })
      .populate({
        path: "itemsList.systemItemId", // Populate subItem details
        model: "SystemItem",
        select: {
          _id: 1,
          itemName: 1,
        },
      })
      .populate({
        path: "extraItemsList.systemItemId",
        model: "SystemItem",
        select: {
          _id: 1,
          itemName: 1,
        },
      })
      .sort({ createdAt: -1 });
    console.log(activities);
    const activitiesWithFarmerDetails = await Promise.all(
      activities.map(async (activity) => {
        try {
          const saralId = activity.farmerSaralId;
          const response = await axios.get(
            `http://88.222.214.93:8001/farmer/showFarmerAccordingToSaralId?saralId=${saralId}`
          );

          return {
            ...activity.toObject(),
            farmerDetails: response?.data?.data || null,
          };
        } catch (err) {
          console.error(
            `Failed for saralId ${activity.farmerSaralId}:`,
            err.message
          );
          return {
            ...activity.toObject(),
            farmerDetails: null, // fallback
          };
        }
      })
    );

    console.log(activitiesWithFarmerDetails);

    return res.status(200).json({
      success: true,
      message: "Data Fetched Successfully",
      data: activitiesWithFarmerDetails || [],
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message,
    });
  }
};

const updateStatusOfIncomingItems = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { installationId, farmerSaralId } = req.body;
    const empId = req.body.empId || req.user?.id;
    console.log("empId:", empId);
    console.log("farmerSaralId:", farmerSaralId);
    console.log("installationId:", installationId);

    if (!installationId || !farmerSaralId || !empId) {
      await session.abortTransaction();
      return res
        .status(400)
        .json({ success: false, message: "All fields are required" });
    }

    const query = {
      _id: new mongoose.Types.ObjectId(installationId),
      farmerSaralId: farmerSaralId,
      empId: new mongoose.Types.ObjectId(empId),
    };

    const farmerActivityData = await FarmerItemsActivity.findOne(query)
      .populate("itemsList.systemItemId", "itemName")
      .populate("extraItemsList.systemItemId", "itemName")
      .session(session);

    console.log("farmerActivityData:", farmerActivityData);
    if (!farmerActivityData) {
      await session.abortTransaction();
      return res
        .status(400)
        .json({ success: false, message: "Farmer Activity Data Not Found" });
    }

    if (farmerActivityData.accepted) {
      await session.abortTransaction();
      return res
        .status(400)
        .json({ success: false, message: "Farmer Activity Already Accepted" });
    }

    if (farmerActivityData.installationDone) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: "Farmer Activity Already Installation Done",
      });
    }

    let empAccount = await EmpInstallationAccount.findOne({ empId })
      .session(session)
      .populate("itemsList.systemItemId", "itemName");
    console.log("empAccount:", empAccount);
    let refType;
    let empData = await ServicePerson.findOne({ _id: empId }).session(session);
    if (empData) {
      refType = "ServicePerson";
    } else {
      empData = await SurveyPerson.findOne({ _id: empId }).session(session);
      if (!empData) {
        await session.abortTransaction();
        return res
          .status(400)
          .json({ success: false, message: "EmpID Not Found In Database" });
      }
      refType = "SurveyPerson";
    }

    if (!empAccount) {
      empAccount = new EmpInstallationAccount({
        empId,
        referenceType: refType,
        incoming: false,
        itemsList: [],
        createdBy: empId,
      });
    }

    // Process normal items
    for (const item of farmerActivityData.itemsList) {
      const { systemItemId, quantity } = item;
      const index = empAccount.itemsList.findIndex(
        (i) => i.systemItemId.toString() === systemItemId.toString()
      );
      if (index !== -1) {
        empAccount.itemsList[index].quantity += parseInt(quantity);
      } else {
        empAccount.itemsList.push({
          systemItemId,
          quantity: parseInt(quantity),
        });
      }
    }

    empAccount.updatedAt = new Date();
    empAccount.updatedBy = empId;
    await empAccount.save({ session });
    console.log("empAccount after saving:", empAccount);
    // Process extra items
    if (farmerActivityData.extraItemsList?.length > 0) {
      for (const item of farmerActivityData.extraItemsList) {
        const { systemItemId, quantity } = item;
        const index = empAccount.itemsList.findIndex(
          (i) => i.systemItemId.toString() === systemItemId.toString()
        );
        if (index !== -1) {
          empAccount.itemsList[index].quantity += parseInt(quantity);
        } else {
          empAccount.itemsList.push({
            systemItemId,
            quantity: parseInt(quantity),
          });
        }
      }

      empAccount.updatedAt = new Date();
      empAccount.updatedBy = empId;
      await empAccount.save({ session });
    }

    const savedResponse = await FarmerItemsActivity.findByIdAndUpdate(
      installationId,
      {
        $set: {
          accepted: true,
          approvalDate: new Date(),
          updatedAt: new Date(),
          updatedBy: empId,
        },
      },
      { session },
      { new: true }
    );
    console.log("Farmer Activity Updated Successfully", savedResponse);
    await session.commitTransaction();
    session.endSession();

    return res.status(200).json({
      success: true,
      message: "Farmer Activity Updated Successfully",
      data: "Farmer Activity Updated Successfully",
    });
  } catch (error) {
    console.error("Error in updateStatusOfIncomingItems:", error);
    await session.abortTransaction();
    session.endSession();
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message,
    });
  }
};

const newSystemInstallation = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  const uploadedFilePaths = []; // For file deletion
  const storedFileURLs = {}; // For storing relative paths to DB

  const deleteFiles = async (filePaths) => {
    for (const filePath of filePaths) {
      try {
        await fs.unlink(filePath);
      } catch (err) {
        console.error("File deletion failed:", err.message);
      }
    }
  };

  try {
    const { farmerSaralId, latitude, longitude } = req.body;
    const empId = req.body.empId || req.user?.id; // Get empId from query or user context
    const state = req.body.state || req.user?.state; // Get state from query or user context
    console.log("empId:", empId);
    console.log("farmerSaralId:", farmerSaralId);
    console.log("latitude:", latitude);
    console.log("longitude:", longitude);
    console.log("state:", state);

    const requiredFiles = [
      "pitPhoto",
      "earthingFarmerPhoto",
      "antiTheftNutBoltPhoto",
      "lightingArresterInstallationPhoto",
      "finalFoundationFarmerPhoto",
      "panelFarmerPhoto",
      "controllerBoxFarmerPhoto",
      "waterDischargeFarmerPhoto",
      "installationVideo", // Added installationVideo
    ];

    // for (const field of requiredFiles) {
    //     const files = req.files[field];
    //     if (!files || files.length === 0) {
    //         await session.abortTransaction();
    //         session.endSession();
    //         await deleteFiles(uploadedFilePaths);
    //         return res.status(400).json({ success: false, message: `Missing or empty files: ${field}` });
    //     }

    //     storedFileURLs[field] = [];

    //     for (const file of files) {
    //         const serverPath = path.join(__dirname, "../uploads/newInstallation", file.filename);
    //         const urlPath = `/uploads/newInstallation/${file.filename}`;

    //         uploadedFilePaths.push(serverPath);
    //         storedFileURLs[field].push(urlPath);
    //     }
    // }

    for (const field of requiredFiles) {
      const files = req.files?.[field];

      // If field is not uploaded, just skip it (don't abort)
      if (!files || files.length === 0) {
        continue; // optional field: no error
      }

      storedFileURLs[field] = [];

      for (const file of files) {
        const serverPath = path.join(
          __dirname,
          "../uploads/newInstallation",
          file.filename
        );
        const urlPath = `/uploads/newInstallation/${file.filename}`;

        uploadedFilePaths.push(serverPath);
        storedFileURLs[field].push(urlPath);
      }
    }
    console.log("storedFileURLs:", storedFileURLs);

    if (!farmerSaralId || !latitude || !longitude || !empId || !state) {
      await session.abortTransaction();
      session.endSession();
      await deleteFiles(uploadedFilePaths);
      return res.status(400).json({
        success: false,
        message: "All fields are required.",
      });
    }

    let refType;
    let empData = await ServicePerson.findOne({ _id: empId }).session(session);
    if (empData) {
      refType = "ServicePerson";
    } else {
      empData = await SurveyPerson.findOne({ _id: empId }).session(session);
      if (!empData) {
        await session.abortTransaction();
        session.endSession();
        await deleteFiles(uploadedFilePaths);
        return res.status(400).json({
          success: false,
          message: "EmpID Not Found In Database",
        });
      }
      refType = "SurveyPerson";
    }

    const newInstallationData = {
      referenceType: refType,
      farmerSaralId,
      latitude,
      longitude,
      state,
      pitPhoto: storedFileURLs.pitPhoto || [],
      earthingFarmerPhoto: storedFileURLs.earthingFarmerPhoto || [],
      antiTheftNutBoltPhoto: storedFileURLs.antiTheftNutBoltPhoto || [],
      lightingArresterInstallationPhoto:
        storedFileURLs.lightingArresterInstallationPhoto || [],
      finalFoundationFarmerPhoto:
        storedFileURLs.finalFoundationFarmerPhoto || [],
      panelFarmerPhoto: storedFileURLs.panelFarmerPhoto || [],
      controllerBoxFarmerPhoto: storedFileURLs.controllerBoxFarmerPhoto || [],
      waterDischargeFarmerPhoto: storedFileURLs.waterDischargeFarmerPhoto || [],
      installationVideo: storedFileURLs.installationVideo || [], // Added installationVideo
      createdBy: empId,
    };

    const newInstallation = new NewSystemInstallation(newInstallationData);
    console.log("New Installation Data:", newInstallationData);
    const savedResponse = await newInstallation.save({ session });
    console.log("Saved New Installation Response:", savedResponse);
    const farmerActivity = await FarmerItemsActivity.findOne({
      farmerSaralId,
    }).session(session);
    if (!farmerActivity) {
      await session.abortTransaction();
      session.endSession();
      await deleteFiles(uploadedFilePaths);
      return res.status(400).json({
        success: false,
        message: "Farmer Activity Not Found",
      });
    }

    const empAccount = await EmpInstallationAccount.findOne({
      empId: farmerActivity.empId,
    })
      .populate({
        path: "itemsList.systemItemId",
        select: "itemName",
      })
      .session(session);

    if (!empAccount) {
      await session.abortTransaction();
      session.endSession();
      await deleteFiles(uploadedFilePaths);
      return res.status(400).json({
        success: false,
        message: "Employee Account Not Found",
      });
    }

    for (const item of farmerActivity.itemsList) {
      const { systemItemId, quantity } = item;
      const existingItem = empAccount.itemsList.find(
        (i) => i.systemItemId._id.toString() === systemItemId.toString()
      );

      if (!existingItem) {
        await session.abortTransaction();
        session.endSession();
        await deleteFiles(uploadedFilePaths);
        return res.status(404).json({
          success: false,
          message: "Item Not Found In Employee Account",
        });
      }
      console.log("existingItem", existingItem);
      if (parseInt(existingItem.quantity) < parseInt(quantity)) {
        await session.abortTransaction();
        session.endSession();
        await deleteFiles(uploadedFilePaths);
        return res.status(400).json({
          success: false,
          message: "Insufficient Quantity in Employee Account",
        });
      }

      existingItem.quantity =
        parseInt(existingItem.quantity) - parseInt(quantity);
    }

    if (
      farmerActivity.extraItemsList &&
      farmerActivity.extraItemsList.length > 0
    ) {
      for (const item of farmerActivity.extraItemsList) {
        const { systemItemId, quantity } = item;
        const existingItem = empAccount.itemsList.find(
          (i) => i.systemItemId._id.toString() === systemItemId.toString()
        );

        if (!existingItem) {
          await session.abortTransaction();
          session.endSession();
          await deleteFiles(uploadedFilePaths);
          return res.status(404).json({
            success: false,
            message: "Item Not Found In Employee Account",
          });
        }

        if (parseInt(existingItem.quantity) < parseInt(quantity)) {
          await session.abortTransaction();
          session.endSession();
          await deleteFiles(uploadedFilePaths);
          return res.status(400).json({
            success: false,
            message: "Insufficient Quantity in Employee Account",
          });
        }

        existingItem.quantity =
          parseInt(existingItem.quantity) - parseInt(quantity);
      }
    }

    empAccount.updatedAt = new Date();
    empAccount.updatedBy = empId;
    await empAccount.save({ session });

    farmerActivity.installationDone = true;
    farmerActivity.updatedAt = new Date();
    farmerActivity.updatedBy = empId;
    await farmerActivity.save({ session });

    await session.commitTransaction();
    session.endSession();

    return res.status(200).json({
      success: true,
      message: "Installation Data & Farmer Activity Saved/Updated Successfully",
      data: "Installation Data & Farmer Activity Saved/Updated Successfully",
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    await deleteFiles(uploadedFilePaths);
    console.error("Error in newSystemInstallation:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message,
    });
  }
};

// const showAcceptedInstallationData = async (req, res) => {
//     try {
//         const empId = req.query.empId || req.user?.id;
//         console.log("empId:", empId);
//         const activities = await FarmerItemsActivity.find({ empId, accepted: true })
//             .populate({
//                 path: "warehouseId",
//                 select: {
//                     "warehouseName": 1,
//                 }
//             })
//             .populate({
//                 path: "empId",
//                 select: {
//                     "name": 1,
//                 }
//             })
//             .populate({
//                 path: "systemId",
//                 select: {
//                     "systemName": 1,
//                 }
//             })
//             .populate({
//                 path: "itemsList.systemItemId", // Populate subItem details
//                 model: "SystemItem",
//                 select: ({
//                     "_id": 1,
//                     "itemName": 1,
//                 })
//             })
//             .populate({
//                 path: "extraItemsList.systemItemId", // Populate subItem details
//                 model: "SystemItem",
//                 select: ({
//                     "_id": 1,
//                     "itemName": 1,
//                 })
//             }).sort({ approvalDate: -1 });
//             console.log("Activities:", activities);
//         const activitiesWithFarmerDetails = await Promise.all(
//             activities.map(async (activity) => {
//                 const response = await axios.get(
//                     `http://88.222.214.93:8001/farmer/showFarmerAccordingToSaralId?saralId=${activity.farmerSaralId}`,
//                 );
//                 if (response) {
//                     return {
//                         ...activity.toObject(),
//                         farmerDetails: (response?.data?.data) ? response?.data?.data : null, // Assuming the farmer API returns farmer details
//                     };
//                 }
//             })
//         );
//         console.log("Activities with Farmer Details:", activitiesWithFarmerDetails);
//         return res.status(200).json({
//             success: true,
//             message: "Data Fetched Successfully",
//             data: activitiesWithFarmerDetails || []
//         });
//     } catch (error) {
//         console.error("Error in showAcceptedInstallationData:", error);
//         return res.status(500).json({
//             success: false,
//             message: "Internal Server Error",
//             error: error.message
//         });
//     }
// };

const showAcceptedInstallationData = async (req, res) => {
  try {
    const empId = req.query.empId || req.user?.id;
    console.log("empId:", empId);

    const activities = await FarmerItemsActivity.find({ empId, accepted: true })
      .populate({ path: "warehouseId", select: { warehouseName: 1 } })
      .populate({ path: "empId", select: { name: 1 } })
      .populate({ path: "systemId", select: { systemName: 1 } })
      .populate({
        path: "itemsList.systemItemId",
        model: "SystemItem",
        select: { _id: 1, itemName: 1 },
      })
      .populate({
        path: "extraItemsList.systemItemId",
        model: "SystemItem",
        select: { _id: 1, itemName: 1 },
      })
      .sort({ approvalDate: -1 })
      .lean();

    const activitiesWithFarmerDetails = await Promise.all(
      activities.map(async (activity) => {
        try {
          const response = await axios.get(
            `http://88.222.214.93:8001/farmer/showFarmerAccordingToSaralId?saralId=${activity.farmerSaralId}`,
            { timeout: 5000 }
          );
          return {
            ...activity,
            farmerDetails: response?.data?.data || null,
          };
        } catch (err) {
          console.error(
            `Error fetching farmer data for ${activity.farmerSaralId}:`,
            err.message
          );
          return {
            ...activity,
            farmerDetails: null,
          };
        }
      })
    );

    return res.status(200).json({
      success: true,
      message: "Data Fetched Successfully",
      data: activitiesWithFarmerDetails,
    });
  } catch (error) {
    console.error("Error in showAcceptedInstallationData:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message,
    });
  }
};

const empDashboard = async (req, res) => {
  try {
    const empId = req.query.empId || req.user?.id;

    if (!empId) {
      return res.status(400).json({
        success: false,
        message: "empId is required",
      });
    }

    const empObjectId = new mongoose.Types.ObjectId(empId);
    let refPath;
    const empDetails = await ServicePerson.findOne({ _id: empObjectId });
    if (empDetails) {
      refPath = "ServicePerson";
    } else {
      const surveyPersonDetails = await SurveyPerson.findOne({
        _id: empObjectId,
      });
      if (!surveyPersonDetails) {
        return res.status(400).json({
          success: false,
          message: "Employee Not Found",
        });
      }
      refPath = "SurveyPerson";
    }

    const empData = await EmpInstallationAccount.findOne({
      empId: empObjectId,
    })
      .populate({
        path: "empId", // dynamic population
        model: refPath,
        select: { name: 1 },
      })
      .populate({
        path: "itemsList.systemItemId",
        model: "SystemItem",
        select: { _id: 1, itemName: 1 },
      })
      .select(
        "-_id -__v -createdAt -updatedAt -createdBy -updatedBy -incoming"
      );

    if (empData) {
      empData.itemsList = empData.itemsList.filter((item) => item.quantity > 0);
    }

    return res.status(200).json({
      success: true,
      message: "Employee Account Fetched Successfully",
      data: empData || [],
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message,
    });
  }
};

// const getInstallationDataWithImages = async (req, res) => {
//     try {
//         const data = await NewSystemInstallation.find();
//         let transformedData = [];
//         if (data) {
//             transformedData = data.map(install => ({
//                 ...install.toObject(),
//                 pitPhoto: buildFullURLs(install.pitPhoto),
//                 earthingFarmerPhoto: buildFullURLs(install.earthingFarmerPhoto),
//                 antiTheftNutBoltPhoto: buildFullURLs(install.antiTheftNutBoltPhoto),
//                 lightingArresterInstallationPhoto: buildFullURLs(install.lightingArresterInstallationPhoto),
//                 finalFoundationFarmerPhoto: buildFullURLs(install.finalFoundationFarmerPhoto),
//                 panelFarmerPhoto: buildFullURLs(install.panelFarmerPhoto),
//                 controllerBoxFarmerPhoto: buildFullURLs(install.controllerBoxFarmerPhoto),
//                 waterDischargeFarmerPhoto: buildFullURLs(install.waterDischargeFarmerPhoto),
//             }));
//         }

//         return res.status(200).json({
//             success: true,
//             message: "Completed Installation Data Fetched Successfully",
//             data: transformedData || [],
//         });
//     } catch (error) {
//         console.error("Error fetching installation data:", error.message);
//         return res.status(500).json({
//             success: false,
//             message: "Internal server error",
//             error: error.message
//         });
//     }
// };

// const getInstallationDataWithImages = async (req, res) => {
//     try {
//         const state = req.query.state;
//         const data = await NewSystemInstallation.find({state: state});
//         let transformedData = [];

//         if (data && data.length > 0) {
//             for (const install of data) {
//                 const installationObj = install.toObject();

//                 // Fetch related farmer activity using farmerSaralId
//                 const farmerActivity = await FarmerItemsActivity.findOne({
//                     farmerSaralId: installationObj.farmerSaralId,
//                 }).lean(); // lean() gives plain JS object

//                 transformedData.push({
//                     ...installationObj,
//                     pitPhoto: buildFullURLs(install.pitPhoto),
//                     earthingFarmerPhoto: buildFullURLs(install.earthingFarmerPhoto),
//                     antiTheftNutBoltPhoto: buildFullURLs(install.antiTheftNutBoltPhoto),
//                     lightingArresterInstallationPhoto: buildFullURLs(install.lightingArresterInstallationPhoto),
//                     finalFoundationFarmerPhoto: buildFullURLs(install.finalFoundationFarmerPhoto),
//                     panelFarmerPhoto: buildFullURLs(install.panelFarmerPhoto),
//                     controllerBoxFarmerPhoto: buildFullURLs(install.controllerBoxFarmerPhoto),
//                     waterDischargeFarmerPhoto: buildFullURLs(install.waterDischargeFarmerPhoto),

//                     // Add related farmer activity data
//                     farmerActivity: farmerActivity || null,
//                 });
//             }
//         }

//         return res.status(200).json({
//             success: true,
//             message: "Completed Installation Data Fetched Successfully",
//             data: transformedData,
//         });

//     } catch (error) {
//         console.error("Error fetching installation data:", error.message);
//         return res.status(500).json({
//             success: false,
//             message: "Internal server error",
//             error: error.message
//         });
//     }
// };

const getInstallationDataWithImages = async (req, res) => {
  try {
    const state = req.query.state;
    const data = await NewSystemInstallation.find({ state: state });
    let transformedData = [];

    if (data && data.length > 0) {
      for (const install of data) {
        const installationObj = install.toObject();

        const farmerActivity = await FarmerItemsActivity.findOne({
          farmerSaralId: installationObj.farmerSaralId,
        }).lean();

        transformedData.push({
          ...installationObj,
          pitPhoto: buildFullURLs(install.pitPhoto),
          earthingFarmerPhoto: buildFullURLs(install.earthingFarmerPhoto),
          antiTheftNutBoltPhoto: buildFullURLs(install.antiTheftNutBoltPhoto),
          lightingArresterInstallationPhoto: buildFullURLs(
            install.lightingArresterInstallationPhoto
          ),
          finalFoundationFarmerPhoto: buildFullURLs(
            install.finalFoundationFarmerPhoto
          ),
          panelFarmerPhoto: buildFullURLs(install.panelFarmerPhoto),
          controllerBoxFarmerPhoto: buildFullURLs(
            install.controllerBoxFarmerPhoto
          ),
          waterDischargeFarmerPhoto: buildFullURLs(
            install.waterDischargeFarmerPhoto
          ),
          installationVideo: buildFullURLs(install.installationVideo), // ✅ Added video field

          farmerActivity: farmerActivity || null,
        });
      }
    }

    return res.status(200).json({
      success: true,
      message: "Completed Installation Data Fetched Successfully",
      data: transformedData,
    });
  } catch (error) {
    console.error("Error fetching installation data:", error.message);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

// const updateInstallationDataWithFiles = async (req, res) => {
//     try {
//         const { installationId, latitude, longitude } = req.body;
//         const empName = req.body.empName

//         if (!installationId) {
//             return res.status(400).json({
//                 success: false,
//                 message: "Installation ID is required",
//             });
//         }

//         const existingDoc = await NewSystemInstallation.findById(installationId);
//         if (!existingDoc) {
//             return res.status(404).json({
//                 success: false,
//                 message: "Installation not found",
//             });
//         }

//         const updateData = {
//             latitude,
//             longitude,
//             updatedAt: new Date(),
//             updatedBy: empName,
//         };

//         if (req.files && Object.keys(req.files).length > 0) {
//             for (const field of Object.keys(req.files)) {
//                 const newFilePaths = req.files[field].map(file =>
//                     `/uploads/newInstallation/${file.filename}`
//                 );

//                 const oldFiles = existingDoc[field] || [];
//                 console.log("New files:", newFilePaths);
//                 console.log("Old files:", oldFiles);
//                 for (const oldPath of oldFiles) {
//                     const absolutePath = path.join(__dirname, "..", oldPath);
//                     console.log("Deleting old file:", absolutePath);
//                     try {
//                         await fs.unlink(absolutePath);
//                         console.log(`Deleted old file: ${absolutePath}`);
//                     } catch (err) {
//                         console.warn(`Could not delete old file: ${oldPath}`, err.message);
//                     }
//                 }

//                 updateData[field] = newFilePaths;
//             }
//         }

//         const updatedDoc = await NewSystemInstallation.findByIdAndUpdate(
//             installationId,
//             { $set: updateData },
//             { new: true }
//         );

//         return res.status(200).json({
//             success: true,
//             message: "Installation data updated successfully",
//             data: updatedDoc,
//         });

//     } catch (error) {
//         console.error("Error updating installation data:", error);
//         return res.status(500).json({
//             success: false,
//             message: "Internal server error",
//             error: error.message
//         });
//     }
// };

const updateInstallationDataWithFiles = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { installationId, latitude, longitude, empName } = req.body;

    if (!installationId) {
      return res
        .status(400)
        .json({ success: false, message: "Installation ID is required" });
    }

    const existingDoc = await NewSystemInstallation.findById(
      installationId
    ).session(session);
    if (!existingDoc) {
      return res
        .status(404)
        .json({ success: false, message: "Installation not found" });
    }

    const updateData = {
      latitude,
      longitude,
      updatedAt: new Date(),
      updatedBy: empName,
    };

    // Prepare rollback safety buffers
    const uploadedFilesToDelete = []; // New uploaded files in case of error
    const oldFileMap = {}; // Backup old paths for later deletion only on success

    if (req.files && Object.keys(req.files).length > 0) {
      for (const field of Object.keys(req.files)) {
        const newFilePaths = req.files[field].map((file) => {
          const newPath = `/uploads/newInstallation/${file.filename}`;
          uploadedFilesToDelete.push(path.join(__dirname, "..", newPath)); // store full path for rollback
          return newPath;
        });

        oldFileMap[field] = existingDoc[field] || [];
        updateData[field] = newFilePaths;
      }
    }

    // Step 1: Update DB with new data inside transaction
    await NewSystemInstallation.findByIdAndUpdate(
      installationId,
      { $set: updateData },
      { new: true, session }
    );

    // Step 2: Commit transaction
    await session.commitTransaction();
    session.endSession();

    // Step 3: Safe to delete old files (only after DB update success)
    for (const field in oldFileMap) {
      for (const oldPath of oldFileMap[field]) {
        const abs = path.join(__dirname, "..", oldPath);
        try {
          await fs.unlink(abs);
        } catch (err) {
          console.warn(`Failed to delete old file ${oldPath}`, err.message);
        }
      }
    }

    return res.status(200).json({
      success: true,
      message: "Installation data updated successfully",
      data: { ...existingDoc.toObject(), ...updateData },
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();

    // Rollback: Delete newly uploaded files
    if (req.files) {
      for (const filePath of Object.values(req.files).flat()) {
        const fullPath = path.join(
          __dirname,
          "..",
          "uploads/newInstallation",
          filePath.filename
        );
        try {
          await fs.unlink(fullPath);
        } catch (err) {
          console.warn("Rollback failed to delete uploaded file:", fullPath);
        }
      }
    }

    console.error("Error updating installation data:", error.message);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

const pickupItemsByServicePerson = async (req, res) => {
  try {
    const pickupItems = await PickupItem.find({
      servicePerson: {
        $in: [
          new mongoose.Types.ObjectId("672c6ac23792ce997f066f55"),
          new mongoose.Types.ObjectId("672c6a153792ce997f066f40"),
        ],
      },
      incoming: true,
    })
      .populate("servicePerson")
      .lean();

    if (!pickupItems.length) {
      return res.status(404).json({
        success: false,
        message: "No data found for this service person",
      });
    }

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Pickup Items");

    worksheet.columns = [
      { header: "Service Person Name", key: "servicePersonName", width: 25 },
      { header: "Service Person Contact", key: "servicePerContact", width: 20 },
      { header: "Farmer Name", key: "farmerName", width: 25 },
      { header: "Farmer Contact", key: "farmerContact", width: 20 },
      { header: "Farmer Village", key: "farmerVillage", width: 20 },
      { header: "Farmer Saral ID", key: "farmerSaralId", width: 20 },
      { header: "Warehouse", key: "warehouse", width: 20 },
      { header: "Serial Number", key: "serialNumber", width: 20 },
      { header: "Items", key: "items", width: 40 },
      { header: "Total Quantity", key: "totalQuantity", width: 15 },
      { header: "Pickup Date", key: "pickupDate", width: 20 },
      { header: "Arrived Date", key: "arrivedDate", width: 20 },
      { header: "Installation Done", key: "installationDone", width: 20 },
      { header: "Is New Stock", key: "isNewStock", width: 20 },
      { header: "Remark", key: "remark", width: 25 },
    ];

    pickupItems.forEach((item) => {
      const itemsList =
        item.items?.map((i) => `${i.itemName} x ${i.quantity}`).join(", ") ||
        "";

      const totalQuantity =
        item.items?.reduce((sum, i) => sum + (i.quantity || 0), 0) || 0;

      worksheet.addRow({
        servicePersonName: item.servicePerson?.name,
        servicePerContact: item.servicePerContact?.contact,
        farmerName: item.farmerName,
        farmerContact: item.farmerContact,
        farmerVillage: item.farmerVillage,
        farmerSaralId: item.farmerSaralId,
        warehouse: item.warehouse,
        serialNumber: item.serialNumber,
        items: itemsList,
        totalQuantity,
        pickupDate: item.pickupDate
          ? new Date(item.pickupDate).toLocaleDateString()
          : "",
        arrivedDate: item.arrivedDate
          ? new Date(item.arrivedDate).toLocaleDateString()
          : "",
        remark: item.remark || "",
      });
    });
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=service_person_pickup_items.xlsx`
    );

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error("Excel Download Error: ", error);
    res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message,
    });
  }
};

module.exports = {
  updateLatitudeLongitude,
  addServicePersonState,
  showNewInstallationDataToInstaller,
  updateStatusOfIncomingItems,
  newSystemInstallation,
  empDashboard,
  showAcceptedInstallationData,
  getInstallationDataWithImages,
  updateInstallationDataWithFiles,
  pickupItemsByServicePerson,
};
