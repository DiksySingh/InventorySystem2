const Admin = require("../models/adminSchema");
const ServicePerson = require("../models/servicePersonSchema");
const WarehousePerson = require("../models/warehousePersonSchema");
const {
  createSecretToken,
  createRefreshToken,
} = require("../util/secretToken");
require("dotenv").config();
const jwt = require("jsonwebtoken");

module.exports.userVerification = (allowedRoles) => {
  return async (req, res, next) => {
    const token = req.cookies.accessToken || req.headers.authorization?.split(" ")[1]; 
    if (!token) {
      return res.status(400).json({
        status: false,
        message: "No Token Provided",
      });
    }

    jwt.verify(token, process.env.ACCESS_TOKEN_KEY, async (err, data) => {
      if (err) {
        if (err.name === "TokenExpiredError") {
          return res.status(401).json({
            status: false,
            message: "Token Expired",
          });
        }
        return res.status(400).json({
          status: false,
          message: "Invalid Token",
        });
      } else {
        try {
          let user;

          if (data.role === "serviceperson") {  
            user = await ServicePerson.findById(data.id);
          } else if(data.role === "warehouseAdmin") {
            user = await WarehousePerson.findById(data.id);
          }else {
            user = await Admin.findById(data.id);
          }

          if (!user) {
            return res.status(404).json({
              status: false,
              message: `${user.role} not found`
            });
          }

          if (Array.isArray(allowedRoles) && allowedRoles.includes(data.role)) {
            req.user = user;
            next();
          } else {
            return res.status(403).json({
              status: false,
              message: "Access Denied",
            });
          }
        } catch (error) {
          return res.status(500).json({
            status: false,
            message: "Internal Server Error",
            error: error.message
          });
        }
      }
    });
  };
};

module.exports.refreshToken = async (req, res) => {
  try {
    const oldRefreshToken =
      req.cookies.refreshToken || req.headers["x-refresh-token"];

    if (!oldRefreshToken) {
      return res.status(403).json({
        success: false,
        message: "Refresh token is required",
      });
    }

    jwt.verify(
      oldRefreshToken,
      process.env.REFRESH_TOKEN_KEY,
      async (err, decoded) => {
        if (err) {
          return res.status(403).json({
            success: false,
            message: "Invalid refresh token",
          });
        }

        const { id } = decoded;

        let user;
        user = await Admin.findById(id);
        if (!user) {
          user = await ServicePerson.findById(id);
          if (!user) {
            user = await WarehousePerson.findById(id);
            if(!user){
              return res.status(400).json({
              success: false,
              message: "Admin, WarehousePerson or ServicePerson Not Found",
            });
            }
          }
        }

        if (!user || user.refreshToken !== oldRefreshToken) {
          return res.status(403).json({
            success: false,
            message: "Invalid refresh token or user not found",
          });
        }

        const newAccessToken = createSecretToken(user._id, role);
        const newRefreshToken = createRefreshToken(user._id);

        user.refreshToken = newRefreshToken;
        await user.save();

        res
          .status(200)
          .cookie("accessToken", newAccessToken, {
            withCredentials: true,
            httpOnly: true,
            secure: false,
          })
          .cookie("refreshToken", newRefreshToken, {
            withCredentials: true,
            httpOnly: true,
            secure: false,
          })
          .json({
            success: true,
            id: user._id,
            email: user.email,
            role: user.role,
            accessToken: newAccessToken,
            refreshToken: newRefreshToken,
          });
      }
    );
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message,
    });
  }
};
