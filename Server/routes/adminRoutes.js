const { warehousePersonSignup, surveyPersonSignup, updateServicePerson } = require("../controllers/authController");
const { allOrderDetails, servicePersonIncomingItemsData, servicePersonIncomingItemsData2, servicePersonOutgoingItemsData } = require("../controllers/pickupItemController");
const { showItems, showItemsData, updateItemName, allIncomingItemDetails } = require("../controllers/itemController");
const { 
  addWarehouse, showWarehouses, addWarehouseItems, viewWarehousePersons, viewServicePersons, 
  deactivateWarehousePerson, deactivateServicePerson, allRepairRejectItemsData, addSystem, addSystemItem, addSystemSubItem, showSystemItems, 
  showWarehouseItemsData, uploadSystemItemsFromExcel, uploadSystemSubItemsFromExcel, attachItemComponentMapByExcel, showStockUpdateHistory,
  updateInstallationInventoryFromExcel
} = require("../controllers/warehouseController");
const { allDefectiveItemsData } = require("../controllers/warehouse2WarehouseController");
const {getInstallationsData} = require("../controllers/installationDataController");
const { userVerification } = require("../middlewares/authMiddlewares");
const router = require("express").Router();
const multer = require("multer");
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

//Admin Accessible Route
router.post("/warehouse-person-signup", userVerification(['admin']), warehousePersonSignup);
router.post("/survey-person-signup", userVerification(['admin']), surveyPersonSignup);
router.put("/update-service-person", userVerification(['admin']), updateServicePerson);
router.post("/add-warehouse",userVerification(['admin']), addWarehouse);
router.get("/all-warehouses", userVerification(['admin']), showWarehouses);
router.post("/add-item", userVerification(['admin']), addWarehouseItems);
router.get("/stock-update-history", userVerification(['admin']), showStockUpdateHistory);
router.get("/all-items", userVerification(['admin']), showWarehouseItemsData);
router.get("/dashboard",userVerification(['admin']), showItemsData);
router.get("/all-warehouse-persons",userVerification(['admin']), viewWarehousePersons);
router.get("/all-service-persons",userVerification(['admin']), viewServicePersons);
router.get("/all-transactions-data", userVerification(["admin"]),allOrderDetails);
router.get("/upper-order-details", userVerification(["admin"]), allIncomingItemDetails);
router.put("/update-item-name",userVerification(['admin']), updateItemName);
router.get("/all-repair-reject-itemData",userVerification(['admin']), allRepairRejectItemsData);
router.delete("/deactivate-warehouse-person",userVerification(['admin']), deactivateWarehousePerson);
router.delete("/deactivate-service-person",userVerification(['admin']), deactivateServicePerson);
router.get("/warehouse-to-warehouse-data", userVerification(['admin']), allDefectiveItemsData);

router.get("/incoming-items-data", userVerification(['admin']), servicePersonIncomingItemsData);
router.get("/outgoing-items-data", userVerification(['admin']), servicePersonOutgoingItemsData);

router.get("/all-installations-data",userVerification(['admin']), getInstallationsData);


router.post("/add-system", userVerification(['admin']), addSystem);
router.post("/add-system-item", userVerification(['admin']), addSystemItem);
router.post("/add-subItem", userVerification(['admin']), addSystemSubItem);
router.get("/show-system-item", userVerification(['admin']), showSystemItems);

router.post("/system-item-excel", userVerification(['admin']), upload.single("file"), uploadSystemItemsFromExcel);
router.post("/add-subItems-by-excel", userVerification(['admin']), upload.single("file"), uploadSystemSubItemsFromExcel);
router.post("/add-item-component-by-excel", userVerification(['admin']), upload.single("file"), attachItemComponentMapByExcel);
router.post("/upload-inventory-stock", upload.single("file"), updateInstallationInventoryFromExcel);

module.exports = router;
