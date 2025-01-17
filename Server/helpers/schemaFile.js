// const mongoose = require("mongoose");
// const Schema = mongoose.Schema;

// const remarkSchema = new Schema({
//     roleId: {
//         type: Schema.Types.ObjectId,
//         ref: "Role"
//     },
//     remark: {
//         type: String,
//         required: true
//     },
//     created_At: {
//         type: Date,
//         default: Date.now()
//     },
//     updated_At: {
//         type: Date,
//         default: Date.now()
//     },
//     created_By: {
//         type: Schema.Types.ObjectId,
//         ref: "Employee",
//         required: true
//     },
//     updated_By: {
//         type: Schema.Types.ObjectId,
//         ref: "Employee"
//     }
// });

// const Remark = mongoose.model("Remark", remarkSchema);
// module.exports = Remark;



// const mongoose = require("mongoose");
// const Schema = mongoose.Schema;

// const imageGenerateSchema = new Schema({
//     saralId: {
//         type: String,
//         required: true
//     },
//     imageSaralId: {
//         type: String,
//         required: true
//     },
//     beneficiaryName: {
//         type: String,
//         required: true
//     },
//     installationDistrict: {
//         type: String,
//         required: true
//     },
//     initialLongitude: {
//         type: String,
//         required: true
//     },
//     initialLatitude: {
//         type: String,
//         required: true,
//     },
//     pumpCapacity: {
//         type: String,
//         required: true
//     },
//     villageName: {
//         type: String
//     }
// });

// const ImageGenerate = mongoose.model("ImageGenerate", imageGenerateSchema);
// module.exports = ImageGenerate;

// const multer = require("multer");
// const XLSX = require("xlsx");
// const ImageGenerate = require("../your/file/path");
// const storage = multer.memoryStorage();
// const upload = multer({ storage: storage });

// app.post("/addExcelData", upload.single("imageExcelData"), async (req, res) => {
//     try{
//         if (!req.file) {
//             return res.status(400).json({
//                 success: false,
//                 message: "No File Uploaded",
//             });
//         }

//         const workbook = XLSX.read(req.file.buffer, { type: "buffer" });
//         const sheetName = workbook.SheetNames[0];
//         const sheetData = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]); 

//         if (!sheetData || sheetData.length === 0) {
//             return res.status(400).json({
//                 success: false,
//                 message: "No data found in the Excel file",
//             });
//         }

//         const result = await ImageGenerate.insertMany(sheetData);

//         return res.status(200).json({
//             success: true,
//             message: "File processed & data inserted successfully",
//             data: result,
//         });

//     }catch(error){
//         return res.status(500).json({
//             success: false,
//             message: "Internal Server Error",
//             error: error.message
//         });
//     }
// });

const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const quarterlySchema = new Schema({
    farmerId: {
        type: Schema.Types.ObjectId,
        ref: 'Farmer',
        required: true
    },
    currentStatus: {
        type: String,
        required: true,
    },
    quarterly: {
        type: String,
        required: true,
    },
    image: {
        type: [String],
        required: true,
    },
    submitDate: {
        type: Date,
        default: Date.now,
    },
    created_At: {
        type: Date,
        default: Date.now
    },
    updated_At: {
        type: Date
    },
    created_By: {
        type: Schema.Types.ObjectId,
        ref: "Employee",
        required: true
    },
    updated_By: {
        type: Schema.Types.ObjectId,
        ref: "Employee"
    }
});

const Quarterly = mongoose.model("Quarterly", quarterlySchema);
module.exports = Quarterly;