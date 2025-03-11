const W2WTransition = require('../models/serviceInventoryModels/warehouse2WarehouseSchema');
const XLSX = require('xlsx');

const W2W = async(req,res) =>{
    try {
        let { startDate, endDate, toWarehouse , fromWarehouse} = req.query;
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
module.exports = {
    W2W
}
