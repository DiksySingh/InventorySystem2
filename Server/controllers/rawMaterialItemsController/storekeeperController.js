const {
  ProcessStatus,
  FailureReason,
  ActivityStatus,
} = require("@prisma/client");
const prisma = require("../../config/prismaClient");
const fs = require("fs/promises");

const getLineWorkerList = async (req, res) => {
  try {
    const empId = req.user?.id;
    if (!empId) {
      return res.status(400).json({
        success: false,
        message: "EmpId Not Found",
      });
    }

    const empData = await prisma.user.findFirst({
      where: {
        id: empId,
      },
      include: {
        role: true,
      },
    });

    if (empData?.role?.name !== "Store") {
      return res.status(400).json({
        success: false,
        message: "Only Store Keeper Have Access To The Line-Workers",
      });
    }

    const userData = await prisma.user.findMany({
      where: {
        role: {
          is: {
            name: {
              notIn: ["Admin", "SuperAdmin", "Store", "Purchase"],
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

const formatStock = (value) => {
  if (value % 1 === 0) {
    return value; // integer → return as it is
  }
  return Number(value.toFixed(2)); // decimals → 2 digits
};

const getRawMaterialList = async (req, res) => {
  try {
    const allRawMaterial = await prisma.rawMaterial.findMany({
      orderBy: {
        stock: "asc",
      },
      select: {
        id: true,
        name: true,
        stock: true,
        unit: true,
      },
    });

    const filteredData = allRawMaterial.map((data) => {
      const stock = data.stock ?? 0;

      return {
        id: data.id,
        name: data.name,
        stock: formatStock(stock),
        unit: data.unit,
        outOfStock: stock === 0,
      };
    });

    return res.status(200).json({
      success: true,
      message: "Data fetched successfully",
      data: filteredData || [],
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

const showIncomingItemRequest = async (req, res) => {
  try {
    const empId = req.query?.empId;
    if (!empId) {
      throw new Error("Employee Id Not Found");
    }

    const empData = await prisma.user.findFirst({
      where: {
        id: req?.user?.id,
      },
      include: {
        role: true,
      },
    });

    if (empData?.role?.name !== "Store") {
      return res.status(400).json({
        success: false,
        message: "Only Store Keeper Have Access For Incoming Item Request",
      });
    }

    const incomingItemRequest = await prisma.itemRequestData.findMany({
      where: {
        requestedBy: empId,
        //approved: null,
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
        materialGiven: true,
        declined: true,
        declinedBy: true,
        declinedAt: true,
        declinedRemarks: true,
      },
      orderBy: {
        requestedAt: "desc",
      },
    });
    const withNames = await Promise.all(
      incomingItemRequest.map(async (req) => {
        const materials = req.rawMaterialRequested || [];

        // get all rawMaterialIds
        const ids = materials.map((m) => m.rawMaterialId);

        const rawMaterials = await prisma.rawMaterial.findMany({
          where: { id: { in: ids } },
          select: { id: true, name: true, unit: true },
        });

        // attach names
        const enriched = materials.map((m) => {
          const match = rawMaterials.find((r) => r.id === m.rawMaterialId);
          return {
            ...m,
            name: match?.name || "Unknown",
            unit: match?.unit || null,
          };
        });

        return { ...req, rawMaterialRequested: enriched };
      })
    );

    res.json({
      success: true,
      message: "Data fetched successfully",
      data: withNames,
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

// const approveIncomingItemRequest = async (req, res) => {
//   try {
//     const { itemRequestId } = req.body;
//     if (!itemRequestId) {
//       return res.status(400).json({
//         success: false,
//         message: "ItemRequestId Not Found",
//       });
//     }

//     const itemRequestData = await prisma.itemRequestData.findFirst({
//       where: {
//         id: itemRequestId,
//       },
//     });

//     if (itemRequestData.approved) {
//       throw new Error("Request is already approved");
//     }

//     if (itemRequestData.materialGiven) {
//       throw new Error("Material already sanctioned");
//     }
//     const date = new Date();
//     const updatedRequest = await prisma.itemRequestData.update({
//       where: {
//         id: itemRequestId,
//       },
//       data: {
//         approved: true,
//         approvedBy: req?.user?.id,
//         approvedAt: date,
//         updatedBy: req?.user?.id,
//         updatedAt: date,
//       },
//     });

//     return res.status(200).json({
//       success: true,
//       message: "Item Request Approved Successfully",
//       data: updatedRequest,
//     });
//   } catch (error) {
//     console.error("ERROR: ", error);
//     return res.status(500).json({
//       success: false,
//       message: "Internal Server Error",
//       error: error.message,
//     });
//   }
// };

const approveOrDeclineItemRequest = async (req, res) => {
  try {
    const { itemRequestId, action, remarks } = req.body;
    const userId = req?.user?.id;

    if (!itemRequestId || !action) {
      return res.status(400).json({
        success: false,
        message: "itemRequestId and action are required",
      });
    }

    if (action === "DECLINE") {
      if (!remarks) {
        return res.status(400).json({
          success: false,
          message: `Action - ${action}, remarks is required.`,
        });
      }
    }

    if (!["APPROVE", "DECLINE"].includes(action)) {
      return res.status(400).json({
        success: false,
        message: "Invalid action. Allowed: APPROVE, DECLINE",
      });
    }

    const itemRequest = await prisma.itemRequestData.findFirst({
      where: { id: itemRequestId },
    });

    if (!itemRequest) {
      return res
        .status(404)
        .json({ success: false, message: "Item request not found" });
    }

    if (itemRequest.approved || itemRequest.declined) {
      return res.status(400).json({
        success: false,
        message: "Item request already processed",
      });
    }

    const now = new Date();

    let updateData = {
      updatedBy: userId,
      updatedAt: now,
    };

    if (action === "APPROVE") {
      updateData = {
        ...updateData,
        approved: true,
        approvedBy: userId,
        approvedAt: now,
      };
    }

    if (action === "DECLINE") {
      updateData = {
        ...updateData,
        declined: true,
        declinedBy: userId,
        declinedAt: now,
        declinedRemarks: remarks || null,
      };
    }

    const updated = await prisma.itemRequestData.update({
      where: { id: itemRequestId },
      data: updateData,
    });

    return res.status(200).json({
      success: true,
      message:
        action === "APPROVE"
          ? "Item Request Approved Successfully"
          : "Item Request Declined Successfully",
      data: updated,
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

    if (itemRequestData.approved === null) {
      throw new Error("Item request is not approved.");
    }

    if (itemRequestData.declined === true) {
      throw new Error("Item request is declined.");
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
        //id: true,
        //empId: true,
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

// const showProcessData = async (req, res) => {
//   try {
//     const { filterType, startDate, endDate, status, stageId, itemTypeId, search, page = 1, limit = 15 } = req.query;

//     let filterConditions = { AND: [] };
//     let start, end;

//     // ⭐ Convert IST → UTC
//     const ISTtoUTC = (date) => new Date(date.getTime() - (5.5 * 60 * 60 * 1000));

//     const now = new Date();
//     const todayIST = new Date(now.getFullYear(), now.getMonth(), now.getDate());

//     const validFilters = ["Today", "Week", "Month", "Year", "Custom"];

//     // ⭐ DATE FILTER
//     if (validFilters.includes(filterType)) {
//       switch (filterType) {
//         case "Today": {
//           const startIST = todayIST;
//           const endIST = new Date(todayIST);
//           endIST.setHours(23, 59, 59, 999);
//           start = ISTtoUTC(startIST);
//           end = ISTtoUTC(endIST);
//           break;
//         }

//         case "Week": {
//           const startIST = new Date(todayIST);
//           startIST.setDate(todayIST.getDate() - 6);
//           start = ISTtoUTC(startIST);
//           end = ISTtoUTC(now);
//           break;
//         }

//         case "Month": {
//           const startIST = new Date(now.getFullYear(), now.getMonth(), 1);
//           const endIST = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
//           start = ISTtoUTC(startIST);
//           end = ISTtoUTC(endIST);
//           break;
//         }

//         case "Year": {
//           const startIST = new Date(now.getFullYear(), 0, 1);
//           const endIST = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
//           start = ISTtoUTC(startIST);
//           end = ISTtoUTC(endIST);
//           break;
//         }

//         case "Custom": {
//           if (!startDate || !endDate) {
//             return res.status(400).json({
//               success: false,
//               message: "Start date and end date are required for custom filter.",
//             });
//           }
//           const startIST = new Date(startDate);
//           const endIST = new Date(endDate);
//           endIST.setHours(23, 59, 59, 999);
//           start = ISTtoUTC(startIST);
//           end = ISTtoUTC(endIST);
//           break;
//         }
//       }

//       filterConditions.AND.push({
//         createdAt: { gte: start, lte: end }
//       });
//     }

//     // ⭐ STATUS
//     if (status && ["IN_PROGRESS", "COMPLETED", "REDIRECTED"].includes(status)) {
//       filterConditions.AND.push({ status });
//     }

//     // ⭐ STAGE
//     if (stageId) {
//       filterConditions.AND.push({ stageId });
//     }

//     // ⭐ ITEM TYPE
//     if (itemTypeId) {
//       filterConditions.AND.push({ itemTypeId });
//     }

//     // ⭐ SEARCH (your exact uppercase match logic)
//     if (search && search.trim() !== "") {
//       const searchUpper = search.trim().toUpperCase();

//       filterConditions.AND.push({
//         OR: [
//           { item: searchUpper },
//           { subItem: searchUpper },
//           { serialNumber: searchUpper }
//         ]
//       });
//     }

//     // ⭐ PAGINATION
//     const skip = (page - 1) * limit;

//     // ⭐ FETCH DATA + COUNT parallel
//     const [processData, total] = await Promise.all([
//       prisma.service_Process_Record.findMany({
//         where: filterConditions,
//         orderBy: { createdAt: "asc" },
//         skip,
//         take: Number(limit),
//         select: {
//           id: true,
//           productName: true,
//           itemName: true,
//           subItemName: true,
//           itemType: { select: { id: true, name: true } },
//           serialNumber: true,
//           quantity: true,
//           stage: { select: { id: true, name: true } },
//           status: true,
//           createdAt: true,
//           stageActivity: {
//             orderBy: { createdAt: "asc" },
//             select: {
//               id: true,
//               status: true,
//               acceptedAt: true,
//               startedAt: true,
//               completedAt: true,
//               isCurrent: true,
//               failureReason: true,
//               remarks: true,
//               stage: { select: { id: true, name: true } },
//               user: { select: { id: true, name: true } },
//             },
//           },
//         },
//       }),

//       prisma.service_Process_Record.count({ where: filterConditions })
//     ]);

//     // ⭐ FORMAT OUTPUT
//     const modifiedData = processData.map((process) => ({
//       serviceProcessId: process.id,
//       productName: process.productName,
//       itemName: process.itemName,
//       subItemName: process.subItemName,
//       itemType: process.itemType.name,
//       serialNumber: process.serialNumber,
//       quantity: process.quantity,
//       currentStage: process.stage?.name,
//       processStatus: process.status,
//       createdAt: process.createdAt,
//       stageActivities: process.stageActivity.map((activity) => ({
//         activityId: activity.id,
//         stageId: activity.stage.id,
//         stageName: activity.stage.name,
//         activityStatus: activity.status,
//         isCurrent: activity.isCurrent,
//         failureReason: activity.failureReason,
//         remarks: activity.remarks,
//         acceptedAt: activity.acceptedAt,
//         startedAt: activity.startedAt,
//         completedAt: activity.completedAt,
//       }))
//     }));

//     return res.status(200).json({
//       success: true,
//       message: "Data fetched successfully",
//       page,
//       limit,
//       total,
//       totalPages: Math.ceil(total / limit),
//       data: modifiedData,
//     });

//   } catch (error) {
//     console.log("ERROR:", error);
//     return res.status(500).json({
//       success: false,
//       message: "Internal Server Error",
//       error: error.message,
//     });
//   }
// };

const showProcessData = async (req, res) => {
  try {
    const {
      filterType,
      startDate,
      endDate,
      status,
      stageId,
      itemTypeId,
      search,
      page = 1,
      limit = 15,
    } = req.query;

    let filterConditions = { AND: [] };

    // ---------- UTIL ----------
    const ISTtoUTC = (date) => new Date(date.getTime() - 5.5 * 60 * 60 * 1000);

    const now = new Date();
    const todayIST = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // ---------- DATE FILTER ----------
    const setDateFilter = () => {
      let startIST, endIST;

      switch (filterType) {
        case "Today":
          startIST = todayIST;
          endIST = new Date(todayIST);
          endIST.setHours(23, 59, 59, 999);
          break;

        case "Week":
          startIST = new Date(todayIST);
          startIST.setDate(todayIST.getDate() - 6);
          endIST = now;
          break;

        case "Month":
          startIST = new Date(now.getFullYear(), now.getMonth(), 1);
          endIST = new Date(
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
          startIST = new Date(now.getFullYear(), 0, 1);
          endIST = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
          break;

        case "Custom":
          if (!startDate || !endDate) {
            throw new Error(
              "Start date and end date required for Custom filter"
            );
          }
          startIST = new Date(startDate);
          endIST = new Date(endDate);
          endIST.setHours(23, 59, 59, 999);
          break;

        default:
          return;
      }

      filterConditions.AND.push({
        createdAt: {
          gte: ISTtoUTC(startIST),
          lte: ISTtoUTC(endIST),
        },
      });
    };

    setDateFilter();

    // ---------- BASIC FILTERS ----------
    if (status) filterConditions.AND.push({ status });
    if (stageId) filterConditions.AND.push({ stageId });
    if (itemTypeId) filterConditions.AND.push({ itemTypeId });

    // ---------- SEARCH ----------
    if (search?.trim()) {
      const s = search.trim().toUpperCase();
      filterConditions.AND.push({
        OR: [{ item: s }, { subItem: s }, { serialNumber: s }],
      });
    }

    // ---------- PAGINATION ----------
    const skip = (Number(page) - 1) * Number(limit);

    // ---------- QUERY ----------
    const [processData, total] = await Promise.all([
      prisma.service_Process_Record.findMany({
        where: filterConditions,
        orderBy: { createdAt: "asc" },
        skip,
        take: Number(limit),
        select: {
          id: true,
          productName: true,
          itemName: true,
          subItemName: true,
          itemType: { select: { id: true, name: true } },
          serialNumber: true,
          quantity: true,
          stage: { select: { id: true, name: true } },
          status: true,
          createdAt: true,
          stageActivity: {
            orderBy: { createdAt: "asc" },
            select: {
              id: true,
              status: true,
              acceptedAt: true,
              startedAt: true,
              completedAt: true,
              isCurrent: true,
              failureReason: true,
              remarks: true,
              stage: { select: { id: true, name: true } },
              user: { select: { id: true, name: true } },
            },
          },
        },
      }),

      prisma.service_Process_Record.count({ where: filterConditions }),
    ]);

    // ---------- FORMAT ----------
    const modifiedData = processData.map((p) => ({
      serviceProcessId: p.id,
      productName: p.productName,
      itemName: p.itemName,
      subItemName: p.subItemName,
      itemType: p.itemType?.name,
      serialNumber: p.serialNumber,
      quantity: p.quantity,
      currentStage: p.stage?.name,
      processStatus: p.status,
      createdAt: p.createdAt,
      stageActivities: p.stageActivity.map((a) => ({
        activityId: a.id,
        stageId: a.stage.id,
        stageName: a.stage.name,
        activityStatus: a.status,
        isCurrent: a.isCurrent,
        failureReason: a.failureReason,
        remarks: a.remarks,
        acceptedAt: a.acceptedAt,
        startedAt: a.startedAt,
        completedAt: a.completedAt,
      })),
    }));

    return res.status(200).json({
      success: true,
      message: "Data fetched successfully",
      page: Number(page),
      limit: Number(limit),
      total,
      totalPages: Math.ceil(total / limit),
      data: modifiedData,
    });
  } catch (error) {
    console.log("ERROR:", error);
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
    if (!req.files || !req.files.billPhoto) {
      throw new Error("File not uploaded");
    }

    const billPhotoUrl = req.files.billPhoto.map((file) => {
      uploadFiles.push(file.path); // store path for cleanup if needed
      return `/uploads/rawMaterial/billPhoto/${file.filename}`;
    });

    const result = await prisma.$transaction(async (tx) => {
      const addBillPhoto = await tx.stockMovementBatch.create({
        data: {
          billPhotos: billPhotoUrl, // JSON array
          createdBy: empId,
        },
      });
      const parsedRawMaterialList = JSON.parse(rawMaterialList);
      for (const rawMaterial of parsedRawMaterialList) {
        rawMaterial.quantity = Number(rawMaterial.quantity); // convert to number

        if (!rawMaterial.rawMaterialId || isNaN(rawMaterial.quantity)) {
          throw new Error(
            "Invalid rawMaterial data: rawMaterialId and quantity are required"
          );
        }

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
            stock:
              existingRawMaterial.stock === null
                ? rawMaterial.quantity
                : { increment: rawMaterial.quantity },
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
    if (uploadFiles.length > 0) {
      await Promise.all(
        uploadFiles.map(async (filePath) => {
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

const getStockMovementHistory = async (req, res) => {
  try {
    const baseUrl = `${req.protocol}://${req.get("host")}`;

    const batches = await prisma.stockMovementBatch.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        stockMovement: {
          select: {
            rawMaterial: {
              select: {
                id: true,
                name: true,
              },
            },
            quantity: true,
            unit: true,
            type: true,
          },
        },
      },
    });

    // Map billPhotos with full URLs
    const formattedBatches = batches.map((batch) => ({
      ...batch,
      billPhotos: batch.billPhotos
        ? batch.billPhotos.map((photo) => `${baseUrl}${photo}`)
        : [],
    }));

    return res.status(200).json({
      success: true,
      message: "Stock movement history fetched successfully",
      data: formattedBatches,
    });
  } catch (error) {
    console.error("Error fetching stock movement history:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message,
    });
  }
};

module.exports = {
  getLineWorkerList,
  getRawMaterialList,
  showIncomingItemRequest,
  approveOrDeclineItemRequest,
  sanctionItemForRequest,
  getUserItemStock,
  showProcessData,
  updateStock,
  getStockMovementHistory,
};
