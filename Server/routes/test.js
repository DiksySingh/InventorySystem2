const express = require("express");
const test = require("../controllers/serviceControllers/test.controller");
const router = express.Router();

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

module.exports = router;