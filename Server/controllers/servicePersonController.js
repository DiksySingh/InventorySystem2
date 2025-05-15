const axios = require("axios");
const processExcelFile = require("../util/Excel/excelProcess");
const ServicePerson = require("../models/serviceInventoryModels/servicePersonSchema");
const SurveyPerson = require("../models/serviceInventoryModels/surveyPersonSchema");
const imageHandlerWithPath = require("../middlewares/imageHandlerWithPath");
const FarmerItemsActivity = require("../models/systemInventoryModels/farmerItemsActivity");
const NewSystemInstallation = require("../models/systemInventoryModels/newSystemInstallationSchema");
const EmpInstallationAccount = require("../models/systemInventoryModels/empInstallationItemAccount");
const mongoose = require("mongoose");
const fs = require("fs/promises");
const path = require("path");

const updateLatitudeLongitude = async (req, res) => {
    try {
        const fileBuffer = req.file.buffer;
        if (!fileBuffer) {
            return res.status(400).json({
                success: false,
                message: "File Not Found"
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
            message: "Data from Excel file added/updated successfully"
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Internal Server Error",
            error: error.message
        });
    }
};

const addServicePersonState = async (req, res) => {
    try {
        const fileBuffer = req.file.buffer;
        if (!fileBuffer) {
            return res.status(400).json({
                success: false,
                message: "File Not Found"
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
            message: "Data from Excel file added/updated successfully"
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Internal Server Error",
            error: error.message
        });
    }
};

const showNewInstallationDataToInstaller = async (req, res) => {
    try {
        const installerId = req.user._id
        const activities = await FarmerItemsActivity.find({ empId: installerId, accepted: false })
            .populate({
                path: "warehouseId",
                select: {
                    "warehouseName": 1,
                }
            })
            .populate({
                path: "empId",
                select: {
                    "name": 1,
                }
            })
            .populate({
                path: "systemId",
                select: {
                    "systemName": 1,
                }
            })
            .populate({
                path: "itemsList.systemItemId", // Populate subItem details
                model: "SystemItem",
                select: ({
                    "_id": 1,
                    "itemName": 1,
                })
            }).sort({ createdAt: -1 });
        const activitiesWithFarmerDetails = await Promise.all(
            activities.map(async (activity) => {
                const response = await axios.get(
                    `http://88.222.214.93:8001/farmer/showFarmerAccordingToSaralId?saralId=${activity.farmerSaralId}`,
                );
                if (response) {
                    return {
                        ...activity.toObject(),
                        farmerDetails: (response?.data?.data) ? response?.data?.data : null, // Assuming the farmer API returns farmer details
                    };
                }
            })
        );

        return res.status(200).json({
            success: true,
            message: "Data Fetched Successfully",
            data: activitiesWithFarmerDetails || []
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Internal Server Error",
            error: error.message
        });
    }
};

const updateStatusOfIncomingItems = async (req, res) => {
    try {
        const { installationId, farmerSaralId, empId, accepted } = req.body;

        if (!farmerSaralId || !empId || !accepted) {
            return res.status(400).json({
                success: false,
                message: "All fields are required"
            });
        }

        const farmerActivityData = await FarmerItemsActivity.findOne({ _id: installationId, farmerSaralId })
            .populate({
                path: "itemsList.systemItemId", // Populate subItemId inside itemsList array
                select: "itemName", // Select only the subItemName field
            });
        if (!farmerActivityData) {
            return res.status(400).json({
                success: false,
                message: "Farmer Activity Data Not Found"
            });
        }

        if (farmerActivityData.accepted) {
            return res.status(400).json({
                success: false,
                message: "Farmer Activity Already Accepted"
            });
        }
        if (farmerActivityData.installationDone) {
            return res.status(400).json({
                success: false,
                message: "Farmer Activity Already Installation Done"
            });
        }

        let empAccount = await EmpInstallationAccount.findOne({ empId })
            .populate({
                path: "itemsList.systemItemId", // Populate subItemId inside itemsList array
                select: "itemName", // Select only the subItemName field
            });

        let refType;
        let empData = await ServicePerson.findOne({ _id: empId });
        if (empData) {
            refType = "ServicePerson";
        } else {
            empData = await SurveyPerson.findOne({ _id: empId });
            if (!empData) {
                return res.status(400).json({
                    success: false,
                    message: "EmpID Not Found In Database"
                })
            }
            refType = "SurveyPerson";
        }

        if (!empAccount) {
            // If no record exists, create a new one
            empAccount = new EmpInstallationAccount({
                empId,
                referenceType: refType,  // Adjust based on logic
                incoming: false,
                itemsList: [],
                createdBy: empId,
            });
        }

        for (const item of farmerActivityData.itemsList) {
            const { systemItemId, quantity } = item;

            const existingItem = empAccount.itemsList.find(i => i.systemItemId.toString() === systemItemId.toString());

            if (existingItem) {
                existingItem.quantity = parseInt(existingItem.quantity) + parseInt(quantity);
            } else {
                empAccount.itemsList.push({ systemItemId, quantity });
            }
        }

        empAccount.updatedAt = new Date();
        empAccount.updatedBy = empId;
        await empAccount.save();

        farmerActivityData.accepted = accepted;
        farmerActivityData.approvalDate = new Date();;
        farmerActivityData.updatedAt = new Date();
        farmerActivityData.updatedBy = empId;
        const savedFarmerActivity = await farmerActivityData.save();
        if (savedFarmerActivity) {
            return res.status(200).json({
                success: true,
                message: "Farmer Activity Updated Successfully"
            });
        }
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Internal Server Error",
            error: error.message
        });
    }
};

