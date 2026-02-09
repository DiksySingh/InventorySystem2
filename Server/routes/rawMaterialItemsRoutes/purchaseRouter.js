const express = require("express");
const router = express.Router();
const purchaseOrderController = require("../../controllers/rawMaterialItemsController/purchaseOrderController");
const {
  tokenVerification,
} = require("../../middlewares/rawMaterialMiddlewares/tokenVerification");
const uploadDebitNoteBill = require("../../middlewares/rawMaterialMiddlewares/multerConfigDebitNote");
const uploadVendorDocs = require("../../middlewares/rawMaterialMiddlewares/multerConfigVendor");

router.post(
  "/companies",
  tokenVerification(["Purchase"]),
  purchaseOrderController.createCompany,
);
[]
router.post(
  "/vendors",
  tokenVerification(["Purchase"]),
  uploadVendorDocs.fields([
    { name: "aadhaarFile", maxCount: 1 },
    { name: "pancardFile", maxCount: 1 },
  ]),
  purchaseOrderController.createVendor,
);

router.get(
  "/companies",
  tokenVerification(["Purchase"]),
  purchaseOrderController.getCompaniesList,
);

router.get(
  "/companies/data",
  tokenVerification(["Purchase"]),
  purchaseOrderController.getCompaniesData,
);

router.get(
  "/vendors",
  tokenVerification(["Purchase"]),
  purchaseOrderController.getVendorsList,
);

router.get(
  "/vendors/data",
  tokenVerification(["Purchase"]),
  purchaseOrderController.getVendorsData,
);

router.get(
  "/companies/:id",
  tokenVerification(["Purchase"]),
  purchaseOrderController.getCompanyById,
);

router.get(
  "/vendors/:id",
  tokenVerification(["Purchase"]),
  purchaseOrderController.getVendorById,
);

router.put(
  "/companies/:id",
  tokenVerification(["Purchase"]),
  purchaseOrderController.updateCompany,
);

router.put(
  "/vendors/:id",
  tokenVerification(["Purchase"]),
  uploadVendorDocs.fields([
    { name: "aadhaarFile", maxCount: 1 },
    { name: "pancardFile", maxCount: 1 },
  ]),
  purchaseOrderController.updateVendor,
);

router.get(
  "/items",
  tokenVerification(["Purchase"]),
  purchaseOrderController.getItemsList,
);

router.get(
  "/items/details/:id",
  tokenVerification(["Purchase"]),
  purchaseOrderController.getItemDetails,
);

router.post(
  "/purchase-orders/create",
  tokenVerification(["Purchase"]),
  purchaseOrderController.createPurchaseOrder,
);

router.post(
  "/purchase-orders/create2",
  tokenVerification(["Purchase"]),
  purchaseOrderController.createPurchaseOrder2,
);

router.get(
  "/purchase-orders/show",
  tokenVerification(["Purchase"]),
  purchaseOrderController.getPOList,
);

router.get(
  "/purchase-orders/company/:companyId",
  tokenVerification(["Purchase"]),
  purchaseOrderController.getPOListByCompany2,
);

router.get(
  "/purchase-orders/details/:poId",
  tokenVerification(["Purchase"]),
  purchaseOrderController.getPurchaseOrderDetails,
);

router.put(
  "/purchase-orders/update/:poId",
  tokenVerification(["Purchase"]),
  purchaseOrderController.updatePurchaseOrder,
);

router.put(
  "/purchase-orders/update2/:poId",
  tokenVerification(["Purchase"]),
  purchaseOrderController.updatePurchaseOrder2,
);

router.post(
  "/purchase-orders/download/:poId",
  tokenVerification(["Purchase", "Admin"]),
  purchaseOrderController.downloadPOPDF,
);

router.post(
  "/purchase-orders/download2/:poId",
  tokenVerification(["Purchase"]),
  purchaseOrderController.downloadPOPDF2,
);

router.get(
  "/dashboard",
  tokenVerification(["Purchase", "Admin"]),
  purchaseOrderController.getPODashboard,
);

router.get(
  "/warehouses",
  tokenVerification(["Purchase", "Admin", "Production"]),
  purchaseOrderController.getWarehouses,
);

router.get(
  "/systems",
  tokenVerification(["Purchase", "Admin"]),
  purchaseOrderController.getSystems,
);

