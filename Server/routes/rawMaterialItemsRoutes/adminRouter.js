const express = require("express");
const router = express.Router();
const adminController = require("../../controllers/rawMaterialItemsController/adminController");
const {tokenVerification} = require("../../middlewares/rawMaterialMiddlewares/tokenVerification");

router.get("/showEmployees", tokenVerification(['Admin']), adminController.showEmployees);
router.put("/deactivateEmployee", tokenVerification(['Admin']), adminController.deactivateEmployee);
router.put("/activateEmployee", adminController.activateEmployee);
router.post("/addItem", adminController.addItem);
router.post("/addRawMaterial", adminController.addRawMaterial);
router.get("/showItems", adminController.showItems);
router.get("/showRawMaterials", adminController.showRawMaterials);
router.delete("/deleteItem", adminController.deleteItem);
router.delete("/deleteAllRawMaterials", adminController.deleteAllRawMaterials);
router.post("/updateRawMaterialStock", adminController.updateRawMaterialStock);
router.post("/addWarehouse", adminController.addWarehouse);
router.get("/showDefectiveItemsOfWarehouse", adminController.getDefectiveItemsForWarehouse);
router.get("/showDefectiveItemsList", adminController.getDefectiveItemsListByWarehouse);
router.get("/getItemsByName", adminController.getItemsByName);
router.get("/getRawMaterialsByItemId", adminController.getRawMaterialsByItemId);
router.post("/addServiceRecord", adminController.addServiceRecord);
router.get("/getItemRawMaterials", adminController.getItemRawMaterials);
router.get("/getRepairedServiceRecords", adminController.getRepairedServiceRecords);
router.get("/getRejectedServiceRecords", adminController.getRejectedServiceRecords);
router.post("/addUnit", adminController.addUnit);
router.get("/showUnit", adminController.showUnit);

module.exports = router;