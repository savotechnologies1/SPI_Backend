const prisma = require("../config/prisma");
const {
  paginationQuery,
  pagination,
  fileUploadFunc,
} = require("../functions/common");

const stationLogout = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({
        message: "Production Response ID is required to logout.",
      });
    }
    const updatedResponse = await prisma.productionResponse.update({
      where: {
        id: id,
      },
      data: {
        cycleTimeEnd: new Date(),
      },
    });

    if (!updatedResponse) {
      return res.status(404).json({
        message: "Login record not found. Cannot logout.",
      });
    }
    const startTime = new Date(updatedResponse.cycleTimeStart);
    const endTime = new Date(updatedResponse.cycleTimeEnd);
    const durationInSeconds = (endTime - startTime) / 1000;
    return res.status(200).json({
      message: "You have successfully logged out.",
      data: {
        ...updatedResponse,
        durationInSeconds: durationInSeconds.toFixed(2),
      },
    });
  } catch (error) {
    console.error("Error during process logout:", error);
    return res.status(500).send({
      message: "Something went wrong during logout. Please try again later.",
      error: error.message,
    });
  }
};

const stationLogin = async (req, res) => {
  try {
    const { processId, stationUserId, type, partId } = req.body;
    const findNextJob = (status) => {
      return prisma.stockOrderSchedule.findFirst({
        where: {
          processId,
          status,
          isDeleted: false,
        },
        orderBy: {
          createdAt: "asc",
        },
        include: {
          StockOrder: { select: { orderNumber: true } },
          CustomOrder: { select: { orderNumber: true } },
          part: {
            include: {
              WorkInstruction: {
                include: {
                  steps: true,
                },
              },
            },
          },
        },
      });
    };
    let nextJob = await findNextJob("progress");
    if (!nextJob) {
      nextJob = await findNextJob("new");
    }

    const createData = {
      process: { connect: { id: processId } },
      employeeInfo: { connect: { id: stationUserId } },
      type,
      instructionId: nextJob?.part?.WorkInstruction?.[0]?.id || null,
      scrap: null,
      cycleTimeStart: new Date(),
      cycleTimeEnd: null,
      createdBy: stationUserId,
      scheduleQuantity: nextJob?.scheduleQuantity,
    };

    if (partId) {
      createData.PartNumber = { connect: { part_id: partId } };
    }

    if (nextJob?.order_type === "StockOrder") {
      createData.StockOrder = { connect: { id: nextJob?.order_id } };
    } else if (nextJob?.order_type === "CustomOrder") {
      createData.CustomOrder = { connect: { id: nextJob?.order_id } };
    }

    const processLoginData = await prisma.productionResponse.create({
      data: createData,
    });

    if (
      type === "training" &&
      nextJob?.part?.WorkInstruction?.[0]?.steps.length > 0
    ) {
      const existingTraining = await prisma.productionResponse.findFirst({
        where: {
          stationUserId: stationUserId,
          processId: processId,
          partId: nextJob?.part_id,
          traniningStatus: true,
        },
      });
      if (existingTraining) {
        return res.status(409).send();
        // {
        //   message:
        //     "You have already completed training for this process and part.",
        // }
      } else {
        const trackingEntries = nextJob.part.WorkInstruction[0].steps.map(
          (step, index) => ({
            productionResponseId: processLoginData.id,
            workInstructionStepId: step.id,
            status: "pending",
            stepStartTime: index === 0 ? new Date() : null,
            stepEndTime: null,
          }),
        );

        await prisma.productionStepTracking.createMany({
          data: trackingEntries,
        });
      }
    }

    // --- FIX 3: Get the orderNumber from whichever relation is not null ---
    const orderNumber =
      nextJob?.StockOrder?.orderNumber ||
      nextJob?.CustomOrder?.orderNumber ||
      "N/A";

    return res.status(200).json({
      message: `You have successfully logged into station. Assigned to order: ${orderNumber}`,
      data: processLoginData,
    });
  } catch (error) {
    if (error.code === "P2025") {
      console.error("Prisma relation error during login:", error.meta.cause);
      return res.status(400).json({
        message: "Failed to log in. The associated order could not be found.",
        error: error.meta.cause,
      });
    }
    console.error("Error during process login:", error);
    return res.status(500).send({
      message: "Something went wrong. Please try again later.",
      error: error.message,
    });
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
        select: commonOrderSelect, // Adjust if CustomOrder has different fields
      });
    } else {
      // If order_type is null or something else, resolve with null
      orderDetailsPromise = Promise.resolve(null);
    }
    // =======================================================================

    const [orderDetails, partDetails, workInstructions] = await Promise.all([
      orderDetailsPromise, // Use the dynamically created promise

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
          processId: nextJob.processId, // Assuming camelCase
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
    console.error("Error fetching next job details:", error);
    return res.status(500).json({
      message: "Something went wrong fetching job details.",
      error: error.message,
    });
  }
};

// const selectScheduleProcess = async (req, res) => {
//   try {
//     const stationUserId = req.user;
//     console.log("stationUserIdstationUserId", stationUserId);
//     const stockOrders = await prisma.stockOrderSchedule.findMany({
//       where: {
//         type: "part",
//         isDeleted: false,
//         status: {
//           in: ["new", "progress"],
//         },
//       },
//       include: {
//         part: {
//           include: {
//             process: {
//               select: {
//                 id: true,
//                 processName: true,
//               },
//             },
//           },
//         },
//       },
//     });
//     if (!stockOrders || stockOrders.length === 0) {
//       return res
//         .status(404)
//         .json({ message: "No active part schedules found." });
//     }

//     const processMap = new Map();
//     stockOrders.forEach((order) => {
//       const process = order.part?.process;
//       if (process && process.id && !processMap.has(process.id)) {
//         processMap.set(process.id, {
//           id: process.id,
//           name: process.processName,
//         });
//       }
//     });

//     const uniqueProcesses = Array.from(processMap.values());
//     if (uniqueProcesses.length === 0) {
//       return res
//         .status(404)
//         .json({ message: "No unique processes found for active schedules." });
//     }

//     let employeeFormattedData = [];
//     if (stationUserId.role !== "Shop_Floor") {
//       const employees = await prisma.employee.findMany({
//         where: { isDeleted: false },
//         select: {
//           id: true,
//           employeeId: true,
//           email: true,
//           fullName: true,
//         },
//       });
//       console.log(
//         "  stationUserIdstationUserId   employeeFormattedData ",
//         stationUserId
//       );

//       employeeFormattedData = employees.map((employee) => ({
//         id: employee.id,
//         name: employee.fullName,
//         employeeId: employee.employeeId,
//         email: employee.email,
//       }));
//     }
//     if (stationUserId.role === "Shop_Floor") {
//       const employee = await prisma.employee.findUnique({
//         where: {
//           email: req.user?.email,
//           isDeleted: false,
//         },
//         select: {
//           id: true,
//           employeeId: true,
//           email: true,
//           fullName: true,
//         },
//       });
//       employeeFormattedData = employee;
//     }
//     return res.status(200).json({
//       stockAndProcess: uniqueProcesses,
//       stationUser: employeeFormattedData,
//     });
//   } catch (error) {
//     console.error("Error in selectScheduleProcess:", error);
//     return res.status(500).json({
//       message: "Something went wrong. Please try again later.",
//     });
//   }
// };

// const completeScheduleOrder = async (req, res) => {
//   try {
//     const { id } = req.params;
//     const { orderId } = req.body;
//     const data = await prisma.productionResponse.update({
//       where: {
//         id: id,
//       },
//       data: {
//         quantity: true,
//       },
//     });
//     const checkTotolQty = await prisma.stockOrderSchedule.findFirst({
//       where: {
//         id: orderId,
//       },
//       select: {
//         quantity: true,
//         completedQuantity: true,
//       },
//     });

//     if (checkTotolQty?.completedQuantity > checkTotolQty?.quantity) {
//       return res.status(200).send({
//         message: "order scheduling completed ",
//       });
//     }

//     prisma.stockOrderSchedule
//       .update({
//         where: {
//           id: orderId,
//         },
//         data: {
//           completedQuantity: {
//             increment: 1,
//           },
//         },
//       })
//       .then();
//     return res.status(201).json({
//       message: "This order has been added as completed  .",
//     });
//   } catch (error) {
//     console.log("errorerror", error);

//     res.status(500).json({ message: "An error occurred on the server." });
//   }
// };

// const completeScheduleOrder = async (req, res) => {
//   try {
//     const { id } = req.params;
//     const { orderId, partId, employeeId, productId } = req.body;

//     await prisma.productionResponse.update({
//       where: { id },
//       data: {
//         quantity: true,
//         scrap: false,
//         cycleTimeEnd: new Date(),
//       },
//     });
//     const productionResponse = await prisma.productionResponse.findFirst({
//       where: {
//         id: id,
//         partId: partId,
//       },
//       orderBy: { cycleTimeStart: "desc" },
//       select: {
//         id: true,
//         scheduleQuantity: true,
//       },
//     });
//     const orderSchedule = await prisma.stockOrderSchedule.findUnique({
//       where: {
//         order_id_part_id: {
//           order_id: orderId,
//           part_id: partId,
//         },
//       },
//     });

//     if (!orderSchedule) {
//       return res
//         .status(404)
//         .json({ message: "Stock order schedule not found." });
//     }

//     const { completedQuantity = 0 } = orderSchedule;
//     if (completedQuantity >= productionResponse.scheduleQuantity) {
//       return res.status(400).json({
//         message: "Order is already fully completed.",
//         status: "completed",
//       });
//     }

//     const newCompletedQty = completedQuantity + 1;
//     const updatedStatus =
//       newCompletedQty === quantity ? "completed" : "progress";

//     await prisma.stockOrderSchedule.update({
//       where: {
//         order_id_part_id: {
//           order_id: orderId,
//           part_id: partId,
//         },
//       },
//       data: {
//         completedQuantity: newCompletedQty,
//         completed_date:
//           newCompletedQty === productionResponse.scheduleQuantity
//             ? new Date()
//             : undefined,
//         status: updatedStatus,
//       },
//     });
//     console.log("updatedStatusupdatedStatus", updatedStatus);

//     if (updatedStatus === "progress") {
//       await prisma.partNumber.update({
//         where: {
//           part_id: partId,
//         },
//         data: {
//           availStock: {
//             decrement: 1,
//           },
//         },
//       });
//     }
//     if (updatedStatus === "completed") {
//       await prisma.partNumber.update({
//         where: {
//           part_id: productId,
//         },
//         data: {
//           availStock: {
//             increment: 1,
//           },
//         },
//       });
//     }
//     await prisma.productionResponse.updateMany({
//       where: {
//         id,
//         stationUserId: employeeId,
//         partId: partId,
//         orderId: orderId,
//       },
//       data: {
//         completedQuantity: {
//           increment: 1,
//         },
//       },
//     });
//     return res.status(200).json({
//       message:
//         updatedStatus === "completed"
//           ? "Order scheduling completed."
//           : "This order has been added as completed.",
//       status: updatedStatus,
//     });
//   } catch (error) {
//     console.error("Error completing schedule order:", error);
//     res.status(500).json({ message: "An error occurred on the server." });
//   }
// };

// correct code start
// const getScheduleProcessInformation = async (req, res) => {
//   try {
//     const { id: processId } = req.params;
//     if (!processId) {
//       return res.status(400).json({ message: "processId is required." });
//     }

//     // --- REUSABLE HELPER FUNCTION (NO CHANGES NEEDED HERE) ---
//     const findAndStitchJob = async (findOptions) => {
//       const schedule = await prisma.stockOrderSchedule.findFirst({
//         ...findOptions,
//         include: {
//           part: {
//             include: {
//               WorkInstruction: {
//                 include: {
//                   steps: {
//                     orderBy: { stepNumber: "asc" },
//                     include: {
//                       images: { select: { id: true, imagePath: true } },
//                       videos: { select: { id: true, videoPath: true } },
//                     },
//                   },
//                 },
//               },
//             },
//           },
//           process: { select: { processName: true } },
//         },
//       });
//       if (!schedule) return null;
//       let orderData = null;
//       const orderSelectFields = {
//         id: true,
//         orderNumber: true,
//         productQuantity: true,
//         partId: true,
//         shipDate: true,
//         createdAt: true,
//       };
//       if (schedule.order_type === "StockOrder" && schedule.order_id) {
//         orderData = await prisma.stockOrder.findUnique({
//           where: { id: schedule.order_id },
//           select: orderSelectFields,
//         });
//       } else if (schedule.order_type === "CustomOrder" && schedule.order_id) {
//         orderData = await prisma.customOrder.findUnique({
//           where: { id: schedule.order_id },
//           select: {
//             id: true,
//             orderNumber: true,
//             shipDate: true,
//             createdAt: true,
//             productQuantity: true,
//             partId: true,
//             productId: true,
//           },
//         });
//       }
//       return { ...schedule, order: orderData };
//     };
//     // --- END OF HELPER FUNCTION ---

