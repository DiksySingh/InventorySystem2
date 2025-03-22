const W2WTransition = require('../models/serviceInventoryModels/warehouse2WarehouseSchema');
const XLSX = require('xlsx');
const ServicePerson = require("../models/serviceInventoryModels/servicePersonSchema");

const W2W = async(req,res) =>{
    try {
        let { startDate, endDate, toWarehouse , fromWarehouse } = req.query;
        if (!startDate || !endDate) {
            return res.status(400).json({ message: "Start date and end date are required" });
        }
        // Convert to Date objects
        let start = new Date(startDate);
        let end = new Date(endDate);
        end.setHours(23, 59, 59, 999); // Ensure end of the day inclusion
        
        const records = await W2WTransition.find({
            pickupDate: { $gte: start, $lte: end },
            fromWarehouse
        });
        console.log(records);
        const formattedData = records.map(record => ({
            "From": record.fromWarehouse,
            "To": record.toWarehouse,
            "Pickup_Date": record.pickupDate,
            "Arrived_Date": record.arrivedDate,
            "Approved_By": record.approvedBy,
            "Driver_Name": record.driverName,
            "Driver_Contact": record.driverContact,
            "Items": record.items.map(item => `${item.itemName}(${item.quantity})`).join(", ")
        }));
        // console.log(formattedData)
        // Convert JSON data to a worksheet
        const ws = XLSX.utils.json_to_sheet(formattedData);
    
        // Create a new workbook and append the worksheet
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Data");
    
        // Define the file name
        const fileName = "W2W_data.xlsx";
    
        // Write the Excel file to a buffer (in-memory)
        const buffer = XLSX.write(wb, { bookType: "xlsx", type: "buffer" });
    
        // Set the response headers to force download in the browser
        res.setHeader(
            "Content-Disposition",
            `attachment; filename="${fileName}"`
        );
        res.setHeader(
            "Content-Type",
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        );
        res.send(buffer);
        // res.status(200).json(formattedData);
    } catch (error) {
        return res.status(400).json({
            success:false,
            message:error
        })
    }
}

const getServicePersonForStates = async (req, res) => {
    try {
        const state = ["Maharashtra", "Punjab", "Chhattisgarh", "Rajasthan"];

        // Assuming you have a ServicePerson model to fetch service persons from MongoDB
        const servicePersons = await ServicePerson.find({ state: { $in: state } });

        // Transform data into a format suitable for Excel
        const data = servicePersons.map((person) => ({
            Name: person.name,
            Contact: person.contact,
            Email: person.email,
            State: person.state,
        }));

        // Create a new worksheet from the data
        const worksheet = XLSX.utils.json_to_sheet(data);

        // Create a new workbook and append the worksheet
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "ServicePersons");

        // Write the workbook to a buffer
        const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

        // Optional: Set headers for file download and Excel content type (if needed)
        res.setHeader("Content-Disposition", "attachment; filename=Service_Persons.xlsx");
        res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");

        // Send the buffer as the response
        res.status(200).send(buffer);

    } catch (error) {
        console.error("Error generating Excel:", error);
        return res.status(500).json({
            success: false,
            message: "Internal Server Error",
            error: error.message,
        });
    }
};

module.exports = {
    W2W,
    getServicePersonForStates
}
