const express = require("express");
const router = express.Router();
const purchaseOrderController = require("../../controllers/rawMaterialItemsController/purchaseOrderController");
const {
  tokenVerification,
} = require("../../middlewares/rawMaterialMiddlewares/tokenVerification");
const uploadPurchaseOrderBill = require("../../middlewares/rawMaterialMiddlewares/multerConfigPurchase");

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

router.post(
  "/purchase-orders/create2",
  tokenVerification(["Purchase"]),
  purchaseOrderController.createPurchaseOrder2
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

router.put(
  "/purchase-orders/update2/:poId",
  tokenVerification(["Purchase"]),
  purchaseOrderController.updatePurchaseOrder2
);

router.post(
  "/purchase-orders/download/:poId",
  tokenVerification(["Purchase"]),
  purchaseOrderController.downloadPOPDF
);

router.post(
  "/purchase-orders/download2/:poId",
  tokenVerification(["Purchase"]),
  purchaseOrderController.downloadPOPDF2
);

router.get(
  "/dashboard",
  tokenVerification(["Purchase"]),
  purchaseOrderController.getPODashboard
);

router.post(
  "/purchase-orders/receive",
  tokenVerification(['Purchase']),
  uploadPurchaseOrderBill,
  purchaseOrderController.createOrUpdatePurchaseOrderReceipts
);

module.exports = router;