//     // <-- START OF CHANGES: Added a loop to handle 0 remainingQty jobs -->
//     let nextJob = null;

//     while (true) {
//       let potentialJob = null;

//       // PRIORITY 1: Find any job currently in "progress".
//       potentialJob = await findAndStitchJob({
//         where: { processId, status: "progress", isDeleted: false },
//       });

//       // PRIORITY 2: If no job is in progress, check if a 'part' was just completed.
//       if (!potentialJob) {
//         const lastCompletedPartJob = await prisma.stockOrderSchedule.findFirst({
//           where: {
//             processId,
//             status: "completed",
//             type: "part",
//             isDeleted: false,
//           },
//           orderBy: { updatedAt: "desc" },
//         });

//         if (lastCompletedPartJob) {
//           const pendingPartsCount = await prisma.stockOrderSchedule.count({
//             where: {
//               order_id: lastCompletedPartJob.order_id,
//               order_type: lastCompletedPartJob.order_type,
//               type: "part",
//               status: { not: "completed" },
//               isDeleted: false,
//             },
//           });

//           if (pendingPartsCount === 0) {
//             potentialJob = await findAndStitchJob({
//               where: {
//                 order_id: lastCompletedPartJob.order_id,
//                 order_type: lastCompletedPartJob.order_type,
//                 type: "product",
//                 status: { in: ["new", "progress"] },
//                 isDeleted: false,
//               },
//             });
//           }
//         }
//       }

//       // PRIORITY 3: If still no job found, get the oldest "new" job, prioritizing parts.
//       if (!potentialJob) {
//         potentialJob = await findAndStitchJob({
//           where: { processId, status: "new", isDeleted: false },
//           orderBy: [{ type: "asc" }, { createdAt: "asc" }],
//         });
//       }

//       // If no job is found at all, break the loop.
//       if (!potentialJob) {
//         break;
//       }

//       // If the found job has quantity remaining, this is our job. Break the loop.
//       if (potentialJob.remainingQty > 0) {
//         nextJob = potentialJob;
//         break;
//       }

//       // If remainingQty is 0 or less, mark it as 'completed' and let the loop run again to find the next one.
//       if (potentialJob.status !== "completed") {
//         await prisma.stockOrderSchedule.update({
//           where: {
//             order_id_part_id_order_type: {
//               order_id: potentialJob.order_id,
//               part_id: potentialJob.part_id,
//               order_type: potentialJob.order_type,
//             },
//           },
//           data: {
//             status: "completed",
//             completed_date: new Date(),
//           },
//         });
//       }
//       // The loop will continue to find the next available job.
//     }
//     // <-- END OF CHANGES -->

//     if (!nextJob || !nextJob.order) {
//       return res
//         .status(404)
//         .json({ message: "No jobs found for this station." });
//     }

//     // --- The rest of the function remains the same ---
//     const { order_id, part_id } = nextJob;

//     const [lastProductionCycle, currentProductionResponse, upcomingOrder] =
//       await Promise.all([
//         prisma.productionResponse.findFirst({
//           where: { processId, isDeleted: false },
//           orderBy: { cycleTimeStart: "desc" },
//           include: {
//             employeeInfo: {
//               select: { firstName: true, lastName: true, id: true },
//             },
//           },
//         }),
//         prisma.productionResponse.findFirst({
//           where: { orderId: order_id, partId: part_id, processId },
//           orderBy: { cycleTimeStart: "desc" },
//           select: { id: true, scheduleQuantity: true },
//         }),
//         (async () => {
//           const upcomingSchedule = await prisma.stockOrderSchedule.findFirst({
//             where: {
//               processId,
//               id: { not: nextJob.id },
//               status: { in: ["new", "progress"] },
//               createdAt: { gte: nextJob.createdAt },
//             },
//             orderBy: [{ createdAt: "asc" }, { type: "asc" }],
//           });
//           if (!upcomingSchedule) return null;
//           let upcomingOrderData = null;
//           if (upcomingSchedule.order_type === "StockOrder") {
//             upcomingOrderData = await prisma.stockOrder.findUnique({
//               where: { id: upcomingSchedule.order_id },
//               select: { shipDate: true },
//             });
//           } else if (upcomingSchedule.order_type === "CustomOrder") {
//             upcomingOrderData = await prisma.customOrder.findUnique({
//               where: { id: upcomingSchedule.order_id },
//               select: { shipDate: true },
//             });
//           }
//           return { ...upcomingSchedule, order: upcomingOrderData };
//         })(),
//       ]);

//     const scheduleQuantity = nextJob.scheduleQuantity || 0;
//     const completedQuantity = nextJob.completedQuantity || 0;
//     const remainingQuantity = nextJob.remainingQty;

//     const responseData = {
//       ...nextJob,
//       productionId: lastProductionCycle?.id || null,
//       productId: nextJob.order?.partId || null,
//       upcommingOrder: upcomingOrder?.order?.shipDate || null,
//       employeeInfo: lastProductionCycle?.employeeInfo || null,
//       cycleTime: lastProductionCycle?.cycleTimeStart || null,
//       completedQty: completedQuantity,
//       scheduleQuantity: scheduleQuantity,
//       scrapQty: lastProductionCycle?.scrapQuantity || 0,
//       remainingQty: remainingQuantity,
//     };

//     res.status(200).json({
//       message: "Next job found successfully.",
//       data: responseData,
//     });
//   } catch (error) {
//     console.error("Error finding next job:", error);
//     res
//       .status(500)
//       .json({ message: "Something went wrong.", error: error.message });
//   }
// };
// correct code end

// const selectScheduleProcess = async (req, res) => {
//   try {
//     const stationUser = req.user; // Objeto de usuario del middleware de autenticación

//     // 1. Encontrar todos los schedules activos para determinar qué procesos mostrar.
//     const activeSchedules = await prisma.stockOrderSchedule.findMany({
//       where: {
//         isDeleted: false,
//         status: { in: ["new", "progress"] },
//       },
//       include: {
//         part: {
//           include: {
//             process: {
//               select: { id: true, processName: true },
//             },
//           },
//         },
//         // Incluir el proceso directamente si está en el schedule (para productos)
//         process: {
//           select: { id: true, processName: true },
//         },
//       },
//     });

//     if (!activeSchedules || activeSchedules.length === 0) {
//       return res.status(404).json({ message: "No active schedules found." });
//     }

//     // 2. Obtener una lista de procesos únicos a partir de los schedules activos.
//     const processMap = new Map();
//     activeSchedules.forEach((schedule) => {
//       // El proceso puede venir de la parte (type:part) o directamente del schedule (type:product)
//       const process = schedule.part?.process || schedule.process;
//       if (process && process.id && !processMap.has(process.id)) {
//         processMap.set(process.id, {
//           id: process.id,
//           name: process.processName,
//         });
//       }
//     });

//     const uniqueProcesses = Array.from(processMap.values());

//     if (uniqueProcesses.length === 0) {
//       return res
//         .status(404)
//         .json({ message: "No unique processes found for active schedules." });
//     }

//     // 3. Para cada proceso único, encontrar su próximo trabajo disponible en paralelo.
//     const processOverviewsPromises = uniqueProcesses.map(async (process) => {
//       const nextJob = await findNextJobForProcess(process.id);
//       return {
//         processId: process.id,
//         processName: process.name,
//         nextJob: nextJob
//           ? {
//               scheduleId: nextJob.id,
//               orderNumber: nextJob.order?.orderNumber || "N/A",
//               partName: nextJob.part?.partName || "Product Assembly", // Nombre genérico para productos
//               partNumber: nextJob.part?.partNumber || "N/A",
//               scheduleQuantity: nextJob.scheduleQuantity,
//               remainingQty: nextJob.remainingQty,
//               shipDate: nextJob.order?.shipDate || null,
//               type: nextJob.type, // 'part' o 'product'
//             }
//           : null,
//       };
//     });

//     let processOverviews = await Promise.all(processOverviewsPromises);

//     // Filtrar los procesos que no tienen ningún trabajo disponible.
//     processOverviews = processOverviews.filter((p) => p.nextJob !== null);

//     if (processOverviews.length === 0) {
//       return res
//         .status(404)
//         .json({ message: "No available jobs found for any active process." });
//     }

//     // 4. Obtener la información de los empleados según el rol del usuario.
//     let employeeFormattedData = [];
//     if (stationUser.role === "Shop_Floor") {
//       const employee = await prisma.employee.findUnique({
//         where: { email: stationUser.email, isDeleted: false },
//         select: { id: true, employeeId: true, email: true, fullName: true },
//       });
//       if (employee) {
//         // Devolver como array para mantener consistencia con el otro caso.
//         employeeFormattedData.push({
//           id: employee.id,
//           name: employee.fullName,
//           employeeId: employee.employeeId,
//           email: employee.email,
//         });
//       }
//     } else {
//       // Para otros roles (Admin, etc.), obtener todos los empleados.
//       const employees = await prisma.employee.findMany({
//         where: { isDeleted: false },
//         select: { id: true, employeeId: true, email: true, fullName: true },
//       });
//       employeeFormattedData = employees.map((employee) => ({
//         id: employee.id,
//         name: employee.fullName,
//         employeeId: employee.employeeId,
//         email: employee.email,
//       }));
//     }

