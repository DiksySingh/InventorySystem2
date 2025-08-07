const {incomingItemsData, pickupItemOfServicePerson, servicePersonDashboard, showWarehouseItems, updateOrderStatus, showServicePersonRepairedHoldingItems, updateServicePersonHoldingItems} = require("../controllers/serviceControllers/pickupItemController");
const {showWarehouses, viewApprovedOrderHistory} = require("../controllers/serviceControllers/warehouseController");
const {getPickupItemData, createInstallationData, sendOtp, verifyOtp, resendOtp, getServicePersonInstallationData, checkServicePersonLatLong} = require("../controllers/serviceControllers/installationDataController");
const {empDashboard, showNewInstallationDataToInstaller, updateStatusOfIncomingItems, showAcceptedInstallationData, newSystemInstallation, pickupItemsByServicePerson} = require("../controllers/serviceControllers/servicePersonController");
const {uploadHandler} = require("../middlewares/multerConfig");
const { userVerification } = require("../middlewares/authMiddlewares");
const router = require("express").Router();

//ServicePerson Routes
router.get("/dashboard",userVerification(["serviceperson", 'installer', 'fieldsales', 'filing']),servicePersonDashboard);
router.get("/warehouse-items", userVerification(['serviceperson', 'installer', 'fieldsales', 'filing']), showWarehouseItems);
router.get("/all-warehouses", userVerification(['serviceperson', 'installer', 'fieldsales', 'filing']), showWarehouses);
router.post("/incoming-items", userVerification(["serviceperson", 'installer', 'fieldsales', 'filing']),incomingItemsData);
router.get("/pickedup-items", userVerification(["serviceperson", 'installer', 'fieldsales', 'filing']),pickupItemOfServicePerson);
router.get("/approved-order-history", userVerification(['serviceperson', 'installer', 'fieldsales', 'filing']), viewApprovedOrderHistory);
router.put("/update-outgoing-status", userVerification(["serviceperson", 'installer', 'fieldsales', 'filing']), updateOrderStatus);
router.get("/show-holding-items", userVerification(['serviceperson', 'installer', 'fieldsales', 'filing']), showServicePersonRepairedHoldingItems);
router.put("/update-holding-items", userVerification(['serviceperson', 'installer', 'fieldsales', 'filing']), updateServicePersonHoldingItems);

router.get("/get-pickupItem-data", userVerification(['serviceperson', 'installer', 'fieldsales', 'filing']), getPickupItemData);
router.get("/check-lat-long", userVerification(['serviceperson', 'installer', 'fieldsales', 'filing']), checkServicePersonLatLong);
router.post("/new-installation-data",userVerification(['serviceperson', 'installer', 'fieldsales', 'filing']), createInstallationData);
router.post("/send-otp", sendOtp);
router.post("/verify-otp", verifyOtp);
router.post("/resend-otp", resendOtp);

router.get("/service-installation-data", userVerification(['serviceperson']), getServicePersonInstallationData);
//System Installation
// router.get("/state-wise-service-persons",userVerification(['serviceperson', 'surveyperson']), stateWiseServiceSurveyPersons);
router.get("/show-emp-dashboard", userVerification(['serviceperson', 'surveyperson', 'installer']), empDashboard);
router.get("/show-new-install-data", userVerification(['serviceperson', 'surveyperson', 'installer']), showNewInstallationDataToInstaller);
router.post("/update-incoming-item-status",userVerification(['serviceperson', 'surveyperson','installer']), updateStatusOfIncomingItems);
router.get("/accepted-installation-data", userVerification(['serviceperson', 'surveyperson', 'installer']), showAcceptedInstallationData);
router.post("/new-system-installation", userVerification(['serviceperson', 'surveyperson', 'installer']), uploadHandler, newSystemInstallation);

router.get("/pickupItemsByServicePerson", pickupItemsByServicePerson);


module.exports = router;