const { allServiceSurveyPersons, filterServicePersonById, filterStateWiseServicePerson, servicePersonBlockData, showWarehousePersons, showIncomingItemsFromFarmer } = require("../controllers/warehouseController");
const {generateInstallationPDF} = require("../helpers/generateInstallationPDF");
const router = require("express").Router();

router.get("/all-service-persons", allServiceSurveyPersons);
router.get("/show-warehouse-persons", showWarehousePersons);
router.get("/find-service-person", filterServicePersonById);
router.get('/block-data', servicePersonBlockData);
router.get("/count-service-person", filterStateWiseServicePerson);
router.get("/incoming-items-data", showIncomingItemsFromFarmer);
router.post("/generate-installation-pdf", generateInstallationPDF);

module.exports = router;