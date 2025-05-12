const fs = require("fs");
const path = require("path");

const deleteAllReports = async (req, res) => {
    try {
        const date = new Date().toISOString().split("T")[0]; // Format: YYYY-MM-DD

        const allReports = [
            {
                folderPath: path.join(__dirname, "../uploads"),
                files: [
                    `OutgoingItemsReport_${date}.pdf`,
                    `IncomingItemsReport_${date}.pdf`,
                    `ServicePersonItemsReport_${date}.pdf`,
                    `RepairRejectReport_${date}.pdf`,
                    `BhiwaniDailyReport_${date}.pdf`,
                    `BhiwaniDailyItemsInOutReport_${date}.pdf`,
                    `BhiwaniOverallReport_${date}.pdf`,
                ],
            },
            {
                folderPath: path.join(__dirname, "../../uploads/rawMaterial"),
                files: [
                    `ServiceRecord_${date}.pdf`,
                    `RawMaterialStockReport_${date}.pdf`,
                    `DailyServiceRecord_${date}.pdf`,
                ],
            },
        ];

        const deletedFiles = [];
        const notFoundFiles = [];

        for (const reportGroup of allReports) {
            for (const fileName of reportGroup.files) {
                const filePath = path.join(reportGroup.folderPath, fileName);
                if (fs.existsSync(filePath)) {
                    try {
                        fs.unlinkSync(filePath);
                        deletedFiles.push(fileName);
                        console.log(`✅ Deleted: ${filePath}`);
                    } catch (error) {
                        console.error(`❌ Error deleting ${fileName}:`, error);
                    }
                } else {
                    notFoundFiles.push(fileName);
                }
            }
        }

        res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
        res.setHeader("Pragma", "no-cache");
        res.setHeader("Expires", "0");

        return res.json({
            success: true,
            message: "All file deletions processed.",
            deletedFiles,
            notFoundFiles,
        });
    } catch (error) {
        console.error("❌ Error during deletion:", error);
        return res.status(400).json({
            success: false,
            error: error.message,
        });
    }
};

module.exports = { deleteAllReports };