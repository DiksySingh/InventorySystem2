const express = require("express");
const router = express.Router();
const lineWorkerController = require("../../controllers/rawMaterialItemsController/lineWorkerController");
const {tokenVerification} = require("../../middlewares/rawMaterialMiddlewares/tokenVerification");

router.get("/showStorePersons", tokenVerification(["Disassemble", "Stamping", "SFG Work", "Winding", "Winding Connection", "Assemble"]), lineWorkerController.showStorePersons);
router.get("/rawMaterialForItemRequest", tokenVerification(["Disassemble", "Stamping", "SFG Work", "Winding", "Winding Connection", "Assemble"]), lineWorkerController.rawMaterialForItemRequest);
router.post("/createItemRequest", tokenVerification(["Disassemble", "Stamping", "SFG Work", "Winding", "Winding Connection", "Assemble"]), lineWorkerController.createItemRequest);
// router.post("/createInProcessItemRequest", tokenVerification(["Disassemble", "Stamping", "SFG Work", "Winding", "Winding Connection", "Assemble", "Testing"]), lineWorkerController.createInProcessItemRequest);
router.post("/createServiceProcess", tokenVerification(["Disassemble", "SFG Work"]), lineWorkerController.createServiceProcess); 
router.get("/getPendingActivitiesForUserStage", tokenVerification(["Disassemble", "Stamping", "SFG Work", "Winding", "Winding Connection", "Assemble", "Testing"]), lineWorkerController.getPendingActivitiesForUserStage);
router.put("/acceptServiceProcess", tokenVerification(["Disassemble", "Stamping", "SFG Work", "Winding", "Winding Connection", "Assemble", "Testing"]), lineWorkerController.acceptServiceProcess);
router.put("/startServiceProcess", tokenVerification(["Disassemble", "Stamping", "SFG Work", "Winding", "Winding Connection", "Assemble", "Testing"]), lineWorkerController.startServiceProcess);
router.get("/showUserItemStock", tokenVerification(["Disassemble", "Stamping", "SFG Work", "Winding", "Winding Connection", "Assemble", "Testing"]), lineWorkerController.showUserItemStock);
router.post("/createItemUsageLog", tokenVerification(["Disassemble", "Stamping", "SFG Work", "Winding", "Winding Connection", "Assemble", "Testing"]), lineWorkerController.createItemUsageLog);
router.post("/completeServiceProcess", tokenVerification(["Disassemble", "Stamping", "SFG Work", "Winding", "Winding Connection", "Assemble", "Testing"]), lineWorkerController.completeServiceProcess);
router.post("/disassembleItemsForm", tokenVerification(["Disassemble"]), lineWorkerController.disassembleReusableItemsForm);

module.exports = router;
