const { adminSignup, Login, Logout, updatePassword, validateRefreshToken } = require("../controllers/authController");
const { userVerification } = require("../middlewares/authMiddlewares");
const router = require("express").Router();

router.post("/admin-signup", adminSignup);
router.post("/login", Login);
router.post("/logout", userVerification(["admin", "warehouseAdmin", "serviceperson"]), Logout);
router.post("/update-password", userVerification(["serviceperson"]), updatePassword);
router.post("/validateRefreshToken", validateRefreshToken);

module.exports = router;
