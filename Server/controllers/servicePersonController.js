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

// const updateStatusOfIncomingItems = async (req, res) => {
//     try {
//         const { installationId, farmerSaralId, empId, accepted } = req.body;

//         if (!farmerSaralId || !empId || !accepted) {
//             return res.status(400).json({
//                 success: false,
//                 message: "All fields are required"
//             });
//         }

//         const farmerActivityData = await FarmerItemsActivity.findOne({ _id: installationId, farmerSaralId })
//             .populate({
//                 path: "itemsList.systemItemId", // Populate subItemId inside itemsList array
//                 select: "itemName", // Select only the subItemName field
//             });
//         if (!farmerActivityData) {
//             return res.status(400).json({
//                 success: false,
//                 message: "Farmer Activity Data Not Found"
//             });
//         }

//         if (farmerActivityData.accepted) {
//             return res.status(400).json({
//                 success: false,
//                 message: "Farmer Activity Already Accepted"
//             });
//         }
//         if (farmerActivityData.installationDone) {
//             return res.status(400).json({
//                 success: false,
//                 message: "Farmer Activity Already Installation Done"
//             });
//         }

//         let empAccount = await EmpInstallationAccount.findOne({ empId })
//             .populate({
//                 path: "itemsList.systemItemId", // Populate subItemId inside itemsList array
//                 select: "itemName", // Select only the subItemName field
//             });

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

//         if (!empAccount) {
//             // If no record exists, create a new one
//             empAccount = new EmpInstallationAccount({
//                 empId,
//                 referenceType: refType,  // Adjust based on logic
//                 incoming: false,
//                 itemsList: [],
//                 createdBy: empId,
//             });
//         }

//         for (const item of farmerActivityData.itemsList) {
//             const { systemItemId, quantity } = item;
//             const existingItem = empAccount.itemsList.find(i => i.systemItemId.toString() === systemItemId.toString());
//             if (existingItem) {
//                 existingItem.quantity = parseInt(existingItem.quantity) + parseInt(quantity);
//             } else {
//                 empAccount.itemsList.push({ systemItemId, quantity });
//             }
//         }

//         if (farmerActivityData.extraItemsList && farmerActivityData.extraItemsList.length > 0) {
//             for (const item of farmerActivityData.extraItemsList) {
//                 const { systemItemId, quantity } = item;
//                 const existingItem = empAccount.itemsList.find(i => i.systemItemId.toString() === systemItemId.toString());
//                 if (existingItem) {
//                     existingItem.quantity = parseInt(existingItem.quantity) + parseInt(quantity);
//                 } else {
//                     empAccount.itemsList.push({ systemItemId, quantity });
//                 }
//             }
//         }

//         empAccount.updatedAt = new Date();
//         empAccount.updatedBy = empId;
//         await empAccount.save();

//         farmerActivityData.accepted = accepted;
//         farmerActivityData.approvalDate = new Date();;
//         farmerActivityData.updatedAt = new Date();
//         farmerActivityData.updatedBy = empId;
//         const savedFarmerActivity = await farmerActivityData.save();
//         if (savedFarmerActivity) {
//             return res.status(200).json({
//                 success: true,
//                 message: "Farmer Activity Updated Successfully"
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

const updateStatusOfIncomingItems = async (req, res) => {
    try {
        const { installationId, farmerSaralId, empId, accepted } = req.body;

        if (!farmerSaralId || !empId || !accepted) {
            return res.status(400).json({
                success: false,
                message: "All fields are required"
            });
        }

        const farmerActivityData = await FarmerItemsActivity.findOne({ _id: installationId, farmerSaralId });

        if (!farmerActivityData) {
            return res.status(400).json({ success: false, message: "Farmer Activity Data Not Found" });
        }

        if (farmerActivityData.accepted || farmerActivityData.installationDone) {
            return res.status(400).json({
                success: false,
                message: farmerActivityData.accepted
                    ? "Farmer Activity Already Accepted"
                    : "Farmer Activity Already Installation Done"
            });
        }

        let empAccount = await EmpInstallationAccount.findOne({ empId });

        let refType;
        let empData = await ServicePerson.findOne({ _id: empId });
        if (empData) {
            refType = "ServicePerson";
        } else {
            empData = await SurveyPerson.findOne({ _id: empId });
            if (!empData) {
                return res.status(400).json({ success: false, message: "EmpID Not Found In Database" });
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
        console.log(farmerActivityData.itemsList);
        for (const item of farmerActivityData.itemsList) {
            const { systemItemId, quantity } = item;
            const existingItem = empAccount.itemsList.find(i => i.systemItemId.toString() === systemItemId.toString());
            if (existingItem) {
                existingItem.quantity = parseInt(existingItem.quantity) + parseInt(quantity);
            } else {
                empAccount.itemsList.push({ systemItemId, quantity });
            }
        }
        console.log(farmerActivityData.extraItemsList);
        if (farmerActivityData.extraItemsList && farmerActivityData.extraItemsList.length > 0) {
            for (const item of farmerActivityData.extraItemsList) {
                const { systemItemId, quantity } = item;
                const existingItem = empAccount.itemsList.find(i => i.systemItemId.toString() === systemItemId.toString());
                if (existingItem) {
                    existingItem.quantity = parseInt(existingItem.quantity) + parseInt(quantity);
                } else {
                    empAccount.itemsList.push({ systemItemId, quantity });
                }
            }
        }
        console.log(empAccount);

        empAccount.updatedAt = new Date();
        empAccount.updatedBy = empId;
        await empAccount.save();

        // 4️⃣ Update Farmer Activity
        farmerActivityData.accepted = accepted;
        farmerActivityData.approvalDate = new Date();
        farmerActivityData.updatedAt = new Date();
        farmerActivityData.updatedBy = empId;
        await farmerActivityData.save();

        return res.status(200).json({
            success: true,
            message: "Farmer Activity Updated Successfully"
        });

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Internal Server Error",
            error: error.message
        });
    }
};

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
            // challanPhoto: storedFileURLs.challanPhoto,
            // landDocPhoto: storedFileURLs.landDocPhoto,
            // sprinklerPhoto: storedFileURLs.sprinklerPhoto,
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

            existingItem.quantity = parseInt(existingItem.quantity) - parseInt(quantity);
        }

        if (farmerActivity.extraItemsList && farmerActivity.extraItemsList.length > 0) {
            for (const item of farmerActivity.extraItemsList) {
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

                existingItem.quantity = parseInt(existingItem.quantity) - parseInt(quantity);
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
            .select("-_id -__v -createdAt -updatedAt -createdBy -updatedBy -incoming");
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
            data: empData || []
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

