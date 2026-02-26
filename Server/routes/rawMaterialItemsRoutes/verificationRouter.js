const express = require("express");
const router = express.Router();
const {
  tokenVerification,
} = require("../../middlewares/rawMaterialMiddlewares/tokenVerification");
const verificationController = require("../../controllers/rawMaterialItemsController/verificationController");

router.get(
  "/purchase-orders/invoices",
  tokenVerification(["Admin"]),
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

//Version 2 - Route

router.get(
  "/purchase-orders/company-wise/invoices",
  tokenVerification(["Verification", "Accounts"]),
  verificationController.showPOBillsByUserCompany
);

router.get(
  "/purchase-orders/payments/requests/show2",
  tokenVerification(["Verification"]),
  verificationController.showPendingPaymentRequests2
);


module.exports = router;
