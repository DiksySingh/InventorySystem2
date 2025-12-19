const dotenv = require("dotenv");
dotenv.config();
const prisma = require("../../config/prismaClient");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { createSecretToken, createRefreshToken } = require("../../util/secretToken");

const addUser = async (req, res) => {
    try {
        const { name, email, contact, password, roleId, block, district, state } = req.body;

        if (!name || !email || !password || !roleId) {
            return res.status(400).json({
                success: false,
                message: "Name, email, password, and roleId are required",
            });
        }

        const existingRole = await prisma.role.findUnique({
            where: { id: roleId },
        });

        if (!existingRole) {
            return res.status(400).json({
                success: false,
                message: "Invalid roleId. Role does not exist.",
            });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const newUser = await prisma.user.create({
            data: {
                name,
                email,
                //contact,
                password: hashedPassword,
                roleId,
                block: block || null,
                district: district || null,
                state: state || null,
                isActive: true,
                refreshToken: null
            },
        });

        return res.status(201).json({
            success: true,
            message: "User Inserted Successfully",
            data: newUser,
        });

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Internal Server Error",
            error: error.message,
        });
    }
};

const login = async (req, res) => {
    try {
        const { email, password, roleId } = req.body;
        const options = {
            httpOnly: true,
            secure: false,
            sameSite: "Lax",
        }
        if (!email || !password || !roleId) {
            return res.status(400).json({
                success: false,
                message: "Email, password, and roleId are required"
            });
        }

        const user = await prisma.user.findUnique({
            where: { email }
        });
        if (user.isActive === false) {
            return res.status(400).json({
                success: false,
                message: "Your account is deactivated"
            });
        }

        if (!user || user.roleId !== roleId) {
            return res.status(400).json({
                success: false,
                message: "Invalid email, password, or role"
            });
        }

        const verifyPassword = await bcrypt.compare(password, user.password);
        if (!verifyPassword) {
            return res.status(400).json({
                success: false,
                message: "Invalid email, password, or role"
            });
        }

        const accessToken = createSecretToken(user.id, roleId);
        const refreshToken = createRefreshToken(user.id);

        await prisma.user.update({
            where: {
                id: user.id
            },
            data: {
                refreshToken: refreshToken
            }
        });

        return res
            .status(201)
            .cookie('accessToken', accessToken, options)
            .cookie('refreshToken', refreshToken, options)
            .json({
                success: true,
                message: "Login Successful",
                data: {
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    warehouseId: user.warehouseId,
                    accessToken: accessToken,
                    refreshToken: refreshToken,
                }
            });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Internal Server Error",
            error: error.message
        });
    }
};

const logout = async (req, res) => {
    try {
        const empId = req.user?.id;
        if (!empId) {
            return res.status(400).json({
                success: false,
                message: "EmpId Not Found"
            });
        }

        const updatedUser = await prisma.user.update({
            where: { id: empId },
            data: { refreshToken: null },
        });

        if (!updatedUser) {
            return res.status(404).json({
                success: false,
                message: "User Not Found",
            });
        }

        return res
            .status(200)
            .clearCookie("accessToken", { httpOnly: true, secure: false })
            .clearCookie("refreshToken", { httpOnly: true, secure: false })
            .json({
                success: true,
                message: "Logged Out Successfully",
            });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Internal Server Error",
            error: error.message
        });
    }
};

const handleRefreshToken = async (req, res) => {
    const refreshToken = req.body.refreshToken;
    const options = {
        httpOnly: true,
        secure: false,
    }

    if (!refreshToken) {
        return res.status(401).json({ success: false, message: 'Refresh token required' });
    }

    try {
        // Verify token validity first
        const decoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_KEY);

        // Find user by decoded id and refreshToken match
        const user = await prisma.user.findUnique({
            where: { id: decoded.id }
        });

        if (!user || user.refreshToken !== refreshToken) {
            return res.status(403).json({ success: false, message: 'Invalid refresh token' });
        }

        // Generate new tokens
        const newAccessToken = createSecretToken(user);
        const newRefreshToken = createRefreshToken(user);

        // Update refreshToken in DB
        await prisma.user.update({
            where: { id: user.id },
            data: { refreshToken: newRefreshToken }
        });

        // Set cookies
        return res
            .status(201)
            .cookie('accessToken', newAccessToken, options)
            .cookie('refreshToken', newRefreshToken, options)
            .json({
                success: true,
                data: {
                    accessToken: newAccessToken,
                    refreshToken: newRefreshToken
                },
                message: `Welcome Back ${user.name}!`,
            });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Internal Server Error', error: error.message });
    }
};

module.exports = {
    addUser,
    login,
    logout,
    handleRefreshToken
};
