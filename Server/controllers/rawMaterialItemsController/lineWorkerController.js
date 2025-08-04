const prisma = require("../../config/prismaClient");

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
        stock: "asc"
      },
      select: {
        id: true,
        name: true,
        stock: true,
        unit: true
      }
    });

    const filteredData = allRawMaterial.map((data) => ({
      id: data.id,
      name: data.name,
      stock: data.stock,
      unit: data.unit,
      outOfStock: data.stock === 0 ? true : false
    }));

    return res.status(200).json({
      success: true,
      message: "Data fetched successfully",
      data: filteredData || []
    });
  } catch (error) {
    console.log("ERROR: ", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message
    });
  }
};

const createPreProcessItemRequest = async (req, res) => {
  try {
    const { rawMaterialRequested, requestedTo } = req?.body;
    console.log("Req.body: ", req.body);
    const empId = req?.user?.id;
    console.log("EmpId: ", empId);
    if (
      !rawMaterialRequested ||
      !requestedTo ||
      rawMaterialRequested.length === 0
    ) {
      throw new Error("All fields are required");
    }

    const isStoreKeeper = await prisma.user.findFirst({
      where: {
        id: requestedTo
      },
      include: {
        role: {
          select: {
            name: true
          }
        }
      }
    });
    if(isStoreKeeper.role.name !== "Store") {
      return res.status(400).json({
        success: false,
        message: "You can only request item to storekeeper"
      });
    }

    for (let rawMaterial of rawMaterialRequested) {
      const rawMaterialData = await prisma.rawMaterial.findFirst({
        where: {
          id: rawMaterial.rawMaterialId,
        },
        select: {
          id: true,
          name: true,
          stock: true,
          unit: true,
        },
      });

      if (!rawMaterialData) {
        throw new Error(`Raw material not found: ${rawMaterial.rawMaterialId}`);
      }

      if (rawMaterial.quantity > rawMaterialData.stock) {
        throw new Error(
          `Requested quantity for ${rawMaterialData.name} exceeds available stock`
        );
      }
    }

    const result = await prisma.$transaction(async (tx) => {
      const newRequest = await tx.itemRequestData.create({
        data: {
          rawMaterialRequested,
          requestedTo,
          requestedBy: empId,
          isProcessRequest: false,
        },
      });

      return newRequest;
    });
    console.log("Pre-process: ", result);

    return res.status(200).json({
      success: true,
      message: "Pre-process item request created successfully",
      data: result,
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

const createInProcessItemRequest = async (req, res) => {
  try {
    const { serviceProcessId, rawMaterialRequested, requestedTo } = req.body;
    const empId = req.user.id;
    if (
      !serviceProcessId ||
      !rawMaterialRequested ||
      !requestedTo ||
      rawMaterialRequested.length === 0
    ) {
      throw new Error("All fields are required");
    }

    const isStoreKeeper = await prisma.user.findFirst({
      where: {
        id: requestedTo
      },
      include: {
        role: {
          select: {
            name: true
          }
        }
      }
    });
    if(isStoreKeeper.role.name !== "Store") {
      return res.status(400).json({
        success: false,
        message: "You can only request item to storekeeper"
      });
    }

    for (let rawMaterial of rawMaterialRequested) {
      const rawMaterialData = await prisma.rawMaterial.findFirst({
        where: {
          id: rawMaterial.rawMaterialId,
        },
        select: {
          id: true,
          name: true,
          stock: true,
          unit: true,
        },
      });

      if (!rawMaterialData) {
        throw new Error(`Raw material not found: ${rawMaterial.rawMaterialId}`);
      }

      if (rawMaterial.quantity > rawMaterialData.stock) {
        throw new Error(
          `Requested quantity for ${rawMaterialData.name} exceeds available stock`
        );
      }
    }

    const result = await prisma.$transaction(async (tx) => {
      const newRequest = await tx.itemRequestData.create({
        data: {
          serviceProcessId,
          rawMaterialRequested,
          requestedTo,
          requestedBy: empId,
          isProcessRequest: false,
        },
      });

      return newRequest;
    });

    return res.status(200).json({
      success: true,
      message: "In-process item request created successfully",
      data: result,
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

const createServiceProcess = async (req, res) => {
  try {
    const { item, subItem, serialNumber } = req.body;

    let itemTypeId, initialStageId;
    const empId = req?.user?.id;
    const empRole = req?.user?.role?.name;

    if (!item || !subItem || !serialNumber) {
      throw new Error("All fields are required");
    }

    if (empRole === "Disassemble") {
      const itemTypeData = await prisma.itemType.findFirst({
        where: { name: "SERVICE" },
        select: { id: true },
      });

      if (!itemTypeData) throw new Error("ItemType not found");
      itemTypeId = itemTypeData.id;

      const initialStageData = await prisma.stage.findFirst({
        where: { name: "Disassemble" },
        select: { id: true },
      });

      if (!initialStageData) throw new Error("Initial stage not found");
      initialStageId = initialStageData.id;
    } else if (empRole === "MPC Work") {
      const itemTypeData = await prisma.itemType.findFirst({
        where: { name: "NEW" },
        select: { id: true },
      });

      if (!itemTypeData) throw new Error("ItemType not found");
      itemTypeId = itemTypeData.id;

      const initialStageData = await prisma.stage.findFirst({
        where: { name: "MPC Work" },
        select: { id: true },
      });

      if (!initialStageData) throw new Error("Initial stage not found");
      initialStageId = initialStageData.id;
    } else {
      throw new Error("You are not allowed to create service process");
    }

    const newProcess = await prisma.$transaction(async (tx) => {
      const process = await tx.service_Process_Record.create({
        data: {
          item,
          subItem,
          itemTypeId,
          serialNumber,
          stageId: initialStageId,
          initialStageId,
          status: "IN_PROGRESS",
          createdBy: empId,
        },
      });

      await tx.stageActivity.create({
        data: {
          serviceProcessId: process.id,
          stageId: initialStageId,
          status: "IN_PROGRESS",
          isCurrent: true,
        },
      });

      return process;
    });

    return res.status(200).json({
      success: true,
      message: "Service process created with initial stage activity",
      data: newProcess,
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

const getProcessForUserStage = async (req, res) => {
  try {
    const userRole = req?.user?.role?.name;
    if (!userRole) {
      throw new Error("User Role Not Found");
    }

    const stageData = await prisma.stage.findFirst({
      where: {
        name: userRole,
      },
    });

    if (!stageData) {
      throw new Error("Stage Not Found");
    }

    const serviceProcessData = await prisma.service_Process_Record.findMany({
      where: {
        stage: stageData.id,
      },
      include: {
        itemType: true,
        stage: true,
        stageActivity: {
          where: {
            isCurrent: true,
          },
          include: {
            stage: true,
            user: true,
          },
        },
      },
      orderBy: {
        updatedAt: "desc",
      },
    });

    return res.status(200).json({
      success: true,
      message: "Processes fetched successfully",
      data: serviceProcessData,
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

const showUserItemStock = async (req, res) => {
  try {
    const empId = req?.user?.id;
    if (!empId) {
      throw new Error("Employee ID not found");
    }

    const itemStock = await prisma.userItemStock.findMany({
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
          stock: true,
          unit: true,
        },
      },
    });

    return res.status(200).json({
      success: true,
      message: "Data fetched successfully",
      data: itemStock || [],
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

const createItemUsageLog = async (req, res) => {
  try {
    const { serviceProcessId, rawMaterialList } = req.body;
    if (!serviceProcessId || !rawMaterialList || rawMaterialList.length === 0) {
      throw new Error("All fields are required");
    }

    const empId = req.user.id;
    if (!empId) {
      throw new Error("Employee ID Not Found");
    }

    for (let rawMaterial of rawMaterialList) {
      const existingRawMaterial = await prisma.rawMaterial.findFirst({
        where: {
          id: rawMaterial.id,
        },
      });

      if (!existingRawMaterial) {
        throw new Error("Raw Material Doesn't Exists");
      }

      const userItemStockData = await prisma.userItemStock.findFirst({
        where: {
          empId: empId,
          rawMaterialId: rawMaterial.id,
        },
      });
      if (!userItemStockData) {
        throw new Error("No items for user account");
      }

      if (userItemStockData.quantity < rawMaterial.quantity) {
        throw new Error("Raw material quantity is less in user account");
      }

      await prisma.userItemStock.update({
        where: {
          empId: empId,
          rawMaterialId: rawMaterial.id,
        },
        data: {
          quantity: {
            decrement: rawMaterial.quantity,
          },
        },
      });

      await prisma.itemUsage.create({
        data: {
          serviceProcessId,
          empId,
          rawMaterialId: existingRawMaterial.id,
          quantityUsed: rawMaterial.quantity,
          unit: rawMaterial.unit,
        },
      });
    }

    return res.status(200).json({
      success: true,
      message: "Process Item Usage Logged Successfully",
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

const updateStageAndMoveNext = async (req, res) => {
  try {
    const { serviceProcessId, status, failureReason, remarks } = req?.body;
    const empId = req?.user?.id;
    if (!serviceProcessId || !status) {
      return res.status(400).json({
        success: false,
        message: "All fields are required",
      });
    }

    // const roleStageName = req?.user?.role?.name;
    const processData = await prisma.service_Process_Record.findFirst({
      where: {
        id: serviceProcessId,
      },
      include: {
        stage: true,
        initialStage: true,
        itemType: true,
      },
    });

    if (!processData) {
      return res.status(400).json({
        success: false,
        message: "Process Not Found",
      });
    }

    const result = await prisma.$transaction(async (tx) => {
      const currentActivity = await prisma.stageActivity.findFirst({
        where: {
          serviceProcessId,
          stageId: processData?.stage?.id,
          isCurrent: true,
        },
      });

      if (!currentActivity) {
        throw new Error("Current stage activity not found");
      }

      const updatedCurrentActivity = await tx.stageActivity.update({
        where: {
          id: currentActivity.id,
        },
        data: {
          empId,
          status,
          failureReason: status === "FAILED" ? failureReason : null,
          remarks,
          isCurrent: false,
        },
        include: {
          stage: true,
          serviceProcess: {
            include: {
              itemType: true,
            },
          },
        },
      });

      if (
        updatedCurrentActivity?.stage?.name === "Testing" &&
        updatedCurrentActivity?.serviceProcess?.itemType?.name === "SERVICE"
      ) {
        if (updatedCurrentActivity?.status === "FAILED") {
          if (updatedCurrentActivity?.failureReason === "VIBRATION") {
            const getFailureRedirectStage = await tx.failureRedirect.findFirst({
              where: {
                itemTypeId:
                  updatedCurrentActivity?.serviceProcess?.itemType?.id,
                failureReason: "VIBRATION",
              },
            });
            if (!getFailureRedirectStage) {
              throw new Error(
                "Failure redirect stage not found for given reason"
              );
            }

            await tx.service_Process_Record.update({
              where: {
                id: serviceProcessId,
              },
              data: {
                stageId: getFailureRedirectStage?.redirectStageId,
                restartedFromStageId: getFailureRedirectStage?.redirectStageId,
                status: "REDIRECTED",
              },
            });

            await tx.stageActivity.create({
              data: {
                serviceProcessId,
                stageId: getFailureRedirectStage?.redirectStageId,
                status: "IN_PROGRESS",
                isCurrent: true,
              },
            });
          } else if (
            updatedCurrentActivity?.failureReason === "OVERLOAD" ||
            updatedCurrentActivity?.failureReason === "EARTHING"
          ) {
            const getFailureRedirectStage = await tx.failureRedirect.findFirst({
              where: {
                itemTypeId:
                  updatedCurrentActivity?.serviceProcess?.itemType?.id,
                failureReason: {
                  in: ["OVERLOAD", "EARTHING"],
                },
              },
            });
            if (!getFailureRedirectStage) {
              throw new Error(
                "Failure redirect stage not found for given reason"
              );
            }

            await tx.service_Process_Record.update({
              where: {
                id: serviceProcessId,
              },
              data: {
                stageId: getFailureRedirectStage?.redirectStageId,
                restartedFromStageId: getFailureRedirectStage?.redirectStageId,
                status: "REDIRECTED",
              },
            });

            await tx.stageActivity.create({
              data: {
                serviceProcessId,
                stageId: getFailureRedirectStage?.redirectStageId,
                status: "IN_PROGRESS",
                isCurrent: true,
              },
            });
          }
        } else if (updatedCurrentActivity?.status === "COMPLETED") {
          //logic for updating the stock for the service material
        }
      } else if (
        updatedCurrentActivity?.stage?.name === "Testing" &&
        updatedCurrentActivity?.serviceProcess?.itemType?.name === "NEW"
      ) {
        if (updatedCurrentActivity?.status === "FAILED") {
          if (updatedCurrentActivity?.failureReason === "VIBRATION") {
            const getFailureRedirectStage = await tx.failureRedirect.findFirst({
              where: {
                itemTypeId:
                  updatedCurrentActivity?.serviceProcess?.itemType?.id,
                failureReason: "VIBRATION",
              },
            });
            if (!getFailureRedirectStage) {
              throw new Error(
                "Failure redirect stage not found for given reason"
              );
            }

            await tx.service_Process_Record.update({
              where: {
                id: serviceProcessId,
              },
              data: {
                stageId: getFailureRedirectStage?.redirectStageId,
                restartedFromStageId: getFailureRedirectStage?.redirectStageId,
                status: "REDIRECTED",
              },
            });

            await tx.stageActivity.create({
              data: {
                serviceProcessId,
                stageId: getFailureRedirectStage?.redirectStageId,
                status: "IN_PROGRESS",
                isCurrent: true,
              },
            });
          } else if (
            updatedCurrentActivity?.failureReason === "OVERLOAD" ||
            updatedCurrentActivity?.failureReason === "EARTHING"
          ) {
            const getFailureRedirectStage = await tx.failureRedirect.findFirst({
              where: {
                itemTypeId:
                  updatedCurrentActivity?.serviceProcess?.itemType?.id,
                failureReason: {
                  in: ["OVERLOAD", "EARTHING"],
                },
              },
            });
            if (!getFailureRedirectStage) {
              throw new Error(
                "Failure redirect stage not found for given reason"
              );
            }

            await tx.service_Process_Record.update({
              where: {
                id: serviceProcessId,
              },
              data: {
                stageId: getFailureRedirectStage?.redirectStageId,
                restartedFromStageId: getFailureRedirectStage?.redirectStageId,
                status: "REDIRECTED",
              },
            });

            await tx.stageActivity.create({
              data: {
                serviceProcessId,
                stageId: getFailureRedirectStage?.redirectStageId,
                status: "IN_PROGRESS",
                isCurrent: true,
              },
            });
          }
        } else if (updatedCurrentActivity?.status === "COMPLETED") {
          //logic to updating the stock for new material
        }
      }

      if (
        updatedCurrentActivity?.stage?.name !== "Testing" &&
        updatedCurrentActivity?.serviceProcess?.itemType?.name === "SERVICE"
      ) {
        if (updatedCurrentActivity?.status === "COMPLETED") {
          const stageFlow = await tx.stageFlow.findFirst({
            where: {
              itemTypeId: updatedCurrentActivity?.serviceProcess?.itemType?.id,
              currentStageId: updatedCurrentActivity?.stage?.id,
            },
          });

          if (!stageFlow) {
            return res.status(400).json({
              success: false,
              message: "Stage Flow Not Found",
            });
          }

          await tx.service_Process_Record.update({
            where: {
              id: serviceProcessId,
            },
            data: {
              stageId: stageFlow?.nextStageId,
              //restartedFromStageId: getFailureRedirectStage?.redirectStageId,
            },
          });
          await tx.stageActivity.create({
            data: {
              serviceProcessId,
              stageId: stageFlow?.nextStageId,
              status: "IN_PROGRESS",
              isCurrent: true,
            },
          });
        }
      } else if (
        updatedCurrentActivity?.stage?.name !== "Testing" &&
        updatedCurrentActivity?.serviceProcess?.itemType?.name === "NEW"
      ) {
        if (updatedCurrentActivity?.status === "COMPLETED") {
          const stageFlow = await tx.stageFlow.findFirst({
            where: {
              itemTypeId: updatedCurrentActivity?.serviceProcess?.itemType?.id,
              currentStageId: updatedCurrentActivity?.stage?.id,
            },
          });

          if (!stageFlow) {
            return res.status(400).json({
              success: false,
              message: "Stage Flow Not Found",
            });
          }

          await tx.service_Process_Record.update({
            where: {
              id: serviceProcessId,
            },
            data: {
              stageId: stageFlow?.nextStageId,
              //restartedFromStageId: getFailureRedirectStage?.redirectStageId,
            },
          });
          await tx.stageActivity.create({
            data: {
              serviceProcessId,
              stageId: stageFlow?.nextStageId,
              status: "IN_PROGRESS",
              isCurrent: true,
            },
          });
        }
      }
      return updatedCurrentActivity;
    });

    return res.status(200).json({
      success: true,
      message: "Stage completed - process moved to next stage",
      data: {
        activity: result,
        processId: serviceProcessId,
      },
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
  showStorePersons,
  rawMaterialForItemRequest,
  createPreProcessItemRequest,
  createInProcessItemRequest,
  createServiceProcess,
  getProcessForUserStage,
  showUserItemStock,
  createItemUsageLog,
  updateStageAndMoveNext,
};
