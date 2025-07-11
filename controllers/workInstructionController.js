const prisma = require("../config/prisma");
const { v4: uuidv4 } = require("uuid");
const {
  fileUploadFunc,
  pagination,
  paginationQuery,
} = require("../functions/common");

const workInstructionProcess = async (req, res) => {
  try {
    const process = await prisma.process.findMany({
      select: {
        id: true,
        processName: true,
      },
      where: {
        isDeleted: false,
      },
    });
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
    return res.status(500).send({
      message: "Something went wrong . please try again later .",
    });
  }
};
const createWorkInstructionDetail = async (req, res) => {
  try {
    const fileData = await fileUploadFunc(req, res);
    const uploadedFiles = fileData?.data || [];

    const { processId, productId, instructionTitle, instructionSteps } =
      req.body;

    const steps = JSON.parse(instructionSteps);

    const workInstruction = await prisma.workInstruction.create({
      data: {
        processId,
        productId,
        instructionTitle,
      },
    });

    const workInstructionId = workInstruction.id;
    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      const stepId = uuidv4();

      await prisma.workInstructionSteps.create({
        data: {
          id: stepId,
          workInstructionId,
          part_id: step.partId,
          stepNumber: step.stepNumber,
          title: step.title,
          instruction: step.workInstruction,
          processId,
        },
      });

      const imageFiles = uploadedFiles.filter(
        (file) =>
          file.fieldname === `instructionSteps[${i}][workInstructionImgs]`
      );

      for (const img of imageFiles) {
        await prisma.instructionImage.create({
          data: {
            stepId,
            imagePath: img.filename,
          },
        });
      }

      const videoFile = uploadedFiles.find(
        (file) =>
          file.fieldname === `instructionSteps[${i}][workInstructionVideo]`
      );

      if (videoFile) {
        await prisma.instructionVideo.create({
          data: {
            stepId,
            workInstructionId,
            videoPath: videoFile.filename,
          },
        });
      }
    }

    return res
      .status(200)
      .json({ message: "✅ Work instruction created successfully!" });
  } catch (error) {
    return res
      .status(500)
      .json({ error: "Something went wrong", details: error.message });
  }
};

