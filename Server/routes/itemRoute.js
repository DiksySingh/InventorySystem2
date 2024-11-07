const {
  addItem,
  showItems,
  showItemsData,
  updateItemName,
  deleteItem,
  incomingItems,
  incomingItemDetails
} = require("../controllers/itemController");
const { userVerification } = require("../middlewares/authMiddlewares");
const router = require("express").Router();

//Admin Accessible Route
router.get(
  "/viewItems",
  userVerification(["warehouseAdmin", "serviceperson"]),
  showItems
);
router.get("/show-items", showItemsData);

//Warehouse Accessible Route
router.post("/newItem", userVerification(["warehouseAdmin"]), addItem);
router.post("/updateItem", userVerification(["warehouseAdmin"]), incomingItems);
router.get(
  "/order-details",
  userVerification(["warehouseAdmin"]),
  incomingItemDetails
);

router.put("/update-item-name", updateItemName);
router.delete("/deleteItem", userVerification(["warehouseAdmin"]), deleteItem);

module.exports = router;
