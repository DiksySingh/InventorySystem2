const WarehousePerson = require("../models/serviceInventoryModels/warehousePersonSchema");
const ServicePerson = require("../models/serviceInventoryModels/servicePersonSchema");
const SurveyPerson = require("../models/serviceInventoryModels/surveyPersonSchema");

module.exports.getServicePersonContacts = async (req, res) => {
    try {
        // Fetch all contacts from WarehousePerson, ServicePerson, and SurveyPerson
        //const warehouseContacts = await WarehousePerson.find({}, "contact");
        const serviceContacts = await ServicePerson.find({}, "contact");
        const surveyContacts = await SurveyPerson.find({}, "contact");

        // Combine all contacts into a single array
        let allContacts = [...serviceContacts, ...surveyContacts];

        // Process contacts to ensure they start with +91
        let formattedContacts = allContacts.map(person => {
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
        const warehouseContacts = await WarehousePerson.find({}, "contact");

        // Combine all contacts into a single array
        let allContacts = [...warehouseContacts];

        // Process contacts to ensure they start with +91
        let formattedContacts = allContacts.map(person => {
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
