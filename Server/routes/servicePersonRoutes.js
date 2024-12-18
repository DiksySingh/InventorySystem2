const {incomingItemsData, pickupItemOfServicePerson, servicePersonDashboard, showWarehouseItems, updateOrderStatus} = require("../controllers/pickupItemController");
const {showWarehouses, viewApprovedOrderHistory} = require("../controllers/warehouseController");
const {getPickupItemData, createInstallationData, sendOtp, verifyOtp, resendOtp} = require("../controllers/installationDataController");
const {uploadHandler, parseNestedFields} = require("../middlewares/multerConfig");
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

router.get("/get-pickupItem-data", userVerification(['serviceperson']), getPickupItemData);
router.post("/new-installation-data",userVerification(['serviceperson']), uploadHandler, parseNestedFields,  createInstallationData);
router.post("/send-otp", sendOtp);
router.post("/verify-otp", verifyOtp);
router.post("/resend-otp", resendOtp);

module.exports = router;