const xlsx = require("xlsx");
const ServicePerson = require("../../models/serviceInventoryModels/servicePersonSchema"); // Import your model

// Controller function to generate Excel and send as a download
const downloadActiveServicePersonsExcel = async (req, res) => {
    try {
        // Fetching only active service persons
        const servicePersons = await ServicePerson.find({state: "Maharashtra", isActive: true}).lean();

        // Mapping relevant fields (name, contact, state, isActive)
        const excelData = servicePersons.map(person => ({
            Name: person.name || '',
            Contact: person.contact || '',
            State: person.state || '',
            IsActive: person.isActive ? "Active": "Not Active",
            Latitude: person.latitude ? person.latitude : "",
            Longitude: person.longitude ? person.longitude : ""
        }));

        // Create worksheet and workbook
        const worksheet = xlsx.utils.json_to_sheet(excelData);
        const workbook = xlsx.utils.book_new();
        xlsx.utils.book_append_sheet(workbook, worksheet, "Service Persons");

        // Write workbook to a buffer
        const buffer = xlsx.write(workbook, { type: "buffer", bookType: "xlsx" });

        // Set headers to prompt download and send the buffer
        res.setHeader("Content-Disposition", "attachment; filename=ServicePersons.xlsx");
        res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");

        res.send(buffer);
    } catch (error) {
        console.error("Error generating Excel file:", error);
        res.status(500).json({ message: "Failed to generate Excel file" });
    }
};

module.exports = { downloadActiveServicePersonsExcel };