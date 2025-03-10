const prisma = require("../../config/prismaClient");

const addRole = async(req, res) => {
    try {
        const {name} = req.body;
        if(!name) {
            return res.status(400).json({
                success: false,
                message: "Role Name Is Required"
            });
        }

        const existingRole = await prisma.role.findUnique({
            where: { name }
        });
        if(existingRole) {
            return res.status(400).json({
                success: false,
                message: "Role Already Exists"
            });
        }

        const newRole = await prisma.role.create({ data: { name: name.trim() } });
        return res.status(201).json({
            success: true,
            message: "Role created successfully",
            data: newRole,
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Internal Server Error",
            error: error.message
        });
    }
};

const showRole = async (req, res) => {
    try {
        const roles = await prisma.role.findMany({
            select: {
                id: true,
                name: true,
            },
        });

        return res.status(200).json({
            success: true,
            message: "Roles fetched successfully",
            data: roles,
        });

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Internal Server Error",
            error: error.message,
        });
    }
};

const deleteRole = async (req, res) => {
    try {
        const { roleId } = req.query;

        if (!roleId) {
            return res.status(400).json({
                success: false,
                message: "Role ID is required",
            });
        }

        // Check if the role exists before deleting
        const existingRole = await prisma.role.findUnique({
            where: { id: roleId },
        });

        if (!existingRole) {
            return res.status(404).json({
                success: false,
                message: "Role not found",
            });
        }

        // Delete the role
        await prisma.role.delete({
            where: { id: roleId },
        });

        return res.status(200).json({
            success: true,
            message: "Role deleted successfully",
        });

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Internal Server Error",
            error: error.message,
        });
    }
};

module.exports = {
    addRole,
    showRole, 
    deleteRole
};