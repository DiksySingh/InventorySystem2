const {
  incomingItemsData,
  outgoingItemsData,
  warehouseOrderDetails,
  allOrderDetails,
  pickupItemOfServicePerson,
  servicePersonDashboard,
  updateOrderStatus
} = require("../controllers/pickupItemController");
const { userVerification } = require("../middlewares/authMiddlewares");
const router = require("express").Router();
// const {
//   upload,
//   resizeImageMiddleware,
// } = require("../middlewares/multerConfig");

//Admin Routes
router.get("/all-transactions-data", userVerification(["admin"]),allOrderDetails);

//ServicePerson Routes
router.get(
  "/dashboard",
  userVerification(["serviceperson"]),
  servicePersonDashboard
);

router.post(
  "/incoming-items",
  userVerification(["serviceperson"]),
  incomingItemsData
);

router.get(
  "/view-pickup-items",
  userVerification(["serviceperson"]),
  pickupItemOfServicePerson
);

//Warehouse Person Routes
router.post("/outgoing-items", userVerification(['warehouseAdmin']), outgoingItemsData);

router.get("/all-pickup-items",userVerification(["warehouseAdmin"]), warehouseOrderDetails);

router.put(
  "/update-status",
  userVerification(["warehouseAdmin", "serviceperson"]),
  updateOrderStatus
);

module.exports = router;
