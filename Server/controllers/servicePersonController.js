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

const BASE_URL = process.env.BASE_URL;
const buildFullURLs = (pathsArray) => {
    if (!pathsArray || !Array.isArray(pathsArray)) return [];
    return pathsArray.map(path => `${BASE_URL}${path}`);
};
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
        const installerId = req.query.installerId || req.user?.id;
        console.log(installerId);
        if (!installerId) {
            throw new Error("Employee ID is not valid");
        }
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
            })
            .populate({
                path: "extraItemsList.systemItemId",
                model: "SystemItem",
                select: ({
                    "_id": 1,
                    "itemName": 1
                })
            }).sort({ createdAt: -1 });
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
                    console.error(`Failed for saralId ${activity.farmerSaralId}:`, err.message);
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
        const { installationId, farmerSaralId} = req.body;
        const empId = req.body.empId || req.user?.id; // Get empId from query or user context

        if (!farmerSaralId || !empId) {
            return res.status(400).json({
                success: false,
                message: "All fields are required"
            });
        }

        const farmerActivityData = await FarmerItemsActivity.findOne({ _id: installationId, farmerSaralId, empId })
            .populate("itemsList.systemItemId", "itemName")
            .populate("extraItemsList.systemItemId", "itemName");

        if (!farmerActivityData) {
            return res.status(400).json({ success: false, message: "Farmer Activity Data Not Found" });
        }

        if (farmerActivityData.accepted) {
            return res.status(400).json({ success: false, message: "Farmer Activity Already Accepted" });
        }

        if (farmerActivityData.installationDone) {
            return res.status(400).json({ success: false, message: "Farmer Activity Already Installation Done" });
        }

        let empAccount = await EmpInstallationAccount.findOne({ empId })
            .populate("itemsList.systemItemId", "itemName");

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

        // Step 1: Merge itemsList
        for (const item of farmerActivityData.itemsList) {
            const { systemItemId, quantity } = item;
            const index = empAccount.itemsList.findIndex(
                i => i.systemItemId.toString() === systemItemId.toString()
            );
            if (index !== -1) {
                empAccount.itemsList[index].quantity += parseInt(quantity);
            } else {
                empAccount.itemsList.push({
                    systemItemId: systemItemId,
                    quantity: parseInt(quantity)
                });
            }
        }

        // Save empAccount after merging itemsList
        empAccount.updatedAt = new Date();
        empAccount.updatedBy = empId;
        await empAccount.save();

        // Reload to ensure clean ObjectId matching after save
        empAccount = await EmpInstallationAccount.findOne({ empId });

        // Step 2: Merge extraItemsList
        if (farmerActivityData.extraItemsList && farmerActivityData.extraItemsList.length > 0) {
            for (const item of farmerActivityData.extraItemsList) {
                const { systemItemId, quantity } = item;
                const index = empAccount.itemsList.findIndex(
                    i => i.systemItemId.toString() === systemItemId.toString()
                );
                if (index !== -1) {
                    empAccount.itemsList[index].quantity += parseInt(quantity);
                } else {
                    empAccount.itemsList.push({
                        systemItemId: systemItemId,
                        quantity: parseInt(quantity)
                    });
                }
            }

            empAccount.updatedAt = new Date();
            empAccount.updatedBy = empId;
            await empAccount.save();
        }

        // Step 3: Update Farmer Activity
        farmerActivityData.accepted = true;
        farmerActivityData.approvalDate = new Date();
        farmerActivityData.updatedAt = new Date();
        farmerActivityData.updatedBy = empId;
        await farmerActivityData.save();

        return res.status(200).json({
            success: true,
            message: "Farmer Activity Updated Successfully",
            data: "Farmer Activity Updated Successfully"
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
        const empId = req.body.empId || req.user?.id; // Get empId from query or user context
        const requiredFiles = [
            "pitPhoto",
            "earthingFarmerPhoto",
            "antiTheftNutBoltPhoto",
            "lightingArresterInstallationPhoto",
            "finalFoundationFarmerPhoto",
            "panelFarmerPhoto",
            "controllerBoxFarmerPhoto",
            "waterDischargeFarmerPhoto"
        ];

        for (const field of requiredFiles) {
            const files = req.files[field];
            console.log(`Processing field: ${field}`, files);
            if (!files || files.length === 0) {
                await session.abortTransaction();
                session.endSession();
                await deleteFiles(uploadedFilePaths);
                return res.status(400).json({ success: false, message: `Missing or empty files: ${field}` });
            }

            storedFileURLs[field] = [];

            for (const file of files) {
                const serverPath = path.join(__dirname, "../uploads/newInstallation", file.filename);
                const urlPath = `/uploads/newInstallation/${file.filename}`;

                uploadedFilePaths.push(serverPath);
                storedFileURLs[field].push(urlPath);
            }
        }

        if (!farmerSaralId || !latitude || !longitude || !empId) {
            await session.abortTransaction();
            session.endSession();
            await deleteFiles(uploadedFilePaths);
            return res.status(400).json({
                success: false,
                message: "All fields are required."
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
            pitPhoto: storedFileURLs.pitPhoto,
            earthingFarmerPhoto: storedFileURLs.earthingFarmerPhoto,
            antiTheftNutBoltPhoto: storedFileURLs.antiTheftNutBoltPhoto,
            lightingArresterInstallationPhoto: storedFileURLs.lightingArresterInstallationPhoto,
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
            message: "Installation Data & Farmer Activity Saved/Updated Successfully",
            data: "Installation Data & Farmer Activity Saved/Updated Successfully"
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
        const empId = req.query.empId || req.user?.id;
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
            })
            .populate({
                path: "extraItemsList.systemItemId", // Populate subItem details
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
        const empId = req.query.empId || req.user?.id;

        if (!empId) {
            return res.status(400).json({
                success: false,
                message: "empId is required",
            });
        }

        const empObjectId = new mongoose.Types.ObjectId(empId);
        let refPath;
        const empDetails = await ServicePerson.findOne({ _id: empObjectId })
        if(empDetails) {
            refPath = "ServicePerson";
        } else {
            const surveyPersonDetails = await SurveyPerson.findOne({ _id: empObjectId });
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
            .select("-_id -__v -createdAt -updatedAt -createdBy -updatedBy -incoming");

        if (empData) {
            empData.itemsList = empData.itemsList.filter(item => item.quantity > 0);
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
}

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

const getInstallationDataWithImages = async (req, res) => {
    try {
        const data = await NewSystemInstallation.find();
        let transformedData = [];

        if (data && data.length > 0) {
            for (const install of data) {
                const installationObj = install.toObject();

                // Fetch related farmer activity using farmerSaralId
                const farmerActivity = await FarmerItemsActivity.findOne({
                    farmerSaralId: installationObj.farmerSaralId,
                }).lean(); // lean() gives plain JS object

                transformedData.push({
                    ...installationObj,
                    pitPhoto: buildFullURLs(install.pitPhoto),
                    earthingFarmerPhoto: buildFullURLs(install.earthingFarmerPhoto),
                    antiTheftNutBoltPhoto: buildFullURLs(install.antiTheftNutBoltPhoto),
                    lightingArresterInstallationPhoto: buildFullURLs(install.lightingArresterInstallationPhoto),
                    finalFoundationFarmerPhoto: buildFullURLs(install.finalFoundationFarmerPhoto),
                    panelFarmerPhoto: buildFullURLs(install.panelFarmerPhoto),
                    controllerBoxFarmerPhoto: buildFullURLs(install.controllerBoxFarmerPhoto),
                    waterDischargeFarmerPhoto: buildFullURLs(install.waterDischargeFarmerPhoto),

                    // Add related farmer activity data
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
            error: error.message
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
    getInstallationDataWithImages
};

