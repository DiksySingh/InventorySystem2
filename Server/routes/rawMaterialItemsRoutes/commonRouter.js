const express = require("express");
const router = express.Router();
const commonController = require("../../controllers/rawMaterialItemsController/commonController");
const {
  tokenVerification,
} = require("../../middlewares/rawMaterialMiddlewares/tokenVerification");

router.post("/addRole", commonController.addRole);
router.get("/showRole", commonController.showRole);
router.delete("/deleteRole", commonController.deleteRole);
router.post(
  "/addItemRawMaterialFromExcel",
  commonController.upload.single("file"),
  commonController.addItemRawMaterialFromExcel,
);
router.delete(
  "/deleteItemRawMaterialFromExcel",
  commonController.upload.single("file"),
  commonController.deleteItemRawMaterialFromExcel,
);
router.post(
  "/updateRawMaterialsUnitByExcel",
  commonController.upload.single("file"),
  commonController.updateRawMaterialsUnitByExcel,
);
router.post(
  "/importRawMaterialsByExcel",
  commonController.upload.single("file"),
  commonController.importRawMaterialsByExcel,
);
router.post(
  "/updateRawMaterialStockByExcel",
  commonController.upload.single("file"),
  commonController.updateRawMaterialStockByExcel,
);
router.post(
  "/migrateServiceRecordJSON",
  commonController.migrateServiceRecordJSON,
);
router.post("/fixInvalidJSON", commonController.fixInvalidJSON);

router.post(
  "/addProduct",
  tokenVerification(["Admin", "Store"]),
  commonController.addProduct,
);
router.get(
  "/getProduct",
  tokenVerification([
    "Admin",
    "Store",
    "Disassemble",
    "Stamping",
    "SFG Work",
    "Winding",
    "Winding Connection",
    "Assemble",
    "Testing",
  ]),
  commonController.getProduct,
);
router.delete(
  "/deleteProduct",
  tokenVerification(["Admin", "Store"]),
  commonController.deleteProduct,
);
router.post(
  "/addProductItemMap",
  tokenVerification(["Admin", "Store"]),
  commonController.addProductItemMap,
);
router.get(
  "/getItemsByProductId",
  tokenVerification([
    "Admin",
    "Store",
    "Disassemble",
    "Stamping",
    "SFG Work",
    "Winding",
    "Winding Connection",
    "Assemble",
    "Testing",
  ]),
  commonController.getItemsByProductId,
);
router.delete(
  "/deleteProductItemMap",
  tokenVerification(["Admin", "Store"]),
  commonController.deleteProductItemMap,
);
router.get(
  "/showDefectiveItemsList",
  tokenVerification([
    "Admin",
    "Store",
    "Disassemble",
    "Stamping",
    "SFG Work",
    "Winding",
    "Winding Connection",
    "Assemble",
    "Testing",
  ]),
  commonController.getDefectiveItemsListByWarehouse,
);
router.get(
  "/getItemType",
  tokenVerification(["Admin", "Store"]),
  commonController.getItemType,
);
router.post(
  "/addModel",
  tokenVerification(["Admin", "Store"]),
  commonController.addModel,
);
router.get(
  "/showModel",
  tokenVerification(["Admin", "Store"]),
  commonController.showModel,
);
router.get(
  "/getRawMaterialIdByName",
  commonController.upload.single("file"),
  commonController.getRawMaterialIdByName,
);
router.post(
  "/updateRawMaterialFromExcel",
  commonController.upload.single("file"),
  commonController.updateRawMaterialFromExcel,
);
router.post(
  "/updateRawMaterialUsageFromExcel",
  commonController.upload.single("file"),
  commonController.updateRawMaterialUsageFromExcel,
);

router.put(
  "/update/:id/:isActive",
  tokenVerification(["Purchase"]),
  commonController.markCompanyOrVendorNotActive,
);
router.post(
  "/raw-material/create",
  tokenVerification(["Purchase", "Store"]),
  commonController.createRawMaterial,
);
router.post(
  "/system-item/create",
  tokenVerification(["Purchase", "Store"]),
  commonController.createSystemItem,
);
router.post(
  "/item/create",
  tokenVerification(["Purchase", "Store"]),
  commonController.createItem,
);
router.get(
  "/item/details/:id",
  tokenVerification(["Purchase", "Store"]),
  commonController.getItemById,
);
router.put(
  "/item/update",
  tokenVerification(["Purchase", "Store"]),
  commonController.updateItem,
);
router.get(
  "/unit/view",
  tokenVerification(["Purchase", "Store"]),
  commonController.showUnit,
);
router.post(
  "/warehouse/materials/sync",
  commonController.syncRawMaterialsToWarehouses,
);
router.post(
  "/warehouse/:warehouseId/materials/stock/sync",
  commonController.syncWarehouseStock,
);
router.get(
  "/raw-material/export/excel",
  commonController.exportRawMaterialsExcel,
);
router.post(
  "/raw-material/update/unit-conversion-factor",
  commonController.upload.single("file"),
  commonController.updateItemsFromExcel,
);
router.post("/system-order/create", commonController.addSystemOrder);
router.put(
  "/system-order/update/order-quantity",
  commonController.increaseOrDecreaseSystemOrder,
);
router.post(
  "/warehouse/raw-material/stock/update",
  commonController.upload.single("file"),
  commonController.updateWarehouseStockByExcel,
);

router.get(
  "/countries",
  tokenVerification(["Purchase"]),
  commonController.getCountries,
);

router.get(
  "/currency/:country",
  tokenVerification(["Purchase"]),
  commonController.getCurrencyByCountry,
);

router.get(
  "/currencies",
  tokenVerification(["Purchase"]),
  commonController.getCurrencies,
);

router.get(
  "/address/pincode/:pincode",
  tokenVerification(["Purchase"]),
  commonController.getAddressByPincode,
);

router.get(
  "/raw-material/stock",
  commonController.exportRawMaterialStockByWarehouse,
);

module.exports = router;