// const newSystemInstallation = async (req, res) => {
//     try {
//         // const {
//         //     farmerSaralId,
//         //     latitude,
//         //     longitude,
//         //     borePhoto,
//         //     challanPhoto,
//         //     landDocPhoto,
//         //     sprinklerPhoto,
//         //     boreFarmerPhoto,
//         //     finalFoundationFarmerPhoto,
//         //     panelFarmerPhoto,
//         //     controllerBoxFarmerPhoto,
//         //     waterDischargeFarmerPhoto
//         // } = req.body;
//         // const empId = req.user._id;
//         // if (!farmerSaralId || !latitude || !longitude || !borePhoto || !challanPhoto || !landDocPhoto || !sprinklerPhoto || !boreFarmerPhoto || !finalFoundationFarmerPhoto || !panelFarmerPhoto || !controllerBoxFarmerPhoto || !waterDischargeFarmerPhoto) {
//         //     return res.status(400).json({
//         //         success: false,
//         //         message: "All fields are required."
//         //     });
//         // }

//         const {
//             farmerSaralId,
//             latitude,
//             longitude
//         } = req.body;

//         const empId = req.user._id;

//         // Check for required fields
//         const requiredFiles = [
//             'borePhoto',
//             'challanPhoto',
//             'landDocPhoto',
//             'sprinklerPhoto',
//             'boreFarmerPhoto',
//             'finalFoundationFarmerPhoto',
//             'panelFarmerPhoto',
//             'controllerBoxFarmerPhoto',
//             'waterDischargeFarmerPhoto'
//         ];

//         for (const field of requiredFiles) {
//             if (!req.files[field] || !req.files[field][0]) {
//                 return res.status(400).json({
//                     success: false,
//                     message: `Missing or empty file: ${field}`
//                 });
//             }
//         }


//         if (!farmerSaralId || !latitude || !longitude) {
//             return res.status(400).json({
//                 success: false,
//                 message: "farmerSaralId, latitude, and longitude are required."
//             });
//         }


//         let refType;
//         let empData = await ServicePerson.findOne({ _id: empId });
//         if (empData) {
//             refType = "ServicePerson";
//         } else {
//             empData = await SurveyPerson.findOne({ _id: empId });
//             if (!empData) {
//                 return res.status(400).json({
//                     success: false,
//                     message: "EmpID Not Found In Database"
//                 })
//             }
//             refType = "SurveyPerson";
//         }

