const WarehousePerson = require("../../models/serviceInventoryModels/warehousePersonSchema");
const ServicePerson = require("../../models/serviceInventoryModels/servicePersonSchema");
const SurveyPerson = require("../../models/serviceInventoryModels/surveyPersonSchema");
const Warehouse = require("../../models/serviceInventoryModels/warehouseSchema");
const FarmerItemsActivity = require("../../models/systemInventoryModels/farmerItemsActivity");
const NewSystemInstallation = require("../../models/systemInventoryModels/newSystemInstallationSchema");

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
