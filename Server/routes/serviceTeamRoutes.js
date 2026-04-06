const {
    allServiceSurveyPersons,
    fieldWorkerList,
    filterServicePersonById,
    filterStateWiseServicePerson,
    servicePersonBlockData,
    showWarehousePersons,
    showIncomingItemsFromFarmer,
    getDispatchSerialNumbers,
    assignInstaller
} = require("../controllers/serviceControllers/warehouseController");
const {
    getServicePersonContacts,
    getWarehousePersonContacts,
    getServicePersonData,
    allFieldPersonData,
    showAllWarehouses,
    stateWiseServiceSurveyPersons,
    getFarmerInstallationDetails,
    allFieldEmployeeData,
    allFarmerActivites,
    approveInstallationData,
    deleteRejectedInstallationPhotos,
    rejectInstallationData,
    getVT2ApprovedByDate,
    verifyInstallationAtStageVT2,
    getVT2VerifiedData
} = require("../controllers/serviceControllers/serviceTeamController");
const {
    showNewInstallationDataToInstaller,
    updateStatusOfIncomingItems,
    updateStatusOfIncomingItems2,
    showAcceptedInstallationData,
    newSystemInstallation,
    empDashboard,
    updateInstallationDataWithFiles,
    updateFarmerActivitySerialNumbers,
    getInstallationDataForST,
} = require("../controllers/serviceControllers/servicePersonController");
const { generateInstallationPDF } = require("../helpers/pdf/generateInstallationPDF");
const router = require("express").Router();
const { uploadHandler } = require("../middlewares/multerConfig");

router.get("/all-service-persons", allServiceSurveyPersons);
router.get("/field-worker-list", fieldWorkerList);
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
router.post("/update-incoming-item-status2", updateStatusOfIncomingItems2);
router.get("/accepted-installation-data", showAcceptedInstallationData);
router.post("/new-system-installation", uploadHandler, newSystemInstallation);
router.get("/get-new-installation-data", getInstallationDataForST);
router.post("/approve-installation-data", approveInstallationData);
router.post("/reject-installation-data", rejectInstallationData)
router.put("/delete-rejected-photos", deleteRejectedInstallationPhotos);
router.post("/update-installation-data", uploadHandler, updateInstallationDataWithFiles);
router.get("/show-emp-dashboard", empDashboard);
router.post("/update-farmer-activity-serial-numbers", updateFarmerActivitySerialNumbers)
     
router.get("/get-installation-data", getFarmerInstallationDetails);
router.get("/field-employee-data", allFieldEmployeeData);
router.get("/dispatched-serial-numbers", getDispatchSerialNumbers);
router.put("/assign-installer", assignInstaller);
router.get("/all-farmer-activities", allFarmerActivites);
router.get("/get-verified-installation", getVT2ApprovedByDate);
router.post("/check-verified-installation", verifyInstallationAtStageVT2)
router.get("/verified-installation-data", getVT2VerifiedData);
module.exports = router;