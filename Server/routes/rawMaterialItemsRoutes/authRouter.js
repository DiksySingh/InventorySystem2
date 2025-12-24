const express = require("express");
const router = express.Router();
const authController = require("../../controllers/rawMaterialItemsController/authController");
const {tokenVerification} = require("../../middlewares/rawMaterialMiddlewares/tokenVerification");

router.post("/signup", authController.addUser);
router.post("/login", authController.login);
router.post("/logout", tokenVerification(['Admin']), authController.logout);
router.post("/handleRefreshToken", authController.handleRefreshToken);


module.exports = router;