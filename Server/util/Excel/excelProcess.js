const XLSX = require("xlsx");
const processExcelFile = (fileBuffer) => {
    try{
        const workbook = XLSX.read(fileBuffer, { type: "buffer" });
        const sheetName = workbook.SheetNames[0];
        const sheetData = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);

        return {
            success: true,
            data: sheetData
        }
    }catch(error){
        return {
            success: false,
            error: error.message
        }
    }
};

module.exports = processExcelFile;