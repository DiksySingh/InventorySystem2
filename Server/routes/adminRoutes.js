const { warehousePersonSignup } = require("../controllers/authController");
const { allOrderDetails } = require("../controllers/pickupItemController");
const { showItems, showItemsData, updateItemName, allIncomingItemDetails } = require("../controllers/itemController");
const { 
  addWarehouse, showWarehouses, viewWarehousePersons, viewServicePersons, 
  deleteWarehousePerson, deleteServicePerson, allRepairRejectItemsData, 
} = require("../controllers/warehouseController");
const { userVerification } = require("../middlewares/authMiddlewares");
const router = require("express").Router();

//Admin Accessible Route
router.post("/warehouse-person-signup", userVerification(['admin']), warehousePersonSignup);
router.post("/add-warehouse",userVerification(['admin']), addWarehouse);
router.get("/all-warehouses", userVerification(['admin']), showWarehouses);
router.get("/dashboard",userVerification(['admin']), showItemsData);
router.get("/all-warehouse-persons",userVerification(['admin']), viewWarehousePersons);
router.get("/all-service-persons",userVerification(['admin']), viewServicePersons);
router.get("/all-transactions-data", userVerification(["admin"]),allOrderDetails);
router.get("/upper-order-details", userVerification(["admin"]), allIncomingItemDetails);
router.put("/update-item-name",userVerification(['admin']), updateItemName);
router.get("/all-repair-reject-itemData",userVerification(['admin']), allRepairRejectItemsData);
router.delete("/remove-warehouse-person",userVerification(['admin']), deleteWarehousePerson);
router.delete("/remove-service-person",userVerification(['admin']), deleteServicePerson);

module.exports = router;
