require("dotenv").config();
const jwt = require("jsonwebtoken");

module.exports.createSecretToken = (id, role) => {
    return jwt.sign({id, role}, process.env.ACCESS_TOKEN_KEY, {
        expiresIn: 1 * 24 * 60 * 60
    });
};

module.exports.createRefreshToken = (id) => {
    // Create the refresh token (longer expiry, e.g., 7 days or more)
    return jwt.sign({ id }, process.env.REFRESH_TOKEN_KEY, {
        expiresIn: 7 * 24 * 60 * 60 
    });
};