//     // 5. Enviar la respuesta combinada.
//     return res.status(200).json({
//       processOverviews: processOverviews,
//       stationUsers: employeeFormattedData,
//     });
//   } catch (error) {
//     console.error("Error in selectScheduleProcess:", error);
//     return res.status(500).json({
//       message: "Something went wrong. Please try again later.",
//       error: error.message,
//     });
//   }
// };
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

    // ---------- Fetch all processes ----------
    const allProcesses = await prisma.process.findMany({
      where: { isDeleted: false },
      select: { id: true, processName: true, type: true, machineName: true },
    });

    if (!allProcesses.length) {
      return res.status(404).json({ message: "No processes found." });
    }

    // ---------- Fetch active schedules once ----------
    const activeSchedules = await prisma.stockOrderSchedule.findMany({
      where: { isDeleted: false, status: { in: ["new", "progress"] } },
      include: { part: true },
    });

    // ---------- Build process overview ----------
    const processOverviews = await Promise.all(
      allProcesses.map(async (process) => {
        let nextJob = null;

        // --------- PART PROCESS ----------
        if (process.type === "part") {
          const hasActivePart = activeSchedules.some(
            (s) => s.type === "part" && s.part?.processId === process.id,
          );

          if (hasActivePart) {
            nextJob = await findNextJobForPartProcess(process.id);
          }
        }

        // --------- PRODUCT PROCESS ----------
        if (process.type === "product") {
          const productSchedules = activeSchedules.filter(
            (s) => s.type === "product" && s.processId === process.id,
          );

          if (productSchedules.length) {
            const orderId = productSchedules[0].order_id;

            // check part statuses
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
    console.error("Error in selectScheduleProcess:", error);
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
// const completeScheduleOrder = async (req, res) => {
//   try {
//     const { id } = req.params;
//     const {
//       orderId,
//       partId,
//       completedBy,
//       employeeId,
//       productId,
//       order_type,
//       type,
//     } = req.body;

//     if (!order_type)
//       return res.status(400).json({ message: "order_type is required." });
//     if (!type) return res.status(400).json({ message: "type is required." });
//     const result = await prisma.$transaction(async (tx) => {
//       const orderSchedule = await tx.stockOrderSchedule.findUnique({
//         where: {
//           order_id_part_id_order_type: {
//             order_id: orderId,
//             part_id: partId,
//             order_type: order_type,
//           },
//         },
//       });

//       if (!orderSchedule) throw new Error("Order schedule not found.");
//       const totalScheduleQty = orderSchedule.scheduleQuantity;
//       const completedQuantity = orderSchedule.completedQuantity || 0;
//       if (completedQuantity >= totalScheduleQty)
//         return { alreadyCompleted: true };
//       const newCompletedQty = completedQuantity + 1;
//       const newRemainingQty = Math.max(0, totalScheduleQty - newCompletedQty);
//       const updatedStatus =
//         newCompletedQty >= totalScheduleQty ? "completed" : "progress";
//       if (type === "part") {
//         await tx.partNumber.update({
//           where: { part_id: partId },
//           data: { availStock: { decrement: 1 } },
//         });
//       } else if (type === "product") {
//         if (updatedStatus === "completed") {
//           const finalProductId = productId || partId;

//           if (!finalProductId) {
//             throw new Error(
//               "Product ID or Part ID is required to update final stock.",
//             );
//           }

//           await tx.partNumber.update({
//             where: { part_id: finalProductId },
//             data: { availStock: { increment: totalScheduleQty } },
//           });
//         }
//       }
//       await tx.productionResponse.upsert({
//         where: {
//           id: id,
//         },
//         update: {
//           cycleTimeEnd: new Date(),
//           completedQuantity: { increment: 1 },
//           partId: partId,
//           remainingQty: newRemainingQty,
//           scheduleQuantity: totalScheduleQty,
//         },
//         create: {
//           orderId: orderId,
//           partId: partId,
//           processId: orderSchedule.processId,
//           completedQuantity: 1,
//           remainingQty: newRemainingQty,
//           scheduleQuantity: totalScheduleQty,
//           cycleTimeStart: new Date(),
//           cycleTimeEnd: new Date(),
//         },
//       });

//       await tx.stockOrderSchedule.update({
//         where: {
//           order_id_part_id_order_type: {
//             order_id: orderId,
//             part_id: partId,
//             order_type: order_type,
//           },
//         },
//         data: {
//           completedQuantity: newCompletedQty,
//           status: updatedStatus,
//           remainingQty: newRemainingQty,
//           completed_date:
//             updatedStatus === "completed" ? new Date() : undefined,
//           completed_by: completedBy,
//           completed_EmpId: employeeId,
//         },
//       });

//       return { status: updatedStatus };
//     });

//     if (result.alreadyCompleted) {
//       return res.status(400).json({
//         message: "Order is already fully completed.",
//         status: "completed",
//       });
//     }

//     return res.status(200).json({
//       message:
//         result.status === "completed"
//           ? "Successfully completed."
//           : "Quantity updated.",
//       status: result.status,
//     });
//   } catch (error) {
//     console.error("Error:", error);
//     res
//       .status(500)
//       .json({ message: "An error occurred.", error: error.message });
//   }
// };

// const completeScheduleOrder = async (req, res) => {
//   try {
//     const { id: productionResponseId } = req.params;
//     const {
//       orderId,
//       partId,
//       employeeId, // The ID of the worker assigned to the station
//       productId,
//       order_type,
//       type,
//     } = req.body;

//     // The ID of the person currently logged in (Admin or Employee)
//     const performerId = req?.user?.id;

//     if (!order_type || !type) {
//       return res
//         .status(400)
//         .json({ message: "order_type and type are required." });
//     }

//     const result = await prisma.$transaction(async (tx) => {
//       // 1. Fetch the existing schedule
//       const orderSchedule = await tx.stockOrderSchedule.findUnique({
//         where: {
//           order_id_part_id_order_type: {
//             order_id: orderId,
//             part_id: partId,
//             order_type: order_type,
//           },
//         },
//       });

//       if (!orderSchedule) throw new Error("Order schedule not found.");

//       const totalQty = orderSchedule.scheduleQuantity || 0;
//       const currentQty = orderSchedule.completedQuantity || 0;

//       if (currentQty >= totalQty) return { alreadyCompleted: true };

//       const newCompletedQty = currentQty + 1;
//       const newRemainingQty = Math.max(0, totalQty - newCompletedQty);
//       const updatedStatus =
//         newCompletedQty >= totalQty ? "completed" : "progress";

//       // 2. Stock Management
//       if (type === "part") {
//         await tx.partNumber.update({
//           where: { part_id: partId },
//           data: { availStock: { decrement: 1 } },
//         });
//       } else if (type === "product" && updatedStatus === "completed") {
//         const finalId = productId || partId;
//         await tx.partNumber.update({
//           where: { part_id: finalId },
//           data: { availStock: { increment: totalQty } },
//         });
//       }

//       // 3. Update Production Response (Logs the cycle)
//       await tx.productionResponse.upsert({
//         where: { id: productionResponseId || "new-entry" },
//         update: {
//           cycleTimeEnd: new Date(),
//           completedQuantity: { increment: 1 },
//           remainingQty: newRemainingQty,
//         },
//         create: {
//           orderId,
//           partId,
//           processId: orderSchedule.processId,
//           completedQuantity: 1,
//           remainingQty: newRemainingQty,
//           scheduleQuantity: totalQty,
//           cycleTimeStart: new Date(),
//           cycleTimeEnd: new Date(),
//           stationUserId: employeeId, // Link to the station worker
//         },
//       });

//       // 4. Update the Schedule Table (The main record)
//       const updatedSchedule = await tx.stockOrderSchedule.update({
//         where: {
//           order_id_part_id_order_type: {
//             order_id: orderId,
//             part_id: partId,
//             order_type: order_type,
//           },
//         },
//         data: {
//           completedQuantity: newCompletedQty,
//           status: updatedStatus,
//           remainingQty: newRemainingQty,
//           completed_date:
//             updatedStatus === "completed" ? new Date() : undefined,
//           completed_by: performerId, // ID of Admin/Employee who clicked
//           completed_EmpId: employeeId, // ID of the worker assigned to the station
//         },
//       });

//       return { status: updatedStatus };
//     });

//     if (result.alreadyCompleted) {
//       return res
//         .status(400)
//         .json({ message: "Order is already fully completed." });
//     }

//     return res.status(200).json({
//       message:
//         result.status === "completed"
//           ? "Order fully completed."
//           : "Quantity updated.",
//       status: result.status,
//     });
//   } catch (error) {
//     console.error("Completion Error:", error);
//     res
//       .status(500)
//       .json({ message: "Internal Server Error", error: error.message });
//   }
// };

// const completeScheduleOrder = async (req, res) => {
//   try {
//     const { id: productionResponseId } = req.params;

//     const {
//       orderId, // Custom Order UUID
//       partId, // Part ID (Ye UUID bhi ho sakti hai aur manual string bhi)
//       employeeId,
//       productId,
//       order_type,
//       type: partNum,
//       completedBy: category,
//     } = req.body;

//     const performerId = req?.user?.id;

//     if (!orderId || !order_type) {
//       return res
//         .status(400)
//         .json({ message: "orderId and order_type are required." });
//     }

//     const result = await prisma.$transaction(async (tx) => {
//       // 1. Schedule Find Karein (Smart Lookup)
//       // Hum direct partId ke alawa CustomPart record ke through bhi search karenge
//       const orderSchedule = await tx.stockOrderSchedule.findFirst({
//         where: {
//           order_id: orderId,
//           order_type: order_type,
//           isDeleted: false,
//           OR: [
//             { part_id: partId },
//             { customPartId: partId },
//             { partNumberPart_id: partId },
//             // Agar frontend se part number string aa rahi hai toh customPart table se match karein
//             { customPart: { partNumber: partId } },
//           ],
//         },
//         include: {
//           customPart: true, // Custom part ki details lene ke liye
//         },
//       });

//       if (!orderSchedule) {
//         throw new Error(
//           `Schedule not found for Order: ${orderId} and Part: ${partId}`,
//         );
//       }

//       // 2. Check karein ki kya ye part Catalog (PartNumber Table) mein hai?
//       let catalogPartId = null;
//       if (orderSchedule.part_id) {
//         const existsInCatalog = await tx.partNumber.findUnique({
//           where: { part_id: orderSchedule.part_id },
//           select: { part_id: true },
//         });
//         if (existsInCatalog) catalogPartId = orderSchedule.part_id;
//       }

//       // 3. Employee Validation
//       let validEmployeeId = null;
//       if (employeeId) {
//         const empExists = await tx.employee.findUnique({
//           where: { id: employeeId },
//           select: { id: true },
//         });
//         if (empExists) validEmployeeId = employeeId;
//       }

//       const totalQty = orderSchedule.scheduleQuantity || 0;
//       const currentQty = orderSchedule.completedQuantity || 0;

//       if (currentQty >= totalQty) return { alreadyCompleted: true };

//       const newCompletedQty = currentQty + 1;
//       const newRemainingQty = Math.max(0, totalQty - newCompletedQty);
//       const updatedStatus =
//         newCompletedQty >= totalQty ? "completed" : "progress";

//       // 4. Stock Management (Only for Stock Orders or Library Parts)
//       if (order_type === "Stock Order" && catalogPartId) {
//         if (category === "part") {
//           await tx.partNumber.updateMany({
//             where: { part_id: catalogPartId },
//             data: { availStock: { decrement: 1 } },
//           });
//         }
//       }

//       // 5. Create Production Response (Foreign Key Safe)
//       const isCustomOrder =
//         order_type === "CustomOrder" || order_type === "custom";

//       await tx.productionResponse.create({
//         data: {
//           orderId: isCustomOrder ? null : orderId,
//           customOrderId: isCustomOrder ? orderId : null,

//           // SABSE IMPORTANT: Agar part catalog mein nahi hai (Manual Part),
//           // toh partId null honi chahiye varna P2003 error aayega.
//           partId: catalogPartId,

//           processId: orderSchedule.processId || "",
//           completedQuantity: 1,
//           remainingQty: newRemainingQty,
//           scheduleQuantity: totalQty,
//           cycleTimeStart: new Date(),
//           cycleTimeEnd: new Date(),
//           stationUserId: validEmployeeId,
//           order_type: order_type,
//           type: String(partNum || partId).substring(0, 35),
//         },
//       });

//       // 6. Update Schedule Table
//       await tx.stockOrderSchedule.update({
//         where: { id: orderSchedule.id },
//         data: {
//           completedQuantity: newCompletedQty,
//           status: updatedStatus,
//           remainingQty: newRemainingQty,
//           completed_date:
//             updatedStatus === "completed" ? new Date() : undefined,
//           completed_by: performerId || "System",
//           completed_EmpId: validEmployeeId,
//         },
//       });

//       return { status: updatedStatus };
//     });

//     return res.status(200).json({
//       message:
//         result.status === "completed"
//           ? "Order Step Completed."
//           : "Quantity Updated.",
//       status: result.status,
//     });
//   } catch (error) {
//     console.error("Critical Completion Error:", error);
//     res
//       .status(500)
//       .json({ message: "Internal Server Error", error: error.message });
//   }
// };

const completeScheduleOrder = async (req, res) => {
  try {
    const { id: productionResponseId } = req.params; // Pehle se chal rahe timer ki ID
    const {
      orderId,
      partId,
      employeeId,
      order_type,
      type: partNum,
      completedBy: category,
    } = req.body;

    const performerId = req?.user?.id;

    if (!orderId || !order_type) {
      return res
        .status(400)
        .json({ message: "orderId and order_type are required." });
    }

    const result = await prisma.$transaction(async (tx) => {
      // 1. Schedule dhundhein
      const orderSchedule = await tx.stockOrderSchedule.findFirst({
        where: {
          order_id: orderId,
          order_type: order_type,
          isDeleted: false,
          OR: [
            { part_id: partId },
            { customPartId: partId },
            { partNumberPart_id: partId },
            { customPart: { partNumber: partId } },
          ],
        },
      });

      if (!orderSchedule) throw new Error(`Schedule not found`);

      const totalQty = orderSchedule.scheduleQuantity || 0;
      const currentQty = orderSchedule.completedQuantity || 0;
      if (currentQty >= totalQty) return { alreadyCompleted: true };

      const newCompletedQty = currentQty + 1;
      const updatedStatus =
        newCompletedQty >= totalQty ? "completed" : "progress";

      // 2. Production Response ko UPDATE karein (Timer fix karne ke liye)
      // Agar ID hai toh update, warna naya (lekin start time hamesha pehle wala hona chahiye)
      if (productionResponseId && productionResponseId !== "null") {
        await tx.productionResponse.update({
          where: { id: productionResponseId },
          data: {
            cycleTimeEnd: new Date(), // Ab End Time abhi ka hoga, aur Start Time wahi rahega jo pehle tha
            completedQuantity: 1,
            submittedDateTime: new Date(),
            stationUserId: employeeId,
          },
        });
      } else {
        // Fallback: Agar timer start nahi kiya tha direct complete kiya
        await tx.productionResponse.create({
          data: {
            orderId: order_type.includes("Stock") ? orderId : null,
            customOrderId: order_type.includes("Custom") ? orderId : null,
            partId: orderSchedule.part_id,
            processId: orderSchedule.processId || "",
            completedQuantity: 1,
            cycleTimeStart: new Date(Date.now() - 5 * 60000), // Default 5 min pehle ka start time (sirf fallback ke liye)
            cycleTimeEnd: new Date(),
            order_type: order_type,
            stationUserId: employeeId,
          },
        });
      }

      // 3. Stock Update (Fixed string matching)
      if (
        order_type.replace(/\s/g, "") === "StockOrder" &&
        orderSchedule.part_id
      ) {
        await tx.partNumber.update({
          where: { part_id: orderSchedule.part_id },
          data: { availStock: { increment: 1 } }, // Part ban gaya toh stock BADHNA chahiye (increment)
        });
      }

      // 4. Update Schedule
      await tx.stockOrderSchedule.update({
        where: { id: orderSchedule.id },
        data: {
          completedQuantity: newCompletedQty,
          status: updatedStatus,
          remainingQty: Math.max(0, totalQty - newCompletedQty),
          completed_date:
            updatedStatus === "completed" ? new Date() : undefined,
          completed_EmpId: employeeId,
        },
      });

      return { status: updatedStatus };
    });

    return res.status(200).json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
};

// const scrapScheduleOrder = async (req, res) => {
//   try {
//     const { id } = req.params;
//     // FIX: Destructure 'order_type' from the request body
//     const { orderId, partId, employeeId, order_type } = req.body;

//     // FIX: Add validation for the new required field
//     if (!order_type) {
//       return res.status(400).json({ message: "order_type is required." });
//     }

//     await prisma.productionResponse.update({
//       where: { id },
//       data: { scrap: true, quantity: false, cycleTimeEnd: new Date() },
//     });

//     // FIX: Use the correct 3-part unique identifier
//     const orderSchedule = await prisma.stockOrderSchedule.findUnique({
//       where: {
//         order_id_part_id_order_type: {
//           order_id: orderId,
//           part_id: partId,
//           order_type: order_type,
//         },
//       },
//     });

//     if (!orderSchedule) {
//       return res
//         .status(404)
//         .json({ message: "Stock order schedule not found." });
//     }

//     const currentRemainingQty =
//       orderSchedule.scheduleQuantity - (orderSchedule.completedQuantity || 0);
//     const newRemainingQty = Math.max(0, currentRemainingQty - 1);

//     // FIX: Use the correct 3-part unique identifier for the update
//     await prisma.stockOrderSchedule.update({
//       where: {
//         order_id_part_id_order_type: {
//           order_id: orderId,
//           part_id: partId,
//           order_type: order_type,
//         },
//       },
//       data: {
//         status: "progress",
//         scrapQuantity: { increment: 1 },
//         scheduleQuantity: { decrement: 1 },
//         remainingQty: newRemainingQty,
//       },
//     });

//     await prisma.productionResponse.updateMany({
//       where: {
//         id,
//         stationUserId: employeeId,
//         partId: partId,
//         orderId: orderId,
//       },
//       data: { scrapQuantity: { increment: 1 }, remainingQty: newRemainingQty },
//     });

//     await prisma.scapEntries.create({
//       data: {
//         partId: partId,
//         returnQuantity: 1,
//         scrapStatus: true,
//         employeeId: employeeId,
//         // customersId,
//       },
//     });
//     // Check if the schedule is now complete after scrapping
//     const updatedSchedule = await prisma.stockOrderSchedule.findUnique({
//       where: { id: orderSchedule.id },
//     });

//     if (
//       updatedSchedule &&
//       updatedSchedule.completedQuantity >= updatedSchedule.scheduleQuantity
//     ) {
//       // FIX: Use the correct 3-part unique identifier for the final update
//       await prisma.stockOrderSchedule.update({
//         where: {
//           order_id_part_id_order_type: {
//             order_id: orderId,
//             part_id: partId,
//             order_type: order_type,
//           },
//         },
//         data: { status: "completed" },
//       });
//     }

//     return res.status(200).json({
//       message: "This order has been added as scrap.",
//     });
//   } catch (error) {
//     console.error("Error scrapping schedule order:", error);
//     res.status(500).json({
//       message: "An error occurred on the server.",
//       error: error.message,
//     });
//   }
// };

const scrapScheduleOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const { orderId, partId, employeeId, order_type } = req.body;

    if (!order_type) {
      return res.status(400).json({ message: "order_type is required." });
    }

    // 1. Stock Order Schedule nikalein calculations ke liye
    const orderSchedule = await prisma.stockOrderSchedule.findUnique({
      where: {
        order_id_part_id_order_type: {
          order_id: orderId,
          part_id: partId,
          order_type: order_type,
        },
      },
    });

    if (!orderSchedule) {
      return res
        .status(404)
        .json({ message: "Stock order schedule not found." });
    }

    // Calculation: Scrap hone par target kam nahi hota, bas remaining wahi rehta hai ya logic ke hisab se update hota hai
    // const currentRemainingQty =
    //   orderSchedule.scheduleQuantity - (orderSchedule.completedQuantity || 0);
    // const newRemainingQty = Math.max(0, currentRemainingQty); // Scrap hone par remaining kam nahi hota, use dobara banana padta hai
    const currentRemainingQty = orderSchedule.remainingQty || 0;

    const newRemainingQty = Math.max(0, currentRemainingQty - 1);
    // 2. Stock Order Schedule Update (SCRAP QUANTITY INCREMENT)
    await prisma.stockOrderSchedule.update({
      where: {
        order_id_part_id_order_type: {
          order_id: orderId,
          part_id: partId,
          order_type: order_type,
        },
      },
      data: {
        status: "progress",
        scrapQuantity: { increment: 1 },
        // scheduleQuantity: { decrement: 1 }, // Isse hamesha ke liye target kam ho jayega, kya aap ye chahte hain?
        remainingQty: newRemainingQty,
        part_id: partId,
      },
    });

    // 3. Production Response Update (ID se update karein, updateMany ki filter risk na lein)
    await prisma.productionResponse.update({
      where: { id: id }, // Use direct ID
      data: {
        scrap: true,
        quantity: false,
        cycleTimeEnd: new Date(),
        scrapQuantity: { increment: 1 },
        partId: partId,
        remainingQty: newRemainingQty,
      },
    });

    // 4. Scrap Entry Create
    await prisma.scapEntries.create({
      data: {
        partId: partId,
        returnQuantity: 1,
        scrapStatus: true,
        employeeId: employeeId, // DB field name match karein
        type: order_type,
      },
    });

    return res
      .status(200)
      .json({ message: "This order has been added as scrap." });
  } catch (error) {
    console.error("Error scrapping schedule order:", error);
    res
      .status(500)
      .json({ message: "An error occurred.", error: error.message });
  }
};

// const updateStepTime = async (req, res) => {
//   try {
//     const { id } = req.params; // productionResponseId
//     const { stepId, prevStepId } = req.body;

//     if (!id || !stepId) {
//       return res
//         .status(400)
//         .json({ message: "Missing productionResponseId or stepId" });
//     }

//     // 1. Fetch the production response to get the base cycleTimeStart
//     const productionResponse = await prisma.productionResponse.findUnique({
//       where: { id },
//     });

//     if (!productionResponse) {
//       return res
//         .status(404)
//         .json({ message: "Production response not found." });
//     }

//     const now = new Date();

//     // 2. Use a Transaction to ensure the end of one step and start of next are atomic
//     const result = await prisma.$transaction(async (tx) => {
//       let calculatedStartTime = productionResponse.cycleTimeStart || now;

//       // 3. Close the previous step if it exists
//       // We look for the prevStepId or any currently 'in-progress' step
//       const lastStep = await tx.productionStepTracking.findFirst({
//         where: {
//           productionResponseId: id,
//           status: "in-progress",
//           // if prevStepId is provided, target it specifically, otherwise target the open one
//           ...(prevStepId ? { workInstructionStepId: prevStepId } : {}),
//         },
//         orderBy: { stepStartTime: "desc" },
//       });

//       if (lastStep) {
//         // Update the previous step's end time to 'now'
//         await tx.productionStepTracking.update({
//           where: { id: lastStep.id },
//           data: {
//             stepEndTime: now,
//             status: "completed",
//           },
//         });
//         // The start of the NEW step is EXACTLY the end of the PREVIOUS step
//         calculatedStartTime = now;
//       } else {
//         // If no "in-progress" step was found, check if ANY step was completed before
//         const latestCompleted = await tx.productionStepTracking.findFirst({
//           where: { productionResponseId: id },
//           orderBy: { stepEndTime: "desc" },
//         });

//         if (latestCompleted && latestCompleted.stepEndTime) {
//           calculatedStartTime = latestCompleted.stepEndTime;
//         } else {
//           // It's the very first step
//           calculatedStartTime = productionResponse.cycleTimeStart || now;
//         }
//       }

//       // 4. Handle the Current Step (stepId)
//       const currentStepRecord = await tx.productionStepTracking.findFirst({
//         where: { productionResponseId: id, workInstructionStepId: stepId },
//       });

//       if (!currentStepRecord) {
//         // Create new tracking for the current step
//         return await tx.productionStepTracking.create({
//           data: {
//             productionResponseId: id,
//             workInstructionStepId: stepId,
//             stepStartTime: calculatedStartTime,
//             status: "in-progress",
//           },
//         });
//       } else if (currentStepRecord.status === "in-progress") {
//         // If the user clicks the same step again, mark it as completed
//         return await tx.productionStepTracking.update({
//           where: { id: currentStepRecord.id },
//           data: {
//             stepEndTime: now,
//             status: "completed",
//           },
//         });
//       }

//       return currentStepRecord;
//     });

//     return res.status(200).json({
//       message: "Step updated successfully",
//       data: result,
//     });
//   } catch (error) {
//     console.error("Step update error:", error);
//     res.status(500).json({ message: "Internal server error" });
//   }
// };
const updateStepTime = async (req, res) => {
  try {
    // Data body se nikaalein
    const { productionId, stepId } = req.body;

    if (!productionId || !stepId) {
      return res
        .status(400)
        .json({ message: "Production ID and Step ID are required." });
    }

    const now = new Date();

    await prisma.$transaction(async (tx) => {
      // 1. Current production ke purane steps ko close karein
      await tx.productionStepTracking.updateMany({
        where: { productionResponseId: productionId, status: "in-progress" },
        data: { stepEndTime: now, status: "completed" },
      });

      // 2. Naya step create karein
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
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
};
// const completeTraning = async (req, res) => {
//   try {
//     const { id } = req.params; // productionResponseId
//     const now = new Date();

//     await prisma.$transaction(async (tx) => {
//       // 1. Close any step that is still "in-progress"
//       await tx.productionStepTracking.updateMany({
//         where: {
//           productionResponseId: id,
//           status: "in-progress",
//         },
//         data: {
//           stepEndTime: now,
//           status: "completed",
//         },
//       });

//       // 2. Mark the main production response as trained and set end time
//       await tx.productionResponse.update({
//         where: { id },
//         data: {
//           traniningStatus: true,
//           cycleTimeEnd: now, // Important for total duration calculation
//         },
//       });
//     });

//     return res.status(200).json({
//       message: "Production response and all steps completed successfully.",
//     });
//   } catch (error) {
//     console.error("Error completing production response:", error);
//     res.status(500).json({ message: "An error occurred on the server." });
//   }
// };
// const markStepAsCompleted = async (req, res) => {
//   try {
//     const { productionResponseId, stepId } = req.body;

//     if (!productionResponseId || !stepId) {
//       return res.status(400).json({ message: "Missing required fields." });
//     }

//     const updated = await prisma.productionStepTracking.updateMany({
//       where: {
//         productionResponseId,
//         workInstructionStepId: stepId,
//       },
//       data: {
//         stepEndTime: new Date(),
//         status: "completed",
//       },
//     });

//     if (updated.count === 0) {
//       return res
//         .status(404)
//         .json({ message: "Step not found or already completed." });
//     }

//     return res.status(200).json({
//       message: "Step marked as completed.",
//       data: {
//         productionResponseId,
//         stepId,
//         stepEndTime: new Date(),
//       },
//     });
//   } catch (error) {
//     console.error("Error completing step:", error);
//     res
//       .status(500)
//       .json({ message: "Internal server error", error: error.message });
//   }
// };

// const completeTraning = async (req, res) => {
//     try {
//         const { id } = req.params; // productionResponseId

//         await prisma.productionResponse.update({
//             where: { id: id },
//             data: {
//                 traniningStatus: true, // <--- ISSE TRUE KAREIN
//                 cycleTimeEnd: new Date(),
//                 updatedAt: new Date()
//             }
//         });

//         return res.status(200).json({ message: "Training status updated to completed." });
//     } catch (error) {
//         res.status(500).json({ message: error.message });
//     }
// };

const completeTraning = async (req, res) => {
  try {
    const { id } = req.params; // productionResponseId
    const now = new Date();

    // Transaction ka use karein taaki dono update ek saath ho
    await prisma.$transaction(async (tx) => {
      // 1. Production record ko complete mark karein
      await tx.productionResponse.update({
        where: { id: id },
        data: {
          traniningStatus: true,
          cycleTimeEnd: now,
          updatedAt: now,
        },
      });

      // 2. Jo akhri step "in-progress" hai, use bhi close karein
      // Isse step ka end time bhi database mein chala jayega
      await tx.productionStepTracking.updateMany({
        where: {
          productionResponseId: id,
          status: "in-progress",
        },
        data: {
          stepEndTime: now,
          status: "completed",
        },
      });
    });

    return res
      .status(200)
      .json({ message: "Training and last step completed successfully." });
  } catch (error) {
    console.error("Error in completeTraning:", error);
    res.status(500).json({ message: error.message });
  }
};
const barcodeScan = async (req, res) => {
  try {
    const { barcode } = req.body;

    const part = await prisma.part.findUnique({ where: { barcode } });

    if (!part) {
      return res.status(404).json({ message: "❌ Invalid barcode" });
    }

    const order = await prisma.stockOrderSchedule.findFirst({
      where: {
        part_id: part.id,
        status: { not: "completed" },
      },
    });

    if (!order) {
      return res.status(404).json({ message: "❌ No active order found" });
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
        status === "completed" ? "✅ Order Completed!" : "✅ Order In Progress",
    });
  } catch (error) {
    console.log(error);
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
    console.error("Error processing barcode scan:", error);
    res.status(500).json({ message: "An error occurred on the server." });
  }
};
const deleteScheduleOrder = async (req, res) => {
  try {
    const id = req.params.id;
    console.log(" req?.body req?.body", req?.query);
    const orderId = req?.query.orderId;

    // STEP 1: Find the schedule
    const schedule = await prisma.stockOrderSchedule.findUnique({
      where: { id },
    });

    if (!schedule) {
      return res.status(404).json({ message: "Schedule not found" });
    }

    const orderType = schedule.order_type; // StockOrder or CustomOrder

    // STEP 2: Delete the schedule
    await prisma.stockOrderSchedule.delete({
      where: { id },
    });

    // STEP 3: Check if any schedule exists for same order_id
    const remainingSchedules = await prisma.stockOrderSchedule.count({
      where: { order_id: orderId },
    });

    // STEP 4: If no schedule left → delete parent order
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
    console.error("Delete error:", error);
    return res.status(500).send({
      message: "Something went wrong. Please try again later.",
      error: error.message,
    });
  }
};

// const scrapEntry = async (req, res) => {
//   try {
//     const {
//       type,
//       partId,
//       returnQuantity,
//       scrapStatus,
//       supplierId,
//       returnSupplierQty,
//       createdBy,
//     } = req.body;
//     const part = await prisma.partNumber.findUnique({
//       where: { part_id: partId },
//       select: { availStock: true },
//     });

//     if (!part) {
//       return res.status(404).json({ error: "Part not found" });
//     }

//     if ((part.availStock ?? 0) < Number(returnQuantity)) {
//       return res.status(400).json({
//         message: "Insufficient stock to scrap the requested quantity",
//       });
//     }

//     const [newEntry] = await prisma.$transaction([
//       prisma.scapEntries.create({
//         data: {
//           type,
//           partId,
//           productId: req?.body?.productId,
//           returnQuantity,
//           scrapStatus: scrapStatus === "yes",
//           createdBy: req.user.id,
//           createdByAdmin: {
//             connect: { id: req.user?.id },
//           },
//           createdByEmployee: {
//             connect: { id: req.user?.id },
//           },
//           processId: req?.body?.processId,
//           supplierId,
//           returnSupplierQty,
//         },
//       }),
//       prisma.partNumber.update({
//         where: { part_id: partId },
//         data: {
//           availStock: {
//             decrement: Number(returnQuantity),
//           },
//         },
//       }),
//     ]);

//     return res.status(201).json({
//       message: "Scrap entry created and stock updated",
//       data: newEntry,
//     });
//   } catch (error) {
//     console.error("Error creating scrap entry:", error);
//     return res.status(500).json({ error: "Internal server error" });
//   }
// };
// 2/7/26
// const scrapEntry = async (req, res) => {
//   try {
//     const {
//       type,
//       partId,
//       productId, // productId ko bhi destructure kar lete hain
//       processId, // processId ko bhi
//       returnQuantity,
//       scrapStatus,
//       supplierId,
//       returnSupplierQty,
//     } = req.body;

//     // --- Pehle Stock Check Kar Lete Hain ---
//     const part = await prisma.partNumber.findUnique({
//       where: { part_id: partId },
//       select: { availStock: true },
//     });

//     if (!part) {
//       return res.status(404).json({ error: "Part not found" });
//     }

//     if ((part.availStock ?? 0) < Number(returnQuantity)) {
//       return res.status(400).json({
//         message: "Insufficient stock to scrap the requested quantity",
//       });
//     }

//     // --- Prisma ke liye Sahi Data Object Banayein ---
//     const dataForPrisma = {
//       type,
//       returnQuantity: Number(returnQuantity),
//       scrapStatus: scrapStatus === "yes",
//       returnSupplierQty: returnSupplierQty
//         ? Number(returnSupplierQty)
//         : undefined,
//     };

//     // SOLUTION 1: Relation ko ID se "connect" karein, direct ID na dein
//     if (partId) {
//       dataForPrisma.PartNumber = { connect: { part_id: partId } };
//     }
//     if (supplierId) {
//       dataForPrisma.supplier = { connect: { id: supplierId } };
//     }
//     if (processId) {
//       dataForPrisma.process = { connect: { id: processId } };
//     }
//     if (productId) {
//       // Assuming you have a 'Product' relation in your schema
//       // dataForPrisma.Product = { connect: { id: productId } };
//     }

//     // SOLUTION 2 & 3: User ke role ke basis par creator ko connect karein
//     // Yeh maante hue ki aapke auth middleware se req.user.role set hota hai
//     if (req.user && req.user.role === "superAdmin") {
//       dataForPrisma.createdByAdmin = {
//         connect: { id: req.user.id },
//       };
//     } else if (
//       req.user &&
//       ["employee", "Shop_Floor", "Frontline_Manager"].includes(req.user.role)
//     ) {
//       dataForPrisma.createdByEmployee = {
//         connect: { id: req.user.id },
//       };
//     } else {
//       return res
//         .status(403)
//         .json({ message: "User role not authorized for this action." });
//     }

//     // --- Ab Transaction Run Karein ---
//     const [newEntry] = await prisma.$transaction([
//       prisma.scapEntries.create({
//         // Yahaan pehle se banaya hua object use karein
//         data: dataForPrisma,
//       }),
//       prisma.partNumber.update({
//         where: { part_id: partId },
//         data: {
//           availStock: {
//             decrement: Number(returnQuantity),
//           },
//         },
//       }),
//     ]);

//     return res.status(201).json({
//       message: "Scrap entry created and stock updated",
//       data: newEntry,
//     });
//   } catch (error) {
//     console.error("Error creating scrap entry:", error);

//     // Prisma ke specific error ko handle karein for better messages
//     if (error.code === "P2025") {
//       return res.status(404).json({
//         error:
//           "Operation failed: A record to connect was not found (e.g., invalid partId, supplierId, or userId).",
//       });
//     }

//     return res.status(500).json({ error: "Internal server error" });
//   }
// };
// 2/7/26
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
    console.error("Scrap Entry Error:", error);

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
    console.error("GET Scan Complete Error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// const allScrapEntires = async (req, res) => {
//   try {
//     const paginationData = await paginationQuery(req.query);
//     const { filterScrap, search } = req.query;
//     const user = req.user;

//     const condition = {
//       isDeleted: false,
//     };

//     if (filterScrap && filterScrap.toLowerCase() !== "all") {
//       condition.type = filterScrap;
//     }
//     if (user?.role === "Shop_Floor" && user?.id) {
//       condition.createdByEmployeeId = user?.id;
//     }
//     if (search) {
//       condition.OR = [
//         {
//           supplier: {
//             firstName: {
//               contains: search,
//             },
//           },
//         },
//         {
//           supplier: {
//             lastName: {
//               contains: search,
//             },
//           },
//         },
//         {
//           PartNumber: {
//             partNumber: {
//               contains: search,
//             },
//           },
//         },
//       ];
//     }

//     const [allProcess, totalCount] = await Promise.all([
//       prisma.scapEntries.findMany({
//         where: condition,
//         skip: paginationData.skip,
//         take: paginationData.pageSize,
//         include: {
//           PartNumber: {
//             select: {
//               part_id: true,
//               partNumber: true,
//             },
//           },

//           supplier: {
//             select: {
//               firstName: true,
//               lastName: true,
//             },
//           },
//           createdByAdmin: {
//             select: {
//               name: true,
//             },
//           },
//           createdByEmployee: {
//             select: {
//               firstName: true,
//             },
//           },
//         },
//       }),
//       prisma.scapEntries.count({
//         where: condition,
//       }),
//     ]);
//     console.log("allProcess", allProcess);
//     const getPagination = await pagination({
//       page: paginationData.page,
//       pageSize: paginationData.pageSize,
//       total: totalCount,
//     });

//     return res.status(200).json({
//       message: "Part number retrieved successfully!",
//       data: allProcess,
//       totalCount,
//       pagination: getPagination,
//     });
//   } catch (error) {
//     console.log("errorerror", error);
//     return res.status(500).send({
//       message: "Something went wrong. Please try again later.",
//     });
//   }
// };
const allScrapEntires = async (req, res) => {
  try {
    const paginationData = await paginationQuery(req.query);
    const { filterScrap, search } = req.query;
    const user = req.user;

    const condition = { isDeleted: false };
    if (filterScrap && filterScrap.toLowerCase() !== "all")
      condition.type = filterScrap;

    // if (user?.role === "Shop_Floor" && user?.id) {
    //   condition.OR = [
    //     { createdByEmployeeId: user.id },
    //     { employeeId: user.id },
    //   ];
    // }

    if (search) {
      condition.OR = [
        { supplier: { firstName: { contains: search } } },
        { PartNumber: { partNumber: { contains: search } } },
      ];
    }

    // 1. Scrap Entries fetch karein + Part ke orders ke andar se Supplier nikaalein
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
              // Yahan hum check kar rahe hain ki ye part kab-kab order hua
              supplier_orders: {
                where: { isDeleted: false },
                take: 1, // Sabse latest order uthayenge
                orderBy: { createdAt: "desc" },
                include: {
                  supplier: {
                    // Us order ka supplier
                    select: { firstName: true, lastName: true },
                  },
                },
              },
            },
          },
          supplier: { select: { firstName: true, lastName: true } }, // Scrap entry ka direct supplier
          createdByAdmin: { select: { name: true } },
          createdByEmployee: { select: { firstName: true, lastName: true } },
        },
      }),
      prisma.scapEntries.count({ where: condition }),
    ]);

    // 2. Employee mapping logic (same as before)
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

    // 3. Final Data Transformation
    const dataWithDetails = allProcess.map((item) => {
      // Priority 1: Scrap entry mein manually supplier select kiya gaya ho
      let finalSupplierName = "N/A";
      console.log("itemitemitemitem", item);
      if (item.supplier) {
        finalSupplierName =
          `${item.supplier.firstName || ""} ${item.supplier.lastName || ""}`.trim();
      }
      // Priority 2: Part ki order history se supplier nikalein
      else if (item.PartNumber?.supplier_orders?.length > 0) {
        const s = item.PartNumber.supplier_orders[0].supplier;
        if (s) {
          finalSupplierName = `${s.firstName || ""} ${s.lastName || ""}`.trim();
        }
      }

      return {
        ...item,
        supplierName: finalSupplierName, // Frontend ke liye simple field
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
    console.error(error);
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
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    if (!entry) {
      return res.status(404).json({ error: "Scrap entry not found" });
    }

    res.status(200).json({ data: entry });
  } catch (error) {
    console.error("Error fetching scrap entry:", error);
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
      message: "Scrap entry updated and stock adjusted",
      data: updatedEntry,
    });
  } catch (error) {
    console.error("Error updating scrap entry:", error);
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
    console.error("Error:", error);
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
      orderBy: { createdAt: "desc" },
    });

    // Counts logic
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
    console.error("Error fetching notifications:", error);
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

    let whereCondition = { isDeleted: false };
    let scrapWhereCondition = { isDeleted: false };

    if (startDate && endDate) {
      const start = new Date(new Date(startDate).setHours(0, 0, 0, 0));
      const end = new Date(new Date(endDate).setHours(23, 59, 59, 999));
      whereCondition.createdAt = { gte: start, lte: end };
      scrapWhereCondition.createdAt = { gte: start, lte: end };
    }

    // 1. Fetch Schedule Data
    const rawData = await prisma.stockOrderSchedule.findMany({
      where: whereCondition,
      select: {
        scrapQuantity: true,
        scheduleQuantity: true,
        createdAt: true,
        process: true,
        part: {
          select: {
            part_id: true,
            partNumber: true,
            partDescription: true,
            process: {
              select: { processName: true, machineName: true },
            },
          },
        },
      },
    });
    const aa = await prisma.scapEntries.findMany();
    const scrapEntriesRecords = await prisma.scapEntries.findMany({
      where: scrapWhereCondition,
      include: {
        PartNumber: {
          select: {
            process: true,
            partNumber: true,
            partDescription: true,
          },
        },
        process: {
          select: {
            processName: true,
            machineName: true,
          },
        },

        supplier: { select: { firstName: true, lastName: true } },
        customers: { select: { firstName: true, lastName: true } },
      },
    });
    const mergedMap = new Map();
    const supplierScrapDetails = [];
    const customerScrapDetails = [];

    const updateMap = (
      id,
      partInfo,
      scrapQty,
      scheduleQty,
      date,
      pName,
      mName,
    ) => {
      if (!mergedMap.has(id)) {
        console.log("partInfo", partInfo);
        mergedMap.set(id, {
          partId: id,
          partNumber: partInfo?.partNumber || "Unknown",
          partDescription: partInfo?.partDescription || "",
          processName: partInfo?.process?.processName || "",
          machineName: partInfo?.process?.machineName || "",
          scrapQuantity: Number(scrapQty) || 0,
          scheduleQuantity: Number(scheduleQty) || 0,
          latestDate: date,
          isChild: false,
        });
      } else {
        const existing = mergedMap.get(id);
        existing.scrapQuantity += Number(scrapQty) || 0;
        existing.scheduleQuantity += Number(scheduleQty) || 0;
        if (date > existing.latestDate) existing.latestDate = date;
        if (!existing.processName) existing.processName = pName || "";
        if (!existing.machineName) existing.machineName = mName || "";
      }
    };

    // Existing Logic for Schedule
    rawData.forEach((item) => {
      console.log("itemitem", item);
      if (item.part) {
        updateMap(
          item.part.part_id,
          item.part,
          item.scrapQuantity || 0,
          item.scheduleQuantity || 0,
          item.createdAt,
          item.process?.processName,
          item.process?.machineName,
        );
      }
    });

    scrapEntriesRecords.forEach((scrap) => {
      const partInfo = scrap.PartNumber;
      const key = scrap.partId || partInfo?.part_id;
      const sQty =
        Number(scrap.scrapQuantity) || Number(scrap.returnQuantity) || 0;

      if (key) {
        updateMap(key, partInfo, sQty, 0, scrap.createdAt);

        if (scrap.supplierId || scrap.returnSupplierId) {
          supplierScrapDetails.push({
            partNumber: partInfo?.partNumber,
            supplierName:
              `${scrap.supplier?.firstName} ${scrap.supplier?.lastName}` ||
              "N/A",
            quantity: sQty,
            defectDesc: scrap.defectDesc,
            date: scrap.createdAt,
            type: scrap.type || "Supplier Return",
          });
        }

        if (scrap.customersId) {
          customerScrapDetails.push({
            partNumber: partInfo?.partNumber,
            customerName:
              `${scrap.customers?.firstName} ${scrap.customers?.lastName}` ||
              "N/A",
            quantity: sQty,
            defectDesc: scrap.defectDesc,
            date: scrap.createdAt,
            type: scrap.type || "Customer Return",
          });
        }
      }
    });

    const data = Array.from(mergedMap.values());
    const filteredData = data.filter((item) => item.scrapQuantity > 0);
    filteredData.sort((a, b) => b.scrapQuantity - a.scrapQuantity);

    const totalScrapQty = filteredData.reduce(
      (acc, item) => acc + item.scrapQuantity,
      0,
    );

    return res.status(200).json({
      success: true,
      message: "Quality performance data retrieved successfully!",
      totalScrapQty,
      totalEntries: filteredData.length,
      data: filteredData,
      supplierScrapDetails,
      customerScrapDetails,
    });
  } catch (error) {
    console.error("Error in qualityPerformance:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message,
    });
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
    console.error("Error approving timesheet:", error);
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
    const { year, startDate, endDate } = req.query;

    const whereClause = { status: "completed", isDeleted: false };
    const scrapWhereClause = { isDeleted: false };
    if (startDate || endDate) {
      const start = startDate ? new Date(startDate) : null;
      const end = endDate ? new Date(endDate) : null;
      if (end) end.setHours(23, 59, 59, 999);

      if (start || end) {
        const dateRange = {};
        if (start) dateRange.gte = start;
        if (end) dateRange.lte = end;

        whereClause.completed_date = dateRange;
        scrapWhereClause.createdAt = dateRange;
      }
    } else if (year) {
      const startOfYear = new Date(`${year}-01-01T00:00:00.000Z`);
      const endOfYear = new Date(`${year}-12-31T23:59:59.999Z`);

      whereClause.completed_date = { gte: startOfYear, lte: endOfYear };
      scrapWhereClause.createdAt = { gte: startOfYear, lte: endOfYear };
    }

    // 2. Parallel Fetching for better performance
    const [completedStock, manualScrapEntries] = await Promise.all([
      prisma.stockOrderSchedule.findMany({
        where: whereClause,
        include: {
          part: {
            select: {
              cost: true,
              cycleTime: true,
              process: { select: { ratePerHour: true } },
            },
          },
        },
      }),
      prisma.scapEntries.findMany({
        where: scrapWhereClause,
        include: { PartNumber: { select: { cost: true } } },
      }),
    ]);

    const cogsData = {};
    let totalScrapCost = 0;
    let supplierReturn = 0;
    let totalRangeCost = 0;
    completedStock.forEach((order) => {
      const date = new Date(order.completed_date || new Date());
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      const partCost = parseFloat(order.part?.cost || 0);
      const cycleTimeHours = (order.part?.cycleTime || 0) / 60;
      const ratePerHour = order.part?.process?.ratePerHour || 0;
      const unitCOGS = partCost + cycleTimeHours * ratePerHour;
      const totalCOGS = unitCOGS * (order.completedQuantity || 0);
      if (!cogsData[monthKey]) cogsData[monthKey] = 0;
      cogsData[monthKey] += totalCOGS;
      totalRangeCost += totalCOGS;
      totalScrapCost += (order.scrapQuantity || 0) * partCost;
      supplierReturn += (order.supplierReturnQuantity || 0) * partCost;
    });

    manualScrapEntries.forEach((entry) => {
      const mPartCost = parseFloat(entry.PartNumber?.cost || 0);
      const mQty = Number(entry.returnQuantity) || 0;
      const entryTotalCost = mQty * mPartCost;

      if (entry.supplierId || entry.type === "supplier") {
        supplierReturn += entryTotalCost;
      } else {
        totalScrapCost += entryTotalCost;
      }
    });

    res.json({
      monthlyCOGS: cogsData,
      totalYearCost: parseFloat(totalRangeCost.toFixed(2)),
      scrapCost: parseFloat(totalScrapCost.toFixed(2)),
      supplierReturn: parseFloat(supplierReturn.toFixed(2)),
      totalCOGSWithScrap: parseFloat(
        (totalRangeCost + totalScrapCost + supplierReturn).toFixed(2),
      ),
    });
  } catch (error) {
    console.error("Costing API Error:", error);
    res.status(500).json({
      message: "Something went wrong. Please try again later.",
      error: error.message,
    });
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
      const cycleTimeHours = parseCycleTime(order.part?.cycleTime || 0); // Ensure numeric
      const ratePerHour = order.part?.process?.ratePerHour || 0;

      // Total cost for completed quantity
      const completedCost =
        (partCost + cycleTimeHours * ratePerHour) *
        (order.completedQuantity || 1);

      // Scrap cost for this order
      const scrapCost = (order.scrapQuantity || 0) * partCost;

      // Monthly aggregation
      monthlyCompleted[monthKey] =
        (monthlyCompleted[monthKey] || 0) + completedCost;
      monthlyScrap[monthKey] = (monthlyScrap[monthKey] || 0) + scrapCost;

      // Yearly totals
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
    console.error(error);
    res.status(500).json({
      message: "Something went wrong. Please try again later.",
      error: error.message,
    });
  }
};
// const getInventory = async (req, res) => {
//   try {
//     const { period, year, month } = req.query;

