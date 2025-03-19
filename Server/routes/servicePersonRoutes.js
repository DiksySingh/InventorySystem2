const {incomingItemsData, pickupItemOfServicePerson, servicePersonDashboard, showWarehouseItems, updateOrderStatus, showServicePersonRepairedHoldingItems, updateServicePersonHoldingItems} = require("../controllers/pickupItemController");
const {showWarehouses, viewApprovedOrderHistory} = require("../controllers/warehouseController");
const {getPickupItemData, createInstallationData, sendOtp, verifyOtp, resendOtp, getServicePersonInstallationData, checkServicePersonLatLong} = require("../controllers/installationDataController");
const {showNewInstallationDataToInstaller, updateStatusOfIncomingItems, newSystemInstallation} = require("../controllers/servicePersonController");
// const {uploadHandler} = require("../middlewares/multerConfig");
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
router.get("/show-new-install-data", userVerification(['serviceperson', 'surveyperson']), showNewInstallationDataToInstaller);
router.post("/update-incoming-item-status",userVerification(['serviceperson', 'surveyperson']), updateStatusOfIncomingItems);
router.post("/new-system-installation", userVerification(['serviceperson', 'surveyperson']), newSystemInstallation);

module.exports = router;