const { allServicePersons } = require("../controllers/warehouseController");
const router = require("express").Router();

router.get("/all-service-persons", allServicePersons);

module.exports = router;