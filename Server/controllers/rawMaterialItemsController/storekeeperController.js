const prisma = require("../../config/prismaClient");

const getLineWorkerList = async (req, res) => {
  try {
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
        name: "asc"
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

    const incomingItemRequest = await prisma.itemRequestData.findMany({
      where: {
        requestedBy: empId,
        approved: null,
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

        if (rawMaterialData.stock < rawMaterial.quantity) {
          throw new Error(
            `Can't sanction! Requested quantity for ${rawMaterialData.name} exceeds available stock`
          );
        }

        // Decrease from global stock
        await tx.rawMaterial.update({
          where: { id: rawMaterialData.id },
          data: {
            stock: { decrement: rawMaterial.quantity },
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
              quantity: { increment: rawMaterial.quantity },
            },
          });
        } else {
          await tx.userItemStock.create({
            data: {
              empId: itemRequestData.requestedBy,
              rawMaterialId: rawMaterial.rawMaterialId,
              quantity: rawMaterial.quantity,
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
      include: {
        rawMaterial: true,
        select: {
          id: true,
          name: true,
        },
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

module.exports = {
  getLineWorkerList,
  showIncomingItemRequest,
  approveIncomingItemRequest,
  sanctionItemForRequest,
  getUserItemStock,
};