router.put(
  "/purchase-orders/cancel/:poId",
  tokenVerification(["Purchase"]),
  purchaseOrderController.cancelPurchaseOrder,
);

//------------ Debit Note Section --------------
router.get(
  "/purchase-orders/damaged-stock/details/:poId",
  tokenVerification(["Purchase"]),
  purchaseOrderController.getPurchaseOrderDetailsWithDamagedItems,
);

router.post(
  "/debit-note/create",
  tokenVerification(["Purchase"]),
  purchaseOrderController.createDebitNote,
);

router.get(
  "/:poId/debit-note",
  tokenVerification(["Purchase"]),
  purchaseOrderController.getDebitNoteListByPO,
);

router.post(
  "/:poId/debit-note/download/:debitNoteId",
  tokenVerification(["Purchase"]),
  purchaseOrderController.downloadDebitNote,
);

router.get(
  "/debit-note/details/:debitNoteId",
  tokenVerification(["Purchase"]),
  purchaseOrderController.getDebitNoteDetails,
);

router.put(
  "/debit-note/update/:debitNoteId",
  tokenVerification(["Purchase"]),
  purchaseOrderController.updateDebitNote,
);

router.post(
  "/debit-note/receive",
  tokenVerification(["Purchase"]),
  uploadDebitNoteBill,
  purchaseOrderController.debitNoteReceivingBill,
);

router.get(
  "/dashboard/warehouses/:warehouseId/systems/:systemId/orders",
  tokenVerification(["Purchase", "Store", "Admin"]),
  purchaseOrderController.getSystemDashboardData,
);

router.get(
  "/warehouses/raw-material",
  tokenVerification(["Purchase", "Store", "Admin", "Production"]),
  purchaseOrderController.getRawMaterialByWarehouse,
);

//-----------------Version V2 ------------------//

router.get(
  "/dashboard2",
  tokenVerification(["Purchase"]),
  purchaseOrderController.getPODashboard2,
);

router.post(
  "/vendors2",
  tokenVerification(["Purchase"]),
  uploadVendorDocs.fields([
    { name: "aadhaarFile", maxCount: 1 },
    { name: "pancardFile", maxCount: 1 },
  ]),
  purchaseOrderController.createVendor2,
);

router.get(
  "/vendors2/:id",
  tokenVerification(["Purchase"]),
  purchaseOrderController.getVendorById2,
);

router.put(
  "/vendors2/:id",
  tokenVerification(["Purchase"]),
  uploadVendorDocs.fields([
    { name: "aadhaarFile", maxCount: 1 },
    { name: "pancardFile", maxCount: 1 },
  ]),
  purchaseOrderController.updateVendor2,
);

//------------------- Payment Routes --------------------//

router.get(
  "/purchase-orders/payments/pending",
  tokenVerification(["Purchase"]),
  purchaseOrderController.showPendingPayments,
);

router.post(
  "/purchase-orders/payments/request",
  tokenVerification(["Purchase"]),
  purchaseOrderController.createPaymentRequest,
);

router.get(
  "/purchase-orders/payments/show",
  tokenVerification(["Purchase"]),
  purchaseOrderController.showAllPaymentRequests,
);

router.post(
  "/purchase-orders/send/:poId",
  tokenVerification(["Purchase"]),
  purchaseOrderController.sendPOToVendor,
);

router.get(
  "/purchase-orders/receiving",
  tokenVerification(["Purchase", "Production", "Admin"]),
  purchaseOrderController.getPOsReceivings,
);

router.post(
  "/warehouses/create",
  tokenVerification(["Purchase"]),
  purchaseOrderController.createWarehouse,
);

router.post(
  "/units/create",
  tokenVerification(["Purchase"]),
  purchaseOrderController.createUnit,
);

router.post(
  "/vendor/invoices/upload",
  tokenVerification(["Purchase"]),
  uploadVendorDocs.fields([{ name: "invoiceFile", maxCount: 1 }]),
  purchaseOrderController.uploadVendorInvoice,
);

router.put(
  "/purchase-orders/:poId/send-for-approval",
  tokenVerification(["Purchase"]),
  purchaseOrderController.sendPOForApproval,
);

module.exports = router;
