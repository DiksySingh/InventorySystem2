const jwt = require("jsonwebtoken");
const prisma = require("../../config/prismaClient.js");

module.exports.tokenVerification = (allowedRoles) => {
  return async (req, res, next) => {
    try {
      const token = req.cookies?.accessToken || req.headers.authorization?.split(" ")[1];
      console.log("Token: ", token)
      if (!token) {
        return res.status(403).json({ success: false, message: "No token provided" });
      }
     
      let decoded;
      

      try {
        decoded = jwt.verify(token, process.env.ACCESS_TOKEN_KEY);
        console.log("Decoded Data: ", decoded);
      } catch (err) {
        return res.status(403).json({
          success: false,
          message: err.name === "TokenExpiredError" ? "Token expired" : "Invalid token",
        });
      }

      // 🔥 FAST indexed lookup
      const user = await prisma.user.findUnique({
        where: { id: decoded.id },
        select: {
          id: true,
          name: true,
          email: true,
          warehouseId: true,
          isActive: true,
          role: { select: { name: true } }
        }
      });
      console.log("User: ", user);
      if (!user) {
        return res.status(403).json({ success: false, message: "User not found" });
      }

      if (!user.isActive) {
        return res.status(403).json({ success: false, message: "User is inactive" });
      }

      const userRole = user.role.name;
      if (!allowedRoles.includes(userRole)) {
        return res.status(403).json({ success: false, message: "Access denied" });
      }

      req.user = user;
      next();

    } catch (err) {
      return res.status(500).json({
        success: false,
        message: "Internal Server Error",
        error: err.message,
      });
    }
  };
};