//         // const folderPath = "newInstallation"
//         // const savedBorePhoto = await imageHandlerWithPath(borePhoto, folderPath);
//         // const borePhotoUrl = savedBorePhoto.map((file) => `${req.protocol}://${req.get("host")}/uploads/${folderPath}/${file.fileName}`);

//         // const savedChallanPhoto = await imageHandlerWithPath(challanPhoto, folderPath);
//         // const challanPhotoUrl = savedChallanPhoto.map((file) => `${req.protocol}://${req.get("host")}/uploads/${folderPath}/${file.fileName}`);

//         // const savedLandDocPhoto = await imageHandlerWithPath(landDocPhoto, folderPath);
//         // const landDocPhotoUrl = savedLandDocPhoto.map((file) => `${req.protocol}://${req.get("host")}/uploads/${folderPath}/${file.fileName}`);

//         // const savedSprinklerPhoto = await imageHandlerWithPath(sprinklerPhoto, folderPath);
//         // const sprinklerPhotoUrl = savedSprinklerPhoto.map((file) => `${req.protocol}://${req.get("host")}/uploads/${folderPath}/${file.fileName}`);

//         // const savedBoreFarmerPhoto = await imageHandlerWithPath(boreFarmerPhoto, folderPath);
//         // const boreFarmerPhotoUrl = savedBoreFarmerPhoto.map((file) => `${req.protocol}://${req.get("host")}/uploads/${folderPath}/${file.fileName}`);

//         // const savedFoundationFarmerPhoto = await imageHandlerWithPath(finalFoundationFarmerPhoto, folderPath);
//         // const foundationFarmerPhotoUrl = savedFoundationFarmerPhoto.map((file) => `${req.protocol}://${req.get("host")}/uploads/${folderPath}/${file.fileName}`);

//         // const savedPanelFarmerPhoto = await imageHandlerWithPath(panelFarmerPhoto, folderPath);
//         // const panelFarmerPhotoUrl = savedPanelFarmerPhoto.map((file) => `${req.protocol}://${req.get("host")}/uploads/${folderPath}/${file.fileName}`);

//         // const savedControllerFarmerPhoto = await imageHandlerWithPath(controllerBoxFarmerPhoto, folderPath);
//         // const controllerFarmerPhotoUrl = savedControllerFarmerPhoto.map((file) => `${req.protocol}://${req.get("host")}/uploads/${folderPath}/${file.fileName}`);

//         // const savedWaterDischargePhoto = await imageHandlerWithPath(waterDischargeFarmerPhoto, folderPath);
//         // const waterDischargeFarmerPhotoUrl = savedWaterDischargePhoto.map((file) => `${req.protocol}://${req.get("host")}/uploads/${folderPath}/${file.fileName}`);

//         // const newInstallationData = {
//         //     referenceType: refType,
//         //     farmerSaralId,
//         //     latitude,
//         //     longitude,
//         //     borePhoto: borePhotoUrl,
//         //     challanPhoto: challanPhotoUrl,
//         //     landDocPhoto: landDocPhotoUrl,
//         //     sprinklerPhoto: sprinklerPhotoUrl,
//         //     boreFarmerPhoto: boreFarmerPhotoUrl,
//         //     finalFoundationFarmerPhoto: foundationFarmerPhotoUrl,
//         //     panelFarmerPhoto: panelFarmerPhotoUrl,
//         //     controllerBoxFarmerPhoto: controllerFarmerPhotoUrl,
//         //     waterDischargeFarmerPhoto: waterDischargeFarmerPhotoUrl,
//         //     createdBy: req.user._id
//         // };

