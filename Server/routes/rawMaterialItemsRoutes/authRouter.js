const express = require("express");
const router = express.Router();
const authController = require("../../controllers/rawMaterialItemsController/authController");

router.post("/signup", authController.addUser);
router.post("/login", authController.login);
router.post("/logout", authController.logout);

module.exports = router;