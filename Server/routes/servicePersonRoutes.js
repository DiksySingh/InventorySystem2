const {incomingItemsData, pickupItemOfServicePerson, servicePersonDashboard, showWarehouseItems, updateOrderStatus} = require("../controllers/pickupItemController");
const {showWarehouses, viewApprovedOrderHistory} = require("../controllers/warehouseController");
const {getPickupItemData, createInstallationData} = require("../controllers/installationDataController");
const uploadHandler = require("../middlewares/multerConfig");
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
router.post("/new-installation-data",userVerification(['serviceperson']), uploadHandler, createInstallationData);

module.exports = router;