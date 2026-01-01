const prisma = require("../../config/prismaClient");
const fs = require("fs/promises");
const path = require("path");
const Warehouse = require("../../models/serviceInventoryModels/warehouseSchema");
const SystemItem = require("../../models/systemInventoryModels/systemItemSchema");
const InstallationInventory = require("../../models/systemInventoryModels/installationInventorySchema");

const getLineWorkerList = async (req, res) => {
   try {
    const empId = req.user?.id;
    const userWarehouseId = req.user?.warehouseId;
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
        warehouseId: userWarehouseId,
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
    const warehouseId = req.user?.warehouseId;

    if (!warehouseId) {
      return res.status(400).json({
        success: false,
        message: "Warehouse not assigned to user",
      });
    }

    const allRawMaterial = await prisma.rawMaterial.findMany({
      select: {
        id: true,
        name: true,
        unit: true,
        warehouseStock: {
          where: {
            warehouseId,
          },
          select: {
            quantity: true,
            isUsed: true,
          },
        },
      },
    });

    const formattedData = allRawMaterial.map((data) => {
      const warehouseData = data.warehouseStock[0] || {};

      const stock = warehouseData.quantity ?? 0;
      const isUsed = warehouseData.isUsed ?? false;

      return {
        id: data.id,
        name: data.name,
        stock: formatStock(stock),
        rawStock: stock, // only for sorting
        unit: data.unit,
        isUsed,
        outOfStock: stock === 0,
      };
    });

    const sortedData = formattedData.sort((a, b) => {
      if (a.isUsed === b.isUsed) {
        return a.rawStock - b.rawStock;
      }
      return a.isUsed ? -1 : 1;
    });

    const cleanedData = sortedData.map(({ rawStock, ...rest }) => rest);

    return res.status(200).json({
      success: true,
      message: "Raw material fetched successfully",
      data: cleanedData,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message,
    });
  }
};

