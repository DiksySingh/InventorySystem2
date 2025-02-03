const processExcelFile = require("../util/Excel/excelProcess");
const ServicePerson = require("../models/servicePersonSchema");
const SurveyPerson = require("../models/surveyPersonSchema");
const imageHandlerWithPath = require("../middlewares/imageHandlerWithPath");
const FarmerItemsActivity = require("../models/systemInventoryModels/farmerItemsActivity");
const NewSystemInstallation = require("../models/systemInventoryModels/newSystemInstallationSchema");

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
                    "name": 1,
                    "email": 1,
                    "contact": 1,
                    "warehouse": 1
                }
            })
            .populate({
                path: "empId",
                select: {
                    "name": 1,
                    "email": 1,
                    "contact": 1
                }
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

        if(!farmerId || !accepted) {
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
            const { itemId, quantity } = item;

            const existingItem = empAccount.itemsList.find(i => i.itemId === itemId);

            if (existingItem) {
                existingItem.quantity = parseInt(existingItem.quantity) +  parseInt(quantity);
            } else {
                empAccount.items.push({ itemId: itemId, quantity });
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

        if (!farmerId || !latitude || !longitude || !borePhoto || !challanPhoto || !landDocPhoto || !sprinklerPhoto ||!boreFarmerPhoto || !finalFoundationFarmerPhoto || !panelFarmerPhoto || !controllerBoxFarmerPhoto || !waterDischargeFarmerPhoto) {
            return res.status(400).json({
                success:false,
                message:"All fields are required."
            });
        }

        let refType;
        let empData = await ServicePerson.find({ _id: req.user._id });
        if (!empData) {
            empData = await SurveyPerson.find({ _id: req.user._id });
            if (!empData) {
                return res.status(400).json({
                    success: false,
                    message: "Employee Data Is Not Available"
                });
            }
            refType = "SurveyPerson";
        }
        refType = "ServicePerson";
        
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