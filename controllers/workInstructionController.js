const prisma = require("../config/prisma");
const { v4: uuidv4 } = require("uuid");
const {
  fileUploadFunc,
  pagination,
  paginationQuery,
} = require("../functions/common");

const workInstructionProcess = async (req, res) => {
  try {
    // const usedProcesses = await prisma.workInstruction.findMany({
    //   select: {
    //     processId: true,
    //   },
    //   where: {
    //     isDeleted: false,
    //   },
    // });

    // const usedProcessIds = usedProcesses.map((item) => item.processId);

    const process = await prisma.process.findMany({
      select: {
        id: true,
        processName: true,
      },
      where: {
        isDeleted: false,
        // id: {
        //   notIn: usedProcessIds,
        // },
      },
    });
    console.log("processprocess", process);

    const formattedProcess = process.map((process) => ({
      id: process.id,
      name: process.processName,
    }));

    res.status(200).json(formattedProcess);
  } catch (error) {
    console.error("Error:", error);
    res
      .status(500)
      .json({ message: "Something went wrong. Please try again later." });
  }
};
const productRelatedParts = async (req, res) => {
  try {
    const { productId } = req.query;

    const data = await prisma.productTree.findMany({
      where: {
        product_id: productId,
        isDeleted: false,
      },
      include: {
        part: {
          select: {
            part_id: true,
            partNumber: true,
            partDescription: true,
            type: true,
            cost: true,
          },
        },
      },
    });

    return res.status(200).json({
      message: "All related parts retrieved successfully!",
      data: data,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).send({
      message: "Something went wrong. Please try again later.",
    });
  }
};

const createWorkInstruction = async (req, res) => {
  try {
    const { processId, productId } = req.body;
    const getId = uuidv4().slice(0, 6);

    await prisma.workInstruction.create({
      data: {
        id: getId,
        processId: processId,
        productId: productId,
      },
    });
    return res.status(201).send({
      message: "Work Insturtion create successfully !",
      data: {
        processId: processId,
      },
    });
  } catch (error) {
    console.log("errorerror", error);

    return res.status(500).send({
      message: "Something went wrong . please try again later .",
    });
  }
};

const createWorkInstructionDetail = async (req, res) => {
  try {
    const fileData = await fileUploadFunc(req, res);
    const getWorkImages = fileData?.data?.workInstructionImg || [];
    const getWorkVideo =
      (fileData?.data?.workInstructionVideo || [])[0] || null;

    const {
      workInstructionId,
      processId,
      part_id,
      stepNumber,
      title,
      instruction,
    } = req.body;

    const stepNumbers = Array.isArray(stepNumber) ? stepNumber : [stepNumber];
    const titles = Array.isArray(title) ? title : [title];
    const instructions = Array.isArray(instruction)
      ? instruction
      : [instruction];

    const partExists = await prisma.partNumber.findUnique({
      where: { part_id: part_id },
    });
    const processExists = await prisma.process.findUnique({
      where: { id: processId },
    });

    if (!partExists)
      return res.status(400).json({ message: "Invalid part_id" });
    if (!processExists)
      return res.status(400).json({ message: "Invalid processId" });

    const createdInstructions = await Promise.all(
      stepNumbers.map((stepNo, i) =>
        prisma.workInstruction.create({
          data: {
            workInstructionId: workInstructionId,
            processId,
            part_id,
            stepNumber: Number(stepNo),
            title: titles[i],
            instruction: instructions[i],
          },
        })
      )
    );
    if (getWorkImages.length > 0) {
      const imageData = getWorkImages.map((img) => ({
        stepId: createdInstructions[0].id,
        imagePath: img.filename,
      }));
      console.log("imageDataimageData", imageData);

      await prisma.instructionImage.createMany({ data: imageData });
    }

    if (getWorkVideo) {
      await prisma.instructionVideo.create({
        data: {
          stepId: createdInstructions[0].id,
          videoPath: getWorkVideo.filename,
        },
      });
    }

    res.status(201).json({
      message: "✅ Work instructions created successfully",
      data: createdInstructions,
    });
  } catch (error) {
    console.error("❌ Error creating work instruction:", error);
    res.status(500).json({ message: "Internal Server Error", error });
  }
};

const allWorkInstructions = async (req, res) => {
  try {
    const paginationData = await paginationQuery(req.query);
    const data = await prisma.workInstruction.findMany({
      where: {
        isDeleted: false,
      },
      include: {
        PartNumber: {
          select: {
            partNumber: true,
          },
        },
        process: {
          select: {
            processName: true,
          },
        },
        InstructionImage: {
          select: {
            id: true,
            stepId: true,
            imagePath: true,
          },
        },
        InstructionVideo: {
          select: {
            id: true,
            stepId: true,
            videoPath: true,
          },
        },
      },
      skip: paginationData.skip,
      take: paginationData.pageSize,
    });

    const [allWorkInstructions, totalCount] = await Promise.all([
      prisma.workInstruction.findMany({
        where: {
          isDeleted: false,
        },
        include: {
          PartNumber: {
            select: {
              partNumber: true,
            },
          },
          process: {
            select: {
              processName: true,
            },
          },
          InstructionImage: {
            select: {
              id: true,
              stepId: true,
              imagePath: true,
            },
          },
          InstructionVideo: {
            select: {
              id: true,
              stepId: true,
              videoPath: true,
            },
          },
        },

        skip: paginationData.skip,
        take: paginationData.pageSize,
      }),
      prisma.workInstruction.count({
        where: {
          isDeleted: false,
        },
      }),
    ]);

    const getPagination = await pagination({
      page: paginationData.page,
      pageSize: paginationData.pageSize,
      total: totalCount,
    });

    return res.status(200).json({
      message: "All work instructions retrieved successfully!",
      data: allWorkInstructions,
      totalCount,
      pagination: getPagination,
    });
  } catch (error) {
    console.error("Error fetching work instructions:", error);
    return res.status(500).send({
      message: "Something went wrong. Please try again later.",
    });
  }
};

const selectInstructionPartNumber = async (req, res) => {
  try {
    const process = await prisma.partNumber.findMany({
      select: {
        part_id: true,
        partNumber: true,
      },
      where: {
        isDeleted: false,
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
    console.log(error);

    res.status(500).json({ message: "Server error" });
  }
};

module.exports = {
  workInstructionProcess,
  createWorkInstruction,
  createWorkInstructionDetail,
  productRelatedParts,
  allWorkInstructions,
  selectInstructionPartNumber,
};
