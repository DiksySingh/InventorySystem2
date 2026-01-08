const express = require("express");
const router = express.Router();
const {
  tokenVerification,
} = require("../../middlewares/rawMaterialMiddlewares/tokenVerification");
const verificationController = require("../../controllers/rawMaterialItemsController/verificationController");

router.get(
  "/payment/doc/verify",
  tokenVerification(["Verification"]),
  verificationController.showPaymentRequestWithDocuments
);

module.exports = router;