//     const parts = await prisma.partNumber.findMany({
//       where: { isDeleted: false },
//       include: {
//         process: { select: { ratePerHour: true } },
//         StockOrder_StockOrder_productNumberToPartNumber: {
//           select: { productQuantity: true, status: true, createdAt: true },
//         },
//       },
//     });

//     const inventoryData = {};
//     let totalInventoryCost = 0;

//     parts.forEach((part) => {
//       const partCost = part.cost || 0;
//       const cycleTimeHours = parseCycleTime(part.cycleTime || "0");
//       console.log("cycleTimeHourscycleTimeHours", cycleTimeHours);

//       const ratePerHour = part.process?.ratePerHour || 0;
//       console.log("ratePerHourratePerHour", ratePerHour);
//       console.log(
//         "partCostpartCostpartCost",
//         partCost,
//         cycleTimeHours,
//         ratePerHour
//       );

//       const costPerPart = partCost + cycleTimeHours * ratePerHour;

//       part.StockOrder_StockOrder_productNumberToPartNumber.forEach((order) => {
//         const orderDate = new Date(order.createdAt);

//         // 🔹 filter by year / month (agar diya ho)
//         if (year && orderDate.getFullYear() !== parseInt(year)) return;
//         if (month && orderDate.getMonth() + 1 !== parseInt(month)) return;

