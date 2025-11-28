const express = require("express");
const router = express.Router();
const storekeeperController = require("../../controllers/rawMaterialItemsController/storekeeperController");
const {
  tokenVerification,
} = require("../../middlewares/rawMaterialMiddlewares/tokenVerification");
const uploadHandler = require("../../middlewares/rawMaterialMiddlewares/multerConfigRawItems");

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
  storekeeperController.approveOrDeclineIncomingItemRequest
);

router.post(
  "/sanctionItemForRequest",
  tokenVerification(["Store"]),
  storekeeperController.sanctionItemForRequest
);

router.get("/getUserItemStock", tokenVerification(["Store"]), storekeeperController.getUserItemStock);

router.post(
  "/updateStock",
  tokenVerification(["Store"]),
  uploadHandler,
  storekeeperController.updateStock
);

router.get("/showProcessData", tokenVerification(['Store']), storekeeperController.showProcessData);
router.get("/getRawMaterialList", tokenVerification(["Store"]), storekeeperController.getRawMaterialList);
router.get("/getStockMovementHistory", tokenVerification(["Store"]), storekeeperController.getStockMovementHistory);

module.exports = router;
