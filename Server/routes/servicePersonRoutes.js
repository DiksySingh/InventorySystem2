const {incomingItemsData, pickupItemOfServicePerson, servicePersonDashboard, showWarehouseItems, updateOrderStatus} = require("../controllers/pickupItemController");
const {showWarehouses} = require("../controllers/warehouseController");
//const uploadHandler = require("../middlewares/multerConfig");
const { userVerification } = require("../middlewares/authMiddlewares");
const router = require("express").Router();

//ServicePerson Routes
router.get("/dashboard",userVerification(["serviceperson"]),servicePersonDashboard);
router.get("/warehouse-items", userVerification(['serviceperson']), showWarehouseItems);
router.get("/all-warehouses", userVerification(['serviceperson']), showWarehouses);
router.post("/incoming-items",userVerification(["serviceperson"]),incomingItemsData);
router.get("/pickedup-items",userVerification(["serviceperson"]),pickupItemOfServicePerson);
router.put("/update-outgoing-status", userVerification(["serviceperson"]), updateOrderStatus);

module.exports = router;