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
router.get("/getAssembleUsers", tokenVerification(["Disassemble"]), lineWorkerController.getAssembleUsers);
router.post("/disassembleItemsForm", tokenVerification(["Disassemble"]), lineWorkerController.disassembleReusableItemsForm);
router.get("/getRequestsByUser", tokenVerification(["Disassemble", "Stamping", "SFG Work", "Winding", "Winding Connection", "Assemble", "Testing"]), lineWorkerController.getRequestsByUser);

// ------ Version 2 -------------//
router.get("/showStorePersons2", tokenVerification(["Disassemble", "Stamping", "SFG Work", "Winding", "Winding Connection", "Assemble"]), lineWorkerController.showStorePersons2);
router.get("/rawMaterialForItemRequest2", tokenVerification(["Disassemble", "Stamping", "SFG Work", "Winding", "Winding Connection", "Assemble"]), lineWorkerController.rawMaterialForItemRequest2);
router.post("/createItemRequest2", tokenVerification(["Disassemble", "Stamping", "SFG Work", "Winding", "Winding Connection", "Assemble"]), lineWorkerController.createItemRequest2);
// router.post("/createInProcessItemRequest", tokenVerification(["Disassemble", "Stamping", "SFG Work", "Winding", "Winding Connection", "Assemble", "Testing"]), lineWorkerController.createInProcessItemRequest);
router.post("/createServiceProcess2", tokenVerification(["Disassemble", "SFG Work"]), lineWorkerController.createServiceProcess2); 
router.get("/getPendingActivitiesForUserStage2", tokenVerification(["Disassemble", "Stamping", "SFG Work", "Winding", "Winding Connection", "Assemble", "Testing"]), lineWorkerController.getPendingActivitiesForUserStage2);
router.put("/acceptServiceProcess2", tokenVerification(["Disassemble", "Stamping", "SFG Work", "Winding", "Winding Connection", "Assemble", "Testing"]), lineWorkerController.acceptServiceProcess2);
router.put("/startServiceProcess2", tokenVerification(["Disassemble", "Stamping", "SFG Work", "Winding", "Winding Connection", "Assemble", "Testing"]), lineWorkerController.startServiceProcess2);
router.post("/completeServiceProcess2", tokenVerification(["Disassemble", "Stamping", "SFG Work", "Winding", "Winding Connection", "Assemble", "Testing"]), lineWorkerController.completeServiceProcess2);
router.get("/getAssembleUsers2", tokenVerification(["Disassemble"]), lineWorkerController.getAssembleUsers2);
router.post("/disassembleItemsForm2", tokenVerification(["Disassemble"]), lineWorkerController.disassembleReusableItemsForm2);
module.exports = router;
