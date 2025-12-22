const express = require("express");
const test = require("../controllers/serviceControllers/test.controller");
const router = express.Router();
const multer = require("multer");
const upload = multer();

router.get("/W2WTransaction", test.W2W);
router.get("/exportActiveUsers", test.exportActiveUsers);
router.get("/servicePersonThroughState", test.getServicePersonForStates);
// router.get("/exportPickupItemsToExcel", test.exportPickupItemsToExcel);
router.get("/exportActiveServicePersons", test.exportActiveServicePersons);
router.get("/getItemRawMaterialExcel", test.getItemRawMaterialExcel);
router.get("/getNotApprovedPickupData", test.getNotApprovedPickupData);
router.get("/exportFarmerSaralIdsToExcel", test.exportFarmerSaralIdsToExcel);
router.get("/exportFarmerItemsActivityToExcel", test.exportFarmerItemsActivityToExcel);
router.post("/sendWhatsAppMessage", test.sendWhatsAppMessage);
router.post("/match-system-items", test.matchSystemItemsFromExcel);
router.post("/installation-inventory/update-excel", upload.single('file'), test.updateInstallationInventoryFromExcel);
router.get("/installation-inventory/stock", test.exportInstallationInventoryExcel);
router.get("/system-items/export/excel", test.exportSystemItemsExcel)


module.exports = router;