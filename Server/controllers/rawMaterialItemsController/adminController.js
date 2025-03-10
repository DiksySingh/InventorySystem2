const prisma = require("../../config/prismaClient");

const showEmployees = async (req, res) => {
    try {
        const allEmployees = await prisma.user.findMany({
            select: {
                id: true,
                name: true,
                email: true,
                contact: true
            }
        });

        return res.status(200).json({
            success: true,
            message: "Data Fetched Successfully",
            data: allEmployees || []
        })
        
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Internal Server Error",
            error: error.message
        })
    }
};

const deactivateEmployee = async (req, res) => {
    try {
        const {empId} = req.query;
        if(!empId) {
            return res.status(400).json({
                success: false,
                message: "EmpId is required"
            });
        }

        const existingEmployee = await prisma.user.findUnique({
            where: {
                id: empId
            }
        });

        if(!existingEmployee) {
            return res.status(404).json({
                success: false,
                message: "Employee with empId doesn't exists"
            });
        }

        if (!existingEmployee.isActive) {
            return res.status(400).json({
                success: false,
                message: "Employee is already deactivated"
            });
        }

        const deactivateEmp = await prisma.user.update({
            where: {
                id: empId
            },
            data: {
                isActive: false
            }
        });

        return res.status(200).json({
            success: true,
            message: "Employee account deactivated successfully",
            data: deactivateEmp
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Internal Server Error",
            error: error.message
        });
    }
};

const activateEmployee = async (req, res) => {
    try {
        const {empId} = req.query;
        if(!empId) {
            return res.status(400).json({
                success: false,
                message: "EmpId is required"
            });
        }

        const existingEmployee = await prisma.user.findUnique({
            where: {
                id: empId
            }
        });

        if(!existingEmployee) {
            return res.status(404).json({
                success: false,
                message: "Employee with empId doesn't exists"
            });
        }

        if (existingEmployee.isActive) {
            return res.status(400).json({
                success: false,
                message: "Employee is already active"
            });
        }

        const activateEmp = await prisma.user.update({
            where: {
                id: empId
            },
            data: {
                isActive: true
            }
        });

        return res.status(200).json({
            success: true,
            message: "Employee account activated successfully",
            data: activateEmp
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Internal Server Error",
            error: error.message
        });
    }
};

const addItem = async (req, res) => {
    try {
        let { name } = req.body;

        // Validate input
        if (!name || typeof name !== "string" || name.trim() === "") {
            return res.status(400).json({
                success: false,
                message: "Invalid item name"
            });
        }

        name = name.trim(); // Trim only once

        // Check if item already exists
        const existingItem = await prisma.item.findUnique({
            where: { name }
        });

        if (existingItem) {
            return res.status(400).json({
                success: false,
                message: "Item Already Exists"
            });
        }

        // Create new item
        const newItem = await prisma.item.create({
            data: { name }
        });

        return res.status(201).json({
            success: true,
            message: "Item Added Successfully",
            data: newItem
        });

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Internal Server Error",
            error: error.message
        });
    }
};


module.exports = {
    showEmployees,
    deactivateEmployee,
    activateEmployee,
    addItem,
};