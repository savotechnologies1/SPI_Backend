// // const prisma = require("../config/prisma");
// // const { paginationQuery, pagination } = require("../functions/common");

// // // const stationLogin = async (req, res) => {
// // //   try {
// // //     const { processId, stationUserId, type } = req.body;
// // //     let nextJob = await prisma.stockOrderSchedule.findFirst({
// // //       where: {
// // //         processId,
// // //         status: "progress",
// // //         isDeleted: false,
// // //       },
// // //       orderBy: {
// // //         createdAt: "asc",
// // //       },
// // //       include: {
// // //         order: { select: { orderNumber: true } },
// // //         part: {
// // //           select: {
// // //             minStock: true,
// // //             WorkInstruction: { include: { steps: true } },
// // //           },
// // //         },
// // //       },
// // //     });
// // //     if (!nextJob) {
// // //       nextJob = await prisma.stockOrderSchedule.findFirst({
// // //         where: {
// // //           processId,
// // //           status: "new",
// // //           isDeleted: false,
// // //         },
// // //         orderBy: {
// // //           createdAt: "asc",
// // //         },
// // //         include: {
// // //           order: { select: { orderNumber: true } },
// // //           part: {
// // //             select: {
// // //               minStock: true,
// // //               WorkInstruction: { include: { steps: true } },
// // //             },
// // //           },
// // //         },
// // //       });
// // //     }
// // //     if (!nextJob) {
// // //       return res.status(404).json({
// // //         message: "No available jobs found for this station at the moment.",
// // //       });
// // //     }
// // //     const instruction = nextJob?.part?.WorkInstruction?.[0];
// // //     const steps = instruction?.steps || [];
// // //     const scheduleQuantity = (nextJob.quantity || 0) * nextJob.part.minStock;
// // //     const remainingQty = scheduleQuantity;
// // //     const processLoginData = await prisma.productionResponse.create({
// // //       data: {
// // //         process: { connect: { id: processId } },
// // //         StockOrder: { connect: { id: nextJob.order_id } },
// // //         PartNumber: { connect: { part_id: nextJob.part_id } },
// // //         employeeInfo: { connect: { id: stationUserId } },
// // //         type,
// // //         instructionId: instruction?.id || null,
// // //         scrap: null,
// // //         cycleTimeStart: new Date(),
// // //         cycleTimeEnd: null,
// // //         scheduleQuantity: scheduleQuantity,
// // //         remainingQty: remainingQty,
// // //       },
// // //     });

// // //     if (type === "training" && steps.length > 0) {
// // //       const { employeeId, processId, partId } = processLoginData;
// // //       const existingTraining = await prisma.productionResponse.findFirst({
// // //         where: {
// // //           employeeId: employeeId,
// // //           processId: processId,
// // //           partId: partId,
// // //           traniningStatus: true,
// // //         },
// // //       });
// // //       if (existingTraining) {
// // //         return res.status(409).send({
// // //           message:
// // //             "You have already completed this process and related parts traning  . please choose different process and parts",
// // //         });
// // //       } else {
// // //         const trackingEntries = steps.map((step, index) => ({
// // //           productionResponseId: processLoginData.id,
// // //           workInstructionStepId: step.id,
// // //           status: "pending",
// // //           stepStartTime: index === 0 ? new Date() : null,
// // //           stepEndTime: null,
// // //         }));

// // //         await prisma.productionStepTracking.createMany({
// // //           data: trackingEntries,
// // //         });
// // //       }
// // //     }
// // //     return res.status(200).json({
// // //       message: `You have successfully logged into station. Assigned to order: ${nextJob.order.orderNumber}`,
// // //       data: processLoginData,
// // //     });
// // //   } catch (error) {
// // //     console.error("Error during process login:", error);
// // //     return res.status(500).send({
// // //       message: "Something went wrong. Please try again later.",
// // //       error: error.message,
// // //     });
// // //   }
// // // };

// // // const stationLogin = async (req, res) => {
// // //   try {
// // //     const { processId, stationUserId, type } = req.body;

// // //     let nextJob = null;

// // //     // 1️⃣ First check for PART jobs in progress
// // //     nextJob = await prisma.stockOrderSchedule.findFirst({
// // //       where: {
// // //         processId,
// // //         status: "progress",
// // //         isDeleted: false,
// // //         type: "part", // <-- field that identifies part jobs
// // //       },
// // //       orderBy: { createdAt: "asc" },
// // //       include: {
// // //         order: { select: { orderNumber: true, productQuantity: true } },
// // //         part: {
// // //           select: {
// // //             minStock: true,
// // //             WorkInstruction: { include: { steps: true } },
// // //           },
// // //         },
// // //       },
// // //     });

// // //     // 2️⃣ If no part job in progress, check for NEW part job
// // //     if (!nextJob) {
// // //       nextJob = await prisma.stockOrderSchedule.findFirst({
// // //         where: {
// // //           processId,
// // //           status: "new",
// // //           isDeleted: false,
// // //           type: "part",
// // //         },
// // //         orderBy: { createdAt: "asc" },
// // //         include: {
// // //           order: { select: { orderNumber: true, productQuantity: true } },
// // //           part: {
// // //             select: {
// // //               minStock: true,
// // //               WorkInstruction: { include: { steps: true } },
// // //             },
// // //           },
// // //         },
// // //       });
// // //     }

// // //     if (!nextJob) {
// // //       nextJob = await prisma.stockOrderSchedule.findFirst({
// // //         where: {
// // //           processId,
// // //           status: "progress",
// // //           isDeleted: false,
// // //           type: "product",
// // //         },
// // //         orderBy: { createdAt: "asc" },
// // //         include: {
// // //           order: { select: { orderNumber: true, productQuantity: true } },
// // //           part: {
// // //             select: {
// // //               minStock: true,
// // //               WorkInstruction: { include: { steps: true } },
// // //             },
// // //           },
// // //         },
// // //       });
// // //     }
// // //     if (!nextJob) {
// // //       nextJob = await prisma.stockOrderSchedule.findFirst({
// // //         where: {
// // //           processId,
// // //           status: "new",
// // //           isDeleted: false,
// // //           type: "product",
// // //         },
// // //         orderBy: { createdAt: "asc" },
// // //         include: {
// // //           order: { select: { orderNumber: true, productQuantity: true } },
// // //           part: {
// // //             select: {
// // //               minStock: true,
// // //               WorkInstruction: { include: { steps: true } },
// // //             },
// // //           },
// // //         },
// // //       });
// // //     }

// // //     // ❌ If nothing found at all
// // //     if (!nextJob) {
// // //       return res.status(404).json({
// // //         message: "No available jobs found for this station at the moment.",
// // //       });
// // //     }

// // //     // Determine schedule quantity: PART jobs = quantity * minStock, PRODUCT jobs = productQuantity
// // //     let scheduleQuantity =
// // //       nextJob.type === "part"
// // //         ? (nextJob.quantity || 0) * nextJob.part.minStock
// // //         : nextJob.order.productQuantity || 0;

// // //     const instruction = nextJob?.part?.WorkInstruction?.[0];
// // //     const steps = instruction?.steps || [];

// // //     const processLoginData = await prisma.productionResponse.create({
// // //       data: {
// // //         process: { connect: { id: processId } },
// // //         StockOrder: { connect: { id: nextJob.order_id } },
// // //         PartNumber: { connect: { part_id: nextJob.part_id } },
// // //         employeeInfo: { connect: { id: stationUserId } },
// // //         type,
// // //         instructionId: instruction?.id || null,
// // //         scrap: null,
// // //         cycleTimeStart: new Date(),
// // //         cycleTimeEnd: null,
// // //         scheduleQuantity: scheduleQuantity,
// // //         remainingQty: scheduleQuantity,
// // //       },
// // //     });

// // //     // Training logic unchanged
// // //     if (type === "training" && steps.length > 0) {
// // //       const { employeeId, processId, partId } = processLoginData;
// // //       const existingTraining = await prisma.productionResponse.findFirst({
// // //         where: {
// // //           employeeId,
// // //           processId,
// // //           partId,
// // //           traniningStatus: true,
// // //         },
// // //       });

// // //       if (existingTraining) {
// // //         return res.status(409).send({
// // //           message:
// // //             "You have already completed this process and related parts training. Please choose a different process and part.",
// // //         });
// // //       } else {
// // //         const trackingEntries = steps.map((step, index) => ({
// // //           productionResponseId: processLoginData.id,
// // //           workInstructionStepId: step.id,
// // //           status: "pending",
// // //           stepStartTime: index === 0 ? new Date() : null,
// // //           stepEndTime: null,
// // //         }));

// // //         await prisma.productionStepTracking.createMany({
// // //           data: trackingEntries,
// // //         });
// // //       }
// // //     }

// // //     return res.status(200).json({
// // //       message: `You have successfully logged into station. Assigned to order: ${nextJob.order.orderNumber}`,
// // //       data: processLoginData,
// // //     });
// // //   } catch (error) {
// // //     console.error("Error during process login:", error);
// // //     return res.status(500).send({
// // //       message: "Something went wrong. Please try again later.",
// // //       error: error.message,
// // //     });
// // //   }
// // // };

// // const stationLogin = async (req, res) => {
// //   try {
// //     const { processId, stationUserId, type } = req.body;

// //     // Use the new helper to find the next job for this station
// //     const nextJob = await findNextJobForStation(prisma, processId);

// //     if (!nextJob) {
// //       return res.status(404).json({
// //         message: "No available jobs found for this station at the moment.",
// //       });
// //     }

// //     // Determine schedule quantity
// //     const scheduleQuantity =
// //       nextJob.type === "part"
// //         ? (nextJob.quantity || 0) * (nextJob.part?.minStock || 1)
// //         : nextJob.order?.productQuantity || 0;

// //     const instruction = nextJob.part?.WorkInstruction?.[0];
// //     const steps = instruction?.steps || [];

// //     // Create the production response record for this login
// //     const processLoginData = await prisma.productionResponse.create({
// //       data: {
// //         process: { connect: { id: processId } },
// //         StockOrder: { connect: { id: nextJob.order_id } },
// //         PartNumber: { connect: { part_id: nextJob.part_id } },
// //         employeeInfo: { connect: { id: stationUserId } },
// //         type,
// //         instructionId: instruction?.id || null,
// //         cycleTimeStart: new Date(),
// //         scheduleQuantity: scheduleQuantity,
// //         remainingQty: scheduleQuantity, // Initially, remaining is the total
// //       },
// //     });

// //     // --- Training logic remains the same ---
// //     if (type === "training" && steps.length > 0) {
// //       // ... your existing training logic ...
// //     }

// //     return res.status(200).json({
// //       message: `You have successfully logged into station. Assigned to order: ${nextJob.order.orderNumber}`,
// //       data: { ...processLoginData, nextJob }, // Return both login data and the assigned job
// //     });
// //   } catch (error) {
// //     console.error("Error during process login:", error);
// //     return res.status(500).send({
// //       message: "Something went wrong. Please try again later.",
// //       error: error.message,
// //     });
// //   }
// // };
// // const stationLogout = async (req, res) => {
// //   try {
// //     const { id } = req.params;
// //     if (!id) {
// //       return res.status(400).json({
// //         message: "Production Response ID is required to logout.",
// //       });
// //     }

// //     const updatedResponse = await prisma.productionResponse.update({
// //       where: {
// //         id: id,
// //       },
// //       data: {
// //         cycleTimeEnd: new Date(),
// //       },
// //     });

// //     if (!updatedResponse) {
// //       return res.status(404).json({
// //         message: "Login record not found. Cannot logout.",
// //       });
// //     }
// //     const startTime = new Date(updatedResponse.cycleTimeStart);
// //     const endTime = new Date(updatedResponse.cycleTimeEnd);
// //     const durationInSeconds = (endTime - startTime) / 1000;

// //     return res.status(200).json({
// //       message: "You have successfully logged out.",
// //       data: {
// //         ...updatedResponse,
// //         durationInSeconds: durationInSeconds.toFixed(2),
// //       },
// //     });
// //   } catch (error) {
// //     console.error("Error during process logout:", error);
// //     return res.status(500).send({
// //       message: "Something went wrong during logout. Please try again later.",
// //       error: error.message,
// //     });
// //   }
// // };

// // // const getScheduleProcessInformation = async (req, res) => {
// // //   try {
// // //     const orderId = req.params.id;
// // //     const user = req.user;
// // //     const { stationUserId } = req.body;
// // //     const data = await prisma.stockOrder.findUnique({
// // //       where: {
// // //         id: orderId,
// // //       },
// // //       select: {
// // //         shipDate: true,
// // //         productQuantity: true,
// // //         PartNumber: {
// // //           select: {
// // //             part_id: true,
// // //             partDescription: true,
// // //             cycleTime: true,
// // //             partNumber: true,
// // //             processId: true,
// // //           },
// // //         },
// // //       },
// // //     });
// // //     const employeeId = user?.id || stationUserId;
// // //     const employeeInfo = await prisma.employee.findUnique({
// // //       where: {
// // //         id: employeeId,
// // //       },
// // //       select: {
// // //         firstName: true,
// // //         lastName: true,
// // //         email: true,
// // //       },
// // //     });
// // //     if (!data) {
// // //       return res.status(404).json({ message: "Stock order not found" });
// // //     }

// // //     if (!data.PartNumber || !data.PartNumber.part_id) {
// // //       return res.status(404).json({ message: "Part information not found" });
// // //     }

// // //     const workInstructionData = await prisma.workInstruction.findMany({
// // //       where: {
// // //         productId: data.PartNumber.part_id,
// // //       },
// // //       select: {
// // //         instructionTitle: true,
// // //         steps: {
// // //           select: {
// // //             title: true,
// // //             stepNumber: true,
// // //             instruction: true,
// // //             images: {
// // //               select: {
// // //                 id: true,
// // //                 imagePath: true,
// // //               },
// // //             },
// // //             videos: {
// // //               select: {
// // //                 id: true,
// // //                 videoPath: true,
// // //               },
// // //             },
// // //           },
// // //         },
// // //       },
// // //     });

// // //     return res.status(200).json({
// // //       message: "Process information retrieved successfully!",
// // //       data: {
// // //         orderInformation: data,
// // //         workInstructionData,
// // //         employeeInfo,
// // //       },
// // //     });
// // //   } catch (error) {
// // //     console.log("errorerror", error);

// // //     return res.status(500).json({
// // //       message: "Something went wrong. Please try again later.",
// // //     });
// // //   }
// // // };

// // // This is your function

// // // const getScheduleProcessInformation = async (req, res) => {
// // //   try {
// // //     const { id } = req.params;
// // //     console.log("req.params for schedule process:", req.params);

// // //     if (!id) {
// // //       return res.status(400).json({ message: "processId is required." });
// // //     }

// // //     const nextJob = await prisma.stockOrderSchedule.findFirst({
// // //       where: {
// // //         processId: id,
// // //         status: "new",
// // //         isDeleted: false,
// // //       },
// // //       orderBy: {
// // //         createdAt: "asc",
// // //       },
// // //       include: {
// // //         order: {
// // //           select: {
// // //             id: true,
// // //             orderNumber: true,
// // //             productQuantity: true,
// // //             shipDate: true,
// // //             createdAt: true,
// // //           },
// // //         },
// // //         part: {
// // //           include: {
// // //             WorkInstruction: {
// // //               include: {
// // //                 steps: {
// // //                   orderBy: {
// // //                     stepNumber: "asc",
// // //                   },
// // //                   include: {
// // //                     images: {
// // //                       select: {
// // //                         id: true,
// // //                         imagePath: true,
// // //                       },
// // //                     },
// // //                     videos: {
// // //                       select: {
// // //                         id: true,
// // //                         videoPath: true,
// // //                       },
// // //                     },
// // //                   },
// // //                 },
// // //               },
// // //             },
// // //           },
// // //         },
// // //         process: {
// // //           select: {
// // //             processName: true,
// // //           },
// // //         },
// // //       },
// // //     });

// // //     if (!nextJob) {
// // //       return res
// // //         .status(404)
// // //         .json({ message: "No new jobs found for this station." });
// // //     }

// // //     const upcomingOrder = await prisma.stockOrderSchedule.findFirst({
// // //       where: {
// // //         order: {
// // //           createdAt: {
// // //             gte: nextJob.order.createdAt,
// // //           },
// // //         },
// // //         id: {
// // //           not: nextJob.id,
// // //         },
// // //       },
// // //       include: {
// // //         order: {
// // //           select: {
// // //             shipDate: true,
// // //           },
// // //         },
// // //       },
// // //       orderBy: {
// // //         createdAt: "asc",
// // //       },
// // //     });

// // //     const getProductionResponse = await prisma.productionResponse.findFirst({
// // //       where: {
// // //         processId: id,
// // //         isDeleted: false,
// // //       },
// // //       include: {
// // //         employeeInfo: {
// // //           select: {
// // //             firstName: true,
// // //             lastName: true,
// // //           },
// // //         },
// // //       },
// // //     });
// // //     console.log(
// // //       "getProductionResponsegetProductionResponse",
// // //       getProductionResponse
// // //     );

// // //     const responseData = {
// // //       ...nextJob,
// // //       productionId: getProductionResponse.id,
// // //       upcommingOrder: upcomingOrder?.order?.shipDate || null,
// // //       employeeInfo: getProductionResponse?.employeeInfo || null,
// // //       cycleTime: getProductionResponse?.cycleTimeStart,
// // //     };

// // //     res.status(200).json({
// // //       message: "Next job found successfully.",
// // //       data: responseData,
// // //     });
// // //   } catch (error) {
// // //     console.error("Error finding next job:", error);
// // //     res
// // //       .status(500)
// // //       .json({ message: "Something went wrong. Please try again later." });
// // //   }
// // // };

// // // const getScheduleProcessInformation = async (req, res) => {
// // //   try {
// // //     const { id: processId } = req.params;

// // //     if (!processId) {
// // //       return res.status(400).json({ message: "processId is required." });
// // //     }
// // //     // Include minStock from partNumber
// // //     let nextJob = await prisma.stockOrderSchedule.findFirst({
// // //       where: {
// // //         processId,
// // //         status: "progress",
// // //         isDeleted: false,
// // //       },
// // //       orderBy: { createdAt: "asc" },
// // //       include: {
// // //         order: {
// // //           select: {
// // //             id: true,
// // //             orderNumber: true,
// // //             productQuantity: true,
// // //             partId: true,
// // //             shipDate: true,
// // //             createdAt: true,
// // //           },
// // //         },
// // //         part: {
// // //           select: {
// // //             minStock: true,
// // //             partDescription: true,
// // //             WorkInstruction: {
// // //               include: {
// // //                 steps: {
// // //                   orderBy: { stepNumber: "asc" },
// // //                   include: {
// // //                     images: { select: { id: true, imagePath: true } },
// // //                     videos: { select: { id: true, videoPath: true } },
// // //                   },
// // //                 },
// // //               },
// // //             },
// // //           },
// // //         },
// // //         process: { select: { processName: true } },
// // //       },
// // //     });

// // //     // Agar "progress" job nahi mila to "new" wala find karo (yahan bhi same include rakhna)
// // //     if (!nextJob) {
// // //       nextJob = await prisma.stockOrderSchedule.findFirst({
// // //         where: {
// // //           processId,
// // //           status: "new",
// // //           isDeleted: false,
// // //         },
// // //         orderBy: { createdAt: "asc" },
// // //         include: {
// // //           order: {
// // //             select: {
// // //               id: true,
// // //               orderNumber: true,
// // //               productQuantity: true,
// // //               shipDate: true,
// // //               createdAt: true,
// // //             },
// // //           },
// // //           part: {
// // //             select: {
// // //               minStock: true, // ✅ direct field
// // //               WorkInstruction: {
// // //                 include: {
// // //                   steps: {
// // //                     orderBy: { stepNumber: "asc" },
// // //                     include: {
// // //                       images: { select: { id: true, imagePath: true } },
// // //                       videos: { select: { id: true, videoPath: true } },
// // //                     },
// // //                   },
// // //                 },
// // //               },
// // //             },
// // //           },

// // //           process: { select: { processName: true } },
// // //         },
// // //       });
// // //     }

// // //     if (!nextJob) {
// // //       return res
// // //         .status(404)
// // //         .json({ message: "No jobs found for this station." });
// // //     }

// // //     // Calculate scheduleQuantity
// // //     const minStock = nextJob.part.minStock;

// // //     const scheduleQuantity = (nextJob.quantity || 0) * minStock;

// // //     const remainingQty = scheduleQuantity - (nextJob.completedQuantity || 0);

// // //     const getProductionResponse = await prisma.productionResponse.findFirst({
// // //       where: {
// // //         processId,
// // //         isDeleted: false,
// // //       },
// // //       orderBy: { cycleTimeStart: "desc" },
// // //       include: {
// // //         employeeInfo: {
// // //           select: { firstName: true, lastName: true, id: true },
// // //         },
// // //       },
// // //     });

// // //     const upcomingOrder = await prisma.stockOrderSchedule.findFirst({
// // //       where: {
// // //         order: {
// // //           createdAt: {
// // //             gte: nextJob.order.createdAt,
// // //           },
// // //         },
// // //         id: { not: nextJob.id },
// // //       },
// // //       include: {
// // //         order: { select: { shipDate: true } },
// // //       },
// // //       orderBy: { createdAt: "asc" },
// // //     });

// // //     const responseData = {
// // //       ...nextJob,
// // //       productionId: getProductionResponse?.id || null,
// // //       upcommingOrder: upcomingOrder?.order?.shipDate || null,
// // //       employeeInfo: getProductionResponse?.employeeInfo || null,
// // //       cycleTime: getProductionResponse?.cycleTimeStart || null,
// // //       completedQty: getProductionResponse?.completedQuantity || 0,
// // //       scheduleQuantity,
// // //       remainingQty,
// // //       scrapQty: getProductionResponse?.scrapQuantity || 0,
// // //     };

// // //     res.status(200).json({
// // //       message: "Next job found successfully.",
// // //       data: responseData,
// // //     });

// // //     // let nextJob = await prisma.stockOrderSchedule.findFirst({
// // //     //   where: {
// // //     //     processId,
// // //     //     status: "progress",
// // //     //     isDeleted: false,
// // //     //   },
// // //     //   orderBy: { createdAt: "asc" },
// // //     //   include: {
// // //     //     order: {
// // //     //       select: {
// // //     //         id: true,
// // //     //         orderNumber: true,
// // //     //         productQuantity: true,
// // //     //         partId: true,
// // //     //         shipDate: true,
// // //     //         createdAt: true,
// // //     //       },
// // //     //     },
// // //     //     part: {
// // //     //       include: {
// // //     //         WorkInstruction: {
// // //     //           include: {
// // //     //             steps: {
// // //     //               orderBy: { stepNumber: "asc" },
// // //     //               include: {
// // //     //                 images: { select: { id: true, imagePath: true } },
// // //     //                 videos: { select: { id: true, videoPath: true } },
// // //     //               },
// // //     //             },
// // //     //           },
// // //     //         },
// // //     //       },
// // //     //     },
// // //     //     process: { select: { processName: true } },
// // //     //   },
// // //     // });

// // //     // if (!nextJob) {
// // //     //   nextJob = await prisma.stockOrderSchedule.findFirst({
// // //     //     where: {
// // //     //       processId,
// // //     //       status: "new",
// // //     //       isDeleted: false,
// // //     //     },
// // //     //     orderBy: { createdAt: "asc" },
// // //     //     include: {
// // //     //       order: {
// // //     //         select: {
// // //     //           id: true,
// // //     //           orderNumber: true,
// // //     //           productQuantity: true,
// // //     //           shipDate: true,
// // //     //           createdAt: true,
// // //     //         },
// // //     //       },
// // //     //       part: {
// // //     //         include: {
// // //     //           WorkInstruction: {
// // //     //             include: {
// // //     //               steps: {
// // //     //                 orderBy: { stepNumber: "asc" },
// // //     //                 include: {
// // //     //                   images: { select: { id: true, imagePath: true } },
// // //     //                   videos: { select: { id: true, videoPath: true } },
// // //     //                 },
// // //     //               },
// // //     //             },
// // //     //           },
// // //     //         },
// // //     //       },
// // //     //       process: { select: { processName: true } },
// // //     //     },
// // //     //   });
// // //     // }

// // //     // if (!nextJob) {
// // //     //   return res
// // //     //     .status(404)
// // //     //     .json({ message: "No jobs found for this station." });
// // //     // }
// // //     // console.log("nextJobnextJob", nextJob);

// // //     // const upcomingOrder = await prisma.stockOrderSchedule.findFirst({
// // //     //   where: {
// // //     //     order: {
// // //     //       createdAt: {
// // //     //         gte: nextJob.order.createdAt,
// // //     //       },
// // //     //     },
// // //     //     id: { not: nextJob.id },
// // //     //   },
// // //     //   include: {
// // //     //     order: { select: { shipDate: true } },
// // //     //   },
// // //     //   orderBy: { createdAt: "asc" },
// // //     // });

// // //     // const getProductionResponse = await prisma.productionResponse.findFirst({
// // //     //   where: {
// // //     //     processId,
// // //     //     isDeleted: false,
// // //     //   },
// // //     //   orderBy: { cycleTimeStart: "desc" },
// // //     //   include: {
// // //     //     employeeInfo: {
// // //     //       select: { firstName: true, lastName: true, id: true },
// // //     //     },
// // //     //   },
// // //     // });

// // //     // const remainingQty = nextJob.quantity - nextJob.completedQuantity;
// // //     // console.log("remainingQty", getProductionResponse.scrapQuantity);

// // //     // const responseData = {
// // //     //   ...nextJob,
// // //     //   productionId: getProductionResponse?.id || null,
// // //     //   upcommingOrder: upcomingOrder?.order?.shipDate || null,
// // //     //   employeeInfo: getProductionResponse?.employeeInfo || null,
// // //     //   cycleTime: getProductionResponse?.cycleTimeStart || null,
// // //     //   completedQty: getProductionResponse?.completedQuantity || 0,
// // //     //   remainingQty: remainingQty || nextJob.quantity,
// // //     //   scrapQty: getProductionResponse.scrapQuantity || 0,
// // //     // };

// // //     // res.status(200).json({
// // //     //   message: "Next job found successfully.",
// // //     //   data: responseData,
// // //     // });
// // //   } catch (error) {
// // //     console.error("Error finding next job:", error);
// // //     res.status(500).json({ message: "Something went wrong." });
// // //   }
// // // };

// // // const getScheduleProcessInformation = async (req, res) => {
// // //   try {
// // //     const { id: processId } = req.params;

// // //     if (!processId) {
// // //       return res.status(400).json({ message: "processId is required." });
// // //     }

// // //     let nextJob = null;

// // //     // 1️⃣ PART JOBS FIRST - In Progress
// // //     nextJob = await prisma.stockOrderSchedule.findFirst({
// // //       where: {
// // //         processId,
// // //         status: "progress",
// // //         isDeleted: false,
// // //         type: "part", // Needs to exist in your schema
// // //       },
// // //       orderBy: { createdAt: "asc" },
// // //       include: {
// // //         order: {
// // //           select: {
// // //             id: true,
// // //             orderNumber: true,
// // //             productQuantity: true,
// // //             partId: true,
// // //             shipDate: true,
// // //             createdAt: true,
// // //           },
// // //         },
// // //         part: {
// // //           select: {
// // //             minStock: true,
// // //             partDescription: true,
// // //             WorkInstruction: {
// // //               include: {
// // //                 steps: {
// // //                   orderBy: { stepNumber: "asc" },
// // //                   include: {
// // //                     images: { select: { id: true, imagePath: true } },
// // //                     videos: { select: { id: true, videoPath: true } },
// // //                   },
// // //                 },
// // //               },
// // //             },
// // //           },
// // //         },
// // //         process: { select: { processName: true } },
// // //       },
// // //     });

// // //     // 2️⃣ PART JOBS - New
// // //     if (!nextJob) {
// // //       nextJob = await prisma.stockOrderSchedule.findFirst({
// // //         where: {
// // //           processId,
// // //           status: "new",
// // //           isDeleted: false,
// // //           type: "part",
// // //         },
// // //         orderBy: { createdAt: "asc" },
// // //         include: {
// // //           order: {
// // //             select: {
// // //               id: true,
// // //               orderNumber: true,
// // //               productQuantity: true,
// // //               partId: true,
// // //               shipDate: true,
// // //               createdAt: true,
// // //             },
// // //           },
// // //           part: {
// // //             select: {
// // //               minStock: true,
// // //               partDescription: true,
// // //               WorkInstruction: {
// // //                 include: {
// // //                   steps: {
// // //                     orderBy: { stepNumber: "asc" },
// // //                     include: {
// // //                       images: { select: { id: true, imagePath: true } },
// // //                       videos: { select: { id: true, videoPath: true } },
// // //                     },
// // //                   },
// // //                 },
// // //               },
// // //             },
// // //           },
// // //           process: { select: { processName: true } },
// // //         },
// // //       });
// // //     }

// // //     // 3️⃣ IF NO PART JOB → go to PRODUCT JOB for same product/order
// // //     if (!nextJob) {
// // //       nextJob = await prisma.stockOrderSchedule.findFirst({
// // //         where: {
// // //           processId,
// // //           status: { in: ["progress", "new"] },
// // //           isDeleted: false,
// // //           type: "product",
// // //         },
// // //         orderBy: { createdAt: "asc" },
// // //         include: {
// // //           order: {
// // //             select: {
// // //               id: true,
// // //               orderNumber: true,
// // //               productQuantity: true,
// // //               partId: true,
// // //               shipDate: true,
// // //               createdAt: true,
// // //             },
// // //           },
// // //           part: {
// // //             select: {
// // //               minStock: true,
// // //               partDescription: true,
// // //               WorkInstruction: {
// // //                 include: {
// // //                   steps: {
// // //                     orderBy: { stepNumber: "asc" },
// // //                     include: {
// // //                       images: { select: { id: true, imagePath: true } },
// // //                       videos: { select: { id: true, videoPath: true } },
// // //                     },
// // //                   },
// // //                 },
// // //               },
// // //             },
// // //           },
// // //           process: { select: { processName: true } },
// // //         },
// // //       });
// // //     }

// // //     if (!nextJob) {
// // //       return res
// // //         .status(404)
// // //         .json({ message: "No jobs found for this station." });
// // //     }

// // //     // 4️⃣ QUANTITY CALCULATION
// // //     let scheduleQuantity = 0;
// // //     if (nextJob.type === "part") {
// // //       scheduleQuantity = (nextJob.quantity || 0) * (nextJob.part.minStock || 0);
// // //     } else {
// // //       scheduleQuantity = nextJob.order.productQuantity || 0;
// // //     }

// // //     const remainingQty = scheduleQuantity - (nextJob.completedQuantity || 0);

// // //     const getProductionResponse = await prisma.productionResponse.findFirst({
// // //       where: {
// // //         processId,
// // //         isDeleted: false,
// // //       },
// // //       orderBy: { cycleTimeStart: "desc" },
// // //       include: {
// // //         employeeInfo: {
// // //           select: { firstName: true, lastName: true, id: true },
// // //         },
// // //       },
// // //     });

// // //     const upcomingOrder = await prisma.stockOrderSchedule.findFirst({
// // //       where: {
// // //         order: {
// // //           createdAt: {
// // //             gte: nextJob.order.createdAt,
// // //           },
// // //         },
// // //         id: { not: nextJob.id },
// // //       },
// // //       include: {
// // //         order: { select: { shipDate: true } },
// // //       },
// // //       orderBy: { createdAt: "asc" },
// // //     });

// // //     const responseData = {
// // //       ...nextJob,
// // //       productionId: getProductionResponse?.id || null,
// // //       upcommingOrder: upcomingOrder?.order?.shipDate || null,
// // //       employeeInfo: getProductionResponse?.employeeInfo || null,
// // //       cycleTime: getProductionResponse?.cycleTimeStart || null,
// // //       completedQty: getProductionResponse?.completedQuantity || 0,
// // //       scheduleQuantity,
// // //       remainingQty,
// // //       scrapQty: getProductionResponse?.scrapQuantity || 0,
// // //     };

// // //     res.status(200).json({
// // //       message: "Next job found successfully.",
// // //       data: responseData,
// // //     });
// // //   } catch (error) {
// // //     console.error("Error finding next job:", error);
// // //     res.status(500).json({ message: "Something went wrong." });
// // //   }
// // // };

// // // const getScheduleProcessInformation = async (req, res) => {
// // //   try {
// // //     const { id: processId } = req.params;

// // //     if (!processId) {
// // //       return res.status(400).json({ message: "processId is required." });
// // //     }

// // //     // PRIORITY 1: Any "in-progress" PART job.
// // //     let tempNextJob = await prisma.stockOrderSchedule.findFirst({
// // //       where: {
// // //         processId,
// // //         status: "progress",
// // //         isDeleted: false,
// // //         type: "part",
// // //       },
// // //       orderBy: { createdAt: "asc" },
// // //       select: { id: true },
// // //     });

// // //     // PRIORITY 2: The oldest "new" PART job.
// // //     if (!tempNextJob) {
// // //       tempNextJob = await prisma.stockOrderSchedule.findFirst({
// // //         where: {
// // //           processId,
// // //           status: "new",
// // //           isDeleted: false,
// // //           type: "part",
// // //         },
// // //         orderBy: { createdAt: "asc" },
// // //         select: { id: true },
// // //       });
// // //     }

// // //     // PRIORITY 3: A PRODUCT job, with the corrected relation name.
// // //     if (!tempNextJob) {
// // //       tempNextJob = await prisma.stockOrderSchedule.findFirst({
// // //         where: {
// // //           processId,
// // //           status: { in: ["progress", "new"] },
// // //           isDeleted: false,
// // //           type: "product",
// // //           order: {
// // //             // === YEH CORRECTED LOGIC HAI ===
// // //             // Ab yeh 'schedules' field aapke StockOrder model mein मौजूद hai
// // //             schedules: {
// // //               none: {
// // //                 processId: processId,
// // //                 type: "product",
// // //                 status: { in: ["new", "progress"] },
// // //                 isDeleted: false,
// // //               },
// // //             },
// // //           },
// // //         },
// // //         orderBy: { createdAt: "asc" },
// // //         select: { id: true },
// // //       });
// // //     }

// // //     if (!tempNextJob) {
// // //       return res
// // //         .status(404)
// // //         .json({ message: "No eligible jobs found for this station." });
// // //     }

// // //     // Fetch the full details of the job we found.
// // //     const nextJob = await prisma.stockOrderSchedule.findUnique({
// // //       where: { id: tempNextJob.id },
// // //       include: {
// // //         order: {
// // //           select: {
// // //             id: true,
// // //             orderNumber: true,
// // //             productQuantity: true,
// // //             partId: true,
// // //             shipDate: true,
// // //             createdAt: true,
// // //           },
// // //         },
// // //         part: {
// // //           select: {
// // //             minStock: true,
// // //             partDescription: true,
// // //             WorkInstruction: {
// // //               include: {
// // //                 steps: {
// // //                   orderBy: { stepNumber: "asc" },
// // //                   include: {
// // //                     images: { select: { id: true, imagePath: true } },
// // //                     videos: { select: { id: true, videoPath: true } },
// // //                   },
// // //                 },
// // //               },
// // //             },
// // //           },
// // //         },
// // //         process: { select: { processName: true } },
// // //       },
// // //     });

// // //     // --- The rest of your logic remains the same ---
// // //     let scheduleQuantity = 0;
// // //     if (nextJob.type === "part") {
// // //       scheduleQuantity =
// // //         (nextJob.quantity || 0) * (nextJob.part?.minStock || 0);
// // //     } else {
// // //       scheduleQuantity = nextJob.order.productQuantity || 0;
// // //     }

// // //     const remainingQty = scheduleQuantity - (nextJob.completedQuantity || 0);

// // //     const getProductionResponse = await prisma.productionResponse.findFirst({
// // //       where: {
// // //         orderId: nextJob.order_id,
// // //         processId: nextJob.processId,
// // //         isDeleted: false,
// // //       },
// // //       orderBy: { cycleTimeStart: "desc" },
// // //       include: {
// // //         employeeInfo: {
// // //           select: { firstName: true, lastName: true, id: true },
// // //         },
// // //       },
// // //     });

// // //     const upcomingOrder = await prisma.stockOrderSchedule.findFirst({
// // //       where: {
// // //         createdAt: { gte: nextJob.createdAt },
// // //         id: { not: nextJob.id },
// // //         processId: processId,
// // //       },
// // //       include: {
// // //         order: { select: { shipDate: true } },
// // //       },
// // //       orderBy: { createdAt: "asc" },
// // //     });

// // //     const responseData = {
// // //       ...nextJob,
// // //       productionId: getProductionResponse?.id || null,
// // //       upcommingOrder: upcomingOrder?.order?.shipDate || null,
// // //       employeeInfo: getProductionResponse?.employeeInfo || null,
// // //       cycleTime: getProductionResponse?.cycleTimeStart || null,
// // //       completedQty: nextJob.completedQuantity || 0,
// // //       scheduleQuantity,
// // //       remainingQty,
// // //       scrapQty: nextJob.scrapQuantity || 0,
// // //     };

// // //     res.status(200).json({
// // //       message: "Next job found successfully.",
// // //       data: responseData,
// // //     });
// // //   } catch (error) {
// // //     console.error("Error finding next job:", error);
// // //     res.status(500).json({ message: "Something went wrong." });
// // //   }
// // // };

// // // const getScheduleProcessInformation = async (req, res) => {
// // //   try {
// // //     const { id: processId } = req.params;

// // //     if (!processId) {
// // //       return res.status(400).json({ message: "processId is required." });
// // //     }

// // //     let nextJob = await prisma.stockOrderSchedule.findFirst({
// // //       where: {
// // //         processId,
// // //         status: "progress",
// // //         isDeleted: false,
// // //       },
// // //       orderBy: { createdAt: "asc" },
// // //       include: {
// // //         order: {
// // //           select: {
// // //             id: true,
// // //             orderNumber: true,
// // //             productQuantity: true,
// // //             partId: true,
// // //             shipDate: true,
// // //             createdAt: true,
// // //           },
// // //         },
// // //         part: {
// // //           include: {
// // //             WorkInstruction: {
// // //               include: {
// // //                 steps: {
// // //                   orderBy: { stepNumber: "asc" },
// // //                   include: {
// // //                     images: { select: { id: true, imagePath: true } },
// // //                     videos: { select: { id: true, videoPath: true } },
// // //                   },
// // //                 },
// // //               },
// // //             },
// // //           },
// // //         },
// // //         process: { select: { processName: true } },
// // //       },
// // //     });

// // //     if (!nextJob) {
// // //       nextJob = await prisma.stockOrderSchedule.findFirst({
// // //         where: {
// // //           processId,
// // //           status: "new",
// // //           isDeleted: false,
// // //         },
// // //         orderBy: { createdAt: "asc" },
// // //         include: {
// // //           order: {
// // //             select: {
// // //               id: true,
// // //               orderNumber: true,
// // //               productQuantity: true,
// // //               shipDate: true,
// // //               createdAt: true,
// // //             },
// // //           },
// // //           part: {
// // //             include: {
// // //               WorkInstruction: {
// // //                 include: {
// // //                   steps: {
// // //                     orderBy: { stepNumber: "asc" },
// // //                     include: {
// // //                       images: { select: { id: true, imagePath: true } },
// // //                       videos: { select: { id: true, videoPath: true } },
// // //                     },
// // //                   },
// // //                 },
// // //               },
// // //             },
// // //           },
// // //           process: { select: { processName: true } },
// // //         },
// // //       });
// // //     }

// // //     if (!nextJob) {
// // //       return res
// // //         .status(404)
// // //         .json({ message: "No jobs found for this station." });
// // //     }
// // //     console.log("nextJobnextJob", nextJob);

// // //     const upcomingOrder = await prisma.stockOrderSchedule.findFirst({
// // //       where: {
// // //         order: {
// // //           createdAt: {
// // //             gte: nextJob.order.createdAt,
// // //           },
// // //         },
// // //         id: { not: nextJob.id },
// // //       },
// // //       include: {
// // //         order: { select: { shipDate: true } },
// // //       },
// // //       orderBy: { createdAt: "asc" },
// // //     });

// // //     const getProductionResponse = await prisma.productionResponse.findFirst({
// // //       where: {
// // //         processId,
// // //         isDeleted: false,
// // //       },
// // //       orderBy: { cycleTimeStart: "desc" },
// // //       include: {
// // //         employeeInfo: {
// // //           select: { firstName: true, lastName: true, id: true },
// // //         },
// // //       },
// // //     });

// // //     const remainingQty = nextJob.quantity - nextJob.completedQuantity;
// // //     console.log("remainingQty", getProductionResponse.scrapQuantity);

// // //     const responseData = {
// // //       ...nextJob,
// // //       productionId: getProductionResponse?.id || null,
// // //       upcommingOrder: upcomingOrder?.order?.shipDate || null,
// // //       employeeInfo: getProductionResponse?.employeeInfo || null,
// // //       cycleTime: getProductionResponse?.cycleTimeStart || null,
// // //       completedQty: getProductionResponse?.completedQuantity || 0,
// // //       remainingQty: remainingQty || nextJob.quantity,
// // //       scrapQty: getProductionResponse.scrapQuantity || 0,
// // //     };

// // //     res.status(200).json({
// // //       message: "Next job found successfully.",
// // //       data: responseData,
// // //     });
// // //   } catch (error) {
// // //     console.error("Error finding next job:", error);
// // //     res.status(500).json({ message: "Something went wrong." });
// // //   }
// // // };

// // // before 12 aug
// // // const getScheduleProcessInformation = async (req, res) => {
// // //   try {
// // //     const { id: processId } = req.params;

// // //     if (!processId) {
// // //       return res.status(400).json({ message: "processId is required." });
// // //     }

// // //     let nextJob = await prisma.stockOrderSchedule.findFirst({
// // //       where: {
// // //         processId,
// // //         status: "progress",
// // //         isDeleted: false,
// // //       },
// // //       orderBy: { createdAt: "asc" },
// // //       include: {
// // //         order: {
// // //           select: {
// // //             id: true,
// // //             orderNumber: true,
// // //             productQuantity: true,
// // //             partId: true,
// // //             shipDate: true,
// // //             createdAt: true,
// // //           },
// // //         },
// // //         part: {
// // //           include: {
// // //             WorkInstruction: {
// // //               include: {
// // //                 steps: {
// // //                   orderBy: { stepNumber: "asc" },
// // //                   include: {
// // //                     images: { select: { id: true, imagePath: true } },
// // //                     videos: { select: { id: true, videoPath: true } },
// // //                   },
// // //                 },
// // //               },
// // //             },
// // //           },
// // //         },
// // //         process: { select: { processName: true } },
// // //       },
// // //     });

// // //     if (!nextJob) {
// // //       nextJob = await prisma.stockOrderSchedule.findFirst({
// // //         where: {
// // //           processId,
// // //           status: "new",
// // //           isDeleted: false,
// // //         },
// // //         orderBy: { createdAt: "asc" },
// // //         include: {
// // //           order: {
// // //             select: {
// // //               id: true,
// // //               orderNumber: true,
// // //               productQuantity: true,
// // //               shipDate: true,
// // //               createdAt: true,
// // //             },
// // //           },
// // //           part: {
// // //             include: {
// // //               WorkInstruction: {
// // //                 include: {
// // //                   steps: {
// // //                     orderBy: { stepNumber: "asc" },
// // //                     include: {
// // //                       images: { select: { id: true, imagePath: true } },
// // //                       videos: { select: { id: true, videoPath: true } },
// // //                     },
// // //                   },
// // //                 },
// // //               },
// // //             },
// // //           },
// // //           process: { select: { processName: true } },
// // //         },
// // //       });
// // //     }

// // //     if (!nextJob) {
// // //       return res
// // //         .status(404)
// // //         .json({ message: "No jobs found for this station." });
// // //     }
// // //     console.log("nextJobnextJob", nextJob);

// // //     const upcomingOrder = await prisma.stockOrderSchedule.findFirst({
// // //       where: {
// // //         order: {
// // //           createdAt: {
// // //             gte: nextJob.order.createdAt,
// // //           },
// // //         },
// // //         id: { not: nextJob.id },
// // //       },
// // //       include: {
// // //         order: { select: { shipDate: true } },
// // //       },
// // //       orderBy: { createdAt: "asc" },
// // //     });

// // //     const getProductionResponse = await prisma.productionResponse.findFirst({
// // //       where: {
// // //         processId,
// // //         isDeleted: false,
// // //       },
// // //       orderBy: { cycleTimeStart: "desc" },
// // //       include: {
// // //         employeeInfo: {
// // //           select: { firstName: true, lastName: true, id: true },
// // //         },
// // //       },
// // //     });

// // //     const remainingQty = nextJob.quantity - nextJob.completedQuantity;
// // //     console.log("remainingQty", getProductionResponse.scrapQuantity);

// // //     const responseData = {
// // //       ...nextJob,
// // //       productionId: getProductionResponse?.id || null,
// // //       upcommingOrder: upcomingOrder?.order?.shipDate || null,
// // //       employeeInfo: getProductionResponse?.employeeInfo || null,
// // //       cycleTime: getProductionResponse?.cycleTimeStart || null,
// // //       completedQty: getProductionResponse?.completedQuantity || 0,
// // //       remainingQty: remainingQty || nextJob.quantity,
// // //       scrapQty: getProductionResponse.scrapQuantity || 0,
// // //     };

// // //     res.status(200).json({
// // //       message: "Next job found successfully.",
// // //       data: responseData,
// // //     });
// // //   } catch (error) {
// // //     console.error("Error finding next job:", error);
// // //     res.status(500).json({ message: "Something went wrong." });
// // //   }
// // // };

// // // Get the next job details for a specific process (station)
// // // const getScheduleProcessInformation = async (req, res) => {
// // //   try {
// // //     const { id: processId } = req.params;

// // //     if (!processId) {
// // //       return res.status(400).json({ message: "processId is required." });
// // //     }

// // //     // First, look for a job that is already 'in progress' for this station.
// // //     let nextJob = await prisma.stockOrderSchedule.findFirst({
// // //       where: {
// // //         processId,
// // //         status: "progress",
// // //         isDeleted: false,
// // //       },
// // //       orderBy: { createdAt: "asc" }, // Get the oldest one
// // //       // Include all necessary related data
// // //       include: {
// // //         order: {
// // //           select: {
// // //             id: true,
// // //             orderNumber: true,
// // //             productQuantity: true,
// // //             shipDate: true,
// // //           },
// // //         },
// // //         part: {
// // //           include: {
// // //             WorkInstruction: {
// // //               include: { steps: { orderBy: { stepNumber: "asc" } } },
// // //             },
// // //           },
// // //         },
// // //         process: { select: { processName: true } },
// // //       },
// // //     });

// // //     // If no job is 'in progress', find the oldest 'new' job for this station.
// // //     if (!nextJob) {
// // //       nextJob = await prisma.stockOrderSchedule.findFirst({
// // //         where: {
// // //           processId,
// // //           status: "new",
// // //           isDeleted: false,
// // //         },
// // //         orderBy: { createdAt: "asc" }, // Get the oldest new job
// // //         include: {
// // //           order: {
// // //             select: {
// // //               id: true,
// // //               orderNumber: true,
// // //               productQuantity: true,
// // //               shipDate: true,
// // //             },
// // //           },
// // //           part: {
// // //             include: {
// // //               WorkInstruction: {
// // //                 include: { steps: { orderBy: { stepNumber: "asc" } } },
// // //               },
// // //             },
// // //           },
// // //           process: { select: { processName: true } },
// // //         },
// // //       });
// // //     }

// // //     // If still no job is found, then the queue for this station is empty.
// // //     if (!nextJob) {
// // //       return res
// // //         .status(404)
// // //         .json({ message: "No available jobs found for this station." });
// // //     }

// // //     // When a job is fetched, update its status to 'progress'
// // //     // This prevents other stations from picking up the same 'new' job
// // //     if (nextJob.status === "new") {
// // //       await prisma.stockOrderSchedule.update({
// // //         where: { id: nextJob.id },
// // //         data: { status: "progress" },
// // //       });
// // //       nextJob.status = "progress"; // Reflect the change in the returned data
// // //     }

// // //     // Logic to get related production data remains the same
// // //     const getProductionResponse = await prisma.productionResponse.findFirst({
// // //       where: {
// // //         orderId: nextJob.order_id,
// // //         partId: nextJob.part_id,
// // //         processId: nextJob.processId,
// // //       },
// // //       orderBy: { cycleTimeStart: "desc" },
// // //       include: {
// // //         employeeInfo: { select: { firstName: true, lastName: true, id: true } },
// // //       },
// // //     });

// // //     const totalQuantity = getProductionResponse.scheduleQuantity;
// // //     const completedQuantity = nextJob.completedQuantity;
// // //     console.log(
// // //       "totalQuantitytotalQuantity completedQuantitycompletedQuantity",
// // //       totalQuantity,
// // //       completedQuantity
// // //     );

// // //     const remainingQty = totalQuantity - completedQuantity;
// // //     console.log("remainingQtyremainingQty", remainingQty);

// // //     const responseData = {
// // //       ...nextJob,
// // //       remainingQty: remainingQty,
// // //       scheduleQuantity: getProductionResponse.scheduleQuantity,
// // //       // a lot of the other fields can be simplified as they are already in nextJob
// // //     };

// // //     res.status(200).json({
// // //       message: "Next job found successfully.",
// // //       data: responseData,
// // //     });
// // //   } catch (error) {
// // //     console.error("Error finding next job:", error);
// // //     res.status(500).json({ message: "Something went wrong." });
// // //   }
// // // };

// // const getScheduleProcessInformation = async (req, res) => {
// //   try {
// //     const { id: processId } = req.params;

// //     if (!processId) {
// //       return res.status(400).json({ message: "processId is required." });
// //     }

// //     // Use the new helper to find the next job.
// //     // We don't pass a currentOrderId because this is for fetching a fresh job.
// //     const nextJob = await findNextJobForStation(prisma, processId);

// //     if (!nextJob) {
// //       return res
// //         .status(404)
// //         .json({ message: "No available jobs found for this station." });
// //     }

// //     // Find the corresponding production response to get scheduleQuantity
// //     const productionResponse = await prisma.productionResponse.findFirst({
// //       where: {
// //         orderId: nextJob.order_id,
// //         partId: nextJob.part_id,
// //         processId: nextJob.processId,
// //       },
// //       orderBy: { cycleTimeStart: "desc" },
// //       select: {
// //         id: true,
// //         scheduleQuantity: true,
// //         employeeInfo: { select: { firstName: true, lastName: true, id: true } },
// //       },
// //     });

// //     // It's possible a productionResponse hasn't been created yet if a worker hasn't logged in.
// //     // Handle this gracefully.
// //     const scheduleQuantity =
// //       productionResponse?.scheduleQuantity ||
// //       (nextJob.type === "part"
// //         ? (nextJob.quantity || 0) * (nextJob.part?.minStock || 1)
// //         : nextJob.order?.productQuantity || 0);

// //     const remainingQty = scheduleQuantity - (nextJob.completedQuantity || 0);
// //     console.log("productionResponseproductionResponse", productionResponse);
// //     const responseData = {
// //       ...nextJob, // All details from the schedule (part, order, process, etc.)
// //       scheduleQuantity: scheduleQuantity,
// //       remainingQty: remainingQty,
// //       // VERY IMPORTANT: Attach employee info and the productionResponse ID if they exist.
// //       // The frontend needs these for display and for subsequent API calls (like completeOrder).
// //       employeeInfo: productionResponse?.employeeInfo || null,
// //       productionId: productionResponse.id, // The frontend uses this ID.
// //     };
// //     console.log("responseDataresponseData", responseData);

// //     res.status(200).json({
// //       message: "Next job found successfully.",
// //       data: responseData,
// //     });
// //   } catch (error) {
// //     console.error("Error finding next job:", error);
// //     res
// //       .status(500)
// //       .json({ message: "Something went wrong.", error: error.message });
// //   }
// // };

// // const createProductionResponse = async (req, res) => {
// //   try {
// //     const {
// //       orderId,
// //       partId,
// //       processId,
// //       quantity,
// //       scrap,
// //       cycleTimeStart,
// //       cycleTimeEnd,
// //       firstName,
// //       lastName,
// //       completed,
// //     } = req.body;

// //     const user = req.user;
// //     const now = new Date();
// //     const submittedBy = `${firstName} ${lastName}`;
// //     const stockOrder = await prisma.stockOrder.findUnique({
// //       where: { id: orderId },
// //     });

// //     if (!stockOrder) {
// //       return res.status(404).json({ message: "Order not found." });
// //     }
// //     const totalProductQuantity = stockOrder.productQuantity;
// //     const existing = await prisma.productionResponse.findFirst({
// //       where: {
// //         orderId,
// //         employeeId: user.id,
// //         isDeleted: false,
// //       },
// //     });

// //     if (existing) {
// //       const newCompletedQty =
// //         existing.completedQuantity + (completed ? quantity : 0);

// //       if (completed && newCompletedQty > totalProductQuantity) {
// //         return res.status(400).json({
// //           message: "Completed quantity exceeds total product quantity.",
// //         });
// //       }

// //       if (completed && newCompletedQty === totalProductQuantity) {
// //         return res.status(200).json({
// //           message: "Production fully completed!",
// //         });
// //       }

// //       if (completed) {
// //         await prisma.productionResponse.update({
// //           where: { id: existing.id },
// //           data: {
// //             completedQuantity: newCompletedQty,
// //             updatedAt: now,
// //           },
// //         });

// //         return res.status(200).json({
// //           message: "Production response updated successfully!",
// //         });
// //       }

// //       return res.status(200).json({
// //         message: "Response logged without marking as completed.",
// //       });
// //     } else {
// //       const newCompletedQty = completed ? quantity : 0;
// //       if (completed && newCompletedQty > totalProductQuantity) {
// //         prisma.stockOrder.update({
// //           where: {
// //             id: orderId,
// //           },
// //           data: {
// //             isDeleted: true,
// //           },
// //         });
// //         return res.status(400).json({
// //           message: "Completed quantity exceeds total product quantity.",
// //         });
// //       }

// //       if (completed && newCompletedQty === totalProductQuantity) {
// //         await prisma.productionResponse.create({
// //           data: {
// //             orderId,
// //             partId,
// //             processId,
// //             quantity,
// //             scrap,
// //             cycleTimeStart,
// //             cycleTimeEnd,
// //             submittedBy,
// //             employeeId: user.id,
// //             submittedDate: now,
// //             submittedTime: now,
// //             completedQuantity: 0,
// //           },
// //         });

// //         return res.status(201).json({
// //           message: "Production fully completed!",
// //         });
// //       }

// //       await prisma.productionResponse.create({
// //         data: {
// //           orderId,
// //           partId,
// //           processId,
// //           quantity,
// //           scrap,
// //           cycleTimeStart,
// //           cycleTimeEnd,
// //           submittedBy,
// //           employeeId: user.id,
// //           submittedDate: now,
// //           submittedTime: now,
// //           completedQuantity: newCompletedQty,
// //         },
// //       });

// //       return res.status(201).json({
// //         message: "Production response created successfully!",
// //       });
// //     }
// //   } catch (error) {
// //     return res.status(500).json({
// //       message: "Something went wrong. Please try again later.",
// //     });
// //   }
// // };

// // const getNextJobDetails = async (req, res) => {
// //   try {
// //     const { id } = req.params;

// //     const nextJob = await prisma.stockOrderSchedule.findFirst({
// //       where: {
// //         process_id: id,
// //         status: "schedule",
// //         isDeleted: false,
// //       },
// //       orderBy: {
// //         schedule_date: "asc",
// //       },
// //       select: {
// //         id: true,
// //         order_id: true,
// //         part_id: true,
// //         process_id: true,
// //         schedule_date: true,
// //       },
// //     });

// //     if (!nextJob) {
// //       return res.status(404).json({
// //         message: "No available jobs found for this station.",
// //       });
// //     }

// //     const [orderDetails, partDetails, workInstructions] = await Promise.all([
// //       prisma.stockOrder.findUnique({
// //         where: { id: nextJob.order_id },
// //         select: {
// //           orderNumber: true,
// //           orderDate: true,
// //           shipDate: true,
// //           productQuantity: true,
// //           customer: {
// //             select: {
// //               firstName: true,
// //               lastName: true,
// //             },
// //           },
// //         },
// //       }),

// //       prisma.partNumber.findUnique({
// //         where: { part_id: nextJob.part_id },
// //         select: {
// //           part_id: true,
// //           partNumber: true,
// //           partDescription: true,
// //           partImages: {
// //             select: { imageUrl: true },
// //             where: { isDeleted: false },
// //           },
// //           components: {
// //             where: { isDeleted: false },
// //             select: {
// //               partQuantity: true,
// //               part: {
// //                 select: {
// //                   partNumber: true,
// //                   partDescription: true,
// //                 },
// //               },
// //             },
// //           },
// //         },
// //       }),

// //       prisma.workInstruction.findMany({
// //         where: {
// //           productId: nextJob.part_id,
// //           processId: nextJob.process_id,
// //           isDeleted: false,
// //         },
// //         select: {
// //           instructionTitle: true,
// //           steps: {
// //             where: { isDeleted: false },
// //             orderBy: { stepNumber: "asc" },
// //             select: {
// //               stepNumber: true,
// //               title: true,
// //               instruction: true,
// //               images: {
// //                 select: { imagePath: true },
// //                 where: { isDeleted: false },
// //               },
// //               videos: {
// //                 select: { videoPath: true },
// //                 where: { isDeleted: false },
// //               },
// //             },
// //           },
// //         },
// //       }),
// //     ]);

// //     const jobDetails = {
// //       scheduleId: nextJob.id,
// //       order: orderDetails,
// //       part: partDetails,
// //       workInstructions:
// //         workInstructions.length > 0 ? workInstructions[0] : null,
// //     };

// //     return res.status(200).json({
// //       message: "Next job details retrieved successfully.",
// //       data: jobDetails,
// //     });
// //   } catch (error) {
// //     console.error("Error fetching next job details:", error);
// //     return res.status(500).json({
// //       message: "Something went wrong fetching job details.",
// //       error: error.message,
// //     });
// //   }
// // };

// // // befor 12.aug
// // // const selectScheduleProcess = async (req, res) => {
// // //   try {
// // //     const stationUserId = req.user;
// // //     const stockOrders = await prisma.stockOrderSchedule.findMany({
// // //       where: {
// // //         isDeleted: false,
// // //         type: "part",
// // //         status: {
// // //           in: ["new", "progress"],
// // //         },
// // //       },
// // //       include: {
// // //         part: {
// // //           include: {
// // //             process: {
// // //               select: {
// // //                 id: true,
// // //                 processName: true,
// // //               },
// // //             },
// // //           },
// // //         },
// // //       },
// // //     });
// // //     console.log("stockOrdersstockOrders", stockOrders);

// // //     if (!stockOrders || stockOrders.length === 0) {
// // //       return res.status(404).json({ message: "No stock orders found" });
// // //     }
// // //     const employeeData = await prisma.employee.findMany({
// // //       where: {
// // //         isDeleted: false,
// // //       },
// // //       select: {
// // //         id: true,
// // //         employeeId: true,
// // //         email: true,
// // //         fullName: true,
// // //       },
// // //     });

// // //     if (!employeeData || employeeData.length === 0) {
// // //       return res.status(404).json({ message: "No employees found" });
// // //     }
// // //     let employeeFormattedData = [];
// // //     if (stationUserId.role !== "Shop_Floor") {
// // //       employeeFormattedData = employeeData.map((employee) => ({
// // //         id: employee.id || null,
// // //         name: employee.fullName || null,
// // //         employeeId: employee.employeeId || null,
// // //         email: employee.email || null,
// // //       }));
// // //     }

// // //     const formatted = stockOrders.map((order) => ({
// // //       id: order.part?.process?.id || null,
// // //       name: order.part?.process?.processName || null,
// // //       partFamily: order.part?.part_id || null,
// // //       stockOrderId: order.id,
// // //       orderNumber: order.orderNumber,
// // //     }));

// // //     return res.status(200).json({
// // //       stockAndProcess: formatted,
// // //       stationUser: employeeFormattedData,
// // //     });
// // //   } catch (error) {
// // //     return res.status(500).json({
// // //       message: "Something went wrong. Please try again later.",
// // //     });
// // //   }
// // // };

// // // const completeScheduleOrder = async (req, res) => {
// // //   try {
// // //     const { id } = req.params;
// // //     const { orderId } = req.body;
// // //     const data = await prisma.productionResponse.update({
// // //       where: {
// // //         id: id,
// // //       },
// // //       data: {
// // //         quantity: true,
// // //       },
// // //     });
// // //     const checkTotolQty = await prisma.stockOrderSchedule.findFirst({
// // //       where: {
// // //         id: orderId,
// // //       },
// // //       select: {
// // //         quantity: true,
// // //         completedQuantity: true,
// // //       },
// // //     });

// // //     if (checkTotolQty?.completedQuantity > checkTotolQty?.quantity) {
// // //       return res.status(200).send({
// // //         message: "order scheduling completed ",
// // //       });
// // //     }

// // //     prisma.stockOrderSchedule
// // //       .update({
// // //         where: {
// // //           id: orderId,
// // //         },
// // //         data: {
// // //           completedQuantity: {
// // //             increment: 1,
// // //           },
// // //         },
// // //       })
// // //       .then();
// // //     return res.status(201).json({
// // //       message: "This order has been added as completed  .",
// // //     });
// // //   } catch (error) {
// // //     console.log("errorerror", error);

// // //     res.status(500).json({ message: "An error occurred on the server." });
// // //   }
// // // };

// // const selectScheduleProcess = async (req, res) => {
// //   try {
// //     // 1. Find all order IDs that are currently active (have non-completed schedules)
// //     const activeOrderSchedules = await prisma.stockOrderSchedule.findMany({
// //       where: {
// //         isDeleted: false,
// //         status: { notIn: ["completed", "cancelled"] }, // Any order not fully done
// //       },
// //       select: { order_id: true },
// //       distinct: ["order_id"],
// //     });

// //     if (activeOrderSchedules.length === 0) {
// //       return res
// //         .status(404)
// //         .json({ message: "No active jobs or processes found." });
// //     }

// //     const activeOrderIds = activeOrderSchedules.map((s) => s.order_id);

// //     // 2. Fetch all schedules (parts and products) for these active orders
// //     const allRelevantSchedules = await prisma.stockOrderSchedule.findMany({
// //       where: {
// //         order_id: { in: activeOrderIds },
// //         isDeleted: false,
// //       },
// //       include: {
// //         process: {
// //           select: { id: true, processName: true },
// //         },
// //       },
// //     });

// //     // 3. Group schedules by their order_id for easier processing
// //     const schedulesByOrder = allRelevantSchedules.reduce((acc, schedule) => {
// //       if (!acc[schedule.order_id]) {
// //         acc[schedule.order_id] = { parts: [], products: [] };
// //       }
// //       if (schedule.type === "part") {
// //         acc[schedule.order_id].parts.push(schedule);
// //       } else if (schedule.type === "product") {
// //         acc[schedule.order_id].products.push(schedule);
// //       }
// //       return acc;
// //     }, {});

// //     // 4. Determine which processes are available based on the rules
// //     // Use a Map to store unique processes by their ID
// //     const availableProcesses = new Map();

// //     for (const orderId in schedulesByOrder) {
// //       const { parts, products } = schedulesByOrder[orderId];

// //       // Rule 1: Add processes for any parts that are 'new' or 'in progress'
// //       parts.forEach((partSchedule) => {
// //         if (
// //           ["new", "progress"].includes(partSchedule.status) &&
// //           partSchedule.process
// //         ) {
// //           availableProcesses.set(partSchedule.process.id, partSchedule.process);
// //         }
// //       });

// //       // Rule 2: Check if all parts for this order are completed
// //       // The .every() method returns true for an empty array, which is correct
// //       // (an order with no parts is immediately ready for product assembly).
// //       const allPartsCompleted = parts.every((p) => p.status === "completed");

// //       if (allPartsCompleted) {
// //         // If all parts are done, make the product processes available
// //         products.forEach((productSchedule) => {
// //           if (
// //             ["new", "progress"].includes(productSchedule.status) &&
// //             productSchedule.process
// //           ) {
// //             availableProcesses.set(
// //               productSchedule.process.id,
// //               productSchedule.process
// //             );
// //           }
// //         });
// //       }
// //     }

// //     // Convert the Map values to an array for the response
// //     const processList = Array.from(availableProcesses.values());

// //     if (processList.length === 0) {
// //       return res
// //         .status(404)
// //         .json({ message: "No jobs are currently available to start." });
// //     }

// //     // Employee data logic remains the same
// //     const stationUserId = req.user;
// //     let employeeFormattedData = [];
// //     if (stationUserId.role !== "Shop_Floor") {
// //       const employeeData = await prisma.employee.findMany({
// //         where: { isDeleted: false },
// //         select: { id: true, employeeId: true, fullName: true },
// //       });
// //       employeeFormattedData = employeeData.map((employee) => ({
// //         id: employee.id || null,
// //         name: employee.fullName || null,
// //       }));
// //     }

// //     return res.status(200).json({
// //       message: "Available processes fetched successfully.",
// //       stockAndProcess: processList,
// //       stationUser: employeeFormattedData,
// //     });
// //   } catch (error) {
// //     console.error("Error fetching selectable processes:", error);
// //     res.status(500).json({
// //       message: "Something went wrong. Please try again later.",
// //     });
// //   }
// // };

// // // const completeScheduleOrder = async (req, res) => {
// // //   try {
// // //     const { id } = req.params;
// // //     const { orderId, partId, employeeId, productId } = req.body;

// // //     await prisma.productionResponse.update({
// // //       where: { id },
// // //       data: {
// // //         quantity: true,
// // //         scrap: false,
// // //         cycleTimeEnd: new Date(),
// // //       },
// // //     });

// // //     const orderSchedule = await prisma.stockOrderSchedule.findUnique({
// // //       where: {
// // //         order_id_part_id: {
// // //           order_id: orderId,
// // //           part_id: partId,
// // //         },
// // //       },
// // //     });
// // //     const scheduleQty = await prisma.productionResponse.findFirst({
// // //       where: {
// // //         orderId,
// // //         partId,
// // //       },
// // //       select: {
// // //         scheduleQuantity: true,
// // //       },
// // //     });
// // //     if (!scheduleQty || typeof scheduleQty.scheduleQuantity !== "number") {
// // //       return res.status(400).json({
// // //         message: "Schedule quantity not found or invalid.",
// // //       });
// // //     }
// // //     const completedQuantity = orderSchedule.completedQuantity;
// // //     const totalScheduleQty = scheduleQty.scheduleQuantity;

// // //     const remainingQty = totalScheduleQty - (completedQuantity || 0);
// // //     console.log(
// // //       "completedQuantitycompletedQuantity",
// // //       completedQuantity,
// // //       totalScheduleQty
// // //     );

// // //     if (completedQuantity >= totalScheduleQty) {
// // //       return res.status(400).json({
// // //         message: "Order is already fully completed.",
// // //         status: "completed",
// // //       });
// // //     }

// // //     const newCompletedQty = completedQuantity + 1;
// // //     const updatedStatus =
// // //       newCompletedQty === totalScheduleQty ? "completed" : "progress";

// // //     await prisma.stockOrderSchedule.update({
// // //       where: {
// // //         order_id_part_id: {
// // //           order_id: orderId,
// // //           part_id: partId,
// // //         },
// // //       },
// // //       data: {
// // //         completedQuantity: newCompletedQty,
// // //         completed_date:
// // //           newCompletedQty === totalScheduleQty ? new Date() : undefined,
// // //         status: updatedStatus,
// // //       },
// // //     });

// // //     if (updatedStatus === "progress") {
// // //       await prisma.partNumber.update({
// // //         where: {
// // //           part_id: partId,
// // //         },
// // //         data: {
// // //           availStock: {
// // //             decrement: 1,
// // //           },
// // //         },
// // //       });
// // //     }
// // //     if (updatedStatus === "completed") {
// // //       await prisma.partNumber.update({
// // //         where: {
// // //           part_id: productId,
// // //         },
// // //         data: {
// // //           availStock: {
// // //             increment: 1,
// // //           },
// // //         },
// // //       });
// // //     }
// // //     await prisma.productionResponse.updateMany({
// // //       where: {
// // //         id,
// // //         stationUserId: employeeId,
// // //         partId: partId,
// // //         orderId: orderId,
// // //       },
// // //       data: {
// // //         completedQuantity: {
// // //           increment: 1,
// // //         },
// // //         remainingQty: remainingQty,
// // //       },
// // //     });
// // //     return res.status(200).json({
// // //       message:
// // //         updatedStatus === "completed"
// // //           ? "Order scheduling completed."
// // //           : "This order has been added as completed.",
// // //       status: updatedStatus,
// // //     });
// // //   } catch (error) {
// // //     console.error("Error completing schedule order:", error);
// // //     res.status(500).json({ message: "An error occurred on the server." });
// // //   }
// // // };

// // const scrapScheduleOrder = async (req, res) => {
// //   try {
// //     const { id } = req.params;
// //     const { orderId, partId, employeeId } = req.body;

// //     await prisma.productionResponse.update({
// //       where: { id },
// //       data: { scrap: true, quantity: false, cycleTimeEnd: new Date() },
// //     });

// //     const orderSchedule = await prisma.stockOrderSchedule.findUnique({
// //       where: {
// //         order_id_part_id: {
// //           order_id: orderId,
// //           part_id: partId,
// //         },
// //       },
// //     });

// //     if (!orderSchedule) {
// //       return res
// //         .status(404)
// //         .json({ message: "Stock order schedule not found." });
// //     }

// //     // await prisma.stockOrderSchedule.update({
// //     //   where: {
// //     //     order_id_part_id: {
// //     //       order_id: orderId,
// //     //       part_id: partId,
// //     //     },
// //     //   },
// //     //   data: {
// //     //     status: "progress",
// //     //     scrapQuantity: {
// //     //       increment: 1,
// //     //     },
// //     //     quantity: {
// //     //       decrement: 1,
// //     //     },
// //     //   },
// //     // });

// //     await prisma.productionResponse.updateMany({
// //       where: {
// //         id,
// //         stationUserId: employeeId,
// //         partId: partId,
// //         orderId: orderId,
// //       },
// //       data: {
// //         scrapQuantity: {
// //           increment: 1,
// //         },
// //         scheduleQuantity: {
// //           decrement: 1,
// //         },
// //         remainingQty: {
// //           decrement: 1,
// //         },
// //       },
// //     });

// //     await prisma.partNumber.update({
// //       where: {
// //         part_id: partId,
// //       },
// //       data: {
// //         availStock: {
// //           decrement: 1,
// //         },
// //       },
// //     });

// //     return res.status(200).json({
// //       message: "This order has been added as scrap.",
// //     });
// //   } catch (error) {
// //     console.error("Error completing schedule order:", error);
// //     res.status(500).json({ message: "An error occurred on the server." });
// //   }
// // };

// // // const completeScheduleOrder = async (req, res) => {
// // //   try {
// // //     const { id } = req.params;
// // //     const { orderId, partId, employeeId, productId } = req.body;

// // //     await prisma.productionResponse.update({
// // //       where: { id },
// // //       data: {
// // //         quantity: true,
// // //         scrap: false,
// // //         cycleTimeEnd: new Date(),
// // //       },
// // //     });

// // //     const orderSchedule = await prisma.stockOrderSchedule.findUnique({
// // //       where: {
// // //         order_id_part_id: {
// // //           order_id: orderId,
// // //           part_id: partId,
// // //         },
// // //       },
// // //     });

// // //     if (!orderSchedule) {
// // //       return res
// // //         .status(404)
// // //         .json({ message: "Stock order schedule not found." });
// // //     }

// // //     const { completedQuantity = 0, quantity } = orderSchedule;
// // //     if (completedQuantity >= quantity) {
// // //       return res.status(400).json({
// // //         message: "Order is already fully completed.",
// // //         status: "completed",
// // //       });
// // //     }

// // //     const newCompletedQty = completedQuantity + 1;
// // //     const updatedStatus =
// // //       newCompletedQty === quantity ? "completed" : "progress";

// // //     await prisma.stockOrderSchedule.update({
// // //       where: {
// // //         order_id_part_id: {
// // //           order_id: orderId,
// // //           part_id: partId,
// // //         },
// // //       },
// // //       data: {
// // //         completedQuantity: newCompletedQty,
// // //         completed_date: newCompletedQty === quantity ? new Date() : undefined,
// // //         status: updatedStatus,
// // //       },
// // //     });
// // //     console.log("updatedStatusupdatedStatus", updatedStatus);

// // //     if (updatedStatus === "progress") {
// // //       await prisma.partNumber.update({
// // //         where: {
// // //           part_id: partId,
// // //         },
// // //         data: {
// // //           availStock: {
// // //             decrement: 1,
// // //           },
// // //         },
// // //       });
// // //     }
// // //     if (updatedStatus === "completed") {
// // //       await prisma.partNumber.update({
// // //         where: {
// // //           part_id: productId,
// // //         },
// // //         data: {
// // //           availStock: {
// // //             increment: 1,
// // //           },
// // //         },
// // //       });
// // //     }
// // //     await prisma.productionResponse.updateMany({
// // //       where: {
// // //         id,
// // //         stationUserId: employeeId,
// // //         partId: partId,
// // //         orderId: orderId,
// // //       },
// // //       data: {
// // //         completedQuantity: {
// // //           increment: 1,
// // //         },
// // //       },
// // //     });
// // //     return res.status(200).json({
// // //       message:
// // //         updatedStatus === "completed"
// // //           ? "Order scheduling completed."
// // //           : "This order has been added as completed.",
// // //       status: updatedStatus,
// // //     });
// // //   } catch (error) {
// // //     console.error("Error completing schedule order:", error);
// // //     res.status(500).json({ message: "An error occurred on the server." });
// // //   }
// // // };

// // // const scrapScheduleOrder = async (req, res) => {
// // //   try {
// // //     const { id } = req.params;
// // //     const { orderId, partId, employeeId } = req.body;

// // //     await prisma.productionResponse.update({
// // //       where: { id },
// // //       data: { scrap: true, quantity: false, cycleTimeEnd: new Date() },
// // //     });

// // //     const orderSchedule = await prisma.stockOrderSchedule.findUnique({
// // //       where: {
// // //         order_id_part_id: {
// // //           order_id: orderId,
// // //           part_id: partId,
// // //         },
// // //       },
// // //     });

// // //     if (!orderSchedule) {
// // //       return res
// // //         .status(404)
// // //         .json({ message: "Stock order schedule not found." });
// // //     }

// // //     await prisma.stockOrderSchedule.update({
// // //       where: {
// // //         order_id_part_id: {
// // //           order_id: orderId,
// // //           part_id: partId,
// // //         },
// // //       },
// // //       data: {
// // //         status: "progress",
// // //         scrapQuantity: {
// // //           increment: 1,
// // //         },
// // //         quantity: {
// // //           decrement: 1,
// // //         },
// // //       },
// // //     });

// // //     await prisma.productionResponse.updateMany({
// // //       where: {
// // //         id,
// // //         stationUserId: employeeId,
// // //         partId: partId,
// // //         orderId: orderId,
// // //       },
// // //       data: {
// // //         scrapQuantity: {
// // //           increment: 1,
// // //         },
// // //       },
// // //     });
// // //     return res.status(200).json({
// // //       message: "This order has been added as scrap.",
// // //     });
// // //   } catch (error) {
// // //     console.error("Error completing schedule order:", error);
// // //     res.status(500).json({ message: "An error occurred on the server." });
// // //   }
// // // };
// // const completeScheduleOrder = async (req, res) => {
// //   try {
// //     const { id } = req.params;
// //     const { orderId, partId, employeeId, productId } = req.body;

// //     await prisma.productionResponse.update({
// //       where: { id },
// //       data: {
// //         quantity: true,
// //         scrap: false,
// //         cycleTimeEnd: new Date(),
// //       },
// //     });

// //     const orderSchedule = await prisma.stockOrderSchedule.findUnique({
// //       where: {
// //         order_id_part_id: {
// //           order_id: orderId,
// //           part_id: partId,
// //         },
// //       },
// //     });

// //     if (!orderSchedule) {
// //       return res
// //         .status(404)
// //         .json({ message: "Stock order schedule not found." });
// //     }

// //     const { completedQuantity = 0, quantity } = orderSchedule;
// //     if (completedQuantity >= quantity) {
// //       return res.status(400).json({
// //         message: "Order is already fully completed.",
// //         status: "completed",
// //       });
// //     }

// //     const newCompletedQty = completedQuantity + 1;
// //     const updatedStatus =
// //       newCompletedQty === quantity ? "completed" : "progress";

// //     await prisma.stockOrderSchedule.update({
// //       where: {
// //         order_id_part_id: {
// //           order_id: orderId,
// //           part_id: partId,
// //         },
// //       },
// //       data: {
// //         completedQuantity: newCompletedQty,
// //         completed_date: newCompletedQty === quantity ? new Date() : undefined,
// //         status: updatedStatus,
// //       },
// //     });
// //     console.log("updatedStatusupdatedStatus", updatedStatus);

// //     if (updatedStatus === "progress") {
// //       await prisma.partNumber.update({
// //         where: {
// //           part_id: partId,
// //         },
// //         data: {
// //           availStock: {
// //             decrement: 1,
// //           },
// //         },
// //       });
// //     }
// //     if (updatedStatus === "completed") {
// //       await prisma.partNumber.update({
// //         where: {
// //           part_id: productId,
// //         },
// //         data: {
// //           availStock: {
// //             increment: 1,
// //           },
// //         },
// //       });
// //     }
// //     await prisma.productionResponse.updateMany({
// //       where: {
// //         id,
// //         stationUserId: employeeId,
// //         partId: partId,
// //         orderId: orderId,
// //       },
// //       data: {
// //         completedQuantity: {
// //           increment: 1,
// //         },
// //       },
// //     });
// //     return res.status(200).json({
// //       message:
// //         updatedStatus === "completed"
// //           ? "Order scheduling completed."
// //           : "This order has been added as completed.",
// //       status: updatedStatus,
// //     });
// //   } catch (error) {
// //     console.error("Error completing schedule order:", error);
// //     res.status(500).json({ message: "An error occurred on the server." });
// //   }
// // };

// // const updateStepTime = async (req, res) => {
// //   try {
// //     const { id } = req.params;
// //     const { stepId } = req.body;

// //     if (!id || !stepId) {
// //       return res.status(400).json({ message: "Missing data" });
// //     }

// //     const updated = await prisma.productionStepTracking.updateMany({
// //       where: {
// //         productionResponseId: id,
// //         workInstructionStepId: stepId,
// //       },
// //       data: {
// //         stepStartTime: new Date(),
// //         stepEndTime: new Date(),
// //         status: "completed",
// //       },
// //     });

// //     if (updated.count === 0) {
// //       return res.status(404).json({ message: "Step not found." });
// //     }

// //     return res.status(200).json({ message: "Step marked completed" });
// //   } catch (error) {
// //     console.error("Step update error:", error);
// //     res.status(500).json({ message: "Internal server error" });
// //   }
// // };

// // const completeTraning = async (req, res) => {
// //   try {
// //     const { id } = req.params;
// //     await prisma.productionResponse.update({
// //       where: { id },
// //       data: {
// //         traniningStatus: true,
// //       },
// //     });

// //     return res.status(200).json({
// //       message: "Order scheduling completed.",
// //     });
// //   } catch (error) {
// //     console.error("Error completing schedule order:", error);
// //     res.status(500).json({ message: "An error occurred on the server." });
// //   }
// // };
// // // const markStepAsCompleted = async (req, res) => {
// // //   try {
// // //     const { productionResponseId, stepId } = req.body;

// // //     if (!productionResponseId || !stepId) {
// // //       return res.status(400).json({ message: "Missing required fields." });
// // //     }

// // //     const updated = await prisma.productionStepTracking.updateMany({
// // //       where: {
// // //         productionResponseId,
// // //         workInstructionStepId: stepId,
// // //       },
// // //       data: {
// // //         stepEndTime: new Date(),
// // //         status: "completed",
// // //       },
// // //     });

// // //     if (updated.count === 0) {
// // //       return res
// // //         .status(404)
// // //         .json({ message: "Step not found or already completed." });
// // //     }

// // //     return res.status(200).json({
// // //       message: "Step marked as completed.",
// // //       data: {
// // //         productionResponseId,
// // //         stepId,
// // //         stepEndTime: new Date(),
// // //       },
// // //     });
// // //   } catch (error) {
// // //     console.error("Error completing step:", error);
// // //     res
// // //       .status(500)
// // //       .json({ message: "Internal server error", error: error.message });
// // //   }
// // // };

// // const barcodeScan = async (req, res) => {
// //   try {
// //     const { barcode } = req.body;

// //     const part = await prisma.part.findUnique({ where: { barcode } });

// //     if (!part) {
// //       return res.status(404).json({ message: "❌ Invalid barcode" });
// //     }

// //     const order = await prisma.stockOrderSchedule.findFirst({
// //       where: {
// //         part_id: part.id,
// //         status: { not: "completed" },
// //       },
// //     });

// //     if (!order) {
// //       return res.status(404).json({ message: "❌ No active order found" });
// //     }

// //     const newQty = order.completedQuantity + 1;
// //     const status = newQty === order.quantity ? "completed" : "progress";

// //     await prisma.stockOrderSchedule.update({
// //       where: {
// //         order_id_part_id: { order_id: order.order_id, part_id: part.id },
// //       },
// //       data: {
// //         completedQuantity: newQty,
// //         status,
// //         completed_date: status === "completed" ? new Date() : undefined,
// //       },
// //     });

// //     res.json({
// //       message:
// //         status === "completed" ? "✅ Order Completed!" : "✅ Order In Progress",
// //     });
// //   } catch (error) {}
// // };

// // const processBarcodeScan = async (req, res) => {
// //   try {
// //     const { id } = req.params;
// //     const { barcode, employeeId } = req.body;

// //     const partInstance = await prisma.stockOrderSchedule.findUnique({
// //       where: { barcode: barcode },
// //     });

// //     if (!partInstance) {
// //       return res
// //         .status(404)
// //         .json({ message: "Invalid Barcode. Part not found." });
// //     }

// //     if (
// //       partInstance.status === "COMPLETED" ||
// //       partInstance.status === "SCRAPPED"
// //     ) {
// //       return res.status(409).json({
// //         message: `This part (${barcode}) has already been processed.`,
// //       });
// //     }

// //     const { orderId, partId } = partInstance;

// //     await prisma.productionResponse.update({
// //       where: { id },
// //       data: {
// //         quantity: true,
// //         scrap: false,
// //         cycleTimeEnd: new Date(),
// //       },
// //     });

// //     const orderSchedule = await prisma.stockOrderSchedule.findUnique({
// //       where: { order_id_part_id: { order_id: orderId, part_id: partId } },
// //     });

// //     if (!orderSchedule) {
// //       return res
// //         .status(404)
// //         .json({ message: "Stock order schedule not found for this part." });
// //     }

// //     const newCompletedQty = (orderSchedule.completedQuantity || 0) + 1;
// //     const updatedStatus =
// //       newCompletedQty === orderSchedule.quantity ? "completed" : "progress";

// //     await prisma.stockOrderSchedule.update({
// //       where: { order_id_part_id: { order_id: orderId, part_id: partId } },
// //       data: {
// //         completedQuantity: newCompletedQty,
// //         completed_date: updatedStatus === "completed" ? new Date() : undefined,
// //         status: updatedStatus,
// //       },
// //     });

// //     await prisma.productionResponse.updateMany({
// //       where: { id, stationUserId: employeeId, partId, orderId },
// //       data: { completedQuantity: { increment: 1 } },
// //     });

// //     await prisma.partInstance.update({
// //       where: { id: partInstance.id },
// //       data: { status: "COMPLETED" },
// //     });

// //     return res.status(200).json({
// //       message: "Part completed successfully!",
// //       status: updatedStatus,
// //     });
// //   } catch (error) {
// //     console.error("Error processing barcode scan:", error);
// //     res.status(500).json({ message: "An error occurred on the server." });
// //   }
// // };

// // const deleteScheduleOrder = async (req, res) => {
// //   try {
// //     const id = req.params.id;
// //     prisma.partNumber
// //       .update({
// //         where: {
// //           id: id,
// //           isDeleted: false,
// //         },
// //         data: {
// //           isDeleted: true,
// //         },
// //       })
// //       .then();

// //     return res.status(200).json({
// //       message: "Employee delete successfully !",
// //     });
// //   } catch (error) {
// //     return res.status(500).send({
// //       message: "Something went wrong. Please try again later.",
// //     });
// //   }
// // };

// // const scrapEntry = async (req, res) => {
// //   try {
// //     const {
// //       type,
// //       partId,
// //       returnQuantity,
// //       scrapStatus,
// //       supplierId,
// //       returnSupplierQty,
// //       createdBy,
// //     } = req.body;
// //     const part = await prisma.partNumber.findUnique({
// //       where: { part_id: partId },
// //       select: { availStock: true },
// //     });

// //     if (!part) {
// //       return res.status(404).json({ error: "Part not found" });
// //     }

// //     if ((part.availStock ?? 0) < Number(returnQuantity)) {
// //       return res
// //         .status(400)
// //         .json({ error: "Insufficient stock to scrap the requested quantity" });
// //     }

// //     const [newEntry] = await prisma.$transaction([
// //       prisma.scapEntries.create({
// //         data: {
// //           type,
// //           partId,
// //           productId: req?.body?.productId,
// //           returnQuantity,
// //           scrapStatus: scrapStatus === "yes",
// //           createdBy,
// //           processId: req?.body?.processId,
// //           supplierId,
// //           returnSupplierQty,
// //         },
// //       }),
// //       prisma.partNumber.update({
// //         where: { part_id: partId },
// //         data: {
// //           availStock: {
// //             decrement: Number(returnQuantity),
// //           },
// //         },
// //       }),
// //     ]);

// //     return res.status(201).json({
// //       message: "Scrap entry created and stock updated",
// //       data: newEntry,
// //     });
// //   } catch (error) {
// //     console.error("Error creating scrap entry:", error);
// //     return res.status(500).json({ error: "Internal server error" });
// //   }
// // };

// // const completeScheduleOrderViaGet = async (req, res) => {
// //   try {
// //     const { id, orderId, partId, employeeId, productId } = req.query;

// //     if (!id || !orderId || !partId || !employeeId || !productId) {
// //       return res.status(400).json({ message: "Missing required fields" });
// //     }

// //     await prisma.productionResponse.update({
// //       where: { id },
// //       data: {
// //         quantity: true,
// //         scrap: false,
// //         cycleTimeEnd: new Date(),
// //       },
// //     });

// //     const orderSchedule = await prisma.stockOrderSchedule.findUnique({
// //       where: {
// //         order_id_part_id: {
// //           order_id: orderId,
// //           part_id: partId,
// //         },
// //       },
// //     });

// //     if (!orderSchedule) {
// //       return res
// //         .status(404)
// //         .json({ message: "Stock order schedule not found." });
// //     }

// //     const { completedQuantity = 0, quantity } = orderSchedule;
// //     if (completedQuantity >= quantity) {
// //       return res.status(400).json({
// //         message: "Order is already fully completed.",
// //         status: "completed",
// //       });
// //     }

// //     const newCompletedQty = completedQuantity + 1;
// //     const updatedStatus =
// //       newCompletedQty === quantity ? "completed" : "progress";

// //     await prisma.stockOrderSchedule.update({
// //       where: {
// //         order_id_part_id: {
// //           order_id: orderId,
// //           part_id: partId,
// //         },
// //       },
// //       data: {
// //         completedQuantity: newCompletedQty,
// //         completed_date: newCompletedQty === quantity ? new Date() : undefined,
// //         status: updatedStatus,
// //       },
// //     });

// //     if (updatedStatus === "progress") {
// //       await prisma.partNumber.update({
// //         where: { part_id: partId },
// //         data: {
// //           availStock: { decrement: 1 },
// //         },
// //       });
// //     }

// //     if (updatedStatus === "completed") {
// //       await prisma.partNumber.update({
// //         where: { part_id: productId },
// //         data: {
// //           availStock: { increment: 1 },
// //         },
// //       });
// //     }

// //     await prisma.productionResponse.updateMany({
// //       where: {
// //         id,
// //         stationUserId: employeeId,
// //         partId: partId,
// //         orderId: orderId,
// //       },
// //       data: {
// //         completedQuantity: { increment: 1 },
// //       },
// //     });

// //     return res.status(200).json({
// //       message:
// //         updatedStatus === "completed"
// //           ? "Order scheduling completed."
// //           : "This order has been added as completed.",
// //       status: updatedStatus,
// //     });
// //   } catch (error) {
// //     console.error("GET Scan Complete Error:", error);
// //     return res.status(500).json({ message: "Internal server error" });
// //   }
// // };

// // const allScrapEntires = async (req, res) => {
// //   try {
// //     const paginationData = await paginationQuery(req.query);
// //     const { filterScrap, search } = req.query;

// //     const condition = {
// //       isDeleted: false,
// //     };

// //     if (filterScrap && filterScrap.toLowerCase() !== "all") {
// //       condition.type = filterScrap;
// //     }

// //     if (search) {
// //       condition.OR = [
// //         {
// //           supplier: {
// //             firstName: {
// //               contains: search,
// //             },
// //           },
// //         },
// //         {
// //           supplier: {
// //             lastName: {
// //               contains: search,
// //             },
// //           },
// //         },
// //         {
// //           PartNumber: {
// //             partNumber: {
// //               contains: search,
// //             },
// //           },
// //         },
// //       ];
// //     }

// //     const [allProcess, totalCount] = await Promise.all([
// //       prisma.scapEntries.findMany({
// //         where: condition,
// //         skip: paginationData.skip,
// //         take: paginationData.pageSize,
// //         include: {
// //           PartNumber: {
// //             select: {
// //               part_id: true,
// //               partNumber: true,
// //             },
// //           },
// //           supplier: {
// //             select: {
// //               firstName: true,
// //               lastName: true,
// //             },
// //           },
// //         },
// //       }),
// //       prisma.scapEntries.count({
// //         where: condition,
// //       }),
// //     ]);

// //     const getPagination = await pagination({
// //       page: paginationData.page,
// //       pageSize: paginationData.pageSize,
// //       total: totalCount,
// //     });

// //     return res.status(200).json({
// //       message: "Part number retrieved successfully!",
// //       data: allProcess,
// //       totalCount,
// //       pagination: getPagination,
// //     });
// //   } catch (error) {
// //     return res.status(500).send({
// //       message: "Something went wrong. Please try again later.",
// //     });
// //   }
// // };

// // const selectScheudlePartNumber = async (req, res) => {
// //   try {
// //     const process = await prisma.partNumber.findMany({
// //       select: {
// //         part_id: true,
// //         partNumber: true,
// //       },
// //       where: {
// //         type: "part",
// //         isDeleted: false,
// //         usedAsPart: {
// //           some: {
// //             status: { not: "completed" },
// //             isDeleted: false,
// //           },
// //         },
// //       },
// //     });

// //     const formattedProcess = process.map((process) => ({
// //       id: process.part_id,
// //       partNumber: process.partNumber,
// //     }));
// //     res.status(200).json({
// //       data: formattedProcess,
// //     });
// //   } catch (error) {
// //     res
// //       .status(500)
// //       .json({ message: "Something went wrong . please try again later ." });
// //   }
// // };

// // const selectScheudleProductNumber = async (req, res) => {
// //   try {
// //     const process = await prisma.partNumber.findMany({
// //       select: {
// //         part_id: true,
// //         partNumber: true,
// //       },
// //       where: {
// //         type: "product",
// //         isDeleted: false,
// //         StockOrder_StockOrder_productNumberToPartNumber: {
// //           some: {
// //             isDeleted: false,
// //             status: { equals: "scheduled" },
// //           },
// //         },
// //       },
// //     });

// //     const formattedProcess = process.map((process) => ({
// //       id: process.part_id,
// //       partNumber: process.partNumber,
// //     }));
// //     res.status(200).json({
// //       data: formattedProcess,
// //     });
// //   } catch (error) {
// //     res
// //       .status(500)
// //       .json({ message: "Something went wrong . please try again later ." });
// //   }
// // };

// // const getScrapEntryById = async (req, res) => {
// //   try {
// //     const { id } = req.params;

// //     const entry = await prisma.scapEntries.findUnique({
// //       where: { id },
// //       include: {
// //         PartNumber: {
// //           select: {
// //             part_id: true,
// //             partNumber: true,
// //           },
// //         },
// //         supplier: {
// //           select: {
// //             firstName: true,
// //             lastName: true,
// //           },
// //         },
// //       },
// //     });

// //     if (!entry) {
// //       return res.status(404).json({ error: "Scrap entry not found" });
// //     }

// //     res.status(200).json({ data: entry });
// //   } catch (error) {
// //     console.error("Error fetching scrap entry:", error);
// //     res.status(500).json({ error: "Internal server error" });
// //   }
// // };

// // const updateScrapEntry = async (req, res) => {
// //   try {
// //     const { id } = req.params;
// //     const {
// //       type,
// //       partId,
// //       returnQuantity,
// //       scrapStatus,
// //       supplierId,
// //       returnSupplierQty,
// //       createdBy,
// //     } = req.body;

// //     const existingEntry = await prisma.scapEntries.findUnique({
// //       where: { id },
// //     });

// //     if (!existingEntry) {
// //       return res.status(404).json({ error: "Scrap entry not found" });
// //     }

// //     const part = await prisma.partNumber.findUnique({
// //       where: { part_id: existingEntry.partId },
// //       select: { availStock: true },
// //     });

// //     if (!part) {
// //       return res.status(404).json({ error: "Part not found" });
// //     }

// //     const oldQty = existingEntry.returnQuantity ?? 0;
// //     const newQty = Number(returnQuantity);

// //     // Calculate what the stock will be after adjustment:
// //     // Add back the old quantity, then subtract new quantity
// //     const adjustedStock = (part.availStock ?? 0) + oldQty - newQty;

// //     if (adjustedStock < 0) {
// //       return res.status(400).json({
// //         error: "Insufficient stock to update scrap by the requested quantity",
// //       });
// //     }

// //     const [updatedEntry] = await prisma.$transaction([
// //       prisma.scapEntries.update({
// //         where: { id },
// //         data: {
// //           type,
// //           partId,
// //           productId: req?.body?.productId,
// //           returnQuantity: newQty,
// //           scrapStatus: scrapStatus === "yes",
// //           createdBy,
// //           processId: req?.body?.processId,
// //           supplierId,
// //           returnSupplierQty,
// //         },
// //       }),
// //       prisma.partNumber.update({
// //         where: { part_id: existingEntry.partId },
// //         data: {
// //           availStock: adjustedStock, // set new stock value directly
// //         },
// //       }),
// //     ]);

// //     res.status(200).json({
// //       message: "Scrap entry updated and stock adjusted",
// //       data: updatedEntry,
// //     });
// //   } catch (error) {
// //     console.error("Error updating scrap entry:", error);
// //     res.status(500).json({ error: "Internal server error" });
// //   }
// // };

// // const findNextJobForStation = async (
// //   prisma,
// //   processId,
// //   currentOrderId = null
// // ) => {
// //   let nextJob = null;
// //   const includeData = {
// //     order: {
// //       select: {
// //         id: true,
// //         orderNumber: true,
// //         productQuantity: true,
// //         shipDate: true,
// //       },
// //     },
// //     part: {
// //       include: {
// //         WorkInstruction: {
// //           include: { steps: { orderBy: { stepNumber: "asc" } } },
// //         },
// //       },
// //     },
// //     process: { select: { processName: true } },
// //   };

// //   // Priority 1: Check for more jobs within the SAME ORDER at this station
// //   if (currentOrderId) {
// //     // First, look for PART jobs in the same order
// //     nextJob = await prisma.stockOrderSchedule.findFirst({
// //       where: {
// //         processId,
// //         order_id: currentOrderId,
// //         status: { in: ["new", "progress"] }, // Look for new or in-progress
// //         type: "part",
// //         isDeleted: false,
// //       },
// //       orderBy: { createdAt: "asc" },
// //       include: includeData,
// //     });

// //     // If no part jobs, look for the final PRODUCT job in the same order
// //     if (!nextJob) {
// //       nextJob = await prisma.stockOrderSchedule.findFirst({
// //         where: {
// //           processId,
// //           order_id: currentOrderId,
// //           status: { in: ["new", "progress"] },
// //           type: "product",
// //           isDeleted: false,
// //         },
// //         orderBy: { createdAt: "asc" },
// //         include: includeData,
// //       });
// //     }
// //   }

// //   // Priority 2 (Fallback): If no job was found for the current order, or if no order was specified,
// //   // find ANY available job for this station using the original priority logic.
// //   if (!nextJob) {
// //     // 2a: PART jobs in progress
// //     nextJob = await prisma.stockOrderSchedule.findFirst({
// //       where: { processId, status: "progress", type: "part", isDeleted: false },
// //       orderBy: { createdAt: "asc" },
// //       include: includeData,
// //     });
// //   }

// //   if (!nextJob) {
// //     // 2b: NEW part jobs
// //     nextJob = await prisma.stockOrderSchedule.findFirst({
// //       where: { processId, status: "new", type: "part", isDeleted: false },
// //       orderBy: { createdAt: "asc" },
// //       include: includeData,
// //     });
// //   }

// //   if (!nextJob) {
// //     // 2c: PRODUCT jobs in progress
// //     nextJob = await prisma.stockOrderSchedule.findFirst({
// //       where: {
// //         processId,
// //         status: "progress",
// //         type: "product",
// //         isDeleted: false,
// //       },
// //       orderBy: { createdAt: "asc" },
// //       include: includeData,
// //     });
// //   }

// //   if (!nextJob) {
// //     // 2d: NEW product jobs
// //     nextJob = await prisma.stockOrderSchedule.findFirst({
// //       where: { processId, status: "new", type: "product", isDeleted: false },
// //       orderBy: { createdAt: "asc" },
// //       include: includeData,
// //     });
// //   }

// //   // If we found a 'new' job, update its status to 'progress' to lock it.
// //   if (nextJob && nextJob.status === "new") {
// //     return await prisma.stockOrderSchedule.update({
// //       where: { id: nextJob.id },
// //       data: { status: "progress" },
// //       include: includeData,
// //     });
// //   }

// //   return nextJob;
// // };
// // module.exports = {
// //   stationLogin,
// //   stationLogout,
// //   getScheduleProcessInformation,
// //   createProductionResponse,
// //   getNextJobDetails,
// //   selectScheduleProcess,
// //   completeScheduleOrder,
// //   updateStepTime,
// //   completeTraning,
// //   scrapScheduleOrder,
// //   barcodeScan,
// //   processBarcodeScan,
// //   deleteScheduleOrder,
// //   completeScheduleOrderViaGet,
// //   completeScheduleOrderViaGet,
// //   scrapEntry,
// //   allScrapEntires,
// //   selectScheudlePartNumber,
// //   selectScheudleProductNumber,
// //   getScrapEntryById,
// //   updateScrapEntry,
// // };

// const prisma = require("../config/prisma");
// const {
//   paginationQuery,
//   pagination,
//   fileUploadFunc,
// } = require("../functions/common");

// // const stationLogin = async (req, res) => {
// //   try {
// //     const { processId, stationUserId, type } = req.body;

// //     // First: check for an already "in progress" job
// //     let nextJob = await prisma.stockOrderSchedule.findFirst({
// //       where: {
// //         processId,
// //         status: "progress",
// //         isDeleted: false,
// //       },
// //       orderBy: {
// //         createdAt: "asc",
// //       },
// //       include: {
// //         order: { select: { orderNumber: true } },
// //         part: {
// //           include: {
// //             WorkInstruction: { select: { id: true } },
// //           },
// //         },
// //       },
// //     });

// //     // If no progress job, fallback to "new"
// //     if (!nextJob) {
// //       nextJob = await prisma.stockOrderSchedule.findFirst({
// //         where: {
// //           processId,
// //           status: "new",
// //           isDeleted: false,
// //         },
// //         orderBy: {
// //           createdAt: "asc",
// //         },
// //         include: {
// //           order: { select: { orderNumber: true } },
// //           part: {
// //             include: {
// //               WorkInstruction: { select: { id: true } },
// //             },
// //           },
// //         },
// //       });
// //     }

// //     if (!nextJob) {
// //       return res.status(404).json({
// //         message: "No available jobs found for this station at the moment.",
// //       });
// //     }

// //     const instructionId = nextJob?.part?.WorkInstruction[0]?.id;

// //     if (type === "training") {
// //       await prisma.productionStepTracking.create({
// //         data: {

// //           stepstartTime: new Date(),
// //         },
// //       });
// //     }

// //     const processLoginData = await prisma.productionResponse.create({
// //       data: {
// //         process: { connect: { id: processId } },
// //         StockOrder: { connect: { id: nextJob.order_id } },
// //         PartNumber: { connect: { part_id: nextJob.part_id } },
// //         employeeInfo: { connect: { id: stationUserId } },
// //         type,
// //         instructionId: instructionId || null,
// //         scrap: null,
// //         cycleTimeStart: new Date(),
// //         cycleTimeEnd: null,
// //       },
// //     });

// //     return res.status(200).json({
// //       message: `You have successfully logged into station. Assigned to order: ${nextJob.order.orderNumber}`,
// //       data: processLoginData,
// //     });
// //   } catch (error) {
// //     console.error("Error during process login:", error);
// //     return res.status(500).send({
// //       message: "Something went wrong. Please try again later.",
// //       error: error.message,
// //     });
// //   }
// // };

// // // const stationLogin = async (req, res) => {
// // //   try {
// // //     const { processId, stationUserId, type } = req.body;

// // //     let nextJob = null;

// // //     // 1️⃣ First check for PART jobs in progress
// // //     nextJob = await prisma.stockOrderSchedule.findFirst({
// // //       where: {
// // //         processId,
// // //         status: "progress",
// // //         isDeleted: false,
// // //         type: "part", // <-- field that identifies part jobs
// // //       },
// // //       orderBy: { createdAt: "asc" },
// // //       include: {
// // //         order: { select: { orderNumber: true, productQuantity: true } },
// // //         part: {
// // //           select: {
// // //             minStock: true,
// // //             WorkInstruction: { include: { steps: true } },
// // //           },
// // //         },
// // //       },
// // //     });

// // //     // 2️⃣ If no part job in progress, check for NEW part job
// // //     if (!nextJob) {
// // //       nextJob = await prisma.stockOrderSchedule.findFirst({
// // //         where: {
// // //           processId,
// // //           status: "new",
// // //           isDeleted: false,
// // //           type: "part",
// // //         },
// // //         orderBy: { createdAt: "asc" },
// // //         include: {
// // //           order: { select: { orderNumber: true, productQuantity: true } },
// // //           part: {
// // //             select: {
// // //               minStock: true,
// // //               WorkInstruction: { include: { steps: true } },
// // //             },
// // //           },
// // //         },
// // //       });
// // //     }

// // //     if (!nextJob) {
// // //       nextJob = await prisma.stockOrderSchedule.findFirst({
// // //         where: {
// // //           processId,
// // //           status: "progress",
// // //           isDeleted: false,
// // //           type: "product",
// // //         },
// // //         orderBy: { createdAt: "asc" },
// // //         include: {
// // //           order: { select: { orderNumber: true, productQuantity: true } },
// // //           part: {
// // //             select: {
// // //               minStock: true,
// // //               WorkInstruction: { include: { steps: true } },
// // //             },
// // //           },
// // //         },
// // //       });
// // //     }
// // //     if (!nextJob) {
// // //       nextJob = await prisma.stockOrderSchedule.findFirst({
// // //         where: {
// // //           processId,
// // //           status: "new",
// // //           isDeleted: false,
// // //           type: "product",
// // //         },
// // //         orderBy: { createdAt: "asc" },
// // //         include: {
// // //           order: { select: { orderNumber: true, productQuantity: true } },
// // //           part: {
// // //             select: {
// // //               minStock: true,
// // //               WorkInstruction: { include: { steps: true } },
// // //             },
// // //           },
// // //         },
// // //       });
// // //     }

// // //     // ❌ If nothing found at all
// // //     if (!nextJob) {
// // //       return res.status(404).json({
// // //         message: "No available jobs found for this station at the moment.",
// // //       });
// // //     }

// // //     // Determine schedule quantity: PART jobs = quantity * minStock, PRODUCT jobs = productQuantity
// // //     let scheduleQuantity =
// // //       nextJob.type === "part"
// // //         ? (nextJob.quantity || 0) * nextJob.part.minStock
// // //         : nextJob.order.productQuantity || 0;

// // //     const instruction = nextJob?.part?.WorkInstruction?.[0];
// // //     const steps = instruction?.steps || [];

// // //     const processLoginData = await prisma.productionResponse.create({
// // //       data: {
// // //         process: { connect: { id: processId } },
// // //         StockOrder: { connect: { id: nextJob.order_id } },
// // //         PartNumber: { connect: { part_id: nextJob.part_id } },
// // //         employeeInfo: { connect: { id: stationUserId } },
// // //         type,
// // //         instructionId: instruction?.id || null,
// // //         scrap: null,
// // //         cycleTimeStart: new Date(),
// // //         cycleTimeEnd: null,
// // //         scheduleQuantity: scheduleQuantity,
// // //         remainingQty: scheduleQuantity,
// // //       },
// // //     });

// // //     // Training logic unchanged
// // //     if (type === "training" && steps.length > 0) {
// // //       const { employeeId, processId, partId } = processLoginData;
// // //       const existingTraining = await prisma.productionResponse.findFirst({
// // //         where: {
// // //           employeeId,
// // //           processId,
// // //           partId,
// // //           traniningStatus: true,
// // //         },
// // //       });

// // //       if (existingTraining) {
// // //         return res.status(409).send({
// // //           message:
// // //             "You have already completed this process and related parts training. Please choose a different process and part.",
// // //         });
// // //       } else {
// // //         const trackingEntries = steps.map((step, index) => ({
// // //           productionResponseId: processLoginData.id,
// // //           workInstructionStepId: step.id,
// // //           status: "pending",
// // //           stepStartTime: index === 0 ? new Date() : null,
// // //           stepEndTime: null,
// // //         }));

// // //         await prisma.productionStepTracking.createMany({
// // //           data: trackingEntries,
// // //         });
// // //       }
// // //     }

// // //     return res.status(200).json({
// // //       message: `You have successfully logged into station. Assigned to order: ${nextJob.order.orderNumber}`,
// // //       data: processLoginData,
// // //     });
// // //   } catch (error) {
// // //     console.error("Error during process login:", error);
// // //     return res.status(500).send({
// // //       message: "Something went wrong. Please try again later.",
// // //       error: error.message,
// // //     });
// // //   }
// // // };

// // const stationLogin = async (req, res) => {
// //   try {
// //     const { processId, stationUserId, type } = req.body;
// //     let nextJob = await prisma.stockOrderSchedule.findFirst({
// //       where: {
// //         processId,
// //         status: "progress",
// //         isDeleted: false,
// //       },
// //       orderBy: {
// //         createdAt: "asc",
// //       },
// //       include: {
// //         order: { select: { orderNumber: true } },
// //         part: {
// //           include: {
// //             WorkInstruction: {
// //               include: {
// //                 steps: true,
// //               },
// //             },
// //           },
// //         },
// //       },
// //     });
// //     if (!nextJob) {
// //       nextJob = await prisma.stockOrderSchedule.findFirst({
// //         where: {
// //           processId,
// //           status: "new",
// //           isDeleted: false,
// //         },
// //         orderBy: {
// //           createdAt: "asc",
// //         },
// //         include: {
// //           order: { select: { orderNumber: true } },
// //           part: {
// //             include: {
// //               WorkInstruction: {
// //                 include: {
// //                   steps: true,
// //                 },
// //               },
// //             },
// //           },
// //         },
// //       });
// //     }
// //     if (!nextJob) {
// //       return res.status(404).json({
// //         message: "No available jobs found for this station at the moment.",
// //       });
// //     }
// //     const instruction = nextJob?.part?.WorkInstruction?.[0];
// //     const steps = instruction?.steps || [];

// //     const processLoginData = await prisma.productionResponse.create({
// //       data: {
// //         process: { connect: { id: processId } },
// //         StockOrder: { connect: { id: nextJob.order_id } },
// //         PartNumber: { connect: { part_id: nextJob.part_id } },
// //         employeeInfo: { connect: { id: stationUserId } },
// //         type,
// //         instructionId: instruction?.id || null,
// //         scrap: null,
// //         cycleTimeStart: new Date(),
// //         cycleTimeEnd: null,
// //       },
// //     });

// //     if (type === "training" && steps.length > 0) {
// //       const { employeeId, processId, partId } = processLoginData;
// //       const existingTraining = await prisma.productionResponse.findFirst({
// //         where: {
// //           employeeId: employeeId,
// //           processId: processId,
// //           partId: partId,
// //           traniningStatus: true,
// //         },
// //       });
// //       if (existingTraining) {
// //         return res.status(409).send({
// //           message:
// //             "You have already completed this process and related parts traning  . please choose different process and parts",
// //         });
// //       } else {
// //         const trackingEntries = steps.map((step, index) => ({
// //           productionResponseId: processLoginData.id,
// //           workInstructionStepId: step.id,
// //           status: "pending",
// //           stepStartTime: index === 0 ? new Date() : null,
// //           stepEndTime: null,
// //         }));

// //         await prisma.productionStepTracking.createMany({
// //           data: trackingEntries,
// //         });
// //       }
// //     }
// //     return res.status(200).json({
// //       message: `You have successfully logged into station. Assigned to order: ${nextJob.order.orderNumber}`,
// //       data: processLoginData,
// //     });
// //   } catch (error) {
// //     console.error("Error during process login:", error);
// //     return res.status(500).send({
// //       message: "Something went wrong. Please try again later.",
// //       error: error.message,
// //     });
// //   }
// // };

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
//     console.error("Error during process logout:", error);
//     return res.status(500).send({
//       message: "Something went wrong during logout. Please try again later.",
//       error: error.message,
//     });
//   }
// };

// // const getScheduleProcessInformation = async (req, res) => {
// //   try {
// //     const orderId = req.params.id;
// //     const user = req.user;
// //     const { stationUserId } = req.body;
// //     const data = await prisma.stockOrder.findUnique({
// //       where: {
// //         id: orderId,
// //       },
// //       select: {
// //         shipDate: true,
// //         productQuantity: true,
// //         PartNumber: {
// //           select: {
// //             part_id: true,
// //             partDescription: true,
// //             cycleTime: true,
// //             partNumber: true,
// //             processId: true,
// //           },
// //         },
// //       },
// //     });
// //     const employeeId = user?.id || stationUserId;
// //     const employeeInfo = await prisma.employee.findUnique({
// //       where: {
// //         id: employeeId,
// //       },
// //       select: {
// //         firstName: true,
// //         lastName: true,
// //         email: true,
// //       },
// //     });
// //     if (!data) {
// //       return res.status(404).json({ message: "Stock order not found" });
// //     }

// //     if (!data.PartNumber || !data.PartNumber.part_id) {
// //       return res.status(404).json({ message: "Part information not found" });
// //     }

// //     const workInstructionData = await prisma.workInstruction.findMany({
// //       where: {
// //         productId: data.PartNumber.part_id,
// //       },
// //       select: {
// //         instructionTitle: true,
// //         steps: {
// //           select: {
// //             title: true,
// //             stepNumber: true,
// //             instruction: true,
// //             images: {
// //               select: {
// //                 id: true,
// //                 imagePath: true,
// //               },
// //             },
// //             videos: {
// //               select: {
// //                 id: true,
// //                 videoPath: true,
// //               },
// //             },
// //           },
// //         },
// //       },
// //     });

// //     return res.status(200).json({
// //       message: "Process information retrieved successfully!",
// //       data: {
// //         orderInformation: data,
// //         workInstructionData,
// //         employeeInfo,
// //       },
// //     });
// //   } catch (error) {
// //     console.log("errorerror", error);

// //     return res.status(500).json({
// //       message: "Something went wrong. Please try again later.",
// //     });
// //   }
// // };

// // This is your function

// // const getScheduleProcessInformation = async (req, res) => {
// //   try {
// //     const { id } = req.params;
// //     console.log("req.params for schedule process:", req.params);

// //     if (!id) {
// //       return res.status(400).json({ message: "processId is required." });
// //     }

// //     const nextJob = await prisma.stockOrderSchedule.findFirst({
// //       where: {
// //         processId: id,
// //         status: "new",
// //         isDeleted: false,
// //       },
// //       orderBy: {
// //         createdAt: "asc",
// //       },
// //       include: {
// //         order: {
// //           select: {
// //             id: true,
// //             orderNumber: true,
// //             productQuantity: true,
// //             shipDate: true,
// //             createdAt: true,
// //           },
// //         },
// //         part: {
// //           include: {
// //             WorkInstruction: {
// //               include: {
// //                 steps: {
// //                   orderBy: {
// //                     stepNumber: "asc",
// //                   },
// //                   include: {
// //                     images: {
// //                       select: {
// //                         id: true,
// //                         imagePath: true,
// //                       },
// //                     },
// //                     videos: {
// //                       select: {
// //                         id: true,
// //                         videoPath: true,
// //                       },
// //                     },
// //                   },
// //                 },
// //               },
// //             },
// //           },
// //         },
// //         process: {
// //           select: {
// //             processName: true,
// //           },
// //         },
// //       },
// //     });

// //     if (!nextJob) {
// //       return res
// //         .status(404)
// //         .json({ message: "No new jobs found for this station." });
// //     }

// //     const upcomingOrder = await prisma.stockOrderSchedule.findFirst({
// //       where: {
// //         order: {
// //           createdAt: {
// //             gte: nextJob.order.createdAt,
// //           },
// //         },
// //         id: {
// //           not: nextJob.id,
// //         },
// //       },
// //       include: {
// //         order: {
// //           select: {
// //             shipDate: true,
// //           },
// //         },
// //       },
// //       orderBy: {
// //         createdAt: "asc",
// //       },
// //     });

// //     const getProductionResponse = await prisma.productionResponse.findFirst({
// //       where: {
// //         processId: id,
// //         isDeleted: false,
// //       },
// //       include: {
// //         employeeInfo: {
// //           select: {
// //             firstName: true,
// //             lastName: true,
// //           },
// //         },
// //       },
// //     });
// //     console.log(
// //       "getProductionResponsegetProductionResponse",
// //       getProductionResponse
// //     );

// //     const responseData = {
// //       ...nextJob,
// //       productionId: getProductionResponse.id,
// //       upcommingOrder: upcomingOrder?.order?.shipDate || null,
// //       employeeInfo: getProductionResponse?.employeeInfo || null,
// //       cycleTime: getProductionResponse?.cycleTimeStart,
// //     };

// //     res.status(200).json({
// //       message: "Next job found successfully.",
// //       data: responseData,
// //     });
// //   } catch (error) {
// //     console.error("Error finding next job:", error);
// //     res
// //       .status(500)
// //       .json({ message: "Something went wrong. Please try again later." });
// //   }
// // };

// // 19 aug

// // const stationLogin = async (req, res) => {
// //   try {
// //     const { processId, stationUserId, type } = req.body;

// //     let nextJob = null;

// //     // 1️⃣ First check for PART jobs in progress
// //     nextJob = await prisma.stockOrderSchedule.findFirst({
// //       where: {
// //         processId,
// //         status: "progress",
// //         isDeleted: false,
// //         type: "part",
// //       },
// //       orderBy: { createdAt: "asc" },
// //       include: {
// //         order: { select: { orderNumber: true, productQuantity: true } },
// //         part: {
// //           select: {
// //             minStock: true,
// //             WorkInstruction: { include: { steps: true } },
// //           },
// //         },
// //       },
// //     });

// //     // 2️⃣ If no part job in progress, check for NEW part job
// //     if (!nextJob) {
// //       nextJob = await prisma.stockOrderSchedule.findFirst({
// //         where: {
// //           processId,
// //           status: "new",
// //           isDeleted: false,
// //           type: "part",
// //         },
// //         orderBy: { createdAt: "asc" },
// //         include: {
// //           order: { select: { orderNumber: true, productQuantity: true } },
// //           part: {
// //             select: {
// //               minStock: true,
// //               WorkInstruction: { include: { steps: true } },
// //             },
// //           },
// //         },
// //       });
// //     }

// //     if (!nextJob) {
// //       nextJob = await prisma.stockOrderSchedule.findFirst({
// //         where: {
// //           processId,
// //           status: "progress",
// //           isDeleted: false,
// //           type: "product",
// //         },
// //         orderBy: { createdAt: "asc" },
// //         include: {
// //           order: { select: { orderNumber: true, productQuantity: true } },
// //           part: {
// //             select: {
// //               minStock: true,
// //               WorkInstruction: { include: { steps: true } },
// //             },
// //           },
// //         },
// //       });
// //     }
// //     if (!nextJob) {
// //       nextJob = await prisma.stockOrderSchedule.findFirst({
// //         where: {
// //           processId,
// //           status: "new",
// //           isDeleted: false,
// //           type: "product",
// //         },
// //         orderBy: { createdAt: "asc" },
// //         include: {
// //           order: { select: { orderNumber: true, productQuantity: true } },
// //           part: {
// //             select: {
// //               minStock: true,
// //               WorkInstruction: { include: { steps: true } },
// //             },
// //           },
// //         },
// //       });
// //     }

// //     // ❌ If nothing found at all
// //     if (!nextJob) {
// //       return res.status(404).json({
// //         message: "No available jobs found for this station at the moment.",
// //       });
// //     }

// //     // Determine schedule quantity: PART jobs = quantity * minStock, PRODUCT jobs = productQuantity
// //     let scheduleQuantity =
// //       nextJob.type === "part"
// //         ? (nextJob.quantity || 0) * nextJob.part.minStock
// //         : nextJob.order.productQuantity || 0;

// //     const instruction = nextJob?.part?.WorkInstruction?.[0];
// //     const steps = instruction?.steps || [];

// //     const processLoginData = await prisma.productionResponse.create({
// //       data: {
// //         process: { connect: { id: processId } },
// //         StockOrder: { connect: { id: nextJob.order_id } },
// //         PartNumber: { connect: { part_id: nextJob.part_id } },
// //         employeeInfo: { connect: { id: stationUserId } },
// //         type,
// //         instructionId: instruction?.id || null,
// //         scrap: null,
// //         cycleTimeStart: new Date(),
// //         cycleTimeEnd: null,
// //         scheduleQuantity: scheduleQuantity,
// //         remainingQty: scheduleQuantity,
// //       },
// //     });

// //     // Training logic unchanged
// //     if (type === "training" && steps.length > 0) {
// //       const { employeeId, processId, partId } = processLoginData;
// //       const existingTraining = await prisma.productionResponse.findFirst({
// //         where: {
// //           employeeId,
// //           processId,
// //           partId,
// //           traniningStatus: true,
// //         },
// //       });

// //       if (existingTraining) {
// //         return res.status(409).send({
// //           message:
// //             "You have already completed this process and related parts training. Please choose a different process and part.",
// //         });
// //       } else {
// //         const trackingEntries = steps.map((step, index) => ({
// //           productionResponseId: processLoginData.id,
// //           workInstructionStepId: step.id,
// //           status: "pending",
// //           stepStartTime: index === 0 ? new Date() : null,
// //           stepEndTime: null,
// //         }));

// //         await prisma.productionStepTracking.createMany({
// //           data: trackingEntries,
// //         });
// //       }
// //     }

// //     return res.status(200).json({
// //       message: `You have successfully logged into station. Assigned to order: ${nextJob.order.orderNumber}`,
// //       data: processLoginData,
// //     });
// //   } catch (error) {
// //     console.error("Error during process login:", error);
// //     return res.status(500).send({
// //       message: "Something went wrong. Please try again later.",
// //       error: error.message,
// //     });
// //   }
// // };
// // 19 aug end

// // const stationLogin = async (req, res) => {
// //   try {
// //     const { processId, stationUserId, type } = req.body;
// //     let nextJob = await prisma.stockOrderSchedule.findFirst({
// //       where: {
// //         processId,
// //         status: "progress",
// //         isDeleted: false,
// //       },
// //       orderBy: {
// //         createdAt: "asc",
// //       },
// //       include: {
// //         // --- CHANGE 1: Use the correct relation name 'StockOrder' ---
// //         StockOrder: { select: { orderNumber: true } }, // <-- CHANGED
// //         part: {
// //           include: {
// //             WorkInstruction: {
// //               include: {
// //                 steps: true,
// //               },
// //             },
// //           },
// //         },
// //       },
// //     });

// //     if (!nextJob) {
// //       nextJob = await prisma.stockOrderSchedule.findFirst({
// //         where: {
// //           processId,
// //           status: "new",
// //           isDeleted: false,
// //         },
// //         orderBy: {
// //           createdAt: "asc",
// //         },
// //         include: {
// //           // --- CHANGE 2: Use the correct relation name 'StockOrder' here too ---
// //           StockOrder: { select: { orderNumber: true } }, // <-- CHANGED
// //           part: {
// //             include: {
// //               WorkInstruction: {
// //                 include: {
// //                   steps: true,
// //                 },
// //               },
// //             },
// //           },
// //         },
// //       });
// //     }

// //     if (!nextJob) {
// //       return res.status(404).json({
// //         message: "No available jobs found for this station at the moment.",
// //       });
// //     }

// //     // This 'create' call seems to have a bug. It assumes the order is always a StockOrder.
// //     // It uses `nextJob.order_id`, which is correct, but only connects to the StockOrder table.
// //     // This will fail if the nextJob.order_type is 'CustomOrder'. Be aware of this limitation.
// //     const processLoginData = await prisma.productionResponse.create({
// //       data: {
// //         process: { connect: { id: processId } },
// //         StockOrder: { connect: { id: nextJob.order_id } },
// //         PartNumber: { connect: { part_id: nextJob.part_id } },
// //         employeeInfo: { connect: { id: stationUserId } },
// //         type,
// //         instructionId: nextJob?.part?.WorkInstruction?.[0]?.id || null,
// //         scrap: null,
// //         cycleTimeStart: new Date(),
// //         cycleTimeEnd: null,
// //       },
// //     });

// //     // The rest of your logic seems fine...
// //     if (
// //       type === "training" &&
// //       nextJob?.part?.WorkInstruction?.[0]?.steps.length > 0
// //     ) {
// //       const { employeeId, processId, partId } = processLoginData;
// //       const existingTraining = await prisma.productionResponse.findFirst({
// //         where: {
// //           employeeId: employeeId,
// //           processId: processId,
// //           partId: partId,
// //           traniningStatus: true,
// //         },
// //       });
// //       if (existingTraining) {
// //         return res.status(409).send({
// //           message:
// //             "You have already completed this process and related parts traning  . please choose different process and parts",
// //         });
// //       } else {
// //         const trackingEntries = nextJob.part.WorkInstruction[0].steps.map(
// //           (step, index) => ({
// //             productionResponseId: processLoginData.id,
// //             workInstructionStepId: step.id,
// //             status: "pending",
// //             stepStartTime: index === 0 ? new Date() : null,
// //             stepEndTime: null,
// //           })
// //         );

// //         await prisma.productionStepTracking.createMany({
// //           data: trackingEntries,
// //         });
// //       }
// //     }

// //     return res.status(200).json({
// //       // --- CHANGE 3: Access the orderNumber through the correct property ---
// //       message: `You have successfully logged into station. Assigned to order: ${nextJob.StockOrder?.orderNumber}`, // <-- CHANGED
// //       data: processLoginData,
// //     });
// //   } catch (error) {
// //     console.error("Error during process login:", error);
// //     return res.status(500).send({
// //       message: "Something went wrong. Please try again later.",
// //       error: error.message,
// //     });
// //   }
// // };

// const stationLogin = async (req, res) => {
//   try {
//     const { processId, stationUserId, type } = req.body;

//     // A helper function to find the next job to avoid repeating code
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
//           // --- FIX 1: Include BOTH possible relations ---
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

//     // Find a job in 'progress' first, then look for 'new'
//     let nextJob = await findNextJob("progress");
//     if (!nextJob) {
//       nextJob = await findNextJob("new");
//     }

//     if (!nextJob) {
//       return res.status(404).json({
//         message: "No available jobs found for this station at the moment.",
//       });
//     }

//     // --- FIX 2: Dynamically build the data for the create operation ---
//     const createData = {
//       process: { connect: { id: processId } },
//       PartNumber: { connect: { part_id: nextJob.part_id } },
//       employeeInfo: { connect: { id: stationUserId } },
//       type,
//       instructionId: nextJob?.part?.WorkInstruction?.[0]?.id || null,
//       scrap: null,
//       cycleTimeStart: new Date(),
//       cycleTimeEnd: null,
//     };

//     // Conditionally connect to the correct order table based on the job's type
//     if (nextJob.order_type === "StockOrder") {
//       createData.StockOrder = { connect: { id: nextJob.order_id } };
//     } else if (nextJob.order_type === "CustomOrder") {
//       createData.CustomOrder = { connect: { id: nextJob.order_id } };
//     } else {
//       // Handle cases where the order_type is unknown or null
//       return res.status(400).json({
//         message: `Unsupported order type "${nextJob.order_type}" found for this job.`,
//       });
//     }

//     // Now, create the production response with the correctly built data
//     const processLoginData = await prisma.productionResponse.create({
//       data: createData,
//     });

//     // The rest of your logic for training tracking remains the same...
//     if (
//       type === "training" &&
//       nextJob?.part?.WorkInstruction?.[0]?.steps.length > 0
//     ) {
//       const existingTraining = await prisma.productionResponse.findFirst({
//         where: {
//           stationUserId: stationUserId,
//           processId: processId,
//           partId: nextJob.part_id,
//           traniningStatus: true,
//         },
//       });
//       if (existingTraining) {
//         return res.status(409).send({
//           message:
//             "You have already completed training for this process and part.",
//         });
//       } else {
//         const trackingEntries = nextJob.part.WorkInstruction[0].steps.map(
//           (step, index) => ({
//             productionResponseId: processLoginData.id,
//             workInstructionStepId: step.id,
//             status: "pending",
//             stepStartTime: index === 0 ? new Date() : null,
//             stepEndTime: null,
//           })
//         );

//         await prisma.productionStepTracking.createMany({
//           data: trackingEntries,
//         });
//       }
//     }

//     // --- FIX 3: Get the orderNumber from whichever relation is not null ---
//     const orderNumber =
//       nextJob.StockOrder?.orderNumber ||
//       nextJob.CustomOrder?.orderNumber ||
//       "N/A";

//     return res.status(200).json({
//       message: `You have successfully logged into station. Assigned to order: ${orderNumber}`,
//       data: processLoginData,
//     });
//   } catch (error) {
//     // Check for the specific Prisma error P2025 again, just in case
//     if (error.code === "P2025") {
//       console.error("Prisma relation error during login:", error.meta.cause);
//       return res.status(400).json({
//         message: "Failed to log in. The associated order could not be found.",
//         error: error.meta.cause,
//       });
//     }
//     console.error("Error during process login:", error);
//     return res.status(500).send({
//       message: "Something went wrong. Please try again later.",
//       error: error.message,
//     });
//   }
// };
// // const getScheduleProcessInformation = async (req, res) => {
// //   try {
// //     const { id: processId } = req.params;

// //     if (!processId) {
// //       return res.status(400).json({ message: "processId is required." });
// //     }

// //     let nextJob = await prisma.stockOrderSchedule.findFirst({
// //       where: {
// //         processId,
// //         status: "progress",
// //         isDeleted: false,
// //       },
// //       orderBy: { createdAt: "asc" },
// //       include: {
// //         order: {
// //           select: {
// //             id: true,
// //             orderNumber: true,
// //             productQuantity: true,
// //             partId: true,
// //             shipDate: true,
// //             createdAt: true,
// //           },
// //         },
// //         part: {
// //           include: {
// //             WorkInstruction: {
// //               include: {
// //                 steps: {
// //                   orderBy: { stepNumber: "asc" },
// //                   include: {
// //                     images: { select: { id: true, imagePath: true } },
// //                     videos: { select: { id: true, videoPath: true } },
// //                   },
// //                 },
// //               },
// //             },
// //           },
// //         },
// //         process: { select: { processName: true } },
// //       },
// //     });

// //     if (!nextJob) {
// //       nextJob = await prisma.stockOrderSchedule.findFirst({
// //         where: {
// //           processId,
// //           status: "new",
// //           isDeleted: false,
// //         },
// //         orderBy: { createdAt: "asc" },
// //         include: {
// //           order: {
// //             select: {
// //               id: true,
// //               orderNumber: true,
// //               productQuantity: true,
// //               shipDate: true,
// //               createdAt: true,
// //             },
// //           },
// //           part: {
// //             include: {
// //               WorkInstruction: {
// //                 include: {
// //                   steps: {
// //                     orderBy: { stepNumber: "asc" },
// //                     include: {
// //                       images: { select: { id: true, imagePath: true } },
// //                       videos: { select: { id: true, videoPath: true } },
// //                     },
// //                   },
// //                 },
// //               },
// //             },
// //           },
// //           process: { select: { processName: true } },
// //         },
// //       });
// //     }

// //     if (!nextJob) {
// //       return res
// //         .status(404)
// //         .json({ message: "No jobs found for this station." });
// //     }
// //     console.log("nextJobnextJob", nextJob);

// //     const upcomingOrder = await prisma.stockOrderSchedule.findFirst({
// //       where: {
// //         order: {
// //           createdAt: {
// //             gte: nextJob.order.createdAt,
// //           },
// //         },
// //         id: { not: nextJob.id },
// //       },
// //       include: {
// //         order: { select: { shipDate: true } },
// //       },
// //       orderBy: { createdAt: "asc" },
// //     });

// //     const getProductionResponse = await prisma.productionResponse.findFirst({
// //       where: {
// //         processId,
// //         isDeleted: false,
// //       },
// //       orderBy: { cycleTimeStart: "desc" },
// //       include: {
// //         employeeInfo: {
// //           select: { firstName: true, lastName: true, id: true },
// //         },
// //       },
// //     });
// //     const productionResponse = await prisma.productionResponse.findFirst({
// //       where: {
// //         orderId: nextJob.order_id,
// //         partId: nextJob.part_id,
// //         processId: nextJob.processId,
// //       },
// //       orderBy: { cycleTimeStart: "desc" },
// //       select: {
// //         id: true,
// //         scheduleQuantity: true,
// //         employeeInfo: { select: { firstName: true, lastName: true, id: true } },
// //       },
// //     });
// //     const scheduleQuantity =
// //       productionResponse?.scheduleQuantity ||
// //       (nextJob.type === "part"
// //         ? (nextJob.quantity || 0) * (nextJob.part?.minStock || 1)
// //         : nextJob.order?.productQuantity || 0);

// //     const remainingQty = scheduleQuantity - (nextJob.completedQuantity || 0);
// //     const responseData = {
// //       ...nextJob,
// //       productionId: getProductionResponse?.id || null,
// //       upcommingOrder: upcomingOrder?.order?.shipDate || null,
// //       employeeInfo: getProductionResponse?.employeeInfo || null,
// //       cycleTime: getProductionResponse?.cycleTimeStart || null,
// //       completedQty: getProductionResponse?.completedQuantity || 0,
// //       scheduleQuantity: scheduleQuantity,
// //       remainingQty: remainingQty || nextJob.quantity,
// //       scrapQty: getProductionResponse.scrapQuantity || 0,
// //     };

// //     res.status(200).json({
// //       message: "Next job found successfully.",
// //       data: responseData,
// //     });
// //   } catch (error) {
// //     console.error("Error finding next job:", error);
// //     res.status(500).json({ message: "Something went wrong." });
// //   }
// // };

// const createProductionResponse = async (req, res) => {
//   try {
//     const {
//       orderId,
//       partId,
//       processId,
//       quantity,
//       scrap,
//       cycleTimeStart,
//       cycleTimeEnd,
//       firstName,
//       lastName,
//       completed,
//     } = req.body;

//     const user = req.user;
//     const now = new Date();
//     const submittedBy = `${firstName} ${lastName}`;
//     const stockOrder = await prisma.stockOrder.findUnique({
//       where: { id: orderId },
//     });

//     if (!stockOrder) {
//       return res.status(404).json({ message: "Order not found." });
//     }
//     const totalProductQuantity = stockOrder.productQuantity;
//     const existing = await prisma.productionResponse.findFirst({
//       where: {
//         orderId,
//         employeeId: user.id,
//         isDeleted: false,
//       },
//     });

//     if (existing) {
//       const newCompletedQty =
//         existing.completedQuantity + (completed ? quantity : 0);
//       if (completed && newCompletedQty > totalProductQuantity) {
//         return res.status(400).json({
//           message: "Completed quantity exceeds total product quantity.",
//         });
//       }
//       if (completed && newCompletedQty === totalProductQuantity) {
//         return res.status(200).json({
//           message: "Production fully completed!",
//         });
//       }
//       if (completed) {
//         await prisma.productionResponse.update({
//           where: { id: existing.id },
//           data: {
//             completedQuantity: newCompletedQty,
//             updatedAt: now,
//           },
//         });

//         return res.status(200).json({
//           message: "Production response updated successfully!",
//         });
//       }

//       return res.status(200).json({
//         message: "Response logged without marking as completed.",
//       });
//     } else {
//       const newCompletedQty = completed ? quantity : 0;
//       if (completed && newCompletedQty > totalProductQuantity) {
//         prisma.stockOrder.update({
//           where: {
//             id: orderId,
//           },
//           data: {
//             isDeleted: true,
//           },
//         });
//         return res.status(400).json({
//           message: "Completed quantity exceeds total product quantity.",
//         });
//       }

//       if (completed && newCompletedQty === totalProductQuantity) {
//         await prisma.productionResponse.create({
//           data: {
//             orderId,
//             partId,
//             processId,
//             quantity,
//             scrap,
//             cycleTimeStart,
//             cycleTimeEnd,
//             submittedBy,
//             employeeId: user.id,
//             submittedDate: now,
//             submittedTime: now,
//             completedQuantity: 0,
//           },
//         });

//         return res.status(201).json({
//           message: "Production fully completed!",
//         });
//       }

//       await prisma.productionResponse.create({
//         data: {
//           orderId,
//           partId,
//           processId,
//           quantity,
//           scrap,
//           cycleTimeStart,
//           cycleTimeEnd,
//           submittedBy,
//           employeeId: user.id,
//           submittedDate: now,
//           submittedTime: now,
//           completedQuantity: newCompletedQty,
//         },
//       });

//       return res.status(201).json({
//         message: "Production response created successfully!",
//       });
//     }
//   } catch (error) {
//     return res.status(500).json({
//       message: "Something went wrong. Please try again later.",
//     });
//   }
// };

// // const getNextJobDetails = async (req, res) => {
// //   try {
// //     const { id } = req.params;

// //     const nextJob = await prisma.stockOrderSchedule.findFirst({
// //       where: {
// //         process_id: id,
// //         status: "schedule",
// //         isDeleted: false,
// //       },
// //       orderBy: {
// //         schedule_date: "asc",
// //       },
// //       select: {
// //         id: true,
// //         order_id: true,
// //         part_id: true,
// //         process_id: true,
// //         schedule_date: true,
// //       },
// //     });

// //     if (!nextJob) {
// //       return res.status(404).json({
// //         message: "No available jobs found for this station.",
// //       });
// //     }

// //     const [orderDetails, partDetails, workInstructions] = await Promise.all([
// //       prisma.stockOrder.findUnique({
// //         where: { id: nextJob.order_id },
// //         select: {
// //           orderNumber: true,
// //           orderDate: true,
// //           shipDate: true,
// //           productQuantity: true,
// //           customer: {
// //             select: {
// //               firstName: true,
// //               lastName: true,
// //             },
// //           },
// //         },
// //       }),

// //       prisma.partNumber.findUnique({
// //         where: { part_id: nextJob.part_id },
// //         select: {
// //           part_id: true,
// //           partNumber: true,
// //           partDescription: true,
// //           partImages: {
// //             select: { imageUrl: true },
// //             where: { isDeleted: false },
// //           },
// //           components: {
// //             where: { isDeleted: false },
// //             select: {
// //               partQuantity: true,
// //               part: {
// //                 select: {
// //                   partNumber: true,
// //                   partDescription: true,
// //                 },
// //               },
// //             },
// //           },
// //         },
// //       }),

// //       prisma.workInstruction.findMany({
// //         where: {
// //           productId: nextJob.part_id,
// //           processId: nextJob.process_id,
// //           isDeleted: false,
// //         },
// //         select: {
// //           instructionTitle: true,
// //           steps: {
// //             where: { isDeleted: false },
// //             orderBy: { stepNumber: "asc" },
// //             select: {
// //               stepNumber: true,
// //               title: true,
// //               instruction: true,
// //               images: {
// //                 select: { imagePath: true },
// //                 where: { isDeleted: false },
// //               },
// //               videos: {
// //                 select: { videoPath: true },
// //                 where: { isDeleted: false },
// //               },
// //             },
// //           },
// //         },
// //       }),
// //     ]);

// //     const jobDetails = {
// //       scheduleId: nextJob.id,
// //       order: orderDetails,
// //       part: partDetails,
// //       workInstructions:
// //         workInstructions.length > 0 ? workInstructions[0] : null,
// //     };

// //     return res.status(200).json({
// //       message: "Next job details retrieved successfully.",
// //       data: jobDetails,
// //     });
// //   } catch (error) {
// //     console.error("Error fetching next job details:", error);
// //     return res.status(500).json({
// //       message: "Something went wrong fetching job details.",
// //       error: error.message,
// //     });
// //   }
// // };

// const getNextJobDetails = async (req, res) => {
//   try {
//     const { id: processId } = req.params; // Renamed for clarity

//     // =======================> CHANGE 1: UPDATED QUERY <=======================
//     // Find the next job, prioritizing by date first, then by type ('part' before 'product')
//     const nextJob = await prisma.stockOrderSchedule.findFirst({
//       where: {
//         processId: processId, // Assuming your schema uses camelCase, if not, use process_id
//         status: "new", // Or "new" if that's your status for ready jobs
//         isDeleted: false,
//       },
//       orderBy: [
//         { schedule_date: "asc" }, // 1. Primary Sort: Oldest jobs first
//         { type: "asc" }, // 2. Secondary Sort: 'part' comes before 'product'
//       ],
//       select: {
//         id: true,
//         order_id: true,
//         order_type: true, // IMPORTANT: Select the order_type to know which table to query
//         part_id: true,
//         processId: true, // Assuming your schema uses camelCase
//         schedule_date: true,
//       },
//     });
//     // =======================================================================
//     console.log("nextJobnextJob", nextJob);

//     if (!nextJob) {
//       return res.status(404).json({
//         message: "No available jobs found for this station.",
//       });
//     }

//     // ==================> CHANGE 2: DYNAMIC ORDER FETCHING <==================
//     let orderDetailsPromise;
//     const commonOrderSelect = {
//       orderNumber: true,
//       orderDate: true,
//       shipDate: true,
//       productQuantity: true,
//       customer: {
//         select: {
//           firstName: true,
//           lastName: true,
//         },
//       },
//     };

//     if (nextJob.order_type === "StockOrder") {
//       orderDetailsPromise = prisma.stockOrder.findUnique({
//         where: { id: nextJob.order_id },
//         select: commonOrderSelect,
//       });
//     } else if (nextJob.order_type === "CustomOrder") {
//       orderDetailsPromise = prisma.customOrder.findUnique({
//         where: { id: nextJob.order_id },
//         select: commonOrderSelect, // Adjust if CustomOrder has different fields
//       });
//     } else {
//       // If order_type is null or something else, resolve with null
//       orderDetailsPromise = Promise.resolve(null);
//     }
//     // =======================================================================

//     const [orderDetails, partDetails, workInstructions] = await Promise.all([
//       orderDetailsPromise, // Use the dynamically created promise

//       prisma.partNumber.findUnique({
//         where: { part_id: nextJob.part_id },
//         select: {
//           part_id: true,
//           partNumber: true,
//           partDescription: true,
//           partImages: {
//             select: { imageUrl: true },
//             where: { isDeleted: false },
//           },
//           components: {
//             where: { isDeleted: false },
//             select: {
//               partQuantity: true,
//               part: {
//                 select: {
//                   partNumber: true,
//                   partDescription: true,
//                 },
//               },
//             },
//           },
//         },
//       }),

//       prisma.workInstruction.findMany({
//         where: {
//           productId: nextJob.part_id,
//           processId: nextJob.processId, // Assuming camelCase
//           isDeleted: false,
//         },
//         select: {
//           instructionTitle: true,
//           steps: {
//             where: { isDeleted: false },
//             orderBy: { stepNumber: "asc" },
//             select: {
//               stepNumber: true,
//               title: true,
//               instruction: true,
//               images: {
//                 select: { imagePath: true },
//                 where: { isDeleted: false },
//               },
//               videos: {
//                 select: { videoPath: true },
//                 where: { isDeleted: false },
//               },
//             },
//           },
//         },
//       }),
//     ]);

//     if (!orderDetails) {
//       return res.status(404).json({
//         message: `Parent order with ID ${nextJob.order_id} could not be found for this job schedule.`,
//       });
//     }

//     const jobDetails = {
//       scheduleId: nextJob.id,
//       order: orderDetails,
//       part: partDetails,
//       workInstructions:
//         workInstructions.length > 0 ? workInstructions[0] : null,
//     };

//     return res.status(200).json({
//       message: "Next job details retrieved successfully.",
//       data: jobDetails,
//     });
//   } catch (error) {
//     console.error("Error fetching next job details:", error);
//     return res.status(500).json({
//       message: "Something went wrong fetching job details.",
//       error: error.message,
//     });
//   }
// };
// const selectScheduleProcess = async (req, res) => {
//   try {
//     const stationUserId = req.user;
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
//     console.log("stockOrdersstockOrdersstockOrders", stockOrders);

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

//       employeeFormattedData = employees.map((employee) => ({
//         id: employee.id,
//         name: employee.fullName,
//         employeeId: employee.employeeId,
//         email: employee.email,
//       }));
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

// // const completeScheduleOrder = async (req, res) => {
// //   try {
// //     const { id } = req.params;
// //     const { orderId } = req.body;
// //     const data = await prisma.productionResponse.update({
// //       where: {
// //         id: id,
// //       },
// //       data: {
// //         quantity: true,
// //       },
// //     });
// //     const checkTotolQty = await prisma.stockOrderSchedule.findFirst({
// //       where: {
// //         id: orderId,
// //       },
// //       select: {
// //         quantity: true,
// //         completedQuantity: true,
// //       },
// //     });

// //     if (checkTotolQty?.completedQuantity > checkTotolQty?.quantity) {
// //       return res.status(200).send({
// //         message: "order scheduling completed ",
// //       });
// //     }

// //     prisma.stockOrderSchedule
// //       .update({
// //         where: {
// //           id: orderId,
// //         },
// //         data: {
// //           completedQuantity: {
// //             increment: 1,
// //           },
// //         },
// //       })
// //       .then();
// //     return res.status(201).json({
// //       message: "This order has been added as completed  .",
// //     });
// //   } catch (error) {
// //     console.log("errorerror", error);

// //     res.status(500).json({ message: "An error occurred on the server." });
// //   }
// // };

// // const completeScheduleOrder = async (req, res) => {
// //   try {
// //     const { id } = req.params;
// //     const { orderId, partId, employeeId, productId } = req.body;

// //     await prisma.productionResponse.update({
// //       where: { id },
// //       data: {
// //         quantity: true,
// //         scrap: false,
// //         cycleTimeEnd: new Date(),
// //       },
// //     });
// //     const productionResponse = await prisma.productionResponse.findFirst({
// //       where: {
// //         id: id,
// //         partId: partId,
// //       },
// //       orderBy: { cycleTimeStart: "desc" },
// //       select: {
// //         id: true,
// //         scheduleQuantity: true,
// //       },
// //     });
// //     const orderSchedule = await prisma.stockOrderSchedule.findUnique({
// //       where: {
// //         order_id_part_id: {
// //           order_id: orderId,
// //           part_id: partId,
// //         },
// //       },
// //     });

// //     if (!orderSchedule) {
// //       return res
// //         .status(404)
// //         .json({ message: "Stock order schedule not found." });
// //     }

// //     const { completedQuantity = 0 } = orderSchedule;
// //     if (completedQuantity >= productionResponse.scheduleQuantity) {
// //       return res.status(400).json({
// //         message: "Order is already fully completed.",
// //         status: "completed",
// //       });
// //     }

// //     const newCompletedQty = completedQuantity + 1;
// //     const updatedStatus =
// //       newCompletedQty === quantity ? "completed" : "progress";

// //     await prisma.stockOrderSchedule.update({
// //       where: {
// //         order_id_part_id: {
// //           order_id: orderId,
// //           part_id: partId,
// //         },
// //       },
// //       data: {
// //         completedQuantity: newCompletedQty,
// //         completed_date:
// //           newCompletedQty === productionResponse.scheduleQuantity
// //             ? new Date()
// //             : undefined,
// //         status: updatedStatus,
// //       },
// //     });
// //     console.log("updatedStatusupdatedStatus", updatedStatus);

// //     if (updatedStatus === "progress") {
// //       await prisma.partNumber.update({
// //         where: {
// //           part_id: partId,
// //         },
// //         data: {
// //           availStock: {
// //             decrement: 1,
// //           },
// //         },
// //       });
// //     }
// //     if (updatedStatus === "completed") {
// //       await prisma.partNumber.update({
// //         where: {
// //           part_id: productId,
// //         },
// //         data: {
// //           availStock: {
// //             increment: 1,
// //           },
// //         },
// //       });
// //     }
// //     await prisma.productionResponse.updateMany({
// //       where: {
// //         id,
// //         stationUserId: employeeId,
// //         partId: partId,
// //         orderId: orderId,
// //       },
// //       data: {
// //         completedQuantity: {
// //           increment: 1,
// //         },
// //       },
// //     });
// //     return res.status(200).json({
// //       message:
// //         updatedStatus === "completed"
// //           ? "Order scheduling completed."
// //           : "This order has been added as completed.",
// //       status: updatedStatus,
// //     });
// //   } catch (error) {
// //     console.error("Error completing schedule order:", error);
// //     res.status(500).json({ message: "An error occurred on the server." });
// //   }
// // };

// // okok
// // const getScheduleProcessInformation = async (req, res) => {
// //   try {
// //     const { id: processId } = req.params;

// //     if (!processId) {
// //       return res.status(400).json({ message: "processId is required." });
// //     }

// //     let nextJob = await prisma.stockOrderSchedule.findFirst({
// //       where: {
// //         processId,
// //         status: "progress",
// //         isDeleted: false,
// //       },
// //       orderBy: { createdAt: "asc" },
// //       include: {
// //         order: {
// //           select: {
// //             id: true,
// //             orderNumber: true,
// //             productQuantity: true,
// //             partId: true,
// //             shipDate: true,
// //             createdAt: true,
// //           },
// //         },
// //         part: {
// //           include: {
// //             WorkInstruction: {
// //               include: {
// //                 steps: {
// //                   orderBy: { stepNumber: "asc" },
// //                   include: {
// //                     images: { select: { id: true, imagePath: true } },
// //                     videos: { select: { id: true, videoPath: true } },
// //                   },
// //                 },
// //               },
// //             },
// //           },
// //         },
// //         process: { select: { processName: true } },
// //       },
// //     });

// //     if (!nextJob) {
// //       nextJob = await prisma.stockOrderSchedule.findFirst({
// //         where: {
// //           processId,
// //           status: "new",
// //           isDeleted: false,
// //         },
// //         orderBy: { createdAt: "asc" },
// //         include: {
// //           order: {
// //             select: {
// //               id: true,
// //               orderNumber: true,
// //               productQuantity: true,
// //               shipDate: true,
// //               createdAt: true,
// //             },
// //           },
// //           part: {
// //             include: {
// //               WorkInstruction: {
// //                 include: {
// //                   steps: {
// //                     orderBy: { stepNumber: "asc" },
// //                     include: {
// //                       images: { select: { id: true, imagePath: true } },
// //                       videos: { select: { id: true, videoPath: true } },
// //                     },
// //                   },
// //                 },
// //               },
// //             },
// //           },
// //           process: { select: { processName: true } },
// //         },
// //       });
// //     }

// //     if (!nextJob) {
// //       return res
// //         .status(404)
// //         .json({ message: "No jobs found for this station." });
// //     }
// //     console.log("nextJobnextJob", nextJob);

// //     const upcomingOrder = await prisma.stockOrderSchedule.findFirst({
// //       where: {
// //         order: {
// //           createdAt: {
// //             gte: nextJob.order.createdAt,
// //           },
// //         },
// //         id: { not: nextJob.id },
// //       },
// //       include: {
// //         order: { select: { shipDate: true } },
// //       },
// //       orderBy: { createdAt: "asc" },
// //     });

// //     const getProductionResponse = await prisma.productionResponse.findFirst({
// //       where: {
// //         processId,
// //         isDeleted: false,
// //       },
// //       orderBy: { cycleTimeStart: "desc" },
// //       include: {
// //         employeeInfo: {
// //           select: { firstName: true, lastName: true, id: true },
// //         },
// //       },
// //     });
// //     const productionResponse = await prisma.productionResponse.findFirst({
// //       where: {
// //         orderId: nextJob.order_id,
// //         partId: nextJob.part_id,
// //         processId: nextJob.processId,
// //       },
// //       orderBy: { cycleTimeStart: "desc" },
// //       select: {
// //         id: true,
// //         scheduleQuantity: true,
// //         employeeInfo: { select: { firstName: true, lastName: true, id: true } },
// //       },
// //     });
// //     const scheduleQuantity =
// //       productionResponse?.scheduleQuantity ||
// //       (nextJob.type === "part"
// //         ? (nextJob.quantity || 0) * (nextJob.part?.minStock || 1)
// //         : nextJob.order?.productQuantity || 0);

// //     const remainingQty = scheduleQuantity - (nextJob.completedQuantity || 0);
// //     const responseData = {
// //       ...nextJob,
// //       productionId: getProductionResponse?.id || null,
// //       upcommingOrder: upcomingOrder?.order?.shipDate || null,
// //       employeeInfo: getProductionResponse?.employeeInfo || null,
// //       cycleTime: getProductionResponse?.cycleTimeStart || null,
// //       completedQty: getProductionResponse?.completedQuantity || 0,
// //       scheduleQuantity: scheduleQuantity,
// //       remainingQty: remainingQty || nextJob.quantity,
// //       scrapQty: getProductionResponse.scrapQuantity || 0,
// //     };

// //     res.status(200).json({
// //       message: "Next job found successfully.",
// //       data: responseData,
// //     });
// //   } catch (error) {
// //     console.error("Error finding next job:", error);
// //     res.status(500).json({ message: "Something went wrong." });
// //   }
// // };

// // okok
// // const getScheduleProcessInformation = async (req, res) => {
// //   try {
// //     const { id: processId } = req.params;
// //     if (!processId) {
// //       return res.status(400).json({ message: "processId is required." });
// //     }

// //     // --- REUSABLE HELPER FUNCTION TO FIND AND ATTACH ORDER DATA ---
// //     const findAndStitchJob = async (findOptions) => {
// //       // Step 1: Find the schedule with all its related data
// //       const schedule = await prisma.stockOrderSchedule.findFirst({
// //         ...findOptions,
// //         include: {
// //           part: {
// //             include: {
// //               WorkInstruction: {
// //                 include: {
// //                   steps: {
// //                     orderBy: { stepNumber: "asc" },
// //                     include: {
// //                       images: { select: { id: true, imagePath: true } },
// //                       videos: { select: { id: true, videoPath: true } },
// //                     },
// //                   },
// //                 },
// //               },
// //             },
// //           },
// //           process: { select: { processName: true } },
// //         },
// //       });

// //       if (!schedule) return null;

// //       // Step 2: Fetch the correct parent order data (StockOrder or CustomOrder)
// //       let orderData = null;
// //       const orderSelectFields = {
// //         id: true,
// //         orderNumber: true,
// //         productQuantity: true,
// //         partId: true, // This is the final product's ID
// //         shipDate: true,
// //         createdAt: true,
// //       };

// //       if (schedule.order_type === "StockOrder" && schedule.order_id) {
// //         orderData = await prisma.stockOrder.findUnique({
// //           where: { id: schedule.order_id },
// //           select: orderSelectFields,
// //         });
// //       } else if (schedule.order_type === "CustomOrder" && schedule.order_id) {
// //         orderData = await prisma.customOrder.findUnique({
// //           where: { id: schedule.order_id },
// //           select: {
// //             id: true,
// //             orderNumber: true,
// //             shipDate: true,
// //             createdAt: true,
// //           },
// //         });
// //       }

// //       // Step 3: Stitch the order data onto the schedule object and return
// //       return { ...schedule, order: orderData };
// //     };
// //     // --- END OF HELPER FUNCTION ---

// //     // =================================================================
// //     // ===========> RESTRUCTURED JOB SEARCH LOGIC STARTS HERE <===========
// //     // =================================================================

// //     let nextJob = null;

// //     // PRIORITY 1: Find any job currently in "progress" at this station.
// //     // This ensures that if the page is refreshed, the user sees the same job.
// //     nextJob = await findAndStitchJob({
// //       where: {
// //         processId,
// //         status: "progress",
// //         isDeleted: false,
// //       },
// //     });

// //     // PRIORITY 2: If no job is in progress, check if a 'part' was just completed
// //     // and immediately look for its corresponding 'product' job. This is the key fix.
// //     if (!nextJob) {
// //       const lastCompletedPartJob = await prisma.stockOrderSchedule.findFirst({
// //         where: {
// //           processId,
// //           status: "completed",
// //           type: "part",
// //           isDeleted: false,
// //         },
// //         orderBy: { updatedAt: "desc" },
// //       });

// //       if (lastCompletedPartJob) {
// //         // Look specifically for the 'product' job from the SAME order that is ready to start
// //         nextJob = await findAndStitchJob({
// //           where: {
// //             order_id: lastCompletedPartJob.order_id,
// //             type: "product",
// //             status: { in: ["new", "progress"] }, // It must be 'new' or could be already 'progress'
// //             isDeleted: false,
// //           },
// //         });
// //       }
// //     }

// //     // PRIORITY 3: If still no job found, get the oldest "new" job for this station.
// //     // This is the generic "get next in queue" logic.
// //     if (!nextJob) {
// //       nextJob = await findAndStitchJob({
// //         where: {
// //           processId,
// //           status: "new",
// //           isDeleted: false,
// //         },
// //         orderBy: {
// //           createdAt: "asc",
// //         },
// //       });
// //     }

// //     // =================================================================
// //     // ===========>  RESTRUCTURED JOB SEARCH LOGIC ENDS HERE  <===========
// //     // =================================================================

// //     if (!nextJob || !nextJob.order) {
// //       return res
// //         .status(404)
// //         .json({ message: "No jobs found for this station." });
// //     }

// //     // --- Fetch auxiliary data for the response ---
// //     const { order_id, part_id } = nextJob;

// //     const [lastProductionCycle, currentProductionResponse, upcomingOrder] =
// //       await Promise.all([
// //         // Gets the last cycle details for this station (for employee info, etc.)
// //         prisma.productionResponse.findFirst({
// //           where: { processId, isDeleted: false },
// //           orderBy: { cycleTimeStart: "desc" },
// //           include: {
// //             employeeInfo: {
// //               select: { firstName: true, lastName: true, id: true },
// //             },
// //           },
// //         }),

// //         // Gets specific production details for THIS job
// //         prisma.productionResponse.findFirst({
// //           where: { orderId: order_id, partId: part_id, processId },
// //           orderBy: { cycleTimeStart: "desc" },
// //           select: { id: true, scheduleQuantity: true },
// //         }),

// //         // Finds the next upcoming job for the UI
// //         (async () => {
// //           const upcomingSchedule = await prisma.stockOrderSchedule.findFirst({
// //             where: {
// //               processId,
// //               id: { not: nextJob.id },
// //               status: { in: ["new", "progress"] },
// //               createdAt: { gte: nextJob.createdAt },
// //             },
// //             orderBy: { createdAt: "asc" },
// //           });

// //           if (!upcomingSchedule) return null;

// //           const upcomingOrderData = await prisma.stockOrder.findUnique({
// //             where: { id: upcomingSchedule.order_id },
// //             select: { shipDate: true },
// //           });

// //           return { ...upcomingSchedule, order: upcomingOrderData };
// //         })(),
// //       ]);

// //     // Get the schedule quantity directly from the schedule record itself.
// //     const scheduleQuantity = nextJob.scheduleQuantity || 0;
// //     const remainingQuantity = nextJob.remainingQty || 0;

// //     // --- Construct the final response object ---
// //     const responseData = {
// //       ...nextJob,
// //       productionId: lastProductionCycle?.id || null,
// //       productId: nextJob.order?.partId || null, // Final product ID from the parent order
// //       upcommingOrder: upcomingOrder?.order?.shipDate || null,
// //       employeeInfo: lastProductionCycle?.employeeInfo || null,
// //       cycleTime: lastProductionCycle?.cycleTimeStart || null,
// //       completedQty: nextJob.completedQuantity || 0,
// //       scheduleQuantity: scheduleQuantity,
// //       scrapQty: lastProductionCycle?.scrapQuantity || 0,
// //       remainingQty: remainingQuantity,
// //     };

// //     res.status(200).json({
// //       message: "Next job found successfully.",
// //       data: responseData,
// //     });
// //   } catch (error) {
// //     console.error("Error finding next job:", error);
// //     res
// //       .status(500)
// //       .json({ message: "Something went wrong.", error: error.message });
// //   }
// // };
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
//           },
//         });
//       }
//       return { ...schedule, order: orderData };
//     };
//     // --- END OF HELPER FUNCTION ---

//     let nextJob = null;

//     // PRIORITY 1: Find any job currently in "progress".
//     nextJob = await findAndStitchJob({
//       where: {
//         processId,
//         status: "progress",
//         isDeleted: false,
//       },
//     });

//     // PRIORITY 2: If no job is in progress, check if a 'part' was just completed.
//     if (!nextJob) {
//       const lastCompletedPartJob = await prisma.stockOrderSchedule.findFirst({
//         where: {
//           processId,
//           status: "completed",
//           type: "part",
//           isDeleted: false,
//         },
//         orderBy: { updatedAt: "desc" },
//       });

//       if (lastCompletedPartJob) {
//         // ===> CRITICAL LOGIC CHANGE IS HERE <===
//         // Before looking for the product, check if ALL parts for this order are completed.
//         const pendingPartsCount = await prisma.stockOrderSchedule.count({
//           where: {
//             order_id: lastCompletedPartJob.order_id,
//             order_type: lastCompletedPartJob.order_type, // Ensure we check within the same order type
//             type: "part",
//             status: { not: "completed" },
//             isDeleted: false,
//           },
//         });

//         // Only if there are no more pending parts, proceed to find the product job.
//         if (pendingPartsCount === 0) {
//           nextJob = await findAndStitchJob({
//             where: {
//               order_id: lastCompletedPartJob.order_id,
//               order_type: lastCompletedPartJob.order_type,
//               type: "product",
//               status: { in: ["new", "progress"] },
//               isDeleted: false,
//             },
//           });
//         }
//         // If pendingPartsCount > 0, nextJob remains null, and the logic will
//         // correctly fall through to Priority 3 to find the next 'new' part.
//       }
//     }

//     // PRIORITY 3: If still no job found, get the oldest "new" job, prioritizing parts.
//     if (!nextJob) {
//       nextJob = await findAndStitchJob({
//         where: {
//           processId,
//           status: "new",
//           isDeleted: false,
//         },
//         orderBy: [
//           { createdAt: "asc" },
//           { type: "asc" }, // 'part' before 'product'
//         ],
//       });
//     }

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

//     const scheduleQuantity = nextJob.quantity || 0;
//     const completedQuantity = nextJob.completedQuantity || 0;
//     const remainingQuantity = Math.max(0, scheduleQuantity - completedQuantity);

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
// // const completeScheduleOrder = async (req, res) => {
// //   try {
// //     const { id } = req.params;
// //     const { orderId, partId, employeeId, productId, type } = req.body;
// //     await prisma.productionResponse.update({
// //       where: { id },
// //       data: {
// //         quantity: true,
// //         scrap: false,
// //         cycleTimeEnd: new Date(),
// //       },
// //     });
// //     const orderSchedule = await prisma.stockOrderSchedule.findUnique({
// //       where: {
// //         order_id_part_id: {
// //           order_id: orderId,
// //           part_id: partId,
// //         },
// //       },
// //     });

// //     if (
// //       !orderSchedule.scheduleQuantity ||
// //       typeof orderSchedule.scheduleQuantity !== "number"
// //     ) {
// //       return res.status(400).json({
// //         message: "Schedule quantity not found or invalid.",
// //       });
// //     }
// //     console.log("orderScheduleorderSchedule", orderSchedule);

// //     const completedQuantity = orderSchedule.completedQuantity;
// //     console.log("completedQuantitycompletedQuantity", completedQuantity);

// //     const totalScheduleQty = orderSchedule.scheduleQuantity;
// //     const remainingQty = totalScheduleQty - completedQuantity;
// //     console.log(
// //       "completedQuantity completedQuantity ",
// //       completedQuantity,
// //       totalScheduleQty,
// //       remainingQty
// //     );

// //     if (completedQuantity >= totalScheduleQty) {
// //       return res.status(400).json({
// //         message: "Order is already fully completed.",
// //         status: "completed",
// //       });
// //     }
// //     const newCompletedQty = completedQuantity + 1;
// //     const updatedStatus =
// //       newCompletedQty === totalScheduleQty ? "completed" : "progress";

// //     await prisma.stockOrderSchedule.update({
// //       where: {
// //         order_id_part_id: {
// //           order_id: orderId,
// //           part_id: partId,
// //         },
// //       },
// //       data: {
// //         completedQuantity: newCompletedQty,
// //         completed_date:
// //           newCompletedQty === totalScheduleQty ? new Date() : undefined,
// //         status: updatedStatus,
// //         remainingQty: remainingQty,
// //       },
// //     });

// //     if (updatedStatus === "progress") {
// //       await prisma.partNumber.update({
// //         where: {
// //           part_id: partId,
// //         },
// //         data: {
// //           availStock: {
// //             decrement: 1,
// //           },
// //         },
// //       });
// //     }
// //     if (updatedStatus === "completed") {
// //       await prisma.partNumber.update({
// //         where: {
// //           part_id: productId,
// //         },
// //         data: {
// //           availStock: {
// //             increment: 1,
// //           },
// //         },
// //       });
// //     }
// //     await prisma.productionResponse.updateMany({
// //       where: {
// //         id,
// //         stationUserId: employeeId,
// //         partId: partId,
// //         orderId: orderId,
// //       },
// //       data: {
// //         completedQuantity: {
// //           increment: 1,
// //         },
// //       },
// //     });
// //     return res.status(200).json({
// //       message:
// //         updatedStatus === "completed"
// //           ? "Order scheduling completed."
// //           : "This order has been added as completed.",
// //       status: updatedStatus,
// //     });
// //   } catch (error) {
// //     console.error("Error completing schedule order:", error);
// //     res.status(500).json({ message: "An error occurred on the server." });
// //   }
// // };

// // before 19 aug
// // const completeScheduleOrder = async (req, res) => {
// //   try {
// //     const { id } = req.params;
// //     const { orderId, partId, employeeId, productId, type } = req.body;

// //     // This part is fine
// //     await prisma.productionResponse.update({
// //       where: { id },
// //       data: {
// //         quantity: true,
// //         scrap: false,
// //         cycleTimeEnd: new Date(),
// //       },
// //     });

// //     const orderSchedule = await prisma.stockOrderSchedule.findUnique({
// //       where: {
// //         order_id_part_id: {
// //           order_id: orderId,
// //           part_id: partId,
// //         },
// //       },
// //     });

// //     if (
// //       !orderSchedule.scheduleQuantity ||
// //       typeof orderSchedule.scheduleQuantity !== "number"
// //     ) {
// //       return res.status(400).json({
// //         message: "Schedule quantity not found or invalid.",
// //       });
// //     }
// //     console.log("orderScheduleorderSchedule", orderSchedule);

// //     const completedQuantity = orderSchedule.completedQuantity;
// //     const totalScheduleQty = orderSchedule.scheduleQuantity;

// //     if (completedQuantity >= totalScheduleQty) {
// //       return res.status(400).json({
// //         message: "Order is already fully completed.",
// //         status: "completed",
// //       });
// //     }

// //     // --- START OF CORRECTION ---

// //     // 1. Pehle 'newCompletedQty' calculate karein.
// //     // 1. First, calculate the 'newCompletedQty'.
// //     const newCompletedQty = completedQuantity + 1;

// //     // 2. Ab 'newCompletedQty' ke basis par 'newRemainingQty' calculate karein.
// //     // 2. Now, calculate the 'newRemainingQty' based on the new completed quantity.
// //     const newRemainingQty = totalScheduleQty - newCompletedQty;

// //     // --- END OF CORRECTION ---

// //     const updatedStatus =
// //       newCompletedQty >= totalScheduleQty ? "completed" : "progress";

// //     await prisma.stockOrderSchedule.update({
// //       where: {
// //         order_id_part_id: {
// //           order_id: orderId,
// //           part_id: partId,
// //         },
// //       },
// //       data: {
// //         completedQuantity: newCompletedQty,
// //         completed_date: updatedStatus === "completed" ? new Date() : undefined,
// //         status: updatedStatus,
// //         remainingQty: newRemainingQty,
// //       },
// //     });

// //     if (updatedStatus === "progress") {
// //       await prisma.partNumber.update({
// //         where: { part_id: partId },
// //         data: {
// //           availStock: {
// //             decrement: 1,
// //           },
// //         },
// //       });
// //     }

// //     if (updatedStatus === "completed") {
// //       await prisma.partNumber.update({
// //         where: { part_id: productId },
// //         data: {
// //           availStock: {
// //             increment: 1,
// //           },
// //         },
// //       });
// //     }

// //     await prisma.productionResponse.updateMany({
// //       where: {
// //         id,
// //         stationUserId: employeeId,
// //         partId: partId,
// //         orderId: orderId,
// //       },
// //       data: {
// //         completedQuantity: {
// //           increment: 1,
// //         },
// //         remainingQty: newRemainingQty,
// //       },
// //     });

// //     return res.status(200).json({
// //       message:
// //         updatedStatus === "completed"
// //           ? "Order scheduling completed."
// //           : "This order has been added as completed.",
// //       status: updatedStatus,
// //     });
// //   } catch (error) {
// //     console.error("Error completing schedule order:", error);
// //     res.status(500).json({ message: "An error occurred on the server." });
// //   }
// // };
// // const scrapScheduleOrder = async (req, res) => {
// //   try {
// //     const { id } = req.params;
// //     const { orderId, partId, employeeId } = req.body;
// //     await prisma.productionResponse.update({
// //       where: { id },
// //       data: { scrap: true, quantity: false, cycleTimeEnd: new Date() },
// //     });
// //     const orderSchedule = await prisma.stockOrderSchedule.findUnique({
// //       where: {
// //         order_id_part_id: {
// //           order_id: orderId,
// //           part_id: partId,
// //         },
// //       },
// //     });

// //     if (!orderSchedule) {
// //       return res
// //         .status(404)
// //         .json({ message: "Stock order schedule not found." });
// //     }

// //     const currentRemainingQty =
// //       orderSchedule.scheduleQuantity - (orderSchedule.completedQuantity || 0);
// //     const newRemainingQty = Math.max(0, currentRemainingQty - 1);

// //     await prisma.stockOrderSchedule.update({
// //       where: {
// //         order_id_part_id: {
// //           order_id: orderId,
// //           part_id: partId,
// //         },
// //       },
// //       data: {
// //         status: "progress",
// //         scrapQuantity: {
// //           increment: 1,
// //         },
// //         scheduleQuantity: {
// //           decrement: 1,
// //         },
// //         remainingQty: newRemainingQty,
// //       },
// //     });

// //     await prisma.productionResponse.updateMany({
// //       where: {
// //         id,
// //         stationUserId: employeeId,
// //         partId: partId,
// //         orderId: orderId,
// //       },
// //       data: {
// //         scrapQuantity: {
// //           increment: 1,
// //         },
// //         remainingQty: newRemainingQty,
// //       },
// //     });

// //     if (orderSchedule.remainingQty === 0) {
// //       await prisma.stockOrderSchedule.update({
// //         where: {
// //           order_id_part_id: {
// //             order_id: orderId,
// //             part_id: partId,
// //           },
// //         },
// //         data: {
// //           status: "completed",
// //         },
// //       });
// //     }
// //     return res.status(200).json({
// //       message: "This order has been added as scrap.",
// //     });
// //   } catch (error) {
// //     console.error("Error scrapping schedule order:", error);
// //     res.status(500).json({ message: "An error occurred on the server." });
// //   }
// // };

// // begore 19 aug

// const completeScheduleOrder = async (req, res) => {
//   try {
//     const { id } = req.params;
//     const { orderId, partId, employeeId, productId, order_type } = req.body;

//     // Validation for the polymorphic key
//     if (!order_type) {
//       return res.status(400).json({ message: "order_type is required." });
//     }

//     // Update the production response log
//     await prisma.productionResponse.update({
//       where: { id },
//       data: {
//         quantity: true,
//         scrap: false,
//         cycleTimeEnd: new Date(),
//       },
//     });

//     // Find the correct schedule using the 3-part unique key
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
//       return res.status(404).json({ message: "Order schedule not found." });
//     }

//     if (
//       !orderSchedule.scheduleQuantity ||
//       typeof orderSchedule.scheduleQuantity !== "number"
//     ) {
//       return res.status(400).json({
//         message: "Schedule quantity not found or invalid.",
//       });
//     }

//     const completedQuantity = orderSchedule.completedQuantity || 0;
//     const totalScheduleQty = orderSchedule.scheduleQuantity;

//     if (completedQuantity >= totalScheduleQty) {
//       return res.status(400).json({
//         message: "Order is already fully completed.",
//         status: "completed",
//       });
//     }

//     // Calculate new quantities and status
//     const newCompletedQty = completedQuantity + 1;
//     const newRemainingQty = totalScheduleQty - newCompletedQty;
//     const updatedStatus =
//       newCompletedQty >= totalScheduleQty ? "completed" : "progress";

//     // Update the schedule using the 3-part unique key
//     await prisma.stockOrderSchedule.update({
//       where: {
//         order_id_part_id_order_type: {
//           order_id: orderId,
//           part_id: partId,
//           order_type: order_type,
//         },
//       },
//       data: {
//         completedQuantity: newCompletedQty,
//         completed_date: updatedStatus === "completed" ? new Date() : undefined,
//         status: updatedStatus,
//         remainingQty: newRemainingQty,
//       },
//     });

//     // Decrement stock for the component part that was just used
//     if (updatedStatus === "progress") {
//       await prisma.partNumber.update({
//         where: { part_id: partId },
//         data: { availStock: { decrement: 1 } },
//       });
//     }

//     // --- SOLUTION FOR THE LATEST ERROR IS HERE ---
//     // If the entire order is now complete, increment the final product's stock
//     if (updatedStatus === "completed") {
//       // Add validation: If the order is complete, we MUST have the final productId.

//       await prisma.partNumber.update({
//         where: { part_id: productId }, // We are now sure productId is not undefined
//         data: { availStock: { increment: 1 } },
//       });
//     }
//     // --- END OF SOLUTION ---

//     // Update the production log with the new quantities
//     await prisma.productionResponse.updateMany({
//       where: {
//         id,
//         stationUserId: employeeId,
//         partId: partId,
//         orderId: orderId,
//       },
//       data: {
//         completedQuantity: { increment: 1 },
//         remainingQty: newRemainingQty,
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
//     res.status(500).json({
//       message: "An error occurred on the server.",
//       error: error.message,
//     });
//   }
// };
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
// const updateStepTime = async (req, res) => {
//   try {
//     const { id } = req.params;
//     const { stepId } = req.body;
//     if (!id || !stepId) {
//       return res.status(400).json({ message: "Missing data" });
//     }
//     const updated = await prisma.productionStepTracking.updateMany({
//       where: {
//         productionResponseId: id,
//         workInstructionStepId: stepId,
//       },
//       data: {
//         stepStartTime: new Date(),
//         stepEndTime: new Date(),
//         status: "completed",
//       },
//     });
//     if (updated.count === 0) {
//       return res.status(404).json({ message: "Step not found." });
//     }
//     return res.status(200).json({ message: "Step marked completed" });
//   } catch (error) {
//     console.error("Step update error:", error);
//     res.status(500).json({ message: "Internal server error" });
//   }
// };

// const completeTraning = async (req, res) => {
//   try {
//     const { id } = req.params;
//     await prisma.productionResponse.update({
//       where: { id },
//       data: {
//         traniningStatus: true,
//       },
//     });

//     return res.status(200).json({
//       message: "Order scheduling completed.",
//     });
//   } catch (error) {
//     console.error("Error completing schedule order:", error);
//     res.status(500).json({ message: "An error occurred on the server." });
//   }
// };
// // const markStepAsCompleted = async (req, res) => {
// //   try {
// //     const { productionResponseId, stepId } = req.body;

// //     if (!productionResponseId || !stepId) {
// //       return res.status(400).json({ message: "Missing required fields." });
// //     }

// //     const updated = await prisma.productionStepTracking.updateMany({
// //       where: {
// //         productionResponseId,
// //         workInstructionStepId: stepId,
// //       },
// //       data: {
// //         stepEndTime: new Date(),
// //         status: "completed",
// //       },
// //     });

// //     if (updated.count === 0) {
// //       return res
// //         .status(404)
// //         .json({ message: "Step not found or already completed." });
// //     }

// //     return res.status(200).json({
// //       message: "Step marked as completed.",
// //       data: {
// //         productionResponseId,
// //         stepId,
// //         stepEndTime: new Date(),
// //       },
// //     });
// //   } catch (error) {
// //     console.error("Error completing step:", error);
// //     res
// //       .status(500)
// //       .json({ message: "Internal server error", error: error.message });
// //   }
// // };

// const barcodeScan = async (req, res) => {
//   try {
//     const { barcode } = req.body;

//     const part = await prisma.part.findUnique({ where: { barcode } });

//     if (!part) {
//       return res.status(404).json({ message: "❌ Invalid barcode" });
//     }

//     const order = await prisma.stockOrderSchedule.findFirst({
//       where: {
//         part_id: part.id,
//         status: { not: "completed" },
//       },
//     });

//     if (!order) {
//       return res.status(404).json({ message: "❌ No active order found" });
//     }

//     const newQty = order.completedQuantity + 1;
//     const status = newQty === order.quantity ? "completed" : "progress";

//     await prisma.stockOrderSchedule.update({
//       where: {
//         order_id_part_id: { order_id: order.order_id, part_id: part.id },
//       },
//       data: {
//         completedQuantity: newQty,
//         status,
//         completed_date: status === "completed" ? new Date() : undefined,
//       },
//     });

//     res.json({
//       message:
//         status === "completed" ? "✅ Order Completed!" : "✅ Order In Progress",
//     });
//   } catch (error) {
//     console.log(error);
//   }
// };

// const processBarcodeScan = async (req, res) => {
//   try {
//     const { id } = req.params;
//     const { barcode, employeeId } = req.body;

//     const partInstance = await prisma.stockOrderSchedule.findUnique({
//       where: { barcode: barcode },
//     });

//     if (!partInstance) {
//       return res
//         .status(404)
//         .json({ message: "Invalid Barcode. Part not found." });
//     }

//     if (
//       partInstance.status === "COMPLETED" ||
//       partInstance.status === "SCRAPPED"
//     ) {
//       return res.status(409).json({
//         message: `This part (${barcode}) has already been processed.`,
//       });
//     }

//     const { orderId, partId } = partInstance;

//     await prisma.productionResponse.update({
//       where: { id },
//       data: {
//         quantity: true,
//         scrap: false,
//         cycleTimeEnd: new Date(),
//       },
//     });

//     const orderSchedule = await prisma.stockOrderSchedule.findUnique({
//       where: { order_id_part_id: { order_id: orderId, part_id: partId } },
//     });

//     if (!orderSchedule) {
//       return res
//         .status(404)
//         .json({ message: "Stock order schedule not found for this part." });
//     }

//     const newCompletedQty = (orderSchedule.completedQuantity || 0) + 1;
//     const updatedStatus =
//       newCompletedQty === orderSchedule.quantity ? "completed" : "progress";

//     await prisma.stockOrderSchedule.update({
//       where: { order_id_part_id: { order_id: orderId, part_id: partId } },
//       data: {
//         completedQuantity: newCompletedQty,
//         completed_date: updatedStatus === "completed" ? new Date() : undefined,
//         status: updatedStatus,
//       },
//     });

//     await prisma.productionResponse.updateMany({
//       where: { id, stationUserId: employeeId, partId, orderId },
//       data: { completedQuantity: { increment: 1 } },
//     });

//     await prisma.partInstance.update({
//       where: { id: partInstance.id },
//       data: { status: "COMPLETED" },
//     });

//     return res.status(200).json({
//       message: "Part completed successfully!",
//       status: updatedStatus,
//     });
//   } catch (error) {
//     console.error("Error processing barcode scan:", error);
//     res.status(500).json({ message: "An error occurred on the server." });
//   }
// };

// const deleteScheduleOrder = async (req, res) => {
//   try {
//     const id = req.params.id;
//     prisma.partNumber
//       .update({
//         where: {
//           id: id,
//           isDeleted: false,
//         },
//         data: {
//           isDeleted: true,
//         },
//       })
//       .then();

//     return res.status(200).json({
//       message: "Employee delete successfully !",
//     });
//   } catch (error) {
//     return res.status(500).send({
//       message: "Something went wrong. Please try again later.",
//     });
//   }
// };

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
//           createdBy,
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

// const completeScheduleOrderViaGet = async (req, res) => {
//   try {
//     const { id, orderId, partId, employeeId, productId } = req.query;

//     if (!id || !orderId || !partId || !employeeId || !productId) {
//       return res.status(400).json({ message: "Missing required fields" });
//     }

//     await prisma.productionResponse.update({
//       where: { id },
//       data: {
//         quantity: true,
//         scrap: false,
//         cycleTimeEnd: new Date(),
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

//     const { completedQuantity = 0, quantity } = orderSchedule;
//     if (completedQuantity >= quantity) {
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
//         completed_date: newCompletedQty === quantity ? new Date() : undefined,
//         status: updatedStatus,
//       },
//     });

//     if (updatedStatus === "progress") {
//       await prisma.partNumber.update({
//         where: { part_id: partId },
//         data: {
//           availStock: { decrement: 1 },
//         },
//       });
//     }

//     if (updatedStatus === "completed") {
//       await prisma.partNumber.update({
//         where: { part_id: productId },
//         data: {
//           availStock: { increment: 1 },
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
//         completedQuantity: { increment: 1 },
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
//     console.error("GET Scan Complete Error:", error);
//     return res.status(500).json({ message: "Internal server error" });
//   }
// };

// const allScrapEntires = async (req, res) => {
//   try {
//     const paginationData = await paginationQuery(req.query);
//     const { filterScrap, search } = req.query;

//     const condition = {
//       isDeleted: false,
//     };

//     if (filterScrap && filterScrap.toLowerCase() !== "all") {
//       condition.type = filterScrap;
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
//         },
//       }),
//       prisma.scapEntries.count({
//         where: condition,
//       }),
//     ]);

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
//     console.log("error", error);

//     return res.status(500).send({
//       message: "Something went wrong. Please try again later.",
//     });
//   }
// };

// const selectScheudlePartNumber = async (req, res) => {
//   try {
//     const process = await prisma.partNumber.findMany({
//       select: {
//         part_id: true,
//         partNumber: true,
//       },
//       where: {
//         type: "part",
//         isDeleted: false,
//         usedAsPart: {
//           some: {
//             status: { not: "completed" },
//             isDeleted: false,
//           },
//         },
//       },
//     });

//     const formattedProcess = process.map((process) => ({
//       id: process.part_id,
//       partNumber: process.partNumber,
//     }));
//     res.status(200).json({
//       data: formattedProcess,
//     });
//   } catch (error) {
//     res
//       .status(500)
//       .json({ message: "Something went wrong . please try again later ." });
//   }
// };

// const selectScheudleProductNumber = async (req, res) => {
//   try {
//     const process = await prisma.partNumber.findMany({
//       select: {
//         part_id: true,
//         partNumber: true,
//       },
//       where: {
//         type: "product",
//         isDeleted: false,
//         StockOrder_StockOrder_productNumberToPartNumber: {
//           some: {
//             isDeleted: false,
//             status: { equals: "scheduled" },
//           },
//         },
//       },
//     });

//     const formattedProcess = process.map((process) => ({
//       id: process.part_id,
//       partNumber: process.partNumber,
//     }));
//     res.status(200).json({
//       data: formattedProcess,
//     });
//   } catch (error) {
//     res
//       .status(500)
//       .json({ message: "Something went wrong . please try again later ." });
//   }
// };

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
//     console.error("Error fetching scrap entry:", error);
//     res.status(500).json({ error: "Internal server error" });
//   }
// };

// const updateScrapEntry = async (req, res) => {
//   try {
//     const { id } = req.params;
//     const {
//       type,
//       partId,
//       returnQuantity,
//       scrapStatus,
//       supplierId,
//       returnSupplierQty,
//       createdBy,
//     } = req.body;

//     const existingEntry = await prisma.scapEntries.findUnique({
//       where: { id },
//     });

//     if (!existingEntry) {
//       return res.status(404).json({ message: "Scrap entry not found" });
//     }

//     const part = await prisma.partNumber.findUnique({
//       where: { part_id: existingEntry.partId },
//       select: { availStock: true },
//     });

//     if (!part) {
//       return res.status(404).json({ error: "Part not found" });
//     }

//     const oldQty = existingEntry.returnQuantity ?? 0;
//     const newQty = Number(returnQuantity);

//     const adjustedStock = (part.availStock ?? 0) + oldQty - newQty;

//     if (adjustedStock < 0) {
//       return res.status(400).json({
//         message: "Insufficient stock to update scrap by the requested quantity",
//       });
//     }

//     const [updatedEntry] = await prisma.$transaction([
//       prisma.scapEntries.update({
//         where: { id },
//         data: {
//           type,
//           partId,
//           productId: req?.body?.productId,
//           returnQuantity: newQty,
//           scrapStatus: scrapStatus === "yes",
//           createdBy,
//           processId: req?.body?.processId,
//           supplierId,
//           returnSupplierQty,
//         },
//       }),
//       prisma.partNumber.update({
//         where: { part_id: existingEntry.partId },
//         data: {
//           availStock: adjustedStock,
//         },
//       }),
//     ]);

//     res.status(200).json({
//       message: "Scrap entry updated and stock adjusted",
//       data: updatedEntry,
//     });
//   } catch (error) {
//     console.error("Error updating scrap entry:", error);
//     res.status(500).json({ error: "Internal server error" });
//   }
// };

// const stationSendNotification = async (req, res) => {
//   try {
//     const fileData = await fileUploadFunc(req, res);
//     const uploadedFiles = fileData?.data || [];
//     const { comment, employeeId } = req.body;
//     const savedRecord = await prisma.stationNotification.create({
//       data: {
//         comment,
//         enqueryImg: uploadedFiles?.[0].filename,
//         employeeId,
//       },
//     });

//     return res.status(201).json({
//       message: "Picture and comment added successfully",
//       data: savedRecord,
//     });
//   } catch (error) {
//     console.error("Error:", error);
//     res.status(500).json({ message: "Server Error", error: error.message });
//   }
// };

// const getStationNotifications = async (req, res) => {
//   try {
//     const { status } = req.query;

//     let whereCondition = {};
//     if (status !== undefined) {
//       whereCondition.status = status === "true";
//     }
//     const notifications = await prisma.stationNotification.findMany({
//       where: whereCondition,
//       orderBy: { createdAt: "desc" },
//     });

//     const totalCount = await prisma.stationNotification.count();
//     const unreadCount = await prisma.stationNotification.count({
//       where: { status: false },
//     });
//     const archivedCount = await prisma.stationNotification.count({
//       where: { status: true },
//     });

//     return res.status(200).json({
//       message: "Notifications fetched successfully",
//       data: notifications,
//       counts: {
//         all: totalCount,
//         unread: unreadCount,
//         archived: archivedCount,
//       },
//     });
//   } catch (error) {
//     console.error("Error fetching notifications:", error);
//     res.status(500).json({
//       error: error.message,
//     });
//   }
// };

// const changeStationNotification = async (req, res) => {
//   try {
//     const { id } = req.params;
//     await prisma.stationNotification.update({
//       where: { id: id, isDeleted: false },
//       data: {
//         status: Boolean(req?.body?.status),
//       },
//     });
//     return res.status(201).send({
//       message: "Accept notification.",
//     });
//   } catch (error) {
//     res.status(500).json({
//       message: "Server Error",
//       error: error.message,
//     });
//   }
// };

// module.exports = {
//   stationLogin,
//   stationLogout,
//   getScheduleProcessInformation,
//   createProductionResponse,
//   getNextJobDetails,
//   selectScheduleProcess,
//   completeScheduleOrder,
//   updateStepTime,
//   completeTraning,
//   scrapScheduleOrder,
//   barcodeScan,
//   processBarcodeScan,
//   deleteScheduleOrder,
//   completeScheduleOrderViaGet,
//   completeScheduleOrderViaGet,
//   scrapEntry,
//   allScrapEntires,
//   selectScheudlePartNumber,
//   selectScheudleProductNumber,
//   getScrapEntryById,
//   updateScrapEntry,
//   stationSendNotification,
//   getStationNotifications,
//   changeStationNotification,
// };

// const prisma = require("../config/prisma");
// const { paginationQuery, pagination } = require("../functions/common");

// // const stationLogin = async (req, res) => {
// //   try {
// //     const { processId, stationUserId, type } = req.body;
// //     let nextJob = await prisma.stockOrderSchedule.findFirst({
// //       where: {
// //         processId,
// //         status: "progress",
// //         isDeleted: false,
// //       },
// //       orderBy: {
// //         createdAt: "asc",
// //       },
// //       include: {
// //         order: { select: { orderNumber: true } },
// //         part: {
// //           select: {
// //             minStock: true,
// //             WorkInstruction: { include: { steps: true } },
// //           },
// //         },
// //       },
// //     });
// //     if (!nextJob) {
// //       nextJob = await prisma.stockOrderSchedule.findFirst({
// //         where: {
// //           processId,
// //           status: "new",
// //           isDeleted: false,
// //         },
// //         orderBy: {
// //           createdAt: "asc",
// //         },
// //         include: {
// //           order: { select: { orderNumber: true } },
// //           part: {
// //             select: {
// //               minStock: true,
// //               WorkInstruction: { include: { steps: true } },
// //             },
// //           },
// //         },
// //       });
// //     }
// //     if (!nextJob) {
// //       return res.status(404).json({
// //         message: "No available jobs found for this station at the moment.",
// //       });
// //     }
// //     const instruction = nextJob?.part?.WorkInstruction?.[0];
// //     const steps = instruction?.steps || [];
// //     const scheduleQuantity = (nextJob.quantity || 0) * nextJob.part.minStock;
// //     const remainingQty = scheduleQuantity;
// //     const processLoginData = await prisma.productionResponse.create({
// //       data: {
// //         process: { connect: { id: processId } },
// //         StockOrder: { connect: { id: nextJob.order_id } },
// //         PartNumber: { connect: { part_id: nextJob.part_id } },
// //         employeeInfo: { connect: { id: stationUserId } },
// //         type,
// //         instructionId: instruction?.id || null,
// //         scrap: null,
// //         cycleTimeStart: new Date(),
// //         cycleTimeEnd: null,
// //         scheduleQuantity: scheduleQuantity,
// //         remainingQty: remainingQty,
// //       },
// //     });

// //     if (type === "training" && steps.length > 0) {
// //       const { employeeId, processId, partId } = processLoginData;
// //       const existingTraining = await prisma.productionResponse.findFirst({
// //         where: {
// //           employeeId: employeeId,
// //           processId: processId,
// //           partId: partId,
// //           traniningStatus: true,
// //         },
// //       });
// //       if (existingTraining) {
// //         return res.status(409).send({
// //           message:
// //             "You have already completed this process and related parts traning  . please choose different process and parts",
// //         });
// //       } else {
// //         const trackingEntries = steps.map((step, index) => ({
// //           productionResponseId: processLoginData.id,
// //           workInstructionStepId: step.id,
// //           status: "pending",
// //           stepStartTime: index === 0 ? new Date() : null,
// //           stepEndTime: null,
// //         }));

// //         await prisma.productionStepTracking.createMany({
// //           data: trackingEntries,
// //         });
// //       }
// //     }
// //     return res.status(200).json({
// //       message: `You have successfully logged into station. Assigned to order: ${nextJob.order.orderNumber}`,
// //       data: processLoginData,
// //     });
// //   } catch (error) {
// //     console.error("Error during process login:", error);
// //     return res.status(500).send({
// //       message: "Something went wrong. Please try again later.",
// //       error: error.message,
// //     });
// //   }
// // };

// // const stationLogin = async (req, res) => {
// //   try {
// //     const { processId, stationUserId, type } = req.body;

// //     let nextJob = null;

// //     // 1️⃣ First check for PART jobs in progress
// //     nextJob = await prisma.stockOrderSchedule.findFirst({
// //       where: {
// //         processId,
// //         status: "progress",
// //         isDeleted: false,
// //         type: "part", // <-- field that identifies part jobs
// //       },
// //       orderBy: { createdAt: "asc" },
// //       include: {
// //         order: { select: { orderNumber: true, productQuantity: true } },
// //         part: {
// //           select: {
// //             minStock: true,
// //             WorkInstruction: { include: { steps: true } },
// //           },
// //         },
// //       },
// //     });

// //     // 2️⃣ If no part job in progress, check for NEW part job
// //     if (!nextJob) {
// //       nextJob = await prisma.stockOrderSchedule.findFirst({
// //         where: {
// //           processId,
// //           status: "new",
// //           isDeleted: false,
// //           type: "part",
// //         },
// //         orderBy: { createdAt: "asc" },
// //         include: {
// //           order: { select: { orderNumber: true, productQuantity: true } },
// //           part: {
// //             select: {
// //               minStock: true,
// //               WorkInstruction: { include: { steps: true } },
// //             },
// //           },
// //         },
// //       });
// //     }

// //     if (!nextJob) {
// //       nextJob = await prisma.stockOrderSchedule.findFirst({
// //         where: {
// //           processId,
// //           status: "progress",
// //           isDeleted: false,
// //           type: "product",
// //         },
// //         orderBy: { createdAt: "asc" },
// //         include: {
// //           order: { select: { orderNumber: true, productQuantity: true } },
// //           part: {
// //             select: {
// //               minStock: true,
// //               WorkInstruction: { include: { steps: true } },
// //             },
// //           },
// //         },
// //       });
// //     }
// //     if (!nextJob) {
// //       nextJob = await prisma.stockOrderSchedule.findFirst({
// //         where: {
// //           processId,
// //           status: "new",
// //           isDeleted: false,
// //           type: "product",
// //         },
// //         orderBy: { createdAt: "asc" },
// //         include: {
// //           order: { select: { orderNumber: true, productQuantity: true } },
// //           part: {
// //             select: {
// //               minStock: true,
// //               WorkInstruction: { include: { steps: true } },
// //             },
// //           },
// //         },
// //       });
// //     }

// //     // ❌ If nothing found at all
// //     if (!nextJob) {
// //       return res.status(404).json({
// //         message: "No available jobs found for this station at the moment.",
// //       });
// //     }

// //     // Determine schedule quantity: PART jobs = quantity * minStock, PRODUCT jobs = productQuantity
// //     let scheduleQuantity =
// //       nextJob.type === "part"
// //         ? (nextJob.quantity || 0) * nextJob.part.minStock
// //         : nextJob.order.productQuantity || 0;

// //     const instruction = nextJob?.part?.WorkInstruction?.[0];
// //     const steps = instruction?.steps || [];

// //     const processLoginData = await prisma.productionResponse.create({
// //       data: {
// //         process: { connect: { id: processId } },
// //         StockOrder: { connect: { id: nextJob.order_id } },
// //         PartNumber: { connect: { part_id: nextJob.part_id } },
// //         employeeInfo: { connect: { id: stationUserId } },
// //         type,
// //         instructionId: instruction?.id || null,
// //         scrap: null,
// //         cycleTimeStart: new Date(),
// //         cycleTimeEnd: null,
// //         scheduleQuantity: scheduleQuantity,
// //         remainingQty: scheduleQuantity,
// //       },
// //     });

// //     // Training logic unchanged
// //     if (type === "training" && steps.length > 0) {
// //       const { employeeId, processId, partId } = processLoginData;
// //       const existingTraining = await prisma.productionResponse.findFirst({
// //         where: {
// //           employeeId,
// //           processId,
// //           partId,
// //           traniningStatus: true,
// //         },
// //       });

// //       if (existingTraining) {
// //         return res.status(409).send({
// //           message:
// //             "You have already completed this process and related parts training. Please choose a different process and part.",
// //         });
// //       } else {
// //         const trackingEntries = steps.map((step, index) => ({
// //           productionResponseId: processLoginData.id,
// //           workInstructionStepId: step.id,
// //           status: "pending",
// //           stepStartTime: index === 0 ? new Date() : null,
// //           stepEndTime: null,
// //         }));

// //         await prisma.productionStepTracking.createMany({
// //           data: trackingEntries,
// //         });
// //       }
// //     }

// //     return res.status(200).json({
// //       message: `You have successfully logged into station. Assigned to order: ${nextJob.order.orderNumber}`,
// //       data: processLoginData,
// //     });
// //   } catch (error) {
// //     console.error("Error during process login:", error);
// //     return res.status(500).send({
// //       message: "Something went wrong. Please try again later.",
// //       error: error.message,
// //     });
// //   }
// // };

// const stationLogin = async (req, res) => {
//   try {
//     const { processId, stationUserId, type } = req.body;

//     // Use the new helper to find the next job for this station
//     const nextJob = await findNextJobForStation(prisma, processId);

//     if (!nextJob) {
//       return res.status(404).json({
//         message: "No available jobs found for this station at the moment.",
//       });
//     }

//     // Determine schedule quantity
//     const scheduleQuantity =
//       nextJob.type === "part"
//         ? (nextJob.quantity || 0) * (nextJob.part?.minStock || 1)
//         : nextJob.order?.productQuantity || 0;

//     const instruction = nextJob.part?.WorkInstruction?.[0];
//     const steps = instruction?.steps || [];

//     // Create the production response record for this login
//     const processLoginData = await prisma.productionResponse.create({
//       data: {
//         process: { connect: { id: processId } },
//         StockOrder: { connect: { id: nextJob.order_id } },
//         PartNumber: { connect: { part_id: nextJob.part_id } },
//         employeeInfo: { connect: { id: stationUserId } },
//         type,
//         instructionId: instruction?.id || null,
//         cycleTimeStart: new Date(),
//         scheduleQuantity: scheduleQuantity,
//         remainingQty: scheduleQuantity, // Initially, remaining is the total
//       },
//     });

//     // --- Training logic remains the same ---
//     if (type === "training" && steps.length > 0) {
//       // ... your existing training logic ...
//     }

//     return res.status(200).json({
//       message: `You have successfully logged into station. Assigned to order: ${nextJob.order.orderNumber}`,
//       data: { ...processLoginData, nextJob }, // Return both login data and the assigned job
//     });
//   } catch (error) {
//     console.error("Error during process login:", error);
//     return res.status(500).send({
//       message: "Something went wrong. Please try again later.",
//       error: error.message,
//     });
//   }
// };
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
//     console.error("Error during process logout:", error);
//     return res.status(500).send({
//       message: "Something went wrong during logout. Please try again later.",
//       error: error.message,
//     });
//   }
// };

// // const getScheduleProcessInformation = async (req, res) => {
// //   try {
// //     const orderId = req.params.id;
// //     const user = req.user;
// //     const { stationUserId } = req.body;
// //     const data = await prisma.stockOrder.findUnique({
// //       where: {
// //         id: orderId,
// //       },
// //       select: {
// //         shipDate: true,
// //         productQuantity: true,
// //         PartNumber: {
// //           select: {
// //             part_id: true,
// //             partDescription: true,
// //             cycleTime: true,
// //             partNumber: true,
// //             processId: true,
// //           },
// //         },
// //       },
// //     });
// //     const employeeId = user?.id || stationUserId;
// //     const employeeInfo = await prisma.employee.findUnique({
// //       where: {
// //         id: employeeId,
// //       },
// //       select: {
// //         firstName: true,
// //         lastName: true,
// //         email: true,
// //       },
// //     });
// //     if (!data) {
// //       return res.status(404).json({ message: "Stock order not found" });
// //     }

// //     if (!data.PartNumber || !data.PartNumber.part_id) {
// //       return res.status(404).json({ message: "Part information not found" });
// //     }

// //     const workInstructionData = await prisma.workInstruction.findMany({
// //       where: {
// //         productId: data.PartNumber.part_id,
// //       },
// //       select: {
// //         instructionTitle: true,
// //         steps: {
// //           select: {
// //             title: true,
// //             stepNumber: true,
// //             instruction: true,
// //             images: {
// //               select: {
// //                 id: true,
// //                 imagePath: true,
// //               },
// //             },
// //             videos: {
// //               select: {
// //                 id: true,
// //                 videoPath: true,
// //               },
// //             },
// //           },
// //         },
// //       },
// //     });

// //     return res.status(200).json({
// //       message: "Process information retrieved successfully!",
// //       data: {
// //         orderInformation: data,
// //         workInstructionData,
// //         employeeInfo,
// //       },
// //     });
// //   } catch (error) {
// //     console.log("errorerror", error);

// //     return res.status(500).json({
// //       message: "Something went wrong. Please try again later.",
// //     });
// //   }
// // };

// // This is your function

// // const getScheduleProcessInformation = async (req, res) => {
// //   try {
// //     const { id } = req.params;
// //     console.log("req.params for schedule process:", req.params);

// //     if (!id) {
// //       return res.status(400).json({ message: "processId is required." });
// //     }

// //     const nextJob = await prisma.stockOrderSchedule.findFirst({
// //       where: {
// //         processId: id,
// //         status: "new",
// //         isDeleted: false,
// //       },
// //       orderBy: {
// //         createdAt: "asc",
// //       },
// //       include: {
// //         order: {
// //           select: {
// //             id: true,
// //             orderNumber: true,
// //             productQuantity: true,
// //             shipDate: true,
// //             createdAt: true,
// //           },
// //         },
// //         part: {
// //           include: {
// //             WorkInstruction: {
// //               include: {
// //                 steps: {
// //                   orderBy: {
// //                     stepNumber: "asc",
// //                   },
// //                   include: {
// //                     images: {
// //                       select: {
// //                         id: true,
// //                         imagePath: true,
// //                       },
// //                     },
// //                     videos: {
// //                       select: {
// //                         id: true,
// //                         videoPath: true,
// //                       },
// //                     },
// //                   },
// //                 },
// //               },
// //             },
// //           },
// //         },
// //         process: {
// //           select: {
// //             processName: true,
// //           },
// //         },
// //       },
// //     });

// //     if (!nextJob) {
// //       return res
// //         .status(404)
// //         .json({ message: "No new jobs found for this station." });
// //     }

// //     const upcomingOrder = await prisma.stockOrderSchedule.findFirst({
// //       where: {
// //         order: {
// //           createdAt: {
// //             gte: nextJob.order.createdAt,
// //           },
// //         },
// //         id: {
// //           not: nextJob.id,
// //         },
// //       },
// //       include: {
// //         order: {
// //           select: {
// //             shipDate: true,
// //           },
// //         },
// //       },
// //       orderBy: {
// //         createdAt: "asc",
// //       },
// //     });

// //     const getProductionResponse = await prisma.productionResponse.findFirst({
// //       where: {
// //         processId: id,
// //         isDeleted: false,
// //       },
// //       include: {
// //         employeeInfo: {
// //           select: {
// //             firstName: true,
// //             lastName: true,
// //           },
// //         },
// //       },
// //     });
// //     console.log(
// //       "getProductionResponsegetProductionResponse",
// //       getProductionResponse
// //     );

// //     const responseData = {
// //       ...nextJob,
// //       productionId: getProductionResponse.id,
// //       upcommingOrder: upcomingOrder?.order?.shipDate || null,
// //       employeeInfo: getProductionResponse?.employeeInfo || null,
// //       cycleTime: getProductionResponse?.cycleTimeStart,
// //     };

// //     res.status(200).json({
// //       message: "Next job found successfully.",
// //       data: responseData,
// //     });
// //   } catch (error) {
// //     console.error("Error finding next job:", error);
// //     res
// //       .status(500)
// //       .json({ message: "Something went wrong. Please try again later." });
// //   }
// // };

// // const getScheduleProcessInformation = async (req, res) => {
// //   try {
// //     const { id: processId } = req.params;

// //     if (!processId) {
// //       return res.status(400).json({ message: "processId is required." });
// //     }
// //     // Include minStock from partNumber
// //     let nextJob = await prisma.stockOrderSchedule.findFirst({
// //       where: {
// //         processId,
// //         status: "progress",
// //         isDeleted: false,
// //       },
// //       orderBy: { createdAt: "asc" },
// //       include: {
// //         order: {
// //           select: {
// //             id: true,
// //             orderNumber: true,
// //             productQuantity: true,
// //             partId: true,
// //             shipDate: true,
// //             createdAt: true,
// //           },
// //         },
// //         part: {
// //           select: {
// //             minStock: true,
// //             partDescription: true,
// //             WorkInstruction: {
// //               include: {
// //                 steps: {
// //                   orderBy: { stepNumber: "asc" },
// //                   include: {
// //                     images: { select: { id: true, imagePath: true } },
// //                     videos: { select: { id: true, videoPath: true } },
// //                   },
// //                 },
// //               },
// //             },
// //           },
// //         },
// //         process: { select: { processName: true } },
// //       },
// //     });

// //     // Agar "progress" job nahi mila to "new" wala find karo (yahan bhi same include rakhna)
// //     if (!nextJob) {
// //       nextJob = await prisma.stockOrderSchedule.findFirst({
// //         where: {
// //           processId,
// //           status: "new",
// //           isDeleted: false,
// //         },
// //         orderBy: { createdAt: "asc" },
// //         include: {
// //           order: {
// //             select: {
// //               id: true,
// //               orderNumber: true,
// //               productQuantity: true,
// //               shipDate: true,
// //               createdAt: true,
// //             },
// //           },
// //           part: {
// //             select: {
// //               minStock: true, // ✅ direct field
// //               WorkInstruction: {
// //                 include: {
// //                   steps: {
// //                     orderBy: { stepNumber: "asc" },
// //                     include: {
// //                       images: { select: { id: true, imagePath: true } },
// //                       videos: { select: { id: true, videoPath: true } },
// //                     },
// //                   },
// //                 },
// //               },
// //             },
// //           },

// //           process: { select: { processName: true } },
// //         },
// //       });
// //     }

// //     if (!nextJob) {
// //       return res
// //         .status(404)
// //         .json({ message: "No jobs found for this station." });
// //     }

// //     // Calculate scheduleQuantity
// //     const minStock = nextJob.part.minStock;

// //     const scheduleQuantity = (nextJob.quantity || 0) * minStock;

// //     const remainingQty = scheduleQuantity - (nextJob.completedQuantity || 0);

// //     const getProductionResponse = await prisma.productionResponse.findFirst({
// //       where: {
// //         processId,
// //         isDeleted: false,
// //       },
// //       orderBy: { cycleTimeStart: "desc" },
// //       include: {
// //         employeeInfo: {
// //           select: { firstName: true, lastName: true, id: true },
// //         },
// //       },
// //     });

// //     const upcomingOrder = await prisma.stockOrderSchedule.findFirst({
// //       where: {
// //         order: {
// //           createdAt: {
// //             gte: nextJob.order.createdAt,
// //           },
// //         },
// //         id: { not: nextJob.id },
// //       },
// //       include: {
// //         order: { select: { shipDate: true } },
// //       },
// //       orderBy: { createdAt: "asc" },
// //     });

// //     const responseData = {
// //       ...nextJob,
// //       productionId: getProductionResponse?.id || null,
// //       upcommingOrder: upcomingOrder?.order?.shipDate || null,
// //       employeeInfo: getProductionResponse?.employeeInfo || null,
// //       cycleTime: getProductionResponse?.cycleTimeStart || null,
// //       completedQty: getProductionResponse?.completedQuantity || 0,
// //       scheduleQuantity,
// //       remainingQty,
// //       scrapQty: getProductionResponse?.scrapQuantity || 0,
// //     };

// //     res.status(200).json({
// //       message: "Next job found successfully.",
// //       data: responseData,
// //     });

// //     // let nextJob = await prisma.stockOrderSchedule.findFirst({
// //     //   where: {
// //     //     processId,
// //     //     status: "progress",
// //     //     isDeleted: false,
// //     //   },
// //     //   orderBy: { createdAt: "asc" },
// //     //   include: {
// //     //     order: {
// //     //       select: {
// //     //         id: true,
// //     //         orderNumber: true,
// //     //         productQuantity: true,
// //     //         partId: true,
// //     //         shipDate: true,
// //     //         createdAt: true,
// //     //       },
// //     //     },
// //     //     part: {
// //     //       include: {
// //     //         WorkInstruction: {
// //     //           include: {
// //     //             steps: {
// //     //               orderBy: { stepNumber: "asc" },
// //     //               include: {
// //     //                 images: { select: { id: true, imagePath: true } },
// //     //                 videos: { select: { id: true, videoPath: true } },
// //     //               },
// //     //             },
// //     //           },
// //     //         },
// //     //       },
// //     //     },
// //     //     process: { select: { processName: true } },
// //     //   },
// //     // });

// //     // if (!nextJob) {
// //     //   nextJob = await prisma.stockOrderSchedule.findFirst({
// //     //     where: {
// //     //       processId,
// //     //       status: "new",
// //     //       isDeleted: false,
// //     //     },
// //     //     orderBy: { createdAt: "asc" },
// //     //     include: {
// //     //       order: {
// //     //         select: {
// //     //           id: true,
// //     //           orderNumber: true,
// //     //           productQuantity: true,
// //     //           shipDate: true,
// //     //           createdAt: true,
// //     //         },
// //     //       },
// //     //       part: {
// //     //         include: {
// //     //           WorkInstruction: {
// //     //             include: {
// //     //               steps: {
// //     //                 orderBy: { stepNumber: "asc" },
// //     //                 include: {
// //     //                   images: { select: { id: true, imagePath: true } },
// //     //                   videos: { select: { id: true, videoPath: true } },
// //     //                 },
// //     //               },
// //     //             },
// //     //           },
// //     //         },
// //     //       },
// //     //       process: { select: { processName: true } },
// //     //     },
// //     //   });
// //     // }

// //     // if (!nextJob) {
// //     //   return res
// //     //     .status(404)
// //     //     .json({ message: "No jobs found for this station." });
// //     // }
// //     // console.log("nextJobnextJob", nextJob);

// //     // const upcomingOrder = await prisma.stockOrderSchedule.findFirst({
// //     //   where: {
// //     //     order: {
// //     //       createdAt: {
// //     //         gte: nextJob.order.createdAt,
// //     //       },
// //     //     },
// //     //     id: { not: nextJob.id },
// //     //   },
// //     //   include: {
// //     //     order: { select: { shipDate: true } },
// //     //   },
// //     //   orderBy: { createdAt: "asc" },
// //     // });

// //     // const getProductionResponse = await prisma.productionResponse.findFirst({
// //     //   where: {
// //     //     processId,
// //     //     isDeleted: false,
// //     //   },
// //     //   orderBy: { cycleTimeStart: "desc" },
// //     //   include: {
// //     //     employeeInfo: {
// //     //       select: { firstName: true, lastName: true, id: true },
// //     //     },
// //     //   },
// //     // });

// //     // const remainingQty = nextJob.quantity - nextJob.completedQuantity;
// //     // console.log("remainingQty", getProductionResponse.scrapQuantity);

// //     // const responseData = {
// //     //   ...nextJob,
// //     //   productionId: getProductionResponse?.id || null,
// //     //   upcommingOrder: upcomingOrder?.order?.shipDate || null,
// //     //   employeeInfo: getProductionResponse?.employeeInfo || null,
// //     //   cycleTime: getProductionResponse?.cycleTimeStart || null,
// //     //   completedQty: getProductionResponse?.completedQuantity || 0,
// //     //   remainingQty: remainingQty || nextJob.quantity,
// //     //   scrapQty: getProductionResponse.scrapQuantity || 0,
// //     // };

// //     // res.status(200).json({
// //     //   message: "Next job found successfully.",
// //     //   data: responseData,
// //     // });
// //   } catch (error) {
// //     console.error("Error finding next job:", error);
// //     res.status(500).json({ message: "Something went wrong." });
// //   }
// // };

// // const getScheduleProcessInformation = async (req, res) => {
// //   try {
// //     const { id: processId } = req.params;

// //     if (!processId) {
// //       return res.status(400).json({ message: "processId is required." });
// //     }

// //     let nextJob = null;

// //     // 1️⃣ PART JOBS FIRST - In Progress
// //     nextJob = await prisma.stockOrderSchedule.findFirst({
// //       where: {
// //         processId,
// //         status: "progress",
// //         isDeleted: false,
// //         type: "part", // Needs to exist in your schema
// //       },
// //       orderBy: { createdAt: "asc" },
// //       include: {
// //         order: {
// //           select: {
// //             id: true,
// //             orderNumber: true,
// //             productQuantity: true,
// //             partId: true,
// //             shipDate: true,
// //             createdAt: true,
// //           },
// //         },
// //         part: {
// //           select: {
// //             minStock: true,
// //             partDescription: true,
// //             WorkInstruction: {
// //               include: {
// //                 steps: {
// //                   orderBy: { stepNumber: "asc" },
// //                   include: {
// //                     images: { select: { id: true, imagePath: true } },
// //                     videos: { select: { id: true, videoPath: true } },
// //                   },
// //                 },
// //               },
// //             },
// //           },
// //         },
// //         process: { select: { processName: true } },
// //       },
// //     });

// //     // 2️⃣ PART JOBS - New
// //     if (!nextJob) {
// //       nextJob = await prisma.stockOrderSchedule.findFirst({
// //         where: {
// //           processId,
// //           status: "new",
// //           isDeleted: false,
// //           type: "part",
// //         },
// //         orderBy: { createdAt: "asc" },
// //         include: {
// //           order: {
// //             select: {
// //               id: true,
// //               orderNumber: true,
// //               productQuantity: true,
// //               partId: true,
// //               shipDate: true,
// //               createdAt: true,
// //             },
// //           },
// //           part: {
// //             select: {
// //               minStock: true,
// //               partDescription: true,
// //               WorkInstruction: {
// //                 include: {
// //                   steps: {
// //                     orderBy: { stepNumber: "asc" },
// //                     include: {
// //                       images: { select: { id: true, imagePath: true } },
// //                       videos: { select: { id: true, videoPath: true } },
// //                     },
// //                   },
// //                 },
// //               },
// //             },
// //           },
// //           process: { select: { processName: true } },
// //         },
// //       });
// //     }

// //     // 3️⃣ IF NO PART JOB → go to PRODUCT JOB for same product/order
// //     if (!nextJob) {
// //       nextJob = await prisma.stockOrderSchedule.findFirst({
// //         where: {
// //           processId,
// //           status: { in: ["progress", "new"] },
// //           isDeleted: false,
// //           type: "product",
// //         },
// //         orderBy: { createdAt: "asc" },
// //         include: {
// //           order: {
// //             select: {
// //               id: true,
// //               orderNumber: true,
// //               productQuantity: true,
// //               partId: true,
// //               shipDate: true,
// //               createdAt: true,
// //             },
// //           },
// //           part: {
// //             select: {
// //               minStock: true,
// //               partDescription: true,
// //               WorkInstruction: {
// //                 include: {
// //                   steps: {
// //                     orderBy: { stepNumber: "asc" },
// //                     include: {
// //                       images: { select: { id: true, imagePath: true } },
// //                       videos: { select: { id: true, videoPath: true } },
// //                     },
// //                   },
// //                 },
// //               },
// //             },
// //           },
// //           process: { select: { processName: true } },
// //         },
// //       });
// //     }

// //     if (!nextJob) {
// //       return res
// //         .status(404)
// //         .json({ message: "No jobs found for this station." });
// //     }

// //     // 4️⃣ QUANTITY CALCULATION
// //     let scheduleQuantity = 0;
// //     if (nextJob.type === "part") {
// //       scheduleQuantity = (nextJob.quantity || 0) * (nextJob.part.minStock || 0);
// //     } else {
// //       scheduleQuantity = nextJob.order.productQuantity || 0;
// //     }

// //     const remainingQty = scheduleQuantity - (nextJob.completedQuantity || 0);

// //     const getProductionResponse = await prisma.productionResponse.findFirst({
// //       where: {
// //         processId,
// //         isDeleted: false,
// //       },
// //       orderBy: { cycleTimeStart: "desc" },
// //       include: {
// //         employeeInfo: {
// //           select: { firstName: true, lastName: true, id: true },
// //         },
// //       },
// //     });

// //     const upcomingOrder = await prisma.stockOrderSchedule.findFirst({
// //       where: {
// //         order: {
// //           createdAt: {
// //             gte: nextJob.order.createdAt,
// //           },
// //         },
// //         id: { not: nextJob.id },
// //       },
// //       include: {
// //         order: { select: { shipDate: true } },
// //       },
// //       orderBy: { createdAt: "asc" },
// //     });

// //     const responseData = {
// //       ...nextJob,
// //       productionId: getProductionResponse?.id || null,
// //       upcommingOrder: upcomingOrder?.order?.shipDate || null,
// //       employeeInfo: getProductionResponse?.employeeInfo || null,
// //       cycleTime: getProductionResponse?.cycleTimeStart || null,
// //       completedQty: getProductionResponse?.completedQuantity || 0,
// //       scheduleQuantity,
// //       remainingQty,
// //       scrapQty: getProductionResponse?.scrapQuantity || 0,
// //     };

// //     res.status(200).json({
// //       message: "Next job found successfully.",
// //       data: responseData,
// //     });
// //   } catch (error) {
// //     console.error("Error finding next job:", error);
// //     res.status(500).json({ message: "Something went wrong." });
// //   }
// // };

// // const getScheduleProcessInformation = async (req, res) => {
// //   try {
// //     const { id: processId } = req.params;

// //     if (!processId) {
// //       return res.status(400).json({ message: "processId is required." });
// //     }

// //     // PRIORITY 1: Any "in-progress" PART job.
// //     let tempNextJob = await prisma.stockOrderSchedule.findFirst({
// //       where: {
// //         processId,
// //         status: "progress",
// //         isDeleted: false,
// //         type: "part",
// //       },
// //       orderBy: { createdAt: "asc" },
// //       select: { id: true },
// //     });

// //     // PRIORITY 2: The oldest "new" PART job.
// //     if (!tempNextJob) {
// //       tempNextJob = await prisma.stockOrderSchedule.findFirst({
// //         where: {
// //           processId,
// //           status: "new",
// //           isDeleted: false,
// //           type: "part",
// //         },
// //         orderBy: { createdAt: "asc" },
// //         select: { id: true },
// //       });
// //     }

// //     // PRIORITY 3: A PRODUCT job, with the corrected relation name.
// //     if (!tempNextJob) {
// //       tempNextJob = await prisma.stockOrderSchedule.findFirst({
// //         where: {
// //           processId,
// //           status: { in: ["progress", "new"] },
// //           isDeleted: false,
// //           type: "product",
// //           order: {
// //             // === YEH CORRECTED LOGIC HAI ===
// //             // Ab yeh 'schedules' field aapke StockOrder model mein मौजूद hai
// //             schedules: {
// //               none: {
// //                 processId: processId,
// //                 type: "product",
// //                 status: { in: ["new", "progress"] },
// //                 isDeleted: false,
// //               },
// //             },
// //           },
// //         },
// //         orderBy: { createdAt: "asc" },
// //         select: { id: true },
// //       });
// //     }

// //     if (!tempNextJob) {
// //       return res
// //         .status(404)
// //         .json({ message: "No eligible jobs found for this station." });
// //     }

// //     // Fetch the full details of the job we found.
// //     const nextJob = await prisma.stockOrderSchedule.findUnique({
// //       where: { id: tempNextJob.id },
// //       include: {
// //         order: {
// //           select: {
// //             id: true,
// //             orderNumber: true,
// //             productQuantity: true,
// //             partId: true,
// //             shipDate: true,
// //             createdAt: true,
// //           },
// //         },
// //         part: {
// //           select: {
// //             minStock: true,
// //             partDescription: true,
// //             WorkInstruction: {
// //               include: {
// //                 steps: {
// //                   orderBy: { stepNumber: "asc" },
// //                   include: {
// //                     images: { select: { id: true, imagePath: true } },
// //                     videos: { select: { id: true, videoPath: true } },
// //                   },
// //                 },
// //               },
// //             },
// //           },
// //         },
// //         process: { select: { processName: true } },
// //       },
// //     });

// //     // --- The rest of your logic remains the same ---
// //     let scheduleQuantity = 0;
// //     if (nextJob.type === "part") {
// //       scheduleQuantity =
// //         (nextJob.quantity || 0) * (nextJob.part?.minStock || 0);
// //     } else {
// //       scheduleQuantity = nextJob.order.productQuantity || 0;
// //     }

// //     const remainingQty = scheduleQuantity - (nextJob.completedQuantity || 0);

// //     const getProductionResponse = await prisma.productionResponse.findFirst({
// //       where: {
// //         orderId: nextJob.order_id,
// //         processId: nextJob.processId,
// //         isDeleted: false,
// //       },
// //       orderBy: { cycleTimeStart: "desc" },
// //       include: {
// //         employeeInfo: {
// //           select: { firstName: true, lastName: true, id: true },
// //         },
// //       },
// //     });

// //     const upcomingOrder = await prisma.stockOrderSchedule.findFirst({
// //       where: {
// //         createdAt: { gte: nextJob.createdAt },
// //         id: { not: nextJob.id },
// //         processId: processId,
// //       },
// //       include: {
// //         order: { select: { shipDate: true } },
// //       },
// //       orderBy: { createdAt: "asc" },
// //     });

// //     const responseData = {
// //       ...nextJob,
// //       productionId: getProductionResponse?.id || null,
// //       upcommingOrder: upcomingOrder?.order?.shipDate || null,
// //       employeeInfo: getProductionResponse?.employeeInfo || null,
// //       cycleTime: getProductionResponse?.cycleTimeStart || null,
// //       completedQty: nextJob.completedQuantity || 0,
// //       scheduleQuantity,
// //       remainingQty,
// //       scrapQty: nextJob.scrapQuantity || 0,
// //     };

// //     res.status(200).json({
// //       message: "Next job found successfully.",
// //       data: responseData,
// //     });
// //   } catch (error) {
// //     console.error("Error finding next job:", error);
// //     res.status(500).json({ message: "Something went wrong." });
// //   }
// // };

// // const getScheduleProcessInformation = async (req, res) => {
// //   try {
// //     const { id: processId } = req.params;

// //     if (!processId) {
// //       return res.status(400).json({ message: "processId is required." });
// //     }

// //     let nextJob = await prisma.stockOrderSchedule.findFirst({
// //       where: {
// //         processId,
// //         status: "progress",
// //         isDeleted: false,
// //       },
// //       orderBy: { createdAt: "asc" },
// //       include: {
// //         order: {
// //           select: {
// //             id: true,
// //             orderNumber: true,
// //             productQuantity: true,
// //             partId: true,
// //             shipDate: true,
// //             createdAt: true,
// //           },
// //         },
// //         part: {
// //           include: {
// //             WorkInstruction: {
// //               include: {
// //                 steps: {
// //                   orderBy: { stepNumber: "asc" },
// //                   include: {
// //                     images: { select: { id: true, imagePath: true } },
// //                     videos: { select: { id: true, videoPath: true } },
// //                   },
// //                 },
// //               },
// //             },
// //           },
// //         },
// //         process: { select: { processName: true } },
// //       },
// //     });

// //     if (!nextJob) {
// //       nextJob = await prisma.stockOrderSchedule.findFirst({
// //         where: {
// //           processId,
// //           status: "new",
// //           isDeleted: false,
// //         },
// //         orderBy: { createdAt: "asc" },
// //         include: {
// //           order: {
// //             select: {
// //               id: true,
// //               orderNumber: true,
// //               productQuantity: true,
// //               shipDate: true,
// //               createdAt: true,
// //             },
// //           },
// //           part: {
// //             include: {
// //               WorkInstruction: {
// //                 include: {
// //                   steps: {
// //                     orderBy: { stepNumber: "asc" },
// //                     include: {
// //                       images: { select: { id: true, imagePath: true } },
// //                       videos: { select: { id: true, videoPath: true } },
// //                     },
// //                   },
// //                 },
// //               },
// //             },
// //           },
// //           process: { select: { processName: true } },
// //         },
// //       });
// //     }

// //     if (!nextJob) {
// //       return res
// //         .status(404)
// //         .json({ message: "No jobs found for this station." });
// //     }
// //     console.log("nextJobnextJob", nextJob);

// //     const upcomingOrder = await prisma.stockOrderSchedule.findFirst({
// //       where: {
// //         order: {
// //           createdAt: {
// //             gte: nextJob.order.createdAt,
// //           },
// //         },
// //         id: { not: nextJob.id },
// //       },
// //       include: {
// //         order: { select: { shipDate: true } },
// //       },
// //       orderBy: { createdAt: "asc" },
// //     });

// //     const getProductionResponse = await prisma.productionResponse.findFirst({
// //       where: {
// //         processId,
// //         isDeleted: false,
// //       },
// //       orderBy: { cycleTimeStart: "desc" },
// //       include: {
// //         employeeInfo: {
// //           select: { firstName: true, lastName: true, id: true },
// //         },
// //       },
// //     });

// //     const remainingQty = nextJob.quantity - nextJob.completedQuantity;
// //     console.log("remainingQty", getProductionResponse.scrapQuantity);

// //     const responseData = {
// //       ...nextJob,
// //       productionId: getProductionResponse?.id || null,
// //       upcommingOrder: upcomingOrder?.order?.shipDate || null,
// //       employeeInfo: getProductionResponse?.employeeInfo || null,
// //       cycleTime: getProductionResponse?.cycleTimeStart || null,
// //       completedQty: getProductionResponse?.completedQuantity || 0,
// //       remainingQty: remainingQty || nextJob.quantity,
// //       scrapQty: getProductionResponse.scrapQuantity || 0,
// //     };

// //     res.status(200).json({
// //       message: "Next job found successfully.",
// //       data: responseData,
// //     });
// //   } catch (error) {
// //     console.error("Error finding next job:", error);
// //     res.status(500).json({ message: "Something went wrong." });
// //   }
// // };

// // before 12 aug
// // const getScheduleProcessInformation = async (req, res) => {
// //   try {
// //     const { id: processId } = req.params;

// //     if (!processId) {
// //       return res.status(400).json({ message: "processId is required." });
// //     }

// //     let nextJob = await prisma.stockOrderSchedule.findFirst({
// //       where: {
// //         processId,
// //         status: "progress",
// //         isDeleted: false,
// //       },
// //       orderBy: { createdAt: "asc" },
// //       include: {
// //         order: {
// //           select: {
// //             id: true,
// //             orderNumber: true,
// //             productQuantity: true,
// //             partId: true,
// //             shipDate: true,
// //             createdAt: true,
// //           },
// //         },
// //         part: {
// //           include: {
// //             WorkInstruction: {
// //               include: {
// //                 steps: {
// //                   orderBy: { stepNumber: "asc" },
// //                   include: {
// //                     images: { select: { id: true, imagePath: true } },
// //                     videos: { select: { id: true, videoPath: true } },
// //                   },
// //                 },
// //               },
// //             },
// //           },
// //         },
// //         process: { select: { processName: true } },
// //       },
// //     });

// //     if (!nextJob) {
// //       nextJob = await prisma.stockOrderSchedule.findFirst({
// //         where: {
// //           processId,
// //           status: "new",
// //           isDeleted: false,
// //         },
// //         orderBy: { createdAt: "asc" },
// //         include: {
// //           order: {
// //             select: {
// //               id: true,
// //               orderNumber: true,
// //               productQuantity: true,
// //               shipDate: true,
// //               createdAt: true,
// //             },
// //           },
// //           part: {
// //             include: {
// //               WorkInstruction: {
// //                 include: {
// //                   steps: {
// //                     orderBy: { stepNumber: "asc" },
// //                     include: {
// //                       images: { select: { id: true, imagePath: true } },
// //                       videos: { select: { id: true, videoPath: true } },
// //                     },
// //                   },
// //                 },
// //               },
// //             },
// //           },
// //           process: { select: { processName: true } },
// //         },
// //       });
// //     }

// //     if (!nextJob) {
// //       return res
// //         .status(404)
// //         .json({ message: "No jobs found for this station." });
// //     }
// //     console.log("nextJobnextJob", nextJob);

// //     const upcomingOrder = await prisma.stockOrderSchedule.findFirst({
// //       where: {
// //         order: {
// //           createdAt: {
// //             gte: nextJob.order.createdAt,
// //           },
// //         },
// //         id: { not: nextJob.id },
// //       },
// //       include: {
// //         order: { select: { shipDate: true } },
// //       },
// //       orderBy: { createdAt: "asc" },
// //     });

// //     const getProductionResponse = await prisma.productionResponse.findFirst({
// //       where: {
// //         processId,
// //         isDeleted: false,
// //       },
// //       orderBy: { cycleTimeStart: "desc" },
// //       include: {
// //         employeeInfo: {
// //           select: { firstName: true, lastName: true, id: true },
// //         },
// //       },
// //     });

// //     const remainingQty = nextJob.quantity - nextJob.completedQuantity;
// //     console.log("remainingQty", getProductionResponse.scrapQuantity);

// //     const responseData = {
// //       ...nextJob,
// //       productionId: getProductionResponse?.id || null,
// //       upcommingOrder: upcomingOrder?.order?.shipDate || null,
// //       employeeInfo: getProductionResponse?.employeeInfo || null,
// //       cycleTime: getProductionResponse?.cycleTimeStart || null,
// //       completedQty: getProductionResponse?.completedQuantity || 0,
// //       remainingQty: remainingQty || nextJob.quantity,
// //       scrapQty: getProductionResponse.scrapQuantity || 0,
// //     };

// //     res.status(200).json({
// //       message: "Next job found successfully.",
// //       data: responseData,
// //     });
// //   } catch (error) {
// //     console.error("Error finding next job:", error);
// //     res.status(500).json({ message: "Something went wrong." });
// //   }
// // };

// // Get the next job details for a specific process (station)
// // const getScheduleProcessInformation = async (req, res) => {
// //   try {
// //     const { id: processId } = req.params;

// //     if (!processId) {
// //       return res.status(400).json({ message: "processId is required." });
// //     }

// //     // First, look for a job that is already 'in progress' for this station.
// //     let nextJob = await prisma.stockOrderSchedule.findFirst({
// //       where: {
// //         processId,
// //         status: "progress",
// //         isDeleted: false,
// //       },
// //       orderBy: { createdAt: "asc" }, // Get the oldest one
// //       // Include all necessary related data
// //       include: {
// //         order: {
// //           select: {
// //             id: true,
// //             orderNumber: true,
// //             productQuantity: true,
// //             shipDate: true,
// //           },
// //         },
// //         part: {
// //           include: {
// //             WorkInstruction: {
// //               include: { steps: { orderBy: { stepNumber: "asc" } } },
// //             },
// //           },
// //         },
// //         process: { select: { processName: true } },
// //       },
// //     });

// //     // If no job is 'in progress', find the oldest 'new' job for this station.
// //     if (!nextJob) {
// //       nextJob = await prisma.stockOrderSchedule.findFirst({
// //         where: {
// //           processId,
// //           status: "new",
// //           isDeleted: false,
// //         },
// //         orderBy: { createdAt: "asc" }, // Get the oldest new job
// //         include: {
// //           order: {
// //             select: {
// //               id: true,
// //               orderNumber: true,
// //               productQuantity: true,
// //               shipDate: true,
// //             },
// //           },
// //           part: {
// //             include: {
// //               WorkInstruction: {
// //                 include: { steps: { orderBy: { stepNumber: "asc" } } },
// //               },
// //             },
// //           },
// //           process: { select: { processName: true } },
// //         },
// //       });
// //     }

// //     // If still no job is found, then the queue for this station is empty.
// //     if (!nextJob) {
// //       return res
// //         .status(404)
// //         .json({ message: "No available jobs found for this station." });
// //     }

// //     // When a job is fetched, update its status to 'progress'
// //     // This prevents other stations from picking up the same 'new' job
// //     if (nextJob.status === "new") {
// //       await prisma.stockOrderSchedule.update({
// //         where: { id: nextJob.id },
// //         data: { status: "progress" },
// //       });
// //       nextJob.status = "progress"; // Reflect the change in the returned data
// //     }

// //     // Logic to get related production data remains the same
// //     const getProductionResponse = await prisma.productionResponse.findFirst({
// //       where: {
// //         orderId: nextJob.order_id,
// //         partId: nextJob.part_id,
// //         processId: nextJob.processId,
// //       },
// //       orderBy: { cycleTimeStart: "desc" },
// //       include: {
// //         employeeInfo: { select: { firstName: true, lastName: true, id: true } },
// //       },
// //     });

// //     const totalQuantity = getProductionResponse.scheduleQuantity;
// //     const completedQuantity = nextJob.completedQuantity;
// //     console.log(
// //       "totalQuantitytotalQuantity completedQuantitycompletedQuantity",
// //       totalQuantity,
// //       completedQuantity
// //     );

// //     const remainingQty = totalQuantity - completedQuantity;
// //     console.log("remainingQtyremainingQty", remainingQty);

// //     const responseData = {
// //       ...nextJob,
// //       remainingQty: remainingQty,
// //       scheduleQuantity: getProductionResponse.scheduleQuantity,
// //       // a lot of the other fields can be simplified as they are already in nextJob
// //     };

// //     res.status(200).json({
// //       message: "Next job found successfully.",
// //       data: responseData,
// //     });
// //   } catch (error) {
// //     console.error("Error finding next job:", error);
// //     res.status(500).json({ message: "Something went wrong." });
// //   }
// // };

// const getScheduleProcessInformation = async (req, res) => {
//   try {
//     const { id: processId } = req.params;

//     if (!processId) {
//       return res.status(400).json({ message: "processId is required." });
//     }

//     // Use the new helper to find the next job.
//     // We don't pass a currentOrderId because this is for fetching a fresh job.
//     const nextJob = await findNextJobForStation(prisma, processId);

//     if (!nextJob) {
//       return res
//         .status(404)
//         .json({ message: "No available jobs found for this station." });
//     }

//     // Find the corresponding production response to get scheduleQuantity
//     const productionResponse = await prisma.productionResponse.findFirst({
//       where: {
//         orderId: nextJob.order_id,
//         partId: nextJob.part_id,
//         processId: nextJob.processId,
//       },
//       orderBy: { cycleTimeStart: "desc" },
//       select: {
//         id: true,
//         scheduleQuantity: true,
//         employeeInfo: { select: { firstName: true, lastName: true, id: true } },
//       },
//     });

//     // It's possible a productionResponse hasn't been created yet if a worker hasn't logged in.
//     // Handle this gracefully.
//     const scheduleQuantity =
//       productionResponse?.scheduleQuantity ||
//       (nextJob.type === "part"
//         ? (nextJob.quantity || 0) * (nextJob.part?.minStock || 1)
//         : nextJob.order?.productQuantity || 0);

//     const remainingQty = scheduleQuantity - (nextJob.completedQuantity || 0);
//     console.log("productionResponseproductionResponse", productionResponse);
//     const responseData = {
//       ...nextJob, // All details from the schedule (part, order, process, etc.)
//       scheduleQuantity: scheduleQuantity,
//       remainingQty: remainingQty,
//       // VERY IMPORTANT: Attach employee info and the productionResponse ID if they exist.
//       // The frontend needs these for display and for subsequent API calls (like completeOrder).
//       employeeInfo: productionResponse?.employeeInfo || null,
//       productionId: productionResponse.id, // The frontend uses this ID.
//     };
//     console.log("responseDataresponseData", responseData);

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

// const createProductionResponse = async (req, res) => {
//   try {
//     const {
//       orderId,
//       partId,
//       processId,
//       quantity,
//       scrap,
//       cycleTimeStart,
//       cycleTimeEnd,
//       firstName,
//       lastName,
//       completed,
//     } = req.body;

//     const user = req.user;
//     const now = new Date();
//     const submittedBy = `${firstName} ${lastName}`;
//     const stockOrder = await prisma.stockOrder.findUnique({
//       where: { id: orderId },
//     });

//     if (!stockOrder) {
//       return res.status(404).json({ message: "Order not found." });
//     }
//     const totalProductQuantity = stockOrder.productQuantity;
//     const existing = await prisma.productionResponse.findFirst({
//       where: {
//         orderId,
//         employeeId: user.id,
//         isDeleted: false,
//       },
//     });

//     if (existing) {
//       const newCompletedQty =
//         existing.completedQuantity + (completed ? quantity : 0);

//       if (completed && newCompletedQty > totalProductQuantity) {
//         return res.status(400).json({
//           message: "Completed quantity exceeds total product quantity.",
//         });
//       }

//       if (completed && newCompletedQty === totalProductQuantity) {
//         return res.status(200).json({
//           message: "Production fully completed!",
//         });
//       }

//       if (completed) {
//         await prisma.productionResponse.update({
//           where: { id: existing.id },
//           data: {
//             completedQuantity: newCompletedQty,
//             updatedAt: now,
//           },
//         });

//         return res.status(200).json({
//           message: "Production response updated successfully!",
//         });
//       }

//       return res.status(200).json({
//         message: "Response logged without marking as completed.",
//       });
//     } else {
//       const newCompletedQty = completed ? quantity : 0;
//       if (completed && newCompletedQty > totalProductQuantity) {
//         prisma.stockOrder.update({
//           where: {
//             id: orderId,
//           },
//           data: {
//             isDeleted: true,
//           },
//         });
//         return res.status(400).json({
//           message: "Completed quantity exceeds total product quantity.",
//         });
//       }

//       if (completed && newCompletedQty === totalProductQuantity) {
//         await prisma.productionResponse.create({
//           data: {
//             orderId,
//             partId,
//             processId,
//             quantity,
//             scrap,
//             cycleTimeStart,
//             cycleTimeEnd,
//             submittedBy,
//             employeeId: user.id,
//             submittedDate: now,
//             submittedTime: now,
//             completedQuantity: 0,
//           },
//         });

//         return res.status(201).json({
//           message: "Production fully completed!",
//         });
//       }

//       await prisma.productionResponse.create({
//         data: {
//           orderId,
//           partId,
//           processId,
//           quantity,
//           scrap,
//           cycleTimeStart,
//           cycleTimeEnd,
//           submittedBy,
//           employeeId: user.id,
//           submittedDate: now,
//           submittedTime: now,
//           completedQuantity: newCompletedQty,
//         },
//       });

//       return res.status(201).json({
//         message: "Production response created successfully!",
//       });
//     }
//   } catch (error) {
//     return res.status(500).json({
//       message: "Something went wrong. Please try again later.",
//     });
//   }
// };

// const getNextJobDetails = async (req, res) => {
//   try {
//     const { id } = req.params;

//     const nextJob = await prisma.stockOrderSchedule.findFirst({
//       where: {
//         process_id: id,
//         status: "schedule",
//         isDeleted: false,
//       },
//       orderBy: {
//         schedule_date: "asc",
//       },
//       select: {
//         id: true,
//         order_id: true,
//         part_id: true,
//         process_id: true,
//         schedule_date: true,
//       },
//     });

//     if (!nextJob) {
//       return res.status(404).json({
//         message: "No available jobs found for this station.",
//       });
//     }

//     const [orderDetails, partDetails, workInstructions] = await Promise.all([
//       prisma.stockOrder.findUnique({
//         where: { id: nextJob.order_id },
//         select: {
//           orderNumber: true,
//           orderDate: true,
//           shipDate: true,
//           productQuantity: true,
//           customer: {
//             select: {
//               firstName: true,
//               lastName: true,
//             },
//           },
//         },
//       }),

//       prisma.partNumber.findUnique({
//         where: { part_id: nextJob.part_id },
//         select: {
//           part_id: true,
//           partNumber: true,
//           partDescription: true,
//           partImages: {
//             select: { imageUrl: true },
//             where: { isDeleted: false },
//           },
//           components: {
//             where: { isDeleted: false },
//             select: {
//               partQuantity: true,
//               part: {
//                 select: {
//                   partNumber: true,
//                   partDescription: true,
//                 },
//               },
//             },
//           },
//         },
//       }),

//       prisma.workInstruction.findMany({
//         where: {
//           productId: nextJob.part_id,
//           processId: nextJob.process_id,
//           isDeleted: false,
//         },
//         select: {
//           instructionTitle: true,
//           steps: {
//             where: { isDeleted: false },
//             orderBy: { stepNumber: "asc" },
//             select: {
//               stepNumber: true,
//               title: true,
//               instruction: true,
//               images: {
//                 select: { imagePath: true },
//                 where: { isDeleted: false },
//               },
//               videos: {
//                 select: { videoPath: true },
//                 where: { isDeleted: false },
//               },
//             },
//           },
//         },
//       }),
//     ]);

//     const jobDetails = {
//       scheduleId: nextJob.id,
//       order: orderDetails,
//       part: partDetails,
//       workInstructions:
//         workInstructions.length > 0 ? workInstructions[0] : null,
//     };

//     return res.status(200).json({
//       message: "Next job details retrieved successfully.",
//       data: jobDetails,
//     });
//   } catch (error) {
//     console.error("Error fetching next job details:", error);
//     return res.status(500).json({
//       message: "Something went wrong fetching job details.",
//       error: error.message,
//     });
//   }
// };

// // befor 12.aug
// // const selectScheduleProcess = async (req, res) => {
// //   try {
// //     const stationUserId = req.user;
// //     const stockOrders = await prisma.stockOrderSchedule.findMany({
// //       where: {
// //         isDeleted: false,
// //         type: "part",
// //         status: {
// //           in: ["new", "progress"],
// //         },
// //       },
// //       include: {
// //         part: {
// //           include: {
// //             process: {
// //               select: {
// //                 id: true,
// //                 processName: true,
// //               },
// //             },
// //           },
// //         },
// //       },
// //     });
// //     console.log("stockOrdersstockOrders", stockOrders);

// //     if (!stockOrders || stockOrders.length === 0) {
// //       return res.status(404).json({ message: "No stock orders found" });
// //     }
// //     const employeeData = await prisma.employee.findMany({
// //       where: {
// //         isDeleted: false,
// //       },
// //       select: {
// //         id: true,
// //         employeeId: true,
// //         email: true,
// //         fullName: true,
// //       },
// //     });

// //     if (!employeeData || employeeData.length === 0) {
// //       return res.status(404).json({ message: "No employees found" });
// //     }
// //     let employeeFormattedData = [];
// //     if (stationUserId.role !== "Shop_Floor") {
// //       employeeFormattedData = employeeData.map((employee) => ({
// //         id: employee.id || null,
// //         name: employee.fullName || null,
// //         employeeId: employee.employeeId || null,
// //         email: employee.email || null,
// //       }));
// //     }

// //     const formatted = stockOrders.map((order) => ({
// //       id: order.part?.process?.id || null,
// //       name: order.part?.process?.processName || null,
// //       partFamily: order.part?.part_id || null,
// //       stockOrderId: order.id,
// //       orderNumber: order.orderNumber,
// //     }));

// //     return res.status(200).json({
// //       stockAndProcess: formatted,
// //       stationUser: employeeFormattedData,
// //     });
// //   } catch (error) {
// //     return res.status(500).json({
// //       message: "Something went wrong. Please try again later.",
// //     });
// //   }
// // };

// // const completeScheduleOrder = async (req, res) => {
// //   try {
// //     const { id } = req.params;
// //     const { orderId } = req.body;
// //     const data = await prisma.productionResponse.update({
// //       where: {
// //         id: id,
// //       },
// //       data: {
// //         quantity: true,
// //       },
// //     });
// //     const checkTotolQty = await prisma.stockOrderSchedule.findFirst({
// //       where: {
// //         id: orderId,
// //       },
// //       select: {
// //         quantity: true,
// //         completedQuantity: true,
// //       },
// //     });

// //     if (checkTotolQty?.completedQuantity > checkTotolQty?.quantity) {
// //       return res.status(200).send({
// //         message: "order scheduling completed ",
// //       });
// //     }

// //     prisma.stockOrderSchedule
// //       .update({
// //         where: {
// //           id: orderId,
// //         },
// //         data: {
// //           completedQuantity: {
// //             increment: 1,
// //           },
// //         },
// //       })
// //       .then();
// //     return res.status(201).json({
// //       message: "This order has been added as completed  .",
// //     });
// //   } catch (error) {
// //     console.log("errorerror", error);

// //     res.status(500).json({ message: "An error occurred on the server." });
// //   }
// // };

// const selectScheduleProcess = async (req, res) => {
//   try {
//     // 1. Find all order IDs that are currently active (have non-completed schedules)
//     const activeOrderSchedules = await prisma.stockOrderSchedule.findMany({
//       where: {
//         isDeleted: false,
//         status: { notIn: ["completed", "cancelled"] }, // Any order not fully done
//       },
//       select: { order_id: true },
//       distinct: ["order_id"],
//     });

//     if (activeOrderSchedules.length === 0) {
//       return res
//         .status(404)
//         .json({ message: "No active jobs or processes found." });
//     }

//     const activeOrderIds = activeOrderSchedules.map((s) => s.order_id);

//     // 2. Fetch all schedules (parts and products) for these active orders
//     const allRelevantSchedules = await prisma.stockOrderSchedule.findMany({
//       where: {
//         order_id: { in: activeOrderIds },
//         isDeleted: false,
//       },
//       include: {
//         process: {
//           select: { id: true, processName: true },
//         },
//       },
//     });

//     // 3. Group schedules by their order_id for easier processing
//     const schedulesByOrder = allRelevantSchedules.reduce((acc, schedule) => {
//       if (!acc[schedule.order_id]) {
//         acc[schedule.order_id] = { parts: [], products: [] };
//       }
//       if (schedule.type === "part") {
//         acc[schedule.order_id].parts.push(schedule);
//       } else if (schedule.type === "product") {
//         acc[schedule.order_id].products.push(schedule);
//       }
//       return acc;
//     }, {});

//     // 4. Determine which processes are available based on the rules
//     // Use a Map to store unique processes by their ID
//     const availableProcesses = new Map();

//     for (const orderId in schedulesByOrder) {
//       const { parts, products } = schedulesByOrder[orderId];

//       // Rule 1: Add processes for any parts that are 'new' or 'in progress'
//       parts.forEach((partSchedule) => {
//         if (
//           ["new", "progress"].includes(partSchedule.status) &&
//           partSchedule.process
//         ) {
//           availableProcesses.set(partSchedule.process.id, partSchedule.process);
//         }
//       });

//       // Rule 2: Check if all parts for this order are completed
//       // The .every() method returns true for an empty array, which is correct
//       // (an order with no parts is immediately ready for product assembly).
//       const allPartsCompleted = parts.every((p) => p.status === "completed");

//       if (allPartsCompleted) {
//         // If all parts are done, make the product processes available
//         products.forEach((productSchedule) => {
//           if (
//             ["new", "progress"].includes(productSchedule.status) &&
//             productSchedule.process
//           ) {
//             availableProcesses.set(
//               productSchedule.process.id,
//               productSchedule.process
//             );
//           }
//         });
//       }
//     }

//     // Convert the Map values to an array for the response
//     const processList = Array.from(availableProcesses.values());

//     if (processList.length === 0) {
//       return res
//         .status(404)
//         .json({ message: "No jobs are currently available to start." });
//     }

//     // Employee data logic remains the same
//     const stationUserId = req.user;
//     let employeeFormattedData = [];
//     if (stationUserId.role !== "Shop_Floor") {
//       const employeeData = await prisma.employee.findMany({
//         where: { isDeleted: false },
//         select: { id: true, employeeId: true, fullName: true },
//       });
//       employeeFormattedData = employeeData.map((employee) => ({
//         id: employee.id || null,
//         name: employee.fullName || null,
//       }));
//     }

//     return res.status(200).json({
//       message: "Available processes fetched successfully.",
//       stockAndProcess: processList,
//       stationUser: employeeFormattedData,
//     });
//   } catch (error) {
//     console.error("Error fetching selectable processes:", error);
//     res.status(500).json({
//       message: "Something went wrong. Please try again later.",
//     });
//   }
// };

// // const completeScheduleOrder = async (req, res) => {
// //   try {
// //     const { id } = req.params;
// //     const { orderId, partId, employeeId, productId } = req.body;

// //     await prisma.productionResponse.update({
// //       where: { id },
// //       data: {
// //         quantity: true,
// //         scrap: false,
// //         cycleTimeEnd: new Date(),
// //       },
// //     });

// //     const orderSchedule = await prisma.stockOrderSchedule.findUnique({
// //       where: {
// //         order_id_part_id: {
// //           order_id: orderId,
// //           part_id: partId,
// //         },
// //       },
// //     });
// //     const scheduleQty = await prisma.productionResponse.findFirst({
// //       where: {
// //         orderId,
// //         partId,
// //       },
// //       select: {
// //         scheduleQuantity: true,
// //       },
// //     });
// //     if (!scheduleQty || typeof scheduleQty.scheduleQuantity !== "number") {
// //       return res.status(400).json({
// //         message: "Schedule quantity not found or invalid.",
// //       });
// //     }
// //     const completedQuantity = orderSchedule.completedQuantity;
// //     const totalScheduleQty = scheduleQty.scheduleQuantity;

// //     const remainingQty = totalScheduleQty - (completedQuantity || 0);
// //     console.log(
// //       "completedQuantitycompletedQuantity",
// //       completedQuantity,
// //       totalScheduleQty
// //     );

// //     if (completedQuantity >= totalScheduleQty) {
// //       return res.status(400).json({
// //         message: "Order is already fully completed.",
// //         status: "completed",
// //       });
// //     }

// //     const newCompletedQty = completedQuantity + 1;
// //     const updatedStatus =
// //       newCompletedQty === totalScheduleQty ? "completed" : "progress";

// //     await prisma.stockOrderSchedule.update({
// //       where: {
// //         order_id_part_id: {
// //           order_id: orderId,
// //           part_id: partId,
// //         },
// //       },
// //       data: {
// //         completedQuantity: newCompletedQty,
// //         completed_date:
// //           newCompletedQty === totalScheduleQty ? new Date() : undefined,
// //         status: updatedStatus,
// //       },
// //     });

// //     if (updatedStatus === "progress") {
// //       await prisma.partNumber.update({
// //         where: {
// //           part_id: partId,
// //         },
// //         data: {
// //           availStock: {
// //             decrement: 1,
// //           },
// //         },
// //       });
// //     }
// //     if (updatedStatus === "completed") {
// //       await prisma.partNumber.update({
// //         where: {
// //           part_id: productId,
// //         },
// //         data: {
// //           availStock: {
// //             increment: 1,
// //           },
// //         },
// //       });
// //     }
// //     await prisma.productionResponse.updateMany({
// //       where: {
// //         id,
// //         stationUserId: employeeId,
// //         partId: partId,
// //         orderId: orderId,
// //       },
// //       data: {
// //         completedQuantity: {
// //           increment: 1,
// //         },
// //         remainingQty: remainingQty,
// //       },
// //     });
// //     return res.status(200).json({
// //       message:
// //         updatedStatus === "completed"
// //           ? "Order scheduling completed."
// //           : "This order has been added as completed.",
// //       status: updatedStatus,
// //     });
// //   } catch (error) {
// //     console.error("Error completing schedule order:", error);
// //     res.status(500).json({ message: "An error occurred on the server." });
// //   }
// // };

// const scrapScheduleOrder = async (req, res) => {
//   try {
//     const { id } = req.params;
//     const { orderId, partId, employeeId } = req.body;

//     await prisma.productionResponse.update({
//       where: { id },
//       data: { scrap: true, quantity: false, cycleTimeEnd: new Date() },
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

//     // await prisma.stockOrderSchedule.update({
//     //   where: {
//     //     order_id_part_id: {
//     //       order_id: orderId,
//     //       part_id: partId,
//     //     },
//     //   },
//     //   data: {
//     //     status: "progress",
//     //     scrapQuantity: {
//     //       increment: 1,
//     //     },
//     //     quantity: {
//     //       decrement: 1,
//     //     },
//     //   },
//     // });

//     await prisma.productionResponse.updateMany({
//       where: {
//         id,
//         stationUserId: employeeId,
//         partId: partId,
//         orderId: orderId,
//       },
//       data: {
//         scrapQuantity: {
//           increment: 1,
//         },
//         scheduleQuantity: {
//           decrement: 1,
//         },
//         remainingQty: {
//           decrement: 1,
//         },
//       },
//     });

//     await prisma.partNumber.update({
//       where: {
//         part_id: partId,
//       },
//       data: {
//         availStock: {
//           decrement: 1,
//         },
//       },
//     });

//     return res.status(200).json({
//       message: "This order has been added as scrap.",
//     });
//   } catch (error) {
//     console.error("Error completing schedule order:", error);
//     res.status(500).json({ message: "An error occurred on the server." });
//   }
// };

// // const completeScheduleOrder = async (req, res) => {
// //   try {
// //     const { id } = req.params;
// //     const { orderId, partId, employeeId, productId } = req.body;

// //     await prisma.productionResponse.update({
// //       where: { id },
// //       data: {
// //         quantity: true,
// //         scrap: false,
// //         cycleTimeEnd: new Date(),
// //       },
// //     });

// //     const orderSchedule = await prisma.stockOrderSchedule.findUnique({
// //       where: {
// //         order_id_part_id: {
// //           order_id: orderId,
// //           part_id: partId,
// //         },
// //       },
// //     });

// //     if (!orderSchedule) {
// //       return res
// //         .status(404)
// //         .json({ message: "Stock order schedule not found." });
// //     }

// //     const { completedQuantity = 0, quantity } = orderSchedule;
// //     if (completedQuantity >= quantity) {
// //       return res.status(400).json({
// //         message: "Order is already fully completed.",
// //         status: "completed",
// //       });
// //     }

// //     const newCompletedQty = completedQuantity + 1;
// //     const updatedStatus =
// //       newCompletedQty === quantity ? "completed" : "progress";

// //     await prisma.stockOrderSchedule.update({
// //       where: {
// //         order_id_part_id: {
// //           order_id: orderId,
// //           part_id: partId,
// //         },
// //       },
// //       data: {
// //         completedQuantity: newCompletedQty,
// //         completed_date: newCompletedQty === quantity ? new Date() : undefined,
// //         status: updatedStatus,
// //       },
// //     });
// //     console.log("updatedStatusupdatedStatus", updatedStatus);

// //     if (updatedStatus === "progress") {
// //       await prisma.partNumber.update({
// //         where: {
// //           part_id: partId,
// //         },
// //         data: {
// //           availStock: {
// //             decrement: 1,
// //           },
// //         },
// //       });
// //     }
// //     if (updatedStatus === "completed") {
// //       await prisma.partNumber.update({
// //         where: {
// //           part_id: productId,
// //         },
// //         data: {
// //           availStock: {
// //             increment: 1,
// //           },
// //         },
// //       });
// //     }
// //     await prisma.productionResponse.updateMany({
// //       where: {
// //         id,
// //         stationUserId: employeeId,
// //         partId: partId,
// //         orderId: orderId,
// //       },
// //       data: {
// //         completedQuantity: {
// //           increment: 1,
// //         },
// //       },
// //     });
// //     return res.status(200).json({
// //       message:
// //         updatedStatus === "completed"
// //           ? "Order scheduling completed."
// //           : "This order has been added as completed.",
// //       status: updatedStatus,
// //     });
// //   } catch (error) {
// //     console.error("Error completing schedule order:", error);
// //     res.status(500).json({ message: "An error occurred on the server." });
// //   }
// // };

// // const scrapScheduleOrder = async (req, res) => {
// //   try {
// //     const { id } = req.params;
// //     const { orderId, partId, employeeId } = req.body;

// //     await prisma.productionResponse.update({
// //       where: { id },
// //       data: { scrap: true, quantity: false, cycleTimeEnd: new Date() },
// //     });

// //     const orderSchedule = await prisma.stockOrderSchedule.findUnique({
// //       where: {
// //         order_id_part_id: {
// //           order_id: orderId,
// //           part_id: partId,
// //         },
// //       },
// //     });

// //     if (!orderSchedule) {
// //       return res
// //         .status(404)
// //         .json({ message: "Stock order schedule not found." });
// //     }

// //     await prisma.stockOrderSchedule.update({
// //       where: {
// //         order_id_part_id: {
// //           order_id: orderId,
// //           part_id: partId,
// //         },
// //       },
// //       data: {
// //         status: "progress",
// //         scrapQuantity: {
// //           increment: 1,
// //         },
// //         quantity: {
// //           decrement: 1,
// //         },
// //       },
// //     });

// //     await prisma.productionResponse.updateMany({
// //       where: {
// //         id,
// //         stationUserId: employeeId,
// //         partId: partId,
// //         orderId: orderId,
// //       },
// //       data: {
// //         scrapQuantity: {
// //           increment: 1,
// //         },
// //       },
// //     });
// //     return res.status(200).json({
// //       message: "This order has been added as scrap.",
// //     });
// //   } catch (error) {
// //     console.error("Error completing schedule order:", error);
// //     res.status(500).json({ message: "An error occurred on the server." });
// //   }
// // };
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

//     const { completedQuantity = 0, quantity } = orderSchedule;
//     if (completedQuantity >= quantity) {
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
//         completed_date: newCompletedQty === quantity ? new Date() : undefined,
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

// const updateStepTime = async (req, res) => {
//   try {
//     const { id } = req.params;
//     const { stepId } = req.body;

//     if (!id || !stepId) {
//       return res.status(400).json({ message: "Missing data" });
//     }

//     const updated = await prisma.productionStepTracking.updateMany({
//       where: {
//         productionResponseId: id,
//         workInstructionStepId: stepId,
//       },
//       data: {
//         stepStartTime: new Date(),
//         stepEndTime: new Date(),
//         status: "completed",
//       },
//     });

//     if (updated.count === 0) {
//       return res.status(404).json({ message: "Step not found." });
//     }

//     return res.status(200).json({ message: "Step marked completed" });
//   } catch (error) {
//     console.error("Step update error:", error);
//     res.status(500).json({ message: "Internal server error" });
//   }
// };

// const completeTraning = async (req, res) => {
//   try {
//     const { id } = req.params;
//     await prisma.productionResponse.update({
//       where: { id },
//       data: {
//         traniningStatus: true,
//       },
//     });

//     return res.status(200).json({
//       message: "Order scheduling completed.",
//     });
//   } catch (error) {
//     console.error("Error completing schedule order:", error);
//     res.status(500).json({ message: "An error occurred on the server." });
//   }
// };
// // const markStepAsCompleted = async (req, res) => {
// //   try {
// //     const { productionResponseId, stepId } = req.body;

// //     if (!productionResponseId || !stepId) {
// //       return res.status(400).json({ message: "Missing required fields." });
// //     }

// //     const updated = await prisma.productionStepTracking.updateMany({
// //       where: {
// //         productionResponseId,
// //         workInstructionStepId: stepId,
// //       },
// //       data: {
// //         stepEndTime: new Date(),
// //         status: "completed",
// //       },
// //     });

// //     if (updated.count === 0) {
// //       return res
// //         .status(404)
// //         .json({ message: "Step not found or already completed." });
// //     }

// //     return res.status(200).json({
// //       message: "Step marked as completed.",
// //       data: {
// //         productionResponseId,
// //         stepId,
// //         stepEndTime: new Date(),
// //       },
// //     });
// //   } catch (error) {
// //     console.error("Error completing step:", error);
// //     res
// //       .status(500)
// //       .json({ message: "Internal server error", error: error.message });
// //   }
// // };

// const barcodeScan = async (req, res) => {
//   try {
//     const { barcode } = req.body;

//     const part = await prisma.part.findUnique({ where: { barcode } });

//     if (!part) {
//       return res.status(404).json({ message: "❌ Invalid barcode" });
//     }

//     const order = await prisma.stockOrderSchedule.findFirst({
//       where: {
//         part_id: part.id,
//         status: { not: "completed" },
//       },
//     });

//     if (!order) {
//       return res.status(404).json({ message: "❌ No active order found" });
//     }

//     const newQty = order.completedQuantity + 1;
//     const status = newQty === order.quantity ? "completed" : "progress";

//     await prisma.stockOrderSchedule.update({
//       where: {
//         order_id_part_id: { order_id: order.order_id, part_id: part.id },
//       },
//       data: {
//         completedQuantity: newQty,
//         status,
//         completed_date: status === "completed" ? new Date() : undefined,
//       },
//     });

//     res.json({
//       message:
//         status === "completed" ? "✅ Order Completed!" : "✅ Order In Progress",
//     });
//   } catch (error) {}
// };

// const processBarcodeScan = async (req, res) => {
//   try {
//     const { id } = req.params;
//     const { barcode, employeeId } = req.body;

//     const partInstance = await prisma.stockOrderSchedule.findUnique({
//       where: { barcode: barcode },
//     });

//     if (!partInstance) {
//       return res
//         .status(404)
//         .json({ message: "Invalid Barcode. Part not found." });
//     }

//     if (
//       partInstance.status === "COMPLETED" ||
//       partInstance.status === "SCRAPPED"
//     ) {
//       return res.status(409).json({
//         message: `This part (${barcode}) has already been processed.`,
//       });
//     }

//     const { orderId, partId } = partInstance;

//     await prisma.productionResponse.update({
//       where: { id },
//       data: {
//         quantity: true,
//         scrap: false,
//         cycleTimeEnd: new Date(),
//       },
//     });

//     const orderSchedule = await prisma.stockOrderSchedule.findUnique({
//       where: { order_id_part_id: { order_id: orderId, part_id: partId } },
//     });

//     if (!orderSchedule) {
//       return res
//         .status(404)
//         .json({ message: "Stock order schedule not found for this part." });
//     }

//     const newCompletedQty = (orderSchedule.completedQuantity || 0) + 1;
//     const updatedStatus =
//       newCompletedQty === orderSchedule.quantity ? "completed" : "progress";

//     await prisma.stockOrderSchedule.update({
//       where: { order_id_part_id: { order_id: orderId, part_id: partId } },
//       data: {
//         completedQuantity: newCompletedQty,
//         completed_date: updatedStatus === "completed" ? new Date() : undefined,
//         status: updatedStatus,
//       },
//     });

//     await prisma.productionResponse.updateMany({
//       where: { id, stationUserId: employeeId, partId, orderId },
//       data: { completedQuantity: { increment: 1 } },
//     });

//     await prisma.partInstance.update({
//       where: { id: partInstance.id },
//       data: { status: "COMPLETED" },
//     });

//     return res.status(200).json({
//       message: "Part completed successfully!",
//       status: updatedStatus,
//     });
//   } catch (error) {
//     console.error("Error processing barcode scan:", error);
//     res.status(500).json({ message: "An error occurred on the server." });
//   }
// };

// const deleteScheduleOrder = async (req, res) => {
//   try {
//     const id = req.params.id;
//     prisma.partNumber
//       .update({
//         where: {
//           id: id,
//           isDeleted: false,
//         },
//         data: {
//           isDeleted: true,
//         },
//       })
//       .then();

//     return res.status(200).json({
//       message: "Employee delete successfully !",
//     });
//   } catch (error) {
//     return res.status(500).send({
//       message: "Something went wrong. Please try again later.",
//     });
//   }
// };

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
//       return res
//         .status(400)
//         .json({ error: "Insufficient stock to scrap the requested quantity" });
//     }

//     const [newEntry] = await prisma.$transaction([
//       prisma.scapEntries.create({
//         data: {
//           type,
//           partId,
//           productId: req?.body?.productId,
//           returnQuantity,
//           scrapStatus: scrapStatus === "yes",
//           createdBy,
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

// const completeScheduleOrderViaGet = async (req, res) => {
//   try {
//     const { id, orderId, partId, employeeId, productId } = req.query;

//     if (!id || !orderId || !partId || !employeeId || !productId) {
//       return res.status(400).json({ message: "Missing required fields" });
//     }

//     await prisma.productionResponse.update({
//       where: { id },
//       data: {
//         quantity: true,
//         scrap: false,
//         cycleTimeEnd: new Date(),
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

//     const { completedQuantity = 0, quantity } = orderSchedule;
//     if (completedQuantity >= quantity) {
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
//         completed_date: newCompletedQty === quantity ? new Date() : undefined,
//         status: updatedStatus,
//       },
//     });

//     if (updatedStatus === "progress") {
//       await prisma.partNumber.update({
//         where: { part_id: partId },
//         data: {
//           availStock: { decrement: 1 },
//         },
//       });
//     }

//     if (updatedStatus === "completed") {
//       await prisma.partNumber.update({
//         where: { part_id: productId },
//         data: {
//           availStock: { increment: 1 },
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
//         completedQuantity: { increment: 1 },
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
//     console.error("GET Scan Complete Error:", error);
//     return res.status(500).json({ message: "Internal server error" });
//   }
// };

// const allScrapEntires = async (req, res) => {
//   try {
//     const paginationData = await paginationQuery(req.query);
//     const { filterScrap, search } = req.query;

//     const condition = {
//       isDeleted: false,
//     };

//     if (filterScrap && filterScrap.toLowerCase() !== "all") {
//       condition.type = filterScrap;
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
//         },
//       }),
//       prisma.scapEntries.count({
//         where: condition,
//       }),
//     ]);

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
//     return res.status(500).send({
//       message: "Something went wrong. Please try again later.",
//     });
//   }
// };

// const selectScheudlePartNumber = async (req, res) => {
//   try {
//     const process = await prisma.partNumber.findMany({
//       select: {
//         part_id: true,
//         partNumber: true,
//       },
//       where: {
//         type: "part",
//         isDeleted: false,
//         usedAsPart: {
//           some: {
//             status: { not: "completed" },
//             isDeleted: false,
//           },
//         },
//       },
//     });

//     const formattedProcess = process.map((process) => ({
//       id: process.part_id,
//       partNumber: process.partNumber,
//     }));
//     res.status(200).json({
//       data: formattedProcess,
//     });
//   } catch (error) {
//     res
//       .status(500)
//       .json({ message: "Something went wrong . please try again later ." });
//   }
// };

// const selectScheudleProductNumber = async (req, res) => {
//   try {
//     const process = await prisma.partNumber.findMany({
//       select: {
//         part_id: true,
//         partNumber: true,
//       },
//       where: {
//         type: "product",
//         isDeleted: false,
//         StockOrder_StockOrder_productNumberToPartNumber: {
//           some: {
//             isDeleted: false,
//             status: { equals: "scheduled" },
//           },
//         },
//       },
//     });

//     const formattedProcess = process.map((process) => ({
//       id: process.part_id,
//       partNumber: process.partNumber,
//     }));
//     res.status(200).json({
//       data: formattedProcess,
//     });
//   } catch (error) {
//     res
//       .status(500)
//       .json({ message: "Something went wrong . please try again later ." });
//   }
// };

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
//     console.error("Error fetching scrap entry:", error);
//     res.status(500).json({ error: "Internal server error" });
//   }
// };

// const updateScrapEntry = async (req, res) => {
//   try {
//     const { id } = req.params;
//     const {
//       type,
//       partId,
//       returnQuantity,
//       scrapStatus,
//       supplierId,
//       returnSupplierQty,
//       createdBy,
//     } = req.body;

//     const existingEntry = await prisma.scapEntries.findUnique({
//       where: { id },
//     });

//     if (!existingEntry) {
//       return res.status(404).json({ error: "Scrap entry not found" });
//     }

//     const part = await prisma.partNumber.findUnique({
//       where: { part_id: existingEntry.partId },
//       select: { availStock: true },
//     });

//     if (!part) {
//       return res.status(404).json({ error: "Part not found" });
//     }

//     const oldQty = existingEntry.returnQuantity ?? 0;
//     const newQty = Number(returnQuantity);

//     // Calculate what the stock will be after adjustment:
//     // Add back the old quantity, then subtract new quantity
//     const adjustedStock = (part.availStock ?? 0) + oldQty - newQty;

//     if (adjustedStock < 0) {
//       return res.status(400).json({
//         error: "Insufficient stock to update scrap by the requested quantity",
//       });
//     }

//     const [updatedEntry] = await prisma.$transaction([
//       prisma.scapEntries.update({
//         where: { id },
//         data: {
//           type,
//           partId,
//           productId: req?.body?.productId,
//           returnQuantity: newQty,
//           scrapStatus: scrapStatus === "yes",
//           createdBy,
//           processId: req?.body?.processId,
//           supplierId,
//           returnSupplierQty,
//         },
//       }),
//       prisma.partNumber.update({
//         where: { part_id: existingEntry.partId },
//         data: {
//           availStock: adjustedStock, // set new stock value directly
//         },
//       }),
//     ]);

//     res.status(200).json({
//       message: "Scrap entry updated and stock adjusted",
//       data: updatedEntry,
//     });
//   } catch (error) {
//     console.error("Error updating scrap entry:", error);
//     res.status(500).json({ error: "Internal server error" });
//   }
// };

// const findNextJobForStation = async (
//   prisma,
//   processId,
//   currentOrderId = null
// ) => {
//   let nextJob = null;
//   const includeData = {
//     order: {
//       select: {
//         id: true,
//         orderNumber: true,
//         productQuantity: true,
//         shipDate: true,
//       },
//     },
//     part: {
//       include: {
//         WorkInstruction: {
//           include: { steps: { orderBy: { stepNumber: "asc" } } },
//         },
//       },
//     },
//     process: { select: { processName: true } },
//   };

//   // Priority 1: Check for more jobs within the SAME ORDER at this station
//   if (currentOrderId) {
//     // First, look for PART jobs in the same order
//     nextJob = await prisma.stockOrderSchedule.findFirst({
//       where: {
//         processId,
//         order_id: currentOrderId,
//         status: { in: ["new", "progress"] }, // Look for new or in-progress
//         type: "part",
//         isDeleted: false,
//       },
//       orderBy: { createdAt: "asc" },
//       include: includeData,
//     });

//     // If no part jobs, look for the final PRODUCT job in the same order
//     if (!nextJob) {
//       nextJob = await prisma.stockOrderSchedule.findFirst({
//         where: {
//           processId,
//           order_id: currentOrderId,
//           status: { in: ["new", "progress"] },
//           type: "product",
//           isDeleted: false,
//         },
//         orderBy: { createdAt: "asc" },
//         include: includeData,
//       });
//     }
//   }

//   // Priority 2 (Fallback): If no job was found for the current order, or if no order was specified,
//   // find ANY available job for this station using the original priority logic.
//   if (!nextJob) {
//     // 2a: PART jobs in progress
//     nextJob = await prisma.stockOrderSchedule.findFirst({
//       where: { processId, status: "progress", type: "part", isDeleted: false },
//       orderBy: { createdAt: "asc" },
//       include: includeData,
//     });
//   }

//   if (!nextJob) {
//     // 2b: NEW part jobs
//     nextJob = await prisma.stockOrderSchedule.findFirst({
//       where: { processId, status: "new", type: "part", isDeleted: false },
//       orderBy: { createdAt: "asc" },
//       include: includeData,
//     });
//   }

//   if (!nextJob) {
//     // 2c: PRODUCT jobs in progress
//     nextJob = await prisma.stockOrderSchedule.findFirst({
//       where: {
//         processId,
//         status: "progress",
//         type: "product",
//         isDeleted: false,
//       },
//       orderBy: { createdAt: "asc" },
//       include: includeData,
//     });
//   }

//   if (!nextJob) {
//     // 2d: NEW product jobs
//     nextJob = await prisma.stockOrderSchedule.findFirst({
//       where: { processId, status: "new", type: "product", isDeleted: false },
//       orderBy: { createdAt: "asc" },
//       include: includeData,
//     });
//   }

//   // If we found a 'new' job, update its status to 'progress' to lock it.
//   if (nextJob && nextJob.status === "new") {
//     return await prisma.stockOrderSchedule.update({
//       where: { id: nextJob.id },
//       data: { status: "progress" },
//       include: includeData,
//     });
//   }

//   return nextJob;
// };
// module.exports = {
//   stationLogin,
//   stationLogout,
//   getScheduleProcessInformation,
//   createProductionResponse,
//   getNextJobDetails,
//   selectScheduleProcess,
//   completeScheduleOrder,
//   updateStepTime,
//   completeTraning,
//   scrapScheduleOrder,
//   barcodeScan,
//   processBarcodeScan,
//   deleteScheduleOrder,
//   completeScheduleOrderViaGet,
//   completeScheduleOrderViaGet,
//   scrapEntry,
//   allScrapEntires,
//   selectScheudlePartNumber,
//   selectScheudleProductNumber,
//   getScrapEntryById,
//   updateScrapEntry,
// };

const prisma = require("../config/prisma");
const {
  paginationQuery,
  pagination,
  fileUploadFunc,
} = require("../functions/common");

// const stationLogin = async (req, res) => {
//   try {
//     const { processId, stationUserId, type } = req.body;

//     // First: check for an already "in progress" job
//     let nextJob = await prisma.stockOrderSchedule.findFirst({
//       where: {
//         processId,
//         status: "progress",
//         isDeleted: false,
//       },
//       orderBy: {
//         createdAt: "asc",
//       },
//       include: {
//         order: { select: { orderNumber: true } },
//         part: {
//           include: {
//             WorkInstruction: { select: { id: true } },
//           },
//         },
//       },
//     });

//     // If no progress job, fallback to "new"
//     if (!nextJob) {
//       nextJob = await prisma.stockOrderSchedule.findFirst({
//         where: {
//           processId,
//           status: "new",
//           isDeleted: false,
//         },
//         orderBy: {
//           createdAt: "asc",
//         },
//         include: {
//           order: { select: { orderNumber: true } },
//           part: {
//             include: {
//               WorkInstruction: { select: { id: true } },
//             },
//           },
//         },
//       });
//     }

//     if (!nextJob) {
//       return res.status(404).json({
//         message: "No available jobs found for this station at the moment.",
//       });
//     }

//     const instructionId = nextJob?.part?.WorkInstruction[0]?.id;

//     if (type === "training") {
//       await prisma.productionStepTracking.create({
//         data: {

//           stepstartTime: new Date(),
//         },
//       });
//     }

//     const processLoginData = await prisma.productionResponse.create({
//       data: {
//         process: { connect: { id: processId } },
//         StockOrder: { connect: { id: nextJob.order_id } },
//         PartNumber: { connect: { part_id: nextJob.part_id } },
//         employeeInfo: { connect: { id: stationUserId } },
//         type,
//         instructionId: instructionId || null,
//         scrap: null,
//         cycleTimeStart: new Date(),
//         cycleTimeEnd: null,
//       },
//     });

//     return res.status(200).json({
//       message: `You have successfully logged into station. Assigned to order: ${nextJob.order.orderNumber}`,
//       data: processLoginData,
//     });
//   } catch (error) {
//     console.error("Error during process login:", error);
//     return res.status(500).send({
//       message: "Something went wrong. Please try again later.",
//       error: error.message,
//     });
//   }
// };

// // const stationLogin = async (req, res) => {
// //   try {
// //     const { processId, stationUserId, type } = req.body;

// //     let nextJob = null;

// //     // 1️⃣ First check for PART jobs in progress
// //     nextJob = await prisma.stockOrderSchedule.findFirst({
// //       where: {
// //         processId,
// //         status: "progress",
// //         isDeleted: false,
// //         type: "part", // <-- field that identifies part jobs
// //       },
// //       orderBy: { createdAt: "asc" },
// //       include: {
// //         order: { select: { orderNumber: true, productQuantity: true } },
// //         part: {
// //           select: {
// //             minStock: true,
// //             WorkInstruction: { include: { steps: true } },
// //           },
// //         },
// //       },
// //     });

// //     // 2️⃣ If no part job in progress, check for NEW part job
// //     if (!nextJob) {
// //       nextJob = await prisma.stockOrderSchedule.findFirst({
// //         where: {
// //           processId,
// //           status: "new",
// //           isDeleted: false,
// //           type: "part",
// //         },
// //         orderBy: { createdAt: "asc" },
// //         include: {
// //           order: { select: { orderNumber: true, productQuantity: true } },
// //           part: {
// //             select: {
// //               minStock: true,
// //               WorkInstruction: { include: { steps: true } },
// //             },
// //           },
// //         },
// //       });
// //     }

// //     if (!nextJob) {
// //       nextJob = await prisma.stockOrderSchedule.findFirst({
// //         where: {
// //           processId,
// //           status: "progress",
// //           isDeleted: false,
// //           type: "product",
// //         },
// //         orderBy: { createdAt: "asc" },
// //         include: {
// //           order: { select: { orderNumber: true, productQuantity: true } },
// //           part: {
// //             select: {
// //               minStock: true,
// //               WorkInstruction: { include: { steps: true } },
// //             },
// //           },
// //         },
// //       });
// //     }
// //     if (!nextJob) {
// //       nextJob = await prisma.stockOrderSchedule.findFirst({
// //         where: {
// //           processId,
// //           status: "new",
// //           isDeleted: false,
// //           type: "product",
// //         },
// //         orderBy: { createdAt: "asc" },
// //         include: {
// //           order: { select: { orderNumber: true, productQuantity: true } },
// //           part: {
// //             select: {
// //               minStock: true,
// //               WorkInstruction: { include: { steps: true } },
// //             },
// //           },
// //         },
// //       });
// //     }

// //     // ❌ If nothing found at all
// //     if (!nextJob) {
// //       return res.status(404).json({
// //         message: "No available jobs found for this station at the moment.",
// //       });
// //     }

// //     // Determine schedule quantity: PART jobs = quantity * minStock, PRODUCT jobs = productQuantity
// //     let scheduleQuantity =
// //       nextJob.type === "part"
// //         ? (nextJob.quantity || 0) * nextJob.part.minStock
// //         : nextJob.order.productQuantity || 0;

// //     const instruction = nextJob?.part?.WorkInstruction?.[0];
// //     const steps = instruction?.steps || [];

// //     const processLoginData = await prisma.productionResponse.create({
// //       data: {
// //         process: { connect: { id: processId } },
// //         StockOrder: { connect: { id: nextJob.order_id } },
// //         PartNumber: { connect: { part_id: nextJob.part_id } },
// //         employeeInfo: { connect: { id: stationUserId } },
// //         type,
// //         instructionId: instruction?.id || null,
// //         scrap: null,
// //         cycleTimeStart: new Date(),
// //         cycleTimeEnd: null,
// //         scheduleQuantity: scheduleQuantity,
// //         remainingQty: scheduleQuantity,
// //       },
// //     });

// //     // Training logic unchanged
// //     if (type === "training" && steps.length > 0) {
// //       const { employeeId, processId, partId } = processLoginData;
// //       const existingTraining = await prisma.productionResponse.findFirst({
// //         where: {
// //           employeeId,
// //           processId,
// //           partId,
// //           traniningStatus: true,
// //         },
// //       });

// //       if (existingTraining) {
// //         return res.status(409).send({
// //           message:
// //             "You have already completed this process and related parts training. Please choose a different process and part.",
// //         });
// //       } else {
// //         const trackingEntries = steps.map((step, index) => ({
// //           productionResponseId: processLoginData.id,
// //           workInstructionStepId: step.id,
// //           status: "pending",
// //           stepStartTime: index === 0 ? new Date() : null,
// //           stepEndTime: null,
// //         }));

// //         await prisma.productionStepTracking.createMany({
// //           data: trackingEntries,
// //         });
// //       }
// //     }

// //     return res.status(200).json({
// //       message: `You have successfully logged into station. Assigned to order: ${nextJob.order.orderNumber}`,
// //       data: processLoginData,
// //     });
// //   } catch (error) {
// //     console.error("Error during process login:", error);
// //     return res.status(500).send({
// //       message: "Something went wrong. Please try again later.",
// //       error: error.message,
// //     });
// //   }
// // };

// const stationLogin = async (req, res) => {
//   try {
//     const { processId, stationUserId, type } = req.body;
//     let nextJob = await prisma.stockOrderSchedule.findFirst({
//       where: {
//         processId,
//         status: "progress",
//         isDeleted: false,
//       },
//       orderBy: {
//         createdAt: "asc",
//       },
//       include: {
//         order: { select: { orderNumber: true } },
//         part: {
//           include: {
//             WorkInstruction: {
//               include: {
//                 steps: true,
//               },
//             },
//           },
//         },
//       },
//     });
//     if (!nextJob) {
//       nextJob = await prisma.stockOrderSchedule.findFirst({
//         where: {
//           processId,
//           status: "new",
//           isDeleted: false,
//         },
//         orderBy: {
//           createdAt: "asc",
//         },
//         include: {
//           order: { select: { orderNumber: true } },
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
//     }
//     if (!nextJob) {
//       return res.status(404).json({
//         message: "No available jobs found for this station at the moment.",
//       });
//     }
//     const instruction = nextJob?.part?.WorkInstruction?.[0];
//     const steps = instruction?.steps || [];

//     const processLoginData = await prisma.productionResponse.create({
//       data: {
//         process: { connect: { id: processId } },
//         StockOrder: { connect: { id: nextJob.order_id } },
//         PartNumber: { connect: { part_id: nextJob.part_id } },
//         employeeInfo: { connect: { id: stationUserId } },
//         type,
//         instructionId: instruction?.id || null,
//         scrap: null,
//         cycleTimeStart: new Date(),
//         cycleTimeEnd: null,
//       },
//     });

//     if (type === "training" && steps.length > 0) {
//       const { employeeId, processId, partId } = processLoginData;
//       const existingTraining = await prisma.productionResponse.findFirst({
//         where: {
//           employeeId: employeeId,
//           processId: processId,
//           partId: partId,
//           traniningStatus: true,
//         },
//       });
//       if (existingTraining) {
//         return res.status(409).send({
//           message:
//             "You have already completed this process and related parts traning  . please choose different process and parts",
//         });
//       } else {
//         const trackingEntries = steps.map((step, index) => ({
//           productionResponseId: processLoginData.id,
//           workInstructionStepId: step.id,
//           status: "pending",
//           stepStartTime: index === 0 ? new Date() : null,
//           stepEndTime: null,
//         }));

//         await prisma.productionStepTracking.createMany({
//           data: trackingEntries,
//         });
//       }
//     }
//     return res.status(200).json({
//       message: `You have successfully logged into station. Assigned to order: ${nextJob.order.orderNumber}`,
//       data: processLoginData,
//     });
//   } catch (error) {
//     console.error("Error during process login:", error);
//     return res.status(500).send({
//       message: "Something went wrong. Please try again later.",
//       error: error.message,
//     });
//   }
// };

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

// const getScheduleProcessInformation = async (req, res) => {
//   try {
//     const orderId = req.params.id;
//     const user = req.user;
//     const { stationUserId } = req.body;
//     const data = await prisma.stockOrder.findUnique({
//       where: {
//         id: orderId,
//       },
//       select: {
//         shipDate: true,
//         productQuantity: true,
//         PartNumber: {
//           select: {
//             part_id: true,
//             partDescription: true,
//             cycleTime: true,
//             partNumber: true,
//             processId: true,
//           },
//         },
//       },
//     });
//     const employeeId = user?.id || stationUserId;
//     const employeeInfo = await prisma.employee.findUnique({
//       where: {
//         id: employeeId,
//       },
//       select: {
//         firstName: true,
//         lastName: true,
//         email: true,
//       },
//     });
//     if (!data) {
//       return res.status(404).json({ message: "Stock order not found" });
//     }

//     if (!data.PartNumber || !data.PartNumber.part_id) {
//       return res.status(404).json({ message: "Part information not found" });
//     }

//     const workInstructionData = await prisma.workInstruction.findMany({
//       where: {
//         productId: data.PartNumber.part_id,
//       },
//       select: {
//         instructionTitle: true,
//         steps: {
//           select: {
//             title: true,
//             stepNumber: true,
//             instruction: true,
//             images: {
//               select: {
//                 id: true,
//                 imagePath: true,
//               },
//             },
//             videos: {
//               select: {
//                 id: true,
//                 videoPath: true,
//               },
//             },
//           },
//         },
//       },
//     });

//     return res.status(200).json({
//       message: "Process information retrieved successfully!",
//       data: {
//         orderInformation: data,
//         workInstructionData,
//         employeeInfo,
//       },
//     });
//   } catch (error) {
//     console.log("errorerror", error);

//     return res.status(500).json({
//       message: "Something went wrong. Please try again later.",
//     });
//   }
// };

// This is your function

// const getScheduleProcessInformation = async (req, res) => {
//   try {
//     const { id } = req.params;
//     console.log("req.params for schedule process:", req.params);

//     if (!id) {
//       return res.status(400).json({ message: "processId is required." });
//     }

//     const nextJob = await prisma.stockOrderSchedule.findFirst({
//       where: {
//         processId: id,
//         status: "new",
//         isDeleted: false,
//       },
//       orderBy: {
//         createdAt: "asc",
//       },
//       include: {
//         order: {
//           select: {
//             id: true,
//             orderNumber: true,
//             productQuantity: true,
//             shipDate: true,
//             createdAt: true,
//           },
//         },
//         part: {
//           include: {
//             WorkInstruction: {
//               include: {
//                 steps: {
//                   orderBy: {
//                     stepNumber: "asc",
//                   },
//                   include: {
//                     images: {
//                       select: {
//                         id: true,
//                         imagePath: true,
//                       },
//                     },
//                     videos: {
//                       select: {
//                         id: true,
//                         videoPath: true,
//                       },
//                     },
//                   },
//                 },
//               },
//             },
//           },
//         },
//         process: {
//           select: {
//             processName: true,
//           },
//         },
//       },
//     });

//     if (!nextJob) {
//       return res
//         .status(404)
//         .json({ message: "No new jobs found for this station." });
//     }

//     const upcomingOrder = await prisma.stockOrderSchedule.findFirst({
//       where: {
//         order: {
//           createdAt: {
//             gte: nextJob.order.createdAt,
//           },
//         },
//         id: {
//           not: nextJob.id,
//         },
//       },
//       include: {
//         order: {
//           select: {
//             shipDate: true,
//           },
//         },
//       },
//       orderBy: {
//         createdAt: "asc",
//       },
//     });

//     const getProductionResponse = await prisma.productionResponse.findFirst({
//       where: {
//         processId: id,
//         isDeleted: false,
//       },
//       include: {
//         employeeInfo: {
//           select: {
//             firstName: true,
//             lastName: true,
//           },
//         },
//       },
//     });
//     console.log(
//       "getProductionResponsegetProductionResponse",
//       getProductionResponse
//     );

//     const responseData = {
//       ...nextJob,
//       productionId: getProductionResponse.id,
//       upcommingOrder: upcomingOrder?.order?.shipDate || null,
//       employeeInfo: getProductionResponse?.employeeInfo || null,
//       cycleTime: getProductionResponse?.cycleTimeStart,
//     };

//     res.status(200).json({
//       message: "Next job found successfully.",
//       data: responseData,
//     });
//   } catch (error) {
//     console.error("Error finding next job:", error);
//     res
//       .status(500)
//       .json({ message: "Something went wrong. Please try again later." });
//   }
// };

// 19 aug

// const stationLogin = async (req, res) => {
//   try {
//     const { processId, stationUserId, type } = req.body;

//     let nextJob = null;

//     // 1️⃣ First check for PART jobs in progress
//     nextJob = await prisma.stockOrderSchedule.findFirst({
//       where: {
//         processId,
//         status: "progress",
//         isDeleted: false,
//         type: "part",
//       },
//       orderBy: { createdAt: "asc" },
//       include: {
//         order: { select: { orderNumber: true, productQuantity: true } },
//         part: {
//           select: {
//             minStock: true,
//             WorkInstruction: { include: { steps: true } },
//           },
//         },
//       },
//     });

//     // 2️⃣ If no part job in progress, check for NEW part job
//     if (!nextJob) {
//       nextJob = await prisma.stockOrderSchedule.findFirst({
//         where: {
//           processId,
//           status: "new",
//           isDeleted: false,
//           type: "part",
//         },
//         orderBy: { createdAt: "asc" },
//         include: {
//           order: { select: { orderNumber: true, productQuantity: true } },
//           part: {
//             select: {
//               minStock: true,
//               WorkInstruction: { include: { steps: true } },
//             },
//           },
//         },
//       });
//     }

//     if (!nextJob) {
//       nextJob = await prisma.stockOrderSchedule.findFirst({
//         where: {
//           processId,
//           status: "progress",
//           isDeleted: false,
//           type: "product",
//         },
//         orderBy: { createdAt: "asc" },
//         include: {
//           order: { select: { orderNumber: true, productQuantity: true } },
//           part: {
//             select: {
//               minStock: true,
//               WorkInstruction: { include: { steps: true } },
//             },
//           },
//         },
//       });
//     }
//     if (!nextJob) {
//       nextJob = await prisma.stockOrderSchedule.findFirst({
//         where: {
//           processId,
//           status: "new",
//           isDeleted: false,
//           type: "product",
//         },
//         orderBy: { createdAt: "asc" },
//         include: {
//           order: { select: { orderNumber: true, productQuantity: true } },
//           part: {
//             select: {
//               minStock: true,
//               WorkInstruction: { include: { steps: true } },
//             },
//           },
//         },
//       });
//     }

//     // ❌ If nothing found at all
//     if (!nextJob) {
//       return res.status(404).json({
//         message: "No available jobs found for this station at the moment.",
//       });
//     }

//     // Determine schedule quantity: PART jobs = quantity * minStock, PRODUCT jobs = productQuantity
//     let scheduleQuantity =
//       nextJob.type === "part"
//         ? (nextJob.quantity || 0) * nextJob.part.minStock
//         : nextJob.order.productQuantity || 0;

//     const instruction = nextJob?.part?.WorkInstruction?.[0];
//     const steps = instruction?.steps || [];

//     const processLoginData = await prisma.productionResponse.create({
//       data: {
//         process: { connect: { id: processId } },
//         StockOrder: { connect: { id: nextJob.order_id } },
//         PartNumber: { connect: { part_id: nextJob.part_id } },
//         employeeInfo: { connect: { id: stationUserId } },
//         type,
//         instructionId: instruction?.id || null,
//         scrap: null,
//         cycleTimeStart: new Date(),
//         cycleTimeEnd: null,
//         scheduleQuantity: scheduleQuantity,
//         remainingQty: scheduleQuantity,
//       },
//     });

//     // Training logic unchanged
//     if (type === "training" && steps.length > 0) {
//       const { employeeId, processId, partId } = processLoginData;
//       const existingTraining = await prisma.productionResponse.findFirst({
//         where: {
//           employeeId,
//           processId,
//           partId,
//           traniningStatus: true,
//         },
//       });

//       if (existingTraining) {
//         return res.status(409).send({
//           message:
//             "You have already completed this process and related parts training. Please choose a different process and part.",
//         });
//       } else {
//         const trackingEntries = steps.map((step, index) => ({
//           productionResponseId: processLoginData.id,
//           workInstructionStepId: step.id,
//           status: "pending",
//           stepStartTime: index === 0 ? new Date() : null,
//           stepEndTime: null,
//         }));

//         await prisma.productionStepTracking.createMany({
//           data: trackingEntries,
//         });
//       }
//     }

//     return res.status(200).json({
//       message: `You have successfully logged into station. Assigned to order: ${nextJob.order.orderNumber}`,
//       data: processLoginData,
//     });
//   } catch (error) {
//     console.error("Error during process login:", error);
//     return res.status(500).send({
//       message: "Something went wrong. Please try again later.",
//       error: error.message,
//     });
//   }
// };
// 19 aug end

// const stationLogin = async (req, res) => {
//   try {
//     const { processId, stationUserId, type } = req.body;
//     let nextJob = await prisma.stockOrderSchedule.findFirst({
//       where: {
//         processId,
//         status: "progress",
//         isDeleted: false,
//       },
//       orderBy: {
//         createdAt: "asc",
//       },
//       include: {
//         // --- CHANGE 1: Use the correct relation name 'StockOrder' ---
//         StockOrder: { select: { orderNumber: true } }, // <-- CHANGED
//         part: {
//           include: {
//             WorkInstruction: {
//               include: {
//                 steps: true,
//               },
//             },
//           },
//         },
//       },
//     });

//     if (!nextJob) {
//       nextJob = await prisma.stockOrderSchedule.findFirst({
//         where: {
//           processId,
//           status: "new",
//           isDeleted: false,
//         },
//         orderBy: {
//           createdAt: "asc",
//         },
//         include: {
//           // --- CHANGE 2: Use the correct relation name 'StockOrder' here too ---
//           StockOrder: { select: { orderNumber: true } }, // <-- CHANGED
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
//     }

//     if (!nextJob) {
//       return res.status(404).json({
//         message: "No available jobs found for this station at the moment.",
//       });
//     }

//     // This 'create' call seems to have a bug. It assumes the order is always a StockOrder.
//     // It uses `nextJob.order_id`, which is correct, but only connects to the StockOrder table.
//     // This will fail if the nextJob.order_type is 'CustomOrder'. Be aware of this limitation.
//     const processLoginData = await prisma.productionResponse.create({
//       data: {
//         process: { connect: { id: processId } },
//         StockOrder: { connect: { id: nextJob.order_id } },
//         PartNumber: { connect: { part_id: nextJob.part_id } },
//         employeeInfo: { connect: { id: stationUserId } },
//         type,
//         instructionId: nextJob?.part?.WorkInstruction?.[0]?.id || null,
//         scrap: null,
//         cycleTimeStart: new Date(),
//         cycleTimeEnd: null,
//       },
//     });

//     // The rest of your logic seems fine...
//     if (
//       type === "training" &&
//       nextJob?.part?.WorkInstruction?.[0]?.steps.length > 0
//     ) {
//       const { employeeId, processId, partId } = processLoginData;
//       const existingTraining = await prisma.productionResponse.findFirst({
//         where: {
//           employeeId: employeeId,
//           processId: processId,
//           partId: partId,
//           traniningStatus: true,
//         },
//       });
//       if (existingTraining) {
//         return res.status(409).send({
//           message:
//             "You have already completed this process and related parts traning  . please choose different process and parts",
//         });
//       } else {
//         const trackingEntries = nextJob.part.WorkInstruction[0].steps.map(
//           (step, index) => ({
//             productionResponseId: processLoginData.id,
//             workInstructionStepId: step.id,
//             status: "pending",
//             stepStartTime: index === 0 ? new Date() : null,
//             stepEndTime: null,
//           })
//         );

//         await prisma.productionStepTracking.createMany({
//           data: trackingEntries,
//         });
//       }
//     }

//     return res.status(200).json({
//       // --- CHANGE 3: Access the orderNumber through the correct property ---
//       message: `You have successfully logged into station. Assigned to order: ${nextJob.StockOrder?.orderNumber}`, // <-- CHANGED
//       data: processLoginData,
//     });
//   } catch (error) {
//     console.error("Error during process login:", error);
//     return res.status(500).send({
//       message: "Something went wrong. Please try again later.",
//       error: error.message,
//     });
//   }
// };

const stationLogin = async (req, res) => {
  try {
    const { processId, stationUserId, type } = req.body;

    // A helper function to find the next job to avoid repeating code
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
          // --- FIX 1: Include BOTH possible relations ---
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

    // Find a job in 'progress' first, then look for 'new'
    let nextJob = await findNextJob("progress");
    if (!nextJob) {
      nextJob = await findNextJob("new");
    }

    if (!nextJob) {
      return res.status(404).json({
        message: "No available jobs found for this station at the moment.",
      });
    }

    // --- FIX 2: Dynamically build the data for the create operation ---
    const createData = {
      process: { connect: { id: processId } },
      PartNumber: { connect: { part_id: nextJob.part_id } },
      employeeInfo: { connect: { id: stationUserId } },
      type,
      instructionId: nextJob?.part?.WorkInstruction?.[0]?.id || null,
      scrap: null,
      cycleTimeStart: new Date(),
      cycleTimeEnd: null,
    };

    // Conditionally connect to the correct order table based on the job's type
    if (nextJob.order_type === "StockOrder") {
      createData.StockOrder = { connect: { id: nextJob.order_id } };
    } else if (nextJob.order_type === "CustomOrder") {
      createData.CustomOrder = { connect: { id: nextJob.order_id } };
    } else {
      // Handle cases where the order_type is unknown or null
      return res.status(400).json({
        message: `Unsupported order type "${nextJob.order_type}" found for this job.`,
      });
    }

    // Now, create the production response with the correctly built data
    const processLoginData = await prisma.productionResponse.create({
      data: createData,
    });

    // The rest of your logic for training tracking remains the same...
    if (
      type === "training" &&
      nextJob?.part?.WorkInstruction?.[0]?.steps.length > 0
    ) {
      const existingTraining = await prisma.productionResponse.findFirst({
        where: {
          stationUserId: stationUserId,
          processId: processId,
          partId: nextJob.part_id,
          traniningStatus: true,
        },
      });
      if (existingTraining) {
        return res.status(409).send({
          message:
            "You have already completed training for this process and part.",
        });
      } else {
        const trackingEntries = nextJob.part.WorkInstruction[0].steps.map(
          (step, index) => ({
            productionResponseId: processLoginData.id,
            workInstructionStepId: step.id,
            status: "pending",
            stepStartTime: index === 0 ? new Date() : null,
            stepEndTime: null,
          })
        );

        await prisma.productionStepTracking.createMany({
          data: trackingEntries,
        });
      }
    }

    // --- FIX 3: Get the orderNumber from whichever relation is not null ---
    const orderNumber =
      nextJob.StockOrder?.orderNumber ||
      nextJob.CustomOrder?.orderNumber ||
      "N/A";

    return res.status(200).json({
      message: `You have successfully logged into station. Assigned to order: ${orderNumber}`,
      data: processLoginData,
    });
  } catch (error) {
    // Check for the specific Prisma error P2025 again, just in case
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
// const getScheduleProcessInformation = async (req, res) => {
//   try {
//     const { id: processId } = req.params;

//     if (!processId) {
//       return res.status(400).json({ message: "processId is required." });
//     }

//     let nextJob = await prisma.stockOrderSchedule.findFirst({
//       where: {
//         processId,
//         status: "progress",
//         isDeleted: false,
//       },
//       orderBy: { createdAt: "asc" },
//       include: {
//         order: {
//           select: {
//             id: true,
//             orderNumber: true,
//             productQuantity: true,
//             partId: true,
//             shipDate: true,
//             createdAt: true,
//           },
//         },
//         part: {
//           include: {
//             WorkInstruction: {
//               include: {
//                 steps: {
//                   orderBy: { stepNumber: "asc" },
//                   include: {
//                     images: { select: { id: true, imagePath: true } },
//                     videos: { select: { id: true, videoPath: true } },
//                   },
//                 },
//               },
//             },
//           },
//         },
//         process: { select: { processName: true } },
//       },
//     });

//     if (!nextJob) {
//       nextJob = await prisma.stockOrderSchedule.findFirst({
//         where: {
//           processId,
//           status: "new",
//           isDeleted: false,
//         },
//         orderBy: { createdAt: "asc" },
//         include: {
//           order: {
//             select: {
//               id: true,
//               orderNumber: true,
//               productQuantity: true,
//               shipDate: true,
//               createdAt: true,
//             },
//           },
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
//     }

//     if (!nextJob) {
//       return res
//         .status(404)
//         .json({ message: "No jobs found for this station." });
//     }
//     console.log("nextJobnextJob", nextJob);

//     const upcomingOrder = await prisma.stockOrderSchedule.findFirst({
//       where: {
//         order: {
//           createdAt: {
//             gte: nextJob.order.createdAt,
//           },
//         },
//         id: { not: nextJob.id },
//       },
//       include: {
//         order: { select: { shipDate: true } },
//       },
//       orderBy: { createdAt: "asc" },
//     });

//     const getProductionResponse = await prisma.productionResponse.findFirst({
//       where: {
//         processId,
//         isDeleted: false,
//       },
//       orderBy: { cycleTimeStart: "desc" },
//       include: {
//         employeeInfo: {
//           select: { firstName: true, lastName: true, id: true },
//         },
//       },
//     });
//     const productionResponse = await prisma.productionResponse.findFirst({
//       where: {
//         orderId: nextJob.order_id,
//         partId: nextJob.part_id,
//         processId: nextJob.processId,
//       },
//       orderBy: { cycleTimeStart: "desc" },
//       select: {
//         id: true,
//         scheduleQuantity: true,
//         employeeInfo: { select: { firstName: true, lastName: true, id: true } },
//       },
//     });
//     const scheduleQuantity =
//       productionResponse?.scheduleQuantity ||
//       (nextJob.type === "part"
//         ? (nextJob.quantity || 0) * (nextJob.part?.minStock || 1)
//         : nextJob.order?.productQuantity || 0);

//     const remainingQty = scheduleQuantity - (nextJob.completedQuantity || 0);
//     const responseData = {
//       ...nextJob,
//       productionId: getProductionResponse?.id || null,
//       upcommingOrder: upcomingOrder?.order?.shipDate || null,
//       employeeInfo: getProductionResponse?.employeeInfo || null,
//       cycleTime: getProductionResponse?.cycleTimeStart || null,
//       completedQty: getProductionResponse?.completedQuantity || 0,
//       scheduleQuantity: scheduleQuantity,
//       remainingQty: remainingQty || nextJob.quantity,
//       scrapQty: getProductionResponse.scrapQuantity || 0,
//     };

//     res.status(200).json({
//       message: "Next job found successfully.",
//       data: responseData,
//     });
//   } catch (error) {
//     console.error("Error finding next job:", error);
//     res.status(500).json({ message: "Something went wrong." });
//   }
// };

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

// const getNextJobDetails = async (req, res) => {
//   try {
//     const { id } = req.params;

//     const nextJob = await prisma.stockOrderSchedule.findFirst({
//       where: {
//         process_id: id,
//         status: "schedule",
//         isDeleted: false,
//       },
//       orderBy: {
//         schedule_date: "asc",
//       },
//       select: {
//         id: true,
//         order_id: true,
//         part_id: true,
//         process_id: true,
//         schedule_date: true,
//       },
//     });

//     if (!nextJob) {
//       return res.status(404).json({
//         message: "No available jobs found for this station.",
//       });
//     }

//     const [orderDetails, partDetails, workInstructions] = await Promise.all([
//       prisma.stockOrder.findUnique({
//         where: { id: nextJob.order_id },
//         select: {
//           orderNumber: true,
//           orderDate: true,
//           shipDate: true,
//           productQuantity: true,
//           customer: {
//             select: {
//               firstName: true,
//               lastName: true,
//             },
//           },
//         },
//       }),

//       prisma.partNumber.findUnique({
//         where: { part_id: nextJob.part_id },
//         select: {
//           part_id: true,
//           partNumber: true,
//           partDescription: true,
//           partImages: {
//             select: { imageUrl: true },
//             where: { isDeleted: false },
//           },
//           components: {
//             where: { isDeleted: false },
//             select: {
//               partQuantity: true,
//               part: {
//                 select: {
//                   partNumber: true,
//                   partDescription: true,
//                 },
//               },
//             },
//           },
//         },
//       }),

//       prisma.workInstruction.findMany({
//         where: {
//           productId: nextJob.part_id,
//           processId: nextJob.process_id,
//           isDeleted: false,
//         },
//         select: {
//           instructionTitle: true,
//           steps: {
//             where: { isDeleted: false },
//             orderBy: { stepNumber: "asc" },
//             select: {
//               stepNumber: true,
//               title: true,
//               instruction: true,
//               images: {
//                 select: { imagePath: true },
//                 where: { isDeleted: false },
//               },
//               videos: {
//                 select: { videoPath: true },
//                 where: { isDeleted: false },
//               },
//             },
//           },
//         },
//       }),
//     ]);

//     const jobDetails = {
//       scheduleId: nextJob.id,
//       order: orderDetails,
//       part: partDetails,
//       workInstructions:
//         workInstructions.length > 0 ? workInstructions[0] : null,
//     };

//     return res.status(200).json({
//       message: "Next job details retrieved successfully.",
//       data: jobDetails,
//     });
//   } catch (error) {
//     console.error("Error fetching next job details:", error);
//     return res.status(500).json({
//       message: "Something went wrong fetching job details.",
//       error: error.message,
//     });
//   }
// };

const getNextJobDetails = async (req, res) => {
  try {
    const { id: processId } = req.params; // Renamed for clarity

    // =======================> CHANGE 1: UPDATED QUERY <=======================
    // Find the next job, prioritizing by date first, then by type ('part' before 'product')
    const nextJob = await prisma.stockOrderSchedule.findFirst({
      where: {
        processId: processId, // Assuming your schema uses camelCase, if not, use process_id
        status: "new", // Or "new" if that's your status for ready jobs
        isDeleted: false,
      },
      orderBy: [
        { schedule_date: "asc" }, // 1. Primary Sort: Oldest jobs first
        { type: "asc" }, // 2. Secondary Sort: 'part' comes before 'product'
      ],
      select: {
        id: true,
        order_id: true,
        order_type: true, // IMPORTANT: Select the order_type to know which table to query
        part_id: true,
        processId: true, // Assuming your schema uses camelCase
        schedule_date: true,
      },
    });
    // =======================================================================
    console.log("nextJobnextJob", nextJob);

    if (!nextJob) {
      return res.status(404).json({
        message: "No available jobs found for this station.",
      });
    }

    // ==================> CHANGE 2: DYNAMIC ORDER FETCHING <==================
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
const selectScheduleProcess = async (req, res) => {
  try {
    const stationUserId = req.user;
    const stockOrders = await prisma.stockOrderSchedule.findMany({
      where: {
        type: "part",
        isDeleted: false,
        status: {
          in: ["new", "progress"],
        },
      },
      include: {
        part: {
          include: {
            process: {
              select: {
                id: true,
                processName: true,
              },
            },
          },
        },
      },
    });
    console.log("stockOrdersstockOrdersstockOrders", stockOrders);

    if (!stockOrders || stockOrders.length === 0) {
      return res
        .status(404)
        .json({ message: "No active part schedules found." });
    }

    const processMap = new Map();
    stockOrders.forEach((order) => {
      const process = order.part?.process;
      if (process && process.id && !processMap.has(process.id)) {
        processMap.set(process.id, {
          id: process.id,
          name: process.processName,
        });
      }
    });

    const uniqueProcesses = Array.from(processMap.values());
    if (uniqueProcesses.length === 0) {
      return res
        .status(404)
        .json({ message: "No unique processes found for active schedules." });
    }

    let employeeFormattedData = [];
    if (stationUserId.role !== "Shop_Floor") {
      const employees = await prisma.employee.findMany({
        where: { isDeleted: false },
        select: {
          id: true,
          employeeId: true,
          email: true,
          fullName: true,
        },
      });

      employeeFormattedData = employees.map((employee) => ({
        id: employee.id,
        name: employee.fullName,
        employeeId: employee.employeeId,
        email: employee.email,
      }));
    }

    return res.status(200).json({
      stockAndProcess: uniqueProcesses,
      stationUser: employeeFormattedData,
    });
  } catch (error) {
    console.error("Error in selectScheduleProcess:", error);
    return res.status(500).json({
      message: "Something went wrong. Please try again later.",
    });
  }
};

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

// okok
// const getScheduleProcessInformation = async (req, res) => {
//   try {
//     const { id: processId } = req.params;

//     if (!processId) {
//       return res.status(400).json({ message: "processId is required." });
//     }

//     let nextJob = await prisma.stockOrderSchedule.findFirst({
//       where: {
//         processId,
//         status: "progress",
//         isDeleted: false,
//       },
//       orderBy: { createdAt: "asc" },
//       include: {
//         order: {
//           select: {
//             id: true,
//             orderNumber: true,
//             productQuantity: true,
//             partId: true,
//             shipDate: true,
//             createdAt: true,
//           },
//         },
//         part: {
//           include: {
//             WorkInstruction: {
//               include: {
//                 steps: {
//                   orderBy: { stepNumber: "asc" },
//                   include: {
//                     images: { select: { id: true, imagePath: true } },
//                     videos: { select: { id: true, videoPath: true } },
//                   },
//                 },
//               },
//             },
//           },
//         },
//         process: { select: { processName: true } },
//       },
//     });

//     if (!nextJob) {
//       nextJob = await prisma.stockOrderSchedule.findFirst({
//         where: {
//           processId,
//           status: "new",
//           isDeleted: false,
//         },
//         orderBy: { createdAt: "asc" },
//         include: {
//           order: {
//             select: {
//               id: true,
//               orderNumber: true,
//               productQuantity: true,
//               shipDate: true,
//               createdAt: true,
//             },
//           },
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
//     }

//     if (!nextJob) {
//       return res
//         .status(404)
//         .json({ message: "No jobs found for this station." });
//     }
//     console.log("nextJobnextJob", nextJob);

//     const upcomingOrder = await prisma.stockOrderSchedule.findFirst({
//       where: {
//         order: {
//           createdAt: {
//             gte: nextJob.order.createdAt,
//           },
//         },
//         id: { not: nextJob.id },
//       },
//       include: {
//         order: { select: { shipDate: true } },
//       },
//       orderBy: { createdAt: "asc" },
//     });

//     const getProductionResponse = await prisma.productionResponse.findFirst({
//       where: {
//         processId,
//         isDeleted: false,
//       },
//       orderBy: { cycleTimeStart: "desc" },
//       include: {
//         employeeInfo: {
//           select: { firstName: true, lastName: true, id: true },
//         },
//       },
//     });
//     const productionResponse = await prisma.productionResponse.findFirst({
//       where: {
//         orderId: nextJob.order_id,
//         partId: nextJob.part_id,
//         processId: nextJob.processId,
//       },
//       orderBy: { cycleTimeStart: "desc" },
//       select: {
//         id: true,
//         scheduleQuantity: true,
//         employeeInfo: { select: { firstName: true, lastName: true, id: true } },
//       },
//     });
//     const scheduleQuantity =
//       productionResponse?.scheduleQuantity ||
//       (nextJob.type === "part"
//         ? (nextJob.quantity || 0) * (nextJob.part?.minStock || 1)
//         : nextJob.order?.productQuantity || 0);

//     const remainingQty = scheduleQuantity - (nextJob.completedQuantity || 0);
//     const responseData = {
//       ...nextJob,
//       productionId: getProductionResponse?.id || null,
//       upcommingOrder: upcomingOrder?.order?.shipDate || null,
//       employeeInfo: getProductionResponse?.employeeInfo || null,
//       cycleTime: getProductionResponse?.cycleTimeStart || null,
//       completedQty: getProductionResponse?.completedQuantity || 0,
//       scheduleQuantity: scheduleQuantity,
//       remainingQty: remainingQty || nextJob.quantity,
//       scrapQty: getProductionResponse.scrapQuantity || 0,
//     };

//     res.status(200).json({
//       message: "Next job found successfully.",
//       data: responseData,
//     });
//   } catch (error) {
//     console.error("Error finding next job:", error);
//     res.status(500).json({ message: "Something went wrong." });
//   }
// };

// okok
// const getScheduleProcessInformation = async (req, res) => {
//   try {
//     const { id: processId } = req.params;
//     if (!processId) {
//       return res.status(400).json({ message: "processId is required." });
//     }

//     // --- REUSABLE HELPER FUNCTION TO FIND AND ATTACH ORDER DATA ---
//     const findAndStitchJob = async (findOptions) => {
//       // Step 1: Find the schedule with all its related data
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

//       // Step 2: Fetch the correct parent order data (StockOrder or CustomOrder)
//       let orderData = null;
//       const orderSelectFields = {
//         id: true,
//         orderNumber: true,
//         productQuantity: true,
//         partId: true, // This is the final product's ID
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
//           },
//         });
//       }

//       // Step 3: Stitch the order data onto the schedule object and return
//       return { ...schedule, order: orderData };
//     };
//     // --- END OF HELPER FUNCTION ---

//     // =================================================================
//     // ===========> RESTRUCTURED JOB SEARCH LOGIC STARTS HERE <===========
//     // =================================================================

//     let nextJob = null;

//     // PRIORITY 1: Find any job currently in "progress" at this station.
//     // This ensures that if the page is refreshed, the user sees the same job.
//     nextJob = await findAndStitchJob({
//       where: {
//         processId,
//         status: "progress",
//         isDeleted: false,
//       },
//     });

//     // PRIORITY 2: If no job is in progress, check if a 'part' was just completed
//     // and immediately look for its corresponding 'product' job. This is the key fix.
//     if (!nextJob) {
//       const lastCompletedPartJob = await prisma.stockOrderSchedule.findFirst({
//         where: {
//           processId,
//           status: "completed",
//           type: "part",
//           isDeleted: false,
//         },
//         orderBy: { updatedAt: "desc" },
//       });

//       if (lastCompletedPartJob) {
//         // Look specifically for the 'product' job from the SAME order that is ready to start
//         nextJob = await findAndStitchJob({
//           where: {
//             order_id: lastCompletedPartJob.order_id,
//             type: "product",
//             status: { in: ["new", "progress"] }, // It must be 'new' or could be already 'progress'
//             isDeleted: false,
//           },
//         });
//       }
//     }

//     // PRIORITY 3: If still no job found, get the oldest "new" job for this station.
//     // This is the generic "get next in queue" logic.
//     if (!nextJob) {
//       nextJob = await findAndStitchJob({
//         where: {
//           processId,
//           status: "new",
//           isDeleted: false,
//         },
//         orderBy: {
//           createdAt: "asc",
//         },
//       });
//     }

//     // =================================================================
//     // ===========>  RESTRUCTURED JOB SEARCH LOGIC ENDS HERE  <===========
//     // =================================================================

//     if (!nextJob || !nextJob.order) {
//       return res
//         .status(404)
//         .json({ message: "No jobs found for this station." });
//     }

//     // --- Fetch auxiliary data for the response ---
//     const { order_id, part_id } = nextJob;

//     const [lastProductionCycle, currentProductionResponse, upcomingOrder] =
//       await Promise.all([
//         // Gets the last cycle details for this station (for employee info, etc.)
//         prisma.productionResponse.findFirst({
//           where: { processId, isDeleted: false },
//           orderBy: { cycleTimeStart: "desc" },
//           include: {
//             employeeInfo: {
//               select: { firstName: true, lastName: true, id: true },
//             },
//           },
//         }),

//         // Gets specific production details for THIS job
//         prisma.productionResponse.findFirst({
//           where: { orderId: order_id, partId: part_id, processId },
//           orderBy: { cycleTimeStart: "desc" },
//           select: { id: true, scheduleQuantity: true },
//         }),

//         // Finds the next upcoming job for the UI
//         (async () => {
//           const upcomingSchedule = await prisma.stockOrderSchedule.findFirst({
//             where: {
//               processId,
//               id: { not: nextJob.id },
//               status: { in: ["new", "progress"] },
//               createdAt: { gte: nextJob.createdAt },
//             },
//             orderBy: { createdAt: "asc" },
//           });

//           if (!upcomingSchedule) return null;

//           const upcomingOrderData = await prisma.stockOrder.findUnique({
//             where: { id: upcomingSchedule.order_id },
//             select: { shipDate: true },
//           });

//           return { ...upcomingSchedule, order: upcomingOrderData };
//         })(),
//       ]);

//     // Get the schedule quantity directly from the schedule record itself.
//     const scheduleQuantity = nextJob.scheduleQuantity || 0;
//     const remainingQuantity = nextJob.remainingQty || 0;

//     // --- Construct the final response object ---
//     const responseData = {
//       ...nextJob,
//       productionId: lastProductionCycle?.id || null,
//       productId: nextJob.order?.partId || null, // Final product ID from the parent order
//       upcommingOrder: upcomingOrder?.order?.shipDate || null,
//       employeeInfo: lastProductionCycle?.employeeInfo || null,
//       cycleTime: lastProductionCycle?.cycleTimeStart || null,
//       completedQty: nextJob.completedQuantity || 0,
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
const getScheduleProcessInformation = async (req, res) => {
  try {
    const { id: processId } = req.params;
    if (!processId) {
      return res.status(400).json({ message: "processId is required." });
    }

    // --- REUSABLE HELPER FUNCTION (NO CHANGES NEEDED HERE) ---
    const findAndStitchJob = async (findOptions) => {
      const schedule = await prisma.stockOrderSchedule.findFirst({
        ...findOptions,
        include: {
          part: {
            include: {
              WorkInstruction: {
                include: {
                  steps: {
                    orderBy: { stepNumber: "asc" },
                    include: {
                      images: { select: { id: true, imagePath: true } },
                      videos: { select: { id: true, videoPath: true } },
                    },
                  },
                },
              },
            },
          },
          process: { select: { processName: true } },
        },
      });
      if (!schedule) return null;
      let orderData = null;
      const orderSelectFields = {
        id: true,
        orderNumber: true,
        productQuantity: true,
        partId: true,
        shipDate: true,
        createdAt: true,
      };
      if (schedule.order_type === "StockOrder" && schedule.order_id) {
        orderData = await prisma.stockOrder.findUnique({
          where: { id: schedule.order_id },
          select: orderSelectFields,
        });
      } else if (schedule.order_type === "CustomOrder" && schedule.order_id) {
        orderData = await prisma.customOrder.findUnique({
          where: { id: schedule.order_id },
          select: {
            id: true,
            orderNumber: true,
            shipDate: true,
            createdAt: true,
            productQuantity: true,
            partId: true,
            productId: true,
          },
        });
      }
      return { ...schedule, order: orderData };
    };
    // --- END OF HELPER FUNCTION ---

    let nextJob = null;

    // PRIORITY 1: Find any job currently in "progress".
    nextJob = await findAndStitchJob({
      where: {
        processId,
        status: "progress",
        isDeleted: false,
      },
    });

    // PRIORITY 2: If no job is in progress, check if a 'part' was just completed.
    if (!nextJob) {
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
        // ===> CRITICAL LOGIC CHANGE IS HERE <===
        // Before looking for the product, check if ALL parts for this order are completed.
        const pendingPartsCount = await prisma.stockOrderSchedule.count({
          where: {
            order_id: lastCompletedPartJob.order_id,
            order_type: lastCompletedPartJob.order_type, // Ensure we check within the same order type
            type: "part",
            status: { not: "completed" },
            isDeleted: false,
          },
        });

        // Only if there are no more pending parts, proceed to find the product job.
        if (pendingPartsCount === 0) {
          nextJob = await findAndStitchJob({
            where: {
              order_id: lastCompletedPartJob.order_id,
              order_type: lastCompletedPartJob.order_type,
              type: "product",
              status: { in: ["new", "progress"] },
              isDeleted: false,
            },
          });
        }
        // If pendingPartsCount > 0, nextJob remains null, and the logic will
        // correctly fall through to Priority 3 to find the next 'new' part.
      }
    }

    // PRIORITY 3: If still no job found, get the oldest "new" job, prioritizing parts.
    if (!nextJob) {
      nextJob = await findAndStitchJob({
        where: {
          processId,
          status: "new",
          isDeleted: false,
        },
        orderBy: [{ type: "asc" }, { createdAt: "asc" }],
      });
    }

    if (!nextJob || !nextJob.order) {
      return res
        .status(404)
        .json({ message: "No jobs found for this station." });
    }

    // --- The rest of the function remains the same ---
    const { order_id, part_id } = nextJob;

    const [lastProductionCycle, currentProductionResponse, upcomingOrder] =
      await Promise.all([
        prisma.productionResponse.findFirst({
          where: { processId, isDeleted: false },
          orderBy: { cycleTimeStart: "desc" },
          include: {
            employeeInfo: {
              select: { firstName: true, lastName: true, id: true },
            },
          },
        }),
        prisma.productionResponse.findFirst({
          where: { orderId: order_id, partId: part_id, processId },
          orderBy: { cycleTimeStart: "desc" },
          select: { id: true, scheduleQuantity: true },
        }),
        (async () => {
          const upcomingSchedule = await prisma.stockOrderSchedule.findFirst({
            where: {
              processId,
              id: { not: nextJob.id },
              status: { in: ["new", "progress"] },
              createdAt: { gte: nextJob.createdAt },
            },
            orderBy: [{ createdAt: "asc" }, { type: "asc" }],
          });
          if (!upcomingSchedule) return null;
          let upcomingOrderData = null;
          if (upcomingSchedule.order_type === "StockOrder") {
            upcomingOrderData = await prisma.stockOrder.findUnique({
              where: { id: upcomingSchedule.order_id },
              select: { shipDate: true },
            });
          } else if (upcomingSchedule.order_type === "CustomOrder") {
            upcomingOrderData = await prisma.customOrder.findUnique({
              where: { id: upcomingSchedule.order_id },
              select: { shipDate: true },
            });
          }
          return { ...upcomingSchedule, order: upcomingOrderData };
        })(),
      ]);

    const scheduleQuantity = nextJob.scheduleQuantity || 0;
    const completedQuantity = nextJob.completedQuantity || 0;
    const remainingQuantity = nextJob.remainingQty;
    console.log("nextJob.ordernextJob.order", nextJob.order);

    const responseData = {
      ...nextJob,
      productionId: lastProductionCycle?.id || null,
      productId: nextJob.order?.partId || null,
      upcommingOrder: upcomingOrder?.order?.shipDate || null,
      employeeInfo: lastProductionCycle?.employeeInfo || null,
      cycleTime: lastProductionCycle?.cycleTimeStart || null,
      completedQty: completedQuantity,
      scheduleQuantity: scheduleQuantity,
      scrapQty: lastProductionCycle?.scrapQuantity || 0,
      remainingQty: remainingQuantity,
    };

    res.status(200).json({
      message: "Next job found successfully.",
      data: responseData,
    });
  } catch (error) {
    console.error("Error finding next job:", error);
    res
      .status(500)
      .json({ message: "Something went wrong.", error: error.message });
  }
};
// const completeScheduleOrder = async (req, res) => {
//   try {
//     const { id } = req.params;
//     const { orderId, partId, employeeId, productId, type } = req.body;
//     await prisma.productionResponse.update({
//       where: { id },
//       data: {
//         quantity: true,
//         scrap: false,
//         cycleTimeEnd: new Date(),
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

//     if (
//       !orderSchedule.scheduleQuantity ||
//       typeof orderSchedule.scheduleQuantity !== "number"
//     ) {
//       return res.status(400).json({
//         message: "Schedule quantity not found or invalid.",
//       });
//     }
//     console.log("orderScheduleorderSchedule", orderSchedule);

//     const completedQuantity = orderSchedule.completedQuantity;
//     console.log("completedQuantitycompletedQuantity", completedQuantity);

//     const totalScheduleQty = orderSchedule.scheduleQuantity;
//     const remainingQty = totalScheduleQty - completedQuantity;
//     console.log(
//       "completedQuantity completedQuantity ",
//       completedQuantity,
//       totalScheduleQty,
//       remainingQty
//     );

//     if (completedQuantity >= totalScheduleQty) {
//       return res.status(400).json({
//         message: "Order is already fully completed.",
//         status: "completed",
//       });
//     }
//     const newCompletedQty = completedQuantity + 1;
//     const updatedStatus =
//       newCompletedQty === totalScheduleQty ? "completed" : "progress";

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
//           newCompletedQty === totalScheduleQty ? new Date() : undefined,
//         status: updatedStatus,
//         remainingQty: remainingQty,
//       },
//     });

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

// before 19 aug
// const completeScheduleOrder = async (req, res) => {
//   try {
//     const { id } = req.params;
//     const { orderId, partId, employeeId, productId, type } = req.body;

//     // This part is fine
//     await prisma.productionResponse.update({
//       where: { id },
//       data: {
//         quantity: true,
//         scrap: false,
//         cycleTimeEnd: new Date(),
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

//     if (
//       !orderSchedule.scheduleQuantity ||
//       typeof orderSchedule.scheduleQuantity !== "number"
//     ) {
//       return res.status(400).json({
//         message: "Schedule quantity not found or invalid.",
//       });
//     }
//     console.log("orderScheduleorderSchedule", orderSchedule);

//     const completedQuantity = orderSchedule.completedQuantity;
//     const totalScheduleQty = orderSchedule.scheduleQuantity;

//     if (completedQuantity >= totalScheduleQty) {
//       return res.status(400).json({
//         message: "Order is already fully completed.",
//         status: "completed",
//       });
//     }

//     // --- START OF CORRECTION ---

//     // 1. Pehle 'newCompletedQty' calculate karein.
//     // 1. First, calculate the 'newCompletedQty'.
//     const newCompletedQty = completedQuantity + 1;

//     // 2. Ab 'newCompletedQty' ke basis par 'newRemainingQty' calculate karein.
//     // 2. Now, calculate the 'newRemainingQty' based on the new completed quantity.
//     const newRemainingQty = totalScheduleQty - newCompletedQty;

//     // --- END OF CORRECTION ---

//     const updatedStatus =
//       newCompletedQty >= totalScheduleQty ? "completed" : "progress";

//     await prisma.stockOrderSchedule.update({
//       where: {
//         order_id_part_id: {
//           order_id: orderId,
//           part_id: partId,
//         },
//       },
//       data: {
//         completedQuantity: newCompletedQty,
//         completed_date: updatedStatus === "completed" ? new Date() : undefined,
//         status: updatedStatus,
//         remainingQty: newRemainingQty,
//       },
//     });

//     if (updatedStatus === "progress") {
//       await prisma.partNumber.update({
//         where: { part_id: partId },
//         data: {
//           availStock: {
//             decrement: 1,
//           },
//         },
//       });
//     }

//     if (updatedStatus === "completed") {
//       await prisma.partNumber.update({
//         where: { part_id: productId },
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
//         remainingQty: newRemainingQty,
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
// const scrapScheduleOrder = async (req, res) => {
//   try {
//     const { id } = req.params;
//     const { orderId, partId, employeeId } = req.body;
//     await prisma.productionResponse.update({
//       where: { id },
//       data: { scrap: true, quantity: false, cycleTimeEnd: new Date() },
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

//     const currentRemainingQty =
//       orderSchedule.scheduleQuantity - (orderSchedule.completedQuantity || 0);
//     const newRemainingQty = Math.max(0, currentRemainingQty - 1);

//     await prisma.stockOrderSchedule.update({
//       where: {
//         order_id_part_id: {
//           order_id: orderId,
//           part_id: partId,
//         },
//       },
//       data: {
//         status: "progress",
//         scrapQuantity: {
//           increment: 1,
//         },
//         scheduleQuantity: {
//           decrement: 1,
//         },
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
//       data: {
//         scrapQuantity: {
//           increment: 1,
//         },
//         remainingQty: newRemainingQty,
//       },
//     });

//     if (orderSchedule.remainingQty === 0) {
//       await prisma.stockOrderSchedule.update({
//         where: {
//           order_id_part_id: {
//             order_id: orderId,
//             part_id: partId,
//           },
//         },
//         data: {
//           status: "completed",
//         },
//       });
//     }
//     return res.status(200).json({
//       message: "This order has been added as scrap.",
//     });
//   } catch (error) {
//     console.error("Error scrapping schedule order:", error);
//     res.status(500).json({ message: "An error occurred on the server." });
//   }
// };

// begore 19 aug

const completeScheduleOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const { orderId, partId, employeeId, productId, order_type, type } =
      req.body;

    if (!order_type) {
      return res.status(400).json({ message: "order_type is required." });
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
        order_id_part_id_order_type: {
          order_id: orderId,
          part_id: partId,
          order_type: order_type,
        },
      },
    });

    if (!orderSchedule) {
      return res.status(404).json({ message: "Order schedule not found." });
    }

    if (
      !orderSchedule.scheduleQuantity ||
      typeof orderSchedule.scheduleQuantity !== "number"
    ) {
      return res.status(400).json({
        message: "Schedule quantity not found or invalid.",
      });
    }

    const completedQuantity = orderSchedule.completedQuantity || 0;
    const totalScheduleQty = orderSchedule.scheduleQuantity;

    if (completedQuantity >= totalScheduleQty) {
      return res.status(400).json({
        message: "Order is already fully completed.",
        status: "completed",
      });
    }

    // Calculate new quantities and status
    const newCompletedQty = completedQuantity + 1;
    const newRemainingQty = totalScheduleQty - newCompletedQty;
    console.log(
      "newCompletedQtynewCompletedQty",
      newCompletedQty,
      totalScheduleQty
    );

    const updatedStatus =
      newCompletedQty >= totalScheduleQty ? "completed" : "progress";
    console.log("updatedStatusupdatedStatus", updatedStatus);

    // Update the schedule using the 3-part unique key
    await prisma.stockOrderSchedule.update({
      where: {
        order_id_part_id_order_type: {
          order_id: orderId,
          part_id: partId,
          order_type: order_type,
        },
      },
      data: {
        completedQuantity: newCompletedQty,
        completed_date: updatedStatus === "completed" ? new Date() : undefined,
        status: updatedStatus,
        remainingQty: newRemainingQty,
      },
    });

    if (type === "part") {
      if (updatedStatus === "progress") {
        await prisma.partNumber.update({
          where: { part_id: partId },
          data: { availStock: { decrement: 1 } },
        });
      }
    }

    if (type === "product") {
      if (updatedStatus === "completed") {
        console.log("completedcompletedcompleted", updatedStatus);
        console.log("productIdproductId", productId);
        console.log("999999");

        await prisma.partNumber.update({
          where: { part_id: partId },
          data: { availStock: { increment: completedQuantity } },
        });
      }
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
        remainingQty: newRemainingQty,
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
    console.error("Error completing schedule order:", error);
    res.status(500).json({
      message: "An error occurred on the server.",
      error: error.message,
    });
  }
};

const scrapScheduleOrder = async (req, res) => {
  try {
    const { id } = req.params;
    // FIX: Destructure 'order_type' from the request body
    const { orderId, partId, employeeId, order_type } = req.body;

    // FIX: Add validation for the new required field
    if (!order_type) {
      return res.status(400).json({ message: "order_type is required." });
    }

    await prisma.productionResponse.update({
      where: { id },
      data: { scrap: true, quantity: false, cycleTimeEnd: new Date() },
    });

    // FIX: Use the correct 3-part unique identifier
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

    const currentRemainingQty =
      orderSchedule.scheduleQuantity - (orderSchedule.completedQuantity || 0);
    const newRemainingQty = Math.max(0, currentRemainingQty - 1);

    // FIX: Use the correct 3-part unique identifier for the update
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
        scheduleQuantity: { decrement: 1 },
        remainingQty: newRemainingQty,
      },
    });

    await prisma.productionResponse.updateMany({
      where: {
        id,
        stationUserId: employeeId,
        partId: partId,
        orderId: orderId,
      },
      data: { scrapQuantity: { increment: 1 }, remainingQty: newRemainingQty },
    });

    // Check if the schedule is now complete after scrapping
    const updatedSchedule = await prisma.stockOrderSchedule.findUnique({
      where: { id: orderSchedule.id },
    });

    if (
      updatedSchedule &&
      updatedSchedule.completedQuantity >= updatedSchedule.scheduleQuantity
    ) {
      // FIX: Use the correct 3-part unique identifier for the final update
      await prisma.stockOrderSchedule.update({
        where: {
          order_id_part_id_order_type: {
            order_id: orderId,
            part_id: partId,
            order_type: order_type,
          },
        },
        data: { status: "completed" },
      });
    }

    return res.status(200).json({
      message: "This order has been added as scrap.",
    });
  } catch (error) {
    console.error("Error scrapping schedule order:", error);
    res.status(500).json({
      message: "An error occurred on the server.",
      error: error.message,
    });
  }
};
const updateStepTime = async (req, res) => {
  try {
    const { id } = req.params;
    const { stepId } = req.body;
    if (!id || !stepId) {
      return res.status(400).json({ message: "Missing data" });
    }
    const updated = await prisma.productionStepTracking.updateMany({
      where: {
        productionResponseId: id,
        workInstructionStepId: stepId,
      },
      data: {
        stepStartTime: new Date(),
        stepEndTime: new Date(),
        status: "completed",
      },
    });
    if (updated.count === 0) {
      return res.status(404).json({ message: "Step not found." });
    }
    return res.status(200).json({ message: "Step marked completed" });
  } catch (error) {
    console.error("Step update error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const completeTraning = async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.productionResponse.update({
      where: { id },
      data: {
        traniningStatus: true,
      },
    });

    return res.status(200).json({
      message: "Order scheduling completed.",
    });
  } catch (error) {
    console.error("Error completing schedule order:", error);
    res.status(500).json({ message: "An error occurred on the server." });
  }
};
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
    prisma.partNumber
      .update({
        where: {
          id: id,
          isDeleted: false,
        },
        data: {
          isDeleted: true,
        },
      })
      .then();

    return res.status(200).json({
      message: "Employee delete successfully !",
    });
  } catch (error) {
    return res.status(500).send({
      message: "Something went wrong. Please try again later.",
    });
  }
};

const scrapEntry = async (req, res) => {
  try {
    const {
      type,
      partId,
      returnQuantity,
      scrapStatus,
      supplierId,
      returnSupplierQty,
      createdBy,
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

    const [newEntry] = await prisma.$transaction([
      prisma.scapEntries.create({
        data: {
          type,
          partId,
          productId: req?.body?.productId,
          returnQuantity,
          scrapStatus: scrapStatus === "yes",
          createdBy,
          processId: req?.body?.processId,
          supplierId,
          returnSupplierQty,
        },
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
      message: "Scrap entry created and stock updated",
      data: newEntry,
    });
  } catch (error) {
    console.error("Error creating scrap entry:", error);
    return res.status(500).json({ error: "Internal server error" });
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

const allScrapEntires = async (req, res) => {
  try {
    const paginationData = await paginationQuery(req.query);
    const { filterScrap, search } = req.query;

    const condition = {
      isDeleted: false,
    };

    if (filterScrap && filterScrap.toLowerCase() !== "all") {
      condition.type = filterScrap;
    }

    if (search) {
      condition.OR = [
        {
          supplier: {
            firstName: {
              contains: search,
            },
          },
        },
        {
          supplier: {
            lastName: {
              contains: search,
            },
          },
        },
        {
          PartNumber: {
            partNumber: {
              contains: search,
            },
          },
        },
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
            },
          },
          supplier: {
            select: {
              firstName: true,
              lastName: true,
            },
          },
        },
      }),
      prisma.scapEntries.count({
        where: condition,
      }),
    ]);

    const getPagination = await pagination({
      page: paginationData.page,
      pageSize: paginationData.pageSize,
      total: totalCount,
    });

    return res.status(200).json({
      message: "Part number retrieved successfully!",
      data: allProcess,
      totalCount,
      pagination: getPagination,
    });
  } catch (error) {
    console.log("error", error);

    return res.status(500).send({
      message: "Something went wrong. Please try again later.",
    });
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
      returnSupplierQty,
      createdBy,
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
        message: "Insufficient stock to update scrap by the requested quantity",
      });
    }

    const [updatedEntry] = await prisma.$transaction([
      prisma.scapEntries.update({
        where: { id },
        data: {
          type,
          partId,
          productId: req?.body?.productId,
          returnQuantity: newQty,
          scrapStatus: scrapStatus === "yes",
          createdBy,
          processId: req?.body?.processId,
          supplierId,
          returnSupplierQty,
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
        enqueryImg: uploadedFiles?.[0].filename,
        employeeId,
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

    let whereCondition = {};
    if (status !== undefined) {
      whereCondition.status = status === "true";
    }
    const notifications = await prisma.stationNotification.findMany({
      where: whereCondition,
      orderBy: { createdAt: "desc" },
    });

    const totalCount = await prisma.stationNotification.count();
    const unreadCount = await prisma.stationNotification.count({
      where: { status: false },
    });
    const archivedCount = await prisma.stationNotification.count({
      where: { status: true },
    });

    return res.status(200).json({
      message: "Notifications fetched successfully",
      data: notifications,
      counts: {
        all: totalCount,
        unread: unreadCount,
        archived: archivedCount,
      },
    });
  } catch (error) {
    console.error("Error fetching notifications:", error);
    res.status(500).json({
      error: error.message,
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
};
