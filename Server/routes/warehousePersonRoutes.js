const {
  servicePersonSignup,
} = require("../controllers/serviceControllers/authController");
const {
  outgoingItemsData,
  warehouseOrderDetails,
  updateOrderStatus,
} = require("../controllers/serviceControllers/pickupItemController");
const {
  showItems,
  incomingItems,
  warehouseIncomingItemDetails,
} = require("../controllers/serviceControllers/itemController");
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
  showSystemItemMapData,
  showSystemItems,
  showInstallationInventoryItems,
  showItemsWithStockStatus,
  updateItemQuantity,
  addNewInstallationData,
  showInstallationDataToWarehouse,
  itemComingToWarehouse,
  showIncomingItemToWarehouse,
  warehouse2WarehouseTransaction,
  showIncomingWToWItems,
  showOutgoingWToWItems,
  acceptingWToWIncomingItems,
  incomingWToWSystemItemsHistory,
  outgoingWToWSystemItemsHistory,
  addOutgoingItemsData,
  showOutgoingItemsData,
  uploadSystemSubItemsFromExcel,
  updateSystemId,
  showItemComponents,
  getSystemItemsWithSubItems,
  allServiceSurveyPersons,
  servicePersonForMaharashtra,
  getSystemItemsFromItemComponentMap,
  declinePickupItemsTransaction,
  addSerialNumber,
  getSerialNumber,
  checkSerialNumber,
  uploadSerialNumbers,
  updateSerialNumbersAsUsed
} = require("../controllers/serviceControllers/warehouseController");
const {
  sendingDefectiveItems,
  inDefectiveItemsData,
  inDefectiveItemsOrderHistory,
  outgoingDefectiveOrderData,
  updateDefectiveOrderStatus,
} = require("../controllers/serviceControllers/warehouse2WarehouseController");
const {
  getWarehouseInstallationData,
} = require("../controllers/serviceControllers/installationDataController");
const router = require("express").Router();
const { userVerification } = require("../middlewares/authMiddlewares");

const multer = require("multer");
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

//Warehouse Access Routes
router.get(
  "/all-items",
  userVerification(["warehouseAdmin", "serviceperson"]),
  showItems
);
router.post(
  "/service-person-signup",
  userVerification(["warehouseAdmin"]),
  servicePersonSignup
);
router.get(
  "/dashboard",
  userVerification(["warehouseAdmin"]),
  warehouseDashboard
);
router.post(
  "/add-item-stock",
  userVerification(["warehouseAdmin"]),
  addWarehouseItemsStock
);
router.get(
  "/get-warehouse",
  userVerification(["warehouseAdmin"]),
  getWarehouse
);
router.get(
  "/all-warehouses",
  userVerification(["warehouseAdmin"]),
  showWarehouses
);
router.get(
  "/view-items",
  userVerification(["warehouseAdmin"]),
  viewWarehouseItems
);
router.post(
  "/outgoing-items",
  userVerification(["warehouseAdmin"]),
  outgoingItemsData
);
router.post(
  "/add-incoming-item",
  userVerification(["warehouseAdmin"]),
  incomingItems
);
router.post(
  "/add-outgoing-item",
  userVerification(["warehouseAdmin"]),
  addOutgoingItemsData
);
router.get(
  "/outgoing-items-data",
  userVerification(["warehouseAdmin"]),
  showOutgoingItemsData
);
router.get(
  "/incoming-items-data",
  userVerification(["warehouseAdmin"]),
  warehouseIncomingItemDetails
);
router.get(
  "/warehouse-in-out-orders",
  userVerification(["warehouseAdmin"]),
  warehouseOrderDetails
);
// router.get("/approved-order-history", userVerification(['warehouseAdmin']), viewOrdersApprovedHistory);
// router.post("/repair-item", userVerification(['warehouseAdmin']), repairItemData);
// router.post("/reject-item", userVerification(['warehouseAdmin']), rejectItemData);
router.get(
  "/repair-items-history",
  userVerification(["warehouseAdmin"]),
  warehouseRepairItemsData
);
router.get(
  "/reject-items-history",
  userVerification(["warehouseAdmin"]),
  warehouseRejectItemsData
);
router.put(
  "/update-incoming-status",
  userVerification(["warehouseAdmin"]),
  updateOrderStatus
);
router.put(
  "/decline-incoming-items",
  userVerification(["warehouseAdmin"]),
  declinePickupItemsTransaction
);
router.post(
  "/defective-order-data",
  userVerification(["warehouseAdmin"]),
  sendingDefectiveItems
);
router.get(
  "/view-defective-orders",
  userVerification(["warehouseAdmin"]),
  inDefectiveItemsData
);
router.get(
  "/defective-order-history",
  userVerification(["warehouseAdmin"]),
  inDefectiveItemsOrderHistory
);
router.get(
  "/outgoing-defective-order",
  userVerification(["warehouseAdmin"]),
  outgoingDefectiveOrderData
);
router.put(
  "/update-defective-order-status",
  userVerification(["warehouseAdmin"]),
  updateDefectiveOrderStatus
);
//router.delete("/deleteItem", userVerification(["warehouseAdmin"]), deleteItem);

