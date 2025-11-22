const express = require("express");
const router = express.Router();
const purchaseOrderController = require("../../controllers/rawMaterialItemsController/purchaseOrderController");
const {
  tokenVerification,
} = require("../../middlewares/rawMaterialMiddlewares/tokenVerification");

router.post(
  "/companies",
  tokenVerification(["Purchase"]),
  purchaseOrderController.createCompany
);

router.post(
  "/vendors",
  tokenVerification(["Purchase"]),
  purchaseOrderController.createVendor
);

router.get(
  "/companies",
  tokenVerification(["Purchase"]),
  purchaseOrderController.getCompaniesList
);

router.get(
  "/vendors",
  tokenVerification(["Purchase"]),
  purchaseOrderController.getVendorsList
);

router.get(
  "/companies/:id",
  tokenVerification(["Purchase"]),
  purchaseOrderController.getCompanyById
);

router.get(
  "/vendors/:id",
  tokenVerification(["Purchase"]),
  purchaseOrderController.getVendorById
);

router.put(
  "/companies/:id",
  tokenVerification(["Purchase"]),
  purchaseOrderController.updateCompany
);

router.put(
  "/vendors/:id",
  tokenVerification(["Purchase"]),
  purchaseOrderController.updateVendor
);

router.get(
  "/items",
  tokenVerification(["Purchase"]),
  purchaseOrderController.getItemsList
);

router.post(
  "/purchase-orders/create",
  tokenVerification(["Purchase"]),
  purchaseOrderController.createPurchaseOrder
);

router.get(
  "/purchase-orders/company/:companyId",
  tokenVerification(["Purchase"]),
  purchaseOrderController.getPOListByCompany
);

router.get(
  "/purchase-orders/details/:poId",
  tokenVerification(["Purchase"]),
  purchaseOrderController.getPurchaseOrderDetails
);

router.put(
  "/purchase-orders/update/:poId",
  tokenVerification(["Purchase"]),
  purchaseOrderController.updatePurchaseOrder
);

router.post(
  "/purchase-orders/download/:poId",
  tokenVerification(["Purchase"]),
  purchaseOrderController.downloadPOPDF
);

router.get(
  "/dashboard",
  tokenVerification(["Purchase"]),
  purchaseOrderController.getPODashboard
);

module.exports = router;
