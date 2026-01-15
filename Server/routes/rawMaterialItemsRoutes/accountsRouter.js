const express = require("express");
const router = express.Router();
const {
  tokenVerification,
} = require("../../middlewares/rawMaterialMiddlewares/tokenVerification");
const accountsController = require("../../controllers/rawMaterialItemsController/accountsController");

router.get("/vendors", tokenVerification(["Accounts"]), accountsController.showVendorsBankDetails);
router.get("/purchase-orders/payments/requests/show", tokenVerification(["Accounts"]), accountsController.showAdminApprovedPaymentRequests);
router.patch("/purchase-orders/payments/requests/status", tokenVerification(['Accounts']), accountsController.approveOrRejectPaymentRequestByAccounts);

module.exports = router;