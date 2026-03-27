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
        data: { isDeleted: true },
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
    const { orderId, partId, employeeId, order_type } = req.body;

    const result = await prisma.$transaction(
      async (tx) => {
        const schedule = await tx.stockOrderSchedule.findFirst({
          where: {
            order_id: orderId,
            part_id: partId,
            order_type,
            isDeleted: false,
          },
        });
        if (!schedule) throw new Error("Schedule not found");

        const now = new Date();
        const lastSession = await tx.productionResponse.update({
          where: { id: productionResponseId },
          data: {
            cycleTimeEnd: now,
            completedQuantity: 1,
            submittedDateTime: now,
            stationUserId: employeeId,
          },
        });
        const nextSession = await tx.productionResponse.create({
          data: {
            processId: lastSession.processId,
            stationUserId: employeeId,
            partId: partId,
            orderId: orderId,
            order_type: order_type,
            cycleTimeStart: now,
            completedQuantity: 0,
            scrap: false,
          },
        });

        if (partId) {
          const itemInDb = await tx.partNumber.findUnique({
            where: { part_id: partId },
            select: { type: true },
          });

          if (itemInDb) {
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
        const newQty = (schedule.completedQuantity || 0) + 1;
        const isFinished = newQty >= (schedule.scheduleQuantity || 0);

        await tx.stockOrderSchedule.update({
          where: { id: schedule.id },
          data: {
            completedQuantity: newQty,
            remainingQty: Math.max(0, (schedule.remainingQty || 0) - 1),
            status: isFinished ? "completed" : "progress",
            completed_date: isFinished ? now : null,
            completed_EmpId: employeeId,
          },
        });

        return {
          status: isFinished ? "completed" : "progress",
          newProductionId: nextSession.id,
          message: "Order completed and stock updated",
        };
      },
      {
        timeout: 15000,
      },
    );

    return res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
// const scrapScheduleOrder = async (req, res) => {
//   try {
//     const { id: productionResponseId } = req.params;
//     const { orderId, partId, employeeId, order_type } = req.body;
//     const now = new Date();

//     const result = await prisma.$transaction(
//       async (tx) => {
//         const currentSchedule = await tx.stockOrderSchedule.findFirst({
//           where: {
//             order_id: orderId,
//             part_id: partId,
//             order_type,
//             isDeleted: false,
//           },
//         });

//         if (!currentSchedule) throw new Error("Job Schedule not found.");
//         await tx.productionResponse.update({
//           where: { id: productionResponseId },
//           data: {
//             scrap: true,
//             scrapQuantity: { increment: 1 },
//             cycleTimeEnd: now,
//             submittedDateTime: now,
//             stationUserId: employeeId,
//           },
//         });
//         if (partId) {
//           const itemInDb = await tx.partNumber.findUnique({
//             where: { part_id: partId },
//             select: { type: true },
//           });

//           if (itemInDb) {
//             const itemType = itemInDb.type.toLowerCase();

//             if (itemType.includes("part")) {
//               await tx.partNumber.update({
//                 where: { part_id: partId },
//                 data: { availStock: { decrement: 1 } },
//               });
//             }
//           }
//         }

//         const newRemaining = Math.max(
//           0,
//           (currentSchedule.remainingQty || 0) - 1,
//         );
//         const isCurrentPartDone = newRemaining <= 0;

//         await tx.stockOrderSchedule.update({
//           where: { id: currentSchedule.id },
//           data: {
//             scrapQuantity: { increment: 1 },
//             remainingQty: newRemaining,
//             status: isCurrentPartDone ? "completed" : "progress",
//           },
//         });

//         let nextProductionId = null;
//         let nextPartInfo = null;

//         if (!isCurrentPartDone) {
//           const nextSession = await tx.productionResponse.create({
//             data: {
//               processId: currentSchedule.processId,
//               stationUserId: employeeId,
//               partId: partId,
//               orderId: orderId,
//               order_type: order_type,
//               cycleTimeStart: new Date(),
//               completedQuantity: 0,
//               scrap: false,
//             },
//           });
//           nextProductionId = nextSession.id;
//         } else {
//           const nextSchedule = await tx.stockOrderSchedule.findFirst({
//             where: {
//               order_id: orderId,
//               status: { in: ["pending", "progress"] },
//               isDeleted: false,
//               NOT: { part_id: partId },
//             },
//             orderBy: { id: "asc" },
//           });

//           if (nextSchedule) {
//             const nextPartSession = await tx.productionResponse.create({
//               data: {
//                 processId: nextSchedule.processId,
//                 stationUserId: employeeId,
//                 partId: nextSchedule.part_id,
//                 orderId: orderId,
//                 order_type: order_type,
//                 cycleTimeStart: new Date(),
//                 completedQuantity: 0,
//                 scrap: false,
//               },
//             });
//             nextProductionId = nextPartSession.id;
//             nextPartInfo = {
//               partId: nextSchedule.part_id,
//               message: "Current part scrapped/finished. Moving to next part.",
//             };
//           }
//         }

//         return {
//           message: isCurrentPartDone
//             ? "Part finished and scrapped."
//             : "Scrapped successfully",
//           newProductionId: nextProductionId,
//           nextPartInfo: nextPartInfo,
//           isOrderFinished: isCurrentPartDone && !nextPartInfo,
//         };
//       },
//       { timeout: 15000 },
//     );

//     return res.status(200).json(result);
//   } catch (error) {
//     res.status(500).json({ message: error.message });
//   }
// };

// const scrapScheduleOrder = async (req, res) => {
//   try {
//     const { id: productionResponseId } = req.params;
//     const { orderId, partId, employeeId, order_type } = req.body;
//     const now = new Date();

//     const result = await prisma.$transaction(
//       async (tx) => {
//         const currentSchedule = await tx.stockOrderSchedule.findFirst({
//           where: {
//             order_id: orderId,
//             part_id: partId,
//             order_type,
//             isDeleted: false,
//           },
//         });

//         if (!currentSchedule) throw new Error("Job Schedule not found.");

//         // Purane session ko khatam karo
//         await tx.productionResponse.update({
//           where: { id: productionResponseId },
//           data: {
//             scrap: true,
//             scrapQuantity: { increment: 1 },
//             cycleTimeEnd: now,
//             submittedDateTime: now,
//             stationUserId: employeeId,
//           },
//         });

//         if (partId) {
//           const itemInDb = await tx.partNumber.findUnique({
//             where: { part_id: partId },
//             select: { type: true },
//           });

//           if (itemInDb && itemInDb.type.toLowerCase().includes("part")) {
//             await tx.partNumber.update({
//               where: { part_id: partId },
//               data: { availStock: { decrement: 1 } },
//             });
//           }
//         }

//         const newRemaining = Math.max(
//           0,
//           (currentSchedule.remainingQty || 0) - 1,
//         );
//         const isCurrentPartDone = newRemaining <= 0;

//         await tx.stockOrderSchedule.update({
//           where: { id: currentSchedule.id },
//           data: {
//             scrapQuantity: { increment: 1 },
//             remainingQty: newRemaining,
//             status: isCurrentPartDone ? "completed" : "progress",
//           },
//         });

//         let nextProductionId = null;
//         let nextPartInfo = null;

//         // FIXED: Naya session fresh start hoga cycleTimeStart ke saath
//         if (!isCurrentPartDone) {
//           const nextSession = await tx.productionResponse.create({
//             data: {
//               processId: currentSchedule.processId,
//               stationUserId: employeeId,
//               partId: partId,
//               orderId: orderId,
//               order_type: order_type,
//               cycleTimeStart: new Date(), // FRESH TIMER START
//               completedQuantity: 0,
//               scrap: false,
//               cycleTimeEnd: null, // ENSURE TIMER IS RUNNING
//             },
//           });
//           nextProductionId = nextSession.id;
//         } else {
//           const nextSchedule = await tx.stockOrderSchedule.findFirst({
//             where: {
//               order_id: orderId,
//               status: { in: ["pending", "progress"] },
//               isDeleted: false,
//               NOT: { part_id: partId },
//             },
//             orderBy: { id: "asc" },
//           });

//           if (nextSchedule) {
//             const nextPartSession = await tx.productionResponse.create({
//               data: {
//                 processId: nextSchedule.processId,
//                 stationUserId: employeeId,
//                 partId: nextSchedule.part_id,
//                 orderId: orderId,
//                 order_type: order_type,
//                 cycleTimeStart: new Date(), // NEXT PART FRESH TIMER
//                 completedQuantity: 0,
//                 scrap: false,
//                 cycleTimeEnd: null,
//               },
//             });
//             nextProductionId = nextPartSession.id;
//             nextPartInfo = {
//               partId: nextSchedule.part_id,
//               message: "Current part scrapped/finished. Moving to next part.",
//             };
//           }
//         }

//         return {
//           message: isCurrentPartDone
//             ? "Part finished and scrapped."
//             : "Scrapped successfully",
//           newProductionId: nextProductionId,
//           nextPartInfo: nextPartInfo,
//           isOrderFinished: isCurrentPartDone && !nextPartInfo,
//         };
//       },
//       { timeout: 15000 },
//     );

//     return res.status(200).json(result);
//   } catch (error) {
//     res.status(500).json({ message: error.message });
//   }
// };

// const scrapScheduleOrder = async (req, res) => {
//   try {
//     const { id: productionResponseId } = req.params;
//     const { orderId, partId, employeeId, order_type } = req.body;
//     const now = new Date();

//     const result = await prisma.$transaction(
//       async (tx) => {
//         // 1. Current Schedule status check
//         const currentSchedule = await tx.stockOrderSchedule.findFirst({
//           where: {
//             order_id: orderId,
//             part_id: partId,
//             order_type,
//             isDeleted: false,
//           },
//         });

//         if (!currentSchedule) throw new Error("Job Schedule not found.");

//         // 2. Close current production session
//         await tx.productionResponse.update({
//           where: { id: productionResponseId },
//           data: {
//             scrap: true,
//             scrapQuantity: { increment: 1 },
//             cycleTimeEnd: now,
//             submittedDateTime: now,
//             stationUserId: employeeId,
//           },
//         });

//         // 3. Update Inventory
//         const itemInDb = await tx.partNumber.findUnique({
//           where: { part_id: partId },
//           select: { type: true },
//         });
//         if (itemInDb && itemInDb.type.toLowerCase().includes("part")) {
//           await tx.partNumber.update({
//             where: { part_id: partId },
//             data: { availStock: { decrement: 1 } },
//           });
//         }

//         // 4. Update Current Schedule Qty
//         const newRemaining = Math.max(
//           0,
//           (currentSchedule.remainingQty || 0) - 1,
//         );
//         const isCurrentPartDone = newRemaining <= 0;

//         const updatedCurrentSchedule = await tx.stockOrderSchedule.update({
//           where: { id: currentSchedule.id },
//           data: {
//             scrapQuantity: { increment: 1 },
//             remainingQty: newRemaining,
//             status: isCurrentPartDone ? "completed" : "progress",
//             completed_date: isCurrentPartDone ? now : null,
//             completed_EmpId: isCurrentPartDone ? employeeId : null,
//           },
//         });

//         let nextProductionId = null;
//         let activePartData = null;

//         if (!isCurrentPartDone) {
//           // CASE A: Same Part, Next Qty
//           const nextSession = await tx.productionResponse.create({
//             data: {
//               processId: currentSchedule.processId,
//               stationUserId: employeeId,
//               partId: partId,
//               orderId: orderId,
//               order_type: order_type,
//               cycleTimeStart: new Date(),
//               completedQuantity: 0,
//               scrap: false,
//             },
//           });
//           nextProductionId = nextSession.id;
//           activePartData = updatedCurrentSchedule; // Wahi part rahega
//         } else {
//           // CASE B: Current Part Finished, find NEXT Part
//           const nextSchedule = await tx.stockOrderSchedule.findFirst({
//             where: {
//               order_id: orderId,
//               status: { in: ["pending", "progress", "new"] },
//               isDeleted: false,
//               id: { not: currentSchedule.id }, // Current wala skip karo
//             },
//             orderBy: { id: "asc" },
//           });

//           if (nextSchedule) {
//             const nextPartSession = await tx.productionResponse.create({
//               data: {
//                 processId: nextSchedule.processId,
//                 stationUserId: employeeId,
//                 partId: nextSchedule.part_id,
//                 orderId: orderId,
//                 order_type: order_type,
//                 cycleTimeStart: new Date(),
//                 completedQuantity: 0,
//                 scrap: false,
//               },
//             });
//             nextProductionId = nextPartSession.id;
//             activePartData = nextSchedule; // Naye part ka data bhejo
//           }
//         }

//         return {
//           message: isCurrentPartDone ? "Next part loaded" : "Scrapped",
//           newProductionId: nextProductionId,
//           activePart: activePartData, // Isse UI update hoga
//           isOrderFinished: isCurrentPartDone && !activePartData,
//         };
//       },
//       { timeout: 15000 },
//     );

//     return res.status(200).json(result);
//   } catch (error) {
//     res.status(500).json({ message: error.message });
//   }
// };

// const scrapScheduleOrder = async (req, res) => {
//   try {
//     const { id: productionResponseId } = req.params;
//     const { orderId, partId, employeeId, order_type } = req.body;
//     const now = new Date();

//     const result = await prisma.$transaction(async (tx) => {
//       const currentSchedule = await tx.stockOrderSchedule.findFirst({
//         where: {
//           order_id: orderId,
//           part_id: partId,
//           order_type,
//           isDeleted: false,
//         },
//       });
//       if (!currentSchedule) throw new Error("Job Schedule not found.");

//       // 1. Purane session ko khatam karo (Timer Stop)
//       await tx.productionResponse.update({
//         where: { id: productionResponseId },
//         data: {
//           scrap: true,
//           scrapQuantity: { increment: 1 },
//           cycleTimeEnd: now,
//           submittedDateTime: now,
//           stationUserId: employeeId,
//         },
//       });

//       // 2. Schedule update (Remaining Qty kam karein)
//       const newRemaining = Math.max(0, (currentSchedule.remainingQty || 0) - 1);
//       const isCurrentPartDone = newRemaining <= 0;

//       const updatedCurrentSchedule = await tx.stockOrderSchedule.update({
//         where: { id: currentSchedule.id },
//         data: {
//           scrapQuantity: { increment: 1 },
//           remainingQty: newRemaining,
//           status: isCurrentPartDone ? "completed" : "progress",
//           completed_date: isCurrentPartDone ? now : null,
//         },
//       });

//       let nextProductionId = null;

//       if (!isCurrentPartDone) {
//         // CASE: Same part bacha hai -> NAYA timer session start
//         const nextSession = await tx.productionResponse.create({
//           data: {
//             processId: currentSchedule.processId,
//             stationUserId: employeeId,
//             partId: partId,
//             orderId: orderId,
//             order_type: order_type,
//             cycleTimeStart: new Date(), // FRESH START TIME
//             completedQuantity: 0,
//             scrap: false,
//           },
//         });
//         nextProductionId = nextSession.id;
//       } else {
//         // CASE: Ye part khatam, agla part dhundo (Agar order mein aur parts hain)
//         const nextSchedule = await tx.stockOrderSchedule.findFirst({
//           where: {
//             order_id: orderId,
//             status: { in: ["pending", "progress", "new"] },
//             isDeleted: false,
//             id: { not: currentSchedule.id },
//           },
//           orderBy: { id: "asc" },
//         });

//         if (nextSchedule) {
//           const nextPartSession = await tx.productionResponse.create({
//             data: {
//               processId: nextSchedule.processId,
//               stationUserId: employeeId,
//               partId: nextSchedule.part_id,
//               orderId: orderId,
//               order_type: order_type,
//               cycleTimeStart: new Date(),
//               completedQuantity: 0,
//               scrap: false,
//             },
//           });
//           nextProductionId = nextPartSession.id;
//         }
//       }

//       return {
//         message: "Scrapped successfully",
//         newProductionId: nextProductionId,
//         isOrderFinished: isCurrentPartDone && !nextProductionId,
//       };
//     });

//     return res.status(200).json(result);
//   } catch (error) {
//     res.status(500).json({ message: error.message });
//   }
// };

const scrapScheduleOrder = async (req, res) => {
  try {
    const { id: productionResponseId } = req.params;
    const { orderId, partId, employeeId, order_type } = req.body;
    const now = new Date();

    const result = await prisma.$transaction(async (tx) => {
      const currentSchedule = await tx.stockOrderSchedule.findFirst({
        where: {
          order_id: orderId,
          part_id: partId,
          order_type,
          isDeleted: false,
        },
      });
      if (!currentSchedule) throw new Error("Job Schedule not found.");

      // 1. Purane session ko khatam karo (Timer Stop)
      await tx.productionResponse.update({
        where: { id: productionResponseId },
        data: {
          scrap: true,
          scrapQuantity: { increment: 1 },
          cycleTimeEnd: now,
          submittedDateTime: now,
          stationUserId: employeeId,
        },
      });

      const newRemaining = Math.max(0, (currentSchedule.remainingQty || 0) - 1);
      const isCurrentPartDone = newRemaining <= 0;

      // 2. Schedule update
      await tx.stockOrderSchedule.update({
        where: { id: currentSchedule.id },
        data: {
          scrapQuantity: { increment: 1 },
          remainingQty: newRemaining,
          status: isCurrentPartDone ? "completed" : "progress",
          completed_date: isCurrentPartDone ? now : null,
        },
      });

      let nextSession = null;

      if (!isCurrentPartDone) {
        // CASE A: Same part bacha hai -> NAYA timer session start
        nextSession = await tx.productionResponse.create({
          data: {
            processId: currentSchedule.processId,
            stationUserId: employeeId,
            partId: partId,
            orderId: orderId,
            order_type: order_type,
            cycleTimeStart: new Date(), // FRESH START
            completedQuantity: 0,
            scrap: false,
          },
        });
      } else {
        // CASE B: Agla part dhundo
        const nextSchedule = await tx.stockOrderSchedule.findFirst({
          where: {
            order_id: orderId,
            status: { in: ["pending", "progress", "new"] },
            isDeleted: false,
            id: { not: currentSchedule.id },
          },
          orderBy: { id: "asc" },
        });

        if (nextSchedule) {
          nextSession = await tx.productionResponse.create({
            data: {
              processId: nextSchedule.processId,
              stationUserId: employeeId,
              partId: nextSchedule.part_id,
              orderId: orderId,
              order_type: order_type,
              cycleTimeStart: new Date(), // NEXT PART FRESH START
              completedQuantity: 0,
              scrap: false,
            },
          });
        }
      }

      return {
        message: "Scrapped successfully",
        newProductionId: nextSession?.id || null, // Naya ID return karein
        isOrderFinished: isCurrentPartDone && !nextSession,
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
      ...(userRole !== "superAdmin" && { createdBy: userId }),
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

// const qualityPerformance = async (req, res) => {
//   try {
//     const { startDate, endDate } = req.query;
//     const start = startDate
//       ? new Date(new Date(startDate).setHours(0, 0, 0, 0))
//       : new Date(new Date().setHours(0, 0, 0, 0));
//     const end = endDate
//       ? new Date(new Date(endDate).setHours(23, 59, 59, 999))
//       : new Date(new Date().setHours(23, 59, 59, 999));
//     const whereCondition = {
//       isDeleted: false,
//       updatedAt: { gte: start, lte: end },
//     };

//     const [rawData, scrapEntriesRecords] = await Promise.all([
//       prisma.stockOrderSchedule.findMany({
//         where: whereCondition,
//         include: {
//           process: true,
//           part: {
//             select: {
//               part_id: true,
//               partNumber: true,
//               partDescription: true,
//             },
//           },
//         },
//       }),
//       prisma.scapEntries.findMany({
//         where: whereCondition,
//         include: {
//           PartNumber: {
//             select: {
//               part_id: true,
//               partNumber: true,
//               partDescription: true,
//               process: { select: { processName: true, machineName: true } },
//             },
//           },
//           process: { select: { processName: true, machineName: true } },
//           supplier: { select: { firstName: true, lastName: true } },
//           customers: { select: { firstName: true, lastName: true } },
//         },
//       }),
//     ]);

//     const mergedMap = new Map();
//     const supplierScrapDetails = [];
//     const customerScrapDetails = [];

//     const updateMap = (id, partInfo, scrapQty, scheduleQty, date, process) => {
//       if (!id) return;
//       if (!mergedMap.has(id)) {
//         mergedMap.set(id, {
//           partId: id,
//           partNumber: partInfo?.partNumber || "Unknown",
//           partDescription: partInfo?.partDescription || "",
//           processName:
//             process?.processName || partInfo?.process?.processName || "N/A",
//           machineName:
//             process?.machineName || partInfo?.process?.machineName || "N/A",
//           scrapQuantity: Number(scrapQty) || 0,
//           scheduleQuantity: Number(scheduleQty) || 0,
//           latestDate: date,
//         });
//       } else {
//         const existing = mergedMap.get(id);
//         existing.scrapQuantity += Number(scrapQty) || 0;
//         existing.scheduleQuantity += Number(scheduleQty) || 0;
//         if (date > existing.latestDate) existing.latestDate = date;
//       }
//     };

//     rawData.forEach((item) => {
//       if (item.part) {
//         updateMap(
//           item.part.part_id,
//           item.part,
//           item.scrapQuantity,
//           item.scheduleQuantity,
//           item.updatedAt,
//           item.process,
//         );
//       }
//     });

//     scrapEntriesRecords.forEach((scrap) => {
//       const partInfo = scrap.PartNumber;
//       const key = scrap.partId || partInfo?.part_id;
//       const sQty =
//         (Number(scrap.scrapQuantity) || 0) +
//         (Number(scrap.returnQuantity) || 0);

//       if (key) {
//         updateMap(key, partInfo, sQty, 0, scrap.updatedAt, scrap.process);

//         const commonDetail = {
//           partNumber: partInfo?.partNumber,
//           quantity: sQty,
//           defectDesc: scrap.defectDesc,
//           date: scrap.updatedAt,
//           type: scrap.type,
//         };

//         if (scrap.supplierId || scrap.returnSupplierId) {
//           supplierScrapDetails.push({
//             ...commonDetail,
//             supplierName:
//               `${scrap.supplier?.firstName || ""} ${scrap.supplier?.lastName || ""}`.trim() ||
//               "N/A",
//           });
//         }

//         if (scrap.customersId) {
//           customerScrapDetails.push({
//             ...commonDetail,
//             customerName:
//               `${scrap.customers?.firstName || ""} ${scrap.customers?.lastName || ""}`.trim() ||
//               "N/A",
//           });
//         }
//       }
//     });

//     const data = Array.from(mergedMap.values()).filter(
//       (item) => item.scrapQuantity > 0,
//     );
//     data.sort((a, b) => b.scrapQuantity - a.scrapQuantity);

//     const totalScrapQty = data.reduce(
//       (acc, item) => acc + item.scrapQuantity,
//       0,
//     );

//     return res.status(200).json({
//       success: true,
//       totalScrapQty,
//       totalEntries: data.length,
//       data: data,
//       supplierScrapDetails,
//       customerScrapDetails,
//     });
//   } catch (error) {
//     return res.status(500).json({ success: false, error: error.message });
//   }
// };

const qualityPerformance = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    // --- DATE FIX: Local Timezone Sync (Split Logic) ---
    let start, end;

    if (startDate) {
      const [sy, sm, sd] = startDate.split("-").map(Number);
      start = new Date(sy, sm - 1, sd, 0, 0, 0, 0); // Local 00:00:00

      const [ey, em, ed] = (endDate || startDate).split("-").map(Number);
      end = new Date(ey, em - 1, ed, 23, 59, 59, 999); // Local 23:59:59
    } else {
      // Agar date nahi di, toh aaj ki local date range
      const today = new Date();
      start = new Date(
        today.getFullYear(),
        today.getMonth(),
        today.getDate(),
        0,
        0,
        0,
        0,
      );
      end = new Date(
        today.getFullYear(),
        today.getMonth(),
        today.getDate(),
        23,
        59,
        59,
        999,
      );
    }

    const whereCondition = {
      isDeleted: false,
      updatedAt: { gte: start, lte: end },
    };

    const [rawData, scrapEntriesRecords] = await Promise.all([
      prisma.stockOrderSchedule.findMany({
        where: whereCondition,
        include: {
          process: true,
          part: {
            select: {
              part_id: true,
              partNumber: true,
              partDescription: true,
            },
          },
        },
      }),
      prisma.scapEntries.findMany({
        where: {
          isDeleted: false,
          updatedAt: { gte: start, lte: end }, // createdAt ki jagah updatedAt filter taaki performance synced rahe
        },
        include: {
          PartNumber: {
            select: {
              part_id: true,
              partNumber: true,
              partDescription: true,
              process: { select: { processName: true, machineName: true } },
            },
          },
          process: { select: { processName: true, machineName: true } },
          supplier: { select: { firstName: true, lastName: true } },
          customers: { select: { firstName: true, lastName: true } },
        },
      }),
    ]);

    const mergedMap = new Map();
    const supplierScrapDetails = [];
    const customerScrapDetails = [];

    const updateMap = (id, partInfo, scrapQty, scheduleQty, date, process) => {
      if (!id) return;
      if (!mergedMap.has(id)) {
        mergedMap.set(id, {
          partId: id,
          partNumber: partInfo?.partNumber || "Unknown",
          partDescription: partInfo?.partDescription || "",
          processName:
            process?.processName || partInfo?.process?.processName || "N/A",
          machineName:
            process?.machineName || partInfo?.process?.machineName || "N/A",
          scrapQuantity: Number(scrapQty) || 0,
          scheduleQuantity: Number(scheduleQty) || 0,
          latestDate: date,
        });
      } else {
        const existing = mergedMap.get(id);
        existing.scrapQuantity += Number(scrapQty) || 0;
        existing.scheduleQuantity += Number(scheduleQty) || 0;
        if (date > existing.latestDate) existing.latestDate = date;
      }
    };

    // Processing Schedule Data
    rawData.forEach((item) => {
      if (item.part) {
        updateMap(
          item.part.part_id,
          item.part,
          item.scrapQuantity,
          item.scheduleQuantity,
          item.updatedAt,
          item.process,
        );
      }
    });

    // Processing Manual Scrap Records
    scrapEntriesRecords.forEach((scrap) => {
      const partInfo = scrap.PartNumber;
      const key = scrap.partId || partInfo?.part_id;
      const sQty =
        (Number(scrap.scrapQuantity) || 0) +
        (Number(scrap.returnQuantity) || 0);

      if (key) {
        updateMap(key, partInfo, sQty, 0, scrap.updatedAt, scrap.process);

        const commonDetail = {
          partNumber: partInfo?.partNumber,
          quantity: sQty,
          defectDesc: scrap.defectDesc,
          date: scrap.updatedAt,
          type: scrap.type,
        };

        if (scrap.supplierId || scrap.returnSupplierId) {
          supplierScrapDetails.push({
            ...commonDetail,
            supplierName:
              `${scrap.supplier?.firstName || ""} ${scrap.supplier?.lastName || ""}`.trim() ||
              "N/A",
          });
        }

        if (scrap.customersId) {
          customerScrapDetails.push({
            ...commonDetail,
            customerName:
              `${scrap.customers?.firstName || ""} ${scrap.customers?.lastName || ""}`.trim() ||
              "N/A",
          });
        }
      }
    });

    const data = Array.from(mergedMap.values()).filter(
      (item) => item.scrapQuantity > 0,
    );
    data.sort((a, b) => b.scrapQuantity - a.scrapQuantity);

    const totalScrapQty = data.reduce(
      (acc, item) => acc + item.scrapQuantity,
      0,
    );

    return res.status(200).json({
      success: true,
      totalScrapQty,
      totalEntries: data.length,
      data: data,
      supplierScrapDetails,
      customerScrapDetails,
      // Debug info (optional)
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
    const whereClause = { isDeleted: false };
    if (startDate || endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      whereClause.order_date = { gte: start, lte: end };
    } else if (year) {
      const startOfYear = new Date(`${year}-01-01T00:00:00.000Z`);
      const endOfYear = new Date(`${year}-12-31T23:59:59.999Z`);
      whereClause.order_date = { gte: startOfYear, lte: endOfYear };
    }

    const [schedules, manualScrapEntries] = await Promise.all([
      prisma.stockOrderSchedule.findMany({
        where: whereClause,
        include: {
          part: true,
          process: true,
        },
      }),
      prisma.scapEntries.findMany({
        where: { isDeleted: false, createdAt: whereClause.order_date },
        include: { PartNumber: true },
      }),
    ]);

    let totalCOGS = 0;
    let totalScrapCost = 0;
    let supplierReturn = 0;
    const monthlyCOGS = {};

    schedules.forEach((order) => {
      const date = new Date(order.order_date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      const qtyFulfilled = order.completedQuantity || 0;
      const partCost = parseFloat(order.part?.cost || 0);
      const cycleTimeHours = (parseFloat(order.part?.cycleTime) || 0) / 60;
      const ratePerHour = order.process?.ratePerHour || 0;
      const unitLabor = cycleTimeHours * ratePerHour;
      const orderCOGS = (partCost + unitLabor) * qtyFulfilled;
      if (qtyFulfilled > 0) {
        totalCOGS += orderCOGS;
        monthlyCOGS[monthKey] = (monthlyCOGS[monthKey] || 0) + orderCOGS;
      }
      totalScrapCost += (order.scrapQuantity || 0) * partCost;
    });
    manualScrapEntries.forEach((entry) => {
      const qty = Number(entry.returnQuantity) || 0;
      const partCost = parseFloat(entry.PartNumber?.cost || 0);
      const cost = qty * partCost;
      totalScrapCost += cost;
      if (
        entry.supplierId ||
        entry.type === "supplier" ||
        entry.returnSupplierId
      ) {
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
    res.status(500).json({ message: error.message });
  }
};

// const costingApi = async (req, res) => {
//   try {
//     const { startDate, endDate, year } = req.query;
//     const whereClause = { isDeleted: false };

//     // Date Range Logic Fix
//     if (startDate) {
//       const [y, m, d] = startDate.split("-").map(Number);
//       const start = new Date(y, m - 1, d, 0, 0, 0, 0); // Local 00:00:00

//       const [ey, em, ed] = (endDate || startDate).split("-").map(Number);
//       const end = new Date(ey, em - 1, ed, 23, 59, 59, 999); // Local 23:59:59

//       whereClause.order_date = { gte: start, lte: end };
//     } else if (year) {
//       whereClause.order_date = {
//         gte: new Date(`${year}-01-01T00:00:00.000Z`),
//         lte: new Date(`${year}-12-31T23:59:59.999Z`),
//       };
//     }
//     const [schedules, manualScrapEntries] = await Promise.all([
//       prisma.stockOrderSchedule.findMany({
//         where: whereClause,
//         include: { part: true, process: true },
//       }),
//       prisma.scapEntries.findMany({
//         where: { isDeleted: false, updatedAt: whereClause.order_date }, // updatedAt use kiya taaki filter kaam kare
//         include: { PartNumber: true },
//       }),
//     ]);

//     let totalCOGS = 0;
//     let totalScrapCost = 0;
//     let supplierReturn = 0;
//     const monthlyCOGS = {};

//     schedules.forEach((order) => {
//       const date = new Date(order.order_date);
//       const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;

//       const qtyFulfilled = Number(order.completedQuantity) || 0;
//       const partCost = parseFloat(order.part?.cost || 0);
//       const cycleTimeHours = (parseFloat(order.part?.cycleTime) || 0) / 60;
//       const ratePerHour = parseFloat(order.process?.ratePerHour || 0);

//       // Formula: (Material Cost + Labor Cost) * Qty
//       const unitLabor = cycleTimeHours * ratePerHour;
//       const orderCOGS = (partCost + unitLabor) * qtyFulfilled;

//       if (qtyFulfilled > 0) {
//         totalCOGS += orderCOGS;
//         monthlyCOGS[monthKey] = (monthlyCOGS[monthKey] || 0) + orderCOGS;
//       }
//       totalScrapCost += (Number(order.scrapQuantity) || 0) * partCost;
//     });

//     manualScrapEntries.forEach((entry) => {
//       const qty =
//         Number(entry.scrapQuantity) || Number(entry.returnQuantity) || 0;
//       const partCost = parseFloat(entry.PartNumber?.cost || 0);
//       const cost = qty * partCost;
//       totalScrapCost += cost;

//       if (
//         entry.supplierId ||
//         entry.type === "supplier" ||
//         entry.returnSupplierId
//       ) {
//         supplierReturn += cost;
//       }
//     });

//     res.json({
//       success: true,
//       totalCOGS: parseFloat(totalCOGS.toFixed(2)),
//       scrapCost: parseFloat(totalScrapCost.toFixed(2)),
//       supplierReturn: parseFloat(supplierReturn.toFixed(2)),
//       monthlyCOGS,
//     });
//   } catch (error) {
//     res.status(500).json({ message: error.message });
//   }
// };

// const costingApi = async (req, res) => {
//   try {
//     const { startDate, endDate, year } = req.query;

//     // 1. Date Range Logic (Cycle Time API ki tarah simplified aur robust)
//     let start, end;

//     if (startDate) {
//       start = new Date(startDate);
//       start.setHours(0, 0, 0, 0); // Start of the day

//       const endRef = endDate ? new Date(endDate) : new Date(startDate);
//       end = new Date(endRef);
//       end.setHours(23, 59, 59, 999); // End of the day
//     } else if (year) {
//       start = new Date(`${year}-01-01T00:00:00.000Z`);
//       end = new Date(`${year}-12-31T23:59:59.999Z`);
//     } else {
//       // Default range agar kuch na mile (Optional)
//       start = new Date("2024-01-01T00:00:00.000Z");
//       end = new Date("2025-12-31T23:59:59.999Z");
//     }

//     // Common Where Clause for Dates
//     const dateFilter = { gte: start, lte: end };

//     // 2. Parallel Database Queries
//     const [schedules, manualScrapEntries] = await Promise.all([
//       prisma.stockOrderSchedule.findMany({
//         where: {
//           isDeleted: false,
//           order_date: dateFilter,
//         },
//         include: { part: true, process: true },
//       }),
//       prisma.scapEntries.findMany({
//         where: {
//           isDeleted: false,
//           updatedAt: dateFilter, // Ya createdAt, jo aapke business logic ke liye sahi ho
//         },
//         include: { PartNumber: true },
//       }),
//     ]);

//     let totalCOGS = 0;
//     let totalScrapCost = 0;
//     let supplierReturn = 0;
//     const monthlyCOGS = {};

//     // 3. Process Schedules (COGS & Scrap)
//     schedules.forEach((order) => {
//       const date = new Date(order.order_date);
//       const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;

//       const qtyFulfilled = Number(order.completedQuantity) || 0;
//       const scrapQty = Number(order.scrapQuantity) || 0;
//       const partCost = parseFloat(order.part?.cost || 0);
//       const cycleTimeHours = (parseFloat(order.part?.cycleTime) || 0) / 60;
//       const ratePerHour = parseFloat(order.process?.ratePerHour || 0);

//       // Formula: (Material Cost + Labor Cost) * Qty
//       const unitLabor = cycleTimeHours * ratePerHour;
//       const orderCOGS = (partCost + unitLabor) * qtyFulfilled;

//       if (qtyFulfilled > 0) {
//         totalCOGS += orderCOGS;
//         monthlyCOGS[monthKey] = (monthlyCOGS[monthKey] || 0) + orderCOGS;
//       }

//       // Order table se scrap cost
//       totalScrapCost += scrapQty * partCost;
//     });

//     // 4. Process Manual Scrap Entries
//     manualScrapEntries.forEach((entry) => {
//       const qty =
//         Number(entry.scrapQuantity) || Number(entry.returnQuantity) || 0;
//       const partCost = parseFloat(entry.PartNumber?.cost || 0);
//       const cost = qty * partCost;

//       totalScrapCost += cost;

//       // Supplier Return check
//       if (
//         entry.supplierId ||
//         entry.type === "supplier" ||
//         entry.returnSupplierId
//       ) {
//         supplierReturn += cost;
//       }
//     });

//     res.json({
//       success: true,
//       dateRange: { start, end }, // Debugging ke liye help karega
//       totalCOGS: parseFloat(totalCOGS.toFixed(2)),
//       scrapCost: parseFloat(totalScrapCost.toFixed(2)),
//       supplierReturn: parseFloat(supplierReturn.toFixed(2)),
//       monthlyCOGS,
//     });
//   } catch (error) {
//     console.error("Costing API Error:", error);
//     res.status(500).json({ message: error.message });
//   }
// };

// const costingApi = async (req, res) => {
//   try {
//     const { startDate, endDate, year } = req.query;

//     // 1. Date Range Logic (Flexible for Dashboard)
//     let start, end;
//     if (startDate) {
//       start = new Date(startDate);
//       start.setHours(0, 0, 0, 0);
//       const endRef = endDate ? new Date(endDate) : new Date(startDate);
//       end = new Date(endRef);
//       end.setHours(23, 59, 59, 999);
//     } else if (year) {
//       start = new Date(`${year}-01-01T00:00:00.000Z`);
//       end = new Date(`${year}-12-31T23:59:59.999Z`);
//     } else {
//       const currentYear = new Date().getFullYear();
//       start = new Date(`${currentYear}-01-01T00:00:00.000Z`);
//       end = new Date(`${currentYear}-12-31T23:59:59.999Z`);
//     }

//     const dateFilter = { gte: start, lte: end };

//     // 2. Database Queries (Same tables as productionEfficiency)
//     const [scheduleData, scrapFromEntries] = await Promise.all([
//       prisma.stockOrderSchedule.findMany({
//         where: {
//           isDeleted: false,
//           order_date: dateFilter,
//         },
//         include: { part: true, process: true },
//       }),
//       prisma.scapEntries.findMany({
//         where: {
//           isDeleted: false,
//           createdAt: dateFilter, // Matches productionEfficiency
//         },
//         include: { PartNumber: true },
//       }),
//     ]);

//     let totalCOGS = 0;
//     let totalScrapCost = 0;
//     let totalSupplierReturn = 0;
//     const monthlyCOGS = {};

//     // 3. Process Schedule Data (COGS + Scrap)
//     scheduleData.forEach((item) => {
//       const d = new Date(item.order_date || item.createdAt);
//       const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;

//       const compQty = Number(item.completedQuantity) || 0;
//       const scrpQty = Number(item.scrapQuantity) || 0;
//       const partCost = parseFloat(item.part?.cost || 0);

//       // COGS Logic (Material + Labor)
//       const cycleTimeHours = (parseFloat(item.part?.cycleTime) || 0) / 60;
//       const ratePerHour = parseFloat(item.process?.ratePerHour || 0);
//       const unitLabor = cycleTimeHours * ratePerHour;
//       const itemCOGS = (partCost + unitLabor) * compQty;

//       if (compQty > 0) {
//         totalCOGS += itemCOGS;
//         monthlyCOGS[monthKey] = (monthlyCOGS[monthKey] || 0) + itemCOGS;
//       }

//       // Scrap Cost Logic (Matches productionEfficiency)
//       if (scrpQty > 0) {
//         totalScrapCost += scrpQty * partCost;
//       }
//     });

//     // 4. Process Manual Scrap Entries (Matches productionEfficiency)
//     scrapFromEntries.forEach((entry) => {
//       // productionEfficiency uses 'returnQuantity'
//       const entryQty = Number(entry.returnQuantity) || 0;
//       const entryPartCost = parseFloat(entry.PartNumber?.cost || 0);
//       const entryTotalCost = entryQty * entryPartCost;

//       if (entryQty > 0) {
//         totalScrapCost += entryTotalCost;

//         // Supplier Return check (Matches productionEfficiency)
//         if (
//           entry.supplierId ||
//           entry.type === "supplier" ||
//           entry.returnSupplierId
//         ) {
//           totalSupplierReturn += entryTotalCost;
//         }
//       }
//     });

//     res.json({
//       success: true,
//       totalCOGS: parseFloat(totalCOGS.toFixed(2)),
//       scrapCost: parseFloat(totalScrapCost.toFixed(2)), // Now matches exactly
//       supplierReturn: parseFloat(totalSupplierReturn.toFixed(2)), // Now matches exactly
//       monthlyCOGS,
//     });
//   } catch (error) {
//     console.error("Costing API Error:", error);
//     res.status(500).json({ success: false, message: error.message });
//   }
// };

// const costingApi = async (req, res) => {
//   try {
//     // 1. Date Range Logic (Efficiency API ke logic se 100% match)
//     const { month, year, startDate, endDate } = req.query;
//     let start, end;

//     if (month && year) {
//       // Bilkul productionEfficiency wala constructor (Local Time)
//       start = new Date(year, month - 1, 1, 0, 0, 0);
//       end = new Date(year, month, 0, 23, 59, 59, 999);
//     } else if (startDate) {
//       start = new Date(startDate);
//       start.setHours(0, 0, 0, 0);
//       const endRef = endDate ? new Date(endDate) : new Date(startDate);
//       end = new Date(endRef);
//       end.setHours(23, 59, 59, 999);
//     } else if (year) {
//       start = new Date(year, 0, 1, 0, 0, 0);
//       end = new Date(year, 11, 31, 23, 59, 59, 999);
//     } else {
//       // Default: Current Month (Local Time)
//       const now = new Date();
//       start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
//       end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
//     }

//     const dateFilter = { gte: start, lte: end };

//     // 2. Data Fetching (ProductionEfficiency ki tarah same tables aur filters)
//     const [scheduleData, scrapFromEntries] = await Promise.all([
//       prisma.stockOrderSchedule.findMany({
//         where: {
//           isDeleted: false,
//           order_date: dateFilter,
//         },
//         include: { part: true, process: true },
//       }),
//       prisma.scapEntries.findMany({
//         where: {
//           isDeleted: false,
//           createdAt: dateFilter, // FIX: updatedAt ki jagah createdAt (Efficiency API match)
//         },
//         include: { PartNumber: true },
//       }),
//     ]);

//     let totalCOGS = 0;
//     let totalScrapCost = 0;
//     let totalSupplierReturn = 0;
//     const monthlyCOGS = {};

//     // 3. Process Schedule Data (COGS + Schedule Scrap)
//     scheduleData.forEach((item) => {
//       const d = new Date(item.order_date || item.createdAt);
//       const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;

//       const compQty = Number(item.completedQuantity) || 0;
//       const scrpQty = Number(item.scrapQuantity) || 0;
//       const partCost = parseFloat(item.part?.cost || 0);

//       // COGS Calculation
//       const cycleTimeHours = (parseFloat(item.part?.cycleTime) || 0) / 60;
//       const ratePerHour = parseFloat(item.process?.ratePerHour || 0);
//       const itemCOGS = (partCost + cycleTimeHours * ratePerHour) * compQty;

//       if (compQty > 0) {
//         totalCOGS += itemCOGS;
//         monthlyCOGS[monthKey] = (monthlyCOGS[monthKey] || 0) + itemCOGS;
//       }

//       // Schedule Scrap Logic (Matches Efficiency)
//       if (scrpQty > 0) {
//         totalScrapCost += scrpQty * partCost;
//       }
//     });

//     // 4. Process Manual Scrap Entries (Matches Efficiency Logic)
//     scrapFromEntries.forEach((entry) => {
//       // productionEfficiency sirf returnQuantity use karti hai
//       const entryQty = Number(entry.returnQuantity) || 0;
//       const entryPartCost = parseFloat(entry.PartNumber?.cost || 0);
//       const entryTotalCost = entryQty * entryPartCost;

//       if (entryQty > 0) {
//         totalScrapCost += entryTotalCost;

//         // Supplier Return check (Matches Efficiency)
//         if (
//           entry.supplierId ||
//           entry.type === "supplier" ||
//           entry.returnSupplierId
//         ) {
//           totalSupplierReturn += entryTotalCost;
//         }
//       }
//     });

//     res.json({
//       success: true,
//       totalCOGS: parseFloat(totalCOGS.toFixed(2)),
//       scrapCost: parseFloat(totalScrapCost.toFixed(2)), // Ab 8 aayega
//       supplierReturn: parseFloat(totalSupplierReturn.toFixed(2)), // Ab 2 aayega
//       monthlyCOGS,
//     });
//   } catch (error) {
//     console.error("Costing API Error:", error);
//     res.status(500).json({ success: false, message: error.message });
//   }
// };
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
        StockOrder: { include: { customer: true } },
        CustomOrder: { include: { customer: true, product: true } },
      },
    });

    const stockOrderIds = [
      ...new Set(
        allSchedules
          .filter((s) => s.order_type.toLowerCase().includes("stock"))
          .map((s) => s.order_id),
      ),
    ];
    const customOrderIds = [
      ...new Set(
        allSchedules
          .filter((s) => !s.order_type.toLowerCase().includes("stock"))
          .map((s) => s.order_id),
      ),
    ];

    const [extraStockOrders, extraCustomOrders] = await Promise.all([
      prisma.stockOrder.findMany({
        where: { id: { in: stockOrderIds } },
        include: { customer: true },
      }),
      prisma.customOrder.findMany({
        where: { id: { in: customOrderIds } },
        include: { customer: true, product: true },
      }),
    ]);

    const stockLookup = Object.fromEntries(
      extraStockOrders.map((o) => [o.id, o]),
    );
    const customLookup = Object.fromEntries(
      extraCustomOrders.map((o) => [o.id, o]),
    );

    const openOrders = [];
    const fulfilledOrders = [];
    const performance = [];

    allSchedules.forEach((sch) => {
      const schStatus = (sch.status || "").toLowerCase().trim();
      const isStock = sch.order_type?.toLowerCase().includes("stock");
      const orderRef = isStock
        ? sch.StockOrder || stockLookup[sch.order_id]
        : sch.CustomOrder || customLookup[sch.order_id];

      if (!orderRef) return;
      const firstName =
        orderRef.customer?.firstName ||
        orderRef.customerName?.split(" ")[0] ||
        "N/A";
      const lastName =
        orderRef.customer?.lastName ||
        orderRef.customerName?.split(" ").slice(1).join(" ") ||
        "";

      const commonData = {
        Date: sch.updatedAt.toISOString().split("T")[0],
        "Order Number": orderRef.orderNumber || "N/A",
        "Order Type": isStock ? "Stock" : "Custom",
        "First Name": firstName,
        "Last Name": lastName,
        Product: isStock
          ? orderRef.productDescription ||
            orderRef.productNumber ||
            "Stock Item"
          : orderRef.partNumber ||
            orderRef.product?.partDescription ||
            "Custom Item",
        "Order Quantity": orderRef.productQuantity || 0,
        "Scheduled Quantity": sch.scheduleQuantity || 0,
        "Completed Quantity": sch.completedQuantity || 0,
      };

      if (schStatus === "completed" || schStatus === "complete") {
        fulfilledOrders.push({ ...commonData, Status: "Completed" });
      } else {
        openOrders.push({ ...commonData, Status: sch.status || "In Progress" });
      }
      let efficiencyPercentage = "0.00%";
      if (orderRef.productQuantity > 0) {
        const rawEfficiency =
          (sch.completedQuantity / orderRef.productQuantity) * 100;
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
    });

    const scrapData = await prisma.scapEntries.findMany({
      where: { scrapStatus: true, createdAt: { gte: start, lte: end } },
      include: { PartNumber: { include: { supplier: true } }, supplier: true },
    });

    const formattedScrap = scrapData.map((entry) => ({
      "Part Number": entry.PartNumber?.partNumber || "N/A",
      "Return Quantity": entry.returnQuantity || 0,
      "Supplier Company Name":
        entry.supplier?.companyName ||
        entry.PartNumber?.supplier?.companyName ||
        "N/A",
    }));

    return res.status(200).json({
      message: "Success",
      data: {
        openOrders,
        fulfilledOrders,
        performance,
        scapEntries: formattedScrap,
      },
    });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Internal Server Error", error: error.message });
  }
};
// const getScheduleProcessInformation = async (req, res) => {
//   try {
//     const { id: processId } = req.params;
//     const { stationUserId } = req.query;

//     if (!processId || !stationUserId) {
//       return res
//         .status(400)
//         .json({ message: "processId and stationUserId are required." });
//     }
//     const candidates = await prisma.stockOrderSchedule.findMany({
//       where: {
//         processId: processId,
//         isDeleted: false,
//         status: { in: ["new", "progress"] },
//       },
//       include: {
//         part: true,
//         customPart: true,
//         process: true,
//         StockOrder: { select: { orderNumber: true } },
//         CustomOrder: { select: { orderNumber: true } },
//       },
//     });

//     if (candidates.length === 0) {
//       return res
//         .status(404)
//         .json({ message: "No jobs assigned to this station." });
//     }
//     const partIds = candidates.map((c) => c.part_id).filter(Boolean);
//     const relations = await prisma.productTree.findMany({
//       where: {
//         product_id: { in: partIds },
//         isDeleted: false,
//       },
//     });
//     const validatedCandidates = [];

//     for (const job of candidates) {
//       const currentPartId = job.part_id;
//       const childRelations = relations.filter(
//         (r) => r.product_id === currentPartId,
//       );

//       if (childRelations.length > 0) {
//         const childPartIds = childRelations.map((r) => r.part_id);
//         const unfinishedChildren = await prisma.stockOrderSchedule.findMany({
//           where: {
//             order_id: job.order_id,
//             part_id: { in: childPartIds },
//             remainingQty: { gt: 0 },
//             isDeleted: false,
//           },
//         });
//         if (unfinishedChildren.length === 0) {
//           validatedCandidates.push({ ...job, isLocked: false });
//         } else {
//           continue;
//         }
//       } else {
//         validatedCandidates.push({ ...job, isLocked: false });
//       }
//     }

//     const sortedCandidates = validatedCandidates.sort((a, b) => {
//       if (a.status !== b.status) return a.status === "progress" ? -1 : 1;
//       const isAParentOfB = relations.some(
//         (r) => r.product_id === a.part_id && r.part_id === b.part_id,
//       );
//       if (isAParentOfB) return 1;

//       const isBParentOfA = relations.some(
//         (r) => r.product_id === b.part_id && r.part_id === a.part_id,
//       );
//       if (isBParentOfA) return -1;

//       return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
//     });

//     const nextJob = sortedCandidates[0];
//     const currentPartId = nextJob.part_id || nextJob.customPartId;
//     const incomingJobs = sortedCandidates.slice(1).map((job) => ({
//       scheduleId: job.id,
//       orderNumber:
//         job.StockOrder?.orderNumber || job.CustomOrder?.orderNumber || "N/A",
//       partNumber: job.part?.partNumber || job.customPart?.partNumber || "N/A",
//       quantity: job.scheduleQuantity || job.quantity,
//       remainingQty: job.remainingQty,
//       status: job.status,
//       type: job.order_type,
//       scheudleDate: job.order_date,
//     }));

//     const currentSession = await prisma.productionResponse.findFirst({
//       where: {
//         processId: processId,
//         stationUserId: stationUserId,
//         partId: currentPartId,
//         orderId: nextJob.order_id,
//         completedQuantity: 0,
//         scrap: false,
//         cycleTimeEnd: null,
//         isDeleted: false,
//       },
//       orderBy: { createdAt: "desc" },
//       include: { employeeInfo: true },
//     });

//     const lastProduction =
//       currentSession ||
//       (await prisma.productionResponse.findFirst({
//         where: { processId, stationUserId, isDeleted: false },
//         orderBy: { createdAt: "desc" },
//         include: { employeeInfo: true },
//       }));

//     const [orderData, workInstructions, stats] = await Promise.all([
//       nextJob.order_type === "StockOrder"
//         ? prisma.stockOrder.findUnique({ where: { id: nextJob.order_id } })
//         : prisma.customOrder.findUnique({ where: { id: nextJob.order_id } }),
//       prisma.workInstruction.findFirst({
//         where: {
//           productId: currentPartId || undefined,
//           processId: processId,
//           isDeleted: false,
//         },
//         include: {
//           steps: {
//             where: { isDeleted: false },
//             orderBy: { stepNumber: "asc" },
//             include: { images: true, videos: true },
//           },
//         },
//       }),
//       prisma.stockOrderSchedule.aggregate({
//         where: { order_id: nextJob.order_id, processId, isDeleted: false },
//         _sum: { completedQuantity: true, scrapQuantity: true },
//       }),
//     ]);

//     return res.status(200).json({
//       message: "Job Found",
//       data: {
//         ...nextJob,
//         processName: nextJob.process?.processName || "N/A",
//         partNumber:
//           nextJob.part?.partNumber || nextJob.customPart?.partNumber || "N/A",
//         order: orderData,
//         workInstructionSteps: workInstructions?.steps || [],
//         instructionTitle:
//           workInstructions?.instructionTitle || "No Instructions Found",
//         productionId: lastProduction?.id || null,
//         employeeInfo: lastProduction?.employeeInfo || null,
//         employeeCompletedQty: stats._sum.completedQuantity || 0,
//         employeeScrapQty: stats._sum.scrapQuantity || 0,
//         incomingJobs: incomingJobs,
//         cycleTime: lastProduction?.cycleTimeStart || null,
//       },
//     });
//   } catch (error) {
//     return res
//       .status(500)
//       .json({ message: "Internal Server Error", error: error.message });
//   }
// };

const getScheduleProcessInformation = async (req, res) => {
  try {
    const { id: processId } = req.params;
    const { stationUserId } = req.query;

    if (!processId || !stationUserId) {
      return res
        .status(400)
        .json({ message: "processId and stationUserId are required." });
    }
    const candidates = await prisma.stockOrderSchedule.findMany({
      where: {
        processId: processId,
        isDeleted: false,
        status: { in: ["new", "progress"] },
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
      return res
        .status(404)
        .json({ message: "No jobs assigned to this station." });
    }

    // --- PARENT-CHILD VALIDATION LOOP YAHAN SE HATA DIYA GAYA HAI ---

    // 2. Sorting: Ab sirf status aur date ke basis par sort hoga
    // "progress" wale pehle aayenge, phir "new" wale creation date ke hisaab se
    const sortedCandidates = candidates.sort((a, b) => {
      if (a.status !== b.status) return a.status === "progress" ? -1 : 1;
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    });
    console.log("sortedCandidatessortedCandidates", sortedCandidates);

    const nextJob = sortedCandidates[0];
    console.log("nextJobnextJob", nextJob);
    const currentPartId = nextJob.part_id || nextJob.customPartId;

    // 3. Incoming jobs ki list taiyar karein
    const incomingJobs = sortedCandidates.slice(1).map((job) => ({
      scheduleId: job.id,
      orderNumber:
        job.StockOrder?.orderNumber || job.CustomOrder?.orderNumber || "N/A",
      partNumber: job.part?.partNumber || job.customPart?.partNumber || "N/A",
      quantity: job.scheduleQuantity || job.quantity,
      remainingQty: job.remainingQty,
      status: job.status,
      type: job.order_type,
      scheudleDate: job.order_date,
    }));

    //     const currentSession = await prisma.productionResponse.findFirst({
    //       where: {
    //         processId: processId,
    //         stationUserId: stationUserId,
    //         partId: currentPartId,
    //         orderId: nextJob.order_id,
    //         completedQuantity: 0,
    //         scrap: false,
    //         cycleTimeEnd: null,
    //         isDeleted: false,
    //       },
    //       orderBy: { createdAt: "desc" },
    //       include: { employeeInfo: true },
    //     });

    //     const lastProduction =
    //       currentSession ||
    //       (await prisma.productionResponse.findFirst({
    //         where: { processId, stationUserId, isDeleted: false },
    //         orderBy: { createdAt: "desc" },
    //         include: { employeeInfo: true },
    //       }));

    // 4. Production response aur session check karein
    const currentSession = await prisma.productionResponse.findFirst({
      where: {
        processId: processId,
        stationUserId: stationUserId,
        partId: currentPartId,
        orderId: nextJob.order_id,
        cycleTimeEnd: null, // <--- Sirf wahi session jo abhi chal raha hai (Running)
        isDeleted: false,
      },
      orderBy: { createdAt: "desc" },
      include: { employeeInfo: true },
    });

    const lastProduction =
      currentSession ||
      (await prisma.productionResponse.findFirst({
        where: { processId, stationUserId, isDeleted: false },
        orderBy: { createdAt: "desc" },
        include: { employeeInfo: true },
      }));

    // 5. Order data, instructions aur stats fetch karein
    const [orderData, workInstructions, stats] = await Promise.all([
      nextJob.order_type === "StockOrder"
        ? prisma.stockOrder.findUnique({ where: { id: nextJob.order_id } })
        : prisma.customOrder.findUnique({ where: { id: nextJob.order_id } }),
      prisma.workInstruction.findFirst({
        where: {
          productId: currentPartId || undefined,
          processId: processId,
          isDeleted: false,
        },
        include: {
          steps: {
            where: { isDeleted: false },
            orderBy: { stepNumber: "asc" },
            include: { images: true, videos: true },
          },
        },
      }),
      prisma.stockOrderSchedule.aggregate({
        where: { order_id: nextJob.order_id, processId, isDeleted: false },
        _sum: { completedQuantity: true, scrapQuantity: true },
      }),
    ]);

    return res.status(200).json({
      message: "Job Found",
      data: {
        ...nextJob,
        processName: nextJob.process?.processName || "N/A",
        partNumber:
          nextJob.part?.partNumber || nextJob.customPart?.partNumber || "N/A",
        order: orderData,
        workInstructionSteps: workInstructions?.steps || [],
        instructionTitle:
          workInstructions?.instructionTitle || "No Instructions Found",
        productionId: lastProduction?.id || null,
        employeeInfo: lastProduction?.employeeInfo || null,
        employeeCompletedQty: stats._sum.completedQuantity || 0,
        employeeScrapQty: stats._sum.scrapQuantity || 0,
        incomingJobs: incomingJobs,
        cycleTime: lastProduction?.cycleTimeStart || null,
      },
    });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Internal Server Error", error: error.message });
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
    const syllabus = await prisma.workInstruction.findMany({
      where: { processId: processId, isDeleted: false },
      include: { PartNumber: true },
      orderBy: { createdAt: "asc" },
    });

    if (syllabus.length === 0) {
      return res.status(404).json({ message: "No instructions found." });
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

    if (nextPartIndex >= syllabus.length) {
      return res.status(200).json({
        allCompleted: true,
        message: "Cycle finished.",
      });
    }

    const nextPart = syllabus[nextPartIndex];

    let currentSession = await prisma.productionResponse.findFirst({
      where: {
        stationUserId,
        processId,
        partId: nextPart.productId,
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
          partId: nextPart.productId,
          type: "training",
          traniningStatus: false,
          cycleTimeStart: new Date(),
          order_type: "Training",
        },
      });
    }

    const steps = await prisma.workInstructionSteps.findMany({
      where: { workInstructionId: nextPart.id, isDeleted: false },
      orderBy: { stepNumber: "asc" },
      include: { images: true, videos: true },
    });

    return res.status(200).json({
      allCompleted: false,
      data: {
        productionId: currentSession.id,
        employeeName: loggedInUserName,
        workInstructionSteps: steps,
        instructionTitle: nextPart.instructionTitle,
        partNumber: nextPart.PartNumber?.partNumber || "N/A",
        processName: syllabus[0].PartNumber?.processDesc || "Training",
        cycleTime: currentSession.cycleTimeStart,
        incomingJobs: syllabus.slice(nextPartIndex + 1).map((s) => ({
          partNumber: s.PartNumber?.partNumber,
        })),
      },
    });
  } catch (error) {
    return res.status(500).json({ message: "Internal server error" });
  }
};

const scanCompleteAction = async (req, res) => {
  try {
    const { id: productionResponseId } = req.params;
    const { orderId, partId, employeeId, order_type } = req.body;
    const now = new Date();

    if (!orderId || !partId || !employeeId) {
      return res.status(400).json({ message: "Missing required data." });
    }

    const result = await prisma.$transaction(
      async (tx) => {
        const schedule = await tx.stockOrderSchedule.findFirst({
          where: {
            order_id: orderId,
            part_id: partId,
            order_type,
            isDeleted: false,
          },
        });
        if (!schedule) throw new Error("Job Schedule not found.");

        let wasUpdated = false;
        if (
          productionResponseId &&
          productionResponseId !== "null" &&
          productionResponseId !== "undefined"
        ) {
          const updateResult = await tx.productionResponse.updateMany({
            where: {
              id: productionResponseId,
              completedQuantity: 0,
              scrap: false,
            },
            data: {
              completedQuantity: 1,
              cycleTimeEnd: now,
              submittedDateTime: now,
              stationUserId: employeeId,
            },
          });
          if (updateResult.count > 0) wasUpdated = true;
        }

        if (!wasUpdated) {
          await tx.productionResponse.create({
            data: {
              processId: schedule.processId,
              stationUserId: employeeId,
              partId: partId,
              orderId: orderId,
              order_type: order_type,
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

          if (itemInDb && itemInDb.type) {
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
        const newCompletedQty = (schedule.completedQuantity || 0) + 1;
        const newRemaining = Math.max(0, (schedule.remainingQty || 0) - 1);
        const updatedStatus = newRemaining <= 0 ? "completed" : "progress";

        await tx.stockOrderSchedule.update({
          where: { id: schedule.id },
          data: {
            completedQuantity: newCompletedQty,
            remainingQty: newRemaining,
            status: updatedStatus,
            completed_date: updatedStatus === "completed" ? now : undefined,
            completed_EmpId: employeeId,
          },
        });

        let nextProductionId = null;
        let nextCycleStartTime = null;

        if (updatedStatus !== "completed") {
          const nextSession = await tx.productionResponse.create({
            data: {
              processId: schedule.processId,
              stationUserId: employeeId,
              partId: partId,
              orderId: orderId,
              order_type: order_type,
              cycleTimeStart: new Date(),
              completedQuantity: 0,
              scrap: false,
            },
          });
          nextProductionId = nextSession.id;
          nextCycleStartTime = nextSession.cycleTimeStart;
        }

        return {
          message: "Action completed and stock updated successfully.",
          newProductionId: nextProductionId,
          nextCycleStartTime: nextCycleStartTime,
          isJobFinished: updatedStatus === "completed",
        };
      },
      {
        timeout: 15000,
      },
    );

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

    const result = await prisma.$transaction(
      async (tx) => {
        const schedule = await tx.stockOrderSchedule.findFirst({
          where: {
            order_id: orderId,
            part_id: partId,
            order_type,
            isDeleted: false,
          },
        });
        if (!schedule) throw new Error("Job Schedule not found.");

        await tx.productionResponse.updateMany({
          where: { id: productionResponseId, scrap: false },
          data: {
            scrap: true,
            scrapQuantity: 1,
            cycleTimeEnd: now,
            submittedDateTime: now,
            stationUserId: employeeId,
          },
        });

        if (partId) {
          const itemInDb = await tx.partNumber.findUnique({
            where: { part_id: partId },
            select: { type: true },
          });

          if (itemInDb && itemInDb.type) {
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

        const newRemaining = Math.max(0, (schedule.remainingQty || 0) - 1);
        const updatedStatus = newRemaining <= 0 ? "completed" : "progress";

        const nextSession = await tx.productionResponse.create({
          data: {
            processId: schedule.processId,
            stationUserId: employeeId,
            partId: partId,
            orderId: orderId,
            order_type: order_type,
            cycleTimeStart: now,
            completedQuantity: 0,
            scrap: false,
          },
        });

        await tx.stockOrderSchedule.update({
          where: { id: schedule.id },
          data: {
            scrapQuantity: { increment: 1 },
            remainingQty: newRemaining,
            status: updatedStatus,
            completed_date: updatedStatus === "completed" ? now : undefined,
          },
        });

        return { message: "Scrapped & Reset", newProductionId: nextSession.id };
      },
      { timeout: 15000 },
    );

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
