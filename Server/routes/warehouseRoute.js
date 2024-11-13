const { addWarehouse, viewWarehousePersons, viewServicePersons, deleteWarehousePerson, deleteServicePerson, addWarehouseItems, warehouseDashboard, newRepairNRejectItemData } = require("../controllers/warehouseController");
const router = require("express").Router();
const { userVerification } = require("../middlewares/authMiddlewares");

//Admin Access Routes
router.post("/add-warehouse", addWarehouse);
router.get("/all-warehouse-persons", viewWarehousePersons);
router.get("/all-service-persons", viewServicePersons);
router.delete("/remove-warehouse-person", deleteWarehousePerson);
router.delete("/remove-service-person", deleteServicePerson);

//Warehouse Access Routes
router.post("/add-item", addWarehouseItems);
router.get("/warehouse-dashboard", userVerification(['warehouseAdmin']), warehouseDashboard);
router.post("/repair-reject-item", userVerification(['warehouseAdmin']), newRepairNRejectItemData);

module.exports = router;