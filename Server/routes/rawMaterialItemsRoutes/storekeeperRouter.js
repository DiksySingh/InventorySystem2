const express = require("express");
const router = express.Router();
const storekeeperController = require("../../controllers/rawMaterialItemsController/storekeeperController");

router.get("/getLineWorkerList", storekeeperController.getLineWorkerList);
router.get("/showIncomingItemRequest", storekeeperController.showIncomingItemRequest);
router.put("/approveIncomingItemRequest", storekeeperController.approveIncomingItemRequest);

module.exports = router;