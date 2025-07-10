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
    console.log("errorerror", error);

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

// const updateWorkInstructionDetail = async (req, res) => {
//   try {
//     const fileData = await fileUploadFunc(req, res);

//     const getWorkImages = fileData?.data?.workInstructionImg || [];
//     const getWorkVideo = fileData?.data?.workInstructionVideo || [];

//     const {
//       workInstructionId,
//       processId,
//       part_id,
//       stepNumber,
//       title,
//       instruction,
//     } = req.body;

//     const stepNumbers = Array.isArray(stepNumber) ? stepNumber : [stepNumber];
//     const titles = Array.isArray(title) ? title : [title];
//     const instructions = Array.isArray(instruction)
//       ? instruction
//       : [instruction];

//     if (
//       !Array.isArray(stepNumbers) ||
//       !Array.isArray(titles) ||
//       !Array.isArray(instructions)
//     ) {
//       return res.status(400).json({ message: "Step data is malformed" });
//     }

//     // Validate part and process
//     const partExists = await prisma.partNumber.findUnique({
//       where: { part_id },
//     });
//     const processExists = await prisma.process.findUnique({
//       where: { id: processId },
//     });

//     if (!partExists)
//       return res.status(400).json({ message: "Invalid part_id" });
//     if (!processExists)
//       return res.status(400).json({ message: "Invalid processId" });

//     // Soft delete previous instructions
//     await prisma.workInstruction.updateMany({
//       where: { workInstructionId },
//       data: { isDeleted: true },
//     });

//     const updatedInstructions = [];

//     for (let i = 0; i < stepNumbers.length; i++) {
//       const step = await prisma.workInstruction.updateM({
//         data: {
//           workInstructionId,
//           processId,
//           part_id,
//           stepNumber: Number(stepNumbers[i]),
//           title: titles[i],
//           instruction: instructions[i],
//         },
//       });

//       const stepId = step.id;

//       // Delete old media (for this step only)
//       await prisma.instructionImage.deleteMany({ where: { stepId } });
//       await prisma.instructionVideo.deleteMany({ where: { stepId } });

//       // Handle images for this step
//       const stepImages = getWorkImages.filter(
//         (img) => img.fieldname === `steps[${i}][workInstructionImg]`
//       );

//       if (stepImages.length > 0) {
//         const imageData = stepImages.map((img) => ({
//           stepId,
//           imagePath: img.filename,
//         }));
//         await prisma.instructionImage.createMany({ data: imageData });
//       }

//       // Handle video for this step
//       const stepVideo = getWorkVideo.find(
//         (vid) => vid.fieldname === `steps[${i}][workInstructionVideo]`
//       );

//       if (stepVideo) {
//         await prisma.instructionVideo.create({
//           data: {
//             stepId,
//             videoPath: stepVideo.filename,
//           },
//         });
//       }

//       updatedInstructions.push(step);
//     }

//     return res.status(200).json({
//       message: "✅ Work instructions updated successfully",
//       data: updatedInstructions,
//     });
//   } catch (error) {
//     console.error("❌ Error updating work instruction:", error);
//     res.status(500).json({ message: "Internal Server Error", error });
//   }
// };

// const updateWorkInstructionDetail = async (req, res) => {
//   try {
//     const fileData = await fileUploadFunc(req, res);
//     const getWorkImages = fileData?.data?.workInstructionImg || [];
//     const getWorkVideo =
//       (fileData?.data?.workInstructionVideo || [])[0] || null;

//     const {
//       instructionId,
//       workInstructionId,
//       processId,
//       part_id,
//       stepNumber,
//       title,
//       instruction,
//     } = req.body;
//     console.log("req.body;req.body;", req.body);
//     const { id } = req.params;
//     const stepNumbers = Array.isArray(stepNumber) ? stepNumber : [stepNumber];
//     const titles = Array.isArray(title) ? title : [title];
//     const instructions = Array.isArray(instruction)
//       ? instruction
//       : [instruction];

//     const partExists = await prisma.partNumber.findUnique({
//       where: { part_id: part_id },
//     });
//     const processExists = await prisma.process.findUnique({
//       where: { id: processId },
//     });

