const {addOutgoingTransaction, viewTransactions,getTransactionByID, updateTransaction, returnItems, deleteTransaction, updateTransactionStatus, getServicePersonTransactions, servicePersonDashboard} = require("../controllers/outgoingItemController");
const {userVerification} = require("../middlewares/authMiddlewares");
const router = require("express").Router();
//const upload = require("../middlewares/multerConfig");

//Inventory
//upload.single("videoProof")

router.patch("/transactions/update", userVerification(['warehouseAdmin']), updateTransaction);
router.delete("/transactions/delete", userVerification(['warehouseAdmin']), deleteTransaction);
router.patch("/transactions/returnItems", userVerification(['warehouseAdmin']), returnItems);

//Admin and Inventory Both
router.get("/transactions/allTransactions", userVerification(['admin','warehouseAdmin']), viewTransactions);
router.get("/transactions/view", userVerification(['admin','warehouseAdmin']), getTransactionByID);

//Service Person
router.post(
  "/addOrderDetails",
  userVerification(["serviceperson"]),
  addOutgoingTransaction
); 
router.get("/transactions/transactionDetails", userVerification(['serviceperson']), getServicePersonTransactions);
router.patch("/transactions/updateStatus", userVerification(['serviceperson']), updateTransactionStatus);

module.exports = router;