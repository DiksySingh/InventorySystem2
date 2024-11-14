const { adminSignup, Login, Logout, updatePassword } = require("../controllers/authController");
const { userVerification, refreshToken } = require("../middlewares/authMiddlewares");
const router = require("express").Router();

router.post("/admin-signup", adminSignup);
router.post("/login", Login);
router.post("/logout", userVerification(["admin", "warehouseAdmin", "serviceperson"]), Logout);
router.post("/update-password", userVerification(["serviceperson"]), updatePassword);
router.post("/refresh-token", refreshToken);

module.exports = router;
