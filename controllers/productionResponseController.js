const prisma = require("../config/prisma");
const {
  paginationQuery,
  pagination,
  fileUploadFunc,
} = require("../functions/common");

const crypto = require("crypto");
// const stationLogout = async (req, res) => {
//   try {
//     const { id } = req.params;
//     if (!id) {
//       return res.status(400).json({
//         message: "Production Response ID is required to logout.",
//       });
//     }
//     const updatedResponse = await prisma.productionResponse.update({
//       where: {
//         id: id,
//       },
//       data: {
//         cycleTimeEnd: new Date(),
//       },
//     });

//     if (!updatedResponse) {
//       return res.status(404).json({
//         message: "Login record not found. Cannot logout.",
//       });
//     }
//     const startTime = new Date(updatedResponse.cycleTimeStart);
//     const endTime = new Date(updatedResponse.cycleTimeEnd);
//     const durationInSeconds = (endTime - startTime) / 1000;
//     return res.status(200).json({
//       message: "You have successfully logged out.",
//       data: {
//         ...updatedResponse,
//         durationInSeconds: durationInSeconds.toFixed(2),
//       },
//     });
//   } catch (error) {
//     return res.status(500).send({
//       message: "Something went wrong during logout. Please try again later.",
//       error: error.message,
//     });
//   }
// };
// const stationLogout = async (req, res) => {
//   try {
//     const { id } = req.params;
//     // Worker se logout ke waqt quantity puchi jayegi
//     const { completedQuantity, scrapQuantity } = req.body;
//     console.log(" req.body;", req.body);
//     if (!id) {
//       return res.status(400).json({
//         message: "Production Response ID is required.",
//       });
//     }

//     // 1. Pehle record dhoondo taaki Start Time mil sake
//     const record = await prisma.productionResponse.findUnique({
//       where: { id: id },
//     });

//     if (!record) {
//       return res.status(404).json({ message: "Record not found." });
//     }

//     const startTime = new Date(record.cycleTimeStart);
//     const endTime = new Date(); // Abhi ka logout time

//     // 2. Update Database (Sirf existing fields mein data bharo)
//     const updatedResponse = await prisma.productionResponse.update({
//       where: { id: id },
//       data: {
//         cycleTimeEnd: endTime,
//         completedQuantity: Number(completedQuantity) || 0,
//         scrapQuantity: Number(scrapQuantity) || 0,
//         submittedDateTime: endTime,
//       },
//     });

//     // 3. Cycle Time Calculations (Manufacturing Logic)

//     // Total Time in Seconds
//     const totalDurationSeconds = Math.floor((endTime - startTime) / 1000);

//     // Total Units Produced (Manufacturing rule: Good + Scrap dono par machine chali hai)
//     const totalProduced =
//       (Number(completedQuantity) || 0) + (Number(scrapQuantity) || 0);

//     // Cycle Time Per Unit
//     // Agar 0 units hain toh 0, warna total time / total units
//     const cycleTimePerUnit =
//       totalProduced > 0
//         ? (totalDurationSeconds / totalProduced).toFixed(2)
//         : totalDurationSeconds;

//     // 4. Response mein calculations bhej dena (DB mein save nahi hongi)
//     return res.status(200).json({
//       message: "You have successfully logged out.",
//       data: {
//         ...updatedResponse,
//         calculations: {
//           totalTimeInSeconds: totalDurationSeconds,
//           totalUnitsProduced: totalProduced,
//           cycleTimePerUnit: `${cycleTimePerUnit} sec/unit`,
//           efficiencyStatus:
//             totalProduced > 0 ? "Calculated" : "No production recorded",
//           scrapRate:
//             totalProduced > 0
//               ? ((scrapQuantity / totalProduced) * 100).toFixed(2) + "%"
//               : "0%",
//         },
//       },
//     });
//   } catch (error) {
//     return res.status(500).send({
//       message: "Something went wrong during logout.",
//       error: error.message,
//     });
//   }
// };
// const stationLogout = async (req, res) => {
//   try {
//     const { id } = req.params;
//     if (!id)
//       return res
//         .status(400)
//         .json({ message: "Production Response ID required." });

//     await prisma.productionResponse.update({
//       where: { id: id },
//       data: {
//         cycleTimeEnd: null, // Aapne manga: logout ke condition me null jayegi
//         submittedDateTime: new Date(),
//       },
//     });

//     return res
//       .status(200)
//       .json({ message: "You have successfully logged out." });
//   } catch (error) {
//     return res.status(500).json({ message: error.message });
//   }
// };
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
        cycleTimeEnd: new Date(), // Ab null nahi, balki logout ke waqt ka time jayega
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
// const stationLogin = async (req, res) => {
//   try {
//     const { processId, stationUserId, type, partId } = req.body;
//     const findNextJob = (status) => {
//       return prisma.stockOrderSchedule.findFirst({
//         where: {
//           processId,
//           status,
//           isDeleted: false,
//         },
//         orderBy: {
//           createdAt: "asc",
//         },
//         include: {
//           StockOrder: { select: { orderNumber: true } },
//           CustomOrder: { select: { orderNumber: true } },
//           part: {
//             include: {
//               WorkInstruction: {
//                 include: {
//                   steps: true,
//                 },
//               },
//             },
//           },
//         },
//       });
//     };
//     let nextJob = await findNextJob("progress");
//     if (!nextJob) {
//       nextJob = await findNextJob("new");
//     }

//     const createData = {
//       process: { connect: { id: processId } },
//       employeeInfo: { connect: { id: stationUserId } },
//       type,
//       instructionId: nextJob?.part?.WorkInstruction?.[0]?.id || null,
//       scrap: null,
//       cycleTimeStart: new Date(),
//       cycleTimeEnd: null,
//       createdBy: stationUserId,
//       scheduleQuantity: nextJob?.scheduleQuantity,
//     };

//     if (partId) {
//       createData.PartNumber = { connect: { part_id: partId } };
//     }

//     if (nextJob?.order_type === "StockOrder") {
//       createData.StockOrder = { connect: { id: nextJob?.order_id } };
//     } else if (nextJob?.order_type === "CustomOrder") {
//       createData.CustomOrder = { connect: { id: nextJob?.order_id } };
//     }

//     const processLoginData = await prisma.productionResponse.create({
//       data: createData,
//     });

//     if (type === "training") {
//       const currentPartId = partId || nextJob?.part_id;

//       // 1. Check karein ki IDs valid hain ya nahi
//       if (!stationUserId || stationUserId === "undefined" || !currentPartId) {
//         console.log("Validation Failed:", { stationUserId, currentPartId });
//         // Agar data sahi nahi hai toh aage training check mat karo
//       } else {
//         // 2. Sirf tabhi 409 bhejien jab sach mein exact match mile
//         const existingTraining = await prisma.productionResponse.findFirst({
//           where: {
//             stationUserId: stationUserId,
//             processId: processId,
//             type: "training",
//             traniningStatus: true,
//           },
//         });
//         console.log("existingTrainingexistingTraining", existingTraining);
//         if (existingTraining) {
//           console.log("Conflict Found for User:", stationUserId);
//           return res.status(409).json({
//             message:
//               "You have already completed training for this process and part.",
//           });
//         }

//         // 3. Agar pehle training nahi ki, toh steps track karna shuru karein
//         if (nextJob?.part?.WorkInstruction?.[0]?.steps.length > 0) {
//           const trackingEntries = nextJob.part.WorkInstruction[0].steps.map(
//             (step, index) => ({
//               productionResponseId: processLoginData.id,
//               workInstructionStepId: step.id,
//               status: "pending",
//               stepStartTime: index === 0 ? new Date() : null,
//               stepEndTime: null,
//             }),
//           );

//           await prisma.productionStepTracking.createMany({
//             data: trackingEntries,
//           });
//         }
//       }
//     }

//     // --- FIX 3: Get the orderNumber from whichever relation is not null ---
//     const orderNumber =
//       nextJob?.StockOrder?.orderNumber ||
//       nextJob?.CustomOrder?.orderNumber ||
//       "N/A";

//     return res.status(200).json({
//       message: `You have successfully logged into station. Assigned to order: ${orderNumber}`,
//       data: processLoginData,
//     });
//   } catch (error) {
//     if (error.code === "P2025") {
//       return res.status(400).json({
//         message: "Failed to log in. The associated order could not be found.",
//         error: error.meta.cause,
//       });
//     }
//     return res.status(500).send({
//       message: "Something went wrong. Please try again later.",
//       error: error.message,
//     });
//   }
// };

// const stationLogin = async (req, res) => {
//   try {
//     const { processId, stationUserId, type, partId } = req.body;

//     // 1. Validation
//     if (!stationUserId || stationUserId === "undefined" || !processId) {
//       return res
//         .status(400)
//         .json({ message: "Invalid Station User or Process ID." });
//     }

//     // 2. Training Check
//     if (type === "training") {
//       const finishedTraining = await prisma.productionResponse.findFirst({
//         where: {
//           stationUserId: stationUserId,
//           processId: processId,
//           type: "training",
//           traniningStatus: true,
//         },
//       });

//       if (finishedTraining) {
//         return res.status(409);
//       }
//     }

//     // 3. Find Next Job
//     const nextJob = await findNextJobForProcess(processId); // Make sure this function returns the job object

//     // 4. Create Data Object (Prisma Connect Syntax)
//     const createData = {
//       process: { connect: { id: processId } },
//       employeeInfo: { connect: { id: stationUserId } },
//       type,
//       traniningStatus: false,
//       cycleTimeStart: new Date(),
//       order_type: nextJob?.order_type || "Training",
//       scheduleQuantity: nextJob?.scheduleQuantity || 0,
//     };

//     // --- RELATION CONNECTIONS (ID ki jagah connect use karein) ---

//     // Part Number connect karein
//     const currentPartId = partId || nextJob?.part_id || nextJob?.customPartId;
//     if (currentPartId) {
//       createData.PartNumber = { connect: { part_id: currentPartId } };
//     }

//     // Stock Order connect karein
//     if (nextJob?.order_type === "StockOrder" && nextJob?.order_id) {
//       createData.StockOrder = { connect: { id: nextJob.order_id } };
//     }
//     // Custom Order connect karein
//     else if (nextJob?.order_type === "CustomOrder" && nextJob?.order_id) {
//       createData.CustomOrder = { connect: { id: nextJob.order_id } };
//     }

//     // 5. Final Database Call
//     const processLoginData = await prisma.productionResponse.create({
//       data: createData,
//     });

