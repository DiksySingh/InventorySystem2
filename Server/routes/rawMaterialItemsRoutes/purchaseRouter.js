const express = require("express");
const router = express.Router();
const purchaseOrderController = require("../../controllers/rawMaterialItemsController/purchaseOrderController");
const { tokenVerification } = require("../../middlewares/rawMaterialMiddlewares/tokenVerification");

router.post("/createCompany", tokenVerification(['Purchase']), purchaseOrderController.createCompany);
router.post("/createVendor", tokenVerification(['Purchase']), purchaseOrderController.createVendor);
router.get("/getAllCompanies", tokenVerification(['Purchase']), purchaseOrderController.getAllCompanies);
router.get("/getAllVendors", tokenVerification(['Purchase']), purchaseOrderController.getAllVendors);
router.get("/getAllItems", tokenVerification(['Purchase']), purchaseOrderController.getAllItems);

module.exports = router;