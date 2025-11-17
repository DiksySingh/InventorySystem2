// const jwt = require("jsonwebtoken");
// const prisma = require("../../config/prismaClient.js");

// module.exports.tokenVerification = (allowedRoles) => {
//   return async (req, res, next) => {
//     try {
//       // Extract token from cookies or headers
//       const token = req.cookies?.accessToken || req.headers.authorization?.split(" ")[1];
//       if (!token) {
//         return res.status(401).json({
//           success: false,
//           message: "No token provided",
//         });
//       }
//       // Verify token
//       jwt.verify(token, process.env.ACCESS_TOKEN_KEY, async (err, decoded) => {
//         if (err) {
//           if (err.name === "TokenExpiredError") {
//             return res.status(401).json({
//               success: false,
//               message: "Token expired, please login again",
//             });
//           }
//           return res.status(403).json({
//             success: false,
//             message: "Invalid token",
//           });
//         }

//         // Fetch user from MySQL using Prisma
//         const user = await prisma.user.findUnique({
//           where: { id: decoded.id },
//           select: {
//             id: true,
//             name: true,
//             email: true,
//             // block: true,
//             // district: true,
//             // state: true,
//             isActive: true,
//             //roleId: true,
//             role: {
//               select: { name: true } // Fetch role name
//             }
//           }
//         });

//         if (!user) {
//           return res.status(404).json({
//             success: false,
//             message: "User not found",
//           });
//         }

//         // Check if user is active
//         if (!user.isActive) {
//           return res.status(403).json({
//             success: false,
//             message: "User is blocked or inactive",
//           });
//         }
//         const userRole = user.role.name;

//         // Check if user role is allowed
//         if (!allowedRoles.includes(userRole)) {
//           return res.status(403).json({
//             success: false,
//             message: "Access denied",
//           });
//         }

//         req.user = user;
//         next();
//       });
//     } catch (error) {
//       return res.status(500).json({
//         success: false,
//         message: "Internal Server Error",
//         error: error.message,
//       });
//     }
//   };
// };

const jwt = require("jsonwebtoken");
const prisma = require("../../config/prismaClient.js");

module.exports.tokenVerification = (allowedRoles) => {
  return async (req, res, next) => {
    try {
      const token = req.cookies?.accessToken || req.headers.authorization?.split(" ")[1];
      if (!token) {
        return res.status(401).json({ success: false, message: "No token provided" });
      }

      // 🔥 DO NOT USE CALLBACK. CALLBACKS BLOCK POOL RELEASE.
      let decoded;
      try {
        decoded = jwt.verify(token, process.env.ACCESS_TOKEN_KEY);
      } catch (err) {
        return res.status(401).json({
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
          isActive: true,
          role: { select: { name: true } }
        }
      });

      if (!user) {
        return res.status(404).json({ success: false, message: "User not found" });
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