router.get(
  "/warehouse-installation-data",
  userVerification(["warehouseAdmin"]),
  getWarehouseInstallationData
);

// router.post("/add-system", userVerification(['warehouseAdmin']), addSystem);
// router.post("/add-system-item", userVerification(['warehouseAdmin']), addSystemItem);
router.get(
  "/show-systems",
  userVerification(["warehouseAdmin", "admin"]),
  showSystems
);
router.get(
  "/show-system-items",
  userVerification(["warehouseAdmin", "admin"]),
  showSystemItems
);
router.get(
  "/show-system-item-map",
  userVerification(["warehouseAdmin", "admin"]),
  showSystemItemMapData
);
router.get(
  "/show-item-component",
  userVerification(["warehouseAdmin", "admin"]),
  showItemComponents
);
router.get(
  "/show-items-subItems",
  userVerification(["warehouseAdmin", "admin"]),
  getSystemItemsWithSubItems
);
router.get(
  "/show-pump-data",
  userVerification(["warehouseAdmin", "admin"]),
  getSystemItemsFromItemComponentMap
);
router.get(
  "/show-inventory-items",
  userVerification(["warehouseAdmin"]),
  showInstallationInventoryItems
);
router.get(
  "/show-items-stock-status",
  userVerification(["warehouseAdmin"]),
  showItemsWithStockStatus
);
router.put(
  "/update-subItem-quantity",
  userVerification(["warehouseAdmin"]),
  updateItemQuantity
);
router.get(
  "/service-survey-persons",
  userVerification(["warehouseAdmin"]),
  servicePersonForMaharashtra
);
router.post(
  "/add-new-installation",
  userVerification(["warehouseAdmin"]),
  addNewInstallationData
);
// router.get("/all-service-survey-person", userVerification(['warehouseAdmin']), allServiceSurveyPerson);
router.get(
  "/new-installation-data",
  userVerification(["warehouseAdmin"]),
  showInstallationDataToWarehouse
);
router.post(
  "/incoming-inventory-items",
  userVerification(["warehouseAdmin"]),
  itemComingToWarehouse
);
router.get(
  "/incoming-items-history",
  userVerification(["warehouseAdmin"]),
  showIncomingItemToWarehouse
);
router.post(
  "/wtow-transaction",
  userVerification(["warehouseAdmin"]),
  warehouse2WarehouseTransaction
);
router.get(
  "/show-incoming-item",
  userVerification(["warehouseAdmin"]),
  showIncomingWToWItems
);
router.get(
  "/show-outgoing-item",
  userVerification(["warehouseAdmin"]),
  showOutgoingWToWItems
);
router.put(
  "/approve-incoming-item",
  userVerification(["warehouseAdmin"]),
  acceptingWToWIncomingItems
);
router.get(
  "/approved-incoming-item",
  userVerification(["warehouseAdmin"]),
  incomingWToWSystemItemsHistory
);
router.get(
  "/approved-outgoing-item",
  userVerification(["warehouseAdmin"]),
  outgoingWToWSystemItemsHistory
);

router.put("/update-systemId", updateSystemId);
router.post("/add-serial-number", addSerialNumber);
router.get("/get-serial-number", getSerialNumber);
router.get("check-serial-number", checkSerialNumber);
router.post("/upload-serial-number", upload.single("file"), uploadSerialNumbers);
router.put("/update-serial-number", upload.single('file'), updateSerialNumbersAsUsed);
module.exports = router;