//     return res.status(200).json({
//       message: "Login successful",
//       data: processLoginData,
//     });
//   } catch (error) {
//     console.error("Prisma Error Details:", error);
//     return res
//       .status(500)
//       .json({ message: "Database Error", error: error.message });
//   }
// };
const stationLogin = async (req, res) => {
  try {
    const { processId, stationUserId, type, partId } = req.body;

    if (!stationUserId || !processId) {
      return res
        .status(400)
        .json({ message: "Invalid Station User or Process ID." });
    }

    const nextJob = await findNextJobForProcess(processId);
    const currentPartId = partId || nextJob?.part_id || nextJob?.customPartId;

    // --- FRESH START LOGIC ---
    // Jab bhi worker login karega (Production ho ya Training),
    // cycleTimeStart humesha 'Abhi ka current time' hoga.
    // Isse frontend par timer humesha 0 se shuru dikhayega.

    const createData = {
      process: { connect: { id: processId } },
      employeeInfo: { connect: { id: stationUserId } },
      type,
      traniningStatus: false,
      cycleTimeStart: new Date(), // Reset to 0 (Current Time)
      order_type:
        nextJob?.order_type || (type === "training" ? "Training" : "N/A"),
      scheduleQuantity: nextJob?.scheduleQuantity || 0,
    };

    if (currentPartId) {
      createData.PartNumber = { connect: { part_id: currentPartId } };
    }

    if (nextJob?.order_type === "StockOrder" && nextJob?.order_id) {
      createData.StockOrder = { connect: { id: nextJob.order_id } };
    } else if (nextJob?.order_type === "CustomOrder" && nextJob?.order_id) {
      createData.CustomOrder = { connect: { id: nextJob.order_id } };
    }

    const processLoginData = await prisma.productionResponse.create({
      data: createData,
    });

    return res.status(200).json({
      message: "Login successful. Timer started at 0.",
      data: processLoginData,
    });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Database Error", error: error.message });
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
//     const { id: productionResponseId } = req.params;
//     const {
//       orderId,
//       partId,
//       employeeId,
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
//       const orderSchedule = await tx.stockOrderSchedule.findFirst({
//         where: {
//           order_id: orderId,
//           order_type: order_type,
//           isDeleted: false,
//           OR: [
//             { part_id: partId },
//             { customPartId: partId },
//             { partNumberPart_id: partId },
//             { customPart: { partNumber: partId } },
//           ],
//         },
//       });

//       if (!orderSchedule) throw new Error(`Schedule not found`);

//       const totalQty = orderSchedule.scheduleQuantity || 0;
//       const currentQty = orderSchedule.completedQuantity || 0;
//       if (currentQty >= totalQty) return { alreadyCompleted: true };

//       const newCompletedQty = currentQty + 1;
//       const updatedStatus =
//         newCompletedQty >= totalQty ? "completed" : "progress";

//       if (productionResponseId && productionResponseId !== "null") {
//         await tx.productionResponse.update({
//           where: { id: productionResponseId },
//           data: {
//             cycleTimeEnd: new Date(),
//             completedQuantity: 1,
//             submittedDateTime: new Date(),
//             stationUserId: employeeId,
//           },
//         });
//       } else {
//         await tx.productionResponse.create({
//           data: {
//             orderId: order_type.includes("Stock") ? orderId : null,
//             customOrderId: order_type.includes("Custom") ? orderId : null,
//             partId: orderSchedule.part_id,
//             processId: orderSchedule.processId || "",
//             completedQuantity: 1,
//             cycleTimeStart: new Date(Date.now() - 5 * 60000),
//             cycleTimeEnd: new Date(),
//             order_type: order_type,
//             stationUserId: employeeId,
//           },
//         });
//       }

//       if (
//         order_type.replace(/\s/g, "") === "StockOrder" &&
//         orderSchedule.part_id
//       ) {
//         await tx.partNumber.update({
//           where: { part_id: orderSchedule.part_id },
//           data: { availStock: { increment: 1 } },
//         });
//       }

//       await tx.stockOrderSchedule.update({
//         where: { id: orderSchedule.id },
//         data: {
//           completedQuantity: newCompletedQty,
//           status: updatedStatus,
//           remainingQty: Math.max(0, totalQty - newCompletedQty),
//           completed_date:
//             updatedStatus === "completed" ? new Date() : undefined,
//           completed_EmpId: employeeId,
//         },
//       });

//       return { status: updatedStatus };
//     });

//     return res.status(200).json(result);
//   } catch (error) {
//     res.status(500).json({ message: error.message });
//   }
// };

// const completeScheduleOrder = async (req, res) => {
//   try {
//     const { id: productionResponseId } = req.params;
//     const { orderId, partId, employeeId, order_type } = req.body;

//     if (!orderId || !order_type) {
//       return res
//         .status(400)
//         .json({ message: "orderId and order_type are required." });
//     }

//     const result = await prisma.$transaction(async (tx) => {
//       const orderSchedule = await tx.stockOrderSchedule.findFirst({
//         where: {
//           order_id: orderId,
//           order_type: order_type,
//           isDeleted: false,
//           OR: [{ part_id: partId }, { customPartId: partId }],
//         },
//       });

//       if (!orderSchedule) throw new Error(`Schedule not found`);

//       const totalQty = orderSchedule.scheduleQuantity || 0;
//       const currentQty = orderSchedule.completedQuantity || 0;
//       if (currentQty >= totalQty) return { alreadyCompleted: true };

//       const now = new Date();
//       let perPartCycleTimeSeconds = 0;

//       // --- NAYA LOGIC: Per Part Cycle Time Calculation ---
//       if (productionResponseId && productionResponseId !== "null") {
//         const existingResponse = await tx.productionResponse.findUnique({
//           where: { id: productionResponseId },
//         });

//         if (existingResponse) {
//           // Agar cycleTimeEnd null hai (matlab pehla part hai), toh cycleTimeStart use karein
//           const startTime = existingResponse.cycleTimeEnd
//             ? new Date(existingResponse.cycleTimeEnd)
//             : new Date(existingResponse.cycleTimeStart);

//           perPartCycleTimeSeconds = Math.floor((now - startTime) / 1000);

//           await tx.productionResponse.update({
//             where: { id: productionResponseId },
//             data: {
//               cycleTimeEnd: now, // Agle part ke liye timer yahin se shuru hoga
//               completedQuantity: { increment: 1 },
//               submittedDateTime: now,
//               stationUserId: employeeId,
//             },
//           });
//         }
//       } else {
//         // Agar productionResponseId nahi hai toh naya create karein (Existing functionality)
//         await tx.productionResponse.create({
//           data: {
//             orderId: order_type.includes("Stock") ? orderId : null,
//             customOrderId: order_type.includes("Custom") ? orderId : null,
//             partId: orderSchedule.part_id,
//             processId: orderSchedule.processId || "",
//             completedQuantity: 1,
//             cycleTimeStart: new Date(Date.now() - 5000), // Default 5 sec diff
//             cycleTimeEnd: now,
//             order_type: order_type,
//             stationUserId: employeeId,
//           },
//         });
//       }

//       // --- Rest of the existing logic ---
//       const newCompletedQty = currentQty + 1;
//       const updatedStatus =
//         newCompletedQty >= totalQty ? "completed" : "progress";

//       if (
//         order_type.replace(/\s/g, "") === "StockOrder" &&
//         orderSchedule.part_id
//       ) {
//         await tx.partNumber.update({
//           where: { part_id: orderSchedule.part_id },
//           data: { availStock: { increment: 1 } },
//         });
//       }

//       await tx.stockOrderSchedule.update({
//         where: { id: orderSchedule.id },
//         data: {
//           completedQuantity: newCompletedQty,
//           status: updatedStatus,
//           remainingQty: Math.max(0, totalQty - newCompletedQty),
//           completed_date: updatedStatus === "completed" ? now : undefined,
//           completed_EmpId: employeeId,
//         },
//       });

//       return {
//         status: updatedStatus,
//         lastPartTime: perPartCycleTimeSeconds, // Frontend ke liye cycle time info
//       };
//     });

//     return res.status(200).json(result);
//   } catch (error) {
//     res.status(500).json({ message: error.message });
//   }
// };
// const completeScheduleOrder = async (req, res) => {
//   try {
//     const { id: productionResponseId } = req.params; // Current active session ID
//     const { orderId, partId, employeeId, order_type } = req.body;
//     const now = new Date();

//     if (!orderId || !order_type) {
//       return res.status(400).json({ message: "orderId and order_type are required." });
//     }

//     const result = await prisma.$transaction(async (tx) => {
//       // 1. Current Session ko dhundo aur CLOSE karo
//       const currentSession = await tx.productionResponse.findUnique({
//         where: { id: productionResponseId },
//       });

//       if (!currentSession) throw new Error("Station session not found.");

//       await tx.productionResponse.update({
//         where: { id: productionResponseId },
//         data: {
//           completedQuantity: 1,
//           cycleTimeEnd: now, // Timer stops for this piece
//           submittedDateTime: now,
//           stationUserId: employeeId,
//         },
//       });

//       // 2. Schedule details nikaalo
//       const schedule = await tx.stockOrderSchedule.findFirst({
//         where: {
//           order_id: orderId,
//           order_type: order_type,
//           isDeleted: false,
//           OR: [{ part_id: partId }, { customPartId: partId }],
//         },
//       });

//       if (!schedule) throw new Error(`Schedule not found`);

//       const newCompletedQty = (schedule.completedQuantity || 0) + 1;
//       const totalQty = schedule.scheduleQuantity || 0;
//       const updatedStatus = newCompletedQty >= totalQty ? "completed" : "progress";

//       // 3. AGLE UNIT KE LIYE NAYA RECORD (Reset Timer to 0)
//       let nextProductionId = null;
//       if (updatedStatus !== "completed") {
//         const nextSession = await tx.productionResponse.create({
//           data: {
//             processId: currentSession.processId,
//             stationUserId: employeeId,
//             partId: partId,
//             orderId: currentSession.orderId,
//             customOrderId: currentSession.customOrderId,
//             order_type: order_type,
//             cycleTimeStart: now, // Naya timer yahin se shuru
//             cycleTimeEnd: null,   // Timer active
//             completedQuantity: 0,
//           },
//         });
//         nextProductionId = nextSession.id;
//       }

//       // 4. Update Overall Schedule
//       await tx.stockOrderSchedule.update({
//         where: { id: schedule.id },
//         data: {
//           completedQuantity: newCompletedQty,
//           status: updatedStatus,
//           remainingQty: Math.max(0, totalQty - newCompletedQty),
//           completed_date: updatedStatus === "completed" ? now : undefined,
//           completed_EmpId: employeeId,
//         },
//       });

//       // 5. Stock Update (If Stock Order)
//       if (order_type.replace(/\s/g, "") === "StockOrder" && schedule.part_id) {
//         await tx.partNumber.update({
//           where: { part_id: schedule.part_id },
//           data: { availStock: { increment: 1 } },
//         });
//       }

//       return {
//         status: updatedStatus,
//         newProductionId: nextProductionId // Frontend ko bhejein taaki timer reset ho
//       };
//     });

//     return res.status(200).json(result);
//   } catch (error) {
//     console.log('errorerror',error)
//     res.status(500).json({ message: error.message });
//   }
// };
// right code
// const completeScheduleOrder = async (req, res) => {
//   try {
//     const { id: productionResponseId } = req.params;
//     const { orderId, partId, employeeId, order_type } = req.body;

//     const result = await prisma.$transaction(
//       async (tx) => {
//         const schedule = await tx.stockOrderSchedule.findFirst({
//           where: {
//             order_id: orderId,
//             part_id: partId,
//             order_type,
//             isDeleted: false,
//           },
//         });
//         if (!schedule) throw new Error("Schedule not found");

//         const now = new Date();
//         const lastSession = await tx.productionResponse.update({
//           where: { id: productionResponseId },
//           data: {
//             cycleTimeEnd: now,
//             completedQuantity: 1,
//             submittedDateTime: now,
//             stationUserId: employeeId,
//           },
//         });
//         const nextSession = await tx.productionResponse.create({
//           data: {
//             processId: lastSession.processId,
//             stationUserId: employeeId,
//             partId: partId,
//             orderId: orderId,
//             order_type: order_type,
//             cycleTimeStart: now,
//             completedQuantity: 0,
//             scrap: false,
//           },
//         });

//         // 4. Overall Schedule Update
//         const newQty = (schedule.completedQuantity || 0) + 1;
//         const isFinished = newQty >= (schedule.scheduleQuantity || 0);

//         await tx.stockOrderSchedule.update({
//           where: { id: schedule.id },
//           data: {
//             completedQuantity: newQty,
//             remainingQty: Math.max(0, (schedule.remainingQty || 0) - 1),
//             status: isFinished ? "completed" : "progress",
//             completed_date: isFinished ? now : null,
//             completed_EmpId: employeeId,
//           },
//         });

//         return {
//           status: isFinished ? "completed" : "progress",
//           newProductionId: nextSession.id,
//           message: "Order completed successfully",
//         };
//       },
//       {
//         timeout: 10000, // 10 seconds timeout taaki transaction fail na ho
//       },
//     );

//     return res.status(200).json(result);
//   } catch (error) {
//     console.error("Complete Order Error:", error);
//     res.status(500).json({ message: error.message });
//   }
// };
const completeScheduleOrder = async (req, res) => {
  try {
    const { id: productionResponseId } = req.params;
    const { orderId, partId, employeeId, order_type } = req.body;

    const result = await prisma.$transaction(
      async (tx) => {
        // 1. Schedule find karein
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

        // 2. Production Response update karein (Last Session)
        const lastSession = await tx.productionResponse.update({
          where: { id: productionResponseId },
          data: {
            cycleTimeEnd: now,
            completedQuantity: 1,
            submittedDateTime: now,
            stationUserId: employeeId,
          },
        });

        // 3. Naya Production Response create karein (Next Session)
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

        // ============================================================
        // 4. STOCK LOGIC: PartId se table check karo ki ye kya hai
        // ============================================================
        if (partId) {
          const itemInDb = await tx.partNumber.findUnique({
            where: { part_id: partId },
            select: { type: true }, // Hum sirf 'type' check kar rahe hain
          });

          if (itemInDb) {
            const itemType = itemInDb.type.toLowerCase();

            if (itemType.includes("part")) {
              // Agar DB mein type 'part' hai toh stock KAM karein
              await tx.partNumber.update({
                where: { part_id: partId },
                data: { availStock: { decrement: 1 } },
              });
            } else if (itemType.includes("product")) {
              // Agar DB mein type 'product' hai toh stock BADHAYEIN
              await tx.partNumber.update({
                where: { part_id: partId },
                data: { availStock: { increment: 1 } },
              });
            }
          }
        }
        // ============================================================

        // 5. Overall Schedule Update
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
    console.error("Complete Order Error:", error);
    res.status(500).json({ message: error.message });
  }
};
// const scrapScheduleOrder = async (req, res) => {
//   try {
//     const { id } = req.params;
//     const { orderId, partId, employeeId, order_type } = req.body;

//     if (!order_type) {
//       return res.status(400).json({ message: "order_type is required." });
//     }

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

//     const currentRemainingQty = orderSchedule.remainingQty || 0;
//     const newRemainingQty = Math.max(0, currentRemainingQty - 1);
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
//         remainingQty: newRemainingQty,
//         part_id: partId,
//       },
//     });

//     // 3. Production Response Update (ID se update karein, updateMany ki filter risk na lein)
//     await prisma.productionResponse.update({
//       where: { id: id }, // Use direct ID
//       data: {
//         scrap: true,
//         quantity: false,
//         cycleTimeEnd: new Date(),
//         scrapQuantity: { increment: 1 },
//         partId: partId,
//         remainingQty: newRemainingQty,
//       },
//     });

//     // 4. Scrap Entry Create
//     await prisma.scapEntries.create({
//       data: {
//         partId: partId,
//         returnQuantity: 1,
//         scrapStatus: true,
//         employeeId: employeeId, // DB field name match karein
//         type: order_type,
//       },
//     });

//     return res
//       .status(200)
//       .json({ message: "This order has been added as scrap." });
//   } catch (error) {
//     res
//       .status(500)
//       .json({ message: "An error occurred.", error: error.message });
//   }
// };

// const scrapScheduleOrder = async (req, res) => {
//   try {
//     const { id } = req.params; // Production Response ID
//     const { orderId, partId, employeeId, order_type } = req.body;
//     const now = new Date();

//     const result = await prisma.$transaction(async (tx) => {
//       // 1. Current Session close as Scrap
//       const oldSession = await tx.productionResponse.update({
//         where: { id },
//         data: { cycleTimeEnd: now, scrap: true, scrapQuantity: 1 },
//       });

//       // 2. Start NEXT session timer from zero
//       const nextSession = await tx.productionResponse.create({
//         data: {
//           processId: oldSession.processId,
//           stationUserId: employeeId,
//           partId: partId,
//           orderId: oldSession.orderId,
//           customOrderId: oldSession.customOrderId,
//           order_type: order_type,
//           cycleTimeStart: now, // RESET TIMER
//           completedQuantity: 0,
//         },
//       });

//       // 3. Update Schedule
//       await tx.stockOrderSchedule.updateMany({
//         where: { order_id: orderId, part_id: partId },
//         data: { scrapQuantity: { increment: 1 } },
//       });

//       return { message: "Scrapped", newProductionId: nextSession.id };
//     });

//     return res.status(200).json(result);
//   } catch (error) {
//     res.status(500).json({ message: error.message });
//   }
// };
// const scrapScheduleOrder = async (req, res) => {
//   try {
//     const { id: productionResponseId } = req.params; // Current Station Session ID
//     const { orderId, partId, employeeId, order_type } = req.body;
//     const now = new Date();

//     const result = await prisma.$transaction(async (tx) => {
//       // 1. Current Session ko dhundo
//       const currentSession = await tx.productionResponse.findUnique({
//         where: { id: productionResponseId },
//       });

//       if (!currentSession) throw new Error("Station session not found.");

//       // 2. CLOSE current session (Is unit ka time yahan STOP ho gaya)
//       await tx.productionResponse.update({
//         where: { id: productionResponseId },
//         data: {
//           scrap: true,
//           scrapQuantity: 1, // Ek unit scrap hui
//           completedQuantity: 0,
//           cycleTimeEnd: now, // Timer yahan khatam
//           submittedDateTime: now,
//           stationUserId: employeeId,
//         },
//       });

//       // 3. Schedule Check & Remaining Qty Calculation
//       const schedule = await tx.stockOrderSchedule.findFirst({
//         where: {
//           order_id: orderId,
//           part_id: partId,
//           order_type,
//           isDeleted: false,
//         },
//       });

//       if (!schedule) throw new Error("Job Schedule not found.");

//       const newRemaining = Math.max(0, (schedule.remainingQty || 0) - 1);
//       const updatedStatus = newRemaining <= 0 ? "completed" : "progress";

//       // 4. Agle unit ke liye NAYA record (RESET TIMER TO ZERO)
//       let nextProductionId = null;
//       if (updatedStatus !== "completed") {
//         const nextSession = await tx.productionResponse.create({
//           data: {
//             processId: currentSession.processId,
//             stationUserId: employeeId,
//             partId: partId,
//             orderId: currentSession.orderId,
//             customOrderId: currentSession.customOrderId,
//             order_type: order_type,
//             cycleTimeStart: now, // NAYA TIMER YAHAN SE 0 SE SHURU HOGA
//             completedQuantity: 0,
//             scrapQuantity: 0,
//             scrap: false,
//           },
//         });
//         nextProductionId = nextSession.id;
//       }

//       // 5. Update Schedule Table
//       await tx.stockOrderSchedule.update({
//         where: { id: schedule.id },
//         data: {
//           scrapQuantity: { increment: 1 },
//           remainingQty: newRemaining,
//           status: updatedStatus,
//           completed_date: updatedStatus === "completed" ? now : undefined,
//         },
//       });

//       // 6. Scrap History Record (Fix Prisma relation error)
//       await tx.scapEntries.create({
//         data: {
//           returnQuantity: 1,
//           scrapStatus: true,
//           employeeId: employeeId,
//           type: order_type,
//           defectDesc: "Manual Scrap",
//           PartNumber: partId ? { connect: { part_id: partId } } : undefined,
//           process: currentSession.processId
//             ? { connect: { id: currentSession.processId } }
//             : undefined,
//           StockOrder: order_type.includes("Stock")
//             ? { connect: { id: orderId } }
//             : undefined,
//         },
//       });

//       return {
//         message: "Scrapped and timer reset",
//         newProductionId: nextProductionId,
//         isJobFinished: updatedStatus === "completed",
//       };
//     });

//     return res.status(200).json(result);
//   } catch (error) {
//     console.error("Scrap Logic Error:", error);
//     res.status(500).json({ message: error.message });
//   }
// };

// const scrapScheduleOrder = async (req, res) => {
//   try {
//     const { id: productionResponseId } = req.params;
//     const { orderId, partId, employeeId, order_type } = req.body;
//     const now = new Date();

//     const result = await prisma.$transaction(async (tx) => {
//       // 1. Current Session ko dhundo
//       const currentSession = await tx.productionResponse.findUnique({
//         where: { id: productionResponseId },
//       });

//       if (!currentSession) throw new Error("Station session not found.");

//       // 2. CLOSE current session (Is unit ko scrap mark karein)
//       await tx.productionResponse.update({
//         where: { id: productionResponseId },
//         data: {
//           scrap: true,
//           scrapQuantity: 1,
//           completedQuantity: 0,
//           cycleTimeEnd: now,
//           submittedDateTime: now,
//           stationUserId: employeeId,
//         },
//       });

//       // 3. Schedule Check
//       const schedule = await tx.stockOrderSchedule.findFirst({
//         where: {
//           order_id: orderId,
//           part_id: partId,
//           order_type,
//           isDeleted: false,
//         },
//       });

//       if (!schedule) throw new Error("Job Schedule not found.");

//       const newRemaining = Math.max(0, (schedule.remainingQty || 0) - 1);
//       const updatedStatus = newRemaining <= 0 ? "completed" : "progress";

//       // 4. Agle unit ke liye NAYA record shuru karein (Timer Reset)
//       let nextProductionId = null;
//       if (updatedStatus !== "completed") {
//         const nextSession = await tx.productionResponse.create({
//           data: {
//             processId: currentSession.processId,
//             stationUserId: employeeId,
//             partId: partId,
//             orderId: currentSession.orderId,
//             customOrderId: currentSession.customOrderId,
//             order_type: order_type,
//             cycleTimeStart: now,
//             completedQuantity: 0,
//             scrapQuantity: 0,
//             scrap: false,
//           },
//         });
//         nextProductionId = nextSession.id;
//       }

//       // 5. Update Schedule Table (Taaki Overview Dashboard par dikhe)
//       await tx.stockOrderSchedule.update({
//         where: { id: schedule.id },
//         data: {
//           scrapQuantity: { increment: 1 },
//           remainingQty: newRemaining,
//           status: updatedStatus,
//           completed_date: updatedStatus === "completed" ? now : undefined,
//         },
//       });

//       // NOTE: Step 6 (Scrap History Record) yahan se hata diya gaya hai
//       // taaki ye double entry (scrapEntries table mein) na kare.

//       return {
//         message: "Scrapped successfully in production response",
//         newProductionId: nextProductionId,
//         isJobFinished: updatedStatus === "completed",
//       };
//     });

//     return res.status(200).json(result);
//   } catch (error) {
//     console.error("Scrap Logic Error:", error);
//     res.status(500).json({ message: error.message });
//   }
// };

// const scrapScheduleOrder = async (req, res) => {
//   try {
//     const { id: productionResponseId } = req.params; // Current active session ID
//     const { orderId, partId, employeeId, order_type } = req.body;
//     const now = new Date();

//     if (!orderId || !partId || !employeeId) {
//       return res.status(400).json({ message: "Missing required data." });
//     }

//     const result = await prisma.$transaction(async (tx) => {
//       // 1. Pehle current session ko dhoondo
//       const currentSession = await tx.productionResponse.findUnique({
//         where: { id: productionResponseId },
//       });

//       if (!currentSession) throw new Error("Station session not found.");

//       // 2. IS UNIT KO CLOSE KAREIN (Timer End for this scrapped piece)
//       // Is unit ka cycleTimeEnd hum save karenge taaki is piece ki processing time record ho sake
//       await tx.productionResponse.update({
//         where: { id: productionResponseId },
//         data: {
//           scrap: true,
//           scrapQuantity: 1,
//           completedQuantity: 0,
//           cycleTimeEnd: now, // Is scrapped unit ka kaam yahan khatam
//           submittedDateTime: now,
//           stationUserId: employeeId,
//         },
//       });

//       // 3. Schedule Check aur Quantity Update
//       const schedule = await tx.stockOrderSchedule.findFirst({
//         where: {
//           order_id: orderId,
//           part_id: partId,
//           order_type,
//           isDeleted: false,
//         },
//       });

//       if (!schedule) throw new Error("Job Schedule not found.");

//       const newRemaining = Math.max(0, (schedule.remainingQty || 0) - 1);
//       const updatedStatus = newRemaining <= 0 ? "completed" : "progress";

//       // 4. AGLE UNIT KE LIYE NAYA RECORD (Timer Reset to 0)
//       // Naye record mein cycleTimeEnd = null rahega taaki Get API ise utha sake
//       let nextProductionId = null;
//       if (updatedStatus !== "completed") {
//         const nextSession = await tx.productionResponse.create({
//           data: {
//             processId: currentSession.processId,
//             stationUserId: employeeId,
//             partId: partId,
//             orderId: currentSession.orderId,
//             customOrderId: currentSession.customOrderId,
//             order_type: order_type,
//             cycleTimeStart: now, // Timer abhi se start (00:00)
//             cycleTimeEnd: null, // Timer ACTIVE rahega (NULL means running)
//             completedQuantity: 0,
//             scrapQuantity: 0,
//             scrap: false,
//           },
//         });
//         nextProductionId = nextSession.id;
//       }

//       // 5. Overall Schedule Table Update
//       await tx.stockOrderSchedule.update({
//         where: { id: schedule.id },
//         data: {
//           scrapQuantity: { increment: 1 },
//           remainingQty: newRemaining,
//           status: updatedStatus,
//           completed_date: updatedStatus === "completed" ? now : undefined,
//         },
//       });

//       // 6. Scrap Entries Table (Manual Log for reports)
//       await tx.scapEntries.create({
//         data: {
//           returnQuantity: 1,
//           scrapStatus: true,
//           employeeId: employeeId,
//           type: order_type,
//           defectDesc: "Production Scrap",
//           PartNumber: { connect: { part_id: partId } },
//           process: { connect: { id: currentSession.processId } },
//           // Agar StockOrder hai toh link karein
//           StockOrder: order_type.includes("Stock")
//             ? { connect: { id: orderId } }
//             : undefined,
//         },
//       });

//       return {
//         message: "Unit scrapped successfully and timer reset.",
//         newProductionId: nextProductionId,
//         isJobFinished: updatedStatus === "completed",
//       };
//     });

//     return res.status(200).json(result);
//   } catch (error) {
//     console.error("Scrap Logic Error:", error);
//     res.status(500).json({ message: error.message });
//   }
// };

// const scrapScheduleOrder = async (req, res) => {
//   try {
//     const { id: productionResponseId } = req.params; // Current active session ID
//     const { orderId, partId, employeeId, order_type } = req.body;
//     const now = new Date();

//     if (!orderId || !partId || !employeeId) {
//       return res.status(400).json({ message: "Missing required data." });
//     }

//     const result = await prisma.$transaction(async (tx) => {
//       // 1. Pehle current session ko dhoondo
//       const currentSession = await tx.productionResponse.findUnique({
//         where: { id: productionResponseId },
//       });

//       if (!currentSession) throw new Error("Station session not found.");

//       // 2. IS UNIT KO CLOSE KAREIN (Mark as Scrap and End Timer)
//       await tx.productionResponse.update({
//         where: { id: productionResponseId },
//         data: {
//           scrap: true,
//           scrapQuantity: 1,
//           completedQuantity: 0,
//           cycleTimeEnd: now, // Scrapped unit ka timer yahan stop
//           submittedDateTime: now,
//           stationUserId: employeeId,
//         },
//       });

//       // 3. Schedule Check aur Quantity Calculation
//       const schedule = await tx.stockOrderSchedule.findFirst({
//         where: {
//           order_id: orderId,
//           part_id: partId,
//           order_type,
//           isDeleted: false,
//         },
//       });

//       if (!schedule) throw new Error("Job Schedule not found.");

//       const newRemaining = Math.max(0, (schedule.remainingQty || 0) - 1);
//       const updatedStatus = newRemaining <= 0 ? "completed" : "progress";

//       // 4. AGLE UNIT KE LIYE NAYA RECORD (Timer Reset to 0)
//       let nextProductionId = null;
//       if (updatedStatus !== "completed") {
//         const nextSession = await tx.productionResponse.create({
//           data: {
//             processId: currentSession.processId,
//             stationUserId: employeeId,
//             partId: partId,
//             orderId: currentSession.orderId,
//             customOrderId: currentSession.customOrderId,
//             order_type: order_type,
//             cycleTimeStart: now, // Naya timer abhi se start
//             cycleTimeEnd: null, // Timer ACTIVE rahega
//             completedQuantity: 0,
//             scrapQuantity: 0,
//             scrap: false,
//           },
//         });
//         nextProductionId = nextSession.id;
//       }

//       // 5. Update Overall Schedule Table (Dashboard metrics ke liye)
//       await tx.stockOrderSchedule.update({
//         where: { id: schedule.id },
//         data: {
//           scrapQuantity: { increment: 1 },
//           remainingQty: newRemaining,
//           status: updatedStatus,
//           completed_date: updatedStatus === "completed" ? now : undefined,
//         },
//       });

//       // NO scapEntries.create - Is section ko hata diya gaya hai

//       return {
//         message: "Unit scrapped successfully and timer reset.",
//         newProductionId: nextProductionId,
//         isJobFinished: updatedStatus === "completed",
//       };
//     });

//     return res.status(200).json(result);
//   } catch (error) {
//     console.error("Scrap Logic Error:", error);
//     res.status(500).json({ message: error.message });
//   }
// };

// const scrapScheduleOrder = async (req, res) => {
//   try {
//     const { id: productionResponseId } = req.params;
//     const { orderId, partId, employeeId, order_type } = req.body;
//     const now = new Date();

//     if (!orderId || !partId || !employeeId) {
//       return res.status(400).json({ message: "Missing required data." });
//     }

//     const result = await prisma.$transaction(async (tx) => {
//       // 1. Schedule dhundo (Isse counts manage honge)
//       const schedule = await tx.stockOrderSchedule.findFirst({
//         where: {
//           order_id: orderId,
//           part_id: partId,
//           order_type,
//           isDeleted: false,
//         },
//       });
//       if (!schedule) throw new Error("Job Schedule not found.");

//       // 2. PRODUCTION RESPONSE UPDATE (The Fix)
//       // Hum updateMany use karenge taaki "Record Not Found" ka error na aaye aur code na ruke
//       let wasUpdated = false;
//       if (
//         productionResponseId &&
//         productionResponseId !== "null" &&
//         productionResponseId !== "undefined"
//       ) {
//         const updateCount = await tx.productionResponse.updateMany({
//           where: {
//             id: productionResponseId,
//             scrap: false, // Sirf unhe update karein jo abhi tak scrap nahi hue
//             completedQuantity: 0,
//           },
//           data: {
//             scrap: true,
//             scrapQuantity: 1,
//             cycleTimeEnd: now,
//             submittedDateTime: now,
//             stationUserId: employeeId,
//           },
//         });
//         if (updateCount.count > 0) wasUpdated = true;
//       }

//       // AGAR UPDATE NAHI HUA (ID galat thi ya pehle click ki ID thi), TOH EK NAYA RECORD BANAYEIN
//       // Isse aapka count kabhi mismatch nahi hoga (4 scrap = 4 records)
//       if (!wasUpdated) {
//         await tx.productionResponse.create({
//           data: {
//             processId: schedule.processId,
//             stationUserId: employeeId,
//             partId: partId,
//             orderId: orderId,
//             order_type: order_type,
//             cycleTimeStart: now,
//             cycleTimeEnd: now, // Turant close kyunki ye extra click tha
//             scrap: true,
//             scrapQuantity: 1,
//             completedQuantity: 0,
//             submittedDateTime: now,
//           },
//         });
//       }

//       // 3. Quantities Update
//       const newRemaining = Math.max(0, (schedule.remainingQty || 0) - 1);
//       const updatedStatus = newRemaining <= 0 ? "completed" : "progress";

//       await tx.stockOrderSchedule.update({
//         where: { id: schedule.id },
//         data: {
//           scrapQuantity: { increment: 1 },
//           remainingQty: newRemaining,
//           status: updatedStatus,
//           completed_date: updatedStatus === "completed" ? now : undefined,
//         },
//       });

//       // 4. NEXT UNIT TIMER RESET
//       let nextProductionId = null;
//       if (updatedStatus !== "completed") {
//         const nextSession = await tx.productionResponse.create({
//           data: {
//             processId: schedule.processId,
//             stationUserId: employeeId,
//             partId: partId,
//             orderId: orderId,
//             order_type: order_type,
//             cycleTimeStart: now,
//             completedQuantity: 0,
//             scrap: false,
//           },
//         });
//         nextProductionId = nextSession.id;
//       }

//       return {
//         message: "Scrap recorded successfully.",
//         newProductionId: nextProductionId,
//         isJobFinished: updatedStatus === "completed",
//       };
//     });

//     return res.status(200).json(result);
//   } catch (error) {
//     console.error("Scrap Logic Error:", error);
//     res.status(500).json({ message: error.message });
//   }
// };
// const scrapScheduleOrder = async (req, res) => {
//   try {
//     const { id: productionResponseId } = req.params;
//     const { orderId, partId, employeeId, order_type } = req.body;
//     const now = new Date();

//     const result = await prisma.$transaction(async (tx) => {
//       const schedule = await tx.stockOrderSchedule.findFirst({
//         where: {
//           order_id: orderId,
//           part_id: partId,
//           order_type,
//           isDeleted: false,
//         },
//       });
//       if (!schedule) throw new Error("Job Schedule not found.");

//       // 1. Purane unit ko SCRAP karke CLOSE karein (Timer Stop)
//       await tx.productionResponse.update({
//         where: { id: productionResponseId },
//         data: {
//           scrap: true,
//           scrapQuantity: 1,
//           cycleTimeEnd: now, // Timer yahan stop hua
//           submittedDateTime: now,
//           stationUserId: employeeId,
//         },
//       });

//       // 2. Schedule Quantities Update
//       const newRemaining = Math.max(0, (schedule.remainingQty || 0) - 1);
//       const updatedStatus = newRemaining <= 0 ? "completed" : "progress";

//       await tx.stockOrderSchedule.update({
//         where: { id: schedule.id },
//         data: {
//           scrapQuantity: { increment: 1 },
//           remainingQty: newRemaining,
//           status: updatedStatus,
//         },
//       });

//       // 3. NAYA record banayein AGLE unit ke liye (Timer Reset)
//       let nextProductionId = null;
//       if (updatedStatus !== "completed") {
//         const nextSession = await tx.productionResponse.create({
//           data: {
//             processId: schedule.processId,
//             stationUserId: employeeId,
//             partId: partId,
//             orderId: orderId,
//             order_type: order_type,
//             cycleTimeStart: new Date(), // NAYA START TIME
//             completedQuantity: 0,
//             scrap: false,
//           },
//         });
//         nextProductionId = nextSession.id;
//       }

//       return {
//         message: "Scrapped successfully",
//         newProductionId: nextProductionId,
//         isJobFinished: updatedStatus === "completed",
//       };
//     });

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
//       // 1. Current Part ki details nikalein
//       const currentSchedule = await tx.stockOrderSchedule.findFirst({
//         where: {
//           order_id: orderId,
//           part_id: partId,
//           order_type,
//           isDeleted: false,
//         },
//       });

//       if (!currentSchedule) throw new Error("Job Schedule not found.");

//       // 2. Purane record ko update (Scrap) karein
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

//       // 3. Current Schedule ki Qty update karein
//       const newRemaining = Math.max(0, (currentSchedule.remainingQty || 0) - 1);
//       const isCurrentPartDone = newRemaining <= 0;

//       const updatedCurrentSchedule = await tx.stockOrderSchedule.update({
//         where: { id: currentSchedule.id },
//         data: {
//           scrapQuantity: { increment: 1 },
//           remainingQty: newRemaining,
//           status: isCurrentPartDone ? "completed" : "progress",
//         },
//       });

//       let nextProductionId = null;
//       let nextPartInfo = null;

//       if (!isCurrentPartDone) {
//         // CASE A: Agar usi part ki quantity bachi hai, toh naya timer usi part ke liye
//         const nextSession = await tx.productionResponse.create({
//           data: {
//             processId: currentSchedule.processId,
//             stationUserId: employeeId,
//             partId: partId,
//             orderId: orderId,
//             order_type: order_type,
//             cycleTimeStart: new Date(),
//             completedQuantity: 0,
//             scrap: false,
//           },
//         });
//         nextProductionId = nextSession.id;
//       } else {
//         // CASE B: Agar current part khatam ho gaya, toh AGLE PART ko dhoondhein
//         const nextSchedule = await tx.stockOrderSchedule.findFirst({
//           where: {
//             order_id: orderId,
//             status: { in: ["pending", "progress"] }, // Jo abhi tak pura nahi hua
//             isDeleted: false,
//             NOT: { part_id: partId }, // Current part ko chhod kar
//           },
//           orderBy: { id: "asc" }, // Sequence ke hisaab se agla part
//         });

//         if (nextSchedule) {
//           // Agla part mil gaya! Uska timer start karein
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
//           nextPartInfo = {
//             partId: nextSchedule.part_id,
//             message: "Current part finished. Moving to next part.",
//           };
//         }
//       }

//       return {
//         message: isCurrentPartDone
//           ? "Part finished and scrapped."
//           : "Scrapped successfully",
//         newProductionId: nextProductionId,
//         nextPartInfo: nextPartInfo,
//         isOrderFinished: isCurrentPartDone && !nextPartInfo, // Pura order tab khatam jab agla part na mile
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

    const result = await prisma.$transaction(
      async (tx) => {
        // 1. Current Part ki details nikalein
        const currentSchedule = await tx.stockOrderSchedule.findFirst({
          where: {
            order_id: orderId,
            part_id: partId,
            order_type,
            isDeleted: false,
          },
        });

        if (!currentSchedule) throw new Error("Job Schedule not found.");

        // 2. Purane record ko update (Scrap) karein
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

        // ============================================================
        // 3. STOCK LOGIC: Scrap hone par stock update
        // ============================================================
        if (partId) {
          const itemInDb = await tx.partNumber.findUnique({
            where: { part_id: partId },
            select: { type: true },
          });

          if (itemInDb) {
            const itemType = itemInDb.type.toLowerCase();

            if (itemType.includes("part")) {
              // Agar PART scrap hua hai, toh stock se minus hoga (Kyunki wo kharab ho gaya)
              await tx.partNumber.update({
                where: { part_id: partId },
                data: { availStock: { decrement: 1 } },
              });
            }
            // Note: Agar PRODUCT scrap hua hai, toh hum increment NAHI karenge
            // kyunki wo finish hokar stock mein nahi gaya.
          }
        }
        // ============================================================

        // 4. Current Schedule ki Qty update karein
        const newRemaining = Math.max(
          0,
          (currentSchedule.remainingQty || 0) - 1,
        );
        const isCurrentPartDone = newRemaining <= 0;

        await tx.stockOrderSchedule.update({
          where: { id: currentSchedule.id },
          data: {
            scrapQuantity: { increment: 1 },
            remainingQty: newRemaining,
            status: isCurrentPartDone ? "completed" : "progress",
          },
        });

        let nextProductionId = null;
        let nextPartInfo = null;

        if (!isCurrentPartDone) {
          // CASE A: Agar usi part ki quantity bachi hai, toh naya timer start karein
          const nextSession = await tx.productionResponse.create({
            data: {
              processId: currentSchedule.processId,
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
        } else {
          // CASE B: Agar current part khatam ho gaya, toh AGLE PART ko dhoondhein
          const nextSchedule = await tx.stockOrderSchedule.findFirst({
            where: {
              order_id: orderId,
              status: { in: ["pending", "progress"] },
              isDeleted: false,
              NOT: { part_id: partId },
            },
            orderBy: { id: "asc" },
          });

          if (nextSchedule) {
            const nextPartSession = await tx.productionResponse.create({
              data: {
                processId: nextSchedule.processId,
                stationUserId: employeeId,
                partId: nextSchedule.part_id,
                orderId: orderId,
                order_type: order_type,
                cycleTimeStart: new Date(),
                completedQuantity: 0,
                scrap: false,
              },
            });
            nextProductionId = nextPartSession.id;
            nextPartInfo = {
              partId: nextSchedule.part_id,
              message: "Current part scrapped/finished. Moving to next part.",
            };
          }
        }

        return {
          message: isCurrentPartDone
            ? "Part finished and scrapped."
            : "Scrapped successfully",
          newProductionId: nextProductionId,
          nextPartInfo: nextPartInfo,
          isOrderFinished: isCurrentPartDone && !nextPartInfo,
        };
      },
      { timeout: 15000 },
    );

    return res.status(200).json(result);
  } catch (error) {
    console.error("Scrap Order Error:", error);
    res.status(500).json({ message: error.message });
  }
};
// const scrapScheduleOrder = async (req, res) => {
//   try {
//     const { id: productionResponseId } = req.params; // Jo timer abhi chal raha hai uski ID
//     const { orderId, partId, employeeId, order_type } = req.body;
//     const now = new Date();

//     const result = await prisma.$transaction(async (tx) => {
//       // 1. Schedule check karein
//       const schedule = await tx.stockOrderSchedule.findFirst({
//         where: {
//           order_id: orderId,
//           part_id: partId,
//           order_type,
//           isDeleted: false,
//         },
//       });
//       if (!schedule) throw new Error("Schedule not found");

//       // 2. PURANE SESSION KO CLOSE KAREIN (Timer Stop)
//       // Hum direct update use karenge (jaise complete mein kiya tha)
//       const lastSession = await tx.productionResponse.update({
//         where: { id: productionResponseId },
//         data: {
//           scrap: true,
//           scrapQuantity: 1,
//           completedQuantity: 0,
//           cycleTimeEnd: now, // Isse purana timer band hoga
//           submittedDateTime: now,
//           stationUserId: employeeId,
//         },
//       });

//       // 3. SCHEDULE COUNTS UPDATE
//       const newRemaining = Math.max(0, (schedule.remainingQty || 0) - 1);
//       const isFinished = newRemaining <= 0;

//       await tx.stockOrderSchedule.update({
//         where: { id: schedule.id },
//         data: {
//           scrapQuantity: { increment: 1 },
//           remainingQty: newRemaining,
//           status: isFinished ? "completed" : "progress",
//         },
//       });

//       // 4. NAYA SESSION START KAREIN (Timer Reset)
//       // Jab tak job finish nahi hoti, naya session banana zaroori hai
//       let nextSessionId = null;
//       if (!isFinished) {
//         const nextSession = await tx.productionResponse.create({
//           data: {
//             processId: lastSession.processId,
//             stationUserId: employeeId,
//             partId: partId,
//             orderId: orderId,
//             customOrderId: lastSession.customOrderId,
//             order_type: order_type,
//             cycleTimeStart: now, // Naya timer yahan se shuru (0 se)
//             completedQuantity: 0,
//             scrap: false,
//           },
//         });
//         nextSessionId = nextSession.id;
//       }

//       return {
//         status: isFinished ? "completed" : "progress",
//         newProductionId: nextSessionId, // Frontend isi ID se timer reset karega
//       };
//     });

//     return res.status(200).json(result);
//   } catch (error) {
//     console.log("Scrap Error:", error);
//     res.status(500).json({ message: error.message });
//   }
// };
// const scrapScheduleOrder = async (req, res) => {
//   try {
//     const { id: productionResponseId } = req.params;
//     const { orderId, partId, employeeId, order_type } = req.body;
//     const now = new Date();

//     const result = await prisma.$transaction(async (tx) => {
//       // 1. Current Session Close as Scrap
//       const currentSession = await tx.productionResponse.findUnique({
//         where: { id: productionResponseId },
//       });

//       if (!currentSession) throw new Error("Station session not found.");

//       await tx.productionResponse.update({
//         where: { id: productionResponseId },
//         data: {
//           scrap: true,
//           scrapQuantity: 1,
//           cycleTimeEnd: now, // Piece ka time yahan khatam
//           submittedDateTime: now,
//           stationUserId: employeeId,
//         },
//       });

//       // 2. Schedule Update
//       const schedule = await tx.stockOrderSchedule.findFirst({
//         where: { order_id: orderId, part_id: partId, order_type, isDeleted: false },
//       });

//       const newRemaining = Math.max(0, (schedule.remainingQty || 0) - 1);
//       const updatedStatus = newRemaining <= 0 ? "completed" : "progress";

//       // 3. Agle piece ke liye Naya Record
//       let nextProductionId = null;
//       if (updatedStatus !== "completed") {
//         const nextSession = await tx.productionResponse.create({
//           data: {
//             processId: currentSession.processId,
//             stationUserId: employeeId,
//             partId: partId,
//             orderId: orderId,
//             order_type: order_type,
//             cycleTimeStart: now, // RESET TIMER
//             cycleTimeEnd: null,
//             completedQuantity: 0,
//             scrap: false,
//           },
//         });
//         nextProductionId = nextSession.id;
//       }

//       await tx.stockOrderSchedule.update({
//         where: { id: schedule.id },
//         data: {
//           scrapQuantity: { increment: 1 },
//           remainingQty: newRemaining,
//           status: updatedStatus,
//           completed_date: updatedStatus === "completed" ? now : undefined,
//         },
//       });

//       return {
//         message: "Scrapped & Reset",
//         newProductionId: nextProductionId,
//         isJobFinished: updatedStatus === "completed"
//       };
//     });
//     return res.status(200).json(result);
//   } catch (error) {
//     res.status(500).json({ message: error.message });
//   }
// };
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

// const completeTraning = async (req, res) => {
//   try {
//     const { id } = req.params;
//     const now = new Date();

//     await prisma.$transaction(async (tx) => {
//       await tx.productionResponse.update({
//         where: { id: id },
//         data: {
//           traniningStatus: true,
//           cycleTimeEnd: now,
//           updatedAt: now,
//         },
//       });

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
//     });

//     return res
//       .status(200)
//       .json({ message: "Training and last step completed successfully." });
//   } catch (error) {
//     res.status(500).json({ message: error.message });
//   }
// };

// const completeTraning = async (req, res) => {
//   try {
//     const { id } = req.params; // productionResponseId
//     const now = new Date();

//     const checkRecord = await prisma.productionResponse.findUnique({
//       where: { id },
//     });
//     if (!checkRecord)
//       return res.status(404).json({ message: "Session not found" });

//     await prisma.$transaction([
//       // 1. Mark training as FINISHED
//       prisma.productionResponse.update({
//         where: { id: id },
//         data: {
//           traniningStatus: true, // Now it's officially completed
//           cycleTimeEnd: now,
//           updatedAt: now,
//         },
//       }),
//       // 2. Close any open steps
//       prisma.productionStepTracking.updateMany({
//         where: { productionResponseId: id, status: "in-progress" },
//         data: { stepEndTime: now, status: "completed" },
//       }),
//     ]);

//     return res
//       .status(200)
//       .json({ message: "Training completed successfully!" });
//   } catch (error) {
//     return res.status(500).json({ message: error.message });
//   }
// };
const completeTraning = async (req, res) => {
  try {
    const { id } = req.params; // productionResponseId
    const now = new Date();

    await prisma.$transaction([
      // 1. Training session ko officially close karein
      prisma.productionResponse.update({
        where: { id: id },
        data: {
          traniningStatus: true, // Certified mark karein
          cycleTimeEnd: now, // Timer ko yahan rok dein
          updatedAt: now,
        },
      }),
      // 2. Agar koi steps in-progress hain toh unhe bhi close karein
      prisma.productionStepTracking.updateMany({
        where: { productionResponseId: id, status: "in-progress" },
        data: { stepEndTime: now, status: "completed" },
      }),
    ]);

    return res.status(200).json({
      message:
        "Training completed! Your production timer will start from 0 when you log in for work.",
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
    console.log("errorerror", error);
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

// const getScrapEntryById = async (req, res) => {
//   try {
//     const { id } = req.params;

//     const entry = await prisma.scapEntries.findUnique({
//       where: { id },
//       include: {
//         PartNumber: {
//           select: {
//             part_id: true,
//             partNumber: true,
//           },
//         },
//         supplier: {
//           select: {
//             firstName: true,
//             lastName: true,
//           },
//         },
//       },
//     });

//     if (!entry) {
//       return res.status(404).json({ error: "Scrap entry not found" });
//     }

//     res.status(200).json({ data: entry });
//   } catch (error) {
//     res.status(500).json({ error: "Internal server error" });
//   }
// };
const getScrapEntryById = async (req, res) => {
  try {
    const { id } = req.params;

    const entry = await prisma.scapEntries.findUnique({
      where: { id },
      include: {
        // 1. Part details
        PartNumber: {
          select: {
            part_id: true,
            partNumber: true,
          },
        },
        // 2. Supplier details (for 'part' type entries)
        supplier: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            companyName: true,
          },
        },
        // 3. Customer details (for 'product' type entries) - NEW ADDITION
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

    // Response ko clean karne ke liye (Optionally combine names)
    const formattedData = {
      ...entry,
      customerName: entry.customers
        ? `${entry.customers.firstName} ${entry.customers.lastName}`.trim()
        : null,
    };

    res.status(200).json({ data: formattedData });
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

//     let whereCondition = { isDeleted: false };
//     let scrapWhereCondition = { isDeleted: false };

//     if (startDate && endDate) {
//       const start = new Date(new Date(startDate).setHours(0, 0, 0, 0));
//       const end = new Date(new Date(endDate).setHours(23, 59, 59, 999));
//       whereCondition.createdAt = { gte: start, lte: end };
//       scrapWhereCondition.createdAt = { gte: start, lte: end };
//     }

//     const rawData = await prisma.stockOrderSchedule.findMany({
//       where: whereCondition,
//       select: {
//         scrapQuantity: true,
//         scheduleQuantity: true,
//         createdAt: true,
//         process: true,
//         part: {
//           select: {
//             part_id: true,
//             partNumber: true,
//             partDescription: true,
//             process: {
//               select: { processName: true, machineName: true },
//             },
//           },
//         },
//       },
//     });
//     const aa = await prisma.scapEntries.findMany();
//     const scrapEntriesRecords = await prisma.scapEntries.findMany({
//       where: scrapWhereCondition,
//       include: {
//         PartNumber: {
//           select: {
//             process: true,
//             partNumber: true,
//             partDescription: true,
//           },
//         },
//         process: {
//           select: {
//             processName: true,
//             machineName: true,
//           },
//         },

//         supplier: { select: { firstName: true, lastName: true } },
//         customers: { select: { firstName: true, lastName: true } },
//       },
//     });
//     const mergedMap = new Map();
//     const supplierScrapDetails = [];
//     const customerScrapDetails = [];

//     const updateMap = (
//       id,
//       partInfo,
//       scrapQty,
//       scheduleQty,
//       date,
//       pName,
//       mName,
//     ) => {
//       if (!mergedMap.has(id)) {
//         mergedMap.set(id, {
//           partId: id,
//           partNumber: partInfo?.partNumber || "Unknown",
//           partDescription: partInfo?.partDescription || "",
//           processName: partInfo?.process?.processName || "",
//           machineName: partInfo?.process?.machineName || "",
//           scrapQuantity: Number(scrapQty) || 0,
//           scheduleQuantity: Number(scheduleQty) || 0,
//           latestDate: date,
//           isChild: false,
//         });
//       } else {
//         const existing = mergedMap.get(id);
//         existing.scrapQuantity += Number(scrapQty) || 0;
//         existing.scheduleQuantity += Number(scheduleQty) || 0;
//         if (date > existing.latestDate) existing.latestDate = date;
//         if (!existing.processName) existing.processName = pName || "";
//         if (!existing.machineName) existing.machineName = mName || "";
//       }
//     };

//     rawData.forEach((item) => {
//       if (item.part) {
//         updateMap(
//           item.part.part_id,
//           item.part,
//           item.scrapQuantity || 0,
//           item.scheduleQuantity || 0,
//           item.createdAt,
//           item.process?.processName,
//           item.process?.machineName,
//         );
//       }
//     });

//     scrapEntriesRecords.forEach((scrap) => {
//       const partInfo = scrap.PartNumber;
//       const key = scrap.partId || partInfo?.part_id;
//       const sQty =
//         Number(scrap.scrapQuantity) || Number(scrap.returnQuantity) || 0;

//       if (key) {
//         updateMap(key, partInfo, sQty, 0, scrap.createdAt);

//         if (scrap.supplierId || scrap.returnSupplierId) {
//           supplierScrapDetails.push({
//             partNumber: partInfo?.partNumber,
//             supplierName:
//               `${scrap.supplier?.firstName} ${scrap.supplier?.lastName}` ||
//               "N/A",
//             quantity: sQty,
//             defectDesc: scrap.defectDesc,
//             date: scrap.createdAt,
//             type: scrap.type || "Supplier Return",
//           });
//         }

//         if (scrap.customersId) {
//           customerScrapDetails.push({
//             partNumber: partInfo?.partNumber,
//             customerName:
//               `${scrap.customers?.firstName} ${scrap.customers?.lastName}` ||
//               "N/A",
//             quantity: sQty,
//             defectDesc: scrap.defectDesc,
//             date: scrap.createdAt,
//             type: scrap.type || "Customer Return",
//           });
//         }
//       }
//     });

//     const data = Array.from(mergedMap.values());
//     const filteredData = data.filter((item) => item.scrapQuantity > 0);
//     filteredData.sort((a, b) => b.scrapQuantity - a.scrapQuantity);

//     const totalScrapQty = filteredData.reduce(
//       (acc, item) => acc + item.scrapQuantity,
//       0,
//     );

//     return res.status(200).json({
//       success: true,
//       message: "Quality performance data retrieved successfully!",
//       totalScrapQty,
//       totalEntries: filteredData.length,
//       data: filteredData,
//       supplierScrapDetails,
//       customerScrapDetails,
//     });
//   } catch (error) {
//     return res.status(500).json({
//       success: false,
//       message: "Internal Server Error",
//       error: error.message,
//     });
//   }
// };
const qualityPerformance = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    // 1. Same Date Logic as Overview
    const start = startDate
      ? new Date(new Date(startDate).setHours(0, 0, 0, 0))
      : new Date(new Date().setHours(0, 0, 0, 0));
    const end = endDate
      ? new Date(new Date(endDate).setHours(23, 59, 59, 999))
      : new Date(new Date().setHours(23, 59, 59, 999));

    // 2. Use updatedAt to match Overview function
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
        where: whereCondition,
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

    // Common Helper for grouping
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

    // Process Stock Orders (Production Scrap)
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

    // Process Scrap Entries (Manual/Return Scrap)
    scrapEntriesRecords.forEach((scrap) => {
      const partInfo = scrap.PartNumber;
      const key = scrap.partId || partInfo?.part_id;

      // FIX: Sum both scrap and return instead of using OR (||)
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
// const costingApi = async (req, res) => {
//   try {
//     const { year, startDate, endDate } = req.query;

//     const whereClause = { status: "completed", isDeleted: false };
//     const scrapWhereClause = { isDeleted: false };
//     if (startDate || endDate) {
//       const start = startDate ? new Date(startDate) : null;
//       const end = endDate ? new Date(endDate) : null;
//       if (end) end.setHours(23, 59, 59, 999);

//       if (start || end) {
//         const dateRange = {};
//         if (start) dateRange.gte = start;
//         if (end) dateRange.lte = end;

//         whereClause.completed_date = dateRange;
//         scrapWhereClause.createdAt = dateRange;
//       }
//     } else if (year) {
//       const startOfYear = new Date(`${year}-01-01T00:00:00.000Z`);
//       const endOfYear = new Date(`${year}-12-31T23:59:59.999Z`);

//       whereClause.completed_date = { gte: startOfYear, lte: endOfYear };
//       scrapWhereClause.createdAt = { gte: startOfYear, lte: endOfYear };
//     }

//     const [completedStock, manualScrapEntries] = await Promise.all([
//       prisma.stockOrderSchedule.findMany({
//         where: whereClause,
//         include: {
//           part: {
//             select: {
//               cost: true,
//               cycleTime: true,
//               process: { select: { ratePerHour: true } },
//             },
//           },
//         },
//       }),
//       prisma.scapEntries.findMany({
//         where: scrapWhereClause,
//         include: { PartNumber: { select: { cost: true } } },
//       }),
//     ]);

//     const cogsData = {};
//     let totalScrapCost = 0;
//     let supplierReturn = 0;
//     let totalRangeCost = 0;
//     completedStock.forEach((order) => {
//       const date = new Date(order.completed_date || new Date());
//       const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
//       const partCost = parseFloat(order.part?.cost || 0);
//       const cycleTimeHours = (order.part?.cycleTime || 0) / 60;
//       const ratePerHour = order.part?.process?.ratePerHour || 0;
//       const unitCOGS = partCost + cycleTimeHours * ratePerHour;
//       const totalCOGS = unitCOGS * (order.completedQuantity || 0);
//       if (!cogsData[monthKey]) cogsData[monthKey] = 0;
//       cogsData[monthKey] += totalCOGS;
//       totalRangeCost += totalCOGS;
//       totalScrapCost += (order.scrapQuantity || 0) * partCost;
//       supplierReturn += (order.supplierReturnQuantity || 0) * partCost;
//     });

//     manualScrapEntries.forEach((entry) => {
//       const mPartCost = parseFloat(entry.PartNumber?.cost || 0);
//       const mQty = Number(entry.returnQuantity) || 0;
//       const entryTotalCost = mQty * mPartCost;

//       if (entry.supplierId || entry.type === "supplier") {
//         supplierReturn += entryTotalCost;
//       } else {
//         totalScrapCost += entryTotalCost;
//       }
//     });

//     res.json({
//       monthlyCOGS: cogsData,
//       totalYearCost: parseFloat(totalRangeCost.toFixed(2)),
//       scrapCost: parseFloat(totalScrapCost.toFixed(2)),
//       supplierReturn: parseFloat(supplierReturn.toFixed(2)),
//       totalCOGSWithScrap: parseFloat(
//         (totalRangeCost + totalScrapCost + supplierReturn).toFixed(2),
//       ),
//     });
//   } catch (error) {
//     res.status(500).json({
//       message: "Something went wrong. Please try again later.",
//       error: error.message,
//     });
//   }
// };

// const costingApi = async (req, res) => {
//   try {
//     const { year, startDate, endDate } = req.query;

//     // 1. Date range set karein
//     let start, end;
//     if (startDate || endDate) {
//       start = startDate ? new Date(startDate) : new Date();
//       end = endDate ? new Date(endDate) : new Date();
//       start.setHours(0, 0, 0, 0);
//       end.setHours(23, 59, 59, 999);
//     } else {
//       const currentYear = year || new Date().getFullYear();
//       start = new Date(`${currentYear}-01-01T00:00:00.000Z`);
//       end = new Date(`${currentYear}-12-31T23:59:59.999Z`);
//     }

//     // 2. Data fetch karein (ProductionResponse se actual production uthayein)
//     const [productionData, manualScrapEntries] = await Promise.all([
//       prisma.productionResponse.findMany({
//         where: {
//           isDeleted: false,
//           submittedDateTime: { gte: start, lte: end },
//         },
//         include: {
//           PartNumber: {
//             include: { process: true }, // Rate per hour ke liye
//           },
//         },
//       }),
//       prisma.scapEntries.findMany({
//         where: {
//           isDeleted: false,
//           createdAt: { gte: start, lte: end },
//         },
//         include: { PartNumber: true },
//       }),
//     ]);

//     const monthlyCOGS = {};
//     let totalRangeCOGS = 0;
//     let totalScrapCost = 0;
//     let totalSupplierReturn = 0;

//     // 3. ACTUAL PRODUCTION SE COGS NIKALEIN
//     productionData.forEach((item) => {
//       const date = new Date(item.submittedDateTime || item.createdAt);
//       const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;

//       const partCost = parseFloat(item.PartNumber?.cost || 0);
//       // Cycle Time logic: (Mins / 60) * RatePerHour
//       const cycleTime = parseFloat(item.PartNumber?.cycleTime || 0);
//       const ratePerHour = parseFloat(
//         item.PartNumber?.process?.ratePerHour || 0,
//       );
//       const laborCostPerUnit = (cycleTime / 60) * ratePerHour;

//       const unitCOGS = partCost + laborCostPerUnit;

//       // A. Completed Quantity Cost
//       const compQty = item.completedQuantity || 0;
//       if (compQty > 0) {
//         const itemTotalCOGS = unitCOGS * compQty;
//         monthlyCOGS[monthKey] = (monthlyCOGS[monthKey] || 0) + itemTotalCOGS;
//         totalRangeCOGS += itemTotalCOGS;
//       }

//       // B. Scrap Quantity Cost (Scanned wala)
//       const scrpQty = item.scrapQuantity || 0;
//       if (scrpQty > 0) {
//         totalScrapCost += scrpQty * partCost;
//       }
//     });

//     // 4. MANUAL SCRAP & SUPPLIER RETURNS
//     manualScrapEntries.forEach((entry) => {
//       const mPartCost = parseFloat(entry.PartNumber?.cost || 0);
//       const mQty = Number(entry.returnQuantity) || 0;
//       const entryTotalCost = mQty * mPartCost;

//       if (entry.supplierId || entry.type === "supplier") {
//         totalSupplierReturn += entryTotalCost;
//       } else {
//         totalScrapCost += entryTotalCost;
//       }
//     });

//     res.json({
//       success: true,
//       monthlyCOGS, // Graph ke liye
//       totalCOGS: parseFloat(totalRangeCOGS.toFixed(2)),
//       scrapCost: parseFloat(totalScrapCost.toFixed(2)),
//       supplierReturn: parseFloat(totalSupplierReturn.toFixed(2)),
//       grandTotal: parseFloat(
//         (totalRangeCOGS + totalScrapCost + totalSupplierReturn).toFixed(2),
//       ),
//     });
//   } catch (error) {
//     console.error("Costing API Error:", error);
//     res
//       .status(500)
//       .json({ message: "Error calculating costs", error: error.message });
//   }
// };

// const costingApi = async (req, res) => {
//   try {
//     const { year, startDate, endDate } = req.query;

//     // 1. Date range logic (Same as before)
//     let start, end;
//     if (startDate || endDate) {
//       start = startDate ? new Date(startDate) : new Date();
//       end = endDate ? new Date(endDate) : new Date();
//       start.setHours(0, 0, 0, 0);
//       end.setHours(23, 59, 59, 999);
//     } else {
//       const currentYear = year || new Date().getFullYear();
//       start = new Date(`${currentYear}-01-01T00:00:00.000Z`);
//       end = new Date(`${currentYear}-12-31T23:59:59.999Z`);
//     }

//     const [productionData, manualScrapEntries] = await Promise.all([
//       prisma.productionResponse.findMany({
//         where: {
//           isDeleted: false,
//           submittedDateTime: { gte: start, lte: end },
//         },
//         include: { PartNumber: { include: { process: true } } },
//       }),
//       prisma.scapEntries.findMany({
//         where: { isDeleted: false, createdAt: { gte: start, lte: end } },
//         include: { PartNumber: true },
//       }),
//     ]);

//     let totalRangeCOGS = 0;
//     let totalScrapCost = 0;
//     let totalSupplierReturn = 0;
//     const monthlyCOGS = {};

//     productionData.forEach((item) => {
//       const date = new Date(item.submittedDateTime || item.createdAt);
//       const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;

//       const partCost = parseFloat(item.PartNumber?.cost || 0);
//       const cycleTime = parseFloat(item.PartNumber?.cycleTime || 0); // Minutes
//       const ratePerHour = parseFloat(
//         item.PartNumber?.process?.ratePerHour || 0,
//       );
//       const compQty = item.completedQuantity || 0;
//       const scrpQty = item.scrapQuantity || 0;

//       // FORMULA 1: Total COGS = (Part Cost + (Cycle Time * Rate Per Hour)) * Qty Completed
//       // (Note: Cycle time minutes mein hai isliye /60 kiya hai hours ke liye)
//       const laborCostPerUnit = (cycleTime / 60) * ratePerHour;
//       const unitCOGS = partCost + laborCostPerUnit;
//       const itemTotalCOGS = unitCOGS * compQty;

//       if (compQty > 0) {
//         totalRangeCOGS += itemTotalCOGS;
//         monthlyCOGS[monthKey] = (monthlyCOGS[monthKey] || 0) + itemTotalCOGS;
//       }

//       // FORMULA 2: Scrap Cost = Part Cost * Scrap Quantity
//       if (scrpQty > 0) {
//         totalScrapCost += partCost * scrpQty;
//       }
//     });

//     // FORMULA 3: Supplier Return Cost = Part Cost * Supplier Return Qty (From manual entries)
//     manualScrapEntries.forEach((entry) => {
//       const partCost = parseFloat(entry.PartNumber?.cost || 0);
//       const qty = Number(entry.returnQuantity) || 0;
//       const cost = partCost * qty;

//       if (entry.supplierId || entry.type === "supplier") {
//         totalSupplierReturn += cost;
//       } else {
//         totalScrapCost += cost;
//       }
//     });

//     res.json({
//       success: true,
//       totalCOGS: parseFloat(totalRangeCOGS.toFixed(2)),
//       scrapCost: parseFloat(totalScrapCost.toFixed(2)),
//       supplierReturn: parseFloat(totalSupplierReturn.toFixed(2)),
//       monthlyCOGS, // Graph ke liye
//     });
//   } catch (error) {
//     res.status(500).json({ message: "Error", error: error.message });
//   }
// };

// const costingApi = async (req, res) => {
//   try {
//     const { startDate, endDate, year } = req.query;

//     // Filter Logic
//     const whereClause = { isDeleted: false };
//     if (startDate || endDate) {
//       const start = new Date(startDate);
//       const end = new Date(endDate);
//       end.setHours(23, 59, 59, 999);
//       // Projection ki tarah order_date par filter lagate hain taaki match kare
//       whereClause.order_date = { gte: start, lte: end };
//     } else if (year) {
//       const startOfYear = new Date(`${year}-01-01T00:00:00.000Z`);
//       const endOfYear = new Date(`${year}-12-31T23:59:59.999Z`);
//       whereClause.order_date = { gte: startOfYear, lte: endOfYear };
//     }

//     const [schedules, manualScrapEntries] = await Promise.all([
//       prisma.stockOrderSchedule.findMany({
//         where: whereClause,
//         include: {
//           part: true,
//           process: true,
//         },
//       }),
//       prisma.scapEntries.findMany({
//         where: { isDeleted: false, createdAt: whereClause.order_date },
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

//       const qtyFulfilled = order.completedQuantity || 0;
//       const partCost = parseFloat(order.part?.cost || 0);
//       const cycleTimeHours = (order.part?.cycleTime || 0) / 60;
//       const ratePerHour = order.process?.ratePerHour || 0;

//       // FORMULA (Same as revenueApi1)
//       const unitLabor = cycleTimeHours * ratePerHour;
//       const orderCOGS = (partCost + unitLabor) * qtyFulfilled;

//       if (qtyFulfilled > 0) {
//         totalCOGS += orderCOGS;
//         monthlyCOGS[monthKey] = (monthlyCOGS[monthKey] || 0) + orderCOGS;
//       }

//       // Scrap Cost Calculation
//       totalScrapCost += (order.scrapQuantity || 0) * partCost;
//     });

//     // Manual Scrap Entries
//     manualScrapEntries.forEach((entry) => {
//       const cost =
//         (Number(entry.returnQuantity) || 0) *
//         parseFloat(entry.PartNumber?.cost || 0);
//       if (entry.supplierId || entry.type === "supplier") {
//         supplierReturn += cost;
//       } else {
//         totalScrapCost += cost;
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

const costingApi = async (req, res) => {
  try {
    const { startDate, endDate, year } = req.query;

    // Filter Logic
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
        // Dashboard consistency ke liye createdAt range use kar rahe hain
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

      // Cycle time hours mein nikalne ke liye
      const cycleTimeHours = (parseFloat(order.part?.cycleTime) || 0) / 60;
      const ratePerHour = order.process?.ratePerHour || 0;

      // COGS Formula
      const unitLabor = cycleTimeHours * ratePerHour;
      const orderCOGS = (partCost + unitLabor) * qtyFulfilled;

      if (qtyFulfilled > 0) {
        totalCOGS += orderCOGS;
        monthlyCOGS[monthKey] = (monthlyCOGS[monthKey] || 0) + orderCOGS;
      }

      // Schedule Scrap Cost
      totalScrapCost += (order.scrapQuantity || 0) * partCost;
    });

    // --- MANUAL SCRAP ENTRIES (Dashboard Match Logic) ---
    manualScrapEntries.forEach((entry) => {
      const qty = Number(entry.returnQuantity) || 0;
      const partCost = parseFloat(entry.PartNumber?.cost || 0);
      const cost = qty * partCost;

      // FIXED: Dashboard ki tarah totalScrapCost mein sab kuch add karein (3.00 aayega)
      totalScrapCost += cost;

      // Supplier return sirf tracking ke liye alag variable mein rakhein
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
      // Ab ye Dashboard ke "scrapCost": 3.00 se match karega
      scrapCost: parseFloat(totalScrapCost.toFixed(2)),
      supplierReturn: parseFloat(supplierReturn.toFixed(2)),
      monthlyCOGS,
    });
  } catch (error) {
    console.error("Costing API Error:", error);
    res.status(500).json({ message: error.message });
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
//     const historicalData = await prisma.DailyInventory.findMany({
//       where: { date: { gte: startDate, lte: endDate } },
//       select: { date: true, totalInventoryCost: true },
//     });

//     const parts = await prisma.partNumber.findMany({
//       where: { isDeleted: false },
//       include: { process: { select: { ratePerHour: true } } },
//     });
//     let liveInventoryCost = 0;
//     const partsDetails = [];
//     const outOfStockParts = [];
//     let outOfStockCount = 0;

//     parts.forEach((part) => {
//       const availableStock = Number(part.availStock) || 0;
//       const minStock = Number(part.minStock) || 0;

//       const partCost = parseFloat(part.cost) || 0;
//       const cycleTimeHours = (parseFloat(part.cycleTime) || 0) / 60;
//       const ratePerHour = parseFloat(part.process?.ratePerHour) || 0;
//       const costPerUnit = partCost + cycleTimeHours * ratePerHour;

//       const extraStock = Math.max(0, availableStock - minStock);
//       const totalPartExtraCost = extraStock * costPerUnit;
//       liveInventoryCost += totalPartExtraCost;

//       if (availableStock < minStock) {
//         outOfStockCount++;

//         const partData = {
//           partNumber: part.partNumber,
//           availStock: availableStock,
//           minStock: minStock,
//           shortage: minStock - availableStock,
//           leadTime: part.leadTime,
//           costPerUnit: costPerUnit.toFixed(2),
//           totalExtraCost: totalPartExtraCost.toFixed(2),
//         };
//         outOfStockParts.push(partData);
//         partsDetails.push(partData);
//       }
//     });
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

//     const turnoverRatio = totalCOGS > 0 ? liveInventoryCost / totalCOGS : 0;

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

//     res.json({
//       chartData,
//       parts: partsDetails,
//       outOfStockParts,
//       summary: {
//         totalInventoryCost: parseFloat(liveInventoryCost.toFixed(2)),
//         totalCOGS: parseFloat(totalCOGS.toFixed(2)),
//         turnoverRatio: parseFloat(turnoverRatio.toFixed(2)),
//         outOfStockCount: outOfStockCount,
//       },
//     });
//   } catch (error) {
//     res.status(500).json({ message: error.message });
//   }
// };

// const getInventory = async (req, res) => {
//   try {
//     const { period = "daily" } = req.query;
//     const now = new Date();
//     const currentYear = now.getFullYear();
//     const currentMonth = now.getMonth();

//     const formatDate = (d) =>
//       `${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")}/${d.getFullYear()}`;

//     let startDate = new Date();
//     let loopCount = 7;

//     // 1. Period ke hisab se Range aur Loop Count set karein
//     if (period === "daily") {
//       // Is mahine ki 1st tarikh se last date tak
//       startDate = new Date(currentYear, currentMonth, 1);
//       const lastDay = new Date(currentYear, currentMonth + 1, 0).getDate();
//       loopCount = lastDay;
//     } else if (period === "weekly") {
//       loopCount = 14;
//       startDate.setDate(now.getDate() - 13);
//     } else if (period === "monthly") {
//       // Is saal ke Jan se Dec tak
//       startDate = new Date(currentYear, 0, 1);
//       loopCount = 12;
//     } else if (period === "yearly") {
//       // Pichle 5 saal (2022, 2023, 2024, 2025, 2026)
//       startDate = new Date(currentYear - 4, 0, 1);
//       loopCount = 5;
//     }
//     startDate.setHours(0, 0, 0, 0);

//     // 2. LIVE Inventory Calculation
//     const parts = await prisma.partNumber.findMany({
//       where: { isDeleted: false },
//       include: { process: { select: { ratePerHour: true } } },
//     });

//     let liveTotalInventoryCost = 0;
//     const outOfStockPartsList = []; // Sirf shortage wale parts ke liye

//     for (const part of parts) {
//       const avail = Number(part.availStock) || 0;
//       const min = Number(part.minStock) || 0;
//       const cost = parseFloat(part.cost) || 0;
//       const cycleTimeHrs = (parseFloat(part.cycleTime) || 0) / 60;
//       const rate = parseFloat(part.process?.ratePerHour) || 0;

//       // Part Cost = Supplier Cost + (CT * Hourly Rate)
//       const partCost = cost + cycleTimeHrs * rate;

//       // Total Asset Value = Part Cost * Avail Stock
//       const inventoryCost = partCost * avail;
//       liveTotalInventoryCost += inventoryCost;

//       // CONDITION: Only add to list if availStock < minStock
//       if (avail < min) {
//         outOfStockPartsList.push({
//           partNumber: part.partNumber,
//           availStock: avail,
//           minStock: min,
//           inventoryLevel: avail - min,
//           leadTime: part.leadTime || 0,
//           costPerUnit: partCost.toFixed(2),
//         });
//       }
//     }

//     // 3. Save Summary Snapshot for Trend Chart
//     const todayStr = now.toISOString().split("T")[0];
//     const todayDate = new Date(todayStr);

//     const existingSummary = await prisma.dailyInventory.findFirst({
//       where: { date: todayDate, partNumber: "SUMMARY_TOTAL" },
//     });

//     if (existingSummary) {
//       await prisma.dailyInventory.update({
//         where: { id: existingSummary.id },
//         data: { totalInventoryCost: liveTotalInventoryCost },
//       });
//     } else {
//       await prisma.dailyInventory.create({
//         data: {
//           id: crypto.randomUUID(),
//           date: todayDate,
//           partNumber: "SUMMARY_TOTAL",
//           totalInventoryCost: liveTotalInventoryCost,
//           inventoryCost: liveTotalInventoryCost,
//           costPerUnit: 0,
//           inventoryLevel: 0,
//         },
//       });
//     }

//     // 4. Aggregation Logic for Chart
//     const historicalData = await prisma.dailyInventory.findMany({
//       where: {
//         date: { gte: startDate, lte: new Date() },
//         partNumber: "SUMMARY_TOTAL",
//       },
//     });

//     const map = {};
//     historicalData.forEach((item) => {
//       const d = new Date(item.date);
//       let key;
//       if (period === "yearly") key = `Y-${d.getFullYear()}`;
//       else if (period === "monthly")
//         key = `M-${d.getMonth() + 1}-${d.getFullYear()}`;
//       else key = `D-${formatDate(d)}`;

//       map[key] = Number(item.totalInventoryCost);
//     });

//     // 5. Generate Response Chart Data
//     const chartData = [];
//     let tempDate = new Date(startDate);

//     for (let i = 0; i < loopCount; i++) {
//       let lookupKey;
//       let displayDate = formatDate(tempDate);

//       if (period === "yearly") {
//         lookupKey = `Y-${tempDate.getFullYear()}`;
//         displayDate = `${tempDate.getFullYear()}`;
//       } else if (period === "monthly") {
//         lookupKey = `M-${tempDate.getMonth() + 1}-${tempDate.getFullYear()}`;
//         // Monthly trend point hamesha mahine ki 1st tarikh dikhayega
//         const dMonth = new Date(tempDate.getFullYear(), tempDate.getMonth(), 1);
//         displayDate = formatDate(dMonth);
//       } else {
//         lookupKey = `D-${formatDate(tempDate)}`;
//         displayDate = formatDate(tempDate);
//       }

//       chartData.push({
//         date: displayDate,
//         rawDate: tempDate.toISOString(),
//         totalInventoryCost: map[lookupKey] || 0,
//       });

//       // Increment tempDate
//       if (period === "yearly") tempDate.setFullYear(tempDate.getFullYear() + 1);
//       else if (period === "monthly") tempDate.setMonth(tempDate.getMonth() + 1);
//       else tempDate.setDate(tempDate.getDate() + 1);
//     }

//     res.json({
//       chartData,
//       parts: outOfStockPartsList, // Filtered: Only shortage parts
//       summary: {
//         totalInventoryCost: liveTotalInventoryCost.toFixed(2),
//         outOfStockCount: outOfStockPartsList.length,
//       },
//     });
//   } catch (error) {
//     console.error(error);
//     res.status(500).json({ message: error.message });
//   }
// };

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

    // 1. Period Range Setup
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

    // 2. LIVE Inventory Calculation (DASHBOARD LOGIC)
    const allItems = await prisma.partNumber.findMany({
      where: { isDeleted: false },
      include: { process: { select: { ratePerHour: true } } },
    });

    let liveTotalInventoryCost = 0;
    let totalExtraItemsCount = 0;
    const shortagePartsList = []; // Wo parts jo min limit se kam hain

    for (const item of allItems) {
      const avail = Number(item.availStock) || 0;
      const min = Number(item.minStock) || 0;
      const extraStock = avail - min;

      // Unit Value = Cost + (CycleTime/60 * Rate)
      const unitValue =
        (parseFloat(item.cost) || 0) +
        ((parseFloat(item.cycleTime) || 0) / 60) *
          (item.process?.ratePerHour || 0);

      // --- DASHBOARD CALCULATION ---
      // Sirf wahi cost jodo jo extra stock hai
      if (extraStock > 0) {
        liveTotalInventoryCost += extraStock * unitValue;
        totalExtraItemsCount += extraStock;
      }

      // Shortage List (Inventory Page requirement)
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

    // 3. DAILY SNAPSHOT (Today's Data save/update)
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

    // 4. CHART DATA AGGREGATION
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

    // 5. RESPONSE CHART GENERATION
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
    console.error("Inventory API Error:", error);
    res.status(500).json({ message: error.message });
  }
};
// const customerRelation = async (req, res) => {
//   try {
//     let { startDate, endDate } = req.query;

//     const now = new Date();
//     const todayStr = now.toISOString().split("T")[0];

//     if (!startDate) startDate = todayStr;
//     if (!endDate) endDate = todayStr;

//     const start = new Date(startDate);
//     start.setHours(0, 0, 0, 0);

//     const end = new Date(endDate);
//     end.setHours(23, 59, 59, 999);

//     const allSchedules = await prisma.stockOrderSchedule.findMany({
//       where: {
//         updatedAt: { gte: start, lte: end },
//         isDeleted: false,
//       },
//       include: {
//         StockOrder: true,
//         CustomOrder: { include: { product: true } },
//       },
//     });
//     const stockOrderIds = [
//       ...new Set(
//         allSchedules
//           .filter((s) => s.order_type.toLowerCase().includes("stock"))
//           .map((s) => s.order_id),
//       ),
//     ];
//     const customOrderIds = [
//       ...new Set(
//         allSchedules
//           .filter((s) => !s.order_type.toLowerCase().includes("stock"))
//           .map((s) => s.order_id),
//       ),
//     ];
//     const [extraStockOrders, extraCustomOrders] = await Promise.all([
//       prisma.stockOrder.findMany({ where: { id: { in: stockOrderIds } } }),
//       prisma.customOrder.findMany({
//         where: { id: { in: customOrderIds } },
//         include: { product: true },
//       }),
//     ]);

//     const stockLookup = Object.fromEntries(
//       extraStockOrders.map((o) => [o.id, o]),
//     );
//     const customLookup = Object.fromEntries(
//       extraCustomOrders.map((o) => [o.id, o]),
//     );

//     const openOrders = [];
//     const fulfilledOrders = [];
//     const performance = [];

//     allSchedules.forEach((sch) => {
//       const schStatus = (sch.status || "").toLowerCase().trim();
//       const isStock = sch.order_type?.toLowerCase().includes("stock");

//       const orderRef = isStock
//         ? sch.StockOrder || stockLookup[sch.order_id]
//         : sch.CustomOrder || customLookup[sch.order_id];

//       if (!orderRef) return;

//       const nameParts = (orderRef.customerName || "N/A").trim().split(" ");
//       const firstName = nameParts[0] || "N/A";
//       const lastName = nameParts.slice(1).join(" ") || "";

//       const commonData = {
//         Date: sch.updatedAt.toISOString().split("T")[0],
//         "Order Number": orderRef.orderNumber || "N/A",
//         "Order Type": isStock ? "Stock" : "Custom",
//         "First Name": firstName,
//         "Last Name": lastName,
//         Product: isStock
//           ? orderRef.productDescription ||
//             orderRef.productNumber ||
//             "Stock Item"
//           : orderRef.partNumber ||
//             orderRef.product?.partDescription ||
//             "Custom Item",
//         "Order Quantity": orderRef.productQuantity || 0,
//         "Scheduled Quantity": sch.scheduleQuantity || 0,
//         "Completed Quantity": sch.completedQuantity || 0,
//       };

//       // A. Fulfilled (Completed)
//       if (schStatus === "completed" || schStatus === "complete") {
//         fulfilledOrders.push({
//           ...commonData,
//           Status: "Completed",
//         });
//       } else {
//         openOrders.push({
//           ...commonData,
//           Status: sch.status || "In Progress",
//         });
//       }

//       performance.push({
//         Date: commonData.Date,
//         "Order Number": orderRef.orderNumber,
//         Customer: orderRef.customerName,
//         Type: isStock ? "Stock" : "Custom",
//         Scheduled: sch.scheduleQuantity || 0,
//         "Total Completed": sch.completedQuantity || 0,
//         "Total Scrap": sch.scrapQuantity || 0,
//         Efficiency:
//           orderRef.productQuantity > 0
//             ? (
//                 (sch.completedQuantity / orderRef.productQuantity) *
//                 100
//               ).toFixed(2) + "%"
//             : "0%",
//       });
//     });
//     const scrapData = await prisma.scapEntries.findMany({
//       where: { scrapStatus: true, createdAt: { gte: start, lte: end } },
//       include: { PartNumber: { include: { supplier: true } }, supplier: true },
//     });

//     const formattedScrap = scrapData.map((entry) => ({
//       "Part Number": entry.PartNumber?.partNumber || "N/A",
//       "Return Quantity": entry.returnQuantity || 0,
//       "Supplier Company Name":
//         entry.supplier?.companyName ||
//         entry.PartNumber?.supplier?.companyName ||
//         "N/A",
//     }));

//     return res.status(200).json({
//       message: "Success",
//       data: {
//         openOrders,
//         fulfilledOrders,
//         performance,
//         scapEntries: formattedScrap,
//       },
//     });
//   } catch (error) {
//     res
//       .status(500)
//       .json({ message: "Internal Server Error", error: error.message });
//   }
// };

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

//     const sortedCandidates = candidates.sort((a, b) => {
//       if (a.status !== b.status) return a.status === "progress" ? -1 : 1;
//       return new Date(a.createdAt) - new Date(b.createdAt);
//     });

//     const nextJob = sortedCandidates[0];

//     const incomingJobs = sortedCandidates.slice(1).map((job) => ({
//       scheduleId: job.id,
//       orderNumber:
//         job.StockOrder?.orderNumber || job.CustomOrder?.orderNumber || "N/A",
//       partNumber: job.part?.partNumber || job.customPart?.partNumber || "N/A",
//       quantity: job.quantity,
//       remainingQty: job.remainingQty,
//       status: job.status,
//       type: job.order_type,
//     }));
//     const [orderData, workInstructions, lastProduction, stats] =
//       await Promise.all([
//         nextJob.order_type === "StockOrder"
//           ? prisma.stockOrder.findUnique({ where: { id: nextJob.order_id } })
//           : prisma.customOrder.findUnique({ where: { id: nextJob.order_id } }),

//         prisma.workInstruction.findFirst({
//           where: {
//             productId: nextJob.part_id || undefined,
//             processId: processId,
//             isDeleted: false,
//           },
//           include: {
//             steps: {
//               where: { isDeleted: false },
//               orderBy: { stepNumber: "asc" },
//               include: { images: true, videos: true },
//             },
//           },
//         }),

//         prisma.productionResponse.findFirst({
//           where: { processId, stationUserId, isDeleted: false },
//           orderBy: { cycleTimeStart: "desc" },
//           include: { employeeInfo: true },
//         }),

//         prisma.stockOrderSchedule.aggregate({
//           where: {
//             order_id: nextJob.order_id,
//             processId,
//             isDeleted: false,
//             completed_EmpId: stationUserId,
//           },
//           _sum: { completedQuantity: true, scrapQuantity: true },
//         }),
//       ]);

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
// const getScheduleProcessInformation = async (req, res) => {
//   try {
//     const { id: processId } = req.params;
//     const { stationUserId } = req.query;

//     if (!processId || !stationUserId) {
//       return res
//         .status(400)
//         .json({ message: "processId and stationUserId are required." });
//     }

//     // 1. Find Jobs assigned to this station
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

//     const sortedCandidates = candidates.sort((a, b) => {
//       if (a.status !== b.status) return a.status === "progress" ? -1 : 1;
//       return new Date(a.createdAt) - new Date(b.createdAt);
//     });

//     const nextJob = sortedCandidates[0];
//     const currentPartId = nextJob.part_id || nextJob.customPartId;

//     // 2. Incoming Jobs List
//     const incomingJobs = sortedCandidates.slice(1).map((job) => ({
//       scheduleId: job.id,
//       orderNumber:
//         job.StockOrder?.orderNumber || job.CustomOrder?.orderNumber || "N/A",
//       partNumber: job.part?.partNumber || job.customPart?.partNumber || "N/A",
//       quantity: job.quantity,
//       remainingQty: job.remainingQty,
//       status: job.status,
//       type: job.order_type,
//     }));

//     // --- CLIENT FIX: Timer Reset Logic ---
//     // Hum sirf wahi record dhoondhenge jo abhi active hai (completedQuantity 0 hai aur is part ke liye hai)
//     // const currentSession = await prisma.productionResponse.findFirst({
//     //   where: {
//     //     processId: processId,
//     //     stationUserId: stationUserId,
//     //     partId: currentPartId,
//     //     completedQuantity: 0, // Matlab yeh abhi chal raha hai
//     //     isDeleted: false,
//     //   },
//     //   orderBy: { cycleTimeStart: "desc" }, // Sabse naya
//     //   include: { employeeInfo: true },
//     // });

//     // // Agar session nahi milta (man lo refresh kiya aur purana wala 1 ho chuka hai),
//     // // toh hum last created session uthayenge reset timer ke saath
//     // const lastProduction =
//     //   currentSession ||
//     //   (await prisma.productionResponse.findFirst({
//     //     where: { processId, stationUserId, isDeleted: false },
//     //     orderBy: { cycleTimeStart: "desc" },
//     //     include: { employeeInfo: true },
//     //   }));
//     // --- CLIENT FIX: Timer Reset Logic (Corrected) ---
//     // Hum sirf wahi record dhoondhenge jo abhi ACTIVE hai (Timer chal raha hai)
//     const currentSession = await prisma.productionResponse.findFirst({
//       where: {
//         processId: processId,
//         stationUserId: stationUserId,
//         partId: currentPartId,
//         orderId: nextJob.order_id, // Match current order
//         isDeleted: false,
//         completedQuantity: 0,
//         scrap: false, // Scrapped records ko ignore karein
//         cycleTimeEnd: null, // <--- Isse confirm hoga ki timer reset wala record hi uthega
//       },
//       orderBy: { cycleTimeStart: "desc" },
//       include: { employeeInfo: true },
//     });

//     // Agar active session nahi milta (pehli baar login ya session miss),
//     // toh purana wala backup lein taaki "undefined" na aaye
//     const lastProduction =
//       currentSession ||
//       (await prisma.productionResponse.findFirst({
//         where: {
//           processId,
//           stationUserId,
//           partId: currentPartId,
//           orderId: nextJob.order_id,
//           isDeleted: false,
//         },
//         orderBy: { cycleTimeStart: "desc" },
//         include: { employeeInfo: true },
//       }));
//     // 3. Order, Stats and Instructions fetch karein
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
//         where: {
//           order_id: nextJob.order_id,
//           processId,
//           isDeleted: false,
//           completed_EmpId: stationUserId,
//         },
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
//         // YAHAN FIX HAI: cycleTime hamesha wahi jayega jo current active piece ka start time hai
//         cycleTime: lastProduction?.cycleTimeStart || null,
//       },
//     });
//   } catch (error) {
//     return res
//       .status(500)
//       .json({ message: "Internal Server Error", error: error.message });
//   }
// };
// const getScheduleProcessInformation = async (req, res) => {
//   try {
//     const { id: processId } = req.params;
//     const { stationUserId } = req.query;

//     if (!processId || !stationUserId) {
//       return res
//         .status(400)
//         .json({ message: "processId and stationUserId are required." });
//     }

//     // 1. Saare potential jobs uthao
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

//     // --- PARENT BEFORE CHILD SORTING ---
//     const partIds = candidates.map((c) => c.part_id).filter(Boolean);
//     const relations = await prisma.productTree.findMany({
//       where: {
//         product_id: { in: partIds },
//         part_id: { in: partIds },
//         isDeleted: false,
//       },
//     });

//     const sortedCandidates = candidates.sort((a, b) => {
//       if (a.status !== b.status) return a.status === "progress" ? -1 : 1;
//       const isAParentOfB = relations.some(
//         (r) => r.product_id === a.part_id && r.part_id === b.part_id,
//       );
//       if (isAParentOfB) return -1;
//       const isBParentOfA = relations.some(
//         (r) => r.product_id === b.part_id && r.part_id === a.part_id,
//       );
//       if (isBParentOfA) return 1;
//       return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
//     });

//     const nextJob = sortedCandidates[0];
//     const currentPartId = nextJob.part_id || nextJob.customPartId;

//     // --- UPCOMING JOBS LIST ---
//     const incomingJobs = sortedCandidates.slice(1).map((job) => ({
//       scheduleId: job.id,
//       orderNumber:
//         job.StockOrder?.orderNumber || job.CustomOrder?.orderNumber || "N/A",
//       partNumber: job.part?.partNumber || job.customPart?.partNumber || "N/A",
//       quantity: job.quantity,
//       remainingQty: job.remainingQty,
//       status: job.status,
//       type: job.order_type,
//       scheudleDate: job.order_date,
//     }));

//     // --- TIMER RESET LOGIC (Restore) ---
//     // Hum sirf wahi record dhoondhenge jo ACTIVE hai (completedQuantity 0)
//     // const currentSession = await prisma.productionResponse.findFirst({
//     //   where: {
//     //     processId: processId,
//     //     stationUserId: stationUserId,
//     //     partId: currentPartId,
//     //     orderId: nextJob.order_id,
//     //     completedQuantity: 0, // <--- TIMER RESET CONDITION
//     //     cycleTimeEnd: null,
//     //     isDeleted: false,
//     //   },
//     //   orderBy: { createdAt: "desc" },
//     //   include: { employeeInfo: true },
//     // });
// const currentSession = await prisma.productionResponse.findFirst({
//   where: {
//     processId: processId,
//     stationUserId: stationUserId,
//     partId: currentPartId,
//     orderId: nextJob.order_id,
//     completedQuantity: 0, // <--- MUST BE 0
//     scrap: false,         // <--- MUST BE FALSE
//     cycleTimeEnd: null,   // <--- MUST BE NULL
//     isDeleted: false,
//   },
//   orderBy: { createdAt: "desc" },
//   include: { employeeInfo: true },
// });

// // Response mein cycleTime bhejein
// // frontend par: new Date(cycleTime) se timer chalega
// const timerStart = currentSession?.cycleTimeStart || null;
// const productionId = currentSession?.id || null;
//     const lastProduction =
//       currentSession ||
//       (await prisma.productionResponse.findFirst({
//         where: { processId, stationUserId, isDeleted: false },
//         orderBy: { createdAt: "desc" },
//         include: { employeeInfo: true },
//       }));

//     // 3. Stats & Instructions
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
//         where: {
//           order_id: nextJob.order_id,
//           processId,
//           isDeleted: false,
//           completed_EmpId: stationUserId,
//         },
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
//         cycleTime: lastProduction?.cycleTimeStart || null, // Reset Timer yahan se hoga
//       },
//     });
//   } catch (error) {
//     return res
//       .status(500)
//       .json({ message: "Internal Server Error", error: error.message });
//   }
// };

// const getScheduleProcessInformation = async (req, res) => {
//   try {
//     const { id: processId } = req.params;
//     const { stationUserId } = req.query;

//     if (!processId || !stationUserId) {
//       return res.status(400).json({ message: "processId and stationUserId are required." });
//     }

//     // 1. Saare potential jobs uthao
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
//       return res.status(404).json({ message: "No jobs assigned to this station." });
//     }

//     // --- SORTING LOGIC ---
//     const partIds = candidates.map((c) => c.part_id).filter(Boolean);
//     const relations = await prisma.productTree.findMany({
//       where: { product_id: { in: partIds }, part_id: { in: partIds }, isDeleted: false },
//     });

//     const sortedCandidates = candidates.sort((a, b) => {
//       if (a.status !== b.status) return a.status === "progress" ? -1 : 1;
//       const isAParentOfB = relations.some(r => r.product_id === a.part_id && r.part_id === b.part_id);
//       if (isAParentOfB) return -1;
//       const isBParentOfA = relations.some(r => r.product_id === b.part_id && r.part_id === a.part_id);
//       if (isBParentOfA) return 1;
//       return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
//     });

//     const nextJob = sortedCandidates[0];
//     const currentPartId = nextJob.part_id || nextJob.customPartId;

//     // --- UPCOMING JOBS LIST (Properly Mapped) ---
//     const incomingJobs = sortedCandidates.slice(1).map((job) => ({
//       scheduleId: job.id,
//       orderNumber: job.StockOrder?.orderNumber || job.CustomOrder?.orderNumber || "N/A",
//       partNumber: job.part?.partNumber || job.customPart?.partNumber || "N/A",
//       quantity: job.scheduleQuantity,
//       remainingQty: job.remainingQty,
//       status: job.status,
//       type: job.order_type,
//       scheduleDate: job.order_date || job.createdAt,
//     }));

//     // --- CURRENT SESSION & TIMER RESET ---
//     let currentSession = await prisma.productionResponse.findFirst({
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
//       include: { employeeInfo: true }, // Employee details yahan se aayengi
//     });

//     // Agar session nahi hai, to ek backup check (last record)
//     if (!currentSession) {
//         currentSession = await prisma.productionResponse.findFirst({
//             where: { processId, stationUserId, isDeleted: false },
//             orderBy: { createdAt: "desc" },
//             include: { employeeInfo: true },
//         });
//     }

//     // 3. Stats & Instructions
//     const [orderData, workInstructions, stats] = await Promise.all([
//       nextJob.order_type === "StockOrder"
//         ? prisma.stockOrder.findUnique({ where: { id: nextJob.order_id } })
//         : prisma.customOrder.findUnique({ where: { id: nextJob.order_id } }),
//       prisma.workInstruction.findFirst({
//         where: { productId: currentPartId || undefined, processId: processId, isDeleted: false },
//         include: {
//           steps: {
//             where: { isDeleted: false },
//             orderBy: { stepNumber: "asc" },
//             include: { images: true, videos: true },
//           },
//         },
//       }),
//       // Stats for the current job and process
//       prisma.stockOrderSchedule.aggregate({
//         where: {
//           order_id: nextJob.order_id,
//           processId: processId,
//           part_id: nextJob.part_id,
//           isDeleted: false,
//         },
//         _sum: { completedQuantity: true, scrapQuantity: true },
//       }),
//     ]);

//     // Response Object
//     return res.status(200).json({
//       message: "Job Found",
//       data: {
//         ...nextJob,
//         processName: nextJob.process?.processName || "N/A",
//         partNumber: nextJob.part?.partNumber || nextJob.customPart?.partNumber || "N/A",
//         order: orderData,
//         workInstructionSteps: workInstructions?.steps || [],
//         instructionTitle: workInstructions?.instructionTitle || "No Instructions Found",

//         // --- YEAH KEY DETAILS HAIN JO MISSING THI ---
//         productionId: currentSession?.id || null,
//         employeeInfo: currentSession?.employeeInfo || null, // firstName, lastName yahan hai
//         employeeCompletedQty: stats._sum.completedQuantity || 0,
//         employeeScrapQty: stats._sum.scrapQuantity || 0,
//         cycleTime: currentSession?.cycleTimeStart || null, // Timer reset ke liye
//         incomingJobs: incomingJobs,
//       },
//     });
//   } catch (error) {
//     console.error("API Error:", error);
//     return res.status(500).json({ message: "Internal Server Error", error: error.message });
//   }
// };
// const customerRelation = async (req, res) => {
//   try {
//     let { startDate, endDate } = req.query;

//     const now = new Date();
//     const todayStr = now.toISOString().split("T")[0];

//     if (!startDate) startDate = todayStr;
//     if (!endDate) endDate = todayStr;

//     const start = new Date(startDate);
//     start.setHours(0, 0, 0, 0);

//     const end = new Date(endDate);
//     end.setHours(23, 59, 59, 999);

//     const allSchedules = await prisma.stockOrderSchedule.findMany({
//       where: {
//         updatedAt: { gte: start, lte: end },
//         isDeleted: false,
//       },
//       include: {
//         StockOrder: true,
//         CustomOrder: { include: { product: true } },
//       },
//     });

//     const stockOrderIds = [
//       ...new Set(
//         allSchedules
//           .filter((s) => s.order_type.toLowerCase().includes("stock"))
//           .map((s) => s.order_id),
//       ),
//     ];
//     const customOrderIds = [
//       ...new Set(
//         allSchedules
//           .filter((s) => !s.order_type.toLowerCase().includes("stock"))
//           .map((s) => s.order_id),
//       ),
//     ];

//     const [extraStockOrders, extraCustomOrders] = await Promise.all([
//       prisma.stockOrder.findMany({ where: { id: { in: stockOrderIds } } }),
//       prisma.customOrder.findMany({
//         where: { id: { in: customOrderIds } },
//         include: { product: true },
//       }),
//     ]);

//     const stockLookup = Object.fromEntries(
//       extraStockOrders.map((o) => [o.id, o]),
//     );
//     const customLookup = Object.fromEntries(
//       extraCustomOrders.map((o) => [o.id, o]),
//     );

//     const openOrders = [];
//     const fulfilledOrders = [];
//     const performance = [];

//     allSchedules.forEach((sch) => {
//       const schStatus = (sch.status || "").toLowerCase().trim();
//       const isStock = sch.order_type?.toLowerCase().includes("stock");

//       const orderRef = isStock
//         ? sch.StockOrder || stockLookup[sch.order_id]
//         : sch.CustomOrder || customLookup[sch.order_id];

//       if (!orderRef) return;

//       const nameParts = (orderRef.customerName || "N/A").trim().split(" ");
//       const firstName = nameParts[0] || "N/A";
//       const lastName = nameParts.slice(1).join(" ") || "";

//       const commonData = {
//         Date: sch.updatedAt.toISOString().split("T")[0],
//         "Order Number": orderRef.orderNumber || "N/A",
//         "Order Type": isStock ? "Stock" : "Custom",
//         "First Name": firstName,
//         "Last Name": lastName,
//         Product: isStock
//           ? orderRef.productDescription ||
//             orderRef.productNumber ||
//             "Stock Item"
//           : orderRef.partNumber ||
//             orderRef.product?.partDescription ||
//             "Custom Item",
//         "Order Quantity": orderRef.productQuantity || 0,
//         "Scheduled Quantity": sch.scheduleQuantity || 0,
//         "Completed Quantity": sch.completedQuantity || 0,
//       };

//       if (schStatus === "completed" || schStatus === "complete") {
//         fulfilledOrders.push({ ...commonData, Status: "Completed" });
//       } else {
//         openOrders.push({ ...commonData, Status: sch.status || "In Progress" });
//       }

//       // ============================================================
//       // Efficiency Calculation (Max 100%)
//       // ============================================================
//       let efficiencyPercentage = "0.00%";
//       if (orderRef.productQuantity > 0) {
//         const rawEfficiency =
//           (sch.completedQuantity / orderRef.productQuantity) * 100;
//         // Math.min use kiya taaki 100 se upar na jaye
//         efficiencyPercentage = Math.min(100, rawEfficiency).toFixed(2) + "%";
//       }

//       performance.push({
//         Date: commonData.Date,
//         "Order Number": orderRef.orderNumber,
//         Customer: orderRef.customerName,
//         Type: isStock ? "Stock" : "Custom",
//         Scheduled: sch.scheduleQuantity || 0,
//         "Total Completed": sch.completedQuantity || 0,
//         "Total Scrap": sch.scrapQuantity || 0,
//         Efficiency: efficiencyPercentage,
//       });
//     });

//     const scrapData = await prisma.scapEntries.findMany({
//       where: { scrapStatus: true, createdAt: { gte: start, lte: end } },
//       include: { PartNumber: { include: { supplier: true } }, supplier: true },
//     });

//     const formattedScrap = scrapData.map((entry) => ({
//       "Part Number": entry.PartNumber?.partNumber || "N/A",
//       "Return Quantity": entry.returnQuantity || 0,
//       "Supplier Company Name":
//         entry.supplier?.companyName ||
//         entry.PartNumber?.supplier?.companyName ||
//         "N/A",
//     }));

//     return res.status(200).json({
//       message: "Success",
//       data: {
//         openOrders,
//         fulfilledOrders,
//         performance,
//         scapEntries: formattedScrap,
//       },
//     });
//   } catch (error) {
//     console.error("Report Error:", error);
//     res
//       .status(500)
//       .json({ message: "Internal Server Error", error: error.message });
//   }
// };
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

    // 1. All schedules with Customer Relation included
    const allSchedules = await prisma.stockOrderSchedule.findMany({
      where: {
        updatedAt: { gte: start, lte: end },
        isDeleted: false,
      },
      include: {
        StockOrder: { include: { customer: true } }, // Customer details include kiye
        CustomOrder: { include: { customer: true, product: true } }, // Customer details include kiye
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

    // 2. Extra lookups with Customer Relation included
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

      // ============================================================
      // NAME EXTRACTION: Split karne ke bajaye direct relation se lein
      // ============================================================
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

      // Efficiency Calculation (Max 100%)
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
    console.error("Report Error:", error);
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

//     // 1. Saare potential jobs uthao (Aapka Original Fetch)
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

//     // --- PARENT BEFORE CHILD SORTING (Aapka Original Logic - No Change) ---
//     const partIds = candidates.map((c) => c.part_id).filter(Boolean);
//     const relations = await prisma.productTree.findMany({
//       where: {
//         product_id: { in: partIds },
//         part_id: { in: partIds },
//         isDeleted: false,
//       },
//     });

//     const sortedCandidates = candidates.sort((a, b) => {
//       if (a.status !== b.status) return a.status === "progress" ? -1 : 1;
//       const isAParentOfB = relations.some(
//         (r) => r.product_id === a.part_id && r.part_id === b.part_id,
//       );
//       if (isAParentOfB) return -1;
//       const isBParentOfA = relations.some(
//         (r) => r.product_id === b.part_id && r.part_id === a.part_id,
//       );
//       if (isBParentOfA) return 1;
//       return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
//     });

//     const nextJob = sortedCandidates[0];
//     const currentPartId = nextJob.part_id || nextJob.customPartId;

//     // --- UPCOMING JOBS LIST (Aapka format preserved) ---
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

//     // --- TIMER RESET LOGIC (Fix: Only fetch active, non-scrapped session) ---
//     const currentSession = await prisma.productionResponse.findFirst({
//       where: {
//         processId: processId,
//         stationUserId: stationUserId,
//         partId: currentPartId,
//         orderId: nextJob.order_id,
//         completedQuantity: 0,
//         scrap: false, // <--- Isse scrap wala record skip hoga
//         cycleTimeEnd: null, // <--- Isse sirf active timer wala milega
//         isDeleted: false,
//       },
//       orderBy: { createdAt: "desc" },
//       include: { employeeInfo: true },
//     });

//     // Fallback: Agar naya session nahi mila, tabhi pichla uthayein
//     const lastProduction =
//       currentSession ||
//       (await prisma.productionResponse.findFirst({
//         where: { processId, stationUserId, isDeleted: false },
//         orderBy: { createdAt: "desc" },
//         include: { employeeInfo: true },
//       }));

//     // 3. Stats & Instructions (Aapka Original)
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
//         where: {
//           order_id: nextJob.order_id,
//           processId,
//           isDeleted: false,
//         },
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
//         cycleTime: lastProduction?.cycleTimeStart || null, // Reset Timer yahan se hoga
//       },
//     });
//   } catch (error) {
//     return res
//       .status(500)
//       .json({ message: "Internal Server Error", error: error.message });
//   }
// };

// const getScheduleProcessInformation = async (req, res) => {
//   try {
//     const { id: processId } = req.params;
//     const { stationUserId } = req.query;

//     if (!processId || !stationUserId) {
//       return res
//         .status(400)
//         .json({ message: "processId and stationUserId are required." });
//     }

//     // 1. Saare potential jobs uthao
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

//     // --- SORTING LOGIC ---
//     const partIds = candidates.map((c) => c.part_id).filter(Boolean);
//     const relations = await prisma.productTree.findMany({
//       where: {
//         product_id: { in: partIds },
//         part_id: { in: partIds },
//         isDeleted: false,
//       },
//     });

//     const sortedCandidates = candidates.sort((a, b) => {
//       if (a.status !== b.status) return a.status === "progress" ? -1 : 1;
//       const isAParentOfB = relations.some(
//         (r) => r.product_id === a.part_id && r.part_id === b.part_id,
//       );
//       if (isAParentOfB) return -1;
//       return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
//     });

//     const nextJob = sortedCandidates[0];
//     const currentPartId = nextJob.part_id || nextJob.customPartId;

//     // --- ACTIVE SESSION CHECK (Timer Logic) ---
//     const lastProduction = await prisma.productionResponse.findFirst({
//       where: {
//         processId: processId,
//         stationUserId: stationUserId,
//         partId: currentPartId,
//         orderId: nextJob.order_id,
//         isDeleted: false,
//       },
//       orderBy: { createdAt: "desc" },
//       include: { employeeInfo: true },
//     });

//     // logic: Agar session milta hai AUR uska cycleTimeEnd NULL hai, tabhi start time bhejein.
//     // Warna 0 (null) bhejein taaki frontend timer start na kare.
//     const cycleTimeToSend =
//       lastProduction && lastProduction.cycleTimeEnd === null
//         ? lastProduction.cycleTimeStart
//         : null;

//     // --- Stats & Instructions ---
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
//         productionId: lastProduction?.id || null,
//         employeeInfo: lastProduction?.employeeInfo || null,
//         employeeCompletedQty: stats._sum.completedQuantity || 0,
//         employeeScrapQty: stats._sum.scrapQuantity || 0,
//         incomingJobs: sortedCandidates.slice(1).map((job) => ({
//           partNumber:
//             job.part?.partNumber || job.customPart?.partNumber || "N/A",
//           scheudleDate: job.order_date,
//         })),
//         cycleTime: cycleTimeToSend, // <--- Yahan updated value bhej rahe hain
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

    // 1. Saare potential jobs uthao (Aapka Original Fetch)
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

    // --- PARENT BEFORE CHILD SORTING (Aapka Original Logic - No Change) ---
    const partIds = candidates.map((c) => c.part_id).filter(Boolean);
    const relations = await prisma.productTree.findMany({
      where: {
        product_id: { in: partIds },
        part_id: { in: partIds },
        isDeleted: false,
      },
    });

    const sortedCandidates = candidates.sort((a, b) => {
      if (a.status !== b.status) return a.status === "progress" ? -1 : 1;
      const isAParentOfB = relations.some(
        (r) => r.product_id === a.part_id && r.part_id === b.part_id,
      );
      if (isAParentOfB) return -1;
      const isBParentOfA = relations.some(
        (r) => r.product_id === b.part_id && r.part_id === a.part_id,
      );
      if (isBParentOfA) return 1;
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    });

    const nextJob = sortedCandidates[0];
    const currentPartId = nextJob.part_id || nextJob.customPartId;

    // --- UPCOMING JOBS LIST (Aapka format preserved) ---
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

    // --- TIMER RESET LOGIC (Fix: Only fetch active, non-scrapped session) ---
    const currentSession = await prisma.productionResponse.findFirst({
      where: {
        processId: processId,
        stationUserId: stationUserId,
        partId: currentPartId,
        orderId: nextJob.order_id,
        completedQuantity: 0,
        scrap: false, // <--- Isse scrap wala record skip hoga
        cycleTimeEnd: null, // <--- Isse sirf active timer wala milega
        isDeleted: false,
      },
      orderBy: { createdAt: "desc" },
      include: { employeeInfo: true },
    });

    // Fallback: Agar naya session nahi mila, tabhi pichla uthayein
    const lastProduction =
      currentSession ||
      (await prisma.productionResponse.findFirst({
        where: { processId, stationUserId, isDeleted: false },
        orderBy: { createdAt: "desc" },
        include: { employeeInfo: true },
      }));

    // 3. Stats & Instructions (Aapka Original)
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
        where: {
          order_id: nextJob.order_id,
          processId,
          isDeleted: false,
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
        cycleTime: lastProduction?.cycleTimeStart || null, // Reset Timer yahan se hoga
      },
    });
  } catch (error) {
    return res
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

//     const nextJob = candidates.sort((a, b) => {
//       if (a.status !== b.status) return a.status === "progress" ? -1 : 1;
//       return new Date(a.createdAt) - new Date(b.createdAt);
//     })[0];

//     const currentPartId = nextJob.part_id || nextJob.customPartId;

//     // --- TIMER LOGIC FIX ---
//     // 1. Pehle wahi dhoondho jiska timer abhi CHAL raha hai (cycleTimeEnd is null)
//     let lastProduction = await prisma.productionResponse.findFirst({
//       where: {
//         processId: processId,
//         stationUserId: stationUserId,
//         partId: currentPartId,
//         cycleTimeEnd: null, // Timer is running
//         isDeleted: false,
//       },
//       orderBy: { createdAt: "desc" },
//       include: { employeeInfo: true },
//     });

//     // 2. Agar koi running timer nahi hai, toh sabse naya record uthao (Safety backup)
//     if (!lastProduction) {
//       lastProduction = await prisma.productionResponse.findFirst({
//         where: { processId, stationUserId, isDeleted: false },
//         orderBy: { createdAt: "desc" },
//         include: { employeeInfo: true },
//       });
//     }

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
//         where: {
//           order_id: nextJob.order_id,
//           processId,
//           isDeleted: false,
//           completed_EmpId: stationUserId,
//         },
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
//         productionId: lastProduction?.id || null, // N/A nahi aayega ab
//         employeeInfo: lastProduction?.employeeInfo || null, // undefined nahi aayega
//         employeeCompletedQty: stats._sum.completedQuantity || 0,
//         employeeScrapQty: stats._sum.scrapQuantity || 0,
//         cycleTime: lastProduction?.cycleTimeStart || null, // Timer start time
//       },
//     });
//   } catch (error) {
//     return res
//       .status(500)
//       .json({ message: "Internal Server Error", error: error.message });
//   }
// };
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

//     const nextJob = candidates.sort((a, b) => {
//       if (a.status !== b.status) return a.status === "progress" ? -1 : 1;
//       return new Date(a.createdAt) - new Date(b.createdAt);
//     })[0];

//     const currentPartId = nextJob.part_id || nextJob.customPartId;

//     // --- TIMER LOGIC FIX ---
//     // 1. Pehle wahi dhoondho jiska timer abhi CHAL raha hai (cycleTimeEnd is null)
//     let lastProduction = await prisma.productionResponse.findFirst({
//       where: {
//         processId: processId,
//         stationUserId: stationUserId,
//         partId: currentPartId,
//         cycleTimeEnd: null, // Timer is running
//         isDeleted: false,
//       },
//       orderBy: { createdAt: "desc" },
//       include: { employeeInfo: true },
//     });

//     // 2. Agar koi running timer nahi hai, toh sabse naya record uthao (Safety backup)
//     if (!lastProduction) {
//       lastProduction = await prisma.productionResponse.findFirst({
//         where: { processId, stationUserId, isDeleted: false },
//         orderBy: { createdAt: "desc" },
//         include: { employeeInfo: true },
//       });
//     }

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
//         where: {
//           order_id: nextJob.order_id,
//           processId,
//           isDeleted: false,
//           completed_EmpId: stationUserId,
//         },
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
//         productionId: lastProduction?.id || null, // N/A nahi aayega ab
//         employeeInfo: lastProduction?.employeeInfo || null, // undefined nahi aayega
//         employeeCompletedQty: stats._sum.completedQuantity || 0,
//         employeeScrapQty: stats._sum.scrapQuantity || 0,
//         cycleTime: lastProduction?.cycleTimeStart || null, // Timer start time
//       },
//     });
//   } catch (error) {
//     return res
//       .status(500)
//       .json({ message: "Internal Server Error", error: error.message });
//   }
// };

// const getScheduleProcessInformation = async (req, res) => {
//   try {
//     const { id: processId } = req.params;
//     const { stationUserId } = req.query;

//     if (!processId || !stationUserId) {
//       return res
//         .status(400)
//         .json({ message: "processId and stationUserId are required." });
//     }

//     // 1. Saare jobs uthao jo is process ke liye scheduled hain
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

//     // --- STEP: PARENT BEFORE CHILD SORTING ---
//     const partIds = candidates.map((c) => c.part_id).filter(Boolean);
//     const relations = await prisma.productTree.findMany({
//       where: {
//         product_id: { in: partIds },
//         part_id: { in: partIds },
//         isDeleted: false,
//       },
//     });

//     const sortedCandidates = candidates.sort((a, b) => {
//       // Pehle progress wale
//       if (a.status !== b.status) return a.status === "progress" ? -1 : 1;

//       // Phir Parent before Child
//       const isAParentOfB = relations.some(
//         (r) => r.product_id === a.part_id && r.part_id === b.part_id,
//       );
//       if (isAParentOfB) return -1;
//       const isBParentOfA = relations.some(
//         (r) => r.product_id === b.part_id && r.part_id === a.part_id,
//       );
//       if (isBParentOfA) return 1;

//       // Phir purani date wale
//       return new Date(a.createdAt) - new Date(b.createdAt);
//     });

//     const nextJob = sortedCandidates[0];
//     const currentPartId = nextJob.part_id || nextJob.customPartId;

//     // --- FIX: INCOMING JOBS LIST (Upcoming Parts) ---
//     // Pehle part ko chhod kar baaki sab upcoming list mein jayenge
//     const incomingJobs = sortedCandidates.slice(1).map((job) => ({
//       scheduleId: job.id,
//       orderNumber:
//         job.StockOrder?.orderNumber || job.CustomOrder?.orderNumber || "N/A",
//       partNumber: job.part?.partNumber || job.customPart?.partNumber || "N/A",
//       quantity: job.quantity,
//       remainingQty: job.remainingQty,
//       status: job.status,
//       type: job.order_type,
//     }));

//     // --- TIMER LOGIC FIX ---
//     let lastProduction = await prisma.productionResponse.findFirst({
//       where: {
//         processId: processId,
//         stationUserId: stationUserId,
//         partId: currentPartId,
//         orderId: nextJob.order_id,
//         cycleTimeEnd: null, // running session
//         isDeleted: false,
//       },
//       orderBy: { createdAt: "desc" },
//       include: { employeeInfo: true },
//     });

//     if (!lastProduction) {
//       lastProduction = await prisma.productionResponse.findFirst({
//         where: {
//           processId,
//           stationUserId,
//           partId: currentPartId,
//           orderId: nextJob.order_id,
//           isDeleted: false,
//         },
//         orderBy: { createdAt: "desc" },
//         include: { employeeInfo: true },
//       });
//     }

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
//         where: {
//           order_id: nextJob.order_id,
//           processId,
//           isDeleted: false,
//           completed_EmpId: stationUserId,
//         },
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
//         // Yahan 'incomingJobs' bhej rahe hain taaki frontend list dikha sake
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

// const getScheduleProcessInformation = async (req, res) => {
//   try {
//     const { id: processId } = req.params;
//     const { stationUserId } = req.query;

//     if (!processId || !stationUserId) {
//       return res.status(400).json({ message: "processId and stationUserId are required." });
//     }

//     // 1. Saare jobs uthao jo is station par scheduled hain
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
//       return res.status(404).json({ message: "No jobs assigned to this station." });
//     }

//     // --- STEP: PARENT BEFORE CHILD SORTING ---
//     const partIds = candidates.map(c => c.part_id).filter(Boolean);
//     const relations = await prisma.productTree.findMany({
//       where: { product_id: { in: partIds }, part_id: { in: partIds }, isDeleted: false }
//     });

//     const sortedCandidates = candidates.sort((a, b) => {
//       // Priority 1: Jo kaam pehle se chal raha hai (progress)
//       if (a.status !== b.status) return a.status === "progress" ? -1 : 1;

//       // Priority 2: Parent Part pehle, Child Part baad mein
//       const isAParentOfB = relations.some(r => r.product_id === a.part_id && r.part_id === b.part_id);
//       if (isAParentOfB) return -1;
//       const isBParentOfA = relations.some(r => r.product_id === b.part_id && r.part_id === a.part_id);
//       if (isBParentOfA) return 1;

//       // Priority 3: Creation date ke hisaab se
//       return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
//     });

//     const nextJob = sortedCandidates[0];
//     const currentPartId = nextJob.part_id || nextJob.customPartId;

//     // --- STEP: UPCOMING PARTS (incomingJobs) ---
//     // Pehle ko chhod kar baaki sab list mein dikhayenge
//     const incomingJobs = sortedCandidates.slice(1).map((job) => ({
//       scheduleId: job.id,
//       orderNumber: job.StockOrder?.orderNumber || job.CustomOrder?.orderNumber || "N/A",
//       partNumber: job.part?.partNumber || job.customPart?.partNumber || "N/A",
//       quantity: job.quantity,
//       remainingQty: job.remainingQty,
//       status: job.status,
//       type: job.order_type,
//       scheudleDate: job.order_date, // Frontend requirement
//     }));

//     // --- STEP: TIMER & SESSION INFO ---
//     // Active session dhoondo jiska timer chal raha ho
//     let lastProduction = await prisma.productionResponse.findFirst({
//       where: {
//         processId: processId,
//         stationUserId: stationUserId,
//         partId: currentPartId,
//         orderId: nextJob.order_id,
//         cycleTimeEnd: null,
//         isDeleted: false,
//       },
//       orderBy: { createdAt: "desc" },
//       include: { employeeInfo: true },
//     });

//     // Backup: Agar running session nahi mila toh sabse naya uthao
//     if (!lastProduction) {
//       lastProduction = await prisma.productionResponse.findFirst({
//         where: { processId, stationUserId, isDeleted: false },
//         orderBy: { cycleTimeStart: "desc" },
//         include: { employeeInfo: true },
//       });
//     }

//     // 3. Order, Instructions and Stats
//     const [orderData, workInstructions, stats] = await Promise.all([
//       nextJob.order_type === "StockOrder"
//         ? prisma.stockOrder.findUnique({ where: { id: nextJob.order_id } })
//         : prisma.customOrder.findUnique({ where: { id: nextJob.order_id } }),

//       prisma.workInstruction.findFirst({
//         where: { productId: currentPartId || undefined, processId: processId, isDeleted: false },
//         include: { steps: { where: { isDeleted: false }, orderBy: { stepNumber: "asc" }, include: { images: true, videos: true } } },
//       }),

//       prisma.stockOrderSchedule.aggregate({
//         where: { order_id: nextJob.order_id, processId, isDeleted: false, completed_EmpId: stationUserId },
//         _sum: { completedQuantity: true, scrapQuantity: true },
//       }),
//     ]);

//     // 4. FINAL RESPONSE (With All Original Details)
//     return res.status(200).json({
//       message: "Job Found",
//       data: {
//         ...nextJob, // Isse sari dates aur original fields wapas aa jayengi
//         processName: nextJob.process?.processName || "N/A",
//         partNumber: nextJob.part?.partNumber || nextJob.customPart?.partNumber || "N/A",
//         order: orderData,
//         workInstructionSteps: workInstructions?.steps || [],
//         instructionTitle: workInstructions?.instructionTitle || "No Instructions Found",
//         productionId: lastProduction?.id || null,
//         employeeInfo: lastProduction?.employeeInfo || null, // Yeh Vijay Saradar ka data hai
//         employeeCompletedQty: stats._sum.completedQuantity || 0,
//         employeeScrapQty: stats._sum.scrapQuantity || 0,
//         incomingJobs: incomingJobs, // Ab upcoming list bhi aayegi
//         cycleTime: lastProduction?.cycleTimeStart || null, // Timer reset ke liye
//       },
//     });
//   } catch (error) {
//     console.error("API Error:", error);
//     return res.status(500).json({ message: "Internal Server Error", error: error.message });
//   }
// };
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
// const getTrainingScheduleInformation = async (req, res) => {
//   try {
//     const { id: processId } = req.params;
//     const { stationUserId } = req.query;

//     if (!processId || !stationUserId || stationUserId === "undefined") {
//       return res
//         .status(400)
//         .json({ message: "Invalid processId or stationUserId." });
//     }

//     const availableInstructions = await prisma.workInstruction.findMany({
//       where: { processId: processId, isDeleted: false },
//       select: { productId: true },
//     });

//     const trainableProductIds = availableInstructions.map((wi) => wi.productId);

//     if (trainableProductIds.length === 0) {
//       return res
//         .status(404)
//         .json({ message: "No training materials found for this process." });
//     }
//     const aa = await prisma.stockOrderSchedule.findMany();
//     const candidates = await prisma.stockOrderSchedule.findMany({
//       where: {
//         processId,
//         isDeleted: false,
//         status: { in: ["new", "progress"] },
//         OR: [
//           { part_id: { in: trainableProductIds } },
//           { customPartId: { in: trainableProductIds } },
//         ],
//       },
//       include: {
//         part: true,
//         customPart: true,
//         process: true,
//         StockOrder: { select: { orderNumber: true } },
//         CustomOrder: { select: { orderNumber: true } },
//       },
//     });
//     console.log("candidates", candidates);
//     if (candidates.length === 0) {
//       return res
//         .status(404)
//         .json({ message: "No jobs available for training." });
//     }

//     const partIdsInQueue = candidates.map((c) => c.part_id).filter(Boolean);
//     const internalDeps = await prisma.productTree.findMany({
//       where: {
//         product_id: { in: partIdsInQueue },
//         part_id: { in: partIdsInQueue },
//         isDeleted: false,
//       },
//     });

//     const parentToChildMap = {};
//     internalDeps.forEach((dep) => {
//       if (!parentToChildMap[dep.product_id])
//         parentToChildMap[dep.product_id] = [];
//       parentToChildMap[dep.product_id].push(dep.part_id);
//     });

//     const sorted = candidates.sort((a, b) => {
//       if (a.status !== b.status) return a.status === "progress" ? -1 : 1;
//       if (a.part_id && b.part_id) {
//         if (parentToChildMap[a.part_id]?.includes(b.part_id)) return 1;
//         if (parentToChildMap[b.part_id]?.includes(a.part_id)) return -1;
//       }
//       return new Date(a.createdAt) - new Date(b.createdAt);
//     });

//     const nextJob = sorted[0];
//     let production = await prisma.productionResponse.findFirst({
//       where: {
//         processId: processId,
//         stationUserId: stationUserId,
//         partId: nextJob.part_id || nextJob.customPartId,
//         isDeleted: false,
//         traniningStatus: false,
//       },
//     });

//     if (!production) {
//       production = await prisma.productionResponse.create({
//         data: {
//           processId: processId,
//           stationUserId: stationUserId,
//           partId: nextJob.part_id || nextJob.customPartId,
//           orderId: nextJob.stockOrderId || nextJob.order_id,
//           cycleTimeStart: new Date(),
//           traniningStatus: false,
//           type: "training",
//         },
//       });
//     }

//     const workInstructions = await prisma.workInstruction.findFirst({
//       where: {
//         productId: nextJob.part_id || nextJob.customPartId,
//         processId,
//         isDeleted: false,
//       },
//       include: {
//         steps: {
//           where: { isDeleted: false },
//           orderBy: { stepNumber: "asc" },
//           include: { images: true, videos: true },
//         },
//       },
//     });
//     return res.status(200).json({
//       message: "Training Job Found",
//       data: {
//         ...nextJob,
//         productionId: production.id,
//         workInstructionSteps: workInstructions?.steps || [],
//         instructionTitle: workInstructions?.instructionTitle || "",
//         cycleTime: production.cycleTimeStart,
//         incomingJobs: sorted.slice(1).map((j) => ({
//           scheduleId: j.id,
//           partNumber: j.part?.partNumber || j.customPart?.partNumber,
//           quantity: j.quantity,
//         })),
//       },
//     });
//   } catch (error) {
//     return res.status(500).json({ message: "Internal Server Error" });
//   }
// };

// const getTrainingScheduleInformation = async (req, res) => {
//   try {
//     const { id: processId } = req.params;
//     const { stationUserId, productionId } = req.query; // productionId frontend se aayega login ke baad

//     // 1. Fetch the active training session
//     const production = await prisma.productionResponse.findFirst({
//       where: {
//         id: productionId,
//         stationUserId: stationUserId,
//         traniningStatus: false, // Active session
//         isDeleted: false,
//       },
//       include: { employeeInfo: true, process: true },
//     });

//     if (!production) {
//       return res.status(404).json({
//         message: "No active training session found. Please login again.",
//       });
//     }

//     // 2. Fetch Part & Instructions
//     const nextJob = await prisma.stockOrderSchedule.findFirst({
//       where: {
//         processId,
//         OR: [
//           { part_id: production.partId },
//           { customPartId: production.partId },
//         ],
//       },
//       include: {
//         part: true,
//         customPart: true,
//         StockOrder: true,
//         CustomOrder: true,
//       },
//     });

//     const workInstructions = await prisma.workInstruction.findFirst({
//       where: { productId: production.partId, processId, isDeleted: false },
//       include: {
//         steps: {
//           where: { isDeleted: false },
//           orderBy: { stepNumber: "asc" },
//           include: { images: true, videos: true },
//         },
//       },
//     });

//     return res.status(200).json({
//       message: "Training data fetched",
//       data: {
//         ...nextJob,
//         productionId: production.id,
//         workInstructionSteps: workInstructions?.steps || [],
//         cycleTime: production.cycleTimeStart,
//         employeeInfo: production.employeeInfo,
//         processName: production.process?.processName,
//         partNumber:
//           nextJob?.part?.partNumber || nextJob?.customPart?.partNumber,
//       },
//     });
//   } catch (error) {
//     console.log(error);
//     return res.status(500).json({ message: "Internal Server Error" });
//   }
// };
// const getTrainingScheduleInformation = async (req, res) => {
//   try {
//     const { id: processId } = req.params;
//     const { stationUserId } = req.query;

//     if (!processId || !stationUserId) {
//       return res.status(400).json({ message: "ProcessId and StationUserId are required." });
//     }

//     // 1. Bas itna dekho ki is station par koi job hai ya nahi
//     const nextJob = await prisma.stockOrderSchedule.findFirst({
//       where: { processId, isDeleted: false },
//       include: { part: true, customPart: true, process: true },
//     });

//     if (!nextJob) {
//       return res.status(404).json({ message: "No jobs available for training at this station." });
//     }

//     const currentPartId = nextJob.part_id || nextJob.customPartId;

//     // 2. Find or Create Training Session (Plain & Simple)
//     let production = await prisma.productionResponse.findFirst({
//       where: {
//         stationUserId,
//         processId,
//         partId: currentPartId,
//         type: "training",
//         traniningStatus: false,
//         isDeleted: false,
//       },
//     });

//     if (!production) {
//       production = await prisma.productionResponse.create({
//         data: {
//           processId,
//           stationUserId,
//           partId: currentPartId,
//           type: "training",
//           traniningStatus: false,
//           cycleTimeStart: new Date(),
//         },
//       });
//     }

//     // 3. Get Instructions
//     const workInstructions = await prisma.workInstruction.findFirst({
//       where: { productId: currentPartId, processId, isDeleted: false },
//       include: {
//         steps: {
//           where: { isDeleted: false },
//           orderBy: { stepNumber: "asc" },
//           include: { images: true, videos: true },
//         },
//       },
//     });

//     return res.status(200).json({
//       message: "Training Session Ready",
//       data: {
//         ...nextJob,
//         productionId: production.id,
//         workInstructionSteps: workInstructions?.steps || [],
//         instructionTitle: workInstructions?.instructionTitle || "Manual",
//         cycleTime: production.cycleTimeStart,
//         partNumber: nextJob.part?.partNumber || nextJob.customPart?.partNumber || "N/A",
//       },
//     });
//   } catch (error) {
//     return res.status(500).json({ message: "Server Error", error: error.message });
//   }
// };
const getTrainingScheduleInformation = async (req, res) => {
  try {
    const { id: processId } = req.params;
    const { stationUserId } = req.query;

    if (!processId || !stationUserId) {
      return res
        .status(400)
        .json({ message: "ProcessId and StationUserId are required." });
    }

    // 1. Bas itna dekho ki is station par koi job hai ya nahi
    const nextJob = await prisma.stockOrderSchedule.findFirst({
      where: { processId, isDeleted: false },
      include: { part: true, customPart: true, process: true },
    });

    if (!nextJob) {
      return res
        .status(404)
        .json({ message: "No jobs available for training at this station." });
    }

    const currentPartId = nextJob.part_id || nextJob.customPartId;

    // 2. Find or Create Training Session (Plain & Simple)
    let production = await prisma.productionResponse.findFirst({
      where: {
        stationUserId,
        processId,
        partId: currentPartId,
        type: "training",
        traniningStatus: false,
        isDeleted: false,
      },
    });

    if (!production) {
      production = await prisma.productionResponse.create({
        data: {
          processId,
          stationUserId,
          partId: currentPartId,
          type: "training",
          traniningStatus: false,
          cycleTimeStart: new Date(),
        },
      });
    }

    // 3. Get Instructions
    const workInstructions = await prisma.workInstruction.findFirst({
      where: { productId: currentPartId, processId, isDeleted: false },
      include: {
        steps: {
          where: { isDeleted: false },
          orderBy: { stepNumber: "asc" },
          include: { images: true, videos: true },
        },
      },
    });

    return res.status(200).json({
      message: "Training Session Ready",
      data: {
        ...nextJob,
        productionId: production.id,
        workInstructionSteps: workInstructions?.steps || [],
        instructionTitle: workInstructions?.instructionTitle || "Manual",
        cycleTime: production.cycleTimeStart,
        partNumber:
          nextJob.part?.partNumber || nextJob.customPart?.partNumber || "N/A",
      },
    });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Server Error", error: error.message });
  }
};
// const scanCompleteAction = async (req, res) => {
//   try {
//     const { id: productionResponseId } = req.params;
//     const { orderId, partId, employeeId, order_type } = req.body;

//     if (!orderId || !partId || !employeeId) {
//       return res.status(400).json({
//         message: "Missing required data (OrderID, PartID, or EmployeeID).",
//       });
//     }

//     const result = await prisma.$transaction(async (tx) => {
//       // 1. Find the Schedule first
//       const schedule = await tx.stockOrderSchedule.findFirst({
//         where: {
//           order_id: orderId,
//           part_id: partId,
//           order_type: order_type,
//           isDeleted: false,
//         },
//       });

//       if (!schedule) throw new Error("Job Schedule not found.");

//       const newQty = (schedule.completedQuantity || 0) + 1;
//       const isFinished = newQty >= (schedule.scheduleQuantity || 0);

//       // 2. Update Schedule
//       await tx.stockOrderSchedule.update({
//         where: { id: schedule.id },
//         data: {
//           completedQuantity: newQty,
//           remainingQty: Math.max(0, (schedule.remainingQty || 0) - 1),
//           status: isFinished ? "completed" : "progress",
//           completed_date: isFinished ? new Date() : undefined,
//           completed_EmpId: employeeId,
//         },
//       });

//       // 3. FIX: Production Response Update Logic
//       // Check if the record exists before updating
//       const existingResponse = await tx.productionResponse.findUnique({
//         where: { id: productionResponseId },
//       });

//       if (existingResponse) {
//         // Agar record mil gaya toh update karein
//         await tx.productionResponse.update({
//           where: { id: productionResponseId },
//           data: {
//             completedQuantity: { increment: 1 },
//             cycleTimeEnd: new Date(),
//             submittedDateTime: new Date(),
//             stationUserId: employeeId,
//             scrap: false,
//           },
//         });
//       } else {
//         // Agar record nahi mila (P2025 fix), toh Naya Create karein
//         await tx.productionResponse.create({
//           data: {
//             orderId: order_type.includes("Stock") ? orderId : null,
//             customOrderId: order_type.includes("Custom") ? orderId : null,
//             partId: partId,
//             processId: schedule.processId || "",
//             completedQuantity: 1,
//             cycleTimeStart: new Date(Date.now() - 60000), // 1 min ago
//             cycleTimeEnd: new Date(),
//             order_type: order_type,
//             stationUserId: employeeId,
//           },
//         });
//       }

//       // 4. Update Stock (Inventory)
//       if (order_type.includes("Stock")) {
//         await tx.partNumber.update({
//           where: { part_id: partId },
//           data: { availStock: { increment: 1 } },
//         });
//       }

//       return {
//         message: "Success",
//         status: isFinished ? "completed" : "progress",
//       };
//     });

//     return res.status(200).json(result);
//   } catch (error) {
//     console.error("Scan Complete Error:", error);
//     res.status(500).json({ message: error.message });
//   }
// };
// const scanScrapAction = async (req, res) => {
//   try {
//     const { id: productionResponseId } = req.params; // Station ID from URL
//     const { orderId, partId, employeeId, order_type } = req.body;

//     // Basic Validation
//     if (!orderId || !partId || !employeeId || !order_type) {
//       return res.status(400).json({
//         message:
//           "Missing required data (OrderID, PartID, EmployeeID, or OrderType).",
//       });
//     }

//     const result = await prisma.$transaction(async (tx) => {
//       // 1. Find the Schedule first
//       const schedule = await tx.stockOrderSchedule.findFirst({
//         where: {
//           order_id: orderId,
//           part_id: partId,
//           order_type: order_type,
//           isDeleted: false,
//         },
//       });

//       if (!schedule) throw new Error("Job Schedule not found for this part.");

//       // Calculate new remaining quantity
//       const newRemaining = Math.max(0, (schedule.remainingQty || 0) - 1);

//       // 2. Update Schedule Table (Increment Scrap, Decrement Remaining)
//       await tx.stockOrderSchedule.update({
//         where: { id: schedule.id },
//         data: {
//           scrapQuantity: { increment: 1 },
//           remainingQty: newRemaining,
//           status: "progress", // Scrap hone par bhi status progress mein hi rahega
//         },
//       });

//       // 3. FIX P2025: Production Response Logic (Update or Create)
//       const existingResponse = await tx.productionResponse.findUnique({
//         where: { id: productionResponseId },
//       });

//       if (existingResponse) {
//         // Agar station record mil gaya toh update karein
//         await tx.productionResponse.update({
//           where: { id: productionResponseId },
//           data: {
//             scrap: true,
//             scrapQuantity: { increment: 1 },
//             cycleTimeEnd: new Date(),
//             stationUserId: employeeId,
//             remainingQty: newRemaining,
//           },
//         });
//       } else {
//         // Agar station record nahi mila, toh crash hone ke bajaye naya record Create karein
//         await tx.productionResponse.create({
//           data: {
//             orderId: order_type.includes("Stock") ? orderId : null,
//             customOrderId: order_type.includes("Custom") ? orderId : null,
//             partId: partId,
//             processId: schedule.processId || "",
//             scrap: true,
//             scrapQuantity: 1,
//             completedQuantity: 0,
//             cycleTimeStart: new Date(Date.now() - 60000),
//             cycleTimeEnd: new Date(),
//             order_type: order_type,
//             stationUserId: employeeId,
//             remainingQty: newRemaining,
//           },
//         });
//       }

//       // 4. Create History Entry in scapEntries table
//       await tx.scapEntries.create({
//         data: {
//           partId: partId,
//           processId: schedule.processId,
//           returnQuantity: 1,
//           scrapStatus: true,
//           employeeId: employeeId,
//           type: order_type,
//           stockOrderId: order_type.includes("Stock") ? orderId : null,
//         },
//       });

//       return {
//         message: "Part added to scrap successfully",
//         remainingQty: newRemaining,
//       };
//     });

//     return res.status(200).json(result);
//   } catch (error) {
//     console.error("Scan Scrap Error:", error);
//     res.status(500).json({ message: error.message });
//   }
// };
// const scanCompleteAction = async (req, res) => {
//   try {
//     const { id: productionResponseId } = req.params; // Current Station Session ID
//     const { orderId, partId, employeeId, order_type } = req.body;

//     if (!orderId || !partId || !employeeId) {
//       return res.status(400).json({ message: "Missing required data." });
//     }

//     const result = await prisma.$transaction(async (tx) => {
//       const now = new Date();

//       // 1. Find the current session to get IDs
//       const currentSession = await tx.productionResponse.findUnique({
//         where: { id: productionResponseId },
//       });

//       if (!currentSession) throw new Error("Station session not found.");

//       // 2. CLOSE current session (Timer stops for this unit)
//       await tx.productionResponse.update({
//         where: { id: productionResponseId },
//         data: {
//           completedQuantity: 1, // Individual unit tracking
//           cycleTimeEnd: now,
//           submittedDateTime: now,
//           stationUserId: employeeId,
//           scrap: false,
//         },
//       });

//       // 3. START NEW session (Timer resets to zero for next unit)
//       const nextSession = await tx.productionResponse.create({
//         data: {
//           processId: currentSession.processId,
//           stationUserId: employeeId,
//           partId: partId,
//           orderId: currentSession.orderId,
//           customOrderId: currentSession.customOrderId,
//           order_type: order_type,
//           cycleTimeStart: now, // New timer starts from 00:00
//           completedQuantity: 0,
//         },
//       });

//       // 4. Update Schedule
//       const schedule = await tx.stockOrderSchedule.findFirst({
//         where: {
//           order_id: orderId,
//           part_id: partId,
//           order_type,
//           isDeleted: false,
//         },
//       });

//       const newQty = (schedule.completedQuantity || 0) + 1;
//       const isFinished = newQty >= (schedule.scheduleQuantity || 0);

//       await tx.stockOrderSchedule.update({
//         where: { id: schedule.id },
//         data: {
//           completedQuantity: newQty,
//           remainingQty: Math.max(0, (schedule.remainingQty || 0) - 1),
//           status: isFinished ? "completed" : "progress",
//           completed_date: isFinished ? now : undefined,
//           completed_EmpId: employeeId,
//         },
//       });

//       // 5. Update Stock Inventory
//       if (order_type.includes("Stock")) {
//         await tx.partNumber.update({
//           where: { part_id: partId },
//           data: { availStock: { increment: 1 } },
//         });
//       }

//       return {
//         message: "Success",
//         status: isFinished ? "completed" : "progress",
//         newProductionId: nextSession.id, // Return this to frontend to reset timer
//       };
//     });

//     return res.status(200).json(result);
//   } catch (error) {
//     res.status(500).json({ message: error.message });
//   }
// };
// const scanCompleteAction = async (req, res) => {
//   try {
//     const { id: productionResponseId } = req.params; // मौजूदा स्टेशन सेशन ID
//     const { orderId, partId, employeeId, order_type } = req.body;

//     if (!orderId || !partId || !employeeId) {
//       return res.status(400).json({
//         message: "Missing required data (OrderID, PartID, or EmployeeID).",
//       });
//     }

//     const result = await prisma.$transaction(async (tx) => {
//       const now = new Date();

//       // 1. मौजूदा सेशन को क्लोज करें (Timer stops for this piece)
//       const currentSession = await tx.productionResponse.findUnique({
//         where: { id: productionResponseId },
//       });
//       if (!currentSession) throw new Error("Station session not found.");

//       await tx.productionResponse.update({
//         where: { id: productionResponseId },
//         data: {
//           completedQuantity: 1,
//           cycleTimeEnd: now,
//           submittedDateTime: now,
//           stationUserId: employeeId,
//           scrap: false,
//         },
//       });

//       // 2. Schedule अपडेट करें
//       const schedule = await tx.stockOrderSchedule.findFirst({
//         where: {
//           order_id: orderId,
//           part_id: partId,
//           order_type,
//           isDeleted: false,
//         },
//       });
//       if (!schedule) throw new Error("Job Schedule not found.");

//       const newRemaining = Math.max(0, (schedule.remainingQty || 0) - 1);
//       const updatedStatus = newRemaining <= 0 ? "completed" : "progress";

//       await tx.stockOrderSchedule.update({
//         where: { id: schedule.id },
//         data: {
//           completedQuantity: (schedule.completedQuantity || 0) + 1,
//           remainingQty: newRemaining,
//           status: updatedStatus,
//           completed_date: updatedStatus === "completed" ? now : undefined,
//           completed_EmpId: employeeId,
//         },
//       });

//       // 3. नया सेशन शुरू करें अगर काम बाकी है (Timer Resets to 0)
//       let nextProductionId = null;
//       if (updatedStatus !== "completed") {
//         const nextSession = await tx.productionResponse.create({
//           data: {
//             processId: currentSession.processId,
//             stationUserId: employeeId,
//             partId: partId,
//             orderId: currentSession.orderId,
//             customOrderId: currentSession.customOrderId,
//             order_type: order_type,
//             cycleTimeStart: now, // RESET: नया टाइमर यहाँ से शुरू
//             completedQuantity: 0,
//           },
//         });
//         nextProductionId = nextSession.id;
//       }

//       // 4. Stock Inventory अपडेट
//       if (order_type.includes("Stock")) {
//         await tx.partNumber.update({
//           where: { part_id: partId },
//           data: { availStock: { increment: 1 } },
//         });
//       }

//       return {
//         message: "Scanned & Completed. Timer reset.",
//         status: updatedStatus,
//         newProductionId: nextProductionId, // Frontend इसे यूज करेगा
//         isJobFinished: updatedStatus === "completed",
//       };
//     });

//     return res.status(200).json(result);
//   } catch (error) {
//     console.error("Scan Complete Error:", error);
//     res.status(500).json({ message: error.message });
//   }
// };

// const scanCompleteAction = async (req, res) => {
//   try {
//     const { id: productionResponseId } = req.params; // Active session ID
//     const { orderId, partId, employeeId, order_type } = req.body;
//     const now = new Date();

//     if (!orderId || !partId || !employeeId) {
//       return res
//         .status(400)
//         .json({
//           message: "Missing required data (OrderID, PartID, or EmployeeID).",
//         });
//     }

//     const result = await prisma.$transaction(async (tx) => {
//       // 1. Pehle Job Schedule dhoondo
//       const schedule = await tx.stockOrderSchedule.findFirst({
//         where: {
//           order_id: orderId,
//           part_id: partId,
//           order_type,
//           isDeleted: false,
//         },
//       });
//       if (!schedule) throw new Error("Job Schedule not found.");

//       // 2. PRODUCTION RESPONSE CLOSE KAREIN (Current Piece Timer Stop)
//       let wasUpdated = false;
//       if (
//         productionResponseId &&
//         productionResponseId !== "null" &&
//         productionResponseId !== "undefined"
//       ) {
//         const updateResult = await tx.productionResponse.updateMany({
//           where: {
//             id: productionResponseId,
//             completedQuantity: 0,
//             scrap: false,
//           },
//           data: {
//             completedQuantity: 1, // Mark as Good Part
//             cycleTimeEnd: now,
//             submittedDateTime: now,
//             stationUserId: employeeId,
//           },
//         });
//         if (updateResult.count > 0) wasUpdated = true;
//       }

//       // SAFETY: Agar record update nahi hua (Race condition), toh naya completed record banao
//       if (!wasUpdated) {
//         await tx.productionResponse.create({
//           data: {
//             processId: schedule.processId,
//             stationUserId: employeeId,
//             partId: partId,
//             orderId: orderId,
//             order_type: order_type,
//             cycleTimeStart: now,
//             cycleTimeEnd: now,
//             completedQuantity: 1,
//             submittedDateTime: now,
//           },
//         });
//       }

//       // 3. Update Overall Schedule Table
//       const newCompletedQty = (schedule.completedQuantity || 0) + 1;
//       const newRemaining = Math.max(0, (schedule.remainingQty || 0) - 1);
//       const updatedStatus = newRemaining <= 0 ? "completed" : "progress";

//       await tx.stockOrderSchedule.update({
//         where: { id: schedule.id },
//         data: {
//           completedQuantity: newCompletedQty,
//           remainingQty: newRemaining,
//           status: updatedStatus,
//           completed_date: updatedStatus === "completed" ? now : undefined,
//           completed_EmpId: employeeId,
//         },
//       });

//       // 4. AGLE PIECE KE LIYE NAYA SESSION (Timer Reset to 0)
//       let nextProductionId = null;
//       if (updatedStatus !== "completed") {
//         const nextSession = await tx.productionResponse.create({
//           data: {
//             processId: schedule.processId,
//             stationUserId: employeeId,
//             partId: partId,
//             orderId: orderId,
//             order_type: order_type,
//             cycleTimeStart: now, // Naya timer yahin se shuru
//             completedQuantity: 0,
//             scrap: false,
//           },
//         });
//         nextProductionId = nextSession.id;
//       }

//       // 5. Stock Inventory Update
//       if (order_type.includes("Stock")) {
//         await tx.partNumber.update({
//           where: { part_id: partId },
//           data: { availStock: { increment: 1 } },
//         });
//       }

//       return {
//         message: "Scanned & Completed. Timer reset.",
//         status: updatedStatus,
//         newProductionId: nextProductionId, // Frontend will use this
//         isJobFinished: updatedStatus === "completed",
//       };
//     });

//     return res.status(200).json(result);
//   } catch (error) {
//     console.error("Scan Complete Error:", error);
//     res.status(500).json({ message: error.message });
//   }
// };
const scanCompleteAction = async (req, res) => {
  try {
    const { id: productionResponseId } = req.params;
    const { orderId, partId, employeeId, order_type } = req.body;
    const now = new Date();

    if (!orderId || !partId || !employeeId) {
      return res.status(400).json({ message: "Missing required data." });
    }

    const result = await prisma.$transaction(async (tx) => {
      const schedule = await tx.stockOrderSchedule.findFirst({
        where: {
          order_id: orderId,
          part_id: partId,
          order_type,
          isDeleted: false,
        },
      });
      if (!schedule) throw new Error("Job Schedule not found.");

      // 1. Current Session Close (Timer Stop for this piece)
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

      // Safety: Record Create if not updated (Race condition check)
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

      // 2. Schedule Update
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

      // 3. NEXT UNIT TIMER RESET (Important for UI)
      // let nextProductionId = null;
      // if (updatedStatus !== "completed") {
      //   const nextSession = await tx.productionResponse.create({
      //     data: {
      //       processId: schedule.processId,
      //       stationUserId: employeeId,
      //       partId: partId,
      //       orderId: orderId,
      //       order_type: order_type,
      //       cycleTimeStart: now, // Naya timer 0 se
      //       cycleTimeEnd: null, // Running timer
      //       completedQuantity: 0,
      //       scrap: false,
      //     },
      //   });
      //   nextProductionId = nextSession.id;
      // }
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
            cycleTimeStart: new Date(), // Naya Start Time
            completedQuantity: 0,
            scrap: false,
          },
        });
        nextProductionId = nextSession.id;
        nextCycleStartTime = nextSession.cycleTimeStart;
      }

      return {
        message: "Scrap recorded successfully.",
        newProductionId: nextProductionId,
        nextCycleStartTime: nextCycleStartTime, // Frontend ko reset ke liye de sakte hain
        isJobFinished: updatedStatus === "completed",
      };
      // 4. Update Avail Stock (Only for StockOrder)
      // if (order_type.includes("Stock")) {
      //   await tx.partNumber.update({
      //     where: { part_id: partId },
      //     data: { availStock: { increment: 1 } },
      //   });
      // }

      // return {
      //   status: updatedStatus,
      //   newProductionId: nextProductionId,
      //   isJobFinished: updatedStatus === "completed",
      // };
    });

    return res.status(200).json(result);
  } catch (error) {
    console.error("Scan Complete Error:", error);
    res.status(500).json({ message: error.message });
  }
};
// const scanScrapAction = async (req, res) => {
//   try {
//     const { id: productionResponseId } = req.params;
//     const { orderId, partId, employeeId, order_type } = req.body;

//     const result = await prisma.$transaction(async (tx) => {
//       const now = new Date();

//       const currentSession = await tx.productionResponse.findUnique({
//         where: { id: productionResponseId },
//       });

//       if (!currentSession) throw new Error("Station session not found.");

//       // 1. CLOSE current session as SCRAP
//       await tx.productionResponse.update({
//         where: { id: productionResponseId },
//         data: {
//           scrap: true,
//           scrapQuantity: 1,
//           cycleTimeEnd: now,
//           stationUserId: employeeId,
//         },
//       });

//       const nextSession = await tx.productionResponse.create({
//         data: {
//           processId: currentSession.processId,
//           stationUserId: employeeId,
//           partId: partId,
//           orderId: currentSession.orderId,
//           customOrderId: currentSession.customOrderId,
//           order_type: order_type,
//           cycleTimeStart: now,
//           completedQuantity: 0,
//         },
//       });

//       const schedule = await tx.stockOrderSchedule.findFirst({
//         where: {
//           order_id: orderId,
//           part_id: partId,
//           order_type,
//           isDeleted: false,
//         },
//       });

//       const newRemaining = Math.max(0, (schedule.remainingQty || 0) - 1);
//       await tx.stockOrderSchedule.update({
//         where: { id: schedule.id },
//         data: {
//           scrapQuantity: { increment: 1 },
//           remainingQty: newRemaining,
//           status: "progress",
//         },
//       });

//       await tx.scapEntries.create({
//         data: {
//           partId: partId,
//           processId: currentSession.processId,
//           returnQuantity: 1,
//           scrapStatus: true,
//           employeeId: employeeId,
//           type: order_type,
//           stockOrderId: order_type.includes("Stock") ? orderId : null,
//         },
//       });

//       return {
//         message: "Scrap added successfully",
//         newProductionId: nextSession.id,
//         remainingQty: newRemaining,
//       };
//     });

//     return res.status(200).json(result);
//   } catch (error) {
//     res.status(500).json({ message: error.message });
//   }
// };

// const scanScrapAction = async (req, res) => {
//   try {
//     const { id: productionResponseId } = req.params; // Station Session ID
//     const { orderId, partId, employeeId, order_type } = req.body;
//     const now = new Date();

//     if (!orderId || !partId || !employeeId) {
//       return res.status(400).json({ message: "Missing required data." });
//     }

//     const result = await prisma.$transaction(async (tx) => {
//       // 1. Pehle Job Schedule dhoondo (Taki counts aur processId mil sake)
//       const schedule = await tx.stockOrderSchedule.findFirst({
//         where: {
//           order_id: orderId,
//           part_id: partId,
//           order_type,
//           isDeleted: false,
//         },
//       });

//       if (!schedule) throw new Error("Job Schedule not found for this part.");

//       // 2. PRODUCTION RESPONSE KO UPDATE YA CREATE KAREIN (Safety Fix)
//       // Hum updateMany use karenge taaki agar ID galat ho toh crash na ho
//       let wasUpdated = false;
//       if (
//         productionResponseId &&
//         productionResponseId !== "null" &&
//         productionResponseId !== "undefined"
//       ) {
//         const updateResult = await tx.productionResponse.updateMany({
//           where: {
//             id: productionResponseId,
//             scrap: false,
//             completedQuantity: 0,
//           },
//           data: {
//             scrap: true,
//             scrapQuantity: 1,
//             cycleTimeEnd: now,
//             submittedDateTime: now,
//             stationUserId: employeeId,
//           },
//         });
//         if (updateResult.count > 0) wasUpdated = true;
//       }

//       // AGAR RECORD UPDATE NAHI HUA, TOH NAYA SCRAP RECORD BANAYEIN
//       // Isse aapka 4th scrap record kabhi miss nahi hoga
//       if (!wasUpdated) {
//         await tx.productionResponse.create({
//           data: {
//             processId: schedule.processId,
//             stationUserId: employeeId,
//             partId: partId,
//             orderId: orderId,
//             order_type: order_type,
//             cycleTimeStart: now,
//             cycleTimeEnd: now, // Turant close
//             scrap: true,
//             scrapQuantity: 1,
//             completedQuantity: 0,
//             submittedDateTime: now,
//           },
//         });
//       }

//       // 3. SCHEDULE TABLE UPDATE (Counter +1)
//       const newRemaining = Math.max(0, (schedule.remainingQty || 0) - 1);
//       await tx.stockOrderSchedule.update({
//         where: { id: schedule.id },
//         data: {
//           scrapQuantity: { increment: 1 },
//           remainingQty: newRemaining,
//           status: "progress",
//         },
//       });

//       // 4. NEXT UNIT KE LIYE NAYA TIMER (Reset to 0)
//       const nextSession = await tx.productionResponse.create({
//         data: {
//           processId: schedule.processId,
//           stationUserId: employeeId,
//           partId: partId,
//           orderId: orderId,
//           order_type: order_type,
//           cycleTimeStart: now, // Naya timer fresh 0 se
//           completedQuantity: 0,
//           scrap: false,
//         },
//       });

//       // 5. SCRAP ENTRIES LOG (Optional: Agar reports ke liye chahiye)
//       await tx.scapEntries.create({
//         data: {
//           partId: partId,
//           processId: schedule.processId,
//           returnQuantity: 1,
//           scrapStatus: true,
//           employeeId: employeeId,
//           type: order_type,
//           stockOrderId: order_type.includes("Stock") ? orderId : null,
//         },
//       });

//       return {
//         message: "Scanned & Scrapped successfully. Timer reset.",
//         newProductionId: nextSession.id,
//         remainingQty: newRemaining,
//       };
//     });

//     return res.status(200).json(result);
//   } catch (error) {
//     console.error("Scan Scrap Error:", error);
//     res.status(500).json({ message: error.message });
//   }
// };
// const scanScrapAction = async (req, res) => {
//   try {
//     const { id: productionResponseId } = req.params;
//     const { orderId, partId, employeeId, order_type } = req.body;
//     const now = new Date();

//     if (!orderId || !partId || !employeeId) {
//       return res.status(400).json({ message: "Missing required data." });
//     }

//     const result = await prisma.$transaction(async (tx) => {
//       const schedule = await tx.stockOrderSchedule.findFirst({
//         where: {
//           order_id: orderId,
//           part_id: partId,
//           order_type,
//           isDeleted: false,
//         },
//       });
//       if (!schedule) throw new Error("Job Schedule not found.");

//       // 1. Current Session Close as Scrap
//       let wasUpdated = false;
//       if (
//         productionResponseId &&
//         productionResponseId !== "null" &&
//         productionResponseId !== "undefined"
//       ) {
//         const updateResult = await tx.productionResponse.updateMany({
//           where: {
//             id: productionResponseId,
//             scrap: false,
//             completedQuantity: 0,
//           },
//           data: {
//             scrap: true,
//             scrapQuantity: 1,
//             cycleTimeEnd: now,
//             submittedDateTime: now,
//             stationUserId: employeeId,
//           },
//         });
//         if (updateResult.count > 0) wasUpdated = true;
//       }

//       if (!wasUpdated) {
//         await tx.productionResponse.create({
//           data: {
//             processId: schedule.processId,
//             stationUserId: employeeId,
//             partId: partId,
//             orderId: orderId,
//             order_type: order_type,
//             cycleTimeStart: now,
//             cycleTimeEnd: now,
//             scrap: true,
//             scrapQuantity: 1,
//             completedQuantity: 0,
//             submittedDateTime: now,
//           },
//         });
//       }

//       // 2. Update Schedule
//       const newRemaining = Math.max(0, (schedule.remainingQty || 0) - 1);
//       const updatedStatus = newRemaining <= 0 ? "completed" : "progress";

//       await tx.stockOrderSchedule.update({
//         where: { id: schedule.id },
//         data: {
//           scrapQuantity: { increment: 1 },
//           remainingQty: newRemaining,
//           status: updatedStatus,
//           completed_date: updatedStatus === "completed" ? now : undefined,
//         },
//       });

//       // 3. NEXT UNIT TIMER RESET
//       let nextProductionId = null;
//       if (updatedStatus !== "completed") {
//         const nextSession = await tx.productionResponse.create({
//           data: {
//             processId: schedule.processId,
//             stationUserId: employeeId,
//             partId: partId,
//             orderId: orderId,
//             order_type: order_type,
//             cycleTimeStart: now, // RESET TIMER
//             cycleTimeEnd: null,
//             completedQuantity: 0,
//             scrap: false,
//           },
//         });
//         nextProductionId = nextSession.id;
//       }

//       return {
//         message: "Scrapped successfully. Timer reset.",
//         newProductionId: nextProductionId,
//         isJobFinished: updatedStatus === "completed",
//       };
//     });

//     return res.status(200).json(result);
//   } catch (error) {
//     console.error("Scan Scrap Error:", error);
//     res.status(500).json({ message: error.message });
//   }
// };

const scanScrapAction = async (req, res) => {
  try {
    const { id: productionResponseId } = req.params;
    const { orderId, partId, employeeId, order_type } = req.body;
    const now = new Date();

    const result = await prisma.$transaction(async (tx) => {
      const schedule = await tx.stockOrderSchedule.findFirst({
        where: {
          order_id: orderId,
          part_id: partId,
          order_type,
          isDeleted: false,
        },
      });
      if (!schedule) throw new Error("Job Schedule not found.");

      // 1. Close scrapped unit
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

      const newRemaining = Math.max(0, (schedule.remainingQty || 0) - 1);
      const updatedStatus = newRemaining <= 0 ? "completed" : "progress";

      // 2. Open NEW unit for Reset
      const nextSession = await tx.productionResponse.create({
        data: {
          processId: schedule.processId,
          stationUserId: employeeId,
          partId: partId,
          orderId: orderId,
          order_type: order_type,
          cycleTimeStart: now, // NEW TIMER STARTS NOW
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
    });
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
