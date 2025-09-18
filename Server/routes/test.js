const express = require("express");
const test = require("../controllers/serviceControllers/test.controller");
const router = express.Router();

router.get("/W2WTransaction", test.W2W);
router.get("/exportActiveUsers", test.exportActiveUsers);
router.get("/servicePersonThroughState", test.getServicePersonForStates);
router.get("/exportPickupItemsToExcel", test.exportPickupItemsToExcel);
router.get("/exportActiveServicePersons", test.exportActiveServicePersons);

module.exports = router;