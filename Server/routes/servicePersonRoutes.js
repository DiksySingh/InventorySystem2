const {incomingItemsData, pickupItemOfServicePerson, servicePersonDashboard, showWarehouseItems, updateOrderStatus, showServicePersonRepairedHoldingItems, updateServicePersonHoldingItems} = require("../controllers/serviceControllers/pickupItemController");
const {showWarehouses, viewApprovedOrderHistory} = require("../controllers/serviceControllers/warehouseController");
const {getPickupItemData, createInstallationData, sendOtp, verifyOtp, resendOtp, getServicePersonInstallationData, checkServicePersonLatLong} = require("../controllers/serviceControllers/installationDataController");
const {empDashboard, showNewInstallationDataToInstaller, updateStatusOfIncomingItems, showAcceptedInstallationData, newSystemInstallation} = require("../controllers/serviceControllers/servicePersonController");
const {uploadHandler} = require("../middlewares/multerConfig");
const { userVerification } = require("../middlewares/authMiddlewares");
const router = require("express").Router();

//ServicePerson Routes
router.get("/dashboard",userVerification(["serviceperson"]),servicePersonDashboard);
router.get("/warehouse-items", userVerification(['serviceperson']), showWarehouseItems);
router.get("/all-warehouses", userVerification(['serviceperson']), showWarehouses);
router.post("/incoming-items",userVerification(["serviceperson"]),incomingItemsData);
router.get("/pickedup-items",userVerification(["serviceperson"]),pickupItemOfServicePerson);
router.get("/approved-order-history", userVerification(['serviceperson']), viewApprovedOrderHistory);
router.put("/update-outgoing-status", userVerification(["serviceperson"]), updateOrderStatus);
router.get("/show-holding-items", userVerification(['serviceperson']), showServicePersonRepairedHoldingItems);
router.put("/update-holding-items", userVerification(['serviceperson']), updateServicePersonHoldingItems);

router.get("/get-pickupItem-data", userVerification(['serviceperson']), getPickupItemData);
router.get("/check-lat-long", userVerification(['serviceperson']), checkServicePersonLatLong);
router.post("/new-installation-data",userVerification(['serviceperson']), createInstallationData);
router.post("/send-otp", sendOtp);
router.post("/verify-otp", verifyOtp);
router.post("/resend-otp", resendOtp);

router.get("/service-installation-data", userVerification(['serviceperson']), getServicePersonInstallationData);
//System Installation
// router.get("/state-wise-service-persons",userVerification(['serviceperson', 'surveyperson']), stateWiseServiceSurveyPersons);
router.get("/show-emp-dashboard", userVerification(['serviceperson', 'surveyperson']), empDashboard);
router.get("/show-new-install-data", userVerification(['serviceperson', 'surveyperson']), showNewInstallationDataToInstaller);
router.post("/update-incoming-item-status",userVerification(['serviceperson', 'surveyperson']), updateStatusOfIncomingItems);
router.get("/accepted-installation-data", userVerification(['serviceperson', 'surveyperson']), showAcceptedInstallationData);
router.post("/new-system-installation", userVerification(['serviceperson', 'surveyperson']), uploadHandler, newSystemInstallation);



module.exports = router;