//         let key = "";

//         if (period === "day") {
//           // format: YYYY-MM-DD
//           key = orderDate.toISOString().split("T")[0];
//         } else if (period === "week") {
//           // weekday name: Monday, Tuesday ...
//           key = orderDate.toLocaleDateString("en-US", { weekday: "long" });
//         } else if (period === "month") {
//           // Month name: Jan, Feb ...
//           key = orderDate.toLocaleDateString("en-US", { month: "short" });
//         } else if (period === "year") {
//           // Year number
//           key = `${orderDate.getFullYear()}`;
//         } else {
//           key = orderDate.toISOString().split("T")[0];
//         }

//         if (!inventoryData[key]) inventoryData[key] = [];
//         console.log("partpart", part);

//         const availableStock = part.availStock || 0;

//         const inventoryLevel = availableStock - (part.minStock || 0);
//         const inventoryCost = inventoryLevel * costPerPart;

//         totalInventoryCost += inventoryCost;

//         inventoryData[key].push({
//           partNumber: part.partNumber,
//           availableStock,
//           minStock: part.minStock || 0,
//           inventoryLevel,
//           costPerPart,
//           inventoryCost,
//         });
//       });
//     });

//     res.json({ inventoryData, totalInventoryCost });
//   } catch (error) {
//     console.error(error);
//     res
//       .status(500)
//       .json({ message: "Error calculating inventory", error: error.message });
//   }
// };

