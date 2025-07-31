const prisma = require("../config/prisma");

// const processLogin = async (req, res) => {
//   try {
//     const user = req.user;
//     const { processId, stationUserId, type } = req.body;
//     const data = await prisma.processLogin.create({
//       data: {
//         processId: processId,
//         stationUserId: user.role === "Shop_Floor" ? user.id : stationUserId,
//         orderId: orderId,
//         type: type,
//       },
//     });
//     return res.status(200).json({
//       message: "You have successfully login this station",
//       data: stationUserId,
//     });
//   } catch (error) {
//     return res.status(500).send({
//       message: "Something went wrong . please try again later .",
//     });
//   }
// };

// const stationLogin = async (req, res) => {
//   try {
//     const { processId, stationUserId, type } = req.body;
//     const nextJob = await prisma.stockOrderSchedule.findFirst({
//       where: {
//         processId: processId,
//         status: "new",
//         isDeleted: false,
//       },
//       orderBy: {
//         createdAt: "asc",
//       },
//       include: {
//         order: {
//           select: { orderNumber: true },
//         },
//         part: {
//           include: {
//             WorkInstruction: {
//               select: {
//                 id: true,
//               },
//             },
//           },
//         },
//       },
//     });

//     if (!nextJob) {
//       return res.status(404).json({
//         message: "No available jobs found for this station at the moment.",
//       });
//     }
//     const orderIdToProcess = nextJob.order_id;
//     const instructionId = nextJob?.part?.WorkInstruction[0]?.id;
//     // if (nextJob.processId) {
//     //   const data = await prisma.processOrderTable.create({
//     //     data: {
//     //       processId: nextJob.processId,
//     //       orderId: nextJob.order_id,
//     //       partId: nextJob.part_id,
//     //       stationUserId: stationUserId,
//     //     },
//     //   });
//     //   console.log("datadata", data);
//     // }
//     const [processLoginData] = await prisma.$transaction([
//       prisma.productionResponse.create({
//         data: {
//           process: { connect: { id: processId } },
//           StockOrder: { connect: { id: orderIdToProcess } },
//           PartNumber: { connect: { part_id: nextJob.part_id } },
//           stationUserId: stationUserId,
//           type: type,
//           stepId: instructionId ? instructionId : null,
//           scrap: null,
//           cycleTimeStart,
//         },
//       }),
//     ]);
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
// }

