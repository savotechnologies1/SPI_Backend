const prisma = require("../config/prisma");

const processLogin = async (req, res) => {
  try {
    const user = req.user;
    const { processId, userId, orderId, type } = req.body;
    const data = await prisma.processLogin.create({
      data: {
        processId: processId,
        userId: user.role === "Shop_Floor" ? user.id : userId,
        orderId: orderId,
        type: type,
      },
    });
    return res.status(200).json({
      message: "You have successfully login this station",
      data: userId,
    });
  } catch (error) {
    return res.status(500).send({
      message: "Something went wrong . please try again later .",
    });
  }
};

const selectScheduleProcess = async (req, res) => {
  try {
    const user = req.user;
    const stockOrders = await prisma.stockOrder.findMany({
      where: {
        isDeleted: false,
      },
      include: {
        PartNumber: {
          select: {
            part_id: true,
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
        shopFloorLogin: true,
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

    if (user.role !== "Shop_Floor") {
      employeeFormattedData = employeeData.map((employee) => ({
        id: employee.id || null,
        name: employee.fullName || null,
        employeeId: employee.employeeId || null,
        email: employee.email || null,
      }));
    }

    const formatted = stockOrders.map((order) => ({
      id: order.PartNumber?.process?.id || null,
      name: order.PartNumber?.process?.processName || null,
      partFamily: order.PartNumber?.part_id || null,
      stockOrderId: order.id,
      orderNumber: order.orderNumber,
      productQuantity: order.productQuantity,
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

const getScheduleProcessInformation = async (req, res) => {
  try {
    const orderId = req.params.id;
    const user = req.user;
    const { userId } = req.body;
    const data = await prisma.stockOrder.findUnique({
      where: {
        id: orderId,
      },
      select: {
        shipDate: true,
        productQuantity: true,
        PartNumber: {
          select: {
            part_id: true,
            partDescription: true,
            cycleTime: true,
            partNumber: true,
            processId: true,
          },
        },
      },
    });
    const employeeId = user?.id || userId;
    const employeeInfo = await prisma.employee.findUnique({
      where: {
        id: employeeId,
      },
      select: {
        firstName: true,
        lastName: true,
        email: true,
      },
    });
    if (!data) {
      return res.status(404).json({ message: "Stock order not found" });
    }

    if (!data.PartNumber || !data.PartNumber.part_id) {
      return res.status(404).json({ message: "Part information not found" });
    }

    const workInstructionData = await prisma.workInstruction.findMany({
      where: {
        productId: data.PartNumber.part_id,
      },
      select: {
        instructionTitle: true,
        steps: {
          select: {
            title: true,
            stepNumber: true,
            instruction: true,
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
    });

    return res.status(200).json({
      message: "Process information retrieved successfully!",
      data: {
        orderInformation: data,
        workInstructionData,
        employeeInfo,
      },
    });
  } catch (error) {
    return res.status(500).json({
      message: "Something went wrong. Please try again later.",
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

module.exports = {
  processLogin,
  selectScheduleProcess,
  getScheduleProcessInformation,
  createProductionResponse,
};
