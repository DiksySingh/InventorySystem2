const express = require("express");
const router = express.Router();
const adminController = require("../../controllers/rawMaterialItemsController/adminController");

router.get("/showEmployees", adminController.showEmployees);
router.put("/deactivateEmployee", adminController.deactivateEmployee);
router.put("/activateEmployee", adminController.activateEmployee);
router.post("/addItem", adminController.addItem);
router.get("/showItems", adminController.showItems);
router.post("/addWarehouse", adminController.addWarehouse);

module.exports = router;