const stationLogin = async (req, res) => {
  try {
    const { processId, stationUserId, type } = req.body;
    // const existingActiveLogin = await prisma.productionResponse.findFirst({
    //   where: {
    //     stationUserId: stationUserId,
    //     processId: processId,
    //     cycleTimeEnd: null,
    //   },
    // });
    // if (existingActiveLogin) {
    //   return res.status(400).json({
    //     message: "You are already logged into a station. Please logout first.",
    //     data: existingActiveLogin,
    //   });
    // }

    const nextJob = await prisma.stockOrderSchedule.findFirst({
      where: {
        processId: processId,
        status: "new",
        isDeleted: false,
      },
      orderBy: {
        createdAt: "asc",
      },
      include: {
        order: {
          select: { orderNumber: true },
        },
        part: {
          include: {
            WorkInstruction: {
              select: { id: true },
            },
          },
        },
      },
    });

    if (!nextJob) {
      return res.status(404).json({
        message: "No available jobs found for this station at the moment.",
      });
    }

    const orderIdToProcess = nextJob.order_id;
    const instructionId = nextJob?.part?.WorkInstruction[0]?.id;
    const processLoginData = await prisma.productionResponse.create({
      data: {
        process: { connect: { id: processId } },
        StockOrder: { connect: { id: orderIdToProcess } },
        PartNumber: { connect: { part_id: nextJob.part_id } },
        employeeInfo: {
          connect: {
            id: stationUserId,
          },
        },
        type: type,
        stepId: instructionId ? instructionId : null,
        scrap: null,
        cycleTimeStart: new Date(),
        cycleTimeEnd: null,
      },
    });

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
    const { productionResponseId } = req.body;

    if (!productionResponseId) {
      return res.status(400).json({
        message: "Production Response ID is required to logout.",
      });
    }

    const updatedResponse = await prisma.productionResponse.update({
      where: {
        id: productionResponseId,
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

const getScheduleProcessInformation = async (req, res) => {
  try {
    const { id } = req.params;
    console.log("req.params for schedule process:", req.params);

    if (!id) {
      return res.status(400).json({ message: "processId is required." });
    }

    const nextJob = await prisma.stockOrderSchedule.findFirst({
      where: {
        processId: id,
        status: "new",
        isDeleted: false,
      },
      orderBy: {
        createdAt: "asc",
      },
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
                  orderBy: {
                    stepNumber: "asc",
                  },
                  include: {
                    images: {
                      select: {
                        id: true,
                        imagePath: true,
                      },
                    },
                    videos: {
                      select: {
                        id: true,
                        videoPath: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
        process: {
          select: {
            processName: true,
          },
        },
      },
    });

    if (!nextJob) {
      return res
        .status(404)
        .json({ message: "No new jobs found for this station." });
    }

    const upcomingOrder = await prisma.stockOrderSchedule.findFirst({
      where: {
        order: {
          createdAt: {
            gte: nextJob.order.createdAt,
          },
        },
        id: {
          not: nextJob.id,
        },
      },
      include: {
        order: {
          select: {
            shipDate: true,
          },
        },
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    const getProductionResponse = await prisma.productionResponse.findFirst({
      where: {
        processId: id,
        isDeleted: false,
      },
      include: {
        employeeInfo: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
    });
    console.log(
      "getProductionResponsegetProductionResponse",
      getProductionResponse
    );

    const responseData = {
      ...nextJob,
      productionId: getProductionResponse.id,
      upcommingOrder: upcomingOrder?.order?.shipDate || null,
      employeeInfo: getProductionResponse?.employeeInfo || null,
      cycleTime: getProductionResponse?.cycleTimeStart,
    };

    res.status(200).json({
      message: "Next job found successfully.",
      data: responseData,
    });
  } catch (error) {
    console.error("Error finding next job:", error);
    res
      .status(500)
      .json({ message: "Something went wrong. Please try again later." });
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

    // 3. Combine all the fetched data into a single response object
    const jobDetails = {
      scheduleId: nextJob.id,
      order: orderDetails,
      part: partDetails,
      workInstructions:
        workInstructions.length > 0 ? workInstructions[0] : null, // Assuming one set of instructions per part/process
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
    console.log("stationUserId:", stationUserId);
    const stockOrders = await prisma.stockOrderSchedule.findMany({
      where: {
        isDeleted: false,
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
    console.error("selectScheduleProcess error:", error);
    return res.status(500).json({
      message: "Something went wrong. Please try again later.",
    });
  }
};

const completeScheduleOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const { orderId } = req.body;
    const data = await prisma.productionResponse.update({
      where: {
        id: id,
      },
      data: {
        quantity: true,
      },
    });
    const checkTotolQty = await prisma.stockOrderSchedule.findFirst({
      where: {
        id: orderId,
      },
      select: {
        quantity: true,
        completedQuantity: true,
      },
    });

    if (checkTotolQty?.completedQuantity > checkTotolQty?.quantity) {
      return res.status(200).send({
        message: "order scheduling completed ",
      });
    }

    prisma.stockOrderSchedule
      .update({
        where: {
          id: orderId,
        },
        data: {
          completedQuantity: {
            increment: 1,
          },
        },
      })
      .then();
    return res.status(201).json({
      message: "This order has been added as completed  .",
    });
  } catch (error) {
    console.log("errorerror", error);

    res.status(500).json({ message: "An error occurred on the server." });
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
};
