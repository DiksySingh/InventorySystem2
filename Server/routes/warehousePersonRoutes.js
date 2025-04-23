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
  warehouseRepairItemsData, 
  warehouseRejectItemsData,
  viewOrdersApprovedHistory,
  addSystem,
  showSystems,
  showSystemSubItems,
  showSystemItems,
  showInstallationInventoryItems,
  updateItemQuantity,
  addNewInstallationData,
  showInstallationDataToWarehouse,
  itemComingToWarehouse,
  showIncomingItemToWarehouse,
  incomingWToWItem,
  showIncomingWToWItems,
  showOutgoingWToWItems,
  acceptingWToWIncomingItems,
  incomingWToWSystemItemsHistory,
  outgoingWToWSystemItemsHistory,
  addOutgoingItemsData,
  showOutgoingItemsData,
} = require("../controllers/warehouseController");
const { sendingDefectiveItems, inDefectiveItemsData, inDefectiveItemsOrderHistory, outgoingDefectiveOrderData, updateDefectiveOrderStatus } = require("../controllers/warehouse2WarehouseController");
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
router.post("/add-outgoing-item", userVerification(['warehouseAdmin']), addOutgoingItemsData);
router.get("/outgoing-items-data", userVerification(['warehouseAdmin']), showOutgoingItemsData);
router.get("/incoming-items-data", userVerification(['warehouseAdmin']), warehouseIncomingItemDetails);
router.get("/warehouse-in-out-orders",userVerification(["warehouseAdmin"]), warehouseOrderDetails);
// router.get("/approved-order-history", userVerification(['warehouseAdmin']), viewOrdersApprovedHistory);
router.post("/repair-item", userVerification(['warehouseAdmin']), repairItemData);
router.post("/reject-item", userVerification(['warehouseAdmin']), rejectItemData);
router.get("/repair-items-history", userVerification(['warehouseAdmin']), warehouseRepairItemsData);
router.get("/reject-items-history", userVerification(['warehouseAdmin']), warehouseRejectItemsData);
router.put("/update-incoming-status", userVerification(["warehouseAdmin"]), updateOrderStatus);
router.post("/defective-order-data", userVerification(['warehouseAdmin']), sendingDefectiveItems);
router.get("/view-defective-orders", userVerification(['warehouseAdmin']), inDefectiveItemsData);
router.get("/defective-order-history", userVerification(['warehouseAdmin']), inDefectiveItemsOrderHistory);
router.get("/outgoing-defective-order", userVerification(['warehouseAdmin']), outgoingDefectiveOrderData);
router.put("/update-defective-order-status", userVerification(['warehouseAdmin']), updateDefectiveOrderStatus);
//router.delete("/deleteItem", userVerification(["warehouseAdmin"]), deleteItem);

router.get("/warehouse-installation-data", userVerification(['warehouseAdmin']), getWarehouseInstallationData);

// router.post("/add-system", userVerification(['warehouseAdmin']), addSystem);
// router.post("/add-system-item", userVerification(['warehouseAdmin']), addSystemItem);
router.get("/show-systems", userVerification(['warehouseAdmin', 'admin']), showSystems);
router.get("/show-subItems", userVerification(['warehouseAdmin', 'admin']), showSystemSubItems);
router.get("/show-inventory-items", userVerification(['warehouseAdmin']), showInstallationInventoryItems);
router.put("/update-subItem-quantity", userVerification(['warehouseAdmin']), updateItemQuantity);
router.post("/add-new-installation", userVerification(['warehouseAdmin']), addNewInstallationData);
// router.get("/all-service-survey-person", userVerification(['warehouseAdmin']), allServiceSurveyPerson);
router.get("/new-installation-data", userVerification(['warehouseAdmin']), showInstallationDataToWarehouse);
router.post("/incoming-inventory-items", userVerification(['warehouseAdmin']), itemComingToWarehouse);
router.get("/incoming-items-history", userVerification(['warehouseAdmin']), showIncomingItemToWarehouse);
router.post("/incoming-new-stock", userVerification(['warehouseAdmin']), incomingWToWItem);
router.get("/show-incoming-item", userVerification(['warehouseAdmin']), showIncomingWToWItems);
router.get("/show-outgoing-item", userVerification(['warehouseAdmin']), showOutgoingWToWItems);
router.put("/approve-incoming-item", userVerification(['warehouseAdmin']),acceptingWToWIncomingItems);
router.get("/approved-incoming-item", userVerification(['warehouseAdmin']), incomingWToWSystemItemsHistory);
router.get("/approved-outgoing-item", userVerification(['warehouseAdmin']), outgoingWToWSystemItemsHistory);
module.exports = router;
