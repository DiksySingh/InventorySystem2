const WarehousePerson = require("../../models/serviceInventoryModels/warehousePersonSchema");
const ServicePerson = require("../../models/serviceInventoryModels/servicePersonSchema");
const SurveyPerson = require("../../models/serviceInventoryModels/surveyPersonSchema");
const Warehouse = require("../../models/serviceInventoryModels/warehouseSchema");
const FarmerItemsActivity = require("../../models/systemInventoryModels/farmerItemsActivity");
const NewSystemInstallation = require("../../models/systemInventoryModels/newSystemInstallationSchema");
const Stage = require("../../models/systemInventoryModels/stageSchema");
const StageActivity = require("../../models/systemInventoryModels/stageActivitySchema");
const fs = require("fs/promises");
const path = require("path");
const axios = require("axios");
const { default: mongoose } = require("mongoose");

const BASE_URL = process.env.BASE_URL;

const getFullUrl = (path) => {
  if (!path) return null;
  if (Array.isArray(path)) return path.map((p) => `${BASE_URL}${p}`);
  return `${BASE_URL}${path}`;
};

module.exports.getServicePersonContacts = async (req, res) => {
  try {
    // Fetch all contacts from WarehousePerson, ServicePerson, and SurveyPerson
    //const warehouseContacts = await WarehousePerson.find({}, "contact");
    const serviceContacts = await ServicePerson.find(
      { isActive: true },
      "contact"
    );
    const surveyContacts = await SurveyPerson.find(
      { isActive: true },
      "contact"
    );

    // Combine all contacts into a single array
    let allContacts = [...serviceContacts, ...surveyContacts];

    // Process contacts to ensure they start with +91
    let formattedContacts = allContacts.map((person) => {
      let contact = person.contact.toString(); // Convert to string if it's a number
      return contact.startsWith("+91") ? contact : `+91${contact}`;
    });

    return res.status(200).json({
      success: true,
      data: formattedContacts,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message,
    });
  }
};

module.exports.getWarehousePersonContacts = async (req, res) => {
  try {
    // Fetch all contacts from WarehousePerson
    const warehouseContacts = await WarehousePerson.find(
      { isActive: true },
      "contact"
    );

    // Combine all contacts into a single array
    let allContacts = [...warehouseContacts];

    // Process contacts to ensure they start with +91
    let formattedContacts = allContacts.map((person) => {
      let contact = person.contact.toString(); // Convert to string if it's a number
      return contact.startsWith("+91") ? contact : `+91${contact}`;
    });

    return res.status(200).json({
      success: true,
      data: formattedContacts,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message,
    });
  }
};

module.exports.getServicePersonData = async (req, res) => {
  try {
    const { empId } = req.body;

    if (!empId || !Array.isArray(empId) || empId.length === 0) {
      return res.status(400).json({
        success: false,
        message: "EmpId is required and must be an array",
      });
    }

    // Fetch data from both models and filter required fields
    const results = await Promise.all(
      empId.map(async (id) => {
        const servicePerson = await ServicePerson.findOne(
          { _id: id, isActive: true },
          {
            name: 1,
            email: 1,
            contact: 1,
            state: 1,
            district: 1,
            block: 1,
            latitude: 1,
            longitude: 1,
            _id: 1,
          }
        );
        if (servicePerson) return servicePerson;

        const surveyPerson = await SurveyPerson.findOne(
          { _id: id, isActive: true },
          {
            name: 1,
            email: 1,
            contact: 1,
            state: 1,
            district: 1,
            block: 1,
            latitude: 1,
            longitude: 1,
            _id: 1,
          }
        );
        if (surveyPerson) return surveyPerson;

        return null; // If no record is found in both models
      })
    );

    // Filter out null values (cases where empId is not found in either model)
    const filteredResults = results.filter((person) => person !== null);

    return res.status(200).json({
      success: true,
      data: filteredResults,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message,
    });
  }
};

