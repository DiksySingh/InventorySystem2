const { allServicePersons, filterServicePersonById, filterStateWiseServicePerson, servicePersonBlockData } = require("../controllers/warehouseController");
const router = require("express").Router();

router.get("/all-service-persons", allServicePersons);
router.get("/find-service-person", filterServicePersonById);
router.get('/block-data', servicePersonBlockData);
router.get("/count-service-person", filterStateWiseServicePerson);

module.exports = router;