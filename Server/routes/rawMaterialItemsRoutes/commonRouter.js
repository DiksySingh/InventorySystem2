const express = require("express");
const router = express.Router();
const commonController = require("../../controllers/rawMaterialItemsController/commonController");

router.post("/addRole", commonController.addRole);
router.get("/showRole", commonController.showRole);
router.delete("/deleteRole", commonController.deleteRole);
router.post('/addItemRawMaterialFromExcel', commonController.upload.single('file'), commonController.addItemRawMaterialFromExcel);
router.post("/updateRawMaterialsUnitByExcel", commonController.upload.single('file'), commonController.updateRawMaterialsUnitByExcel);
router.post("/importRawMaterialsByExcel", commonController.upload.single('file'), commonController.importRawMaterialsByExcel);
router.post("/updateRawMaterialStockByExcel", commonController.upload.single('file'), commonController.updateRawMaterialStockByExcel);

module.exports = router;