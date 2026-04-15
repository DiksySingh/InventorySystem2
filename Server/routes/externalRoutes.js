const express = require("express");
const router = express.Router();
const externalAPIController = require("../controllers/serviceControllers/externalAPIController");

router.get("/api/vehicle/delivery-status ", externalAPIController.getVehicleReceiptStatusToday);

module.exports = router;