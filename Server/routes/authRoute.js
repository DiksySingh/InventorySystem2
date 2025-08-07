const { adminSignup, Login, Logout, updatePassword, validateRefreshToken } = require("../controllers/serviceControllers/authController");
const { userVerification } = require("../middlewares/authMiddlewares");
const router = require("express").Router();

router.post("/admin-signup", adminSignup);
router.post("/login", Login);
router.post("/logout", userVerification(["admin", "warehouseAdmin", "serviceperson", "installer", "fieldsales", "filing"]), Logout);
router.post("/update-password", userVerification(["warehouseAdmin", "serviceperson", "installer", "fieldsales", "filing"]), updatePassword);
router.post("/validateRefreshToken", validateRefreshToken);

module.exports = router;
