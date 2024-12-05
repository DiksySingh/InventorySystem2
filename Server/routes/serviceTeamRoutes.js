const { allServicePersons, filterServicePersonById } = require("../controllers/warehouseController");
const router = require("express").Router();

router.get("/all-service-persons", allServicePersons);
router.get("/find-service-person", filterServicePersonById);

module.exports = router;