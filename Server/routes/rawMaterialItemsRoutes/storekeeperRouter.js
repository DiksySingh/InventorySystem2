const express = require("express");
const router = express.Router();
const storekeeperController = require("../../controllers/rawMaterialItemsController/storekeeperController");
const {
  tokenVerification,
} = require("../../middlewares/rawMaterialMiddlewares/tokenVerification");
const uploadHandler = require("../../middlewares/rawMaterialMiddlewares/multerConfigRawItems");
const uploadPurchaseOrderBill = require("../../middlewares/rawMaterialMiddlewares/multerConfigPurchase");

router.get(
  "/getLineWorkerList",
  tokenVerification(["Store"]),
  storekeeperController.getLineWorkerList
);

router.get(
  "/showIncomingItemRequest",
  tokenVerification(["Store"]),
  storekeeperController.showIncomingItemRequest
);

router.put(
  "/approveOrDeclineItemRequest",
  tokenVerification(["Store"]),
  storekeeperController.approveOrDeclineItemRequest
);

router.post(
  "/sanctionItemForRequest",
  tokenVerification(["Store"]),
  storekeeperController.sanctionItemForRequest
);

router.get(
  "/getUserItemStock",
  tokenVerification(["Store"]),
  storekeeperController.getUserItemStock
);

router.post(
  "/updateStock",
  tokenVerification(["Store"]),
  uploadHandler,
  storekeeperController.updateStock
);

router.get(
  "/showProcessData",
  tokenVerification(["Store"]),
  storekeeperController.showProcessData
);

router.get(
  "/getRawMaterialList",
  tokenVerification(["Store", "Purchase"]),
  storekeeperController.getRawMaterialList
);

router.get(
  "/getWarehouseRawMaterialList",
  tokenVerification(["Store", "Purchase"]),
  storekeeperController.getWarehouseRawMaterialList
);

router.get(
  "/getStockMovementHistory",
  tokenVerification(["Store"]),
  storekeeperController.getStockMovementHistory
);

router.put(
  "/markRawMaterialUsedOrNotUsed",
  tokenVerification(["Store", "Purchase"]),
  storekeeperController.markRawMaterialUsedOrNotUsed
);

router.put(
  "/markSystemItemUsedOrNotUsed",
  tokenVerification(["Purchase", "Store"]),
  storekeeperController.markSystemItemUsedOrNotUsed
);

router.get(
  "/getPendingPOsForReceiving",
  tokenVerification(["Store"]),
  storekeeperController.getPendingPOsForReceiving
);

router.post(
  "/purchaseOrder/receive",
  tokenVerification(["Store"]),
  uploadPurchaseOrderBill,
  storekeeperController.purchaseOrderReceivingBill2
);

module.exports = router;
