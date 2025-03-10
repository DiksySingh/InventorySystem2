const express = require("express");
const router = express.Router();
const commonController = require("../../controllers/rawMaterialItemsController/commonController");

router.post("/addRole", commonController.addRole);
router.get("/showRole", commonController.showRole);
router.delete("/deleteRole", commonController.deleteRole);

module.exports = router;