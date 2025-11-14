const { default: mongoose } = require("mongoose");
const prisma = require("../../config/prismaClient");
const WarehouseItems = require("../../models/serviceInventoryModels/warehouseItemsSchema");

const showStorePersons = async (req, res) => {
  try {
    const storeUsers = await prisma.user.findMany({
      where: {
        role: {
          is: {
            name: "Store",
          },
        },
      },
      select: {
        id: true,
        name: true,
        role: {
          select: {
            name: true,
          },
        },
      },
    });

    return res.status(200).json({
      success: true,
      message: "Data Fetched Successfully",
      data: storeUsers || [],
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

const rawMaterialForItemRequest = async (req, res) => {
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

    const filteredData = allRawMaterial.map((data) => ({
      id: data.id,
      name: data.name,
      stock: data.stock,
      unit: data.unit,
      outOfStock: data.stock === 0 ? true : false,
    }));

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

// const validateStorekeeper = async (userId) => {
//   const user = await prisma.user.findFirst({
//     where: { id: userId },
//     include: { role: { select: { name: true } } }
//   });
//   if (!user || user.role.name !== "Store") {
//     throw new Error("You can only request item to storekeeper");
//   }
//   return user;
// };

// const validateRawMaterials = async (rawMaterialRequested) => {
//   for (let rawMaterial of rawMaterialRequested) {
//     const data = await prisma.rawMaterial.findFirst({
//       where: { id: rawMaterial.rawMaterialId },
//       select: { id: true, name: true, stock: true, unit: true }
//     });
//     if (!data) throw new Error(`Raw material not found: ${rawMaterial.rawMaterialId}`);
//     if (rawMaterial.quantity > data.stock) {
//       throw new Error(`Requested quantity for ${data.name} exceeds available stock`);
//     }
//   }
// };

// const createPreProcessItemRequest = async (req, res) => {
//   try {
//     const { rawMaterialRequested, requestedTo } = req.body;
//     const empId = req.user?.id;

//     if (!rawMaterialRequested || !requestedTo || rawMaterialRequested.length === 0) {
//       return res.status(400).json({
//         success: false,
//         message: "All fields are required",
//       });
//     }

//    // Validate storekeeper
//     await validateStorekeeper(requestedTo);

//     // Validate raw materials
//     await validateRawMaterials(rawMaterialRequested);

//     // Create request
//     const result = await prisma.itemRequestData.create({
//       data: {
//         rawMaterialRequested,
//         requestedTo,
//         requestedBy: empId,
//         isProcessRequest: false,
//       },
//     });

//     return res.status(201).json({
//       success: true,
//       message: "Pre-process item request created successfully",
//       data: result,
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

// const createInProcessItemRequest = async (req, res) => {
//   try {
//     const { serviceProcessId, rawMaterialRequested, requestedTo } = req.body;
//     const empId = req.user.id;

//     if (!serviceProcessId || !rawMaterialRequested?.length || !requestedTo) {
//       throw new Error("All fields are required");
//     }

//     // Validate storekeeper
//     await validateStorekeeper(requestedTo);

//     // Validate raw materials
//     await validateRawMaterials(rawMaterialRequested);

//     // Create request
//     const newRequest = await prisma.itemRequestData.create({
//       data: {
//         serviceProcessId,
//         rawMaterialRequested,
//         requestedTo,
//         requestedBy: empId,
//         isProcessRequest: true, // 👈 different from pre-process
//       },
//     });

//     return res.status(200).json({
//       success: true,
//       message: "In-process item request created successfully",
//       data: newRequest,
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

const createItemRequest = async (req, res) => {
  try {
    const { type, serviceProcessId, rawMaterialRequested, requestedTo } =
      req.body;
    const empId = req.user?.id;

    if (!type || !rawMaterialRequested?.length || !requestedTo) {
      throw new Error("All fields are required");
    }

    // Validate request type
    if (type === "IN" && !serviceProcessId) {
      throw new Error("serviceProcessId is required for in-process requests");
    }

    // ✅ Validate storekeeper
    const storeKeeper = await prisma.user.findFirst({
      where: { id: requestedTo },
      include: { role: { select: { name: true } } },
    });

    if (!storeKeeper || storeKeeper.role.name !== "Store") {
      return res.status(400).json({
        success: false,
        message: "You can only request item to storekeeper",
      });
    }

    // ✅ Validate raw materials in batch
    const rawMaterialIds = rawMaterialRequested.map((r) => r.rawMaterialId);
    const rawMaterials = await prisma.rawMaterial.findMany({
      where: { id: { in: rawMaterialIds } },
      select: { id: true, name: true, stock: true, unit: true },
    });

    for (let rawMaterial of rawMaterialRequested) {
      const data = rawMaterials.find((r) => r.id === rawMaterial.rawMaterialId);
      if (!data)
        throw new Error(`Raw material not found: ${rawMaterial.rawMaterialId}`);
      if (rawMaterial.quantity > data.stock) {
        throw new Error(
          `Requested quantity for ${data.name} exceeds available stock`
        );
      }
    }

    // ✅ Create request
    const newRequest = await prisma.itemRequestData.create({
      data: {
        ...(type === "IN" && { serviceProcessId }), // only attach for in-process
        rawMaterialRequested,
        requestedTo,
        requestedBy: empId,
        isProcessRequest: type === "IN", // true for in-process, false for pre-process
      },
    });

    return res.status(200).json({
      success: true,
      message: `${type === "IN" ? "In-process" : "Pre-process"} item request created successfully`,
      data: newRequest,
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

// const createServiceProcess = async (req, res) => {
//   try {
//     let { item, subItem, serialNumber, quantity } = req.body;
//     const empId = req?.user?.id;
//     const empRole = req?.user?.role?.name;

//     if (!item || !subItem || !serialNumber) {
//       return res.status(400).json({
//         success: false,
//         message: "Item, subItem, and serialNumber are required",
//       });
//     }

//     serialNumber = serialNumber.trim().toUpperCase();

//     // --- Prevent duplicates for today ---
//     const startOfToday = new Date();
//     startOfToday.setHours(0, 0, 0, 0);

//     const endOfToday = new Date();
//     endOfToday.setHours(23, 59, 59, 999);

//     const existingProcess = await prisma.service_Process_Record.findFirst({
//       where: {
//         OR: [
//           { serialNumber },
//           { AND: [{ item }, { subItem }] },
//         ],
//         createdAt: {
//           gte: startOfToday,
//           lte: endOfToday,
//         },
//       },
//     });

//     if (existingProcess) {
//       return res.status(400).json({
//         success: false,
//         message: `Service process already created today for this item, subItem, or serialNumber`,
//       });
//     }

//     // --- Determine itemTypeId & initialStageId based on role ---
//     let itemTypeId, initialStageId;

//     if (empRole === "Disassemble") {
//       const itemTypeData = await prisma.itemType.findFirst({
//         where: { name: "SERVICE" },
//         select: { id: true },
//       });
//       const initialStageData = await prisma.stage.findFirst({
//         where: { name: "Disassemble" },
//         select: { id: true },
//       });
//       if (!itemTypeData || !initialStageData)
//         throw new Error("ItemType or Initial stage not found");

//       itemTypeId = itemTypeData.id;
//       initialStageId = initialStageData.id;

//     } else if (empRole === "MPC Work") {
//       const itemTypeData = await prisma.itemType.findFirst({
//         where: { name: "NEW" },
//         select: { id: true },
//       });
//       const initialStageData = await prisma.stage.findFirst({
//         where: { name: "MPC Work" },
//         select: { id: true },
//       });
//       if (!itemTypeData || !initialStageData)
//         throw new Error("ItemType or Initial stage not found");

//       itemTypeId = itemTypeData.id;
//       initialStageId = initialStageData.id;

//     } else {
//       return res.status(403).json({
//         success: false,
//         message: "You are not allowed to create service process",
//       });
//     }

//     // --- Create Service Process and Initial Stage Activity ---
//     const newProcess = await prisma.$transaction(async (tx) => {
//       const process = await tx.service_Process_Record.create({
//         data: {
//           item,
//           subItem,
//           serialNumber,
//           itemTypeId,
//           quantity,
//           stageId: initialStageId,
//           initialStageId,
//           status: "IN_PROGRESS",
//           createdBy: empId,
//         },
//       });

//       await tx.stageActivity.create({
//         data: {
//           serviceProcessId: process.id,
//           stageId: initialStageId,
//           status: "IN_PROGRESS",
//           isCurrent: true,
//         },
//       });

//       return process;
//     });

//     return res.status(200).json({
//       success: true,
//       message: "Service process created with initial stage activity",
//       data: newProcess,
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

const createServiceProcess = async (req, res) => {
  try {
    let { productName, itemName, subItemName, serialNumber, quantity } =
      req.body;
    const empId = req.user?.id;
    const empRole = req.user?.role?.name;

    if (!productName || !itemName || !subItemName || !serialNumber) {
      throw new Error("All fields are required");
    }

    serialNumber = serialNumber.trim().toUpperCase();

    // Check if a process already exists for today with same item/subItem/serialNumber
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const existingProcess = await prisma.service_Process_Record.findFirst({
      where: {
        serialNumber,
        productName,
        itemName,
        subItemName,
        createdAt: {
          gte: todayStart,
          lte: todayEnd,
        },
      },
    });

    if (existingProcess) {
      return res.status(400).json({
        success: false,
        message: `Service Process already created today for ${serialNumber}`,
      });
    }

    let itemTypeId, initialStageId;

    if (empRole === "Disassemble") {
      const itemTypeData = await prisma.itemType.findFirst({
        where: { name: "SERVICE" },
        select: { id: true },
      });
      const stageData = await prisma.stage.findFirst({
        where: { name: "Disassemble" },
        select: { id: true },
      });
      if (!itemTypeData || !stageData)
        throw new Error("ItemType or Stage not found");
      itemTypeId = itemTypeData.id;
      initialStageId = stageData.id;
    } else if (empRole === "MPC Work") {
      const itemTypeData = await prisma.itemType.findFirst({
        where: { name: "NEW" },
        select: { id: true },
      });
      const stageData = await prisma.stage.findFirst({
        where: { name: "MPC Work" },
        select: { id: true },
      });
      if (!itemTypeData || !stageData)
        throw new Error("ItemType or Stage not found");
      itemTypeId = itemTypeData.id;
      initialStageId = stageData.id;
    } else {
      throw new Error("You are not allowed to create service process");
    }

    // --- Transaction: Create Service Process + Initial Stage Activity ---
    const newProcess = await prisma.$transaction(async (tx) => {
      const process = await tx.service_Process_Record.create({
        data: {
          productName,
          itemName,
          subItemName,
          serialNumber,
          itemTypeId,
          quantity,
          stageId: initialStageId,
          initialStageId,
          status: "IN_PROGRESS",
          createdBy: empId,
        },
      });

      // Create initial stage activity, leave empId null so user can accept
      await tx.stageActivity.create({
        data: {
          serviceProcessId: process.id,
          stageId: initialStageId,
          status: "PENDING", // Pending until accepted
          isCurrent: true,
        },
      });

      return process;
    });

    return res.status(200).json({
      success: true,
      message: "Service process created and initial stage activity assigned",
      data: newProcess,
    });
  } catch (error) {
    console.error("❌ Error in createServiceProcess:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message,
    });
  }
};

const getPendingActivitiesForUserStage = async (req, res) => {
  try {
    const { role } = req.user;
    const empId = req.user?.id;

    if (!role?.name) throw new Error("User role not found");

    const stage = await prisma.stage.findFirst({ where: { name: role.name } });
    if (!stage) throw new Error("Stage not found for this role");

    const pendingActivities = await prisma.stageActivity.findMany({
      where: {
        stageId: stage.id,
        status: "PENDING",
        empId: null, // unassigned
      },
      include: {
        serviceProcess: {
          select: {
            id: true,
            productName: true,
            itemName: true,
            subItemName: true,
            serialNumber: true,
            itemType: {
              select: { id: true, name: true },
            },
          },
        },
        stage: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "asc" },
    });

    // Optional: Transform for frontend-friendly format
    const response = pendingActivities.map((activity) => ({
      activityId: activity.id,
      serviceProcessId: activity.serviceProcess.id,
      productName: activity.serviceProcess.productName,
      itemName: activity.serviceProcess.itemName,
      subItemName: activity.serviceProcess.subItemName,
      serialNumber: activity.serviceProcess.serialNumber,
      itemType: activity.serviceProcess.itemType.name,
      stage: activity.stage.name,
      createdAt: activity.createdAt,
    }));

    return res.status(200).json({
      success: true,
      message: "Pending activities fetched successfully",
      data: response,
    });
  } catch (error) {
    console.error("❌ Error in getPendingActivitiesForUserStage:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Internal Server Error",
    });
  }
};

const acceptServiceProcess = async (req, res) => {
  try {
    const empId = req.user?.id;
    const { serviceProcessId } = req.body;

    if (!serviceProcessId) {
      return res
        .status(400)
        .json({ success: false, message: "Service process ID is required" });
    }

    // Fetch current stage activity for this service process
    const activity = await prisma.stageActivity.findFirst({
      where: { serviceProcessId, isCurrent: true },
      include: { serviceProcess: true, stage: true },
    });
    console.log(activity);
    if (!activity) {
      return res
        .status(404)
        .json({ success: false, message: "No current stage activity found" });
    }

    if (activity.status !== "PENDING") {
      return res
        .status(400)
        .json({
          success: false,
          message: `Cannot accept because status is ${activity.status}`,
        });
    }

    if (activity.empId) {
      return res
        .status(400)
        .json({
          success: false,
          message: "Already accepted by another employee",
        });
    }

    const serviceProcess = activity.serviceProcess;
    if (["COMPLETED"].includes(serviceProcess.status)) {
      return res
        .status(400)
        .json({
          success: false,
          message: `Cannot accept because process is ${serviceProcess.status}`,
        });
    }

    const updatedActivity = await prisma.stageActivity.update({
      where: { id: activity.id },
      data: {
        user: { connect: { id: empId } }, // ✅ correct way
        status: "IN_PROGRESS",
        acceptedAt: new Date(),
      },
      include: { serviceProcess: true, stage: true },
    });

    return res
      .status(200)
      .json({
        success: true,
        message: "Service process accepted successfully",
        data: updatedActivity,
      });
  } catch (error) {
    console.error("❌ Error in acceptServiceProcess:", error);
    return res
      .status(500)
      .json({
        success: false,
        message: "Internal Server Error",
        error: error.message,
      });
  }
};

const startServiceProcess = async (req, res) => {
  try {
    const empId = req.user?.id;
    const { serviceProcessId } = req.body;

    if (!serviceProcessId) {
      return res
        .status(400)
        .json({ success: false, message: "Service process ID is required" });
    }

    // Fetch current stage activity assigned to this employee
    const activity = await prisma.stageActivity.findFirst({
      where: { serviceProcessId, isCurrent: true, empId },
      include: { serviceProcess: true, stage: true },
    });

    if (!activity) {
      return res
        .status(404)
        .json({
          success: false,
          message: "No stage activity found for this employee",
        });
    }

    if (activity.empId !== empId) {
      return res
        .status(400)
        .json({
          success: false,
          message: "You are not allowed to access these stage",
        });
    }

    if (activity.status !== "IN_PROGRESS") {
      return res
        .status(400)
        .json({
          success: false,
          message: "Process must be accepted before starting",
        });
    }

    if (activity.startedAt) {
      return res
        .status(400)
        .json({ success: false, message: "Process has already been started" });
    }

    // Start the stage
    const updatedActivity = await prisma.stageActivity.update({
      where: { id: activity.id },
      data: { startedAt: new Date() },
      include: { serviceProcess: true, stage: true },
    });

    return res
      .status(200)
      .json({
        success: true,
        message: "Service process started successfully",
        data: updatedActivity,
      });
  } catch (error) {
    console.error("❌ Error in startServiceProcess:", error);
    return res
      .status(500)
      .json({
        success: false,
        message: "Internal Server Error",
        error: error.message,
      });
  }
};

const showUserItemStock = async (req, res) => {
  try {
    const empId = req?.user?.id;
    if (!empId) {
      throw new Error("Employee ID not found");
    }

    const itemStock = await prisma.userItemStock.findMany({
      where: {
        empId,
        quantity: { gt: 0 },
      },
      select: {
        id: true,
        empId: true,
        quantity: true,
        rawMaterial: {
          select: {
            id: true,
            name: true,
            stock: true,
            unit: true,
          },
        },
      },
    });

    return res.status(200).json({
      success: true,
      message: "Data fetched successfully",
      data: itemStock || [],
    });
  } catch (error) {
    console.error("❌ ERROR in showUserItemStock:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message,
    });
  }
};

const createItemUsageLog = async (req, res) => {
  try {
    const { serviceProcessId, rawMaterialList } = req.body;
    const empId = req.user?.id;

    // 🔹 Validation
    if (
      !serviceProcessId ||
      !Array.isArray(rawMaterialList) ||
      rawMaterialList.length === 0
    ) {
      return res
        .status(400)
        .json({ success: false, message: "All fields are required" });
    }
    if (!empId) {
      return res
        .status(400)
        .json({ success: false, message: "Employee ID not found" });
    }

    // 🔹 Wrap the logic in a transaction for consistency
    await prisma.$transaction(async (tx) => {
      for (const rawMaterial of rawMaterialList) {
        const { rawMaterialId, unit } = rawMaterial;
        const quantity = Number(rawMaterial.quantity);
        // Validate raw material existence
        const existingRawMaterial = await tx.rawMaterial.findUnique({
          where: { id: rawMaterialId },
        });
        if (!existingRawMaterial) {
          throw new Error(`Raw material not found: ${rawMaterialId}`);
        }

        // Validate user's stock
        const userStock = await tx.userItemStock.findUnique({
          where: {
            empId_rawMaterialId: {
              empId,
              rawMaterialId,
            },
          },
        });

        if (!userStock) {
          throw new Error(
            `No stock record found for ${existingRawMaterial.name}`
          );
        }

        if (userStock.quantity < quantity) {
          throw new Error(
            `Insufficient stock for ${existingRawMaterial.name}. Available: ${userStock.quantity}, Required: ${quantity}`
          );
        }

        // 🔹 Deduct quantity from user stock
        await tx.userItemStock.update({
          where: {
            empId_rawMaterialId: {
              empId,
              rawMaterialId,
            },
          },
          data: {
            quantity: { decrement: quantity },
          },
        });

        // 🔹 Log the usage
        await tx.itemUsage.create({
          data: {
            serviceProcessId,
            empId,
            rawMaterialId,
            quantityUsed: quantity,
            unit: unit || existingRawMaterial.unit,
          },
        });
      }
    });

    return res.status(200).json({
      success: true,
      message: "Process item usage logged successfully",
    });
  } catch (error) {
    console.error("❌ ERROR in createItemUsageLog:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message,
    });
  }
};

// const updateStageAndMoveNext = async (req, res) => {
//   try {
//     const { serviceProcessId, status, failureReason, remarks } = req?.body;
//     const empId = req?.user?.id;
//     if (!serviceProcessId || !status) {
//       return res.status(400).json({
//         success: false,
//         message: "All fields are required",
//       });
//     }

//     // const roleStageName = req?.user?.role?.name;
//     const processData = await prisma.service_Process_Record.findFirst({
//       where: {
//         id: serviceProcessId,
//       },
//       include: {
//         stage: true,
//         initialStage: true,
//         itemType: true,
//       },
//     });

//     if (!processData) {
//       return res.status(400).json({
//         success: false,
//         message: "Process Not Found",
//       });
//     }

//     const result = await prisma.$transaction(async (tx) => {
//       const currentActivity = await prisma.stageActivity.findFirst({
//         where: {
//           serviceProcessId,
//           stageId: processData?.stage?.id,
//           isCurrent: true,
//         },
//       });

//       if (!currentActivity) {
//         throw new Error("Current stage activity not found");
//       }

//       const updatedCurrentActivity = await tx.stageActivity.update({
//         where: {
//           id: currentActivity.id,
//         },
//         data: {
//           empId,
//           status,
//           failureReason: status === "FAILED" ? failureReason : null,
//           remarks,
//           isCurrent: false,
//         },
//         include: {
//           stage: true,
//           serviceProcess: {
//             include: {
//               itemType: true,
//             },
//           },
//         },
//       });

//       if (
//         updatedCurrentActivity?.stage?.name === "Testing" &&
//         updatedCurrentActivity?.serviceProcess?.itemType?.name === "SERVICE"
//       ) {
//         if (updatedCurrentActivity?.status === "FAILED") {
//           if (updatedCurrentActivity?.failureReason === "VIBRATION") {
//             const getFailureRedirectStage = await tx.failureRedirect.findFirst({
//               where: {
//                 itemTypeId:
//                   updatedCurrentActivity?.serviceProcess?.itemType?.id,
//                 failureReason: "VIBRATION",
//               },
//             });
//             if (!getFailureRedirectStage) {
//               throw new Error(
//                 "Failure redirect stage not found for given reason"
//               );
//             }

//             await tx.service_Process_Record.update({
//               where: {
//                 id: serviceProcessId,
//               },
//               data: {
//                 stageId: getFailureRedirectStage?.redirectStageId,
//                 restartedFromStageId: getFailureRedirectStage?.redirectStageId,
//                 status: "REDIRECTED",
//               },
//             });

//             await tx.stageActivity.create({
//               data: {
//                 serviceProcessId,
//                 stageId: getFailureRedirectStage?.redirectStageId,
//                 status: "IN_PROGRESS",
//                 isCurrent: true,
//               },
//             });
//           } else if (
//             updatedCurrentActivity?.failureReason === "OVERLOAD" ||
//             updatedCurrentActivity?.failureReason === "EARTHING"
//           ) {
//             const getFailureRedirectStage = await tx.failureRedirect.findFirst({
//               where: {
//                 itemTypeId:
//                   updatedCurrentActivity?.serviceProcess?.itemType?.id,
//                 failureReason: {
//                   in: ["OVERLOAD", "EARTHING"],
//                 },
//               },
//             });
//             if (!getFailureRedirectStage) {
//               throw new Error(
//                 "Failure redirect stage not found for given reason"
//               );
//             }

//             await tx.service_Process_Record.update({
//               where: {
//                 id: serviceProcessId,
//               },
//               data: {
//                 stageId: getFailureRedirectStage?.redirectStageId,
//                 restartedFromStageId: getFailureRedirectStage?.redirectStageId,
//                 status: "REDIRECTED",
//               },
//             });

//             await tx.stageActivity.create({
//               data: {
//                 serviceProcessId,
//                 stageId: getFailureRedirectStage?.redirectStageId,
//                 status: "IN_PROGRESS",
//                 isCurrent: true,
//               },
//             });
//           }
//         } else if (updatedCurrentActivity?.status === "COMPLETED") {
//           //logic for updating the stock for the service material
//         }
//       } else if (
//         updatedCurrentActivity?.stage?.name === "Testing" &&
//         updatedCurrentActivity?.serviceProcess?.itemType?.name === "NEW"
//       ) {
//         if (updatedCurrentActivity?.status === "FAILED") {
//           if (updatedCurrentActivity?.failureReason === "VIBRATION") {
//             const getFailureRedirectStage = await tx.failureRedirect.findFirst({
//               where: {
//                 itemTypeId:
//                   updatedCurrentActivity?.serviceProcess?.itemType?.id,
//                 failureReason: "VIBRATION",
//               },
//             });
//             if (!getFailureRedirectStage) {
//               throw new Error(
//                 "Failure redirect stage not found for given reason"
//               );
//             }

//             await tx.service_Process_Record.update({
//               where: {
//                 id: serviceProcessId,
//               },
//               data: {
//                 stageId: getFailureRedirectStage?.redirectStageId,
//                 restartedFromStageId: getFailureRedirectStage?.redirectStageId,
//                 status: "REDIRECTED",
//               },
//             });

//             await tx.stageActivity.create({
//               data: {
//                 serviceProcessId,
//                 stageId: getFailureRedirectStage?.redirectStageId,
//                 status: "IN_PROGRESS",
//                 isCurrent: true,
//               },
//             });
//           } else if (
//             updatedCurrentActivity?.failureReason === "OVERLOAD" ||
//             updatedCurrentActivity?.failureReason === "EARTHING"
//           ) {
//             const getFailureRedirectStage = await tx.failureRedirect.findFirst({
//               where: {
//                 itemTypeId:
//                   updatedCurrentActivity?.serviceProcess?.itemType?.id,
//                 failureReason: {
//                   in: ["OVERLOAD", "EARTHING"],
//                 },
//               },
//             });
//             if (!getFailureRedirectStage) {
//               throw new Error(
//                 "Failure redirect stage not found for given reason"
//               );
//             }

//             await tx.service_Process_Record.update({
//               where: {
//                 id: serviceProcessId,
//               },
//               data: {
//                 stageId: getFailureRedirectStage?.redirectStageId,
//                 restartedFromStageId: getFailureRedirectStage?.redirectStageId,
//                 status: "REDIRECTED",
//               },
//             });

//             await tx.stageActivity.create({
//               data: {
//                 serviceProcessId,
//                 stageId: getFailureRedirectStage?.redirectStageId,
//                 status: "IN_PROGRESS",
//                 isCurrent: true,
//               },
//             });
//           }
//         } else if (updatedCurrentActivity?.status === "COMPLETED") {
//           //logic to updating the stock for new material
//         }
//       }

//       if (
//         updatedCurrentActivity?.stage?.name !== "Testing" &&
//         updatedCurrentActivity?.serviceProcess?.itemType?.name === "SERVICE"
//       ) {
//         if (updatedCurrentActivity?.status === "COMPLETED") {
//           const stageFlow = await tx.stageFlow.findFirst({
//             where: {
//               itemTypeId: updatedCurrentActivity?.serviceProcess?.itemType?.id,
//               currentStageId: updatedCurrentActivity?.stage?.id,
//             },
//           });

//           if (!stageFlow) {
//             return res.status(400).json({
//               success: false,
//               message: "Stage Flow Not Found",
//             });
//           }

//           await tx.service_Process_Record.update({
//             where: {
//               id: serviceProcessId,
//             },
//             data: {
//               stageId: stageFlow?.nextStageId,
//               //restartedFromStageId: getFailureRedirectStage?.redirectStageId,
//             },
//           });
//           await tx.stageActivity.create({
//             data: {
//               serviceProcessId,
//               stageId: stageFlow?.nextStageId,
//               status: "IN_PROGRESS",
//               isCurrent: true,
//             },
//           });
//         }
//       } else if (
//         updatedCurrentActivity?.stage?.name !== "Testing" &&
//         updatedCurrentActivity?.serviceProcess?.itemType?.name === "NEW"
//       ) {
//         if (updatedCurrentActivity?.status === "COMPLETED") {
//           const stageFlow = await tx.stageFlow.findFirst({
//             where: {
//               itemTypeId: updatedCurrentActivity?.serviceProcess?.itemType?.id,
//               currentStageId: updatedCurrentActivity?.stage?.id,
//             },
//           });

//           if (!stageFlow) {
//             return res.status(400).json({
//               success: false,
//               message: "Stage Flow Not Found",
//             });
//           }

//           await tx.service_Process_Record.update({
//             where: {
//               id: serviceProcessId,
//             },
//             data: {
//               stageId: stageFlow?.nextStageId,
//               //restartedFromStageId: getFailureRedirectStage?.redirectStageId,
//             },
//           });
//           await tx.stageActivity.create({
//             data: {
//               serviceProcessId,
//               stageId: stageFlow?.nextStageId,
//               status: "IN_PROGRESS",
//               isCurrent: true,
//             },
//           });
//         }
//       }
//       return updatedCurrentActivity;
//     });

//     return res.status(200).json({
//       success: true,
//       message: "Stage completed - process moved to next stage",
//       data: {
//         activity: result,
//         processId: serviceProcessId,
//       },
//     });
//   } catch (error) {
//     console.log("ERROR: ", error);
//     return res.status(500).json({
//       success: false,
//       message: "Internal Server Error",
//       error: error.message,
//     });
//   }
// };

const completeServiceProcess = async (req, res) => {
  try {
    const { serviceProcessId, status, failureReason, remarks } = req.body;
    const empId = req.user?.id;
    const warehouseId = req.user?.warehouse || "67446a8b27dae6f7f4d985dd";

    // Basic validations
    if (!serviceProcessId || !status || !remarks) {
      return res.status(400).json({
        success: false,
        message: "Service process ID, status, and remarks are required.",
      });
    }
    if (!empId) {
      return res.status(401).json({ success: false, message: "Unauthorized user." });
    }

    // Load warehouse data (mongo)
    const warehouseItemsData = await WarehouseItems.findOne({
      warehouse: new mongoose.Types.ObjectId(warehouseId),
    });
    if (!warehouseItemsData) {
      return res.status(404).json({ success: false, message: "Warehouse data not found." });
    }

    // Load process data (Prisma) - include current stage and itemType and productName/itemName/subItemName
    const processData = await prisma.service_Process_Record.findFirst({
      where: { id: serviceProcessId },
      include: {
        stage: true,
        itemType: true,
        // productName, itemName, subItemName are scalar fields on processData
      },
    });

    if (!processData) {
      return res.status(404).json({ success: false, message: "Service process not found." });
    }

    if (processData.stage?.name === "COMPLETED") {
      return res.status(400).json({ success: false, message: "Process already completed." });
    }

    // Fetch product by productName to get productId (required for StageFlow & FailureRedirect)
    const productData = await prisma.product.findFirst({
      where: { productName: processData.productName },
      select: { id: true, productName: true },
    });
    if (!productData) {
      throw new Error(`Product not found: ${processData.productName}`);
    }
    const productId = productData.id;

    // Helper: Failure redirect (uses productId + itemTypeId + failureReason)
    const handleFailureRedirect = async (tx, updatedActivity, reason) => {
      const sp = updatedActivity.serviceProcess;
      const itemTypeId = sp.itemType.id;

      const redirectStage = await tx.failureRedirect.findFirst({
        where: {
          productId,
          itemTypeId,
          failureReason: reason,
        },
        select: { redirectStageId: true },
      });

      if (!redirectStage) {
        throw new Error(`Failure redirect not found for productId:${productId}, itemTypeId:${itemTypeId}, reason:${reason}`);
      }

      await tx.service_Process_Record.update({
        where: { id: sp.id },
        data: {
          stageId: redirectStage.redirectStageId,
          restartedFromStageId: redirectStage.redirectStageId,
          status: "REDIRECTED",
        },
      });

      await tx.stageActivity.create({
        data: {
          serviceProcessId: sp.id,
          stageId: redirectStage.redirectStageId,
          status: "PENDING",
          isCurrent: true,
        },
      });
    };

    // Helper: move to next stage using productId + itemTypeId + currentStageId
    const moveToNextStage = async (tx, updatedActivity) => {
      const { serviceProcess, stage } = updatedActivity;
      const itemTypeId = serviceProcess.itemType.id;

      const stageFlow = await tx.stageFlow.findFirst({
        where: {
          productId,
          itemTypeId,
          currentStageId: stage.id,
        },
        select: { nextStageId: true },
      });

      // No stage or nextStage -> process completed
      if (!stageFlow || !stageFlow.nextStageId) {
        await tx.service_Process_Record.update({
          where: { id: serviceProcess.id },
          data: {
            status: "COMPLETED",
            finalStatus: "SUCCESS",
            isClosed: true,
            isRepaired: serviceProcess.itemType.name === "SERVICE" ? true : null,
            finalRemarks: null,
            updatedBy: String(empId),
            completedAt: new Date(),
          },
        });
        return null;
      }

      // Move to next stage
      await tx.service_Process_Record.update({
        where: { id: serviceProcess.id },
        data: {
          stageId: stageFlow.nextStageId,
          status: "IN_PROGRESS",
        },
      });

      await tx.stageActivity.create({
        data: {
          serviceProcessId: serviceProcess.id,
          stageId: stageFlow.nextStageId,
          status: "PENDING",
          isCurrent: true,
        },
      });

      return stageFlow.nextStageId;
    };

    // Main transaction: update current activity, then branch logic
    const updatedActivity = await prisma.$transaction(async (tx) => {
      // find current stage activity
      const currentActivity = await tx.stageActivity.findFirst({
        where: {
          serviceProcessId,
          stageId: processData.stage.id,
          isCurrent: true,
        },
      });
      if (!currentActivity) throw new Error("Current stage activity not found.");

      // update current activity (mark complete / skipped / failed)
      const updated = await tx.stageActivity.update({
        where: { id: currentActivity.id },
        data: {
          empId: String(empId),
          status,
          failureReason: status === "FAILED" ? failureReason : null,
          remarks,
          isCurrent: false,
          completedAt: new Date(),
        },
        include: {
          stage: true,
          serviceProcess: { include: { itemType: true } },
        },
      });

      const { stage } = updated;
      const sp = updated.serviceProcess; // shorthand

      // If Testing stage
      if (stage.name === "Testing") {
        if (status === "REJECTED") {
          // Completed as rejected
          await tx.service_Process_Record.update({
            where: { id: sp.id },
            data: {
              status: "COMPLETED",
              finalStatus: "REJECTED",
              isClosed: true,
              isRepaired: sp.itemType.name === "SERVICE" ? false : null,
              finalRemarks: remarks,
              updatedBy: String(empId),
              completedAt: new Date(),
            },
          });
        } else if (status === "COMPLETED") {
          // Success -> completed
          await tx.service_Process_Record.update({
            where: { id: sp.id },
            data: {
              status: "COMPLETED",
              finalStatus: "SUCCESS",
              isClosed: true,
              isRepaired: sp.itemType.name === "SERVICE" ? true : null,
              finalRemarks: remarks,
              updatedBy: String(empId),
              completedAt: new Date(),
            },
          });
        } else if (status === "FAILED" && failureReason) {
          // Failure -> redirect based on productId + itemTypeId + reason
          await handleFailureRedirect(tx, updated, failureReason);
        }
      }

      // SKIPPED -> directly go next (no warehouse logic)
      else if (status === "SKIPPED") {
        await moveToNextStage(tx, updated);
      }

      // Normal completion -> move to next stage
      else if (status === "COMPLETED") {
        await moveToNextStage(tx, updated);
      }

      return updated;
    });

    // After transaction: update warehouse stock only when Testing stage + completed
    const { stage: updatedStage, serviceProcess } = updatedActivity;

    if (updatedStage.name === "Testing" && status === "COMPLETED") {
      // Use new field names
      const itemName = serviceProcess.itemName;
      const subItemName = serviceProcess.subItemName;

      // Find warehouse item entry (match both itemName & subItemName if available)
      const existingItem = warehouseItemsData.items.find(
        (it) =>
          (it.itemName && it.itemName === itemName) &&
          (it.subItemName ? it.subItemName === subItemName : true)
      );

      if (!existingItem) {
        throw new Error(`Warehouse item not found for itemName="${itemName}", subItemName="${subItemName}"`);
      }

      // Determine which field to increment
      const incField = serviceProcess.itemType.name === "SERVICE" ? "quantity" : "newStock";

      // Use arrayFilters to increment correct array element (safer than positional $ if multiple matches)
      // This requires MongoDB >= 3.6 (arrayFilters supported)
      await WarehouseItems.updateOne(
        { _id: warehouseItemsData._id },
        {
          $inc: { [`items.$[elem].${incField}`]: 1 },
        },
        {
          arrayFilters: [{ "elem.itemName": itemName, ...(subItemName ? { "elem.subItemName": subItemName } : {}) }],
        }
      );
    }

    return res.status(200).json({
      success: true,
      message: "Stage processed successfully.",
      data: { activity: updatedActivity, processId: serviceProcessId },
    });
  } catch (error) {
    console.error("❌ Error in completeServiceProcess:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Internal Server Error",
    });
  }
};

// const completeServiceProcess = async (req, res) => {
//   try {
//     const { serviceProcessId, status, failureReason, remarks } = req.body;
//     console.log("Req Body: ", req.body);
//     const empId = req.user?.id;
//     const warehouseId = req.user?.warehouse || "67446a8b27dae6f7f4d985dd";
//     console.log("WarehouseId: ", warehouseId);
//     // 🔹 Basic validations
//     if (!serviceProcessId || !status || !remarks) {
//       return res.status(400).json({
//         success: false,
//         message: "Service process ID, status, and remarks are required.",
//       });
//     }
//     if (!empId) {
//       return res
//         .status(401)
//         .json({ success: false, message: "Unauthorized user." });
//     }

//     const warehouseItemsData = await WarehouseItems.findOne({
//       warehouse: new mongoose.Types.ObjectId(warehouseId),
//     });
//     console.log("WarehouseItems: ", warehouseItemsData);
//     if (!warehouseItemsData) {
//       return res
//         .status(404)
//         .json({ success: false, message: "Warehouse data not found." });
//     }

//     const processData = await prisma.service_Process_Record.findFirst({
//       where: { id: serviceProcessId },
//       include: { stage: true, itemType: true },
//     });

//     console.log("Process Data: ", processData);

//     if (!processData) {
//       return res
//         .status(404)
//         .json({ success: false, message: "Service process not found." });
//     }

//     if (processData.stage.name === "COMPLETED") {
//       return res
//         .status(400)
//         .json({ success: false, message: "Process already completed." });
//     }

//     const itemType = processData.itemType.name;
//     const productData = await prisma.product.findFirst({
//       where: {
//         productName: processData.productName,
//       },
//     });
    
//     console.log("ItemType: ", itemType);

//     const handleFailureRedirect = async (tx, updatedActivity, reason) => {
//       const itemTypeId = updatedActivity.serviceProcess.itemType.id;
//       const redirectStage = await tx.failureRedirect.findFirst({
//         where: { productId: productData.id, itemTypeId, failureReason: reason },
//       });
//       if (!redirectStage)
//         throw new Error(
//           `Failure redirect stage not found for reason: ${reason}`
//         );

//       await tx.service_Process_Record.update({
//         where: { id: serviceProcessId },
//         data: {
//           stageId: redirectStage.redirectStageId,
//           restartedFromStageId: redirectStage.redirectStageId,
//           status: "REDIRECTED",
//         },
//       });

//       await tx.stageActivity.create({
//         data: {
//           serviceProcessId,
//           stageId: redirectStage.redirectStageId,
//           status: "PENDING",
//           isCurrent: true,
//         },
//       });
//     };

//     const moveToNextStage = async (tx, updatedActivity) => {
//       const { serviceProcess, stage } = updatedActivity;
//       const stageFlow = await tx.stageFlow.findFirst({
//         where: {
//           productId: productData.id,
//           itemTypeId: serviceProcess.itemType.id,
//           currentStageId: stage.id,
//         },
//       });

//       if (!stageFlow) {
//         // 🚀 No next stage = process completed successfully
//         await tx.service_Process_Record.update({
//           where: { id: serviceProcess.id },
//           data: {
//             status: "COMPLETED",
//             finalStatus: "SUCCESS",
//             isClosed: true,
//             isRepaired: itemType === "SERVICE" ? true : null,
//           },
//         });
//         return null;
//       }

//       await tx.service_Process_Record.update({
//         where: { id: serviceProcess.id },
//         data: { stageId: stageFlow.nextStageId, status: "IN_PROGRESS" },
//       });

//       await tx.stageActivity.create({
//         data: {
//           serviceProcessId: serviceProcess.id,
//           stageId: stageFlow.nextStageId,
//           status: "PENDING",
//           isCurrent: true,
//         },
//       });

//       return stageFlow.nextStageId;
//     };
//     console.log("Hi");
//     // 🔹 Main Transaction
//     const updatedActivity = await prisma.$transaction(async (tx) => {
//       const currentActivity = await tx.stageActivity.findFirst({
//         where: {
//           serviceProcessId,
//           stageId: processData.stage.id,
//           isCurrent: true,
//         },
//       });
//       if (!currentActivity)
//         throw new Error("Current stage activity not found.");

//       const updated = await tx.stageActivity.update({
//         where: { id: currentActivity.id },
//         data: {
//           empId: String(empId),
//           status,
//           failureReason: status === "FAILED" ? failureReason : null,
//           remarks,
//           isCurrent: false,
//           completedAt: new Date(),
//         },
//         include: {
//           stage: true,
//           serviceProcess: { include: { itemType: true } },
//         },
//       });
//       console.log("Hi2");
//       const { stage } = updated;

//       // 🧩 CASE 1: TESTING stage logic
//       if (stage.name === "Testing") {
//         if (status === "REJECTED") {
//           // ❌ Rejected in testing → completed but rejected
//           await tx.service_Process_Record.update({
//             where: { id: serviceProcessId },
//             data: {
//               status: "COMPLETED",
//               finalStatus: "REJECTED",
//               isClosed: true,
//               isRepaired: itemType === "SERVICE" ? false : null,
//               finalRemarks: remarks,
//               updatedBy: String(empId),
//               //completedAt: new Date()
//             },
//           });
//         } else if (status === "COMPLETED") {
//           // ✅ Successfully passed testing
//           await tx.service_Process_Record.update({
//             where: { id: serviceProcessId },
//             data: {
//               status: "COMPLETED",
//               finalStatus: "SUCCESS",
//               isClosed: true,
//               isRepaired: itemType === "SERVICE" ? true : null,
//               finalRemarks: remarks,
//               updatedBy: empId,
//             },
//           });
//         } else if (status === "FAILED" && failureReason) {
//           // ⚙️ Redirect if test failed
//           await handleFailureRedirect(tx, updated, failureReason);
//         }
//       }

//       // 🧩 CASE 2: Normal stage logic
//       else if (status === "COMPLETED" || status === "SKIPPED") {
//         await moveToNextStage(tx, updated);
//         console.log("Hi3");
//       }

//       return updated;
//     });
//     console.log("Hi4");
//     // 🔹 Update warehouse stock only on successful testing completion
//     const { stage, serviceProcess } = updatedActivity;
//     if (stage.name === "Testing" && status === "COMPLETED") {
//       const subItem = serviceProcess.subItem;
//       const existingItem = warehouseItemsData.items.find(
//         (i) => i.itemName === subItem
//       );
//       console.log("existingItem: ", existingItem);
//       if (!existingItem)
//         throw new Error(`Item "${subItem}" not found in Warehouse.`);

//       const incField =
//         serviceProcess.itemType.name === "SERVICE" ? "quantity" : "newStock";
//       await WarehouseItems.updateOne(
//         { _id: warehouseItemsData._id, "items.itemName": subItem },
//         { $inc: { [`items.$.${incField}`]: 1 } }
//       );
//     }
//     console.log("Hi5");
//     return res.status(200).json({
//       success: true,
//       message: "Stage processed successfully.",
//       data: { activity: updatedActivity, processId: serviceProcessId },
//     });
//   } catch (error) {
//     console.error("❌ Error in completeServiceProcess:", error);
//     return res.status(500).json({
//       success: false,
//       message: error.message || "Internal Server Error",
//     });
//   }
// };


module.exports = {
  showStorePersons,
  rawMaterialForItemRequest,
  createItemRequest,
  createServiceProcess,
  getPendingActivitiesForUserStage,
  acceptServiceProcess,
  startServiceProcess,
  completeServiceProcess,
  showUserItemStock,
  createItemUsageLog,
};
