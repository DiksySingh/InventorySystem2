const axios = require("axios");
const processExcelFile = require("../util/Excel/excelProcess");
const ServicePerson = require("../models/serviceInventoryModels/servicePersonSchema");
const SurveyPerson = require("../models/serviceInventoryModels/surveyPersonSchema");
const imageHandlerWithPath = require("../middlewares/imageHandlerWithPath");
const FarmerItemsActivity = require("../models/systemInventoryModels/farmerItemsActivity");
const NewSystemInstallation = require("../models/systemInventoryModels/newSystemInstallationSchema");
const EmpInstallationAccount = require("../models/systemInventoryModels/empInstallationItemAccount");

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
        const activities = await FarmerItemsActivity.find({ empId: installerId })
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
                path: "itemsList.subItemId", // Populate subItem details
                model: "SubItem",
                select: ({
                    "_id": 1,
                    "subItemName": 1,
                })
            }).sort({createdAt: -1});
        const activitiesWithFarmerDetails = await Promise.all(
            activities.map(async (activity) => {
                const response = await axios.get(
                    `http://88.222.214.93:8001/farmer/showSingleFarmer?id=${activity.farmerId}`
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
        const {farmerId, empId, itemsList, accepted} = req.body;

        if(!farmerId || !empId || !itemsList || !accepted) {
            return res.status(400).json({
                success: false,
                message: "All fields are required"
            });
        }

        const farmerActivityData = await FarmerItemsActivity.findOne({farmerId});
        if(!FarmerItemsActivity) {
            return res.status(400).json({
                success: false,
                message: "Farmer Activity Data Not Found"
            });
        }

        let empAccount = await EmpInstallationAccount.findOne({ empId });

        let refType;
        let empData = await ServicePerson.findOne({ _id: empId });
        if (empData) {
            refType = "ServicePerson";
        }else {
            empData = await SurveyPerson.findOne({ _id: empId });
            if(!empData){
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
                itemsList: []
            });
        }

        for (const item of itemsList) {
            const { subItemId, quantity } = item;

            const existingItem = empAccount.itemsList.find(i => i.subItemId === subItemId);

            if (existingItem) {
                existingItem.quantity = parseInt(existingItem.quantity) +  parseInt(quantity);
            } else {
                empAccount.itemsList.push({ subItemId: subItemId, quantity });
            }
        }

        empAccount.updatedAt = new Date();
        await empAccount.save();

        farmerActivityData.accepted = accepted;
        farmerActivityData.updatedAt = new Date();
        farmerActivityData.updatedBy = empId;
        const savedFarmerActivity = await farmerActivityData.save();
        if(savedFarmerActivity) {
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

const newSystemInstallation = async (req, res) => {
    try {
        const {
            farmerId,
            latitude,
            longitude,
            borePhoto,
            challanPhoto,
            landDocPhoto,
            sprinklerPhoto,
            boreFarmerPhoto,
            finalFoundationFarmerPhoto,
            panelFarmerPhoto,
            controllerBoxFarmerPhoto,
            waterDischargeFarmerPhoto
        } = req.body;
        const empId = req.user._id;
        if (!farmerId || !latitude || !longitude || !borePhoto || !challanPhoto || !landDocPhoto || !sprinklerPhoto ||!boreFarmerPhoto || !finalFoundationFarmerPhoto || !panelFarmerPhoto || !controllerBoxFarmerPhoto || !waterDischargeFarmerPhoto) {
            return res.status(400).json({
                success:false,
                message:"All fields are required."
            });
        }

        let refType;
        let empData = await ServicePerson.findOne({ _id: empId });
        if (empData) {
            refType = "ServicePerson";
        }else {
            empData = await SurveyPerson.findOne({ _id: empId });
            if(!empData){
                return res.status(400).json({
                    success: false,
                    message: "EmpID Not Found In Database"
                })
            }
            refType = "SurveyPerson";
        }
        
        const folderPath = "newInstallation"
        const savedBorePhoto = await imageHandlerWithPath(borePhoto, folderPath);
        const borePhotoUrl = savedBorePhoto.map((file) => `${req.protocol}://${req.get("host")}/uploads/${folderPath}/${file.fileName}`);

        const savedChallanPhoto = await imageHandlerWithPath(challanPhoto, folderPath);
        const challanPhotoUrl = savedChallanPhoto.map((file) => `${req.protocol}://${req.get("host")}/uploads/${folderPath}/${file.fileName}`);

        const savedLandDocPhoto = await imageHandlerWithPath(landDocPhoto, folderPath);
        const landDocPhotoUrl = savedLandDocPhoto.map((file) => `${req.protocol}://${req.get("host")}/uploads/${folderPath}/${file.fileName}`);

        const savedSprinklerPhoto = await imageHandlerWithPath(sprinklerPhoto, folderPath);
        const sprinklerPhotoUrl = savedSprinklerPhoto.map((file) => `${req.protocol}://${req.get("host")}/uploads/${folderPath}/${file.fileName}`);

        const savedBoreFarmerPhoto = await imageHandlerWithPath(boreFarmerPhoto, folderPath);
        const boreFarmerPhotoUrl = savedBoreFarmerPhoto.map((file) => `${req.protocol}://${req.get("host")}/uploads/${folderPath}/${file.fileName}`);

        const savedFoundationFarmerPhoto = await imageHandlerWithPath(finalFoundationFarmerPhoto, folderPath);
        const foundationFarmerPhotoUrl = savedFoundationFarmerPhoto.map((file) => `${req.protocol}://${req.get("host")}/uploads/${folderPath}/${file.fileName}`);

        const savedPanelFarmerPhoto = await imageHandlerWithPath(panelFarmerPhoto, folderPath);
        const panelFarmerPhotoUrl = savedPanelFarmerPhoto.map((file) => `${req.protocol}://${req.get("host")}/uploads/${folderPath}/${file.fileName}`);

        const savedControllerFarmerPhoto = await imageHandlerWithPath(controllerBoxFarmerPhoto, folderPath);
        const controllerFarmerPhotoUrl = savedControllerFarmerPhoto.map((file) => `${req.protocol}://${req.get("host")}/uploads/${folderPath}/${file.fileName}`);

        const savedWaterDischargePhoto = await imageHandlerWithPath(waterDischargeFarmerPhoto, folderPath);
        const waterDischargeFarmerPhotoUrl = savedWaterDischargePhoto.map((file) => `${req.protocol}://${req.get("host")}/uploads/${folderPath}/${file.fileName}`);

        const newInstallationData = {
            referenceType: refType,
            farmerId,
            latitude,
            longitude,
            borePhoto: borePhotoUrl, 
            challanPhoto: challanPhotoUrl, 
            landDocPhoto: landDocPhotoUrl, 
            sprinklerPhoto: sprinklerPhotoUrl, 
            boreFarmerPhoto: boreFarmerPhotoUrl, 
            finalFoundationFarmerPhoto: foundationFarmerPhotoUrl,
            panelFarmerPhoto: panelFarmerPhotoUrl,
            controllerBoxFarmerPhoto: controllerFarmerPhotoUrl,
            waterDischargeFarmerPhoto: waterDischargeFarmerPhotoUrl,
            createdBy: req.user._id
        };

        const newInstallation = new NewSystemInstallation(newInstallationData);
        const savedInstallationData = await newInstallation.save();
        if (!savedInstallationData) {
            return res.status(500).json({
                success: false,
                message: "Installation data could not be saved"
            });
        }

        const farmerActivity = await FarmerItemsActivity.findOne({farmerId});
        if(!farmerActivity) {
            return res.status(400).json({
                success: false,
                message: "Farmer Activity Not Found"
            });
        }

        farmerActivity.installationDone = true;
        farmerActivity.updatedAt = new Date();
        farmerActivity.updatedBy = empId;
        await farmerActivity.save();
        return res.status(200).json({
            success: true,
            message: "Installation Data & Farmer Activity Saved/Updated Successfully"
        });
        
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Internal Server Error",
            error: error.message
        });
    }
};

module.exports = {
    updateLatitudeLongitude,
    addServicePersonState,
    showNewInstallationDataToInstaller,
    updateStatusOfIncomingItems,
    newSystemInstallation
}