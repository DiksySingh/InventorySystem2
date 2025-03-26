const { 
    allServiceSurveyPersons, 
    filterServicePersonById, 
    filterStateWiseServicePerson, 
    servicePersonBlockData, 
    showWarehousePersons, 
    showIncomingItemsFromFarmer, 
} = require("../controllers/warehouseController");
const { 
    getServicePersonContacts,
    getWarehousePersonContacts,
    getServicePersonData,
    allFieldPersonData,
    showAllWarehouses
} = require("../controllers/serviceTeamController");
const {generateInstallationPDF} = require("../helpers/generateInstallationPDF");
const router = require("express").Router();

router.get("/all-service-persons", allServiceSurveyPersons);
router.get("/show-warehouse-persons", showWarehousePersons);
router.get("/find-service-person", filterServicePersonById);
router.post("/get-serviceperson-data", getServicePersonData)
router.get('/block-data', servicePersonBlockData);
router.get("/count-service-person", filterStateWiseServicePerson);
router.get("/incoming-items-data", showIncomingItemsFromFarmer);
router.post("/generate-installation-pdf", generateInstallationPDF);
router.get("/service-person-contacts", getServicePersonContacts);
router.get("/warehouse-person-contacts", getWarehousePersonContacts);
router.get("/field-person-name", allFieldPersonData);
router.get("/show-warehouses", showAllWarehouses);

module.exports = router;