//         const newInstallationData = {
//             referenceType: refType,
//             farmerSaralId,
//             latitude,
//             longitude,
//             borePhoto: `/uploads/newInstallation/${req.files.borePhoto[0].filename}`,
//             challanPhoto: `/uploads/newInstallation/${req.files.challanPhoto[0].filename}`,
//             landDocPhoto: `/uploads/newInstallation/${req.files.landDocPhoto[0].filename}`,
//             sprinklerPhoto: `/uploads/newInstallation/${req.files.sprinklerPhoto[0].filename}`,
//             boreFarmerPhoto: `/uploads/newInstallation/${req.files.boreFarmerPhoto[0].filename}`,
//             finalFoundationFarmerPhoto: `/uploads/newInstallation/${req.files.finalFoundationFarmerPhoto[0].filename}`,
//             panelFarmerPhoto: `/uploads/newInstallation/${req.files.panelFarmerPhoto[0].filename}`,
//             controllerBoxFarmerPhoto: `/uploads/newInstallation/${req.files.controllerBoxFarmerPhoto[0].filename}`,
//             waterDischargeFarmerPhoto: `/uploads/newInstallation/${req.files.waterDischargeFarmerPhoto[0].filename}`,
//             createdBy: empId
//         };

//         const newInstallation = new NewSystemInstallation(newInstallationData);
//         const savedInstallationData = await newInstallation.save();
//         if (!savedInstallationData) {
//             return res.status(500).json({
//                 success: false,
//                 message: "Installation data could not be saved"
//             });
//         }

//         const farmerActivity = await FarmerItemsActivity.findOne({ farmerSaralId });
//         if (!farmerActivity) {
//             return res.status(400).json({
//                 success: false,
//                 message: "Farmer Activity Not Found"
//             });
//         }

//         const empAccount = await EmpInstallationAccount.findOne({ empId: farmerActivity.empId })
//             .populate({
//                 path: "itemsList.systemItemId", // Populate subItemId inside itemsList array
//                 select: "itemName", // Select only the subItemName field
//             })
//             .select("-__v -createdAt -updatedAt -referenceType -incoming");
//         if (!empAccount) {
//             return res.status(400).json({
//                 success: false,
//                 message: "Employee Account Not Found"
//             });
//         }
//         console.log(empAccount);
//         for (const item of farmerActivity.itemsList) {
//             const { systemItemId, quantity } = item;
//             console.log("Looking for systemItemId:", systemItemId);
//             console.log("In employee items:", empAccount.itemsList);
//             const existingItem = empAccount.itemsList.find(i => i.systemItemId._id.toString() === systemItemId.toString());
//             console.log(existingItem);
//             if (!existingItem) {
//                 return res.status(404).json({
//                     success: false,
//                     message: "Item Not Found In Employee Account"
//                 });
//             }
//             if (parseInt(existingItem.quantity) < parseInt(quantity)) {
//                 return res.status(400).json({
//                     success: false,
//                     message: "Insufficient Quantity in Employee Account"
//                 });
//             }
//             existingItem.quantity = parseInt(existingItem.quantity) - parseInt(quantity);
//         }
//         empAccount.updatedAt = new Date();
//         empAccount.updatedBy = empId;
//         const updatedEmpAccount = await empAccount.save();
//         if (!updatedEmpAccount) {
//             return res.status(500).json({
//                 success: false,
//                 message: "Employee Account could not be updated"
//             });
//         }

//         farmerActivity.installationDone = true;
//         farmerActivity.updatedAt = new Date();
//         farmerActivity.updatedBy = empId;
//         const updatedFarmerActivity = await farmerActivity.save();
//         if (!updatedFarmerActivity) {
//             return res.status(500).json({
//                 success: false,
//                 message: "Farmer Activity could not be updated"
//             });
//         }

//         if (updatedEmpAccount && updatedFarmerActivity) {
//             return res.status(200).json({
//                 success: true,
//                 message: "Installation Data & Farmer Activity Saved/Updated Successfully"
//             });
//         }
//     } catch (error) {
//         return res.status(500).json({
//             success: false,
//             message: "Internal Server Error",
//             error: error.message
//         });
//     }
// };

// const newSystemInstallation = async (req, res) => {
//     const session = await mongoose.startSession();
//     session.startTransaction();

//     try {
//         const { farmerSaralId, latitude, longitude } = req.body;
//         const empId = req.user._id;

//         const requiredFiles = [
//             'borePhoto',
//             'challanPhoto',
//             'landDocPhoto',
//             'sprinklerPhoto',
//             'boreFarmerPhoto',
//             'finalFoundationFarmerPhoto',
//             'panelFarmerPhoto',
//             'controllerBoxFarmerPhoto',
//             'waterDischargeFarmerPhoto'
//         ];