// const getInventory = async (req, res) => {
//   try {
//     const { period, year, month } = req.query;

//     // Fetch all parts
//     const parts = await prisma.partNumber.findMany({
//       where: { isDeleted: false },
//       include: { process: { select: { ratePerHour: true } } },
//     });

//     const inventoryData = {};
//     let totalInventoryCost = 0;

//     parts.forEach((part) => {
//       const partCost = parseFloat(part.cost) || 0;
//       const cycleTimeMinutes = parseFloat(part.cycleTime) || 0;
//       const cycleTimeHours = cycleTimeMinutes / 60;
//       const ratePerHour = parseFloat(part.process?.ratePerHour) || 0;

//       const costPerUnit = partCost + cycleTimeHours * ratePerHour;
//       const availableStock = Number(part.availStock || 0);
//       const minStock = Number(part.minStock || 0);

//       const inventoryLevel = Math.max(availableStock - minStock, 0);
//       const inventoryCost = inventoryLevel * costPerUnit;

//       totalInventoryCost += inventoryCost;

//       let key = "total";
//       const now = new Date();
//       if (period === "day") key = now.toISOString().split("T")[0];
//       else if (period === "week")
//         key = now.toLocaleDateString("en-US", { weekday: "long" });
//       else if (period === "month")
//         key = now.toLocaleDateString("en-US", { day: "numeric" });
//       else if (period === "year")
//         key = now.toLocaleDateString("en-US", { month: "short" });

//       if (!inventoryData[key]) inventoryData[key] = [];

//       inventoryData[key].push({
//         partNumber: part.partNumber,
//         availableStock,
//         minStock,
//         inventoryLevel,
//         costPerUnit,
//         inventoryCost,
//       });
//     });

//     // 🔹 Keep data format same for frontend
//     res.json({
//       inventoryData,
//       totalInventoryCost: totalInventoryCost.toFixed(2),
//     });
//   } catch (error) {
//     console.error(error);
//     res
//       .status(500)
//       .json({ message: "Error calculating inventory", error: error.message });
//   }
// };

// const getInventory = async (req, res) => {
//   try {
//     const { period, date } = req.query;

//     // 1. Aaj ki date setup karein
//     const today = new Date();
//     today.setHours(0, 0, 0, 0);

//     // 2. Parts fetch karein (Humein calculation har baar karni hai response dene ke liye)
//     const parts = await prisma.partNumber.findMany({
//       where: { isDeleted: false },
//       include: { process: { select: { ratePerHour: true } } },
//     });
// console.log('partspartspartspartspartsparts',parts)
//     const inventoryData = {};
//     let totalInventoryCostSum = 0;
//     const currentSnapshotRecords = [];

//     // 3. Calculation Logic
//     parts.forEach((part) => {
//       const partCost = parseFloat(part.cost) || 0;
//       const cycleTimeHours = (parseFloat(part.cycleTime) || 0) / 60;
//       const ratePerHour = parseFloat(part.process?.ratePerHour) || 0;
//       const costPerUnit = partCost + cycleTimeHours * ratePerHour;

//       const availableStock = Number(part.availStock || 0);
//       const minStock = Number(part.minStock || 0);
//       const inventoryLevel = Math.max(availableStock - minStock, 0);
//       const inventoryCost = inventoryLevel * costPerUnit;

//       totalInventoryCostSum += inventoryCost;

//       // Response ke liye data structure
//       let key = "total";
//       if (!inventoryData[key]) inventoryData[key] = [];
//       inventoryData[key].push({
//         partNumber: part.partNumber,
//         availableStock,
//         inventoryLevel,
//         costPerUnit,
//         inventoryCost,
//       });

//       // Database mein save karne ke liye object (Bina minStock ke)
//       currentSnapshotRecords.push({
//         partNumber: part.partNumber,
//         availableStock,
//         inventoryLevel,
//         costPerUnit: parseFloat(costPerUnit.toFixed(2)),
//         inventoryCost: parseFloat(inventoryCost.toFixed(2)),
//         totalInventoryCost: 0, // Neeche update hoga
//         date: today,
//       });
//     });

