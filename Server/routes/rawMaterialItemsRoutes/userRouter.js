const express = require("express");
const router = express.Router();
const userController = require("../../controllers/rawMaterialItemsController/userController");
const {tokenVerification} = require("../../middlewares/rawMaterialMiddlewares/tokenVerification");

router.put("/password", tokenVerification(['Purchase']), userController.updatePassword);

module.exports = router;