const { servicePersonSignup } = require("../controllers/authController");
const { outgoingItemsData, warehouseOrderDetails, updateOrderStatus } = require("../controllers/pickupItemController");
const { showItems, incomingItems, warehouseIncomingItemDetails} = require("../controllers/itemController");
const { 
  addWarehouseItemsStock,
  getWarehouse,
  showWarehouses,
  viewWarehouseItems,
  warehouseDashboard,
  repairItemData, 
  rejectItemData, 
  warehouseRepairRejectItemsData,  
  viewOrdersApprovedHistory
} = require("../controllers/warehouseController");
const { sendingDefectiveItems, inDefectiveItemsData,inDefectiveItemsOrderHistory,outgoingDefectiveOrderData, updateDefectiveOrderStatus } = require("../controllers/warehouse2WarehouseController");
const { getWarehouseInstallationData } = require("../controllers/installationDataController");
const router = require("express").Router();
const { userVerification } = require("../middlewares/authMiddlewares");

//Warehouse Access Routes
router.get("/all-items", userVerification(['warehouseAdmin', 'serviceperson']), showItems);
router.post("/service-person-signup",userVerification(['warehouseAdmin']), servicePersonSignup);   
router.get("/dashboard", userVerification(['warehouseAdmin']), warehouseDashboard);
router.post("/add-item-stock", userVerification(['warehouseAdmin']), addWarehouseItemsStock);
router.get("/get-warehouse", userVerification(['warehouseAdmin']), getWarehouse);
router.get("/all-warehouses", userVerification(['warehouseAdmin']), showWarehouses);
router.get("/view-items", userVerification(['warehouseAdmin']), viewWarehouseItems);
router.post("/outgoing-items", userVerification(['warehouseAdmin']), outgoingItemsData);
router.post("/add-incoming-item", userVerification(["warehouseAdmin"]), incomingItems);
router.get("/incoming-items-data", userVerification(['warehouseAdmin']), warehouseIncomingItemDetails);
router.get("/warehouse-in-out-orders",userVerification(["warehouseAdmin"]), warehouseOrderDetails);
router.get("/approved-order-history", userVerification(['warehouseAdmin']), viewOrdersApprovedHistory);
router.post("repair-item", userVerification(['warehouseAdmin']), repairItemData);
router.post("/reject-item", userVerification(['warehouseAdmin']), rejectItemData);
router.get("/repair-reject-itemData", userVerification(['warehouseAdmin']), warehouseRepairRejectItemsData);
router.put("/update-incoming-status", userVerification(["warehouseAdmin"]), updateOrderStatus);
router.post("/defective-order-data", userVerification(['warehouseAdmin']), sendingDefectiveItems);
router.get("/view-defective-orders", userVerification(['warehouseAdmin']), inDefectiveItemsData);
router.get("/defective-order-history", userVerification(['warehouseAdmin']), inDefectiveItemsOrderHistory);
router.get("/outgoing-defective-order", userVerification(['warehouseAdmin']), outgoingDefectiveOrderData);
router.put("/update-defective-order-status", userVerification(['warehouseAdmin']), updateDefectiveOrderStatus);
//router.delete("/deleteItem", userVerification(["warehouseAdmin"]), deleteItem);

router.get("/warehouse-installation-data", userVerification(['warehouseAdmin']), getWarehouseInstallationData);

module.exports = router;