//     // 4. DAILY STORAGE CHECK (Bina Cron ke)
//     const existingSnapshot = await prisma.dailyInventory.findFirst({
//       where: { date: today },
//     });

//     if (!existingSnapshot && currentSnapshotRecords.length > 0) {
//       console.log("Saving today's inventory...");
//       await prisma.dailyInventory.createMany({
//         data: currentSnapshotRecords.map((item) => ({
//           ...item,
//           totalInventoryCost: parseFloat(totalInventoryCostSum.toFixed(2)),
//         })),
//       });
//     }

//     // 5. FINAL RESPONSE (Taki Frontend par $0 na dikhe)
//     res.json({
//       inventoryData,
//       totalInventoryCost: totalInventoryCostSum.toFixed(2),
//     });
//   } catch (error) {
//     console.error("Inventory Error:", error);
//     res
//       .status(500)
//       .json({ message: "Error calculating inventory", error: error.message });
//   }
// };

// const getInventory = async (req, res) => {
//   try {
//     const { period = "daily" } = req.query;

//     let days = 7; // default daily → last 7 days

//     if (period === "weekly") days = 14;
//     if (period === "monthly") days = 30;

//     const startDate = new Date();
//     startDate.setDate(startDate.getDate() - (days - 1));
//     startDate.setHours(0, 0, 0, 0);

//     const endDate = new Date();
//     endDate.setHours(23, 59, 59, 999);

//     const data = await prisma.dailyInventory.findMany({
//       where: {
//         date: {
//           gte: startDate,
//           lte: endDate,
//         },
//       },
//       select: {
//         date: true,
//         totalInventoryCost: true,
//       },
//     });

//     // 🔹 date-wise grouping
//     const map = {};

//     data.forEach((item) => {
//       const key = item.date.toISOString().split("T")[0];
//       map[key] = (map[key] || 0) + item.totalInventoryCost;
//     });

//     // 🔹 missing dates bhi add honge (0 value)
//     const result = [];
//     for (let i = 0; i < days; i++) {
//       const d = new Date(startDate);
//       d.setDate(startDate.getDate() + i);

//       const key = d.toISOString().split("T")[0];
//       result.push({
//         date: key,
//         totalInventoryCost: map[key] || 0,
//       });
//     }

//     res.json(result);
//   } catch (error) {
//     res.status(500).json({ message: error.message });
//   }
// };
// const getInventory = async (req, res) => {
//   try {
//     const { period = "daily" } = req.query;
//     let days = 7;
//     if (period === "weekly") days = 14;
//     if (period === "monthly") days = 30;

//     // 1. Timezone Fix: Aaj ki Local Date (Midnight)
//     const now = new Date();
//     const endDate = new Date(now);
//     endDate.setHours(23, 59, 59, 999);

//     const startDate = new Date(now);
//     startDate.setDate(now.getDate() - (days - 1));
//     startDate.setHours(0, 0, 0, 0);

//     // 2. Database se purana data fetch karein
//     const historicalData = await prisma.dailyInventory.findMany({
//       where: {
//         date: { gte: startDate, lte: endDate },
//       },
//       select: { date: true, totalInventoryCost: true },
//     });

//     // 3. AAJ KA LIVE DATA CALCULATE KAREIN (Dashboard formula)
//     // Ye isliye kyunki dailyInventory table me shayad aaj ki entry abhi tak na hui ho
//     const parts = await prisma.partNumber.findMany({
//       where: { isDeleted: false },
//       include: { process: { select: { ratePerHour: true, cycleTime: true } } },
//     });

//     let liveInventoryCost = 0;
//     parts.forEach((part) => {
//       const availableStock = Number(part.availStock) || 0;
//       const minStock = Number(part.minStock) || 0;
//       const extraStock = availableStock - minStock;

//       if (extraStock > 0) {
//         const partCost = parseFloat(part.cost) || 0;
//         const cycleTime = (parseFloat(part.cycleTime) || 0) / 60;
//         const ratePerHour = parseFloat(part.process?.ratePerHour) || 0;
//         const costPerUnit = partCost + cycleTime * ratePerHour;
//         liveInventoryCost += extraStock * costPerUnit;
//       }
//     });

//     // 4. Helper: Local Date Format (YYYY-MM-DD)
//     const getLocalKey = (date) => {
//       const y = date.getFullYear();
//       const m = String(date.getMonth() + 1).padStart(2, "0");
//       const d = String(date.getDate()).padStart(2, "0");
//       return `${y}-${m}-${d}`;
//     };

//     // 5. Mapping historical data
//     const map = {};
//     historicalData.forEach((item) => {
//       const key = getLocalKey(item.date);
//       map[key] = item.totalInventoryCost;
//     });

//     // Aaj ki date ko live cost se overwrite ya fill karein
//     const todayKey = getLocalKey(now);
//     map[todayKey] = liveInventoryCost;

//     // 6. Final Result Array (Missing dates fill karein)
//     const result = [];
//     for (let i = 0; i < days; i++) {
//       const d = new Date(startDate);
//       d.setDate(startDate.getDate() + i);
//       const key = getLocalKey(d);

//       result.push({
//         date: key,
//         totalInventoryCost: map[key] || 0,
//       });
//     }

//     res.json(result);
//   } catch (error) {
//     res.status(500).json({ message: error.message });
//   }
// };

// const getInventory = async (req, res) => {
//   try {
//     const { period = "daily" } = req.query;
//     let days = 7;
//     if (period === "weekly") days = 14;
//     if (period === "monthly") days = 30;

//     const now = new Date();
//     const endDate = new Date(now);
//     endDate.setHours(23, 59, 59, 999);

//     const startDate = new Date(now);
//     startDate.setDate(now.getDate() - (days - 1));
//     startDate.setHours(0, 0, 0, 0);

//     // 1. Historical data fetch karein
//     const historicalData = await prisma.dailyInventory.findMany({
//       where: {
//         date: { gte: startDate, lte: endDate },
//       },
//       select: { date: true, totalInventoryCost: true },
//     });

//     // 2. LIVE DATA aur PARTS LIST calculate karein
//     const parts = await prisma.partNumber.findMany({
//       where: { isDeleted: false },
//       include: { process: { select: { ratePerHour: true, cycleTime: true } } },
//     });

//     let liveInventoryCost = 0;
//     const partsDetails = []; // Parts ki list store karne ke liye

//     parts.forEach((part) => {
//       const availableStock = Number(part.availStock) || 0;
//       const minStock = Number(part.minStock) || 0;
//       const extraStock = availableStock - minStock;

//       const partCost = parseFloat(part.cost) || 0;
//       const cycleTime = (parseFloat(part.cycleTime) || 0) / 60;
//       const ratePerHour = parseFloat(part.process?.ratePerHour) || 0;
//       const costPerUnit = partCost + cycleTime * ratePerHour;

//       const totalPartExtraCost = extraStock > 0 ? extraStock * costPerUnit : 0;

//       if (extraStock > 0) {
//         liveInventoryCost += totalPartExtraCost;
//       }

//       // Har part ki detail array mein push karein
//       partsDetails.push({
//         id: part.id,
//         partName: part.partName, // Aapke schema ke hisaab se field name check kar lein
//         partNumber: part.partNumber,
//         availStock: availableStock,
//         minStock: minStock,
//         leadTime: part.leadTime,
//         costPerUnit: costPerUnit.toFixed(2),
//         totalExtraCost: totalPartExtraCost.toFixed(2),
//       });
//     });

//     // 3. Helper: Local Date Format
//     const getLocalKey = (date) => {
//       const y = date.getFullYear();
//       const m = String(date.getMonth() + 1).padStart(2, "0");
//       const d = String(date.getDate()).padStart(2, "0");
//       return `${y}-${m}-${d}`;
//     };

//     // 4. Mapping historical data
//     const map = {};
//     historicalData.forEach((item) => {
//       const key = getLocalKey(item.date);
//       map[key] = item.totalInventoryCost;
//     });

//     const todayKey = getLocalKey(now);
//     map[todayKey] = liveInventoryCost;

//     // 5. Chart Data (Missing dates fill karein)
//     const chartData = [];
//     for (let i = 0; i < days; i++) {
//       const d = new Date(startDate);
//       d.setDate(startDate.getDate() + i);
//       const key = getLocalKey(d);

//       chartData.push({
//         date: key,
//         totalInventoryCost: map[key] || 0,
//       });
//     }

//     // 6. Final Response
//     res.json({
//       chartData: chartData,
//       parts: partsDetails, // Parts ki list yahan bhej di

//         turnoverRatio: parseFloat(turnoverRatio.toFixed(2)), // Ye raha aapka ratio
//     });
//   } catch (error) {
//     res.status(500).json({ message: error.message });
//   }
// // };

// const getInventory = async (req, res) => {
//   try {
//     const { period = "daily" } = req.query;
//     let days = 7;
//     if (period === "weekly") days = 14;
//     if (period === "monthly") days = 30;

//     const now = new Date();
//     const endDate = new Date(now);
//     endDate.setHours(23, 59, 59, 999);

//     const startDate = new Date(now);
//     startDate.setDate(now.getDate() - (days - 1));
//     startDate.setHours(0, 0, 0, 0);

//     // 1. Historical Inventory Data
//     const historicalData = await prisma.dailyInventory.findMany({
//       where: { date: { gte: startDate, lte: endDate } },
//       select: { date: true, totalInventoryCost: true },
//     });

//     // 2. Parts Calculation (Live Inventory & Parts List)
//     const parts = await prisma.partNumber.findMany({
//       where: { isDeleted: false },
//       include: { process: { select: { ratePerHour: true } } },
//     });

//     let liveInventoryCost = 0;
//     const partsDetails = [];

//     parts.forEach((part) => {
//       const availableStock = Number(part.availStock) || 0;
//       const minStock = Number(part.minStock) || 0;
//       const leadTime = part.leadTime;

//       const extraStock = Math.max(0, availableStock - minStock);

//       const partCost = parseFloat(part.cost) || 0;
//       const cycleTimeHours = (parseFloat(part.cycleTime) || 0) / 60;
//       const ratePerHour = parseFloat(part.process?.ratePerHour) || 0;
//       const costPerUnit = partCost + cycleTimeHours * ratePerHour;

//       const totalPartExtraCost = extraStock * costPerUnit;
//       liveInventoryCost += totalPartExtraCost;

//       partsDetails.push({
//         partNumber: part.partNumber,
//         availStock: availableStock,
//         minStock: minStock,
//         leadTime: part.leadTime,
//         costPerUnit: costPerUnit.toFixed(2),
//         totalExtraCost: totalPartExtraCost.toFixed(2),
//       });
//     });

//     // 3. COGS Calculation (Same period ke liye - Costing API logic)
//     const completedStock = await prisma.stockOrderSchedule.findMany({
//       where: {
//         status: "completed",
//         isDeleted: false,
//         completed_date: { gte: startDate, lte: endDate },
//       },
//       include: {
//         part: {
//           select: {
//             cost: true,
//             cycleTime: true,
//             process: { select: { ratePerHour: true } },
//           },
//         },
//       },
//     });

//     let totalCOGS = 0;
//     completedStock.forEach((order) => {
//       const pCost = parseFloat(order.part?.cost || 0);
//       const cTimeHours = (order.part?.cycleTime || 0) / 60;
//       const rPerHour = order.part?.process?.ratePerHour || 0;
//       const unitCost = pCost + cTimeHours * rPerHour;

//       totalCOGS += unitCost * (order.completedQuantity || 0);
//     });

//     // 4. Turnover Ratio (Inventory / COGS)
//     // Division by zero handle karne ke liye check
//     const turnoverRatio = totalCOGS > 0 ? liveInventoryCost / totalCOGS : 0;

//     // 5. Chart Data Mapping
//     const getLocalKey = (date) => {
//       const y = date.getFullYear();
//       const m = String(date.getMonth() + 1).padStart(2, "0");
//       const d = String(date.getDate()).padStart(2, "0");
//       return `${y}-${m}-${d}`;
//     };

//     const map = {};
//     historicalData.forEach((item) => {
//       map[getLocalKey(item.date)] = item.totalInventoryCost;
//     });
//     map[getLocalKey(now)] = liveInventoryCost;

//     const chartData = [];
//     for (let i = 0; i < days; i++) {
//       const d = new Date(startDate);
//       d.setDate(startDate.getDate() + i);
//       const key = getLocalKey(d);
//       chartData.push({
//         date: key,
//         totalInventoryCost: map[key] || 0,
//       });
//     }

//     // 6. Final Response
//     res.json({
//       chartData,
//       parts: partsDetails,
//       summary: {
//         totalInventoryCost: parseFloat(liveInventoryCost.toFixed(2)),
//         totalCOGS: parseFloat(totalCOGS.toFixed(2)),
//         turnoverRatio: parseFloat(turnoverRatio.toFixed(2)), // Ye raha aapka ratio
//       },
//     });
//   } catch (error) {
//     res.status(500).json({ message: error.message });
//   }
// };

