const { addWarehouse, addWarehouseItems, getWarehouseItemsData } = require("../controllers/warehouseController");
const router = require("express").Router();
const { userVerification } = require("../middlewares/authMiddlewares");

router.post("/add-warehouse", addWarehouse);
router.post("/add-item", addWarehouseItems);
router.get("/get-warehouse-data", getWarehouseItemsData);

module.exports = router;