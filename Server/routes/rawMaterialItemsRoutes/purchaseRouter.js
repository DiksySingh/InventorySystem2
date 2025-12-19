const express = require("express");
const router = express.Router();
const purchaseOrderController = require("../../controllers/rawMaterialItemsController/purchaseOrderController");
const {
  tokenVerification,
} = require("../../middlewares/rawMaterialMiddlewares/tokenVerification");
const uploadPurchaseOrderBill = require("../../middlewares/rawMaterialMiddlewares/multerConfigPurchase");
const uploadDebitNoteBill = require("../../middlewares/rawMaterialMiddlewares/multerConfigDebitNote");

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
  "/companies/data",
  tokenVerification(["Purchase"]),
  purchaseOrderController.getCompaniesData
);

router.get(
  "/vendors",
  tokenVerification(["Purchase"]),
  purchaseOrderController.getVendorsList
);

router.get(
  "/vendors/data",
  tokenVerification(["Purchase"]),
  purchaseOrderController.getVendorsData
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

router.get(
  "/items/details/:id",
  tokenVerification(["Purchase"]),
  purchaseOrderController.getItemDetails
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

router.get(
  "/warehouses",
  tokenVerification(["Purchase"]),
  purchaseOrderController.getWarehouses
);

router.post(
  "/purchase-orders/receive",
  tokenVerification(["Purchase"]),
  uploadPurchaseOrderBill,
  purchaseOrderController.purchaseOrderReceivingBill
);

router.put(
  "/purchase-orders/cancel/:poId",
  tokenVerification(["Purchase"]),
  purchaseOrderController.cancelPurchaseOrder
);

//------------ Debit Note Section --------------
router.get(
  "/purchase-orders/damaged-stock/details/:poId",
  tokenVerification(["Purchase"]),
  purchaseOrderController.getPurchaseOrderDetailsWithDamagedItems
);

router.post(
  "/debit-note/create",
  tokenVerification(["Purchase"]),
  purchaseOrderController.createDebitNote
);

router.get(
  "/:poId/debit-note",
  tokenVerification(["Purchase"]),
  purchaseOrderController.getDebitNoteListByPO
);

router.post(
  "/:poId/debit-note/download/:debitNoteId",
  tokenVerification(["Purchase"]),
  purchaseOrderController.downloadDebitNote
);

router.get(
  "/debit-note/details/:debitNoteId",
  tokenVerification(["Purchase"]),
  purchaseOrderController.getDebitNoteDetails
);

router.put(
  "/debit-note/update/:debitNoteId",
  tokenVerification(["Purchase"]),
  purchaseOrderController.updateDebitNote
);

router.post(
  "/debit-note/receive",
  tokenVerification(["Purchase"]),
  uploadDebitNoteBill,
  purchaseOrderController.debitNoteReceivingBill
);

module.exports = router;
