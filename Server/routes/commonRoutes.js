const {updateLatitudeLongitude, addServicePersonState} = require("../controllers/servicePersonController");
const {addIsActiveField} = require("../controllers/authController");
const {deductFromDefectiveOfItems} = require("../controllers/warehouseController");
const {generateJoiningFormPDF} = require("../helpers/generateJoiningFormPDF");
const {generateIncomingItemsPDF} = require("../helpers/generateIncomingItemsPDF");
const {servicePersonRepairedHoldingItemsPDF} = require("../helpers/servicePersonRepairedItemsAccount");
const {generateWarehouseTransactionPDF} = require("../helpers/generateWarehouseTransactionPDF");
const {generateServicePersonTransactionPDF} = require("../helpers/generateServiceTransactionPDF");
const {generateWarehouseStockReportPDF} = require("../helpers/generateWarehouseStockReport");
const {generateItemRepairRejectPDF} = require("../helpers/generateItemRepairRejectPDF");
const {deleteReport} = require("../helpers/deleteReport");
const {downloadActiveServicePersonsExcel} = require("../helpers/generateServicePersonData");
const {generateDailyInDefectiveItems} = require("../helpers/generateSPDefectiveItemsToW");
const {exportToExcel} = require("../helpers/generateMHReport");
const {generateBhiwaniInDefectiveItems} = require("../helpers/generateInDefectiveItemsOfBhiwani");
const {generateBhiwaniDailyReport} = require("../helpers/generateBhiwaniDailyInOutReport");
const {generateOverallReportPDF, generateDailyReportPDF, generateDistanceReportPDF} = require("../helpers/generateReportPDF");
const {generateBhiwaniOverallReport} = require("../helpers/generateBhiwaniOverallReport");
const {generateBhiwaniOverallDefectiveReport} = require("../helpers/generateOverallBhiwaniDefectiveReport");
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
router.get("/export-incomingItems-pdf", generateIncomingItemsPDF); //PDF for items remaining in the service person account
router.get("/export-outgoingItems-pdf", servicePersonRepairedHoldingItemsPDF);
router.get("/export-warehouseOutgoing-pdf", generateWarehouseTransactionPDF);  //PDF for outgoing items from warehouse
router.get("/export-warehouseIncoming-pdf", generateServicePersonTransactionPDF); //PDF for incoming items to warehouse
router.get("/export-warehouseStock-pdf", generateWarehouseStockReportPDF);  //PDf for warehouse stock
router.get("/export-itemRepairReject-pdf", generateItemRepairRejectPDF); //PDF for Item Repair & Reject 
router.get("/export-dailyDefectiveItems-pdf", generateDailyInDefectiveItems);
router.get("/delete-reports", deleteReport); //PDF Delete from Server
router.get("/service-person-data", downloadActiveServicePersonsExcel);
router.get("/get-mh-report", exportToExcel);
router.post("/update-item-defective", deductFromDefectiveOfItems);
router.get("/export-monthly-bhiwani-report", generateBhiwaniInDefectiveItems);
router.get("/export-daily-bhiwani-report", generateBhiwaniDailyReport);
router.get("/export-overall-bhiwani-report", generateBhiwaniOverallReport);
router.get("/export-bhiwani-defective-report", generateBhiwaniOverallDefectiveReport);
module.exports = router;
