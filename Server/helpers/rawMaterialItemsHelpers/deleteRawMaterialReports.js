const fs = require("fs");
const path = require("path");

const deleteRawMaterialReport = async(req, res) =>{
    try {
        const date = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
        console.log(date)
        const fileNames = [
            `ServiceRecord_${date}.pdf`,
            `RawMaterialStockReport_${date}.pdf`,
        ];
        const deletedFiles = [];
        const notFoundFiles = [];

        fileNames.forEach((fileName) => {
            const filePath = path.join(__dirname, "../../uploads/rawMaterial", fileName);
    
            if (fs.existsSync(filePath)) {
                try {
                    fs.unlinkSync(filePath); // Delete the file
                    deletedFiles.push(fileName);
                    console.log(`✅ Deleted: ${filePath}`);
                } catch (error) {
                    console.error(`❌ Error deleting ${fileName}:`, error);
                }
            } else {
                notFoundFiles.push(fileName);
            }
        });
    
        // Cache-control headers to force reload
        res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
        res.setHeader("Pragma", "no-cache");
        res.setHeader("Expires", "0");
    
        return res.json({
            success: true,
            message: "File deletion process completed.",
            deletedFiles,
            notFoundFiles,
        });
    } catch (error) {
        console.log("delete file ",error)
        return res.status(400).json({
            success:false,
            error: error.message
        });
    }
};

module.exports = {deleteRawMaterialReport};