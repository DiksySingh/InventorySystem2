const prisma = require("../../config/prismaClient");
const fs = require("fs/promises");

const getLineWorkerList = async (req, res) => {
  try {
    const empId = req.user?.id;
    if(!empId) {
      return res.status(400).json({
        success: false,
        message: "EmpId Not Found"
      });
    }

    const empData = await prisma.user.findFirst({
      where: {
        id: empId
      },
      include: {
        role: true  
      }
    });
    
    if(empData?.role?.name !== "Store") {
      return res.status(400).json({
        success: false,
        message: "Olny Store Keeper Have Access To The Line-Workers"
      });
    }

    const userData = await prisma.user.findMany({
      where: {
        role: {
          is: {
            name: {
              notIn: ["Admin", "SuperAdmin", "Store"],
            },
          },
        },
      },
      orderBy: {
        name: "asc",
      },
      select: {
        id: true,
        name: true,
        role: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });
    return res.status(200).json({
      success: true,
      message: "Data fetched successfully",
      data: userData || [],
    });
  } catch (error) {
    console.error("ERROR: ", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message,
    });
  }
};

const showIncomingItemRequest = async (req, res) => {
  try {
    const empId = req.query?.empId;
    if (!empId) {
      throw new Error("Employee Id Not Found");
    }

    const empData = await prisma.user.findFirst({
      where: {
        id: empId
      },
      include: {
        role: true  
      }
    });
    
    if(empData?.role?.name !== "Store") {
      return res.status(400).json({
        success: false,
        message: "Olny Store Keeper Have Access For Incoming Item Request"
      });
    }

    const incomingItemRequest = await prisma.itemRequestData.findMany({
      where: {
        requestedBy: empId,
        approved: null,
      },
      select: {
        id: true,
        serviceProcessId: true,
        isProcessRequest: true,
        rawMaterialRequested: true,
        requestedBy: true,
        requestedAt: true,
        approved: true,
        approvedBy: true,
        approvedAt: true,
        materialGiven: true
      },
      orderBy: {
        requestedAt: "desc",
      },
    });

    return res.status(200).json({
      success: true,
      message: "Data fetched successfully",
      data: incomingItemRequest || [],
    });
  } catch (error) {
    console.error("ERROR: ", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message,
    });
  }
};

const approveIncomingItemRequest = async (req, res) => {
  try {
    const { itemRequestId } = req.body;
    if (!itemRequestId) {
      return res.status(400).json({
        success: false,
        message: "ItemRequestId Not Found",
      });
    }

    const itemRequestData = await prisma.itemRequestData.findFirst({
      where: {
        id: itemRequestId,
      },
    });

    if (itemRequestData.approved) {
      throw new Error("Request is already approved");
    }

    if (itemRequestData.materialGiven) {
      throw new Error("Material already sanctioned");
    }
    const date = new Date();
    const updatedRequest = await prisma.itemRequestData.update({
      where: {
        id: itemRequestId,
      },
      data: {
        approved: true,
        approvedBy: req?.user?.id,
        approvedAt: date,
        updatedBy: req?.user?.id,
        updatedAt: date,
      },
    });

    return res.status(200).json({
      success: true,
      message: "Item Request Approved Successfully",
      data: updatedRequest,
    });
  } catch (error) {
    console.error("ERROR: ", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message,
    });
  }
};

const sanctionItemForRequest = async (req, res) => {
  try {
    const { itemRequestId } = req?.body;
    if (!itemRequestId) {
      return res.status(400).json({
        success: false,
        message: "ItemRequestId Not Found",
      });
    }

    const itemRequestData = await prisma.itemRequestData.findFirst({
      where: {
        id: itemRequestId,
      },
    });

    if (!itemRequestData) {
      throw new Error("Item request not found");
    }

    if (itemRequestData.materialGiven) {
      throw new Error("Material for these request already sanctioned");
    }
    const rawMaterials = itemRequestData.rawMaterialRequested;

    if (!Array.isArray(rawMaterials) || rawMaterials.length === 0) {
      throw new Error("No raw material data found in the request");
    }

    const date = new Date();

    const result = await prisma.$transaction(async (tx) => {
      for (let rawMaterial of rawMaterials) {
        const rawMaterialData = await tx.rawMaterial.findFirst({
          where: { id: rawMaterial.rawMaterialId },
        });

        if (!rawMaterialData) {
          throw new Error(
            `Raw material not found for ID: ${rawMaterial.rawMaterialId}`
          );
        }

        if (Number(rawMaterialData.stock) < Number(rawMaterial.quantity)) {
          throw new Error(
            `Can't sanction! Requested quantity for ${rawMaterialData.name} exceeds available stock`
          );
        }

        // Decrease from global stock
        await tx.rawMaterial.update({
          where: { id: rawMaterialData.id },
          data: {
            stock: { decrement: Number(rawMaterial.quantity) },
          },
        });

        // Check if the user already has this item
        const existingUserItemStockData = await tx.userItemStock.findFirst({
          where: {
            empId: itemRequestData.requestedBy,
            rawMaterialId: rawMaterial.rawMaterialId,
          },
        });

        if (existingUserItemStockData) {
          await tx.userItemStock.update({
            where: { id: existingUserItemStockData.id }, // MUST use unique ID here
            data: {
              quantity: { increment: Number(rawMaterial.quantity) },
            },
          });
        } else {
          await tx.userItemStock.create({
            data: {
              empId: itemRequestData.requestedBy,
              rawMaterialId: rawMaterial.rawMaterialId,
              quantity: Number(rawMaterial.quantity),
              unit: rawMaterial.unit,
            },
          });
        }
      }

      // Update item request status
      const updatedRequest = await tx.itemRequestData.update({
        where: { id: itemRequestId },
        data: {
          materialGiven: true,
          updatedAt: date,
          updatedBy: req?.user?.id,
        },
      });

      return updatedRequest;
    });
    return res.status(200).json({
      success: true,
      message: "Material Sanctioned & Inventory Stock Updated Successfully",
      data: result,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message,
    });
  }
};