const allWorkInstructions = async (req, res) => {
  try {
    const paginationData = await paginationQuery(req.query);

    const [allWorkInstructions, totalCount] = await Promise.all([
      prisma.workInstruction.findMany({
        where: {
          isDeleted: false,
        },
        include: {
          PartNumber: {
            select: { partNumber: true },
          },
          process: {
            select: { processName: true },
          },
          steps: {
            where: {
              isDeleted: false,
            },
            select: {
              id: true,
              title: true,
              stepNumber: true,
              instruction: true,
              part: {
                select: { partNumber: true },
              },
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
            orderBy: {
              stepNumber: "asc",
            },
          },
        },
        orderBy: {
          createdAt: "desc",
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
    return res.status(500).json({
      message: "Something went wrong. Please try again later.",
      error: error.message,
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

const selectWorkInstruction = async (req, res) => {
  try {
    const process = await prisma.workInstruction.findMany({
      select: {
        id: true,
        instructionTitle: true,
      },
      where: {
        isDeleted: false,
      },
    });
    console.log("processprocess", process);

    const formattedProcess = process.map((process) => ({
      id: process.id,
      title: process.instructionTitle,
    }));
    res.status(200).json({
      data: formattedProcess,
    });
    res.status(500).json({ message: "Server error" });
  } catch (error) {}
};

const updateWorkInstructionDetail = async (req, res) => {
  try {
    const fileData = await fileUploadFunc(req, res);
    const uploadedFiles = fileData?.data || [];

    const {
      workInstructionId,
      processId,
      productId,
      instructionTitle,
      instructionSteps,
    } = req.body;

    const steps = JSON.parse(instructionSteps);
    await prisma.workInstruction.update({
      where: { id: workInstructionId },
      data: {
        processId,
        productId,
        instructionTitle,
      },
    });

    const oldSteps = await prisma.workInstructionSteps.findMany({
      where: { workInstructionId },
      select: { id: true },
    });

    const oldStepIds = oldSteps.map((s) => s.id);

    await prisma.instructionImage.deleteMany({
      where: { stepId: { in: oldStepIds } },
    });

    await prisma.instructionVideo.deleteMany({
      where: { stepId: { in: oldStepIds } },
    });

    await prisma.workInstructionSteps.deleteMany({
      where: { workInstructionId },
    });

    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      const stepId = uuidv4();

      await prisma.workInstructionSteps.create({
        data: {
          id: stepId,
          workInstructionId,
          part_id: step.partId,
          stepNumber: Number(step.stepNumber),
          title: step.title,
          instruction: step.workInstruction,
          processId,
        },
      });

      const imageFiles = uploadedFiles.filter(
        (file) =>
          file.fieldname === `instructionSteps[${i}][workInstructionImgs]`
      );

      for (const img of imageFiles) {
        await prisma.instructionImage.create({
          data: {
            stepId,
            imagePath: img.filename,
          },
        });
      }

      const videoFile = uploadedFiles.find(
        (file) =>
          file.fieldname === `instructionSteps[${i}][workInstructionVideo]`
      );

      if (videoFile) {
        await prisma.instructionVideo.create({
          data: {
            stepId,
            workInstructionId,
            videoPath: videoFile.filename,
          },
        });
      }
    }

    return res
      .status(200)
      .json({ message: "✅ Work instruction updated successfully!" });
  } catch (error) {
    console.error("Update Error:", error);
    return res
      .status(500)
      .json({ error: "Something went wrong", details: error.message });
  }
};

const getWorkInstructionDetail = async (req, res) => {
  const { id } = req.params;

  try {
    const workInstruction = await prisma.workInstruction.findUnique({
      where: { id },
      include: {
        steps: {
          where: { isDeleted: false },
          orderBy: { stepNumber: "asc" },
          include: {
            images: true,
            videos: true,
          },
        },
      },
    });

    if (!workInstruction) {
      return res.status(404).json({ message: "Work instruction not found" });
    }

    const formattedSteps = workInstruction.steps.map((step) => ({
      id: step.id,
      part_id: step.part_id,
      processId: step.processId,
      productTreeId: step.productTreeId,
      stepNumber: step.stepNumber,
      title: step.title,
      instruction: step.instruction,
      workInstructionImg: step.images?.map((img) => img.imagePath) || [],
      workInstructionVideo: step.videos?.map((vid) => vid.videoPath) || [],
    }));

    return res.status(200).json({
      workInstructionId: workInstruction.id,
      instructionTitle: workInstruction.instructionTitle,
      processId: workInstruction.processId,
      productId: workInstruction.productId,
      steps: formattedSteps,
    });
  } catch (error) {
    console.error("Error fetching work instruction detail:", error);
    return res
      .status(500)
      .json({ message: "Internal Server Error", error: error.message });
  }
};

const deleteWorkInstruction = async (req, res) => {
  try {
    const { id } = req.params;
    const data = await prisma.workInstruction.update({
      where: {
        id: id,
      },
      data: {
        isDeleted: true,
      },
    });
    return res.status(200).json({
      message: "Work instruction deleted successfully !",
    });
  } catch (error) {
    console.log("errorerror", error);

    return res.status(500).send({
      message: "Something went wrong . please try again later .",
    });
  }
};

const selectInstruction = async (req, res) => {
  try {
    const process = await prisma.workInstruction.findMany({
      where: {
        isDeleted: false,
      },
    });

    const formattedInstruction = process.map((process) => ({
      id: process.workInstructionId,
      title: process.title,
    }));
    res.status(200).json({
      data: formattedInstruction,
    });
  } catch (error) {
    console.log(error);

    res.status(500).json({ message: "Server error" });
  }
};

const applyWorkInstruction = async (req, res) => {
  try {
    const { workInstructionId, processId, productId, instructionTitle } =
      req.body;
    const newTitle = await prisma.workInstruction.findFirst({
      where: {
        id: workInstructionId,
        isDeleted: false,
      },
      select: {
        instructionTitle: true,
      },
    });

    const existingSteps = await prisma.workInstructionSteps.findMany({
      where: {
        workInstructionId,
        isDeleted: false,
      },
      include: {
        images: true,
        videos: true,
      },
    });

    if (!existingSteps || existingSteps.length === 0) {
      return res.status(404).json({
        message: "No steps found for the given Work Instruction ID.",
      });
    }

    const newWorkInstruction = await prisma.workInstruction.create({
      data: {
        processId,
        productId,
        instructionTitle: newTitle.instructionTitle,
      },
    });

    const newWorkInstructionId = newWorkInstruction.id;

    for (const step of existingSteps) {
      const stepId = uuidv4();

      await prisma.workInstructionSteps.create({
        data: {
          id: stepId,
          workInstructionId: newWorkInstructionId,
          part_id: step.part_id,
          stepNumber: step.stepNumber,
          title: step.title,
          instruction: step.instruction,
          processId,
        },
      });
      for (const img of step.images || []) {
        await prisma.instructionImage.create({
          data: {
            stepId,
            imagePath: img.imagePath,
          },
        });
      }

      for (const vid of step.videos || []) {
        await prisma.instructionVideo.create({
          data: {
            stepId,
            workInstructionId: newWorkInstructionId,
            videoPath: vid.videoPath,
          },
        });
      }
    }

    return res.status(201).json({
      message: "✅ Work Instruction copied successfully!",
      newWorkInstructionId,
    });
  } catch (error) {
    return res.status(500).json({
      error: "Something went wrong",
      details: error.message,
    });
  }
};

const deleteWorkInstructionImg = async (req, res) => {
  try {
    const { stepId } = req.params;
    await prisma.instructionImage.delete({
      where: {
        step: stepId,
        isDeleted: false,
      },
    });

    return res.status(200).json({
      message: "Image deleted succesfully !",
    });
  } catch (error) {
    return res.status(500).send({
      message: "Something went wrong . please try again later .",
    });
  }
};
module.exports = {
  workInstructionProcess,
  createWorkInstruction,
  createWorkInstructionDetail,
  productRelatedParts,
  allWorkInstructions,
  selectInstructionPartNumber,
  updateWorkInstructionDetail,
  getWorkInstructionDetail,
  deleteWorkInstruction,
  applyWorkInstruction,
  selectInstruction,
  applyWorkInstruction,
  deleteWorkInstructionImg,
  selectWorkInstruction,
};
