const { servicePersonSignup } = require("../controllers/authController");
const { outgoingItemsData, warehouseOrderDetails, updateOrderStatus } = require("../controllers/pickupItemController");
const { showItems, incomingItems, warehouseIncomingItemDetails} = require("../controllers/itemController");
const { 
  addWarehouseItems, 
  warehouseDashboard, 
  newRepairNRejectItemData, 
  warehouseRepairRejectItemsData,  
} = require("../controllers/warehouseController");
const router = require("express").Router();
const { userVerification } = require("../middlewares/authMiddlewares");

//Warehouse Access Routes
router.get("/all-items", userVerification(['warehouseAdmin', 'serviceperson']), showItems);
router.post("/service-person-signup",userVerification(['warehouseAdmin']), servicePersonSignup);   
router.get("/dashboard", userVerification(['warehouseAdmin']), warehouseDashboard);
router.post("/add-item", userVerification(['warehouseAdmin']), addWarehouseItems);
router.post("/outgoing-items", userVerification(['warehouseAdmin']), outgoingItemsData);
router.post("/add-incoming-item", userVerification(["warehouseAdmin"]), incomingItems);
router.get("/incoming-items-data", userVerification(['warehouseAdmin']), warehouseIncomingItemDetails);
router.get("/warehouse-in-out-orders",userVerification(["warehouseAdmin"]), warehouseOrderDetails);
router.post("/repair-reject-item", userVerification(['warehouseAdmin']), newRepairNRejectItemData);
router.get("/repair-reject-itemData", userVerification(['warehouseAdmin']), warehouseRepairRejectItemsData);
router.put("/update-incoming-status", userVerification(["warehouseAdmin"]), updateOrderStatus);
//router.delete("/deleteItem", userVerification(["warehouseAdmin"]), deleteItem);

module.exports = router;