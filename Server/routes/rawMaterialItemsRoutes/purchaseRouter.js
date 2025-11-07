const express = require("express");
const router = express.Router();
const purchaseOrderController = require("../../controllers/rawMaterialItemsController/purchaseOrderController");
const { tokenVerification } = require("../../middlewares/rawMaterialMiddlewares/tokenVerification");

router.post(
  "/companies",
  tokenVerification(['Purchase']),
  purchaseOrderController.createCompany
);

router.post(
  "/vendors",
  tokenVerification(['Purchase']),
  purchaseOrderController.createVendor
);

router.get(
  "/companies",
  tokenVerification(['Purchase']),
  purchaseOrderController.getCompaniesList
);

router.get(
  "/vendors",
  tokenVerification(['Purchase']),
  purchaseOrderController.getVendorsList
);
router.get("/companies/:id", tokenVerification(['Purchase']), purchaseOrderController.getCompanyById);
router.get("/vendors/:id", tokenVerification(['Purchase']), purchaseOrderController.getVendorById);
router.put("/companies/:id", tokenVerification(['Purchase']), purchaseOrderController.updateCompany);
router.put("/vendors/:id", tokenVerification(['Purchase']), purchaseOrderController.updateVendor);

router.get(
  "/items",
  tokenVerification(['Purchase']),
  purchaseOrderController.getItemsList
);

router.post(
    "/purchase-orders",
    tokenVerification(['Purchase']),
    purchaseOrderController.createPurchaseOrder
);

router.post(
    "/purchase-order-pdf",
    tokenVerification(['Purchase']),
    purchaseOrderController.downloadPOPDF
);

module.exports = router;