const express = require("express");
const router = express.Router();
const commonController = require("../../controllers/rawMaterialItemsController/commonController");
const {tokenVerification} = require("../../middlewares/rawMaterialMiddlewares/tokenVerification");

router.post("/addRole", commonController.addRole);
router.get("/showRole", commonController.showRole);
router.delete("/deleteRole", commonController.deleteRole);
router.post('/addItemRawMaterialFromExcel', commonController.upload.single('file'), commonController.addItemRawMaterialFromExcel);
router.delete("/deleteItemRawMaterialFromExcel", commonController.upload.single('file'), commonController.deleteItemRawMaterialFromExcel);
router.post("/updateRawMaterialsUnitByExcel", commonController.upload.single('file'), commonController.updateRawMaterialsUnitByExcel);
router.post("/importRawMaterialsByExcel", commonController.upload.single('file'), commonController.importRawMaterialsByExcel);
router.post("/updateRawMaterialStockByExcel", commonController.upload.single('file'), commonController.updateRawMaterialStockByExcel);
router.post("/migrateServiceRecordJSON", commonController.migrateServiceRecordJSON);
router.post("/fixInvalidJSON", commonController.fixInvalidJSON);

router.post("/addProduct", tokenVerification(['Admin', 'Store']), commonController.addProduct);
router.get("/getProduct", tokenVerification(['Admin', "Store", "Disassemble", "Stamping", "SFG Work", "Winding", "Winding Connection", "Assemble", "Testing"]), commonController.getProduct);
router.delete("/deleteProduct", tokenVerification(['Admin', 'Store']), commonController.deleteProduct);
router.post("/addProductItemMap", tokenVerification(['Admin', 'Store']), commonController.addProductItemMap);
router.get("/getItemsByProductId", tokenVerification(['Admin', "Store", "Disassemble", "Stamping", "SFG Work", "Winding", "Winding Connection", "Assemble", "Testing"]), commonController.getItemsByProductId);
router.delete("/deleteProductItemMap", tokenVerification(['Admin', 'Store']), commonController.deleteProductItemMap);
router.get("/showDefectiveItemsList", tokenVerification(['Admin', "Store", "Disassemble", "Stamping", "SFG Work", "Winding", "Winding Connection", "Assemble", "Testing"]), commonController.getDefectiveItemsListByWarehouse);
router.get("/getItemType", tokenVerification(['Admin', "Store"]), commonController.getItemType);


module.exports = router;