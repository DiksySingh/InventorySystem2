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
    showAllWarehouses,
    stateWiseServiceSurveyPersons
} = require("../controllers/serviceTeamController");
const {
    showNewInstallationDataToInstaller,
    updateStatusOfIncomingItems,
    showAcceptedInstallationData,
    newSystemInstallation,
    getInstallationDataWithImages,
    empDashboard
} = require("../controllers/servicePersonController");
const {generateInstallationPDF} = require("../helpers/generateInstallationPDF");
const router = require("express").Router();
const {uploadHandler} = require("../middlewares/multerConfig");

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
router.get("/state-wise-service-persons", stateWiseServiceSurveyPersons);
router.get("/show-new-install-data", showNewInstallationDataToInstaller);
router.post("/update-incoming-item-status", updateStatusOfIncomingItems);
router.get("/accepted-installation-data", showAcceptedInstallationData);
router.post("/new-system-installation", uploadHandler, newSystemInstallation);
router.get("/get-new-installation-data", getInstallationDataWithImages);
router.get("/show-emp-dashboard", empDashboard);


module.exports = router;