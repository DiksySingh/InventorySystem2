const express = require("express");
const router = express.Router();
const {
  tokenVerification,
} = require("../../middlewares/rawMaterialMiddlewares/tokenVerification");
const verificationController = require("../../controllers/rawMaterialItemsController/verificationController");

router.get(
  "/purchase-orders/invoices",
  tokenVerification(["Verification", "Admin"]),
  verificationController.showAllPOWithBills
);

router.get(
  "/purchase-orders/payments/requests/show",
  tokenVerification(["Verification"]),
  verificationController.showPendingPaymentRequests
);

router.patch(
  "/purchase-orders/payments/requests/status",
  tokenVerification(["Verification"]),
  verificationController.approveOrRejectPaymentRequest
);

module.exports = router;