const getUserItemStock = async (req, res) => {
  try {
    const empId = req?.query?.empId;
    if (!empId) {
      throw new Error("Employee ID Not Found");
    }

    const userItemStockDetails = await prisma.userItemStock.findMany({
      where: {
        empId,
        quantity: {
          gt: 0,
        },
      },
      select: {
        id: true,
        empId: true,
        rawMaterial: {
          select: {
            id: true,
            name: true,
          },
        },
        quantity: true,
        unit: true,
      },
    });

    return res.status(200).json({
      success: true,
      message: "Data fetched successfully",
      data: userItemStockDetails || [],
    });
  } catch (error) {
    console.log("ERROR: ", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message,
    });
  }
};

const showProcessData = async (req, res) => {
  try {
    const { filterType, startDate, endDate, status } = req.body;
    let start, end;

    const now = new Date();
    const today = new Date(now.setHours(0, 0, 0, 0));

    switch (filterType) {
      case "Today":
        start = today;
        end = new Date(today);
        end.setHours(23, 59, 59, 9999);
        break;

      case "Week":
        start = new Date(today);
        start.setDate(today.getDate() - 6); // past 7 days
        end = new Date();
        break;

      case "Month":
        start = new Date(now.getFullYear(), now.getMonth(), 1);
        end = new Date(
          now.getFullYear(),
          now.getMonth() + 1,
          0,
          23,
          59,
          59,
          999
        );
        break;

      case "Year":
        start = new Date(now.getFullYear(), 0, 1);
        end = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
        break;

      case "Custom":
        if (!startDate || !endDate) {
          return res.status(400).json({
            success: false,
            message: "Start date and end date required for custom range",
          });
        }
        start = new Date(startDate);
        end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        break;

      default:
        return res.status(400).json({
          success: false,
          message: "Invalid filter type",
        });
    }

    const filterConditions = {
      createdAt: {
        gte: start,
        lte: end,
      },
    };

    if (status && ["IN_PROGRESS", "COMPLETED", "REDIRECTED"].includes(status)) {
      filterConditions.status = status;
    }

    const processData = await prisma.service_Process_Record.findMany({
      where: filterConditions,
      orderBy: {
        createdAt: "asc",
      },
      select: {
        id: true,
        item: true,
        subItem: true,
        itemType: {
          select: {
            id: true,
            name: true,
          },
        },
        serialNumber: true,
        stage: {
          select: {
            id: true,
            name: true,
          },
        },
        status: true,
        createdAt: true,
      },
    });

    return res.status(200).json({
      success: true,
      message: "Data fetched successfully",
      data: processData || [],
    });
  } catch (error) {
    console.log("ERROR: ", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message,
    });
  }
};

const updateStock = async (req, res) => {
  const uploadFiles = [];
  try {
    const empId = req?.user?.id;
    const rawMaterialList = req?.body?.rawMaterialList;

    if (!rawMaterialList || rawMaterialList.length === 0) {
      throw new Error("Data not found");
    }
    if (!req.files || !req.files.billPhotos) {
      throw new Error("File not uploaded");
    }

    const billPhotoUrl = req.files.billPhotos.map((file) => {
      uploadFiles.push(file.path); // store path for cleanup if needed
      return `/uploads/rawMaterial/billPhoto/${file.filename}`;
    });

    const result = await prisma.$transaction(async (tx) => {
      const addBillPhoto = await tx.stockMovementBatch.create({
        data: {
          billPhotos: billPhotoUrl, // JSON array
        },
      });

      for (const rawMaterial of rawMaterialList) {
        const existingRawMaterial = await tx.rawMaterial.findFirst({
          where: { id: rawMaterial.rawMaterialId },
        });

        if (!existingRawMaterial) {
          throw new Error("Raw Material Not Found");
        }

        await tx.stockMovement.create({
          data: {
            batchId: addBillPhoto.id,
            rawMaterialId: rawMaterial.rawMaterialId,
            userId: empId,
            warehouseId: null,
            quantity: rawMaterial.quantity,
            unit: existingRawMaterial.unit,
            type: "IN",
          },
        });

        await tx.rawMaterial.update({
          where: { id: rawMaterial.rawMaterialId },
          data: {
            stock: { increment: rawMaterial.quantity },
          },
        });
      }

      return addBillPhoto;
    });

    return res.status(200).json({
      success: true,
      message: "Stock updated successfully",
      data: result,
    });
  } catch (error) {
    console.log("ERROR: ", error);
    // Rollback is automatic with Prisma transactions, but cleanup files manually
    if (uploadedFiles.length > 0) {
      await Promise.all(
        uploadedFiles.map(async (filePath) => {
          try {
            await fs.unlink(filePath);
            console.log(`🗑 Deleted uploaded file: ${filePath}`);
          } catch (unlinkErr) {
            console.error(`Failed to delete file ${filePath}:`, unlinkErr);
          }
        })
      );
    }

    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message,
    });
  }
};

module.exports = {
  getLineWorkerList,
  showIncomingItemRequest,
  approveIncomingItemRequest,
  sanctionItemForRequest,
  getUserItemStock,
  showProcessData,
  updateStock,
};