const getWarehouseRawMaterialList = async (req, res) => {
  try {
    const warehouseId = req.user?.warehouseId;
    if(!warehouseId) {
      return res.status(400).json({
        success: false,
        message: "Warehouse not assigned to user."
      });
    }

    const warehouse = await Warehouse.findById(warehouseId);
    if(!warehouse) {
      return res.status(400).json({
        success: false,
        message: "Warehouse not found."
      });
    }

    // 1. Fetch from WarehouseStock instead
    const warehouseData = await prisma.warehouseStock.findMany({
      where: {
        warehouseId: warehouseId,
      },
      include: {
        rawMaterial: {
          select: {
            name: true,
            isUsed: true,
          },
        },
      },
    });

    // 2. Format the data to match your previous response structure
    const formattedData = warehouseData.map((item) => {
      // Fallback to 0 if quantity is null/undefined
      const stock = item.quantity ?? 0;

      return {
        id: item.rawMaterialId, // Using the material ID
        name: item.rawMaterial?.name || "Unknown",
        stock: formatStock(stock),
        rawStock: stock, // used for sorting
        unit: item.unit,
        isUsed: item.isUsed ?? item.rawMaterial?.isUsed,
      };
    });

    // 3. Keep your existing sorting logic
    const sortedData = formattedData.sort((a, b) => {
      if (a.isUsed === b.isUsed) {
        return a.rawStock - b.rawStock;
      }
      return a.isUsed ? -1 : 1;
    });

    // 4. Remove helper field for the final response
    const cleanedData = sortedData.map(({ rawStock, ...rest }) => rest);

    return res.status(200).json({
      success: true,
      message: `${warehouse.warehouseName} raw material fetched successfully`,
      data: cleanedData,
    });
  } catch (error) {
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
        warehouseId: true,
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
    const { itemRequestId } = req.body;
    const warehouseId = req.user?.warehouseId;

    if (!itemRequestId) {
      return res.status(400).json({
        success: false,
        message: "ItemRequestId Not Found",
      });
    }

    if (!warehouseId) {
      return res.status(400).json({
        success: false,
        message: "Warehouse not assigned to user",
      });
    }

    const itemRequestData = await prisma.itemRequestData.findFirst({
      where: { id: itemRequestId },
    });

    if (!itemRequestData) throw new Error("Item request not found");
    if (itemRequestData.approved === null)
      throw new Error("Item request is not approved.");
    if (itemRequestData.declined === true)
      throw new Error("Item request is declined.");
    if (itemRequestData.materialGiven)
      throw new Error("Material already sanctioned");

    const rawMaterials = itemRequestData.rawMaterialRequested;
    if (!Array.isArray(rawMaterials) || rawMaterials.length === 0) {
      throw new Error("No raw material data found in the request");
    }

    const date = new Date();

    const result = await prisma.$transaction(async (tx) => {
      for (const rawMaterial of rawMaterials) {
        // 1️⃣ Validate raw material master
        const rawMaterialData = await tx.rawMaterial.findFirst({
          where: { id: rawMaterial.rawMaterialId },
        });

        if (!rawMaterialData) {
          throw new Error(
            `Raw material not found for ID: ${rawMaterial.rawMaterialId}`
          );
        }

        // 2️⃣ Get warehouse stock
        const warehouseStock = await tx.warehouseStock.findFirst({
          where: {
            warehouseId,
            rawMaterialId: rawMaterial.rawMaterialId,
          },
        });

        if (!warehouseStock) {
          throw new Error(
            `Stock not available in warehouse for ${rawMaterialData.name}`
          );
        }

        if (Number(warehouseStock.quantity) < Number(rawMaterial.quantity)) {
          throw new Error(
            `Can't sanction! Requested quantity for ${rawMaterialData.name} exceeds warehouse stock`
          );
        }

        // 3️⃣ Decrease warehouse stock
        await tx.warehouseStock.update({
          where: { id: warehouseStock.id },
          data: {
            quantity: {
              decrement: Number(rawMaterial.quantity),
            },
          },
        });

        // 4️⃣ Credit user stock
        const existingUserItemStock = await tx.userItemStock.findFirst({
          where: {
            empId: itemRequestData.requestedBy,
            rawMaterialId: rawMaterial.rawMaterialId,
          },
        });

        if (existingUserItemStock) {
          await tx.userItemStock.update({
            where: { id: existingUserItemStock.id },
            data: {
              quantity: {
                increment: Number(rawMaterial.quantity),
              },
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

      // 5️⃣ Mark request as sanctioned
      return tx.itemRequestData.update({
        where: { id: itemRequestId },
        data: {
          materialGiven: true,
          updatedAt: date,
          updatedBy: req.user.id,
        },
      });
    });

    return res.status(200).json({
      success: true,
      message: "Material sanctioned from warehouse successfully",
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

    const warehouseId = req.user?.warehouseId;
    if (!warehouseId) {
      return res.status(400).json({
        success: false,
        message: "Warehouse not assigned to user",
      });
    }

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

    filterConditions.AND.push({
      warehouseId,
    });

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
    const warehouseId = req?.user?.warehouseId;
    const rawMaterialList = req?.body?.rawMaterialList;

    if (!empId || !warehouseId) {
      throw new Error("User or Warehouse not found");
    }

    if (!rawMaterialList) {
      throw new Error("Raw material list is required");
    }

    if (!req.files || !req.files.billPhoto) {
      throw new Error("Bill photo file not uploaded");
    }

    // Upload bill photos
    const billPhotoUrl = req.files.billPhoto.map((file) => {
      uploadFiles.push(file.path);
      return `/uploads/rawMaterial/billPhoto/${file.filename}`;
    });

    const parsedRawMaterialList = JSON.parse(rawMaterialList);

    if (
      !Array.isArray(parsedRawMaterialList) ||
      parsedRawMaterialList.length === 0
    ) {
      throw new Error("Raw material list is empty or invalid");
    }

    const result = await prisma.$transaction(async (tx) => {
      // Create stock movement batch
      const addBillPhoto = await tx.stockMovementBatch.create({
        data: {
          billPhotos: billPhotoUrl,
          createdBy: empId,
        },
      });

      for (const rawMaterial of parsedRawMaterialList) {
        const quantity = Number(rawMaterial.quantity);

        if (!rawMaterial.rawMaterialId || isNaN(quantity) || quantity <= 0) {
          throw new Error(
            "Invalid rawMaterial data: rawMaterialId and valid quantity required"
          );
        }

        const existingRawMaterial = await tx.rawMaterial.findUnique({
          where: { id: rawMaterial.rawMaterialId },
        });

        if (!existingRawMaterial) {
          throw new Error(
            `Raw Material not found: ${rawMaterial.rawMaterialId}`
          );
        }

        // 🔹 Stock Movement (no warehouse relation now)
        await tx.stockMovement.create({
          data: {
            batchId: addBillPhoto.id,
            rawMaterialId: rawMaterial.rawMaterialId,
            userId: empId,
            warehouseId, // just a string now
            quantity,
            unit: existingRawMaterial.unit,
            type: "IN",
          },
        });

        // 🔹 Warehouse Stock UPSERT
        await tx.warehouseStock.upsert({
          where: {
            warehouseId_rawMaterialId: {
              warehouseId,
              rawMaterialId: rawMaterial.rawMaterialId,
            },
          },
          update: {
            quantity: { increment: quantity },
            unit: existingRawMaterial.unit,
          },
          create: {
            warehouseId,
            rawMaterialId: rawMaterial.rawMaterialId,
            quantity,
            unit: existingRawMaterial.unit,
            isUsed: true,
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

    // Cleanup uploaded files if transaction fails
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
    const warehouseId = req?.user?.warehouseId;

    if (!warehouseId) {
      return res.status(400).json({
        success: false,
        message: "Warehouse not found for user",
      });
    }

    const batches = await prisma.stockMovementBatch.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        stockMovement: {
          where: {
            warehouseId: warehouseId, // ✅ FILTER HERE
          },
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

    // Optional (recommended):
    // remove batches with no movements for this warehouse
    const filteredBatches = batches.filter(
      (batch) => batch.stockMovement.length > 0
    );

    const formattedBatches = filteredBatches.map((batch) => ({
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

const markRawMaterialUsedOrNotUsed = async (req, res) => {
  try {
    const { id, isUsed } = req.query;
    const empId = req.user?.id;
    const warehouseId = req.user?.warehouseId;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "RawMaterial Id is required.",
      });
    }

    if (!warehouseId) {
      return res.status(400).json({
        success: false,
        message: "Warehouse not assigned to user",
      });
    }

    const isUsedBoolean = isUsed === "true";

    /**
     * STEP 1: Check whether this raw material exists
     * AND is associated with the user's warehouse
     */
    const warehouseStock = await prisma.warehouseStock.findFirst({
      where: {
        rawMaterialId: id,
        warehouseId: warehouseId,
      },
      include: {
        rawMaterial: true,
      },
    });

    if (!warehouseStock) {
      return res.status(403).json({
        success: false,
        message: "You are not allowed to update this RawMaterial",
      });
    }

    const existingRawMaterial = warehouseStock.rawMaterial;

    if (existingRawMaterial.isUsed === isUsedBoolean) {
      return res.status(400).json({
        success: false,
        message: `RawMaterial is already marked as ${
          isUsedBoolean ? "Used" : "Not Used"
        }`,
      });
    }

    /**
     * STEP 2: Update RawMaterial (global flag)
     * Only allowed because user owns this warehouse mapping
     */
    const updatedRawMaterial = await prisma.rawMaterial.update({
      where: { id },
      data: {
        isUsed: isUsedBoolean,
        updatedBy: empId,
      },
    });

    /**
     * STEP 3: Update ONLY this warehouse stock
     */
    await prisma.warehouseStock.updateMany({
      where: {
        rawMaterialId: id,
        warehouseId: warehouseId,
      },
      data: {
        isUsed: isUsedBoolean,
      },
    });

    /**
     * STEP 4: Audit log
     */
    await prisma.auditLog.create({
      data: {
        entityType: "RawMaterial",
        entityId: id,
        action: "STATUS_UPDATED",
        performedBy: empId || null,
        oldValue: { isUsed: existingRawMaterial.isUsed },
        newValue: { isUsed: isUsedBoolean },
      },
    });

    return res.status(200).json({
      success: true,
      message: `RawMaterial marked as ${
        isUsedBoolean ? "Used." : "Not Used."
      }`,
      data: updatedRawMaterial,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Internal Server Error",
    });
  }
};

const markSystemItemUsedOrNotUsed = async (req, res) => {
  try {
    const { id, isUsed } = req.query;
    const empId = req.user?.id;

    if (!id || typeof isUsed === "undefined") {
      return res.status(400).json({
        success: false,
        message: "Invalid data passed",
      });
    }

    const existingSystemItem = await SystemItem.findById(id);

    if (!existingSystemItem) {
      return res.status(404).json({
        success: false,
        message: "System Item not found",
      });
    }

    const isUsedBoolean = isUsed === "true";

    if (existingSystemItem.isUsed === isUsedBoolean) {
      return res.status(400).json({
        success: false,
        message: `System Item is already marked as - ${isUsedBoolean ? "Used" : "Not Used"}`,
      });
    }

    // ✅ Correct Mongoose update
    const updatedSystemItem = await SystemItem.findByIdAndUpdate(
      id,
      {
        isUsed: isUsedBoolean,
        updatedByEmpId: empId,
        updatedAt: new Date(),
      },
      { new: true }
    );

    await prisma.auditLog.create({
      data: {
        entityType: "SystemItem",
        entityId: id,
        action: "STATUS_UPDATED",
        performedBy: empId || null,
        oldValue: { isUsed: existingSystemItem.isUsed },
        newValue: { isUsed: updatedSystemItem.isUsed },
      },
    });

    return res.status(200).json({
      success: true,
      message: `System Item marked as - ${isUsedBoolean ? "Used." : "Not Used."}`,
      data: updatedSystemItem,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Internal Server Error",
    });
  }
};

const getPendingPOsForReceiving = async (req, res) => {
  try {
    const warehouseId = req.user.warehouseId;

    // 1️⃣ Fetch POs with all items
    const pos = await prisma.purchaseOrder.findMany({
      where: {
        warehouseId,
        status: {
          notIn: ["Cancelled", "Received"],
        },
      },
      include: {
        items: true,
      },
      orderBy: {
        poDate: "desc",
      },
    });

    // 2️⃣ Filter POs + Items in JS
    const pendingPOs = pos
      .map((po) => {
        // keep ONLY pending items
        const pendingItems = po.items.filter((item) => {
          const orderedQty = Number(item.quantity || 0);
          const receivedQty = Number(item.receivedQty || 0);
          return receivedQty < orderedQty;
        });

        // ❌ if no pending items, drop the PO
        if (pendingItems.length === 0) return null;

        // ✅ return PO with ONLY pending items
        return {
          id: po.id,
          poNumber: po.poNumber,
          companyId: po.companyId,
          companyName: po.companyName,
          vendorId: po.vendorId,
          vendorName: po.vendorName,
          warehouseId: po.warehouseId,
          warehouseName: po.warehouseName,
          poDate: po.poDate,
          status: po.status,
          approvalStatus: po.approvalStatus,
          items: pendingItems.map((item) => ({
            id: item.id,
            itemId: item.itemId,
            itemSource: item.itemSource,
            itemName: item.itemName,
            hsnCode: item.hsnCode,
            modelNumber: item.modelNumber,
            unit: item.unit,
            quantity: item.quantity,
            receivedQty: item.receivedQty,
            pendingQty:
              Number(item.quantity || 0) - Number(item.receivedQty || 0),
          })),
        };
      })
      .filter(Boolean); // remove null POs

    return res.json({
      success: true,
      message: "Pending POs for receiving fetched successfully.",
      data: pendingPOs,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message || "Internal Server Error",
    });
  }
};

const purchaseOrderReceivingBill = async (req, res) => {
  const userId = req.user?.id;
  let uploadedFilePath = null;

  const deleteUploadedFile = () => {
    if (uploadedFilePath) {
      try {
        fs.unlinkSync(uploadedFilePath);
        console.log("🗑️ Uploaded bill file deleted due to error.");
      } catch (err) {
        console.error("⚠️ File delete failed:", err);
      }
    }
  };

  const validateItems = async (items, po) => {
    for (const item of items) {
      const { itemId, itemSource, purchaseOrderItemId } = item;

      if (!itemId || !itemSource || !purchaseOrderItemId) {
        throw new Error("Invalid item data.");
      }

      const poItem = po.items.find((p) => p.id === purchaseOrderItemId);
      if (!poItem) {
        throw new Error(`PO item ${purchaseOrderItemId} not found.`);
      }

      if (itemSource === "mongo") {
        const systemItem = await SystemItem.findById(itemId);
        if (!systemItem) throw new Error(`SystemItem ${itemId} not found.`);
      } else if (itemSource === "mysql") {
        const rawMat = await prisma.rawMaterial.findUnique({
          where: { id: itemId },
        });
        if (!rawMat) throw new Error(`RawMaterial ${itemId} not found.`);
      } else {
        throw new Error(`Invalid itemSource for ${itemId}.`);
      }
    }
  };

  try {
    // Parse JSON items if needed
    if (req.body.items) {
      try {
        req.body.items = JSON.parse(req.body.items);
      } catch (err) {
        return res
          .status(400)
          .json({ success: false, message: "Invalid JSON format for items." });
      }
    }

    const { purchaseOrderId, items, invoiceNumber } = req.body;
    const userWarehouseId = String(req.user?.warehouseId);
    const billFile = req.files?.billFile?.[0];

    if (!billFile)
      return res
        .status(400)
        .json({ success: false, message: "Bill file is required." });

    uploadedFilePath = path.join(
      __dirname,
      "../../uploads/purchaseOrder/receivingBill",
      billFile.filename
    );

    if (
      !purchaseOrderId ||
      !invoiceNumber ||
      !Array.isArray(items) ||
      items.length === 0
    ) {
      deleteUploadedFile();
      return res.status(400).json({
        success: false,
        message: "purchaseOrderId, invoiceNumber and items[] are required.",
      });
    }

    const warehouseData = await Warehouse.findById(userWarehouseId);
    if (!warehouseData) throw new Error("Warehouse not found.");

    const po = await prisma.purchaseOrder.findUnique({
      where: { id: purchaseOrderId },
      include: { items: true },
    });

    if (!po) throw new Error("Purchase Order not found.");

    if (["Received", "Cancelled"].includes(po.status)) {
      throw new Error(`PO already ${po.status}.`);
    }

    if (String(po.warehouseId) !== userWarehouseId) {
      return res.status(403).json({
        success: false,
        message:
          "Unauthorized: Cannot receive PO items for different warehouse.",
      });
    }

    // Validate items exist
    await validateItems(items, po);

    const { receiptResults, stockUpdates } = await prisma.$transaction(
      async (tx) => {
        const receiptResults = [];
        const stockUpdates = [];
        let hasAnyGoodEver = po.items.some(
          (p) => Number(p.receivedQty || 0) > 0
        );
        let poStatusFlags = { allReceived: true, someReceived: false };

        // Save bill
        await tx.purchaseOrderBill.create({
          data: {
            purchaseOrderId,
            invoiceNumber,
            fileName: billFile.filename,
            fileUrl: `/uploads/purchaseOrder/receivingBill/${billFile.filename}`,
            mimeType: billFile.mimetype,
            uploadedBy: userId,
          },
        });

        for (const item of items) {
          const {
            purchaseOrderItemId,
            itemId,
            itemSource,
            itemName,
            receivedQty = 0,
            goodQty = 0,
            damagedQty = 0,
            remarks = "",
          } = item;

          const poItem = po.items.find((p) => p.id === purchaseOrderItemId);
          const poQty = Number(poItem.quantity);
          const poUnit = poItem.unit?.toLowerCase();
          const alreadyReceived = Number(poItem.receivedQty || 0);

          // Prevent over receiving (GOOD QTY CHECK)
          if (alreadyReceived >= poQty)
            throw new Error(`${itemName} already fully received (${poQty}).`);

          if (alreadyReceived + goodQty > poQty)
            throw new Error(
              `Cannot receive goodQty ${goodQty} of ${itemName}. Only ${
                poQty - alreadyReceived
              } remaining.`
            );

          if (goodQty > 0) {
            hasAnyGoodEver = true;
          }

          // ❗ FIX: Only update TOTAL RECEIVED with GOOD QTY
          const totalReceived = alreadyReceived + goodQty;

          // Create receipt entry
          await tx.purchaseOrderReceipt.create({
            data: {
              purchaseOrderId,
              purchaseOrderItemId,
              invoiceNumber,
              itemId,
              itemSource,
              itemName,
              receivedQty,
              goodQty,
              damagedQty,
              remarks,
              createdBy: userId,
              receivedDate: new Date(),
            },
          });

          // ❗ FIX: Update only with GOOD QTY
          await tx.purchaseOrderItem.update({
            where: { id: purchaseOrderItemId },
            data: { receivedQty: totalReceived },
          });

          // Handle damaged stock
          if (damagedQty > 0) {
            const existingDamage = await tx.damagedStock.findFirst({
              where: { itemId, itemSource, purchaseOrderId },
            });

            if (existingDamage) {
              await tx.damagedStock.update({
                where: { id: existingDamage.id },
                data: {
                  quantity: { increment: damagedQty },
                  status: "Pending",
                  remarks: `${existingDamage.remarks || ""}${
                    existingDamage.remarks ? "; " : ""
                  }${remarks}`,
                },
              });
            } else {
              await tx.damagedStock.create({
                data: {
                  purchaseOrderId,
                  invoiceNumber,
                  itemId,
                  itemSource,
                  itemName,
                  unit: poItem.unit,
                  quantity: damagedQty,
                  status: "Pending",
                  remarks,
                },
              });
            }
          }

          // Stock update only for goodQty
          if (goodQty > 0)
            stockUpdates.push({
              itemSource,
              itemId,
              goodQty,
              warehouseId: userWarehouseId,
              poUnit,
            });

          poStatusFlags.someReceived =
            poStatusFlags.someReceived || totalReceived > 0;
          poStatusFlags.allReceived =
            poStatusFlags.allReceived && totalReceived >= poQty;

          receiptResults.push({
            itemId,
            itemName,
            receivedQty,
            goodQty,
            damagedQty,
            remainingQty: poQty - totalReceived,
          });
        }

        // Check pending damage
        const pendingDamage = await prisma.damagedStock.findMany({
          where: {
            purchaseOrderId,
            status: "Pending",
          },
        });

        const hasPendingDamage = pendingDamage.length > 0;

        // Update PO status
        let newPOStatus = po.status;

        if (!hasAnyGoodEver) {
          newPOStatus = "Cancelled";
        } else if (poStatusFlags.allReceived && !hasPendingDamage) {
          newPOStatus = "Received";
        } else {
          newPOStatus = "PartiallyReceived";
        }

        if (newPOStatus !== po.status) {
          await tx.purchaseOrder.update({
            where: { id: purchaseOrderId },
            data: { status: newPOStatus },
          });
        }

        return { receiptResults, stockUpdates };
      }
    );

    // Update inventory or raw materials
    await Promise.all(
      stockUpdates.map(
        async ({ itemSource, itemId, goodQty, warehouseId, poUnit }) => {
          /* ===================== MONGO ITEMS ===================== */
          if (itemSource === "mongo") {
            const systemItem = await SystemItem.findById(itemId);
            if (!systemItem) {
              throw new Error(`SystemItem ${itemId} not found.`);
            }

            const baseUnit = systemItem.unit?.toLowerCase();
            const convUnit = systemItem.converionUnit?.toLowerCase();
            const factor = Number(systemItem.conversionFactor || 1);

            let convertedQty;

            if (poUnit === baseUnit) {
              convertedQty = goodQty;
            } else if (poUnit === convUnit) {
              convertedQty = goodQty * factor;
            } else {
              throw new Error(
                `Invalid unit '${poUnit}' for ${systemItem.itemName}.`
              );
            }

            const inventoryItem = await InstallationInventory.findOne({
              warehouseId,
              systemItemId: itemId,
            });

            if (inventoryItem) {
              inventoryItem.quantity += convertedQty;
              await inventoryItem.save();
            } else {
              await InstallationInventory.create({
                warehouseId,
                systemItemId: itemId,
                quantity: convertedQty,
              });
            }
          }

          /* ===================== MYSQL ITEMS ===================== */
          if (itemSource === "mysql") {
            // 1️⃣ Get raw material
            const rawMat = await prisma.rawMaterial.findUnique({
              where: { id: itemId },
            });
            if (!rawMat) {
              throw new Error(`RawMaterial ${itemId} not found.`);
            }

            // 2️⃣ Conversion logic (MASTER-DRIVEN)
            const baseUnit = rawMat.unit?.toLowerCase();
            const convUnit = rawMat.conversionUnit?.toLowerCase();
            const factor = Number(rawMat.conversionFactor || 1);

            let convertedQty;

            if (poUnit === baseUnit) {
              convertedQty = goodQty;
            } else if (poUnit === convUnit) {
              convertedQty = goodQty * factor;
            } else {
              throw new Error(
                `Invalid unit '${poUnit}' for ${rawMat.name}. Expected '${baseUnit}' or '${convUnit}'.`
              );
            }

            // 3️⃣ Find warehouse stock
            const warehouseStock = await prisma.warehouseStock.findUnique({
              where: {
                warehouseId_rawMaterialId: {
                  warehouseId,
                  rawMaterialId: itemId,
                },
              },
            });

            // 4️⃣ Update OR Create stock
            if (warehouseStock) {
              await prisma.warehouseStock.update({
                where: {
                  warehouseId_rawMaterialId: {
                    warehouseId,
                    rawMaterialId: itemId,
                  },
                },
                data: {
                  quantity: { increment: convertedQty },
                  unit: baseUnit, // ✅ FIXED
                },
              });
            } else {
              await prisma.warehouseStock.create({
                data: {
                  warehouseId,
                  rawMaterialId: itemId,
                  quantity: convertedQty,
                  unit: baseUnit,
                },
              });
            }
          }
        }
      )
    );

    const updatedPO = await prisma.purchaseOrder.findUnique({
      where: { id: purchaseOrderId },
      include: { items: true },
    });

    await prisma.auditLog.create({
      data: {
        entityType: "PurchaseOrder",
        entityId: purchaseOrderId,
        action: "RECEIVE_PO",
        performedBy: userId,
        oldValue: po,
        newValue: {
          status: updatedPO.status,
          invoiceNumber,
          receivedItems: receiptResults,
          items: updatedPO.items.map((i) => ({
            id: i.id,
            receivedQty: Number(i.receivedQty || 0),
          })),
        },
      },
    });

    return res.status(200).json({
      success: true,
      message: "Purchase Order Receipts processed successfully.",
      data: receiptResults,
    });
  } catch (error) {
    console.error("❌ Error in PO Receipt creation:", error);
    deleteUploadedFile();
    return res.status(500).json({
      success: false,
      message: error.message || "Server error while processing PO Receipts.",
    });
  }
};

const purchaseOrderReceivingBill2 = async (req, res) => {
  const userId = req.user?.id;
  const userWarehouseId = String(req.user?.warehouseId);
  let uploadedFilePath = null;

  // 🔁 Mongo rollback stack
  const mongoRollbackStack = [];

  const deleteUploadedFile = async () => {
    if (uploadedFilePath) {
      try {
        await fs.unlink(uploadedFilePath);
      } catch (err) {
        console.error("⚠️ Failed to delete uploaded file:", err);
      }
    }
  };

  const rollbackMongoChanges = async () => {
    for (const r of mongoRollbackStack.reverse()) {
      try {
        if (r.type === "update") {
          await InstallationInventory.findByIdAndUpdate(r.id, {
            quantity: r.oldQty,
          });
        }
        if (r.type === "create") {
          await InstallationInventory.findByIdAndDelete(r.id);
        }
      } catch (err) {
        console.error("❌ Mongo rollback failed:", err);
      }
    }
  };

  try {
    /* ===================== PARSE ITEMS ===================== */
    if (req.body.items) {
      try {
        req.body.items = JSON.parse(req.body.items);
      } catch {
        return res.status(400).json({
          success: false,
          message: "Invalid items JSON.",
        });
      }
    }

    const { purchaseOrderId, items, invoiceNumber } = req.body;
    const billFile = req.files?.billFile?.[0];

    if (!billFile) {
      return res.status(400).json({
        success: false,
        message: "Bill file is required.",
      });
    }

    uploadedFilePath = path.join(
      __dirname,
      "../../uploads/purchaseOrder/receivingBill",
      billFile.filename
    );

    if (
      !purchaseOrderId ||
      !invoiceNumber ||
      !Array.isArray(items) ||
      !items.length
    ) {
      await deleteUploadedFile();
      return res.status(400).json({
        success: false,
        message: "purchaseOrderId, invoiceNumber & items are required.",
      });
    }

    const po = await prisma.purchaseOrder.findUnique({
      where: { id: purchaseOrderId },
      include: { items: true },
    });

    if (!po) throw new Error("Purchase Order not found.");

    if (["Cancelled"].includes(po.status))
      throw new Error(`PO already ${po.status}.`);

    if (String(po.warehouseId) !== userWarehouseId) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized warehouse access.",
      });
    }

    /* ===================== PRISMA TRANSACTION ===================== */
    const { receiptResults, stockUpdates } = await prisma.$transaction(
      async (tx) => {
        const receiptResults = [];
        const stockUpdates = [];

        // 📄 Save bill
        await tx.purchaseOrderBill.create({
          data: {
            purchaseOrderId,
            invoiceNumber,
            fileName: billFile.filename,
            fileUrl: `/uploads/purchaseOrder/receivingBill/${billFile.filename}`,
            mimeType: billFile.mimetype,
            uploadedBy: userId,
          },
        });

        for (const item of items) {
          const {
            purchaseOrderItemId,
            itemId,
            itemSource,
            itemName,
            goodQty = 0,
            damagedQty = 0,
            remarks = "",
          } = item;

          const poItem = po.items.find((p) => p.id === purchaseOrderItemId);
          if (!poItem) throw new Error("PO item not found.");

          const orderedQty = Number(poItem.quantity || 0);
          const alreadyReceived = Number(poItem.receivedQty || 0);
          const poUnit = poItem.unit?.toLowerCase();

          if (alreadyReceived + goodQty > orderedQty) {
            throw new Error(`Over receiving ${itemName}`);
          }

          const totalReceived = alreadyReceived + goodQty;

          /* ===== RECEIPT ENTRY ===== */
          await tx.purchaseOrderReceipt.create({
            data: {
              purchaseOrderId,
              purchaseOrderItemId,
              invoiceNumber,
              itemId,
              itemSource,
              itemName,
              receivedQty: goodQty + damagedQty,
              goodQty,
              damagedQty,
              remarks,
              createdBy: userId,
              receivedDate: new Date(),
            },
          });

          await tx.purchaseOrderItem.update({
            where: { id: purchaseOrderItemId },
            data: { receivedQty: totalReceived },
          });

          /* ===== DAMAGED STOCK (NO UPSERT) ===== */
          if (damagedQty > 0) {
            await tx.damagedStock.create({
              data: {
                purchaseOrderId,
                invoiceNumber,
                itemId,
                itemSource,
                itemName,
                unit: poItem.unit,
                quantity: damagedQty,
                status: "Pending",
                remarks,
                createdBy: userId,
              },
            });
          }

          /* ===== GOOD STOCK QUEUE ===== */
          if (goodQty > 0) {
            stockUpdates.push({
              itemSource,
              itemId,
              goodQty,
              poUnit,
              warehouseId: userWarehouseId,
            });
          }

          receiptResults.push({
            itemId,
            itemName,
            goodQty,
            damagedQty,
            remainingQty: orderedQty - totalReceived,
          });
        }

        /* ===== FINAL PO STATUS (SAFE & CORRECT) ===== */
        const updatedItems = await tx.purchaseOrderItem.findMany({
          where: { purchaseOrderId },
          select: { quantity: true, receivedQty: true },
        });

        const allReceived = updatedItems.every(
          (i) => Number(i.receivedQty || 0) >= Number(i.quantity || 0)
        );

        const anyReceived = updatedItems.some(
          (i) => Number(i.receivedQty || 0) > 0
        );

        let newStatus;
        if (!anyReceived) newStatus = "Cancelled";
        else if (allReceived) newStatus = "Received";
        else newStatus = "PartiallyReceived";

        if (newStatus !== po.status) {
          await tx.purchaseOrder.update({
            where: { id: purchaseOrderId },
            data: { status: newStatus },
          });
        }

        /* ===== MYSQL STOCK ===== */
        for (const s of stockUpdates.filter((s) => s.itemSource === "mysql")) {
          const rawMat = await tx.rawMaterial.findUnique({
            where: { id: s.itemId },
          });

          const baseUnit = rawMat.unit?.toLowerCase();
          const convUnit = rawMat.conversionUnit?.toLowerCase();
          const factor = Number(rawMat.conversionFactor || 1);

          let convertedQty;

          if (!baseUnit) convertedQty = s.goodQty;
          else if (s.poUnit === baseUnit) convertedQty = s.goodQty;
          else if (convUnit && s.poUnit === convUnit)
            convertedQty = s.goodQty * factor;
          else throw new Error(`Invalid unit for raw material ${rawMat.name}`);

          await tx.warehouseStock.upsert({
            where: {
              warehouseId_rawMaterialId: {
                warehouseId: s.warehouseId,
                rawMaterialId: s.itemId,
              },
            },
            update: { quantity: { increment: convertedQty } },
            create: {
              warehouseId: s.warehouseId,
              rawMaterialId: s.itemId,
              quantity: convertedQty,
              unit: baseUnit,
            },
          });
        }

        return { receiptResults, stockUpdates };
      }
    );

    /* ===================== MONGO STOCK ===================== */
    for (const s of stockUpdates.filter((s) => s.itemSource === "mongo")) {
      const systemItem = await SystemItem.findById(s.itemId);

      const baseUnit = systemItem.unit?.toLowerCase();
      const convUnit = systemItem.converionUnit?.toLowerCase();
      const factor = Number(systemItem.conversionFactor || 1);

      let convertedQty;

      if (!baseUnit) convertedQty = s.goodQty;
      else if (s.poUnit === baseUnit) convertedQty = s.goodQty;
      else if (convUnit && s.poUnit === convUnit)
        convertedQty = s.goodQty * factor;
      else throw new Error(`Invalid unit for system item`);

      const inv = await InstallationInventory.findOne({
        warehouseId: s.warehouseId,
        systemItemId: s.itemId,
      });

      if (inv) {
        mongoRollbackStack.push({
          type: "update",
          id: inv._id,
          oldQty: inv.quantity,
        });
        inv.quantity += convertedQty;
        await inv.save();
      } else {
        const created = await InstallationInventory.create({
          warehouseId: s.warehouseId,
          systemItemId: s.itemId,
          quantity: convertedQty,
        });
        mongoRollbackStack.push({ type: "create", id: created._id });
      }
    }

    /* ===================== AUDIT LOG ===================== */
    await prisma.auditLog.create({
      data: {
        entityType: "PurchaseOrder",
        entityId: purchaseOrderId,
        action: "RECEIVE_PO",
        performedBy: userId,
        oldValue: po,
        newValue: { receiptResults },
      },
    });

    return res.status(200).json({
      success: true,
      message: "Purchase Order received successfully.",
      data: receiptResults,
    });
  } catch (err) {
    console.error("❌ PO Receiving Error:", err);
    await deleteUploadedFile();
    await rollbackMongoChanges();
    return res.status(500).json({
      success: false,
      message: err.message || "PO receiving failed.",
    });
  }
};

const directItemIssue = async (req, res) => {
  try {
    const issuedBy = req.user?.id;
    const userWarehouseId = req.user?.warehouseId;

    /* ---------------- AUTH VALIDATION ---------------- */
    if (!issuedBy) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized access",
      });
    }

    if (!userWarehouseId) {
      return res.status(400).json({
        success: false,
        message: "Warehouse not assigned to storekeeper",
      });
    }

    const { issuedTo, rawMaterialIssued, remarks, serviceProcessId } = req.body;

    /* ---------------- BODY VALIDATION ---------------- */
    if (!issuedTo) {
      return res.status(400).json({
        success: false,
        message: "issuedTo (employee id) is required",
      });
    }

    if (!Array.isArray(rawMaterialIssued) || rawMaterialIssued.length === 0) {
      return res.status(400).json({
        success: false,
        message: "rawMaterialIssued must be a non-empty array",
      });
    }

    /* ---------------- NORMALIZE MATERIALS ---------------- */
    const materialMap = new Map();

    for (let i = 0; i < rawMaterialIssued.length; i++) {
      const item = rawMaterialIssued[i];
      const quantity = Number(item.quantity);

      if (!item.rawMaterialId) {
        return res.status(400).json({
          success: false,
          message: `rawMaterialId missing at index ${i}`,
        });
      }

      if (!item.quantity || isNaN(quantity) || quantity <= 0) {
        return res.status(400).json({
          success: false,
          message: `Invalid quantity for rawMaterialId ${item.rawMaterialId}`,
        });
      }

      // Merge duplicate rawMaterialIds
      materialMap.set(
        item.rawMaterialId,
        (materialMap.get(item.rawMaterialId) || 0) + quantity
      );
    }

    /* ---------------- TRANSACTION ---------------- */
    const result = await prisma.$transaction(async (tx) => {
      // 🔹 Process each material
      for (const [rawMaterialId, quantity] of materialMap.entries()) {
        const warehouseStock = await tx.warehouseStock.findUnique({
          where: {
            warehouseId_rawMaterialId: {
              warehouseId: userWarehouseId,
              rawMaterialId,
            },
          },
        });

        if (!warehouseStock) {
          throw new Error(
            `Stock not found in warehouse for rawMaterialId ${rawMaterialId}`
          );
        }

        if (warehouseStock.quantity < quantity) {
          throw new Error(
            `Insufficient stock for rawMaterialId ${rawMaterialId}. Available: ${warehouseStock.quantity}, Required: ${quantity}`
          );
        }

        // 🔻 Reduce warehouse stock
        await tx.warehouseStock.update({
          where: {
            warehouseId_rawMaterialId: {
              warehouseId: userWarehouseId,
              rawMaterialId,
            },
          },
          data: {
            quantity: { decrement: quantity },
          },
        });

        // ➕ Add to user stock (empId!)
        await tx.userItemStock.upsert({
          where: {
            empId_rawMaterialId: {
              empId: issuedTo,
              rawMaterialId,
            },
          },
          update: {
            quantity: { increment: quantity },
          },
          create: {
            empId: issuedTo,
            rawMaterialId,
            quantity,
            unit: warehouseStock.unit,
          },
        });
      }

      // 🔹 Create Direct Issue record
      const directIssue = await tx.directItemIssue.create({
        data: {
          warehouseId: userWarehouseId,
          serviceProcessId,
          isProcessIssue: Boolean(serviceProcessId),
          rawMaterialIssued,
          issuedTo,
          issuedBy,
          remarks,
        },
      });

      return directIssue;
    });

    return res.status(200).json({
      success: true,
      message: "Items issued successfully",
      data: result,
    });
  } catch (error) {
    console.error("Direct Item Issue Error:", error);

    return res.status(400).json({
      success: false,
      message: error.message || "Failed to issue items",
    });
  }
};

const getLineWorkerList2 = async (req, res) => {
  try {
    const empId = req.user?.id;
    const userWarehouseId = req.user?.warehouseId;
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
        warehouseId: userWarehouseId,
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

const getRawMaterialList2 = async (req, res) => {
  try {
    const warehouseId = req.user?.warehouseId;

    if (!warehouseId) {
      return res.status(400).json({
        success: false,
        message: "Warehouse not assigned to user",
      });
    }

    const allRawMaterial = await prisma.rawMaterial.findMany({
      select: {
        id: true,
        name: true,
        unit: true,
        warehouseStock: {
          where: {
            warehouseId,
          },
          select: {
            quantity: true,
            isUsed: true,
          },
        },
      },
    });

    const formattedData = allRawMaterial.map((data) => {
      const warehouseData = data.warehouseStock[0] || {};

      const stock = warehouseData.quantity ?? 0;
      const isUsed = warehouseData.isUsed ?? false;

      return {
        id: data.id,
        name: data.name,
        stock: formatStock(stock),
        rawStock: stock, // only for sorting
        unit: data.unit,
        isUsed,
        outOfStock: stock === 0,
      };
    });

    const sortedData = formattedData.sort((a, b) => {
      if (a.isUsed === b.isUsed) {
        return a.rawStock - b.rawStock;
      }
      return a.isUsed ? -1 : 1;
    });

    const cleanedData = sortedData.map(({ rawStock, ...rest }) => rest);

    return res.status(200).json({
      success: true,
      message: "Raw material fetched successfully",
      data: cleanedData,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message,
    });
  }
};

const sanctionItemForRequest2 = async (req, res) => {
  try {
    const { itemRequestId } = req.body;
    const warehouseId = req.user?.warehouseId;

    if (!itemRequestId) {
      return res.status(400).json({
        success: false,
        message: "ItemRequestId Not Found",
      });
    }

    if (!warehouseId) {
      return res.status(400).json({
        success: false,
        message: "Warehouse not assigned to user",
      });
    }

    const itemRequestData = await prisma.itemRequestData.findFirst({
      where: { id: itemRequestId },
    });

    if (!itemRequestData) throw new Error("Item request not found");
    if (itemRequestData.approved === null)
      throw new Error("Item request is not approved.");
    if (itemRequestData.declined === true)
      throw new Error("Item request is declined.");
    if (itemRequestData.materialGiven)
      throw new Error("Material already sanctioned");

    const rawMaterials = itemRequestData.rawMaterialRequested;
    if (!Array.isArray(rawMaterials) || rawMaterials.length === 0) {
      throw new Error("No raw material data found in the request");
    }

    const date = new Date();

    const result = await prisma.$transaction(async (tx) => {
      for (const rawMaterial of rawMaterials) {
        // 1️⃣ Validate raw material master
        const rawMaterialData = await tx.rawMaterial.findFirst({
          where: { id: rawMaterial.rawMaterialId },
        });

        if (!rawMaterialData) {
          throw new Error(
            `Raw material not found for ID: ${rawMaterial.rawMaterialId}`
          );
        }

        // 2️⃣ Get warehouse stock
        const warehouseStock = await tx.warehouseStock.findFirst({
          where: {
            warehouseId,
            rawMaterialId: rawMaterial.rawMaterialId,
          },
        });

        if (!warehouseStock) {
          throw new Error(
            `Stock not available in warehouse for ${rawMaterialData.name}`
          );
        }

        if (Number(warehouseStock.quantity) < Number(rawMaterial.quantity)) {
          throw new Error(
            `Can't sanction! Requested quantity for ${rawMaterialData.name} exceeds warehouse stock`
          );
        }

        // 3️⃣ Decrease warehouse stock
        await tx.warehouseStock.update({
          where: { id: warehouseStock.id },
          data: {
            quantity: {
              decrement: Number(rawMaterial.quantity),
            },
          },
        });

        // 4️⃣ Credit user stock
        const existingUserItemStock = await tx.userItemStock.findFirst({
          where: {
            empId: itemRequestData.requestedBy,
            rawMaterialId: rawMaterial.rawMaterialId,
          },
        });

        if (existingUserItemStock) {
          await tx.userItemStock.update({
            where: { id: existingUserItemStock.id },
            data: {
              quantity: {
                increment: Number(rawMaterial.quantity),
              },
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

      // 5️⃣ Mark request as sanctioned
      return tx.itemRequestData.update({
        where: { id: itemRequestId },
        data: {
          materialGiven: true,
          updatedAt: date,
          updatedBy: req.user.id,
        },
      });
    });

    return res.status(200).json({
      success: true,
      message: "Material sanctioned from warehouse successfully",
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

const showProcessData2 = async (req, res) => {
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

    const warehouseId = req.user?.warehouseId;
    if (!warehouseId) {
      return res.status(400).json({
        success: false,
        message: "Warehouse not assigned to user",
      });
    }

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

    filterConditions.AND.push({
      warehouseId,
    });

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

const updateStock2 = async (req, res) => {
  const uploadFiles = [];
  try {
    const empId = req?.user?.id;
    const warehouseId = req?.user?.warehouseId;
    const rawMaterialList = req?.body?.rawMaterialList;

    if (!empId || !warehouseId) {
      throw new Error("User or Warehouse not found");
    }

    if (!rawMaterialList) {
      throw new Error("Raw material list is required");
    }

    if (!req.files || !req.files.billPhoto) {
      throw new Error("Bill photo file not uploaded");
    }

    // Upload bill photos
    const billPhotoUrl = req.files.billPhoto.map((file) => {
      uploadFiles.push(file.path);
      return `/uploads/rawMaterial/billPhoto/${file.filename}`;
    });

    const parsedRawMaterialList = JSON.parse(rawMaterialList);

    if (
      !Array.isArray(parsedRawMaterialList) ||
      parsedRawMaterialList.length === 0
    ) {
      throw new Error("Raw material list is empty or invalid");
    }

    const result = await prisma.$transaction(async (tx) => {
      // Create stock movement batch
      const addBillPhoto = await tx.stockMovementBatch.create({
        data: {
          billPhotos: billPhotoUrl,
          createdBy: empId,
        },
      });

      for (const rawMaterial of parsedRawMaterialList) {
        const quantity = Number(rawMaterial.quantity);

        if (!rawMaterial.rawMaterialId || isNaN(quantity) || quantity <= 0) {
          throw new Error(
            "Invalid rawMaterial data: rawMaterialId and valid quantity required"
          );
        }

        const existingRawMaterial = await tx.rawMaterial.findUnique({
          where: { id: rawMaterial.rawMaterialId },
        });

        if (!existingRawMaterial) {
          throw new Error(
            `Raw Material not found: ${rawMaterial.rawMaterialId}`
          );
        }

        // 🔹 Stock Movement (no warehouse relation now)
        await tx.stockMovement.create({
          data: {
            batchId: addBillPhoto.id,
            rawMaterialId: rawMaterial.rawMaterialId,
            userId: empId,
            warehouseId, // just a string now
            quantity,
            unit: existingRawMaterial.unit,
            type: "IN",
          },
        });

        // 🔹 Warehouse Stock UPSERT
        await tx.warehouseStock.upsert({
          where: {
            warehouseId_rawMaterialId: {
              warehouseId,
              rawMaterialId: rawMaterial.rawMaterialId,
            },
          },
          update: {
            quantity: { increment: quantity },
            unit: existingRawMaterial.unit,
          },
          create: {
            warehouseId,
            rawMaterialId: rawMaterial.rawMaterialId,
            quantity,
            unit: existingRawMaterial.unit,
            isUsed: true,
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

    // Cleanup uploaded files if transaction fails
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

const getStockMovementHistory2 = async (req, res) => {
  try {
    const baseUrl = `${req.protocol}://${req.get("host")}`;
    const warehouseId = req?.user?.warehouseId;

    if (!warehouseId) {
      return res.status(400).json({
        success: false,
        message: "Warehouse not found for user",
      });
    }

    const batches = await prisma.stockMovementBatch.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        stockMovement: {
          where: {
            warehouseId: warehouseId, // ✅ FILTER HERE
          },
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

    // Optional (recommended):
    // remove batches with no movements for this warehouse
    const filteredBatches = batches.filter(
      (batch) => batch.stockMovement.length > 0
    );

    const formattedBatches = filteredBatches.map((batch) => ({
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
  getWarehouseRawMaterialList,
  showIncomingItemRequest,
  approveOrDeclineItemRequest,
  sanctionItemForRequest,
  getUserItemStock,
  showProcessData,
  updateStock,
  getStockMovementHistory,
  markRawMaterialUsedOrNotUsed,
  markSystemItemUsedOrNotUsed,
  getPendingPOsForReceiving,
  purchaseOrderReceivingBill,
  purchaseOrderReceivingBill2,
  getLineWorkerList2,
  getRawMaterialList2,
  updateStock2,
  getStockMovementHistory2,
  showProcessData2,
  sanctionItemForRequest2,
  directItemIssue
};

// [{
//   "purchaseOrderId": "8ce7d1a0-9f0d-4c71-a764-c452f75f3869",
//   "items": [
//     {
//       "purchaseOrderItemId": "059206e2-f682-49df-af58-932ae13355fe",
//       "itemId": "68fcafcbbd822233afe7a536",
//       "itemSource": "mongo",
//       "itemName": "9 Panel Bracing Clamp",
//       "receivedQty": 100,
//       "goodQty": 95,
//       "damagedQty": 5,
//       "remarks": "Received partial batch"
//     },
//     {
//       "purchaseOrderItemId": "e676879f-fa31-456f-8f01-d9c52a8d76f0",
//       "itemId": "0a208825-1e45-487f-bcf3-c32567d8e27d",
//       "itemSource": "mysql",
//       "itemName": "Bowl SP17",
//       "receivedQty":80,
//       "goodQty": 80,
//       "damagedQty": 0,
//       "remarks": "Received partial batch"
//     }
//   ]
// }]

[
  {
    id: "8ce7d1a0-9f0d-4c71-a764-c452f75f3869",
    poNumber: "1998DL25260003",
    companyId: "b21ea9a7-1e04-4088-ba00-c6e773291a9b",
    companyName: "UDA MANDI SERVICE PVT LTD",
    vendorId: "1dddc176-4d2d-4d24-bfe6-695a0cf72b30",
    vendorName: "WAAREE ENERGIES LIMITED",
    warehouseId: "67446a8b27dae6f7f4d985dd",
    warehouseName: "Bhiwani",
    poDate: "2025-12-23T09:32:29.578Z",
    status: "Draft",
    approvalStatus: "Pending",
    items: [
      {
        id: "059206e2-f682-49df-af58-932ae13355fe",
        itemId: "68fcafcbbd822233afe7a536",
        itemSource: "mongo",
        itemName: "9 Panel Bracing Clamp",
        hsnCode: "HSN7654",
        modelNumber: "M7654",
        unit: "Pcs/Nos",
        quantity: "150",
        receivedQty: "0",
      },
      {
        id: "e676879f-fa31-456f-8f01-d9c52a8d76f0",
        itemId: "0a208825-1e45-487f-bcf3-c32567d8e27d",
        itemSource: "mysql",
        itemName: "Bowl SP17",
        hsnCode: "HSN1234",
        modelNumber: "M1234",
        unit: "Pcs/Nos",
        quantity: "100",
        receivedQty: "0",
      },
    ],
  },
];
