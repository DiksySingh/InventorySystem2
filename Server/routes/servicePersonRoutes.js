const {incomingItemsData, pickupItemOfServicePerson, servicePersonDashboard, updateOrderStatus} = require("../controllers/pickupItemController");
//const uploadHandler = require("../middlewares/multerConfig");
const { userVerification } = require("../middlewares/authMiddlewares");
const router = require("express").Router();

//ServicePerson Routes
router.get("/serviceperson-dashboard",userVerification(["serviceperson"]),servicePersonDashboard);
router.post("/incoming-items",userVerification(["serviceperson"]),incomingItemsData);
router.get("/serviceperson-pickedup-items",userVerification(["serviceperson"]),pickupItemOfServicePerson);
router.put("/update-outgoing-status", userVerification(["serviceperson"]), updateOrderStatus);

module.exports = router;