//         const uploadedFilePaths = [];
//         for (const field of requiredFiles) {
//             if (!req.files[field] || !req.files[field][0]) {
//                 await session.abortTransaction();
//                 session.endSession();

//                 for (const path of uploadedFilePaths) {
//                     try {
//                         await fs.unlink(path);
//                     } catch (e) {
//                         console.error(`Failed to delete ${path}:`, e.message);
//                     }
//                 }
//                 return res.status(400).json({
//                     success: false,
//                     message: `Missing or empty file: ${field}`
//                 });
//             }
//             uploadedFilePaths.push(`${req.protocol}://${req.get("host")}/uploads/newInstallation/${req.files[field][0].filename}`);
//         }

//         if (!farmerSaralId || !latitude || !longitude) {
//             await session.abortTransaction();
//             session.endSession();
//             return res.status(400).json({
//                 success: false,
//                 message: "farmerSaralId, latitude, and longitude are required."
//             });
//         }

//         let refType;
//         let empData = await ServicePerson.findOne({ _id: empId }).session(session);
//         if (empData) {
//             refType = "ServicePerson";
//         } else {
//             empData = await SurveyPerson.findOne({ _id: empId }).session(session);
//             if (!empData) {
//                 await session.abortTransaction();
//                 session.endSession();
//                 return res.status(400).json({
//                     success: false,
//                     message: "EmpID Not Found In Database"
//                 });
//             }
//             refType = "SurveyPerson";
//         }

//         const newInstallationData = {
//             referenceType: refType,
//             farmerSaralId,
//             latitude,
//             longitude,
//             borePhoto: `/uploads/newInstallation/${req.files.borePhoto[0].filename}`,
//             challanPhoto: `/uploads/newInstallation/${req.files.challanPhoto[0].filename}`,
//             landDocPhoto: `/uploads/newInstallation/${req.files.landDocPhoto[0].filename}`,
//             sprinklerPhoto: `/uploads/newInstallation/${req.files.sprinklerPhoto[0].filename}`,
//             boreFarmerPhoto: `/uploads/newInstallation/${req.files.boreFarmerPhoto[0].filename}`,
//             finalFoundationFarmerPhoto: `/uploads/newInstallation/${req.files.finalFoundationFarmerPhoto[0].filename}`,
//             panelFarmerPhoto: `/uploads/newInstallation/${req.files.panelFarmerPhoto[0].filename}`,
//             controllerBoxFarmerPhoto: `/uploads/newInstallation/${req.files.controllerBoxFarmerPhoto[0].filename}`,
//             waterDischargeFarmerPhoto: `/uploads/newInstallation/${req.files.waterDischargeFarmerPhoto[0].filename}`,
//             createdBy: empId
//         };

//         const newInstallation = new NewSystemInstallation(newInstallationData);
//         await newInstallation.save({ session });

//         const farmerActivity = await FarmerItemsActivity.findOne({ farmerSaralId }).session(session);
//         if (!farmerActivity) {
//             await session.abortTransaction();
//             session.endSession();
//             return res.status(400).json({
//                 success: false,
//                 message: "Farmer Activity Not Found"
//             });
//         }

//         const empAccount = await EmpInstallationAccount.findOne({ empId: farmerActivity.empId })
//             .populate({
//                 path: "itemsList.systemItemId",
//                 select: "itemName"
//             })
//             .session(session);

//         if (!empAccount) {
//             await session.abortTransaction();
//             session.endSession();
//             return res.status(400).json({
//                 success: false,
//                 message: "Employee Account Not Found"
//             });
//         }

