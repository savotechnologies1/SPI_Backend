const prisma = require("../config/prisma");
const {
  paginationQuery,
  pagination,
  fileUploadFunc,
} = require("../functions/common");
const crypto = require("crypto");
const stationLogout = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id)
      return res
        .status(400)
        .json({ message: "Production Response ID required." });

    await prisma.productionResponse.update({
      where: { id: id },
      data: {
        cycleTimeEnd: new Date(),
        submittedDateTime: new Date(),
      },
    });

    return res
      .status(200)
      .json({ message: "You have successfully logged out." });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};
const stationLogin = async (req, res) => {
  try {
    const { processId, stationUserId, type } = req.body;
    
    if (!stationUserId || !processId) {
      return res
        .status(400)
        .json({ message: "Invalid Station User or Process ID." });
    }

    if (type === "training") {
      await prisma.productionResponse.updateMany({
        where: {
          stationUserId: stationUserId,
          processId: processId,
          type: "training",
          isDeleted: false,
        },
        data: {
          isDeleted: true, 
        },
      });
    }

    const processLoginData = await prisma.productionResponse.create({
      data: {
        process: { connect: { id: processId } },
        employeeInfo: { connect: { id: stationUserId } },
        type,
        traniningStatus: false,
        cycleTimeStart: new Date(),
        order_type: type === "training" ? "Training" : "N/A",
      },
    });

    return res.status(200).json({
      message: "Logged in. Training restarted from Part 1.",
      data: processLoginData,
    });
  } catch (error) {
    console.log('errorerror', error);
    return res.status(500).json({ message: error.message });
  }
};
const createProductionResponse = async (req, res) => {
  try {
    const {
      orderId,
      partId,
      processId,
      quantity,
      scrap,
      cycleTimeStart,
      cycleTimeEnd,
      firstName,
      lastName,
      completed,
    } = req.body;

    const user = req.user;
    const now = new Date();
    const submittedBy = `${firstName} ${lastName}`;
    const stockOrder = await prisma.stockOrder.findUnique({
      where: { id: orderId },
    });

    if (!stockOrder) {
      return res.status(404).json({ message: "Order not found." });
    }
    const totalProductQuantity = stockOrder.productQuantity;
    const existing = await prisma.productionResponse.findFirst({
      where: {
        orderId,
        employeeId: user.id,
        isDeleted: false,
      },
    });

    if (existing) {
      const newCompletedQty =
        existing.completedQuantity + (completed ? quantity : 0);
      if (completed && newCompletedQty > totalProductQuantity) {
        return res.status(400).json({
          message: "Completed quantity exceeds total product quantity.",
        });
      }
      if (completed && newCompletedQty === totalProductQuantity) {
        return res.status(200).json({
          message: "Production fully completed!",
        });
      }
      if (completed) {
        await prisma.productionResponse.update({
          where: { id: existing.id },
          data: {
            completedQuantity: newCompletedQty,
            updatedAt: now,
          },
        });

        return res.status(200).json({
          message: "Production response updated successfully!",
        });
      }

      return res.status(200).json({
        message: "Response logged without marking as completed.",
      });
    } else {
      const newCompletedQty = completed ? quantity : 0;
      if (completed && newCompletedQty > totalProductQuantity) {
        prisma.stockOrder.update({
          where: {
            id: orderId,
          },
          data: {
            isDeleted: true,
          },
        });
        return res.status(400).json({
          message: "Completed quantity exceeds total product quantity.",
        });
      }

      if (completed && newCompletedQty === totalProductQuantity) {
        await prisma.productionResponse.create({
          data: {
            orderId,
            partId,
            processId,
            quantity,
            scrap,
            cycleTimeStart,
            cycleTimeEnd,
            submittedBy,
            employeeId: user.id,
            submittedDate: now,
            submittedTime: now,
            completedQuantity: 0,
          },
        });

        return res.status(201).json({
          message: "Production fully completed!",
        });
      }

      await prisma.productionResponse.create({
        data: {
          orderId,
          partId,
          processId,
          quantity,
          scrap,
          cycleTimeStart,
          cycleTimeEnd,
          submittedBy,
          employeeId: user.id,
          submittedDate: now,
          submittedTime: now,
          completedQuantity: newCompletedQty,
        },
      });

      return res.status(201).json({
        message: "Production response created successfully!",
      });
    }
  } catch (error) {
    return res.status(500).json({
      message: "Something went wrong. Please try again later.",
    });
  }
};
const getNextJobDetails = async (req, res) => {
  try {
    const { id: processId } = req.params;
    const nextJob = await prisma.stockOrderSchedule.findFirst({
      where: {
        processId: processId,
        status: "new",
        isDeleted: false,
      },
      orderBy: [{ schedule_date: "asc" }, { type: "asc" }],
      select: {
        id: true,
        order_id: true,
        order_type: true,
        part_id: true,
        processId: true,
        schedule_date: true,
      },
    });
    let orderDetailsPromise;
    const commonOrderSelect = {
      orderNumber: true,
      orderDate: true,
      shipDate: true,
      productQuantity: true,
      customer: {
        select: {
          firstName: true,
          lastName: true,
        },
      },
    };

    if (nextJob.order_type === "StockOrder") {
      orderDetailsPromise = prisma.stockOrder.findUnique({
        where: { id: nextJob.order_id },
        select: commonOrderSelect,
      });
    } else if (nextJob.order_type === "CustomOrder") {
      orderDetailsPromise = prisma.customOrder.findUnique({
        where: { id: nextJob.order_id },
        select: commonOrderSelect,
      });
    } else {
      orderDetailsPromise = Promise.resolve(null);
    }
    const [orderDetails, partDetails, workInstructions] = await Promise.all([
      orderDetailsPromise,

      prisma.partNumber.findUnique({
        where: { part_id: nextJob.part_id },
        select: {
          part_id: true,
          partNumber: true,
          partDescription: true,
          partImages: {
            select: { imageUrl: true },
            where: { isDeleted: false },
          },
          components: {
            where: { isDeleted: false },
            select: {
              partQuantity: true,
              part: {
                select: {
                  partNumber: true,
                  partDescription: true,
                },
              },
            },
          },
        },
      }),

      prisma.workInstruction.findMany({
        where: {
          productId: nextJob.part_id,
          processId: nextJob.processId,
          isDeleted: false,
        },
        select: {
          instructionTitle: true,
          steps: {
            where: { isDeleted: false },
            orderBy: { stepNumber: "asc" },
            select: {
              stepNumber: true,
              title: true,
              instruction: true,
              images: {
                select: { imagePath: true },
                where: { isDeleted: false },
              },
              videos: {
                select: { videoPath: true },
                where: { isDeleted: false },
              },
            },
          },
        },
      }),
    ]);

    if (!orderDetails) {
      return res.status(404).json({
        message: `Parent order with ID ${nextJob.order_id} could not be found for this job schedule.`,
      });
    }

    const jobDetails = {
      scheduleId: nextJob.id,
      order: orderDetails,
      part: partDetails,
      workInstructions:
        workInstructions.length > 0 ? workInstructions[0] : null,
    };

    return res.status(200).json({
      message: "Next job details retrieved successfully.",
      data: jobDetails,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Something went wrong fetching job details.",
      error: error.message,
    });
  }
};
const selectScheduleProcess = async (req, res) => {
  try {
    const stationUser = req.user;

    const findNextJobForPartProcess = (processId) => {
      return prisma.stockOrderSchedule.findFirst({
        where: {
          isDeleted: false,
          status: { in: ["new", "progress"] },
          type: "part",
          part: { processId },
        },
        include: { StockOrder: true, part: true },
        orderBy: { createdAt: "asc" },
      });
    };

    const findNextJobForProductProcess = (processId, orderId) => {
      return prisma.stockOrderSchedule.findFirst({
        where: {
          isDeleted: false,
          status: { in: ["new", "progress"] },
          type: "product",
          processId,
          order_id: orderId,
        },
        include: { StockOrder: true, part: true },
        orderBy: { createdAt: "asc" },
      });
    };

    const allProcesses = await prisma.process.findMany({
      where: { isDeleted: false },
      select: { id: true, processName: true, type: true, machineName: true },
    });

    if (!allProcesses.length) {
      return res.status(404).json({ message: "No processes found." });
    }

    const activeSchedules = await prisma.stockOrderSchedule.findMany({
      where: { isDeleted: false, status: { in: ["new", "progress"] } },
      include: { part: true },
    });

    const processOverviews = await Promise.all(
      allProcesses.map(async (process) => {
        let nextJob = null;

        if (process.type === "part") {
          const hasActivePart = activeSchedules.some(
            (s) => s.type === "part" && s.part?.processId === process.id,
          );

          if (hasActivePart) {
            nextJob = await findNextJobForPartProcess(process.id);
          }
        }

        if (process.type === "product") {
          const productSchedules = activeSchedules.filter(
            (s) => s.type === "product" && s.processId === process.id,
          );

          if (productSchedules.length) {
            const orderId = productSchedules[0].order_id;
            const partSchedules = await prisma.stockOrderSchedule.findMany({
              where: {
                order_id: orderId,
                type: "part",
                isDeleted: false,
              },
              select: { status: true },
            });

            const allPartsDone = partSchedules.every(
              (p) => p.status === "completed",
            );

            if (allPartsDone) {
              nextJob = await findNextJobForProductProcess(process.id, orderId);
            }
          }
        }

        return {
          processId: process.id,
          processName: process.processName,
          machineName: process.machineName,
          nextJob: nextJob || null,
        };
      }),
    );

    let stationUsers = [];

    if (stationUser.role === "Shop_Floor") {
      const employees = await prisma.employee.findMany({
        where: { isDeleted: false },
        select: {
          id: true,
          employeeId: true,
          email: true,
          fullName: true,
        },
      });

      stationUsers = employees.map((e) => ({
        id: e.id,
        name: e.fullName,
        employeeId: e.employeeId,
        email: e.email,
      }));
    } else {
      const employees = await prisma.employee.findMany({
        where: { isDeleted: false },
        select: {
          id: true,
          employeeId: true,
          email: true,
          fullName: true,
        },
      });

      stationUsers = employees.map((e) => ({
        id: e.id,
        name: e.fullName,
        employeeId: e.employeeId,
        email: e.email,
      }));
    }

    return res.status(200).json({ processOverviews, stationUsers });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Something went wrong.", error: error.message });
  }
};
const findNextJobForProcess = async (processId) => {
  const findAndStitchJob = async (findOptions) => {
    const schedule = await prisma.stockOrderSchedule.findFirst({
      ...findOptions,
      include: {
        part: {
          select: {
            partNumber: true,
          },
        },
        process: { select: { processName: true } },
      },
    });

    if (!schedule) return null;

    let orderData = null;
    const orderSelectFields = {
      orderNumber: true,
      shipDate: true,
    };

    if (schedule.order_type === "StockOrder" && schedule.order_id) {
      orderData = await prisma.stockOrder.findUnique({
        where: { id: schedule.order_id },
        select: orderSelectFields,
      });
    } else if (schedule.order_type === "CustomOrder" && schedule.order_id) {
      orderData = await prisma.customOrder.findUnique({
        where: { id: schedule.order_id },
        select: orderSelectFields,
      });
    }

    return { ...schedule, order: orderData };
  };

  while (true) {
    let potentialJob = null;

    potentialJob = await findAndStitchJob({
      where: { processId, status: "progress", isDeleted: false },
    });

    if (!potentialJob) {
      const lastCompletedPartJob = await prisma.stockOrderSchedule.findFirst({
        where: {
          processId,
          status: "completed",
          type: "part",
          isDeleted: false,
        },
        orderBy: { updatedAt: "desc" },
      });

      if (lastCompletedPartJob) {
        const pendingPartsCount = await prisma.stockOrderSchedule.count({
          where: {
            order_id: lastCompletedPartJob.order_id,
            order_type: lastCompletedPartJob.order_type,
            type: "part",
            status: { not: "completed" },
            isDeleted: false,
          },
        });

        if (pendingPartsCount === 0) {
          potentialJob = await findAndStitchJob({
            where: {
              order_id: lastCompletedPartJob.order_id,
              order_type: lastCompletedPartJob.order_type,
              type: "product",
              status: { in: ["new", "progress"] },
              isDeleted: false,
            },
          });
        }
      }
    }
    if (!potentialJob) {
      potentialJob = await findAndStitchJob({
        where: { processId, status: "new", isDeleted: false },
        orderBy: [{ type: "asc" }, { createdAt: "asc" }],
      });
    }
    if (!potentialJob) {
      return null;
    }
    if (potentialJob.remainingQty > 0) {
      return potentialJob;
    }
    if (potentialJob.status !== "completed") {
      await prisma.stockOrderSchedule.update({
        where: { id: potentialJob.id },
        data: { status: "completed", completed_date: new Date() },
      });
    }
  }
};
const completeScheduleOrder = async (req, res) => {
  try {
    const { id: productionResponseId } = req.params;
    const { orderId, partId, completedBy, employeeId, order_type, productId } = req.body;
    const now = new Date();
    const result = await prisma.$transaction(async (tx) => {
      const currentSchedule = await tx.stockOrderSchedule.findFirst({
        where: {
          order_id: orderId,
          OR: [
            { part_id: partId },
            { customPartId: partId }
          ],
          order_type,
          isDeleted: false,
        },
      });

      if (!currentSchedule) throw new Error("Stock order schedule not found.");
      const activeProcessId = currentSchedule.processId;
      const { completedQuantity = 0, quantity = 0, remainingQty = 0 } = currentSchedule;
      if (completedQuantity >= quantity) {
        throw new Error("Order is already fully completed.");
      }
      await tx.productionResponse.update({
        where: { id: productionResponseId },
        data: {
          completedQuantity: { increment: 1 },
          remainingQty: remainingQty > 0 ? remainingQty - 1 : 0,
          cycleTimeEnd: now,
          submittedDateTime: now,
          stationUserId: employeeId,
          partId: currentSchedule.part_id ? currentSchedule.part_id : null,
        },
      });

      const newCompletedQty = completedQuantity + 1;
      const newRemainingQty = Math.max(0, remainingQty - 1);
      const isFinished = newCompletedQty >= quantity;
      const updatedStatus = isFinished ? "completed" : "progress";

      await tx.stockOrderSchedule.update({
        where: { id: currentSchedule.id },
        data: {
          completedQuantity: newCompletedQty,
          remainingQty: newRemainingQty,
          completed_date: isFinished ? now : null,
          status: updatedStatus,
          completed_by: completedBy,
          completed_EmpId: employeeId,
        },
      });

      if (isFinished && productId) {
        await tx.partNumber.update({
          where: { part_id: productId },
          data: { availStock: { increment: 1 } },
        });
      }

      let nextSession = null;

      if (!isFinished) {
        nextSession = await tx.productionResponse.create({
          data: {
            processId: activeProcessId,
            stationUserId: employeeId,
            partId: currentSchedule.part_id ? currentSchedule.part_id : null,
            orderId: order_type === "StockOrder" ? orderId : null,
            customOrderId: order_type === "CustomOrder" ? orderId : null,
            order_type: order_type,
            cycleTimeStart: now,
            completedQuantity: 0,
            remainingQty: newRemainingQty,
            scrap: false,
          },
        });
      } else {
        const nextJobInQueue = await tx.stockOrderSchedule.findFirst({
          where: {
            processId: activeProcessId,
            status: { in: ["new", "progress"] },
            isDeleted: false,
            id: { not: currentSchedule.id },
          },
          orderBy: { createdAt: "asc" },
        });

        if (nextJobInQueue) {
          nextSession = await tx.productionResponse.create({
            data: {
              processId: activeProcessId,
              stationUserId: employeeId,
              partId: nextJobInQueue.part_id ? nextJobInQueue.part_id : null,
              orderId: nextJobInQueue.order_type === "StockOrder" ? nextJobInQueue.order_id : null,
              customOrderId: nextJobInQueue.order_type === "CustomOrder" ? nextJobInQueue.order_id : null,
              order_type: nextJobInQueue.order_type,
              cycleTimeStart: now,
              completedQuantity: 0,
              remainingQty: nextJobInQueue.remainingQty || 0,
              scrap: false,
            },
          });
        }
      }

      return {
        message: isFinished ? "Order completed." : "Part completed, next session started.",
        status: updatedStatus,
        newProductionId: nextSession?.id || null,
        remaining: newRemainingQty
      };
    });

    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};
const scrapScheduleOrder = async (req, res) => {
  try {
    const { id: productionResponseId } = req.params;
    const { orderId, partId, completedBy, employeeId, order_type } = req.body;
    const now = new Date();

    const result = await prisma.$transaction(async (tx) => {
      const currentSchedule = await tx.stockOrderSchedule.findFirst({
        where: {
          order_id: orderId,
          OR: [
            { part_id: partId },
            { customPartId: partId }
          ],
          order_type,
          isDeleted: false,
        },
      });

      if (!currentSchedule) throw new Error("Job Schedule not found.");
      const activeProcessId = currentSchedule.processId;

      await tx.productionResponse.update({
        where: { id: productionResponseId },
        data: {
          scrap: true,
          scrapQuantity: { increment: 1 },
          cycleTimeEnd: now,
          submittedDateTime: now,
          stationUserId: employeeId,
          partId: currentSchedule.part_id || null
        },
      });

      await tx.stockOrderSchedule.update({
        where: { id: currentSchedule.id },
        data: {
          scrapQuantity: { increment: 1 },
          status: "progress",
        },
      });


      const nextSession = await tx.productionResponse.create({
        data: {
          processId: activeProcessId,
          stationUserId: employeeId,
          partId: currentSchedule.part_id ? currentSchedule.part_id : null,
          orderId: order_type === "StockOrder" ? orderId : null,
          customOrderId: order_type === "CustomOrder" ? orderId : null,
          order_type: order_type,
          cycleTimeStart: new Date(),
          completedQuantity: 0,
          scrap: false,
        },
      });

      return {
        message: "Scrap processed. New session started for the same part.",
        newProductionId: nextSession.id,
        isOrderFinished: false
      };
    });

    return res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
const updateStepTime = async (req, res) => {
  try {
    const { productionId, stepId } = req.body;

    if (!productionId || !stepId) {
      return res
        .status(400)
        .json({ message: "Production ID and Step ID are required." });
    }

    const now = new Date();

    await prisma.$transaction(async (tx) => {
      await tx.productionStepTracking.updateMany({
        where: { productionResponseId: productionId, status: "in-progress" },
        data: { stepEndTime: now, status: "completed" },
      });

      await tx.productionStepTracking.create({
        data: {
          productionResponseId: productionId,
          workInstructionStepId: stepId,
          stepStartTime: now,
          status: "in-progress",
        },
      });
    });

    return res
      .status(200)
      .json({ message: "Step timer updated successfully." });
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
};
const completeTraning = async (req, res) => {
  try {
    const { id } = req.params;
    const now = new Date();

    await prisma.$transaction([
      prisma.productionResponse.update({
        where: { id: id },
        data: {
          traniningStatus: true,
          cycleTimeEnd: now,
          updatedAt: now,
        },
      }),
      prisma.productionStepTracking.updateMany({
        where: { productionResponseId: id, status: "in-progress" },
        data: { stepEndTime: now, status: "completed" },
      }),
    ]);

    return res.status(200).json({
      message: "Training completed!",
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};
const barcodeScan = async (req, res) => {
  try {
    const { barcode } = req.body;
    const part = await prisma.part.findUnique({ where: { barcode } });
    if (!part) {
      return res.status(404).json({ message: " Invalid barcode" });
    }
    const order = await prisma.stockOrderSchedule.findFirst({
      where: {
        part_id: part.id,
        status: { not: "completed" },
      },
    });

    if (!order) {
      return res.status(404).json({ message: " No active order found" });
    }

    const newQty = order.completedQuantity + 1;
    const status = newQty === order.quantity ? "completed" : "progress";

    await prisma.stockOrderSchedule.update({
      where: {
        order_id_part_id: { order_id: order.order_id, part_id: part.id },
      },
      data: {
        completedQuantity: newQty,
        status,
        completed_date: status === "completed" ? new Date() : undefined,
      },
    });

    res.json({
      message:
        status === "completed" ? " Order Completed!" : " Order In Progress",
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
const processBarcodeScan = async (req, res) => {
  try {
    const { id } = req.params;
    const { barcode, employeeId } = req.body;

    const partInstance = await prisma.stockOrderSchedule.findUnique({
      where: { barcode: barcode },
    });

    if (!partInstance) {
      return res
        .status(404)
        .json({ message: "Invalid Barcode. Part not found." });
    }

    if (
      partInstance.status === "COMPLETED" ||
      partInstance.status === "SCRAPPED"
    ) {
      return res.status(409).json({
        message: `This part (${barcode}) has already been processed.`,
      });
    }

    const { orderId, partId } = partInstance;

    await prisma.productionResponse.update({
      where: { id },
      data: {
        quantity: true,
        scrap: false,
        cycleTimeEnd: new Date(),
      },
    });

    const orderSchedule = await prisma.stockOrderSchedule.findUnique({
      where: { order_id_part_id: { order_id: orderId, part_id: partId } },
    });

    if (!orderSchedule) {
      return res
        .status(404)
        .json({ message: "Stock order schedule not found for this part." });
    }

    const newCompletedQty = (orderSchedule.completedQuantity || 0) + 1;
    const updatedStatus =
      newCompletedQty === orderSchedule.quantity ? "completed" : "progress";

    await prisma.stockOrderSchedule.update({
      where: { order_id_part_id: { order_id: orderId, part_id: partId } },
      data: {
        completedQuantity: newCompletedQty,
        completed_date: updatedStatus === "completed" ? new Date() : undefined,
        status: updatedStatus,
      },
    });

    await prisma.productionResponse.updateMany({
      where: { id, stationUserId: employeeId, partId, orderId },
      data: { completedQuantity: { increment: 1 } },
    });

    await prisma.partInstance.update({
      where: { id: partInstance.id },
      data: { status: "COMPLETED" },
    });

    return res.status(200).json({
      message: "Part completed successfully!",
      status: updatedStatus,
    });
  } catch (error) {
    res.status(500).json({ message: "An error occurred on the server." });
  }
};
const deleteScheduleOrder = async (req, res) => {
  try {
    const id = req.params.id;
    const orderId = req?.query.orderId;
    const schedule = await prisma.stockOrderSchedule.findUnique({
      where: { id },
    });

    if (!schedule) {
      return res.status(404).json({ message: "Schedule not found" });
    }

    const orderType = schedule.order_type;

    await prisma.stockOrderSchedule.delete({
      where: { id },
    });

    const remainingSchedules = await prisma.stockOrderSchedule.count({
      where: { order_id: orderId },
    });

    if (remainingSchedules === 0) {
      if (orderType === "StockOrder") {
        await prisma.stockOrder.delete({
          where: { id: orderId },
          data: { isDeleted: true },
        });
      } else if (orderType === "CustomOrder") {
        await prisma.customOrder.delete({
          where: { id: orderId },
          data: { isDeleted: true },
        });
      }
    }

    return res.status(200).json({
      message: "Schedule deleted successfully!",
      parentOrderDeleted:
        remainingSchedules === 0
          ? "Parent order also deleted"
          : "Parent order kept",
    });
  } catch (error) {
    return res.status(500).send({
      message: "Something went wrong. Please try again later.",
      error: error.message,
    });
  }
};
const scrapEntry = async (req, res) => {
  try {
    const {
      type,
      partId,
      processId,
      returnQuantity,
      scrapStatus,
      supplierId,
      customerId,
      defectDesc,
    } = req.body;

    const part = await prisma.partNumber.findUnique({
      where: { part_id: partId },
      select: { availStock: true },
    });

    if (!part) {
      return res.status(404).json({ error: "Part not found" });
    }

    if ((part.availStock ?? 0) < Number(returnQuantity)) {
      return res.status(400).json({
        message: "Insufficient stock to scrap the requested quantity",
      });
    }

    const dataForPrisma = {
      type,
      returnQuantity: Number(returnQuantity),
      scrapStatus: scrapStatus === "yes",
      PartNumber: {
        connect: { part_id: partId },
      },
      defectDesc: defectDesc,
    };

    if (supplierId) {
      dataForPrisma.supplier = {
        connect: { id: supplierId },
      };
    } else if (customerId) {
      dataForPrisma.customers = {
        connect: { id: customerId },
      };
    }

    if (processId) {
      dataForPrisma.process = {
        connect: { id: processId },
      };
    }

    if (req.user?.role === "superAdmin") {
      dataForPrisma.createdByAdmin = {
        connect: { id: req.user.id },
      };
    } else if (
      ["employee", "Shop_Floor", "Frontline_Manager"].includes(req.user?.role)
    ) {
      dataForPrisma.createdByEmployee = {
        connect: { id: req.user.id },
      };
    } else {
      return res.status(403).json({
        message: "User role not authorized",
      });
    }
    const [newEntry] = await prisma.$transaction([
      prisma.scapEntries.create({
        data: dataForPrisma,
      }),
      prisma.partNumber.update({
        where: { part_id: partId },
        data: {
          availStock: {
            decrement: Number(returnQuantity),
          },
        },
      }),
    ]);

    return res.status(201).json({
      message: "Scrap entry created successfully",
      data: newEntry,
    });
  } catch (error) {
    if (error.code === "P2025") {
      return res.status(404).json({
        message: "Invalid reference ID provided",
      });
    }

    return res.status(500).json({
      message: "Internal server error",
    });
  }
};
const completeScheduleOrderViaGet = async (req, res) => {
  try {
    const { id, orderId, partId, employeeId, productId } = req.query;

    if (!id || !orderId || !partId || !employeeId || !productId) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    await prisma.productionResponse.update({
      where: { id },
      data: {
        quantity: true,
        scrap: false,
        cycleTimeEnd: new Date(),
      },
    });

    const orderSchedule = await prisma.stockOrderSchedule.findUnique({
      where: {
        order_id_part_id: {
          order_id: orderId,
          part_id: partId,
        },
      },
    });
    if (!orderSchedule) {
      return res
        .status(404)
        .json({ message: "Stock order schedule not found." });
    }

    const { completedQuantity = 0, quantity } = orderSchedule;
    if (completedQuantity >= quantity) {
      return res.status(400).json({
        message: "Order is already fully completed.",
        status: "completed",
      });
    }

    const newCompletedQty = completedQuantity + 1;
    const updatedStatus =
      newCompletedQty === quantity ? "completed" : "progress";

    await prisma.stockOrderSchedule.update({
      where: {
        order_id_part_id: {
          order_id: orderId,
          part_id: partId,
        },
      },
      data: {
        completedQuantity: newCompletedQty,
        completed_date: newCompletedQty === quantity ? new Date() : undefined,
        status: updatedStatus,
      },
    });

    if (updatedStatus === "progress") {
      await prisma.partNumber.update({
        where: { part_id: partId },
        data: {
          availStock: { decrement: 1 },
        },
      });
    }

    if (updatedStatus === "completed") {
      await prisma.partNumber.update({
        where: { part_id: productId },
        data: {
          availStock: { increment: 1 },
        },
      });
    }

    await prisma.productionResponse.updateMany({
      where: {
        id,
        stationUserId: employeeId,
        partId: partId,
        orderId: orderId,
      },
      data: {
        completedQuantity: { increment: 1 },
      },
    });

    return res.status(200).json({
      message:
        updatedStatus === "completed"
          ? "Order scheduling completed."
          : "This order has been added as completed.",
      status: updatedStatus,
    });
  } catch (error) {
    return res.status(500).json({ message: "Internal server error" });
  }
};
const allScrapEntires = async (req, res) => {
  try {
    const paginationData = await paginationQuery(req.query);
    const { filterScrap, search } = req.query;
    const user = req.user;

    const condition = { isDeleted: false };
    if (filterScrap && filterScrap.toLowerCase() !== "all")
      condition.type = filterScrap;

    if (user?.role === "Shop_Floor" && user?.id) {
      condition.OR = [
        { createdByEmployeeId: user.id },
        { employeeId: user.id },
      ];
    }

    if (search) {
      condition.OR = [
        { supplier: { firstName: { contains: search } } },
        { PartNumber: { partNumber: { contains: search } } },
      ];
    }

    const [allProcess, totalCount] = await Promise.all([
      prisma.scapEntries.findMany({
        where: condition,
        skip: paginationData.skip,
        take: paginationData.pageSize,
        include: {
          PartNumber: {
            select: {
              part_id: true,
              partNumber: true,
              partDescription: true,
              supplier: {
                select: {
                  companyName: true,
                },
              },
              supplier_orders: {
                where: { isDeleted: false },
                take: 1,
                orderBy: { createdAt: "desc" },
                include: {
                  supplier: {
                    select: { firstName: true, lastName: true },
                  },
                },
              },
            },
          },
          supplier: { select: { firstName: true, lastName: true } },
          createdByAdmin: { select: { name: true } },
          createdByEmployee: { select: { firstName: true, lastName: true } },
        },
      }),
      prisma.scapEntries.count({ where: condition }),
    ]);
    const employeeIds = [
      ...new Set(allProcess.map((item) => item.employeeId).filter(Boolean)),
    ];
    let employeesMap = {};
    if (employeeIds.length > 0) {
      const employeesData = await prisma.employee.findMany({
        where: { id: { in: employeeIds } },
        select: { id: true, firstName: true, lastName: true },
      });
      employeesMap = employeesData.reduce((acc, emp) => {
        acc[emp.id] = emp;
        return acc;
      }, {});
    }

    const dataWithDetails = allProcess.map((item) => {
      let finalSupplierName = "N/A";
      if (item.supplier) {
        finalSupplierName =
          `${item.supplier.firstName || ""} ${item.supplier.lastName || ""}`.trim();
      } else if (item.PartNumber?.supplier_orders?.length > 0) {
        const s = item.PartNumber.supplier_orders[0].supplier;
        if (s) {
          finalSupplierName = `${s.firstName || ""} ${s.lastName || ""}`.trim();
        }
      }

      return {
        ...item,
        supplierName: finalSupplierName,
        employeeDetails: item.employeeId
          ? employeesMap[item.employeeId] || null
          : null,
      };
    });

    const getPagination = await pagination({
      page: paginationData.page,
      pageSize: paginationData.pageSize,
      total: totalCount,
    });

    return res.status(200).json({
      message: "Scrap entries retrieved successfully!",
      data: dataWithDetails,
      totalCount,
      pagination: getPagination,
    });
  } catch (error) {
    return res.status(500).send({ message: "Something went wrong." });
  }
};
const selectScheudlePartNumber = async (req, res) => {
  try {
    const process = await prisma.partNumber.findMany({
      select: {
        part_id: true,
        partNumber: true,
      },
      where: {
        type: "part",
        isDeleted: false,
        usedAsPart: {
          some: {
            status: { not: "completed" },
            isDeleted: false,
          },
        },
      },
    });

    const formattedProcess = process.map((process) => ({
      id: process.part_id,
      partNumber: process.partNumber,
    }));
    res.status(200).json({
      data: formattedProcess,
    });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Something went wrong . please try again later ." });
  }
};
const selectScheudleProductNumber = async (req, res) => {
  try {
    const process = await prisma.partNumber.findMany({
      select: {
        part_id: true,
        partNumber: true,
      },
      where: {
        type: "product",
        isDeleted: false,
        StockOrder_StockOrder_productNumberToPartNumber: {
          some: {
            isDeleted: false,
            status: { equals: "scheduled" },
          },
        },
      },
    });

    const formattedProcess = process.map((process) => ({
      id: process.part_id,
      partNumber: process.partNumber,
    }));
    res.status(200).json({
      data: formattedProcess,
    });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Something went wrong . please try again later ." });
  }
};
const getScrapEntryById = async (req, res) => {
  try {
    const { id } = req.params;

    const entry = await prisma.scapEntries.findUnique({
      where: { id },
      include: {
        PartNumber: {
          select: {
            part_id: true,
            partNumber: true,
          },
        },
        supplier: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            companyName: true,
          },
        },
        customers: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    if (!entry) {
      return res.status(404).json({ error: "Scrap entry not found" });
    }
    const formattedData = {
      ...entry,
      customerName: entry.customers
        ? `${entry.customers.firstName} ${entry.customers.lastName}`.trim()
        : null,
    };

    res.status(200).json({ data: formattedData });
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
};
const updateScrapEntry = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      type,
      partId,
      returnQuantity,
      scrapStatus,
      supplierId,
      customerId,
      defectDesc,
      processId,
    } = req.body;

    const existingEntry = await prisma.scapEntries.findUnique({
      where: { id },
    });

    if (!existingEntry) {
      return res.status(404).json({ message: "Scrap entry not found" });
    }

    const part = await prisma.partNumber.findUnique({
      where: { part_id: existingEntry.partId },
      select: { availStock: true },
    });

    if (!part) {
      return res.status(404).json({ error: "Part not found" });
    }

    const oldQty = existingEntry.returnQuantity ?? 0;
    const newQty = Number(returnQuantity);
    const adjustedStock = (part.availStock ?? 0) + oldQty - newQty;

    if (adjustedStock < 0) {
      return res.status(400).json({
        message: "Insufficient stock to update scrap",
      });
    }
    const isScrapTrue = scrapStatus === "yes" || scrapStatus === true;

    const [updatedEntry] = await prisma.$transaction([
      prisma.scapEntries.update({
        where: { id },
        data: {
          type,
          partId,
          returnQuantity: newQty,
          scrapStatus: isScrapTrue,
          defectDesc: defectDesc,
          supplierId: supplierId || null,
          customersId: customerId || null,
          processId: processId || null,
        },
      }),
      prisma.partNumber.update({
        where: { part_id: existingEntry.partId },
        data: {
          availStock: adjustedStock,
        },
      }),
    ]);

    res.status(200).json({
      message: "Scrap entry updated successfully !",
      data: updatedEntry,
    });
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
};
const stationSendNotification = async (req, res) => {
  try {
    const fileData = await fileUploadFunc(req, res);
    const uploadedFiles = fileData?.data || [];
    const { comment, employeeId } = req.body;
    const savedRecord = await prisma.stationNotification.create({
      data: {
        comment,
        enqueryImg: uploadedFiles?.[0]?.filename,
        employeeId,
        createdBy: req.user?.id,
      },
    });

    return res.status(201).json({
      message: "Picture and comment added successfully",
      data: savedRecord,
    });
  } catch (error) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};
const getStationNotifications = async (req, res) => {
  try {
    const { status } = req.query;
    const userId = req.user?.id;
    const userRole = req.user?.role;

    let whereCondition = { isDeleted: false };
    if (userRole !== "superAdmin") {
      whereCondition.createdBy = userId;
    }

    if (status !== undefined) {
      whereCondition.status = status === "true";
    } else {
      whereCondition.status = false;
    }

    const notifications = await prisma.stationNotification.findMany({
      where: whereCondition,
      select: {
        id: true,
        employeeId: true,
        comment: true,
        enqueryImg: true,
        status: true,
        createdAt: true,
        isDeleted: true,
        createdBy: true,
        stationUserId: true,
      },
      orderBy: { createdAt: "desc" },
    });

    const countWhereCondition = {
      isDeleted: false,
     
    };

    const [unreadCount, archivedCount] = await Promise.all([
      prisma.stationNotification.count({
        where: { ...countWhereCondition, status: false },
      }),
      prisma.stationNotification.count({
        where: { ...countWhereCondition, status: true },
      }),
    ]);

    return res.status(200).json({
      message: "Notifications fetched successfully",
      data: notifications,
      counts: {
        all: unreadCount,
        unread: unreadCount,
        archived: archivedCount,
      },
    });
  } catch (error) {
    return res.status(500).json({
      error: "Internal server error",
      details: error.message,
    });
  }
};
const changeStationNotification = async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.stationNotification.update({
      where: { id: id, isDeleted: false },
      data: {
        status: Boolean(req?.body?.status),
      },
    });
    return res.status(201).send({
      message: "Accept notification.",
    });
  } catch (error) {
    res.status(500).json({
      message: "Server Error",
      error: error.message,
    });
  }
};
const qualityPerformance = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    let start, end;

    if (startDate) {
      start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      end = endDate ? new Date(endDate) : new Date(startDate);
      end.setHours(23, 59, 59, 999);
    } else {
      start = new Date();
      start.setDate(start.getDate() - 30);
      start.setHours(0, 0, 0, 0);
      end = new Date();
      end.setHours(23, 59, 59, 999);
    }

    const [productions, scrapEntriesRecords] = await Promise.all([
      prisma.productionResponse.findMany({
        where: { isDeleted: false, createdAt: { gte: start, lte: end } },
        include: {
          process: true,
          PartNumber: true,
          StockOrder: true,
          CustomOrder: true,
        },
      }),
      prisma.scapEntries.findMany({
        where: { isDeleted: false, createdAt: { gte: start, lte: end } },
        include: {
          PartNumber: true,
          process: true,
          supplier: true,
          customers: true,
        },
      }),
    ]);

    const mergedMap = new Map();
    const supplierScrapDetails = [];
    const customerScrapDetails = [];
    let totalManualScrap = 0;
    let totalSupplierScrap = 0;
    let totalCustomerScrap = 0;
    const getPartInfo = (item) => {
      const pNo = item.PartNumber?.partNumber ||
        item.CustomOrder?.partNumber ||
        item.StockOrder?.productNumber || "N/A";

      let pDesc = item.PartNumber?.partDescription ||
        item.StockOrder?.productDescription ||
        "N/A";

      if (pDesc === "N/A" || !pDesc) {
        pDesc = pNo;
      }
      return { pNo, pDesc };
    };
    const updateMap = (id, info, scrapQty, scheduleQty, date, process) => {
      const finalId = id || "Unassigned";
      const key = `${finalId}-${process?.id || 'no-proc'}`;

      if (!mergedMap.has(key)) {
        mergedMap.set(key, {
          partId: finalId,
          partNumber: info.pNo,
          partDescription: info.pDesc,
          processName: process?.processName || "N/A",
          machineName: process?.machineName || "N/A",
          scrapQuantity: Number(scrapQty) || 0,
          scheduleQuantity: Number(scheduleQty) || 0,
          latestDate: date,
        });
      } else {
        const existing = mergedMap.get(key);
        existing.scrapQuantity += Number(scrapQty) || 0;
        existing.scheduleQuantity += Number(scheduleQty) || 0;
        if (date > existing.latestDate) existing.latestDate = date;
      }
    };

    productions.forEach((item) => {
      const sQty = Number(item.scrapQuantity) || 0;
      if (sQty > 0) {
        const info = getPartInfo(item);
        const id = item.partId;
        const schedQty = Number(item.scheduleQuantity) || 0;

        updateMap(id, info, sQty, schedQty, item.createdAt, item.process);
        totalManualScrap += sQty;
      }
    });

    scrapEntriesRecords.forEach((scrap) => {
      const sQty = (Number(scrap.scrapQuantity) || 0) + (Number(scrap.returnQuantity) || 0);
      if (sQty <= 0) return;

      const scrapNo = scrap.PartNumber?.partNumber || "N/A";
      const scrapDesc = scrap.PartNumber?.partDescription || scrapNo;

      if (scrap.supplierId || scrap.returnSupplierId) {
        totalSupplierScrap += sQty;
        supplierScrapDetails.push({
          partNumber: scrapNo,
          partDescription: scrapDesc,
          quantity: sQty,
          date: scrap.createdAt,
          supplierName: scrap.supplier?.companyName || "N/A",
        });
      } else if (scrap.customersId) {
        totalCustomerScrap += sQty;
        customerScrapDetails.push({
          partNumber: scrapNo,
          partDescription: scrapDesc,
          quantity: sQty,
          date: scrap.createdAt,
          customerName: `${scrap.customers?.firstName || ""} ${scrap.customers?.lastName || ""}`.trim() || "N/A",
        });
      } else {

        updateMap(scrap.partId, { pNo: scrapNo, pDesc: scrapDesc }, sQty, 0, scrap.createdAt, scrap.process);
        totalManualScrap += sQty;
      }
    });

    const data = Array.from(mergedMap.values()).sort((a, b) => b.scrapQuantity - a.scrapQuantity);

    return res.status(200).json({
      success: true,
      totalScrapQty: totalManualScrap + totalSupplierScrap + totalCustomerScrap,
      totalManualScrap,
      totalSupplierScrap,
      totalCustomerScrap,
      data: data,
      supplierScrapDetails,
      customerScrapDetails,
      range: { start, end },
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};
const approveTimeSheet = async (req, res) => {
  try {
    const { employeeId, date } = req.body;
    if (!employeeId || !date) {
      return res
        .status(400)
        .json({ message: "Employee ID and Date are required" });
    }

    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);
    const updatedRecords = await prisma.timeClock.updateMany({
      where: {
        employee: {
          email: employeeId,
        },
        isDeleted: false,
        timestamp: {
          gte: startOfDay.toISOString(),
          lte: endOfDay.toISOString(),
        },
      },
      data: {
        status: "APPROVED",
      },
    });

    if (updatedRecords.count === 0) {
      return res
        .status(404)
        .json({ message: "No records found to approve for this date." });
    }

    return res.status(200).json({
      message: `Timesheet approved successfully for ${date}`,
      count: updatedRecords.count,
    });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Internal Server Error", error: error.message });
  }
};
const parseCycleTime = (cycleTime) => {
  if (!cycleTime) return 0;

  const lower = cycleTime.toLowerCase().trim();

  if (lower.includes("hr")) {
    const val = parseFloat(lower);
    return isNaN(val) ? 0 : val;
  }

  if (lower.includes("min")) {
    const val = parseFloat(lower);
    return isNaN(val) ? 0 : val / 60;
  }

  if (lower.includes("sec")) {
    const val = parseFloat(lower);
    return isNaN(val) ? 0 : val / 3600;
  }

  const val = parseFloat(lower);
  return isNaN(val) ? 0 : val;
};
const costingApi = async (req, res) => {
  try {
    const { startDate, endDate, year } = req.query;
    let dateFilter = {};
    if (startDate || endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      dateFilter = { gte: start, lte: end };
    } else if (year) {
      const startOfYear = new Date(`${year}-01-01T00:00:00.000Z`);
      const endOfYear = new Date(`${year}-12-31T23:59:59.999Z`);
      dateFilter = { gte: startOfYear, lte: endOfYear };
    } else {
      const now = new Date();
      dateFilter = {
        gte: new Date(now.getFullYear(), now.getMonth(), 1),
        lte: new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)
      };
    }

    const [productions, manualScrapEntries] = await Promise.all([
      prisma.productionResponse.findMany({
        where: {
          isDeleted: false,
          createdAt: dateFilter
        },
        include: {
          PartNumber: true,
          process: true
        },
      }),
      prisma.scapEntries.findMany({
        where: {
          isDeleted: false,
          createdAt: dateFilter
        },
        include: {
          PartNumber: true
        },
      }),
    ]);

    let totalCOGS = 0;
    let totalScrapCost = 0;
    let supplierReturn = 0;
    const monthlyCOGS = {};
    productions.forEach((record) => {
      const date = new Date(record.createdAt);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      const qtyFulfilled = Number(record.completedQuantity) || 0;
      const scrapQty = Number(record.scrapQuantity) || 0;
      const partMaterialCost = parseFloat(record.PartNumber?.cost || 0);
      const cycleTimeHours = (parseFloat(record.PartNumber?.cycleTime || 0)) / 60;
      const ratePerHour = record.process?.ratePerHour || 0;
      const unitLabor = cycleTimeHours * ratePerHour;
      const rowCOGS = (partMaterialCost + unitLabor) * qtyFulfilled;

      if (qtyFulfilled > 0) {
        totalCOGS += rowCOGS;
        monthlyCOGS[monthKey] = (monthlyCOGS[monthKey] || 0) + rowCOGS;
      }
      if (scrapQty > 0) {
        totalScrapCost += (scrapQty * partMaterialCost);
      }
    });

    manualScrapEntries.forEach((entry) => {
      const qty = (Number(entry.scrapQuantity) || 0) + (Number(entry.returnQuantity) || 0);
      const partCost = parseFloat(entry.PartNumber?.cost || 0);
      const cost = qty * partCost;
      totalScrapCost += cost;
      if (entry.supplierId || entry.returnSupplierId || entry.type === "supplier") {
        supplierReturn += cost;
      }
    });

    res.json({
      success: true,
      totalCOGS: parseFloat(totalCOGS.toFixed(2)),
      scrapCost: parseFloat(totalScrapCost.toFixed(2)),
      supplierReturn: parseFloat(supplierReturn.toFixed(2)),
      monthlyCOGS,
    });

  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
const fixedCost = async (req, res) => {
  try {
    const year = parseInt(req.query.year);
    const completedStock = await prisma.stockOrderSchedule.findMany({
      where: { status: "completed", isDeleted: false },
      include: {
        part: {
          select: {
            partNumber: true,
            cost: true,
            cycleTime: true,
            process: { select: { ratePerHour: true } },
          },
        },
      },
    });

    const monthlyScrap = {};
    const monthlyCompleted = {};
    let totalScrapCost = 0;
    let totalCompletedCost = 0;

    completedStock.forEach((order) => {
      const date = new Date(order.completed_date || order.delivery_date);
      if (year && date.getFullYear() !== year) return;
      const monthKey =
        date.getFullYear() + "-" + String(date.getMonth() + 1).padStart(2, "0");
      const partCost = order.part?.cost || 0;
      const cycleTimeHours = parseCycleTime(order.part?.cycleTime || 0);
      const ratePerHour = order.part?.process?.ratePerHour || 0;
      const completedCost =
        (partCost + cycleTimeHours * ratePerHour) *
        (order.completedQuantity || 1);
      const scrapCost = (order.scrapQuantity || 0) * partCost;
      monthlyCompleted[monthKey] =
        (monthlyCompleted[monthKey] || 0) + completedCost;
      monthlyScrap[monthKey] = (monthlyScrap[monthKey] || 0) + scrapCost;

      totalCompletedCost += completedCost;
      totalScrapCost += scrapCost;
    });

    res.json({
      monthlyCompleted,
      monthlyScrap,
      totalYearCompleted: totalCompletedCost,
      totalYearScrap: totalScrapCost,
    });
  } catch (error) {
    res.status(500).json({
      message: "Something went wrong. Please try again later.",
      error: error.message,
    });
  }
};
const getInventory = async (req, res) => {
  try {
    const { period = "daily" } = req.query;
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    const formatDate = (d) =>
      `${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")}/${d.getFullYear()}`;

    let startDate = new Date();
    let loopCount = 7;

    if (period === "daily") {
      startDate = new Date(currentYear, currentMonth, 1);
      const lastDay = new Date(currentYear, currentMonth + 1, 0).getDate();
      loopCount = lastDay;
    } else if (period === "weekly") {
      loopCount = 14;
      startDate.setDate(now.getDate() - 13);
    } else if (period === "monthly") {
      startDate = new Date(currentYear, 0, 1);
      loopCount = 12;
    } else if (period === "yearly") {
      startDate = new Date(currentYear - 4, 0, 1);
      loopCount = 5;
    }
    startDate.setHours(0, 0, 0, 0);

    const allItems = await prisma.partNumber.findMany({
      where: { isDeleted: false },
      include: { process: { select: { ratePerHour: true } } },
    });

    let liveTotalInventoryCost = 0;
    let totalExtraItemsCount = 0;
    const shortagePartsList = [];

    for (const item of allItems) {
      const avail = Number(item.availStock) || 0;
      const min = Number(item.minStock) || 0;
      const extraStock = avail - min;
      const unitValue =
        (parseFloat(item.cost) || 0) +
        ((parseFloat(item.cycleTime) || 0) / 60) *
        (item.process?.ratePerHour || 0);

      if (extraStock > 0) {
        liveTotalInventoryCost += extraStock * unitValue;
        totalExtraItemsCount += extraStock;
      }

      if (avail < min) {
        shortagePartsList.push({
          partNumber: item.partNumber,
          availStock: avail,
          minStock: min,
          shortageQty: min - avail,
          leadTime: item.leadTime || 0,
          costPerUnit: unitValue.toFixed(2),
        });
      }
    }

    const todayStr = now.toISOString().split("T")[0];
    const todayDate = new Date(todayStr);

    const existingSummary = await prisma.dailyInventory.findFirst({
      where: { date: todayDate, partNumber: "SUMMARY_TOTAL" },
    });

    if (existingSummary) {
      await prisma.dailyInventory.update({
        where: { id: existingSummary.id },
        data: {
          totalInventoryCost: liveTotalInventoryCost,
          inventoryLevel: totalExtraItemsCount,
        },
      });
    } else {
      await prisma.dailyInventory.create({
        data: {
          id: crypto.randomUUID(),
          date: todayDate,
          partNumber: "SUMMARY_TOTAL",
          totalInventoryCost: liveTotalInventoryCost,
          inventoryCost: liveTotalInventoryCost,
          inventoryLevel: totalExtraItemsCount,
          costPerUnit: 0,
        },
      });
    }

    const historicalData = await prisma.dailyInventory.findMany({
      where: {
        date: { gte: startDate, lte: new Date() },
        partNumber: "SUMMARY_TOTAL",
      },
    });

    const map = {};
    historicalData.forEach((item) => {
      const d = new Date(item.date);
      let key;
      if (period === "yearly") key = `Y-${d.getFullYear()}`;
      else if (period === "monthly")
        key = `M-${d.getMonth() + 1}-${d.getFullYear()}`;
      else key = `D-${formatDate(d)}`;

      map[key] = Number(item.totalInventoryCost);
    });

    const chartData = [];
    let tempDate = new Date(startDate);

    for (let i = 0; i < loopCount; i++) {
      let lookupKey;
      let displayDate = formatDate(tempDate);

      if (period === "yearly") {
        lookupKey = `Y-${tempDate.getFullYear()}`;
        displayDate = `${tempDate.getFullYear()}`;
      } else if (period === "monthly") {
        lookupKey = `M-${tempDate.getMonth() + 1}-${tempDate.getFullYear()}`;
        const dMonth = new Date(tempDate.getFullYear(), tempDate.getMonth(), 1);
        displayDate = formatDate(dMonth);
      } else {
        lookupKey = `D-${formatDate(tempDate)}`;
        displayDate = formatDate(tempDate);
      }

      chartData.push({
        date: displayDate,
        totalInventoryCost: map[lookupKey] || 0,
      });

      if (period === "yearly") tempDate.setFullYear(tempDate.getFullYear() + 1);
      else if (period === "monthly") tempDate.setMonth(tempDate.getMonth() + 1);
      else tempDate.setDate(tempDate.getDate() + 1);
    }

    res.json({
      chartData,
      parts: shortagePartsList,
      summary: {
        totalInventoryCost: liveTotalInventoryCost.toFixed(2),
        totalExtraItems: totalExtraItemsCount,
        shortageCount: shortagePartsList.length,
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
const customerRelation = async (req, res) => {
  try {
    let { startDate, endDate } = req.query;
    const now = new Date();
    const todayStr = now.toISOString().split("T")[0];

    if (!startDate) startDate = todayStr;
    if (!endDate) endDate = todayStr;

    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    const allSchedules = await prisma.stockOrderSchedule.findMany({
      where: {
        updatedAt: { gte: start, lte: end },
        isDeleted: false,
      },
      include: {
        StockOrder: { include: { customer: true, part: { include: { supplier: true } } } },
        CustomOrder: {
          include: {
            customer: true,
            product: { include: { supplier: true } },
            existingParts: { include: { part: { include: { supplier: true } } } }
          }
        },
        customPart: true,
        PartNumber: { include: { supplier: true } },
      },
    });

    const openOrders = [];
    const fulfilledOrders = [];
    const performance = [];
    const combinedScrap = [];

    allSchedules.forEach((sch) => {
      const schStatus = (sch.status || "").toLowerCase().trim();
      const isStock = sch.order_type?.toLowerCase().includes("stock");
      const orderRef = isStock ? sch.StockOrder : sch.CustomOrder;

      if (orderRef) {
        const firstName = orderRef.customer?.firstName || orderRef.customerName?.split(" ")[0] || "N/A";
        const lastName = orderRef.customer?.lastName || orderRef.customerName?.split(" ").slice(1).join(" ") || "";

        let productName = "N/A";
        if (isStock) {
          productName = orderRef.productDescription || orderRef.productNumber || "Stock Item";
        } else {
          productName = sch.customPart?.partNumber || sch.PartNumber?.partNumber || orderRef.partNumber || "Custom Item";
        }

        const commonData = {
          Date: sch.updatedAt.toISOString().split("T")[0],
          "Order Number": orderRef.orderNumber || "N/A",
          "Order Type": isStock ? "Stock" : "Custom",
          "First Name": firstName,
          "Last Name": lastName,
          Product: productName,
          "Order Quantity": orderRef.productQuantity || 0,
          "Scheduled Quantity": sch.scheduleQuantity || 0,
          "Completed Quantity": sch.completedQuantity || 0,
          "Status": sch.status
        };

        if (schStatus === "completed" || schStatus === "complete") {
          fulfilledOrders.push({ ...commonData, Status: "Completed" });
        } else {
          openOrders.push({ ...commonData, Status: sch.status || "In Progress" });
        }

        let efficiencyPercentage = "0.00%";
        const targetQty = sch.scheduleQuantity || orderRef.productQuantity || 0;
        if (targetQty > 0) {
          const rawEfficiency = (sch.completedQuantity / targetQty) * 100;
          efficiencyPercentage = Math.min(100, rawEfficiency).toFixed(2) + "%";
        }

        performance.push({
          Date: commonData.Date,
          "Order Number": orderRef.orderNumber,
          Customer: `${firstName} ${lastName}`,
          Type: isStock ? "Stock" : "Custom",
          Scheduled: sch.scheduleQuantity || 0,
          "Total Completed": sch.completedQuantity || 0,
          "Total Scrap": sch.scrapQuantity || 0,
          Efficiency: efficiencyPercentage,
        });
      }

      if (sch.scrapQuantity > 0) {
        combinedScrap.push({
          "Date": sch.updatedAt.toISOString().split("T")[0],
          "Part Number": sch.customPart?.partNumber || sch.PartNumber?.partNumber || sch.CustomOrder?.partNumber || "N/A",
          "Return Quantity": sch.scrapQuantity,
          "Supplier Company Name": sch.PartNumber?.supplier?.companyName || sch.CustomOrder?.product?.supplier?.companyName || "Internal",
          "Order Number": orderRef?.orderNumber || "N/A",
          "Source": "Schedule Completion",
          "Type": sch.order_type
        });
      }
    });
    const scrapDataFromProduction = await prisma.productionResponse.findMany({
      where: {
        createdAt: { gte: start, lte: end },
        scrapQuantity: { gt: 0 },
        isDeleted: false
      },
      include: {
        PartNumber: { include: { supplier: true } },
        StockOrder: true,
        CustomOrder: { include: { product: true } }
      }
    });

    scrapDataFromProduction.forEach((ps) => {
      combinedScrap.push({
        "Date": ps.createdAt.toISOString().split("T")[0],
        "Part Number": ps.PartNumber?.partNumber || ps.CustomOrder?.partNumber || "N/A",
        "Return Quantity": ps.scrapQuantity || 0,
        "Supplier Company Name": ps.PartNumber?.supplier?.companyName || ps.CustomOrder?.product?.supplier?.companyName || "N/A",
        "Order Number": ps.StockOrder?.orderNumber || ps.CustomOrder?.orderNumber || "N/A",
        "Source": "Production Process",
        "Type": ps.order_type || (ps.customOrderId ? "CustomOrder" : "StockOrder")
      });
    });

    const scrapDataFromEntries = await prisma.scapEntries.findMany({
      where: {
        createdAt: { gte: start, lte: end },
        isDeleted: false
      },
      include: {
        PartNumber: { include: { supplier: true } },
        StockOrder: true,
        supplier: true
      },
    });

    scrapDataFromEntries.forEach((entry) => {
      combinedScrap.push({
        "Date": entry.createdAt.toISOString().split("T")[0],
        "Part Number": entry.PartNumber?.partNumber || "N/A",
        "Return Quantity": entry.returnQuantity || 0,
        "Supplier Company Name": entry.supplier?.companyName || entry.PartNumber?.supplier?.companyName || "N/A",
        "Order Number": entry.StockOrder?.orderNumber || "Manual Entry",
        "Source": "Manual Entry",
        "Type": entry.type || "N/A"
      });
    });

    return res.status(200).json({
      message: "Success",
      data: {
        openOrders,
        fulfilledOrders,
        performance,
        scapEntries: combinedScrap,
      },
    });
  } catch (error) {
    res.status(500).json({ message: "Internal Server Error", error: error.message });
  }
};
const getScheduleProcessInformation = async (req, res) => {
  try {
    const { id: processId } = req.params;
    const { stationUserId } = req.query;
    if (!processId || !stationUserId) {
      return res.status(400).json({ message: "processId and stationUserId are required." });
    }
    const candidates = await prisma.stockOrderSchedule.findMany({
      where: {
        processId: processId,
        isDeleted: false,
        status: { in: ["new", "progress"] },
        remainingQty: { gt: 0 }
      },
      include: {
        part: true,
        customPart: true,
        process: true,
        StockOrder: { select: { orderNumber: true } },
        CustomOrder: { select: { orderNumber: true } },
      },
    });
    if (candidates.length === 0) {
      return res.status(404).json({ message: "No jobs assigned to this station." });
    }

    const sortedCandidates = candidates.sort((a, b) => {
      if (a.status !== b.status) return a.status === "progress" ? -1 : 1;
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    });

    const nextJob = sortedCandidates[0];
    const currentPartId = nextJob.part_id || nextJob.customPartId;

    const incomingJobs = sortedCandidates.slice(1).map((job) => ({
      scheduleId: job.id,
      orderNumber: job.StockOrder?.orderNumber || job.CustomOrder?.orderNumber || "N/A",
      partNumber: job.part?.partNumber || job.customPart?.partNumber || "N/A",
      quantity: job.scheduleQuantity || job.quantity,
      remainingQty: job.remainingQty,
      status: job.status,
      type: job.order_type,
      scheudleDate: job.order_date,
    }));

    const currentSession = await prisma.productionResponse.findFirst({
      where: {
        processId: processId,
        stationUserId: stationUserId,
        partId: currentPartId,
        orderId: nextJob.order_id,
        cycleTimeEnd: null,
        isDeleted: false,
      },
      orderBy: { createdAt: "desc" },
      include: { employeeInfo: true },
    });

    const lastProduction = currentSession || await prisma.productionResponse.findFirst({
      where: { processId, stationUserId, isDeleted: false },
      orderBy: { createdAt: "desc" },
      include: { employeeInfo: true },
    });

    const [orderData, workInstructions, workInstructionsApply, stats] = await Promise.all([
      nextJob.order_type === "StockOrder"
        ? prisma.stockOrder.findUnique({ where: { id: nextJob.order_id } })
        : prisma.customOrder.findUnique({ where: { id: nextJob.order_id } }),

      prisma.workInstruction.findFirst({
        where: { productId: currentPartId || undefined, processId: processId, isDeleted: false },
        include: {
          steps: {
            where: { isDeleted: false },
            orderBy: { stepNumber: "asc" },
            include: { images: true, videos: true },
          },
        },
      }),

      prisma.workInstructionApply.findFirst({
        where: { productId: currentPartId || undefined, processId: processId, isDeleted: false },
        include: {
          steps: {
            where: { isDeleted: false },
            orderBy: { stepNumber: "asc" },
            include: { images: true, videos: true },
          },
          workInstruction: {
            include: {
              steps: {
                where: { isDeleted: false },
                orderBy: { stepNumber: "asc" },
                include: { images: true, videos: true },
              }
            }
          }
        },
      }),

      prisma.stockOrderSchedule.aggregate({
        where: { order_id: nextJob.order_id, processId, isDeleted: false },
        _sum: { completedQuantity: true, scrapQuantity: true },
      }),
    ]);

    let finalSteps = [];
    let finalTitle = "No Instructions Found";
    let source = "None";

    if (workInstructions && workInstructions.steps.length > 0) {
      finalSteps = workInstructions.steps;
      finalTitle = workInstructions.instructionTitle;
      source = "WorkInstruction";
    } else if (workInstructionsApply) {
      source = "WorkInstructionApply";
      finalTitle = workInstructionsApply.instructionTitle || workInstructionsApply.workInstruction?.instructionTitle;

      if (workInstructionsApply.steps && workInstructionsApply.steps.length > 0) {
        finalSteps = workInstructionsApply.steps;
      } else if (workInstructionsApply.workInstruction?.steps) {
        finalSteps = workInstructionsApply.workInstruction.steps;
      }
    }

    return res.status(200).json({
      message: "Job Found",
      data: {
        ...nextJob,
        processName: nextJob.process?.processName || "N/A",
        partNumber: nextJob.part?.partNumber || nextJob.customPart?.partNumber || "N/A",
        order: orderData,
        workInstructionSteps: finalSteps,
        instructionTitle: finalTitle,
        productionId: lastProduction?.id || null,
        employeeInfo: lastProduction?.employeeInfo || null,
        employeeCompletedQty: stats._sum.completedQuantity || 0,
        employeeScrapQty: stats._sum.scrapQuantity || 0,
        incomingJobs: incomingJobs,
        cycleTime: lastProduction?.cycleTimeStart || null,
        instructionSource: source
      },
    });
  } catch (error) {
    return res.status(500).json({ message: "Internal Server Error", error: error.message });
  }
};
const checkTraningStatus = async (req, res) => {
  try {
    const { stationUserId, processId, productId } = req.query;

    const trainedRecord = await prisma.productionResponse.findFirst({
      where: {
        stationUserId: stationUserId,
        processId: processId,
        partId: productId,
        traniningStatus: true,
        isDeleted: false,
      },
    });

    return res.status(200).json({
      isTrained: !!trainedRecord,
      message: trainedRecord ? "Certified" : "Not Certified",
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
const getTrainingScheduleInformation = async (req, res) => {
  try {
    const { id: processId } = req.params;
    const { stationUserId } = req.query;

    if (!processId || !stationUserId || stationUserId === "undefined") {
      return res.status(400).json({ message: "Invalid Process or User ID" });
    }

    const employee = await prisma.employee.findUnique({
      where: { id: stationUserId },
      select: { fullName: true, firstName: true, lastName: true },
    });

    const loggedInUserName = employee
      ? employee.fullName || `${employee.firstName} ${employee.lastName}`
      : "Employee";
    const [wiSyllabus, wiaSyllabus] = await Promise.all([
      prisma.workInstruction.findMany({
        where: { processId: processId, isDeleted: false },
        include: { PartNumber: true },
        orderBy: { createdAt: "asc" },
      }),
      prisma.workInstructionApply.findMany({
        where: { processId: processId, isDeleted: false },
        include: { PartNumber: true, workInstruction: true },
        orderBy: { createdAt: "asc" },
      })
    ]);

    const combinedSyllabus = [...wiSyllabus, ...wiaSyllabus].sort((a, b) =>
      new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );

    if (combinedSyllabus.length === 0) {
      return res.status(404).json({ message: "No instructions found for training." });
    }
    const completedSessions = await prisma.productionResponse.findMany({
      where: {
        stationUserId,
        processId,
        type: "training",
        traniningStatus: true,
        isDeleted: false,
      },
      orderBy: { updatedAt: "asc" },
    });

    let nextPartIndex = completedSessions.length;

    if (nextPartIndex >= combinedSyllabus.length) {
      return res.status(200).json({
        allCompleted: true,
        message: "Training Cycle finished.",
      });
    }

    const nextPart = combinedSyllabus[nextPartIndex];
    const currentPartId = nextPart.productId;
    let currentSession = await prisma.productionResponse.findFirst({
      where: {
        stationUserId,
        processId,
        partId: currentPartId,
        type: "training",
        traniningStatus: false,
        isDeleted: false,
      },
    });

    if (!currentSession) {
      currentSession = await prisma.productionResponse.create({
        data: {
          processId,
          stationUserId,
          partId: currentPartId,
          type: "training",
          traniningStatus: false,
          cycleTimeStart: new Date(),
          order_type: "Training",
        },
      });
    }
    let finalSteps = [];
    const isApplyTable = nextPart.instructionId !== undefined;

    if (!isApplyTable) {
      finalSteps = await prisma.workInstructionSteps.findMany({
        where: { workInstructionId: nextPart.id, isDeleted: false },
        orderBy: { stepNumber: "asc" },
        include: { images: true, videos: true },
      });
    } else {
      const applySteps = await prisma.workInstructionSteps.findMany({
        where: { workInstructionApplyId: nextPart.id, isDeleted: false },
        orderBy: { stepNumber: "asc" },
        include: { images: true, videos: true },
      });

      if (applySteps.length > 0) {
        finalSteps = applySteps;
      } else {
        finalSteps = await prisma.workInstructionSteps.findMany({
          where: { workInstructionId: nextPart.instructionId, isDeleted: false },
          orderBy: { stepNumber: "asc" },
          include: { images: true, videos: true },
        });
      }
    }

    return res.status(200).json({
      allCompleted: false,
      data: {
        productionId: currentSession.id,
        employeeName: loggedInUserName,
        workInstructionSteps: finalSteps,
        instructionTitle: nextPart.instructionTitle || nextPart.workInstruction?.instructionTitle,
        partNumber: nextPart.PartNumber?.partNumber || "N/A",
        processName: nextPart.PartNumber?.processDesc || "Training",
        cycleTime: currentSession.cycleTimeStart,
        instructionSource: isApplyTable ? "WorkInstructionApply" : "WorkInstruction",
        incomingJobs: combinedSyllabus.slice(nextPartIndex + 1).map((s) => ({
          partNumber: s.PartNumber?.partNumber || "N/A",
        })),
      },
    });
  } catch (error) {
    return res.status(500).json({ message: "Internal server error", error: error.message });
  }
};
const scanCompleteAction = async (req, res) => {
  try {
    const { id: productionResponseId } = req.params;
    const { orderId, partId, employeeId, order_type, productId } = req.body;
    const now = new Date();

    const result = await prisma.$transaction(async (tx) => {
      const schedule = await tx.stockOrderSchedule.findFirst({
        where: {
          order_id: orderId,
          OR: [{ part_id: partId }, { customPartId: partId }],
          order_type,
          isDeleted: false,
        },
      });

      if (!schedule) throw new Error("Job Schedule not found.");

      const { completedQuantity = 0, quantity = 0, remainingQty = 0, processId } = schedule;

      let wasUpdated = false;
      if (productionResponseId && productionResponseId !== "null") {
        await tx.productionResponse.update({
          where: { id: productionResponseId },
          data: {
            completedQuantity: { increment: 1 },
            cycleTimeEnd: now,
            submittedDateTime: now,
            stationUserId: employeeId,
            partId: schedule.part_id || null,
          },
        });
        wasUpdated = true;
      }

      if (!wasUpdated) {
        await tx.productionResponse.create({
          data: {
            processId,
            stationUserId: employeeId,
            partId: schedule.part_id || null,
            orderId: order_type === "StockOrder" ? orderId : null,
            customOrderId: order_type === "CustomOrder" ? orderId : null,
            order_type,
            cycleTimeStart: now,
            cycleTimeEnd: now,
            completedQuantity: 1,
            submittedDateTime: now,
          },
        });
      }

      if (partId) {
        const itemInDb = await tx.partNumber.findUnique({
          where: { part_id: partId },
          select: { type: true },
        });

        if (itemInDb?.type) {
          const itemType = itemInDb.type.toLowerCase();
          if (itemType.includes("part")) {
            await tx.partNumber.update({
              where: { part_id: partId },
              data: { availStock: { decrement: 1 } },
            });
          } else if (itemType.includes("product")) {
            await tx.partNumber.update({
              where: { part_id: partId },
              data: { availStock: { increment: 1 } },
            });
          }
        }
      }

      const newCompletedQty = completedQuantity + 1;
      const newRemaining = Math.max(0, remainingQty - 1);
      const isFinished = newCompletedQty >= quantity;
      const updatedStatus = isFinished ? "completed" : "progress";

      await tx.stockOrderSchedule.update({
        where: { id: schedule.id },
        data: {
          completedQuantity: newCompletedQty,
          remainingQty: newRemaining,
          status: updatedStatus,
          completed_date: isFinished ? now : undefined,
          completed_EmpId: employeeId,
        },
      });

      let nextSession = null;
      if (!isFinished) {
        nextSession = await tx.productionResponse.create({
          data: {
            processId,
            stationUserId: employeeId,
            partId: schedule.part_id || null,
            orderId: order_type === "StockOrder" ? orderId : null,
            customOrderId: order_type === "CustomOrder" ? orderId : null,
            order_type,
            cycleTimeStart: now,
            completedQuantity: 0,
            scrap: false,
          },
        });
      } else {
        const nextJob = await tx.stockOrderSchedule.findFirst({
          where: {
            processId,
            status: { in: ["new", "progress"] },
            isDeleted: false,
            id: { not: schedule.id },
          },
          orderBy: { createdAt: "asc" },
        });

        if (nextJob) {
          nextSession = await tx.productionResponse.create({
            data: {
              processId,
              stationUserId: employeeId,
              partId: nextJob.part_id || null,
              orderId: nextJob.order_type === "StockOrder" ? nextJob.order_id : null,
              customOrderId: nextJob.order_type === "CustomOrder" ? nextJob.order_id : null,
              order_type: nextJob.order_type,
              cycleTimeStart: now,
              completedQuantity: 0,
              scrap: false,
            },
          });
        }
      }

      return {
        message: "Scan complete successful.",
        newProductionId: nextSession?.id || null,
        isJobFinished: isFinished,
      };
    }, { timeout: 15000 });

    return res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
const scanScrapAction = async (req, res) => {
  try {
    const { id: productionResponseId } = req.params;
    const { orderId, partId, employeeId, order_type } = req.body;
    const now = new Date();

    const result = await prisma.$transaction(async (tx) => {
      const schedule = await tx.stockOrderSchedule.findFirst({
        where: {
          order_id: orderId,
          OR: [{ part_id: partId }, { customPartId: partId }],
          order_type,
          isDeleted: false,
        },
      });
      if (!schedule) throw new Error("Job Schedule not found.");
      await tx.productionResponse.update({
        where: { id: productionResponseId },
        data: {
          scrap: true,
          scrapQuantity: { increment: 1 },
          cycleTimeEnd: now,
          submittedDateTime: now,
          stationUserId: employeeId,
          partId: schedule.part_id || null
        },
      });
      if (partId) {
        const itemInDb = await tx.partNumber.findUnique({
          where: { part_id: partId },
          select: { type: true },
        });
        if (itemInDb?.type?.toLowerCase().includes("part")) {
          await tx.partNumber.update({
            where: { part_id: partId },
            data: { availStock: { decrement: 1 } },
          });
        }
      }

      await tx.stockOrderSchedule.update({
        where: { id: schedule.id },
        data: {
          scrapQuantity: { increment: 1 },
          status: "progress",
        },
      });
      const nextSession = await tx.productionResponse.create({
        data: {
          processId: schedule.processId,
          stationUserId: employeeId,
          partId: schedule.part_id || null,
          orderId: order_type === "StockOrder" ? orderId : null,
          customOrderId: order_type === "CustomOrder" ? orderId : null,
          order_type,
          cycleTimeStart: now,
          completedQuantity: 0,
          scrap: false,
        },
      });

      return {
        message: "Scrapped & Same Job Session Restarted",
        newProductionId: nextSession.id
      };
    }, { timeout: 15000 });

    return res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
module.exports = {
  stationLogin,
  stationLogout,
  getScheduleProcessInformation,
  createProductionResponse,
  getNextJobDetails,
  selectScheduleProcess,
  completeScheduleOrder,
  updateStepTime,
  completeTraning,
  scrapScheduleOrder,
  barcodeScan,
  processBarcodeScan,
  deleteScheduleOrder,
  completeScheduleOrderViaGet,
  completeScheduleOrderViaGet,
  scrapEntry,
  allScrapEntires,
  selectScheudlePartNumber,
  selectScheudleProductNumber,
  getScrapEntryById,
  updateScrapEntry,
  stationSendNotification,
  getStationNotifications,
  changeStationNotification,
  qualityPerformance,
  costingApi,
  fixedCost,
  getInventory,
  customerRelation,
  checkTraningStatus,
  getTrainingScheduleInformation,
  approveTimeSheet,
  scanCompleteAction,
  scanScrapAction,
};
