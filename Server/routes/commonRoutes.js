const {updateLatitudeLongitude, addServicePersonState} = require("../controllers/servicePersonController");
const {addIsActiveField} = require("../controllers/authController");
const {generateJoiningFormPDF} = require("../helpers/generateJoiningFormPDF");
const {generateIncomingItemsPDF} = require("../helpers/generateIncomingItemsPDF");
const {generateWarehouseTransactionPDF} = require("../helpers/generateWarehouseTransactionPDF");
const {generateServicePersonTransactionPDF} = require("../helpers/generateServiceTransactionPDF");
const {generateOverallReportPDF, generateDailyReportPDF, generateDistanceReportPDF} = require("../helpers/generateReportPDF");
const {exportIncomingPickupItemsToExcel, exportIncomingTotalItemsToExcel, uploadExcelAndUpdatePickupItems} = require("../controllers/pickupItemController");
const router = require("express").Router();
const multer = require("multer");
const storage = multer.memoryStorage();
const upload = multer({ storage });

router.put("/upload-excel", upload.single('file'), updateLatitudeLongitude);
router.put("/uploadState", upload.single('file'), addServicePersonState);
router.put("/update-status", upload.single('file'), uploadExcelAndUpdatePickupItems)
router.put("/add-isActive-field", addIsActiveField);
router.get("/generate-pdf", generateJoiningFormPDF);
router.post("/overall-report-pdf", generateOverallReportPDF);
router.post("/daily-report-pdf", generateDailyReportPDF);
router.post("/distance-report-pdf", generateDistanceReportPDF);
router.get("/export-pickUpItems-excel", exportIncomingPickupItemsToExcel);
router.get("/export-incoming-items-excel", exportIncomingTotalItemsToExcel);
router.post("/export-incomingItems-pdf", generateIncomingItemsPDF); //PDF for items remaining in the service person account
router.post("/export-warehouseOutgoing-pdf", generateWarehouseTransactionPDF);  //PDF for outgoing items from warehouse
router.post("/export-warehouseIncoming-pdf", generateServicePersonTransactionPDF); //PDF for incoming items to warehouse
module.exports = router;