module.exports.allFieldPersonData = async (req, res) => {
  try {
    const [servicePersons, surveyPersons] = await Promise.all([
      ServicePerson.find({ isActive: true })
        .select(
          "-password -createdAt -createdBy -updatedAt -updatedBy -refreshToken -isActive -__v"
        )
        .sort({ state: 1, district: 1 }),
      SurveyPerson.find({ isActive: true })
        .select(
          "-password -createdAt -createdBy -updatedAt -updatedBy -refreshToken -isActive -__v"
        )
        .sort({ state: 1, district: 1 }),
    ]);

    const allPersons = [
      ...surveyPersons.map((person) => ({ ...person, role: "surveyperson" })),
      ...servicePersons.map((person) => ({ ...person, role: "serviceperson" })),
    ];

    const cleanedData = allPersons.map((item) => ({
      _id: item._doc._id,
      name: item._doc.name,
    }));

    return res.status(200).json({
      success: true,
      message: "Data Fetched Successfully",
      data: cleanedData || [],
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message,
    });
  }
};

module.exports.showAllWarehouses = async (req, res) => {
  try {
    // Query warehouses that have non-null latitude and longitude values
    const allWarehouses = await Warehouse.find({
      latitude: { $exists: true, $ne: null, $ne: "" },
      longitude: { $exists: true, $ne: null, $ne: "" },
    }).select("-__v -createdAt");

    if (allWarehouses.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No Warehouses Found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Data Fetched Successfully",
      allWarehouses,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message,
    });
  }
};

module.exports.stateWiseServiceSurveyPersons = async (req, res) => {
  try {
    const { state } = req.query;
    const filter = { isActive: true };
    if (state) {
      filter.state = state;
    }
    const [servicePersons, surveyPersons] = await Promise.all([
      ServicePerson.find(filter)
        .select(
          "-password -createdAt -createdBy -updatedAt -updatedBy -refreshToken -isActive -__v"
        )
        .sort({ state: 1, district: 1 }),
      SurveyPerson.find(filter)
        .select(
          "-password -createdAt -createdBy -updatedAt -updatedBy -refreshToken -isActive -__v"
        )
        .sort({ state: 1, district: 1 }),
    ]);

    const allPersons = [
      ...surveyPersons.map((person) => ({ ...person, role: "surveyperson" })),
      ...servicePersons.map((person) => ({ ...person, role: "serviceperson" })),
    ];

    const cleanedData = allPersons.map((item) => ({
      _id: item._doc._id,
      name: item._doc.name,
      role: item.role,
      email: item._doc.email,
      contact: item._doc.contact,
      state: item._doc.state,
      district: item._doc.district,
      block: item._doc.block,
      latitude: item._doc.latitude,
      longitude: item._doc.longitude,
    }));

    return res.status(200).json({
      success: true,
      message: "Data Fetched Successfully",
      data: cleanedData || [],
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message,
    });
  }
};

