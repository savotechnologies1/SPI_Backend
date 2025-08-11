const prisma = require("../config/prisma");
const { paginationQuery, pagination } = require("../functions/common");

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
const stationLogin = async (req, res) => {
  try {
    const { processId, stationUserId, type } = req.body;
    let nextJob = await prisma.stockOrderSchedule.findFirst({
      where: {
        processId,
        status: "progress",
        isDeleted: false,
      },
      orderBy: {
        createdAt: "asc",
      },
      include: {
        order: { select: { orderNumber: true } },
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
    if (!nextJob) {
      nextJob = await prisma.stockOrderSchedule.findFirst({
        where: {
          processId,
          status: "new",
          isDeleted: false,
        },
        orderBy: {
          createdAt: "asc",
        },
        include: {
          order: { select: { orderNumber: true } },
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
    }
    if (!nextJob) {
      return res.status(404).json({
        message: "No available jobs found for this station at the moment.",
      });
    }
    const instruction = nextJob?.part?.WorkInstruction?.[0];
    const steps = instruction?.steps || [];

    const processLoginData = await prisma.productionResponse.create({
      data: {
        process: { connect: { id: processId } },
        StockOrder: { connect: { id: nextJob.order_id } },
        PartNumber: { connect: { part_id: nextJob.part_id } },
        employeeInfo: { connect: { id: stationUserId } },
        type,
        instructionId: instruction?.id || null,
        scrap: null,
        cycleTimeStart: new Date(),
        cycleTimeEnd: null,
      },
    });

    if (type === "training" && steps.length > 0) {
      const { employeeId, processId, partId } = processLoginData;
      const existingTraining = await prisma.productionResponse.findFirst({
        where: {
          employeeId: employeeId,
          processId: processId,
          partId: partId,
          traniningStatus: true,
        },
      });
      if (existingTraining) {
        return res.status(409).send({
          message:
            "You have already completed this process and related parts traning  . please choose different process and parts",
        });
      } else {
        const trackingEntries = steps.map((step, index) => ({
          productionResponseId: processLoginData.id,
          workInstructionStepId: step.id,
          status: "pending",
          stepStartTime: index === 0 ? new Date() : null,
          stepEndTime: null,
        }));

        await prisma.productionStepTracking.createMany({
          data: trackingEntries,
        });
      }
    }
    return res.status(200).json({
      message: `You have successfully logged into station. Assigned to order: ${nextJob.order.orderNumber}`,
      data: processLoginData,
    });
  } catch (error) {
    console.error("Error during process login:", error);
    return res.status(500).send({
      message: "Something went wrong. Please try again later.",
      error: error.message,
    });
  }
};

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

const getScheduleProcessInformation = async (req, res) => {
  try {
    const { id: processId } = req.params;

    if (!processId) {
      return res.status(400).json({ message: "processId is required." });
    }

    let nextJob = await prisma.stockOrderSchedule.findFirst({
      where: {
        processId,
        status: "progress",
        isDeleted: false,
      },
      orderBy: { createdAt: "asc" },
      include: {
        order: {
          select: {
            id: true,
            orderNumber: true,
            productQuantity: true,
            partId: true,
            shipDate: true,
            createdAt: true,
          },
        },
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

    if (!nextJob) {
      nextJob = await prisma.stockOrderSchedule.findFirst({
        where: {
          processId,
          status: "new",
          isDeleted: false,
        },
        orderBy: { createdAt: "asc" },
        include: {
          order: {
            select: {
              id: true,
              orderNumber: true,
              productQuantity: true,
              shipDate: true,
              createdAt: true,
            },
          },
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
    }

    if (!nextJob) {
      return res
        .status(404)
        .json({ message: "No jobs found for this station." });
    }
    console.log("nextJobnextJob", nextJob);

    const upcomingOrder = await prisma.stockOrderSchedule.findFirst({
      where: {
        order: {
          createdAt: {
            gte: nextJob.order.createdAt,
          },
        },
        id: { not: nextJob.id },
      },
      include: {
        order: { select: { shipDate: true } },
      },
      orderBy: { createdAt: "asc" },
    });

    const getProductionResponse = await prisma.productionResponse.findFirst({
      where: {
        processId,
        isDeleted: false,
      },
      orderBy: { cycleTimeStart: "desc" },
      include: {
        employeeInfo: {
          select: { firstName: true, lastName: true, id: true },
        },
      },
    });

    const remainingQty = nextJob.quantity - nextJob.completedQuantity;
    console.log("remainingQty", getProductionResponse.scrapQuantity);

    const responseData = {
      ...nextJob,
      productionId: getProductionResponse?.id || null,
      upcommingOrder: upcomingOrder?.order?.shipDate || null,
      employeeInfo: getProductionResponse?.employeeInfo || null,
      cycleTime: getProductionResponse?.cycleTimeStart || null,
      completedQty: getProductionResponse?.completedQuantity || 0,
      remainingQty: remainingQty || nextJob.quantity,
      scrapQty: getProductionResponse.scrapQuantity || 0,
    };

    res.status(200).json({
      message: "Next job found successfully.",
      data: responseData,
    });
  } catch (error) {
    console.error("Error finding next job:", error);
    res.status(500).json({ message: "Something went wrong." });
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
    const { id } = req.params;

    const nextJob = await prisma.stockOrderSchedule.findFirst({
      where: {
        process_id: id,
        status: "schedule",
        isDeleted: false,
      },
      orderBy: {
        schedule_date: "asc",
      },
      select: {
        id: true,
        order_id: true,
        part_id: true,
        process_id: true,
        schedule_date: true,
      },
    });

    if (!nextJob) {
      return res.status(404).json({
        message: "No available jobs found for this station.",
      });
    }

    const [orderDetails, partDetails, workInstructions] = await Promise.all([
      prisma.stockOrder.findUnique({
        where: { id: nextJob.order_id },
        select: {
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
        },
      }),

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
          processId: nextJob.process_id,
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
    if (!stockOrders || stockOrders.length === 0) {
      return res.status(404).json({ message: "No stock orders found" });
    }
    const employeeData = await prisma.employee.findMany({
      where: {
        isDeleted: false,
      },
      select: {
        id: true,
        employeeId: true,
        email: true,
        fullName: true,
      },
    });

    if (!employeeData || employeeData.length === 0) {
      return res.status(404).json({ message: "No employees found" });
    }
    let employeeFormattedData = [];
    if (stationUserId.role !== "Shop_Floor") {
      employeeFormattedData = employeeData.map((employee) => ({
        id: employee.id || null,
        name: employee.fullName || null,
        employeeId: employee.employeeId || null,
        email: employee.email || null,
      }));
    }

    const formatted = stockOrders.map((order) => ({
      id: order.part?.process?.id || null,
      name: order.part?.process?.processName || null,
      partFamily: order.part?.part_id || null,
      stockOrderId: order.id,
      orderNumber: order.orderNumber,
    }));

    return res.status(200).json({
      stockAndProcess: formatted,
      stationUser: employeeFormattedData,
    });
  } catch (error) {
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

const completeScheduleOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const { orderId, partId, employeeId, productId } = req.body;

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
    console.log("updatedStatusupdatedStatus", updatedStatus);

    if (updatedStatus === "progress") {
      await prisma.partNumber.update({
        where: {
          part_id: partId,
        },
        data: {
          availStock: {
            decrement: 1,
          },
        },
      });
    }
    if (updatedStatus === "completed") {
      await prisma.partNumber.update({
        where: {
          part_id: productId,
        },
        data: {
          availStock: {
            increment: 1,
          },
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
        completedQuantity: {
          increment: 1,
        },
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
    res.status(500).json({ message: "An error occurred on the server." });
  }
};

const scrapScheduleOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const { orderId, partId, employeeId } = req.body;

    await prisma.productionResponse.update({
      where: { id },
      data: { scrap: true, quantity: false, cycleTimeEnd: new Date() },
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

    await prisma.stockOrderSchedule.update({
      where: {
        order_id_part_id: {
          order_id: orderId,
          part_id: partId,
        },
      },
      data: {
        status: "progress",
        scrapQuantity: {
          increment: 1,
        },
        quantity: {
          decrement: 1,
        },
      },
    });

    await prisma.productionResponse.updateMany({
      where: {
        id,
        stationUserId: employeeId,
        partId: partId,
        orderId: orderId,
      },
      data: {
        scrapQuantity: {
          increment: 1,
        },
      },
    });
    return res.status(200).json({
      message: "This order has been added as scrap.",
    });
  } catch (error) {
    console.error("Error completing schedule order:", error);
    res.status(500).json({ message: "An error occurred on the server." });
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

    // Assume barcode == part.barcode
    const part = await prisma.part.findUnique({ where: { barcode } });

    if (!part) {
      return res.status(404).json({ message: "❌ Invalid barcode" });
    }

    // Find active order
    const order = await prisma.stockOrderSchedule.findFirst({
      where: {
        part_id: part.id,
        status: { not: "completed" },
      },
    });

    if (!order) {
      return res.status(404).json({ message: "❌ No active order found" });
    }

    // Mark order complete (or in progress)
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

// Naya controller function

const processBarcodeScan = async (req, res) => {
  try {
    // Frontend se humein productionId aur scanned barcode milega.
    const { id } = req.params; // Yeh productionResponse ka ID hai
    const { barcode, employeeId } = req.body; // 'barcode' woh unique number hai

    // --- Step 1: Barcode ko database mein dhoondein ---
    const partInstance = await prisma.stockOrderSchedule.findUnique({
      where: { barcode: barcode },
    });

    // Agar barcode database mein nahi mila, toh yeh invalid scan hai.
    if (!partInstance) {
      return res
        .status(404)
        .json({ message: "Invalid Barcode. Part not found." });
    }

    // --- Step 2: Check karein ki part pehle se complete ya scrap toh nahi hai ---
    if (
      partInstance.status === "COMPLETED" ||
      partInstance.status === "SCRAPPED"
    ) {
      return res.status(409).json({
        message: `This part (${barcode}) has already been processed.`,
      });
    }

    // --- Step 3: Ab humein orderId aur partId mil gaya hai ---
    const { orderId, partId } = partInstance;

    // --- Step 4: Yahan par aapka 'completeScheduleOrder' wala logic aayega ---
    // Humne logic ko yahan copy-paste kar liya hai

    // ProductionResponse ko update karein
    await prisma.productionResponse.update({
      where: { id },
      data: {
        quantity: true,
        scrap: false,
        cycleTimeEnd: new Date(),
      },
    });

    // StockOrderSchedule ko dhoondein aur update karein
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

    // Employee ki quantity update karein
    await prisma.productionResponse.updateMany({
      where: { id, stationUserId: employeeId, partId, orderId },
      data: { completedQuantity: { increment: 1 } },
    });

    // --- Step 5: PartInstance ka status update karein taaki dobara scan na ho ---
    await prisma.partInstance.update({
      where: { id: partInstance.id },
      data: { status: "COMPLETED" },
    });

    // --- Step 6: Frontend ko success message bhejein ---
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

    if (!type) {
      return res.status(400).json({ error: "Type is required" });
    }

    const newEntry = await prisma.scapEntries.create({
      data: {
        type,
        partId: partId,
        productId: req?.body?.productId,
        returnQuantity: returnQuantity,
        scrapStatus: scrapStatus === "yes" ? true : false,
        createdBy,
        processId: req?.body?.processId,
        supplierId,
        returnSupplierQty,
      },
    });

    return res
      .status(201)
      .json({ message: "Scrap entry created", data: newEntry });
  } catch (error) {
    console.error("Error creating scap entry:", error);
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
};
