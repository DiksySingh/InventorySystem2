const { allServiceSurveyPersons, filterServicePersonById, filterStateWiseServicePerson, servicePersonBlockData, showWarehousePersons } = require("../controllers/warehouseController");
const router = require("express").Router();

router.get("/all-service-persons", allServiceSurveyPersons);
router.get("/show-warehouse-persons", showWarehousePersons);
router.get("/find-service-person", filterServicePersonById);
router.get('/block-data', servicePersonBlockData);
router.get("/count-service-person", filterStateWiseServicePerson);

module.exports = router;