module.exports.getFarmerInstallationDetails = async (req, res) => {
  try {
    const { saralId } = req.query;
    if (!saralId) {
      return res.status(400).json({ message: "saralId is required" });
    }
    const upperCaseSaralId = saralId.toUpperCase().trim();

    const farmerActivity = await FarmerItemsActivity.findOne(
      { farmerSaralId: upperCaseSaralId },
      {
        panelNumbers: 1,
        controllerNumber: 1,
        rmuNumber: 1,
        pumpNumber: 1,
        motorNumber: 1,
        _id: 0,
      }
    ).lean();

    const systemInstallation = await NewSystemInstallation.findOne(
      { farmerSaralId: upperCaseSaralId },
      {
        pitPhoto: 1,
        borePhoto: 1,
        earthingFarmerPhoto: 1,
        antiTheftNutBoltPhoto: 1,
        lightingArresterInstallationPhoto: 1,
        finalFoundationFarmerPhoto: 1,
        panelFarmerPhoto: 1,
        controllerBoxFarmerPhoto: 1,
        waterDischargeFarmerPhoto: 1,
        installationVideo: 1,
        _id: 0,
      }
    ).lean();

    if (!farmerActivity && !systemInstallation) {
      return res
        .status(404)
        .json({ message: "No data found for this saralId" });
    }

    res.status(200).json({
      success: true,
      message: `Installation Data Fetched For Saral Id - ${upperCaseSaralId}`,
      data: {
        farmerSaralId: farmerActivity.farmerSaralId,
        panelNumbers: farmerActivity?.panelNumbers || [],
        controllerNumber: farmerActivity?.controllerNumber || null,
        rmuNumber: farmerActivity?.rmuNumber || null,
        pumpNumber: farmerActivity?.pumpNumber || null,
        motorNumber: farmerActivity?.motorNumber || null,
        photos: {
          pitPhoto: getFullUrl(systemInstallation?.pitPhoto),
          borePhoto: getFullUrl(systemInstallation?.borePhoto),
          earthingFarmerPhoto: getFullUrl(
            systemInstallation?.earthingFarmerPhoto
          ),
          antiTheftNutBoltPhoto: getFullUrl(
            systemInstallation?.antiTheftNutBoltPhoto
          ),
          lightingArresterInstallationPhoto: getFullUrl(
            systemInstallation?.lightingArresterInstallationPhoto
          ),
          finalFoundationFarmerPhoto: getFullUrl(
            systemInstallation?.finalFoundationFarmerPhoto
          ),
          panelFarmerPhoto: getFullUrl(systemInstallation?.panelFarmerPhoto),
          controllerBoxFarmerPhoto: getFullUrl(
            systemInstallation?.controllerBoxFarmerPhoto
          ),
          waterDischargeFarmerPhoto: getFullUrl(
            systemInstallation?.waterDischargeFarmerPhoto
          ),
        },
        videos: getFullUrl(systemInstallation?.installationVideo),
        stageId: systemInstallation.stageId,
        remarks: systemInstallation.remarks
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || "Internal Server Error",
    });
  }
};

module.exports.allFieldEmployeeData = async (req, res) => {
  try {
    const [servicePersons, surveyPersons] = await Promise.all([
      ServicePerson.find({})
        .select(
          "-password -createdAt -createdBy -updatedAt -updatedBy -refreshToken -isActive -__v"
        )
        .sort({ state: 1, district: 1 }),
      SurveyPerson.find({})
        .select(
          "-password -createdAt -createdBy -updatedAt -updatedBy -refreshToken -isActive -__v"
        )
        .sort({ state: 1, district: 1 }),
    ]);

    const allPersons = [
      ...surveyPersons.map((person) => ({ ...person, role: "surveyperson" })),
      ...servicePersons.map((person) => ({ ...person, role: "serviceperson" })),
    ];

    const excludedNames = ["Ashish Rawat", "Nitesh Kumar"];

    const cleanedData = allPersons
      .filter((item) => !excludedNames.includes(item._doc.name))
      .map((item) => ({
        _id: item._doc._id,
        name: item._doc.name,
      }));

    return res.status(200).json({
      success: true,
      message: "Data Fetched Successfully",
      data: cleanedData || [],
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message,
    });
  }
};

module.exports.allFarmerActivites = async (req, res) => {
  try {

    const activities = await FarmerItemsActivity.find({
      //accepted: false,
      $or: [
        { empId: null },
        { empId: { $exists: false } }
      ]
    })
      .populate("warehouseId", "warehouseName")
      .populate("systemId", "systemName")
      .populate("itemsList.systemItemId", "itemName")
      .populate("extraItemsList.systemItemId", "itemName")
      .sort({ createdAt: -1 })
      .lean();

    const saralIds = activities.map(a => a.farmerSaralId);

    const farmerResponses = await Promise.all(
      saralIds.map(id =>
        axios
          .get(`http://88.222.214.93:8001/farmer/showFarmerAccordingToSaralId?saralId=${id}`)
          .then(res => ({ saralId: id, data: res?.data?.data }))
          .catch(() => ({ saralId: id, data: null }))
      )
    );

    const farmerMap = {};

    farmerResponses.forEach(f => {
      farmerMap[f.saralId] = f.data;
    });

    const activitiesWithFarmerDetails = activities.map(activity => ({
      ...activity,
      farmerDetails: farmerMap[activity.farmerSaralId] || null
    }));

    return res.status(200).json({
      success: true,
      message: "Data Fetched Successfully",
      data: activitiesWithFarmerDetails
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message
    });
  }
};

module.exports.updateStage = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { installationId, stageId, empId, updatedBy, remarkId } = req.body;

    if (!installationId || !stageId || !updatedBy) {
      return res.status(400).json({
        success: false,
        message: "installationId, stageId and updatedBy are required",
      });
    }

    if (
      !mongoose.Types.ObjectId.isValid(installationId) ||
      !mongoose.Types.ObjectId.isValid(stageId)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid ObjectId",
      });
    }

    // 1️⃣ Update installation stage
    const updatedInstallation = await NewSystemInstallation.findByIdAndUpdate(
      installationId,
      {
        stageId: new mongoose.Types.ObjectId(stageId),
        updatedAt: new Date(),
        updatedBy: updatedBy,
      },
      { new: true, session }
    );

    if (!updatedInstallation) {
      await session.abortTransaction();
      session.endSession();

      return res.status(404).json({
        success: false,
        message: "Installation not found",
      });
    }

    // 2️⃣ Save stage activity
    const addStageActivity = new StageActivity({
      installationId: new mongoose.Types.ObjectId(installationId),
      empId: new mongoose.Types.ObjectId(empId),
      stageId: new mongoose.Types.ObjectId(stageId),
      remarkId: remarkId ? new mongoose.Types.ObjectId(remarkId) : null,
    });

    await addStageActivity.save({ session });

    // 3️⃣ Commit transaction
    await session.commitTransaction();
    session.endSession();

    return res.status(200).json({
      success: true,
      message: "Stage updated successfully",
      data: updatedInstallation,
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();

    console.error("Error updating stage:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

module.exports.approveInstallationData = async (req, res) => {
  const session = await mongoose.startSession();

  try {
    const { department, installationId, updatedByName, updatedByEmpId } = req.body;

    if (!department) {
      return res.status(400).json({
        success: false,
        message: "department is required"
      });
    }

    if (!installationId || !mongoose.Types.ObjectId.isValid(installationId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid installationId"
      });
    }

    if (!updatedByName || !updatedByEmpId) {
      return res.status(400).json({
        success: false,
        message: "updatedByName & updatedByEmpId are required"
      });
    }

    await session.withTransaction(async () => {

      // 🔹 Get current installation stage
      const installationData = await NewSystemInstallation
        .findById(installationId)
        .populate({
          path: "stageId",
          select: { stage: 1 }
        })
        .session(session);

      if (!installationData) {
        throw new Error("Installation not found");
      }

      let stageId = null;

      // ✅ VT-1 Approval validation
      if (department === "Document Verify Team-1") {

        if (installationData.stageId?.stage !== "Pending") {
          throw new Error("Installation must be in Pending stage for VT-1 approval");
        }

        stageId = new mongoose.Types.ObjectId("69b28068d994f4a0d8666078"); // Approved By VT-1
      }

      // ✅ VT-2 Approval validation
      else if (department === "Document Verify Team-2") {

        if (installationData.stageId?.stage !== "Approved By VT-1") {
          throw new Error("Installation must be Approved By VT-1 before VT-2 approval");
        }

        stageId = new mongoose.Types.ObjectId("69b28076d994f4a0d866607e"); // Approved By VT-2
      }

      else {
        throw new Error("Invalid department");
      }

      // 🔹 Update stage
      const updatedInstallation = await NewSystemInstallation.findByIdAndUpdate(
        installationId,
        {
          $set: {
            stageId: stageId,
            updatedBy: updatedByName,
            updatedAt: new Date()
          }
        },
        { new: true, session }
      );

      if (!updatedInstallation) {
        throw new Error("Installation not found during update");
      }

      // 🔹 Save stage activity
      const stageActivity = new StageActivity({
        installationId: new mongoose.Types.ObjectId(installationId),
        empId: new mongoose.Types.ObjectId(updatedByEmpId),
        stageId: stageId,
        remarkId: null
      });

      await stageActivity.save({ session });

    });

    session.endSession();

    return res.status(200).json({
      success: true,
      message: "Installation approved successfully"
    });

  } catch (error) {

    session.endSession();

    return res.status(500).json({
      success: false,
      message: error.message || "Internal Server Error"
    });
  }
};

module.exports.rejectInstallationData = async (req, res) => {
  const session = await mongoose.startSession();

  try {
    const { department, installationId, updatedByName, updatedByEmpId, remarkId } = req.body;

    if (!department) {
      return res.status(400).json({
        success: false,
        message: "department is required"
      });
    }

    if (!installationId || !mongoose.Types.ObjectId.isValid(installationId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid installationId"
      });
    }

    if (!updatedByName || !updatedByEmpId) {
      return res.status(400).json({
        success: false,
        message: "updatedByName & updatedByEmpId are required"
      });
    }

    if (!remarkId || !mongoose.Types.ObjectId.isValid(remarkId)) {
      return res.status(400).json({
        success: false,
        message: "Valid remarkId is required"
      });
    }

    await session.withTransaction(async () => {

      const installationData = await NewSystemInstallation
        .findById(installationId)
        .populate({
          path: "stageId",
          select: { stage: 1 }
        })
        .session(session);

      if (!installationData) {
        throw new Error("Installation not found");
      }

      let stageId = null;

      // ❌ VT-1 cannot reject
      if (department === "Document Verify Team-1") {
        throw new Error("VT-1 is not authorized to reject installation");
      }

      // ✅ VT-2 rejection
      else if (department === "Document Verify Team-2") {

        if (installationData.stageId?.stage === "Rejected By VT-2") {
          throw new Error("Installation already rejected by VT-2");
        }

        if (installationData.stageId?.stage !== "Approved By VT-1") {
          throw new Error("Installation must be Approved By VT-1 before VT-2 rejection");
        }

        // Rejected By VT-2 stage
        stageId = new mongoose.Types.ObjectId("69b2807cd994f4a0d8666081");
      }

      else {
        throw new Error("Invalid department");
      }

      // Update installation
      const updatedInstallation = await NewSystemInstallation.findByIdAndUpdate(
        installationId,
        {
          $set: {
            stageId: stageId,
            updatedBy: updatedByName,
            updatedAt: new Date()
          }
        },
        { new: true, session }
      );

      if (!updatedInstallation) {
        throw new Error("Installation not found during update");
      }

      // Insert stage activity
      const stageActivity = new StageActivity({
        installationId: new mongoose.Types.ObjectId(installationId),
        empId: new mongoose.Types.ObjectId(updatedByEmpId),
        stageId: stageId,
        remarkId: new mongoose.Types.ObjectId(remarkId)
      });

      await stageActivity.save({ session });

    });

    session.endSession();

    return res.status(200).json({
      success: true,
      message: "Installation rejected successfully"
    });

  } catch (error) {

    session.endSession();

    return res.status(500).json({
      success: false,
      message: error.message || "Internal Server Error"
    });
  }
};

module.exports.deleteRejectedInstallationPhotos = async (req, res) => {
  const session = await mongoose.startSession();

  try {
    const { installationId, rejectedFiles, updatedByName, updatedByEmpId } = req.body;

    if (!installationId || !mongoose.Types.ObjectId.isValid(installationId)) {
      return res.status(400).json({
        success: false,
        message: "Valid installationId is required"
      });
    }

    if (!Array.isArray(rejectedFiles) || rejectedFiles.length === 0) {
      return res.status(400).json({
        success: false,
        message: "rejectedFiles array is required"
      });
    }

    if(!updatedByName || !updatedByEmpId) {
      return res.status(400).json({
        success: false,
        message: "updatedByName & updatedByEmpId are required"
      });
    }

    const allowedFields = [
      "pitPhoto",
      "borePhoto",
      "earthingFarmerPhoto",
      "antiTheftNutBoltPhoto",
      "lightingArresterInstallationPhoto",
      "finalFoundationFarmerPhoto",
      "panelFarmerPhoto",
      "controllerBoxFarmerPhoto",
      "waterDischargeFarmerPhoto",
      "installationVideo"
    ];

    const deletedFiles = [];
    const failedFiles = [];
    const pullQuery = {};

    const installationData = await NewSystemInstallation
      .findById(installationId)
      .populate({
        path: "stageId",
        select: { stage: 1 }
      });

    if (!installationData) {
      return res.status(404).json({
        success: false,
        message: "Installation Data Not Found"
      });
    }

    if (installationData.stageId?.stage === "Rejected By VT-1") {
      return res.status(400).json({
        success: false,
        message: "Installation already rejected"
      });
    }

    // 🔥 Delete files in parallel
    const deleteTasks = rejectedFiles.map(async (file) => {
      try {
        const { type, url } = file;

        if (!type || !url || !allowedFields.includes(type)) {
          failedFiles.push(file);
          return;
        }

        const parsedUrl = new URL(url);
        const filePath = parsedUrl.pathname;

        if (!filePath.startsWith("/uploads/newInstallation/")) {
          failedFiles.push(file);
          return;
        }

        const fullPath = path.join(__dirname, "../../", filePath);

        await fs.unlink(fullPath).catch(() => {});

        deletedFiles.push(filePath);

        if (!pullQuery[type]) {
          pullQuery[type] = { $in: [] };
        }

        pullQuery[type].$in.push(filePath);

      } catch (err) {
        failedFiles.push(file);
      }
    });

    await Promise.all(deleteTasks);

    await session.withTransaction(async () => {

      const updateQuery = {
        $pull: pullQuery,
        $set: {
          stageId: new mongoose.Types.ObjectId("69b2806fd994f4a0d866607b"),
          updatedBy: updatedByName,
          updatedAt: new Date()
        }
      };

      const updatedDoc = await NewSystemInstallation.findByIdAndUpdate(
        installationId,
        updateQuery,
        { new: true, session }
      ).lean();

      const setNullQuery = {};

      for (const field of allowedFields) {
        if (Array.isArray(updatedDoc[field]) && updatedDoc[field].length === 0) {
          setNullQuery[field] = null;
        }
      }

      if (Object.keys(setNullQuery).length > 0) {
        await NewSystemInstallation.findByIdAndUpdate(
          installationId,
          { $set: setNullQuery },
          { session }
        );
      }

      const addStageActivity = new StageActivity({
        installationId: new mongoose.Types.ObjectId(installationId),
        empId: new mongoose.Types.ObjectId(updatedByEmpId),
        stageId: new mongoose.Types.ObjectId("69b2806fd994f4a0d866607b"),
        remarkId: null
      });

      await addStageActivity.save({ session });

    });

    session.endSession();

    return res.status(200).json({
      success: true,
      message: "Rejected photos processed successfully",
      deletedFiles,
      failedFiles
    });

  } catch (error) {

    await session.abortTransaction();
    session.endSession();

    console.error("Error deleting rejected photos:", error);

    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message
    });
  }
};

