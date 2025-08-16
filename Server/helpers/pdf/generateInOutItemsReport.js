const PickupItem = require("../../models/serviceInventoryModels/pickupItemSchema");
const ExcelJS = require("exceljs");

const getDateRange = () => {
  const now = new Date();
  const start = new Date(now.getFullYear(), 3, 1); // April is index 3
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  return { start, end };
};

const exportPickupItemsToExcel = async (req, res) => {
  try {
    const { start, end } = getDateRange();

    const pickupItems = await PickupItem.find({
      //pickupDate: { $gte: start, $lte: end }
      status: null
    }).populate("servicePerson");

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Pickup Items");

    // Define headers
    worksheet.columns = [
      { header: "Service Person Name", key: "servicePersonName", width: 25 },
      { header: "Service Person Contact", key: "servicePerContact", width: 20 },
      { header: "Farmer Name", key: "farmerName", width: 20 },
      { header: "Farmer Contact", key: "farmerContact", width: 20 },
      { header: "Farmer Village", key: "farmerVillage", width: 20 },
      { header: "Farmer Saral ID", key: "farmerSaralId", width: 20 },
      { header: "Warehouse", key: "warehouse", width: 20 },
      { header: "Serial Number", key: "serialNumber", width: 20 },
      { header: "Incoming", key: "incoming", width: 15 },
      { header: "New Stock", key: "isNewStock", width: 15 },
      { header: "Pickup Date", key: "pickupDate", width: 20 },
      { header: "Arrived Date", key: "arrivedDate", width: 20 },
      { header: "Installation Done", key: "installationDone", width: 15 },
      { header: "Approved By", key: "approvedBy", width: 20 },
      { header: "Remark", key: "remark", width: 30 },
      { header: "Items", key: "items", width: 40 },
      { header: "Total Quantity", key: "totalQuantity", width: 15 }
    ];

    // Add data rows
    pickupItems.forEach(item => {
      const itemsDescription = item.items?.map(it => `${it.itemName} x${it.quantity}`).join(", ") || "";
      const totalQuantity = item.items?.reduce((sum, it) => sum + (it.quantity || 0), 0) || 0;

      worksheet.addRow({
        servicePersonName: item.servicePersonName || "",
        servicePerContact: item.servicePerContact || "",
        farmerName: item.farmerName || "",
        farmerContact: item.farmerContact || "",
        farmerVillage: item.farmerVillage || "",
        farmerSaralId: item.farmerSaralId || "",
        warehouse: item.warehouse || "",
        serialNumber: item.serialNumber || "",
        incoming: item.incoming ? "Yes" : "No",
        isNewStock: item.isNewStock ? "Yes" : "No",
        pickupDate: item.pickupDate ? item.pickupDate.toLocaleDateString() : "",
        arrivedDate: item.arrivedDate ? item.arrivedDate.toLocaleDateString() : "",
        installationDone: item.installationDone ? "Yes" : "No",
        approvedBy: item.approvedBy || "",
        remark: item.remark || "",
        items: itemsDescription,
        totalQuantity
      });
    });

    // Set headers for Excel file download
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=PickupItems-AprilToNow.xlsx"
    );

    // Send workbook
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error("Error generating Excel:", error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

module.exports = { exportPickupItemsToExcel };

// const PickupItem = require("../../models/serviceInventoryModels/pickupItemSchema");
// const ExcelJS = require("exceljs");

// const getDateRange = () => {
//   const now = new Date();
//   const start = new Date(now.getFullYear(), 6, 1); // April is month index 3
//   const end = new Date();
//   end.setHours(23, 59, 59, 999);
//   return { start, end };
// };

// const exportPickupItemsToExcel = async (req, res) => {
//   try {
//     const { start, end } = getDateRange();

//     const pickupItems = await PickupItem.find({
//       //pickupDate: { $gte: start, $lte: end }
//       status: null
//     }).populate("servicePerson");

//     const workbook = new ExcelJS.Workbook();
//     const worksheet = workbook.addWorksheet("Pickup Items");

//     // Define headers
//     worksheet.columns = [
//       { header: "Service Person Name", key: "servicePersonName", width: 25 },
//       { header: "Service Person Contact", key: "servicePerContact", width: 20 },
//       { header: "Farmer Name", key: "farmerName", width: 20 },
//       { header: "Farmer Contact", key: "farmerContact", width: 20 },
//       { header: "Farmer Village", key: "farmerVillage", width: 20 },
//       { header: "Farmer Saral ID", key: "farmerSaralId", width: 20 },
//       { header: "Warehouse", key: "warehouse", width: 20 },
//       { header: "Serial Number", key: "serialNumber", width: 20 },
//       { header: "Incoming", key: "incoming", width: 15 },
//       { header: "New Stock", key: "isNewStock", width: 15 },
//       { header: "Pickup Date", key: "pickupDate", width: 20 },
//       { header: "Arrived Date", key: "arrivedDate", width: 20 },
//       { header: "Installation Done", key: "installationDone", width: 15 },
//       { header: "Approved By", key: "approvedBy", width: 20 },
//       { header: "Remark", key: "remark", width: 30 },
//       { header: "Item Name", key: "itemName", width: 25 },
//       { header: "Quantity", key: "quantity", width: 10 }
//     ];

//     // One row per item
//     pickupItems.forEach(item => {
//       const commonData = {
//         servicePersonName: item.servicePersonName || "",
//         servicePerContact: item.servicePerContact || "",
//         farmerName: item.farmerName || "",
//         farmerContact: item.farmerContact || "",
//         farmerVillage: item.farmerVillage || "",
//         farmerSaralId: item.farmerSaralId || "",
//         warehouse: item.warehouse || "",
//         serialNumber: item.serialNumber || "",
//         incoming: item.incoming ? "Yes" : "No",
//         isNewStock: item.isNewStock ? "Yes" : "No",
//         pickupDate: item.pickupDate ? item.pickupDate.toLocaleDateString() : "",
//         arrivedDate: item.arrivedDate ? item.arrivedDate.toLocaleDateString() : "",
//         installationDone: item.installationDone ? "Yes" : "No",
//         approvedBy: item.approvedBy || "",
//         remark: item.remark || ""
//       };

//       if (item.items && item.items.length > 0) {
//         item.items.forEach(i => {
//           worksheet.addRow({
//             ...commonData,
//             itemName: i.itemName,
//             quantity: i.quantity
//           });
//         });
//       } else {
//         // In case items array is empty or missing
//         worksheet.addRow({
//           ...commonData,
//           itemName: "",
//           quantity: ""
//         });
//       }
//     });

//     // Set headers for Excel file download
//     res.setHeader(
//       "Content-Type",
//       "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
//     );
//     res.setHeader(
//       "Content-Disposition",
//       "attachment; filename=PickupItems-OneItemPerRow.xlsx"
//     );

//     await workbook.xlsx.write(res);
//     res.end();
//   } catch (error) {
//     console.error("Error generating Excel:", error);
//     res.status(500).json({ success: false, message: "Server Error" });
//   }
// };

// module.exports = { exportPickupItemsToExcel };