const getInventory = async (req, res) => {
  try {
    const { period = "daily" } = req.query;
    let days = 7;
    if (period === "weekly") days = 14;
    if (period === "monthly") days = 30;

    const now = new Date();
    const endDate = new Date(now);
    endDate.setHours(23, 59, 59, 999);

    const startDate = new Date(now);
    startDate.setDate(now.getDate() - (days - 1));
    startDate.setHours(0, 0, 0, 0);
    const historicalData = await prisma.dailyInventory.findMany({
      where: { date: { gte: startDate, lte: endDate } },
      select: { date: true, totalInventoryCost: true },
    });

    // 2. Parts Calculation (Live Inventory & Parts List)
    const parts = await prisma.partNumber.findMany({
      where: { isDeleted: false },
      include: { process: { select: { ratePerHour: true } } },
    });
    let liveInventoryCost = 0;
    const partsDetails = [];
    const outOfStockParts = [];
    let outOfStockCount = 0;

    parts.forEach((part) => {
      const availableStock = Number(part.availStock) || 0;
      const minStock = Number(part.minStock) || 0;

      const partCost = parseFloat(part.cost) || 0;
      const cycleTimeHours = (parseFloat(part.cycleTime) || 0) / 60;
      const ratePerHour = parseFloat(part.process?.ratePerHour) || 0;
      const costPerUnit = partCost + cycleTimeHours * ratePerHour;

      const extraStock = Math.max(0, availableStock - minStock);
      const totalPartExtraCost = extraStock * costPerUnit;
      liveInventoryCost += totalPartExtraCost;

      if (availableStock < minStock) {
        outOfStockCount++;

        const partData = {
          partNumber: part.partNumber,
          availStock: availableStock,
          minStock: minStock,
          shortage: minStock - availableStock,
          leadTime: part.leadTime,
          costPerUnit: costPerUnit.toFixed(2),
          totalExtraCost: totalPartExtraCost.toFixed(2),
        };
        outOfStockParts.push(partData);
        partsDetails.push(partData);
      }
    });
    const completedStock = await prisma.stockOrderSchedule.findMany({
      where: {
        status: "completed",
        isDeleted: false,
        completed_date: { gte: startDate, lte: endDate },
      },
      include: {
        part: {
          select: {
            cost: true,
            cycleTime: true,
            process: { select: { ratePerHour: true } },
          },
        },
      },
    });

    let totalCOGS = 0;
    completedStock.forEach((order) => {
      const pCost = parseFloat(order.part?.cost || 0);
      const cTimeHours = (order.part?.cycleTime || 0) / 60;
      const rPerHour = order.part?.process?.ratePerHour || 0;
      const unitCost = pCost + cTimeHours * rPerHour;
      totalCOGS += unitCost * (order.completedQuantity || 0);
    });

    const turnoverRatio = totalCOGS > 0 ? liveInventoryCost / totalCOGS : 0;

    const getLocalKey = (date) => {
      const y = date.getFullYear();
      const m = String(date.getMonth() + 1).padStart(2, "0");
      const d = String(date.getDate()).padStart(2, "0");
      return `${y}-${m}-${d}`;
    };

    const map = {};
    historicalData.forEach((item) => {
      map[getLocalKey(item.date)] = item.totalInventoryCost;
    });
    map[getLocalKey(now)] = liveInventoryCost;

    const chartData = [];
    for (let i = 0; i < days; i++) {
      const d = new Date(startDate);
      d.setDate(startDate.getDate() + i);
      const key = getLocalKey(d);
      chartData.push({
        date: key,
        totalInventoryCost: map[key] || 0,
      });
    }

    res.json({
      chartData,
      parts: partsDetails,
      outOfStockParts,
      summary: {
        totalInventoryCost: parseFloat(liveInventoryCost.toFixed(2)),
        totalCOGS: parseFloat(totalCOGS.toFixed(2)),
        turnoverRatio: parseFloat(turnoverRatio.toFixed(2)),
        outOfStockCount: outOfStockCount,
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
        StockOrder: true,
        CustomOrder: { include: { product: true } },
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
      prisma.stockOrder.findMany({ where: { id: { in: stockOrderIds } } }),
      prisma.customOrder.findMany({
        where: { id: { in: customOrderIds } },
        include: { product: true },
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

      const nameParts = (orderRef.customerName || "N/A").trim().split(" ");
      const firstName = nameParts[0] || "N/A";
      const lastName = nameParts.slice(1).join(" ") || "";

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

      // A. Fulfilled (Completed)
      if (schStatus === "completed" || schStatus === "complete") {
        fulfilledOrders.push({
          ...commonData,
          Status: "Completed",
        });
      } else {
        openOrders.push({
          ...commonData,
          Status: sch.status || "In Progress",
        });
      }

      performance.push({
        Date: commonData.Date,
        "Order Number": orderRef.orderNumber,
        Customer: orderRef.customerName,
        Type: isStock ? "Stock" : "Custom",
        Scheduled: sch.scheduleQuantity || 0,
        "Total Completed": sch.completedQuantity || 0,
        "Total Scrap": sch.scrapQuantity || 0,
        Efficiency:
          orderRef.productQuantity > 0
            ? (
                (sch.completedQuantity / orderRef.productQuantity) *
                100
              ).toFixed(2) + "%"
            : "0%",
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
    console.error("API Error:", error);
    res
      .status(500)
      .json({ message: "Internal Server Error", error: error.message });
  }
};

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

    const sortedCandidates = candidates.sort((a, b) => {
      if (a.status !== b.status) return a.status === "progress" ? -1 : 1;
      return new Date(a.createdAt) - new Date(b.createdAt);
    });

    const nextJob = sortedCandidates[0];

    const incomingJobs = sortedCandidates.slice(1).map((job) => ({
      scheduleId: job.id,
      orderNumber:
        job.StockOrder?.orderNumber || job.CustomOrder?.orderNumber || "N/A",
      partNumber: job.part?.partNumber || job.customPart?.partNumber || "N/A",
      quantity: job.quantity,
      remainingQty: job.remainingQty,
      status: job.status,
      type: job.order_type,
    }));
    const [orderData, workInstructions, lastProduction, stats] =
      await Promise.all([
        nextJob.order_type === "StockOrder"
          ? prisma.stockOrder.findUnique({ where: { id: nextJob.order_id } })
          : prisma.customOrder.findUnique({ where: { id: nextJob.order_id } }),

        prisma.workInstruction.findFirst({
          where: {
            productId: nextJob.part_id || undefined,
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

        prisma.productionResponse.findFirst({
          where: { processId, stationUserId, isDeleted: false },
          orderBy: { cycleTimeStart: "desc" },
          include: { employeeInfo: true },
        }),

        prisma.stockOrderSchedule.aggregate({
          where: {
            order_id: nextJob.order_id,
            processId,
            isDeleted: false,
            completed_EmpId: stationUserId,
          },
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
    console.error("API Error:", error);
    return res
      .status(500)
      .json({ message: "Internal Server Error", error: error.message });
  }
};

const findAndStitchJob = async (scheduleId, partId, processId) => {
  const schedule = await prisma.stockOrderSchedule.findUnique({
    where: { id: scheduleId },
    include: {
      part: {
        select: { part_id: true, partNumber: true, partDescription: true },
      },
      customPart: { select: { id: true, partNumber: true } },
      process: { select: { processName: true, machineName: true } },
    },
  });

  if (!schedule) return null;

  const partNumber =
    schedule.part?.partNumber || schedule.customPart?.partNumber || "N/A";

  // Instructions
  let finalSteps = [];
  let instructionTitle = "";
  const master = await prisma.workInstruction.findFirst({
    where: { productId: partId, processId: processId, isDeleted: false },
    include: {
      steps: {
        where: { isDeleted: false },
        orderBy: { stepNumber: "asc" },
        include: { images: true, videos: true },
      },
    },
  });

  if (master) {
    finalSteps = master.steps;
    instructionTitle = master.instructionTitle;
  }

  const orderType = schedule.order_type;
  const isStock = orderType === "StockOrder";
  const orderData = await (
    isStock ? prisma.stockOrder : prisma.customOrder
  ).findUnique({
    where: { id: schedule.order_id },
    include: isStock ? {} : { product: { select: { partNumber: true } } },
  });

  return {
    ...schedule,
    partNumber,
    order: orderData,
    workInstructionSteps: finalSteps,
    instructionTitle,
  };
};

const getFinalStats = async (nextJob, processId, stationUserId) => {
  const [lastProd, stats] = await Promise.all([
    prisma.productionResponse.findFirst({
      where: { processId, stationUserId, isDeleted: false },
      orderBy: { cycleTimeStart: "desc" },
      include: { employeeInfo: true },
    }),
    prisma.stockOrderSchedule.aggregate({
      where: {
        order_id: nextJob.order_id,
        OR: [
          { part_id: nextJob.part_id },
          { customPartId: nextJob.customPartId },
        ],
        processId,
        isDeleted: false,
        completed_EmpId: stationUserId,
      },
      _sum: { completedQuantity: true, scrapQuantity: true },
    }),
  ]);

  return {
    ...nextJob,
    productionId: lastProd?.id || null,
    employeeInfo: lastProd?.employeeInfo || null,
    employeeCompletedQty: stats._sum.completedQuantity || 0,
    employeeScrapQty: stats._sum.scrapQuantity || 0,
  };
};
const checkTraningStatus = async (req, res) => {
  try {
    const { stationUserId, processId, productId } = req.query;

    const trainedRecord = await prisma.productionResponse.findFirst({
      where: {
        stationUserId: stationUserId,
        processId: processId,
        partId: productId, // Database mein partId column check hoga
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
      return res
        .status(400)
        .json({ message: "Invalid processId or stationUserId." });
    }

    const availableInstructions = await prisma.workInstruction.findMany({
      where: { processId: processId, isDeleted: false },
      select: { productId: true },
    });

    const trainableProductIds = availableInstructions.map((wi) => wi.productId);

    if (trainableProductIds.length === 0) {
      return res
        .status(404)
        .json({ message: "No training materials found for this process." });
    }
    const candidates = await prisma.stockOrderSchedule.findMany({
      where: {
        processId,
        isDeleted: false,
        status: { in: ["new", "progress"] },
        OR: [
          { part_id: { in: trainableProductIds } },
          { customPartId: { in: trainableProductIds } },
        ],
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
        .json({ message: "No jobs available for training." });
    }

    const partIdsInQueue = candidates.map((c) => c.part_id).filter(Boolean);
    const internalDeps = await prisma.productTree.findMany({
      where: {
        product_id: { in: partIdsInQueue },
        part_id: { in: partIdsInQueue },
        isDeleted: false,
      },
    });

    const parentToChildMap = {};
    internalDeps.forEach((dep) => {
      if (!parentToChildMap[dep.product_id])
        parentToChildMap[dep.product_id] = [];
      parentToChildMap[dep.product_id].push(dep.part_id);
    });

    const sorted = candidates.sort((a, b) => {
      if (a.status !== b.status) return a.status === "progress" ? -1 : 1;
      if (a.part_id && b.part_id) {
        if (parentToChildMap[a.part_id]?.includes(b.part_id)) return 1;
        if (parentToChildMap[b.part_id]?.includes(a.part_id)) return -1;
      }
      return new Date(a.createdAt) - new Date(b.createdAt);
    });

    const nextJob = sorted[0];
    let production = await prisma.productionResponse.findFirst({
      where: {
        processId: processId,
        stationUserId: stationUserId,
        partId: nextJob.part_id || nextJob.customPartId,
        isDeleted: false,
        traniningStatus: false,
      },
    });

    if (!production) {
      production = await prisma.productionResponse.create({
        data: {
          processId: processId,
          stationUserId: stationUserId,
          partId: nextJob.part_id || nextJob.customPartId,
          orderId: nextJob.stockOrderId || nextJob.order_id,
          cycleTimeStart: new Date(),
          traniningStatus: false,
          type: "training",
        },
      });
    }

    const workInstructions = await prisma.workInstruction.findFirst({
      where: {
        productId: nextJob.part_id || nextJob.customPartId,
        processId,
        isDeleted: false,
      },
      include: {
        steps: {
          where: { isDeleted: false },
          orderBy: { stepNumber: "asc" },
          include: { images: true, videos: true },
        },
      },
    });
    console.log("idid", production);

    return res.status(200).json({
      message: "Training Job Found",
      data: {
        ...nextJob,
        productionId: production.id,
        workInstructionSteps: workInstructions?.steps || [],
        instructionTitle: workInstructions?.instructionTitle || "",
        cycleTime: production.cycleTimeStart,
        incomingJobs: sorted.slice(1).map((j) => ({
          scheduleId: j.id,
          partNumber: j.part?.partNumber || j.customPart?.partNumber,
          quantity: j.quantity,
        })),
      },
    });
  } catch (error) {
    console.error("API Error:", error);
    return res.status(500).json({ message: "Internal Server Error" });
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
};
