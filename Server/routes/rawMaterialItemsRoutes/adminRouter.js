const express = require("express");
const router = express.Router();
const adminController = require("../../controllers/rawMaterialItemsController/adminController");

router.get("/showEmployees", adminController.showEmployees);
router.put("/deactivateEmployee", adminController.deactivateEmployee);
router.put("/activateEmployee", adminController.activateEmployee);
router.post("/addItem", adminController.addItem);
router.post("/addRawMaterial", adminController.addRawMaterial);
router.get("/showItems", adminController.showItems);
router.get("/showRawMaterials", adminController.showRawMaterials);
router.post("/updateRawMaterialStock", adminController.updateRawMaterialStock);
router.post("/addWarehouse", adminController.addWarehouse);
router.get("/showDefectiveItemsOfWarehouse", adminController.getDefectiveItemsForWarehouse);
router.get("/showDefectiveItemsList", adminController.getDefectiveItemsListByWarehouse);

module.exports = router;