//     if (!partExists)
//       return res.status(400).json({ message: "Invalid part_id" });
//     if (!processExists)
//       return res.status(400).json({ message: "Invalid processId" });
//     const createdInstructions = await Promise.all(
//       stepNumbers.map((stepNo, i) =>
//         prisma.workInstruction.update({
//           where: {
//             workInstructionId: instructionId,
//           },
//           data: {
//             workInstructionId: workInstructionId,
//             processId,
//             part_id,
//             stepNumber: Number(stepNo),
//             title: titles[i],
//             instruction: instructions[i],
//           },
//         })
//       )
//     );

//     if (getWorkImages.length > 0) {
//       const imageData = getWorkImages.map((img) => ({
//         stepId: createdInstructions[0].id,
//         imagePath: img.filename,
//       }));
//       console.log("imageDataimageData", imageData);

//       await prisma.instructionImage.createMany({ data: imageData });
//     }

//     if (getWorkVideo) {
//       await prisma.instructionVideo.create({
//         data: {
//           stepId: createdInstructions[0].id,
//           videoPath: getWorkVideo.filename,
//         },
//       });
//     }

//     res.status(200).json({
//       message: "✅ Work instructions updated successfully",
//     });
//   } catch (error) {
//     console.error("❌ Error updating work instruction:", error);
//     res.status(500).json({ message: "Internal Server Error", error });
//   }
// };
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

    // 1️⃣ Update main WorkInstruction
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

    // 3️⃣ Insert updated steps
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
    // Step 1: Find main work instruction
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

    // Step 2: If not found, return 404
    if (!workInstruction) {
      return res.status(404).json({ message: "❌ Work instruction not found" });
    }

    // Step 3: Format steps
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

    // Step 4: Final response
    return res.status(200).json({
      workInstructionId: workInstruction.id,
      instructionTitle: workInstruction.instructionTitle,
      processId: workInstruction.processId,
      productId: workInstruction.productId,
      steps: formattedSteps,
    });
  } catch (error) {
    console.error("❌ Error fetching work instruction detail:", error);
    return res
      .status(500)
      .json({ message: "Internal Server Error", error: error.message });
  }
};

const deleteWorkInstruction = async (req, res) => {
  try {
    const { id } = req.params;
    const data = await prisma.workInstruction.updateMany({
      where: {
        workInstructionId: id,
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

// const applyWorkInstruction = async (req, res) => {
//   try {
//     const { workInstructionId, processId, partId } = req.body;
//     const existingInstructions = await prisma.workInstruction.findMany({
//       where: {
//         workInstructionId: workInstructionId,
//       },
//     });
//     if (!existingInstructions || existingInstructions.length === 0) {
//       return res.status(404).json({ message: "Work Instruction not found" });
//     }

//     const { v4: uuidv4 } = require("uuid");
//     const newWorkInstructionId = uuidv4().slice(0, 6);

//     const createdInstructions = await Promise.all(
//       existingInstructions.map((step) =>
//         prisma.workInstruction.create({
//           data: {
//             workInstructionId: newWorkInstructionId,
//             processId: processId,
//             part_id: partId,
//             stepNumber: step.stepNumber,
//             title: step.title,

//             instruction: step.instruction,
//             isDeleted: false,
//           },
//         })
//       )
//     );

//     return res.status(201).json({
//       message: "Successfully copied and applied new work instruction.",
//       newWorkInstructionId,
//       createdInstructions,
//     });
//   } catch (error) {
//     return res
//       .status(500)
//       .send("Something went wrong. Please try again later.");
//   }
// };

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

    // Loop through steps
    for (const step of existingSteps) {
      const stepId = uuidv4();

      // ✅ Create step
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

      // ✅ Copy Images
      for (const img of step.images || []) {
        await prisma.instructionImage.create({
          data: {
            stepId,
            imagePath: img.imagePath,
          },
        });
      }

      // ✅ Copy Videos
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
    console.error("❌ Error in applyWorkInstruction:", error);
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