module.exports.getVT2ApprovedByDate = async (req, res) => {
  try {
    const { date } = req.query;

    // ✅ 1. Validate date
    if (!date) {
      return res.status(400).json({
        success: false,
        message: "Date is required",
      });
    }

    const parsedDate = new Date(date);
    if (isNaN(parsedDate)) {
      return res.status(400).json({
        success: false,
        message: "Invalid date format",
      });
    }

    // ✅ 2. IST-safe day range
    const startDate = new Date(parsedDate);
    startDate.setHours(0, 0, 0, 0);

    const endDate = new Date(parsedDate);
    endDate.setHours(23, 59, 59, 999);

    const data = await StageActivity.aggregate([
      // ✅ 3. Filter by date FIRST (performance)
      {
        $match: {
          stageId: ObjectId("69b28076d994f4a0d866607e"),
          createdAt: {
            $gte: startDate,
            $lte: endDate,
          },
        },
      },
      // ⚠️ Handle missing stage
      {
        $unwind: {
          path: "$stage",
          preserveNullAndEmptyArrays: false,
        },
      },

      // ✅ 5. Filter VT-2
      {
        $match: {
          "stage.name": "Approved By VT-2",
        },
      },

      // ✅ 6. Remove duplicates (same installation multiple logs)
      {
        $sort: { createdAt: 1 },
      },
      {
        $group: {
          _id: "$installationId",
          latest: { $last: "$$ROOT" },
        },
      },
      {
        $replaceRoot: { newRoot: "$latest" },
      },

      // ✅ 7. Join Installation
      {
        $lookup: {
          from: "inNewSystemInstallations",
          localField: "installationId",
          foreignField: "_id",
          as: "installation",
        },
      },

      // ⚠️ Handle missing installation
      {
        $unwind: {
          path: "$installation",
          preserveNullAndEmptyArrays: false,
        },
      },

      // ✅ 8. Only ServicePerson (installer)
      {
        $match: {
          "installation.referenceType": "ServicePerson",
        },
      },

      // ✅ 9. Join Installer
      {
        $lookup: {
          from: "inServicePersons",
          localField: "installation.createdBy",
          foreignField: "_id",
          as: "installer",
        },
      },

      // ⚠️ Handle missing installer safely
      {
        $unwind: {
          path: "$installer",
          preserveNullAndEmptyArrays: true,
        },
      },

      // ✅ 10. Final Projection (safe fallback values)
      {
        $project: {
          _id: 0,
          farmerSaralId: {
            $ifNull: ["$installation.farmerSaralId", "N/A"],
          },
          installerName: {
            $ifNull: ["$installer.name", "Unknown"],
          },
          approvedAt: "$createdAt",
        },
      },

      // ✅ 11. Sort latest first
      {
        $sort: { approvedAt: -1 },
      },
    ]);

    return res.status(200).json({
      success: true,
      count: data.length,
      data,
    });

  } catch (error) {
    console.error("VT2 Report Error:", error);

    return res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

module.exports.verifyInstallationAtStageVT2 = async (req, res) => {
  try {
    const { saralIds } = req.body;

    // ✅ Hardcoded VT-2 StageId (IMPORTANT)
    const VT2_STAGE_ID = "69b28076d994f4a0d866607e"; 

    // ✅ 1. Validate input
    if (!Array.isArray(saralIds) || saralIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: "saralIds must be a non-empty array",
      });
    }

    // ✅ 2. Normalize input (optional but recommended)
    const normalizedSaralIds = saralIds.map(id => String(id).trim());

    // ✅ 3. Fetch installations (single DB call)
    const installations = await mongoose
      .model("NewSystemInstallation")
      .find({
        farmerSaralId: { $in: normalizedSaralIds },
      })
      .select("farmerSaralId stageId")
      .lean();

    // ✅ 4. Create VT-2 Set (fast lookup)
    const vt2Set = new Set();

    installations.forEach(inst => {
      if (
        inst.stageId &&
        inst.stageId.toString() === VT2_STAGE_ID
      ) {
        vt2Set.add(inst.farmerSaralId);
      }
    });

    // ✅ 5. Prepare final response
    const result = normalizedSaralIds.map(id => ({
      farmerSaralId: id,
      verified: vt2Set.has(id),
    }));

    // ✅ 6. Response
    return res.status(200).json({
      success: true,
      count: result.length,
      data: result,
    });

  } catch (error) {
    console.error("VT2 Verify Error:", error);

    return res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};