//         for (const item of farmerActivity.itemsList) {
//             const { systemItemId, quantity } = item;
//             const existingItem = empAccount.itemsList.find(i => i.systemItemId._id.toString() === systemItemId.toString());
//             if (!existingItem) {
//                 await session.abortTransaction();
//                 session.endSession();
//                 return res.status(404).json({
//                     success: false,
//                     message: "Item Not Found In Employee Account"
//                 });
//             }
//             if (parseInt(existingItem.quantity) < parseInt(quantity)) {
//                 await session.abortTransaction();
//                 session.endSession();
//                 return res.status(400).json({
//                     success: false,
//                     message: "Insufficient Quantity in Employee Account"
//                 });
//             }
//             existingItem.quantity = parseInt(existingItem.quantity) - parseInt(quantity);
//         }

//         empAccount.updatedAt = new Date();
//         empAccount.updatedBy = empId;
//         await empAccount.save({ session });

//         farmerActivity.installationDone = true;
//         farmerActivity.updatedAt = new Date();
//         farmerActivity.updatedBy = empId;
//         await farmerActivity.save({ session });

//         await session.commitTransaction();
//         session.endSession();

//         return res.status(200).json({
//             success: true,
//             message: "Installation Data & Farmer Activity Saved/Updated Successfully"
//         });

//     } catch (error) {
//         await session.abortTransaction();
//         session.endSession();
//         for (const path of uploadedFilePaths) {
//             try {
//                 await fs.unlink(path);
//             } catch (e) {
//                 console.error(`Failed to delete ${path}:`, e.message);
//             }
//         }
//         return res.status(500).json({
//             success: false,
//             message: "Internal Server Error",
//             error: error.message
//         });
//     }
// };

const newSystemInstallation = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    const uploadedFilePaths = [];   // For file deletion
    const storedFileURLs = {};      // For storing relative paths to DB

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
        const empId = req.user._id;

        const requiredFiles = [
            "borePhoto",
            "challanPhoto",
            "landDocPhoto",
            "sprinklerPhoto",
            "boreFarmerPhoto",
            "finalFoundationFarmerPhoto",
            "panelFarmerPhoto",
            "controllerBoxFarmerPhoto",
            "waterDischargeFarmerPhoto"
        ];

        for (const field of requiredFiles) {
            const file = req.files[field]?.[0];
            if (!file) {
                await session.abortTransaction();
                session.endSession();
                await deleteFiles(uploadedFilePaths);
                return res.status(400).json({ success: false, message: `Missing or empty file: ${field}` });
            }

            const serverPath = path.join(__dirname, "../uploads/newInstallation", file.filename);
            const urlPath = `/uploads/newInstallation/${file.filename}`;
            console.log("Server Path:", serverPath);
            console.log("URL Path:", urlPath);

            uploadedFilePaths.push(serverPath);
            storedFileURLs[field] = urlPath;
        }

        if (!farmerSaralId || !latitude || !longitude) {
            await session.abortTransaction();
            session.endSession();
            await deleteFiles(uploadedFilePaths);
            return res.status(400).json({
                success: false,
                message: "farmerSaralId, latitude, and longitude are required."
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
                    message: "EmpID Not Found In Database"
                });
            }
            refType = "SurveyPerson";
        }

        const newInstallationData = {
            referenceType: refType,
            farmerSaralId,
            latitude,
            longitude,
            borePhoto: storedFileURLs.borePhoto,
            challanPhoto: storedFileURLs.challanPhoto,
            landDocPhoto: storedFileURLs.landDocPhoto,
            sprinklerPhoto: storedFileURLs.sprinklerPhoto,
            boreFarmerPhoto: storedFileURLs.boreFarmerPhoto,
            finalFoundationFarmerPhoto: storedFileURLs.finalFoundationFarmerPhoto,
            panelFarmerPhoto: storedFileURLs.panelFarmerPhoto,
            controllerBoxFarmerPhoto: storedFileURLs.controllerBoxFarmerPhoto,
            waterDischargeFarmerPhoto: storedFileURLs.waterDischargeFarmerPhoto,
            createdBy: empId
        };

        const newInstallation = new NewSystemInstallation(newInstallationData);
        await newInstallation.save({ session });

        const farmerActivity = await FarmerItemsActivity.findOne({ farmerSaralId }).session(session);
        if (!farmerActivity) {
            await session.abortTransaction();
            session.endSession();
            await deleteFiles(uploadedFilePaths);
            return res.status(400).json({
                success: false,
                message: "Farmer Activity Not Found"
            });
        }

        const empAccount = await EmpInstallationAccount.findOne({ empId: farmerActivity.empId })
            .populate({
                path: "itemsList.systemItemId",
                select: "itemName"
            })
            .session(session);

        if (!empAccount) {
            await session.abortTransaction();
            session.endSession();
            await deleteFiles(uploadedFilePaths);
            return res.status(400).json({
                success: false,
                message: "Employee Account Not Found"
            });
        }

        for (const item of farmerActivity.itemsList) {
            const { systemItemId, quantity } = item;
            const existingItem = empAccount.itemsList.find(i => i.systemItemId._id.toString() === systemItemId.toString());

            if (!existingItem) {
                await session.abortTransaction();
                session.endSession();
                await deleteFiles(uploadedFilePaths);
                return res.status(404).json({
                    success: false,
                    message: "Item Not Found In Employee Account"
                });
            }

            if (parseInt(existingItem.quantity) < parseInt(quantity)) {
                await session.abortTransaction();
                session.endSession();
                await deleteFiles(uploadedFilePaths);
                return res.status(400).json({
                    success: false,
                    message: "Insufficient Quantity in Employee Account"
                });
            }

            existingItem.quantity -= parseInt(quantity);
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
            message: "Installation Data & Farmer Activity Saved/Updated Successfully"
        });

    } catch (error) {
        await session.abortTransaction();
        session.endSession();
        await deleteFiles(uploadedFilePaths);

        return res.status(500).json({
            success: false,
            message: "Internal Server Error",
            error: error.message
        });
    }
};

