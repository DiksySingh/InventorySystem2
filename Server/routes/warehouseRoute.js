const { 
    addWarehouse, viewWarehousePersons, viewServicePersons, deleteWarehousePerson, 
    deleteServicePerson, allRepairRejectItemsData, addWarehouseItems, warehouseDashboard, 
    newRepairNRejectItemData, warehouseRepairRejectItemsData,  
} = require("../controllers/warehouseController");
const router = require("express").Router();
const { userVerification } = require("../middlewares/authMiddlewares");

//Admin Access Routes
router.post("/add-warehouse", addWarehouse);
router.get("/all-warehouse-persons", viewWarehousePersons);
router.get("/all-service-persons", viewServicePersons);
router.delete("/remove-warehouse-person", deleteWarehousePerson);
router.delete("/remove-service-person", deleteServicePerson);
router.get("/all-repair-reject-itemData", allRepairRejectItemsData);

//Warehouse Access Routes
router.post("/add-item", userVerification(['warehouseAdmin']), addWarehouseItems);
router.get("/warehouse-dashboard", userVerification(['warehouseAdmin']), warehouseDashboard);
router.post("/repair-reject-item", userVerification(['warehouseAdmin']), newRepairNRejectItemData);
router.get("/warehouse-repair-reject-itemData", userVerification(['warehouseAdmin']), warehouseRepairRejectItemsData);

module.exports = router;