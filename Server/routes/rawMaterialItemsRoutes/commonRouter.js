const express = require("express");
const router = express.Router();
const commonController = require("../../controllers/rawMaterialItemsController/commonController");

router.post("/addRole", commonController.addRole);
router.get("/showRole", commonController.showRole);
router.delete("/deleteRole", commonController.deleteRole);
router.post('/addItemRawMaterialFromExcel', commonController.upload.single('file'), commonController.addItemRawMaterialFromExcel);

module.exports = router;