const showAcceptedInstallationData = async (req, res) => {
    try {
        const empId = req.user._id
        const activities = await FarmerItemsActivity.find({ empId, accepted: true })
            .populate({
                path: "warehouseId",
                select: {
                    "warehouseName": 1,
                }
            })
            .populate({
                path: "empId",
                select: {
                    "name": 1,
                }
            })
            .populate({
                path: "systemId",
                select: {
                    "systemName": 1,
                }
            })
            .populate({
                path: "itemsList.systemItemId", // Populate subItem details
                model: "SystemItem",
                select: ({
                    "_id": 1,
                    "itemName": 1,
                })
            }).sort({ approvalDate: -1 });
        const activitiesWithFarmerDetails = await Promise.all(
            activities.map(async (activity) => {
                const response = await axios.get(
                    `http://88.222.214.93:8001/farmer/showFarmerAccordingToSaralId?saralId=${activity.farmerSaralId}`,
                );
                if (response) {
                    return {
                        ...activity.toObject(),
                        farmerDetails: (response?.data?.data) ? response?.data?.data : null, // Assuming the farmer API returns farmer details
                    };
                }
            })
        );
        return res.status(200).json({
            success: true,
            message: "Data Fetched Successfully",
            data: activitiesWithFarmerDetails || []
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Internal Server Error",
            error: error.message
        });
    }
};

const empDashboard = async (req, res) => {
    try {
        const empId = req.user._id;
        const empData = await EmpInstallationAccount.findOne({ empId })
            .populate({
                path: "empId",
                select: {
                    "name": 1,
                }
            })
            .populate({
                path: "itemsList.systemItemId", // Populate systemItem details
                model: "SystemItem",
                select: ({
                    "_id": 1,
                    "itemName": 1,
                })
            })
            .select("-__v -createdAt -updatedAt -referenceType -incoming");
        if (!empData) {
            return res.status(400).json({
                success: false,
                message: "Employee Account Not Found"
            });
        }
        empData.itemsList = empData.itemsList.filter(item => item.quantity > 0);
        return res.status(200).json({
            success: true,
            message: "Employee Account Fetched Successfully",
            data: empData
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Internal Server Error",
            error: error.message
        })
    }
}

module.exports = {
    updateLatitudeLongitude,
    addServicePersonState,
    showNewInstallationDataToInstaller,
    updateStatusOfIncomingItems,
    newSystemInstallation,
    empDashboard,
    showAcceptedInstallationData
};

