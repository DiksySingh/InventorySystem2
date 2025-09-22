const express = require("express");
const router = express.Router();
const lineWorkerController = require("../../controllers/rawMaterialItemsController/lineWorkerController");
const {tokenVerification} = require("../../middlewares/rawMaterialMiddlewares/tokenVerification");

router.get("/showStorePersons", tokenVerification(["Disassemble", "Stamping", "MPC Work", "Winding", "Winding Connection", "Assemble"]), lineWorkerController.showStorePersons);
router.get("/rawMaterialForItemRequest", tokenVerification(["Disassemble", "Stamping", "MPC Work", "Winding", "Winding Connection", "Assemble"]), lineWorkerController.rawMaterialForItemRequest);
router.post("/createItemRequest", tokenVerification(["Disassemble", "Stamping", "MPC Work", "Winding", "Winding Connection", "Assemble"]), lineWorkerController.createItemRequest);
// router.post("/createInProcessItemRequest", tokenVerification(["Disassemble", "Stamping", "MPC Work", "Winding", "Winding Connection", "Assemble", "Testing"]), lineWorkerController.createInProcessItemRequest);
router.post("/createServiceProcess", tokenVerification(["Disassemble", "Stamping", "MPC Work", "Winding", "Winding Connection", "Assemble", "Testing"]), lineWorkerController.createServiceProcess); 
router.get("/getProcessForUserStage", tokenVerification(["Disassemble", "Stamping", "MPC Work", "Winding", "Winding Connection", "Assemble", "Testing"]), lineWorkerController.getProcessForUserStage);
router.get("/showUserItemStock", tokenVerification(["Disassemble", "Stamping", "MPC Work", "Winding", "Winding Connection", "Assemble", "Testing"]), lineWorkerController.showUserItemStock);
router.post("/createItemUsageLog", tokenVerification(["Disassemble", "Stamping", "MPC Work", "Winding", "Winding Connection", "Assemble", "Testing"]), lineWorkerController.createItemUsageLog);
router.post("/updateStageAndMoveNext", tokenVerification(["Disassemble", "Stamping", "MPC Work", "Winding", "Winding Connection", "Assemble", "Testing"]), lineWorkerController.updateStageAndMoveNext);

module.exports = router;
