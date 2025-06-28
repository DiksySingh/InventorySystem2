const xlsx = require("xlsx");
const moment = require('moment');

const excelToJSON = async(buffer) =>{
    try {
        const workbook = xlsx.read(buffer, { type: 'buffer' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const excelData = xlsx.utils.sheet_to_json(worksheet , { defval: "", raw:true,}); // defval is help to revoke auto data formatting when data convert in json format
        return excelData;
    } catch (error) {
        console.log(error);
        return null;
    }
}   
module.exports = excelToJSON;